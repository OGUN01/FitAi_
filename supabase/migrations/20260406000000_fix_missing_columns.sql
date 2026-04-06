-- ============================================================================
-- FIX: Add missing advanced_review columns + fix cooking_methods column type
-- ============================================================================
-- Migration: 20260406000000_fix_missing_columns.sql
-- Created: 2026-04-06
-- Description:
--   Bug 1: max_heart_rate, bmi_health_risk, bmr_formula_used are SELECTed from
--          advanced_review (onboardingService.ts lines 807, 833, 836) but were
--          never added to the table, so every load silently returns undefined.
--   Bug 2: cooking_methods was added as JSONB (20260403000000_fix_remaining_tech_debt.sql
--          line 12) but all code and TypeScript types treat it as TEXT[]. All
--          other array columns in diet_preferences are TEXT[]. This migration
--          converts it to TEXT[] for consistency.
-- All statements are idempotent (IF NOT EXISTS / conditional DO block).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bug 1a: max_heart_rate — calculated max heart rate (e.g. 220 - age)
-- ----------------------------------------------------------------------------
ALTER TABLE public.advanced_review
  ADD COLUMN IF NOT EXISTS max_heart_rate NUMERIC;

-- ----------------------------------------------------------------------------
-- Bug 1b: bmi_health_risk — textual health risk category derived from BMI
-- ----------------------------------------------------------------------------
ALTER TABLE public.advanced_review
  ADD COLUMN IF NOT EXISTS bmi_health_risk TEXT;

-- ----------------------------------------------------------------------------
-- Bug 1c: bmr_formula_used — which BMR formula was applied (e.g. 'mifflin_st_jeor')
-- ----------------------------------------------------------------------------
ALTER TABLE public.advanced_review
  ADD COLUMN IF NOT EXISTS bmr_formula_used TEXT;

-- ----------------------------------------------------------------------------
-- Bug 2: cooking_methods — change JSONB to TEXT[] to match all other array
--        columns in diet_preferences and match TypeScript type string[].
--
--        Strategy: ALTER COLUMN ... TYPE TEXT[] USING with a cast expression
--        that handles both the already-TEXT[] path (if column was somehow
--        created correctly) and the JSONB path (the actual production state).
--
--        JSONB arrays of text values cast cleanly to TEXT[] via:
--          ARRAY(SELECT jsonb_array_elements_text(col))
--        We wrap this in a CASE to safely handle NULL and already-text arrays.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type
    INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'diet_preferences'
     AND column_name  = 'cooking_methods';

  IF col_type IS NULL THEN
    -- Column does not exist at all — create it as TEXT[]
    EXECUTE 'ALTER TABLE public.diet_preferences ADD COLUMN cooking_methods TEXT[] DEFAULT ''{}''';

  ELSIF col_type = 'ARRAY' THEN
    -- Already TEXT[] (or another array type) — nothing to do
    NULL;

  ELSIF col_type = 'jsonb' THEN
    -- Convert JSONB → TEXT[]
    -- 1. Add a temporary TEXT[] staging column
    EXECUTE 'ALTER TABLE public.diet_preferences ADD COLUMN IF NOT EXISTS cooking_methods_new TEXT[] DEFAULT ''{}''';
    -- 2. Populate it from the existing JSONB column (NULL-safe)
    EXECUTE $sql$
      UPDATE public.diet_preferences
         SET cooking_methods_new = ARRAY(
               SELECT jsonb_array_elements_text(cooking_methods)
             )
       WHERE cooking_methods IS NOT NULL
         AND jsonb_array_length(cooking_methods) > 0
    $sql$;
    -- 3. Drop the old JSONB column
    EXECUTE 'ALTER TABLE public.diet_preferences DROP COLUMN cooking_methods';
    -- 4. Rename the staging column to the canonical name
    EXECUTE 'ALTER TABLE public.diet_preferences RENAME COLUMN cooking_methods_new TO cooking_methods';

  ELSE
    -- Unexpected type — raise a notice so it surfaces in migration logs
    RAISE NOTICE 'cooking_methods has unexpected type %; manual inspection required', col_type;
  END IF;
END;
$$;
