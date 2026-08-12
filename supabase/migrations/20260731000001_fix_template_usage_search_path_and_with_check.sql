-- ============================================================================
-- Migration: 20260731000001_fix_template_usage_search_path_and_with_check.sql
-- ============================================================================
-- Security audit fix (Round 7 — Supabase RLS & Cross-Cutting Security Audit).
-- Two independent, unrelated fixes bundled because both are one-line-per-object
-- completions of patterns the team already established and partially applied:
--
-- A) increment_template_usage_count is missing SET search_path = public.
--    It is SECURITY DEFINER, so it runs with the privileges of the function
--    owner but resolves unqualified table names (`workout_templates`) using
--    the CALLER's search_path. Without a fixed search_path, a caller that can
--    create objects in a schema ahead of `public` in their search_path could
--    redirect the function's table access to attacker-controlled objects.
--    The exact same class of bug was already fixed for lookup_barcode and
--    upsert_barcode_cache in 20260401000001 — this migration was introduced
--    two days later (20260403000000_fix_remaining_tech_debt.sql) and missed
--    the same hardening. This is a straight port of that fix's pattern.
--    Reproduced verbatim from 20260403000000 with only the header changed.
--
-- B) Three FOR ALL user-owned-row policies (analytics_metrics, meals,
--    meal_recognition_metadata) still lack an explicit WITH CHECK clause.
--    20260727000005_add_with_check_to_all_policies.sql already completed
--    this exact pattern for 14 other tables citing spoofed-user_id inserts
--    as the risk (PostgreSQL treats a FOR-ALL policy's USING expression as
--    the implicit WITH CHECK when none is given, so this is a defense-in-depth
--    completion of an established consistency pattern rather than a bypass —
--    but leaving 3 of 17 tables silently inconsistent with the rest of the
--    schema is exactly the kind of drift this audit exists to close).
--
-- Both changes are idempotent (CREATE OR REPLACE / DROP POLICY IF EXISTS +
-- CREATE POLICY) and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. increment_template_usage_count — add SET search_path = public
-- ----------------------------------------------------------------------------
-- Original body from 20260403000000 reproduced verbatim; only the function
-- header gains SET search_path = public.
CREATE OR REPLACE FUNCTION increment_template_usage_count(
  template_id UUID,
  owner_user_id UUID
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE workout_templates
  SET
    usage_count  = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW(),
    updated_at   = NOW()
  WHERE id = template_id
    AND user_id = owner_user_id;
$$;

COMMENT ON FUNCTION increment_template_usage_count(UUID, UUID) IS
  'Increments a workout_templates usage_count/last_used_at for the given owner. '
  'search_path fixed to public to prevent search_path injection (security fix 20260731000001, '
  'closing the same gap already fixed for lookup_barcode/upsert_barcode_cache in 20260401000001).';

-- ----------------------------------------------------------------------------
-- B. WITH CHECK completion for the 3 tables missed by 20260727000005
-- ----------------------------------------------------------------------------

-- analytics_metrics (policy from 20260124000001)
DROP POLICY IF EXISTS "Users can manage their own analytics_metrics" ON analytics_metrics;
CREATE POLICY "Users can manage their own analytics_metrics"
  ON analytics_metrics FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- meals (policy from 20260124000001)
DROP POLICY IF EXISTS "Users can manage their own meals" ON meals;
CREATE POLICY "Users can manage their own meals"
  ON meals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- meal_recognition_metadata (policy from 20260124000001)
DROP POLICY IF EXISTS "Users can manage their own meal_recognition_metadata" ON meal_recognition_metadata;
CREATE POLICY "Users can manage their own meal_recognition_metadata"
  ON meal_recognition_metadata FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
