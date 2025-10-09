-- Add stress_level column to diet_preferences table
-- This field affects deficit limits and timeline calculations

ALTER TABLE diet_preferences
ADD COLUMN stress_level TEXT
CHECK (stress_level IN ('low', 'moderate', 'high'))
DEFAULT 'moderate';

COMMENT ON COLUMN diet_preferences.stress_level IS 'User stress level - affects deficit limits and timeline';
