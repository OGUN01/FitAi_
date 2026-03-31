-- Migration: Add rpe and is_calibration columns to exercise_sets
-- PURPOSE:
--   rpe (1=easy, 2=just right, 3=hard) — captured after every working set via
--   the three-tap UI in SetLogModal. Used by progressionService to calibrate
--   weight increase speed (easy → jump faster, hard → hold even if reps hit top).
--
--   is_calibration — marks sets logged during Session 1 ramp-up protocol.
--   These sets are intentionally exploratory and must never be used as input
--   to progressionService or deloadService — they would falsely trigger deloads.
--
-- SSOT: exercise_sets is the only place rpe and is_calibration are persisted.
--       estimated_1RM is computed live and never stored.

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS rpe SMALLINT CHECK (rpe IN (1, 2, 3));

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS is_calibration BOOLEAN NOT NULL DEFAULT false;

-- Partial index for fast RPE trend queries (only indexes rows with rpe set)
CREATE INDEX IF NOT EXISTS idx_exercise_sets_rpe
  ON exercise_sets(user_id, exercise_id, completed_at DESC)
  WHERE rpe IS NOT NULL;

-- Comment so future developers understand the column semantics
COMMENT ON COLUMN exercise_sets.rpe IS
  '1=easy (could do more), 2=just right (target effort), 3=hard (near limit). NULL = not captured (treated as 2 by progressionService).';

COMMENT ON COLUMN exercise_sets.is_calibration IS
  'TRUE for sets logged during Session 1 calibration ramp-up. These sets establish starting weight but are excluded from progression and deload calculations.';
