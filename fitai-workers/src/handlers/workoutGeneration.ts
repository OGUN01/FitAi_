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
 * Build AI prompt with filtered exercises and calculated metrics
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
  const { profile, workoutType, duration } = request;

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

  return `You are FitAI, an expert personal trainer and workout programmer.

**User Profile:**
- Age: ${profile.age}, Gender: ${profile.gender}, Weight: ${profile.weight}kg, Height: ${profile.height}cm
- Fitness Goal: ${profile.fitnessGoal.replace('_', ' ')}
- Experience Level: ${profile.experienceLevel}
- Available Equipment: ${profile.availableEquipment.join(', ')}
${profile.injuries && profile.injuries.length > 0 ? `- Injuries/Restrictions: ${profile.injuries.join(', ')}` : ''}
${metricsSection}
**Workout Requirements:**
- Workout Type: ${workoutType.replace('_', ' ')}
- Target Duration: ${duration} minutes
- Difficulty: ${request.difficultyOverride || profile.experienceLevel}
${request.focusMuscles && request.focusMuscles.length > 0 ? `- Focus Muscles: ${request.focusMuscles.join(', ')}` : ''}

**Available Exercises (MUST ONLY USE THESE):**
${filteredExercises
  .map(
    (ex, idx) =>
      `${idx + 1}. ID: "${ex.exerciseId}", Name: "${ex.name}", Equipment: ${ex.equipment.join(', ')}, Body Parts: ${ex.bodyParts.join(', ')}`
  )
  .join('\n')}

**IMPORTANT RULES:**
1. You MUST ONLY use exercise IDs from the list above
2. Return ONLY the exerciseId for each exercise (not the name)
3. Create a balanced workout with proper progression
4. Include appropriate sets, reps, and rest periods
5. Consider the user's experience level and injuries
6. Aim for the target duration (warm-up + main workout + cooldown)
7. For beginners: Focus on form, use lower weights, include rest
8. For advanced: Include intensity techniques, progressive overload
${calculatedMetrics?.heart_rate_zones ? '9. Use heart rate zones for cardio exercises to optimize fat burning and endurance' : ''}

**Workout Structure:**
- Warm-up: 2-3 exercises, 5-10 minutes (light cardio, dynamic stretches)
- Main Workout: 5-12 exercises based on duration and workout type
- Cooldown: 2-3 exercises, 5 minutes (static stretches, mobility)

Generate a complete, personalized workout plan using ONLY the exercises provided above.`;
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
      workoutType: request.workoutType,
      duration: request.duration,
      experienceLevel: request.profile.experienceLevel,
    });

    // Get authenticated user ID (if available)
    const user = c.get('user');
    const userId = user?.id;

    // 2. Check cache (3-tier: KV → Database → Fresh)
    const cacheParams = {
      workoutType: request.workoutType,
      duration: request.duration,
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
      // Note: maxTokens removed - controlled by model defaults
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

    if (!result.object.exercises || !Array.isArray(result.object.exercises) || result.object.exercises.length === 0) {
      throw new APIError(
        'AI returned workout without exercises',
        500,
        ErrorCode.AI_INVALID_RESPONSE,
        { received: result.object }
      );
    }

    console.log('[Workout Generation] AI generation complete:', {
      generationTime: aiGenerationTime + 'ms',
      exerciseCount: result.object.exercises?.length || 0,
      warmupCount: result.object.warmup?.length || 0,
      cooldownCount: result.object.cooldown?.length || 0,
    });

    // 6. VALIDATION: Verify AI-suggested exercises exist in filtered list
    console.log('[Workout Generation] VALIDATION: Verifying AI-suggested exercises...');
    let allExerciseIds;
    try {
      console.log('[Workout Generation] AI response structure:', {
        hasWarmup: !!result.object.warmup,
        warmupLength: result.object.warmup?.length || 0,
        hasExercises: !!result.object.exercises,
        exercisesLength: result.object.exercises?.length || 0,
        hasCooldown: !!result.object.cooldown,
        cooldownLength: result.object.cooldown?.length || 0,
      });

      allExerciseIds = [
        ...(result.object.warmup?.map((e) => e.exerciseId) || []),
        ...(result.object.exercises?.map((e) => e.exerciseId) || []),
        ...(result.object.cooldown?.map((e) => e.exerciseId) || []),
      ];
      console.log('[Workout Generation] All exercise IDs collected:', allExerciseIds.length);
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

    // CRITICAL: Validate all AI-suggested exercises exist in database
    const validationResult = await validateExerciseIds(
      allExerciseIds,
      filteredExercises,
      result.object
    );

    if (!validationResult.isValid) {
      console.error('[Workout Generation] EXERCISE VALIDATION FAILED:', validationResult.errors);

      // Return detailed error (NO FALLBACK - expose the issue)
      throw new APIError(
        'AI suggested invalid or hallucinated exercises. Validation failed.',
        400,
        ErrorCode.AI_INVALID_RESPONSE,
        {
          invalidExerciseCount: validationResult.invalidExercises.length,
          invalidExercises: validationResult.invalidExercises,
          errors: validationResult.errors,
          suggestion: 'Please retry generation or adjust your filters',
        }
      );
    }

    // Log warnings for replaced exercises (non-blocking)
    if (validationResult.warnings.length > 0) {
      console.warn('[Workout Generation] VALIDATION WARNINGS:', validationResult.warnings);
    }

    // Use validated workout (may have replacements)
    const validatedWorkout = validationResult.validatedWorkout;

    // 7. Enrich workout with full exercise data
    console.log('[Workout Generation] Enriching workout with exercise data...');
    const validatedExerciseIds = [
      ...(validatedWorkout.warmup?.map((e) => e.exerciseId) || []),
      ...(validatedWorkout.exercises?.map((e) => e.exerciseId) || []),
      ...(validatedWorkout.cooldown?.map((e) => e.exerciseId) || []),
    ];

    const exerciseData = await getExercisesByIds(validatedExerciseIds);
    const enrichedExercises = enrichExercises(exerciseData);
    console.log('[Workout Generation] Enriched exercises:', enrichedExercises.length);

    // CRITICAL: Verify 100% GIF coverage
    const missingGifs = enrichedExercises.filter((ex) => !ex.gifUrl || ex.gifUrl.trim() === '');
    if (missingGifs.length > 0) {
      console.error('[Workout Generation] GIF VALIDATION FAILED: Missing GIF URLs:', missingGifs.map(ex => ({
        id: ex.exerciseId,
        name: ex.name,
      })));

      throw new APIError(
        'Exercise database integrity error: Some exercises missing GIF URLs',
        500,
        ErrorCode.INTERNAL_ERROR,
        {
          missingGifCount: missingGifs.length,
          missingGifs: missingGifs.map(ex => ({ id: ex.exerciseId, name: ex.name })),
          message: 'Database must have 100% GIF coverage. Please report this issue.',
        }
      );
    }

    console.log('[Workout Generation] GIF VALIDATION PASSED: All exercises have GIF URLs');

    // Create a map for quick lookup
    const exerciseMap = new Map(enrichedExercises.map((ex) => [ex.exerciseId, ex]));

    // 8. Build enriched response with validated exercises
    console.log('[Workout Generation] Building enriched workout response...');
    const enrichedWorkout = {
      ...validatedWorkout,
      exercises: validatedWorkout.exercises?.map((workoutEx) => ({
        ...workoutEx,
        exerciseData: exerciseMap.get(workoutEx.exerciseId),
      })) || [],
      warmup: validatedWorkout.warmup?.map((workoutEx) => ({
        ...workoutEx,
        exerciseData: exerciseMap.get(workoutEx.exerciseId),
      })),
      cooldown: validatedWorkout.cooldown?.map((workoutEx) => ({
        ...workoutEx,
        exerciseData: exerciseMap.get(workoutEx.exerciseId),
      })),
    };
    console.log('[Workout Generation] Enriched workout built successfully');

    // Return workout with metadata for deduplication/caching
    return {
      workout: enrichedWorkout,
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
          invalidExercisesFound: validationResult.invalidExercises.length,
          replacementsMade: validationResult.warnings.length,
          gifCoverageVerified: true,
          warnings: validationResult.warnings,
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
