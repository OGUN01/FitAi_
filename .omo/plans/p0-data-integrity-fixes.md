# P0 Data Integrity Fixes - Phase 2

## TL;DR

> **Quick Summary**: Fix 4 critical P0 data integrity bugs that cause incorrect or missing data display across the FitAI app. These fixes address the most user-facing issues from the comprehensive data audit.
>
> **Deliverables**:
>
> - DietScreen displays correct calorie values (no inflation from Math.max)
> - Workout count persists after app restart (database hydration)
> - Dashboard shows calories consumed instead of meal count
> - Streak calculation works correctly using single algorithm
>
> **Estimated Effort**: Medium (2-3 days)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Fix 1 (DietScreen) → Fix 3 (Dashboard) | Fix 2 (Hydration) → Fix 4 (Streak)

---

## Context

### Original Request

Continue fixing the source of truth issues identified in the comprehensive data integrity audit. Focus on the 4 P0 issues that have the highest user impact.

### Interview Summary

**Key Discussions**:

- Dashboard should show calories consumed (e.g., "1500/2000 kcal") instead of meal count ("2/3 meals")
- Streak calculation should use "any activity" algorithm (workouts OR meals count)
- Tests should be added after implementation (not TDD)

**Research Findings**:

- `DietScreen.tsx:202-205` uses `Math.max(storeNutrition, dailyNutrition)` causing calorie inflation
- `fitness/dataActions.ts:loadData()` only restores `weeklyWorkoutPlan`, not `workoutProgress`
- `useHomeLogic.ts:261-271` passes `mealsLogged` (count) to `DailyProgressRings`, not consumed calories
- Achievement store's `currentStreak` is persisted but never calculated (always 0)
- `DailyProgressRings` component already supports the pattern needed - just needs different data

### Metis Review

**Identified Gaps** (addressed):

- Display format for calories: Use `"{consumed}/{goal} cal"` matching existing Move ring pattern (line 310)
- Streak recalculation timing: Trigger on app start and after activity completion
- Null handling for store data: Use existing `|| 0` fallback pattern
- Supabase schema: Use `workout_sessions` table with `is_completed` flag (confirmed from codebase)

---

## Work Objectives

### Core Objective

Fix 4 P0 data integrity bugs to ensure users see accurate, consistent data across all screens.

### Concrete Deliverables

- Modified `src/screens/main/DietScreen.tsx` - Remove Math.max pattern
- Modified `src/stores/fitness/dataActions.ts` - Add workoutProgress hydration
- Modified `src/hooks/useHomeLogic.ts` - Pass calories consumed instead of meal count
- Modified `src/screens/main/home/DailyProgressRings.tsx` - Update nutrition ring label
- Modified `src/stores/achievement/actions.ts` - Add streak calculation logic
- Test files for each fix

### Definition of Done

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] DietScreen shows store nutrition values only (no Math.max)
- [ ] Workout count persists after simulated app restart
- [ ] Dashboard nutrition ring shows calories consumed
- [ ] Streak increments correctly after workout OR meal completion

### Must Have

- Fix all 4 P0 issues
- Add tests for each fix
- Maintain TypeScript type safety
- Follow existing code patterns

### Must NOT Have (Guardrails)

- **MUST NOT** create new services/abstractions (no NutritionService, HydrationManager, StreakCalculator)
- **MUST NOT** refactor code beyond the 4 specific fixes
- **MUST NOT** change component APIs (DailyProgressRings props remain same types)
- **MUST NOT** add UI polish (loading states, animations, toasts) not requested
- **MUST NOT** fix bugs discovered during implementation (document for separate tickets)
- **MUST NOT** touch files not directly related to the 4 issues
- **MUST NOT** change existing store schemas or database tables
- **MUST NOT** add comprehensive unit tests for entire modules

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (project has test patterns)
- **Automated tests**: Tests-after
- **Framework**: bun test / jest

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type               | Tool             | How Agent Verifies                           |
| ------------------ | ---------------- | -------------------------------------------- |
| **Code changes**   | Bash (tsc, grep) | TypeScript compilation, pattern verification |
| **Store behavior** | Bash (bun test)  | Unit tests with mocked stores                |
| **UI display**     | Playwright       | Navigate, verify displayed values            |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Fix DietScreen Math.max bug [no dependencies]
└── Task 2: Add workout progress hydration [no dependencies]

Wave 2 (After Wave 1):
├── Task 3: Dashboard show calories consumed [depends: none, but related to Task 1]
└── Task 4: Fix streak calculation SSOT [depends: none, but related to Task 2]

Wave 3 (After Wave 2):
└── Task 5: Regression verification [depends: 1, 2, 3, 4]
```

### Dependency Matrix

| Task | Depends On              | Blocks           | Can Parallelize With |
| ---- | ----------------------- | ---------------- | -------------------- |
| 1    | None                    | 3 (conceptually) | 2                    |
| 2    | None                    | 4 (conceptually) | 1                    |
| 3    | 1 (same nutrition data) | 5                | 4                    |
| 4    | 2 (same store pattern)  | 5                | 3                    |
| 5    | 1, 2, 3, 4              | None             | None                 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents                                                                     |
| ---- | ----- | -------------------------------------------------------------------------------------- |
| 1    | 1, 2  | `delegate_task(category="quick", load_skills=[], run_in_background=false)`             |
| 2    | 3, 4  | `delegate_task(category="quick", load_skills=[], run_in_background=false)`             |
| 3    | 5     | `delegate_task(category="quick", load_skills=["playwright"], run_in_background=false)` |

---

## TODOs

### - [x] 1. Fix DietScreen Math.max Calorie Inflation Bug

**What to do**:

- Remove `Math.max()` pattern from nutrition calculation
- Use store nutrition values directly
- Replace lines 202-205 in `DietScreen.tsx`

**Current code** (lines 200-207):

```typescript
const storeNutrition = getTodaysConsumedNutrition();
const currentNutrition = {
  calories: Math.max(storeNutrition.calories, dailyNutrition?.calories || 0),
  protein: Math.max(storeNutrition.protein, dailyNutrition?.protein || 0),
  carbs: Math.max(storeNutrition.carbs, dailyNutrition?.carbs || 0),
  fat: Math.max(storeNutrition.fat, dailyNutrition?.fat || 0),
  mealsCount: dailyNutrition?.mealsCount || 0,
};
```

**Fix to**:

```typescript
const storeNutrition = getTodaysConsumedNutrition();
const currentNutrition = {
  calories: storeNutrition.calories,
  protein: storeNutrition.protein,
  carbs: storeNutrition.carbs,
  fat: storeNutrition.fat,
  mealsCount: dailyNutrition?.mealsCount || 0,
};
```

**Must NOT do**:

- Do NOT change how `getTodaysConsumedNutrition()` works
- Do NOT modify `dailyNutrition` fetching
- Do NOT refactor surrounding code
- Do NOT change other Math.max usages in other files

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: `[]` (no special skills needed)
- **Reason**: Simple 4-line change, well-defined scope

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 2)
- **Blocks**: Task 5 (regression)
- **Blocked By**: None

**References**:

- `src/screens/main/DietScreen.tsx:200-207` - Lines to modify
- `src/stores/nutrition/selectors.ts:42-91` - getTodaysConsumedNutrition implementation (read-only reference)
- `src/hooks/useNutritionTracking.ts` - Provides both store and API nutrition

**Acceptance Criteria**:

- [ ] Lines 202-205 no longer contain `Math.max`
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `grep -n "Math.max" src/screens/main/DietScreen.tsx` returns NO matches in lines 200-210

**Agent-Executed QA Scenarios**:

```
Scenario: DietScreen uses store nutrition only
  Tool: Bash (grep + tsc)
  Preconditions: Code changes applied
  Steps:
    1. Run: grep -n "Math.max.*storeNutrition\|Math.max.*calories\|Math.max.*protein" src/screens/main/DietScreen.tsx
    2. Assert: No output (exit code 1, meaning no matches)
    3. Run: npx tsc --noEmit
    4. Assert: Exit code 0
  Expected Result: No Math.max in nutrition section, TypeScript compiles
  Evidence: Command output captured

Scenario: Test covers store-only nutrition display
  Tool: Bash (bun test)
  Preconditions: Test file created at src/screens/main/__tests__/DietScreen.test.tsx
  Steps:
    1. Create test that mocks storeNutrition={calories:500} and dailyNutrition={calories:800}
    2. Assert: displayed calories === 500 (store value, NOT 800)
    3. Run: bun test src/screens/main/__tests__/DietScreen.test.tsx
    4. Assert: Test passes
  Expected Result: Test verifies store value is used
  Evidence: Test output captured
```

**Commit**: YES

- Message: `fix(diet): remove Math.max calorie inflation bug`
- Files: `src/screens/main/DietScreen.tsx`
- Pre-commit: `npx tsc --noEmit`

---

### - [x] 2. Add Workout Progress Hydration from Supabase

**What to do**:

- Modify `loadData()` in fitness store to restore `workoutProgress` from Supabase
- Query `workout_sessions` table for completed workouts
- Rebuild `workoutProgress` object from database records

**Current code** (`src/stores/fitness/dataActions.ts:loadData`):

```typescript
loadData: async () => {
  const plan = await get().loadWeeklyWorkoutPlan();
  if (plan) {
    set({ weeklyWorkoutPlan: plan });
  }
};
```

**Fix to** (add after plan loading):

```typescript
loadData: async () => {
  const plan = await get().loadWeeklyWorkoutPlan();
  if (plan) {
    set({ weeklyWorkoutPlan: plan });
  }

  // Hydrate workoutProgress from Supabase
  try {
    const { data: user } = await supabase.auth.getUser();
    if (user?.user?.id) {
      const { data: completedSessions } = await supabase
        .from("workout_sessions")
        .select("workout_id, completed_at, id, is_completed")
        .eq("user_id", user.user.id)
        .eq("is_completed", true);

      if (completedSessions && completedSessions.length > 0) {
        const restoredProgress: Record<string, WorkoutProgress> = {};
        completedSessions.forEach((session) => {
          restoredProgress[session.workout_id] = {
            workoutId: session.workout_id,
            progress: 100,
            completedAt: session.completed_at,
            sessionId: session.id,
          };
        });
        set({ workoutProgress: restoredProgress });
      }
    }
  } catch (error) {
    console.warn("[fitnessStore] Failed to hydrate workoutProgress:", error);
    // Silently fail - AsyncStorage fallback via persist middleware
  }
};
```

**Must NOT do**:

- Do NOT change `workout_sessions` table schema
- Do NOT modify how workout completion writes to database
- Do NOT create new service classes
- Do NOT change `loadWeeklyWorkoutPlan()` implementation
- Do NOT add hydration for other stores (meal progress, etc.) - separate tickets

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: `[]`
- **Reason**: Single function modification with clear pattern

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 1)
- **Blocks**: Task 4 (streak uses workoutProgress), Task 5
- **Blocked By**: None

**References**:

- `src/stores/fitness/dataActions.ts` - File to modify (loadData function)
- `src/stores/fitness/types.ts:4-9` - WorkoutProgress interface
- `src/stores/fitness/progressActions.ts:27-84` - How workoutProgress is written on completion
- `src/services/crudOperations.ts:116-255` - workout_sessions CRUD operations (table schema reference)

**Acceptance Criteria**:

- [ ] `loadData()` function queries `workout_sessions` table
- [ ] `workoutProgress` is populated with completed sessions
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Test verifies hydration from mocked Supabase response

**Agent-Executed QA Scenarios**:

```
Scenario: loadData restores workoutProgress from database
  Tool: Bash (bun test)
  Preconditions: Test file created at src/stores/fitness/__tests__/dataActions.test.ts
  Steps:
    1. Mock supabase.from('workout_sessions').select() to return:
       [{ workout_id: 'w1', completed_at: '2026-02-06T10:00:00Z', id: 's1', is_completed: true }]
    2. Call loadData()
    3. Assert: get().workoutProgress['w1'].progress === 100
    4. Assert: get().workoutProgress['w1'].workoutId === 'w1'
    5. Run: bun test src/stores/fitness/__tests__/dataActions.test.ts
  Expected Result: workoutProgress hydrated correctly
  Evidence: Test output captured

Scenario: loadData handles empty database gracefully
  Tool: Bash (bun test)
  Preconditions: Same test file
  Steps:
    1. Mock supabase.from().select() to return empty array []
    2. Call loadData()
    3. Assert: get().workoutProgress is empty object {} or unchanged
    4. Assert: No error thrown
  Expected Result: Graceful handling of empty data
  Evidence: Test output captured

Scenario: loadData handles Supabase error gracefully
  Tool: Bash (bun test)
  Preconditions: Same test file
  Steps:
    1. Mock supabase.from().select() to throw Error('Network error')
    2. Call loadData()
    3. Assert: No error propagates
    4. Assert: workoutProgress remains as-is (from AsyncStorage)
  Expected Result: Silent fallback, no crash
  Evidence: Test output captured
```

**Commit**: YES

- Message: `fix(fitness): hydrate workout progress from database on app start`
- Files: `src/stores/fitness/dataActions.ts`
- Pre-commit: `npx tsc --noEmit`

---

### - [x] 3. Dashboard Show Calories Consumed Instead of Meal Count

**What to do**:

- Modify `useHomeLogic.ts` to compute and return `caloriesConsumed` instead of `mealsLogged`
- Update `DailyProgressRings` nutrition label from "Meals" to "Nutrition"
- Change the display format to show calories (e.g., "1500/2000 cal")

**Part A: Modify useHomeLogic.ts**

**Current code** (lines 261-272):

```typescript
const mealsLogged = useMemo(() => {
  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const todaysMeals =
    weeklyMealPlan?.meals?.filter(
      (m: any) => m.dayOfWeek?.toLowerCase() === today,
    ) ||
    dailyMeals ||
    [];
  return todaysMeals.length;
}, [weeklyMealPlan, dailyMeals]);
```

**Fix to**:

```typescript
const caloriesConsumed = useMemo(() => {
  const consumedNutrition = useNutritionStore
    .getState()
    .getTodaysConsumedNutrition();
  return consumedNutrition.calories;
}, [weeklyMealPlan, dailyMeals]); // Keep dependencies to trigger recalculation
```

Also update the hook's return value to return `caloriesConsumed` instead of `mealsLogged`.

**Part B: Update DailyProgressRings.tsx**

**Current** (lines 343-347):

```tsx
<Text style={styles.statLabel}>Meals</Text>
<Text style={styles.statValue}>
  {mealsLogged}
  <Text style={styles.statUnit}>/{mealsGoal}</Text>
</Text>
```

**Fix to**:

```tsx
<Text style={styles.statLabel}>Nutrition</Text>
<Text style={styles.statValue}>
  {mealsLogged}
  <Text style={styles.statUnit}>/{mealsGoal} cal</Text>
</Text>
```

**Part C: Update caller (HomeScreen or wherever DailyProgressRings is used)**

Pass `caloriesConsumed` and `caloriesGoal` instead of `mealsLogged` and `mealsGoal` to the nutrition ring.

**Must NOT do**:

- Do NOT change DailyProgressRings props interface (keep same prop names, just different values)
- Do NOT change how nutrition data is calculated in selectors
- Do NOT add new rings or remove existing rings
- Do NOT change other screens that might use meal count

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: `[]`
- **Reason**: Well-scoped changes across 2-3 files

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 4)
- **Blocks**: Task 5
- **Blocked By**: None (conceptually related to Task 1)

**References**:

- `src/hooks/useHomeLogic.ts:261-272` - mealsLogged calculation to replace
- `src/screens/main/home/DailyProgressRings.tsx:343-347` - Nutrition label to update
- `src/screens/main/home/DailyProgressRings.tsx:45-59` - Props interface (for reference)
- `src/stores/nutrition/selectors.ts:42-91` - getTodaysConsumedNutrition() implementation
- `src/hooks/useUnifiedStats.ts` - Pattern for reading from stores

**Acceptance Criteria**:

- [ ] `useHomeLogic.ts` returns `caloriesConsumed` (not `mealsLogged`)
- [ ] `DailyProgressRings.tsx` shows "Nutrition" label (not "Meals")
- [ ] Display shows calories consumed with "cal" unit suffix
- [ ] `npx tsc --noEmit` passes with 0 errors

**Agent-Executed QA Scenarios**:

```
Scenario: Dashboard shows calories consumed
  Tool: Playwright (playwright skill)
  Preconditions: Dev server running, user logged in with some meals logged
  Steps:
    1. Navigate to: Home/Dashboard screen
    2. Wait for: DailyProgressRings component visible
    3. Locate: nutrition ring section (look for "Nutrition" label)
    4. Assert: Label contains "Nutrition" (not "Meals")
    5. Assert: Value format matches "{number}/{number} cal"
    6. Screenshot: .sisyphus/evidence/task-3-dashboard-nutrition.png
  Expected Result: Nutrition ring shows calories consumed
  Evidence: .sisyphus/evidence/task-3-dashboard-nutrition.png

Scenario: useHomeLogic returns caloriesConsumed
  Tool: Bash (bun test)
  Preconditions: Test file created
  Steps:
    1. Mock nutritionStore.getTodaysConsumedNutrition() to return {calories: 1500}
    2. Call useHomeLogic hook
    3. Assert: returned object contains caloriesConsumed === 1500
    4. Assert: returned object does NOT contain mealsLogged key
  Expected Result: Hook returns calories, not meal count
  Evidence: Test output captured
```

**Commit**: YES

- Message: `fix(dashboard): show calories consumed instead of meal count`
- Files: `src/hooks/useHomeLogic.ts`, `src/screens/main/home/DailyProgressRings.tsx`
- Pre-commit: `npx tsc --noEmit`

---

### - [x] 4. Fix Streak Calculation SSOT - Use Achievement Store

**What to do**:

- Add streak calculation logic to achievement store
- Move "any activity" algorithm from `dataRetrieval.ts` into achievement store
- Call `updateCurrentStreak()` on app start and after activity completion
- Deprecate duplicate streak calculations

**Part A: Add updateCurrentStreak action to achievement store**

**Add to** `src/stores/achievement/actions.ts`:

```typescript
updateCurrentStreak: () => {
  const fitnessStore = useFitnessStore.getState();
  const nutritionStore = useNutritionStore.getState();

  // Collect all completion dates from workouts and meals
  const completionDates = new Set<string>();

  // Add workout completion dates
  Object.values(fitnessStore.workoutProgress).forEach((progress) => {
    if (progress.completedAt) {
      const date = new Date(progress.completedAt).toISOString().split("T")[0];
      completionDates.add(date);
    }
  });

  // Add meal completion dates
  Object.values(nutritionStore.mealProgress).forEach((progress) => {
    if (progress.completedAt) {
      const date = new Date(progress.completedAt).toISOString().split("T")[0];
      completionDates.add(date);
    }
  });

  // Calculate consecutive days streak
  const sortedDates = Array.from(completionDates).sort().reverse();
  const today = new Date().toISOString().split("T")[0];

  let streak = 0;
  let expectedDate = today;

  for (const date of sortedDates) {
    if (date === expectedDate) {
      streak++;
      // Move to previous day
      const prevDate = new Date(expectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      expectedDate = prevDate.toISOString().split("T")[0];
    } else if (date < expectedDate) {
      // Gap found, streak broken
      break;
    }
  }

  set({ currentStreak: streak });
};
```

**Part B: Call updateCurrentStreak on initialization**

Modify `src/stores/achievement/store.ts` or `actions.ts` to call `updateCurrentStreak()` during `initialize()` or `checkProgress()`.

**Part C: Trigger after activity completion**

Modify tracking helpers in `src/stores/achievement/tracking.ts` to call `updateCurrentStreak()` after `workoutCompleted` and `mealLogged`.

**Must NOT do**:

- Do NOT create new service classes (StreakCalculator, etc.)
- Do NOT change streak storage location (keep in achievement store)
- Do NOT modify achievement definitions
- Do NOT change how achievements are unlocked
- Do NOT add timezone handling (use UTC for now, document for future improvement)
- Do NOT migrate existing algorithms immediately - mark as deprecated first

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: `[]`
- **Reason**: Self-contained changes within achievement store

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 3)
- **Blocks**: Task 5
- **Blocked By**: None (conceptually related to Task 2)

**References**:

- `src/stores/achievement/store.ts` - Main achievement store
- `src/stores/achievement/actions.ts` - Where to add updateCurrentStreak
- `src/stores/achievement/state.ts:43` - currentStreak: 0 initial state
- `src/stores/achievement/tracking.ts` - Tracking helpers that trigger on activity
- `src/services/dataRetrieval.ts:255-304` - "Any activity" algorithm to copy from
- `src/services/analytics/streakAnalytics.ts:3-35` - Alternative algorithm (not used)
- `src/stores/fitness/types.ts:4-9` - WorkoutProgress interface

**Acceptance Criteria**:

- [ ] `updateCurrentStreak()` action exists in achievement store
- [ ] Streak is recalculated on store initialization
- [ ] Streak updates after workout/meal completion
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Test verifies streak calculation from mocked activity data

**Agent-Executed QA Scenarios**:

```
Scenario: Streak increments with consecutive days
  Tool: Bash (bun test)
  Preconditions: Test file created at src/stores/achievement/__tests__/streak.test.ts
  Steps:
    1. Mock workoutProgress with completions on 2026-02-06, 2026-02-05, 2026-02-04
    2. Mock mealProgress with completion on 2026-02-03
    3. Set current date to 2026-02-06
    4. Call updateCurrentStreak()
    5. Assert: get().currentStreak === 4
  Expected Result: 4-day streak calculated
  Evidence: Test output captured

Scenario: Streak breaks with gap
  Tool: Bash (bun test)
  Preconditions: Same test file
  Steps:
    1. Mock workoutProgress with completions on 2026-02-06, 2026-02-04 (skip 02-05)
    2. Set current date to 2026-02-06
    3. Call updateCurrentStreak()
    4. Assert: get().currentStreak === 1 (only today counts)
  Expected Result: Streak resets after gap
  Evidence: Test output captured

Scenario: Streak is zero with no activity
  Tool: Bash (bun test)
  Preconditions: Same test file
  Steps:
    1. Mock empty workoutProgress and mealProgress
    2. Call updateCurrentStreak()
    3. Assert: get().currentStreak === 0
  Expected Result: Zero streak for no activity
  Evidence: Test output captured

Scenario: updateCurrentStreak called after workout completion
  Tool: Bash (bun test)
  Preconditions: Same test file
  Steps:
    1. Spy on updateCurrentStreak
    2. Call trackAchievementActivity.workoutCompleted()
    3. Assert: updateCurrentStreak was called
  Expected Result: Streak updates on activity
  Evidence: Test output captured
```

**Commit**: YES

- Message: `fix(achievements): implement streak calculation SSOT`
- Files: `src/stores/achievement/actions.ts`, `src/stores/achievement/tracking.ts`
- Pre-commit: `npx tsc --noEmit`

---

### - [x] 5. Regression Verification and Integration Test

**What to do**:

- Verify all 4 fixes work together
- Ensure no regressions in existing functionality
- Run TypeScript compilation
- Run full test suite

**Must NOT do**:

- Do NOT make code changes (verification only)
- Do NOT fix new issues found (document for separate tickets)

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: `["playwright"]`
- **Reason**: Final verification with browser testing

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (final)
- **Blocks**: None (completion)
- **Blocked By**: Tasks 1, 2, 3, 4

**References**:

- All modified files from Tasks 1-4
- `package.json` - Test scripts

**Acceptance Criteria**:

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No Math.max in DietScreen nutrition calculation
- [ ] loadData() includes workoutProgress hydration
- [ ] Dashboard shows "Nutrition" with calories
- [ ] Achievement store has updateCurrentStreak action

**Agent-Executed QA Scenarios**:

```
Scenario: Full regression verification
  Tool: Bash
  Preconditions: All 4 fixes applied
  Steps:
    1. Run: npx tsc --noEmit
    2. Assert: Exit code 0
    3. Run: grep -rn "Math.max.*storeNutrition" src/screens/main/DietScreen.tsx
    4. Assert: No output
    5. Run: grep -n "workout_sessions" src/stores/fitness/dataActions.ts
    6. Assert: Has matches (hydration added)
    7. Run: grep -n "Nutrition" src/screens/main/home/DailyProgressRings.tsx
    8. Assert: Has matches (label updated)
    9. Run: grep -n "updateCurrentStreak" src/stores/achievement/actions.ts
    10. Assert: Has matches (action exists)
  Expected Result: All 4 fixes verified
  Evidence: Command outputs captured

Scenario: Integration test with Playwright
  Tool: Playwright (playwright skill)
  Preconditions: Dev server running on localhost:8081
  Steps:
    1. Navigate to Home screen
    2. Verify: DailyProgressRings shows "Nutrition" label
    3. Navigate to Diet screen
    4. Verify: Nutrition values display (no obvious inflation)
    5. Navigate to Profile screen
    6. Verify: Streak shows a number (could be 0, but not "undefined")
    7. Screenshot each screen for evidence
  Expected Result: All screens render correctly
  Evidence: Screenshots in .sisyphus/evidence/
```

**Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message                                                             | Files                                   | Verification     |
| ---------- | ------------------------------------------------------------------- | --------------------------------------- | ---------------- |
| 1          | `fix(diet): remove Math.max calorie inflation bug`                  | DietScreen.tsx                          | npx tsc --noEmit |
| 2          | `fix(fitness): hydrate workout progress from database on app start` | dataActions.ts                          | npx tsc --noEmit |
| 3          | `fix(dashboard): show calories consumed instead of meal count`      | useHomeLogic.ts, DailyProgressRings.tsx | npx tsc --noEmit |
| 4          | `fix(achievements): implement streak calculation SSOT`              | actions.ts, tracking.ts                 | npx tsc --noEmit |
| 5          | No commit (verification only)                                       | -                                       | All checks pass  |

---

## Success Criteria

### Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit
# Expected: Exit 0, no errors

# Verify Math.max removed from DietScreen
grep -n "Math.max.*storeNutrition" src/screens/main/DietScreen.tsx
# Expected: No output (exit code 1)

# Verify workout hydration added
grep -n "workout_sessions" src/stores/fitness/dataActions.ts
# Expected: Has matches

# Verify dashboard label changed
grep -n "Nutrition" src/screens/main/home/DailyProgressRings.tsx
# Expected: Has "Nutrition" label

# Verify streak calculation exists
grep -n "updateCurrentStreak" src/stores/achievement/actions.ts
# Expected: Has function definition
```

### Final Checklist

- [ ] DietScreen shows store nutrition only (no inflation)
- [ ] Workout count persists after simulated app restart
- [ ] Dashboard nutrition ring shows calories consumed
- [ ] Streak calculation works correctly
- [ ] TypeScript compiles without errors
- [ ] All test scenarios pass

---

## Notes for Implementation

### Key Patterns to Follow

**For store hydration (Task 2):**

```typescript
// Pattern from existing loadWeeklyWorkoutPlan
try {
  const { data } = await supabase.from("table").select().eq("user_id", userId);
  if (data) {
    set({ stateProperty: transformedData });
  }
} catch (error) {
  console.warn("[store] Failed to hydrate:", error);
  // Silent fallback to AsyncStorage via persist middleware
}
```

**For streak calculation (Task 4):**

```typescript
// Use ISO date strings for comparison (UTC)
const date = new Date(timestamp).toISOString().split("T")[0]; // "2026-02-06"
```

**For reading from multiple stores:**

```typescript
// Pattern from useUnifiedStats.ts
const fitnessStore = useFitnessStore.getState();
const nutritionStore = useNutritionStore.getState();
```

### Import statements to add

**Task 2 - dataActions.ts:**

```typescript
import { supabase } from "@/services/supabase";
import { WorkoutProgress } from "./types";
```

**Task 4 - actions.ts:**

```typescript
import { useFitnessStore } from "@/stores/fitness";
import { useNutritionStore } from "@/stores/nutritionStore";
```
