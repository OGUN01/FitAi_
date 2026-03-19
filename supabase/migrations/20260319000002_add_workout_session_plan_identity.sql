-- Migration: Add explicit planned workout identity to workout_sessions
-- Created: 2026-03-19
-- Description:
--   - Add planned_day_key and plan_slot_key so workout_sessions can be the
--     cross-device source of truth for planned-slot completions
--   - Backfill from active weekly_workout_plans.plan_data where possible
--   - Fall back to parsing legacy workout_id values that encode a weekday

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS planned_day_key TEXT,
  ADD COLUMN IF NOT EXISTS plan_slot_key TEXT;

UPDATE public.workout_sessions
SET
  planned_day_key = NULLIF(LOWER(planned_day_key), ''),
  plan_slot_key = NULLIF(LOWER(plan_slot_key), '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_sessions_planned_day_key_check'
  ) THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_planned_day_key_check
      CHECK (
        planned_day_key IS NULL OR planned_day_key IN (
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.workout_sessions.planned_day_key IS
  'Lowercase planned day-of-week for non-extra workouts, e.g. monday';

COMMENT ON COLUMN public.workout_sessions.plan_slot_key IS
  'Canonical slot key within a weekly plan, e.g. monday:0';

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_planned_day
  ON public.workout_sessions (user_id, planned_day_key, completed_at DESC)
  WHERE is_completed = TRUE AND is_extra IS NOT TRUE AND planned_day_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_plan_slot
  ON public.workout_sessions (user_id, plan_slot_key, completed_at DESC)
  WHERE is_completed = TRUE AND is_extra IS NOT TRUE AND plan_slot_key IS NOT NULL;

WITH active_plan_workouts AS (
  SELECT
    wwp.user_id,
    workout.elem ->> 'id' AS workout_id,
    LOWER(workout.elem ->> 'dayOfWeek') AS planned_day_key,
    CONCAT(
      LOWER(workout.elem ->> 'dayOfWeek'),
      ':',
      ROW_NUMBER() OVER (
        PARTITION BY wwp.user_id, LOWER(workout.elem ->> 'dayOfWeek')
        ORDER BY workout.ord
      ) - 1
    ) AS plan_slot_key
  FROM public.weekly_workout_plans wwp
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(wwp.plan_data -> 'workouts', '[]'::jsonb)
  ) WITH ORDINALITY AS workout(elem, ord)
  WHERE COALESCE(wwp.is_active, FALSE) = TRUE
    AND jsonb_typeof(COALESCE(wwp.plan_data -> 'workouts', '[]'::jsonb)) = 'array'
    AND workout.elem ? 'id'
    AND workout.elem ? 'dayOfWeek'
)
UPDATE public.workout_sessions ws
SET
  planned_day_key = COALESCE(ws.planned_day_key, apw.planned_day_key),
  plan_slot_key = COALESCE(ws.plan_slot_key, apw.plan_slot_key)
FROM active_plan_workouts apw
WHERE ws.is_extra IS NOT TRUE
  AND ws.user_id = apw.user_id
  AND ws.workout_id = apw.workout_id
  AND (ws.planned_day_key IS NULL OR ws.plan_slot_key IS NULL);

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
