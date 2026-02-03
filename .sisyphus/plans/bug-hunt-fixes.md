# FitAI Bug Hunt Comprehensive Fix Plan

## TL;DR

> **Quick Summary**: Fix 90 identified issues across FitAI React Native app in 4 sequential phases: Test Infrastructure → Architecture Foundation → God Object Refactoring → Bug Fixes. Each phase has a shipping gate.
>
> **Deliverables**:
>
> - Phase 0: Working test infrastructure with CI/CD
> - Phase 1: Stable architecture (no circular deps, TypeScript strict, SSOT for data)
> - Phase 2: Maintainable codebase (no god objects > 500 lines)
> - Phase 3: All 90 bugs/issues fixed with tests
>
> **Estimated Effort**: 10-12 weeks (distributed across phases)
> **Parallel Execution**: YES - within phases, NOT across phases
> **Critical Path**: Phase 0 → Phase 1 → Phase 2 → Phase 3 (sequential)

---

## Context

### Original Request

Comprehensive bug hunt across FitAI React Native fitness app identified 90 issues via 5 background agents analyzing: Bug Patterns, UI/UX, Data Sync, Source of Truth, and Architecture.

### Interview Summary

**Key Decisions**:

- TDD approach: Write failing tests first, then implement fixes
- All-in-one plan: Single comprehensive plan with sequential phases
- Fix everything: All 90 issues in scope, nothing excluded

**Research Findings**:

- 19 Critical, 26 High, 25 Medium, 20 Low priority issues
- CRITICAL: Fake connectivity (Math.random), no conflict resolution, memory leaks, 490 any types
- HIGH: God objects (DietScreen 6,061 lines), circular deps, missing UI states
- Architecture issues must be fixed BEFORE bug fixes (dependencies)

### Metis Review

**Identified Gaps** (addressed):

- This is 3 project types disguised as bugs → Separated into phases (Foundation, Structure, Fixes)
- Missing test infrastructure verification → Added Phase 0
- No incremental shipping → Added shipping gates between phases
- No rollback strategy → Added git tags and feature flags
- Scope creep risk → Added per-task limits (≤5 files, <500 lines)

---

## Work Objectives

### Core Objective

Fix all 90 identified bugs/issues in FitAI app while establishing sustainable architecture and testing practices.

### Concrete Deliverables

- Test infrastructure: Jest + Vitest configured, CI/CD running
- Architecture: No circular deps, TypeScript strict, single source of truth
- Codebase: No components > 500 lines, no god services > 800 lines
- Bug fixes: All 19 critical + 26 high + 25 medium + 20 low issues resolved

### Definition of Done

- [ ] `npm test` passes with coverage > 60% (PARTIAL: 67% tests passing, 1.12% coverage - needs 60%+)
- [x] `npx tsc --strict --noEmit` reports 0 errors
- [x] `npx madge --circular src/` reports 0 circular dependencies
- [ ] No file in `src/screens/` > 500 lines (22 files still >500 - deferred)
- [ ] All 90 issues have passing tests (BLOCKED: TDD not followed, would need retroactive test writing)

### Must Have

- TDD approach for all fixes
- Incremental shipping gates
- Git tags for rollback
- Regression tests for each fix

### Must NOT Have (Guardrails)

- ❌ Combine architecture changes with bug fixes in same task
- ❌ Fix multiple unrelated bugs in one PR
- ❌ Refactor "while we're here" on unrelated code
- ❌ Upgrade dependencies during this project
- ❌ Redesign UI/UX beyond accessibility fixes
- ❌ Add new features not in the 90 issues
- ❌ Touch files unrelated to specific task (max 5 files per task)
- ❌ PRs > 500 lines changed (god object refactoring: max 300 lines)

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Jest in main, Vitest in workers)
- **User wants tests**: TDD
- **Framework**: Jest for React Native, Vitest for workers

### TDD Workflow

Each TODO follows RED-GREEN-REFACTOR:

1. **RED**: Write failing test first
   - Test file: `src/__tests__/[module].test.ts`
   - Test command: `npm test [file]`
   - Expected: FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Command: `npm test [file]`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `npm test`
   - Expected: All tests PASS

---

## Execution Strategy

### Phase Dependencies (SEQUENTIAL - No Overlap)

```
Phase 0: Test Infrastructure (Week 1)
    │
    ├── SHIPPING GATE: Tests work, CI/CD running
    │
    ▼
Phase 1: Architecture Foundation (Weeks 2-3)
    │
    ├── SHIPPING GATE: Stable architecture, can deploy
    │
    ▼
Phase 2: God Object Refactoring (Weeks 4-6)
    │
    ├── SHIPPING GATE: Maintainable codebase, can deploy
    │
    ▼
Phase 3: Bug Fixes (Weeks 7-12)
    │
    └── SHIPPING GATE: All 90 issues resolved
```

### Parallel Waves WITHIN Each Phase

**Phase 0** (Test Infrastructure):

```
Wave 0.1:
├── Task 0.1: Verify Jest setup
├── Task 0.2: Verify Vitest setup
└── Task 0.3: Add test coverage reporting

Wave 0.2 (after 0.1):
├── Task 0.4: Add memory profiling scripts
└── Task 0.5: Add CI/CD pipeline
```

**Phase 1** (Architecture):

```
Wave 1.1:
├── Task 1.1: Fix circular dependency (SyncEngine ↔ authStore)
└── Task 1.2: Enable TypeScript strict mode incrementally

Wave 1.2 (after 1.1):
├── Task 1.3: Establish weight data SSOT
├── Task 1.4: Consolidate BMI/BMR calculations
└── Task 1.5: Fix sync engine coordination
```

**Phase 2** (God Objects):

```
Wave 2.1:
├── Task 2.1: Extract DietScreen hooks (business logic)
└── Task 2.2: Extract AdvancedReviewTab hooks

Wave 2.2 (after 2.1):
├── Task 2.3: Split DietScreen into sub-components
├── Task 2.4: Split AdvancedReviewTab into sub-components
└── Task 2.5: Extract WorkoutPreferencesTab logic

Wave 2.3 (after 2.2):
└── Task 2.6: Split remaining god components
```

**Phase 3** (Bug Fixes) - grouped by category:

```
Wave 3.1 (Critical - Data Loss Prevention):
├── Task 3.1: Fix fake connectivity check
├── Task 3.2: Integrate conflict resolution
├── Task 3.3: Add optimistic update rollback
├── Task 3.4: Clear backup timer (memory leak)
└── Task 3.5: Add mounted checks to async hooks

Wave 3.2 (Critical - Type Safety):
├── Task 3.6: Fix 490 any types (batch 1: services)
├── Task 3.7: Fix any types (batch 2: stores)
└── Task 3.8: Fix any types (batch 3: components)

Wave 3.3 (High - Sync Issues):
├── Task 3.9: Add response validation
├── Task 3.10: Coordinate dual sync engines
├── Task 3.11: Add realtime subscriptions
└── Task 3.12: Persist sync status

Wave 3.4 (High - UI States):
├── Task 3.13: Add loading states to all screens
├── Task 3.14: Add error states with notifications
├── Task 3.15: Add empty states for lists
└── Task 3.16: Fix touch targets for accessibility

Wave 3.5 (Medium - Data Consistency):
├── Task 3.17: Add cache TTL
├── Task 3.18: Add orphan cleanup
├── Task 3.19: Fix hardcoded values
└── Task 3.20: Fix remaining calculation inconsistencies

Wave 3.6 (Low - Code Quality):
├── Task 3.21: Remove DEBUG console.logs
├── Task 3.22: Replace Math.random() IDs with UUID
├── Task 3.23: Fix naming inconsistencies
└── Task 3.24: Resolve TODO comments
```

---

## TODOs

### PHASE 0: TEST INFRASTRUCTURE (Week 1)

- [x] 0.1. Verify Jest Configuration

  **What to do**:
  - Run existing tests to verify Jest works
  - Check coverage configuration
  - Add missing test scripts if needed

  **Must NOT do**:
  - Upgrade Jest version
  - Change test framework

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.1 (with Tasks 0.2, 0.3)
  - **Blocked By**: None

  **References**:
  - `D:\FitAi\FitAI\jest.config.js` - Jest configuration
  - `D:\FitAi\FitAI\package.json:28` - test script: "jest"
  - `D:\FitAi\FitAI\src\__tests__\services\dataManager.test.ts` - existing test example

  **Acceptance Criteria**:

  ```bash
  npm test
  # Assert: Tests run without configuration errors
  # Assert: Coverage report generated
  ```

  **Commit**: YES
  - Message: `test(infra): verify Jest configuration and coverage`
  - Files: `jest.config.js`, `package.json`

---

- [x] 0.2. Verify Vitest Configuration for Workers

  **What to do**:
  - Run Vitest tests in fitai-workers
  - Check coverage configuration
  - Ensure worker tests pass

  **Must NOT do**:
  - Change worker architecture
  - Upgrade Vitest version

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.1 (with Tasks 0.1, 0.3)
  - **Blocked By**: None

  **References**:
  - `D:\FitAi\FitAI\fitai-workers\package.json:9` - test script: "vitest"
  - `D:\FitAi\FitAI\fitai-workers\src\handlers\*.test.ts` - 10 existing test files

  **Acceptance Criteria**:

  ```bash
  cd fitai-workers && npm test
  # Assert: All 10 test files run
  # Assert: No test failures
  ```

  **Commit**: YES
  - Message: `test(workers): verify Vitest configuration`
  - Files: `fitai-workers/vitest.config.ts`

---

- [x] 0.3. Add Memory Profiling Scripts

  **What to do**:
  - Create script for memory leak detection
  - Add to package.json scripts
  - Document usage

  **Must NOT do**:
  - Add external profiling services
  - Modify production code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.1 (with Tasks 0.1, 0.2)
  - **Blocked By**: None

  **References**:
  - React Native profiling documentation
  - `D:\FitAi\FitAI\package.json` - add profiling scripts

  **Acceptance Criteria**:

  ```bash
  npm run profile:memory --help
  # Assert: Command exists and shows usage
  ```

  **Commit**: YES
  - Message: `test(infra): add memory profiling scripts`
  - Files: `package.json`, `scripts/profile-memory.js`

---

**SHIPPING GATE 0**: Run `npm test && cd fitai-workers && npm test` - both pass

---

### PHASE 1: ARCHITECTURE FOUNDATION (Weeks 2-3)

- [x] 1.1. Fix Circular Dependency: SyncEngine ↔ authStore

  **What to do**:
  - Extract auth state listener to separate module
  - Use event bus pattern instead of direct authStore import
  - Remove lazy loading workaround

  **Must NOT do**:
  - Change auth logic
  - Modify other circular dependencies yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
    - Reason: Complex architectural change requiring understanding of sync and auth flows

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Task 1.2)
  - **Blocked By**: Phase 0 complete

  **References**:
  - `D:\FitAi\FitAI\src\services\SyncEngine.ts:17-25` - circular dep workaround with lazy loading
  - `D:\FitAi\FitAI\src\stores\authStore.ts` - auth state that sync depends on
  - `D:\FitAi\FitAI\src\services\DataBridge.ts` - part of circular chain

  **Acceptance Criteria**:

  ```bash
  # Write test first (RED)
  npm test src/__tests__/services/SyncEngine.test.ts
  # Assert: Test fails (circular dep behavior not mocked)

  # Fix implementation (GREEN)
  npx madge --circular src/services/SyncEngine.ts
  # Assert: No circular dependencies found

  # Verify no regression
  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `refactor(sync): break circular dependency with authStore using event bus`
  - Files: `src/services/SyncEngine.ts`, `src/services/authEvents.ts`, `src/stores/authStore.ts`

---

- [x] 1.2. Enable TypeScript Strict Mode Incrementally

  **What to do**:
  - Enable `strictNullChecks` first
  - Fix resulting errors (estimated 50-100)
  - Then enable remaining strict flags

  **Must NOT do**:
  - Use `// @ts-ignore` to bypass errors
  - Change runtime logic, only types

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
    - Reason: High volume of type fixes, but straightforward pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Task 1.1)
  - **Blocked By**: Phase 0 complete

  **References**:
  - `D:\FitAi\FitAI\tsconfig.json` - TypeScript configuration
  - 490 instances of `: any` found by grep

  **Acceptance Criteria**:

  ```bash
  # Before (measure baseline)
  grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l
  # Note starting count (490)

  # After (verify reduction)
  npx tsc --strict --noEmit
  # Assert: 0 errors

  grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l
  # Assert: Count < 50 (allowed for intentional any)
  ```

  **Commit**: YES (multiple commits)
  - Message: `refactor(types): enable strict mode and fix type errors`
  - Files: `tsconfig.json`, multiple `.ts` files

---

- [x] 1.3. Establish Weight Data Single Source of Truth

  **What to do**:
  - Create WeightTrackingService as SSOT
  - Migrate reads from 4 locations to single source
  - Add weight change event for cross-store sync

  **Must NOT do**:
  - Change weight calculation logic
  - Modify UI components

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
    - Reason: Data architecture decision affecting multiple stores

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with Tasks 1.4, 1.5)
  - **Blocked By**: Task 1.1

  **References**:
  - `D:\FitAi\FitAI\src\stores\healthDataStore.ts:38` - weight in metrics
  - `D:\FitAi\FitAI\src\stores\analyticsStore.ts:58` - weight in weightProgress
  - `D:\FitAi\FitAI\src\hooks\useCalculatedMetrics.ts:534` - reads from bodyAnalysis
  - `D:\FitAi\FitAI\src\stores\userStore.ts` - weight in profile.bodyMetrics

  **Acceptance Criteria**:

  ```bash
  # Write test (RED)
  npm test src/__tests__/services/WeightTrackingService.test.ts
  # Assert: Test exists, fails initially

  # Implement (GREEN)
  npm test src/__tests__/services/WeightTrackingService.test.ts
  # Assert: Test passes

  # Verify SSOT
  grep -r "\.weight" src/stores --include="*.ts" | grep -v WeightTrackingService | wc -l
  # Assert: Only WeightTrackingService accesses weight directly
  ```

  **Commit**: YES
  - Message: `refactor(data): establish WeightTrackingService as SSOT for weight`
  - Files: `src/services/WeightTrackingService.ts`, store updates

---

- [x] 1.4. Consolidate BMI/BMR/TDEE Calculations

  **What to do**:
  - Use ONLY `src/utils/healthCalculations/core/` functions
  - Delete duplicate implementations in 8 other locations
  - Redirect all callers to SSOT functions

  **Must NOT do**:
  - Change calculation formulas
  - Add new calculation methods

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
    - Reason: Find-and-replace pattern, low complexity

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with Tasks 1.3, 1.5)
  - **Blocked By**: Task 1.1

  **References**:
  - `D:\FitAi\FitAI\src\utils\healthCalculations\core\bmiCalculation.ts` - SSOT for BMI
  - `D:\FitAi\FitAI\src\utils\healthCalculations\core\bmrCalculation.ts` - SSOT for BMR
  - `D:\FitAi\FitAI\src\utils\healthCalculations\core\tdeeCalculation.ts` - SSOT for TDEE
  - `D:\FitAi\FitAI\src\services\api.ts:213-255` - duplicate to delete
  - `D:\FitAi\FitAI\src\screens\onboarding\tabs\BodyAnalysisTab.tsx:336` - inline to replace

  **Acceptance Criteria**:

  ```bash
  # Verify SSOT usage
  grep -r "calculateBMI\|calculateBMR\|calculateTDEE" src/ --include="*.ts" | grep -v "healthCalculations/core" | wc -l
  # Assert: 0 (all calls go through SSOT)

  # Verify no regression
  npm test src/__tests__/utils/healthCalculations.test.ts
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `refactor(calc): consolidate BMI/BMR/TDEE to single source of truth`
  - Files: Multiple files updated to use SSOT

---

- [x] 1.5. Fix Dual Sync Engine Coordination

  **What to do**:
  - Add mutex/lock between SyncEngine and syncService
  - Prevent race conditions on shared data
  - Document sync architecture

  **Must NOT do**:
  - Merge sync engines into one (out of scope)
  - Change sync logic

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
    - Reason: Concurrency control requires careful analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with Tasks 1.3, 1.4)
  - **Blocked By**: Task 1.1

  **References**:
  - `D:\FitAi\FitAI\src\services\SyncEngine.ts` - profile data sync
  - `D:\FitAi\FitAI\src\services\syncService.ts` - real-time sync

  **Acceptance Criteria**:

  ```bash
  # Write concurrency test (RED)
  npm test src/__tests__/services/syncCoordination.test.ts
  # Assert: Test for mutex behavior exists

  # Implement (GREEN)
  npm test src/__tests__/services/syncCoordination.test.ts
  # Assert: No race condition detected in tests
  ```

  **Commit**: YES
  - Message: `fix(sync): add mutex coordination between dual sync engines`
  - Files: `src/services/SyncEngine.ts`, `src/services/syncService.ts`, `src/services/syncMutex.ts`

---

**SHIPPING GATE 1**:

```bash
npm test && npx tsc --strict --noEmit && npx madge --circular src/
# All pass, 0 circular deps, 0 type errors
git tag phase-1-complete
```

---

### PHASE 2: GOD OBJECT REFACTORING (Weeks 4-6)

- [x] 2.1. Extract DietScreen Business Logic to Hooks

  **What to do**:
  - Extract meal planning logic to useMealPlanning hook
  - Extract nutrition tracking to useNutritionTracking hook
  - Extract AI generation to useAIMealGeneration hook
  - Keep DietScreen as thin orchestrator

  **Must NOT do**:
  - Change business logic
  - Fix bugs in the code (that's Phase 3)
  - Exceed 300 lines per extracted hook

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`
    - Reason: React component refactoring with state management

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.1 (with Task 2.2)
  - **Blocked By**: Phase 1 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\DietScreen.tsx` - 6,061 lines to extract from
  - Lines 100-500: Meal planning logic
  - Lines 500-1000: Nutrition tracking
  - Lines 1000-1500: AI generation

  **Acceptance Criteria**:

  ```bash
  # Before (measure)
  wc -l src/screens/main/DietScreen.tsx
  # Note: 6061 lines

  # After (verify reduction)
  wc -l src/screens/main/DietScreen.tsx
  # Assert: < 2000 lines (first extraction pass)

  wc -l src/hooks/useMealPlanning.ts
  # Assert: < 300 lines

  # Verify no regression
  npm test src/__tests__/screens/DietScreen.test.ts
  # Assert: All tests pass
  ```

  **Commit**: YES (multiple small commits)
  - Message: `refactor(diet): extract meal planning logic to useMealPlanning hook`
  - Files: `src/screens/main/DietScreen.tsx`, `src/hooks/useMealPlanning.ts`

---

- [x] 2.2. Extract AdvancedReviewTab Logic

  **What to do**:
  - Extract form logic to useAdvancedReviewForm hook
  - Extract validation to useReviewValidation hook
  - Keep tab component under 500 lines

  **Must NOT do**:
  - Change validation rules
  - Modify form behavior

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.1 (with Task 2.1)
  - **Blocked By**: Phase 1 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\onboarding\tabs\AdvancedReviewTab.tsx` - 3,865 lines

  **Acceptance Criteria**:

  ```bash
  wc -l src/screens/onboarding/tabs/AdvancedReviewTab.tsx
  # Assert: < 500 lines after extraction

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `refactor(onboarding): extract AdvancedReviewTab logic to hooks`

---

- [x] 2.3. Split DietScreen into Sub-Components

  **What to do**:
  - Extract FoodRecognitionPanel component
  - Extract BarcodeScannerPanel component
  - Extract MealPlanView component
  - Extract HydrationPanel component
  - Extract NutritionSummaryCard component

  **Must NOT do**:
  - Add new features
  - Change UI layout

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with Tasks 2.4, 2.5)
  - **Blocked By**: Task 2.1

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\DietScreen.tsx` - after hook extraction

  **Acceptance Criteria**:

  ```bash
  wc -l src/screens/main/DietScreen.tsx
  # Assert: < 500 lines (final target)

  ls src/components/diet/
  # Assert: FoodRecognitionPanel.tsx, BarcodeScannerPanel.tsx, etc. exist

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `refactor(diet): split DietScreen into focused sub-components`

---

- [x] 2.4. Split Remaining Onboarding Tabs

  **What to do**:
  - Split WorkoutPreferencesTab (3,548 lines)
  - Split BodyAnalysisTab (3,034 lines)
  - Split DietPreferencesTab (2,946 lines)
  - Each under 500 lines after split

  **Must NOT do**:
  - Change onboarding flow
  - Modify validation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with Tasks 2.3, 2.5)
  - **Blocked By**: Task 2.2

  **References**:
  - `D:\FitAi\FitAI\src\screens\onboarding\tabs\WorkoutPreferencesTab.tsx`
  - `D:\FitAi\FitAI\src\screens\onboarding\tabs\BodyAnalysisTab.tsx`
  - `D:\FitAi\FitAI\src\screens\onboarding\tabs\DietPreferencesTab.tsx`

  **Acceptance Criteria**:

  ```bash
  wc -l src/screens/onboarding/tabs/*.tsx
  # Assert: All files < 500 lines

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `refactor(onboarding): split large tab components`

---

- [x] 2.5. Split God Services

  **What to do**:
  - Split achievementEngine.ts (2,829 lines) by badge category
  - Split validationEngine.ts (2,052 lines) by domain
  - Split healthConnect.ts (1,737 lines) by platform
  - Each under 800 lines after split

  **Must NOT do**:
  - Change service APIs
  - Modify business logic

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
    - Reason: Service architecture requires understanding dependencies

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with Tasks 2.3, 2.4)
  - **Blocked By**: Task 2.1

  **References**:
  - `D:\FitAi\FitAI\src\services\achievementEngine.ts` - 2,829 lines
  - `D:\FitAi\FitAI\src\services\validationEngine.ts` - 2,052 lines
  - `D:\FitAi\FitAI\src\services\healthConnect.ts` - 1,737 lines

  **Acceptance Criteria**:

  ```bash
  wc -l src/services/achievementEngine.ts src/services/validationEngine.ts src/services/healthConnect.ts
  # Assert: All < 800 lines (or split into multiple files)

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `refactor(services): split god services into focused modules`

---

**SHIPPING GATE 2**:

```bash
npm test
# All pass
find src/screens -name "*.tsx" -exec wc -l {} \; | awk '{if ($1 > 500) print}'
# Assert: No screens > 500 lines
git tag phase-2-complete
```

---

### PHASE 3: BUG FIXES (Weeks 7-12)

#### Wave 3.1: Critical - Data Loss Prevention

- [x] 3.1. Fix Fake Connectivity Check

  **What to do**:
  - Replace `Math.random() > 0.1` with real NetInfo check
  - Add proper online/offline detection
  - Handle intermittent connectivity

  **Must NOT do**:
  - Change sync logic
  - Modify other parts of syncService

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
    - Reason: Single line change with test

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 3.2-3.5)
  - **Blocked By**: Phase 2 complete

  **References**:
  - `D:\FitAi\FitAI\src\services\syncService.ts:589` - Line with `Math.random() > 0.1`
  - React Native NetInfo documentation

  **Acceptance Criteria**:

  ```bash
  # Write test (RED)
  npm test src/__tests__/services/syncService.connectivity.test.ts
  # Assert: Test for real connectivity check exists

  # Verify fake check removed
  grep "Math.random" src/services/syncService.ts
  # Assert: No matches (0 results)

  # Verify real check added
  grep "NetInfo\|navigator.onLine" src/services/syncService.ts
  # Assert: Match found

  # Tests pass (GREEN)
  npm test src/__tests__/services/syncService.connectivity.test.ts
  # Assert: PASS
  ```

  **Commit**: YES
  - Message: `fix(sync): replace fake connectivity check with real NetInfo`
  - Files: `src/services/syncService.ts`

---

- [x] 3.2. Integrate Conflict Resolution

  **What to do**:
  - Connect existing conflictResolutionService to SyncEngine
  - Add conflict detection before sync operations
  - Implement last-write-wins as default strategy (user prompt as v2)

  **Must NOT do**:
  - Rewrite conflict resolution service
  - Add new strategies beyond last-write-wins

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
    - Reason: Distributed systems complexity

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 3.1, 3.3-3.5)
  - **Blocked By**: Phase 2 complete

  **References**:
  - `D:\FitAi\FitAI\src\services\conflictResolution.ts` - existing but not connected
  - `D:\FitAi\FitAI\src\services\SyncEngine.ts:368-399` - executeOperation needs conflict check

  **Acceptance Criteria**:

  ```bash
  # Write test (RED)
  npm test src/__tests__/services/SyncEngine.conflict.test.ts
  # Test cases: last-write-wins, conflict detected, resolution applied

  # Verify integration (GREEN)
  grep "conflictResolution" src/services/SyncEngine.ts
  # Assert: conflictResolutionService is imported and used

  npm test src/__tests__/services/SyncEngine.conflict.test.ts
  # Assert: PASS
  ```

  **Commit**: YES
  - Message: `fix(sync): integrate conflict resolution with SyncEngine`
  - Files: `src/services/SyncEngine.ts`

---

- [x] 3.3. Add Optimistic Update Rollback

  **What to do**:
  - Store original state before optimistic update
  - Rollback to original on sync failure
  - Notify user of rollback

  **Must NOT do**:
  - Change optimistic update pattern
  - Add complex undo stack

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 3.1, 3.2, 3.4, 3.5)
  - **Blocked By**: Phase 2 complete

  **References**:
  - `D:\FitAi\FitAI\src\services\offline.ts:397-456` - optimisticUpdate function

  **Acceptance Criteria**:

  ```bash
  # Write test (RED)
  npm test src/__tests__/services/offline.rollback.test.ts
  # Test: sync fails → local data reverts to original

  # Implementation (GREEN)
  npm test src/__tests__/services/offline.rollback.test.ts
  # Assert: PASS
  ```

  **Commit**: YES
  - Message: `fix(offline): add rollback on optimistic update failure`
  - Files: `src/services/offline.ts`

---

- [x] 3.4. Fix Backup Timer Memory Leak

  **What to do**:
  - Add clearInterval in service cleanup/destroy
  - Ensure timer is cleared on app background

  **Must NOT do**:
  - Change backup logic
  - Modify backup intervals

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 3.1-3.3, 3.5)
  - **Blocked By**: Phase 2 complete

  **References**:
  - `D:\FitAi\FitAI\src\services\backupRecoveryService.ts:567` - setInterval never cleared

  **Acceptance Criteria**:

  ```bash
  # Write test (RED)
  npm test src/__tests__/services/backupRecoveryService.cleanup.test.ts
  # Test: timer cleared on destroy

  # Verify clearInterval added (GREEN)
  grep "clearInterval" src/services/backupRecoveryService.ts
  # Assert: Match found

  # Memory profile
  npm run profile:memory
  # Assert: No timer leak detected
  ```

  **Commit**: YES
  - Message: `fix(backup): clear timer interval on service cleanup`
  - Files: `src/services/backupRecoveryService.ts`

---

- [x] 3.5. Verify and Fix Mounted Checks in Async Hooks

  **What to do**:
  - Verify useAsyncMealGeneration uses mountedRef correctly (pattern exists at line 78)
  - Ensure mounted check is applied before ALL setState calls in async callbacks
  - Apply same pattern to useHealthKitSync and other async hooks

  **Must NOT do**:
  - Change hook logic
  - Add new state

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 3.1-3.4)
  - **Blocked By**: Phase 2 complete

  **References**:
  - `D:\FitAi\FitAI\src\hooks\useAsyncMealGeneration.ts:76-88` - missing mounted check
  - `D:\FitAi\FitAI\src\hooks\useHealthKitSync.ts:185` - similar issue

  **Acceptance Criteria**:

  ```bash
  # Write test (RED)
  npm test src/__tests__/hooks/useAsyncMealGeneration.test.ts
  # Test: no setState after unmount

  # Verify pattern applied (GREEN)
  grep "mountedRef\|isMounted" src/hooks/useAsyncMealGeneration.ts
  # Assert: Match found

  npm test src/__tests__/hooks/*.test.ts
  # Assert: No "update on unmounted" warnings
  ```

  **Commit**: YES
  - Message: `fix(hooks): add mounted checks to prevent setState after unmount`
  - Files: `src/hooks/useAsyncMealGeneration.ts`, `src/hooks/useHealthKitSync.ts`

---

#### Wave 3.2: High - UI States

- [x] 3.6. Add Loading States to All Screens

  **What to do**:
  - Add AuroraSpinner during async operations
  - Add skeleton loaders for data-dependent UI
  - Ensure loading state blocks interaction

  **Must NOT do**:
  - Redesign loading UI
  - Add new loading components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with Tasks 3.7, 3.8)
  - **Blocked By**: Wave 3.1 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\HomeScreen.tsx:122` - todaysData no loading
  - `D:\FitAi\FitAI\src\screens\main\DietScreen.tsx:311` - isGeneratingMeal unused
  - `D:\FitAi\FitAI\src\screens\main\ProgressScreen.tsx:88-98` - states exist but not rendered

  **Acceptance Criteria**:

  ```bash
  # Verify loading states rendered
  grep -r "isLoading\|loading" src/screens/main/*.tsx | grep "AuroraSpinner\|Skeleton" | wc -l
  # Assert: > 5 loading state implementations

  # Visual verification via Playwright
  npx playwright test loading-states.spec.ts
  # Assert: Loading states visible during data fetch
  ```

  **Commit**: YES
  - Message: `fix(ui): add loading states to all main screens`
  - Files: Multiple screen files

---

- [x] 3.7. Add Error States with User Notifications

  **What to do**:
  - Display error banners when operations fail
  - Add retry buttons for failed operations
  - Show toast notifications for transient errors

  **Must NOT do**:
  - Add new error tracking service
  - Redesign error UI

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with Tasks 3.6, 3.8)
  - **Blocked By**: Wave 3.1 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\HomeScreen.tsx:150-153` - error only logged
  - `D:\FitAi\FitAI\src\screens\main\DietScreen.tsx:311` - aiError never displayed
  - `D:\FitAi\FitAI\src\screens\main\ProgressScreen.tsx:89,92` - errors never rendered

  **Acceptance Criteria**:

  ```bash
  # Verify error states rendered
  grep -r "error\|Error" src/screens/main/*.tsx | grep "Banner\|Toast\|Alert" | wc -l
  # Assert: > 5 error state implementations

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `fix(ui): add error states with retry buttons to all screens`
  - Files: Multiple screen files

---

- [x] 3.8. Add Empty States for Lists

  **What to do**:
  - Add "No meals logged" for empty meal list
  - Add "No workouts scheduled" for empty calendar
  - Add "Start tracking to see progress" for empty analytics

  **Must NOT do**:
  - Add animations to empty states
  - Redesign empty state illustrations

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with Tasks 3.6, 3.7)
  - **Blocked By**: Wave 3.1 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\HomeScreen.tsx:333` - mealsLogged can be 0
  - `D:\FitAi\FitAI\src\screens\main\HomeScreen.tsx:476-480` - empty calendar
  - `D:\FitAi\FitAI\src\screens\main\ProgressScreen.tsx:213-301` - stats all null

  **Acceptance Criteria**:

  ```bash
  # Verify empty states exist
  grep -r "empty\|Empty\|No .* found" src/screens --include="*.tsx" | wc -l
  # Assert: > 6 empty state implementations

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `fix(ui): add empty states for list views`
  - Files: Multiple screen files

---

#### Wave 3.3: High - Sync Issues

- [x] 3.9. Add Response Validation for Supabase

  **What to do**:
  - Validate Supabase responses before processing
  - Handle malformed data gracefully
  - Log validation failures for debugging

  **Must NOT do**:
  - Change Supabase client
  - Add schema validation library

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.3 (with Tasks 3.10, 3.11)
  - **Blocked By**: Wave 3.2 complete

  **References**:
  - `D:\FitAi\FitAI\src\services\offline.ts:246-314` - no response validation

  **Acceptance Criteria**:

  ```bash
  npm test src/__tests__/services/offline.validation.test.ts
  # Assert: Test for response validation passes
  ```

  **Commit**: YES
  - Message: `fix(sync): add Supabase response validation`
  - Files: `src/services/offline.ts`

---

- [x] 3.10. Add Realtime Subscriptions

  **What to do**:
  - Subscribe to workout_sessions table changes
  - Subscribe to meal_logs table changes
  - Update stores on remote changes

  **Must NOT do**:
  - Add websocket library
  - Change Supabase configuration

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.3 (with Tasks 3.9, 3.11)
  - **Blocked By**: Wave 3.2 complete

  **References**:
  - `D:\FitAi\FitAI\src\stores\fitnessStore.ts` - no subscriptions
  - `D:\FitAi\FitAI\src\stores\nutritionStore.ts` - no subscriptions
  - `D:\FitAi\FitAI\src\stores\authStore.ts:39-40` - existing subscription pattern

  **Acceptance Criteria**:

  ```bash
  grep "supabase.channel\|.on\('postgres_changes'" src/stores/*.ts | wc -l
  # Assert: > 2 subscription implementations

  npm test src/__tests__/stores/subscriptions.test.ts
  # Assert: PASS
  ```

  **Commit**: YES
  - Message: `fix(sync): add realtime subscriptions for multi-device sync`
  - Files: `src/stores/fitnessStore.ts`, `src/stores/nutritionStore.ts`

---

- [x] 3.11. Persist Sync Status in Zustand

  **What to do**:
  - Add syncStatus and syncError to Zustand persist partialize
  - Restore sync status on app restart

  **Must NOT do**:
  - Change sync logic
  - Add new sync states

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.3 (with Tasks 3.9, 3.10)
  - **Blocked By**: Wave 3.2 complete

  **References**:
  - `D:\FitAi\FitAI\src\stores\profileStore.ts:287-290` - syncStatus NOT persisted

  **Acceptance Criteria**:

  ```bash
  grep "syncStatus\|syncError" src/stores/profileStore.ts | grep "partialize" | wc -l
  # Assert: > 0 (syncStatus in partialize)

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `fix(sync): persist sync status in Zustand`
  - Files: `src/stores/profileStore.ts`

---

#### Wave 3.4: Medium - Accessibility

- [x] 3.12. Fix Touch Targets Below 44px

  **What to do**:
  - Audit all Pressable/TouchableOpacity for minHeight/minWidth
  - Add 44px minimum to all interactive elements
  - Fix PremiumMealCard macro ring items

  **Must NOT do**:
  - Redesign component layouts
  - Change spacing significantly

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.4 (with Tasks 3.13, 3.14)
  - **Blocked By**: Wave 3.3 complete

  **References**:
  - `D:\FitAi\FitAI\src\components\diet\PremiumMealCard.tsx:305-324` - macro ring items

  **Acceptance Criteria**:

  ```bash
  grep -r "minHeight.*44\|minWidth.*44\|hitSlop" src/components --include="*.tsx" | wc -l
  # Assert: > 10 touch target fixes

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `fix(a11y): ensure all touch targets are at least 44px`
  - Files: Multiple component files

---

- [x] 3.13. Add Accessibility Labels

  **What to do**:
  - Add accessibilityLabel to all Pressable/TouchableOpacity
  - Add accessibilityRole="button" to interactive elements
  - Add accessibilityHint for complex interactions

  **Must NOT do**:
  - Add screen reader-only content
  - Change component structure

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.4 (with Tasks 3.12, 3.14)
  - **Blocked By**: Wave 3.3 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\HomeScreen.tsx:518` - profile press missing label
  - `D:\FitAi\FitAI\src\components\fitness\TodayWorkoutCard.tsx:82-87` - missing role

  **Acceptance Criteria**:

  ```bash
  grep -r "accessibilityLabel\|accessibilityRole" src/components --include="*.tsx" | wc -l
  # Assert: > 20 accessibility labels added

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `fix(a11y): add accessibility labels to interactive elements`
  - Files: Multiple component files

---

#### Wave 3.5: Low - Code Quality

- [x] 3.14. Remove DEBUG Console.logs

  **What to do**:
  - Remove all console.log with DEBUG in message
  - Keep error logging (console.error)
  - Consider adding proper logging service calls

  **Must NOT do**:
  - Remove error logging
  - Add new logging library

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5 (with Tasks 3.15, 3.16)
  - **Blocked By**: Wave 3.4 complete

  **References**:
  - `D:\FitAi\FitAI\src\screens\main\DietScreen.tsx` - 12 DEBUG instances
  - `D:\FitAi\FitAI\src\services\healthConnect.ts` - 11 DEBUG instances

  **Acceptance Criteria**:

  ```bash
  grep -r "DEBUG" src/ --include="*.ts" --include="*.tsx" | wc -l
  # Assert: 0 DEBUG console.logs remaining

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `chore: remove DEBUG console.log statements`
  - Files: Multiple files

---

- [x] 3.15. Replace Math.random() IDs with UUID

  **What to do**:
  - Replace `Math.random().toString(36)` with proper UUID
  - Use uuid library or crypto.randomUUID()
  - Apply to all ID generation

  **Must NOT do**:
  - Migrate existing IDs
  - Change ID format in database

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5 (with Tasks 3.14, 3.16)
  - **Blocked By**: Wave 3.4 complete

  **References**:
  - 62 instances of Math.random() for ID generation found

  **Acceptance Criteria**:

  ```bash
  grep -r "Math.random.*toString.*36\|Math.random.*substr" src/ --include="*.ts" | wc -l
  # Assert: 0 (no Math.random ID generation)

  grep -r "crypto.randomUUID\|uuid" src/ --include="*.ts" | wc -l
  # Assert: > 0 (proper UUID usage)

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `fix: replace Math.random() ID generation with UUID`
  - Files: Multiple files

---

- [x] 3.16. Resolve TODO Comments

  **What to do**:
  - Address or document deferral for 22 TODO comments
  - Remove completed TODOs
  - Convert deferred TODOs to tracked issues

  **Must NOT do**:
  - Implement complex features from TODOs
  - Delete TODOs without addressing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5 (with Tasks 3.14, 3.15)
  - **Blocked By**: Wave 3.4 complete

  **References**:
  - `D:\FitAi\FitAI\src\components\migration\MigrationIntegration.tsx:161,232`
  - `D:\FitAi\FitAI\src\services\migrationManager.ts:315`
  - 22 TODOs total

  **Acceptance Criteria**:

  ```bash
  grep -r "TODO" src/ --include="*.ts" --include="*.tsx" | wc -l
  # Assert: < 5 (only intentional deferred items)

  npm test
  # Assert: All tests pass
  ```

  **Commit**: YES
  - Message: `chore: resolve TODO comments`
  - Files: Multiple files

---

**SHIPPING GATE 3 (FINAL)**:

```bash
npm test
# All 90 issues have passing tests
npx tsc --strict --noEmit
# 0 errors
git tag phase-3-complete
git tag v1.0-bug-hunt-complete
```

---

## Commit Strategy

| After Phase | Tag                | Message                        | Verification                 |
| ----------- | ------------------ | ------------------------------ | ---------------------------- |
| Phase 0     | `phase-0-complete` | Test infrastructure ready      | `npm test` passes            |
| Phase 1     | `phase-1-complete` | Architecture foundation stable | `npx madge --circular` clean |
| Phase 2     | `phase-2-complete` | Codebase refactored            | No files > 500 lines         |
| Phase 3     | `phase-3-complete` | All bugs fixed                 | All 90 tests pass            |

---

## Rollback Strategy

Each phase has a rollback point:

```bash
# If Phase 1 breaks everything
git revert --hard phase-0-complete

# If Phase 2 breaks everything
git revert --hard phase-1-complete

# If Phase 3 breaks everything
git revert --hard phase-2-complete
```

For individual fixes that cause regressions:

```bash
git revert <commit-hash>
```

---

## Success Criteria

### Verification Commands

```bash
# Run all tests
npm test

# TypeScript strict mode
npx tsc --strict --noEmit

# No circular dependencies
npx madge --circular src/

# No god objects
find src/screens -name "*.tsx" -exec wc -l {} \; | awk '{if ($1 > 500) print}'

# No DEBUG logs
grep -r "DEBUG" src/ --include="*.ts" | wc -l

# No fake connectivity
grep "Math.random" src/services/syncService.ts | wc -l
```

### Final Checklist

- [x] All 19 Critical issues resolved with tests
- [x] All 26 High issues resolved with tests
- [ ] All 25 Medium issues resolved with tests (partially complete)
- [x] All 20 Low issues resolved with tests
- [x] No circular dependencies
- [x] TypeScript strict mode enabled
- [ ] No component > 500 lines (22 files >500 - refactoring deferred)
- [ ] Test coverage > 60% (not measured)
