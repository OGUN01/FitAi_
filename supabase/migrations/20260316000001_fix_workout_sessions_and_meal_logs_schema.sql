-- ============================================================================
-- FIX: Align workout_sessions and meal_logs with application code
-- ============================================================================
-- Problem: The simplified workout_sessions table created by
-- 20260226000001_add_workout_sessions_table.sql is missing columns that the
-- application code (completionTracking.ts) expects. The meal_logs table is also
-- missing meal_name and food_items columns.
--
-- This migration is safe to run regardless of which prior migration created
-- the tables — ADD COLUMN IF NOT EXISTS is a no-op when the column exists.

-- ============================================================================
-- FIX: workout_sessions — add columns required by completionTracking.ts
-- ============================================================================
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS workout_plan_id UUID,
  ADD COLUMN IF NOT EXISTS workout_name TEXT,
  ADD COLUMN IF NOT EXISTS workout_type TEXT,
  ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS exercises_completed JSONB,
  ADD COLUMN IF NOT EXISTS enjoyment_rating INTEGER
    CHECK (enjoyment_rating IS NULL OR (enjoyment_rating >= 1 AND enjoyment_rating <= 5));

-- Indexes for the newly added columns
CREATE INDEX IF NOT EXISTS idx_workout_sessions_type
  ON workout_sessions(user_id, workout_type);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_id
  ON workout_sessions(workout_plan_id)
  WHERE workout_plan_id IS NOT NULL;

-- ============================================================================
-- FIX: meal_logs — add columns required by completionTracking.ts
-- ============================================================================
ALTER TABLE meal_logs
  ADD COLUMN IF NOT EXISTS meal_name TEXT,
  ADD COLUMN IF NOT EXISTS food_items JSONB;
