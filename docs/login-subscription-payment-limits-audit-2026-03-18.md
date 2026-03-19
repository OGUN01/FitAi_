# Login, Subscription, Payment, And Limits Audit

Date: 2026-03-18

Scope:
- Mobile login/session handling
- Subscription creation, verification, webhooks, status, cancel, pause, resume
- Razorpay payment flow
- Admin plan/config management
- Limit enforcement and usage accounting
- DB schema, RLS, RPC permissions, and test coverage

This file is the deduplicated source of truth for the issues found so far.

## Severity Summary

- `P0`: 3
- `P1`: 19
- `P2`: 9

## P0 Critical Integrity Issues

### P0-01 Users can self-upgrade to premium by writing their own `subscriptions` rows
Impact:
- Any authenticated app user can insert or update their own `subscriptions` row through the public Supabase client and mark themselves `active` on `basic` or `pro` without completing payment.
- Both the worker gate and the status endpoint trust this table for entitlement decisions.

Evidence:
- [subscription migration](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 157-167 define `subscriptions_select_own`, `subscriptions_insert_own`, and `subscriptions_update_own`.
- [mobile Supabase client](../src/services/supabase.ts) lines 18-25 and 33-40 create a public anon-key client for the app.
- [subscription gate](../fitai-workers/src/middleware/subscriptionGate.ts) lines 90-102 reads the latest access-granting subscription row and uses it for gating.
- [subscription status endpoint](../fitai-workers/src/handlers/subscription.ts) lines 550-557 reads the latest matching subscription row and returns its tier/features.

### P0-02 Users can reset or forge their own quota by writing `feature_usage`
Impact:
- Any authenticated app user can insert or update their own `feature_usage` rows and reduce `usage_count` or preseed records, bypassing admin-configured limits.
- Worker-side limit checks trust this table and the associated RPCs.

Evidence:
- [subscription migration](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 172-182 define `feature_usage_select_own`, `feature_usage_insert_own`, and `feature_usage_update_own`.
- [usage tracker](../fitai-workers/src/services/usageTracker.ts) lines 141-158 reads `get_feature_usage()` to enforce limits.
- [subscription gate](../fitai-workers/src/middleware/subscriptionGate.ts) lines 161-197 checks and increments usage based on DB state.

### P0-03 SECURITY DEFINER subscription RPCs accept arbitrary user IDs and are not explicitly execution-restricted
Impact:
- `get_active_subscription`, `get_feature_usage`, and `increment_feature_usage` all accept `p_user_id` and run as `SECURITY DEFINER`.
- This migration does not revoke default execute privileges or add an internal `auth.uid() = p_user_id` check.
- That creates a high-risk path for cross-user usage reads/mutations and quota tampering if these RPCs remain callable through Supabase RPC.

Evidence:
- [subscription migration](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 188-253 define the SECURITY DEFINER functions.
- The same migration does not contain any `REVOKE EXECUTE` or restrictive `GRANT EXECUTE` statements for these functions.
- [older helper-function migration](../supabase/migrations/20250115000005_add_helper_functions.sql) lines 170-174 shows that explicit execute grants are used elsewhere in this codebase, which makes the absence here notable.

## P1 Subscription And Payment Lifecycle Issues

### P1-01 Webhook idempotency is broken by a schema mismatch
Impact:
- The handler reads and writes `webhook_events` columns that do not exist in the actual table, so duplicate-delivery protection is unreliable.

Evidence:
- [webhook handler](../fitai-workers/src/handlers/subscription.ts) lines 391-410 and 495.
- [webhook_events schema](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 123-128.

### P1-02 Webhook processing acknowledges transient DB failures and has no ordering guard
Impact:
- Delayed or out-of-order events can overwrite newer subscription state.
- A transient persistence failure can return HTTP 200 and permanently desync entitlements because Razorpay will stop retrying.

Evidence:
- [webhook handler](../fitai-workers/src/handlers/subscription.ts) lines 339, 403, and 467.

### P1-03 Concurrent `POST /api/subscription/create` calls can create multiple billable subscriptions
Impact:
- The code does a read-before-write check with no transactional lock.
- The DB only enforces uniqueness for `status = 'active'`, not `created`, `authenticated`, or `pending`.

Evidence:
- [create handler](../fitai-workers/src/handlers/subscription.ts) lines 178-187 and 208-227.
- [subscription uniqueness](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 82-84.

### P1-04 Razorpay subscriptions can be orphaned if local insert fails after remote creation
Impact:
- The worker creates the remote subscription first, then inserts the local row.
- If the DB write fails, the customer can be billed for a remote subscription the app no longer tracks.

Evidence:
- [create handler](../fitai-workers/src/handlers/subscription.ts) lines 190-227.

### P1-05 Payment verification is replayable and allows invalid status transitions
Impact:
- After HMAC verification, the handler blindly writes `authenticated`.
- A valid old tuple can move a paused/cancelled row back into an access-granting state.

Evidence:
- [verify handler](../fitai-workers/src/handlers/subscription.ts) lines 275-289.

### P1-06 Paused subscriptions become unrecoverable after refresh
Impact:
- Pause writes `status = 'paused'`, but the status endpoint only loads `active`, `pending`, and `authenticated`.
- After refresh, the app falls back to free-tier state and no longer exposes Resume.

Evidence:
- [pause handler](../fitai-workers/src/handlers/subscription.ts) line 780.
- [status handler query](../fitai-workers/src/handlers/subscription.ts) lines 550-559.
- [resume UI condition](../src/screens/profile/SubscriptionManagement.tsx) line 484.

### P1-07 Status, cancel, pause, and resume all operate on “latest created row” instead of the authoritative subscription
Impact:
- If duplicate `created`, `authenticated`, `pending`, or `paused` rows exist, lifecycle actions can hit the wrong subscription.

Evidence:
- [status handler](../fitai-workers/src/handlers/subscription.ts) lines 550-557.
- [cancel handler](../fitai-workers/src/handlers/subscription.ts) lines 671-678.
- [pause handler](../fitai-workers/src/handlers/subscription.ts) lines 751-758.
- [resume handler](../fitai-workers/src/handlers/subscription.ts) lines 828-835.

### P1-08 Admin override is not authoritative
Impact:
- Manual override closes only `active` rows before inserting a new one.
- Older `created`, `authenticated`, `pending`, or `paused` rows remain and can still win later handler lookups.

Evidence:
- [admin override](../fitai-workers/src/handlers/admin.ts) lines 293-309.
- [lifecycle lookups](../fitai-workers/src/handlers/subscription.ts) lines 550-557, 671-678, and 751-758.

### P1-09 Duplicate or reused Razorpay plan IDs are not prevented at the schema level
Impact:
- `resolvePlanTier()` expects a single match for monthly or yearly plan IDs.
- The schema does not enforce uniqueness on `razorpay_plan_id_monthly` or `razorpay_plan_id_yearly`, so duplicate configuration can make plan resolution ambiguous or fail.

Evidence:
- [resolvePlanTier](../fitai-workers/src/handlers/subscription.ts) lines 78-108.
- [subscription_plans schema](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 9-31.

## P1 Limits And Entitlement Enforcement Issues

### P1-10 Client and server reset quota windows on different clocks
Impact:
- The app uses device-local dates while the worker uses UTC.
- Users around midnight can see resets earlier or later than backend enforcement.

Evidence:
- [subscription store day/month keys](../src/stores/subscriptionStore.ts) lines 149-160.
- [worker period calculation](../fitai-workers/src/services/usageTracker.ts) lines 47-59.

### P1-11 Quota is burned before request completion, but the app increments locally only on success
Impact:
- Downstream failures after the gate still consume server quota.
- The UI stays optimistic until a later refresh or 403.

Evidence:
- [subscription gate increment](../fitai-workers/src/middleware/subscriptionGate.ts) lines 194-199.
- [fitness usage increment](../src/hooks/useFitnessLogic.ts) lines 316-319.
- [meal planning usage increment](../src/hooks/useMealPlanning.ts) lines 140-149.
- [AI meal generation usage increment](../src/hooks/useAIMealGeneration.ts) lines 969-985.

### P1-12 Quota increment failures are ignored
Impact:
- If `increment_feature_usage` fails after the read check passes, the request continues and quota never advances.

Evidence:
- [subscription gate](../fitai-workers/src/middleware/subscriptionGate.ts) lines 194-199.
- [incrementUsage result contract](../fitai-workers/src/services/usageTracker.ts) lines 65-87.

### P1-13 Local barcode lookup consumes UI quota without consuming server quota
Impact:
- The UI can block the user even though the backend still has remaining quota.

Evidence:
- [barcode handlers](../src/hooks/ai-meal-generation/barcode-handlers.ts) lines 76 and 132.
- [barcode service](../src/services/barcodeService.ts) line 152.
- [worker barcode-gated route area](../fitai-workers/src/index.ts) line 390.

### P1-14 Subscription lookup errors are masked as free-tier success
Impact:
- Real DB/query failures look like a legitimate downgrade.
- If the free plan is also unavailable, the handler falls back to hardcoded defaults and stops respecting admin-configured limits.

Evidence:
- [status handler](../fitai-workers/src/handlers/subscription.ts) lines 559-609.

### P1-15 Some admin-configured plan flags are stored but not truly enforced
Impact:
- `analytics` and `coaching` are stored in plans, but the app does not consistently use them as hard gates.
- Public feature flags from `app_config` are loaded but largely unused.

Evidence:
- [Analytics screen](../src/screens/main/AnalyticsScreen.tsx) line 53.
- [app config hook](../src/hooks/useAppConfig.ts) lines 65-71.
- [main app config usage](../App.tsx) line 1104.
- [profile subscription screen](../src/screens/profile/SubscriptionManagement.tsx) line 417.

## P1 Admin Config And Pricing Issues

### P1-16 Guest users do not see admin-configured plan pricing
Impact:
- The paywall reads `subscription_plans` directly.
- RLS allows only authenticated reads, so guests fall back to hardcoded pricing.

Evidence:
- [paywall plan fetch](../src/hooks/usePaywall.ts) lines 90-101.
- [subscription_plans RLS](../supabase/migrations/20260220000001_add_subscription_tables.sql) lines 147-152.

### P1-17 Guest users can bypass maintenance mode and other public app-config controls
Impact:
- `app_config` reads fail for guest sessions because RLS only allows authenticated reads.
- The hook keeps permissive defaults, bypassing maintenance/version gates for logged-out users.

Evidence:
- [app config hook](../src/hooks/useAppConfig.ts) lines 54-74.
- [app_config RLS](../supabase/migrations/20260315000001_create_admin_tables.sql) lines 94-103.
- [main app config usage](../App.tsx) line 1104.

### P1-18 App-config and plan changes do not propagate to already-open sessions
Impact:
- Admin toggles, price edits, and plan activation changes stay stale until remount or app restart.

Evidence:
- [app config hook](../src/hooks/useAppConfig.ts) lines 49-83.
- [paywall hook](../src/hooks/usePaywall.ts) lines 87-143.

### P1-19 The admin plans UI cannot fully manage plan limits and nullability
Impact:
- `unlimited_ai`, `unlimited_scans`, `analytics`, `coaching`, and `active` are not editable there.
- Clearing numeric fields sends `""` instead of `null`, so admins cannot reliably restore “unlimited” or “not offered”.

Evidence:
- [plans page editable fields](../fitai-admin/src/app/(admin)/plans/page.tsx) lines 34-37 and 53-85.
- [plan update handler](../fitai-workers/src/handlers/admin.ts) lines 155-176.

### P1-20 `POST /api/admin/config` can report success while changing nothing
Impact:
- Update-by-key does not verify whether any row matched.
- Stale keys or typos become silent no-ops.

Evidence:
- [admin config update](../fitai-workers/src/handlers/admin.ts) lines 107-129.

## P1 Login And Admin Auth Issues

### P1-21 Admin auth is based on stale JWT role claims rather than live `admin_users` membership
Impact:
- Revoked admins keep access until token refresh.
- Newly granted admins may still be denied until reauth.

Evidence:
- [worker auth middleware](../fitai-workers/src/middleware/auth.ts) lines 68 and 179.
- [admin role sync schema](../supabase/migrations/20260315000001_create_admin_tables.sql) lines 31-70.

### P1-22 The admin panel snapshots an access token and does not track auth refresh
Impact:
- Long-lived admin sessions can start failing with stale bearer tokens until reload.

Evidence:
- [admin auth guard](../fitai-admin/src/lib/auth/guard.tsx) line 13.
- [worker client](../fitai-admin/src/lib/workers/client.ts) line 1.

### P1-23 `useAdminSession()` can leave the admin shell stuck loading
Impact:
- Some error and redirect branches never clear `loading`, and the layout blocks all admin UI behind the spinner.

Evidence:
- [admin guard](../fitai-admin/src/lib/auth/guard.tsx) lines 14-47.
- [admin layout](../fitai-admin/src/app/(admin)/layout.tsx) line 10.

## P2 UX, State, And Data Consistency Issues

### P2-01 Session restore trusts cached local auth until expiry
Impact:
- A revoked token can still appear valid in the app until a later protected request fails.

Evidence:
- [auth restore](../src/services/auth.ts) lines 371-382.
- [alternate session restore path](../src/services/auth/session.ts) lines 38-55.
- [auth store initialize](../src/stores/authStore.ts) lines 291-320.

### P2-02 The client can show “purchase success” while still treating the user as non-premium
Impact:
- `authenticated` is normalized to `null`, but the paywall shows the success state immediately after refresh.

Evidence:
- [status normalization](../src/stores/subscriptionStore.ts) lines 80-96.
- [paywall success flow](../src/hooks/usePaywall.ts) line 223.

### P2-03 Premium state can stay stale after refresh failures or webhook-side changes
Impact:
- Failed refreshes do not clear entitlements, and the subscription screen does not refresh on open.

Evidence:
- [subscription fetch failure path](../src/stores/subscriptionStore.ts) lines 318-321 and 342.
- [subscription management mount behavior](../src/screens/profile/SubscriptionManagement.tsx) line 90.
- [home logic refresh path](../src/hooks/useHomeLogic.ts) line 142.

### P2-04 Renewal and cancellation dates are typed/formatted incorrectly on the frontend
Impact:
- `current_period_end` is treated like a string even though the backend returns epoch seconds, leading to wrong or 1970-era dates.

Evidence:
- [backend status data type](../src/stores/subscriptionStore.ts) lines 64-73.
- [assignment to store state](../src/stores/subscriptionStore.ts) line 309.
- [subscription management formatting](../src/screens/profile/SubscriptionManagement.tsx) lines 56 and 357.

### P2-05 The status endpoint masks operational problems as a valid free-tier state
Impact:
- Users can appear legitimately downgraded when the real issue is data corruption or a transient DB error.

Evidence:
- [status handler fallback path](../fitai-workers/src/handlers/subscription.ts) lines 559-609.

### P2-06 Usage shown in the app is per-device, not authoritative
Impact:
- Multi-device use, admin resets, webhook changes, and server-consumed failures will drift the UI away from actual enforcement.

Evidence:
- [subscription store derives usage locally](../src/stores/subscriptionStore.ts) lines 99-129 and 247-297.

### P2-07 Admin yearly overrides still expire after 30 days
Impact:
- Manual yearly grants do not honor yearly duration.

Evidence:
- [admin override period end](../fitai-workers/src/handlers/admin.ts) lines 305-308.

### P2-08 Non-admin users are signed in before the admin-role check finishes
Impact:
- If the follow-up sign-out fails, the browser can retain a valid non-admin session even though the screen shows access denied.

Evidence:
- [admin login page](../fitai-admin/src/app/login/page.tsx) lines 18-51.

### P2-09 Header sign-out ignores failures and `/login` does not redirect already-authenticated admins
Impact:
- A failed sign-out can still land the user on the login page while the session remains active.

Evidence:
- [admin header sign-out](../fitai-admin/src/components/layout/Header.tsx) lines 25-31.
- [admin login page](../fitai-admin/src/app/login/page.tsx) line 7.

## Missing Tests

### Test Gap 01 No regression coverage for RLS and RPC permissions on subscription tables/functions
Missing cases:
- Authenticated user attempts to insert/update own `subscriptions`.
- Authenticated user attempts to update own `feature_usage`.
- Authenticated user calls subscription RPCs with another user ID.

Relevant files:
- [subscription migration](../supabase/migrations/20260220000001_add_subscription_tables.sql)
- [worker tests root](../fitai-workers/test)

### Test Gap 02 Webhook tests do not use the real `webhook_events` schema contract
Missing cases:
- Insert/select behavior against the actual column set used by the migration.
- Duplicate-event processing with the real schema.

Relevant files:
- [worker webhook tests](../fitai-workers/test/subscription.test.ts) lines 371-490.
- [integration webhook tests](../fitai-workers/test/integration/subscription-flow.test.ts) lines 558-674.

### Test Gap 03 No regression tests for concurrent create, orphaned remote subscription, or verify replay/state transitions
Relevant files:
- [create tests](../fitai-workers/test/subscription.test.ts) line 139.
- [verify tests](../fitai-workers/test/subscription.test.ts) lines 300-357.

### Test Gap 04 No regression tests for pause/status/resume after refresh
Relevant files:
- [worker pause/resume tests](../fitai-workers/test/subscription.test.ts) lines 706-804.
- [integration pause/resume tests](../fitai-workers/test/integration/subscription-flow.test.ts) lines 477-555.

### Test Gap 05 There is effectively no app coverage for subscription store, paywall, session restore, guest pricing, or admin config guest reads
Missing cases:
- `authenticated -> null` normalization
- failed status refresh with stale entitlements
- guest fallback pricing versus admin-configured pricing
- guest maintenance-mode/config reads
- local-versus-UTC reset boundary
- revoked cached session on app start
- user A logout followed by user B login on the same device

Relevant files:
- [app tests root](../src/__tests__)

## Verification Performed

- Ran `npm test -- subscription.test.ts subscriptionGate.test.ts` in `fitai-workers`.
- Existing targeted worker tests passed.
- Those tests do not cover the integrity, RLS, stale-state, or hidden unhappy-path issues listed above.

