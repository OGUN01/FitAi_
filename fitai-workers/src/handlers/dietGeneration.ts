/**
 * FitAI Workers - Diet Generation Handler
 *
 * Generates personalized AI diet/meal plans using:
 * - Vercel AI SDK with structured output
 * - 3-tier caching system
 * - Nutritional accuracy and dietary restrictions
 */

import { Context } from 'hono';
import { generateObject, createGateway } from 'ai';
import { z } from 'zod';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  DietGenerationRequest,
  DietGenerationRequestSchema,
  DietResponseSchema,
  DietResponse,
  validateRequest,
} from '../utils/validation';
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
// DIET GENERATION PROMPT
// ============================================================================

/**
 * Build AI prompt for diet plan generation
 */
function buildDietPrompt(request: DietGenerationRequest): string {
  const { calorieTarget, macros, dietaryRestrictions, mealsPerDay, excludeIngredients } = request;

  // Calculate macro grams from percentages
  const proteinCals = macros ? (calorieTarget * macros.protein) / 100 : calorieTarget * 0.3;
  const carbsCals = macros ? (calorieTarget * macros.carbs) / 100 : calorieTarget * 0.4;
  const fatsCals = macros ? (calorieTarget * macros.fats) / 100 : calorieTarget * 0.3;

  const proteinGrams = Math.round(proteinCals / 4);
  const carbsGrams = Math.round(carbsCals / 4);
  const fatsGrams = Math.round(fatsCals / 9);

  return `You are FitAI, an expert nutritionist and meal planner.

**Nutrition Goals:**
- Total Daily Calories: ${calorieTarget} kcal
- Target Macros:
  * Protein: ${proteinGrams}g (${macros?.protein || 30}%)
  * Carbs: ${carbsGrams}g (${macros?.carbs || 40}%)
  * Fats: ${fatsGrams}g (${macros?.fats || 30}%)

**Meal Requirements:**
- Meals Per Day: ${mealsPerDay}
${dietaryRestrictions && dietaryRestrictions.length > 0 ? `- Dietary Restrictions: ${dietaryRestrictions.join(', ')}` : ''}
${excludeIngredients && excludeIngredients.length > 0 ? `- Exclude Ingredients: ${excludeIngredients.join(', ')}` : ''}

**IMPORTANT RULES:**
1. Total calories across all meals MUST equal ${calorieTarget} ± 50 kcal
2. Macro distribution should match targets (±5% acceptable)
3. Strictly follow dietary restrictions (e.g., no meat for vegetarian, no animal products for vegan)
4. Avoid all excluded ingredients completely
5. Use realistic portion sizes and common foods
6. Include variety across meals - don't repeat the same foods
7. Provide accurate nutritional information for each food item
8. Include practical cooking instructions when needed
9. Consider meal timing and digestion (lighter breakfast, substantial lunch/dinner)
10. Each meal should be balanced with protein, carbs, and healthy fats

**Meal Structure Guidelines:**
- Breakfast: 20-25% of daily calories, quick to prepare
- Morning Snack (if applicable): 10-15% of daily calories
- Lunch: 30-35% of daily calories, balanced macros
- Afternoon Snack (if applicable): 10-15% of daily calories
- Dinner: 25-30% of daily calories, protein-focused
- Evening Snack (if applicable): 5-10% of daily calories

**Food Quality Priorities:**
1. Whole, minimally processed foods
2. Lean proteins (chicken, fish, tofu, legumes)
3. Complex carbohydrates (brown rice, quinoa, oats, sweet potato)
4. Healthy fats (avocado, nuts, olive oil, fatty fish)
5. Plenty of vegetables and fruits for micronutrients
6. Adequate fiber for digestion

Generate a complete, balanced daily meal plan that meets all requirements.`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * POST /diet/generate - Generate personalized diet plan
 */
export async function handleDietGeneration(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Validate request
    const rawBody = await c.req.json();
    const request: DietGenerationRequest = validateRequest(
      DietGenerationRequestSchema,
      rawBody
    );

    console.log('[Diet Generation] Request validated:', {
      calorieTarget: request.calorieTarget,
      mealsPerDay: request.mealsPerDay,
      restrictions: request.dietaryRestrictions?.length || 0,
    });

    // 2. Check cache (3-tier: KV → Database → Fresh)
    const cacheParams = {
      calorieTarget: request.calorieTarget,
      mealsPerDay: request.mealsPerDay,
      macros: request.macros
        ? `${request.macros.protein}-${request.macros.carbs}-${request.macros.fats}`
        : 'default',
      restrictions: request.dietaryRestrictions?.sort().join(',') || 'none',
      excludes: request.excludeIngredients?.sort().join(',') || 'none',
    };

    const cacheResult = await getCachedData(c.env, 'diet', cacheParams);

    if (cacheResult.hit) {
      console.log(`[Diet Generation] Cache HIT from ${cacheResult.source}`);

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

    console.log('[Diet Generation] Cache MISS - generating fresh diet plan');

    // 3. Use deduplication to prevent duplicate AI calls during burst traffic
    const deduplicationResult = await withDeduplication(
      c.env,
      cacheResult.cacheKey!,
      async () => {
        // This function will only execute if no identical request is in-flight
        return await generateFreshDiet(request, c.env);
      }
    );

    if (deduplicationResult.deduplicated) {
      console.log(`[Diet Generation] DEDUPLICATED! Waited ${deduplicationResult.waitTime}ms`);

      return c.json(
        {
          success: true,
          data: deduplicationResult.data.diet,
          metadata: {
            ...deduplicationResult.data.metadata,
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
    console.log('[Diet Generation] Generated fresh (no deduplication)');
    const dietResult = deduplicationResult.data;
    const aiGenerationTime = dietResult.metadata.aiGenerationTime;

    // 5. Save to cache (KV + Database)
    const cacheMetadata: CacheMetadata = {
      modelUsed: dietResult.metadata.model,
      generationTimeMs: aiGenerationTime,
      tokensUsed: dietResult.metadata.tokensUsed,
      costUsd: dietResult.metadata.costUsd,
    };

    await saveCachedData(
      c.env,
      'meal',
      cacheResult.cacheKey!,
      dietResult.diet,
      cacheMetadata
    );

    console.log('[Diet Generation] Cached successfully');

    // 6. Return response
    const totalTime = Date.now() - startTime;

    return c.json(
      {
        success: true,
        data: dietResult.diet,
        metadata: {
          ...dietResult.metadata,
          generationTime: totalTime,
          cached: false,
          deduplicated: false,
        },
      },
      200
    );
  } catch (error) {
    console.error('[Diet Generation] Error:', error);

    if (error instanceof ValidationError || error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to generate diet plan. Please try again.',
      500,
      'GENERATION_FAILED',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ============================================================================
// FRESH DIET GENERATION (Extracted for Deduplication)
// ============================================================================

/**
 * Generate a fresh diet plan (used by deduplication wrapper)
 */
async function generateFreshDiet(
  request: DietGenerationRequest,
  env: Env
) {
  // 3. Generate diet plan using AI
  const prompt = buildDietPrompt(request);
  const model = createAIProvider(env, request.model);

  console.log('[Diet Generation] Calling AI model:', request.model);

    const aiStartTime = Date.now();
    const result = await generateObject({
      model,
      schema: DietResponseSchema,
      prompt,
      temperature: request.temperature,
      maxTokens: 8192, // Increase output token limit for complex meal plans
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

    if (!result.object.meals || !Array.isArray(result.object.meals) || result.object.meals.length === 0) {
      throw new APIError(
        'AI returned diet plan without meals',
        500,
        'AI_RESPONSE_INVALID' as ErrorCode,
        { received: result.object }
      );
    }

    console.log('[Diet Generation] AI generation complete:', {
      generationTime: aiGenerationTime + 'ms',
      mealCount: result.object.meals?.length || 0,
      totalCalories: result.object.totalCalories,
    });

    // 4. Validate nutritional accuracy
    const calculatedCalories = result.object.meals.reduce(
      (sum, meal) => sum + meal.totalNutrition.calories,
      0
    );

    if (Math.abs(calculatedCalories - request.calorieTarget) > 100) {
      console.warn('[Diet Generation] Calorie mismatch:', {
        target: request.calorieTarget,
        calculated: calculatedCalories,
        difference: Math.abs(calculatedCalories - request.calorieTarget),
      });
    }

    // Return diet with metadata for deduplication/caching
    return {
      diet: result.object,
      metadata: {
        model: request.model,
        aiGenerationTime,
        tokensUsed: result.usage?.totalTokens,
        costUsd: calculateCost(request.model, result.usage?.totalTokens || 0),
        nutritionalAccuracy: {
          targetCalories: request.calorieTarget,
          actualCalories: calculatedCalories,
          difference: Math.abs(calculatedCalories - request.calorieTarget),
        },
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
    'google/gemini-2.5-flash': 0.0001, // $0.10 per 1M tokens
    'google/gemini-1.5-pro': 0.002, // $2.00 per 1M tokens
    'openai/gpt-4': 0.03, // $30 per 1M tokens
    'openai/gpt-3.5-turbo': 0.0015, // $1.50 per 1M tokens
  };

  const costRate = costPer1kTokens[modelId] || 0.001; // Default $1 per 1M tokens
  return (tokens / 1000) * costRate;
}
