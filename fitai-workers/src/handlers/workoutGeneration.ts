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
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  WorkoutGenerationRequest,
  WorkoutGenerationRequestSchema,
  validateRequest,
} from '../utils/validation';
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
 * Determine if rule-based generation should be used.
 *
 * Rule-based generation is the ONLY workout generation strategy in this
 * handler — the LLM branch was removed (see the `else` below). There is no
 * second strategy left to gradually roll traffic onto, so this is a plain
 * on/off switch rather than a percentage rollout: percentage-based hash
 * bucketing previously left any RULE_BASED_ROLLOUT_PERCENTAGE value other
 * than exactly 0 or 100 stranding a slice of users permanently on the
 * `else` branch's hard 503. 0 = disabled (kill switch), anything else = on.
 */
function shouldUseRuleBasedGeneration(rolloutPercentage: number = 0): boolean {
  return rolloutPercentage > 0;
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
  const useRuleBased = shouldUseRuleBasedGeneration(RULE_BASED_ROLLOUT_PERCENTAGE);

  if (useRuleBased) {
    console.log('[Workout Generation] 🎯 Using RULE-BASED generation', {
      userId,
      rolloutPercentage: RULE_BASED_ROLLOUT_PERCENTAGE,
    });

    // Declared outside the try block (not `const` inside it) so both the
    // success path AND the catch block's gentle-movement-fallback below can
    // see them — they were previously scoped inside `try`, which made them
    // inaccessible (ReferenceError) from `catch`, silently breaking the
    // fallback safety net on every rule-based generation failure.
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

    try {
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
    // Rule-based generation is disabled via the kill switch
    // (RULE_BASED_ROLLOUT_PERCENTAGE=0) and there is no other generation
    // strategy configured.
    throw new APIError(
      'Workout generation is currently unavailable. Please try again later.',
      503,
      ErrorCode.AI_GENERATION_FAILED,
      { reason: 'Rule-based workout generation is disabled (RULE_BASED_ROLLOUT_PERCENTAGE=0)' }
    );
  }
}

// NOTE: The former LLM-hallucination-repair validation logic
// (validateExerciseIds/findSimilarExercise, ~250 lines) was removed here.
// It validated AI-suggested exercise IDs against the filtered/full exercise
// database and repaired hallucinated IDs — but it was never called from
// anywhere once generation became rule-based only (rule-based generation
// only ever selects real exercise IDs from the database, so there is
// nothing to hallucinate-repair). See git history for the removed
// implementation if an LLM generation path is reintroduced.
