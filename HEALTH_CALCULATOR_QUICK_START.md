# Universal Health System - Quick Start Guide

## 30-Second Integration

```typescript
import { HealthCalculatorFacade } from '@/utils/healthCalculations/HealthCalculatorFacade';

// Build user profile from onboarding data
const userProfile = {
  age: 30,
  gender: 'male',
  weight: 70,      // kg
  height: 175,     // cm
  country: 'IN',
  activityLevel: 'moderate',
  dietType: 'vegetarian',
  goal: 'muscle_gain',
};

// ONE CALL CALCULATES EVERYTHING
const metrics = HealthCalculatorFacade.calculateAllMetrics(userProfile);

// Use the results
console.log(`Daily Calories: ${metrics.dailyCalories}`);
console.log(`Protein: ${metrics.protein}g`);
console.log(`Water: ${(metrics.waterIntakeML / 1000).toFixed(1)}L`);
console.log(`BMI Category: ${metrics.bmiClassification.category}`);
console.log(`Health Grade: ${metrics.healthScore?.grade}`);
```

## What You Get

### Core Metrics (Always Calculated)
- `bmr` - Basal Metabolic Rate (calories/day)
- `bmi` - Body Mass Index
- `bmiClassification` - Category, health risk, ethnicity-specific
- `tdee` - Total Daily Energy Expenditure
- `dailyCalories` - Target calories (same as TDEE)
- `waterIntakeML` - Daily water target (ml)
- `protein`, `carbs`, `fat` - Daily macro targets (grams)

### Auto-Detected Context
- `climate` - tropical/temperate/cold/arid (from country)
- `ethnicity` - asian/caucasian/black_african/etc. (for BMI cutoffs)
- `bmrFormula` - which formula was used
- `bmrAccuracy` - ±5% or ±10%
- `bmrConfidence` - 0-100 confidence score

### Advanced Metrics (Optional - if data available)
- `heartRateZones` - Fat burn, cardio, peak zones (needs resting HR)
- `vo2max` - VO2 max estimate + classification (needs resting HR)
- `healthScore` - Overall score 0-100 + letter grade
- `muscleGainLimits` - Max monthly gain rate (for muscle_gain goal)

## Common Use Cases

### 1. Save to Database (Onboarding)

```typescript
import { AdvancedReviewService } from '@/services/onboardingService';

const metrics = await AdvancedReviewService.calculateAndSave(
  userId,
  personalInfo,
  bodyAnalysis,
  workoutPreferences,
  dietPreferences
);

// Automatically saved to advanced_review table
```

### 2. Load from Database (Main App)

```typescript
import { userMetricsService } from '@/services/userMetricsService';

const metrics = await userMetricsService.loadUserMetrics(userId);
const quick = userMetricsService.getQuickMetrics(metrics);

// Access all fields
console.log(quick.daily_calories);
console.log(quick.bmi_category);
console.log(quick.health_grade);
console.log(quick.detected_climate);
```

### 3. Validate Goals

```typescript
const goal = {
  type: 'fat_loss',
  targetWeight: 65,
  timelineWeeks: 12,
};

const validation = HealthCalculatorFacade.validateGoal(userProfile, goal);

if (!validation.valid) {
  console.log(validation.message);
  console.log(`Suggested timeline: ${validation.adjustedTimeline} weeks`);
}
```

### 4. Recalculate After Update

```typescript
// User lost 5kg
const updatedProfile = { ...userProfile, weight: 65 };

const newMetrics = HealthCalculatorFacade.recalculateMetrics(updatedProfile);

// All metrics updated automatically
```

## UserProfile Fields

### Required
- `age` - User age in years
- `gender` - 'male' | 'female' | 'other' | 'prefer_not_to_say'
- `weight` - Weight in kg
- `height` - Height in cm
- `country` - Country code (e.g., 'IN', 'US')

### Optional (but recommended)
- `state` - State/region for better climate detection
- `activityLevel` - 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
- `dietType` - 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'low_carb'
- `goal` - 'fat_loss' | 'muscle_gain' | 'maintenance' | 'recomp'

### Advanced (enhances accuracy)
- `bodyFat` - Body fat percentage (triggers more accurate BMR formula)
- `fitnessLevel` - 'beginner' | 'intermediate' | 'advanced' | 'elite'
- `trainingYears` - Years of training experience
- `restingHR` - Resting heart rate (enables HR zones & VO2 max)

## What Gets Auto-Adjusted

### Climate Adjustments
| Climate | TDEE Modifier | Water Bonus |
|---------|---------------|-------------|
| Tropical | +5% | +10ml/kg |
| Temperate | 0% | 0 |
| Cold | +10% | 0 |
| Arid | +3% | +8ml/kg |

### Diet Adjustments
| Diet Type | Protein Boost | Reason |
|-----------|---------------|--------|
| Vegetarian | +15% | Plant protein bioavailability |
| Vegan | +20% | Plant protein bioavailability |
| Others | 0% | - |

### Population-Specific BMI
| Ethnicity | Overweight | Obese | Source |
|-----------|------------|-------|--------|
| Asian | 23 | 27.5 | WHO Asian cutoffs |
| Caucasian | 25 | 30 | WHO standard |
| Black African | 25 | 30 | Adjusted for body composition |
| Hispanic | 25 | 30 | Standard with notes |

## Database Columns (advanced_review table)

All these are automatically populated:

```sql
-- Core calculations
calculated_bmr         DECIMAL(7,2)
calculated_bmi         DECIMAL(4,2)
calculated_tdee        DECIMAL(7,2)
daily_calories         INTEGER
daily_water_ml         INTEGER
daily_protein_g        INTEGER
daily_carbs_g          INTEGER
daily_fat_g            INTEGER

-- NEW: Classification & Context
bmi_category           VARCHAR(50)   -- "Normal", "Overweight", etc.
bmi_health_risk        VARCHAR(20)   -- "low", "moderate", "high"
detected_climate       VARCHAR(20)   -- "tropical", "temperate", etc.
detected_ethnicity     VARCHAR(20)   -- "asian", "caucasian", etc.
bmr_formula_used       VARCHAR(50)   -- "mifflin_st_jeor", etc.
bmr_formula_accuracy   VARCHAR(50)   -- "±5%", "±10%"
bmr_formula_confidence INTEGER       -- 0-100

-- NEW: Advanced Metrics
heart_rate_zones       JSONB         -- { resting, fatBurn, cardio, peak }
vo2_max_estimate       DECIMAL(4,1)  -- ml/kg/min
vo2_max_classification VARCHAR(50)   -- "Poor", "Fair", "Good", etc.
health_score           INTEGER       -- 0-100
health_grade           VARCHAR(20)   -- "A+", "B", "C", etc.

-- Metadata
calculations_version   VARCHAR(50)   -- "4.0.0"
```

## Troubleshooting

### "activityLevel is not defined"
```typescript
// BAD - missing optional field uses undefined
const profile = { age, gender, weight, height, country };

// GOOD - facade handles undefined gracefully, uses 'moderate' default
const metrics = HealthCalculatorFacade.calculateAllMetrics(profile);
```

### "Advanced metrics are null"
```typescript
// Normal! Advanced metrics need resting HR
const profile = {
  age: 30, gender: 'male', weight: 70, height: 175, country: 'IN'
  // No restingHR → heartRateZones will be null
};

// To get advanced metrics, add:
const profileWithHR = { ...profile, restingHR: 65 };
// Now heartRateZones and vo2max will be calculated
```

### "Import error"
```typescript
// WRONG
import { HealthCalculatorFacade } from '@/utils/healthCalculations';

// CORRECT
import { HealthCalculatorFacade } from '@/utils/healthCalculations/HealthCalculatorFacade';

// OR use the barrel export
import { HealthCalculatorFacade } from '@/utils/healthCalculations';
// (if index.ts exports it - which it does!)
```

## Example: Full Onboarding Integration

```typescript
// In AdvancedReviewTab.tsx or OnboardingContainer.tsx
import { AdvancedReviewService } from '@/services/onboardingService';

const handleComplete = async () => {
  try {
    // Calculate and save all metrics
    const metrics = await AdvancedReviewService.calculateAndSave(
      userId,
      personalInfo,
      bodyAnalysis,
      workoutPreferences,
      dietPreferences
    );

    if (!metrics) {
      throw new Error('Failed to calculate health metrics');
    }

    // Show success message with metrics
    alert(`
      Your personalized health plan:
      - Daily Calories: ${metrics.daily_calories}
      - Protein: ${metrics.daily_protein_g}g
      - Water: ${(metrics.daily_water_ml! / 1000).toFixed(1)}L
      - BMI Category: ${metrics.bmi_category}
      - Health Grade: ${metrics.health_grade}
    `);

    // Navigate to main app
    navigation.navigate('Main');
  } catch (error) {
    console.error('Onboarding completion error:', error);
    // Handle error
  }
};
```

## That's It!

You now have world-class health calculations with:
- ✅ One method call
- ✅ Auto-detection of context
- ✅ Population-specific accuracy
- ✅ Climate adjustments
- ✅ Scientific validation
- ✅ Complete transparency

**Happy calculating!** 🎯
