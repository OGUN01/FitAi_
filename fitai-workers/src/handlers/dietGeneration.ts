/**
 * FitAI Workers - AI-First Diet Generation Handler
 *
 * **Phase 1 Implementation: 100% AI-First Approach**
 *
 * Key Features:
 * - AI generates freely from full food knowledge (10,000+ dishes)
 * - Regional cuisine detection (Indian, Mexican, Chinese, etc.)
 * - Cooking method preferences (air fryer, less oil)
 * - Multi-layer validation (allergens, diet type, calorie drift)
 * - Mathematical portion adjustment to hit exact targets
 * - NO FALLBACK TEMPLATES - All errors exposed immediately
 *
 * @see IMPLEMENTATION_PLAN_AI_FIRST.md
 */

import { Context } from 'hono';
import { generateObject, createGateway } from 'ai';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  DietGenerationRequest,
  DietGenerationRequestSchema,
  DietResponseSchema,
  DietResponse,
  validateRequest,
  DietValidationError,
  DietValidationWarning,
  DietValidationResult,
  UserProfileContext,
  DietPreferences,
  Meal,
} from '../utils/validation';
import { getCachedData, saveCachedData, CacheMetadata } from '../utils/cache';
import { ValidationError, APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { withDeduplication } from '../utils/deduplication';
import {
  loadUserMetrics,
  loadUserProfile,
  loadUserPreferences,
  UserHealthMetrics,
} from '../services/userMetricsService';
import { adjustForProteinTarget } from '../utils/portionAdjustment';

// Import the new specialized diet prompt system
import { buildDietPrompt } from '../prompts/diet';
import { detectCuisine } from '../prompts/diet/types';

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================

/**
 * Initialize Vercel AI SDK with Vercel AI Gateway
 * Creates gateway instance with explicit API key (Cloudflare Workers don't have process.env)
 * Model format: provider/model (e.g., 'google/gemini-2.0-flash-exp', 'openai/gpt-4-turbo-preview')
 */
function createAIProvider(env: Env, modelId: string) {
  // Create gateway instance with explicit API key for Cloudflare Workers
  const gatewayInstance = createGateway({
    apiKey: env.AI_GATEWAY_API_KEY,
  });

  // Return model from gateway - use gemini-2.5-flash which is confirmed working
  const model = modelId || 'google/gemini-2.5-flash';
  return gatewayInstance(model);
}

// ============================================================================
// NOTE: Diet prompts are now handled by specialized prompt files in
// ../prompts/diet/ (vegan.ts, vegetarian.ts, pescatarian.ts, nonVeg.ts, keto.ts)
// The buildDietPrompt function is imported from there.
// ============================================================================

// ============================================================================
// ALLERGEN VALIDATION
// ============================================================================

/**
 * Get common aliases for allergens
 * Ensures comprehensive allergen detection
 */
function getAllergenAliases(allergen: string): string[] {
  const aliases: Record<string, string[]> = {
    peanut: ['peanut', 'groundnut', 'monkey nut', 'peanut butter', 'peanut oil'],
    shellfish: [
      'shellfish',
      'shrimp',
      'prawn',
      'crab',
      'lobster',
      'oyster',
      'clam',
      'mussel',
      'scallop',
      'crawfish',
    ],
    tree_nut: [
      'almond',
      'cashew',
      'walnut',
      'pecan',
      'pistachio',
      'hazelnut',
      'macadamia',
      'brazil nut',
    ],
    dairy: [
      'milk',
      'cheese',
      'yogurt',
      'yoghurt',
      'butter',
      'cream',
      'whey',
      'casein',
      'paneer',
      'ghee',
    ],
    egg: ['egg', 'albumin', 'mayonnaise', 'mayo', 'omelette', 'omelet'],
    soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'soy sauce', 'tamari'],
    // Gluten - only flag actual gluten sources, not cooking formats
    // Jowar/bajra/ragi rotis are gluten-free, so don't flag 'roti' generically
    gluten: ['wheat', 'barley', 'rye', 'gluten', 'wheat flour', 'maida', 'semolina', 'suji', 'rava',
             'bread', 'pasta', 'naan', 'paratha', 'chapati', 'puri', 'bhatura', 'kulcha', 'couscous', 'seitan'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'sardine', 'anchovy', 'mackerel'],
  };

  const allergenLower = allergen.toLowerCase();

  // Find matching allergen group
  for (const [key, values] of Object.entries(aliases)) {
    if (allergenLower.includes(key) || values.some((v) => allergenLower.includes(v))) {
      return values;
    }
  }

  // If no match, return the allergen itself
  return [allergenLower];
}

/**
 * Check if food contains allergen (with alias detection and exception handling)
 */
function containsAllergen(foodName: string, allergen: string): boolean {
  const foodLower = foodName.toLowerCase();
  const allergenLower = allergen.toLowerCase();

  // Handle gluten allergen specially
  if (allergenLower === 'gluten') {
    // "Gluten-Free" or "GF" labels should NOT be flagged as containing gluten
    if (foodLower.includes('gluten-free') || foodLower.includes('gluten free') || foodLower.includes('gf')) {
      return false;
    }
    // Check gluten-free grains/millets exceptions
    if (isGlutenFreeException(foodLower)) {
      return false; // Jowar, bajra, moong dal, etc. are gluten-free
    }
  }

  // Direct match
  if (foodLower.includes(allergenLower)) {
    return true;
  }

  // Check aliases
  const aliases = getAllergenAliases(allergen);
  return aliases.some((alias) => foodLower.includes(alias));
}

// ============================================================================
// DIET TYPE VIOLATION DETECTION
// ============================================================================

/**
 * Vegan-friendly foods that contain dairy/egg keywords but are actually plant-based
 * This prevents false positives in validation
 */
const VEGAN_FRIENDLY_EXCEPTIONS = [
  // Plant-based milks
  'soy milk', 'almond milk', 'oat milk', 'coconut milk', 'rice milk', 'cashew milk',
  'hemp milk', 'flax milk', 'macadamia milk', 'pea milk', 'hazelnut milk',
  // Nut/seed butters
  'peanut butter', 'almond butter', 'cashew butter', 'sunflower butter', 'tahini',
  'seed butter', 'nut butter', 'cocoa butter', 'shea butter', 'mango butter',
  // Plant-based creams
  'coconut cream', 'cashew cream', 'oat cream', 'soy cream',
  // Vegan cheese/dairy alternatives
  'vegan cheese', 'nutritional yeast', 'dairy-free', 'plant-based',
  // Vegan yogurt alternatives
  'vegan yogurt', 'vegan yoghurt', 'coconut yogurt', 'coconut yoghurt',
  'almond yogurt', 'almond yoghurt', 'soy yogurt', 'soy yoghurt',
  'oat yogurt', 'oat yoghurt', 'cashew yogurt', 'cashew yoghurt',
  'plant-based yogurt', 'dairy-free yogurt',
  // Vegan egg alternatives
  'tofu scramble', 'chickpea omelette', 'vegan egg', 'flax egg', 'chia egg',
  'aquafaba', 'just egg',
  // Butternut squash (contains 'butter' keyword)
  'butternut', 'butterbeans', 'butter beans', 'butterfly',
];

/**
 * Check if food is a vegan-friendly exception
 * Returns true if the food name matches a known plant-based alternative
 */
function isVeganFriendlyException(foodName: string): boolean {
  const foodLower = foodName.toLowerCase();
  return VEGAN_FRIENDLY_EXCEPTIONS.some((exception) => foodLower.includes(exception));
}

/**
 * Gluten-free foods that might trigger false positives
 * Indian millets, legumes, and gluten-free grains
 */
const GLUTEN_FREE_EXCEPTIONS = [
  // Gluten-free Indian rotis/breads
  'jowar', 'bajra', 'ragi', 'nachni', 'makki', 'buckwheat', 'amaranth', 'quinoa',
  'rice flour', 'besan', 'chickpea flour', 'gram flour', 'almond flour',
  'coconut flour', 'tapioca', 'sorghum', 'millet',
  // Gluten-free grains
  'corn', 'maize', 'polenta', 'teff', 'arrowroot',
  // Gluten-free dals/legumes (all dals are naturally gluten-free)
  'moong', 'mung', 'masoor', 'toor', 'chana', 'urad', 'dal', 'lentil',
];

/**
 * Check if food is a gluten-free exception
 */
function isGlutenFreeException(foodName: string): boolean {
  const foodLower = foodName.toLowerCase();
  return GLUTEN_FREE_EXCEPTIONS.some((exception) => foodLower.includes(exception));
}

/**
 * Check for diet type violations
 * Returns array of validation errors if violations found
 */
function checkDietTypeViolations(meals: Meal[], dietType: string): DietValidationError[] {
  const errors: DietValidationError[] = [];

  const meatKeywords = [
    'chicken',
    'beef',
    'pork',
    'mutton',
    'lamb',
    'goat',
    'turkey',
    'duck',
    'bacon',
    'sausage',
    'ham',
  ];
  const fishKeywords = [
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'sardine',
    'anchovy',
    'mackerel',
  ];
  const dairyKeywords = [
    'milk',
    'cheese',
    'yogurt',
    'yoghurt',
    'paneer',
    'butter',
    'ghee',
    'cream',
    'whey',
  ];
  const eggKeywords = ['egg', 'omelette', 'omelet', 'scrambled', 'albumin'];

  for (const meal of meals) {
    for (const food of meal.foods) {
      const foodLower = food.name.toLowerCase();
      
      // Skip validation for known vegan-friendly foods
      if (isVeganFriendlyException(foodLower)) {
        continue;
      }

      // Vegan checks (strictest)
      if (dietType.toLowerCase() === 'vegan') {
        if (meatKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet cannot contain meat: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (fishKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet cannot contain fish/seafood: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (dairyKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet cannot contain dairy: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (eggKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet cannot contain eggs: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
      }

      // Vegetarian checks
      if (dietType.toLowerCase() === 'vegetarian') {
        if (meatKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegetarian diet cannot contain meat: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (fishKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegetarian diet cannot contain fish/seafood: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
      }

      // Pescatarian checks
      if (dietType.toLowerCase() === 'pescatarian') {
        if (meatKeywords.some((k) => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Pescatarian diet cannot contain meat: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
      }
    }
  }

  return errors;
}

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

/**
 * Validate AI-generated diet plan with multi-layer checks
 *
 * **Critical Validation (Blocks Plan):**
 * 1. Allergen detection (with aliases)
 * 2. Diet type violations
 * 3. Extreme calorie drift (>30%)
 * 4. Missing required fields
 *
 * **Quality Warnings (Non-Blocking):**
 * 1. Moderate calorie drift (10-30%)
 * 2. Low protein (<80% of target)
 * 3. Low food variety
 *
 * @param aiResponse - AI-generated meal plan
 * @param metrics - User's calculated metrics
 * @param prefs - User's diet preferences
 * @returns Validation result with errors and warnings
 */
function validateDietPlan(
  aiResponse: DietResponse,
  metrics: UserHealthMetrics,
  prefs: DietPreferences | null
): DietValidationResult {
  const errors: DietValidationError[] = [];
  const warnings: DietValidationWarning[] = [];

  console.log('[DietValidation] Starting comprehensive validation');

  // ==========================================
  // CRITICAL VALIDATION (Must Pass)
  // ==========================================

  // 1. ALLERGEN CHECK (CRITICAL)
  const allergies = prefs?.allergies || [];
  for (const meal of aiResponse.meals) {
    for (const food of meal.foods) {
      for (const allergen of allergies) {
        if (containsAllergen(food.name, allergen)) {
          errors.push({
            severity: 'CRITICAL',
            code: 'ALLERGEN_DETECTED',
            message: `CRITICAL: Contains allergen "${allergen}" in food "${food.name}"`,
            meal: meal.name,
            food: food.name,
            allergen: allergen,
          });

          console.error('[DietValidation] ALLERGEN DETECTED:', {
            meal: meal.name,
            food: food.name,
            allergen,
          });
        }
      }
    }
  }

  // 2. DIET TYPE VIOLATION CHECK (CRITICAL)
  const dietType = prefs?.diet_type || 'omnivore';
  const dietViolations = checkDietTypeViolations(aiResponse.meals, dietType);
  if (dietViolations.length > 0) {
    errors.push(...dietViolations);
    console.error('[DietValidation] DIET TYPE VIOLATIONS:', dietViolations.length);
  }

  // 3. EXTREME CALORIE DRIFT CHECK (CRITICAL - >30% off)
  const totalCal = aiResponse.totalCalories;
  const targetCal = metrics.daily_calories;
  const calorieDrift = Math.abs(totalCal - targetCal) / targetCal;

  if (calorieDrift > 0.3) {
    // More than 30% off target
    errors.push({
      severity: 'CRITICAL',
      code: 'EXTREME_CALORIE_DRIFT',
      message: `CRITICAL: Extreme calorie deviation: ${totalCal} cal vs ${targetCal} cal target (${(calorieDrift * 100).toFixed(0)}% off)`,
      current: totalCal,
      target: targetCal,
      drift: calorieDrift,
    });

    console.error('[DietValidation] EXTREME CALORIE DRIFT:', {
      current: totalCal,
      target: targetCal,
      drift: `${(calorieDrift * 100).toFixed(1)}%`,
    });
  }

  // 4. MISSING REQUIRED FIELDS CHECK
  for (const meal of aiResponse.meals) {
    if (!meal.name || !meal.mealType || !meal.foods || meal.foods.length === 0) {
      errors.push({
        severity: 'CRITICAL',
        code: 'MISSING_REQUIRED_FIELDS',
        message: `CRITICAL: Meal missing required fields (name, type, or foods)`,
        meal: meal.name || 'Unknown',
      });
    }

    for (const food of meal.foods) {
      if (
        !food.name ||
        food.nutrition.calories === undefined ||
        food.nutrition.protein === undefined
      ) {
        errors.push({
          severity: 'CRITICAL',
          code: 'INCOMPLETE_FOOD_DATA',
          message: `CRITICAL: Food "${food.name}" missing nutrition data`,
          meal: meal.name,
          food: food.name,
        });
      }
    }
  }

  // ==========================================
  // QUALITY WARNINGS (Non-blocking)
  // ==========================================

  // 1. MODERATE CALORIE DRIFT (10-30% off)
  if (calorieDrift > 0.1 && calorieDrift <= 0.3) {
    warnings.push({
      severity: 'WARNING',
      code: 'MODERATE_CALORIE_DRIFT',
      message: `Calories need adjustment: ${totalCal} vs ${targetCal} (will auto-adjust portions)`,
      action: 'ADJUST_PORTIONS',
    });

    console.warn('[DietValidation] Moderate calorie drift - will adjust portions');
  }

  // 2. LOW PROTEIN WARNING (<80% of target)
  const proteinRatio = aiResponse.totalNutrition.protein / metrics.daily_protein_g;
  if (proteinRatio < 0.8) {
    warnings.push({
      severity: 'WARNING',
      code: 'LOW_PROTEIN',
      message: `Protein is ${aiResponse.totalNutrition.protein}g, target is ${metrics.daily_protein_g}g (${(proteinRatio * 100).toFixed(0)}%)`,
      action: 'LOG_FOR_AI_IMPROVEMENT',
    });

    console.warn('[DietValidation] Low protein:', {
      actual: aiResponse.totalNutrition.protein,
      target: metrics.daily_protein_g,
      ratio: `${(proteinRatio * 100).toFixed(1)}%`,
    });
  }

  // 3. LOW FOOD VARIETY CHECK
  const allFoods = aiResponse.meals.flatMap((m) => m.foods.map((f) => f.name.toLowerCase()));
  const uniqueFoods = new Set(allFoods);
  const varietyRatio = uniqueFoods.size / allFoods.length;

  if (varietyRatio < 0.6) {
    // Less than 60% unique foods
    warnings.push({
      severity: 'INFO',
      code: 'LOW_VARIETY',
      message: `Food variety is low (${uniqueFoods.size} unique foods out of ${allFoods.length} total)`,
      action: 'LOG_FOR_AI_IMPROVEMENT',
    });

    console.warn('[DietValidation] Low variety:', {
      unique: uniqueFoods.size,
      total: allFoods.length,
      ratio: `${(varietyRatio * 100).toFixed(1)}%`,
    });
  }

  // Log validation summary
  console.log('[DietValidation] Validation complete:', {
    isValid: errors.length === 0,
    criticalErrors: errors.length,
    warnings: warnings.length,
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * POST /diet/generate - Generate personalized diet plan (AI-First Approach)
 *
 * **NO FALLBACK TEMPLATES** - All errors are exposed immediately
 *
 * Flow:
 * 1. Load user metrics from database
 * 2. Build comprehensive AI prompt
 * 3. Generate with AI (full freedom)
 * 4. Validate (allergens, diet type, calories)
 * 5. Adjust portions mathematically
 * 6. Return or fail with detailed error
 */
export async function handleDietGeneration(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Validate request
    const rawBody = await c.req.json();
    const request: DietGenerationRequest = validateRequest(DietGenerationRequestSchema, rawBody);

    console.log('[Diet Generation] Request validated:', {
      calorieTarget: request.calorieTarget,
      mealsPerDay: request.mealsPerDay,
      restrictions: request.dietaryRestrictions?.length || 0,
    });

    // Get authenticated user ID (if available)
    const user = c.get('user');
    const userId = user?.id;

    if (!userId) {
      throw new APIError(
        'User ID required for AI-first diet generation',
        401,
        ErrorCode.UNAUTHORIZED,
        { message: 'Please log in to generate personalized diet plans' }
      );
    }

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

    const cacheResult = await getCachedData(c.env, 'meal', cacheParams, userId);

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
        return await generateFreshDiet(request, c.env, userId);
      }
    );

    if (deduplicationResult.deduplicated) {
      console.log(
        `[Diet Generation] DEDUPLICATED! Waited ${deduplicationResult.waitTime}ms`
      );

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
      cacheMetadata,
      userId
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
      ErrorCode.AI_GENERATION_FAILED,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ============================================================================
// FRESH DIET GENERATION (Extracted for Deduplication)
// ============================================================================

/**
 * Generate a fresh diet plan (used by deduplication wrapper)
 *
 * **AI-First Flow:**
 * 1. Load user metrics, profile, preferences
 * 2. Build comprehensive prompt
 * 3. Generate with AI (NO food filtering)
 * 4. Validate (allergens, diet type, calories)
 * 5. Adjust portions if needed
 * 6. Return or throw detailed error
 */
async function generateFreshDiet(
  request: DietGenerationRequest,
  env: Env,
  userId: string
) {
  console.log('[Diet Generation] Starting AI-first generation for user:', userId);

  // 1. Load user data from database
  const [metrics, profile, preferences] = await Promise.all([
    loadUserMetrics(env, userId),
    loadUserProfile(env, userId),
    loadUserPreferences(env, userId),
  ]);

  console.log('[Diet Generation] User data loaded:', {
    daily_calories: metrics.daily_calories,
    protein: metrics.daily_protein_g,
    diet_type: preferences.diet?.diet_type,
    allergies: preferences.diet?.allergies?.length || 0,
  });

  // 2. Build comprehensive AI prompt (NO FOOD FILTERING)
  const prompt = buildDietPrompt(metrics, profile, preferences.diet);

  console.log('[Diet Generation] Prompt built. Cuisine detected:', {
    cuisine: detectCuisine(profile?.country),
    country: profile?.country,
    state: profile?.state,
  });

  // 3. Generate with AI - use gemini-2.5-flash which is confirmed working
  const model = createAIProvider(env, request.model || 'google/gemini-2.5-flash');

  console.log('[Diet Generation] Calling AI model:', request.model || 'google/gemini-2.5-flash');

  const aiStartTime = Date.now();
  const result = await generateObject({
    model,
    schema: DietResponseSchema,
    prompt,
    temperature: request.temperature || 0.7,
    // Note: maxTokens may not be supported by all models via AI Gateway
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

  if (!result.object.meals || !Array.isArray(result.object.meals) || result.object.meals.length === 0) {
    throw new APIError(
      'AI returned diet plan without meals',
      500,
      ErrorCode.AI_INVALID_RESPONSE,
      { received: result.object }
    );
  }

  console.log('[Diet Generation] AI generation complete:', {
    generationTime: aiGenerationTime + 'ms',
    mealCount: result.object.meals?.length || 0,
    totalCalories: result.object.totalCalories,
  });

  // 3.5 POST-PROCESSING: Filter out disabled meal types (safety net for prompt violations)
  const filteredMealPlan = filterDisabledMeals(result.object, preferences.diet);

  // 4. COMPREHENSIVE VALIDATION (NO FALLBACK)
  const validationResult = validateDietPlan(filteredMealPlan, metrics, preferences.diet);

  // If validation FAILED - throw error (NO FALLBACK)
  if (!validationResult.isValid) {
    console.error('[Diet Generation] CRITICAL VALIDATION FAILED:', validationResult.errors);

    // Return detailed error to expose the issue
    throw new APIError(
      'AI-generated meal plan failed critical validation',
      400,
      ErrorCode.VALIDATION_ERROR,
      {
        validationErrors: validationResult.errors,
        action: 'Please retry generation or contact support',
      }
    );
  }

  // Log warnings (non-blocking)
  if (validationResult.warnings.length > 0) {
    console.warn('[Diet Generation] Quality warnings:', validationResult.warnings);
  }

  // 5. Adjust portions to match EXACT calorie AND protein targets
  const adjustedDiet = adjustForProteinTarget(
    filteredMealPlan, 
    metrics.daily_calories,
    metrics.daily_protein_g
  );

  console.log('[Diet Generation] Portions adjusted (calorie + protein):', {
    originalCalories: filteredMealPlan.totalCalories,
    adjustedCalories: adjustedDiet.totalCalories,
    targetCalories: metrics.daily_calories,
    calorieDifference: Math.abs(adjustedDiet.totalCalories - metrics.daily_calories),
    originalProtein: filteredMealPlan.totalNutrition.protein,
    adjustedProtein: adjustedDiet.totalNutrition.protein,
    targetProtein: metrics.daily_protein_g,
    proteinDifference: Math.abs(adjustedDiet.totalNutrition.protein - metrics.daily_protein_g),
  });

  // Return diet with metadata for deduplication/caching
  return {
    diet: adjustedDiet,
    metadata: {
      model: request.model || 'google/gemini-2.5-flash',
      aiGenerationTime,
      tokensUsed: result.usage?.totalTokens,
      costUsd: calculateCost(request.model || 'google/gemini-2.5-flash', result.usage?.totalTokens || 0),
      validationPassed: true,
      warningsCount: validationResult.warnings.length,
      warnings: validationResult.warnings,
      adjustmentApplied: true,
      nutritionalAccuracy: {
        targetCalories: metrics.daily_calories,
        actualCalories: adjustedDiet.totalCalories,
        difference: Math.abs(adjustedDiet.totalCalories - metrics.daily_calories),
        targetProtein: metrics.daily_protein_g,
        actualProtein: adjustedDiet.totalNutrition.protein,
        targetCarbs: metrics.daily_carbs_g,
        actualCarbs: adjustedDiet.totalNutrition.carbs,
        targetFat: metrics.daily_fat_g,
        actualFat: adjustedDiet.totalNutrition.fats,
      },
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filter out disabled meal types from the AI-generated plan
 * This is a safety net in case AI ignores prompt instructions
 */
function filterDisabledMeals(
  mealPlan: DietResponse,
  prefs: DietPreferences | null
): DietResponse {
  if (!prefs) return mealPlan;
  
  // Get meal type flags from preferences
  const snacksEnabled = (prefs as any)?.snacks_enabled !== false;
  const breakfastEnabled = (prefs as any)?.breakfast_enabled !== false;
  const lunchEnabled = (prefs as any)?.lunch_enabled !== false;
  const dinnerEnabled = (prefs as any)?.dinner_enabled !== false;
  
  // Snack meal types to filter
  const snackTypes = ['morning_snack', 'afternoon_snack', 'evening_snack'];
  
  // Filter meals based on enabled flags
  const filteredMeals = mealPlan.meals.filter(meal => {
    const mealType = meal.mealType.toLowerCase();
    
    // Check if snacks should be excluded
    if (!snacksEnabled && snackTypes.includes(mealType)) {
      console.log('[Diet Generation] Filtering out disabled snack:', meal.name);
      return false;
    }
    
    // Check individual meal types
    if (!breakfastEnabled && mealType === 'breakfast') {
      console.log('[Diet Generation] Filtering out disabled breakfast:', meal.name);
      return false;
    }
    if (!lunchEnabled && mealType === 'lunch') {
      console.log('[Diet Generation] Filtering out disabled lunch:', meal.name);
      return false;
    }
    if (!dinnerEnabled && mealType === 'dinner') {
      console.log('[Diet Generation] Filtering out disabled dinner:', meal.name);
      return false;
    }
    
    return true;
  });
  
  // If meals were filtered, recalculate totals
  if (filteredMeals.length !== mealPlan.meals.length) {
    const totalNutrition = {
      calories: filteredMeals.reduce((sum, m) => sum + m.totalNutrition.calories, 0),
      protein: Math.round(filteredMeals.reduce((sum, m) => sum + m.totalNutrition.protein, 0) * 10) / 10,
      carbs: Math.round(filteredMeals.reduce((sum, m) => sum + m.totalNutrition.carbs, 0) * 10) / 10,
      fats: Math.round(filteredMeals.reduce((sum, m) => sum + m.totalNutrition.fats, 0) * 10) / 10,
      fiber: filteredMeals.some(m => m.totalNutrition.fiber)
        ? Math.round(filteredMeals.reduce((sum, m) => sum + (m.totalNutrition.fiber || 0), 0) * 10) / 10
        : undefined,
      sugar: filteredMeals.some(m => m.totalNutrition.sugar)
        ? Math.round(filteredMeals.reduce((sum, m) => sum + (m.totalNutrition.sugar || 0), 0) * 10) / 10
        : undefined,
      sodium: filteredMeals.some(m => m.totalNutrition.sodium)
        ? Math.round(filteredMeals.reduce((sum, m) => sum + (m.totalNutrition.sodium || 0), 0))
        : undefined,
    };
    
    console.log('[Diet Generation] Meals filtered:', {
      originalCount: mealPlan.meals.length,
      filteredCount: filteredMeals.length,
      originalCalories: mealPlan.totalCalories,
      filteredCalories: totalNutrition.calories,
    });
    
    return {
      ...mealPlan,
      meals: filteredMeals,
      totalCalories: totalNutrition.calories,
      totalNutrition,
    };
  }
  
  return mealPlan;
}

/**
 * Calculate approximate API cost based on model and token usage
 * Prices as of January 2025 (subject to change)
 */
function calculateCost(modelId: string, tokens: number): number {
  const costPer1kTokens: Record<string, number> = {
    'google/gemini-2.0-flash-exp': 0.0001, // $0.10 per 1M tokens
    'google/gemini-2.5-flash': 0.0001, // $0.10 per 1M tokens
    'google/gemini-1.5-pro': 0.002, // $2.00 per 1M tokens
    'openai/gpt-4': 0.03, // $30 per 1M tokens
    'openai/gpt-3.5-turbo': 0.0015, // $1.50 per 1M tokens
  };

  const costRate = costPer1kTokens[modelId] || 0.001; // Default $1 per 1M tokens
  return (tokens / 1000) * costRate;
}
