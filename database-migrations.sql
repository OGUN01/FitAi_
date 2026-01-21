-- FitAI Database Migrations
-- Date: 2026-01-21
-- Purpose: Create missing tables and columns required for new features

-- 1. Create progress_goals table
CREATE TABLE IF NOT EXISTS progress_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_weight_kg DECIMAL(5,2),
  target_body_fat_percentage DECIMAL(4,2),
  target_muscle_mass_kg DECIMAL(5,2),
  target_measurements JSONB,
  target_date DATE,
  weekly_workout_goal INTEGER DEFAULT 3,
  daily_calorie_goal INTEGER DEFAULT 2000,
  daily_protein_goal INTEGER DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Add activity_level column to workout_preferences
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='workout_preferences' AND column_name='activity_level'
  ) THEN
    ALTER TABLE workout_preferences ADD COLUMN activity_level TEXT;
  END IF;
END $$;

-- 3. Add index on progress_goals.user_id for performance
CREATE INDEX IF NOT EXISTS idx_progress_goals_user_id ON progress_goals(user_id);

-- 4. Add updated_at trigger for progress_goals
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_progress_goals_updated_at ON progress_goals;
CREATE TRIGGER update_progress_goals_updated_at
    BEFORE UPDATE ON progress_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database migrations completed successfully!';
END $$;
