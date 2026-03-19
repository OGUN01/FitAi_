# Login, Subscription, Payment, and Admin Limits Audit

Date: 2026-03-18

Scope:
- mobile login/session handling
- admin auth and admin-configured plans/config
- Razorpay subscription lifecycle and payment verification
- usage-limit enforcement and plan/feature gating

Method:
- multi-pass code audit with parallel reviewers
- local code verification across mobile app, workers, admin app, and Supabase migrations
- targeted worker tests previously run: `npm test -- subscription.test.ts subscriptionGate.test.ts`

## Deduplicated Findings

### Authentication and Admin Access

- `AUTH-01 [P1]` Admin authorization trusts the JWT role claim instead of live `admin_users` membership. Revoked admins keep access until token refresh, and newly granted admins may be denied until they sign in again.
  Refs: `fitai-workers/src/middleware/auth.ts`, `supabase/migrations/20260315000001_create_admin_tables.sql`

- `AUTH-02 [P1]` `useAdminSession()` can leave the admin app stuck loading and also snapshots a stale access token. It never handles rejected `getSession()` calls, does not clear `loading` on the non-admin or no-session branches, and never subscribes to auth state changes.
  Refs: `fitai-admin/src/lib/auth/guard.tsx`, `fitai-admin/src/app/(admin)/layout.tsx`, `fitai-admin/src/lib/workers/client.ts`

- `AUTH-03 [P2]` The admin login flow signs the user in before checking whether the account is an admin. If the follow-up sign-out fails, a valid non-admin session remains in the browser.
  Refs: `fitai-admin/src/app/login/page.tsx`

- `AUTH-04 [P2]` Admin header sign-out ignores failures and the login page has no "already authenticated" redirect, so users can land on the login form while still signed in.
  Refs: `fitai-admin/src/components/layout/Header.tsx`, `fitai-admin/src/app/login/page.tsx`

- `AUTH-05 [P2]` Mobile session restore trusts the cached `auth_session` until expiry without revalidating it first with Supabase, so revoked or invalidated sessions can appear logged in until the next protected request fails.
  Refs: `src/services/auth.ts`, `src/stores/authStore.ts`

### Subscription Lifecycle and Payments

- `SUB-01 [P0]` Webhook idempotency is broken because the code reads and writes columns that do not exist in `webhook_events`. Duplicate deliveries can be reprocessed indefinitely.
  Refs: `fitai-workers/src/handlers/subscription.ts`, `supabase/migrations/20260220000001_add_subscription_tables.sql`

- `SUB-02 [P1]` The webhook handler returns HTTP 200 even when internal database updates fail and it applies status transitions without any ordering guard. Transient failures or out-of-order events can permanently desynchronize entitlements.
  Refs: `fitai-workers/src/handlers/subscription.ts`

- `SUB-03 [P1]` `POST /api/subscription/create` is race-prone. Concurrent requests can create multiple billable subscriptions because the active/pending check is read-before-write only and there is no transactional or unique enforcement for non-`active` rows.
  Refs: `fitai-workers/src/handlers/subscription.ts`, `supabase/migrations/20260220000001_add_subscription_tables.sql`

- `SUB-04 [P1]` The create flow can orphan a live Razorpay subscription. The worker creates the Razorpay subscription first and only then inserts the local row, with no compensating rollback if the insert fails.
  Refs: `fitai-workers/src/handlers/subscription.ts`

- `SUB-05 [P1]` Payment verification is replayable and allows invalid state transitions. After a valid HMAC, the handler blindly sets the matching row to `authenticated` without checking current status or storing a unique payment id.
  Refs: `fitai-workers/src/handlers/subscription.ts`

- `SUB-06 [P1]` Status, cancel, pause, and resume all operate on the "latest created" row instead of an authoritative subscription. If duplicate `created`, `authenticated`, `pending`, or `paused` rows exist, lifecycle actions can target the wrong Razorpay subscription.
  Refs: `fitai-workers/src/handlers/subscription.ts`

- `SUB-07 [P1]` Paused subscriptions become unrecoverable after refresh. The pause endpoint writes `status='paused'`, but the status endpoint only loads `active`, `pending`, and `authenticated` rows, so the app downgrades the user to free and stops showing the Resume action.
  Refs: `fitai-workers/src/handlers/subscription.ts`, `src/screens/profile/SubscriptionManagement.tsx`

- `SUB-08 [P1]` Admin overrides are not authoritative. The override flow only completes existing `active` rows before inserting a new one, leaving older `created`, `authenticated`, `pending`, or `paused` rows behind for later handlers to pick up.
  Refs: `fitai-workers/src/handlers/admin.ts`, `fitai-workers/src/handlers/subscription.ts`

- `SUB-09 [P2]` Admin yearly overrides expire after 30 days because the override endpoint always sets `current_period_end` to `now + 30 days`, even when `billing_cycle='yearly'`.
  Refs: `fitai-workers/src/handlers/admin.ts`

- `SUB-10 [P1]` The client can show a successful purchase while still treating the user as non-premium. The store collapses `authenticated` to `null`, but the paywall shows the success message immediately after refresh.
  Refs: `src/stores/subscriptionStore.ts`, `src/hooks/usePaywall.ts`

- `SUB-11 [P1]` Guest users do not see admin-configured paid-plan pricing because `subscription_plans` is readable only for authenticated users and the paywall falls back to hardcoded plans.
  Refs: `src/hooks/usePaywall.ts`, `supabase/migrations/20260220000001_add_subscription_tables.sql`

- `SUB-12 [P1]` Premium state can remain stale after downgrades, pauses, or webhook changes because refresh failures do not clear entitlements and the subscription screen does not refresh on open.
  Refs: `src/stores/subscriptionStore.ts`, `src/screens/profile/SubscriptionManagement.tsx`, `src/hooks/useHomeLogic.ts`

- `SUB-13 [P1]` Subscription renewal and cancel dates are typed and formatted incorrectly on the frontend. The store expects `current_period_end` as a string, while the backend returns epoch seconds, which can surface as 1970-style dates.
  Refs: `src/stores/subscriptionStore.ts`, `src/screens/profile/SubscriptionManagement.tsx`

- `SUB-14 [P2]` Duplicate subscribe taps are still possible because `subscribe()` has no synchronous reentrancy guard before the button disables on re-render.
  Refs: `src/hooks/usePaywall.ts`

- `SUB-15 [P2]` Payment verification failures are swallowed in the client service. `verifyPayment()` returns `false` on any error, which leaves the UI stale even if the backend or webhook already activated the subscription.
  Refs: `src/services/RazorpayService.ts`, `src/hooks/usePaywall.ts`

### Limits and Usage Enforcement

- `LIM-01 [P1]` Daily and monthly quota resets use different clocks on client and server. The app resets counters with device-local time, while the worker computes periods in UTC.
  Refs: `src/stores/subscriptionStore.ts`, `fitai-workers/src/services/usageTracker.ts`

- `LIM-02 [P1]` The worker burns quota before request completion, but the app only increments local counters on success. Any downstream failure after the gate can consume server quota while the UI still shows remaining usage.
  Refs: `fitai-workers/src/middleware/subscriptionGate.ts`, `fitai-workers/src/index.ts`, `src/hooks/useFitnessLogic.ts`, `src/hooks/useMealPlanning.ts`, `src/hooks/useAIMealGeneration.ts`

- `LIM-03 [P1]` Quota increment failures are ignored in the worker gate. If the read check succeeds but the write RPC fails, the request still goes through and usage does not advance.
  Refs: `fitai-workers/src/middleware/subscriptionGate.ts`, `fitai-workers/src/services/usageTracker.ts`

- `LIM-04 [P1]` Plain barcode lookups decrement client-side `barcode_scan` quota without going through the worker's gated barcode routes, so the UI can block the user while the server still thinks quota remains.
  Refs: `src/hooks/ai-meal-generation/barcode-handlers.ts`, `src/services/barcodeService.ts`, `fitai-workers/src/index.ts`

- `LIM-05 [P2]` Subscription lookup errors in the gate silently downgrade paying users to free-tier limits instead of failing explicitly.
  Refs: `fitai-workers/src/middleware/subscriptionGate.ts`

- `LIM-06 [P2]` The status endpoint also masks subscription and config failures as a successful free-tier response, and if the DB free plan cannot be loaded it falls back to hardcoded limits.
  Refs: `fitai-workers/src/handlers/subscription.ts`

- `LIM-07 [P2]` Usage is tracked per device in the app rather than from server truth. There is no live usage endpoint, so multi-device use, admin resets, webhook-side changes, and post-gate failures drift the UI away from actual enforcement.
  Refs: `src/stores/subscriptionStore.ts`

### Admin Plans and App Config

- `CFG-01 [P1]` Guest users bypass maintenance mode and other public app-config gates because `app_config` RLS allows only authenticated reads and the mobile hook falls back to permissive defaults.
  Refs: `src/hooks/useAppConfig.ts`, `supabase/migrations/20260315000001_create_admin_tables.sql`, `App.tsx`

- `CFG-02 [P1]` Even for authenticated users, `App.tsx` does not wait for app-config loading before rendering the main app. Because the default config is permissive and `useAppConfig().loading` is ignored, maintenance gating can be bypassed briefly on startup.
  Refs: `src/hooks/useAppConfig.ts`, `App.tsx`

- `CFG-03 [P1]` Version gating is not implemented. `min_app_version` and `force_update_version` are loaded into `useAppConfig()`, but nothing in the app consumes them.
  Refs: `src/hooks/useAppConfig.ts`, `App.tsx`

- `CFG-04 [P1]` Feature flags are effectively dead config. `feature_ai_chat`, `feature_food_contributions`, and `feature_analytics` are loaded but not enforced anywhere meaningful in the mobile app.
  Refs: `src/hooks/useAppConfig.ts`, `App.tsx`, `src/screens/main/AnalyticsScreen.tsx`

- `CFG-05 [P1]` App-config and plan changes do not propagate to already-open app sessions. `useAppConfig()` and `usePaywall()` fetch once and never refresh or subscribe.
  Refs: `src/hooks/useAppConfig.ts`, `src/hooks/usePaywall.ts`

- `CFG-06 [P1]` The admin plans UI cannot fully manage plan behavior. `unlimited_ai`, `unlimited_scans`, `analytics`, `coaching`, and `active` are read-only in the panel.
  Refs: `fitai-admin/src/app/(admin)/plans/page.tsx`

- `CFG-07 [P1]` The plans editor cannot restore nullable numeric fields back to `NULL`. Blank input is sent as `""` instead of `null`, so admins cannot cleanly restore "unlimited" or "not offered" states from the UI.
  Refs: `fitai-admin/src/app/(admin)/plans/page.tsx`, `fitai-workers/src/handlers/admin.ts`

- `CFG-08 [P1]` `POST /api/admin/config` can report success while changing nothing because it does not verify that any row matched the supplied key.
  Refs: `fitai-workers/src/handlers/admin.ts`

## High-Value Missing Tests

- Webhook regression using the real `webhook_events` schema instead of mocked insert success.
- Concurrent `POST /api/subscription/create` plus "Razorpay create succeeds, DB insert fails".
- Replay of `/api/subscription/verify` against `paused` and `cancelled` rows.
- Pause -> refresh -> resume flow, including `GET /api/subscription/status` returning `paused`.
- Admin auth freshness: grant, revoke, stale JWT, and stale admin-panel token.
- Guest-mode `app_config` reads, maintenance-mode enforcement, and startup gating before config load.
- Version-gating behavior for `min_app_version` and `force_update_version`.
- Null-clearing plan edits and read-only admin-plan flags.
- Timezone-boundary usage resets and increment-failed-but-request-succeeds behavior.
- Multi-device usage drift and barcode-local-decrement mismatch.
- `subscriptionStore.normalizeStatus`, `current_period_end` parsing, and refresh-failure behavior.
- Guest fallback pricing versus admin-configured pricing.

## Suggested Fix Order

1. `SUB-01`, `SUB-02`, `SUB-03`, `SUB-05`
2. `SUB-06`, `SUB-07`, `SUB-08`, `LIM-03`
3. `CFG-01`, `CFG-02`, `CFG-03`, `CFG-08`
4. `AUTH-01`, `AUTH-02`, `AUTH-05`
5. Remaining UX and drift issues

## Notes

- No source files were edited in this audit other than this report file.
- The worker tests listed above still pass, but they do not cover most of the defects in this document.
