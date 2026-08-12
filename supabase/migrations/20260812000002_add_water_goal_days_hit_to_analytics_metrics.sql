-- Achievement Engine: durable backing for the "Water Week" achievement's
-- cumulative progress metric.
--
-- Mirrors the nutrition_streak / longest_nutrition_streak pattern added in
-- 20260728000001_add_nutrition_streak_to_analytics_metrics.sql. Without a
-- cloud-persisted counter, achievementStore.totalWaterGoalDaysHit lived only
-- in the local AsyncStorage `persist` middleware, so a reinstall or device
-- switch silently reset it to 0 — and because achievementEngine.checkAchievements
-- overwrites an in-progress achievement's stored `progress` on every check,
-- that reset visibly rolled an already-progressed "Water Week" progress bar
-- backward instead of just staying locked.
--
-- Columns are nullable so existing rows (and guest/no-data users) are unaffected.
-- Append-only / safe to re-run (IF NOT EXISTS).
--
-- SSOT writer: achievementStore.recordWaterGoalHit (via
-- src/services/achievements/waterGoalPersistence.ts).

ALTER TABLE public.analytics_metrics
  ADD COLUMN IF NOT EXISTS total_water_goal_days_hit INTEGER,
  ADD COLUMN IF NOT EXISTS last_water_goal_hit_date DATE;

COMMENT ON COLUMN public.analytics_metrics.total_water_goal_days_hit IS
  'Achievement engine: lifetime count of distinct calendar days the water intake goal was hit. Nullable until first hit.';
COMMENT ON COLUMN public.analytics_metrics.last_water_goal_hit_date IS
  'Achievement engine: local calendar date (YYYY-MM-DD) of the most recent water-goal hit, used to make the daily increment idempotent. Nullable until first hit.';
