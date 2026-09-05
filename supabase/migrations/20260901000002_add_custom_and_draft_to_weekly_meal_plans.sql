-- Add plan_source + is_draft to weekly_meal_plans to support dual AI + custom
-- diet plans, mirroring 20260330000001_add_plan_source_to_weekly_plans.sql
-- and 20260725000010_workout_builder_foundation.sql §4 on the workout side.
--
-- Also repairs schema drift: the live table already has plan_data,
-- plan_description, total_meals and total_calories (written by
-- nutritionStore.saveWeeklyMealPlan since before this migration existed) but
-- no migration file ever declared them — the CREATE TABLE in
-- 20260124000001_add_missing_data_tables.sql only declared `meals` and
-- `total_estimated_calories`. All ADD COLUMN statements below are
-- IF NOT EXISTS so this migration is safe to apply regardless of which
-- columns are already present on the live database.

ALTER TABLE weekly_meal_plans
  ADD COLUMN IF NOT EXISTS plan_source TEXT NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_data JSONB,
  ADD COLUMN IF NOT EXISTS plan_description TEXT,
  ADD COLUMN IF NOT EXISTS total_meals INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_calories INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'weekly_meal_plans_plan_source_check'
  ) THEN
    ALTER TABLE weekly_meal_plans
      ADD CONSTRAINT weekly_meal_plans_plan_source_check
      CHECK (plan_source IN ('ai', 'custom'));
  END IF;
END $$;

-- Drop the legacy per-week unique constraint that would otherwise prevent an
-- AI plan and a custom plan coexisting for the same user/week. May already
-- be gone (e.g. if the `year` column was dropped out-of-band, which the
-- constraint depended on) — IF EXISTS makes this safe either way.
ALTER TABLE weekly_meal_plans
  DROP CONSTRAINT IF EXISTS weekly_meal_plans_user_id_week_number_year_key;

-- THE BLOCKER: this partial unique index (one active plan per user, with no
-- plan_source distinction) makes a simultaneous active AI + active custom
-- plan physically impossible. It must be dropped before a second
-- plan_source can ever go active. Added by
-- 20260319000004_enforce_single_active_weekly_meal_plan.sql; the workout
-- side hit the identical problem and fixed it in
-- 20260331000002_drop_old_one_active_plan_index.sql.
DROP INDEX IF EXISTS idx_weekly_meal_plans_one_active_per_user;

-- Replacement: one active, non-draft plan per (user, plan_source).
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_meal_plans_user_source_active
  ON weekly_meal_plans (user_id, plan_source)
  WHERE is_active = TRUE AND is_draft = FALSE;

-- Lookup index for builder draft autosave/restore.
CREATE INDEX IF NOT EXISTS idx_weekly_meal_plans_draft
  ON weekly_meal_plans (user_id, plan_source, is_draft, updated_at DESC)
  WHERE is_draft = TRUE;
