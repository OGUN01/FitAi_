-- ============================================================================
-- FIX SECURITY DEFINER FUNCTIONS: search_path + trigger recursion guards
-- ============================================================================
-- Migration: 20260401000001
-- Created: 2026-04-01
-- Description:
--   Security audit fix for two classes of issues:
--
--   A) SECURITY DEFINER functions missing SET search_path = public
--      Without a fixed search_path a malicious user can CREATE a schema that
--      shadows 'public' and redirect the function's table accesses to attacker-
--      controlled objects.  Affected functions from 20260228000001:
--        • public.lookup_barcode(TEXT)
--        • public.upsert_barcode_cache(TEXT, TEXT, TEXT, NUMERIC, NUMERIC,
--            NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, SMALLINT,
--            TEXT, TEXT, SMALLINT, BOOLEAN)
--
--   B) Trigger functions missing pg_trigger_depth() recursion guard
--      Two trigger functions introduced in 20260325133000 can fire each other
--      in a cycle when body_analysis and progress_entries are updated in the
--      same transaction.  Adding an early-exit guard when pg_trigger_depth()
--      exceeds 1 breaks the cycle without changing behaviour for the first
--      (top-level) call:
--        • public.enforce_manual_weight_on_body_analysis()
--        • public.sync_body_analysis_current_weight_from_progress_entries()
--
--   All changes use CREATE OR REPLACE — no DROP statements, no data changes.
-- ============================================================================

-- ============================================================================
-- A-1. lookup_barcode — add SET search_path = public
-- ============================================================================
-- Original body from 20260228000001 reproduced verbatim; only the function
-- header gains SET search_path = public.
CREATE OR REPLACE FUNCTION public.lookup_barcode(p_barcode TEXT)
RETURNS TABLE (
  barcode             TEXT,
  product_name        TEXT,
  brand               TEXT,
  energy_kcal_100g    NUMERIC,
  proteins_100g       NUMERIC,
  carbohydrates_100g  NUMERIC,
  sugars_100g         NUMERIC,
  fat_100g            NUMERIC,
  fiber_100g          NUMERIC,
  sodium_100g         NUMERIC,
  nutriscore_grade    TEXT,
  nova_group          SMALLINT,
  image_url           TEXT,
  source              TEXT,
  confidence          SMALLINT,
  tier                INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (barcode)
    barcode, product_name, brand,
    energy_kcal_100g, proteins_100g, carbohydrates_100g,
    sugars_100g, fat_100g, fiber_100g, sodium_100g,
    nutriscore_grade, nova_group, image_url,
    source, confidence, tier
  FROM public.v_barcode_lookup
  WHERE barcode = p_barcode
  ORDER BY barcode, tier ASC;
$$;

COMMENT ON FUNCTION public.lookup_barcode(TEXT) IS
  'RPC function for barcode lookup. Returns best matching product row. '
  'Call via supabase.rpc("lookup_barcode", {p_barcode}). '
  'search_path fixed to public to prevent search_path injection (security fix 20260401000001).';

-- ============================================================================
-- A-2. upsert_barcode_cache — add SET search_path = public
-- ============================================================================
-- Original body from 20260228000001 reproduced verbatim; only the function
-- header gains SET search_path = public.
CREATE OR REPLACE FUNCTION public.upsert_barcode_cache(
  p_barcode             TEXT,
  p_product_name        TEXT,
  p_brand               TEXT,
  p_energy_kcal_100g    NUMERIC,
  p_proteins_100g       NUMERIC,
  p_carbohydrates_100g  NUMERIC,
  p_sugars_100g         NUMERIC,
  p_fat_100g            NUMERIC,
  p_fiber_100g          NUMERIC,
  p_sodium_100g         NUMERIC,
  p_nutriscore_grade    TEXT,
  p_nova_group          SMALLINT,
  p_image_url           TEXT,
  p_source              TEXT,
  p_confidence          SMALLINT,
  p_is_ai_estimated     BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.barcode_lookup_cache (
    barcode, product_name, brand,
    energy_kcal_100g, proteins_100g, carbohydrates_100g,
    sugars_100g, fat_100g, fiber_100g, sodium_100g,
    nutriscore_grade, nova_group, image_url,
    source, confidence, is_ai_estimated,
    cached_at, expires_at, hit_count
  ) VALUES (
    p_barcode, p_product_name, p_brand,
    p_energy_kcal_100g, p_proteins_100g, p_carbohydrates_100g,
    p_sugars_100g, p_fat_100g, p_fiber_100g, p_sodium_100g,
    p_nutriscore_grade, p_nova_group, p_image_url,
    p_source, p_confidence, p_is_ai_estimated,
    NOW(), NOW() + INTERVAL '7 days', 1
  )
  ON CONFLICT (barcode) DO UPDATE SET
    product_name        = EXCLUDED.product_name,
    brand               = EXCLUDED.brand,
    energy_kcal_100g    = EXCLUDED.energy_kcal_100g,
    proteins_100g       = EXCLUDED.proteins_100g,
    carbohydrates_100g  = EXCLUDED.carbohydrates_100g,
    sugars_100g         = EXCLUDED.sugars_100g,
    fat_100g            = EXCLUDED.fat_100g,
    fiber_100g          = EXCLUDED.fiber_100g,
    sodium_100g         = EXCLUDED.sodium_100g,
    nutriscore_grade    = EXCLUDED.nutriscore_grade,
    nova_group          = EXCLUDED.nova_group,
    image_url           = EXCLUDED.image_url,
    source              = EXCLUDED.source,
    confidence          = EXCLUDED.confidence,
    is_ai_estimated     = EXCLUDED.is_ai_estimated,
    expires_at          = NOW() + INTERVAL '7 days',
    hit_count           = public.barcode_lookup_cache.hit_count + 1;
$$;

COMMENT ON FUNCTION public.upsert_barcode_cache(
  TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  NUMERIC, TEXT, SMALLINT, TEXT, TEXT, SMALLINT, BOOLEAN
) IS
  'Saves a runtime API result to the 7-day cache. Refreshes TTL and increments '
  'hit_count on conflict. search_path fixed to public (security fix 20260401000001).';

-- ============================================================================
-- B-1. enforce_manual_weight_on_body_analysis — add pg_trigger_depth() guard
-- ============================================================================
-- This BEFORE trigger fires on body_analysis INSERT/UPDATE of current_weight_kg.
-- sync_body_analysis_current_weight_from_progress_entries (below) fires AFTER
-- INSERT/UPDATE on progress_entries and itself UPDATEs body_analysis, which
-- would re-fire this trigger — causing a cycle.
-- The pg_trigger_depth() > 1 guard exits early for any nested invocation.
CREATE OR REPLACE FUNCTION public.enforce_manual_weight_on_body_analysis()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  latest_manual_weight NUMERIC;
BEGIN
  -- Guard: do not recurse into nested trigger calls triggered by the sync below.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  latest_manual_weight := public.get_latest_manual_weight_kg(NEW.user_id);

  IF latest_manual_weight IS NOT NULL THEN
    NEW.current_weight_kg := latest_manual_weight;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- B-2. sync_body_analysis_current_weight_from_progress_entries — guard
-- ============================================================================
-- This AFTER trigger fires on progress_entries INSERT/UPDATE of weight_kg and
-- UPDATEs body_analysis.current_weight_kg, which in turn fires the BEFORE
-- trigger above (enforce_manual_weight_on_body_analysis).  That BEFORE trigger
-- calls get_latest_manual_weight_kg which reads progress_entries again — safe
-- for reads — but if anything in that chain triggers another write to
-- body_analysis we would recurse.  The pg_trigger_depth() guard exits early
-- for all nested calls beyond the first.
CREATE OR REPLACE FUNCTION public.sync_body_analysis_current_weight_from_progress_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Guard: prevent recursive trigger chains.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.weight_kg IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.body_analysis
  SET
    current_weight_kg = NEW.weight_kg,
    updated_at        = NOW()
  WHERE user_id = NEW.user_id
    AND current_weight_kg IS DISTINCT FROM NEW.weight_kg;

  RETURN NEW;
END;
$$;
