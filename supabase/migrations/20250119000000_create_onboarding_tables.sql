-- ============================================================================
-- ONBOARDING TABLES MIGRATION
-- ============================================================================
-- Migration: Create all onboarding tables for FitAI
-- Created: 2025-01-19
-- Description: Complete schema for 5-tab onboarding flow with validation and progress tracking
-- Tables: profiles, diet_preferences, body_analysis, workout_preferences, advanced_review, onboarding_progress

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: PROFILES (Personal Info - Tab 1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  -- Primary key
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal information (Tab 1)
  first_name TEXT,
  last_name TEXT,
  name TEXT, -- Computed: first_name + last_name
  email TEXT UNIQUE,
  age INTEGER CHECK (age IS NULL OR (age >= 13 AND age <= 120)),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

  -- Location (3-tier system)
  country TEXT,
  state TEXT,
  region TEXT, -- Optional city/region

  -- Sleep schedule
  wake_time TIME,
  sleep_time TIME,

  -- Occupation type (for activity level guidance)
  occupation_type TEXT CHECK (occupation_type IN ('desk_job', 'light_active', 'moderate_active', 'heavy_labor', 'very_active')),

  -- Legacy/UI preferences
  profile_picture TEXT,
  dark_mode BOOLEAN DEFAULT false,
  units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  notifications_enabled BOOLEAN DEFAULT true,

  -- Media and subscription preferences (from workers migrations)
  media_preference TEXT DEFAULT 'both' CHECK (media_preference IN ('animation', 'human', 'both')),
  data_usage_mode TEXT DEFAULT 'wifi_only' CHECK (data_usage_mode IN ('wifi_only', 'always')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('guest', 'free', 'premium', 'enterprise')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: DIET_PREFERENCES (Tab 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS diet_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic diet info
  diet_type TEXT CHECK (diet_type IN ('vegetarian', 'vegan', 'non-veg', 'pescatarian')),
  allergies TEXT[] DEFAULT '{}',
  restrictions TEXT[] DEFAULT '{}',

  -- Diet readiness toggles (6 specialized diets)
  keto_ready BOOLEAN DEFAULT false,
  intermittent_fasting_ready BOOLEAN DEFAULT false,
  paleo_ready BOOLEAN DEFAULT false,
  mediterranean_ready BOOLEAN DEFAULT false,
  low_carb_ready BOOLEAN DEFAULT false,
  high_protein_ready BOOLEAN DEFAULT false,

  -- Meal preferences (at least 1 required)
  breakfast_enabled BOOLEAN DEFAULT true,
  lunch_enabled BOOLEAN DEFAULT true,
  dinner_enabled BOOLEAN DEFAULT true,
  snacks_enabled BOOLEAN DEFAULT true,

  -- Cooking preferences
  cooking_skill_level TEXT CHECK (cooking_skill_level IN ('beginner', 'intermediate', 'advanced', 'not_applicable')),
  max_prep_time_minutes INTEGER CHECK (max_prep_time_minutes IS NULL OR (max_prep_time_minutes >= 5 AND max_prep_time_minutes <= 180)),
  budget_level TEXT CHECK (budget_level IN ('low', 'medium', 'high')),

  -- Health habits (14 boolean fields)
  -- Hydration
  drinks_enough_water BOOLEAN DEFAULT false,
  limits_sugary_drinks BOOLEAN DEFAULT false,
  -- Eating patterns
  eats_regular_meals BOOLEAN DEFAULT false,
  avoids_late_night_eating BOOLEAN DEFAULT false,
  controls_portion_sizes BOOLEAN DEFAULT false,
  reads_nutrition_labels BOOLEAN DEFAULT false,
  -- Food choices
  eats_processed_foods BOOLEAN DEFAULT true,
  eats_5_servings_fruits_veggies BOOLEAN DEFAULT false,
  limits_refined_sugar BOOLEAN DEFAULT false,
  includes_healthy_fats BOOLEAN DEFAULT false,
  -- Substances
  drinks_alcohol BOOLEAN DEFAULT false,
  smokes_tobacco BOOLEAN DEFAULT false,
  drinks_coffee BOOLEAN DEFAULT false,
  takes_supplements BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one diet preference per user
  UNIQUE(user_id)
);

-- ============================================================================
-- TABLE 3: BODY_ANALYSIS (Tab 3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS body_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic measurements (required for BMI calculation)
  height_cm DECIMAL(5,2) CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
  current_weight_kg DECIMAL(5,2) CHECK (current_weight_kg IS NULL OR (current_weight_kg >= 30 AND current_weight_kg <= 300)),

  -- Goal settings (optional but recommended)
  target_weight_kg DECIMAL(5,2) CHECK (target_weight_kg IS NULL OR (target_weight_kg >= 30 AND target_weight_kg <= 300)),
  target_timeline_weeks INTEGER CHECK (target_timeline_weeks IS NULL OR (target_timeline_weeks >= 4 AND target_timeline_weeks <= 104)),

  -- Body composition (optional)
  body_fat_percentage DECIMAL(4,2) CHECK (body_fat_percentage IS NULL OR (body_fat_percentage >= 3 AND body_fat_percentage <= 50)),
  waist_cm DECIMAL(5,2),
  hip_cm DECIMAL(5,2),
  chest_cm DECIMAL(5,2),

  -- Progress photos (individual URLs)
  front_photo_url TEXT,
  side_photo_url TEXT,
  back_photo_url TEXT,

  -- AI analysis results (only if photos provided)
  ai_estimated_body_fat DECIMAL(4,2),
  ai_body_type TEXT CHECK (ai_body_type IN ('ectomorph', 'mesomorph', 'endomorph')),
  ai_confidence_score INTEGER CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 100)),

  -- Medical information
  medical_conditions TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  physical_limitations TEXT[] DEFAULT '{}',

  -- Pregnancy/Breastfeeding status (CRITICAL for safety)
  pregnancy_status BOOLEAN DEFAULT false,
  pregnancy_trimester INTEGER CHECK (pregnancy_trimester IN (1, 2, 3)),
  breastfeeding_status BOOLEAN DEFAULT false,

  -- Stress level (affects deficit limits)
  stress_level TEXT CHECK (stress_level IN ('low', 'moderate', 'high')),

  -- Calculated values (auto-computed)
  bmi DECIMAL(4,2),
  bmr DECIMAL(7,2),
  ideal_weight_min DECIMAL(5,2),
  ideal_weight_max DECIMAL(5,2),
  waist_hip_ratio DECIMAL(3,2),

  -- Legacy JSONB fields (for backward compatibility)
  photos JSONB,
  analysis JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one body analysis per user
  UNIQUE(user_id)
);

-- ============================================================================
-- TABLE 4: WORKOUT_PREFERENCES (Tab 4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Workout environment
  location TEXT CHECK (location IN ('home', 'gym', 'both')),
  equipment TEXT[] DEFAULT '{}',
  time_preference INTEGER, -- Minutes per session
  intensity TEXT CHECK (intensity IN ('beginner', 'intermediate', 'advanced')),
  workout_types TEXT[] DEFAULT '{}',

  -- Goals and activity
  primary_goals TEXT[] DEFAULT '{}', -- At least 1 required
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'extreme')),

  -- Current fitness assessment
  workout_experience_years INTEGER CHECK (workout_experience_years >= 0 AND workout_experience_years <= 50),
  workout_frequency_per_week INTEGER CHECK (workout_frequency_per_week >= 0 AND workout_frequency_per_week <= 7),
  can_do_pushups INTEGER CHECK (can_do_pushups >= 0 AND can_do_pushups <= 200),
  can_run_minutes INTEGER CHECK (can_run_minutes >= 0 AND can_run_minutes <= 300),
  flexibility_level TEXT CHECK (flexibility_level IN ('poor', 'fair', 'good', 'excellent')),

  -- Weight goals (populated from body_analysis)
  weekly_weight_loss_goal DECIMAL(3,2),

  -- Enhanced preferences
  preferred_workout_times TEXT[] DEFAULT '{}', -- 'morning', 'afternoon', 'evening'
  enjoys_cardio BOOLEAN DEFAULT false,
  enjoys_strength_training BOOLEAN DEFAULT false,
  enjoys_group_classes BOOLEAN DEFAULT false,
  prefers_outdoor_activities BOOLEAN DEFAULT false,
  needs_motivation BOOLEAN DEFAULT false,
  prefers_variety BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one workout preference per user
  UNIQUE(user_id)
);

-- ============================================================================
-- TABLE 5: ADVANCED_REVIEW (Tab 5 - Calculated Metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS advanced_review (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic metabolic calculations
  calculated_bmi DECIMAL(4,2),
  calculated_bmr DECIMAL(7,2),
  calculated_tdee DECIMAL(7,2),
  metabolic_age INTEGER,

  -- Daily nutritional needs
  daily_calories INTEGER,
  daily_protein_g INTEGER,
  daily_carbs_g INTEGER,
  daily_fat_g INTEGER,
  daily_water_ml INTEGER,
  daily_fiber_g INTEGER,

  -- Weight management
  healthy_weight_min DECIMAL(5,2),
  healthy_weight_max DECIMAL(5,2),
  weekly_weight_loss_rate DECIMAL(3,2),
  estimated_timeline_weeks INTEGER,
  total_calorie_deficit INTEGER,

  -- Body composition
  ideal_body_fat_min DECIMAL(4,2),
  ideal_body_fat_max DECIMAL(5,2),
  lean_body_mass DECIMAL(5,2),
  fat_mass DECIMAL(5,2),

  -- Fitness metrics
  estimated_vo2_max DECIMAL(4,1),
  target_hr_fat_burn_min INTEGER,
  target_hr_fat_burn_max INTEGER,
  target_hr_cardio_min INTEGER,
  target_hr_cardio_max INTEGER,
  target_hr_peak_min INTEGER,
  target_hr_peak_max INTEGER,
  recommended_workout_frequency INTEGER,
  recommended_cardio_minutes INTEGER,
  recommended_strength_sessions INTEGER,

  -- Health scores (0-100)
  overall_health_score INTEGER CHECK (overall_health_score IS NULL OR (overall_health_score >= 0 AND overall_health_score <= 100)),
  diet_readiness_score INTEGER CHECK (diet_readiness_score IS NULL OR (diet_readiness_score >= 0 AND diet_readiness_score <= 100)),
  fitness_readiness_score INTEGER CHECK (fitness_readiness_score IS NULL OR (fitness_readiness_score >= 0 AND fitness_readiness_score <= 100)),
  goal_realistic_score INTEGER CHECK (goal_realistic_score IS NULL OR (goal_realistic_score >= 0 AND goal_realistic_score <= 100)),

  -- Sleep analysis
  recommended_sleep_hours DECIMAL(3,1),
  current_sleep_duration DECIMAL(3,1),
  sleep_efficiency_score INTEGER CHECK (sleep_efficiency_score IS NULL OR (sleep_efficiency_score >= 0 AND sleep_efficiency_score <= 100)),

  -- Completion metrics
  data_completeness_percentage INTEGER CHECK (data_completeness_percentage IS NULL OR (data_completeness_percentage >= 0 AND data_completeness_percentage <= 100)),
  reliability_score INTEGER CHECK (reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 100)),
  personalization_level INTEGER CHECK (personalization_level IS NULL OR (personalization_level >= 0 AND personalization_level <= 100)),

  -- Validation results
  validation_status TEXT CHECK (validation_status IN ('passed', 'warnings', 'blocked')),
  validation_errors JSONB,
  validation_warnings JSONB,
  refeed_schedule JSONB,
  medical_adjustments TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one advanced review per user
  UNIQUE(user_id)
);

-- ============================================================================
-- TABLE 6: ONBOARDING_PROGRESS (Progress Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Progress tracking
  current_tab INTEGER CHECK (current_tab >= 1 AND current_tab <= 5),
  completed_tabs INTEGER[] DEFAULT '{}',
  tab_validation_status JSONB, -- Record<number, TabValidationResult>
  total_completion_percentage INTEGER CHECK (total_completion_percentage >= 0 AND total_completion_percentage <= 100),

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one progress record per user
  UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_diet_preferences_user_id ON diet_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_body_analysis_user_id ON body_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_preferences_user_id ON workout_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_advanced_review_user_id ON advanced_review(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Diet preferences policies
CREATE POLICY "Users can view own diet preferences"
  ON diet_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own diet preferences"
  ON diet_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Body analysis policies
CREATE POLICY "Users can view own body analysis"
  ON body_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own body analysis"
  ON body_analysis FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workout preferences policies
CREATE POLICY "Users can view own workout preferences"
  ON workout_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workout preferences"
  ON workout_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Advanced review policies
CREATE POLICY "Users can view own advanced review"
  ON advanced_review FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own advanced review"
  ON advanced_review FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Onboarding progress policies
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own onboarding progress"
  ON onboarding_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diet_preferences_updated_at
  BEFORE UPDATE ON diet_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_body_analysis_updated_at
  BEFORE UPDATE ON body_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_preferences_updated_at
  BEFORE UPDATE ON workout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advanced_review_updated_at
  BEFORE UPDATE ON advanced_review
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_last_updated
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE profiles IS 'User profiles with personal information from Tab 1';
COMMENT ON TABLE diet_preferences IS 'Diet preferences, meal settings, and health habits from Tab 2';
COMMENT ON TABLE body_analysis IS 'Body measurements, goals, and medical information from Tab 3';
COMMENT ON TABLE workout_preferences IS 'Workout settings, fitness assessment, and preferences from Tab 4';
COMMENT ON TABLE advanced_review IS 'Calculated metrics, health scores, and validation results from Tab 5';
COMMENT ON TABLE onboarding_progress IS 'Tracks user progress through the 5-tab onboarding flow';

COMMENT ON COLUMN profiles.occupation_type IS 'Daily activity level: desk_job, light_active, moderate_active, heavy_labor, very_active';
COMMENT ON COLUMN diet_preferences.allergies IS 'Array of allergy strings (searchable multi-select with custom options)';
COMMENT ON COLUMN diet_preferences.restrictions IS 'Array of dietary restriction strings (vegan, gluten-free, etc.)';
COMMENT ON COLUMN body_analysis.pregnancy_status IS 'CRITICAL for safety - affects calorie deficit limits';
COMMENT ON COLUMN workout_preferences.primary_goals IS 'At least 1 goal required (weight_loss, muscle_gain, etc.)';
COMMENT ON COLUMN advanced_review.validation_status IS 'passed = no issues, warnings = can proceed with acknowledgment, blocked = must fix errors';
COMMENT ON COLUMN onboarding_progress.tab_validation_status IS 'JSONB storing validation results for each tab (1-5)';
