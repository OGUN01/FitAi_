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
| `healthDataStore` | Health metrics (Android Health Connect + manual entry) | `metrics` (steps, heartRate, restingHeartRate, activeCalories, totalCalories, distance, weight, sleepHours, recentWorkouts, heartRateVariability, oxygenSaturation, bodyFat) + `metricsHistory` (N-day persisted history for charts). Persisted to `health_metrics` Supabase table (Wave 3) via fire-and-forget `saveHealthSnapshot` after each sync; manual entries via `saveHealthMetric(source:'manual')`. `weight` also dual-writes to `body_analysis` for the calculation engine. |
| `profileStore` | Profile data | `bodyMetrics`, `workoutPreferences` |
| `subscriptionStore` | Subscription | `isPremium`, `subscriptionStatus` |

---

## Android Health Connect Sync Path (Wave 2 → Wave 3)

**Sole Android health-data path.** Google Fit has been removed entirely (REST API deprecated, shutdown end-2026). iOS uses HealthKit (separate path, not documented here).

**Wave 3 addition:** Health Connect metrics now persist to the `health_metrics` Supabase table (automatic path), and users with unsupported watches can manually enter health data (manual path). Both paths write to the same table; see `MANUAL_HEALTH_ENTRY.md` for the manual path details.

### Data Flow

```
Smartwatch → Companion app → Android Health Connect (OS hub)
  → healthConnectService.syncHealthData()     [src/services/health/core.ts]
      → per-metric readers (syncHelpers.ts): syncSteps, syncHeartRate,
        syncActiveCalories, syncTotalCaloriesWithBMRFallback, syncDistance,
        syncWeight, syncSleep, syncExerciseSessions, syncHRV, syncSpO2, syncBodyFat
  → healthDataStore.metrics (Zustand)         [src/stores/healthDataStore.ts]
  → UI selectors
```

FitAI reads from Health Connect only — never from individual watch SDKs. A watch works with FitAI iff its companion app writes to Health Connect (see `WEARABLE_SUPPORT_MATRIX.md`).

### Sync Triggers

1. **Foreground sync on Home screen mount** — `syncHealthData()` called when Home loads (gated on permissions + availability).
2. **Manual "Sync Now"** — user-initiated refresh from the wearable/health settings UI.
3. **Background fetch** — `registerBackgroundHealthSync()` runs on app startup (gated on `settings.backgroundSyncEnabled`); uses `expo-background-fetch` task `fitai-healthconnect-background-sync` → `runBackgroundSyncOnce()` → `syncHealthData(1 day back)` if `shouldSync(1 hour)` is true. Requires `READ_HEALTH_DATA_IN_BACKGROUND` (Android 15+).

### Workout Write-Back Path

Completed FitAI workouts are written back to Health Connect (mirrors iOS `exportWorkoutToHealthKit`):

```
Workout completion flow (completionTracking.ts)
  → healthConnectService.writeWorkoutSession({ exerciseType, startTime, endTime, title, calories, notes })
      → insertRecords([ExerciseSession]) + insertRecords([ActiveCaloriesBurned]) if calories > 0
```

Requires `WRITE_EXERCISE` + `WRITE_ACTIVE_CALORIES_BURNED` permissions.

### Persistence — `health_metrics` Table (Wave 3)

Health metrics are persisted to the `health_metrics` Supabase table (migration `20260620000003_create_health_metrics.sql`). The runtime store (`healthDataStore.metrics`) remains the SSOT for live UI; `health_metrics` is the persistence + history layer. UNIQUE(user_id, date, metric_type) — one authoritative value per user/day/metric, upserted (latest write wins). `source` column distinguishes `'healthconnect'` (automatic) from `'manual'` (manual entry) for UI attribution; it does NOT create two sources of truth.

#### Automatic path (Health Connect → `health_metrics`)

```
healthConnectService.syncHealthData()
  → healthDataStore.syncFromHealthConnect(result)
      → set metrics (Zustand) — UI updates immediately
      → healthMetricsDataService.saveHealthSnapshot({ userId, date, metrics })
          .catch(console.error)          // FIRE-AND-FORGET
```

**Key invariant:** UI sync and persistence are decoupled. The store write completes and subscribers re-render BEFORE the Supabase upsert resolves. If the upsert fails, the error is logged via `console.error` (CLAUDE.md #5 — no silent failures) but the user still sees their freshly-synced data. Persistence failures NEVER block UI sync. The `.catch(console.error)` is the only error handler — there is no retry queue for health metrics (unlike the SyncEngine queue used for onboarding data); a missed write simply means that day's value won't appear in history charts until the next successful sync.

#### Manual entry path (ManualHealthEntryScreen → `health_metrics`)

For watches that do not write to Health Connect (Noise, boAt, Fire-Boltt, Huawei), users can manually enter health data:

```
WearableConnectionScreen → UnsupportedWatchNotice → ManualHealthEntryScreen
  → healthMetricsDataService.saveHealthMetric({ userId, date, metricType, value, unit, source: 'manual' })
  → upsert into health_metrics (UNIQUE wins → overrides HC value for that day/metric if present)
```

Both paths write to the SAME table with the SAME UNIQUE constraint. A manual entry on a day that already has HC data overrides that day's HC value for that metric (latest write wins on upsert). See `MANUAL_HEALTH_ENTRY.md` for the full manual-entry UX and metric list.

#### History read-back

`healthDataStore.loadHealthMetricsHistory(days=30)` → `healthMetricsDataService.getMultiMetricHistory` → populates `metricsHistory` state field for charts. Called on chart-screen mount and after manual entries.

#### `weight` dual-write (unchanged)

`weight_kg` writes to BOTH `health_metrics` (daily history) AND `profileStore.bodyAnalysis.current_weight_kg` → `body_analysis` (onboarding SSOT for the calculation engine). Different consumers, intentional, not a duplication.

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

*Last Updated: June 2026 (Wave 3 — `health_metrics` Supabase persistence for Health Connect + manual entry fallback; Wave 2: Health Connect sync path + workout write-back; Google Fit removed)*
*Maintained by: FitAI Development Team*

