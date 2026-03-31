-- Drop the undocumented workout_sessions_duration_check constraint that exists on
-- the live DB but is not defined in any migration file. It is blocking inserts
-- from the workout completion flow when duration is NULL or a small positive value.
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_duration_check;

-- Add a permissive replacement: allow NULL or any non-negative value.
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_duration_check CHECK (duration IS NULL OR duration >= 0);
