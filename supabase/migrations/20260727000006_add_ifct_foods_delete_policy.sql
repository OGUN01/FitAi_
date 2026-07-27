-- ============================================================================
-- Migration: 20260727000006_add_ifct_foods_delete_policy.sql
-- ============================================================================
-- Purpose: Add a DELETE policy for ifct_foods. The table (created in
-- 20260228000001) has SELECT (public), INSERT (service_role), and UPDATE
-- (service_role) policies but NO DELETE policy. Under RLS, the absence of a
-- DELETE policy means even service_role cannot delete rows (RLS applies to
-- service_role only when FORCE ROW LEVEL SECURITY is set, but explicit
-- policy is the safe, documented pattern matching the sibling INSERT/
-- UPDATE policies on this table).
--
-- Safe to re-run: IF NOT EXISTS via DO block.
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ifct_foods' AND policyname = 'ifct_foods_delete_service') THEN
    CREATE POLICY "ifct_foods_delete_service"
      ON ifct_foods FOR DELETE TO service_role USING (true);
  END IF;
END $$;
