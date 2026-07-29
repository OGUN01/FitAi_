-- Migration: Drop the stale basic-tier yearly test price
-- Created: 2026-07-27
-- Description:
--   The basic tier has no Razorpay yearly plan (no RAZORPAY_PLAN_ID_BASIC_YEARLY
--   secret exists) and the test-pricing migration (20260724000001) intentionally
--   defined basic as monthly-only. A stale `price_yearly = 1999` was left on the
--   basic row, which made the PaywallModal offer a "Basic (Yearly)" option that
--   the worker cannot fulfil (subscription/create returns 400 "Plan does not
--   support yearly billing"). Null it so the paywall only shows backed plans.
--   Safe to re-run: idempotent UPDATE with a guard.

UPDATE subscription_plans
SET price_yearly = NULL,
    updated_at = NOW()
WHERE tier = 'basic' AND price_yearly IS NOT NULL;
