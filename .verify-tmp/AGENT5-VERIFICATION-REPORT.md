# Agent 5 — VERIFICATION & RUNTIME Report

**Repo:** d:\FitAi\FitAI
**Date:** 2026-07-29
**Scope:** Payment system (Razorpay subscription) — static + runtime verification
**Constraints:** READ + RUN only; no fixes outside `.verify-tmp/`

---

## (a) Payment Flow Map

### Endpoint Inventory (Worker — `fitai-workers/src/index.ts`)

| Method | Path | Handler | Auth | Rate Limit | File |
|--------|------|---------|------|------------|------|
| POST | `/api/subscription/create` | `handleCreateSubscription` | authMiddleware | AUTHENTICATED | index.ts:543 |
| POST | `/api/subscription/verify` | `handleVerifyPayment` | authMiddleware | AUTHENTICATED | index.ts:545 |
| POST | `/api/webhook/razorpay` | `handleWebhook` | None (signature-verified) | None | index.ts:547 |
| GET  | `/api/subscription/status` | `handleGetSubscriptionStatus` | authMiddleware | AUTHENTICATED | index.ts:549 |
| POST | `/api/subscription/cancel` | `handleCancelSubscription` | authMiddleware | AUTHENTICATED | index.ts:551 |
| POST | `/api/subscription/pause` | `handlePauseSubscription` | authMiddleware | AUTHENTICATED | index.ts:553 |
| POST | `/api/subscription/resume` | `handleResumeSubscription` | authMiddleware | AUTHENTICATED | index.ts:555 |

### Client → Server Path Agreement

| Client Constant (api.ts) | Path | Server Route | Match? |
|--------------------------|------|--------------|--------|
| `SUBSCRIPTION_CREATE_ENDPOINT` | `/api/subscription/create` | POST `/api/subscription/create` | ✅ |
| `SUBSCRIPTION_VERIFY_ENDPOINT` | `/api/subscription/verify` | POST `/api/subscription/verify` | ✅ |
| `SUBSCRIPTION_STATUS_ENDPOINT` | `/api/subscription/status` | GET `/api/subscription/status` | ✅ |
| `SUBSCRIPTION_CANCEL_ENDPOINT` | `/api/subscription/cancel` | POST `/api/subscription/cancel` | ✅ |
| `SUBSCRIPTION_PAUSE_ENDPOINT` | `/api/subscription/pause` | POST `/api/subscription/pause` | ✅ |
| `SUBSCRIPTION_RESUME_ENDPOINT` | `/api/subscription/resume` | POST `/api/subscription/resume` | ✅ |
| Webhook (server-only) | `/api/webhook/razorpay` | POST `/api/webhook/razorpay` | ✅ |

**All 7 endpoints confirmed — no broken client/server path links.**

### Full Sequence: Create → Checkout → Verify → Activate

```
Client (PaywallModal.tsx)
  └─ usePaywall.subscribe(planId)
       └─ razorpayService.createSubscription(planId, billingCycle)
            └─ POST /api/subscription/create
                 └─ handleCreateSubscription (subscription.ts:410)
                      ├─ Lookup plan in subscription_plans table
                      ├─ razorpayFetch → Razorpay API /subscriptions
                      └─ INSERT subscriptions (status='created')
       └─ razorpayService.openCheckout(subscription_id, key_id)
            └─ Native: RazorpayCheckout.open()
            └─ Web: openRazorpayWebCheckout()
       └─ razorpayService.verifyPayment(paymentId, subId, signature)
            └─ POST /api/subscription/verify
                 └─ handleVerifyPayment (subscription.ts:592)
                      ├─ verifyPaymentSignature (HMAC-SHA256)
                      ├─ Lookup subscriptions by razorpay_subscription_id
                      └─ UPDATE subscriptions (status='authenticated')

Async Webhook (Razorpay → Worker)
  └─ POST /api/webhook/razorpay
       └─ handleWebhook (subscription.ts:729)
            ├─ verifyWebhookSignature (raw body + x-razorpay-signature)
            ├─ Idempotency check: webhook_events table
            ├─ resolvePlanTier(plan_id)
            └─ UPDATE subscriptions (status, period_end, etc.)
```

### Usage Gate (subscriptionGate middleware)

Applied to: `/workout/generate` (index.ts:331), `/diet/generate` (index.ts:345), `/barcode/scan` (index.ts:425), `/nutrition/label-scan` (index.ts:440), `/chat` (index.ts:456)

```
Request → authMiddleware → subscriptionGate(featureKey)
  ├─ Query subscriptions (active/authenticated/pending)
  ├─ Query subscription_plans by tier
  ├─ checkUsageLimit(featureKey, periodType)
  ├─ If over limit → 403 FEATURE_LIMIT_EXCEEDED
  └─ incrementUsage() → next()
```

---

## (b) Env / Config Matrix

### Required Runtime Env Vars (from `Env` interface + usage)

| Variable | Consumed At | Declared In | Documented? |
|----------|-------------|-------------|-------------|
| `RAZORPAY_KEY_ID` | razorpay.ts:49, subscription.ts:572 | types.ts:139 | ⚠️ wrangler.jsonc comment says `RAZORPAY_KEY_ID` (secrets) |
| `RAZORPAY_KEY_SECRET` | razorpay.ts:49, subscription.ts:618 | types.ts:140 | ⚠️ wrangler.jsonc comment |
| `RAZORPAY_WEBHOOK_SECRET` | subscription.ts:752 | types.ts:141 | ⚠️ wrangler.jsonc comment |
| `RAZORPAY_PLAN_ID_BASIC_MONTHLY` | subscription.ts:460 | types.ts:142 | ⚠️ wrangler.jsonc comment says `RAZORPAY_PLAN_BASIC_MONTHLY` (MISMATCH!) |
| `RAZORPAY_PLAN_ID_PRO_MONTHLY` | subscription.ts:462 | types.ts:143 | ⚠️ wrangler.jsonc comment says `RAZORPAY_PLAN_PRO_MONTHLY` (MISMATCH!) |
| `RAZORPAY_PLAN_ID_PRO_YEARLY` | subscription.ts:464 | types.ts:144 | ⚠️ wrangler.jsonc comment says `RAZORPAY_PLAN_PRO_YEARLY` (MISMATCH!) |
| `SUPABASE_URL` | supabase.ts | types.ts:123 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.ts | types.ts:124 | ✅ |
| `EXPO_PUBLIC_WORKERS_URL` | api.ts:7-8 | app.config.js `extra` block | ❌ NOT in eas.json profiles |

### Gap Analysis

1. **CRITICAL — Plan ID env-var name mismatch:**
   - Code expects: `RAZORPAY_PLAN_ID_BASIC_MONTHLY`, `RAZORPAY_PLAN_ID_PRO_MONTHLY`, `RAZORPAY_PLAN_ID_PRO_YEARLY`
   - wrangler.jsonc comments say: `RAZORPAY_PLAN_BASIC_MONTHLY`, `RAZORPAY_PLAN_PRO_MONTHLY`, `RAZORPAY_PLAN_PRO_YEARLY`
   - Root `.env.example` uses: `RAZORPAY_PLAN_BASIC_MONTHLY` etc. (matches wrangler comment, NOT the code)
   - `scripts/create-razorpay-plans.ts` outputs: `RAZORPAY_PLAN_ID_BASIC_MONTHLY` etc. (matches code)
   - **Impact:** If ops follow wrangler comments / root .env.example, the worker will read `undefined` and fall back to DB lookup only. If DB columns are also NULL, subscription creation will fail with "Plan does not support X billing".
   - **File refs:** fitai-workers/wrangler.jsonc:36, .env.example:67-69, scripts/create-razorpay-plans.ts:140-142

2. **`EXPO_PUBLIC_WORKERS_URL` not in eas.json:**
   - `api.ts` falls back to `process.env.EXPO_PUBLIC_WORKERS_URL` then hardcoded `https://fitai-workers.fitai-prod.workers.dev`
   - eas.json profiles (development, preview, production, production-aab, preview-local) do NOT set `EXPO_PUBLIC_WORKERS_URL`
   - `app.config.js` `extra` block also does NOT include it
   - **Impact:** Production builds will always use the hardcoded fallback URL. If the worker URL ever changes, all builds will break.
   - **File refs:** src/config/api.ts:7-9, eas.json (all profiles), app.config.js:144-189

3. **`.env.example` missing Razorpay vars for fitai-workers:**
   - `fitai-workers/.env.example` has NO Razorpay section at all (only AI keys + Supabase + media)
   - Root `.env.example` HAS a Razorpay section (lines 56-69) but with the wrong plan-ID names (see gap 1)
   - **File refs:** fitai-workers/.env.example (no Razorpay), .env.example:56-69

4. **Client-side env exposure is safe:**
   - No `EXPO_PUBLIC_RAZORPAY_*` or `EXPO_PUBLIC_*_SECRET` variables found
   - `key_id` is returned by the server (safe to expose)
   - `key_secret` is never sent to client ✅

---

## (c) Test + Typecheck Results

### Backend Tests (fitai-workers, vitest)

**Run 1 (combined, 5 files):**
```
Test Files:  2 failed | 3 passed (5)
Tests:       3 failed | 57 passed (60)
```

**Run 2 (isolated re-runs after in-flight edits settled):**
```
test/subscriptionGate.test.ts           → 1 passed (all 6 tests pass)
test/integration/subscription-flow.test.ts → 1 passed (all 18 tests pass)
```

**Final status (after re-run):** All payment tests pass. The 3 initial failures were transient due to concurrent file modifications by other agents (git status showed `subscriptionGate.test.ts`, `subscription-flow.test.ts`, `razorpay.test.ts` all modified during the run).

**Pass/Fail Summary:**
- `test/subscription.test.ts`: 22/22 ✅
- `test/subscription.regression.test.ts`: 4/4 ✅
- `test/razorpay.test.ts`: 10/10 ✅
- `test/subscriptionGate.test.ts`: 6/6 ✅ (after re-run)
- `test/integration/subscription-flow.test.ts`: 18/18 ✅ (after re-run)

### Root Jest Tests

**Payment-relevant suites:**
```
Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
```
- `src/__tests__/utils/subscriptionUi.test.ts`: ✅
- `src/__tests__/utils/units.test.ts`: ✅

(110 total jest test files exist; only payment-adjacent ones were run per scope.)

### TypeScript (`npx tsc --noEmit`)

| Directory | Error Count | Top Payment/Security-Related |
|-----------|-------------|------------------------------|
| **Root** | 0 | N/A |
| **fitai-workers** | 76 | `src/handlers/subscription.ts(86,16)` — TS2352: SupabaseClient → `{rpc?}` cast mismatch; `subscription.ts(250,22)` & `(254,22)` — TS2347 untyped function calls with type arguments |

**Note:** The 76 workers errors are pre-existing (many in test files and unrelated handlers like `barcodeScanning.test.ts`, `healthSync.test.ts`, `portionAdjustment.ts`, etc.). The 3 subscription.ts errors are type-safety issues, not runtime bugs.

---

## (d) Leaked-Secret Findings

| Pattern | Result | Severity |
|---------|--------|----------|
| `rzp_live_` | **None found** | — |
| `rzp_test_` with real-looking values | Only placeholder strings (`rzp_test_your_key_id_here`, `rzp_test_key`, `rzp_test_xxx` in docs) | ℹ️ Safe |
| `sk_live` | **None found** | — |
| `service_role` | Only in documentation/plan markdown files (`.omo/plans/`, `.omo/drafts/`) as references, no actual key values | ℹ️ Safe |
| `BEGIN PRIVATE KEY` | **None found** | — |
| Google API keys (`AIzaSy...`) | **22 keys in `eas.json`** (EXPO_PUBLIC_GEMINI_KEY_1 through _22), 1 in `google-services.json`, 1 in `scaling-architecture.md` | ⚠️ HIGH |

**Assessment:**
- **No Razorpay live or test secrets are leaked** in the codebase.
- **22 Google Gemini API keys are committed in `eas.json`** — these are production-reachable API keys with no restrictions visible. This is a **pre-existing high-severity issue** outside the payment scope but flagged for orchestrator awareness.
- Supabase `anon` key in `eas.json` is expected (public by design). No `service_role` key values found.

---

## (e) Prioritized Issues for Orchestrator

| Priority | Issue | Impact | Route To |
|----------|-------|--------|----------|
| **P0** | Razorpay plan-ID env-var name mismatch (code expects `RAZORPAY_PLAN_ID_*` but wrangler.jsonc comments + root .env.example say `RAZORPAY_PLAN_*`) | Subscription creation will fail if ops follow wrong docs | Agent fixing docs/config |
| **P1** | `EXPO_PUBLIC_WORKERS_URL` missing from eas.json all profiles + app.config.js `extra` | Production builds silently use hardcoded fallback; worker URL changes will break all clients | Agent fixing build config |
| **P2** | 76 pre-existing TypeScript errors in fitai-workers (3 in subscription.ts) | Type safety debt; not blocking but should be cleaned | Agent fixing types |
| **P3** | 22 Google Gemini API keys committed in `eas.json` | Keys are publicly exposed; should be rotated and moved to EAS secrets | Security/DevOps |
| **P4** | `fitai-workers/.env.example` has no Razorpay section at all | New devs won't know what env vars to set for payment | Agent fixing docs |
| **P5** | `wrangler.jsonc` has invalid top-level fields `#queues_comment`, `#queues` | Wrangler warns on every command; cosmetic | Agent fixing config |

---

## Verification Notes

- **Concurrency:** `git status` confirmed 20+ files modified during this verification window, including payment test files. Initial test failures (3/60) were re-run in isolation and passed 100%.
- **Scratch dir:** `d:\FitAi\FitAI\.verify-tmp\` created (this report only; no other writes).
- **No fixes applied** — all findings are report-only per Agent 5 constraints.
