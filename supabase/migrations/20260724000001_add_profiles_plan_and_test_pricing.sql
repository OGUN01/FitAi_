-- Migration: Add profiles.plan column + test-mode subscription pricing
-- Created: 2026-07-24
-- Description:
--   - Add a denormalized `plan` column to `profiles` (free/basic/pro) that the
--     Razorpay webhook updates via the service role. The `subscriptions` table
--     remains the source of truth; `profiles.plan` is a fast-lookup field for
--     admin queries and future client reads.
--   - Refresh subscription_plans pricing to TEST-MODE values so the end-to-end
--     Razorpay test payment flow works at the amounts shown in the PaywallModal
--     (basic ₹2/mo, pro ₹5/mo). Replace these with production prices before
--     going live. Free tier now grants 10 AI generations per month.

-- ============================================================================
-- 1. profiles.plan column
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- Replace any stale check constraint on `plan` with the canonical one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_plan_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'basic', 'pro'));
  END IF;
END $$;

-- Backfill: derive plan from the latest subscription tier for existing users
-- so the column is not stuck on 'free' for currently-paying users. Idempotent.
UPDATE profiles p
SET plan = sub.tier
FROM (
  SELECT DISTINCT ON (s.user_id) s.user_id, s.tier
  FROM subscriptions s
  WHERE s.status IN ('active', 'authenticated', 'pending')
  ORDER BY s.user_id, s.updated_at DESC
) sub
WHERE p.id = sub.user_id
  AND p.plan <> sub.tier;

-- Index for fast plan-based lookups (admin dashboards, gating queries).
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles (plan);

-- ============================================================================
-- 2. TEST-MODE subscription plan pricing
-- ============================================================================
-- IMPORTANT: These are TEST prices (in paisa) for verifying the end-to-end
-- Razorpay test-payment flow. Update to production prices before launch:
--   basic -> 29900 (₹299/mo) or your real price
--   pro   -> 49900 (₹499/mo), 399900 (₹3999/yr) or your real prices
-- The Razorpay plan IDs (razorpay_plan_id_monthly/yearly) are intentionally NOT
-- set here — the worker falls back to RAZORPAY_PLAN_ID_* env vars when the DB
-- column is NULL, so set the live/test plan ids in the worker secrets instead.

UPDATE subscription_plans
SET
  ai_generations_per_month = 10,
  updated_at = NOW()
WHERE tier = 'free';

UPDATE subscription_plans
SET
  price_monthly = 200,        -- ₹2/mo (test)
  ai_generations_per_day = 10,
  ai_generations_per_month = NULL,  -- daily cap only for basic
  scans_per_day = NULL,            -- unlimited scans (handled by unlimited_scans)
  unlimited_scans = TRUE,
  unlimited_ai = FALSE,
  updated_at = NOW()
WHERE tier = 'basic';

UPDATE subscription_plans
SET
  price_monthly = 500,        -- ₹5/mo (test)
  price_yearly = 5000,       -- ₹50/yr (test, ~₹4/mo effective)
  ai_generations_per_day = NULL,
  ai_generations_per_month = NULL,
  scans_per_day = NULL,
  unlimited_scans = TRUE,
  unlimited_ai = TRUE,
  updated_at = NOW()
WHERE tier = 'pro';
