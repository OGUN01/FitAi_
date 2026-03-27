# Test Spec: UX Linkage Audit

Date: 2026-03-19

## Verification Strategy

1. Run targeted code review on major UX domains before editing:
   - onboarding/profile
   - home/hydration/progress
   - workouts
   - nutrition
   - subscription/auth/paywall
   - navigation/linkage
2. Add or tighten focused regression tests where a confirmed UX bug is not already protected.
3. After each fix batch, run:
   - affected Jest tests
   - `npm run type-check`
   - `npm run lint` when feasible for touched files / project state
4. Before completion, run reviewer verification on the final batch and ensure no pending confirmed issues remain in reviewed surfaces.

## Scenario Matrix

- Onboarding completion, reload, sign-in/sign-out, and guest/authenticated transitions
- Profile edit/save/cancel consistency
- Tab and deep-link navigation consistency
- Daily/weekly summary consistency across Home, Diet, Progress, Analytics, and Workout
- Workout start/resume/completion state consistency
- Meal/manual log/completion/edit consistency
- Hydration and progress cross-screen sync consistency
- Premium gate initialization and entitlement messaging consistency
- Empty/loading/error/disabled states for the major tab surfaces

## Exit Evidence

- Fresh verification command output
- Updated audit doc
- Updated scenario-validation doc
- Reviewer verdict: `APPROVED`
