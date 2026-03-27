CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_muscle_groups TEXT[] DEFAULT '{}',
  estimated_duration_minutes INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id);
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_templates' AND policyname = 'Users can manage own templates') THEN
    CREATE POLICY "Users can manage own templates" ON workout_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_templates' AND policyname = 'Public templates readable by all') THEN
    CREATE POLICY "Public templates readable by all" ON workout_templates FOR SELECT USING (is_public = true);
  END IF;
END $$;
