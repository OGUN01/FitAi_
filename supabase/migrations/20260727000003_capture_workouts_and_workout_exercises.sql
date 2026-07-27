-- ============================================================================
-- Migration: 20260727000003_capture_workouts_and_workout_exercises.sql
-- ============================================================================
-- Purpose: Create the `workouts` and `workout_exercises` tables in a
-- migration. They are referenced by src/services/fitnessData.ts
-- (:149,:153,:308,:348,:396,:448) and src/services/migrationManager.ts:808,
-- and are declared in src/services/supabase-types.generated.ts, but were
-- NEVER created in any migration. As a result `supabase db push` against a
-- fresh database omits them and the app breaks. (migrationManager even
-- contains a comment: "workouts table does not exist in the schema; skip
-- it" — referring to the migration-set, not the live DB.)
--
-- Column types are inferred from the generated TS types
-- (supabase-types.generated.ts):
--   workouts:         lines 3264-3307
--   workout_exercises: lines 2974-3024
-- Mapping: string -> TEXT, number -> appropriate numeric, Date -> TIMESTAMPTZ.
--
-- On the live DB these tables already exist, so CREATE TABLE IF NOT EXISTS
-- is a no-op. On a fresh DB this creates them reproducibly.
--
-- CONCERN (flagged in deliverable): The live `workouts` / `workout_exercises`
-- tables were created out-of-band, so their ACTUAL live column types,
-- constraints, defaults, and indexes may differ from what is inferred here
-- from the generated types. Someone should manually verify the live schema
-- matches this migration (e.g. via `\d workouts` in psql) and, if there is
-- drift, add a follow-up migration to align them. The goal of this file is
-- reproducibility for fresh deploys, not live reconciliation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: workouts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_created ON workouts(user_id, created_at DESC);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workouts' AND policyname = 'Users can manage their own workouts') THEN
    CREATE POLICY "Users can manage their own workouts"
      ON workouts FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: workout_exercises
-- ----------------------------------------------------------------------------
-- `order_index` is NOT NULL per the Insert type (it is the only required
-- non-id field besides workout_id relationship). All other columns nullable.
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  rest_seconds INTEGER,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON workout_exercises(exercise_id);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- workout_exercises has no direct user_id; access is gated through the
-- parent workout's user_id via an EXISTS subquery (same pattern used by
-- meal_foods). WITH CHECK verifies the parent workout belongs to the user
-- before allowing INSERT/UPDATE.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_exercises' AND policyname = 'Users can manage workout_exercises for their workouts') THEN
    CREATE POLICY "Users can manage workout_exercises for their workouts"
      ON workout_exercises FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
      );
  END IF;
END $$;
