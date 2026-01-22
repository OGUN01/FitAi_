# Meal Generation - Comprehensive Test Plan

## Test Overview

**Feature**: AI-Powered Weekly Meal Plan Generation  
**Backend**: Cloudflare Workers - POST /diet/generate  
**AI Model**: Google Gemini 2.5 Flash  
**Created**: 2025-01-21

---

## Test Environment Setup

### Required Credentials

- Supabase URL: From `.env.local`
- Supabase Anon Key: From `.env.local`
- Workers URL: `https://fitai-workers.sharmaharsh9887.workers.dev`
- Test User Account: Create test user in Supabase

### Test Data Requirements

- User profiles with different:
  - Diet types (vegan, vegetarian, keto, pescatarian, non-veg)
  - Calorie targets (1200-3500 kcal/day)
  - Protein targets (50-200g/day)
  - Allergens (peanuts, dairy, gluten, shellfish, etc.)
  - Medical conditions (diabetes, pregnancy, etc.)

---

## Test Scenarios

### Scenario 1: Basic Meal Generation (Vegetarian)

**Input Data**:

```json
{
  "userId": "test-user-1",
  "profile": {
    "age": 28,
    "gender": "female",
    "weight": 65,
    "height": 165,
    "dietType": "vegetarian",
    "allergens": []
  },
  "weeklyPlan": {
    "dailyCalories": 1800,
    "dailyProteinG": 80,
    "mealsPerDay": 3
  }
}
```

**Expected Results**:

- 7 days of meal plans returned
- Each day has 3 meals (breakfast, lunch, dinner)
- Total calories per day: 1800 ± 100 kcal
- Total protein per day: ≥ 64g (80% of target)
- No meat/fish/eggs in any meal
- All meals have valid nutrition data
- Response time: < 10 seconds

**Validation Checks**:

- [ ] API returns 200 status
- [ ] Response matches `WeeklyMealPlanSchema`
- [ ] No allergen violations
- [ ] No diet violations (vegetarian)
- [ ] Calorie accuracy within ±30%
- [ ] Protein target met (≥80%)
- [ ] Variety score ≥ 60%
- [ ] Cache metadata present

---

### Scenario 2: Vegan with Allergens (Peanuts + Gluten)

**Input Data**:

```json
{
  "profile": {
    "dietType": "vegan",
    "allergens": ["peanuts", "gluten", "soy"]
  },
  "weeklyPlan": {
    "dailyCalories": 2000,
    "dailyProteinG": 100
  }
}
```

**Expected Results**:

- NO peanuts, peanut butter, groundnuts in any meal
- NO wheat, bread, pasta, roti in any meal
- NO tofu, soy milk, edamame in any meal
- NO animal products (meat, dairy, eggs, honey)
- Protein sources: lentils, chickpeas, quinoa, nuts (except peanuts)

**Validation Checks**:

- [ ] Allergen detection passes (0 violations)
- [ ] Diet compliance: 100% vegan
- [ ] Alternative protein sources used
- [ ] Validation warnings present if protein target difficult

---

### Scenario 3: Keto Diet (High Fat, Low Carb)

**Input Data**:

```json
{
  "profile": {
    "dietType": "keto",
    "fitnessGoal": "weight_loss"
  },
  "weeklyPlan": {
    "dailyCalories": 1500,
    "dailyProteinG": 90
  }
}
```

**Expected Results**:

- Daily carbs: < 50g per day
- Daily fat: > 100g per day (60-70% of calories)
- High-fat foods: avocado, nuts, cheese, oils, fatty fish
- No bread, rice, pasta, sugar, potatoes

**Validation Checks**:

- [ ] Carbs < 20% of total calories
- [ ] Fat > 60% of total calories
- [ ] Keto-friendly foods only
- [ ] No high-carb foods

---

### Scenario 4: Muscle Gain (High Protein, High Calorie)

**Input Data**:

```json
{
  "profile": {
    "gender": "male",
    "weight": 75,
    "fitnessGoal": "muscle_gain",
    "activityLevel": "very_active"
  },
  "weeklyPlan": {
    "dailyCalories": 3000,
    "dailyProteinG": 180,
    "mealsPerDay": 5
  }
}
```

**Expected Results**:

- 5 meals per day (3 main + 2 snacks)
- High-protein foods: chicken, eggs, fish, Greek yogurt, protein shakes
- Calorie surplus for muscle gain
- Protein: 2.4g per kg bodyweight

**Validation Checks**:

- [ ] Protein target met (180g)
- [ ] 5 meals generated per day
- [ ] Calorie target: 3000 ± 150 kcal
- [ ] High-protein foods prioritized

---

### Scenario 5: Pregnancy (2nd Trimester)

**Input Data**:

```json
{
  "profile": {
    "gender": "female",
    "pregnancyStatus": true,
    "pregnancyTrimester": 2
  },
  "weeklyPlan": {
    "dailyCalories": 2200
  }
}
```

**Expected Results**:

- Extra 340 calories added for 2nd trimester
- Nutrient-rich foods: leafy greens, dairy, lean proteins
- Avoid: raw fish, unpasteurized dairy, deli meats
- Folate-rich foods included

**Validation Checks**:

- [ ] Calorie adjustment: +340 kcal
- [ ] Pregnancy-safe foods only
- [ ] No raw/undercooked items
- [ ] Nutrient diversity

---

### Scenario 6: Indian Cuisine Preference

**Input Data**:

```json
{
  "profile": {
    "cuisinePreferences": ["indian"],
    "dietType": "vegetarian"
  },
  "weeklyPlan": {
    "dailyCalories": 2000
  }
}
```

**Expected Results**:

- Indian foods: dal, paneer, roti, rice, sabzi, sambar
- Regional variety: North Indian, South Indian
- Spices and flavors: curry, masala, tandoori

**Validation Checks**:

- [ ] ≥80% Indian cuisine
- [ ] Regional diversity
- [ ] Authentic dish names

---

### Scenario 7: Cache Testing

**Test Steps**:

1. Generate meal plan with specific parameters
2. Immediately request same plan again
3. Check cache metadata

**Expected Results**:

- First request: `cached: false`, `cacheSource: 'fresh'`
- Second request: `cached: true`, `cacheSource: 'kv'` or `'database'`
- Response time: < 500ms for cached

**Validation Checks**:

- [ ] Cache hit on second request
- [ ] Identical meal plans returned
- [ ] Response time reduction ≥80%

---

### Scenario 8: Disabled Meals (Breakfast Only)

**Input Data**:

```json
{
  "weeklyPlan": {
    "mealsPerDay": 1,
    "disabledMeals": ["lunch", "dinner", "snack"]
  }
}
```

**Expected Results**:

- Only breakfast generated
- Higher calorie breakfast to meet daily target
- Larger portion sizes

**Validation Checks**:

- [ ] Only 1 meal per day
- [ ] Breakfast calories ≈ daily target
- [ ] No lunch/dinner/snack

---

## API Endpoint Testing

### Endpoint: POST /diet/generate

**Test 1: Valid Request**

```bash
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-data/meal-request-vegetarian.json
```

**Test 2: Missing Required Fields**

```json
{
  "profile": {}
}
```

Expected: 400 Bad Request with validation error

**Test 3: Invalid JWT**

```bash
curl -X POST ... -H "Authorization: Bearer invalid_token"
```

Expected: 401 Unauthorized

**Test 4: Rate Limit Exceeded**
Send 51 requests in 1 hour.
Expected: 429 Too Many Requests

---

## Data Flow Validation

### Frontend → Backend → AI → Database → Frontend

**Checkpoints**:

1. **Frontend Transform**: `aiRequestTransformers.transformForDietRequest()`
   - User profile mapped correctly
   - Allergens array formatted
   - Calorie/protein targets calculated

2. **Backend Validation**: `validateRequest()` in `dietGeneration.ts`
   - Zod schema validation passes
   - JWT verified
   - User exists in database

3. **AI Prompt Construction**: `buildDietPrompt()`
   - Diet type identified (vegan/keto/etc.)
   - Allergens listed in prompt
   - Cuisine preferences included
   - Calorie/protein targets specified

4. **AI Response**: Gemini 2.5 Flash
   - Structured output matches schema
   - All required fields present
   - Nutrition data complete

5. **Validation Layer**: `validateDietPlan()`
   - Allergen check passes
   - Diet violation check passes
   - Calorie drift check passes
   - Protein target check passes

6. **Database Storage**: `saveWeeklyMealPlan()`
   - Saved to Zustand store
   - Saved to AsyncStorage
   - Saved to Supabase `user_meal_plans` table

7. **UI Display**: `DietScreen.tsx`
   - Plan displayed with all meals
   - Nutrition totals shown
   - Cache indicator present

---

## UI Testing Checklist

### DietScreen.tsx Integration

- [ ] "Generate Meal Plan" button visible
- [ ] Loading state during generation
- [ ] Success message on completion
- [ ] Error handling for failures
- [ ] Meal cards display all nutrition
- [ ] Swipe to change days works
- [ ] Meal completion tracking works
- [ ] Daily nutrition updates in real-time

### Meal Card Display

- [ ] Food name, cuisine, category shown
- [ ] Calories, protein, carbs, fat visible
- [ ] Portion sizes displayed
- [ ] Cooking instructions (if available)
- [ ] Image placeholder or actual image

---

## Performance Benchmarks

| Metric                 | Target  | Critical |
| ---------------------- | ------- | -------- |
| Response Time (Fresh)  | < 8s    | < 15s    |
| Response Time (Cached) | < 500ms | < 2s     |
| Calorie Accuracy       | ±15%    | ±30%     |
| Protein Target Met     | ≥80%    | ≥60%     |
| Allergen Violations    | 0       | 0        |
| Diet Violations        | 0       | 0        |
| Food Variety           | ≥60%    | ≥40%     |

---

## Test Data Files Needed

Create these JSON files in `test-data/meal-generation/`:

1. `vegetarian-basic.json` - Simple vegetarian profile
2. `vegan-allergens.json` - Vegan with multiple allergens
3. `keto-weight-loss.json` - Keto diet for weight loss
4. `muscle-gain-high-protein.json` - Bodybuilder profile
5. `pregnancy-second-trimester.json` - Pregnant user
6. `indian-cuisine.json` - Indian food preference
7. `minimal-request.json` - Only required fields
8. `max-complexity.json` - All optional fields filled

---

## Test Execution Log

| Test ID  | Status     | Date | Notes             |
| -------- | ---------- | ---- | ----------------- |
| MEAL-001 | ⏳ Pending |      | Vegetarian basic  |
| MEAL-002 | ⏳ Pending |      | Vegan + allergens |
| MEAL-003 | ⏳ Pending |      | Keto diet         |
| MEAL-004 | ⏳ Pending |      | Muscle gain       |
| MEAL-005 | ⏳ Pending |      | Pregnancy         |
| MEAL-006 | ⏳ Pending |      | Indian cuisine    |
| MEAL-007 | ⏳ Pending |      | Cache test        |
| MEAL-008 | ⏳ Pending |      | Disabled meals    |

---

## Known Issues / Edge Cases

1. **Cache Key Collisions**: Two users with identical profiles get same plan
2. **Calorie Drift**: AI sometimes generates 20-25% off target
3. **Portion Adjustment**: May not be perfectly linear
4. **Rare Cuisines**: Limited variety for non-Indian cuisines
5. **Medical Conditions**: Not fully integrated into prompt

---

## Success Criteria

- [ ] All 8 test scenarios pass
- [ ] Zero allergen violations
- [ ] Zero diet violations
- [ ] Calorie accuracy ≥85%
- [ ] Protein targets met ≥90% of time
- [ ] Cache working correctly
- [ ] UI displays all data properly
- [ ] Database persistence verified
