# DATA CATEGORIES AUDIT - Single Source of Truth Requirements

## 🚨 CRITICAL: All Data Must Have ONE Source

This document maps ALL data categories in the app that need synchronization.

> **Wave 2 update (2026-06-20):** Google Fit has been **removed entirely** (REST API deprecated, shutdown end-2026). Android Health Connect is now the sole Android health-data path. Health metrics in `healthDataStore` (steps, heart rate, calories, sleep, etc.) are currently **store-only / ephemeral** — they reset daily and are NOT persisted to Supabase. The only exception is `weight`, which propagates to `profileStore.bodyAnalysis.current_weight_kg` → `body_analysis` table. A `health_metrics` Supabase table for daily history is **planned for Wave 3 (not yet implemented)**. The runtime `data_source` for health records is `FitAI | HealthKit | HealthConnect | Manual` (GoogleFit removed from the union). See `FITAI_DATA_ARCHITECTURE.md` §I for the full HC data flow.

---

## CATEGORY 1: USER STATS
**Usage:** 93 matches across 17 files
**Problem:** TWO DIFFERENT implementations!

### Current Sources (CONFLICTING):
1. `hooks/useUser.ts` → `useUserStats()` → reads from `useUserStore`
2. `utils/integration.ts` → `getUserStats()` → reads from `profile.stats`

### Data Points:
- `totalWorkouts`
- `totalCaloriesBurned`  
- `currentStreak`
- `longestStreak`
- `achievements`

### Files Using:
- `screens/main/HomeScreen.tsx` - uses `getUserStats()` from integration
- `screens/home/HomeScreen.tsx` - uses `getUserStats()` from integration
- `screens/profile/ProfileScreen.tsx` - uses `useUserStats()` from hook
- `screens/main/ProfileScreen.tsx` - uses `useUserStats()` from hook

### SOLUTION:
**Single Source:** `achievementStore` for streak data, `fitnessStore` for workout stats
**Delete:** Remove `useUserStats()` hook, remove `getUserStats()` from integration
**Create:** Single `useUserStatsStore` or consolidate into `achievementStore`

---

## CATEGORY 2: STREAK DATA
**Usage:** 93 matches across 17 files
**Problem:** Multiple sources with fallback chains

### Current Sources (CONFLICTING):
1. `achievementStore.currentStreak`
2. `userStore.profile.stats.currentStreak`
3. `weeklyProgress?.streak`
4. `userStats?.currentStreak`

### Files Using:
- `HomeScreen.tsx` (both versions)
- `ProfileScreen.tsx` (both versions)
- `DietScreen.tsx` (both versions)
- `SmartCoaching.tsx`
- `AnalyticsScreen.tsx`
- `HomeHeader.tsx`
- `AchievementShowcase.tsx`
- `ProgressScreen.tsx`

### SOLUTION:
**Single Source:** `achievementStore.currentStreak`
**Delete:** All other streak sources
**Action:** Remove from `profile.stats`, remove from `weeklyProgress`

---

## CATEGORY 3: CALORIE DATA
**Usage:** 249 matches across 34 files
**Problem:** Burned vs Consumed vs Goal from different sources

### Current Sources (CONFLICTING):
| Data Point | Sources |
|------------|---------|
| `caloriesBurned` | `healthDataStore.metrics.activeCalories`, `userStats.totalCaloriesBurned`, `workoutSession.calories` |
| `caloriesConsumed` | `nutritionStore.dailyNutrition.calories`, `mealProgress`, local state |
| `calorieGoal` | `calculatedMetrics.dailyCalories`, `nutritionGoals.daily_calories`, hardcoded `2000` |

### Files Using:
- All HomeScreen variants (3 files)
- All DietScreen variants (3 files)
- All FitnessScreen variants (2 files)
- AnalyticsScreen (2 files)
- SmartCoaching, HealthIntelligenceHub
- WorkoutSessionScreen
- MealDetail, WorkoutDetail

### SOLUTION:
**Single Source - Burned:** `healthDataStore.metrics.activeCalories`
**Single Source - Consumed:** `nutritionStore.dailyNutrition.calories`
**Single Source - Goal:** `calculatedMetrics.dailyCalories` (from useCalculatedMetrics)
**Delete:** All hardcoded values, all fallback chains

---

## CATEGORY 4: MACRO TARGETS
**Usage:** 297 matches across 24 files
**Problem:** 3-level fallback chains creating ambiguity

### Current Pattern (BAD):
```typescript
target: macroTargets.protein ?? nutritionGoals?.macroTargets?.protein ?? null
target: macroTargets.carbs ?? nutritionGoals?.macroTargets?.carbohydrates ?? null
target: macroTargets.fat ?? nutritionGoals?.macroTargets?.fat ?? null
```

### Current Sources (CONFLICTING):
1. `calculatedMetrics.getMacroTargets()` - from onboarding calculations
2. `nutritionGoals.macroTargets` - from nutritionStore hook
3. `nutritionGoals.daily_protein/carbs/fat` - database fields

### SOLUTION:
**Single Source:** `useCalculatedMetrics().getMacroTargets()`
**Delete:** `nutritionGoals.macroTargets`, `nutritionGoals.daily_*` fallbacks
**Action:** If no calculatedMetrics, UI shows "Complete onboarding to set goals"

---

## CATEGORY 5: WEIGHT DATA
**Usage:** 329 matches across 26 files
**Problem:** current/target/starting weight from 5+ sources

### Current Sources (CONFLICTING):
1. `calculatedMetrics.currentWeightKg`
2. `calculatedMetrics.targetWeightKg`
3. `healthMetrics?.weight`
4. `userProfile?.personalInfo?.weight`
5. `profile?.bodyMetrics?.current_weight_kg`
6. `userProfile?.fitnessGoals?.targetWeight`

### Files Using:
- All HomeScreen variants
- All ProfileScreen variants
- BodyAnalysisTab, AdvancedReviewTab
- BodyProgressCard
- ProgressScreen
- Multiple modals

### SOLUTION:
**Single Source - Current:** `profileStore.bodyMetrics.current_weight_kg`
**Single Source - Target:** `profileStore.bodyMetrics.target_weight_kg`
**Single Source - Starting:** `profileStore.bodyMetrics.starting_weight_kg` (NEW FIELD)
**Delete:** All other weight sources and fallback chains

---

## CATEGORY 6: SLEEP DATA
**Usage:** 32 matches across 7 files
**Problem:** sleepHours/Quality from multiple sources

### Current Sources (CONFLICTING):
1. `healthDataStore.metrics.sleepHours`
2. `healthDataStore.metrics.sleepQuality`
3. `personalInfo.current_sleep_duration` (onboarding)
4. HealthKit service data (iOS)
5. ~~GoogleFit service data~~ — **REMOVED (Wave 2).** Google Fit has been deleted entirely; Health Connect is the sole Android path. Sleep now arrives via `healthConnectService.syncHealthData()` → `syncSleep()` (SleepSession record).

### SOLUTION:
**Single Source:** `healthDataStore.metrics.sleepHours/sleepQuality`
**Action:** HealthKit (iOS) / Health Connect (Android) services WRITE to healthDataStore, don't return directly

---

## CATEGORY 7: STEPS DATA
**Usage:** 49 matches across 8 files
**Problem:** steps/stepsGoal from multiple sources

### Current Sources (CONFLICTING):
1. `healthDataStore.metrics.steps`
2. `healthDataStore.metrics.stepsGoal`
3. Hardcoded `10000`
4. HealthKit service data

### SOLUTION:
**Single Source:** `healthDataStore.metrics.steps` and `healthDataStore.metrics.stepsGoal`
**Delete:** All hardcoded 10000 values ✅ DONE

---

## CATEGORY 8: HEART RATE DATA
**Usage:** 19 matches across 5 files
**Problem:** HR data from multiple sources

### Current Sources:
1. `healthDataStore.metrics.heartRate`
2. `healthDataStore.metrics.restingHeartRate`
3. HealthKit (iOS) / Health Connect (Android) services. ~~GoogleFit~~ — **REMOVED (Wave 2).** HR now arrives via `healthConnectService.syncHealthData()` → `syncHeartRate()` (HeartRate record).

### SOLUTION:
**Single Source:** `healthDataStore.metrics`
**Action:** Services write to store, components read from store only

---

## CATEGORY 9: WORKOUT PROGRESS
**Usage:** 21 matches
**Problem:** `getWorkoutProgress()` used differently across files

### Current Pattern:
```typescript
// FitnessScreen uses:
const progress = getWorkoutProgress(workoutId)?.progress || 0;

// With fallback to 0
```

### SOLUTION:
**Single Source:** `fitnessStore.workoutProgress[workoutId]`
**Action:** Remove all `|| 0` fallbacks, show "--" if no data

---

## CATEGORY 10: MEAL PROGRESS
**Usage:** 16 matches
**Problem:** Similar to workout progress

### Current Pattern:
```typescript
const progress = getMealProgress(mealId);
// Used with mealProgress state
```

### SOLUTION:
**Single Source:** `nutritionStore.mealProgress[mealId]`
**Action:** Remove local mealProgress state from components

---

## CATEGORY 11: WEEKLY PLANS
**Usage:** 131 matches across 8 files
**Problem:** weeklyMealPlan and weeklyWorkoutPlan accessed differently

### Current Sources:
1. `fitnessStore.weeklyWorkoutPlan`
2. `nutritionStore.weeklyMealPlan`
3. Local state copies

### SOLUTION:
**Single Source:** Respective stores
**Action:** Remove all local state copies of plans

---

## CATEGORY 12: HYDRATION DATA
**Usage:** Multiple files
**Status:** ✅ FIXED - Using `hydrationStore`

### Single Source: `hydrationStore`
- `waterIntakeML`
- `dailyGoalML`

---

## CATEGORY 13: SELECTED DAY STATE
**Usage:** 5+ files
**Status:** ✅ FIXED - Using `appStateStore`

### Single Source: `appStateStore.selectedDay`

---

## SUMMARY TABLE

| Category | Current Sources | Target Single Source | Status |
|----------|-----------------|---------------------|--------|
| Streak | 4 sources | `achievementStore` | ✅ FIXED |
| Calories Burned | 3 sources | `healthDataStore.activeCalories` | ✅ FIXED |
| Calories Consumed | 2 sources | `nutritionStore.dailyNutrition` | ✅ FIXED |
| Calorie Goal | 3 sources | `calculatedMetrics.dailyCalories` | ✅ FIXED |
| Macro Targets | 3 sources | `calculatedMetrics.getMacroTargets()` | ✅ FIXED |
| Weight Current | 5 sources | `profileStore.bodyMetrics` | ✅ FIXED |
| Weight Target | 3 sources | `profileStore.bodyMetrics` | ✅ FIXED |
| Sleep Data | 5 sources | `healthDataStore.metrics` | ✅ FIXED |
| Steps | 4 sources | `healthDataStore.metrics` | ✅ FIXED |
| Heart Rate | 3 sources | `healthDataStore.metrics` | ✅ FIXED |
| Workout Progress | 2 sources | `fitnessStore.workoutProgress` | ✅ FIXED |
| Meal Progress | 2 sources | `nutritionStore.mealProgress` | ✅ FIXED |
| Hydration | 4 sources | `hydrationStore` | ✅ FIXED |
| Selected Day | 5 sources | `appStateStore` | ✅ FIXED |
| User Stats | 2 implementations | Single source | ✅ FIXED |

---

## IMPLEMENTATION STATUS - ALL COMPLETE ✅

### Phase 1: Critical Data (High User Impact)
1. ✅ Consolidated User Stats (2 implementations → 1)
2. ✅ Consolidated Streak Data (4 sources → achievementStore)
3. ✅ Consolidated Calorie Data (burned/consumed/goal)

### Phase 2: Body Metrics
4. ✅ Consolidated Weight Data (5 sources → profileStore)
5. ✅ Consolidated Macro Targets (removed fallback chains)

### Phase 3: Health Data
6. ✅ Consolidated Sleep Data
7. ✅ Consolidated Heart Rate Data

### Phase 4: Progress Tracking
8. ✅ Removed fallbacks from workout/meal progress
9. ✅ All progress tracking uses single store source

---

## ARCHITECTURE PRINCIPLES (ENFORCED)

1. **Zero Fallbacks** - If data is missing, show explicit state (e.g., "--", "Not set")
2. **One Source** - Each data point has exactly ONE authoritative source
3. **Stores Are Truth** - Zustand stores are the single source, not local state
4. **Validate Early** - Check data availability at app start, not in components
5. **No Hardcoded Values** - All defaults must come from config or user settings

---

*Updated: All Data Categories Fixed*
*Last review: 2026-06-20 (Wave 2 — Google Fit removed; Health Connect is sole Android path; health metrics store-only until Wave 3)*
*Total Data Categories: 15*
*Categories Fixed: 15*
*Categories Needing Fix: 0*

