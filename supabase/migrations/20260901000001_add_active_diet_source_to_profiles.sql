-- Persist active_diet_source preference to profiles table so multi-device
-- users retain their AI/Custom diet toggle preference.
-- Mirrors 20260331000001_add_active_plan_source_preference.sql (workout side).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_diet_source TEXT NOT NULL DEFAULT 'ai';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_active_diet_source_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_active_diet_source_check
      CHECK (active_diet_source IN ('ai', 'custom'));
  END IF;
END $$;
