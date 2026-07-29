# Data Integrity Audit - Complete Application Analysis

## TL;DR

> **Quick Summary**: Comprehensive audit found **73+ critical issues** across the entire FitAI application related to hardcoded values, duplicate state, data flow inconsistencies, and broken pipelines.
>
> **Issues Found**:
>
> - 645+ hardcoded zeros in mappers/services
> - 15 Single Source of Truth violations
> - 7 critical data flow inconsistencies
> - 20 orphaned/broken data pipelines
> - 2,228 unguarded console.log statements
>
> **Estimated Effort**: 2-3 weeks for complete resolution
> **Critical Path**: Profile Stats (DONE) → Nutrition Display → Analytics → Achievements

---

## Executive Summary

| Category               | Count | Severity  | User Impact                      |
| ---------------------- | ----- | --------- | -------------------------------- |
| **Hardcoded Zeros**    | 645+  | 🔴 HIGH   | Stats always show 0              |
| **SSOT Violations**    | 15    | 🔴 HIGH   | Conflicting data across screens  |
| **Data Flow Bugs**     | 7     | 🔴 HIGH   | Different values for same metric |
| **Orphaned Pipelines** | 20    | 🟡 MEDIUM | Features don't work              |
| **Stale Cache**        | 3     | 🟡 MEDIUM | Outdated data shown              |
| **Console.log Noise**  | 2,228 | 🟢 LOW    | Performance, bundle size         |

---

## CATEGORY 1: HARDCODED ZEROS (645+ instances)

### Critical Files

| File                                              | Issue                           | Impact                  |
| ------------------------------------------------- | ------------------------------- | ----------------------- |
| `services/user-profile/mappers.ts:77-82`          | ✅ FIXED - Stats hardcoded to 0 | Profile always showed 0 |
| `services/data-transformers/diet-transformers.ts` | Fiber always 0                  | No fiber tracking       |
| `ai/mealGeneration.ts:116-118`                    | AI meals missing fiber/water    | Incomplete nutrition    |
| `hooks/useDashboardData.ts:221-222`               | Dashboard defaults to 0s        | Empty dashboard         |
| `hooks/useHealthKitSync.ts:372-376`               | Health dashboard zeros          | Misleading health data  |
| `stores/nutrition/selectors.ts:33,84`             | Consumed nutrition = 0          | Diet tracking broken    |
| `services/analytics/engine.ts:113,140-142`        | Analytics always 0              | No progress shown       |
| `stores/subscriptionStore.ts:142,204`             | Trial days = 0                  | Trial always "expired"  |

### Pattern: Empty Fallback Objects (Critical)

```typescript
// BAD: Silently fails, hides errors
return {}; // data-bridge/exportImport.ts:77
return {}; // health-kit/data-fetcher.ts:20,113

// SHOULD BE:
return { success: false, error: "Failed to fetch data" };
```

---

## CATEGORY 2: SINGLE SOURCE OF TRUTH VIOLATIONS (15 issues)

### Critical Duplications

| Data                   | Location 1                              | Location 2                                    | Location 3                                      | SSOT                                               |
| ---------------------- | --------------------------------------- | --------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| **Weight**             | `healthDataStore.metrics.weight`        | `profileStore.bodyAnalysis.current_weight_kg` | `analyticsStore.metricsHistory`                 | healthDataStore                                    |
| **Streak**             | `userStore.profile.stats.currentStreak` | `achievementStore.currentStreak`              | `analyticsStore.analyticsSummary.currentStreak` | achievementStore                                   |
| **Calories Goal**      | `healthDataStore.metrics.caloriesGoal`  | `profileStore.advancedReview.daily_calories`  | `calculatedMetrics.TDEE`                        | healthDataStore → calculatedMetrics → profileStore |
| **Onboarding Data**    | `userStore.profile.personalInfo`        | `profileStore.personalInfo`                   | -                                               | profileStore                                       |
| **Consumed Nutrition** | `nutritionStore.getConsumedNutrition()` | `useDashboardData` computed                   | `useNutritionData.dailyNutrition`               | nutritionStore selector                            |

### AsyncStorage Key Conflicts

| Data         | Key 1                 | Key 2                  |
| ------------ | --------------------- | ---------------------- |
| User Profile | `"user-storage"`      | `"profile-storage-v2"` |
| Nutrition    | `"nutrition-storage"` | Hook local state       |

---

## CATEGORY 3: DATA FLOW INCONSISTENCIES (7 critical bugs)

### 1. Calories Consumed - 3 Different Calculations

| Location                       | Method                  | Problem            |
| ------------------------------ | ----------------------- | ------------------ |
| `dataRetrieval.ts:97-106`      | Sum completed meals     | ✅ Correct         |
| `nutrition/selectors.ts:77-83` | Sum today's completed   | ✅ Correct         |
| `DietScreen.tsx:200-207`       | `Math.max(store, hook)` | ❌ Inflates values |

**Fix**: Remove `Math.max()` from DietScreen, use store value only.

### 2. Calorie Goal - 3-Tier Fallback Mismatch

| Screen             | Fallback Chain                                 |
| ------------------ | ---------------------------------------------- |
| HomeScreen         | `caloriesGoal → TDEE → dailyCalories` (3-tier) |
| TodaysProgressCard | `dailyCalories → targetCalories` (2-tier)      |

**Fix**: Standardize to 3-tier fallback everywhere.

### 3. Current Streak - 2 Algorithms

| Service              | Logic                                            |
| -------------------- | ------------------------------------------------ |
| `streakAnalytics.ts` | Count consecutive days with `workoutCount > 0`   |
| `dataRetrieval.ts`   | Count ANY completed activity (meals OR workouts) |

**Fix**: Choose one algorithm (recommend workout-based).

### 4. Calories Burned - 3 Sources

| Location              | Source                                      |
| --------------------- | ------------------------------------------- |
| `useHomeLogic.ts`     | 3-tier: wearable → active → app calculated  |
| `useUnifiedStats.ts`  | 2-tier: wearable → active (no app fallback) |
| `stats-calculator.ts` | Workout-based only, ignores wearables       |

**Fix**: All should use same 3-tier priority.

### 5. Fallback Pattern Chaos

```typescript
// 498 instances of || 0 (treats 0, null, undefined, false as 0)
meal.totalCalories || 0;

// 96 instances of ?? 0 (only null/undefined, preserves 0)
calculatedMetrics?.dailyCalories ?? 0;

// INCONSISTENT: Same meaning intended, different behavior
```

**Fix**: Standardize on `?? 0` for numeric fallbacks.

### 6. Date/Time Timezone Issues

```typescript
// Some code uses UTC
new Date().toISOString().split("T")[0]; // "2026-02-06" in UTC

// Some code uses local time
new Date().toLocaleDateString(); // "2/6/2026" in user's timezone
```

**Fix**: Create date utility functions, use UTC for comparisons.

---

## CATEGORY 4: ORPHANED/BROKEN PIPELINES (20 issues)

### Orphaned State (Never Read)

| Property                    | Store             | Issue                        |
| --------------------------- | ----------------- | ---------------------------- |
| `healthTipOfDay`            | healthDataStore   | Set but never displayed      |
| `showingHealthDashboard`    | healthDataStore   | Has setter, no UI reads it   |
| `chartData.caloriesBurned`  | analyticsStore    | Initialized, never populated |
| `chartData.waterIntake`     | analyticsStore    | Initialized, never populated |
| `trialInfo.nextBillingDate` | subscriptionStore | Defined, never set/read      |

### Broken Data Pipelines

| Pipeline                       | Issue                                | Impact                     |
| ------------------------------ | ------------------------------------ | -------------------------- |
| Analytics → Supabase           | No automatic sync                    | Data lost on uninstall     |
| Achievements → Supabase        | Sync not called on unlock            | Achievements don't persist |
| Health → Analytics             | No subscription                      | Analytics shows stale data |
| Meal logs → Consumed nutrition | Progress only updated during session | Dashboard shows 0 calories |
| Workout logs → Completed stats | In-memory only                       | Shows 0 after app restart  |

### Stale Cache Issues

| Cache               | Issue                 | Impact                      |
| ------------------- | --------------------- | --------------------------- |
| Analytics history   | Not cleared on logout | Data leaks between accounts |
| Health metrics      | No freshness check    | Week-old data shown         |
| Subscription status | No background refresh | Trial bypass possible       |

---

## CATEGORY 5: PRODUCTION CODE QUALITY

### Console.log Statements: 2,228 instances

```typescript
// ❌ BAD: Direct console.log in production
console.log("🏋️ [aiService] generateWorkout called");
console.log("📊 [useCalculatedMetrics] Data loaded:", {...});

// ✅ GOOD: Using debug logger
import { logger } from '@/utils/debug';
logger.log("Development only message"); // Auto-stripped in production
```

**Fix**: Replace direct console.log with logger utility.

### Test Files in Production Bundle

| File                                          | Issue                              |
| --------------------------------------------- | ---------------------------------- |
| `utils/testQuickActions.ts`                   | Test suite with hardcoded user IDs |
| `utils/authFlowTest.ts`                       | Hardcoded test@example.com         |
| `utils/backendTest.ts`                        | Backend test with credentials      |
| `components/debug/MigrationTestComponent.tsx` | Debug UI component                 |

**Fix**: Add to metro.config.js blockList.

---

## PRIORITY ACTION PLAN

### Phase 1: Critical User-Facing Bugs (Week 1)

| Priority | Issue                           | File(s)                                     | Effort |
| -------- | ------------------------------- | ------------------------------------------- | ------ |
| ✅ DONE  | Profile stats = 0               | mappers.ts, useProfileLogic.ts              | 2h     |
| 🔴 P0    | Dashboard nutrition = 0         | useDashboardData.ts, nutrition/selectors.ts | 4h     |
| 🔴 P0    | DietScreen Math.max bug         | DietScreen.tsx:200-207                      | 1h     |
| 🔴 P0    | Workout count = 0 after restart | fitness/state.ts (add hydration)            | 4h     |
| 🔴 P0    | Streak inconsistency            | Choose SSOT algorithm                       | 2h     |

### Phase 2: Data Consistency (Week 1-2)

| Priority | Issue                            | File(s)                           | Effort |
| -------- | -------------------------------- | --------------------------------- | ------ | --------- | --- |
| 🟡 P1    | Calorie goal 3-tier everywhere   | TodaysProgressCard, other screens | 2h     |
| 🟡 P1    | Fallback pattern standardization | App-wide `                        |        | 0`→`?? 0` | 4h  |
| 🟡 P1    | Date/time utilities              | Create utils/date.ts              | 3h     |
| 🟡 P1    | Weight SSOT enforcement          | Remove profileStore weight        | 2h     |
| 🟡 P1    | Onboarding data SSOT             | Deprecate userStore fields        | 4h     |

### Phase 3: Broken Pipelines (Week 2)

| Priority | Issue                           | File(s)                  | Effort |
| -------- | ------------------------------- | ------------------------ | ------ |
| 🟡 P1    | Analytics sync on completion    | StoreCoordinator.ts      | 2h     |
| 🟡 P1    | Achievement sync on unlock      | achievement/actions.ts   | 2h     |
| 🟡 P1    | Health → Analytics subscription | analytics/lazyImports.ts | 2h     |
| 🟡 P1    | Logout cache clearing           | clearUserData.ts         | 2h     |
| 🟡 P2    | Subscription background check   | subscriptionStore.ts     | 3h     |

### Phase 4: Cleanup & Quality (Week 3)

| Priority | Issue                          | File(s)                          | Effort |
| -------- | ------------------------------ | -------------------------------- | ------ |
| 🟢 P2    | Remove orphaned state          | health-data/types.ts             | 2h     |
| 🟢 P2    | Console.log → logger           | App-wide migration               | 8h     |
| 🟢 P2    | Exclude test files             | metro.config.js                  | 1h     |
| 🟢 P2    | Fiber tracking                 | diet-transformers.ts, AI schemas | 4h     |
| 🟢 P3    | AsyncStorage key consolidation | Migration script                 | 4h     |

---

## TODOs

### Immediate (This Sprint)

- [ ] 1. Fix DietScreen Math.max() calorie bug
- [ ] 2. Hydrate workout/meal progress from Supabase on app start
- [ ] 3. Standardize calorie goal fallback chain
- [ ] 4. Choose streak calculation SSOT (workout-based recommended)
- [ ] 5. Add analytics sync to workout/meal completion flows

### Short-term (Next Sprint)

- [ ] 6. Replace `|| 0` with `?? 0` across codebase
- [ ] 7. Create date utility functions for timezone consistency
- [ ] 8. Implement logout cache clearing for all stores
- [ ] 9. Add health store subscription to analytics
- [ ] 10. Fix subscription trial status refresh

### Medium-term (Backlog)

- [ ] 11. Remove orphaned state properties
- [ ] 12. Migrate console.log to logger utility
- [ ] 13. Consolidate AsyncStorage keys
- [ ] 14. Add fiber tracking to AI meal generation
- [ ] 15. Implement progress goals UI

---

## Success Criteria

### Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit
# Expected: Exit 0, no errors

# Search for remaining hardcoded zeros in critical files
grep -rn ": 0," src/services/user-profile/mappers.ts
# Expected: No matches for stats fields

# Verify no Math.max in nutrition calculations
grep -rn "Math.max" src/screens/main/DietScreen.tsx
# Expected: No matches in nutrition section
```

### Final Checklist

- [ ] All screens show consistent calorie values
- [ ] Streak is same on Home and Profile
- [ ] Dashboard shows real consumed nutrition
- [ ] Workout count persists after app restart
- [ ] Analytics syncs to cloud on completion
- [ ] No data leaks between user accounts
- [ ] Console.log stripped from production build

---

## Notes for Implementation

### Key Patterns to Follow

**For SSOT enforcement:**

```typescript
// Create unified hooks like useUnifiedStats
export const useUnifiedMetric = () => {
  // Read from ONE authoritative source
  const value = useAuthorityStore((state) => state.metric);
  return value ?? 0;
};
```

**For consistent fallbacks:**

```typescript
// Use ?? for numeric, || for objects/arrays
const calories = healthMetrics?.totalCalories ?? 0; // Numeric
const meals = mealPlan?.meals || []; // Array
```

**For date handling:**

```typescript
// Always use UTC for comparisons
export const getTodayUTC = () => new Date().toISOString().split("T")[0];
export const isToday = (date: string) => date.startsWith(getTodayUTC());
```
