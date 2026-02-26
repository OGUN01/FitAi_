-- Fix analytics_metrics table: restructure from generic key-value to daily summary layout
-- The original migration created a generic metrics table, but the application code 
-- expects a daily-summary-per-user layout with specific columns.

DROP TABLE IF EXISTS analytics_metrics CASCADE;

CREATE TABLE analytics_metrics (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  weight_kg NUMERIC,
  calories_consumed NUMERIC DEFAULT 0,
  calories_burned NUMERIC DEFAULT 0,
  workouts_completed INTEGER NOT NULL DEFAULT 0,
  meals_logged INTEGER NOT NULL DEFAULT 0,
  water_intake_ml INTEGER NOT NULL DEFAULT 0,
  steps INTEGER DEFAULT 0,
  sleep_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for upsert support
CREATE UNIQUE INDEX analytics_metrics_user_date_idx ON analytics_metrics(user_id, metric_date);

-- RLS policies
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics_metrics"
  ON analytics_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics_metrics"
  ON analytics_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics_metrics"
  ON analytics_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
