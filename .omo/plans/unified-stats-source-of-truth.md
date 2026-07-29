# Unified Stats Source of Truth

## TL;DR

> **Quick Summary**: Fix Profile screen showing 0 stats by creating a unified `useUnifiedStats()` hook that reads from actual data stores (healthDataStore, achievementStore) instead of the hardcoded zeros in userStore.profile.stats.
>
> **Deliverables**:
>
> - New `src/hooks/useUnifiedStats.ts` hook as single source of truth
> - Updated Profile screen to use unified hook
> - Home screen verified unchanged (regression test)
> - Removed hardcoded zeros in mappers.ts
>
> **Estimated Effort**: Medium (2-4 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 5

---

## Context

### Original Request

User observed that Home screen displays real health data (Move: 1775 cal, Steps: 6,048 from Google Fit) while Profile screen shows all zeros (Workouts: 0, Calories: 0, Best Streak: 0, Achievements: 0). User wants a single source of truth for stats - no duplicate logic, no ambiguity.

### Interview Summary

**Key Findings**:

- **Home Screen Data Flow**: `useHomeLogic.ts` → `useHealthDataStore` → `healthMetrics` (steps, totalCalories, activeCalories)
- **Home Screen Streak**: `useAchievementStore` → `currentStreak`
- **Profile Screen Data Flow**: `useProfileLogic.ts` → `useUserStats()` → `profile.stats` from `userStore`
- **Root Cause**: `mapDatabaseProfileToUserProfile()` in `mappers.ts:77-82` hardcodes all stats to 0
- **No Update Mechanism**: There's no code that ever updates `profile.stats` with real values

**Research Findings**:

- `healthDataStore.metrics` contains: `steps`, `activeCalories`, `totalCalories`, `heartRate`, `distance`, etc.
- `achievementStore` contains: `currentStreak` (stored), `userAchievements` Map, `totalFitCoinsEarned`
- `longestStreak` is CALCULATED via `calculateWorkoutStreaks()` in `streakAnalytics.ts` - not stored in achievementStore
- Home uses `realCaloriesBurned = healthMetrics.totalCalories || healthMetrics.activeCalories` pattern

### Metis Review

**Identified Gaps (addressed)**:

- **Data Source Authority**: Will use healthDataStore as primary, matching Home screen pattern
- **Workout Count**: Will use DataRetrievalService.getTotalWorkoutsCompleted() or calculate from fitnessStore
- **Longest Streak**: Calculate dynamically using existing `calculateWorkoutStreaks()` function
- **Loading State**: Show 0 with graceful degradation (same as current behavior, just with real data)
- **profile.stats Future**: Leave as-is (unused but not breaking)

---

## Work Objectives

### Core Objective

Create a single `useUnifiedStats()` hook that aggregates real fitness stats from existing stores, replacing the hardcoded zeros in Profile screen.

### Concrete Deliverables

- `src/hooks/useUnifiedStats.ts` - New unified stats hook
- `src/hooks/useProfileLogic.ts` - Updated to use unified hook
- `src/services/user-profile/mappers.ts` - Remove hardcoded stats (or leave for backward compat)
- Unit tests for new hook

### Definition of Done

- [x] Profile screen displays same calorie value as Home screen (e.g., 1775)
- [x] Profile screen displays same streak value as Home screen
- [x] Profile screen displays steps matching healthDataStore.metrics.steps
- [x] Home screen behavior UNCHANGED (regression verified)
- [x] No TypeScript errors
- [x] No crashes when stores are empty (new user scenario)

### Must Have

- Unified hook reads from: healthDataStore, achievementStore
- Null-safe with fallback to 0 for all values
- Reactive updates when stores change (standard Zustand observer)
- Profile screen uses new hook

### Must NOT Have (Guardrails)

- ❌ NO modifications to Home screen data fetching or effects
- ❌ NO changes to healthDataStore, achievementStore, or userStore schema
- ❌ NO database field changes or sync logic modifications
- ❌ NO new data fetching triggers in Profile screen
- ❌ NO "refresh button", "sync settings", or additional UI features
- ❌ NO performance optimizations unless proven slow
- ❌ NO error boundaries or elaborate retry logic

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (bun test exists in project)
- **Automated tests**: Tests-after (write tests after implementation)
- **Framework**: bun test / vitest

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type           | Tool       | How Agent Verifies                     |
| -------------- | ---------- | -------------------------------------- |
| **Profile UI** | Playwright | Navigate, read stat values, assert > 0 |
| **Hook Logic** | bun test   | Unit test with mocked stores           |
| **Regression** | bun test   | Run existing Home tests, verify pass   |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Find all profile.stats references (discovery)
└── Task 3: Write baseline Home screen test (if not exists)

Wave 2 (After Wave 1):
├── Task 2: Create useUnifiedStats hook
└── Task 4: Update ProfileScreen to use hook

Wave 3 (After Wave 2):
└── Task 5: Verify and regression test
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 2      | 3                    |
| 2    | 1          | 4, 5   | 3                    |
| 3    | None       | 5      | 1                    |
| 4    | 2          | 5      | None                 |
| 5    | 2, 3, 4    | None   | None (final)         |

---

## TODOs

### Task 1: Audit profile.stats References

- [x] 1. Audit profile.stats References

  **What to do**:
  - Run `lsp_find_references` on `profile.stats` in useUser.ts
  - Run `grep` for "profile.stats", "profile?.stats", "userStats" across codebase
  - Document all files that read profile.stats
  - Identify if any code DEPENDS on stats being 0 (conditional logic)

  **Must NOT do**:
  - Modify any files during audit
  - Make assumptions - verify with actual search

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple discovery task, read-only searches
  - **Skills**: [`git-master`]
    - `git-master`: May need to check git history for any recent changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: Task 2 (need to know dependencies before creating hook)
  - **Blocked By**: None

  **References**:
  - `src/hooks/useUser.ts:196-209` - useUserStats hook definition (returns profile.stats values)
  - `src/hooks/useProfileLogic.ts:12` - Calls useUserStats()
  - `src/screens/main/ProfileScreen.tsx:108-114` - Consumes userStats
  - `src/services/user-profile/mappers.ts:77-82` - Hardcoded zeros source

  **Acceptance Criteria**:
  - [ ] List of all files referencing profile.stats documented
  - [ ] Confirmation: Only ProfileScreen uses these values (or list exceptions)
  - [ ] No code relies on values BEING zero (conditional checks)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Find all profile.stats references
    Tool: Bash (grep + lsp_find_references)
    Preconditions: Project codebase accessible
    Steps:
      1. grep -r "profile\.stats" src/ --include="*.ts" --include="*.tsx"
      2. grep -r "userStats\." src/ --include="*.ts" --include="*.tsx"
      3. Document results in markdown format
    Expected Result: Complete list of all files and line numbers
    Evidence: Search output captured
  ```

  **Commit**: NO (discovery only)

---

### Task 2: Create useUnifiedStats Hook

- [x] 2. Create useUnifiedStats Hook

  **What to do**:
  - Create new file `src/hooks/useUnifiedStats.ts`
  - Import from: `useHealthDataStore`, `useAchievementStore`, `useFitnessStore`
  - Aggregate stats following Home screen patterns:

    ```typescript
    export const useUnifiedStats = () => {
      // Calories: match Home's realCaloriesBurned logic
      const healthMetrics = useHealthDataStore((state) => state.metrics);
      const totalCaloriesBurned = healthMetrics?.totalCalories || healthMetrics?.activeCalories || 0;

      // Steps
      const steps = healthMetrics?.steps || 0;

      // Streak: from achievementStore (same as Home)
      const currentStreak = useAchievementStore((state) => state.currentStreak) || 0;

      // Longest streak: calculate from analytics or use a reasonable default
      // Note: achievementStore doesn't store longestStreak, need to calculate
      const longestStreak = currentStreak; // Fallback: at minimum it's current streak

      // Workouts: from fitnessStore or DataRetrievalService
      const totalWorkouts = // TODO: verify source

      // Achievements: from achievementStore.userAchievements size
      const userAchievements = useAchievementStore((state) => state.userAchievements);
      const achievements = userAchievements?.size || 0;

      return {
        totalCaloriesBurned,
        steps,
        currentStreak,
        longestStreak,
        totalWorkouts,
        achievements,
      };
    };
    ```

  - Add TypeScript types matching ProfileStats interface
  - Ensure null-safety with fallback to 0

  **Must NOT do**:
  - Add any data fetching logic (stores should already have data)
  - Create new stores or modify existing store schemas
  - Add refresh/sync functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward hook creation, pattern already exists in Home
  - **Skills**: []
    - No special skills needed, standard React/Zustand patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 1)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1

  **References**:
  - `src/hooks/useHomeLogic.ts:37-47` - How Home accesses healthDataStore and achievementStore
  - `src/hooks/useHomeLogic.ts:189-204` - realCaloriesBurned calculation pattern (COPY THIS)
  - `src/stores/health-data/store.ts` - healthDataStore structure
  - `src/stores/achievement/store.ts` - achievementStore structure, has currentStreak
  - `src/stores/achievement/state.ts:43` - currentStreak initial state
  - `src/services/analytics/streakAnalytics.ts` - calculateWorkoutStreaks() for longestStreak
  - `src/screens/main/profile/ProfileStats.tsx:31-38` - Expected props interface

  **Acceptance Criteria**:
  - [ ] File created: src/hooks/useUnifiedStats.ts
  - [ ] Hook exports: totalCaloriesBurned, steps, currentStreak, longestStreak, totalWorkouts, achievements
  - [ ] TypeScript compiles without errors: `npx tsc --noEmit`
  - [ ] All values default to 0 when stores are empty/undefined

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: Hook file created
    Steps:
      1. npx tsc --noEmit
      2. Assert: Exit code 0
      3. Assert: No errors related to useUnifiedStats.ts
    Expected Result: Clean compilation
    Evidence: Command output captured

  Scenario: Hook file structure correct
    Tool: Bash (grep/cat)
    Preconditions: Hook file exists
    Steps:
      1. cat src/hooks/useUnifiedStats.ts
      2. Assert: Contains "export const useUnifiedStats"
      3. Assert: Contains "useHealthDataStore"
      4. Assert: Contains "useAchievementStore"
      5. Assert: Contains "totalCaloriesBurned"
    Expected Result: All expected patterns present
    Evidence: File content captured
  ```

  **Commit**: YES
  - Message: `feat(hooks): add useUnifiedStats for single source of truth stats`
  - Files: `src/hooks/useUnifiedStats.ts`
  - Pre-commit: `npx tsc --noEmit`

---

### Task 3: Create/Verify Home Screen Baseline Test

- [x] 3. Create/Verify Home Screen Baseline Test

  **What to do**:
  - Check if Home screen tests exist: `src/screens/main/HomeScreen.test.tsx`
  - If exists: Run and capture baseline output
  - If not exists: Create minimal regression test that verifies:
    - Home screen renders without crashing
    - DailyProgressRings component receives proper props
    - Calories and steps values are rendered

  **Must NOT do**:
  - Modify Home screen implementation
  - Add comprehensive test coverage (only baseline for regression)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple test creation, well-defined scope
  - **Skills**: []
    - Standard testing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 5 (regression comparison)
  - **Blocked By**: None

  **References**:
  - `src/screens/main/HomeScreen.tsx` - Component to test
  - `src/hooks/useHomeLogic.ts` - Logic hook to mock
  - `src/screens/main/home/DailyProgressRings.tsx` - Key child component

  **Acceptance Criteria**:
  - [ ] Test file exists: `src/screens/main/__tests__/HomeScreen.test.tsx` or similar
  - [ ] Test passes: `bun test HomeScreen`
  - [ ] Test verifies DailyProgressRings renders with calories > 0

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Home screen test exists and passes
    Tool: Bash
    Preconditions: Test file created or exists
    Steps:
      1. bun test --grep "HomeScreen" --reporter=verbose
      2. Assert: Exit code 0
      3. Assert: All tests pass
    Expected Result: Tests pass, baseline established
    Evidence: Test output captured
  ```

  **Commit**: YES (only if new tests created)
  - Message: `test(home): add baseline regression test for HomeScreen`
  - Files: `src/screens/main/__tests__/HomeScreen.test.tsx`
  - Pre-commit: `bun test HomeScreen`

---

### Task 4: Update Profile Screen to Use Unified Hook

- [x] 4. Update Profile Screen to Use Unified Hook

  **What to do**:
  - Modify `src/hooks/useProfileLogic.ts`:
    - Import `useUnifiedStats` instead of (or alongside) `useUserStats`
    - Use unified stats for: currentStreak, totalWorkouts, totalCaloriesBurned, longestStreak, achievements
  - Ensure ProfileScreen.tsx receives real values via useProfileLogic

  **Implementation**:

  ```typescript
  // In useProfileLogic.ts
  import { useUnifiedStats } from "./useUnifiedStats";

  export const useProfileLogic = () => {
    // ... existing code ...
    const unifiedStats = useUnifiedStats();

    // Replace userStats with unifiedStats for the stats display
    return {
      // ... existing returns ...
      userStats: unifiedStats, // Or merge with existing userStats
    };
  };
  ```

  **Must NOT do**:
  - Change ProfileStats component props interface
  - Add loading states or complex error handling
  - Modify other Profile screen features

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small targeted change, clear pattern
  - **Skills**: []
    - Standard React patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 2)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - `src/hooks/useProfileLogic.ts:5,12` - Current useUserStats import and usage
  - `src/hooks/useProfileLogic.ts:300` - Return object structure
  - `src/screens/main/ProfileScreen.tsx:108-114` - How ProfileStats receives props
  - `src/hooks/useUnifiedStats.ts` - New hook (created in Task 2)

  **Acceptance Criteria**:
  - [ ] useProfileLogic.ts imports useUnifiedStats
  - [ ] userStats returned includes real values from unified hook
  - [ ] TypeScript compiles: `npx tsc --noEmit`
  - [ ] Profile screen renders without errors

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Profile screen displays real calories
    Tool: Playwright (playwright skill)
    Preconditions: App running on localhost, Google Fit data synced
    Steps:
      1. Navigate to: Profile tab
      2. Wait for: ProfileStats section visible (timeout: 10s)
      3. Find: Calories stat card
      4. Assert: Value is NOT "0" (should match Home screen value)
      5. Screenshot: .sisyphus/evidence/task-4-profile-calories.png
    Expected Result: Calories value > 0
    Evidence: .sisyphus/evidence/task-4-profile-calories.png

  Scenario: Profile screen displays real streak
    Tool: Playwright
    Preconditions: App running, user has streak
    Steps:
      1. Navigate to: Profile tab
      2. Find: Day Streak stat card
      3. Assert: Value matches achievementStore.currentStreak
      4. Screenshot: .sisyphus/evidence/task-4-profile-streak.png
    Expected Result: Streak displays correctly
    Evidence: .sisyphus/evidence/task-4-profile-streak.png
  ```

  **Commit**: YES
  - Message: `fix(profile): use unified stats hook for real-time data display`
  - Files: `src/hooks/useProfileLogic.ts`
  - Pre-commit: `npx tsc --noEmit`

---

### Task 5: Verify and Regression Test

- [x] 5. Verify and Regression Test

  **What to do**:
  - Run full test suite to ensure no regressions
  - Verify Home screen displays same values as before
  - Verify Profile screen now displays real values
  - Test empty store scenario (new user with no data)

  **Must NOT do**:
  - Fix unrelated test failures
  - Add new features or enhancements

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification task, running existing tests
  - **Skills**: [`playwright`]
    - `playwright`: For E2E verification of both screens

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2, 3, 4

  **References**:
  - Task 3 baseline test output for comparison
  - `src/screens/main/HomeScreen.tsx` - Home for regression
  - `src/screens/main/ProfileScreen.tsx` - Profile for verification

  **Acceptance Criteria**:
  - [ ] `bun test` passes with no new failures
  - [ ] Home screen calories value unchanged from baseline
  - [ ] Profile screen calories value matches Home screen calories value
  - [ ] Profile screen streak value > 0 (or matches user's actual streak)
  - [ ] No TypeScript errors: `npx tsc --noEmit`
  - [ ] No console errors when Profile screen loads

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Home screen unchanged (regression)
    Tool: Bash + Playwright
    Preconditions: All changes applied
    Steps:
      1. bun test --grep "HomeScreen"
      2. Assert: All tests pass
      3. Compare output with Task 3 baseline
      4. Assert: Same calories/steps values rendered
    Expected Result: Home behavior identical to baseline
    Evidence: Test output comparison

  Scenario: Profile and Home show consistent data
    Tool: Playwright
    Preconditions: App running with Google Fit data
    Steps:
      1. Navigate to Home tab
      2. Capture: Move calories value (e.g., 1775)
      3. Navigate to Profile tab
      4. Find: Calories stat card value
      5. Assert: Profile calories === Home calories
      6. Screenshot: .sisyphus/evidence/task-5-consistency.png
    Expected Result: Both screens show same calorie value
    Evidence: .sisyphus/evidence/task-5-consistency.png

  Scenario: Empty store graceful degradation
    Tool: bun test
    Preconditions: Mock stores with empty/undefined data
    Steps:
      1. Create test case mocking empty healthDataStore
      2. Call useUnifiedStats()
      3. Assert: Returns { totalCaloriesBurned: 0, steps: 0, currentStreak: 0, ... }
      4. Assert: No crashes or undefined errors
    Expected Result: All values default to 0
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(stats): verify unified stats source of truth works correctly`
  - Files: Test files if any added
  - Pre-commit: `bun test`

---

## Commit Strategy

| After Task | Message                                                             | Files                          | Verification          |
| ---------- | ------------------------------------------------------------------- | ------------------------------ | --------------------- |
| 2          | `feat(hooks): add useUnifiedStats for single source of truth stats` | `src/hooks/useUnifiedStats.ts` | `npx tsc --noEmit`    |
| 3          | `test(home): add baseline regression test for HomeScreen`           | Test file                      | `bun test HomeScreen` |
| 4          | `fix(profile): use unified stats hook for real-time data display`   | `src/hooks/useProfileLogic.ts` | `npx tsc --noEmit`    |
| 5          | `test(stats): verify unified stats source of truth works correctly` | Test files                     | `bun test`            |

---

## Success Criteria

### Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit
# Expected: Exit 0, no errors

# Run all tests
bun test
# Expected: All tests pass

# Specific test for new hook
bun test useUnifiedStats
# Expected: Pass

# Home regression
bun test HomeScreen
# Expected: Same results as baseline
```

### Final Checklist

- [x] All "Must Have" present:
  - [x] Unified hook created
  - [x] Profile uses unified hook
  - [x] Home unchanged
  - [x] Null-safe defaults
- [x] All "Must NOT Have" absent:
  - [x] No Home screen modifications
  - [x] No store schema changes
  - [x] No database changes
  - [x] No new data fetching
- [x] All tests pass
- [x] Profile screen shows same calories as Home screen (1775)
- [x] Profile screen shows same steps as Home screen (6,048)
- [x] Profile screen shows real streak value

---

## Notes for Executor

### Key Patterns to Follow

From `useHomeLogic.ts:189-204`, the calories calculation:

```typescript
const realCaloriesBurned = useMemo(() => {
  if (wearableConnected) {
    if (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0) {
      return healthMetrics.totalCalories;
    }
    if (healthMetrics?.activeCalories && healthMetrics.activeCalories > 0) {
      return healthMetrics.activeCalories;
    }
  }
  return appCaloriesBurned;
}, [
  wearableConnected,
  healthMetrics?.totalCalories,
  healthMetrics?.activeCalories,
  appCaloriesBurned,
]);
```

### Store Access Patterns

From `useHomeLogic.ts:37`:

```typescript
const { currentStreak: achievementStreak } = useAchievementStore();
```

### Important Discovery

- `longestStreak` is NOT stored in achievementStore (only `currentStreak`)
- `longestStreak` must be calculated via `calculateWorkoutStreaks()` in `src/services/analytics/streakAnalytics.ts`
- For simplicity, initial implementation can use `currentStreak` as minimum value for `longestStreak`
