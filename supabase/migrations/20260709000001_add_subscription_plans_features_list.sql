-- Migration: Add features_list (JSONB) to subscription_plans
-- Created: 2026-07-09
-- P2-11: PaywallModal hardcodes a TIER_FEATURES map duplicating server-owned
-- subscription_plans features. This migration moves the marketing feature copy
-- into the database so it is server-owned and editable without an app release.
-- The UI (PaywallModal) will read `features_list` from the plan row instead of
-- the hardcoded constant.
--
-- Append-only + IF NOT EXISTS: safe to re-run.

-- ============================================================================
-- COLUMN: features_list
-- ============================================================================
-- Stores an array of human-readable feature strings shown on the paywall,
-- e.g. ["Unlimited AI generations", "Unlimited AI food scans", ...].
-- NULL means "no curated copy yet" (UI should fall back to the hardcoded map).

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS features_list JSONB;

COMMENT ON COLUMN subscription_plans.features_list IS
  'JSON array of human-readable feature strings shown on the paywall. Server-owned marketing copy (P2-11). NULL = use app-side fallback.';

-- ============================================================================
-- SEED: feature copy (mirrors PaywallModal TIER_FEATURES as of 2026-07-09)
-- ============================================================================
-- `name` is NOT NULL on subscription_plans, so we cannot INSERT a bare
-- (tier, features_list) row for a tier that doesn't exist yet. Instead:
--  (a) UPDATE features_list in place for tiers whose row already exists, and
--  (b) INSERT any missing tier rows with the full NOT NULL column set
--      (ON CONFLICT (tier) DO NOTHING keeps it idempotent).

-- (a) UPDATE existing tier rows.
UPDATE subscription_plans
  SET features_list = CASE tier
    WHEN 'free'  THEN '["10 AI generations per month", "10 AI food scans per day", "Basic progress tracking"]'::jsonb
    WHEN 'basic' THEN '["10 AI generations per day", "Unlimited AI food scans", "Basic analytics dashboard"]'::jsonb
    WHEN 'pro'   THEN '["Unlimited AI generations", "Unlimited AI food scans", "Advanced analytics & insights", "Personalized AI coaching", "Priority support", "Export your data"]'::jsonb
    ELSE features_list
  END,
  updated_at = NOW()
  WHERE tier IN ('free', 'basic', 'pro');

-- (b) INSERT tier rows that do not yet exist (full NOT NULL columns).
INSERT INTO subscription_plans
  (id, tier, name, description, price_monthly, price_yearly, active, features_list)
VALUES
  (gen_random_uuid(), 'free',  'Free Plan',  '10 AI generations per month, 10 AI food scans per day, basic progress tracking', 0,    0,    true,
    '["10 AI generations per month", "10 AI food scans per day", "Basic progress tracking"]'::jsonb),
  (gen_random_uuid(), 'basic', 'Basic Plan', '10 AI generations per day, unlimited AI food scans, basic analytics dashboard', 199,  1999, true,
    '["10 AI generations per day", "Unlimited AI food scans", "Basic analytics dashboard"]'::jsonb),
  (gen_random_uuid(), 'pro',   'Pro Plan',   'Unlimited AI generations and scans, advanced analytics, AI coaching, priority support', 499,  4999, true,
    '["Unlimited AI generations", "Unlimited AI food scans", "Advanced analytics & insights", "Personalized AI coaching", "Priority support", "Export your data"]'::jsonb)
ON CONFLICT (tier) DO NOTHING;
