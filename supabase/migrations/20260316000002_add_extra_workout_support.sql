-- Add is_extra flag to workout_sessions
-- Append-only migration, safe to re-run (ADD COLUMN IF NOT EXISTS)
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

-- Partial index: only indexes extra sessions
CREATE INDEX IF NOT EXISTS idx_workout_sessions_extra
  ON workout_sessions(user_id, completed_at DESC)
  WHERE is_extra = TRUE;
