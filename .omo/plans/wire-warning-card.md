# Wire WarningCard into Onboarding Review Tab

## TL;DR

> **Quick Summary**: The `WarningCard` component (405 lines, fully implemented) is orphaned — never imported or rendered anywhere. This plan wires it into `AdvancedReviewTab.tsx` so users see validation warnings (e.g., aggressive weight loss timeline) during the review step (Tab 5). The calculation logic is already correct; only the UI connection is missing.
> 
> **Deliverables**:
> - WarningCard rendered in Tab 5 when warnings exist
> - "Adjust Plan" button on actionable warnings opens AdjustmentWizard
> - Acknowledgment checkbox state wired to existing hook state
> - Warning section hidden during recalculation to prevent stale data flash
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — single-file change, 2 sequential tasks
> **Critical Path**: Task 1 → Task 2

---

## Context

### Original Request
User noticed that the onboarding review tab (Tab 5) doesn't show any warnings even when users enter ambitious/unrealistic goals like losing 10kg in 1 month. They asked us to find if the warning logic exists, verify the calculations are correct, and identify why warnings aren't visible.

### Investigation Summary
**Key Findings**:
- The `WarningCard.tsx` component exists (405 lines) with full UI implementation — but is **never imported or rendered** anywhere in the app
- The `ValidationSummary.tsx` component also exists but is **incompatible** (takes `TabValidationResult` with `string[]`, not `ValidationResult[]`)
- `validationResults.warnings` is correctly computed by `useAdvancedReviewForm` → `useReviewValidation` → `ValidationEngine.validateUserPlan()` — the data is available but never displayed
- `warningsAcknowledged` and `setWarningsAcknowledged` states exist in the hook but are never used by the tab
- The `RateComparisonCard` shows only rate alternatives (partially works for rate comparison)
- The `AdjustmentWizard` exists in the render tree for blocking errors but `setShowAdjustmentWizard(true)` is never called — error wizard is also orphaned
- Warnings and errors are **mutually exclusive** — the engine only generates warnings when `errors.length === 0`

### Metis Review
**Identified Gaps** (addressed):
- `setShowAdjustmentWizard(true)` is never called anywhere — the error wizard trigger is also broken, but fixing that is **out of scope** for this plan
- `WarningCard` auto-calls `onAcknowledgmentChange(true)` when all warnings have alternatives — harmless since we're not gating the Complete button
- `warningsAcknowledged` auto-resets on every recalculation — acceptable since we're not gating
- `ValidationSummary` is incompatible types — excluded from scope
- Stale warnings could flash during recalculation — mitigated with `!isCalculating` guard
- `currentError` from hook is typed `any | null` — we'll use new local state instead to avoid type issues

---

## Work Objectives

### Core Objective
Wire the existing `WarningCard` component into `AdvancedReviewTab.tsx` so that validation warnings are visible to users during the review step.

### Concrete Deliverables
- `AdvancedReviewTab.tsx` modified to import and render `WarningCard`
- New local state `selectedWarning: ValidationResult | null` for bridging onAdjust → AdjustmentWizard
- Second `AdjustmentWizard` instance for warning-triggered adjustments (separate from error wizard)
- Conditional rendering: only when `!isCalculating && warnings.length > 0`

### Definition of Done
- [ ] WarningCard is visible on Tab 5 when validation warnings exist (e.g., aggressive timeline)
- [ ] WarningCard is NOT visible when no warnings exist
- [ ] WarningCard is NOT visible during recalculation (`isCalculating`)
- [ ] "Adjust Plan" button on actionable warnings opens AdjustmentWizard
- [ ] Acknowledgment checkbox state flows to `setWarningsAcknowledged`
- [ ] TypeScript compiles with zero new errors
- [ ] No existing functionality is broken

### Must Have
- WarningCard renders between WeightManagementSection and footer spacer
- Conditional rendering with `!isCalculating` guard to prevent stale warning flash
- `onAdjust` handler opens a dedicated AdjustmentWizard for warnings
- `onAcknowledgmentChange` wired to `setWarningsAcknowledged`
- Import of `ValidationResult` type for local state typing

### Must NOT Have (Guardrails)
- **DO NOT** modify `useAdvancedReviewForm.ts` — all needed state already exists
- **DO NOT** modify `useReviewValidation.ts` — calculation logic is correct
- **DO NOT** modify `WarningCard.tsx` — component is fully implemented
- **DO NOT** modify `AdjustmentWizard.tsx` — modal works correctly
- **DO NOT** modify the existing AdjustmentWizard invocation block (lines 177-220) — that's the error wizard, separate concern
- **DO NOT** change the Complete/Back button behavior or gate it on `warningsAcknowledged` — user did not request this
- **DO NOT** render `ValidationSummary` — incompatible type contract (`TabValidationResult` vs `ValidationResult`)
- **DO NOT** fix the orphaned error wizard trigger (`setShowAdjustmentWizard(true)` never called) — separate bug, out of scope
- **DO NOT** refactor the duplicate warning logic between `warningValidations.ts` and `warnings/` subdirectory — cosmetic, out of scope

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (the project has test infrastructure but tests are mostly failing per README — 4.2% pass rate)
- **Automated tests**: NO — existing test suite is largely broken; adding tests for this specific wiring change is not worth the effort
- **Framework**: N/A
- **QA Policy**: Agent-executed QA scenarios using Playwright for UI verification and TypeScript compilation check

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Single task — the core wiring):
└── Task 1: Wire WarningCard into AdvancedReviewTab.tsx [quick]

Wave 2 (Verification):
└── Task 2: QA verification — Playwright + TypeScript check [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → F1-F4
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | None | 2 |
| 2 | 1 | F1-F4 |
| F1-F4 | 2 | None |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick`
- **Wave 2**: 1 task — T2 → `unspecified-high` + `playwright` skill
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

- [ ] 1. Wire WarningCard into AdvancedReviewTab.tsx

  **What to do**:
  1. Add import for `WarningCard` from `../../../components/onboarding/WarningCard`
  2. Add import for `ValidationResult` from `../../../services/validationEngine`
  3. Add `warningsAcknowledged, setWarningsAcknowledged` to the hook destructuring at lines 58-78 (they're already returned by `useAdvancedReviewForm`, just not destructured)
  4. Add local state: `const [selectedWarning, setSelectedWarning] = useState<ValidationResult | null>(null)` — import `useState` is already present (line 1 via React)
  5. Add `WarningCard` render between `WeightManagementSection` (line 147) and the footer spacer `<View style={{ height: 80 }} />` (line 149), wrapped in conditional:
     ```tsx
     {!isCalculating && validationResults && validationResults.warnings.length > 0 && (
       <WarningCard
         warnings={validationResults.warnings}
         onAcknowledgmentChange={setWarningsAcknowledged}
         onAdjust={(warning) => {
           setSelectedWarning(warning);
           setShowAdjustmentWizard(true);
         }}
       />
     )}
     ```
  6. Add a SECOND `AdjustmentWizard` instance after the existing one (after line 220), for warning-triggered adjustments:
     ```tsx
     {showAdjustmentWizard && selectedWarning && !validationResults?.errors?.length && (
       <AdjustmentWizard
         visible={showAdjustmentWizard}
         onClose={() => {
           setShowAdjustmentWizard(false);
           setSelectedWarning(null);
         }}
         error={selectedWarning}
         currentData={{
           bmr: calculatedData?.calculated_bmr || 0,
           tdee: calculatedData?.calculated_tdee || 0,
           currentWeight: bodyAnalysis?.current_weight_kg || 0,
           targetWeight: bodyAnalysis?.target_weight_kg || 0,
           currentTimeline: bodyAnalysis?.target_timeline_weeks || 0,
           currentFrequency: workoutPreferences?.workout_frequency_per_week || 0,
         }}
         primaryGoals={workoutPreferences?.primary_goals || []}
         onSelectAlternative={(alt) => {
           const smartAlt = smartAlternatives?.alternatives.find(
             (sa) => sa.weeklyRate === alt.weeklyRate && sa.dailyCalories === alt.dailyCalories,
           );
           if (smartAlt) {
             handleRateSelection(smartAlt);
           } else {
             handleRateSelection({
               id: "warning-adj-" + alt.name,
               label: alt.name,
               description: alt.approach,
               dailyCalories: alt.dailyCalories,
               weeklyRate: alt.weeklyRate,
               riskLevel: "moderate",
               isRecommended: false,
               isUserOriginal: false,
               bmrDifference: 0,
               isBlocked: false,
               requiresExercise: !!alt.newWorkoutFrequency,
               timelineWeeks: alt.newTimeline || 12,
             } as SmartAlternative);
           }
           setSelectedWarning(null);
         }}
       />
     )}
     ```

  **Must NOT do**:
  - DO NOT modify any file other than `AdvancedReviewTab.tsx`
  - DO NOT modify the existing AdjustmentWizard block (lines 177-220)
  - DO NOT gate the "Complete Setup" button on `warningsAcknowledged`
  - DO NOT modify `WarningCard.tsx`, `AdjustmentWizard.tsx`, or any hook files
  - DO NOT render `ValidationSummary`
  - DO NOT fix the orphaned error wizard trigger

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file change, ~30 lines of additions, clear instructions with exact code snippets
  - **Skills**: []
    - No special skills needed — this is a straightforward React component wiring task
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for the implementation task itself; QA is a separate task
    - `frontend-ui-ux`: No design decisions — component is pre-built

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Task 2
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `src/screens/onboarding/tabs/AdvancedReviewTab.tsx:177-220` — Existing AdjustmentWizard invocation pattern for errors — follow this EXACT pattern for the warning wizard, including the `onSelectAlternative` handler structure
  - `src/screens/onboarding/tabs/AdvancedReviewTab.tsx:58-78` — Hook destructuring — add `warningsAcknowledged, setWarningsAcknowledged` here (they're already returned by the hook, just not destructured)
  - `src/screens/onboarding/tabs/AdvancedReviewTab.tsx:140-147` — WeightManagementSection render — add WarningCard AFTER this section

  **API/Type References** (contracts to implement against):
  - `src/components/onboarding/WarningCard.tsx:24-28` — `WarningCardProps` interface: `warnings: ValidationResult[]`, `onAcknowledgmentChange?: (acknowledged: boolean) => void`, `onAdjust?: (warning: ValidationResult) => void`
  - `src/services/validation/types.ts:1-10` — `ValidationResult` interface: `{ status, code?, message?, recommendations?, alternatives?, impact?, risks?, canProceed? }`
  - `src/hooks/onboarding/useAdvancedReviewForm.ts:153-176` — Hook return value — `validationResults`, `warningsAcknowledged`, `setWarningsAcknowledged`, `showAdjustmentWizard`, `setShowAdjustmentWizard` are all available
  - `src/services/validationEngine.ts` — Re-export barrel for `ValidationResult` and `SmartAlternative` types

  **Context References** (understand the data flow):
  - `src/services/validation/core/validation-engine.ts` — `ValidationEngine.validateUserPlan()` — generates warnings ONLY when `errors.length === 0` (mutually exclusive with errors)
  - `src/hooks/onboarding/useAdvancedReviewForm.ts:73-75` — `warningsAcknowledged` resets to `false` on every warning change — this is fine since we're not gating the Complete button

  **WHY Each Reference Matters**:
  - Lines 177-220: This is the EXACT pattern to copy for the warning wizard — same `currentData` shape, same `onSelectAlternative` handler, same `SmartAlternative` casting. Don't reinvent; copy and adapt.
  - Lines 58-78: The hook already returns everything needed — just add destructured variables, no hook modification required.
  - WarningCardProps: This is the contract. `warnings` takes the exact `ValidationResult[]` type that `validationResults.warnings` provides — no transformation needed.
  - Mutual exclusivity: Warnings and errors never coexist. The guard `!validationResults?.errors?.length` on the warning wizard prevents conflicts.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: WarningCard renders when aggressive timeline is set
    Tool: Playwright
    Preconditions: 
      - Navigate to onboarding Tab 5 (Review) with body data:
        current_weight=80kg, target_weight=70kg, timeline=4 weeks
        (rate = 2.5 kg/week, triggers warnAggressiveTimeline)
      - Personal info, diet, workout tabs completed with valid defaults
    Steps:
      1. Navigate to Tab 5 (Review)
      2. Wait for calculations to complete (loading indicator disappears)
      3. Scroll down past WeightManagementSection
      4. Assert WarningCard container is visible (look for text "Important Considerations" or "Choose Your Pace")
      5. Assert warning message text contains content about the aggressive timeline
    Expected Result: WarningCard is visible below WeightManagementSection with at least one warning message
    Failure Indicators: No WarningCard visible after calculations complete; WarningCard container not in DOM
    Evidence: .sisyphus/evidence/task-1-warning-card-visible.png

  Scenario: WarningCard is absent when plan is conservative
    Tool: Playwright
    Preconditions:
      - Navigate to onboarding Tab 5 with body data:
        current_weight=80kg, target_weight=77kg, timeline=12 weeks
        (rate = 0.25 kg/week, well within safe range — no warnings should fire)
    Steps:
      1. Navigate to Tab 5 (Review)
      2. Wait for calculations to complete
      3. Scroll through entire page
      4. Assert WarningCard container is NOT present (no "Important Considerations" or "Choose Your Pace" text)
    Expected Result: No WarningCard rendered on the page
    Failure Indicators: WarningCard visible despite no warnings; stale warnings from previous calculation
    Evidence: .sisyphus/evidence/task-1-no-warning-card.png

  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: npx tsc --noEmit (or the project's equivalent build check command)
      2. Assert exit code is 0 and no new type errors
    Expected Result: Zero new TypeScript errors introduced
    Failure Indicators: Type errors related to WarningCard, ValidationResult, or selectedWarning state
    Evidence: .sisyphus/evidence/task-1-tsc-output.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-warning-card-visible.png — Screenshot of Tab 5 showing WarningCard with warnings
  - [ ] task-1-no-warning-card.png — Screenshot of Tab 5 without warnings
  - [ ] task-1-tsc-output.txt — TypeScript compilation output

  **Commit**: YES
  - Message: `feat(onboarding): wire WarningCard into review tab to display validation warnings`
  - Files: `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. QA Verification — Full Warning Flow

  **What to do**:
  Verify the complete warning flow end-to-end using Playwright. This is a dedicated QA task that validates the implementation from Task 1 actually works in the running application.

  1. Start the application in development mode
  2. Navigate through the onboarding flow with an aggressive goal configuration
  3. Verify WarningCard renders on Tab 5
  4. Test the "Adjust Plan" button opens AdjustmentWizard
  5. Test the acknowledgment checkbox
  6. Test with a conservative goal to confirm no warnings appear
  7. Capture all evidence screenshots

  **Must NOT do**:
  - DO NOT modify any source code
  - This is a verification-only task

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: QA verification requiring browser interaction and multiple test scenarios
  - **Skills**: [`playwright`]
    - `playwright`: Required for browser automation — navigating the app, filling forms, clicking buttons, taking screenshots
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a design task — pure QA verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` — The modified file from Task 1 — verify WarningCard renders here
  - `src/components/onboarding/WarningCard.tsx:89-232` — WarningCard render output — contains identifiable UI elements: "Important Considerations" or "Choose Your Pace" header, "Adjust Plan" button text, "I understand and will focus on consistency" checkbox label
  - `src/screens/onboarding/OnboardingContainer.tsx` — Tab navigation logic — understand how to get to Tab 5

  **API/Type References**:
  - `src/services/validation/warningValidations.ts:3-101` — `warnAggressiveTimeline()` — understand what inputs trigger warnings: rate > `currentWeight * 0.0075` kg/week

  **WHY Each Reference Matters**:
  - WarningCard render output: The QA agent needs to know EXACT text strings and UI elements to assert against — "Choose Your Pace", "Adjust Plan", "I understand and will focus on consistency"
  - OnboardingContainer: Needed to understand how to navigate to Tab 5 in the running app
  - warnAggressiveTimeline: Needed to construct test data that reliably triggers warnings (e.g., 80kg → 70kg in 4 weeks)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Complete aggressive goal flow — warnings visible
    Tool: Playwright
    Preconditions: App running in development mode, clean onboarding state
    Steps:
      1. Navigate to onboarding welcome screen
      2. Fill Tab 1 (Personal Info): age=30, gender=male, name=TestUser
      3. Fill Tab 2 (Diet Preferences): any valid selections
      4. Fill Tab 3 (Body Analysis): current_weight=80, target_weight=70, timeline=4 weeks
      5. Fill Tab 4 (Workout): frequency=3, any goals
      6. Arrive at Tab 5 (Review)
      7. Wait for "Review Your Plan" hero to render and calculations to finish
      8. Scroll down past Metabolic Profile, Nutritional Needs, and Weight Management sections
      9. Assert: WarningCard is visible with header text containing "Considerations" or "Pace"
      10. Assert: At least one warning message is displayed
      11. Take screenshot
    Expected Result: WarningCard visible with aggressive timeline warning
    Failure Indicators: No warning section visible; page ends at WeightManagementSection
    Evidence: .sisyphus/evidence/task-2-aggressive-flow-warnings.png

  Scenario: "Adjust Plan" button opens AdjustmentWizard
    Tool: Playwright
    Preconditions: Tab 5 visible with WarningCard showing (from previous scenario)
    Steps:
      1. Find the "Adjust Plan" button within the WarningCard
      2. Tap/click the "Adjust Plan" button
      3. Wait for AdjustmentWizard modal to appear (up to 5 seconds)
      4. Assert: Modal overlay is visible
      5. Assert: Alternative options are displayed
      6. Close the modal
      7. Take screenshot showing the modal
    Expected Result: AdjustmentWizard modal opens with rate alternatives
    Failure Indicators: Nothing happens on tap; error in console; modal doesn't render
    Evidence: .sisyphus/evidence/task-2-adjust-plan-wizard.png

  Scenario: Acknowledgment checkbox toggles
    Tool: Playwright
    Preconditions: Tab 5 visible with WarningCard showing non-actionable warnings
    Steps:
      1. Find the checkbox with text "I understand and will focus on consistency"
      2. Assert: Checkbox is unchecked initially
      3. Tap the checkbox
      4. Assert: Checkbox becomes checked (visual indicator changes)
      5. Take screenshot
    Expected Result: Checkbox toggles visually and state updates
    Failure Indicators: Checkbox not rendered; tap has no effect; visual state doesn't change
    Evidence: .sisyphus/evidence/task-2-acknowledgment-checkbox.png

  Scenario: Conservative goal — no warnings
    Tool: Playwright
    Preconditions: App running, clean onboarding state
    Steps:
      1. Navigate through onboarding with conservative data:
         Tab 3: current_weight=80, target_weight=78, timeline=12 weeks (rate=0.17 kg/wk — very safe)
      2. Arrive at Tab 5 (Review)
      3. Wait for calculations to complete
      4. Scroll through entire page
      5. Assert: No WarningCard visible (no "Important Considerations" or "Choose Your Pace" text)
      6. Assert: WeightManagementSection is followed directly by the footer spacer
      7. Take screenshot
    Expected Result: No WarningCard on the page
    Failure Indicators: WarningCard visible despite conservative goal; false positive warnings
    Evidence: .sisyphus/evidence/task-2-conservative-no-warnings.png
  ```

  **Evidence to Capture:**
  - [ ] task-2-aggressive-flow-warnings.png
  - [ ] task-2-adjust-plan-wizard.png
  - [ ] task-2-acknowledgment-checkbox.png
  - [ ] task-2-conservative-no-warnings.png

  **Commit**: NO

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read `AdvancedReviewTab.tsx`, check WarningCard import, check conditional rendering). For each "Must NOT Have": search codebase for forbidden changes — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit`. Review `AdvancedReviewTab.tsx` for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction. Verify the WarningCard conditional rendering is correct (`!isCalculating` guard present). Verify `selectedWarning` state has proper type annotation.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from Task 2 again independently. Test cross-scenario: aggressive → conservative (warnings disappear), conservative → aggressive (warnings appear). Test edge: navigate away from Tab 5 and back (warnings persist after recalculation). Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For Task 1: read "What to do", read actual diff (`git diff`). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance: verify `useAdvancedReviewForm.ts` is unmodified, `WarningCard.tsx` is unmodified, `AdjustmentWizard.tsx` is unmodified, Complete button logic is unchanged. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat(onboarding): wire WarningCard into review tab to display validation warnings` — `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: 0 errors (or same error count as before, no new errors)
```

### Final Checklist
- [ ] WarningCard renders on Tab 5 when validation warnings exist
- [ ] WarningCard is hidden when no warnings exist
- [ ] WarningCard is hidden during `isCalculating`
- [ ] "Adjust Plan" opens AdjustmentWizard for actionable warnings
- [ ] Acknowledgment checkbox wired to `setWarningsAcknowledged`
- [ ] No existing functionality broken (error wizard, Complete button, rate selection)
- [ ] Only `AdvancedReviewTab.tsx` was modified
- [ ] TypeScript compiles cleanly
