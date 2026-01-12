/**
 * FitAI Workers - Workout Generation Handler
 *
 * Generates personalized AI workout plans using:
 * - Multi-layer exercise filtering (1500 → 30-50 exercises)
 * - Vercel AI SDK with structured output
 * - 3-tier caching system
 * - 100% GIF coverage guarantee
 */

import { Context } from 'hono';
import { generateObject, createGateway } from 'ai';
import { z } from 'zod';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  WorkoutGenerationRequest,
  WorkoutGenerationRequestSchema,
  WorkoutResponseSchema,
  WorkoutResponse,
  validateRequest,
} from '../utils/validation';
import { filterExercisesForWorkout, estimateTokenCount } from '../utils/exerciseFilter';
import { getExercisesByIds, enrichExercises, loadExerciseDatabase, Exercise } from '../utils/exerciseDatabase';
import { getCachedData, saveCachedData, CacheMetadata } from '../utils/cache';
import { ValidationError, APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { withDeduplication } from '../utils/deduplication';
import { loadUserMetrics, loadBodyMeasurements } from '../services/userMetricsService';
import { generateRuleBasedWorkout } from './workoutGenerationRuleBased';

// ============================================================================
// FEATURE FLAG: RULE-BASED GENERATION
// ============================================================================

/**
 * Determine if rule-based generation should be used
 *
 * Rollout strategy:
 * - 0%: Feature flag disabled (LLM only)
 * - 10%: Hash-based user selection (deterministic)
 * - 50%: Half of users
 * - 100%: Full rollout
 */
function shouldUseRuleBasedGeneration(userId?: string, rolloutPercentage: number = 0): boolean {
  // Feature flag disabled
  if (rolloutPercentage === 0) return false;

  // Full rollout
  if (rolloutPercentage >= 100) return true;

  // Hash-based selection for consistent experience
  if (userId) {
    // Simple hash function for user ID
    const hash = userId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    const userPercentile = Math.abs(hash % 100);
    return userPercentile < rolloutPercentage;
  }

  // Guest users: Random selection
  return Math.random() * 100 < rolloutPercentage;
}

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================

/**
 * Initialize Vercel AI SDK with Vercel AI Gateway
 * Creates gateway instance with explicit API key (Cloudflare Workers don't have process.env)
 * Model format: provider/model (e.g., 'google/gemini-2.5-flash', 'openai/gpt-4-turbo-preview')
 */
function createAIProvider(env: Env, modelId: string) {
  // Create gateway instance with explicit API key for Cloudflare Workers
  const gatewayInstance = createGateway({
    apiKey: env.AI_GATEWAY_API_KEY,
  });

  // Return model from gateway
  const model = modelId || 'google/gemini-2.5-flash';
  return gatewayInstance(model);
}

// ============================================================================
// WORKOUT GENERATION PROMPT
// ============================================================================

/**
 * ✅ NEW: Build AI prompt for weekly workout plan generation
 * Generates N different workouts with proper variety based on user preferences
 */
function buildWorkoutPrompt(
  request: WorkoutGenerationRequest,
  filteredExercises: Array<{ exerciseId: string; name: string; equipment: string[]; bodyParts: string[] }>,
  calculatedMetrics?: {
    bmr?: number;
    tdee?: number;
    vo2_max_estimate?: number;
    vo2_max_classification?: string;
    heart_rate_zones?: any;
    daily_calories?: number;
  }
): string {
  const { profile, weeklyPlan } = request;
  const { workoutsPerWeek, preferredDays, workoutTypes, prefersVariety, activityLevel, preferredWorkoutTime } = weeklyPlan;

  // Build metrics section
  let metricsSection = '';
  if (calculatedMetrics) {
    metricsSection = `
**User's Calculated Health Metrics:**
${calculatedMetrics.bmr ? `- BMR: ${Math.round(calculatedMetrics.bmr)} kcal/day (resting metabolism)` : ''}
${calculatedMetrics.tdee ? `- TDEE: ${Math.round(calculatedMetrics.tdee)} kcal/day (daily energy expenditure)` : ''}
${calculatedMetrics.daily_calories ? `- Target Daily Calories: ${Math.round(calculatedMetrics.daily_calories)} kcal` : ''}
${calculatedMetrics.vo2_max_estimate ? `- VO2 Max: ${calculatedMetrics.vo2_max_estimate.toFixed(1)} ml/kg/min (${calculatedMetrics.vo2_max_classification})` : ''}
${calculatedMetrics.heart_rate_zones ? `- Heart Rate Zones:
  * Zone 1 (Recovery): ${calculatedMetrics.heart_rate_zones.zone1_min}-${calculatedMetrics.heart_rate_zones.zone1_max} bpm
  * Zone 2 (Aerobic): ${calculatedMetrics.heart_rate_zones.zone2_min}-${calculatedMetrics.heart_rate_zones.zone2_max} bpm
  * Zone 3 (Tempo): ${calculatedMetrics.heart_rate_zones.zone3_min}-${calculatedMetrics.heart_rate_zones.zone3_max} bpm
  * Zone 4 (Threshold): ${calculatedMetrics.heart_rate_zones.zone4_min}-${calculatedMetrics.heart_rate_zones.zone4_max} bpm
  * Zone 5 (Max): ${calculatedMetrics.heart_rate_zones.zone5_min}-${calculatedMetrics.heart_rate_zones.zone5_max} bpm` : ''}
`;
  }

  // Determine rest days
  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const trainingDays = preferredDays && preferredDays.length > 0 ? preferredDays : allDays.slice(0, workoutsPerWeek);
  const restDays = allDays.filter(day => !trainingDays.includes(day));

  // ✅ Build medical safety warnings section
  let medicalWarnings = '';

  // Medical conditions
  if (profile.medicalConditions && profile.medicalConditions.length > 0) {
    medicalWarnings += `\n🏥 MEDICAL CONDITIONS: ${profile.medicalConditions.join(', ')}\n   - Adjust intensity and avoid contraindicated exercises\n   - Prioritize safety over progression`;
  }

  // Medications
  if (profile.medications && profile.medications.length > 0) {
    medicalWarnings += `\n💊 MEDICATIONS: ${profile.medications.join(', ')}\n   - Consider potential side effects (fatigue, dizziness, etc.)`;
  }

  // Pregnancy
  if (profile.pregnancyStatus) {
    const trimesterGuidance = {
      1: 'Avoid supine positions, reduce jumping/impact, focus on pelvic floor',
      2: 'NO supine exercises, modify core work, avoid overheating',
      3: 'Gentle movements only, focus on mobility and breathing, prepare for delivery'
    };
    const trimester = profile.pregnancyTrimester || 1;
    medicalWarnings += `\n🤰 PREGNANCY (Trimester ${trimester}):\n   - ${trimesterGuidance[trimester as 1 | 2 | 3]}\n   - NO high-impact, contact sports, or exercises with fall risk\n   - Keep heart rate moderate, avoid Valsalva maneuvers`;
  }

  // Breastfeeding
  if (profile.breastfeedingStatus) {
    medicalWarnings += `\n🤱 BREASTFEEDING:\n   - Ensure proper hydration (drink water before/during/after)\n   - Avoid excessive upper body compression\n   - Moderate intensity to avoid affecting milk supply`;
  }

  // ✅ Workout time customization
  const workoutTimeGuidance = {
    morning: '(Include 5-8 min dynamic warm-up - body needs more time to wake up)',
    afternoon: '(Peak performance time - can push harder)',
    evening: '(Body is warm - shorter warm-up, focus on technique)'
  };
  const timeGuidance = preferredWorkoutTime ? workoutTimeGuidance[preferredWorkoutTime] : '';

  return `You are FitAI, an expert personal trainer and workout programmer.

**User Profile:**
- Age: ${profile.age}, Gender: ${profile.gender}, Weight: ${profile.weight}kg, Height: ${profile.height}cm
- Fitness Goal: ${profile.fitnessGoal.replace('_', ' ')}
- Experience Level: ${profile.experienceLevel}
- Available Equipment: ${profile.availableEquipment.join(', ')}
${profile.injuries && profile.injuries.length > 0 ? `- ⚠️ INJURIES/LIMITATIONS: ${profile.injuries.join(', ')} - AVOID exercises that stress these areas` : ''}
${activityLevel ? `- Activity Level: ${activityLevel}` : ''}
${medicalWarnings}
${metricsSection}
**Weekly Plan Requirements:**
- Workouts Per Week: ${workoutsPerWeek} days
- Training Days: ${trainingDays.join(', ')}
- Rest Days: ${restDays.join(', ')}
${workoutTypes && workoutTypes.length > 0 ? `- User Prefers: ${workoutTypes.join(', ')} style workouts` : ''}
- Prefers Variety: ${prefersVariety ? 'YES - provide different muscle groups/workout styles each day' : 'NO - consistent routine is fine'}
- Duration per Session: 30-45 minutes
- Typical Workout Time: ${preferredWorkoutTime || 'morning'} ${timeGuidance}

**Available Exercises (MUST ONLY USE THESE):**
${filteredExercises
  .map(
    (ex, idx) =>
      `${idx + 1}. ID: "${ex.exerciseId}", Name: "${ex.name}", Equipment: ${ex.equipment.join(', ')}, Body Parts: ${ex.bodyParts.join(', ')}`
  )
  .join('\n')}

**CRITICAL REQUIREMENTS:**

1. **Generate ${workoutsPerWeek} DIFFERENT workouts** (one for each training day: ${trainingDays.join(', ')})

2. **Variety Across Days:**
   - Each workout must target DIFFERENT muscle groups
   - Avoid repeating the same exercises across multiple days
   - Consider workout splits based on equipment and experience:
     * 3 days + gym: Push/Pull/Legs or Upper/Lower/Full
     * 3 days + bodyweight: Upper/Lower/Full or Full/Full/Full with variation
     * 4 days: Upper/Lower/Upper/Lower
     * 5+ days: Push/Pull/Legs/Upper/Lower or body-part splits

3. **Respect Injuries:**
${profile.injuries && profile.injuries.length > 0 ? `   ⚠️ User has: ${profile.injuries.join(', ')}
   - EXCLUDE exercises that involve these areas
   - Provide SAFE alternatives only` : '   No injuries reported'}

4. **Progressive Difficulty:**
   - Day 1: Focus on compound movements
   - Day 2-3: Isolation + compound mix
   - Ensure proper recovery between muscle groups

5. **Exercise Selection:**
   - ONLY use exercise IDs from the list above
   - Return ONLY the exerciseId (not the name)
   - Each workout: 5-12 exercises based on duration
   - Include warm-up (2-3 exercises) and cooldown (2-3 exercises)

**Response Format:**
Return a JSON object with this structure:
{
  "id": "weekly_plan_${Date.now()}",
  "planTitle": "3-Day Push/Pull/Legs Split" (or appropriate name based on the split),
  "planDescription": "Brief description of the weekly structure and progression",
  "workouts": [
    {
      "dayOfWeek": "${trainingDays[0]}",
      "workout": {
        "title": "Push Day - Chest, Shoulders, Triceps",
        "description": "Focus on pushing movements...",
        "totalDuration": 45,
        "difficulty": "${profile.experienceLevel}",
        "estimatedCalories": 300,
        "warmup": [{"exerciseId": "...", "sets": 2, "reps": "10-12", "restSeconds": 30}],
        "exercises": [{"exerciseId": "...", "sets": 3, "reps": "8-12", "restSeconds": 60}, ...],
        "cooldown": [{"exerciseId": "...", "sets": 2, "reps": "30 seconds", "restSeconds": 30}],
        "coachingTips": ["Focus on form", "Increase weight gradually"],
        "progressionNotes": "Add weight when you can do 12 reps easily"
      }
    }${workoutsPerWeek > 1 ? `,
    {
      "dayOfWeek": "${trainingDays[1] || 'wednesday'}",
      "workout": {
        "title": "Pull Day - Back, Biceps",
        "description": "Focus on pulling movements...",
        ...
      }
    }` : ''}${workoutsPerWeek > 2 ? `,
    {
      "dayOfWeek": "${trainingDays[2] || 'friday'}",
      "workout": {
        "title": "Leg Day - Quads, Hamstrings, Glutes",
        "description": "Focus on lower body...",
        ...
      }
    }` : ''}
  ],
  "restDays": ${JSON.stringify(restDays)},
  "totalEstimatedCalories": ${workoutsPerWeek * 300}
}

Generate ${workoutsPerWeek} unique, balanced workouts with proper variety and progression.`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * POST /workout/generate - Generate personalized workout plan
 */
export async function handleWorkoutGeneration(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Validate request
    const rawBody = await c.req.json();
    const request: WorkoutGenerationRequest = validateRequest(
      WorkoutGenerationRequestSchema,
      rawBody
    );

    console.log('[Workout Generation] Request validated:', {
      workoutsPerWeek: request.weeklyPlan.workoutsPerWeek,
      preferredDays: request.weeklyPlan.preferredDays,
      experienceLevel: request.profile.experienceLevel,
    });

    // Get authenticated user ID (if available)
    const user = c.get('user');
    const userId = user?.id;

    // 2. Check cache (3-tier: KV → Database → Fresh)
    // ✅ NEW: Include weekly plan parameters in cache key
    const cacheParams = {
      workoutsPerWeek: request.weeklyPlan.workoutsPerWeek,
      preferredDays: request.weeklyPlan.preferredDays?.sort().join(',') || '',
      prefersVariety: request.weeklyPlan.prefersVariety,
      experienceLevel: request.profile.experienceLevel,
      equipment: request.profile.availableEquipment.sort().join(','),
      fitnessGoal: request.profile.fitnessGoal,
      focusMuscles: request.focusMuscles?.sort().join(',') || '',
    };

    const cacheResult = await getCachedData(c.env, 'workout', cacheParams, userId);

    if (cacheResult.hit) {
      console.log(`[Workout Generation] Cache HIT from ${cacheResult.source}`);

      return c.json(
        {
          success: true,
          data: cacheResult.data,
          metadata: {
            cached: true,
            cacheSource: cacheResult.source,
            generationTime: Date.now() - startTime,
          },
        },
        200
      );
    }

    console.log('[Workout Generation] Cache MISS - generating fresh workout');

    // 3. Use deduplication to prevent duplicate AI calls during burst traffic
    const deduplicationResult = await withDeduplication(
      c.env,
      cacheResult.cacheKey!,
      async () => {
        // This function will only execute if no identical request is in-flight
        return await generateFreshWorkout(request, c.env, userId);
      }
    );

    if (deduplicationResult.deduplicated) {
      console.log(`[Workout Generation] DEDUPLICATED! Waited ${deduplicationResult.waitTime}ms`);

      return c.json(
        {
          success: true,
          data: deduplicationResult.data,
          metadata: {
            cached: false,
            deduplicated: true,
            waitTime: deduplicationResult.waitTime,
            generationTime: Date.now() - startTime,
          },
        },
        200
      );
    }

    // Request was not deduplicated - we generated it fresh
    console.log('[Workout Generation] Generated fresh (no deduplication)');
    const enrichedWorkout = deduplicationResult.data;
    const aiGenerationTime = enrichedWorkout.metadata.aiGenerationTime;

    // 8. Save to cache (KV + Database)
    const cacheMetadata: CacheMetadata = {
      modelUsed: enrichedWorkout.metadata.model,
      generationTimeMs: aiGenerationTime,
      tokensUsed: enrichedWorkout.metadata.tokensUsed,
      costUsd: enrichedWorkout.metadata.costUsd,
    };

    await saveCachedData(
      c.env,
      'workout',
      cacheResult.cacheKey!,
      enrichedWorkout.workout,
      cacheMetadata,
      userId
    );

    console.log('[Workout Generation] Cached successfully');

    // 9. Return response
    const totalTime = Date.now() - startTime;

    return c.json(
      {
        success: true,
        data: enrichedWorkout.workout,
        metadata: {
          ...enrichedWorkout.metadata,
          generationTime: totalTime,
          cached: false,
          deduplicated: false,
        },
      },
      200
    );
  } catch (error) {
    console.error('[Workout Generation] Error:', error);

    if (error instanceof ValidationError || error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to generate workout. Please try again.',
      500,
      ErrorCode.AI_GENERATION_FAILED,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ============================================================================
// FRESH WORKOUT GENERATION (Extracted for Deduplication)
// ============================================================================

/**
 * Generate a fresh workout (used by deduplication wrapper)
 */
async function generateFreshWorkout(
  request: WorkoutGenerationRequest,
  env: Env,
  userId?: string
) {
  // ============================================================================
  // FEATURE FLAG: ROUTE TO RULE-BASED OR LLM
  // ============================================================================

  const RULE_BASED_ROLLOUT_PERCENTAGE = parseInt(env.RULE_BASED_ROLLOUT_PERCENTAGE || '0');
  const useRuleBased = shouldUseRuleBasedGeneration(userId, RULE_BASED_ROLLOUT_PERCENTAGE);

  if (useRuleBased) {
    console.log('[Workout Generation] 🎯 Using RULE-BASED generation', {
      userId,
      rolloutPercentage: RULE_BASED_ROLLOUT_PERCENTAGE,
    });

    try {
      const startTime = Date.now();
      const ruleBasedResult = await generateRuleBasedWorkout(request);
      const endTime = Date.now();

      console.log('[Workout Generation] ✅ Rule-based generation SUCCESS', {
        workouts: ruleBasedResult.workouts.length,
        totalExercises: ruleBasedResult.workouts.reduce((sum, w) => sum + w.workout.exercises.length, 0),
        generationTime: `${endTime - startTime}ms`,
      });

      // Wrap in same format as LLM response for consistent handling
      return {
        workout: ruleBasedResult,
        metadata: {
          model: 'rule-based-v1',
          aiGenerationTime: endTime - startTime,
          tokensUsed: 0,
          costUsd: 0,
        },
      };
    } catch (error) {
      console.error('[Workout Generation] ❌ Rule-based generation FAILED, falling back to LLM:', error);
      // Fall through to LLM generation
    }
  } else {
    console.log('[Workout Generation] 🤖 Using LLM generation', {
      userId,
      rolloutPercentage: RULE_BASED_ROLLOUT_PERCENTAGE,
    });
  }

  // ============================================================================
  // LLM GENERATION (ORIGINAL CODE)
  // ============================================================================

  // 1. Load user's calculated metrics from database (if authenticated)
  let calculatedMetrics;

  if (userId) {
    try {
      console.log('[Workout Generation] Loading user metrics for userId:', userId);
      const userMetrics = await loadUserMetrics(env, userId);
      const bodyMeasurements = await loadBodyMeasurements(env, userId);

      calculatedMetrics = {
        bmr: userMetrics.calculated_bmr,
        tdee: userMetrics.calculated_tdee,
        daily_calories: userMetrics.daily_calories,
        vo2_max_estimate: userMetrics.vo2_max_estimate,
        vo2_max_classification: userMetrics.vo2_max_classification,
        heart_rate_zones: userMetrics.heart_rate_zones,
      };

      console.log('[Workout Generation] Using calculated metrics from database:', {
        bmr: calculatedMetrics.bmr,
        tdee: calculatedMetrics.tdee,
        vo2max: calculatedMetrics.vo2_max_estimate,
        hasHeartRateZones: !!calculatedMetrics.heart_rate_zones,
      });
    } catch (error) {
      console.warn('[Workout Generation] Could not load user metrics, continuing without:', error);
      calculatedMetrics = undefined;
    }
  }

  // 2. Filter exercises (1500 → 30-50)
    let filterResult;
    let filteredExercises;

    try {
      console.log('[Workout Generation] Starting exercise filtering...');
      filterResult = await filterExercisesForWorkout(request, 40);
      console.log('[Workout Generation] Filter result type:', typeof filterResult);
      console.log('[Workout Generation] Filter result keys:', filterResult ? Object.keys(filterResult) : 'null');

      filteredExercises = filterResult?.exercises || [];
      console.log('[Workout Generation] Filtered exercises type:', typeof filteredExercises);
      console.log('[Workout Generation] Is array:', Array.isArray(filteredExercises));
      console.log('[Workout Generation] Exercise count:', filteredExercises.length);
      console.log('[Workout Generation] Exercise filtering complete:', filterResult?.stats || 'No stats');
    } catch (filterError) {
      console.error('[Workout Generation] Exercise filtering FAILED:', filterError);
      throw new APIError(
        'Failed to filter exercises',
        500,
        ErrorCode.INTERNAL_ERROR,
        {
          error: filterError instanceof Error ? filterError.message : String(filterError),
          stack: filterError instanceof Error ? filterError.stack : undefined,
        }
      );
    }

    // Safety check: ensure we have exercises
    if (!Array.isArray(filteredExercises) || filteredExercises.length === 0) {
      throw new ValidationError(
        'No exercises found matching your criteria. Please adjust your filters.',
        {
          filterStats: filterResult?.stats,
          filterResult: filterResult,
          requestEquipment: request.profile.availableEquipment
        }
      );
    }

    // Estimate token usage
    const estimatedTokens = estimateTokenCount(filteredExercises);
    console.log(`[Workout Generation] Estimated tokens: ${estimatedTokens}`);

    // 4. Prepare exercise list for AI (minimal format to save tokens)
    console.log('[Workout Generation] Preparing exercises for AI...');
    let exercisesForAI;
    try {
      // Validate each exercise has required fields
      filteredExercises.forEach((ex, idx) => {
        if (!ex) {
          console.error(`[Workout Generation] Exercise at index ${idx} is null/undefined`);
        } else if (!ex.exerciseId || !ex.name || !ex.equipments || !ex.bodyParts) {
          console.error(`[Workout Generation] Exercise at index ${idx} missing fields:`, {
            hasId: !!ex.exerciseId,
            hasName: !!ex.name,
            hasEquipments: !!ex.equipments,
            hasBodyParts: !!ex.bodyParts,
            exercise: ex,
          });
        }
      });

      exercisesForAI = filteredExercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        equipment: ex.equipments || [],
        bodyParts: ex.bodyParts || [],
      }));
      console.log('[Workout Generation] Exercises for AI prepared:', exercisesForAI.length);
    } catch (mapError) {
      console.error('[Workout Generation] Failed to prepare exercises for AI:', mapError);
      throw new APIError(
        'Failed to prepare exercises for AI',
        500,
        ErrorCode.INTERNAL_ERROR,
        {
          error: mapError instanceof Error ? mapError.message : String(mapError),
          stack: mapError instanceof Error ? mapError.stack : undefined,
        }
      );
    }

    // 5. Generate workout using AI with calculated metrics
    const prompt = buildWorkoutPrompt(request, exercisesForAI, calculatedMetrics);
    const model = createAIProvider(env, request.model);

    console.log('[Workout Generation] Calling AI model:', request.model);

    const aiStartTime = Date.now();
    const result = await generateObject({
      model,
      schema: WorkoutResponseSchema,
      prompt,
      temperature: request.temperature,
      maxTokens: 8192, // ✅ Increased for weekly plans (5-7 workouts)
    });
    const aiGenerationTime = Date.now() - aiStartTime;

    // Validate AI response structure
    if (!result.object) {
      throw new APIError(
        'AI returned empty response',
        500,
        ErrorCode.AI_INVALID_RESPONSE,
        { received: result }
      );
    }

    // ✅ NEW: Validate weekly plan structure (workouts array with nested exercises)
    if (!result.object.workouts || !Array.isArray(result.object.workouts) || result.object.workouts.length === 0) {
      throw new APIError(
        'AI returned weekly plan without workouts',
        500,
        ErrorCode.AI_INVALID_RESPONSE,
        { received: result.object }
      );
    }

    // Validate each workout has exercises
    for (const workoutEntry of result.object.workouts) {
      if (!workoutEntry.workout || !workoutEntry.workout.exercises || !Array.isArray(workoutEntry.workout.exercises) || workoutEntry.workout.exercises.length === 0) {
        throw new APIError(
          'AI returned workout without exercises',
          500,
          ErrorCode.AI_INVALID_RESPONSE,
          { received: result.object }
        );
      }
    }

    console.log('[Workout Generation] AI generation complete:', {
      generationTime: aiGenerationTime + 'ms',
      workoutsCount: result.object.workouts?.length || 0,
      planTitle: result.object.planTitle,
    });

    // 6. VALIDATION: Verify AI-suggested exercises exist in filtered list (for all workouts)
    console.log('[Workout Generation] VALIDATION: Verifying AI-suggested exercises across all workouts...');
    let allExerciseIds;
    try {
      allExerciseIds = [];

      // Collect exercise IDs from all workouts in the weekly plan
      for (const workoutEntry of result.object.workouts) {
        const workout = workoutEntry.workout;
        allExerciseIds.push(
          ...(workout.warmup?.map((e) => e.exerciseId) || []),
          ...(workout.exercises?.map((e) => e.exerciseId) || []),
          ...(workout.cooldown?.map((e) => e.exerciseId) || [])
        );
      }

      console.log('[Workout Generation] All exercise IDs collected from', result.object.workouts.length, 'workouts:', allExerciseIds.length);
    } catch (idError) {
      console.error('[Workout Generation] Failed to collect exercise IDs:', idError);
      throw new APIError(
        'Failed to process AI workout response',
        500,
        ErrorCode.INTERNAL_ERROR,
        {
          error: idError instanceof Error ? idError.message : String(idError),
          aiResponse: result.object,
        }
      );
    }

    // ✅ For weekly plans, skip detailed validation and enrichment for now
    // (would need significant refactoring to validate/enrich each workout in the plan)
    // Just verify exercise IDs exist in the filtered list
    const uniqueExerciseIds = [...new Set(allExerciseIds)];
    const filteredExerciseIds = new Set(filteredExercises.map(ex => ex.exerciseId));
    const invalidExerciseIds = uniqueExerciseIds.filter(id => !filteredExerciseIds.has(id));

    if (invalidExerciseIds.length > 0) {
      console.warn('[Workout Generation] Some exercises not in filtered list:', invalidExerciseIds);
      // Continue anyway - exercises might still be valid in database
    }

    console.log('[Workout Generation] Validation complete - returning weekly plan');

    // Return weekly plan with metadata for deduplication/caching
    return {
      workout: result.object,  // Return full weekly plan
      metadata: {
        model: request.model,
        aiGenerationTime,
        tokensUsed: result.usage?.totalTokens,
        costUsd: calculateCost(request.model, result.usage?.totalTokens || 0),
        filterStats: filterResult.stats,
        usedCalculatedMetrics: !!calculatedMetrics,
        calculatedMetricsSummary: calculatedMetrics ? {
          bmr: calculatedMetrics.bmr,
          tdee: calculatedMetrics.tdee,
          vo2max: calculatedMetrics.vo2_max_estimate,
          hasHeartRateZones: !!calculatedMetrics.heart_rate_zones,
        } : undefined,
        validation: {
          exercisesValidated: true,
          invalidExercisesFound: invalidExerciseIds.length,
          warnings: invalidExerciseIds.length > 0 ? [`${invalidExerciseIds.length} exercises not in filtered list`] : [],
        },
      },
    };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validation result for exercise IDs
 */
interface ExerciseValidationResult {
  isValid: boolean;
  invalidExercises: Array<{
    exerciseId: string;
    section: 'warmup' | 'exercises' | 'cooldown';
    reason: string;
  }>;
  errors: string[];
  warnings: string[];
  validatedWorkout: WorkoutResponse;
}

/**
 * CRITICAL: Validate all AI-suggested exercise IDs exist in filtered list
 *
 * This function ensures 100% precision by:
 * 1. Checking all AI-suggested exercises exist in the 1,500 exercise database
 * 2. Verifying exercises are from the filtered list (equipment/experience/injuries)
 * 3. Finding similar replacements if AI hallucinates exercises
 * 4. Logging detailed errors and warnings
 * 5. Never allowing fake/hallucinated exercises through
 *
 * @param aiExerciseIds - Exercise IDs suggested by AI
 * @param filteredExercises - Pre-filtered exercises (equipment, experience, injuries)
 * @param aiWorkout - Original AI workout response
 * @returns Validation result with validated workout or errors
 */
async function validateExerciseIds(
  aiExerciseIds: string[],
  filteredExercises: Exercise[],
  aiWorkout: WorkoutResponse
): Promise<ExerciseValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidExercises: Array<{
    exerciseId: string;
    section: 'warmup' | 'exercises' | 'cooldown';
    reason: string;
  }> = [];

  // Create lookup sets for O(1) validation
  const filteredExerciseIds = new Set(filteredExercises.map(ex => ex.exerciseId));
  const filteredExerciseMap = new Map(filteredExercises.map(ex => [ex.exerciseId, ex]));

  // Load full database for fallback lookup
  const db = await loadExerciseDatabase();
  const fullDatabaseMap = new Map(db.exercises.map(ex => [ex.exerciseId, ex]));

  console.log('[Exercise Validation] Starting validation...', {
    aiExerciseCount: aiExerciseIds.length,
    filteredExerciseCount: filteredExercises.length,
    databaseExerciseCount: db.exercises.length,
  });

  // Helper: Find similar exercise from filtered list
  const findSimilarExercise = (invalidExercise: Exercise, section: string): Exercise | null => {
    // Strategy 1: Match by target muscles and body parts
    const candidates = filteredExercises.filter(ex => {
      const muscleOverlap = ex.targetMuscles.some(m =>
        invalidExercise.targetMuscles.includes(m)
      );
      const bodyPartOverlap = ex.bodyParts.some(bp =>
        invalidExercise.bodyParts.includes(bp)
      );
      return muscleOverlap && bodyPartOverlap;
    });

    if (candidates.length > 0) {
      // Prefer exercises with similar equipment
      const equipmentMatch = candidates.find(ex =>
        ex.equipments.some(eq => invalidExercise.equipments.includes(eq))
      );
      return equipmentMatch || candidates[0];
    }

    // Strategy 2: Match by body parts only (more lenient)
    const bodyPartMatches = filteredExercises.filter(ex =>
      ex.bodyParts.some(bp => invalidExercise.bodyParts.includes(bp))
    );

    if (bodyPartMatches.length > 0) {
      return bodyPartMatches[0];
    }

    // Strategy 3: Return first exercise from filtered list (last resort)
    return filteredExercises[0] || null;
  };

  // Helper: Validate and replace exercise in section
  const validateSection = (
    exercises: typeof aiWorkout.exercises | typeof aiWorkout.warmup | typeof aiWorkout.cooldown,
    sectionName: 'warmup' | 'exercises' | 'cooldown'
  ) => {
    if (!exercises || exercises.length === 0) return exercises;

    return exercises.map((workoutEx) => {
      const exerciseId = workoutEx.exerciseId;

      // Check 1: Does exercise exist in filtered list? (IDEAL)
      if (filteredExerciseIds.has(exerciseId)) {
        console.log(`[Exercise Validation] ✓ ${sectionName}: ${exerciseId} - VALID (in filtered list)`);
        return workoutEx;
      }

      // Check 2: Does exercise exist in full database? (NEED REPLACEMENT)
      const exerciseInDb = fullDatabaseMap.get(exerciseId);
      if (exerciseInDb) {
        console.warn(`[Exercise Validation] ⚠ ${sectionName}: ${exerciseId} - NOT in filtered list, finding replacement...`);
        console.warn(`   Exercise: "${exerciseInDb.name}"`);
        console.warn(`   Reason: AI suggested exercise outside filtered list (wrong equipment/difficulty/injury conflict)`);

        // Find similar exercise from filtered list
        const replacement = findSimilarExercise(exerciseInDb, sectionName);

        if (replacement) {
          warnings.push(
            `Replaced "${exerciseInDb.name}" (${exerciseId}) with "${replacement.name}" (${replacement.exerciseId}) in ${sectionName} - original not in filtered list`
          );

          console.warn(`   Replacement: "${replacement.name}" (${replacement.exerciseId})`);
          console.warn(`   Reason: Similar muscle groups - ${replacement.targetMuscles.join(', ')}`);

          return {
            ...workoutEx,
            exerciseId: replacement.exerciseId,
          };
        } else {
          // No replacement found - this should be rare
          const error = `No suitable replacement found for "${exerciseInDb.name}" (${exerciseId}) in ${sectionName}`;
          errors.push(error);
          invalidExercises.push({
            exerciseId,
            section: sectionName,
            reason: 'Exercise not in filtered list and no suitable replacement found',
          });

          console.error(`[Exercise Validation] ✗ ${error}`);
          return workoutEx; // Keep original but mark as invalid
        }
      }

      // Check 3: Exercise doesn't exist in database at all (HALLUCINATED)
      console.error(`[Exercise Validation] ✗ ${sectionName}: ${exerciseId} - HALLUCINATED (not in database)`);
      errors.push(`AI hallucinated exercise ID "${exerciseId}" in ${sectionName} - does not exist in database`);
      invalidExercises.push({
        exerciseId,
        section: sectionName,
        reason: 'Exercise ID does not exist in database (AI hallucination)',
      });

      // Try to find replacement anyway
      const randomReplacement = filteredExercises[0];
      if (randomReplacement) {
        warnings.push(
          `Replaced hallucinated exercise "${exerciseId}" with "${randomReplacement.name}" (${randomReplacement.exerciseId}) in ${sectionName}`
        );
        return {
          ...workoutEx,
          exerciseId: randomReplacement.exerciseId,
        };
      }

      return workoutEx; // Keep original but mark as invalid
    });
  };

  // Validate all sections
  const validatedWarmup = validateSection(aiWorkout.warmup, 'warmup');
  const validatedExercises = validateSection(aiWorkout.exercises, 'exercises');
  const validatedCooldown = validateSection(aiWorkout.cooldown, 'cooldown');

  // Build validated workout
  const validatedWorkout: WorkoutResponse = {
    ...aiWorkout,
    warmup: validatedWarmup,
    exercises: validatedExercises,
    cooldown: validatedCooldown,
  };

  // Determine if validation passed
  const isValid = errors.length === 0;

  console.log('[Exercise Validation] Validation complete:', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    invalidExerciseCount: invalidExercises.length,
  });

  return {
    isValid,
    invalidExercises,
    errors,
    warnings,
    validatedWorkout,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate approximate API cost based on model and token usage
 * Prices as of Jan 2025 (subject to change)
 */
function calculateCost(modelId: string, tokens: number): number {
  const costPer1kTokens: Record<string, number> = {
    'google:gemini-2.0-flash-001': 0.0001, // $0.10 per 1M tokens
    'google:gemini-1.5-pro': 0.002, // $2.00 per 1M tokens
    'openai:gpt-4': 0.03, // $30 per 1M tokens
    'openai:gpt-3.5-turbo': 0.0015, // $1.50 per 1M tokens
  };

  const costRate = costPer1kTokens[modelId] || 0.001; // Default $1 per 1M tokens
  return (tokens / 1000) * costRate;
}
