# User Metrics Quick Reference Card

**Purpose:** Quick copy-paste examples for using user metrics in FitAI

---

## IMPORT STATEMENTS

```typescript
// In any React component
import { useUserMetrics } from '../hooks/useUserMetrics';

// In services/utilities
import { userMetricsService } from '../services/userMetricsService';
```

---

## BASIC USAGE IN COMPONENTS

```typescript
function MyScreen() {
  const { quickMetrics, isLoading, error } = useUserMetrics();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <View>
      <Text>Daily Calories: {quickMetrics?.daily_calories || 'N/A'}</Text>
    </View>
  );
}
```

---

## AVAILABLE QUICK METRICS

```typescript
const {
  // Basic Info
  age,                      // number | null
  gender,                   // string | null

  // Body Metrics
  height_cm,                // number | null
  current_weight_kg,        // number | null
  target_weight_kg,         // number | null
  bmi,                      // number | null
  bmr,                      // number | null

  // Daily Targets ⭐ MOST IMPORTANT
  daily_calories,           // number | null
  daily_protein_g,          // number | null
  daily_carbs_g,            // number | null
  daily_fat_g,              // number | null
  daily_water_ml,           // number | null

  // Goals
  weekly_weight_loss_rate,  // number | null
  estimated_timeline_weeks, // number | null
  primary_goals,            // string[] | null

  // Calculated
  tdee,                     // number | null
  ideal_weight_min,         // number | null
  ideal_weight_max,         // number | null
} = quickMetrics || {};
```

---

## DISPLAY EXAMPLES

### Daily Calorie Target
```typescript
const dailyCalories = quickMetrics?.daily_calories;

<Text>Target: {dailyCalories ? `${dailyCalories} cal` : 'Not set'}</Text>
```

### Macro Targets
```typescript
const protein = quickMetrics?.daily_protein_g;
const carbs = quickMetrics?.daily_carbs_g;
const fat = quickMetrics?.daily_fat_g;

<MacroDashboard
  targetProtein={protein || 0}
  targetCarbs={carbs || 0}
  targetFat={fat || 0}
/>
```

### BMI Display
```typescript
const bmi = quickMetrics?.bmi;

{bmi && (
  <Text>
    BMI: {bmi.toFixed(1)} ({getBMICategory(bmi)})
  </Text>
)}
```

### Ideal Weight Range
```typescript
const min = quickMetrics?.ideal_weight_min;
const max = quickMetrics?.ideal_weight_max;

{min && max && (
  <Text>
    Ideal Weight: {min.toFixed(1)} - {max.toFixed(1)} kg
  </Text>
)}
```

---

## ACCESSING FULL METRICS

```typescript
const { metrics } = useUserMetrics();

// Access advanced_review metrics
const heartRateZones = {
  fatBurn: {
    min: metrics?.advancedReview?.target_hr_fat_burn_min,
    max: metrics?.advancedReview?.target_hr_fat_burn_max,
  },
  cardio: {
    min: metrics?.advancedReview?.target_hr_cardio_min,
    max: metrics?.advancedReview?.target_hr_cardio_max,
  },
  peak: {
    min: metrics?.advancedReview?.target_hr_peak_min,
    max: metrics?.advancedReview?.target_hr_peak_max,
  },
};

// Access diet preferences
const dietType = metrics?.dietPreferences?.diet_type;
const allergies = metrics?.dietPreferences?.allergies;

// Access workout preferences
const equipment = metrics?.workoutPreferences?.equipment;
const location = metrics?.workoutPreferences?.location;
```

---

## REFRESH AFTER UPDATES

```typescript
const { refresh } = useUserMetrics();

async function handleProfileUpdate(newData) {
  // Save to database
  await updateProfile(newData);

  // Refresh metrics cache
  await refresh(true); // true = force refresh
}
```

---

## AI GENERATION USAGE

### Diet Generation
```typescript
import { useDietGenerationParams } from '../hooks/useUserMetrics';

function MealPlanGenerator() {
  const dietParams = useDietGenerationParams();

  async function generatePlan() {
    if (!dietParams) {
      alert('Please complete your profile first');
      return;
    }

    const mealPlan = await generateMealPlan({
      dailyCalories: dietParams.dailyCalories,   // ✅ Exact target
      protein: dietParams.protein,                // ✅ Exact target
      carbs: dietParams.carbs,                    // ✅ Exact target
      fat: dietParams.fat,                        // ✅ Exact target
      dietType: dietParams.dietType,
      allergies: dietParams.allergies,
      mealsEnabled: dietParams.mealsEnabled,
    });
  }
}
```

### Workout Generation
```typescript
import { useWorkoutGenerationParams } from '../hooks/useUserMetrics';

function WorkoutPlanGenerator() {
  const workoutParams = useWorkoutGenerationParams();

  async function generatePlan() {
    if (!workoutParams) {
      alert('Please complete your profile first');
      return;
    }

    const workoutPlan = await generateWorkoutPlan({
      tdee: workoutParams.tdee,                   // ✅ Exact TDEE
      bmr: workoutParams.bmr,                     // ✅ Exact BMR
      currentWeight: workoutParams.currentWeight,
      targetWeight: workoutParams.targetWeight,
      goals: workoutParams.primaryGoals,
      equipment: workoutParams.equipment,
      fitnessLevel: workoutParams.fitnessLevel,
    });
  }
}
```

---

## NON-REACT USAGE (Services)

```typescript
import { userMetricsService } from '../services/userMetricsService';

async function someBackgroundTask(userId: string) {
  // Load metrics
  const metrics = await userMetricsService.loadUserMetrics(userId);

  // Get quick metrics
  const quick = userMetricsService.getQuickMetrics(metrics);

  // Use values
  const dailyCalories = quick.daily_calories;
  const protein = quick.daily_protein_g;

  // ... do something with values
}
```

---

## ERROR HANDLING PATTERNS

### Loading State
```typescript
const { isLoading } = useUserMetrics();

if (isLoading) {
  return <SkeletonLoader />;
}
```

### Error State
```typescript
const { error } = useUserMetrics();

if (error) {
  return (
    <ErrorCard
      title="Unable to load profile"
      message={error.message}
      onRetry={() => refresh(true)}
    />
  );
}
```

### Missing Data
```typescript
const { hasCalculatedMetrics } = useUserMetrics();

if (!hasCalculatedMetrics) {
  return (
    <EmptyState
      title="Complete Your Profile"
      message="Finish the onboarding to see your personalized metrics"
      actionText="Continue Setup"
      onAction={() => navigation.navigate('Onboarding')}
    />
  );
}
```

### Specific Value Missing
```typescript
const dailyCalories = quickMetrics?.daily_calories;

if (!dailyCalories) {
  console.error('Daily calories not calculated');
  return <ErrorScreen message="Please complete your health assessment" />;
}

// Safe to use dailyCalories here
```

---

## CONDITIONAL RENDERING

```typescript
const { quickMetrics } = useUserMetrics();

return (
  <ScrollView>
    {/* Only show if BMI is calculated */}
    {quickMetrics?.bmi && (
      <BMICard bmi={quickMetrics.bmi} />
    )}

    {/* Only show if targets are set */}
    {quickMetrics?.daily_calories && (
      <CalorieTargetCard target={quickMetrics.daily_calories} />
    )}

    {/* Only show if ideal weight calculated */}
    {quickMetrics?.ideal_weight_min && quickMetrics?.ideal_weight_max && (
      <IdealWeightCard
        min={quickMetrics.ideal_weight_min}
        max={quickMetrics.ideal_weight_max}
      />
    )}
  </ScrollView>
);
```

---

## CACHE MANAGEMENT

### Clear Cache After Profile Update
```typescript
import { userMetricsService } from '../services/userMetricsService';

async function updateUserProfile(userId: string, updates: any) {
  // Save to database
  await BodyAnalysisService.save(userId, updates);

  // Clear cache
  userMetricsService.clearCache();

  // UI will reload fresh data automatically
}
```

### Manual Refresh
```typescript
const { refresh } = useUserMetrics();

// Force refresh (bypasses cache)
await refresh(true);

// Normal refresh (uses cache if valid)
await refresh(false);
```

---

## COMMON MISTAKES TO AVOID ❌

### ❌ Don't Use Hardcoded Defaults
```typescript
// ❌ WRONG
const dailyCalories = 2000;
const protein = 150;

// ✅ RIGHT
const dailyCalories = quickMetrics?.daily_calories || null;
const protein = quickMetrics?.daily_protein_g || null;

if (!dailyCalories) {
  // Show error or onboarding prompt
}
```

### ❌ Don't Recalculate What's in Database
```typescript
// ❌ WRONG
const bmi = weight / (height * height);

// ✅ RIGHT
const bmi = quickMetrics?.bmi;
```

### ❌ Don't Forget Loading State
```typescript
// ❌ WRONG
const { quickMetrics } = useUserMetrics();
return <Text>{quickMetrics.daily_calories}</Text>; // Will crash if loading

// ✅ RIGHT
const { quickMetrics, isLoading } = useUserMetrics();
if (isLoading) return <Spinner />;
return <Text>{quickMetrics?.daily_calories || 'N/A'}</Text>;
```

---

## BEST PRACTICES ✅

1. **Always check loading state** before rendering data
2. **Always handle null values** with optional chaining (`?.`)
3. **Never use fallback values** for critical metrics (calories, macros)
4. **Show errors meaningfully** - tell user what to do
5. **Clear cache** after profile updates
6. **Use quickMetrics** for common values, full `metrics` for advanced data

---

## TYPESCRIPT TYPES

```typescript
import {
  UserMetrics,
  QuickMetrics,
} from '../services/userMetricsService';

import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from '../types/onboarding';
```

---

## CHEAT SHEET

| Need | Use This |
|------|----------|
| Daily calorie target | `quickMetrics?.daily_calories` |
| Protein target (g) | `quickMetrics?.daily_protein_g` |
| Carbs target (g) | `quickMetrics?.daily_carbs_g` |
| Fat target (g) | `quickMetrics?.daily_fat_g` |
| Water target (ml) | `quickMetrics?.daily_water_ml` |
| BMI | `quickMetrics?.bmi` |
| BMR | `quickMetrics?.bmr` |
| TDEE | `quickMetrics?.tdee` |
| Ideal weight range | `quickMetrics?.ideal_weight_min` & `max` |
| Current weight | `quickMetrics?.current_weight_kg` |
| Target weight | `quickMetrics?.target_weight_kg` |
| Diet type | `metrics?.dietPreferences?.diet_type` |
| Allergies | `metrics?.dietPreferences?.allergies` |
| Equipment | `metrics?.workoutPreferences?.equipment` |
| Heart rate zones | `metrics?.advancedReview?.target_hr_*` |

---

**Quick Reference Version:** 1.0
**Created:** 2025-12-30
**For:** FitAI User Metrics Integration
