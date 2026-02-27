CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0,  -- seconds
  calories_burned INTEGER DEFAULT 0,
  exercises JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started ON workout_sessions(user_id, started_at DESC);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout_sessions"
  ON workout_sessions FOR ALL USING (auth.uid() = user_id);
