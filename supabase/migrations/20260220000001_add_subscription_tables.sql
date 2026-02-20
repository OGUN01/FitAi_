-- Migration: Add Razorpay Subscription Tables
-- Created: 2026-02-20
-- Description: Creates subscription_plans, subscriptions, and feature_usage tables for Razorpay integration

-- ============================================================================
-- TABLE: subscription_plans
-- ============================================================================
-- Stores configurable subscription tier definitions with feature limits
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'basic', 'pro')),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER, -- in paisa (INR subunit), NULL for free tier
  price_yearly INTEGER, -- in paisa, NULL if not offered
  razorpay_plan_id_monthly TEXT, -- Razorpay plan ID for monthly billing
  razorpay_plan_id_yearly TEXT, -- Razorpay plan ID for yearly billing
  
  -- Feature limits (NULL = unlimited)
  ai_generations_per_day INTEGER,
  ai_generations_per_month INTEGER,
  scans_per_day INTEGER,
  unlimited_scans BOOLEAN DEFAULT FALSE,
  unlimited_ai BOOLEAN DEFAULT FALSE,
  analytics BOOLEAN DEFAULT FALSE,
  coaching BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for 3 tiers
INSERT INTO subscription_plans (tier, name, description, price_monthly, price_yearly, ai_generations_per_day, ai_generations_per_month, scans_per_day, unlimited_scans, unlimited_ai, analytics, coaching) VALUES
  ('free', 'Free', 'Try FitAI with basic features', NULL, NULL, NULL, 1, 10, FALSE, FALSE, FALSE, FALSE),
  ('basic', 'Basic', 'Perfect for regular fitness tracking', 29900, NULL, 10, NULL, NULL, TRUE, FALSE, FALSE, FALSE),
  ('pro', 'Pro', 'Unlimited AI power + advanced features', 49900, 399900, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  ai_generations_per_day = EXCLUDED.ai_generations_per_day,
  ai_generations_per_month = EXCLUDED.ai_generations_per_month,
  scans_per_day = EXCLUDED.scans_per_day,
  unlimited_scans = EXCLUDED.unlimited_scans,
  unlimited_ai = EXCLUDED.unlimited_ai,
  analytics = EXCLUDED.analytics,
  coaching = EXCLUDED.coaching,
  updated_at = NOW();

-- ============================================================================
-- TABLE: subscriptions
-- ============================================================================
-- Stores user subscription records synced from Razorpay
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Razorpay data
  razorpay_subscription_id TEXT UNIQUE NOT NULL,
  razorpay_customer_id TEXT,
  razorpay_plan_id TEXT NOT NULL,
  
  -- Subscription details
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'cancelled', 'completed')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Timestamps (Unix epoch from Razorpay)
  current_period_start BIGINT,
  current_period_end BIGINT,
  cancelled_at BIGINT,
  paused_at BIGINT,
  
  -- Metadata
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_active_subscription_per_user UNIQUE (user_id, status) WHERE status = 'active'
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- TABLE: feature_usage
-- ============================================================================
-- Tracks feature usage per user per period for limit enforcement
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feature tracking
  feature_key TEXT NOT NULL CHECK (feature_key IN ('ai_generation', 'barcode_scan', 'chat_message')),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  period_start DATE NOT NULL, -- Date of period start (YYYY-MM-DD)
  
  -- Usage counter
  usage_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one row per user + feature + period_type + period_start
  CONSTRAINT unique_usage_record UNIQUE (user_id, feature_key, period_type, period_start)
);

-- Indexes for fast lookups during limit checks
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature ON feature_usage(user_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_period ON feature_usage(period_start);

-- ============================================================================
-- TABLE: webhook_events
-- ============================================================================
-- Stores processed webhook event IDs for Razorpay idempotency deduplication
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,  -- x-razorpay-event-id header value
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on webhook_events (service_role only — no user access)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Webhook events: only service role can read/write (used internally)
CREATE POLICY "service_role_all_webhook_events" ON webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for cleanup queries by age
CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx ON webhook_events (processed_at);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- subscription_plans: Read-only for all authenticated users
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_select_all" ON subscription_plans
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- subscriptions: Users can only see their own subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- feature_usage: Users can only see their own usage
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_usage_select_own" ON feature_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "feature_usage_insert_own" ON feature_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feature_usage_update_own" ON feature_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's current active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  tier TEXT,
  status TEXT,
  razorpay_subscription_id TEXT,
  current_period_end BIGINT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tier, status, razorpay_subscription_id, current_period_end
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Function: Increment feature usage (upsert pattern)
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
  v_new_count INTEGER;
BEGIN
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

-- Function: Get current usage count for a feature
CREATE OR REPLACE FUNCTION get_feature_usage(
  p_user_id UUID,
  p_feature_key TEXT,
  p_period_type TEXT,
  p_period_start DATE
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(usage_count, 0)
  FROM feature_usage
  WHERE user_id = p_user_id
    AND feature_key = p_feature_key
    AND period_type = p_period_type
    AND period_start = p_period_start;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at on subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Trigger: Update updated_at on subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Trigger: Update updated_at on feature_usage
CREATE OR REPLACE FUNCTION update_feature_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_usage_updated_at();
