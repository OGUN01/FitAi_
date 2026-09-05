-- Workout Engine v2, Phase 4B.2: cardio block session logging.
--
-- CardioBlock (src/types/workout.ts) has always been a PLAN-only object —
-- consumed exclusively by planning/estimation services (energy/planBurn.ts,
-- safetyGates.ts). Confirmed zero runtime code touched it before this: no
-- matches for "cardio"/"CardioBlock" in WorkoutSessionScreen.tsx,
-- useWorkoutSession.ts, or completionTracking.ts, and
-- fitnessStore.startWorkoutSession built currentWorkoutSession.exercises
-- EXCLUSIVELY from workout.exercises — cardio blocks were never seeded into
-- a session, so there was nothing to log even if a write path existed.
--
-- A NEW table rather than an addition to exercise_sets: that table's schema
-- is exercise-SET-shaped (reps/weight/set_type per set) — a cardio block is
-- a single timed activity with no sets, so column-additive reuse would leave
-- most exercise_sets columns meaningless on every cardio row.

CREATE TABLE IF NOT EXISTS workout_cardio_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  -- CardioBlock.id from the plan — lets a completed log be traced back to
  -- the exact planned block, same way exercise_sets.exercise_id does for sets.
  block_id TEXT NOT NULL,
  name TEXT NOT NULL,
  planned_duration_minutes INTEGER NOT NULL,
  -- NULL when the user didn't adjust duration — actual over estimated
  -- (CLAUDE.md #9) only applies when there's a genuine actual value; falling
  -- back to planned_duration_minutes is the caller's job, not a fabricated 0.
  actual_duration_minutes INTEGER,
  intensity TEXT NOT NULL CHECK (intensity IN ('low', 'moderate', 'high')),
  distance_km NUMERIC(6,2),
  -- Computed at write time from the SAME MET formula planBurn.ts uses for
  -- plan-side estimates (metMappings.getExerciseTypeOverride ×
  -- CARDIO_INTENSITY_MODIFIERS × weight × hours) — but using the ACTUAL
  -- logged duration when present, not the plan's estimate.
  calories_burned INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_cardio_logs_user_session
  ON workout_cardio_logs (user_id, session_id);

ALTER TABLE workout_cardio_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_cardio_logs_select_own" ON workout_cardio_logs;
CREATE POLICY "workout_cardio_logs_select_own" ON workout_cardio_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "workout_cardio_logs_insert_own" ON workout_cardio_logs;
CREATE POLICY "workout_cardio_logs_insert_own" ON workout_cardio_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workout_cardio_logs_delete_own" ON workout_cardio_logs;
CREATE POLICY "workout_cardio_logs_delete_own" ON workout_cardio_logs
  FOR DELETE USING (auth.uid() = user_id);
