-- Migration: Add Data Integrity Constraints
-- Description: Add CHECK constraints to ensure data quality and consistency
-- Date: 2025-12-29
-- NOTE: Many NOT NULL constraints already exist from previous migrations

-- ============================================================================
-- PROFILES TABLE CONSTRAINTS
-- ============================================================================

-- Add CHECK constraints for profiles (NOT NULL already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_age_range') THEN
    ALTER TABLE profiles ADD CONSTRAINT check_age_range CHECK (age >= 13 AND age <= 120);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_gender_values') THEN
    ALTER TABLE profiles ADD CONSTRAINT check_gender_values CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;
END $$;

-- ============================================================================
-- BODY ANALYSIS TABLE CONSTRAINTS
-- ============================================================================

-- Set missing NOT NULL constraints for body_analysis
ALTER TABLE body_analysis
  ALTER COLUMN user_id SET NOT NULL;

-- target_weight_kg should be NOT NULL (currently nullable)
-- First set a default for NULL values
UPDATE body_analysis
SET target_weight_kg = current_weight_kg
WHERE target_weight_kg IS NULL;

ALTER TABLE body_analysis
  ALTER COLUMN target_weight_kg SET NOT NULL;

-- medical_conditions should default to empty array if NULL
UPDATE body_analysis
SET medical_conditions = ARRAY[]::text[]
WHERE medical_conditions IS NULL;

ALTER TABLE body_analysis
  ALTER COLUMN medical_conditions SET NOT NULL;

-- Add CHECK constraints for body analysis
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_height_range') THEN
    ALTER TABLE body_analysis ADD CONSTRAINT check_height_range CHECK (height_cm >= 100 AND height_cm <= 250);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_weight_range') THEN
    ALTER TABLE body_analysis ADD CONSTRAINT check_weight_range CHECK (current_weight_kg >= 30 AND current_weight_kg <= 300);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_target_weight_range') THEN
    ALTER TABLE body_analysis ADD CONSTRAINT check_target_weight_range CHECK (target_weight_kg >= 30 AND target_weight_kg <= 300);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_pregnancy_trimester') THEN
    ALTER TABLE body_analysis ADD CONSTRAINT check_pregnancy_trimester CHECK (pregnancy_trimester IS NULL OR pregnancy_trimester IN (1, 2, 3));
  END IF;
END $$;

-- ============================================================================
-- DIET PREFERENCES TABLE CONSTRAINTS
-- ============================================================================

-- Set missing NOT NULL constraints
ALTER TABLE diet_preferences
  ALTER COLUMN user_id SET NOT NULL;

-- Add CHECK constraints for diet preferences
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_diet_type') THEN
    ALTER TABLE diet_preferences ADD CONSTRAINT check_diet_type CHECK (diet_type IN ('vegetarian', 'vegan', 'non-veg', 'non_veg', 'pescatarian'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_at_least_one_meal') THEN
    ALTER TABLE diet_preferences ADD CONSTRAINT check_at_least_one_meal CHECK (
      breakfast_enabled = true OR
      lunch_enabled = true OR
      dinner_enabled = true OR
      snacks_enabled = true
    );
  END IF;
END $$;

-- ============================================================================
-- WORKOUT PREFERENCES TABLE CONSTRAINTS
-- ============================================================================

-- Set missing NOT NULL constraints
ALTER TABLE workout_preferences
  ALTER COLUMN user_id SET NOT NULL;

-- Add CHECK constraints for workout preferences
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_location_values') THEN
    ALTER TABLE workout_preferences ADD CONSTRAINT check_location_values CHECK (location IN ('home', 'gym', 'both'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_intensity_values') THEN
    ALTER TABLE workout_preferences ADD CONSTRAINT check_intensity_values CHECK (intensity IN ('beginner', 'intermediate', 'advanced'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_at_least_one_goal') THEN
    ALTER TABLE workout_preferences ADD CONSTRAINT check_at_least_one_goal CHECK (array_length(primary_goals, 1) > 0);
  END IF;
END $$;

-- ============================================================================
-- TIMESTAMP CONSTRAINTS (set defaults for NULL values first)
-- ============================================================================

-- Profiles - timestamps
UPDATE profiles SET created_at = now() WHERE created_at IS NULL;
UPDATE profiles SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE profiles
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Body analysis - timestamps
UPDATE body_analysis SET created_at = now() WHERE created_at IS NULL;
UPDATE body_analysis SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE body_analysis
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Diet preferences - timestamps
UPDATE diet_preferences SET created_at = now() WHERE created_at IS NULL;
UPDATE diet_preferences SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE diet_preferences
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Workout preferences - timestamps
UPDATE workout_preferences SET created_at = now() WHERE created_at IS NULL;
UPDATE workout_preferences SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE workout_preferences
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT check_age_range ON profiles IS 'Ensures age is between 13 and 120 years';
COMMENT ON CONSTRAINT check_gender_values ON profiles IS 'Ensures gender is one of the allowed values';
COMMENT ON CONSTRAINT check_height_range ON body_analysis IS 'Ensures height is between 100cm and 250cm';
COMMENT ON CONSTRAINT check_weight_range ON body_analysis IS 'Ensures current weight is between 30kg and 300kg';
COMMENT ON CONSTRAINT check_target_weight_range ON body_analysis IS 'Ensures target weight is between 30kg and 300kg';
COMMENT ON CONSTRAINT check_pregnancy_trimester ON body_analysis IS 'Ensures pregnancy trimester is 1, 2, 3, or NULL';
COMMENT ON CONSTRAINT check_diet_type ON diet_preferences IS 'Ensures diet type is one of the supported types';
COMMENT ON CONSTRAINT check_at_least_one_meal ON diet_preferences IS 'Ensures at least one meal type is enabled';
COMMENT ON CONSTRAINT check_location_values ON workout_preferences IS 'Ensures location is home, gym, or both';
COMMENT ON CONSTRAINT check_intensity_values ON workout_preferences IS 'Ensures intensity is beginner, intermediate, or advanced';
COMMENT ON CONSTRAINT check_at_least_one_goal ON workout_preferences IS 'Ensures at least one primary goal is specified';
