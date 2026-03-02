-- ============================================================================
-- OPEN FOOD FACTS PRODUCTS + IFCT FOODS TABLES
-- ============================================================================
-- Migration: 20260228000001
-- Created: 2026-02-28
-- Description:
--   Tier 1 - off_products: Self-hosted subset of Open Food Facts database
--            (~20K India-tagged + 890-prefix barcode products)
--   Tier 2 - ifct_foods: Traditional Indian foods from IFCT 2017 (NIN/ICMR)
--            (~528 traditional foods, no barcodes, name-based lookup)
--   Tier 3 - Runtime API fallback (handled in application layer)
--   Tier 4 - user_food_contributions: Community corrections and new products
-- ============================================================================

-- ============================================================================
-- TABLE: off_products (Open Food Facts India subset)
-- ============================================================================
-- Stores barcode-indexed nutrition data for Indian products.
-- Populated offline via DuckDB extraction from OFF Parquet dataset.
-- Updated weekly via delta sync script (scripts/sync-off-india.mjs).
-- All nutrition values are per 100g/ml.
-- ============================================================================
CREATE TABLE IF NOT EXISTS off_products (
  code                    TEXT PRIMARY KEY,
  product_name            TEXT,
  product_name_en         TEXT,
  brands                  TEXT,
  quantity                TEXT,
  categories              TEXT,
  countries_tags          TEXT,
  ingredients_text        TEXT,
  allergens_tags          TEXT,
  energy_kcal_100g        NUMERIC(8,2),
  proteins_100g           NUMERIC(6,3),
  carbohydrates_100g      NUMERIC(6,3),
  sugars_100g             NUMERIC(6,3),
  fat_100g                NUMERIC(6,3),
  saturated_fat_100g      NUMERIC(6,3),
  fiber_100g              NUMERIC(6,3),
  sodium_100g             NUMERIC(6,4),
  nutriscore_grade        TEXT CHECK (nutriscore_grade IS NULL OR nutriscore_grade IN ('a','b','c','d','e')),
  nova_group              SMALLINT CHECK (nova_group IS NULL OR nova_group BETWEEN 1 AND 4),
  image_url               TEXT,
  image_small_url         TEXT,
  last_modified_t         BIGINT,
  imported_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  off_source              TEXT DEFAULT 'off-parquet-india'
                          CHECK (off_source IN ('off-parquet-india', 'off-api-live', 'off-delta')),
  has_nutrition           BOOLEAN GENERATED ALWAYS AS (energy_kcal_100g IS NOT NULL) STORED
);

CREATE INDEX IF NOT EXISTS idx_off_products_code
  ON off_products (code);
CREATE INDEX IF NOT EXISTS idx_off_products_with_nutrition
  ON off_products (code) WHERE energy_kcal_100g IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_off_products_brand
  ON off_products (brands) WHERE brands IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_off_products_name_fts
  ON off_products USING GIN (
    to_tsvector('simple', COALESCE(product_name, '') || ' ' || COALESCE(brands, ''))
  );

-- ============================================================================
-- TABLE: ifct_foods (IFCT 2017 - Indian Food Composition Tables)
-- ============================================================================
-- Source: ICMR-NIN "Indian Food Composition Tables 2017" (ifct2017.github.io)
-- ~528 traditional Indian foods with scientific nutrition data.
-- NO barcodes - lookup is purely by name / food_code.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ifct_foods (
  food_code               TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  scientific_name         TEXT,
  local_names             TEXT,
  food_group              TEXT,
  subgroup                TEXT,
  region                  TEXT,
  preparation_method      TEXT,
  energy_kcal_100g        NUMERIC(8,2),
  protein_100g            NUMERIC(6,3),
  fat_100g                NUMERIC(6,3),
  carbohydrate_100g       NUMERIC(6,3),
  fiber_100g              NUMERIC(6,3),
  sugar_100g              NUMERIC(6,3),
  sodium_mg_100g          NUMERIC(8,2),
  calcium_mg_100g         NUMERIC(8,2),
  iron_mg_100g            NUMERIC(6,3),
  vitamin_c_mg_100g       NUMERIC(6,3),
  beta_carotene_mcg_100g  NUMERIC(8,2),
  moisture_100g           NUMERIC(6,3),
  edible_portion          NUMERIC(5,3),
  imported_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifct_foods_name
  ON ifct_foods (name);
CREATE INDEX IF NOT EXISTS idx_ifct_foods_name_fts
  ON ifct_foods USING GIN (
    to_tsvector('simple', name || ' ' || COALESCE(local_names, ''))
  );
CREATE INDEX IF NOT EXISTS idx_ifct_foods_group
  ON ifct_foods (food_group);

-- ============================================================================
-- TABLE: user_food_contributions
-- ============================================================================
-- Community-contributed products and corrections.
-- Moderated via is_approved flag (service_role sets to TRUE after review).
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_food_contributions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  barcode                 TEXT,
  product_name            TEXT NOT NULL,
  brand                   TEXT,
  quantity_description    TEXT,
  energy_kcal_100g        NUMERIC(8,2),
  proteins_100g           NUMERIC(6,3),
  carbohydrates_100g      NUMERIC(6,3),
  sugars_100g             NUMERIC(6,3),
  fat_100g                NUMERIC(6,3),
  saturated_fat_100g      NUMERIC(6,3),
  fiber_100g              NUMERIC(6,3),
  sodium_100g             NUMERIC(6,4),
  contribution_type       TEXT NOT NULL DEFAULT 'new_product'
                            CHECK (contribution_type IN (
                              'new_product','off_correction','ifct_correction','serving_size'
                            )),
  reference_code          TEXT,
  notes                   TEXT,
  label_image_url         TEXT,
  is_approved             BOOLEAN DEFAULT FALSE,
  approved_at             TIMESTAMP WITH TIME ZONE,
  approved_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason        TEXT,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ufc_barcode
  ON user_food_contributions (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ufc_approved
  ON user_food_contributions (barcode) WHERE is_approved = TRUE AND barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ufc_user
  ON user_food_contributions (user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- TABLE: barcode_lookup_cache
-- ============================================================================
-- 7-day TTL cache for runtime API results (Tier 3 fallback).
-- Prevents re-calling OFF API / USDA / Gemini for recently looked-up barcodes.
-- Cleared by cleanup_expired_barcode_cache() cron.
-- ============================================================================
CREATE TABLE IF NOT EXISTS barcode_lookup_cache (
  barcode                 TEXT PRIMARY KEY,
  product_name            TEXT,
  brand                   TEXT,
  energy_kcal_100g        NUMERIC(8,2),
  proteins_100g           NUMERIC(6,3),
  carbohydrates_100g      NUMERIC(6,3),
  sugars_100g             NUMERIC(6,3),
  fat_100g                NUMERIC(6,3),
  fiber_100g              NUMERIC(6,3),
  sodium_100g             NUMERIC(6,4),
  nutriscore_grade        TEXT,
  nova_group              SMALLINT,
  image_url               TEXT,
  source                  TEXT,
  confidence              SMALLINT DEFAULT 50,
  is_ai_estimated         BOOLEAN DEFAULT FALSE,
  cached_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  hit_count               INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_blc_expires
  ON barcode_lookup_cache (expires_at);

-- ============================================================================
-- VIEW: v_barcode_lookup
-- ============================================================================
-- Unified barcode lookup across all tiers.
-- Returns rows ordered by tier (1=best). Callers use LIMIT 1.
-- tier 1: off_products (self-hosted, highest confidence)
-- tier 2: user_food_contributions (community, approved only)
-- tier 3: barcode_lookup_cache (runtime API cache, not expired)
-- ============================================================================
CREATE OR REPLACE VIEW v_barcode_lookup AS
  SELECT
    code                  AS barcode,
    COALESCE(product_name_en, product_name)  AS product_name,
    brands                AS brand,
    energy_kcal_100g,
    proteins_100g,
    carbohydrates_100g,
    sugars_100g,
    fat_100g,
    fiber_100g,
    sodium_100g,
    nutriscore_grade,
    nova_group,
    image_url,
    'off-supabase'        AS source,
    90                    AS confidence,
    1                     AS tier
  FROM off_products
  WHERE energy_kcal_100g IS NOT NULL

  UNION ALL

  SELECT
    barcode,
    product_name,
    brand,
    energy_kcal_100g,
    proteins_100g,
    carbohydrates_100g,
    sugars_100g,
    fat_100g,
    fiber_100g,
    sodium_100g,
    NULL                  AS nutriscore_grade,
    NULL                  AS nova_group,
    label_image_url       AS image_url,
    'user-contribution'   AS source,
    80                    AS confidence,
    2                     AS tier
  FROM user_food_contributions
  WHERE is_approved = TRUE
    AND barcode IS NOT NULL
    AND energy_kcal_100g IS NOT NULL

  UNION ALL

  SELECT
    barcode,
    product_name,
    brand,
    energy_kcal_100g,
    proteins_100g,
    carbohydrates_100g,
    sugars_100g,
    fat_100g,
    fiber_100g,
    sodium_100g,
    nutriscore_grade,
    nova_group,
    image_url,
    source,
    confidence,
    3                     AS tier
  FROM barcode_lookup_cache
  WHERE expires_at > NOW();

-- ============================================================================
-- FUNCTION: lookup_barcode(p_barcode TEXT)
-- ============================================================================
-- Returns the best matching product for a barcode.
-- Uses DISTINCT ON tier to return the best (lowest tier) match.
-- Security definer so it bypasses RLS for the cache table read.
-- ============================================================================
CREATE OR REPLACE FUNCTION lookup_barcode(p_barcode TEXT)
RETURNS TABLE (
  barcode           TEXT,
  product_name      TEXT,
  brand             TEXT,
  energy_kcal_100g  NUMERIC,
  proteins_100g     NUMERIC,
  carbohydrates_100g NUMERIC,
  sugars_100g       NUMERIC,
  fat_100g          NUMERIC,
  fiber_100g        NUMERIC,
  sodium_100g       NUMERIC,
  nutriscore_grade  TEXT,
  nova_group        SMALLINT,
  image_url         TEXT,
  source            TEXT,
  confidence        SMALLINT,
  tier              INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $
  SELECT DISTINCT ON (barcode)
    barcode, product_name, brand,
    energy_kcal_100g, proteins_100g, carbohydrates_100g,
    sugars_100g, fat_100g, fiber_100g, sodium_100g,
    nutriscore_grade, nova_group, image_url,
    source, confidence, tier
  FROM v_barcode_lookup
  WHERE barcode = p_barcode
  ORDER BY barcode, tier ASC;
$;

-- ============================================================================
-- FUNCTION: upsert_barcode_cache(...)
-- ============================================================================
-- Inserts or updates a row in barcode_lookup_cache, refreshing TTL on update.
-- Called from application layer after a successful runtime API lookup.
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_barcode_cache(
  p_barcode           TEXT,
  p_product_name      TEXT,
  p_brand             TEXT,
  p_energy_kcal_100g  NUMERIC,
  p_proteins_100g     NUMERIC,
  p_carbohydrates_100g NUMERIC,
  p_sugars_100g       NUMERIC,
  p_fat_100g          NUMERIC,
  p_fiber_100g        NUMERIC,
  p_sodium_100g       NUMERIC,
  p_nutriscore_grade  TEXT,
  p_nova_group        SMALLINT,
  p_image_url         TEXT,
  p_source            TEXT,
  p_confidence        SMALLINT,
  p_is_ai_estimated   BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $
  INSERT INTO barcode_lookup_cache (
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
    hit_count           = barcode_lookup_cache.hit_count + 1;
$;

-- ============================================================================
-- FUNCTION: cleanup_expired_barcode_cache()
-- ============================================================================
-- Removes cache entries that expired more than 1 day ago.
-- Run via pg_cron or Supabase Edge Function cron weekly.
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_barcode_cache()
RETURNS INTEGER
LANGUAGE SQL SECURITY DEFINER AS $
  WITH deleted AS (
    DELETE FROM barcode_lookup_cache
    WHERE expires_at < NOW() - INTERVAL '1 day'
    RETURNING barcode
  )
  SELECT COUNT(*)::INTEGER FROM deleted;
$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- off_products: public read (products are not private), service_role write
ALTER TABLE off_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY off_products_select
  ON off_products FOR SELECT
  USING (TRUE);

CREATE POLICY off_products_insert_service
  ON off_products FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY off_products_update_service
  ON off_products FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY off_products_delete_service
  ON off_products FOR DELETE
  TO service_role
  USING (TRUE);

-- ifct_foods: public read, service_role write
ALTER TABLE ifct_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY ifct_foods_select
  ON ifct_foods FOR SELECT
  USING (TRUE);

CREATE POLICY ifct_foods_insert_service
  ON ifct_foods FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY ifct_foods_update_service
  ON ifct_foods FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- user_food_contributions: authenticated users see all approved + own unapproved
ALTER TABLE user_food_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ufc_select_approved
  ON user_food_contributions FOR SELECT
  TO authenticated
  USING (
    is_approved = TRUE
    OR user_id = auth.uid()
  );

CREATE POLICY ufc_insert_own
  ON user_food_contributions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ufc_update_own
  ON user_food_contributions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_approved = FALSE)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ufc_all_service
  ON user_food_contributions FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- barcode_lookup_cache: authenticated read, service_role + functions write
ALTER TABLE barcode_lookup_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY blc_select_auth
  ON barcode_lookup_cache FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY blc_all_service
  ON barcode_lookup_cache FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE off_products IS
  'Tier 1: Open Food Facts India subset (~20K products). Populated offline via DuckDB from OFF Parquet. All nutrition per 100g.';

COMMENT ON TABLE ifct_foods IS
  'Tier 2: IFCT 2017 traditional Indian foods (528 foods, ICMR-NIN). Name-based lookup only, no barcodes.';

COMMENT ON TABLE user_food_contributions IS
  'Tier 4: Community-contributed and corrected product data. Moderated (is_approved flag).';

COMMENT ON TABLE barcode_lookup_cache IS
  'Tier 3: 7-day TTL cache for runtime API results (OFF live / USDA / Gemini). Avoids repeat API calls.';

COMMENT ON VIEW v_barcode_lookup IS
  'Unified barcode lookup view across all 3 database tiers. Order by tier ASC for best match.';

COMMENT ON FUNCTION lookup_barcode IS
  'RPC function for barcode lookup. Returns best matching product row. Call via supabase.rpc("lookup_barcode", {p_barcode}).';

COMMENT ON FUNCTION upsert_barcode_cache IS
  'Saves a runtime API result to the 7-day cache. Refreshes TTL and increments hit_count on conflict.';

COMMENT ON FUNCTION cleanup_expired_barcode_cache IS
  'Deletes expired cache entries (>1 day past expiry). Returns count of deleted rows. Run weekly via cron.';
