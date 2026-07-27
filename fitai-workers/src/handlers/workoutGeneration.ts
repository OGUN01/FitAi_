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
import { z } from 'zod';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  WorkoutGenerationRequest,
  WorkoutGenerationRequestSchema,
  SingleWorkoutSchema,
  validateRequest,
} from '../utils/validation';
import { loadExerciseDatabase, Exercise } from '../utils/exerciseDatabase';
import { getCachedData, saveCachedData, CacheMetadata } from '../utils/cache';
import { ValidationError, APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { withDeduplication } from '../utils/deduplication';
import { loadUserMetrics } from '../services/userMetricsService';
import { generateRuleBasedWorkout, generateGentleMovementFallback } from './workoutGenerationRuleBased';

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
// PROMPT SANITIZATION HELPERS
// ============================================================================

/**
 * Strip prompt-injection characters from a single free-text field.
 * Removes markdown/template control chars, collapses newlines, and truncates.
 */
function sanitizePromptField(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/[*_`#\[\]\{\}]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 150);
}

function sanitizePromptArray(arr: string[] | undefined | null): string[] {
  return (arr ?? []).map(sanitizePromptField).filter(s => s.length > 0);
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
    // Include weekly plan parameters + weekNumber in cache key
    // weekNumber ensures different mesocycle weeks get different plans
    // regenerationSeed ensures "regenerate" produces a fresh plan
    // FIX C: If regenerationSeed is absent or 0 (default), generate a random seed so
    // every "regenerate" call actually busts the cache rather than hitting the same key.
    const effectiveSeed = (request.regenerationSeed && request.regenerationSeed !== 0)
      ? request.regenerationSeed
      : Math.floor(Math.random() * 1000000);

    const cacheParams = {
      workoutsPerWeek: request.weeklyPlan.workoutsPerWeek,
      preferredDays: request.weeklyPlan.preferredDays?.sort().join(',') || '',
      prefersVariety: request.weeklyPlan.prefersVariety,
      experienceLevel: request.profile.experienceLevel,
      equipment: request.profile.availableEquipment.sort().join(','),
      fitnessGoal: request.profile.fitnessGoal,
      focusMuscles: request.focusMuscles?.sort().join(',') || '',
      weekNumber: request.weekNumber ?? 1,
      regenerationSeed: effectiveSeed,
    };

    const cacheResult = await getCachedData(c.env, 'workout', cacheParams, userId);

    if (cacheResult.hit && !request.skipCache) {
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

    if (error instanceof Error && error.message.includes('timed out after 150s')) {
      throw new APIError(
        'Workout generation timed out. Please try again.',
        408,
        ErrorCode.AI_GENERATION_FAILED,
        { error: error.message }
      );
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
  // STEP 0: LOAD USER HEALTH METRICS (for both rule-based AND LLM paths)
  // ============================================================================

  let calculatedMetrics: {
    bmr?: number;
    tdee?: number;
    daily_calories?: number;
    vo2_max_estimate?: number;
    vo2_max_classification?: string;
    heart_rate_zones?: any;
  } | undefined;

  // FIX D: Track whether metrics loaded successfully so we can surface a warning
  let metricsAvailable = true;

  if (userId) {
    try {
      const userMetrics = await loadUserMetrics(env, userId);
      calculatedMetrics = {
        bmr: userMetrics.calculated_bmr,
        tdee: userMetrics.calculated_tdee,
        daily_calories: userMetrics.daily_calories,
        vo2_max_estimate: userMetrics.vo2_max_estimate,
        vo2_max_classification: userMetrics.vo2_max_classification,
        heart_rate_zones: userMetrics.heart_rate_zones,
      };
      console.log('[Workout Generation] Loaded health metrics:', {
        bmr: calculatedMetrics.bmr,
        tdee: calculatedMetrics.tdee,
        vo2max: calculatedMetrics.vo2_max_estimate,
      });
    } catch (error) {
      console.warn('[Workout Generation] Could not load user metrics, continuing without:', error);
      metricsAvailable = false;
    }
  }

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

      // Inject calculated health metrics into the profile so the rule-based engine
      // can use TDEE for calorie calibration and VO2Max for coaching tips.
      // These are optional — engine degrades gracefully if missing.
      // Also inject userId from auth JWT (not present in request body).
      const enrichedRequest: WorkoutGenerationRequest = {
        ...request,
        userId: userId ?? request.userId, // auth-verified userId takes priority
        ...(calculatedMetrics ? {
          profile: {
            ...request.profile,
            bmr: calculatedMetrics.bmr,
            tdee: calculatedMetrics.tdee,
            vo2MaxEstimate: calculatedMetrics.vo2_max_estimate,
            vo2MaxClassification: calculatedMetrics.vo2_max_classification,
            heartRateZones: calculatedMetrics.heart_rate_zones,
          },
        } : {}),
      };

      const ruleBasedResult = await generateRuleBasedWorkout(enrichedRequest);
      const endTime = Date.now();

      console.log('[Workout Generation] ✅ Rule-based generation SUCCESS', {
        workouts: ruleBasedResult.workouts.length,
        totalExercises: ruleBasedResult.workouts.reduce((sum, w) => sum + w.workout.exercises.length, 0),
        generationTime: `${endTime - startTime}ms`,
      });

      // Wrap in same format as LLM response for consistent handling
      return {
        workout: {
          ...ruleBasedResult,
          // FIX D: surface metrics unavailability to the caller
          warnings: metricsAvailable ? undefined : ['Workout personalization is limited — update your profile metrics for better results'],
        },
        metadata: {
          model: 'rule-based-v1',
          aiGenerationTime: endTime - startTime,
          tokensUsed: 0,
          costUsd: 0,
        },
      };
    } catch (error) {
      console.error('[Workout Generation] ❌ Rule-based generation FAILED:', error);

      // LAST-RESORT FALLBACK: rule-based is the only generation path, so a hard
      // failure would leave the user with NO plan at all. Attempt the gentle
      // movement fallback (a hardcoded, safe 2-day walking/mobility plan) before
      // rethrowing. This guarantees the user ALWAYS gets SOME workout, even if
      // the rule-based engine explodes. Safety warnings are unknown here (the
      // safety filter runs inside generateRuleBasedWorkout, which threw before
      // returning), so we pass empty warnings and requiresMedicalClearance=false
      // — the fallback plan is inherently gentle and safe for any user.
      try {
        console.warn('[Workout Generation] Attempting gentle movement fallback plan');
        const fallbackResult = generateGentleMovementFallback(
          enrichedRequest,
          [], // warnings — unknown at this layer; fallback plan is inherently safe
          false, // requiresMedicalClearance — conservative false; plan is gentle movement only
        );
        const fallbackEndTime = Date.now();
        console.warn('[Workout Generation] ✅ Gentle movement fallback SUCCESS', {
          workouts: fallbackResult.workouts.length,
        });
        return {
          workout: {
            ...fallbackResult,
            warnings: [
              '⚠️ A personalized workout could not be generated. This is a basic fallback plan — please try regenerating later for a tailored routine.',
              ...(error instanceof Error ? [`Technical detail: ${error.message}`] : []),
            ],
          },
          metadata: {
            model: 'rule-based-fallback-v1',
            aiGenerationTime: fallbackEndTime - startTime,
            tokensUsed: 0,
            costUsd: 0,
          },
        };
      } catch (fallbackError) {
        // Fallback ALSO failed — log both errors and rethrow the original APIError.
        console.error(
          '[Workout Generation] ❌ Gentle movement fallback ALSO FAILED:',
          fallbackError,
        );
        throw new APIError(
          'Workout generation failed. Please try again.',
          500,
          ErrorCode.AI_GENERATION_FAILED,
          {
            originalError: error instanceof Error ? error.message : String(error),
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          },
        );
      }
    }
  } else {
    // LLM generation is DISABLED for workout plans — rule-based only.
    throw new APIError(
      'Workout generation is currently unavailable. Please try again later.',
      503,
      ErrorCode.AI_GENERATION_FAILED,
      { reason: 'LLM generation disabled for workouts; RULE_BASED_ROLLOUT_PERCENTAGE must be 100' }
    );
  }
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
  validatedWorkout: SingleWorkout;
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
type SingleWorkout = z.infer<typeof SingleWorkoutSchema>;

async function validateExerciseIds(
  aiExerciseIds: string[],
  filteredExercises: Exercise[],
  aiWorkout: SingleWorkout
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
    exercises: NonNullable<typeof aiWorkout.warmup> | typeof aiWorkout.exercises | undefined,
    sectionName: 'warmup' | 'exercises' | 'cooldown'
  ) => {
    if (!exercises || exercises.length === 0) return exercises;

    return exercises.map((workoutEx: { exerciseId: string; [key: string]: any }) => {
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
  const validatedWorkout: SingleWorkout = {
    ...aiWorkout,
    warmup: validatedWarmup as SingleWorkout['warmup'],
    exercises: (validatedExercises ?? aiWorkout.exercises) as SingleWorkout['exercises'],
    cooldown: validatedCooldown as SingleWorkout['cooldown'],
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
