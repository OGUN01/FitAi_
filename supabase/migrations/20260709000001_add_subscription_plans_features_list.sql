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
-- Uses ON CONFLICT (tier) so re-running only updates the copy, never duplicates.

INSERT INTO subscription_plans (tier, features_list) VALUES
  ('free',  '["10 AI generations per month", "10 AI food scans per day", "Basic progress tracking"]'::jsonb),
  ('basic', '["10 AI generations per day", "Unlimited AI food scans", "Basic analytics dashboard"]'::jsonb),
  ('pro',   '["Unlimited AI generations", "Unlimited AI food scans", "Advanced analytics & insights", "Personalized AI coaching", "Priority support", "Export your data"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  features_list = EXCLUDED.features_list,
  updated_at = NOW();
