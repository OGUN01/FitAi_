-- Drop the old single-active-plan-per-user index that conflicts with dual plan support.
-- The replacement index idx_weekly_plans_user_source_active (user_id, plan_source)
-- WHERE is_active = true was created in 20260330000001.
DROP INDEX IF EXISTS idx_weekly_workout_plans_one_active_per_user;
