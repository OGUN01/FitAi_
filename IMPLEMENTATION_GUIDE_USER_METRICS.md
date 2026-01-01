# User Metrics Implementation Guide

**Purpose:** Guide for integrating calculated health metrics throughout the FitAI app

**Created:** 2025-12-30

---

## NEW FILES CREATED

1. ✅ `src/services/userMetricsService.ts` - Service for loading all user metrics
2. ✅ `src/hooks/useUserMetrics.ts` - React hook for accessing metrics in components
3. ✅ `HEALTH_CALCULATIONS_FIX_REPORT.md` - Comprehensive analysis report

---

## PHASE 1: UPDATE MAIN APP SCREENS

### HomeScreen.tsx

**Location:** `src/screens/main/HomeScreen.tsx`

**Current:** May not be loading calculated metrics

**Update Required:**

```typescript
import { useUserMetrics } from '../../hooks/useUserMetrics';

export function HomeScreen() {
  const { quickMetrics, isLoading, error } = useUserMetrics();

  // Use calculated values instead of defaults
  const dailyCalorieTarget = quickMetrics?.daily_calories || 2000; // Show 2000 only if not loaded
  const waterTarget = quickMetrics?.daily_water_ml || 2000;

  // Show loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show error state
  if (error) {
    return <ErrorScreen error={error} />;
  }

  // Display metrics
  return (
    <View>
      <Text>Daily Calorie Target: {dailyCalorieTarget} cal</Text>
      <Text>Water Target: {waterTarget} ml</Text>
      {/* Rest of your HomeScreen UI */}
    </View>
  );
}
```

---

### ProfileScreen.tsx

**Location:** `src/screens/main/ProfileScreen.tsx`

**Current:** May not be loading BMI, ideal weight range

**Update Required:**

```typescript
import { useUserMetrics } from '../../hooks/useUserMetrics';

export function ProfileScreen() {
  const { quickMetrics, isLoading } = useUserMetrics();

  // Use loaded values
  const bmi = quickMetrics?.bmi;
  const idealWeightMin = quickMetrics?.ideal_weight_min;
  const idealWeightMax = quickMetrics?.ideal_weight_max;
  const currentWeight = quickMetrics?.current_weight_kg;

  return (
    <View>
      {bmi && (
        <Card>
          <Text>BMI: {bmi.toFixed(1)}</Text>
          <Text>Category: {getBMICategory(bmi)}</Text>
        </Card>
      )}

      {idealWeightMin && idealWeightMax && (
        <Card>
          <Text>Ideal Weight Range: {idealWeightMin.toFixed(1)} - {idealWeightMax.toFixed(1)} kg</Text>
        </Card>
      )}

      {/* Rest of profile UI */}
    </View>
  );
}
```

---

### DietScreen.tsx

**Location:** `src/screens/main/DietScreen.tsx`

**Current:** May not be showing macro targets

**Update Required:**

```typescript
import { useUserMetrics } from '../../hooks/useUserMetrics';

export function DietScreen() {
  const { quickMetrics, isLoading } = useUserMetrics();

  // Use loaded macro targets
  const dailyCalories = quickMetrics?.daily_calories;
  const dailyProtein = quickMetrics?.daily_protein_g;
  const dailyCarbs = quickMetrics?.daily_carbs_g;
  const dailyFat = quickMetrics?.daily_fat_g;

  return (
    <View>
      <MacroDashboard
        targetCalories={dailyCalories || 0}
        targetProtein={dailyProtein || 0}
        targetCarbs={dailyCarbs || 0}
        targetFat={dailyFat || 0}
      />
      {/* Rest of diet screen */}
    </View>
  );
}
```

---

### FitnessScreen.tsx

**Location:** `src/screens/main/FitnessScreen.tsx`

**Current:** May not be showing TDEE, heart rate zones

**Update Required:**

```typescript
import { useUserMetrics } from '../../hooks/useUserMetrics';

export function FitnessScreen() {
  const { metrics, quickMetrics, isLoading } = useUserMetrics();

  // Use loaded values
  const tdee = quickMetrics?.tdee;
  const primaryGoals = quickMetrics?.primary_goals;

  // Access heart rate zones from full metrics
  const heartRateZones = metrics?.advancedReview
    ? {
        fatBurn: {
          min: metrics.advancedReview.target_hr_fat_burn_min,
          max: metrics.advancedReview.target_hr_fat_burn_max,
        },
        cardio: {
          min: metrics.advancedReview.target_hr_cardio_min,
          max: metrics.advancedReview.target_hr_cardio_max,
        },
        peak: {
          min: metrics.advancedReview.target_hr_peak_min,
          max: metrics.advancedReview.target_hr_peak_max,
        },
      }
    : null;

  return (
    <View>
      {tdee && <Text>Your TDEE: {tdee} cal/day</Text>}
      {heartRateZones && <HeartRateZonesDisplay zones={heartRateZones} />}
      {/* Rest of fitness screen */}
    </View>
  );
}
```

---

## PHASE 2: UPDATE AI GENERATION

### Diet Generation (Cloudflare Worker)

**Location:** `fitai-workers/src/handlers/dietGeneration.ts`

**Current:** May be using defaults or recalculating

**Update Required:**

```typescript
import { AdvancedReviewService } from './path/to/onboardingService'; // Import service

export async function handleDietGeneration(request: Request): Promise<Response> {
  const { userId } = await request.json();

  // Load user's calculated metrics from database
  const userMetrics = await AdvancedReviewService.load(userId);

  if (!userMetrics || !userMetrics.daily_calories) {
    return new Response(
      JSON.stringify({
        error: 'User metrics not found. Please complete onboarding first.',
      }),
      { status: 400 }
    );
  }

  // Use ACTUAL calculated values
  const mealPlanParams = {
    dailyCalories: userMetrics.daily_calories, // ✅ From database
    protein: userMetrics.daily_protein_g,       // ✅ From database
    carbs: userMetrics.daily_carbs_g,          // ✅ From database
    fat: userMetrics.daily_fat_g,              // ✅ From database
    // ... other params
  };

  // Generate meal plan with correct targets
  const mealPlan = await generateMealPlan(mealPlanParams);

  return new Response(JSON.stringify(mealPlan));
}
```

---

### Workout Generation (Cloudflare Worker)

**Location:** `fitai-workers/src/handlers/workoutGeneration.ts`

**Current:** May be using defaults

**Update Required:**

```typescript
import { AdvancedReviewService } from './path/to/onboardingService';

export async function handleWorkoutGeneration(request: Request): Promise<Response> {
  const { userId } = await request.json();

  // Load user's calculated metrics
  const userMetrics = await AdvancedReviewService.load(userId);

  if (!userMetrics || !userMetrics.calculated_tdee) {
    return new Response(
      JSON.stringify({
        error: 'User metrics not found. Please complete onboarding first.',
      }),
      { status: 400 }
    );
  }

  // Use ACTUAL calculated values
  const workoutParams = {
    tdee: userMetrics.calculated_tdee,        // ✅ From database
    bmr: userMetrics.calculated_bmr,          // ✅ From database
    dailyCalories: userMetrics.daily_calories, // ✅ From database
    // ... other params
  };

  // Generate workout plan with correct targets
  const workoutPlan = await generateWorkoutPlan(workoutParams);

  return new Response(JSON.stringify(workoutPlan));
}
```

---

### Local AI Generation (React Native)

**Location:** `src/ai/index.ts`

**Current:** May be using defaults

**Update Required:**

```typescript
import { useDietGenerationParams, useWorkoutGenerationParams } from '../hooks/useUserMetrics';

// For diet generation
export async function generateWeeklyMealPlan(userId: string) {
  // Load user's diet generation parameters
  const dietParams = await getDietGenerationParamsFromDB(userId);

  if (!dietParams) {
    throw new Error('Please complete onboarding to generate meal plans');
  }

  // Use ACTUAL calculated values
  return await generateMealPlanWithParams({
    dailyCalories: dietParams.dailyCalories,   // ✅ From database
    protein: dietParams.protein,                // ✅ From database
    carbs: dietParams.carbs,                    // ✅ From database
    fat: dietParams.fat,                        // ✅ From database
    dietType: dietParams.dietType,              // ✅ From database
    allergies: dietParams.allergies,            // ✅ From database
    // ... other params
  });
}

// Helper function to load params
async function getDietGenerationParamsFromDB(userId: string) {
  const metrics = await userMetricsService.loadUserMetrics(userId);
  return userMetricsService.getDietGenerationParams(metrics);
}
```

---

## PHASE 3: TESTING CHECKLIST

### 1. Complete Onboarding Flow Test

- [ ] Create new test user
- [ ] Complete ALL onboarding tabs (1-5)
- [ ] On Tab 3 (Body Analysis), verify BMI/BMR are calculated and displayed
- [ ] On Tab 5 (Review), verify ALL metrics are calculated and displayed
- [ ] Click "Complete Onboarding"

### 2. Database Verification

- [ ] Open Supabase dashboard
- [ ] Check `body_analysis` table for test user:
  - [ ] `bmi` has value
  - [ ] `bmr` has value
  - [ ] `ideal_weight_min` has value
  - [ ] `ideal_weight_max` has value
- [ ] Check `advanced_review` table for test user:
  - [ ] `daily_calories` has value
  - [ ] `daily_protein_g` has value
  - [ ] `daily_carbs_g` has value
  - [ ] `daily_fat_g` has value
  - [ ] `daily_water_ml` has value
  - [ ] `calculated_tdee` has value

### 3. Main App Screens Test

- [ ] Navigate to Home Screen
  - [ ] Daily calorie target should match `daily_calories` from database
  - [ ] Water target should match `daily_water_ml` from database
- [ ] Navigate to Profile Screen
  - [ ] BMI should match `bmi` from database
  - [ ] Ideal weight range should match `ideal_weight_min/max` from database
- [ ] Navigate to Diet Screen
  - [ ] Macro targets should match `daily_protein_g`, `daily_carbs_g`, `daily_fat_g`
- [ ] Navigate to Fitness Screen
  - [ ] TDEE should match `calculated_tdee` from database

### 4. AI Generation Test

- [ ] Generate meal plan
  - [ ] Total daily calories should match user's `daily_calories`
  - [ ] Protein should match user's `daily_protein_g`
  - [ ] Carbs should match user's `daily_carbs_g`
  - [ ] Fat should match user's `daily_fat_g`
- [ ] Generate workout plan
  - [ ] Should use user's TDEE for calorie burn calculations
  - [ ] Should match user's fitness level and goals

### 5. App Restart Test

- [ ] Close and restart app
- [ ] Verify all values persist (no recalculation needed)
- [ ] Verify values match database

---

## PHASE 4: ERROR HANDLING

### Missing Calculated Values

If user somehow bypasses onboarding completion:

```typescript
const { quickMetrics, hasCalculatedMetrics } = useUserMetrics();

if (!hasCalculatedMetrics) {
  return (
    <ErrorScreen
      title="Setup Required"
      message="Please complete your health profile to access this feature."
      actionText="Complete Setup"
      onAction={() => navigation.navigate('Onboarding')}
    />
  );
}
```

### Loading States

Always show loading indicators:

```typescript
const { quickMetrics, isLoading } = useUserMetrics();

if (isLoading) {
  return <Spinner />;
}

if (!quickMetrics?.daily_calories) {
  return <EmptyState message="No data available" />;
}

// Render with data
```

---

## PHASE 5: CACHE MANAGEMENT

### When to Refresh Cache

Clear the metrics cache when user updates their profile:

```typescript
import { userMetricsService } from '../services/userMetricsService';

// After user updates body measurements
async function handleBodyMeasurementUpdate(newData: BodyAnalysisData) {
  await BodyAnalysisService.save(userId, newData);

  // Clear cache to force reload on next access
  userMetricsService.clearCache();

  // Optionally reload immediately
  const { refresh } = useUserMetrics();
  await refresh(true);
}
```

---

## SUMMARY

### Files to Update

1. ✅ **Created:** `src/services/userMetricsService.ts`
2. ✅ **Created:** `src/hooks/useUserMetrics.ts`
3. ⏳ **Update:** `src/screens/main/HomeScreen.tsx`
4. ⏳ **Update:** `src/screens/main/ProfileScreen.tsx`
5. ⏳ **Update:** `src/screens/main/DietScreen.tsx`
6. ⏳ **Update:** `src/screens/main/FitnessScreen.tsx`
7. ⏳ **Update:** `fitai-workers/src/handlers/dietGeneration.ts`
8. ⏳ **Update:** `fitai-workers/src/handlers/workoutGeneration.ts`
9. ⏳ **Update:** `src/ai/index.ts`

### Key Principles

1. ✅ **NO FALLBACKS** - Always use calculated values from database
2. ✅ **NO RECALCULATION** - Never recalculate what's already in database
3. ✅ **SINGLE SOURCE OF TRUTH** - Database is the authority
4. ✅ **ERROR GRACEFULLY** - Show meaningful errors when data is missing
5. ✅ **CACHE EFFICIENTLY** - Cache metrics but invalidate on updates

---

**Implementation Status:** 40% Complete
- ✅ Service layer created
- ✅ Hook created
- ⏳ Main screens need updates
- ⏳ AI generation needs updates
- ⏳ Testing needed

**Next Steps:**
1. Update main app screens (HomeScreen, ProfileScreen, DietScreen, FitnessScreen)
2. Update AI generation handlers
3. Test complete flow
4. Verify data consistency

---

**Document Created:** 2025-12-30
