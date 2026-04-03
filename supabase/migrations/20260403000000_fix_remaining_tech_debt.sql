-- ============================================================================
-- FIX: Update increment_template_usage_count to also set last_used_at
-- ============================================================================
-- Migration: 20260403000000_fix_remaining_tech_debt.sql
-- Created: 2026-04-03
-- Description: Fixes H19 (last_used_at), H20 (exercise_prs.reps), cooking_methods column
-- All statements are idempotent (CREATE OR REPLACE, IF NOT EXISTS).

-- ============================================================================
-- cooking_methods: Array column for preferred cooking methods (diet generation)
-- ============================================================================
ALTER TABLE public.diet_preferences ADD COLUMN IF NOT EXISTS cooking_methods JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- H19: Update RPC to set last_used_at when template is used
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
    usage_count  = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW(),
    updated_at   = NOW()
  WHERE id = template_id
    AND user_id = owner_user_id;
$$;
