# Body Analysis & Stats Calculation - Comprehensive Test Plan

## Test Overview

**Feature**: Body Measurements, Calculations (BMI, BMR, TDEE, Body Fat %), and Progress Tracking  
**Location**: Client-Side (React Native) - No dedicated API endpoints  
**Calculation Engine**: `src/utils/healthCalculations.ts` (1246 lines, 50+ formulas)  
**Created**: 2025-01-21

---

## Test Environment Setup

### Required Setup

- React Native app with access to onboarding flow
- Supabase database with test user accounts
- Access to wearable health data (optional - Health Connect/HealthKit)
- Calculator for manual verification of formulas

### Test Data Requirements

- User profiles with various:
  - Ages (18-80 years)
  - Genders (male, female)
  - Heights (140-210 cm)
  - Weights (40-150 kg)
  - Body fat percentages (5-45%)
  - Activity levels (sedentary to very active)
  - Medical conditions (pregnancy, diabetes, etc.)

---

## Test Scenarios

### Scenario 1: BMI Calculation (Standard Adult Male)

**Input Data**:

```json
{
  "height": 175, // cm
  "weight": 75, // kg
  "age": 28,
  "gender": "male",
  "ethnicity": "standard"
}
```

**Expected Results**:

```
BMI = weight / (height_m)²
BMI = 75 / (1.75)²
BMI = 75 / 3.0625
BMI = 24.49

Category: Normal Weight (18.5-24.9)
```

**Validation Checks**:

- [ ] BMI calculated correctly: 24.49
- [ ] Category: "Normal Weight"
- [ ] Color indicator: Green
- [ ] Ethnicity-specific thresholds applied
- [ ] Display shows 1 decimal place

---

### Scenario 2: BMI with Asian Ethnicity (Lower Thresholds)

**Input Data**:

```json
{
  "height": 165,
  "weight": 70,
  "ethnicity": "asian"
}
```

**Expected Results**:

```
BMI = 70 / (1.65)² = 25.71

Asian Thresholds:
- Underweight: < 18.5
- Normal: 18.5-22.9 (DIFFERENT)
- Overweight: 23-27.4 (DIFFERENT)
- Obese: ≥ 27.5 (DIFFERENT)

Category: Overweight (Asian scale)
```

**Validation Checks**:

- [ ] Asian thresholds applied correctly
- [ ] Category: "Overweight" (would be "Normal" on standard scale)
- [ ] Warning about ethnicity-specific risk

---

### Scenario 3: BMR Calculation (Mifflin-St Jeor Formula)

**Input Data**:

```json
{
  "age": 30,
  "gender": "male",
  "weight": 80,
  "height": 180
}
```

**Expected Results**:

```
Mifflin-St Jeor (Male):
BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
BMR = (10 × 80) + (6.25 × 180) - (5 × 30) + 5
BMR = 800 + 1125 - 150 + 5
BMR = 1780 kcal/day
```

**Female Formula**:

```
BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
```

**Validation Checks**:

- [ ] BMR: 1780 kcal (male)
- [ ] Formula selection: Mifflin-St Jeor (default, most accurate)
- [ ] Gender-specific constant applied (+5 male, -161 female)
- [ ] Result rounded to nearest integer

---

### Scenario 4: BMR with Body Fat % (Katch-McArdle Formula)

**Input Data**:

```json
{
  "weight": 75,
  "bodyFatPercentage": 15
}
```

**Expected Results**:

```
Lean Body Mass = weight × (1 - bf% / 100)
LBM = 75 × (1 - 15/100)
LBM = 75 × 0.85
LBM = 63.75 kg

Katch-McArdle:
BMR = 370 + (21.6 × LBM)
BMR = 370 + (21.6 × 63.75)
BMR = 370 + 1377
BMR = 1747 kcal/day
```

**Validation Checks**:

- [ ] LBM calculated: 63.75 kg
- [ ] BMR: 1747 kcal
- [ ] Formula auto-selected (Katch-McArdle when body fat % available)
- [ ] More accurate than Mifflin-St Jeor for lean individuals

---

### Scenario 5: TDEE Calculation (Desk Job)

**Input Data**:

```json
{
  "bmr": 1780,
  "occupation": "desk_job",
  "activityLevel": "sedentary",
  "exerciseMinutesPerWeek": 0
}
```

**Expected Results**:

```
Base TDEE = BMR × occupation_multiplier
Base TDEE = 1780 × 1.25 (desk job)
Base TDEE = 2225 kcal/day

Exercise Burn = 0 (no exercise)
Total TDEE = 2225 kcal/day
```

**Activity Multipliers**:

- Desk job: 1.25
- Light active (teacher, retail): 1.35
- Moderate active (nurse, waiter): 1.45
- Heavy labor (construction): 1.60
- Very active (athlete): 1.70

**Validation Checks**:

- [ ] TDEE: 2225 kcal
- [ ] Correct multiplier applied (1.25)
- [ ] Exercise burn added (if any)

---

### Scenario 6: Body Fat Percentage Estimation (Deurenberg Formula)

**Input Data**:

```json
{
  "bmi": 24.5,
  "age": 35,
  "gender": "female"
}
```

**Expected Results**:

```
Deurenberg Formula (Female):
BF% = (1.20 × BMI) + (0.23 × age) - 5.4
BF% = (1.20 × 24.5) + (0.23 × 35) - 5.4
BF% = 29.4 + 8.05 - 5.4
BF% = 32.05%

Category (Female, 35 years):
- Essential: 10-13%
- Athletes: 14-20%
- Fitness: 21-24%
- Average: 25-31%
- Obese: 32%+ ← Result falls here
```

**Validation Checks**:

- [ ] Body fat: 32.05%
- [ ] Category: Obese (for female, age 35)
- [ ] Age-adjusted thresholds applied
- [ ] Warning if estimation (not measured)

---

### Scenario 7: Ideal Weight Range (Devine Formula)

**Input Data**:

```json
{
  "height": 170, // cm
  "gender": "female"
}
```

**Expected Results**:

```
Height in inches = 170 / 2.54 = 66.93 inches
Inches over 60" (5 feet) = 66.93 - 60 = 6.93 inches

Devine Formula (Female):
Ideal Weight = 45.5 + (2.3 × inches_over_5ft)
Ideal Weight = 45.5 + (2.3 × 6.93)
Ideal Weight = 45.5 + 15.94
Ideal Weight = 61.44 kg

Range (±10%):
Min = 61.44 × 0.9 = 55.3 kg
Max = 61.44 × 1.1 = 67.6 kg

Ideal Range: 55-68 kg
```

**Validation Checks**:

- [ ] Ideal weight: 61.4 kg
- [ ] Range: 55.3 - 67.6 kg
- [ ] Gender-specific formula (45.5 female, 50 male)
- [ ] ±10% range calculated

---

### Scenario 8: Healthy Weight Loss Rate

**Input Data**:

```json
{
  "currentWeight": 85,
  "gender": "male",
  "fitnessGoal": "weight_loss"
}
```

**Expected Results**:

```
Base rate = 0.5-1% of body weight per week
Base rate = 85 × 0.005 to 85 × 0.01
Base rate = 0.425 to 0.85 kg/week

Gender adjustment (Male): × 1.0 (no change)
Female: × 0.85

Safe Range: 0.4 - 0.9 kg/week
Recommended: 0.6 kg/week (middle of range)

Weekly Calorie Deficit = 0.6 × 7700 = 4620 kcal
Daily Deficit = 4620 / 7 = 660 kcal/day
```

**Validation Checks**:

- [ ] Weekly rate: 0.4 - 0.9 kg
- [ ] Recommended: 0.6 kg/week
- [ ] Daily deficit: 660 kcal
- [ ] Caps applied: 0.3 kg min, 1.2 kg max

---

### Scenario 9: Protein Requirements (Muscle Gain)

**Input Data**:

```json
{
  "weight": 75,
  "fitnessGoal": "muscle_gain",
  "experienceLevel": "intermediate"
}
```

**Expected Results**:

```
Muscle Gain Protein: 1.6-2.2g per kg bodyweight

Lower bound = 75 × 1.6 = 120g
Upper bound = 75 × 2.2 = 165g

Recommended: 75 × 2.0 = 150g protein/day
```

**Protein Targets by Goal**:

- Weight loss: 2.0-2.4 g/kg (preserve muscle)
- Muscle gain: 1.6-2.2 g/kg
- Maintenance: 0.8-1.2 g/kg
- Endurance: 1.2-1.6 g/kg

**Validation Checks**:

- [ ] Protein range: 120-165g
- [ ] Recommended: 150g
- [ ] Goal-specific multiplier applied

---

### Scenario 10: Daily Water Intake

**Input Data**:

```json
{
  "weight": 70,
  "climate": "tropical",
  "activityLevel": "moderate"
}
```

**Expected Results**:

```
Base = 35 ml × weight
Base = 35 × 70 = 2450 ml

Climate adjustment (Tropical): +10 ml/kg
Climate = 10 × 70 = +700 ml

Activity adjustment (Moderate): +10 ml/kg
Activity = 10 × 70 = +700 ml

Total = 2450 + 700 + 700 = 3850 ml
Total = 3.85 liters/day
```

**Validation Checks**:

- [ ] Base water: 2.45 L
- [ ] Climate adjustment: +0.7 L
- [ ] Activity adjustment: +0.7 L
- [ ] Total: 3.85 L
- [ ] Rounded to 2 decimal places

---

### Scenario 11: Waist-Hip Ratio (WHR)

**Input Data**:

```json
{
  "waist": 85, // cm
  "hip": 100, // cm
  "gender": "female"
}
```

**Expected Results**:

```
WHR = waist / hip
WHR = 85 / 100
WHR = 0.85

Thresholds (Female):
- Low risk: < 0.80
- Moderate risk: 0.80-0.85
- High risk: > 0.85

Result: High Risk (borderline)
```

**Male Thresholds**:

- Low risk: < 0.90
- Moderate risk: 0.90-0.99
- High risk: ≥ 1.0

**Validation Checks**:

- [ ] WHR: 0.85
- [ ] Risk category: High (female)
- [ ] Gender-specific thresholds applied
- [ ] Health warning displayed

---

### Scenario 12: Pregnancy Calorie Adjustments

**Input Data**:

```json
{
  "tdee": 2000,
  "pregnancyStatus": true,
  "pregnancyTrimester": 2
}
```

**Expected Results**:

```
Trimester Adjustments:
- 1st Trimester: +0 kcal
- 2nd Trimester: +340 kcal
- 3rd Trimester: +450 kcal

Adjusted Calories = 2000 + 340 = 2340 kcal/day
```

**Breastfeeding**:

```json
{
  "tdee": 2000,
  "breastfeedingStatus": true
}
```

**Adjustment**: +500 kcal/day

**Validation Checks**:

- [ ] Trimester-specific adjustment applied
- [ ] 2nd tri: +340 kcal
- [ ] Breastfeeding: +500 kcal
- [ ] Safety warnings displayed
- [ ] No extreme diets recommended

---

### Scenario 13: Macronutrient Split (Keto Diet)

**Input Data**:

```json
{
  "dailyCalories": 2000,
  "dietType": "keto"
}
```

**Expected Results**:

```
Keto Split:
- Protein: 25% = 500 kcal / 4 = 125g
- Carbs: 5% = 100 kcal / 4 = 25g
- Fat: 70% = 1400 kcal / 9 = 156g

Total: 125g protein, 25g carbs, 156g fat
```

**Standard Split**:

- Protein: 25% → 125g
- Carbs: 45% → 225g
- Fat: 30% → 67g

**High Protein**:

- Protein: 35% → 175g
- Carbs: 35% → 175g
- Fat: 30% → 67g

**Validation Checks**:

- [ ] Correct split applied for diet type
- [ ] Protein in grams (kcal / 4)
- [ ] Carbs in grams (kcal / 4)
- [ ] Fat in grams (kcal / 9)
- [ ] Totals sum to daily calories ±5%

---

### Scenario 14: Overall Health Score

**Input Data**:

```json
{
  "bmi": 23, // Normal
  "activityLevel": "active", // 5+ workouts/week
  "sleepHours": 8, // Adequate
  "stressLevel": "low",
  "dietQuality": "good", // 10/14 healthy habits
  "smokingStatus": false,
  "alcoholConsumption": "moderate"
}
```

**Expected Results**:

```
Score Components:
- BMI Status: +20 (normal weight)
- Activity Level: +25 (very active)
- Sleep Quality: +20 (8 hours)
- Stress Management: +15 (low stress)
- Diet Habits: +15 (10/14 = 71%)
- No Smoking: +5
- Alcohol Moderate: 0 (neutral)

Total: 100 / 100
Health Score: 100 (Excellent)
```

**Validation Checks**:

- [ ] All components weighted correctly
- [ ] Score range: 0-100
- [ ] Category assigned (Poor/Fair/Good/Excellent)
- [ ] Recommendations generated

---

### Scenario 15: Metabolic Age

**Input Data**:

```json
{
  "actualAge": 40,
  "actualBMR": 1600,
  "expectedBMR": 1700 // For 40-year-old average
}
```

**Expected Results**:

```
BMR Difference = 1600 - 1700 = -100 kcal
Cal per year decline ≈ 5 kcal/year

Metabolic Age = 40 + (-100 / -5)
Metabolic Age = 40 + 20
Metabolic Age = 60 years

Interpretation: Metabolism is 20 years older than chronological age
```

**Validation Checks**:

- [ ] Metabolic age calculated
- [ ] Comparison to chronological age
- [ ] Warning if metabolic age \u003e\u003e actual age
- [ ] Recommendations to improve

---

## Progress Tracking Testing

### Scenario 16: Weekly Progress Entry

**Input Data**:

```json
{
  "userId": "test-user-1",
  "entryDate": "2025-01-21",
  "weight": 76.5, // Previous: 78.0 kg
  "bodyFatPercentage": 16.5, // Previous: 17.0%
  "measurements": {
    "chest": 100, // Previous: 101 cm
    "waist": 84, // Previous: 86 cm
    "hips": 98, // Previous: 99 cm
    "bicep": 36, // Previous: 35 cm
    "thigh": 58 // Previous: 59 cm
  }
}
```

**Expected Results**:

```
Changes (1 week):
- Weight: -1.5 kg (-1.92%)
- Body Fat: -0.5%
- Chest: -1 cm
- Waist: -2 cm (significant!)
- Hips: -1 cm
- Bicep: +1 cm (muscle gain!)
- Thigh: -1 cm

Trends:
✅ Weight loss on track
✅ Fat loss good
✅ Muscle preservation (bicep up)
⚠️ Rapid weight loss (review calorie intake)
```

**Validation Checks**:

- [ ] Entry saved to `progress_entries` table
- [ ] Change calculations accurate
- [ ] Percentage changes correct
- [ ] Trend analysis appropriate
- [ ] Alerts for rapid changes

---

### Scenario 17: Goal Progress Tracking

**Input Data**:

```json
{
  "currentWeight": 76.5,
  "targetWeight": 70,
  "startWeight": 82,
  "startDate": "2025-01-01",
  "targetDate": "2025-04-01"
}
```

**Expected Results**:

```
Total to lose: 82 - 70 = 12 kg
Progress so far: 82 - 76.5 = 5.5 kg lost
Remaining: 76.5 - 70 = 6.5 kg

Progress: 5.5 / 12 = 45.8% complete

Days elapsed: 20
Days remaining: ~69 (to April 1)
Time progress: 20 / 89 = 22.5%

Pace: Ahead of schedule (45.8% done, only 22.5% time elapsed)

Rate: 5.5 kg / 20 days = 0.275 kg/day = 1.93 kg/week
Warning: Rate too high (>1.2 kg/week recommended max)
```

**Validation Checks**:

- [ ] Progress percentage: 45.8%
- [ ] Pace analysis: Ahead
- [ ] Rate warning: Too fast
- [ ] Recommendation: Increase calories slightly
- [ ] ETA updated

---

## Data Flow Validation

### Onboarding Flow

```
USER ENTERS BODY MEASUREMENTS (BodyAnalysisTab.tsx)
  ↓
height, weight, target weight, body fat %, measurements
  ↓
CALCULATE METRICS (healthCalculations.ts)
  ├─ calculateBMI(height, weight)
  ├─ calculateBMR(age, gender, weight, height, bodyFat)
  ├─ calculateTDEE(bmr, occupation, activityLevel)
  ├─ estimateBodyFat(bmi, age, gender) [if not provided]
  ├─ calculateIdealWeight(height, gender)
  ├─ calculateWHR(waist, hip)
  └─ calculateHealthyWeightLossRate(weight, gender)
  ↓
SAVE TO DATABASE (onboardingService.ts)
  ├─ body_analysis table (raw measurements)
  ├─ advanced_review table (calculated metrics)
  └─ progress_entries table (baseline entry)
  ↓
DISPLAY RESULTS (AdvancedReviewTab.tsx)
  ├─ Metabolic profile cards
  ├─ Health scores
  ├─ Validation warnings
  └─ Goal feasibility analysis
```

### Progress Update Flow

```
USER ADDS PROGRESS ENTRY (ProgressScreen.tsx)
  ↓
BodyMeasurementsEditModal opens
  ↓
User enters: weight, body fat %, measurements
  ↓
REAL-TIME CALCULATIONS
  ├─ BMI updates
  ├─ Change from previous entry
  ├─ Goal progress percentage
  └─ Trend analysis
  ↓
SAVE TO DATABASE (progressDataService.ts)
  ├─ progress_entries table (new entry)
  ├─ body_analysis table (update current values)
  └─ progress_goals table (update if achieved)
  ↓
TRACK B SYNC (local-first)
  ├─ Save to SQLite locally
  ├─ Queue sync to Supabase
  └─ Conflict resolution
  ↓
UI UPDATE (ProgressScreen.tsx)
  ├─ Stats dashboard refreshes
  ├─ Charts update with new data point
  ├─ Achievement badges (if goals met)
  └─ Analytics insights generated
```

---

## UI Testing Checklist

### BodyAnalysisTab (Onboarding)

- [ ] Height input (100-250 cm)
- [ ] Weight input (30-300 kg)
- [ ] Target weight input
- [ ] Body fat % input (optional)
- [ ] Photo upload (front/side/back)
- [ ] AI body analysis trigger
- [ ] Real-time BMI calculation
- [ ] Ideal weight range display
- [ ] Validation errors shown

### AdvancedReviewTab

- [ ] BMI card with category
- [ ] BMR card with formula name
- [ ] TDEE card with activity breakdown
- [ ] Metabolic age card
- [ ] Health scores (4 categories)
- [ ] Weight projection chart
- [ ] Macros breakdown
- [ ] Validation warnings

### ProgressScreen

- [ ] Current stats (weight, BF%, muscle)
- [ ] Weekly change indicators (+/- with arrows)
- [ ] Progress bars (goal completion)
- [ ] Body measurement display
- [ ] Charts (weight, BF%, measurements over time)
- [ ] Achievement badges
- [ ] "Add Progress Entry" button

### BodyMeasurementsEditModal

- [ ] All measurement inputs
- [ ] Real-time BMI update
- [ ] BMI category badge
- [ ] Color-coded status
- [ ] Save button
- [ ] Cancel button
- [ ] Validation messages

---

## Performance Benchmarks

| Calculation          | Target Time  | Critical     |
| -------------------- | ------------ | ------------ |
| BMI                  | \u003c 1ms   | \u003c 10ms  |
| BMR (All 4 formulas) | \u003c 5ms   | \u003c 20ms  |
| TDEE                 | \u003c 2ms   | \u003c 10ms  |
| Health Score         | \u003c 10ms  | \u003c 50ms  |
| All Metrics (30+)    | \u003c 50ms  | \u003c 200ms |
| Progress Stats       | \u003c 100ms | \u003c 500ms |
| Database Save        | \u003c 1s    | \u003c 5s    |

---

## Test Data Files Needed

Create in `test-data/body-analysis/`:

1. `male-standard-adult.json` - 30yo male, 75kg, 175cm
2. `female-asian-ethnicity.json` - 35yo female, Asian, 60kg, 160cm
3. `athlete-low-bodyfat.json` - 25yo male, 12% BF, muscular
4. `senior-65plus.json` - 68yo male, health conditions
5. `pregnancy-second-tri.json` - 28yo female, pregnant
6. `weight-loss-journey.json` - Progress entries (12 weeks)
7. `muscle-gain-journey.json` - Progress entries (16 weeks)
8. `extreme-values.json` - Edge cases (min/max weights, heights)

---

## Test Execution Log

| Test ID  | Status     | Date | Notes                 |
| -------- | ---------- | ---- | --------------------- |
| BODY-001 | ⏳ Pending |      | BMI calculation       |
| BODY-002 | ⏳ Pending |      | Asian ethnicity BMI   |
| BODY-003 | ⏳ Pending |      | BMR (Mifflin-St Jeor) |
| BODY-004 | ⏳ Pending |      | BMR (Katch-McArdle)   |
| BODY-005 | ⏳ Pending |      | TDEE calculation      |
| BODY-006 | ⏳ Pending |      | Body fat estimation   |
| BODY-007 | ⏳ Pending |      | Ideal weight range    |
| BODY-008 | ⏳ Pending |      | Weight loss rate      |
| BODY-009 | ⏳ Pending |      | Protein requirements  |
| BODY-010 | ⏳ Pending |      | Water intake          |
| BODY-011 | ⏳ Pending |      | Waist-hip ratio       |
| BODY-012 | ⏳ Pending |      | Pregnancy adjustments |
| BODY-013 | ⏳ Pending |      | Macro split           |
| BODY-014 | ⏳ Pending |      | Health score          |
| BODY-015 | ⏳ Pending |      | Metabolic age         |
| BODY-016 | ⏳ Pending |      | Progress tracking     |
| BODY-017 | ⏳ Pending |      | Goal tracking         |

---

## Success Criteria

- [ ] All 25+ calculations accurate to 2 decimal places
- [ ] All 4 BMR formulas implemented correctly
- [ ] Ethnicity-specific BMI thresholds working
- [ ] Progress tracking saves and displays correctly
- [ ] Goal completion calculations accurate
- [ ] Database persistence verified
- [ ] UI displays all metrics properly
- [ ] Real-time updates working
- [ ] Offline support (AsyncStorage) functional
- [ ] Track B sync working
