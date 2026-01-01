# 🎯 AI-First Implementation Plan - 100% Precision

**Date**: December 31, 2025
**Target**: fitai-workers backend (Cloudflare Workers)
**Approach**: AI generates freely, validation ensures accuracy, NO FALLBACKS
**Goal**: Main flow works 100%, all issues reported immediately

---

## 📋 Implementation Scope

### What We're Implementing (fitai-workers)

1. ✅ **AI-First Diet Generation**
   - AI uses full knowledge (10,000+ dishes)
   - Regional adaptation (Indian, Mexican, Chinese, etc.)
   - Cooking method preferences (air fryer, less oil)
   - Mathematical portion adjustment to hit exact targets
   - Multi-layer validation (allergens, diet type, calorie drift)

2. ✅ **AI-First Exercise Generation**
   - Pre-filter 1,500 exercises by equipment/experience/injuries
   - AI chooses from filtered list (40-100 exercises)
   - Validate all exercise IDs exist
   - Enrich with GIF URLs from database (100% guaranteed)

3. ✅ **Robust Error Handling**
   - **NO FALLBACK TEMPLATES** - Main flow must work
   - Report all errors immediately
   - Detailed error messages for debugging
   - Monitoring and logging for production issues

### What We're NOT Implementing

- ❌ No fallback templates (would hide issues)
- ❌ No food database (AI knows everything)
- ❌ No pre-filtering foods (AI generates freely)

---

## 🗂️ File Structure Changes

### Files to UPDATE (fitai-workers):

```
fitai-workers/
├── src/
│   ├── handlers/
│   │   ├── dietGeneration.ts          ✏️ UPDATE - AI-first approach
│   │   └── workoutGeneration.ts        ✏️ UPDATE - Already good, minor tweaks
│   ├── utils/
│   │   ├── validation.ts               ✏️ UPDATE - Add allergen/diet validation
│   │   ├── portionAdjustment.ts        ✅ KEEP - Already implements Option D
│   │   └── errorReporting.ts           ✨ NEW - Detailed error reporting
│   └── services/
│       └── userMetricsService.ts       ✅ KEEP - Already loads metrics
```

### Files to DELETE (mobile app):

```
src/
├── data/
│   └── foods.ts                        🗑️ DELETE - Not needed, AI knows all foods
```

---

## 📝 Detailed Implementation Plan

### PHASE 1: Update Diet Generation Handler (dietGeneration.ts)

**Current Issues:**
1. Sends limited food list to AI (restrictive)
2. Pre-filters foods (limits AI creativity)

**Changes Needed:**

```typescript
// ========================================
// BEFORE (Current - Too Restrictive)
// ========================================
const allowedFoods = FOODS.filter(food => {
  if (food.allergens.some(a => allergies.includes(a))) return false;
  if (dietType === 'vegetarian' && food.category === 'meat') return false;
  return true;
});

const prompt = `Use ONLY these foods: ${allowedFoods.map(f => f.name).join(', ')}`;


// ========================================
// AFTER (New - AI Freedom)
// ========================================
const prompt = `You are FitAI, expert nutritionist specializing in ${cuisine} cuisine.

USER PROFILE:
- Location: ${state}, ${country}
- Diet Type: ${dietType}
- Allergies: ${allergies.join(', ')}
- Cooking Methods: ${cookingMethods.join(', ')} (air fryer, less oil, etc.)
- Goal: ${goal}

NUTRITIONAL TARGETS (CALCULATED):
- Daily Calories: ${daily_calories} kcal (±50 kcal acceptable)
- Protein: ${daily_protein_g}g (CRITICAL for muscle gain)
- Carbs: ${daily_carbs_g}g
- Fat: ${daily_fat_g}g

CRITICAL RULES:
1. Generate traditional ${cuisine} ${dietType} meals
2. NEVER include: ${allergies.join(', ')}
3. Use ${cookingMethods.join(', ')} cooking methods
4. Total calories MUST be close to ${daily_calories} kcal
5. Use realistic portions (150g chicken, 1 cup rice, 2 rotis, etc.)
6. Provide EXACT calorie estimates for each food

Generate a full day meal plan using your knowledge of ${cuisine} cuisine.
Do NOT limit yourself to a pre-defined food list.
Use ANY ${cuisine} ${dietType} foods that fit the requirements.`;
```

**Key Changes:**
1. ✅ Remove food database filtering
2. ✅ Let AI use full knowledge of cuisine
3. ✅ Specify cooking methods in prompt
4. ✅ Emphasize allergen avoidance in prompt
5. ✅ Request realistic portions from AI

**Implementation Steps:**

```typescript
// Step 1: Build comprehensive prompt
function buildDietPrompt(
  metrics: UserHealthMetrics,
  profile: UserProfile,
  prefs: DietPreferences
): string {
  // Get cuisine from country or user preference
  const cuisine = detectCuisine(profile.country, profile.state) || 'indian';

  // Get cooking method preferences
  const cookingMethods = prefs.cooking_methods || ['healthy', 'low_oil'];

  return `You are FitAI, expert nutritionist specializing in ${cuisine} cuisine.

USER PROFILE:
- Location: ${profile.state}, ${profile.country}
- Age: ${profile.age}, Gender: ${profile.gender}
- Diet Type: ${prefs.diet_type}
- Allergies: ${prefs.allergies.join(', ') || 'None'}
- Restrictions: ${prefs.restrictions.join(', ') || 'None'}
- Goal: ${metrics.goal || 'general health'}

NUTRITIONAL TARGETS (CALCULATED FROM UNIVERSAL HEALTH SYSTEM):
- Daily Calories: ${metrics.daily_calories} kcal (±50 kcal acceptable)
- Protein: ${metrics.daily_protein_g}g (${getDietProteinNote(prefs.diet_type)})
- Carbohydrates: ${metrics.daily_carbs_g}g
- Fat: ${metrics.daily_fat_g}g
- Water: ${Math.round(metrics.daily_water_ml / 1000)}L

COOKING PREFERENCES:
- Preferred Methods: ${cookingMethods.join(', ')}
- Emphasis: Use healthier cooking techniques
- Oil Usage: Minimal to moderate

MEAL REQUIREMENTS:
- Cuisine: Traditional ${cuisine} meals
- Diet Type: ${prefs.diet_type}
- Variety: Use diverse ingredients, don't repeat
- Meals: ${getEnabledMeals(prefs).join(', ')}

CRITICAL RULES (MUST FOLLOW):
1. NEVER include these allergens: ${prefs.allergies.join(', ')}
2. Respect diet type: ${getDietTypeRules(prefs.diet_type)}
3. Use traditional ${cuisine} foods and cooking methods
4. Prioritize high-protein foods for muscle ${metrics.goal === 'muscle_gain' ? 'gain' : 'maintenance'}
5. Total daily calories MUST be close to ${metrics.daily_calories} kcal
6. Use realistic serving sizes:
   - Indian: 1 roti (80g), 1 cup rice (185g), 1 cup dal (200g)
   - Weights: 100g, 150g, 200g (round numbers)
7. Provide ACCURATE calorie, protein, carb, fat for EACH food item
8. Include cooking method for each meal
9. Use locally available ingredients in ${profile.state}

EXAMPLE OUTPUT STRUCTURE:
{
  "meals": [
    {
      "type": "breakfast",
      "name": "Protein-Rich Poha Bowl",
      "description": "Traditional Maharashtrian breakfast with sprouted moong",
      "cookingMethod": "stir-fried with minimal oil, air-fried garnish",
      "preparationTime": "15 minutes",
      "foods": [
        {
          "name": "Poha (Flattened Rice)",
          "quantity": "100g",
          "quantityInGrams": 100,
          "calories": 130,
          "protein": 3,
          "carbs": 28,
          "fat": 0.2
        },
        {
          "name": "Moong Sprouts (Steamed)",
          "quantity": "50g",
          "quantityInGrams": 50,
          "calories": 15,
          "protein": 5,
          "carbs": 2,
          "fat": 0.1
        }
      ],
      "totalCalories": 145,
      "totalProtein": 8,
      "totalCarbs": 30,
      "totalFat": 0.3
    }
  ],
  "dailyTotals": {
    "calories": ${metrics.daily_calories},
    "protein": ${metrics.daily_protein_g},
    "carbs": ${metrics.daily_carbs_g},
    "fat": ${metrics.daily_fat_g}
  }
}

Generate the complete meal plan now.`;
}

// Helper functions
function detectCuisine(country: string, state?: string): string {
  const cuisineMap = {
    'IN': 'indian',
    'MX': 'mexican',
    'US': 'american',
    'IT': 'italian',
    'JP': 'japanese',
    'CN': 'chinese',
    'TH': 'thai',
    'FR': 'french',
    // Add more countries
  };

  return cuisineMap[country] || 'international';
}

function getDietTypeRules(dietType: string): string {
  const rules = {
    vegan: 'No animal products whatsoever (no meat, dairy, eggs, honey)',
    vegetarian: 'No meat, fish, or poultry. Dairy and eggs are allowed.',
    pescatarian: 'No meat or poultry. Fish, seafood, dairy, eggs allowed.',
    keto: 'Very low carb (<50g total), high fat (70% calories), moderate protein',
    paleo: 'No grains, legumes, dairy, or processed foods',
    omnivore: 'All foods allowed (balanced diet)',
  };

  return rules[dietType] || 'Balanced diet with all food groups';
}

function getDietProteinNote(dietType: string): string {
  const notes = {
    vegan: '+25% higher protein target due to plant protein absorption',
    vegetarian: '+15% higher protein target',
    pescatarian: '+10% higher protein target',
  };

  return notes[dietType] || 'from varied sources';
}

function getEnabledMeals(prefs: DietPreferences): string[] {
  const meals = [];
  if (prefs.breakfast_enabled) meals.push('Breakfast');
  if (prefs.lunch_enabled) meals.push('Lunch');
  if (prefs.dinner_enabled) meals.push('Dinner');
  if (prefs.snacks_enabled) meals.push('2 Snacks');
  return meals;
}
```

**Step 2: Generate with AI (full freedom)**

```typescript
// No food filtering - AI uses full knowledge
const aiResponse = await generateObject({
  model: createAIProvider(env, 'google/gemini-2.0-flash-exp'),
  schema: DietResponseSchema,
  prompt: buildDietPrompt(metrics, profile, prefs),
  temperature: 0.7,  // Balanced creativity
  maxTokens: 4096,   // Enough for detailed meal plans
});
```

**Step 3: Comprehensive validation**

```typescript
function validateDietPlan(
  aiResponse: DietResponse,
  metrics: UserHealthMetrics,
  prefs: DietPreferences
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ==========================================
  // CRITICAL VALIDATION (Must Pass)
  // ==========================================

  // 1. Allergen Check (CRITICAL)
  for (const meal of aiResponse.meals) {
    for (const food of meal.foods) {
      for (const allergen of prefs.allergies) {
        const foodNameLower = food.name.toLowerCase();
        const allergenLower = allergen.toLowerCase();

        // Direct match
        if (foodNameLower.includes(allergenLower)) {
          errors.push({
            severity: 'CRITICAL',
            code: 'ALLERGEN_DETECTED',
            message: `Contains allergen "${allergen}" in food "${food.name}"`,
            meal: meal.name,
            food: food.name,
            allergen: allergen,
          });
        }

        // Check common aliases
        const allergenAliases = getAllergenAliases(allergen);
        if (allergenAliases.some(alias => foodNameLower.includes(alias))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'ALLERGEN_ALIAS_DETECTED',
            message: `Contains allergen alias for "${allergen}" in food "${food.name}"`,
            meal: meal.name,
            food: food.name,
            allergen: allergen,
          });
        }
      }
    }
  }

  // 2. Diet Type Violation Check (CRITICAL)
  const dietViolations = checkDietTypeViolations(aiResponse.meals, prefs.diet_type);
  if (dietViolations.length > 0) {
    errors.push(...dietViolations);
  }

  // 3. Extreme Calorie Drift Check (CRITICAL - >30% off)
  const totalCal = aiResponse.dailyTotals.calories;
  const targetCal = metrics.daily_calories;
  const calorieDrift = Math.abs(totalCal - targetCal) / targetCal;

  if (calorieDrift > 0.3) {  // More than 30% off target
    errors.push({
      severity: 'CRITICAL',
      code: 'EXTREME_CALORIE_DRIFT',
      message: `Extreme calorie deviation: ${totalCal} cal vs ${targetCal} cal target (${(calorieDrift * 100).toFixed(0)}% off)`,
      current: totalCal,
      target: targetCal,
      drift: calorieDrift,
    });
  }

  // 4. Missing Required Fields Check
  for (const meal of aiResponse.meals) {
    if (!meal.name || !meal.type || !meal.foods || meal.foods.length === 0) {
      errors.push({
        severity: 'CRITICAL',
        code: 'MISSING_REQUIRED_FIELDS',
        message: `Meal missing required fields`,
        meal: meal.name || 'Unknown',
      });
    }

    for (const food of meal.foods) {
      if (!food.name || food.calories === undefined || food.protein === undefined) {
        errors.push({
          severity: 'CRITICAL',
          code: 'INCOMPLETE_FOOD_DATA',
          message: `Food "${food.name}" missing nutrition data`,
          meal: meal.name,
          food: food.name,
        });
      }
    }
  }

  // ==========================================
  // QUALITY WARNINGS (Non-blocking)
  // ==========================================

  // 1. Moderate Calorie Drift (10-30% off)
  if (calorieDrift > 0.1 && calorieDrift <= 0.3) {
    warnings.push({
      severity: 'WARNING',
      code: 'MODERATE_CALORIE_DRIFT',
      message: `Calories need adjustment: ${totalCal} vs ${targetCal} (will auto-adjust portions)`,
      action: 'ADJUST_PORTIONS',
    });
  }

  // 2. Low Protein Warning (<80% of target)
  const proteinRatio = aiResponse.dailyTotals.protein / metrics.daily_protein_g;
  if (proteinRatio < 0.8) {
    warnings.push({
      severity: 'WARNING',
      code: 'LOW_PROTEIN',
      message: `Protein is ${aiResponse.dailyTotals.protein}g, target is ${metrics.daily_protein_g}g (${(proteinRatio * 100).toFixed(0)}%)`,
      action: 'LOG_FOR_AI_IMPROVEMENT',
    });
  }

  // 3. High Food Repetition
  const allFoods = aiResponse.meals.flatMap(m => m.foods.map(f => f.name.toLowerCase()));
  const uniqueFoods = new Set(allFoods);
  const varietyRatio = uniqueFoods.size / allFoods.length;

  if (varietyRatio < 0.6) {  // Less than 60% unique foods
    warnings.push({
      severity: 'INFO',
      code: 'LOW_VARIETY',
      message: `Food variety is low (${uniqueFoods.size} unique foods out of ${allFoods.length} total)`,
      action: 'LOG_FOR_AI_IMPROVEMENT',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper: Check diet type violations
function checkDietTypeViolations(
  meals: Meal[],
  dietType: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  const meatKeywords = ['chicken', 'beef', 'pork', 'mutton', 'lamb', 'goat', 'turkey'];
  const fishKeywords = ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster'];
  const dairyKeywords = ['milk', 'cheese', 'yogurt', 'paneer', 'butter', 'ghee', 'cream'];
  const eggKeywords = ['egg', 'omelette', 'scrambled'];

  for (const meal of meals) {
    for (const food of meal.foods) {
      const foodLower = food.name.toLowerCase();

      // Vegan checks
      if (dietType === 'vegan') {
        if (meatKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet contains meat: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (fishKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet contains fish: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (dairyKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet contains dairy: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (eggKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegan diet contains eggs: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
      }

      // Vegetarian checks
      if (dietType === 'vegetarian') {
        if (meatKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegetarian diet contains meat: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
        if (fishKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Vegetarian diet contains fish: "${food.name}"`,
            meal: meal.name,
            food: food.name,
            dietType,
          });
        }
      }

      // Pescatarian checks
      if (dietType === 'pescatarian') {
        if (meatKeywords.some(k => foodLower.includes(k))) {
          errors.push({
            severity: 'CRITICAL',
            code: 'DIET_TYPE_VIOLATION',
            message: `Pescatarian diet contains meat: "${food.name}"`,
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

// Helper: Get allergen aliases
function getAllergenAliases(allergen: string): string[] {
  const aliases: Record<string, string[]> = {
    peanut: ['peanut', 'groundnut', 'monkey nut'],
    shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'clam'],
    tree_nut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'whey', 'casein'],
    egg: ['egg', 'albumin', 'mayonnaise'],
    soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame'],
    gluten: ['wheat', 'barley', 'rye', 'gluten'],
  };

  const allergenLower = allergen.toLowerCase();
  for (const [key, values] of Object.entries(aliases)) {
    if (allergenLower.includes(key) || values.some(v => allergenLower.includes(v))) {
      return values;
    }
  }

  return [allergenLower];
}
```

**Step 4: Handle validation results**

```typescript
// Main handler
export async function handleDietGeneration(c: Context<{ Bindings: Env }>) {
  const userId = c.get('user').id;

  try {
    // Load user data
    const metrics = await loadUserMetrics(c.env, userId);
    const profile = await loadUserProfile(c.env, userId);
    const prefs = await loadUserPreferences(c.env, userId);

    // Generate with AI
    const aiResponse = await generateObject({
      model: createAIProvider(c.env, 'google/gemini-2.0-flash-exp'),
      schema: DietResponseSchema,
      prompt: buildDietPrompt(metrics, profile, prefs.diet),
      temperature: 0.7,
    });

    // Validate
    const validationResult = validateDietPlan(aiResponse.object, metrics, prefs.diet);

    // If validation FAILED - throw error (NO FALLBACK)
    if (!validationResult.isValid) {
      console.error('[DietGen] CRITICAL VALIDATION FAILED:', validationResult.errors);

      // Return detailed error to expose the issue
      return c.json({
        success: false,
        error: {
          code: 'DIET_VALIDATION_FAILED',
          message: 'AI-generated meal plan failed critical validation',
          details: validationResult.errors,
          action: 'Please retry or contact support',
        },
      }, 400);
    }

    // Log warnings (non-blocking)
    if (validationResult.warnings.length > 0) {
      console.warn('[DietGen] Quality warnings:', validationResult.warnings);
      await logToAnalytics(c.env, 'diet_quality_warning', {
        userId,
        warnings: validationResult.warnings,
      });
    }

    // Adjust portions if needed
    const finalPlan = adjustPortionsToTarget(
      aiResponse.object,
      metrics.daily_calories,
      metrics.daily_protein_g
    );

    // Cache the result
    await cacheResponse(c.env, userId, finalPlan);

    // Return success
    return c.json({
      success: true,
      data: finalPlan,
      metadata: {
        validationPassed: true,
        warningsCount: validationResult.warnings.length,
        adjustmentApplied: true,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DietGen] Generation error:', error);

    // Return error (NO FALLBACK - expose the issue)
    return c.json({
      success: false,
      error: {
        code: 'DIET_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }, 500);
  }
}
```

---

### PHASE 2: Update Validation Utils (validation.ts)

**Add helper types:**

```typescript
export interface ValidationError {
  severity: 'CRITICAL';
  code: string;
  message: string;
  [key: string]: any;
}

export interface ValidationWarning {
  severity: 'WARNING' | 'INFO';
  code: string;
  message: string;
  action?: string;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

---

### PHASE 3: Create Error Reporting System (errorReporting.ts)

```typescript
/**
 * Comprehensive error reporting without fallbacks
 * All errors are exposed immediately for debugging
 */

import { Env } from './types';

export async function logToAnalytics(
  env: Env,
  eventName: string,
  data: Record<string, any>
) {
  try {
    // Log to console (Cloudflare logs)
    console.log(`[Analytics] ${eventName}:`, JSON.stringify(data, null, 2));

    // TODO: Send to external monitoring service (DataDog, Sentry, etc.)
    // await fetch('https://monitoring-service.com/api/events', {
    //   method: 'POST',
    //   body: JSON.stringify({ event: eventName, data }),
    // });

  } catch (error) {
    console.error('[Analytics] Failed to log event:', error);
  }
}

export function createDetailedError(
  code: string,
  message: string,
  details?: any
) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      help: 'Check server logs for more information',
    },
  };
}
```

---

## ✅ Implementation Checklist

### Phase 1: Diet Generation (fitai-workers)
- [ ] Update `dietGeneration.ts` - Remove food database filtering
- [ ] Build comprehensive AI prompt with cuisine, cooking methods, allergies
- [ ] Implement multi-layer validation (allergen, diet type, calorie drift)
- [ ] Add detailed error reporting (NO FALLBACK)
- [ ] Test with multiple scenarios (Indian veg, Mexican, vegan, etc.)

### Phase 2: Exercise Generation (fitai-workers)
- [ ] Verify exercise filtering works correctly
- [ ] Ensure GIF URL validation is robust
- [ ] Add exercise ID validation
- [ ] Test with various equipment combinations

### Phase 3: Error Handling
- [ ] Remove all fallback template code
- [ ] Add comprehensive error logging
- [ ] Test error scenarios (allergen violation, extreme drift)
- [ ] Verify errors are exposed, not hidden

### Phase 4: Mobile App Integration
- [ ] Delete `src/data/foods.ts` from mobile app
- [ ] Update API calls to handle new response format
- [ ] Display detailed errors to user (with helpful messages)
- [ ] Test end-to-end flow

### Phase 5: Testing
- [ ] Test Indian vegetarian user
- [ ] Test Mexican user
- [ ] Test vegan with allergies
- [ ] Test extreme calorie drift scenario
- [ ] Test diet type violation (meat in vegetarian)
- [ ] Test allergen detection
- [ ] Test all error paths

---

## 🎯 Success Criteria

1. ✅ AI generates regional meals freely (Indian, Mexican, etc.)
2. ✅ Allergens are NEVER included (100% catch rate)
3. ✅ Diet type violations are NEVER allowed
4. ✅ Portions adjusted to hit ±50 cal accuracy
5. ✅ All errors exposed immediately (NO SILENT FAILURES)
6. ✅ NO FALLBACK templates (main flow works 100%)
7. ✅ Detailed error messages for debugging

---

## 📊 Testing Scenarios

### Scenario 1: Indian Vegetarian in Mumbai
```json
{
  "country": "IN",
  "state": "MH",
  "diet_type": "vegetarian",
  "allergies": ["peanuts"],
  "cooking_methods": ["air_fryer", "less_oil"],
  "daily_calories": 2200
}
```
**Expected**: Poha, Dal, Paneer, Roti, Sabzi - NO peanuts, NO meat

### Scenario 2: Mexican User
```json
{
  "country": "MX",
  "diet_type": "omnivore",
  "allergies": [],
  "daily_calories": 2500
}
```
**Expected**: Tacos, Burritos, Enchiladas, Quesadillas

### Scenario 3: Vegan with Allergies
```json
{
  "diet_type": "vegan",
  "allergies": ["soy", "tree_nuts"],
  "daily_calories": 1800
}
```
**Expected**: No animal products, NO soy, NO nuts

### Scenario 4: Error - Allergen Violation
**AI Response**: Contains "Peanut Butter"
**Expected**: Validation FAILS, error returned immediately

### Scenario 5: Error - Extreme Calorie Drift
**AI Response**: 1200 calories (target: 2200)
**Expected**: Validation FAILS with "EXTREME_CALORIE_DRIFT" error

---

**Ready to implement with 100% precision. NO FALLBACKS. All issues exposed immediately!** 🎯
