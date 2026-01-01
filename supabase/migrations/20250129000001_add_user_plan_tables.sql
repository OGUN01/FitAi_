-- ============================================================================
-- USER PLAN TABLES MIGRATION
-- ============================================================================
-- Migration: Add user-specific workout and meal plan tables
-- Created: 2025-01-29
-- Description: Store AI-generated plans per user for cross-device sync
-- CRITICAL: Without these tables, plans are device-local only and lost on reinstall

-- ============================================================================
-- TABLE: USER_WORKOUT_PLANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Plan data (full JSON from AI generation)
  plan_data JSONB NOT NULL,
  plan_version INTEGER DEFAULT 1,

  -- Generation metadata (for cache matching and debugging)
  generated_from JSONB, -- Input params: { experience_level, goals, equipment, etc }
  model_used TEXT, -- e.g., "gemini-2.0-flash-exp"
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- Auto-regenerate when expired

  -- Status
  is_active BOOLEAN DEFAULT true,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- User feedback (for adaptive AI)
  user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
  difficulty_feedback TEXT CHECK (difficulty_feedback IN ('too_easy', 'just_right', 'too_hard')),
  feedback_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Business rule: Only one active plan per user
  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for performance
CREATE INDEX idx_user_workout_plans_user_id ON user_workout_plans(user_id);
CREATE INDEX idx_user_workout_plans_active ON user_workout_plans(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_workout_plans_expires ON user_workout_plans(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_user_workout_plans_version ON user_workout_plans(user_id, plan_version DESC);

-- Row Level Security
ALTER TABLE user_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans"
  ON user_workout_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout plans"
  ON user_workout_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
  ON user_workout_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
  ON user_workout_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for auto-update timestamp
CREATE TRIGGER update_user_workout_plans_updated_at
  BEFORE UPDATE ON user_workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE user_workout_plans IS 'User-specific AI-generated workout plans with versioning and feedback';
COMMENT ON COLUMN user_workout_plans.is_active IS 'Only one plan should be active per user at a time';
COMMENT ON COLUMN user_workout_plans.expires_at IS 'Plan regeneration trigger - auto-regenerate when expired';

-- ============================================================================
-- TABLE: USER_MEAL_PLANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Plan data (7 days × 3-4 meals = 21-28 meals)
  plan_data JSONB NOT NULL,
  plan_version INTEGER DEFAULT 1,

  -- Generation metadata
  generated_from JSONB, -- Input params: { diet_type, allergies, calories, macros, etc }
  model_used TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- Meals get stale faster than workouts (7 days vs 30 days)

  -- Status
  is_active BOOLEAN DEFAULT true,
  adherence_percentage INTEGER DEFAULT 0 CHECK (adherence_percentage >= 0 AND adherence_percentage <= 100),

  -- User feedback (for adaptive AI)
  user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
  liked_meals TEXT[], -- Array of meal IDs user enjoyed (for future plans)
  disliked_meals TEXT[], -- Array of meal IDs user didn't like (exclude from future)
  feedback_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_user_meal_plans_user_id ON user_meal_plans(user_id);
CREATE INDEX idx_user_meal_plans_active ON user_meal_plans(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_meal_plans_expires ON user_meal_plans(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_user_meal_plans_version ON user_meal_plans(user_id, plan_version DESC);

-- RLS
ALTER TABLE user_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans"
  ON user_meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plans"
  ON user_meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON user_meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans"
  ON user_meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_user_meal_plans_updated_at
  BEFORE UPDATE ON user_meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE user_meal_plans IS 'User-specific AI-generated meal plans with adaptive learning from user feedback';
COMMENT ON COLUMN user_meal_plans.liked_meals IS 'Array of meal IDs user rated 4-5 stars - prioritize in future plans';
COMMENT ON COLUMN user_meal_plans.disliked_meals IS 'Array of meal IDs user rated 1-2 stars - exclude from future plans';
