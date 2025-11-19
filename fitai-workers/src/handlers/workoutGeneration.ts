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
import { getExercisesByIds, enrichExercises } from '../utils/exerciseDatabase';
import { getCachedData, saveCachedData, CacheMetadata } from '../utils/cache';
import { ValidationError, APIError } from '../utils/errors';
import { withDeduplication } from '../utils/deduplication';

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
 * Build AI prompt with filtered exercises
 */
function buildWorkoutPrompt(
  request: WorkoutGenerationRequest,
  filteredExercises: Array<{ exerciseId: string; name: string; equipment: string[]; bodyParts: string[] }>
): string {
  const { profile, workoutType, duration } = request;

  return `You are FitAI, an expert personal trainer and workout programmer.

**User Profile:**
- Age: ${profile.age}, Gender: ${profile.gender}, Weight: ${profile.weight}kg, Height: ${profile.height}cm
- Fitness Goal: ${profile.fitnessGoal.replace('_', ' ')}
- Experience Level: ${profile.experienceLevel}
- Available Equipment: ${profile.availableEquipment.join(', ')}
${profile.injuries && profile.injuries.length > 0 ? `- Injuries/Restrictions: ${profile.injuries.join(', ')}` : ''}

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

    // 2. Check cache (3-tier: KV → Database → Fresh)
    const cacheParams = {
      workoutType: request.workoutType,
      duration: request.duration,
      experienceLevel: request.profile.experienceLevel,
      equipment: request.profile.availableEquipment.sort().join(','),
      fitnessGoal: request.profile.fitnessGoal,
      focusMuscles: request.focusMuscles?.sort().join(',') || '',
    };

    const cacheResult = await getCachedData(c.env, 'workout', cacheParams);

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
        return await generateFreshWorkout(request, c.env);
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
      cacheMetadata
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
      'GENERATION_FAILED' as ErrorCode,
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
  env: Env
) {
  // 3. Filter exercises (1500 → 30-50)
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
        'FILTER_FAILED' as ErrorCode,
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
        'EXERCISE_PREPARATION_FAILED' as ErrorCode,
        {
          error: mapError instanceof Error ? mapError.message : String(mapError),
          stack: mapError instanceof Error ? mapError.stack : undefined,
        }
      );
    }

    // 5. Generate workout using AI
    const prompt = buildWorkoutPrompt(request, exercisesForAI);
    const model = createAIProvider(env, request.model);

    console.log('[Workout Generation] Calling AI model:', request.model);

    const aiStartTime = Date.now();
    const result = await generateObject({
      model,
      schema: WorkoutResponseSchema,
      prompt,
      temperature: request.temperature,
      maxTokens: 4096, // Increase output token limit for complex workouts
    });
    const aiGenerationTime = Date.now() - aiStartTime;

    // Validate AI response structure
    if (!result.object) {
      throw new APIError(
        'AI returned empty response',
        500,
        'AI_RESPONSE_INVALID' as ErrorCode,
        { received: result }
      );
    }

    if (!result.object.exercises || !Array.isArray(result.object.exercises) || result.object.exercises.length === 0) {
      throw new APIError(
        'AI returned workout without exercises',
        500,
        'AI_RESPONSE_INVALID' as ErrorCode,
        { received: result.object }
      );
    }

    console.log('[Workout Generation] AI generation complete:', {
      generationTime: aiGenerationTime + 'ms',
      exerciseCount: result.object.exercises?.length || 0,
      warmupCount: result.object.warmup?.length || 0,
      cooldownCount: result.object.cooldown?.length || 0,
    });

    // 6. Enrich workout with full exercise data
    console.log('[Workout Generation] Enriching workout with exercise data...');
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
        'RESPONSE_PROCESSING_FAILED' as ErrorCode,
        {
          error: idError instanceof Error ? idError.message : String(idError),
          aiResponse: result.object,
        }
      );
    }

    const exerciseData = await getExercisesByIds(allExerciseIds);
    const enrichedExercises = enrichExercises(exerciseData);
    console.log('[Workout Generation] Enriched exercises:', enrichedExercises.length);

    // Create a map for quick lookup
    const exerciseMap = new Map(enrichedExercises.map((ex) => [ex.exerciseId, ex]));

    // 7. Build enriched response
    console.log('[Workout Generation] Building enriched workout response...');
    const enrichedWorkout = {
      ...result.object,
      exercises: result.object.exercises?.map((workoutEx) => ({
        ...workoutEx,
        exerciseData: exerciseMap.get(workoutEx.exerciseId),
      })) || [],
      warmup: result.object.warmup?.map((workoutEx) => ({
        ...workoutEx,
        exerciseData: exerciseMap.get(workoutEx.exerciseId),
      })),
      cooldown: result.object.cooldown?.map((workoutEx) => ({
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
      },
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
