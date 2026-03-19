-- Migration: Enforce a single active weekly meal plan per user
-- Purpose:
--   - Deactivate older active weekly_meal_plans rows per user
--   - Make one active meal plan a DB invariant
--   - Add a lookup index for planned meal completion hydration

ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS from_plan BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_meal_id TEXT;

WITH ranked_active_plans AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.weekly_meal_plans
  WHERE is_active = TRUE
)
UPDATE public.weekly_meal_plans wmp
SET is_active = FALSE,
    updated_at = NOW()
FROM ranked_active_plans rap
WHERE wmp.id = rap.id
  AND rap.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_meal_plans_one_active_per_user
ON public.weekly_meal_plans (user_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_plan_meal_logged_at
ON public.meal_logs (user_id, plan_meal_id, logged_at DESC)
WHERE from_plan = TRUE
  AND plan_meal_id IS NOT NULL;
