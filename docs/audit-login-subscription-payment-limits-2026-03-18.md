# FitAI Audit: Login, Subscription, Payment, Admin Limits

Date: 2026-03-18

Scope:
- Login and session handling
- Subscription lifecycle and payment flow
- Admin-configured plans and app config
- Limit enforcement and usage accounting

Audit method:
- Multi-pass code review across mobile app, workers, admin panel, Supabase schema, and tests
- Parallel agent sweeps at the environment max of 6 concurrent reviewers
- Targeted worker tests: `npm test -- subscription.test.ts subscriptionGate.test.ts`

## Severity Summary

- `P0`: 2
- `P1`: 24
- `P2`: 11

## Findings By Area

### 1. Security / Data Integrity

#### `AUD-001` `P0` Users can self-grant premium access and tamper with usage directly through Supabase
The `subscriptions` and `feature_usage` tables allow authenticated users to insert or update their own rows, while the mobile app ships a public Supabase client. A malicious user can create or mutate their own `active/pro` subscription and reset or lower usage counts without going through payment or worker enforcement. The same migration also creates `SECURITY DEFINER` helper functions that accept arbitrary `user_id` values for subscription and usage reads/writes, and the migration does not explicitly revoke or re-grant execute permissions for them, which widens the exposure if default function execute permissions are still in effect.

Refs:
- [supabase.ts](/D:/FitAi/FitAI/src/services/supabase.ts#L1)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L157)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L161)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L165)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L172)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L176)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L180)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L188)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L209)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L236)

#### `AUD-002` `P0` Webhook idempotency is broken because the handler uses columns that do not exist
The webhook code reads and writes `event_id`, `processed`, `status`, `error_message`, and `razorpay_subscription_id` on `webhook_events`, but the migration only creates `id`, `event_type`, `payload`, and `processed_at`. Duplicate deliveries therefore keep reprocessing and error logging is silently ineffective.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L391)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L410)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L495)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L123)

### 2. Payment And Subscription Lifecycle

#### `AUD-003` `P1` Webhooks acknowledge internal failures with HTTP 200 and apply unordered state transitions
Delayed or out-of-order webhook events can overwrite newer subscription states, and transient DB failures are acknowledged anyway, so entitlement state can permanently desync because Razorpay will stop retrying.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L339)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L403)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L467)

#### `AUD-004` `P1` Concurrent subscription creation can create multiple billable subscriptions for one user
`POST /api/subscription/create` does a non-transactional read-before-write check, and the database uniqueness only protects `status='active'`, not `created`, `authenticated`, or `pending`.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L178)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L190)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L57)

#### `AUD-005` `P1` Remote Razorpay subscriptions can be orphaned if local DB insert fails
The worker creates the Razorpay subscription before inserting the local `subscriptions` row, and there is no compensating cancel or reconciliation path if the insert fails.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L190)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L208)

#### `AUD-006` `P1` Payment verification is replayable and allows invalid status transitions
After a valid HMAC, the verify endpoint blindly updates the row to `authenticated` without checking allowed current states, persisting a unique payment id, or reconciling current Razorpay state.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L275)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L289)

#### `AUD-007` `P1` Paused subscriptions become unrecoverable after refresh
Pause writes `status='paused'`, but the status endpoint only loads `active|pending|authenticated` rows and otherwise returns a free-tier response. The app only exposes Resume when it receives `paused`, so a paused subscriber can refresh into a free-tier UI with no resume path.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L550)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L559)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L780)
- [SubscriptionManagement.tsx](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L484)

#### `AUD-008` `P1` Status, cancel, pause, and resume operate on the latest created row instead of the authoritative subscription
These handlers filter a loose status set and then pick `order(created_at desc).limit(1)`. If duplicate rows exist, the app can show the wrong plan and lifecycle actions can target the wrong Razorpay subscription.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L550)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L671)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L751)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L828)

#### `AUD-009` `P1` Admin subscription overrides are not authoritative
The admin override endpoint only closes existing `active` rows before inserting a new one. Older `created`, `authenticated`, `pending`, or `paused` rows remain, and later customer lifecycle handlers can select them instead of the override.

Refs:
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L293)
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L297)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L550)

#### `AUD-010` `P2` The status endpoint masks operational errors as a successful free-tier downgrade
Subscription query errors are treated as “no subscription”, and if the free plan lookup also fails the endpoint falls back to hardcoded static defaults. Users get a successful-looking downgrade instead of an operational error.

Refs:
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L559)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L564)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L598)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L520)

### 3. Client Subscription State And UX

#### `AUD-011` `P1` The app can show “purchase successful” while still treating the user as non-premium
The client collapses backend status `authenticated` to `null`, but the paywall shows a premium success message immediately after refresh.

Refs:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L75)
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L223)

#### `AUD-012` `P1` Subscription dates can render incorrectly because the frontend stores the wrong type
The store treats `current_period_end` as `string | null`, but the backend returns epoch seconds. This can produce incorrect renewal and cancellation dates.

Refs:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L64)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L309)
- [SubscriptionManagement.tsx](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L56)
- [SubscriptionManagement.tsx](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L357)

#### `AUD-013` `P1` Premium state can remain stale after downgrades, webhook changes, or refresh failures
If subscription refresh fails, old entitlements remain in the store. The subscription management screen also does not fetch fresh status on open.

Refs:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L219)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L342)
- [SubscriptionManagement.tsx](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L90)
- [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L142)

#### `AUD-014` `P1` Guest users do not see admin-configured plan pricing
The paywall reads `subscription_plans` directly from Supabase, but that table is readable only to authenticated users, so guests fall back to hardcoded plans and prices.

Refs:
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L90)
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L101)
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L147)

#### `AUD-015` `P1` Plan and pricing changes do not propagate to live app sessions
`usePaywall()` fetches plans once and never refreshes or subscribes, so admin price and activation changes remain stale until remount.

Refs:
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L87)
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L143)

#### `AUD-016` `P2` Duplicate subscribe taps can trigger overlapping purchase flows
`usePaywall.subscribe()` sets loading state, but there is no immediate reentrancy guard before the next render.

Refs:
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L161)

#### `AUD-017` `P2` Verification failures are swallowed on the client
`RazorpayService.verifyPayment()` returns `false` instead of surfacing the backend failure, which leaves the UI unable to distinguish a transient verify error from other outcomes.

Refs:
- [RazorpayService.ts](/D:/FitAi/FitAI/src/services/RazorpayService.ts#L245)
- [RazorpayService.ts](/D:/FitAi/FitAI/src/services/RazorpayService.ts#L259)

### 4. Admin Auth, Config, And Plans

#### `AUD-018` `P1` Admin auth relies on the JWT role claim instead of live `admin_users` membership
Revoked admins retain access until token refresh, and newly granted admins may not gain access until they sign out and back in.

Refs:
- [auth.ts](/D:/FitAi/FitAI/fitai-workers/src/middleware/auth.ts#L68)
- [auth.ts](/D:/FitAi/FitAI/fitai-workers/src/middleware/auth.ts#L179)
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L527)
- [20260315000001_create_admin_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260315000001_create_admin_tables.sql#L35)

#### `AUD-019` `P1` The admin app can hang or operate with stale auth state
`useAdminSession()` can leave the admin UI loading forever on some branches, and it snapshots the access token once without subscribing to auth refreshes. Non-admin users are fully signed in before the role check, and sign-out failures can leave confusing auth state behind.

Refs:
- [guard.tsx](/D:/FitAi/FitAI/fitai-admin/src/lib/auth/guard.tsx#L14)
- [layout.tsx](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/layout.tsx#L10)
- [client.ts](/D:/FitAi/FitAI/fitai-admin/src/lib/workers/client.ts#L1)
- [page.tsx](/D:/FitAi/FitAI/fitai-admin/src/app/login/page.tsx#L18)
- [Header.tsx](/D:/FitAi/FitAI/fitai-admin/src/components/layout/Header.tsx#L25)

#### `AUD-020` `P1` Maintenance mode and public app-config gates are bypassed for logged-out users
The mobile app reads `app_config` directly from Supabase, but RLS only allows authenticated reads. Guest sessions fall back to permissive defaults, so maintenance and feature gates are effectively off.

Refs:
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L54)
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L74)
- [20260315000001_create_admin_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260315000001_create_admin_tables.sql#L94)
- [App.tsx](/D:/FitAi/FitAI/App.tsx#L1105)

#### `AUD-021` `P1` App-config changes do not propagate to already-open sessions
`useAppConfig()` fetches once on mount and never refreshes or subscribes to changes.

Refs:
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L49)
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L83)

#### `AUD-022` `P1` Version-gating config is loaded but not enforced in the app shell
The config hook exposes `minAppVersion` and `forceUpdateVersion`, but the app shell only blocks on maintenance mode. There is no actual minimum-version or force-update gate.

Refs:
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L20)
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L60)
- [App.tsx](/D:/FitAi/FitAI/App.tsx#L1105)

#### `AUD-023` `P1` Several admin-controlled feature flags are effectively dead config
Plan-level `analytics` and `coaching` are not enforced consistently, and global `feature_ai_chat`, `feature_food_contributions`, and `feature_analytics` are loaded but not actually used beyond maintenance mode.

Refs:
- [index.ts](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L219)
- [index.ts](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L435)
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L65)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L53)

#### `AUD-024` `P1` `POST /api/admin/config` can report success while updating nothing
The handler updates by key but never checks whether any row matched.

Refs:
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L107)
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L117)
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L129)

#### `AUD-025` `P1` The plans editor cannot clear nullable numeric fields back to `NULL`
Blank values are sent as empty strings instead of `null`, so admins cannot restore “not offered” or unlimited-style nullable states through the UI.

Refs:
- [plans/page.tsx](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L35)
- [plans/page.tsx](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L37)
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L167)

#### `AUD-026` `P2` The admin plans UI cannot edit several operational fields at all
`unlimited_ai`, `unlimited_scans`, `analytics`, `coaching`, and `active` are display-only even though they materially affect entitlements.

Refs:
- [plans/page.tsx](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L53)
- [plans/page.tsx](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L85)

#### `AUD-027` `P2` Admin yearly subscription overrides still expire after 30 days
The override endpoint accepts `billing_cycle`, but always writes `current_period_end = now + 30 days`.

Refs:
- [admin.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L296)

### 5. Limits And Usage Enforcement

#### `AUD-028` `P1` Client and server reset daily/monthly usage on different clocks
The app uses device-local time, while the worker computes periods in UTC. Users near midnight can be blocked early or late.

Refs:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L149)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L154)
- [usageTracker.ts](/D:/FitAi/FitAI/fitai-workers/src/services/usageTracker.ts#L47)

#### `AUD-029` `P1` The backend burns quota before request completion while the app increments only on success
If a protected request fails after the gate, the server count advances but the UI remains optimistic until a later refresh.

Refs:
- [subscriptionGate.ts](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L194)
- [index.ts](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L296)
- [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L316)
- [useMealPlanning.ts](/D:/FitAi/FitAI/src/hooks/useMealPlanning.ts#L140)
- [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L969)

#### `AUD-030` `P1` Barcode lookup can consume local quota without consuming server quota
Some barcode flows decrement local `barcode_scan` usage even when they do not go through the worker’s gated barcode endpoints.

Refs:
- [barcode-handlers.ts](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/barcode-handlers.ts#L76)
- [barcode-handlers.ts](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/barcode-handlers.ts#L132)
- [barcodeService.ts](/D:/FitAi/FitAI/src/services/barcodeService.ts#L152)
- [index.ts](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L390)

#### `AUD-031` `P1` Quota increment failures are ignored in the worker gate
If the read check succeeds but the increment write fails, the request is still allowed and usage never advances.

Refs:
- [subscriptionGate.ts](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L194)
- [usageTracker.ts](/D:/FitAi/FitAI/fitai-workers/src/services/usageTracker.ts#L65)

#### `AUD-032` `P2` Subscription lookup errors in the gate silently downgrade paying users to free-tier treatment
A transient DB failure can block premium features as if the user were free instead of surfacing an operational error.

Refs:
- [subscriptionGate.ts](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L89)
- [subscriptionGate.ts](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L104)

#### `AUD-033` `P2` Usage is tracked per device in the app instead of from server truth
The mobile store persists local counters and has no live usage endpoint, so multi-device usage, admin resets, webhook-side changes, and failed protected calls drift from real enforcement.

Refs:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L100)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L247)

#### `AUD-034` `P1` Free-tier limits are hardcoded inconsistently across DB, worker, and client
The seeded free plan sets one monthly AI generation, but the worker and client fallbacks hardcode ten. Several fallback paths therefore do not respect configured free-tier limits.

Refs:
- [20260220000001_add_subscription_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L31)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L517)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L119)

#### `AUD-035` `P1` Startup-time client gating can run against stale default quotas before subscription initialization
Components call `canUseFeature()` synchronously while the subscription store still holds hardcoded defaults, so cold starts can briefly allow or deny actions under the wrong local model.

Refs:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L119)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L290)
- [PremiumGate.tsx](/D:/FitAi/FitAI/src/components/subscription/PremiumGate.tsx#L38)
- [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L297)

### 6. Login, Session, Logout, And Shared-Device Scenarios

#### `AUD-036` `P2` Mobile session restore trusts the cached local session until expiry without first revalidating it
A revoked or invalidated session can still appear logged in until the next protected request fails.

Refs:
- [auth.ts](/D:/FitAi/FitAI/src/services/auth.ts#L371)
- [auth.ts](/D:/FitAi/FitAI/src/services/auth.ts#L382)
- [authStore.ts](/D:/FitAi/FitAI/src/stores/authStore.ts#L291)

#### `AUD-037` `P1` Logout does not clear onboarding and guest caches, so prior user data can rehydrate after sign-out
`clearAllUserData()` removes many persisted stores but does not remove `onboarding_data` or `onboarding_completed`. After logout, the app’s guest path reads those keys and rebuilds a profile from them, which can expose the previous user’s onboarding data on a shared device.

Refs:
- [clearUserData.ts](/D:/FitAi/FitAI/src/utils/clearUserData.ts#L117)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L113)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L935)
- [App.tsx](/D:/FitAi/FitAI/App.tsx#L846)
- [App.tsx](/D:/FitAi/FitAI/App.tsx#L857)
- [App.tsx](/D:/FitAi/FitAI/App.tsx#L867)
- [App.tsx](/D:/FitAi/FitAI/App.tsx#L875)

#### `AUD-038` `P2` Logout also leaves offline and sync queues behind
The logout cleanup list does not include `offline_sync_queue`, `offline_data`, `@fitai_sync_queue`, or `@fitai_last_sync`, so prior-account queued writes and offline data can survive across sessions.

Refs:
- [clearUserData.ts](/D:/FitAi/FitAI/src/utils/clearUserData.ts#L117)
- [offline/storage.ts](/D:/FitAi/FitAI/src/services/offline/storage.ts#L4)
- [offline/storage.ts](/D:/FitAi/FitAI/src/services/offline/storage.ts#L93)
- [SyncEngine.ts](/D:/FitAi/FitAI/src/services/SyncEngine.ts#L66)

## Highest-Value Fix Order

1. Lock down Supabase RLS for `subscriptions` and `feature_usage`.
2. Fix webhook schema/idempotency and stop acknowledging unrecoverable processing failures as success.
3. Make subscription row selection authoritative and remove duplicate-row ambiguity across create/status/pause/resume/cancel/admin override.
4. Fix logout cleanup for onboarding/shared-device leakage.
5. Align limit enforcement around a single server-truth model for usage, resets, and free-tier defaults.
6. Repair admin auth freshness and config/plan enforcement gaps.

## Missing Regression Coverage

- Webhook schema and idempotency against the real `webhook_events` table contract
- Concurrent `POST /api/subscription/create`
- Verify replay against paused/cancelled subscriptions
- Admin auth grant/revoke freshness
- Guest `app_config` reads and maintenance-mode enforcement
- Null-clearing plan edits and silent `admin/config` no-op updates
- Timezone-boundary usage reset behavior
- Increment-failed-but-request-succeeds quota handling
- Subscription store handling for `authenticated`, stale refresh, and epoch dates
- Guest-to-user and logout/shared-device cache clearing

## Verification Notes

- Used the environment max of 6 concurrent parallel agents for the final audit pass.
- Ran `npm test -- subscription.test.ts subscriptionGate.test.ts` in `fitai-workers`.
- Result: existing targeted worker tests passed, but they do not cover the defects above.
