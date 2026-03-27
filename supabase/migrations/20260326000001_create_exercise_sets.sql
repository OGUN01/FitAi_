CREATE TABLE IF NOT EXISTS exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  duration_seconds INTEGER,
  set_type TEXT NOT NULL DEFAULT 'normal' CHECK (set_type IN ('normal','warmup','failure','drop')),
  is_completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_user_exercise ON exercise_sets(user_id, exercise_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session ON exercise_sets(session_id);
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_sets' AND policyname = 'Users can manage own exercise sets') THEN
    CREATE POLICY "Users can manage own exercise sets" ON exercise_sets FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
