## Task Statement

Perform a full architecture and source-of-truth audit across the FitAI app, backend workers, Supabase schema, offline sync layer, and cross-screen read models. Find all confirmed architecture issues before starting the next fix batch.

## Desired Outcome

Produce one precise audit artifact that lists every confirmed architecture issue, why it is a problem, its failure mode, affected files, and the likely remediation direction. The audit should cover fitness, nutrition, offline sync, analytics, health data, subscription, config, migration, and identity/mapping behavior.

## Known Facts / Evidence

- Recent workout sync bugs were caused by ambiguous identity and multiple sources of truth for workout history vs plan slots.
- `workout_sessions` now has first-class `planned_day_key` and `plan_slot_key`.
- A migration was pushed to enforce a single active weekly workout plan per user.
- Old orphan unfinished `workout_sessions` rows were cleaned directly from Supabase.
- Prior focused sweeps already confirmed issues in nutrition identity, offline sync idempotency, UTC/local day boundaries, subscription usage truth, and duplicate read models.
- Current repo is on `master`, synced with `origin/master`, and `tsc --noEmit --pretty false` passes.

## Constraints

- Do not start broad fixes yet; the immediate goal is exhaustive architecture discovery and documentation.
- Use maximum practical parallelism.
- Prefer confirmed issues with file-level evidence over speculative concerns.
- Preserve existing user changes; do not revert unrelated work.
- Keep a durable audit artifact inside the repo.

## Unknowns / Open Questions

- Which domains still have duplicated read/write models not yet surfaced by focused sweeps?
- Where are there remaining identity mismatches between planned entities and historical entities?
- Which tables still allow multiple active rows without DB enforcement?
- Where do offline/local caches still override or mask backend truth?
- Which analytics or dashboard aggregations mix incompatible scopes or dates?

## Likely Codebase Touchpoints

- `src/stores`
- `src/services`
- `src/hooks`
- `src/screens`
- `src/utils`
- `fitai-workers/src`
- `fitai-admin/src`
- `supabase/migrations`

## Audit Approach

1. Split the audit into parallel lanes by domain and architecture concern.
2. Collect only issues with concrete evidence.
3. Consolidate overlapping findings into one canonical audit document.
4. Re-scan for uncovered domains and duplicate findings before declaring the audit complete.
