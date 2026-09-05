-- Workout Engine v2, Phase 3: exercise_sets.rpe_10 backfill.
--
-- rpe_10 (added by 20260725000010_workout_builder_foundation.sql) was
-- written by the workout BUILDER's target-RPE slider but never by session
-- logging — every completed set's actual effort was captured only as the
-- coarse 1-3 bucket (`rpe`), with the full 1-10 value shown in the UI
-- (RPE_NUMERIC / EFFORT_BUCKET_TO_RPE10, {1:4, 2:7, 3:9}) and then discarded.
-- The app now writes rpe_10 on every new set (src/utils/effortScale.ts).
-- This is a one-off backfill so existing history gets the same signal,
-- using the identical bucket->RPE10 mapping the app has always displayed.
--
-- Idempotent: only touches rows where rpe_10 is still NULL and rpe is known.

UPDATE exercise_sets
SET rpe_10 = CASE rpe
  WHEN 1 THEN 4
  WHEN 2 THEN 7
  WHEN 3 THEN 9
  ELSE NULL
END
WHERE rpe_10 IS NULL
  AND rpe IS NOT NULL;
