-- Atomic increment RPC for analytics_metrics' accumulating daily counters.
--
-- Background: src/services/analyticsData.ts:updateTodaysMetrics accumulates
-- calories_consumed / calories_burned / workouts_completed / meals_logged by
-- SELECTing the existing row client-side, adding the increment in JS, then
-- UPSERTing the sum. That read-then-write is not atomic: two near-simultaneous
-- callers (e.g. completing a workout right after logging a meal — both call
-- updateTodaysMetrics independently, see completionTracking.ts) can both read
-- the same stale row and the second UPSERT silently clobbers the first's
-- increment — a lost-update race that undercounts the day's totals feeding
-- the Monthly Summary and calorie-history charts.
--
-- Fix: do the increment as a single atomic SQL statement instead — Postgres's
-- own row lock during INSERT ... ON CONFLICT DO UPDATE makes
-- "column = column + delta" race-free without any client-side read.
--
-- Safe to re-run: CREATE OR REPLACE is idempotent.

CREATE OR REPLACE FUNCTION public.increment_analytics_metrics(
  p_user_id UUID,
  p_metric_date DATE,
  p_calories_consumed_delta NUMERIC DEFAULT 0,
  p_calories_burned_delta NUMERIC DEFAULT 0,
  p_workouts_completed_delta INTEGER DEFAULT 0,
  p_meals_logged_delta INTEGER DEFAULT 0,
  p_weight_kg NUMERIC DEFAULT NULL,
  p_steps INTEGER DEFAULT NULL,
  p_sleep_hours NUMERIC DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Defense in depth on top of RLS: a caller can only increment their own
  -- row. RLS policies on analytics_metrics (auth.uid() = user_id) would
  -- already reject a mismatched insert/update; this just fails fast with a
  -- clearer error instead of a generic RLS-denied error.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify analytics_metrics for another user';
  END IF;

  INSERT INTO public.analytics_metrics (
    id, user_id, metric_date,
    calories_consumed, calories_burned, workouts_completed, meals_logged,
    weight_kg, steps, sleep_hours
  ) VALUES (
    p_user_id::text || '_' || p_metric_date::text,
    p_user_id, p_metric_date,
    p_calories_consumed_delta, p_calories_burned_delta,
    p_workouts_completed_delta, p_meals_logged_delta,
    p_weight_kg, p_steps, p_sleep_hours
  )
  ON CONFLICT (user_id, metric_date) DO UPDATE SET
    calories_consumed = analytics_metrics.calories_consumed + EXCLUDED.calories_consumed,
    calories_burned = analytics_metrics.calories_burned + EXCLUDED.calories_burned,
    workouts_completed = analytics_metrics.workouts_completed + EXCLUDED.workouts_completed,
    meals_logged = analytics_metrics.meals_logged + EXCLUDED.meals_logged,
    -- Non-accumulating fields: overwrite only when the caller actually
    -- passed a value (NULL means "not part of this update"), same
    -- conditional-overwrite semantics the old client-side code had.
    weight_kg = COALESCE(EXCLUDED.weight_kg, analytics_metrics.weight_kg),
    steps = COALESCE(EXCLUDED.steps, analytics_metrics.steps),
    sleep_hours = COALESCE(EXCLUDED.sleep_hours, analytics_metrics.sleep_hours),
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_analytics_metrics TO authenticated;

COMMENT ON FUNCTION public.increment_analytics_metrics IS
  'Atomically increments analytics_metrics daily counters for one user/date. Replaces the client-side read-add-upsert in analyticsData.ts:updateTodaysMetrics, which had a lost-update race between concurrent callers.';
