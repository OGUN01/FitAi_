-- Migration: Clear the dev_override subscription for the e2e payment test account
-- Created: 2026-07-27
-- Description:
--   The active tester account (sharmaharsh9887@gmail.com) had a `dev_override`
--   subscription seed (`razorpay_subscription_id = 'dev_pro_unlimited'`,
--   notes.source = 'dev_override', notes.reason = 'unlimited_development_access')
--   granting pro access for development. With real Razorpay now wired, that
--   `active` record blocked creating a real subscription (worker 409
--   "User already has an active or pending subscription").
--
--   This completes the dev_override record and resets profiles.plan to 'free'
--   so the account can subscribe via the real payment flow. Safe to re-run
--   (idempotent guards). NOTE: the underlying reclaim logic now lives in the
--   worker (handleCreateSubscription reclaims abandoned `created` checkouts),
--   so future abandoned checkouts no longer permanently lock users.

UPDATE subscriptions
SET status = 'completed',
    cancelled_at = EXTRACT(EPOCH FROM NOW())::bigint,
    notes = notes || '{"cleared_for_payment_e2e": "2026-07-27"}'::jsonb,
    updated_at = NOW()
WHERE razorpay_subscription_id = 'dev_pro_unlimited'
  AND status = 'active';

UPDATE profiles
SET plan = 'free'
WHERE id = '5d0079fb-cd2e-4740-8ee9-1e8c7c36868b'
  AND plan = 'pro';
