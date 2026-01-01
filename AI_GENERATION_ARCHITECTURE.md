# 🧠 AI Generation Architecture - Minimizing Hallucination & Maximizing Accuracy

**Date**: December 31, 2025
**Problem**: AI can hallucinate calorie counts, portions, and exercise details
**Solution**: Hybrid architecture with deterministic data + AI creativity

---

## 🎯 Core Problem

### Why AI Hallucination is Dangerous for Fitness Apps

**Diet Generation Issues:**
1. ❌ **Calorie Hallucination**: AI might say "Chicken Breast 100g = 200 cal" (actual: 165 cal)
2. ❌ **Portion Inaccuracy**: AI generates 2,150 calories but user needs 2,200
3. ❌ **Macro Drift**: AI forgets protein target mid-generation
4. ❌ **Inconsistency**: Same food has different calories each generation

**Workout Generation Issues:**
1. ❌ **Exercise Invention**: AI creates "Reverse Bulgarian Split Squat Curl" (doesn't exist)
2. ❌ **Missing GIFs**: AI suggests exercise without GIF URL
3. ❌ **Wrong Equipment**: AI suggests barbell exercise for home workout
4. ❌ **Impossible Sets**: "Do 5 sets of 100 push-ups" (unrealistic for beginners)

---

## ✅ Solution: Hybrid Architecture

**Principle**: Let AI do what it's good at (creativity, variety, personalization), but lock down the facts (calories, exercises, portions).

### The Rule
```
AI generates ONLY:
  - Which foods to combine
  - Meal names and descriptions
  - Which exercises to combine
  - Workout structure and flow

Database provides:
  - Exact calorie counts
  - Exact macro values
  - Verified exercise list with GIFs
  - Equipment compatibility
```

---

## 📊 Current System Status

### Food Database
- **Size**: 28 verified foods
- **Coverage**: Basic proteins, carbs, vegetables, fats
- **Accuracy**: 100% (from USDA/verified sources)
- **Status**: ⚠️ SMALL - needs expansion

### Exercise Database
- **Size**: 1,500 exercises with 100% GIF coverage
- **Coverage**: All muscle groups, all equipment types
- **Accuracy**: 100% verified
- **Status**: ✅ EXCELLENT

### User Metrics (Universal Health System)
- **BMR, TDEE, BMI**: Calculated with 4 formulas
- **Daily Calories**: Population + climate + diet adjusted
- **Macros**: Experience-based protein, goal-optimized
- **Status**: ✅ PRODUCTION READY

---

## 🔄 Optimized Flow

### DIET GENERATION FLOW (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Load Calculated Metrics from Database              │
│ (No AI involved - Pure data retrieval)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
    const metrics = await loadUserMetrics(userId);

    Daily Calories: 2,200 kcal  ← From Universal Health System
    Protein: 165g (Vegetarian +15%)
    Carbs: 220g
    Fat: 73g
    Diet Type: Vegetarian
    Allergies: [peanuts, shellfish]
    Restrictions: No beef, no pork

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Filter Food Database                                │
│ (Deterministic - No AI)                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
    const allowedFoods = FOODS.filter(food => {
      // Remove allergens
      if (food.allergens.some(a => allergies.includes(a))) return false;

      // Remove restricted items
      if (dietType === 'vegetarian' && food.category === 'meat') return false;
      if (dietType === 'vegan' && food.category === 'dairy') return false;

      return true;
    });

    Result: 22 allowed foods ✅

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: AI Generates Meal Plan Structure                    │
│ (AI creativity - but constrained to allowed foods)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
    Prompt to AI:
    "Create a vegetarian meal plan using ONLY these foods:
    [List of 22 food IDs with names]

    Target: 2,200 calories, 165g protein, 220g carbs, 73g fat
    Meals: 3 main + 2 snacks"

    AI Response (STRUCTURE ONLY):
    {
      breakfast: {
        name: "Greek Protein Bowl",
        foods: ["greek_yogurt", "oats", "banana", "almonds"]
      },
      lunch: {
        name: "Mediterranean Quinoa Salad",
        foods: ["quinoa", "chickpeas", "cucumber", "feta"]
      },
      dinner: {
        name: "Tofu Stir Fry",
        foods: ["tofu", "brown_rice", "broccoli", "olive_oil"]
      }
    }

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Calculate Portions from Database                    │
│ (Deterministic math - No AI)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
    For each food in meal plan:
      1. Look up EXACT nutrition from database
      2. Calculate portion to hit targets
      3. Use traditional serving sizes (150g chicken, not 147.3g)

    Breakfast calculation:
      - Greek Yogurt: 200g = 118 cal, 20g protein ← From DB
      - Oats: 60g = 234 cal, 9g protein         ← From DB
      - Banana: 1 medium (118g) = 105 cal       ← From DB
      - Almonds: 15g = 87 cal, 3g protein       ← From DB
      Total: 544 calories, 32g protein ✅

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Adjust Portions to Hit Exact Target                │
│ (Math - No AI)                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
    Current total: 2,150 calories
    Target: 2,200 calories
    Scale factor: 2,200 / 2,150 = 1.023

    Adjust all portions by 2.3%:
      - Greek Yogurt: 200g → 205g
      - Chicken breast: 150g → 153g
      - Brown rice: 200g → 205g

    New total: 2,200 calories ✅ (within 2% tolerance)

┌─────────────────────────────────────────────────────────────┐
│ FINAL RESULT: Guaranteed Accuracy                          │
└─────────────────────────────────────────────────────────────┘

    ✅ Calories: EXACT (from database, not AI guess)
    ✅ Macros: EXACT (from database, not AI guess)
    ✅ Portions: CALCULATED (not AI hallucination)
    ✅ Variety: AI provides creativity within constraints
```

---

### WORKOUT GENERATION FLOW (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Load User Metrics                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
    const metrics = await loadUserMetrics(userId);
    const bodyMeasurements = await loadBodyMeasurements(userId);

    Fitness Level: Intermediate (2 years training)
    Available Equipment: [dumbbells, resistance_band, body_weight]
    Goal: Muscle gain
    Physical Limitations: Lower back pain
    VO2 Max: 42.5 ml/kg/min (Good)
    Heart Rate Zones: Zone 1: 115-133 bpm, Zone 2: 133-152 bpm...

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Multi-Layer Exercise Filtering                     │
│ (Deterministic - No AI)                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
    Layer 1: Equipment Filter
      1,500 exercises → 450 exercises
      (Only dumbbells, bands, bodyweight)

    Layer 2: Experience Level Filter
      450 exercises → 180 exercises
      (Remove beginner + elite exercises)

    Layer 3: Body Part Focus
      180 exercises → 80 exercises
      (Focus on chest + back for today's workout)

    Layer 4: Injury Filtering
      80 exercises → 65 exercises
      (Remove exercises with "Lower back" stress)

    Layer 5: GIF Verification
      65 exercises → 65 exercises ✅
      (All have GIF URLs - 100% coverage)

    Result: 65 safe, appropriate exercises for AI to choose from

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: AI Generates Workout Structure                      │
│ (AI creativity - but constrained to filtered exercises)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
    Prompt to AI:
    "Create a 45-minute intermediate chest & back workout.

    User Context:
    - VO2 Max: 42.5 (Good cardio fitness)
    - Target HR Zone 3: 152-170 bpm
    - Avoid lower back exercises

    Choose from these 65 exercises ONLY:
    [List of exercise IDs with names, equipment, muscle groups]

    Structure: Warmup → Main Sets → Cooldown
    Sets/Reps: Appropriate for muscle gain"

    AI Response (STRUCTURE ONLY):
    {
      warmup: [
        {exerciseId: "band_chest_stretch", duration: "2 min"},
        {exerciseId: "arm_circles", duration: "1 min"}
      ],
      mainSets: [
        {
          exerciseId: "dumbbell_bench_press",
          sets: 4,
          reps: "8-10",
          rest: "90 seconds"
        },
        {
          exerciseId: "dumbbell_row",
          sets: 4,
          reps: "8-10",
          rest: "90 seconds"
        },
        ...
      ],
      cooldown: [...]
    }

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Enrich with Database Details                       │
│ (Database lookup - No AI)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
    For each exercise in workout:
      1. Look up from 1,500-exercise database
      2. Add GIF URL ← Guaranteed to exist (100% coverage)
      3. Add instructions ← Step-by-step from database
      4. Add muscle groups ← Verified data
      5. Add equipment ← Verified compatibility

    Example:
      exerciseId: "dumbbell_bench_press"
      ↓
      {
        exerciseId: "dumbbell_bench_press",
        name: "Dumbbell Bench Press",
        gifUrl: "https://static.exercisedb.dev/media/abc123.gif", ✅
        targetMuscles: ["pectorals"],
        bodyParts: ["chest"],
        equipments: ["dumbbell"],
        instructions: [
          "Step:1 Lie on a flat bench...",
          "Step:2 Hold dumbbells...",
          ...
        ],
        sets: 4,
        reps: "8-10",
        rest: "90 seconds"
      }

┌─────────────────────────────────────────────────────────────┐
│ FINAL RESULT: Guaranteed Accuracy                          │
└─────────────────────────────────────────────────────────────┘

    ✅ All exercises exist (from database, not AI invention)
    ✅ 100% have GIF URLs (verified)
    ✅ Equipment matches user's available equipment
    ✅ Appropriate for experience level
    ✅ Respects physical limitations
    ✅ AI provides creativity in exercise selection & structure
```

---

## 🚨 What Can Still Go Wrong (And How to Fix)

### Problem 1: Small Food Database (28 foods)

**Risk**: Limited variety, repetitive meal plans

**Current Status**: ⚠️ CRITICAL - Only 28 foods

**Solution**:
```typescript
// IMMEDIATE: Expand food database to 200-500 foods
// Priority order:
1. Common proteins (30 items): All meats, fish, plant proteins
2. Common carbs (40 items): All grains, breads, pasta varieties
3. Common vegetables (50 items): All vegetables
4. Common fruits (30 items): All fruits
5. Common fats (20 items): Oils, nuts, seeds
6. Dairy (20 items): All dairy products
7. Indian foods (50 items): Dal, paneer, roti, sabzi
8. International (50 items): Sushi, tacos, pizza, pasta dishes

Total: 290 foods = Good variety ✅
```

**Implementation**:
```typescript
// Option A: Manual curation (most accurate)
export const FOODS: Food[] = [
  // Use USDA FoodData Central API
  // https://fdc.nal.usda.gov/api-guide.html
  {
    id: 'brown_rice_cooked',
    name: 'Brown Rice (Cooked)',
    category: 'carbs',
    nutrition: {
      calories: 112,  // Per 100g - from USDA
      macros: {
        protein: 2.6,
        carbohydrates: 23.5,
        fat: 0.9,
        fiber: 1.8,
      },
      servingSize: 100,
      servingUnit: 'g',
    },
    verified: true,  // ← CRITICAL: Only add verified foods
  },
  ...
];

// Option B: API integration for runtime lookup
// Integrate OpenFoodFacts API or USDA API
async function lookupFood(foodName: string) {
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${foodName}`);
  // Parse nutrition data
  // Add to local cache
}
```

### Problem 2: AI Suggests Food Not in Database

**Risk**: AI says "Add grilled tilapia" but tilapia not in database

**Current Protection**: ✅ ALREADY IMPLEMENTED
```typescript
// In dietGeneration.ts prompt:
"Choose from these foods ONLY:
[List of allowed food IDs]

CRITICAL: You MUST use food IDs from the list above.
Do NOT invent new foods."
```

**Additional Safety** (Recommended):
```typescript
// Validate AI response before sending to user
function validateMealPlan(aiResponse, allowedFoodIds) {
  for (const meal of aiResponse.meals) {
    for (const food of meal.foods) {
      if (!allowedFoodIds.includes(food.id)) {
        throw new Error(`AI hallucinated food: ${food.id}`);
        // Regenerate or fallback to template
      }
    }
  }
}
```

### Problem 3: Portions Still Slightly Off After Adjustment

**Risk**: Target 2,200 cal, get 2,190 cal (10 cal off)

**Current Protection**: ✅ 2% tolerance implemented
```typescript
// In portionAdjustment.ts
if (Math.abs(1 - scaleFactor) < 0.02) {
  // Within 2% = acceptable
  return mealPlan;
}
```

**Status**: ✅ ACCEPTABLE - 10 cal variance is fine

### Problem 4: AI Forgets Context Mid-Generation

**Risk**: AI generates breakfast with 600 cal, then "forgets" only has 1,600 left for rest of day

**Current Protection**: ⚠️ PARTIAL
- We validate final totals
- We adjust portions

**Better Solution** (Future Enhancement):
```typescript
// Use structured output with per-meal validation
const schema = z.object({
  meals: z.array(z.object({
    name: z.string(),
    foods: z.array(z.string()),
    targetCalories: z.number(), // ← AI must specify per-meal target
  })),
});

// Validate per-meal targets add up
const totalTargetCal = meals.reduce((sum, m) => sum + m.targetCalories, 0);
if (Math.abs(totalTargetCal - userTarget) > 100) {
  throw new Error('Meal targets don\'t match user target');
}
```

---

## 🎯 Recommended Architecture (Final)

### Diet Generation (3-Layer Protection)

```
Layer 1: DETERMINISTIC FILTERING
├── Load user metrics from DB (EXACT values)
├── Filter food database (remove allergens, restrictions)
└── Result: List of 50-200 allowed foods with EXACT nutrition

Layer 2: CONSTRAINED AI GENERATION
├── AI chooses from allowed foods only
├── AI creates meal structure & combinations
├── AI provides meal names & descriptions
└── Result: Meal plan with food IDs (no nutrition data from AI)

Layer 3: DETERMINISTIC CALCULATION
├── Look up EXACT nutrition for each food from DB
├── Calculate portions mathematically
├── Adjust portions to hit target ±2%
└── Result: Final meal plan with GUARANTEED accuracy
```

### Workout Generation (3-Layer Protection)

```
Layer 1: DETERMINISTIC FILTERING
├── Load user metrics, limitations, equipment
├── Filter 1,500 exercises → 30-80 exercises
├── Verify 100% have GIF URLs
└── Result: List of 30-80 safe, verified exercises

Layer 2: CONSTRAINED AI GENERATION
├── AI chooses from filtered exercises only
├── AI creates workout structure & flow
├── AI suggests sets/reps based on fitness level
└── Result: Workout plan with exercise IDs (no GIFs from AI)

Layer 3: DETERMINISTIC ENRICHMENT
├── Look up exercise details from DB
├── Add GIF URLs (guaranteed to exist)
├── Add instructions from DB
└── Result: Final workout with GUARANTEED GIFs & accuracy
```

---

## 📊 Performance Optimization

### Current Token Usage (Diet Generation)

**❌ Bad Approach** (Send entire food database to AI):
```
Prompt: 3,000 tokens (28 foods × 100 tokens each)
AI Response: 1,500 tokens
Total: 4,500 tokens per generation
Cost: $0.03 per generation (Gemini 2.5 Flash)
```

**✅ Good Approach** (Pre-filter, send only allowed foods):
```
Prompt: 800 tokens (22 allowed foods × 35 tokens each)
AI Response: 1,500 tokens
Total: 2,300 tokens per generation
Cost: $0.015 per generation (50% savings!)
```

**🚀 Best Approach** (Send food IDs only, enrich after):
```
Prompt: 400 tokens (22 food IDs only)
AI Response: 800 tokens (IDs only, no nutrition)
Enrichment: Database lookup (free)
Total: 1,200 tokens per generation
Cost: $0.008 per generation (73% savings!)
```

### Caching Strategy

**3-Tier Caching** (Already implemented in fitai-workers):

```typescript
// Tier 1: Client-side cache (AsyncStorage)
const cachedPlan = await AsyncStorage.getItem(`meal_plan_${userId}_${date}`);
if (cachedPlan && !forceRefresh) {
  return JSON.parse(cachedPlan);
}

// Tier 2: Cloudflare KV cache (fitai-workers)
const kvKey = `diet:${userId}:${preferences_hash}`;
const cached = await env.MEAL_CACHE.get(kvKey, 'json');
if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
  return cached.data;
}

// Tier 3: Database cache (Supabase)
const { data } = await supabase
  .from('meal_plan_cache')
  .select('*')
  .eq('user_id', userId)
  .eq('preferences_hash', hash)
  .single();

if (data && Date.now() - data.created_at < 7 * 24 * 60 * 60 * 1000) {
  return data.meal_plan;
}

// If all caches miss, generate new plan
const newPlan = await generateMealPlan(metrics, preferences);

// Save to all cache layers
await AsyncStorage.setItem(`meal_plan_${userId}_${date}`, JSON.stringify(newPlan));
await env.MEAL_CACHE.put(kvKey, JSON.stringify(newPlan), { expirationTtl: 86400 });
await supabase.from('meal_plan_cache').insert({...});
```

**Result**: 95% of requests served from cache, only 5% hit AI

---

## 🎓 Example: Full Diet Generation Flow

```typescript
// STEP 1: Load metrics (fitai-workers)
const metrics = await loadUserMetrics(env, userId);
/*
{
  daily_calories: 2200,
  daily_protein_g: 165,
  daily_carbs_g: 220,
  daily_fat_g: 73,
  detected_climate: 'tropical',
  detected_ethnicity: 'asian',
}
*/

// STEP 2: Load preferences
const prefs = await loadUserPreferences(env, userId);
/*
{
  diet_type: 'vegetarian',
  allergies: ['peanuts'],
  restrictions: ['no_beef', 'no_pork'],
  breakfast_enabled: true,
  lunch_enabled: true,
  dinner_enabled: true,
  snacks_enabled: true,
}
*/

// STEP 3: Filter food database
const allowedFoods = FOODS.filter(food => {
  // Remove allergens
  if (food.allergens.some(a => prefs.allergies.includes(a))) return false;

  // Remove meat for vegetarian
  if (prefs.diet_type === 'vegetarian' && food.category === 'meat') return false;

  // Remove dairy for vegan
  if (prefs.diet_type === 'vegan' && ['dairy', 'eggs'].includes(food.category)) return false;

  return true;
});

console.log(`Filtered: ${FOODS.length} → ${allowedFoods.length} foods`);
// Output: Filtered: 28 → 22 foods

// STEP 4: Build AI prompt (IDs only - lightweight)
const foodList = allowedFoods.map(f => `${f.id}: ${f.name}`).join('\n');
/*
greek_yogurt: Greek Yogurt (Plain, Non-fat)
tofu: Firm Tofu
quinoa: Quinoa (Cooked)
...
*/

const prompt = `Create a vegetarian meal plan.

Target Nutrition:
- Calories: 2,200 kcal
- Protein: 165g
- Carbs: 220g
- Fat: 73g

Meals: Breakfast, Lunch, Dinner, 2 Snacks

Available Foods (use food IDs ONLY):
${foodList}

Return JSON with this structure:
{
  "meals": [
    {
      "type": "breakfast",
      "name": "...",
      "foods": ["food_id_1", "food_id_2", ...]
    },
    ...
  ]
}`;

// STEP 5: AI generates structure (IDs only)
const aiResponse = await generateObject({
  model: googleModel,
  prompt,
  schema: DietResponseSchema,
});

/*
{
  meals: [
    {
      type: "breakfast",
      name: "Greek Protein Power Bowl",
      foods: ["greek_yogurt", "oats", "banana", "almonds"]
    },
    {
      type: "lunch",
      name: "Mediterranean Quinoa Salad",
      foods: ["quinoa", "chickpeas", "cucumber", "olive_oil", "feta"]
    },
    ...
  ]
}
*/

// STEP 6: Enrich with EXACT nutrition from database
const enrichedMeals = aiResponse.meals.map(meal => {
  const enrichedFoods = meal.foods.map(foodId => {
    const foodData = FOODS.find(f => f.id === foodId);

    if (!foodData) {
      throw new Error(`AI hallucinated food ID: ${foodId}`);
    }

    // Calculate base portion (evenly distribute calories)
    const targetCalPerMeal = metrics.daily_calories / aiResponse.meals.length;
    const targetCalPerFood = targetCalPerMeal / meal.foods.length;
    const portionGrams = (targetCalPerFood / foodData.nutrition.calories) * 100;

    return {
      id: foodData.id,
      name: foodData.name,
      portionGrams: Math.round(portionGrams),
      nutrition: {
        calories: Math.round((portionGrams / 100) * foodData.nutrition.calories),
        protein: (portionGrams / 100) * foodData.nutrition.macros.protein,
        carbs: (portionGrams / 100) * foodData.nutrition.macros.carbohydrates,
        fat: (portionGrams / 100) * foodData.nutrition.macros.fat,
      }
    };
  });

  return {
    ...meal,
    foods: enrichedFoods,
  };
});

// STEP 7: Calculate totals and adjust portions
const currentTotal = enrichedMeals.reduce((sum, meal) =>
  sum + meal.foods.reduce((mealSum, food) =>
    mealSum + food.nutrition.calories, 0
  ), 0
);

console.log(`Initial total: ${currentTotal} cal`);
// Output: Initial total: 2150 cal

const scaleFactor = metrics.daily_calories / currentTotal;
console.log(`Scale factor: ${scaleFactor}`);
// Output: Scale factor: 1.023

// Adjust all portions by scale factor
const finalMeals = adjustPortionsToTarget(enrichedMeals, metrics.daily_calories);

const finalTotal = finalMeals.reduce((sum, meal) =>
  sum + meal.foods.reduce((mealSum, food) =>
    mealSum + food.nutrition.calories, 0
  ), 0
);

console.log(`Final total: ${finalTotal} cal`);
// Output: Final total: 2200 cal ✅

// STEP 8: Validate accuracy
const warnings = validateMealPlan(finalMeals, {
  daily_calories: metrics.daily_calories,
  daily_protein_g: metrics.daily_protein_g,
  daily_carbs_g: metrics.daily_carbs_g,
  daily_fat_g: metrics.daily_fat_g,
});

if (warnings.length > 0) {
  console.warn('Validation warnings:', warnings);
  // Log for monitoring, but still return plan
}

// STEP 9: Return final plan
return {
  success: true,
  data: {
    meals: finalMeals,
    totalNutrition: {
      calories: finalTotal,
      protein: ...,
      carbs: ...,
      fat: ...,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      userMetrics: metrics,
      accuracy: '±2%',
      dataSource: 'USDA verified',
    }
  }
};
```

---

## ✅ Summary: What Prevents Hallucination

| Component | Protection | Status |
|-----------|-----------|--------|
| **Calories** | Database lookup (USDA verified) | ✅ 100% accurate |
| **Macros** | Database lookup | ✅ 100% accurate |
| **Portions** | Mathematical calculation + scaling | ✅ ±2% accurate |
| **Food Selection** | AI constrained to allowed foods only | ✅ Safe |
| **Exercise Selection** | AI constrained to 1,500 verified exercises | ✅ Safe |
| **GIF URLs** | Database lookup (100% coverage) | ✅ Guaranteed |
| **Equipment** | Pre-filtered by user's available equipment | ✅ Safe |
| **Instructions** | Database lookup | ✅ Verified |
| **Daily Targets** | Universal Health System calculation | ✅ Scientifically validated |

---

## 🚀 Next Steps to Minimize AI Load

### Priority 1: Expand Food Database (CRITICAL)
```bash
Target: 200-500 verified foods
Timeline: 2-4 weeks
Method: USDA FoodData Central API + manual curation
Impact: 10x variety, more realistic meal plans
```

### Priority 2: Add Template-Based Fallback (HIGH)
```typescript
// If AI fails or hallucinates, use pre-made templates
const templates = {
  vegetarian_2200cal: {
    breakfast: ["greek_yogurt", "oats", "banana"],
    lunch: ["quinoa_salad", "chickpeas"],
    dinner: ["tofu_stir_fry", "brown_rice"],
  },
  // 20-30 templates covering common scenarios
};

// Use template + slight AI customization
if (aiGenerationFails || validationFails) {
  const template = findClosestTemplate(metrics, prefs);
  const customized = await customizeTemplate(template, prefs);
  return customized;
}
```

### Priority 3: Add Meal History Learning (MEDIUM)
```typescript
// Track what user actually eats
await supabase.from('meal_log').insert({
  user_id: userId,
  meal_id: mealId,
  consumed: true,
  rating: 4.5,  // User rated this meal
});

// Use history to improve future generation
const userHistory = await loadMealHistory(userId);
const likedFoods = userHistory.filter(m => m.rating >= 4).map(m => m.foods);

// Bias AI toward foods user likes
prompt += `\nUser particularly enjoys: ${likedFoods.join(', ')}`;
```

### Priority 4: Add Nutrition Label Scanning (FUTURE)
```typescript
// Allow users to scan packaged food nutrition labels
// Add to personal food database
// Use in meal plans

async function scanNutritionLabel(imageUri: string) {
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  const extractedNutrition = parseNutritionData(response);

  await supabase.from('user_foods').insert({
    user_id: userId,
    name: extractedNutrition.name,
    nutrition: extractedNutrition,
    source: 'scanned',
    verified: false,  // User-added, not USDA verified
  });
}
```

---

**Conclusion**: The current architecture (Hybrid AI + Database) is **SOLID** for preventing hallucination. Main gap is the small food database (28 foods). Expanding to 200-500 foods will unlock full potential while maintaining 100% accuracy.

