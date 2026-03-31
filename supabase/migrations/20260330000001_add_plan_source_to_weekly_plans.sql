-- Add plan_source to weekly_workout_plans to support dual AI + custom plans
-- This allows one active AI plan AND one active custom plan per user simultaneously.

-- Add plan_source column (defaults to 'ai' for existing rows)
ALTER TABLE weekly_workout_plans
  ADD COLUMN IF NOT EXISTS plan_source TEXT NOT NULL DEFAULT 'ai';

-- Add check constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'weekly_workout_plans_plan_source_check'
  ) THEN
    ALTER TABLE weekly_workout_plans
      ADD CONSTRAINT weekly_workout_plans_plan_source_check
      CHECK (plan_source IN ('ai', 'custom'));
  END IF;
END $$;

-- Drop the old unique constraint that prevents both AI and custom plans for the same week
ALTER TABLE weekly_workout_plans
  DROP CONSTRAINT IF EXISTS weekly_workout_plans_user_id_week_number_year_key;

-- New partial unique index: one active plan per source per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_plans_user_source_active
  ON weekly_workout_plans (user_id, plan_source)
  WHERE is_active = true;
