# Fix Workout Session: Next Button Stuck + Progressive Exercise Flow

## TL;DR

> **Quick Summary**: Fix two bugs in the workout session — (1) "Next Exercise" button stays disabled even after all sets are green-checked due to a toggle bug + stale closure, and (2) redesign ExerciseCard from "all sets visible at once" to a progressive single-set flow: Start → Do Exercise → Log Weight/Reps → Rest Timer → Next Set.
> 
> **Deliverables**:
> - Fixed `useWorkoutSession.ts` — idempotent set completion, no toggle regression
> - Fixed `WorkoutSessionScreen.tsx` — no stale re-read of `currentProgress` after setState
> - Redesigned `ExerciseCard.tsx` — progressive single-set reveal with Start/Complete states
> - Removed duplicate rest timer from `WorkoutSessionScreen.tsx` (ExerciseCard handles rest internally)
> - Regression tests for the toggle/completion bug
> - Unit tests for the new progressive ExerciseCard flow
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request
User reported two bugs:
1. After completing all sets (all checkmarks green), the "Next Exercise" button remains grayed out/disabled — cannot advance to the next exercise.
2. The exercise flow is wrong — currently all sets with weight/reps inputs appear immediately. User wants: Start → Do Exercise (timer for timed, Start/Complete for rep-based) → Log Weight/Reps → ✓ → Rest Timer → Next Set (progressive single-set reveal).

### Interview Summary
**Key Discussions**:
- **Flow A confirmed**: Start → Do Exercise → Log Weight/Reps → ✓ → Rest → Next Set
- **Timer for timed exercises, Start/Complete for rep-based**: Detect via `parseDurationFromReps` (existing logic)
- **Progressive reveal**: One set at a time, not all sets visible. Previous completed sets shown as compact summary.
- **Fix both bugs together**: Not one at a time.
- **Tests**: Include automated tests for the new flow.

**Research Findings**:
- **Root cause of Bug 1**: `useWorkoutSession.ts:158` uses `!updated.completedSets[setIndex]` (toggle) — double-tap or race unchecks the set. Plus `WorkoutSessionScreen.tsx:220-221` re-reads `session.currentProgress.completedSets` after `session.handleSetComplete` but the state hasn't re-rendered yet (stale closure).
- **ExerciseCard has TWO files**: `src/features/workouts/components/ExerciseCard.tsx` (ACTIVE, used by WorkoutSessionScreen) and `src/components/workout/ExerciseCard.tsx` (LEGACY, unused). Only modify the active one.
- **Two rest timer systems exist**: `WorkoutTimer` overlay (from `useWorkoutSession.isRestTime`) and `RestTimer` component (from `restTimerEndTime`). The ExerciseCard redesign will handle rest internally — must disable the duplicate trigger in WorkoutSessionScreen.
- **ExerciseCard internal state (`setRows`) is separate from hook state (`exerciseProgress`)** — ExerciseCard sets `completed: true` (no toggle) but hook toggles. This mismatch is part of Bug 1.

### Metis Review
**Identified Gaps** (addressed):
- **Stale closure**: `WorkoutSessionScreen.handleSetComplete` reads `session.currentProgress.completedSets.every(Boolean)` after calling `session.handleSetComplete` — state hasn't re-rendered. Fixed by having `handleSetComplete` return `allSetsCompleted` via callback.
- **Toggle vs idempotent**: `useWorkoutSession.ts:158` must be `= true`, not `= !value`.
- **Duplicate rest timer**: WorkoutSessionScreen lines 211-218 fire a rest timer AND the new ExerciseCard will fire its own. Must remove the one in WorkoutSessionScreen.
- **Preserve existing integrations**: `exerciseHistoryService`, `progressionService`, `prDetectionService`, `SetCompletionData` interface — all must stay intact.
- **Legacy ExerciseCard**: Don't touch `src/components/workout/ExerciseCard.tsx` — mark as deprecated only.
- **Previous session data + set type cycling + PR detection**: All survive in the redesigned card.

---

## Work Objectives

### Core Objective
Fix the Next Exercise button stuck-disabled bug and redesign the exercise card to a progressive single-set-reveal flow with Start → Do → Log → Rest → Next Set.

### Concrete Deliverables
- `src/hooks/useWorkoutSession.ts` — idempotent completion, callback-based `allSetsCompleted` notification
- `src/screens/workout/WorkoutSessionScreen.tsx` — use callback for allSetsCompleted, remove duplicate rest timer trigger
- `src/features/workouts/components/ExerciseCard.tsx` — progressive single-set reveal UI
- `src/__tests__/hooks/useWorkoutSession.test.ts` — new regression tests
- `src/__tests__/features/workouts/ExerciseCard.test.tsx` — updated tests for progressive flow

### Definition of Done
- [ ] All sets completed → "Next Exercise" button is enabled (never stuck disabled)
- [ ] Double-tap on checkmark does NOT uncheck a set
- [ ] Exercise shows one set at a time with Start → Do → Log → Rest flow
- [ ] Rep-based exercises show Start/Complete buttons
- [ ] Timed exercises show countdown timer
- [ ] After logging weight/reps and confirming, rest timer starts
- [ ] After rest (or skip), next set appears
- [ ] After all sets done, Next Exercise button becomes enabled
- [ ] `bun test` passes with zero failures

### Must Have
- Idempotent set completion (no toggle)
- Progressive single-set reveal
- Rest timer between sets (skip-able)
- Previous session data visible for reference
- Set type cycling (normal/warmup/failure/drop) preserved
- PR detection preserved
- Weight pre-fill from progression service preserved

### Must NOT Have (Guardrails)
- Do NOT modify `src/components/workout/ExerciseCard.tsx` (legacy file)
- Do NOT change `WorkoutNavigation.tsx`, `WorkoutHeader.tsx`, `WorkoutProgressBar.tsx`
- Do NOT change between-exercise navigation (goToNext/goToPrev)
- Do NOT modify achievement tracking, deload detection, or calorie calculation logic
- Do NOT change `SetCompletionData` interface
- Do NOT touch `fitnessStore.updateSetData` or `exerciseHistoryService` service layer
- Do NOT add excessive comments or over-abstract — keep changes minimal and focused

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (bun test, jest, @testing-library/react-native)
- **Automated tests**: Tests-after (write implementation, then tests — existing test patterns in `src/__tests__/`)
- **Framework**: bun test (jest-compatible)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Hook logic**: Use Bash (`bun test`) — Run specific test files, assert pass/fail
- **Component UI**: Use Bash (`bun test`) — Render tests with @testing-library/react-native

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — bug fix foundation):
├── Task 1: Fix toggle bug + stale closure in useWorkoutSession.ts [quick]
└── Task 2: Fix stale re-read + remove duplicate rest timer in WorkoutSessionScreen.tsx [quick]

Wave 2 (After Wave 1 — core redesign):
└── Task 3: Refactor ExerciseCard to progressive single-set reveal [deep]

Wave 3 (After Wave 2 — tests + verification):
├── Task 4: Write regression tests for useWorkoutSession hook [quick]
├── Task 5: Write/update tests for progressive ExerciseCard [quick]
└── Task 6: Integration verification — run full suite [quick]

Critical Path: Task 1 → Task 3 → Task 5 → Task 6
Parallel Speedup: ~40% faster than sequential
Max Concurrent: 2 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2, 3, 4 |
| 2 | 1 | 3 |
| 3 | 1, 2 | 5, 6 |
| 4 | 1 | 6 |
| 5 | 3 | 6 |
| 6 | 4, 5 | — |

### Agent Dispatch Summary

- **Wave 1**: **2 tasks** — T1 → `quick`, T2 → `quick`
- **Wave 2**: **1 task** — T3 → `deep`
- **Wave 3**: **3 tasks** — T4 → `quick`, T5 → `quick`, T6 → `quick`

---

## TODOs

- [ ] 1. Fix toggle bug + stale closure in useWorkoutSession.ts

  **What to do**:
  - In `src/hooks/useWorkoutSession.ts` line 158: change `updated.completedSets[setIndex] = !updated.completedSets[setIndex]` to `updated.completedSets[setIndex] = true` — make set completion idempotent (never toggles back to false)
  - Make `handleSetComplete` accept an optional `onAllSetsCompleted` callback parameter. Inside the function, after computing `allSetsCompleted` at line 160, if `allSetsCompleted === true`, call `onAllSetsCompleted?.()` BEFORE calling `setExerciseProgress`. This gives callers a synchronous notification that all sets are done, avoiding stale closure issues.
  - Update the return signature: `handleSetComplete` should be `async (setIndex: number, onMilestone?: (pct: number) => void, onAllSetsCompleted?: () => void) => void`
  - The internal rest timer trigger at lines 192-197 (`setIsRestTime(true)`) should remain — this is the hook-level rest. It will be removed from WorkoutSessionScreen in Task 2.

  **Must NOT do**:
  - Do NOT change the `ExerciseProgress` interface
  - Do NOT change `goToNextExercise`, `goToPreviousExercise`, `completeSetAfterTimer`, `completeSetFromSession`
  - Do NOT touch calorie calculation or workoutStats

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None

  **References**:
  - `src/hooks/useWorkoutSession.ts:144-229` — The `handleSetComplete` function. Line 158 is the toggle bug. Line 160-161 computes `allSetsCompleted` and sets `isCompleted`. Lines 192-197 trigger rest timer.
  - `src/hooks/useWorkoutSession.ts:248-260` — `completeSetAfterTimer` calls `handleSetComplete(nextIncompleteIndex)` — must also pass through the new callback param
  - `src/hooks/useWorkoutSession.ts:262-274` — `completeSetFromSession` same pattern
  - `src/hooks/useWorkoutSession.ts:65-72` — `currentProgress` useMemo — this is what feeds `canAdvance`. After the fix, `isCompleted` will correctly be `true` when all sets are done.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Idempotent set completion — double-tap stays completed
    Tool: Bash (bun test)
    Preconditions: Fresh test environment
    Steps:
      1. Run `bun test src/__tests__/hooks/useWorkoutSession.test.ts`
      2. Verify test "double-tap checkmark keeps set completed" passes
    Expected Result: All tests pass, 0 failures
    Failure Indicators: Test fails with "expected true, received false"
    Evidence: .sisyphus/evidence/task-1-idempotent-set.txt

  Scenario: All sets completed → isCompleted is true
    Tool: Bash (bun test)
    Preconditions: Fresh test environment
    Steps:
      1. Run `bun test src/__tests__/hooks/useWorkoutSession.test.ts`
      2. Verify test "all sets completed sets isCompleted to true" passes
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-1-all-sets-complete.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `fix(workout): make set completion idempotent and remove stale closure`
  - Files: `src/hooks/useWorkoutSession.ts`

- [ ] 2. Fix stale re-read + remove duplicate rest timer in WorkoutSessionScreen.tsx

  **What to do**:
  - In `src/screens/workout/WorkoutSessionScreen.tsx` lines 197-244, the `handleSetComplete` callback:
    1. Replace the stale re-read at lines 220-221 (`session.currentProgress.completedSets.every(Boolean)`) with an `onAllSetsCompleted` callback passed into `session.handleSetComplete`. Move the achievement tracking for exercise completion (lines 223-232) into that callback.
    2. Remove the duplicate rest timer trigger at lines 211-218. The ExerciseCard redesign (Task 3) will handle rest internally. Remove the block:
       ```
       const restTimerEnabled = useFitnessStore.getState().restTimerEnabled;
       if (restTimerEnabled) {
         session.setIsRestTime(false);
         const restSecs = safeNumber(session.currentExercise.restTime, 60);
         if (restSecs > 0) {
           setRestTimerEndTime(startTimer(restSecs));
         }
       }
       ```
    3. Keep the set-level achievement tracking at lines 233-242 (the `else` branch) — it fires per-set, not per-exercise.
  - The `allSetsCompleted` check and exercise-level achievement tracking moves INTO the `onAllSetsCompleted` callback:
    ```typescript
    await session.handleSetComplete(setIndex, async (percentage) => {
      await achievements.trackMilestone(...);
    }, async () => {
      // Called when ALL sets are completed
      await achievements.trackExerciseCompletion(...);
    });
    ```

  **Must NOT do**:
  - Do NOT change `completeWorkout`, `goToNextExercise`, `goToPreviousExercise`, `exitWorkout`
  - Do NOT change `WorkoutNavigation` props or `ExerciseCard` props (yet — that's Task 3)
  - Do NOT remove the `RestTimer` component rendering at lines 678-682 — that overlay is still used for between-set rest; Task 3 may repurpose it

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, but depends on Task 1's new callback signature)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/screens/workout/WorkoutSessionScreen.tsx:197-244` — The `handleSetComplete` wrapper. Lines 211-218 = duplicate rest timer. Lines 220-221 = stale re-read. Lines 223-242 = achievement tracking split.
  - `src/screens/workout/WorkoutSessionScreen.tsx:678-682` — RestTimer component rendering (keep)
  - `src/screens/workout/WorkoutSessionScreen.tsx:648` — `canAdvance={session.currentProgress.isCompleted}` — this is what's stuck. After Task 1 fix, `isCompleted` will correctly flip to `true`.
  - `src/stores/fitnessStore.ts` — `restTimerEnabled` flag referenced at line 211

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No stale closure — exercise achievement fires on last set
    Tool: Bash (bun test)
    Preconditions: Task 1 complete
    Steps:
      1. Run `bun test src/__tests__/features/workouts/` 
      2. Verify no test regressions
    Expected Result: All existing tests pass
    Evidence: .sisyphus/evidence/task-2-no-stale-closure.txt

  Scenario: No duplicate rest timer — only one rest fires per set
    Tool: Bash (grep)
    Preconditions: Code changes applied
    Steps:
      1. Grep `WorkoutSessionScreen.tsx` for `setRestTimerEndTime(startTimer` — should have 0 matches
      2. Grep `WorkoutSessionScreen.tsx` for `restTimerEnabled` — should have 0 matches
    Expected Result: Both greps return 0 matches — duplicate rest timer code is removed
    Evidence: .sisyphus/evidence/task-2-no-duplicate-rest.txt
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `fix(workout): make set completion idempotent and remove stale closure`
  - Files: `src/screens/workout/WorkoutSessionScreen.tsx`

---

## Final Verification Wave

> Run `bun test` across all relevant test files. Verify zero regressions.

- [ ] F1. **Full Test Suite** — `quick`
  Run `bun test` — verify ALL tests pass including new ones.

- [ ] F2. **Scope Fidelity Check** — `quick`
  Verify: only the 3 target files were changed (`useWorkoutSession.ts`, `WorkoutSessionScreen.tsx`, `ExerciseCard.tsx`) plus test files. No scope creep.

---

## Commit Strategy

- **Commit 1** (after Wave 1): `fix(workout): make set completion idempotent and remove stale closure in workout session`
  - Files: `src/hooks/useWorkoutSession.ts`, `src/screens/workout/WorkoutSessionScreen.tsx`
  - Pre-commit: `bun test src/__tests__/hooks/ src/__tests__/features/workouts/`

- **Commit 2** (after Wave 2): `feat(workout): redesign exercise card to progressive single-set reveal flow`
  - Files: `src/features/workouts/components/ExerciseCard.tsx`
  - Pre-commit: `bun test src/__tests__/features/workouts/ExerciseCard.test.tsx`

- **Commit 3** (after Wave 3): `test(workout): add regression tests for set completion and progressive flow`
  - Files: `src/__tests__/hooks/useWorkoutSession.test.ts`, `src/__tests__/features/workouts/ExerciseCard.test.tsx`
  - Pre-commit: `bun test`

---

## Success Criteria

### Verification Commands
```bash
bun test src/__tests__/hooks/useWorkoutSession.test.ts  # Expected: all pass
bun test src/__tests__/features/workouts/ExerciseCard.test.tsx  # Expected: all pass
bun test  # Expected: full suite passes, 0 failures
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Next Exercise button enables after all sets completed
- [ ] Progressive single-set flow works: Start → Do → Log → Rest → Next Set
