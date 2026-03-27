## Task Statement

Start implementing architecture fixes using the architecture audit and scenario-validation reports as canonical inputs.

## Desired Outcome

Complete the first fix batch end-to-end:
- make planned meal identity first-class in the app and database contract
- enforce a single active weekly meal plan source of truth
- remove the most dangerous offline/data-bridge correctness gaps that would corrupt the new truth model
- verify with targeted tests and typecheck

## Known Facts / Evidence

- Canonical audit: `docs/architecture-audit-2026-03-19.md`
- Canonical validation: `docs/scenario-validation-2026-03-19.md`
- Highest-leverage confirmed fix order:
  1. nutrition identity + `weekly_meal_plans` invariant
  2. offline queue/idempotency/bridge correctness
  3. date/week boundary unification
  4. workout regeneration identity + hydration reconciliation
  5. read-model cleanup
  6. subscription/config/auth truth alignment
- Existing validation already showed:
  - nutrition planned-meal identity is uncovered
  - `weekly_meal_plans` has no single-active invariant
  - offline replay currently validates destructive purge behavior

## Constraints

- Preserve unrelated user changes.
- Prefer focused, high-confidence fixes over scattered edits.
- Add DB migrations when invariants belong in the database.
- Keep a clear path for follow-up regression tests.

## Unknowns / Open Questions

- Which app-side nutrition readers need adjustment once `plan_meal_id` becomes authoritative?
- How much offline replay logic can be hardened in one batch without touching unrelated domains?
- Whether any existing legacy rows need repair/backfill as part of the new meal-plan invariant migration.

## Likely Codebase Touchpoints

- `src/services/completionTracking.ts`
- `src/services/completion-tracking/meal-completion.ts`
- `src/stores/nutritionStore.ts`
- `src/stores/nutrition/actions.ts`
- `src/stores/nutrition/persistence.ts`
- `src/services/offline.ts`
- `src/services/DataBridge.ts`
- `src/services/crudOperations.ts`
- `src/services/crud/mealOperations.ts`
- `supabase/migrations`

## Batch Strategy

1. Fix nutrition identity and invariant layer first.
2. Then harden offline/data-bridge replay so the new source of truth is not re-corrupted.
3. Verify with targeted tests already identified in scenario validation plus typecheck.
