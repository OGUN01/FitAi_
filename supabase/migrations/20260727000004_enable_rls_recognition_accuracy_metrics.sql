-- ============================================================================
-- Migration: 20260727000004_enable_rls_recognition_accuracy_metrics.sql
-- ============================================================================
-- Purpose: Enable RLS on recognition_accuracy_metrics and grant access only
-- to the service_role. The table (created in 20260124000001) currently has
-- NO RLS enabled and NO policies, so any authenticated user can read,
-- insert, update, or delete rows. This is an admin/aggregation table (no
-- user_id column) populated by the recognition service — it should follow
-- the same admin-only pattern used for analytics_metrics admin tables.
--
-- Safe to re-run: ENABLE is idempotent; policy uses IF NOT EXISTS via DO block.
-- ============================================================================

ALTER TABLE recognition_accuracy_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recognition_accuracy_metrics' AND policyname = 'recognition_accuracy_metrics_service_all') THEN
    CREATE POLICY "recognition_accuracy_metrics_service_all"
      ON recognition_accuracy_metrics FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
