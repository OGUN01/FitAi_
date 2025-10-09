-- ============================================================================
-- VALIDATION SYSTEM: Add occupation_type field to profiles table
-- Phase 1, Task 1.1
-- ============================================================================

-- Add occupation_type column to profiles table
ALTER TABLE profiles
ADD COLUMN occupation_type TEXT
CHECK (occupation_type IN ('desk_job', 'light_active', 'moderate_active', 'heavy_labor', 'very_active'));

-- Add comment explaining purpose
COMMENT ON COLUMN profiles.occupation_type IS 'User occupation type for NEAT calculation and activity level guidance (prevents TDEE stacking)';

