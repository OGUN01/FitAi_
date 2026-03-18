-- Migration: Create Admin Tables
-- Created: 2026-03-15
-- Description: admin_users, app_config, triggers for role sync, admin RLS policies

-- ============================================================================
-- TABLE: admin_users
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service_role (Worker) can write; admins can read
CREATE POLICY "service_role_all_admin_users" ON admin_users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_read_admin_users" ON admin_users
  FOR SELECT
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- ============================================================================
-- TRIGGERS: Sync app_metadata.role with admin_users membership
-- ============================================================================

-- On INSERT → set role = 'admin'
CREATE OR REPLACE FUNCTION set_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_admin_role
  AFTER INSERT ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_admin_role();

-- On DELETE → remove role
CREATE OR REPLACE FUNCTION remove_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_remove_admin_role
  AFTER DELETE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION remove_admin_role();

-- ============================================================================
-- TABLE: app_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('ai', 'subscription', 'features', 'maintenance', 'app')),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (Worker reads/writes)
CREATE POLICY "service_role_all_app_config" ON app_config
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Mobile app can read public categories (NOT 'ai' which has model secrets)
CREATE POLICY "authenticated_read_public_app_config" ON app_config
  FOR SELECT TO authenticated
  USING (category IN ('features', 'app', 'maintenance'));

-- Admins can read + write all categories
CREATE POLICY "admin_all_app_config" ON app_config
  FOR ALL
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- ============================================================================
-- SEED: Default app_config values
-- ============================================================================

INSERT INTO app_config (key, value, description, category) VALUES
  ('ai_model',             '"google/gemini-2.0-flash-exp"', 'Active AI model ID',              'ai'),
  ('ai_temperature',       '0.7',                           'AI temperature (0.0–2.0)',         'ai'),
  ('ai_max_tokens',        '8192',                          'Max tokens per AI response',       'ai'),
  ('maintenance_mode',     'false',                         'App-wide maintenance mode',        'maintenance'),
  ('maintenance_message',  '"Back soon!"',                  'Maintenance banner text',          'maintenance'),
  ('min_app_version',      '"1.0.0"',                       'Minimum supported app version',    'app'),
  ('force_update_version', '"0.0.0"',                       'Force update below this version',  'app'),
  ('feature_ai_chat',      'true',                          'AI coaching chat feature',         'features'),
  ('feature_food_contributions', 'true',                    'User food submission feature',     'features'),
  ('feature_analytics',    'true',                          'Analytics tab for pro users',      'features')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ADMIN RLS POLICIES: Existing tables
-- ============================================================================

-- subscription_plans: admin can update pricing/limits
CREATE POLICY "admin_all_subscription_plans" ON subscription_plans
  FOR ALL
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- subscriptions: admin can read all + override
CREATE POLICY "admin_all_subscriptions" ON subscriptions
  FOR ALL
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- webhook_events: admin can read
CREATE POLICY "admin_read_webhook_events" ON webhook_events
  FOR SELECT
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- user_food_contributions: admin can approve/reject (table may not exist yet — wrapped in DO block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_food_contributions') THEN
    EXECUTE $policy$
      CREATE POLICY "admin_all_contributions" ON user_food_contributions
        FOR ALL
        USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
    $policy$;
  END IF;
END;
$$;
