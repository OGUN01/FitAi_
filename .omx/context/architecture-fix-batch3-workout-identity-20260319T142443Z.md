## Task Statement

Continue the architecture-fix rollout with the workout identity batch.

## Desired Outcome

Eliminate the remaining workout source-of-truth ambiguity in:
- workout hydration and completed-session reconciliation
- regeneration identity continuity
- residual UI/stat readers that still derive from `workoutProgress` instead of canonical history

## Known Facts / Evidence

- Batch 1 completed nutrition identity, meal-plan invariants, and offline/data-bridge hardening.
- Batch 2 completed shared local day/week semantics for key user-facing readers.
- The audit still identifies workout-specific gaps around:
  - regeneration preserving logical slot identity
  - hydration preferring local stale state or mutable progress maps
  - remaining `workoutProgress`-based readers
  - worker generation contract not requiring stable nested workout identity

## Constraints

- Preserve the new local day/week contract from batch 2.
- Do not reintroduce plan/session ambiguity while cleaning old readers.
- Prefer stable slot identity + canonical completed-session data over progress-map fallbacks.

## Unknowns / Open Questions

- Which workout readers can be cut over entirely to completed sessions in this batch?
- Whether generation identity can be tightened app-side only, or needs worker validation/schema support in the same slice.
- Which hydration merge paths still preserve stale local state.

## Likely Codebase Touchpoints

- `src/hooks/useFitnessLogic.ts`
- `src/stores/fitnessStore.ts`
- `src/stores/fitness/dataActions.ts`
- `src/screens/main/fitness/WeeklyPlanOverview.tsx`
- `src/services/completion-tracking/stats-calculator.ts`
- `src/services/dataRetrieval.ts`
- `src/ai/index.ts`
- `src/ai/workoutGeneration.ts`
- `fitai-workers/src/utils/validation.ts`

## Batch Strategy

1. Fix hydration/reconciliation around completed sessions and stale local merges.
2. Remove remaining `workoutProgress`-derived reader drift where completed sessions should be authoritative.
3. Tighten regeneration/worker identity assumptions as far as possible in one slice.
