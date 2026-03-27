-- Fix workout_sessions columns that are NOT NULL without defaults.
-- The live schema has diverged from migration expectations; several columns
-- reject inserts when the app legitimately has no value yet (e.g. a workout
-- just started has no calories_burned).

ALTER TABLE public.workout_sessions
  ALTER COLUMN calories_burned SET DEFAULT 0,
  ALTER COLUMN calories_burned DROP NOT NULL;

ALTER TABLE public.workout_sessions
  ALTER COLUMN duration SET DEFAULT 0,
  ALTER COLUMN duration DROP NOT NULL;

ALTER TABLE public.workout_sessions
  ALTER COLUMN workout_id DROP NOT NULL;

UPDATE public.workout_sessions
  SET calories_burned = 0
  WHERE calories_burned IS NULL;

UPDATE public.workout_sessions
  SET duration = 0
  WHERE duration IS NULL;
