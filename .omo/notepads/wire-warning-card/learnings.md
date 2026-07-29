# Wire WarningCard — Plan Notepad

## Learnings

## [2026-02-26] Session ses_36685b9e1ffeY7XZEMBHrvCmjO

### Architecture
- `AdvancedReviewTab.tsx` is Tab 5 in the 5-tab onboarding flow
- `useAdvancedReviewForm` hook returns ALL needed state: `validationResults`, `warningsAcknowledged`, `setWarningsAcknowledged`, `showAdjustmentWizard`, `setShowAdjustmentWizard`, `handleRateSelection`, `smartAlternatives`
- `handleRateSelection(alternative)` in the hook already: updates `onUpdateBodyAnalysis`, updates `onUpdateWorkoutPreferences` (for exercise options), and calls `performCalculations()` — so auto-update behavior IS already implemented
- `warningsAcknowledged` auto-resets to `false` on every `validationResults?.warnings` change (line 73-75 of hook)
- Warnings and errors are mutually exclusive — engine only generates warnings when `errors.length === 0`
- Second AdjustmentWizard instance should guard with `!validationResults?.errors?.length` to prevent dual-wizard conflict

### User's Additional Requirement (2026-02-26)
User explicitly requested: "when user select the option from those warning card, adjust plan and acknowledgement the application value should be auto update respectively"
- **Auto-update on Adjust Plan selection**: ALREADY covered — `handleRateSelection` calls `onUpdateBodyAnalysis` and `onUpdateWorkoutPreferences` and then `performCalculations()`
- **Auto-update on acknowledgment**: ALREADY covered — `onAcknowledgmentChange={setWarningsAcknowledged}` wires checkbox to state

No additional code needed beyond what Task 1 specifies.

### Patterns
- Import path for WarningCard: `../../../components/onboarding/WarningCard`
- Import path for ValidationResult type: `../../../services/validationEngine`
- Second AdjustmentWizard must close itself AND clear `selectedWarning` state on close
- `onSelectAlternative` in second wizard must call `setSelectedWarning(null)` after handling

### Guardrails (DO NOT violate)
- ONLY modify `AdvancedReviewTab.tsx`
- DO NOT modify: `useAdvancedReviewForm.ts`, `useReviewValidation.ts`, `WarningCard.tsx`, `AdjustmentWizard.tsx`
- DO NOT gate Complete button on `warningsAcknowledged`
- DO NOT fix orphaned error wizard trigger (separate bug)
- DO NOT render `ValidationSummary` (incompatible types)


## [2026-02-26] Task Completion — Wire WarningCard to AdvancedReviewTab

### What was done
- Added `import { WarningCard }` from `../../../components/onboarding/WarningCard`
- Added `import { ValidationResult }` from `../../../services/validationEngine`
- Destructured `warningsAcknowledged, setWarningsAcknowledged` from `useAdvancedReviewForm` call (they were already returned by hook, just not destructured)
- Added `React.useState<ValidationResult | null>(null)` for `selectedWarning` local state
- Added WarningCard render block after WeightManagementSection, before footer spacer
- Added second AdjustmentWizard instance guarded by `selectedWarning && (!validationResults || validationResults.errors.length === 0)`

### Verification
- `npx tsc --noEmit` returned only 1 pre-existing error in unrelated file (`AchievementShowcase.tsx`) — zero new errors
- Only `AdvancedReviewTab.tsx` was modified (395 lines final vs 326 lines original)