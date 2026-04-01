-- ============================================================================
-- ADD MISSING RLS DELETE (AND OTHER GAP) POLICIES
-- ============================================================================
-- Migration: 20260401000000
-- Created: 2026-04-01
-- Description:
--   Security audit fix — several tables have SELECT/INSERT/UPDATE policies but
--   are missing DELETE (and in some cases UPDATE) policies, leaving rows
--   effectively undeletable by the owning user or only deletable via a catch-all
--   FOR ALL policy that may have been superseded.
--
--   Tables addressed:
--     1. diet_preferences          — explicit DELETE policy for row owner
--     2. analytics_metrics         — DELETE policy (only had SELECT/INSERT/UPDATE)
--     3. user_food_contributions   — user DELETE of own unreviewed contributions
--     4. foods                     — service_role UPDATE + DELETE (no user_id col)
--     5. meal_recognition_metadata — explicit INSERT/UPDATE/DELETE policies
--
--   All blocks are wrapped in DO $$ … END $$ with pg_policies existence checks
--   so this migration is safe to re-run (idempotent).
-- ============================================================================

-- ============================================================================
-- 1. diet_preferences — DELETE policy for row owner
-- ============================================================================
-- The onboarding migration created separate SELECT and FOR-ALL policies.
-- Adding an explicit named DELETE policy ensures it survives any future policy
-- reorganisation and makes the intent unambiguous in the audit log.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'diet_preferences'
      AND policyname = 'Users can delete own diet preferences'
  ) THEN
    CREATE POLICY "Users can delete own diet preferences"
      ON public.diet_preferences
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 2. analytics_metrics — DELETE policy
-- ============================================================================
-- 20260225000001 created SELECT, INSERT, and UPDATE policies but no DELETE.
-- Users should be able to prune their own metric rows (e.g. on account reset).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analytics_metrics'
      AND policyname = 'Users can delete own analytics_metrics'
  ) THEN
    CREATE POLICY "Users can delete own analytics_metrics"
      ON public.analytics_metrics
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 3. user_food_contributions — user DELETE of own unreviewed contributions
-- ============================================================================
-- 20260228000001 and 20260315000002 both add INSERT/SELECT/UPDATE for the
-- owning user but neither adds a DELETE policy.  Users must be able to retract
-- a contribution they submitted, provided it has not yet been approved.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_food_contributions'
      AND policyname = 'ufc_delete_own_unapproved'
  ) THEN
    CREATE POLICY "ufc_delete_own_unapproved"
      ON public.user_food_contributions
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid() AND is_approved IS NOT TRUE);
  END IF;
END $$;

-- ============================================================================
-- 4. foods — service_role UPDATE and DELETE
-- ============================================================================
-- The foods table has no user_id / created_by column, so ordinary users must
-- not be able to mutate or delete food catalogue entries.
-- 20260124000001 added SELECT + INSERT for authenticated users but omitted
-- UPDATE and DELETE for the service role, leaving those operations blocked.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'foods'
      AND policyname = 'Service role can update foods'
  ) THEN
    CREATE POLICY "Service role can update foods"
      ON public.foods
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'foods'
      AND policyname = 'Service role can delete foods'
  ) THEN
    CREATE POLICY "Service role can delete foods"
      ON public.foods
      FOR DELETE
      TO service_role
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- 5. meal_recognition_metadata — explicit INSERT, UPDATE, DELETE policies
-- ============================================================================
-- 20260314 created a single FOR ALL policy ("users_own_recognition_metadata")
-- keyed on meal_id subquery.  20260124000001 also added a FOR ALL policy
-- ("Users can manage their own meal_recognition_metadata") keyed on user_id —
-- but that table version lacks a user_id column, so that policy only applies
-- to the earlier schema definition.
--
-- To harden the current schema (which uses meal_id → meals.user_id), add
-- named INSERT, UPDATE, and DELETE policies that mirror the existing SELECT
-- logic so each operation is explicitly covered and auditable.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_recognition_metadata'
      AND policyname = 'Users can insert own meal_recognition_metadata'
  ) THEN
    CREATE POLICY "Users can insert own meal_recognition_metadata"
      ON public.meal_recognition_metadata
      FOR INSERT
      TO authenticated
      WITH CHECK (
        meal_id IN (
          SELECT id FROM public.meals WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_recognition_metadata'
      AND policyname = 'Users can update own meal_recognition_metadata'
  ) THEN
    CREATE POLICY "Users can update own meal_recognition_metadata"
      ON public.meal_recognition_metadata
      FOR UPDATE
      TO authenticated
      USING (
        meal_id IN (
          SELECT id FROM public.meals WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        meal_id IN (
          SELECT id FROM public.meals WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_recognition_metadata'
      AND policyname = 'Users can delete own meal_recognition_metadata'
  ) THEN
    CREATE POLICY "Users can delete own meal_recognition_metadata"
      ON public.meal_recognition_metadata
      FOR DELETE
      TO authenticated
      USING (
        meal_id IN (
          SELECT id FROM public.meals WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
