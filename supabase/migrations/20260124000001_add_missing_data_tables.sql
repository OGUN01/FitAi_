-- ============================================================================
-- MISSING DATA TABLES MIGRATION
-- ============================================================================
-- Migration: Create missing tables for FitAI data tracking
-- Created: 2026-01-24
-- Description: Tables for fitness goals, water logs, progress entries, 
--              achievements, analytics, meals/foods, and recognition feedback

-- ============================================================================
-- TABLE: FITNESS_GOALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS fitness_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Goal types
  primary_goal TEXT CHECK (primary_goal IN ('lose_weight', 'gain_muscle', 'maintain_weight', 'improve_fitness', 'build_strength', 'increase_endurance')),
  target_weight NUMERIC(5,2),
  target_weight_unit TEXT DEFAULT 'kg' CHECK (target_weight_unit IN ('kg', 'lbs')),
  
  -- Activity settings
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  workout_frequency INTEGER CHECK (workout_frequency IS NULL OR (workout_frequency >= 0 AND workout_frequency <= 7)),
  
  -- Timeline
  target_date DATE,
  weekly_weight_goal NUMERIC(3,2), -- lbs per week
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================================================
-- TABLE: WATER_LOGS (Hydration tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Hydration data
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
  source TEXT DEFAULT 'water' CHECK (source IN ('water', 'tea', 'coffee', 'juice', 'milk', 'sports_drink', 'other')),
  
  -- Timing
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, date);

-- ============================================================================
-- TABLE: PROGRESS_ENTRIES (Weight/body measurement tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Measurements
  weight NUMERIC(5,2),
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  body_fat_percentage NUMERIC(4,2),
  muscle_mass NUMERIC(5,2),
  
  -- Body measurements (cm)
  waist NUMERIC(5,2),
  chest NUMERIC(5,2),
  hips NUMERIC(5,2),
  arms NUMERIC(5,2),
  thighs NUMERIC(5,2),
  
  -- Notes
  notes TEXT,
  photo_url TEXT,
  
  -- Timing
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_entries_user_date ON progress_entries(user_id, date);

-- ============================================================================
-- TABLE: PROGRESS_GOALS (Goal setting with targets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Goal definition
  metric TEXT NOT NULL CHECK (metric IN ('weight', 'body_fat', 'muscle_mass', 'waist', 'workout_count', 'calories')),
  target_value NUMERIC(10,2) NOT NULL,
  current_value NUMERIC(10,2),
  unit TEXT,
  
  -- Timeline
  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,
  
  -- Status
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: NUTRITION_GOALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Daily targets
  daily_calories INTEGER CHECK (daily_calories IS NULL OR (daily_calories >= 1000 AND daily_calories <= 10000)),
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,
  fiber_grams INTEGER,
  water_ml INTEGER,
  
  -- Calculated from body metrics
  bmr INTEGER,
  tdee INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================================================
-- TABLE: USER_ACHIEVEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Achievement data
  achievement_id TEXT NOT NULL,
  achievement_type TEXT CHECK (achievement_type IN ('workout', 'nutrition', 'streak', 'milestone', 'challenge', 'social')),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  -- Progress
  progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  target_value INTEGER,
  current_value INTEGER,
  
  -- Status
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  
  -- XP/Points
  xp_reward INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- TABLE: ANALYTICS_METRICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Metric identification
  metric_type TEXT NOT NULL CHECK (metric_type IN ('workout', 'nutrition', 'progress', 'engagement', 'health')),
  metric_name TEXT NOT NULL,
  
  -- Values
  value NUMERIC(15,4) NOT NULL,
  unit TEXT,
  
  -- Context
  context JSONB DEFAULT '{}',
  
  -- Timing
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  week_number INTEGER,
  month INTEGER,
  year INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_metrics_user_date ON analytics_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type, metric_name);

-- ============================================================================
-- TABLE: FOODS (Food database)
-- ============================================================================
CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Food identification
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  
  -- Nutrition per serving
  serving_size NUMERIC(10,2) DEFAULT 100,
  serving_unit TEXT DEFAULT 'g',
  calories NUMERIC(10,2),
  protein NUMERIC(10,2),
  carbohydrates NUMERIC(10,2),
  fat NUMERIC(10,2),
  fiber NUMERIC(10,2),
  sugar NUMERIC(10,2),
  sodium NUMERIC(10,2),
  
  -- Metadata
  food_category TEXT,
  image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'user', -- 'user', 'usda', 'openfoodfacts', 'ai_recognized'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL;

-- ============================================================================
-- TABLE: MEALS (User meal entries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Meal details
  name TEXT NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  
  -- Totals (computed from meal_foods)
  total_calories NUMERIC(10,2),
  total_protein NUMERIC(10,2),
  total_carbs NUMERIC(10,2),
  total_fat NUMERIC(10,2),
  
  -- Timing
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  
  -- Photo
  image_url TEXT,
  
  -- AI recognition
  is_ai_generated BOOLEAN DEFAULT FALSE,
  recognition_confidence NUMERIC(3,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

-- ============================================================================
-- TABLE: MEAL_FOODS (Foods in a meal - many to many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  
  -- Quantity
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  serving_unit TEXT DEFAULT 'serving',
  
  -- Calculated nutrition for this quantity
  calories NUMERIC(10,2),
  protein NUMERIC(10,2),
  carbs NUMERIC(10,2),
  fat NUMERIC(10,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_foods_meal ON meal_foods(meal_id);

-- ============================================================================
-- TABLE: EXERCISES (Exercise database)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Exercise identification
  exercise_id TEXT UNIQUE, -- External ID for matching
  name TEXT NOT NULL,
  description TEXT,
  
  -- Classification
  category TEXT CHECK (category IN ('strength', 'cardio', 'flexibility', 'hiit', 'yoga', 'pilates', 'hybrid')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  
  -- Muscles
  target_muscle_groups TEXT[] DEFAULT '{}',
  secondary_muscles TEXT[] DEFAULT '{}',
  
  -- Equipment
  equipment TEXT[] DEFAULT '{}',
  
  -- Media
  gif_url TEXT,
  video_url TEXT,
  image_url TEXT,
  
  -- Instructions
  instructions TEXT[] DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',
  
  -- Defaults
  default_sets INTEGER DEFAULT 3,
  default_reps TEXT DEFAULT '10-12',
  default_rest_seconds INTEGER DEFAULT 60,
  
  -- Metadata
  calories_per_minute NUMERIC(5,2),
  is_verified BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'internal',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

-- ============================================================================
-- TABLE: WEEKLY_WORKOUT_PLANS (Cached AI workout plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Plan metadata
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  plan_title TEXT,
  plan_description TEXT,
  
  -- Plan data (JSONB for flexibility)
  workouts JSONB NOT NULL DEFAULT '[]',
  rest_days INTEGER[] DEFAULT '{}',
  
  -- Stats
  total_estimated_calories INTEGER,
  total_duration_minutes INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_weekly_workout_plans_user ON weekly_workout_plans(user_id, is_active);

-- ============================================================================
-- TABLE: WEEKLY_MEAL_PLANS (Cached AI meal plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Plan metadata
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  plan_title TEXT,
  
  -- Plan data (JSONB for flexibility)
  meals JSONB NOT NULL DEFAULT '[]',
  
  -- Stats
  total_estimated_calories INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_weekly_meal_plans_user ON weekly_meal_plans(user_id, is_active);

-- ============================================================================
-- TABLE: FOOD_RECOGNITION_FEEDBACK
-- ============================================================================
CREATE TABLE IF NOT EXISTS food_recognition_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Recognition details
  image_url TEXT,
  recognized_food TEXT,
  user_correction TEXT,
  was_correct BOOLEAN,
  confidence_score NUMERIC(3,2),
  
  -- Context
  recognition_method TEXT CHECK (recognition_method IN ('camera', 'upload', 'barcode')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_recognition_feedback_user ON food_recognition_feedback(user_id);

-- ============================================================================
-- TABLE: RECOGNITION_ACCURACY_METRICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS recognition_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Aggregated metrics
  date DATE DEFAULT CURRENT_DATE,
  total_recognitions INTEGER DEFAULT 0,
  correct_recognitions INTEGER DEFAULT 0,
  corrected_recognitions INTEGER DEFAULT 0,
  average_confidence NUMERIC(4,3),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(date)
);

-- ============================================================================
-- TABLE: APP_EVENTS (General event logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Context
  screen TEXT,
  session_id TEXT,
  device_info JSONB DEFAULT '{}',
  
  -- Timestamps
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_user ON app_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type, event_name);

-- ============================================================================
-- TABLE: MEAL_RECOGNITION_METADATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_recognition_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  
  -- Recognition data
  original_image_url TEXT,
  processed_image_url TEXT,
  recognition_result JSONB DEFAULT '{}',
  
  -- Model info
  model_version TEXT,
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_recognition_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_recognition_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user-owned tables
CREATE POLICY "Users can manage their own fitness_goals"
  ON fitness_goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own water_logs"
  ON water_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress_entries"
  ON progress_entries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress_goals"
  ON progress_goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own nutrition_goals"
  ON nutrition_goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own achievements"
  ON user_achievements FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own analytics_metrics"
  ON analytics_metrics FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meals"
  ON meals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workout_plans"
  ON weekly_workout_plans FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meal_plans"
  ON weekly_meal_plans FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own food_recognition_feedback"
  ON food_recognition_feedback FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own app_events"
  ON app_events FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meal_recognition_metadata"
  ON meal_recognition_metadata FOR ALL USING (auth.uid() = user_id);

-- Foods and exercises are readable by all authenticated users
CREATE POLICY "Authenticated users can read foods"
  ON foods FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert foods"
  ON foods FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read exercises"
  ON exercises FOR SELECT USING (auth.role() = 'authenticated');

-- Meal foods: users can manage foods in their own meals
CREATE POLICY "Users can manage meal_foods for their meals"
  ON meal_foods FOR ALL USING (
    EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_foods.meal_id AND meals.user_id = auth.uid())
  );

-- Recognition metrics is admin only (using service role)
-- No user-facing policy needed
