-- ============================================================================
-- SESSION & LOG TABLES MIGRATION
-- ============================================================================
-- Migration: Add workout session and meal log tracking tables
-- Created: 2025-01-29
-- Description: Persistent history for progress tracking and analytics
-- CRITICAL: Without these tables, user progress is not tracked long-term

-- ============================================================================
-- TABLE: WORKOUT_SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES user_workout_plans(id) ON DELETE SET NULL,

  -- Session identification
  workout_name TEXT,
  workout_type TEXT, -- e.g., "Upper Body", "Cardio", "Full Body"

  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  total_duration_minutes INTEGER,

  -- Exercises completed (array of objects)
  -- Example: [{
  --   exerciseId: "bench_press",
  --   exerciseName: "Bench Press",
  --   sets: [
  --     { setNumber: 1, reps: 10, weight_kg: 80, rest_seconds: 90, completed_at: "..." },
  --     { setNumber: 2, reps: 8, weight_kg: 85, rest_seconds: 90, completed_at: "..." }
  --   ]
  -- }]
  exercises_completed JSONB,

  -- Aggregated session metrics
  total_sets INTEGER,
  total_reps INTEGER,
  total_volume_kg INTEGER, -- Sum of (weight × reps) across all exercises
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,

  -- User subjective feedback
  perceived_exertion INTEGER CHECK (perceived_exertion IS NULL OR (perceived_exertion >= 1 AND perceived_exertion <= 10)), -- RPE scale (1-10)
  difficulty_rating TEXT CHECK (difficulty_rating IN ('too_easy', 'just_right', 'too_hard')),
  enjoyment_rating INTEGER CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
  muscle_soreness TEXT CHECK (muscle_soreness IN ('none', 'light', 'moderate', 'severe')),
  notes TEXT,

  -- Completion tracking
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_completed ON workout_sessions(user_id, is_completed) WHERE is_completed = true;
CREATE INDEX idx_workout_sessions_plan_id ON workout_sessions(workout_plan_id) WHERE workout_plan_id IS NOT NULL;
CREATE INDEX idx_workout_sessions_type ON workout_sessions(user_id, workout_type);

-- RLS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions"
  ON workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workout_sessions IS 'Complete workout session history with exercise details and user feedback';
COMMENT ON COLUMN workout_sessions.total_volume_kg IS 'Total training volume: sum of (weight × reps) for all exercises';
COMMENT ON COLUMN workout_sessions.perceived_exertion IS 'RPE (Rate of Perceived Exertion) scale 1-10';
COMMENT ON COLUMN workout_sessions.exercises_completed IS 'JSONB array of exercises with sets, reps, weight, and timestamps';

-- ============================================================================
-- TABLE: MEAL_LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES user_meal_plans(id) ON DELETE SET NULL,

  -- Timing
  logged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

  -- Meal source: from plan or custom entry
  from_plan BOOLEAN DEFAULT true,
  plan_meal_id TEXT, -- Reference to specific meal in user_meal_plans.plan_data JSON
  custom_meal_name TEXT,

  -- Portion adjustment (1.0 = as planned, 0.5 = half portion, 2.0 = double)
  portion_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (portion_multiplier > 0 AND portion_multiplier <= 5.0),

  -- Actual macros consumed (calculated from plan * portion_multiplier OR entered manually)
  calories DECIMAL(6,1),
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),
  sugar_g DECIMAL(5,1),
  sodium_mg DECIMAL(6,1),

  -- Ingredients (optional, for detailed tracking)
  ingredients JSONB, -- [{ name: "chicken breast", amount: 200, unit: "g", calories: 330 }]

  -- User feedback
  enjoyment_rating INTEGER CHECK (enjoyment_rating IS NULL OR (enjoyment_rating >= 1 AND enjoyment_rating <= 5)),
  would_eat_again BOOLEAN,
  notes TEXT,

  -- Media
  photo_url TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, logged_at DESC);
CREATE INDEX idx_meal_logs_meal_type ON meal_logs(user_id, meal_type);
CREATE INDEX idx_meal_logs_plan_id ON meal_logs(meal_plan_id) WHERE meal_plan_id IS NOT NULL;
CREATE INDEX idx_meal_logs_from_plan ON meal_logs(user_id, from_plan);

-- RLS
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal logs"
  ON meal_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal logs"
  ON meal_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal logs"
  ON meal_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_meal_logs_updated_at
  BEFORE UPDATE ON meal_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE meal_logs IS 'Daily meal consumption logs with macros and user feedback';
COMMENT ON COLUMN meal_logs.portion_multiplier IS 'Multiplier for planned meal: 1.0 = as planned, 0.5 = half, 2.0 = double';
COMMENT ON COLUMN meal_logs.from_plan IS 'True if logged from meal plan, false if custom/off-plan meal';
COMMENT ON COLUMN meal_logs.plan_meal_id IS 'ID reference to specific meal in user_meal_plans.plan_data JSONB';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate daily nutrition totals
CREATE OR REPLACE FUNCTION get_daily_nutrition_totals(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  total_calories DECIMAL,
  total_protein_g DECIMAL,
  total_carbs_g DECIMAL,
  total_fat_g DECIMAL,
  total_fiber_g DECIMAL,
  meals_logged INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(calories)::DECIMAL AS total_calories,
    SUM(protein_g)::DECIMAL AS total_protein_g,
    SUM(carbs_g)::DECIMAL AS total_carbs_g,
    SUM(fat_g)::DECIMAL AS total_fat_g,
    SUM(fiber_g)::DECIMAL AS total_fiber_g,
    COUNT(*)::INTEGER AS meals_logged
  FROM meal_logs
  WHERE user_id = p_user_id
    AND DATE(logged_at) = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get workout statistics for a date range
CREATE OR REPLACE FUNCTION get_workout_stats(
  p_user_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  total_workouts INTEGER,
  total_duration_minutes INTEGER,
  total_volume_kg INTEGER,
  avg_perceived_exertion DECIMAL,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_workouts,
    SUM(total_duration_minutes)::INTEGER AS total_duration_minutes,
    SUM(total_volume_kg)::INTEGER AS total_volume_kg,
    AVG(perceived_exertion)::DECIMAL AS avg_perceived_exertion,
    (COUNT(*) FILTER (WHERE is_completed = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100)::DECIMAL AS completion_rate
  FROM workout_sessions
  WHERE user_id = p_user_id
    AND started_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Comments on functions
COMMENT ON FUNCTION get_daily_nutrition_totals IS 'Calculate total macros consumed on a specific date';
COMMENT ON FUNCTION get_workout_stats IS 'Get aggregated workout statistics for a date range';
