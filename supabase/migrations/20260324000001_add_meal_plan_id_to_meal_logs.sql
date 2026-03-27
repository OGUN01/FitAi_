-- Add meal_plan_id column to meal_logs if missing.
-- The original migration (20250129000002) included this column, but the live
-- schema diverged. Safe to re-run due to IF NOT EXISTS.
ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS meal_plan_id UUID;

CREATE INDEX IF NOT EXISTS idx_meal_logs_plan_id
  ON public.meal_logs(meal_plan_id)
  WHERE meal_plan_id IS NOT NULL;
