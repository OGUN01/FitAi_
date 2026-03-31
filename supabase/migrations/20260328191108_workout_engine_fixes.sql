-- Migration: 20260328191108_workout_engine_fixes.sql
-- Fixes GAP-17: Add atomic increment RPC for workout template usage count
-- Fixes GAP-16: completed_at column already exists via DEFAULT now() but we
--               ensure it has a proper default and is NOT NULL where possible

-- ============================================================================
-- GAP-17: Atomic increment RPC for workout_templates.usage_count
-- Avoids read-then-write race condition when incrementing concurrently
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_template_usage_count(
  template_id UUID,
  owner_user_id UUID
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE workout_templates
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    updated_at  = NOW()
  WHERE id = template_id
    AND user_id = owner_user_id;
$$;

-- ============================================================================
-- GAP-16: Ensure completed_at column exists on exercise_sets with default
-- (Safe to re-run — IF NOT EXISTS guard)
-- ============================================================================
ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Set a sensible default for existing rows that were inserted without it
UPDATE exercise_sets
SET completed_at = created_at
WHERE completed_at IS NULL OR completed_at = '1970-01-01T00:00:00Z';
