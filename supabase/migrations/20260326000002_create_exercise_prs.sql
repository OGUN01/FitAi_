CREATE TABLE IF NOT EXISTS exercise_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  pr_type TEXT NOT NULL CHECK (pr_type IN ('weight','estimated_1rm')),
  value DECIMAL(8,2) NOT NULL,
  reps INTEGER,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id, pr_type)
);
CREATE INDEX IF NOT EXISTS idx_exercise_prs_user ON exercise_prs(user_id, exercise_id);
ALTER TABLE exercise_prs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_prs' AND policyname = 'Users can manage own PRs') THEN
    CREATE POLICY "Users can manage own PRs" ON exercise_prs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
