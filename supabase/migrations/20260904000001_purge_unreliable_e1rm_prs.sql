-- D1 fix (Workout Engine v2, Phase 0): estimateOneRepMax previously ran
-- uncapped Epley above 10 reps, so any set logged with >12 reps could write
-- an inflated estimated_1rm PR (e.g. a 20-rep set reports ~1.67x true load).
-- The formula is now capped at MAX_RELIABLE_REPS=12 (src/utils/oneRepMax.ts).
-- This is a one-off cleanup of PR rows written under the old, unreliable
-- calculation. Weight PRs (pr_type='weight') are untouched — they are never
-- reps-dependent and were never affected by this bug.
--
-- Safe to re-run: the DELETE is idempotent (no-op once the rows are gone).

DELETE FROM exercise_prs
WHERE pr_type = 'estimated_1rm'
  AND reps IS NOT NULL
  AND reps > 12;
