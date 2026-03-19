# Login, Subscription, Payment, and Admin Limits Audit

Date: 2026-03-18

Scope: mobile app, worker APIs, admin panel, Supabase schema/RLS, usage-limit enforcement

Method:
- Parallel code review sweeps using the maximum available 6 reviewer threads at a time
- Local source inspection across app, worker, admin, and migration files
- Targeted worker test run: `npm test -- subscription.test.ts subscriptionGate.test.ts`

Notes:
- This file is deduplicated from all audit passes so far.
- Priorities use `P0` to `P3`, where `P0` is most urgent.
- No code changes were made in this audit phase.

## Payment and Subscription Lifecycle

### AUD-001 `(P0)` Webhook idempotency is broken by a schema mismatch
Impact: duplicate webhook deliveries can be reprocessed indefinitely because the handler reads and writes columns that do not exist in `webhook_events`.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L391](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L391)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L410](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L410)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L495](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L495)
- [D:\FitAi\FitAI\supabase\migrations\20260220000001_add_subscription_tables.sql#L123](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L123)

### AUD-002 `(P1)` Webhooks acknowledge transient failures and allow out-of-order rollback
Impact: a delayed `paused` or `cancelled` event can overwrite a newer state, and transient DB failures can still return HTTP 200, preventing Razorpay retries and permanently desynchronizing entitlements.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L339](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L339)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L403](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L403)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L467](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L467)

### AUD-003 `(P1)` Subscription creation is race-prone and can create multiple live subscriptions
Impact: concurrent `POST /api/subscription/create` calls can create multiple billable Razorpay subscriptions for one user because the flow is read-before-write and DB uniqueness only covers `status='active'`.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L178](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L178)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L190](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L190)
- [D:\FitAi\FitAI\supabase\migrations\20260220000001_add_subscription_tables.sql#L57](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L57)

### AUD-004 `(P1)` Remote Razorpay subscriptions can be orphaned
Impact: the worker creates the Razorpay subscription before the local DB row. If the DB write fails, the user sees a failure but the remote subscription still exists.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L190](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L190)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L208](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L208)

### AUD-005 `(P1)` Payment verification is replayable and allows invalid state transitions
Impact: a valid HMAC proof can be replayed against an older or cancelled row because verification does not enforce allowed prior states, persist a unique payment id, or re-check Razorpay state.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L275](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L275)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L289](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L289)

### AUD-006 `(P1)` Status, cancel, pause, and resume act on the newest row instead of the authoritative subscription
Impact: if duplicate `created`, `authenticated`, `pending`, or `paused` rows exist, the app can show the wrong plan and lifecycle actions can hit the wrong Razorpay subscription.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L550](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L550)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L671](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L671)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L751](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L751)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L828](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L828)

### AUD-007 `(P1)` Paused subscriptions become unrecoverable after refresh
Impact: pause writes `status='paused'`, but the status endpoint only loads `active|pending|authenticated` rows and otherwise returns a free-tier response. After refresh, the app loses the paused state and hides the Resume action.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L780](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L780)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L550](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L550)
- [D:\FitAi\FitAI\src\screens\profile\SubscriptionManagement.tsx#L484](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L484)

### AUD-008 `(P1)` Admin overrides are not authoritative
Impact: the override flow only closes `active` rows before inserting a new one, leaving older `created`, `authenticated`, `pending`, or `paused` rows behind. Later lifecycle operations can target the wrong record.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L293](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L293)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L297](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L297)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L550](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L550)

### AUD-009 `(P2)` Status endpoint masks operational failures as a valid free-tier response
Impact: transient DB/query failures can look like a legitimate downgrade, and if the free plan cannot be loaded the handler falls back again to hardcoded limits instead of surfacing an error.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L559](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L559)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L564](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L564)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L598](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L598)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\subscription.ts#L520](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L520)

## Mobile Subscription and Payment UX

### AUD-010 `(P1)` The client can show a successful purchase while still treating the user as non-premium
Impact: `authenticated` is collapsed to `null` in the store, but the paywall shows a premium success message immediately after refresh, creating a “paid but not premium” experience until a later webhook flips state.

Evidence:
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L80](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L80)
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts#L223](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L223)

### AUD-011 `(P1)` Guest users do not see admin-configured pricing
Impact: the paywall reads `subscription_plans` directly, but guests cannot read that table under current RLS, so they fall back to hardcoded plan names and prices.

Evidence:
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts#L90](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L90)
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts#L101](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L101)
- [D:\FitAi\FitAI\supabase\migrations\20260220000001_add_subscription_tables.sql#L147](/D:/FitAi/FitAI/supabase/migrations/20260220000001_add_subscription_tables.sql#L147)

### AUD-012 `(P1)` Premium state can stay stale after downgrades or webhook changes
Impact: refresh failures do not clear entitlements, and the subscription management screen does not refresh on open, so users can keep seeing stale premium UI until a later action forces sync.

Evidence:
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L219](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L219)
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L342](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L342)
- [D:\FitAi\FitAI\src\screens\profile\SubscriptionManagement.tsx#L90](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L90)
- [D:\FitAi\FitAI\src\hooks\useHomeLogic.ts#L142](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L142)

### AUD-013 `(P1)` Renewal and cancel dates are typed/formatted incorrectly on the frontend
Impact: `current_period_end` is treated as `string | null` in the store while the backend returns epoch seconds, which can render incorrect 1970-style dates in subscription UI.

Evidence:
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L70](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L70)
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L309](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L309)
- [D:\FitAi\FitAI\src\screens\profile\SubscriptionManagement.tsx#L56](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx#L56)

### AUD-014 `(P2)` Payment verification failures are swallowed by the client service
Impact: `verifyPayment()` returns `false` instead of surfacing the real error, which leaves the UI unable to distinguish a true verification failure from a backend/network issue and can strand users in a bad state even if the backend later activates the subscription.

Evidence:
- [D:\FitAi\FitAI\src\services\RazorpayService.ts#L213](/D:/FitAi/FitAI/src/services/RazorpayService.ts#L213)
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts#L190](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L190)

## Limits and Usage Enforcement

### AUD-015 `(P1)` Quota resets use different clocks on client and server
Impact: the app resets usage with device-local time while the worker computes periods in UTC, so users around midnight can be blocked earlier or later than backend enforcement.

Evidence:
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L149](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L149)
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L154](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L154)
- [D:\FitAi\FitAI\fitai-workers\src\services\usageTracker.ts#L47](/D:/FitAi/FitAI/fitai-workers/src/services/usageTracker.ts#L47)

### AUD-016 `(P1)` The worker consumes quota before request completion
Impact: if generation, scan, or another protected flow fails after the subscription gate, the server-side count still advances while the client count does not, leading to hidden quota loss and delayed 403s.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\middleware\subscriptionGate.ts#L194](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L194)
- [D:\FitAi\FitAI\fitai-workers\src\index.ts#L296](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L296)
- [D:\FitAi\FitAI\src\hooks\useFitnessLogic.ts#L319](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L319)
- [D:\FitAi\FitAI\src\hooks\useMealPlanning.ts#L149](/D:/FitAi/FitAI/src/hooks/useMealPlanning.ts#L149)
- [D:\FitAi\FitAI\src\hooks\useAIMealGeneration.ts#L985](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L985)

### AUD-017 `(P1)` Quota increment failures are ignored, creating an overuse path
Impact: if the gate can read current limits but cannot increment usage, the request still goes through and quota never advances.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\middleware\subscriptionGate.ts#L194](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L194)
- [D:\FitAi\FitAI\fitai-workers\src\services\usageTracker.ts#L65](/D:/FitAi/FitAI/fitai-workers/src/services/usageTracker.ts#L65)

### AUD-018 `(P1)` Barcode lookup can burn client quota without burning server quota
Impact: plain barcode lookup decrements the app’s local `barcode_scan` counter even when the flow never goes through the worker’s gated barcode endpoints.

Evidence:
- [D:\FitAi\FitAI\src\hooks\ai-meal-generation\barcode-handlers.ts#L76](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/barcode-handlers.ts#L76)
- [D:\FitAi\FitAI\src\hooks\ai-meal-generation\barcode-handlers.ts#L132](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/barcode-handlers.ts#L132)
- [D:\FitAi\FitAI\src\services\barcodeService.ts#L152](/D:/FitAi/FitAI/src/services/barcodeService.ts#L152)
- [D:\FitAi\FitAI\fitai-workers\src\index.ts#L390](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L390)

### AUD-019 `(P2)` Subscription lookup errors silently downgrade paid users to free-tier limits
Impact: transient DB issues in the gate under-entitle paying users instead of failing explicitly, causing premium features to be blocked as if the user were free.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\middleware\subscriptionGate.ts#L89](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L89)
- [D:\FitAi\FitAI\fitai-workers\src\middleware\subscriptionGate.ts#L104](/D:/FitAi/FitAI/fitai-workers/src/middleware/subscriptionGate.ts#L104)

### AUD-020 `(P2)` Usage is tracked per device with no authoritative live reconciliation
Impact: the app derives usage locally from limits, persists counters, and does not fetch live backend usage. Multi-device usage, admin resets, webhook-side changes, and post-gate failures can all drift the UI away from actual enforcement.

Evidence:
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L100](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L100)
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts#L247](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L247)

## Admin Config, Pricing, and Plan Management

### AUD-021 `(P1)` Public app config is not enforced for logged-out users
Impact: `app_config` is read directly from Supabase but is only readable to authenticated users. Guests fall back to permissive defaults, so maintenance mode, version gating, and feature toggles can be bypassed before login.

Evidence:
- [D:\FitAi\FitAI\src\hooks\useAppConfig.ts#L54](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L54)
- [D:\FitAi\FitAI\src\hooks\useAppConfig.ts#L74](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L74)
- [D:\FitAi\FitAI\supabase\migrations\20260315000001_create_admin_tables.sql#L94](/D:/FitAi/FitAI/supabase/migrations/20260315000001_create_admin_tables.sql#L94)
- [D:\FitAi\FitAI\App.tsx#L1104](/D:/FitAi/FitAI/App.tsx#L1104)

### AUD-022 `(P1)` Admin config and pricing changes do not propagate to live sessions
Impact: `useAppConfig()` and `usePaywall()` fetch once and never refresh or subscribe, so maintenance toggles, feature changes, plan activation, and price edits stay stale until remount or restart.

Evidence:
- [D:\FitAi\FitAI\src\hooks\useAppConfig.ts#L49](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L49)
- [D:\FitAi\FitAI\src\hooks\useAppConfig.ts#L83](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L83)
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts#L87](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L87)
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts#L143](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L143)

### AUD-023 `(P1)` Several admin-controlled flags are stored but not actually enforced
Impact: plan booleans such as `analytics` and `coaching`, and public config flags such as `feature_ai_chat`, `feature_food_contributions`, and `feature_analytics`, are loaded but not consistently enforced in routes/screens. The app therefore does not reliably respect admin configuration.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\index.ts#L219](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L219)
- [D:\FitAi\FitAI\fitai-workers\src\index.ts#L435](/D:/FitAi/FitAI/fitai-workers/src/index.ts#L435)
- [D:\FitAi\FitAI\src\screens\main\AnalyticsScreen.tsx#L53](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L53)
- [D:\FitAi\FitAI\src\hooks\useAppConfig.ts#L65](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L65)
- [D:\FitAi\FitAI\App.tsx#L1104](/D:/FitAi/FitAI/App.tsx#L1104)

### AUD-024 `(P1)` The plans editor cannot fully manage plan limits
Impact: the admin UI cannot edit several operational fields and cannot clear nullable numeric values back to `null`, so admins cannot reliably restore unlimited or not-offered states from the panel.

Evidence:
- [D:\FitAi\FitAI\fitai-admin\src\app\(admin)\plans\page.tsx#L34](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L34)
- [D:\FitAi\FitAI\fitai-admin\src\app\(admin)\plans\page.tsx#L53](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L53)
- [D:\FitAi\FitAI\fitai-admin\src\app\(admin)\plans\page.tsx#L85](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/plans/page.tsx#L85)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L155](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L155)

### AUD-025 `(P1)` Admin config updates can report success while updating nothing
Impact: `POST /api/admin/config` updates by `key` but never checks whether any row matched, so stale keys or manual typos become silent no-ops.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L107](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L107)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L117](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L117)
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L129](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L129)

### AUD-026 `(P2)` Yearly admin overrides expire after 30 days
Impact: the manual override flow accepts `billing_cycle` but always sets `current_period_end` to `now + 30 days`, so yearly grants expire much earlier than intended.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\handlers\admin.ts#L296](/D:/FitAi/FitAI/fitai-workers/src/handlers/admin.ts#L296)

## Login, Session, and Admin Auth

### AUD-027 `(P1)` Admin auth relies on stale JWT role claims rather than live admin membership
Impact: revoked admins can retain access until token refresh, while newly granted admins may still be denied until they sign out and back in.

Evidence:
- [D:\FitAi\FitAI\fitai-workers\src\middleware\auth.ts#L68](/D:/FitAi/FitAI/fitai-workers/src/middleware/auth.ts#L68)
- [D:\FitAi\FitAI\fitai-workers\src\middleware\auth.ts#L179](/D:/FitAi/FitAI/fitai-workers/src/middleware/auth.ts#L179)
- [D:\FitAi\FitAI\supabase\migrations\20260315000001_create_admin_tables.sql#L35](/D:/FitAi/FitAI/supabase/migrations/20260315000001_create_admin_tables.sql#L35)

### AUD-028 `(P1)` The admin panel can hang or operate on stale bearer tokens
Impact: `useAdminSession()` does not robustly clear loading on all auth failure paths and snapshots the access token without listening for refresh events. Long-lived sessions can fail with 401s or stay stuck behind an indefinite loader until reload.

Evidence:
- [D:\FitAi\FitAI\fitai-admin\src\lib\auth\guard.tsx#L14](/D:/FitAi/FitAI/fitai-admin/src/lib/auth/guard.tsx#L14)
- [D:\FitAi\FitAI\fitai-admin\src\lib\workers\client.ts#L1](/D:/FitAi/FitAI/fitai-admin/src/lib/workers/client.ts#L1)
- [D:\FitAi\FitAI\fitai-admin\src\app\(admin)\layout.tsx#L10](/D:/FitAi/FitAI/fitai-admin/src/app/(admin)/layout.tsx#L10)

### AUD-029 `(P2)` Non-admin users can be left signed in during admin login rejection paths
Impact: the admin login flow signs in first and checks the role afterward. If the follow-up `signOut()` fails, the browser keeps a valid non-admin session while the UI reports access denied.

Evidence:
- [D:\FitAi\FitAI\fitai-admin\src\app\login\page.tsx#L18](/D:/FitAi/FitAI/fitai-admin/src/app/login/page.tsx#L18)
- [D:\FitAi\FitAI\fitai-admin\src\components\layout\Header.tsx#L25](/D:/FitAi/FitAI/fitai-admin/src/components/layout/Header.tsx#L25)

### AUD-030 `(P2)` Mobile session restore trusts cached local auth until expiry
Impact: the app restores `auth_session` from local storage without first revalidating it with Supabase, so revoked or otherwise invalid sessions can still appear logged in until the next protected request fails.

Evidence:
- [D:\FitAi\FitAI\src\services\auth.ts#L371](/D:/FitAi/FitAI/src/services/auth.ts#L371)
- [D:\FitAi\FitAI\src\services\auth.ts#L382](/D:/FitAi/FitAI/src/services/auth.ts#L382)
- [D:\FitAi\FitAI\src\stores\authStore.ts#L291](/D:/FitAi/FitAI/src/stores/authStore.ts#L291)

## High-Value Missing Tests

### TEST-001 Webhook contract and idempotency
Current worker tests mock webhook inserts too loosely and do not exercise the real `webhook_events` column contract.

Suggested targets:
- [D:\FitAi\FitAI\fitai-workers\test\subscription.test.ts#L371](/D:/FitAi/FitAI/fitai-workers/test/subscription.test.ts#L371)
- [D:\FitAi\FitAI\fitai-workers\test\integration\subscription-flow.test.ts#L558](/D:/FitAi/FitAI/fitai-workers/test/integration/subscription-flow.test.ts#L558)

### TEST-002 Concurrent create plus remote-create/local-insert failure
Coverage does not currently protect against duplicate subscription creation or orphaned Razorpay subscriptions.

Suggested target:
- [D:\FitAi\FitAI\fitai-workers\test\subscription.test.ts#L139](/D:/FitAi/FitAI/fitai-workers/test/subscription.test.ts#L139)

### TEST-003 Verify replay and invalid state transitions
Coverage does not currently assert payment-id uniqueness, allowed state transitions, or replay behavior against `paused` and `cancelled` rows.

Suggested target:
- [D:\FitAi\FitAI\fitai-workers\test\subscription.test.ts#L300](/D:/FitAi/FitAI/fitai-workers/test/subscription.test.ts#L300)

### TEST-004 Admin auth freshness and role revocation
There is no meaningful coverage around `requireRole`, admin grants, revokes, or stale role claims.

Suggested target:
- [D:\FitAi\FitAI\fitai-workers\test](/D:/FitAi/FitAI/fitai-workers/test)

### TEST-005 Client subscription state normalization and stale refresh handling
There is effectively no app-level regression coverage for `authenticated -> null`, stale entitlements after refresh failure, or `current_period_end` parsing.

Suggested targets:
- [D:\FitAi\FitAI\src\stores\subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts)
- [D:\FitAi\FitAI\src\screens\profile\SubscriptionManagement.tsx](/D:/FitAi/FitAI/src/screens/profile/SubscriptionManagement.tsx)

### TEST-006 Paywall, pricing, and guest behavior
There is no meaningful coverage for duplicate subscribe taps, guest fallback pricing, verify-failure paths, or lack of refresh on screen open.

Suggested targets:
- [D:\FitAi\FitAI\src\hooks\usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts)
- [D:\FitAi\FitAI\src\services\RazorpayService.ts](/D:/FitAi/FitAI/src/services/RazorpayService.ts)
- [D:\FitAi\FitAI\src\components\subscription\PaywallModal.tsx](/D:/FitAi/FitAI/src/components/subscription/PaywallModal.tsx)

### TEST-007 Session restore and cross-user state cleanup
Coverage is missing for revoked cached sessions, user-A logout then user-B login on one device, and guest-to-user migration with stale premium state.

Suggested targets:
- [D:\FitAi\FitAI\src\services\auth.ts](/D:/FitAi/FitAI/src/services/auth.ts)
- [D:\FitAi\FitAI\src\stores\authStore.ts](/D:/FitAi/FitAI/src/stores/authStore.ts)
- [D:\FitAi\FitAI\src\utils\clearUserData.ts](/D:/FitAi/FitAI/src/utils/clearUserData.ts)
