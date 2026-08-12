-- Migration: Admin audit trail
-- Created: 2026-08-12
-- Description: Adds updated_by tracking to subscription_plans (same pattern
-- as app_config.updated_by), rejected_by/rejected_at parity to
-- user_food_contributions (matching approved_by/approved_at), and a generic
-- admin_audit_log table so sensitive admin mutations (plan pricing /
-- entitlement changes, subscription overrides, admin grants/removals) are
-- attributable and reconstructable after the fact.

-- ============================================================================
-- subscription_plans.updated_by
-- ============================================================================
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- user_food_contributions: rejected_by/rejected_at parity with approved_by/approved_at
-- ============================================================================
ALTER TABLE user_food_contributions
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_food_contributions
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- ============================================================================
-- TABLE: admin_audit_log
-- ============================================================================
-- Generic audit trail for sensitive admin mutations. Written best-effort by
-- the Worker's service-role client (fitai-workers/src/handlers/admin.ts
-- writeAuditLog()) — a failed audit write never blocks the underlying admin
-- action, it's only logged via console.error.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  before_data JSONB,
  after_data  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service_role (Worker) writes; the admin.ts handlers read/write via
-- the service-role client, so no separate authenticated-role write policy
-- is needed. Admins can still read directly (e.g. via SQL) using the
-- app_metadata role check, same pattern as admin_users/app_config.
CREATE POLICY "service_role_all_admin_audit_log" ON admin_audit_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_read_admin_audit_log" ON admin_audit_log
  FOR SELECT
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');
