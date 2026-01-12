# FitAI Data Synchronization Map

## Overview

This document serves as the **SINGLE SOURCE OF TRUTH** reference for all data in the FitAI application.
Every piece of data should have exactly ONE authoritative source - no duplicates, no fallbacks.

---

## Core Principles

### 1. ONE SOURCE - Every data point has exactly ONE source
### 2. ZERO FALLBACKS - No `|| defaultValue` or `?? defaultValue` patterns
### 3. FAIL EXPLICIT - Missing data = explicit UI message, not silent default
### 4. STORES ARE TRUTH - Zustand stores hold all business state
### 5. VALIDATE EARLY - Onboarding validates, screens just display

---

## Zustand Stores (Single Sources of Truth)

### 1. `hydrationStore` - Water Tracking
```typescript
import { useHydrationStore } from '../stores';

// State
waterIntakeML: number;        // Current intake in MILLILITERS
dailyGoalML: number | null;   // Goal from calculatedMetrics
lastResetDate: string;        // For daily auto-reset

// Actions
addWater(amountML);           // Add water (store handles capping)
setWaterIntake(amountML);     // Set exact amount (for corrections)
setDailyGoal(goalML);         // Set goal (from calculatedMetrics)
checkAndResetIfNewDay();      // Call on screen mount
```

**NEVER USE:**
- `useState(0)` for water in any screen
- Different units (always use ML internally)
- Hardcoded water goals

---

### 2. `appStateStore` - Shared UI State
```typescript
import { useAppStateStore } from '../stores';

// State
selectedDay: DayName;  // 'sunday' | 'monday' | ... | 'saturday'

// Actions
setSelectedDay(day);   // Update selected day
resetToToday();        // Reset to current day
isSelectedDayToday();  // Check if selected = today
```

**USE IN:** FitnessScreen, DietScreen, DietScreenNew, diet/DietScreen, fitness/FitnessScreen

---

### 3. `achievementStore` - Streak & Achievements
```typescript
import { useAchievementStore } from '../stores';

// State
currentStreak: number;  // Days in a row of activity

// SINGLE SOURCE - Never access streak from anywhere else
```

**NEVER USE:**
- `weeklyProgress?.streak`
- `userStats?.currentStreak`
- `currentStreak: 0` hardcoded
- Fallback chains like `a || b || c || 0`

---

### 4. `useCalculatedMetrics` Hook - Nutrition Targets
```typescript
import { useCalculatedMetrics } from '../hooks/useCalculatedMetrics';

// This hook returns calculated values from onboarding
const {
  metrics,              // All calculated metrics
  getCalorieTarget(),   // Daily calorie target
  getMacroTargets(),    // { protein, carbs, fat } in grams
  getWaterGoalLiters(), // Daily water goal in liters
  hasCalculatedMetrics, // Boolean check
} = useCalculatedMetrics();
```

**SINGLE SOURCE FOR:**
- Calorie targets
- Macro targets (protein, carbs, fat)
- Water goals
- BMI, BMR, TDEE values

**NEVER USE:**
- `nutritionGoals?.daily_calories`
- Hardcoded `2000` calories
- Hardcoded `10000` steps

---

### 5. `userStore` - User Profile
```typescript
import { useUserStore } from '../stores';

// Profile data
profile.personalInfo.name  // User's name
profile.personalInfo.age   // User's age
profile.personalInfo.gender // User's gender
profile.fitnessGoals       // User's fitness goals
profile.dietPreferences    // User's diet preferences
```

**SINGLE SOURCE FOR:**
- User name (no 'Champion' or 'Anonymous User' fallbacks)
- Personal info (age, gender, etc.)
- Fitness goals
- Diet preferences

---

### 6. Other Important Stores

| Store | Purpose | Key State |
|-------|---------|-----------|
| `fitnessStore` | Workout data | `weeklyWorkoutPlan`, `workoutProgress` |
| `nutritionStore` | Meal data | `weeklyMealPlan`, `mealProgress`, `dailyMeals` |
| `healthDataStore` | Health metrics | `metrics` (steps, sleep, heart rate) |
| `profileStore` | Profile data | `bodyMetrics`, `workoutPreferences` |
| `subscriptionStore` | Subscription | `isPremium`, `subscriptionStatus` |

---

## Data Category Reference

| Category | Source | Import |
|----------|--------|--------|
| Water Intake | `hydrationStore.waterIntakeML` | `useHydrationStore` |
| Water Goal | `hydrationStore.dailyGoalML` | `useHydrationStore` |
| Selected Day | `appStateStore.selectedDay` | `useAppStateStore` |
| Streak | `achievementStore.currentStreak` | `useAchievementStore` |
| Calorie Target | `calculatedMetrics.dailyCalories` | `useCalculatedMetrics` |
| Protein Target | `calculatedMetrics.dailyProteinG` | `useCalculatedMetrics` |
| Carbs Target | `calculatedMetrics.dailyCarbsG` | `useCalculatedMetrics` |
| Fat Target | `calculatedMetrics.dailyFatG` | `useCalculatedMetrics` |
| Steps Goal | `healthDataStore.stepsGoal` | `useHealthDataStore` |
| User Name | `userStore.profile.personalInfo.name` | `useUserStore` |
| Current Weight | `profileStore.bodyMetrics.current_weight_kg` | `useProfileStore` |
| Target Weight | `profileStore.bodyMetrics.target_weight_kg` | `useProfileStore` |
| Activity Level | `workoutPreferences.activity_level` | `useProfileStore` |

---

## Anti-Patterns to AVOID

### ❌ Fallback Chains
```typescript
// BAD - Multiple fallback sources
const streak = weeklyProgress?.streak || achievementStreak || userStats?.currentStreak || 0;

// GOOD - Single source
const streak = achievementStreak;
```

### ❌ Hardcoded Defaults
```typescript
// BAD - Hardcoded values (THESE HAVE BEEN REMOVED)
// stepsGoal={10000} -- NOW: stepsGoal={healthMetrics?.stepsGoal}
// caloriesGoal={2000} -- NOW: caloriesGoal={calculatedMetrics?.dailyCalories}
// userName="Champion" -- NOW: userName={profile?.personalInfo?.name}

// GOOD - From stores/hooks
stepsGoal={healthMetrics?.stepsGoal}
caloriesGoal={calculatedMetrics?.dailyCalories}
userName={profile?.personalInfo?.name}
```

### ❌ Local State for Shared Data
```typescript
// BAD - useState for data used in multiple screens
const [waterIntake, setWaterIntake] = useState(0);

// GOOD - Zustand store
const { waterIntakeML, addWater } = useHydrationStore();
```

### ❌ Unit Mismatches
```typescript
// BAD - Mixing liters and milliliters
const [waterConsumed, setWaterConsumed] = useState(0); // in liters
const waterGoalML = calculatedMetrics?.dailyWaterML; // in ML!

// GOOD - Consistent units (always ML in store)
const { waterIntakeML, dailyGoalML } = useHydrationStore();
const waterLiters = waterIntakeML / 1000; // Convert for display only
```

---

## Missing Data Handling

When data is not available, show explicit UI instead of silent fallbacks:

```typescript
// If no calculated metrics (onboarding incomplete)
if (!hasCalculatedMetrics) {
  return <CompleteOnboardingPrompt />;
}

// If no water goal set
if (!waterGoal) {
  return <Text>Set your water goal in settings</Text>;
}
```

---

## Screen-to-Store Mapping

| Screen | Stores Used |
|--------|-------------|
| HomeScreen | hydrationStore, achievementStore, healthDataStore, fitnessStore, nutritionStore |
| DietScreen | hydrationStore, achievementStore, nutritionStore, userStore |
| DietScreenNew | hydrationStore, nutritionStore, userStore |
| FitnessScreen | appStateStore, fitnessStore, userStore |
| AnalyticsScreen | achievementStore, healthDataStore, analyticsStore |
| ProfileScreen | userStore, profileStore, subscriptionStore |

---

## Migration Checklist

When adding new data:
1. ☐ Identify if data needs to be shared across screens
2. ☐ If shared, add to appropriate Zustand store
3. ☐ If local UI state only, useState is OK
4. ☐ NO fallback values - handle missing data explicitly
5. ☐ Document in this file
6. ☐ Update types if needed

---

*Last Updated: January 2026*
*Maintained by: FitAI Development Team*

