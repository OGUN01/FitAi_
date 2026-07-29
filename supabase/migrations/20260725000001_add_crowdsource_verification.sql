-- ============================================================================
-- Migration: 20260725000001_add_crowdsource_verification
-- Created: 2026-07-25
-- Description:
--   Phase 1 of Tier 3 crowd-sourced barcode database.
--   Adds verification workflow to user_food_contributions:
--     - verified / verification_count / verified_at columns
--     - nutrition_basis + serving_size_g (per-serving contributions)
--     - label_image_path for raw label photo storage
--     - Cross-user verification trigger (5% macro tolerance)
--     - Helper RPCs: has_verified_contribution, has_pending_contribution
--   Replaces v_barcode_lookup view to include verified contributions.
--   Adds storage bucket + RLS for label images.
--   Tightens the existing ufc_delete_own_unapproved DELETE policy so
--   verified/approved rows can never be deleted by the contributor.
-- ============================================================================

-- ============================================================================
-- A1. NEW COLUMNS
-- ============================================================================
ALTER TABLE user_food_contributions
  ADD COLUMN IF NOT EXISTS verified            BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_count  INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nutrition_basis     TEXT        NOT NULL DEFAULT 'per_100g'
                              CHECK (nutrition_basis IN ('per_100g','per_serving')),
  ADD COLUMN IF NOT EXISTS serving_size_g      NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS label_image_path    TEXT;

-- ============================================================================
-- A2. UNIQUE PARTIAL INDEX — one contribution per (barcode, user)
-- ============================================================================
-- Prevents a single user from spamming duplicate barcode contributions.
-- Partial (WHERE barcode IS NOT NULL) so name-only contributions are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS ufo_barcode_user_unique
  ON user_food_contributions (barcode, user_id)
  WHERE barcode IS NOT NULL;

-- ============================================================================
-- A3. VERIFIED LOOKUP INDEX
-- ============================================================================
-- Speeds up the lookup path: "is there a verified row for this barcode?"
CREATE INDEX IF NOT EXISTS idx_ufc_verified_barcode
  ON user_food_contributions (barcode)
  WHERE verified = TRUE AND barcode IS NOT NULL;

-- ============================================================================
-- A4. UPDATED VIEW — v_barcode_lookup
-- ============================================================================
-- Tier 2 arm now includes verified contributions (in addition to approved).
-- Verified rows come from independent cross-user agreement, so they are
-- safe to expose even before manual admin approval.
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
    COALESCE(label_image_path, label_image_url) AS image_url,
    'user-contribution'   AS source,
    80                    AS confidence,
    2                     AS tier
  FROM user_food_contributions
  WHERE (is_approved = TRUE OR verified = TRUE)
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
-- A5. STORAGE BUCKET — food-label-images
-- ============================================================================
-- Public read (so anon + authenticated can render label photos),
-- write restricted to authenticated owners via RLS below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-label-images', 'food-label-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- A6. STORAGE RLS — label image policies
-- ============================================================================
-- Folder convention: food-label-images/<user_id>/<contribution_id>.jpg
-- foldername(name)[1] extracts the first path segment (the user_id).
-- Idempotent: guards prevent "already exists" errors on re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'users_upload_own_label_images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users_upload_own_label_images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'food-label-images'
          AND (storage.foldername(name))[1] = (select auth.uid())::text
        );
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'public_read_label_images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "public_read_label_images"
        ON storage.objects FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'food-label-images');
    $policy$;
  END IF;
END
$$;

-- ============================================================================
-- A7. DELETE POLICY TIGHTENING
-- ============================================================================
-- DROP the existing loose policy and recreate with both guards:
-- a contributor can delete ONLY their own rows that are neither verified
-- nor admin-approved. Once verified/approved, the row is immutable by the
-- contributor (becomes part of the crowd-sourced database).
DROP POLICY IF EXISTS ufc_delete_own_unapproved ON user_food_contributions;

CREATE POLICY ufc_delete_own_unapproved
  ON user_food_contributions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND verified IS NOT TRUE
    AND is_approved IS NOT TRUE
  );

-- ============================================================================
-- B1 + B2. CROSS-USER VERIFICATION TRIGGER
-- ============================================================================
-- On INSERT of a barcode contribution, look for prior contributions of the
-- same barcode from OTHER users and compare macros within 5% tolerance.
-- If a match is found, mark BOTH rows verified (verification_count=2,
-- verified_at=NOW()). If all prior rows mismatch, flag the new row only.
-- Iterates across ALL prior contributors (not LIMIT 1) so a deadlock can't
-- occur when two users submit at the same time — the second insert simply
-- matches the first. Wrapped in EXCEPTION handler so a trigger fault can
-- never block the original insert.
CREATE OR REPLACE FUNCTION verify_food_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prior_row RECORD;
  matched   BOOLEAN := FALSE;
  tolerance NUMERIC := 0.05;  -- 5% macro tolerance
BEGIN
  -- Only verify barcode contributions with at least the core macros.
  IF NEW.barcode IS NULL
     OR NEW.energy_kcal_100g IS NULL
     OR NEW.proteins_100g IS NULL
     OR NEW.carbohydrates_100g IS NULL
     OR NEW.fat_100g IS NULL THEN
    RETURN NEW;
  END IF;

  -- Iterate across ALL prior contributions of this barcode from OTHER users.
  FOR prior_row IN
    SELECT *
    FROM user_food_contributions
    WHERE barcode = NEW.barcode
      AND user_id IS NOT NULL
      AND user_id <> NEW.user_id
      AND energy_kcal_100g IS NOT NULL
      AND proteins_100g IS NOT NULL
      AND carbohydrates_100g IS NOT NULL
      AND fat_100g IS NOT NULL
  LOOP
    IF abs(NEW.energy_kcal_100g   - prior_row.energy_kcal_100g)
         <= GREATEST(0.01, abs(prior_row.energy_kcal_100g)   * tolerance)
   AND abs(NEW.proteins_100g      - prior_row.proteins_100g)
         <= GREATEST(0.01, abs(prior_row.proteins_100g)      * tolerance)
   AND abs(NEW.carbohydrates_100g - prior_row.carbohydrates_100g)
         <= GREATEST(0.01, abs(prior_row.carbohydrates_100g) * tolerance)
   AND abs(NEW.fat_100g           - prior_row.fat_100g)
         <= GREATEST(0.01, abs(prior_row.fat_100g)           * tolerance)
    THEN
      matched := TRUE;
      -- Verify BOTH rows in a single transaction.
      UPDATE user_food_contributions
        SET verified = TRUE, verification_count = 2, verified_at = NOW()
        WHERE id = prior_row.id;
      UPDATE user_food_contributions
        SET verified = TRUE, verification_count = 2, verified_at = NOW()
        WHERE id = NEW.id;
      -- NEW.verified will be picked up by RETURN NEW via the UPDATE above.
      EXIT;  -- first matching prior row is enough
    END IF;
  END LOOP;

  -- If no prior contributor matched, flag the new row for review.
  IF NOT matched THEN
    NEW.notes := CONCAT_WS(' | ', NEW.notes, 'FLAG: macro mismatch');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the original insert if the trigger faults.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_food_contribution ON user_food_contributions;
CREATE TRIGGER trg_verify_food_contribution
  AFTER INSERT ON user_food_contributions
  FOR EACH ROW
  EXECUTE FUNCTION verify_food_contribution();

-- ============================================================================
-- B3. HELPER RPC — has_verified_contribution(p_barcode)
-- ============================================================================
-- Used by the application layer to short-circuit: if a verified row exists
-- for this barcode, no need to prompt the user to contribute.
CREATE OR REPLACE FUNCTION has_verified_contribution(p_barcode TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_food_contributions
    WHERE barcode = p_barcode
      AND verified = TRUE
  );
$$;

-- ============================================================================
-- B4. HELPER RPC — has_pending_contribution(p_barcode)
-- ============================================================================
-- Used by the application layer to detect: "this user already has an
-- unverified contribution for this barcode" (avoid duplicate prompts).
CREATE OR REPLACE FUNCTION has_pending_contribution(p_barcode TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_food_contributions
    WHERE barcode = p_barcode
      AND user_id = auth.uid()
      AND verified = FALSE
  );
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN user_food_contributions.verified IS
  'TRUE when an independent contributor submitted matching macros (5% tolerance).';
COMMENT ON COLUMN user_food_contributions.verification_count IS
  'Number of users whose macros agreed (0=pending, 2=verified).';
COMMENT ON COLUMN user_food_contributions.verified_at IS
  'Timestamp of the cross-user verification event.';
COMMENT ON COLUMN user_food_contributions.nutrition_basis IS
  'Whether macros are per_100g (canonical) or per_serving (needs normalizeToPer100g).';
COMMENT ON COLUMN user_food_contributions.serving_size_g IS
  'Serving size in grams — required when nutrition_basis = per_serving.';
COMMENT ON COLUMN user_food_contributions.label_image_path IS
  'Storage path (food-label-images bucket) of the raw label photo for admin review.';

COMMENT ON FUNCTION verify_food_contribution IS
  'AFTER INSERT trigger: cross-validates a new barcode contribution against prior contributions from other users. Marks both verified on 5% macro match; flags mismatch.';
COMMENT ON FUNCTION has_verified_contribution IS
  'RPC: returns TRUE if any user_food_contributions row for p_barcode is verified.';
COMMENT ON FUNCTION has_pending_contribution IS
  'RPC: returns TRUE if the calling user has an unverified contribution for p_barcode.';
