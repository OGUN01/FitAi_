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
import { adjustPortionsToTarget } from '../utils/portionAdjustment';

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

  // Return model from gateway
  const model = modelId || 'google/gemini-2.0-flash-exp';
  return gatewayInstance(model);
}

// ============================================================================
// CUISINE DETECTION
// ============================================================================

/**
 * Detect cuisine type from user's country/state
 * Used to generate region-appropriate meals
 */
function detectCuisine(country?: string, state?: string): string {
  if (!country) return 'international';

  const cuisineMap: Record<string, string> = {
    IN: 'Indian',
    MX: 'Mexican',
    US: 'American',
    IT: 'Italian',
    JP: 'Japanese',
    CN: 'Chinese',
    TH: 'Thai',
    FR: 'French',
    ES: 'Spanish',
    GR: 'Greek',
    TR: 'Turkish',
    KR: 'Korean',
    VN: 'Vietnamese',
    BR: 'Brazilian',
    AR: 'Argentinian',
    GB: 'British',
    DE: 'German',
    AU: 'Australian',
    CA: 'Canadian',
    NZ: 'New Zealand',
  };

  return cuisineMap[country.toUpperCase()] || 'International';
}

// ============================================================================
// DIET TYPE RULES
// ============================================================================

/**
 * Get detailed diet type rules for AI prompt
 * Ensures AI respects dietary restrictions accurately
 */
function getDietTypeRules(dietType?: string): string {
  const rules: Record<string, string> = {
    vegan: 'STRICT: No animal products whatsoever (no meat, poultry, fish, dairy, eggs, honey, gelatin)',
    vegetarian: 'No meat, fish, or poultry. Dairy products and eggs ARE allowed.',
    pescatarian: 'No meat or poultry. Fish, seafood, dairy, and eggs ARE allowed.',
    keto: 'Very low carb (<50g total daily), high fat (70% of calories), moderate protein',
    paleo: 'No grains, legumes, dairy, or processed foods. Focus on meat, fish, vegetables, fruits, nuts',
    omnivore: 'All foods allowed - balanced diet with variety from all food groups',
    'gluten-free': 'No wheat, barley, rye, or gluten-containing grains',
    'dairy-free': 'No milk, cheese, yogurt, butter, cream, or dairy products',
  };

  return rules[dietType?.toLowerCase() || 'omnivore'] || 'Balanced diet with all food groups';
}

/**
 * Get protein source notes based on diet type
 * Helps AI understand protein requirements for different diets
 */
function getDietProteinNote(dietType?: string): string {
  const notes: Record<string, string> = {
    vegan: 'CRITICAL - Use high-protein plant sources: lentils, chickpeas, tofu, tempeh, quinoa, nuts. Target +25% higher protein due to lower absorption.',
    vegetarian: 'Use dairy, eggs, legumes, and plant proteins. Target +15% higher protein.',
    pescatarian: 'Use fish, seafood, eggs, dairy, and legumes. Target +10% higher protein.',
  };

  return notes[dietType?.toLowerCase() || ''] || 'Use varied protein sources for optimal nutrition';
}

/**
 * Get enabled meals from preferences
 */
function getEnabledMeals(prefs?: DietPreferences): string[] {
  if (!prefs) return ['Breakfast', 'Lunch', 'Dinner', '2 Snacks'];

  const meals: string[] = [];
  if (prefs.breakfast_enabled !== false) meals.push('Breakfast');
  if (prefs.lunch_enabled !== false) meals.push('Lunch');
  if (prefs.dinner_enabled !== false) meals.push('Dinner');
  if (prefs.snacks_enabled !== false) meals.push('2 Snacks');

  return meals.length > 0 ? meals : ['Breakfast', 'Lunch', 'Dinner'];
}

// ============================================================================
// AI PROMPT BUILDER (COMPREHENSIVE)
// ============================================================================

/**
 * Build comprehensive AI prompt with all context
 *
 * **NO FOOD FILTERING** - AI uses full knowledge
 * Includes: cuisine, cooking methods, allergens, diet type, nutritional targets
 *
 * @param metrics - Calculated health metrics from Universal Health System
 * @param profile - User profile (age, gender, location)
 * @param prefs - Diet preferences (type, allergies, cooking methods)
 * @returns Detailed AI prompt string
 */
function buildDietPrompt(
  metrics: UserHealthMetrics,
  profile: UserProfileContext | null,
  prefs: DietPreferences | null
): string {
  // Detect cuisine from location
  const cuisine = detectCuisine(profile?.country, profile?.state);

  // Get cooking methods (default to healthy options)
  const cookingMethods = prefs?.cooking_methods?.length
    ? prefs.cooking_methods
    : ['air fryer', 'steaming', 'grilling', 'minimal oil'];

  // Get allergies and restrictions
  const allergies = prefs?.allergies || [];
  const restrictions = prefs?.restrictions || [];
  const dietType = prefs?.diet_type || 'omnivore';

  // Get enabled meals
  const enabledMeals = getEnabledMeals(prefs);

  // Build the comprehensive prompt
  return `You are FitAI, an expert nutritionist specializing in ${cuisine} cuisine.

**USER PROFILE:**
- Location: ${profile?.state || 'Unknown'}, ${profile?.country || 'Unknown'}
- Age: ${profile?.age || 'Unknown'}, Gender: ${profile?.gender || 'Unknown'}
- Diet Type: ${dietType}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Restrictions: ${restrictions.length > 0 ? restrictions.join(', ') : 'None'}
- Occupation: ${profile?.occupation_type || 'General'}

**NUTRITIONAL TARGETS (CALCULATED FROM UNIVERSAL HEALTH SYSTEM):**
These values are SCIENTIFICALLY CALCULATED based on BMR, TDEE, and user goals.
You MUST aim to match these targets as closely as possible.

- Daily Calories: ${metrics.daily_calories} kcal (±50 kcal acceptable)
- Protein: ${metrics.daily_protein_g}g (${getDietProteinNote(dietType)})
- Carbohydrates: ${metrics.daily_carbs_g}g
- Fat: ${metrics.daily_fat_g}g
- Water: ${Math.round(metrics.daily_water_ml / 1000)}L

**BMI & Health Context:**
- BMI: ${metrics.calculated_bmi?.toFixed(1)} (${metrics.bmi_category || 'Normal'})
- BMR: ${metrics.calculated_bmr} kcal/day
- TDEE: ${metrics.calculated_tdee} kcal/day
- Health Score: ${metrics.health_score || 'N/A'}/100

**COOKING PREFERENCES:**
- Preferred Methods: ${cookingMethods.join(', ')}
- Emphasis: Use healthier cooking techniques
- Oil Usage: Minimal to moderate (prefer olive oil, avocado oil)

**MEAL REQUIREMENTS:**
- Cuisine: Traditional ${cuisine} meals
- Diet Type: ${dietType}
- Meals to Generate: ${enabledMeals.join(', ')}
- Variety: Use diverse ingredients, avoid repetition
- Authenticity: Use traditional ${cuisine} ingredients and preparations

**CRITICAL RULES (MUST FOLLOW 100%):**

1. **ALLERGEN AVOIDANCE (CRITICAL):**
   ${allergies.length > 0
     ? `NEVER include these allergens: ${allergies.join(', ')}
   Check ALL food items carefully. Exclude common forms and derivatives.
   Example: If "peanuts" is an allergen, also avoid peanut butter, peanut oil, etc.`
     : 'No allergen restrictions.'}

2. **DIET TYPE COMPLIANCE (CRITICAL):**
   ${getDietTypeRules(dietType)}
   Violating diet type rules is UNACCEPTABLE.

3. **CALORIE TARGET (CRITICAL):**
   Total daily calories MUST be within ${metrics.daily_calories - 50} to ${metrics.daily_calories + 50} kcal.
   This is a HARD requirement.

4. **CUISINE AUTHENTICITY:**
   Use traditional ${cuisine} foods, spices, and cooking methods.
   Examples for ${cuisine}:
   ${getCuisineExamples(cuisine)}

5. **REALISTIC PORTIONS:**
   Use standard serving sizes:
   - Rice: 1 cup cooked = 185g
   - Chicken breast: 150g
   - Vegetables: 1 cup = 150-200g
   - Roti/Bread: 1 piece = 80g
   - Dal/Lentils: 1 cup = 200g

6. **ACCURATE NUTRITION:**
   Provide EXACT calorie, protein, carb, and fat values for EACH food item.
   Use standard nutrition databases (USDA, IFCT for Indian foods).

7. **COOKING METHODS:**
   Prefer: ${cookingMethods.join(', ')}
   Specify cooking method for each meal.

8. **HIGH PROTEIN PRIORITY:**
   ${metrics.daily_protein_g}g protein is CRITICAL for muscle maintenance/growth.
   Distribute protein across all meals (20-40g per meal).

9. **MEAL TIMING:**
   - Breakfast: 20-25% of daily calories (quick to prepare)
   - Lunch: 30-35% of daily calories (substantial, balanced)
   - Dinner: 25-30% of daily calories (protein-focused)
   - Snacks: 10-15% of daily calories (nutritious, filling)

10. **LOCAL AVAILABILITY:**
    Use ingredients commonly available in ${profile?.state || 'the region'}.

**OUTPUT FORMAT:**
Generate a complete daily meal plan with:
- Meal type, name, and description
- Cooking method and preparation time
- Each food item with exact portions and nutrition
- Meal totals and daily totals
- Cooking tips and substitution suggestions

Generate the meal plan now. Be creative while respecting all constraints.`;
}

/**
 * Get cuisine-specific examples to guide AI
 */
function getCuisineExamples(cuisine: string): string {
  const examples: Record<string, string> = {
    Indian:
      '   - Dal (lentils), Rice, Roti, Paneer, Chicken Curry, Biryani, Sabzi, Raita, Poha, Upma',
    Mexican:
      '   - Tacos, Burritos, Enchiladas, Quesadillas, Fajitas, Black Beans, Rice, Guacamole, Salsa',
    American:
      '   - Grilled Chicken, Salads, Wraps, Burgers, Sandwiches, Oatmeal, Eggs, Greek Yogurt',
    Italian:
      '   - Pasta, Pizza, Risotto, Chicken Parmigiana, Caprese Salad, Minestrone, Tiramisu',
    Japanese:
      '   - Sushi, Teriyaki Chicken, Miso Soup, Edamame, Rice Bowls, Tempura, Sashimi',
    Chinese:
      '   - Stir-fries, Fried Rice, Noodles, Dumplings, Spring Rolls, Hot Pot, Congee',
    Thai:
      '   - Pad Thai, Green Curry, Tom Yum, Papaya Salad, Satay, Fried Rice, Spring Rolls',
    International:
      '   - Variety of global dishes: Mediterranean, Asian fusion, Healthy bowls, Salads',
  };

  return examples[cuisine] || examples.International;
}

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
    gluten: ['wheat', 'barley', 'rye', 'gluten', 'flour', 'bread', 'pasta', 'roti', 'naan'],
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
 * Check if food contains allergen (with alias detection)
 */
function containsAllergen(foodName: string, allergen: string): boolean {
  const foodLower = foodName.toLowerCase();
  const allergenLower = allergen.toLowerCase();

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
    cuisine: detectCuisine(profile?.country, profile?.state),
    country: profile?.country,
    state: profile?.state,
  });

  // 3. Generate with AI
  const model = createAIProvider(env, request.model || 'google/gemini-2.0-flash-exp');

  console.log('[Diet Generation] Calling AI model:', request.model || 'google/gemini-2.0-flash-exp');

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

  // 4. COMPREHENSIVE VALIDATION (NO FALLBACK)
  const validationResult = validateDietPlan(result.object, metrics, preferences.diet);

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

  // 5. Adjust portions to match EXACT calorie target
  const adjustedDiet = adjustPortionsToTarget(result.object, metrics.daily_calories);

  console.log('[Diet Generation] Portions adjusted:', {
    originalCalories: result.object.totalCalories,
    adjustedCalories: adjustedDiet.totalCalories,
    targetCalories: metrics.daily_calories,
    difference: Math.abs(adjustedDiet.totalCalories - metrics.daily_calories),
  });

  // Return diet with metadata for deduplication/caching
  return {
    diet: adjustedDiet,
    metadata: {
      model: request.model || 'google/gemini-2.0-flash-exp',
      aiGenerationTime,
      tokensUsed: result.usage?.totalTokens,
      costUsd: calculateCost(request.model || 'google/gemini-2.0-flash-exp', result.usage?.totalTokens || 0),
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
