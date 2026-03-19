-- Migration: Harden subscription security and public config access
-- Created: 2026-03-19
-- Description:
--   - Remove client-side write access to authoritative subscription and usage tables
--   - Harden SECURITY DEFINER helper functions against arbitrary user_id access
--   - Add public read access for safe guest-visible subscription plans and app config
--   - Prevent multiple non-terminal subscriptions per user

-- ============================================================================
-- RLS HARDENING: subscriptions / feature_usage
-- ============================================================================

DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
DROP POLICY IF EXISTS "feature_usage_insert_own" ON feature_usage;
DROP POLICY IF EXISTS "feature_usage_update_own" ON feature_usage;

CREATE POLICY "service_role_all_subscriptions" ON subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_feature_usage" ON feature_usage
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trigger_prevent_multiple_non_terminal_subscriptions ON subscriptions;
DROP FUNCTION IF EXISTS prevent_multiple_non_terminal_subscriptions();

CREATE FUNCTION prevent_multiple_non_terminal_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'paused') THEN
    IF EXISTS (
      SELECT 1
      FROM subscriptions s
      WHERE s.user_id = NEW.user_id
        AND s.status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'paused')
        AND (TG_OP <> 'UPDATE' OR s.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'user % already has a non-terminal subscription', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_multiple_non_terminal_subscriptions
BEFORE INSERT OR UPDATE OF user_id, status ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION prevent_multiple_non_terminal_subscriptions();

-- ============================================================================
-- WEBHOOK EVENT IDEMPOTENCY
-- ============================================================================

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

UPDATE webhook_events
SET event_id = COALESCE(event_id, id)
WHERE event_id IS NULL;

ALTER TABLE webhook_events
  ALTER COLUMN event_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_event_id_idx
  ON webhook_events (event_id);

REVOKE ALL ON TABLE webhook_events FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_sync_webhook_event_identity ON webhook_events;
DROP FUNCTION IF EXISTS sync_webhook_event_identity();

CREATE FUNCTION sync_webhook_event_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.event_id := COALESCE(NULLIF(NEW.event_id, ''), NEW.id);
  NEW.id := COALESCE(NULLIF(NEW.id, ''), NEW.event_id);

  IF NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'webhook_events.event_id is required';
  END IF;

  IF NEW.id IS NULL THEN
    NEW.id := NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_webhook_event_identity
BEFORE INSERT ON webhook_events
FOR EACH ROW
EXECUTE FUNCTION sync_webhook_event_identity();

-- ============================================================================
-- PUBLIC READ ACCESS: guest pricing / app config
-- ============================================================================

CREATE POLICY "subscription_plans_select_public_active" ON subscription_plans
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "anon_read_public_app_config" ON app_config
  FOR SELECT TO anon, authenticated
  USING (category IN ('features', 'app', 'maintenance'));

-- ============================================================================
-- FUNCTION HARDENING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  tier TEXT,
  status TEXT,
  razorpay_subscription_id TEXT,
  current_period_end BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := auth.role();
  v_uid UUID := auth.uid();
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  RETURN QUERY
    SELECT s.id, s.tier, s.status, s.razorpay_subscription_id, s.current_period_end
    FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'pending', 'authenticated', 'paused')
    ORDER BY s.updated_at DESC, s.created_at DESC
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_user_id UUID,
  p_feature_key TEXT,
  p_period_type TEXT,
  p_period_start DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := auth.role();
  v_uid UUID := auth.uid();
  v_new_count INTEGER;
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  INSERT INTO feature_usage (user_id, feature_key, period_type, period_start, usage_count)
  VALUES (p_user_id, p_feature_key, p_period_type, p_period_start, 1)
  ON CONFLICT (user_id, feature_key, period_type, period_start)
  DO UPDATE SET
    usage_count = feature_usage.usage_count + 1,
    updated_at = NOW()
  RETURNING usage_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_feature_usage(
  p_user_id UUID,
  p_feature_key TEXT,
  p_period_type TEXT,
  p_period_start DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := auth.role();
  v_uid UUID := auth.uid();
  v_usage_count INTEGER;
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT COALESCE(usage_count, 0)
    INTO v_usage_count
  FROM feature_usage
  WHERE user_id = p_user_id
    AND feature_key = p_feature_key
    AND period_type = p_period_type
    AND period_start = p_period_start;

  RETURN COALESCE(v_usage_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION get_active_subscription(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION increment_feature_usage(UUID, TEXT, TEXT, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_feature_usage(UUID, TEXT, TEXT, DATE) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION get_active_subscription(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_feature_usage(UUID, TEXT, TEXT, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_feature_usage(UUID, TEXT, TEXT, DATE) TO service_role;
