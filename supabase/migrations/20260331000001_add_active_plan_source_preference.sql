-- Bug #10: Persist active_plan_source preference to profiles table
-- so multi-device users retain their plan toggle preference.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_plan_source TEXT NOT NULL DEFAULT 'ai';

-- Add check constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_active_plan_source_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_active_plan_source_check
      CHECK (active_plan_source IN ('ai', 'custom'));
  END IF;
END $$;
