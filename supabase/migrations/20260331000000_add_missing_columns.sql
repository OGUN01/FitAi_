-- Add missing columns to profiles and advanced_review tables,
-- fix diet_type CHECK constraint, and relax target_weight_kg NOT NULL.
-- All statements use IF NOT EXISTS / DROP IF EXISTS so the migration is
-- safe to re-run (append-only per CLAUDE.md rules).

-- ============================================================
-- 1. profiles — missing columns referenced in code
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS detected_climate TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS detected_ethnicity TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ethnicity_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS climate_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_bmr_formula TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER;

-- ============================================================
-- 2. advanced_review — missing columns referenced in code
-- ============================================================

ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS detected_climate TEXT;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS detected_ethnicity TEXT;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS climate_used TEXT;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS climate_tdee_modifier DECIMAL;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS climate_water_modifier DECIMAL;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS ethnicity_used TEXT;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS calculations_version TEXT;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS bmr_formula_accuracy DECIMAL;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS bmr_formula_confidence DECIMAL;
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS was_rate_capped BOOLEAN DEFAULT false;

-- ============================================================
-- 3. diet_preferences — widen diet_type CHECK to accept all
--    values the app can produce
-- ============================================================

ALTER TABLE public.diet_preferences DROP CONSTRAINT IF EXISTS diet_preferences_diet_type_check;
ALTER TABLE public.diet_preferences ADD CONSTRAINT diet_preferences_diet_type_check
  CHECK (diet_type IN ('vegetarian', 'vegan', 'non-veg', 'non_veg', 'pescatarian', 'balanced', 'omnivore', 'keto', 'paleo'));

-- ============================================================
-- 4. body_analysis — allow NULL target_weight_kg
--    (users may not have set a goal yet)
-- ============================================================

ALTER TABLE public.body_analysis ALTER COLUMN target_weight_kg DROP NOT NULL;
