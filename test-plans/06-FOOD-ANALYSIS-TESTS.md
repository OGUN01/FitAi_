# Food Analysis (AI Image Recognition) - Comprehensive Test Plan

## Test Overview

**Feature**: AI-Powered Food Recognition from Images  
**Backend**: Cloudflare Workers - POST /food/recognize  
**AI Model**: Google Gemini 2.0 Flash Exp (Vision)  
**Created**: 2025-01-21

---

## Test Environment Setup

### Required Credentials

- Cloudflare Workers URL: `https://fitai-workers.sharmaharsh9887.workers.dev`
- Supabase authentication (JWT required)
- Test user account

### Test Data Requirements

- Food images in various conditions:
  - Different cuisines (Indian, Chinese, Italian, Mexican, etc.)
  - Single food vs multiple items
  - Different lighting conditions
  - Various portion sizes
  - Plated vs unplated
  - Home-cooked vs restaurant
  - Clear vs blurry images
  - Close-up vs distant shots

---

## Test Scenarios

### Scenario 1: Single Indian Dish (Chicken Biryani)

**Test Image**: Chicken Biryani in a bowl  
**Expected Recognition**:

```json
{
  "foods": [
    {
      "name": "Chicken Biryani",
      "localName": "चिकन बिरयानी",
      "category": "main",
      "cuisine": "indian",
      "estimatedGrams": 350,
      "servingDescription": "1 large bowl",
      "calories": 490,
      "protein": 28,
      "carbs": 62,
      "fat": 14,
      "fiber": 3,
      "nutritionPer100g": {
        "calories": 140,
        "protein": 8,
        "carbs": 18,
        "fat": 4,
        "fiber": 1
      },
      "confidence": 85
    }
  ],
  "overallConfidence": 85,
  "totalCalories": 490,
  "mealType": "lunch"
}
```

**Validation Checks**:

- [ ] Food identified correctly: "Chicken Biryani"
- [ ] Cuisine: "indian"
- [ ] Category: "main"
- [ ] Local name provided in Hindi
- [ ] Portion estimate reasonable (300-400g for bowl)
- [ ] Nutrition values realistic
- [ ] Confidence ≥ 70%
- [ ] Processing time < 5 seconds

---

### Scenario 2: Multiple Foods (Thali Plate)

**Test Image**: Indian thali with dal, rice, sabzi, roti, raita  
**Expected Recognition**:

```json
{
  "foods": [
    {
      "name": "Dal Tadka",
      "category": "main",
      "cuisine": "indian",
      "estimatedGrams": 150,
      "servingDescription": "1 small bowl",
      "calories": 180,
      "protein": 9,
      "carbs": 20,
      "fat": 7
    },
    {
      "name": "Steamed Basmati Rice",
      "category": "main",
      "estimatedGrams": 200,
      "calories": 260,
      "carbs": 58
    },
    {
      "name": "Mixed Vegetable Sabzi",
      "category": "side",
      "estimatedGrams": 100,
      "calories": 80
    },
    {
      "name": "Whole Wheat Roti",
      "category": "main",
      "estimatedGrams": 40,
      "calories": 100
    },
    {
      "name": "Cucumber Raita",
      "category": "side",
      "estimatedGrams": 80,
      "calories": 50
    }
  ],
  "totalCalories": 670,
  "overallConfidence": 78
}
```

**Validation Checks**:

- [ ] All 5 items identified
- [ ] Each item has separate nutrition data
- [ ] Total calories sum correctly
- [ ] Portion sizes reasonable for thali
- [ ] Each item categorized (main/side)
- [ ] Overall confidence 70-85%

---

### Scenario 3: Western Food (Burger and Fries)

**Test Image**: Cheeseburger with french fries  
**Expected Recognition**:

```json
{
  "foods": [
    {
      "name": "Cheeseburger",
      "category": "main",
      "cuisine": "american",
      "estimatedGrams": 250,
      "servingDescription": "1 burger",
      "calories": 540,
      "protein": 28,
      "carbs": 38,
      "fat": 30
    },
    {
      "name": "French Fries",
      "category": "side",
      "cuisine": "american",
      "estimatedGrams": 150,
      "servingDescription": "1 medium serving",
      "calories": 365,
      "protein": 4,
      "carbs": 48,
      "fat": 17
    }
  ],
  "totalCalories": 905
}
```

**Validation Checks**:

- [ ] Both items identified
- [ ] Cuisine: "american"
- [ ] High calorie content flagged
- [ ] Fat content accurate (high)
- [ ] Portion descriptions clear

---

### Scenario 4: Healthy Meal (Grilled Chicken Salad)

**Test Image**: Grilled chicken breast with mixed greens salad  
**Expected Recognition**:

```json
{
  "foods": [
    {
      "name": "Grilled Chicken Breast",
      "category": "main",
      "estimatedGrams": 150,
      "servingDescription": "1 medium breast",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6
    },
    {
      "name": "Mixed Green Salad",
      "category": "side",
      "estimatedGrams": 100,
      "servingDescription": "1 bowl",
      "calories": 25,
      "protein": 2,
      "carbs": 5,
      "fat": 0.3,
      "fiber": 2
    },
    {
      "name": "Olive Oil Dressing",
      "category": "snack",
      "estimatedGrams": 20,
      "servingDescription": "2 tablespoons",
      "calories": 180,
      "fat": 20
    }
  ],
  "totalCalories": 370
}
```

**Validation Checks**:

- [ ] Chicken identified as "grilled" (not fried)
- [ ] Healthy meal classification
- [ ] High protein content
- [ ] Dressing identified separately
- [ ] Low carb meal flagged appropriately

---

### Scenario 5: Ambiguous/Complex Image (Mixed Curry)

**Test Image**: Blurry photo of unidentifiable curry  
**Expected Behavior**:

```json
{
  "foods": [
    {
      "name": "Vegetable Curry",
      "category": "main",
      "cuisine": "indian",
      "estimatedGrams": 250,
      "servingDescription": "1 bowl",
      "calories": 200,
      "protein": 5,
      "carbs": 25,
      "fat": 10,
      "confidence": 45
    }
  ],
  "overallConfidence": 45
}
```

**Handling Low Confidence**:

- Warning message: "AI confidence is low (45%). Please verify portions and food items."
- Option to manually edit food name
- Option to adjust portions
- Suggestion: "Consider retaking photo with better lighting"

**Validation Checks**:

- [ ] Low confidence flagged (< 70%)
- [ ] Generic identification ("Vegetable Curry" vs specific type)
- [ ] User warned about accuracy
- [ ] Manual correction option provided

---

### Scenario 6: Homemade vs Restaurant Portions

**Test A: Homemade Pasta** (smaller portion)

- Expected: 200g, 300 kcal

**Test B: Restaurant Pasta** (larger portion)

- Expected: 400g, 600 kcal

**Validation**:

- [ ] AI distinguishes portion sizes
- [ ] Plating style affects estimation
- [ ] Restaurant portions estimated larger
- [ ] Serving descriptions differ ("1 home plate" vs "1 restaurant serving")

---

### Scenario 7: Portion Adjustment Flow

**Test Steps**:

1. Scan food image (Paneer Tikka)
2. AI estimates: 200g, 400 kcal
3. User adjusts to 150g using slider
4. Nutrition recalculated

**Expected Recalculation**:

```
Original: 200g = 400 kcal
Adjusted: 150g = 300 kcal (75% of original)

All macros scaled:
Protein: 24g → 18g
Carbs: 12g → 9g
Fat: 28g → 21g
```

**Validation Checks**:

- [ ] Linear scaling accurate
- [ ] All nutrition values updated
- [ ] UI reflects changes in real-time
- [ ] nutritionPer100g remains constant
- [ ] User can reset to AI estimate

---

### Scenario 8: Add to Meal Flow (Complete Integration)

**Test Steps**:

1. Scan breakfast image (Omelette + Toast)
2. AI recognizes 2 foods
3. User adjusts portions
4. User taps "Log Meal"
5. Select meal type: "Breakfast"
6. Confirm addition

**Expected Database Operations**:

```sql
-- 1. Create/find foods in 'foods' table
INSERT INTO foods (name, nutrition_per_100g, ...)
ON CONFLICT (name) DO UPDATE ...

-- 2. Log to meal_logs table
INSERT INTO meal_logs (
  user_id,
  meal_type,
  logged_at,
  foods,  -- JSONB array
  total_calories,
  total_protein,
  ...
) VALUES (
  'user-123',
  'breakfast',
  NOW(),
  '[{"id": "food-1", "grams": 150}, {"id": "food-2", "grams": 60}]',
  450,
  28,
  ...
);

-- 3. Update meal_recognition_metadata
INSERT INTO meal_recognition_metadata (
  meal_log_id,
  recognition_confidence,
  ai_model,
  cuisines,
  ...
);
```

**UI Updates**:

- Daily nutrition totals refreshed
- Meal card added to "Today's Meals"
- Success toast message
- Option to view logged meal

**Validation Checks**:

- [ ] Foods created/matched in database
- [ ] Meal log entry saved
- [ ] Metadata stored with confidence scores
- [ ] enhancementSource: "ai_vision"
- [ ] Daily totals updated correctly
- [ ] UI refreshes immediately

---

### Scenario 9: Cuisine Detection Accuracy (14 Cuisines)

Test images from each cuisine:

| Cuisine        | Test Dish            | Expected Detection  |
| -------------- | -------------------- | ------------------- |
| Indian         | Paneer Butter Masala | ✅ "indian"         |
| Chinese        | Kung Pao Chicken     | ✅ "chinese"        |
| Japanese       | Sushi Platter        | ✅ "japanese"       |
| Korean         | Bibimbap             | ✅ "korean"         |
| Thai           | Pad Thai             | ✅ "thai"           |
| Vietnamese     | Pho                  | ✅ "vietnamese"     |
| Italian        | Margherita Pizza     | ✅ "italian"        |
| Mexican        | Tacos                | ✅ "mexican"        |
| American       | BBQ Ribs             | ✅ "american"       |
| Mediterranean  | Greek Salad          | ✅ "mediterranean"  |
| Middle Eastern | Falafel              | ✅ "middle_eastern" |
| French         | Croissant            | ✅ "french"         |
| African        | Jollof Rice          | ✅ "african"        |
| Other          | Fusion Dish          | ✅ "other"          |

**Validation Checks**:

- [ ] All 14 cuisines supported
- [ ] Cuisine-specific dishes detected
- [ ] Ambiguous dishes default to "other"
- [ ] Multi-cuisine meals handled (e.g., "indian" + "chinese")

---

### Scenario 10: Edge Cases and Error Handling

**Test Case A: No Food in Image** (Image of person/table/empty plate)  
Expected Response:

```json
{
  "error": "No food detected in image",
  "foods": [],
  "overallConfidence": 0
}
```

**Test Case B: Corrupted Image**  
Expected: 400 Bad Request - "Invalid image format"

**Test Case C: Very Large Image (> 10MB)**  
Expected: 413 Payload Too Large

**Test Case D: Network Timeout**  
Expected: Timeout after 30 seconds, error message, retry option

**Test Case E: Non-Food Items** (Image of phone/book)  
Expected: "No food detected" or very low confidence

**Validation Checks**:

- [ ] Graceful error handling
- [ ] User-friendly error messages
- [ ] No app crashes
- [ ] Retry mechanism available
- [ ] Fallback to manual entry

---

## API Endpoint Testing

### Endpoint: POST /food/recognize

**Test 1: Valid Request**

```bash
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/food/recognize \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
    "mealType": "lunch",
    "userContext": {
      "dietaryRestrictions": ["vegetarian"]
    }
  }'
```

**Expected**: 200 OK with recognized foods

**Test 2: Missing Required Fields**

```json
{
  "imageBase64": "data:image/jpeg;base64,..."
  // Missing mealType
}
```

**Expected**: 400 Bad Request with validation error

**Test 3: Invalid Image Format**

```json
{
  "imageBase64": "not-a-valid-base64-string",
  "mealType": "lunch"
}
```

**Expected**: 400 Bad Request - "Invalid image format"

**Test 4: Unauthorized Request**

```bash
curl -X POST /food/recognize \
  -H "Content-Type: application/json" \
  -d @request.json
```

**Expected**: 401 Unauthorized

**Test 5: Rate Limit Exceeded**
Send 51 requests in 1 hour.  
**Expected**: 429 Too Many Requests

---

## AI Model Testing

### Gemini 2.0 Flash Exp Configuration

**Model Parameters**:

```typescript
{
  model: "google/gemini-2.0-flash-exp",
  temperature: 0.3,  // Lower = more consistent
  maxTokens: 4096,
  schema: FoodRecognitionSchema  // Zod validation
}
```

**Prompt Engineering Tests**:

1. **Specificity Test**: Generic "curry" vs "Paneer Butter Masala"
   - Expect: Specific dish names preferred
   - Confidence higher for specific names

2. **Portion Accuracy Test**: Known portions (measured food)
   - Test: 100g, 200g, 500g known portions
   - Expected accuracy: ±20%

3. **Nutrition Accuracy Test**: Compare to USDA database
   - Test: 10 common foods
   - Expected: ±15% accuracy on calories

4. **Consistency Test**: Same image 3 times
   - Expected: Similar results (same food name, ±10% portions)

**Validation Checks**:

- [ ] Model responds within 5 seconds
- [ ] Structured output matches schema
- [ ] Confidence scores meaningful (70%+ reliable)
- [ ] Temperature setting optimal (0.3-0.5)
- [ ] No hallucinated foods

---

## Data Flow Validation

### Complete Recognition Flow

```
USER SELECTS "SCAN FOOD" (DietScreen.tsx)
  ↓
Choose image source (Camera or Gallery)
  ↓
Image picked → handleCameraCapture()
  ↓
Convert image to base64 (expo-file-system)
  ↓
Validate image format (PNG/JPEG)
  ↓
Check cache (24-hour local cache by imageHash + mealType)
  ├─ Cache HIT → Return cached result immediately
  └─ Cache MISS → Proceed to API call
      ↓
API CALL (foodRecognitionService.ts)
  ├─ recognizeFood(imageBase64, mealType)
  └─ POST /food/recognize
      ↓
CLOUDFLARE WORKERS (foodRecognition.ts)
  ├─ Validate JWT authentication
  ├─ Rate limit check (50/hour)
  ├─ Validate request schema (Zod)
  ├─ Extract user context (dietary restrictions)
  └─ Build AI prompt
      ↓
GEMINI 2.0 FLASH VISION
  ├─ Analyze image
  ├─ Identify foods (specific names)
  ├─ Detect cuisine types
  ├─ Estimate portions in grams
  ├─ Calculate nutrition per portion
  ├─ Calculate nutrition per 100g
  ├─ Assign confidence scores
  └─ Return structured JSON
      ↓
BACKEND PROCESSING
  ├─ Validate AI response against schema
  ├─ Enrich with nutritionPer100g
  ├─ Calculate totalCalories
  ├─ Add unique IDs to foods
  └─ Return response with metadata
      ↓
CLIENT-SIDE PROCESSING (DietScreen.tsx)
  ├─ Cache result (imageHash + mealType → 24 hours)
  ├─ Display results in modal
  ├─ Show confidence scores
  └─ Offer 4 options:
      ├─ Adjust Portions → PortionAdjustment.tsx
      ├─ Give Feedback → FoodRecognitionFeedback.tsx
      ├─ Log Meal → recognizedFoodLogger.ts
      └─ Cancel → Discard results
      ↓
USER CHOOSES "LOG MEAL"
  ↓
recognizedFoodLogger.logRecognizedFoods()
  ├─ Search/create foods in database
  ├─ Create meal_logs entry
  ├─ Store metadata (confidence, AI model, cuisines)
  └─ Refresh nutrition totals
      ↓
UI UPDATE
  ├─ Daily nutrition totals updated
  ├─ Meal card appears in "Today's Meals"
  ├─ Success message displayed
  └─ Option to view/edit logged meal
```

**Validation Checkpoints**:

- [ ] Each step completes successfully
- [ ] No data loss between steps
- [ ] Error handling at every point
- [ ] Cache working correctly
- [ ] Database transactions atomic
- [ ] UI state management correct

---

## UI Component Testing

### Main Recognition Flow (DietScreen.tsx)

- [ ] "Scan Food" button visible
- [ ] Camera/gallery picker works
- [ ] Loading indicator during processing
- [ ] Results modal displays
- [ ] All recognized foods shown
- [ ] Total calories calculated
- [ ] Confidence badge displayed

### PortionAdjustment Component

- [ ] Slider for each food item
- [ ] Manual gram input
- [ ] Real-time nutrition updates
- [ ] Quick portion buttons (small/medium/large)
- [ ] Progress indicator (food 1 of N)
- [ ] Reset to AI estimate button
- [ ] Save and continue button

### FoodRecognitionFeedback Component

- [ ] Star rating (1-5) per food
- [ ] Correct/incorrect toggle
- [ ] Text input for correct name
- [ ] Additional notes field
- [ ] Submit feedback button
- [ ] Feedback sent to analytics

### Recognition Results Display

- [ ] Food name and local name
- [ ] Cuisine badge
- [ ] Category icon (main/side/snack/sweet/beverage)
- [ ] Portion size (grams + description)
- [ ] Nutrition grid (calories, protein, carbs, fat, fiber)
- [ ] Confidence percentage with color coding
- [ ] Action buttons (Adjust/Feedback/Log/Cancel)

---

## Performance Benchmarks

| Metric                       | Target  | Critical |
| ---------------------------- | ------- | -------- |
| Image to Base64 Conversion   | < 500ms | < 2s     |
| API Request Time             | < 5s    | < 15s    |
| Cache Lookup                 | < 50ms  | < 200ms  |
| UI Rendering (results)       | < 300ms | < 1s     |
| End-to-End (scan to display) | < 6s    | < 20s    |
| Portion Recalculation        | < 10ms  | < 100ms  |
| Database Logging             | < 1s    | < 5s     |

---

## Test Data Files Needed

Create directory: `test-data/food-images/`

**Single Food Items**:

1. `chicken-biryani.jpg` - Indian main dish
2. `grilled-chicken.jpg` - Protein source
3. `caesar-salad.jpg` - Healthy meal
4. `pizza-slice.jpg` - Italian food
5. `sushi-platter.jpg` - Japanese cuisine

**Multiple Foods**: 6. `indian-thali.jpg` - 5+ items 7. `burger-fries.jpg` - American fast food 8. `breakfast-plate.jpg` - Eggs, toast, bacon 9. `chinese-takeout.jpg` - Multiple dishes 10. `fruit-bowl.jpg` - Multiple fruits

**Edge Cases**: 11. `blurry-curry.jpg` - Low quality image 12. `empty-plate.jpg` - No food 13. `non-food.jpg` - Book/phone 14. `very-small-portion.jpg` - Tiny serving 15. `huge-buffet.jpg` - 10+ items

**Various Conditions**: 16. `poor-lighting.jpg` - Dark image 17. `overhead-view.jpg` - Top-down shot 18. `side-angle.jpg` - Side view 19. `restaurant-plating.jpg` - Fancy presentation 20. `homemade-meal.jpg` - Casual plating

---

## Test Execution Log

| Test ID  | Status     | Date | Notes                   |
| -------- | ---------- | ---- | ----------------------- |
| FOOD-001 | ⏳ Pending |      | Single Indian dish      |
| FOOD-002 | ⏳ Pending |      | Multiple foods (thali)  |
| FOOD-003 | ⏳ Pending |      | Western food            |
| FOOD-004 | ⏳ Pending |      | Healthy meal            |
| FOOD-005 | ⏳ Pending |      | Low confidence handling |
| FOOD-006 | ⏳ Pending |      | Portion differences     |
| FOOD-007 | ⏳ Pending |      | Portion adjustment      |
| FOOD-008 | ⏳ Pending |      | Add to meal flow        |
| FOOD-009 | ⏳ Pending |      | Cuisine detection (14)  |
| FOOD-010 | ⏳ Pending |      | Edge cases              |

---

## Known Issues

1. **Fusion Dishes**: Hard to categorize (e.g., Indo-Chinese)
2. **Portion Estimation**: ±20-30% variance common
3. **Similar Foods**: Difficulty distinguishing (e.g., dal varieties)
4. **Homemade vs Store**: Same food, different nutrition
5. **Regional Variations**: Same dish name, different recipes
6. **Poor Lighting**: Confidence drops significantly
7. **Mixed Plates**: Overlapping foods hard to separate

---

## Success Criteria

- [ ] Recognition accuracy ≥ 80% for clear images
- [ ] Confidence scores meaningful (≥70% = reliable)
- [ ] All 14 cuisines supported
- [ ] Multiple foods detected (up to 10 items)
- [ ] Portion estimates within ±25%
- [ ] Nutrition accuracy ±15% vs USDA database
- [ ] Processing time < 10 seconds
- [ ] Cache working (24-hour TTL)
- [ ] Add to meal flow complete
- [ ] UI displays all data properly
- [ ] Error handling robust
- [ ] Database persistence verified
- [ ] Feedback loop functional
