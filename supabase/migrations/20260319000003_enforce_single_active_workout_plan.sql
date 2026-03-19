-- Migration: Enforce a single active weekly workout plan per user
-- Created: 2026-03-19
-- Description:
--   - Deactivate older active weekly_workout_plans rows per user
--   - Enforce one active plan per user with a partial unique index
--   - Repair workout_sessions plan-slot backfill using the latest active plan only

WITH ranked_active_plans AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id DESC
    ) AS rank_in_user
  FROM public.weekly_workout_plans
  WHERE is_active = TRUE
)
UPDATE public.weekly_workout_plans wwp
SET is_active = FALSE
FROM ranked_active_plans ranked
WHERE wwp.id = ranked.id
  AND ranked.rank_in_user > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_workout_plans_one_active_per_user
  ON public.weekly_workout_plans (user_id)
  WHERE is_active = TRUE;

WITH latest_active_plans AS (
  SELECT DISTINCT ON (wwp.user_id)
    wwp.user_id,
    wwp.plan_data
  FROM public.weekly_workout_plans wwp
  WHERE wwp.is_active = TRUE
  ORDER BY wwp.user_id, wwp.created_at DESC, wwp.id DESC
),
latest_plan_workouts AS (
  SELECT
    lap.user_id,
    workout.elem ->> 'id' AS workout_id,
    LOWER(workout.elem ->> 'dayOfWeek') AS planned_day_key,
    CONCAT(
      LOWER(workout.elem ->> 'dayOfWeek'),
      ':',
      ROW_NUMBER() OVER (
        PARTITION BY lap.user_id, LOWER(workout.elem ->> 'dayOfWeek')
        ORDER BY workout.ord
      ) - 1
    ) AS plan_slot_key
  FROM latest_active_plans lap
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(lap.plan_data -> 'workouts', '[]'::jsonb)
  ) WITH ORDINALITY AS workout(elem, ord)
  WHERE jsonb_typeof(COALESCE(lap.plan_data -> 'workouts', '[]'::jsonb)) = 'array'
    AND workout.elem ? 'id'
    AND workout.elem ? 'dayOfWeek'
)
UPDATE public.workout_sessions ws
SET
  planned_day_key = lpw.planned_day_key,
  plan_slot_key = lpw.plan_slot_key
FROM latest_plan_workouts lpw
WHERE ws.is_extra IS NOT TRUE
  AND ws.user_id = lpw.user_id
  AND ws.workout_id = lpw.workout_id;

WITH parsed_workout_ids AS (
  SELECT
    ws.id,
    SUBSTRING(
      LOWER(ws.workout_id)
      FROM '(monday|tuesday|wednesday|thursday|friday|saturday|sunday)'
    ) AS planned_day_key
  FROM public.workout_sessions ws
  WHERE ws.is_extra IS NOT TRUE
    AND ws.workout_id IS NOT NULL
    AND (ws.planned_day_key IS NULL OR ws.plan_slot_key IS NULL)
)
UPDATE public.workout_sessions ws
SET
  planned_day_key = COALESCE(ws.planned_day_key, parsed.planned_day_key),
  plan_slot_key = COALESCE(
    ws.plan_slot_key,
    CASE
      WHEN parsed.planned_day_key IS NOT NULL THEN parsed.planned_day_key || ':0'
      ELSE NULL
    END
  )
FROM parsed_workout_ids parsed
WHERE ws.id = parsed.id
  AND parsed.planned_day_key IS NOT NULL;
