# Razorpay Subscription Integration for FitAI

## TL;DR

> **Quick Summary**: Integrate Razorpay subscription payments into FitAI with 3 configurable tiers (Free/Basic/Pro), server-side feature gating on all AI endpoints, usage tracking, and a full paywall UI — replacing the current disabled IAP system.
> 
> **Deliverables**:
> - Razorpay subscription endpoints in Cloudflare Workers (create, verify, webhook, status, cancel/pause/resume)
> - Supabase tables: `subscription_plans`, `subscriptions`, `feature_usage` with RLS
> - Subscription-aware middleware gating all AI generation endpoints
> - Usage tracking with configurable daily/monthly limits per tier
> - Fresh React Native Razorpay service replacing disabled IAP code
> - Refactored subscription Zustand store fetching status from backend
> - Full paywall UI with 3-tier plan comparison and Razorpay checkout
> - Subscription management (cancel/pause/resume) in profile settings
> - Comprehensive tests for payment verification, webhook handling, and feature gating
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 (types) → Task 3 (DB schema) → Task 6 (Razorpay endpoints) → Task 8 (feature gate middleware) → Task 12 (frontend store) → Task 15 (paywall UI) → Task 17 (integration test) → Final Verification

---

## Context

### Original Request
User wants to add Razorpay subscription pricing to FitAI to control feature limits across all AI generation endpoints — diet, workout, meal scan, and chat. The app currently has a completely disabled IAP-based subscription system (react-native-iap installed but disabled in code). No feature limits are enforced anywhere.

### Interview Summary
**Key Discussions**:
- **3 configurable tiers**: Free (1 AI plan/month, 10 scans/day), Basic (₹299/mo: 10 AI/day, unlimited scans), Pro (₹499/mo or ₹3999/yr: unlimited + analytics + coaching)
- **Configurable limits**: Feature limits stored in Supabase `subscription_plans` table, NOT hardcoded
- **Full paywall UI**: Beautiful paywall with plan comparison, Razorpay checkout modal, subscription management
- **Replace IAP entirely**: Delete both `SubscriptionService.ts` and `src/services/subscription/` directory, write fresh Razorpay service
- **Razorpay test mode**: Use `rzp_test_xxx` keys initially
- **iOS policy**: Accept risk, ship Razorpay on both iOS and Android
- **New Architecture**: Disable in `app.json` for react-native-razorpay compatibility
- **Supabase**: Primary data store for subscriptions and usage tracking
- **Workers-native**: Use direct `fetch()` to Razorpay API with Web Crypto for signature verification — no npm package needed

**Research Findings**:
- Razorpay subscription flow: Create plan → Create subscription → Client opens checkout → Verify signature → Webhook confirms
- `react-native-razorpay` requires Expo prebuild + EAS build (no Expo Go)
- Payment signature: `HMAC-SHA256(payment_id|subscription_id, key_secret)` via Web Crypto API
- Webhook signature: `HMAC-SHA256(raw_body, webhook_secret)` — must use raw body string, NOT re-serialized JSON
- Webhook events: `subscription.activated`, `.charged`, `.pending`, `.halted`, `.cancelled`
- Dual confirmation pattern: Optimistic update after verify → webhook confirms → final source of truth
- `react-native-razorpay` v2.3.1 incompatible with React Native New Architecture (Fabric/TurboModules) — must disable
- Existing `subscriptionStore.ts` has feature flags + limits but nothing is enforced server-side
- Existing migration `20250129000001_add_user_plan_tables.sql` has `user_workout_plans` and `user_meal_plans` only — NO subscription tables
- Workers use Hono framework with `authMiddleware` pattern; user available via `c.get('user').id`
- All AI endpoints already behind `authMiddleware` and `rateLimitMiddleware(RATE_LIMITS.AI_GENERATION)`

### Metis Review
**Identified Gaps** (addressed):
- **iOS App Store risk**: Accepted — ship Razorpay on both platforms (enforcement inconsistent in India)
- **New Architecture incompatibility**: Disable New Architecture in `app.json` (one config change)
- **Webhook auto-disable risk**: Razorpay disables webhook endpoint after 24hr continuous non-2xx — handled with proper error handling + monitoring
- **Debit card limitation**: Only 4 banks support recurring debit — documented but not blocked (UPI/cards primary)
- **Webhook deduplication**: Must use `x-razorpay-event-id` header for idempotency
- **Competing subscription code**: Delete both old implementations, write fresh
- **Halted invoice gap**: Halted invoices not retried on reactivation — track in subscription status
- **UPI pause limitation**: Customer-paused UPI subscriptions can only be resumed by customer — surface in UI

---

## Work Objectives

### Core Objective
Add Razorpay subscription-based pricing with 3 configurable tiers to FitAI, enforcing feature limits server-side on all AI generation endpoints, with a complete paywall UI and subscription management flow.

### Concrete Deliverables
- `fitai-workers/src/handlers/subscription.ts` — Razorpay subscription CRUD endpoints
- `fitai-workers/src/utils/razorpay.ts` — Signature verification utilities (Web Crypto)
- `fitai-workers/src/middleware/subscriptionGate.ts` — Subscription-aware feature gating middleware
- `fitai-workers/src/services/usageTracker.ts` — Feature usage tracking service
- `supabase/migrations/YYYYMMDD_add_subscription_tables.sql` — New subscription + usage tables
- `src/services/RazorpayService.ts` — Fresh React Native Razorpay integration service
- `src/stores/subscriptionStore.ts` — Refactored store fetching from backend
- `src/hooks/usePaywall.ts` — Updated paywall hook for Razorpay flow
- `src/components/subscription/PaywallModal.tsx` — Redesigned 3-tier paywall UI
- `src/screens/profile/SubscriptionManagement.tsx` — Cancel/pause/resume management

### Definition of Done
- [ ] `curl -X POST /api/subscription/create` returns valid Razorpay `subscription_id`
- [ ] Payment verification endpoint validates HMAC signature correctly
- [ ] Webhook endpoint processes all subscription lifecycle events
- [ ] Free user hitting AI endpoint after limit exhaustion gets 403 with `upgrade_required` error
- [ ] Paying user (active subscription) can use AI endpoints without limit
- [ ] Usage counters reset correctly at period boundaries (daily/monthly)
- [ ] Paywall UI shows 3 tiers with correct pricing and feature comparison
- [ ] Razorpay checkout modal opens with `subscription_id` and completes payment flow
- [ ] Subscription management screen shows status, allows cancel/pause
- [ ] All feature limits are configurable via `subscription_plans` table (no hardcoded limits)
- [ ] `bun test` passes for all critical path tests

### Must Have
- Server-side feature gating (NOT client-side only)
- Configurable feature limits per tier in database
- Razorpay webhook signature verification (security-critical)
- Payment signature verification before granting access
- Usage tracking with automatic period resets
- Graceful handling of `pending` state (grace period access)
- Idempotent webhook processing (deduplicate by event ID)
- Paywall modal with 3-tier comparison
- Subscription status check on app launch

### Must NOT Have (Guardrails)
- **NO hardcoded feature limits** — ALL limits must come from `subscription_plans` table
- **NO client-side-only gating** — Server MUST enforce limits; client is just UX
- **NO razorpay npm package** in Workers — use direct `fetch()` + Web Crypto API
- **NO modifications to AI generation logic** — only ADD gating middleware before existing handlers
- **NO admin panel** — plans configured via Razorpay Dashboard + Supabase SQL
- **NO promo codes, coupons, referral system** — out of scope
- **NO email/push notifications** for subscription events — out of scope
- **NO `as any` or `@ts-ignore`** in new code — full type safety
- **NO console.log in production** paths — use structured error responses
- **NO storing Razorpay key_secret on client** — only `key_id` (public) goes to frontend
- **NO re-serializing webhook body** before signature verification — use raw string

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES — Cloudflare Workers has vitest via wrangler; frontend has jest/bun test
- **Automated tests**: Tests-after for critical paths (payment verification, webhook, feature gating)
- **Framework**: vitest (Workers) + bun test / jest (frontend)
- **Agent QA**: Every task has agent-executed QA scenarios using curl, Playwright, or tmux

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **Database**: Use Bash (curl to Supabase REST API or Workers endpoint) — Verify table data
- **Crypto/Signature**: Use Bash (node/bun REPL) — Compute HMAC, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, types, config):
├── Task 1: Env types + Razorpay utility functions [quick]
├── Task 2: Disable New Architecture + install react-native-razorpay [quick]
├── Task 3: Supabase migration — subscription_plans, subscriptions, feature_usage tables [quick]
├── Task 4: Razorpay plan creation script (test mode) [quick]
└── Task 5: Delete old IAP code (SubscriptionService.ts + subscription/ directory) [quick]

Wave 2 (After Wave 1 — core backend endpoints):
├── Task 6: Razorpay subscription endpoints (create, verify, webhook, status) [deep]
├── Task 7: Usage tracking service (increment, check, reset) [unspecified-high]
└── Task 8: Subscription gate middleware + wire into AI endpoints [deep]

Wave 3 (After Wave 2 — frontend services):
├── Task 9: Fresh RazorpayService.ts (create subscription, open checkout, verify) [unspecified-high]
├── Task 10: Refactor subscriptionStore.ts (fetch from backend, new state shape) [unspecified-high]
├── Task 11: Update usePaywall.ts hook for Razorpay flow [quick]
└── Task 12: Subscription management endpoints (cancel, pause, resume, upgrade) [unspecified-high]

Wave 4 (After Wave 3 — UI):
├── Task 13: Paywall UI — 3-tier plan comparison modal [visual-engineering]
├── Task 14: Subscription management screen in profile [visual-engineering]
├── Task 15: Feature gate UI — limit reached prompts + upgrade CTAs [visual-engineering]
└── Task 16: Backend tests — payment verify, webhook, feature gating [deep]

Wave 5 (After Wave 4 — integration + final):
├── Task 17: End-to-end integration test (full subscription flow) [deep]
└── Task 18: Cleanup — remove react-native-iap dep, update .env.example, docs [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T3 → T6 → T8 → T10 → T13 → T17 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 6, 7, 8, 9, 12 | 1 |
| 2 | — | 9, 13 | 1 |
| 3 | — | 6, 7, 8, 10 | 1 |
| 4 | — | 6, 17 | 1 |
| 5 | — | 9, 10, 11 | 1 |
| 6 | 1, 3, 4 | 8, 9, 10, 12, 17 | 2 |
| 7 | 1, 3 | 8 | 2 |
| 8 | 1, 6, 7 | 16, 17 | 2 |
| 9 | 1, 2, 5, 6 | 11, 13, 17 | 3 |
| 10 | 3, 5, 6 | 11, 13, 14 | 3 |
| 11 | 5, 9, 10 | 13 | 3 |
| 12 | 1, 6 | 14, 17 | 3 |
| 13 | 2, 9, 10, 11 | 17 | 4 |
| 14 | 10, 12 | 17 | 4 |
| 15 | 10, 11 | 17 | 4 |
| 16 | 6, 7, 8 | 17 | 4 |
| 17 | 8, 13, 14, 15, 16 | F1-F4 | 5 |
| 18 | 5, 9 | F1-F4 | 5 |
| F1-F4 | 17, 18 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1** (5 tasks): T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`, T5→`quick`
- **Wave 2** (3 tasks): T6→`deep`, T7→`unspecified-high`, T8→`deep`
- **Wave 3** (4 tasks): T9→`unspecified-high`, T10→`unspecified-high`, T11→`quick`, T12→`unspecified-high`
- **Wave 4** (4 tasks): T13→`visual-engineering`, T14→`visual-engineering`, T15→`visual-engineering`, T16→`deep`
- **Wave 5** (2 tasks): T17→`deep`, T18→`quick`
- **FINAL** (4 tasks): F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Env Types + Razorpay Utility Functions

  **What to do**:
  - Add Razorpay environment bindings to the `Env` interface in `fitai-workers/src/utils/types.ts`: `RAZORPAY_KEY_ID: string`, `RAZORPAY_KEY_SECRET: string`, `RAZORPAY_WEBHOOK_SECRET: string`, `RAZORPAY_PLAN_ID_BASIC_MONTHLY: string`, `RAZORPAY_PLAN_ID_PRO_MONTHLY: string`, `RAZORPAY_PLAN_ID_PRO_YEARLY: string`
  - Add TypeScript types for Razorpay API responses: `RazorpaySubscription`, `RazorpayPayment`, `RazorpayWebhookEvent`, `RazorpayPlan` — model after actual Razorpay API response shapes
  - Add types for internal subscription domain: `SubscriptionTier` (`'free' | 'basic' | 'pro'`), `SubscriptionStatus` (`'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'paused' | 'cancelled' | 'completed'`), `FeatureLimitConfig`, `UsageRecord`
  - Create `fitai-workers/src/utils/razorpay.ts` with:
    - `verifyPaymentSignature(paymentId, subscriptionId, signature, keySecret)` — HMAC-SHA256 via Web Crypto API: `await crypto.subtle.importKey('raw', encoder.encode(keySecret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign'])` then compare hex digest of `paymentId + '|' + subscriptionId` against signature
    - `verifyWebhookSignature(rawBody, signature, webhookSecret)` — HMAC-SHA256 of raw body string (NOT re-serialized JSON)
    - `razorpayFetch(env, path, method, body?)` — helper wrapping `fetch('https://api.razorpay.com/v1' + path, { headers: { Authorization: 'Basic ' + btoa(keyId + ':' + keySecret) } })`
  - Add error codes to `fitai-workers/src/utils/errorCodes.ts`: `FEATURE_LIMIT_EXCEEDED`, `SUBSCRIPTION_REQUIRED`, `PAYMENT_VERIFICATION_FAILED`, `WEBHOOK_SIGNATURE_INVALID`, `SUBSCRIPTION_NOT_FOUND`, `SUBSCRIPTION_INACTIVE`

  **Must NOT do**:
  - Do NOT install any npm package for Razorpay — use direct fetch() + Web Crypto only
  - Do NOT use `as any` or `@ts-ignore` — full type safety
  - Do NOT use Node.js `crypto` module — Workers use Web Crypto API

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-concern task — type definitions and utility functions in 2-3 files
  - **Skills**: []
    - No special skills needed — pure TypeScript file edits
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed
    - `git-master`: No git operations needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6, 7, 8, 9, 12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `fitai-workers/src/utils/types.ts:37-59` — Current `Env` interface — add Razorpay bindings after line 58 (before closing brace)
  - `fitai-workers/src/utils/errorCodes.ts` — Existing error code enum — add subscription-related codes following same pattern
  - `fitai-workers/src/middleware/rateLimit.ts:1-10` — Import pattern for types from `../utils/types`

  **API/Type References** (contracts to implement against):
  - Razorpay Subscription object shape: `{ id, entity, plan_id, customer_id, status, current_start, current_end, ended_at, quantity, notes, charge_at, offer_id, short_url, has_scheduled_changes, change_scheduled_at, source, payment_method }`
  - Razorpay Payment signature formula: `HMAC-SHA256(razorpay_payment_id + "|" + razorpay_subscription_id, key_secret)`
  - Razorpay Webhook signature formula: `HMAC-SHA256(raw_request_body, webhook_secret)`

  **External References**:
  - Web Crypto API `subtle.importKey` + `subtle.sign`: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign
  - Razorpay API Authentication: Basic auth with `key_id:key_secret` base64 encoded
  - Razorpay Subscriptions API response schema: https://razorpay.com/docs/api/subscriptions/

  **WHY Each Reference Matters**:
  - `types.ts:37-59`: Exact location to add new bindings — executor must add after existing vars, before closing `}`
  - `errorCodes.ts`: Must follow existing enum pattern to maintain consistency
  - Web Crypto API docs: Workers don't have Node.js `crypto` — must use `crypto.subtle` for HMAC

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Payment signature verification — valid signature
    Tool: Bash (bun/node REPL in fitai-workers/)
    Preconditions: razorpay.ts exists with verifyPaymentSignature exported
    Steps:
      1. Run: cd fitai-workers && npx tsx -e "
         import { verifyPaymentSignature } from './src/utils/razorpay';
         const result = await verifyPaymentSignature(
           'pay_test123', 'sub_test456',
           '<compute expected HMAC of pay_test123|sub_test456 with key test_secret>',
           'test_secret'
         );
         console.log('valid:', result);"
      2. Assert output contains: `valid: true`
      3. Run same with tampered signature: replace last char
      4. Assert output contains: `valid: false`
    Expected Result: true for valid sig, false for tampered sig
    Failure Indicators: Function throws instead of returning false; returns true for tampered sig
    Evidence: .sisyphus/evidence/task-1-payment-sig-verify.txt

  Scenario: Webhook signature verification — valid + invalid
    Tool: Bash (bun/node REPL)
    Preconditions: razorpay.ts exists with verifyWebhookSignature exported
    Steps:
      1. Run: cd fitai-workers && npx tsx -e "
         import { verifyWebhookSignature } from './src/utils/razorpay';
         const body = '{\"entity\":\"event\",\"event\":\"subscription.activated\"}';
         // Compute expected HMAC of body with webhook_secret
         const result = await verifyWebhookSignature(body, '<expected_hmac>', 'webhook_secret');
         console.log('webhook valid:', result);"
      2. Assert: `webhook valid: true`
      3. Re-serialize body (change key order) and verify signature FAILS (proves raw body is used)
    Expected Result: true for original body, false for re-serialized body
    Evidence: .sisyphus/evidence/task-1-webhook-sig-verify.txt

  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: All type changes are saved
    Steps:
      1. Run: cd fitai-workers && npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "ALLOWED_ORIGINS\|RULE_BASED\|maxTokens\|exercises\|warmup\|cooldown\|user.*Context\|ErrorCode\|conversationId\|toDataStream"
      2. Assert: No NEW errors (only pre-existing errors from other files)
    Expected Result: Zero new TypeScript errors introduced
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(subscription): add Razorpay types, env bindings, and crypto utilities`
  - Files: `fitai-workers/src/utils/types.ts`, `fitai-workers/src/utils/razorpay.ts`, `fitai-workers/src/utils/errorCodes.ts`
  - Pre-commit: `cd fitai-workers && npx tsc --noEmit` (tolerate pre-existing errors only)

- [x] 2. Disable New Architecture + Install react-native-razorpay

  **What to do**:
  - **NOTE**: The project uses `app.config.js` (JavaScript config), NOT `app.json`. `newArchEnabled: false` already exists at root level (line 13 of `app.config.js`). Verify it is also set under `expo.android` and `expo.ios` sections — if not present there, add it under both platform sections to ensure Expo prebuild disables New Architecture per-platform.
  - Run `npx expo install react-native-razorpay` to add the dependency
  - Add Razorpay native config in `app.config.js` under `expo.plugins` if needed for Expo prebuild
  - Verify `app.config.js` exports a valid config object after changes
  - Add a TypeScript declaration file `src/types/react-native-razorpay.d.ts` if the package doesn't ship types:
    ```typescript
    declare module 'react-native-razorpay' {
      interface RazorpayCheckoutOptions {
        description?: string;
        currency?: string;
        key: string;
        subscription_id: string;
        name?: string;
        prefill?: { email?: string; contact?: string; name?: string };
        theme?: { color?: string };
      }
      interface RazorpaySuccessResponse {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }
      const RazorpayCheckout: {
        open(options: RazorpayCheckoutOptions): Promise<RazorpaySuccessResponse>;
      };
      export default RazorpayCheckout;
    }
    ```

  **Must NOT do**:
  - Do NOT modify any existing screen or component code — only config + dependency
  - Do NOT enable Expo Go compatibility — this requires EAS build
  - Do NOT add Razorpay secret keys to any frontend file — only `key_id` (public key)
  - Do NOT create a new `app.json` — the project uses `app.config.js`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config change + dependency install — 2-3 file touches
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 9, 13
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `app.config.js` — Current Expo config (JavaScript, NOT JSON). `newArchEnabled: false` already at root level (line 13). Check `expo.android` and `expo.ios` sections for per-platform override.
  - `package.json` — Current dependencies; verify no conflicting react-native-razorpay version

  **External References**:
  - `react-native-razorpay` npm: https://www.npmjs.com/package/react-native-razorpay
  - Expo prebuild + native modules: https://docs.expo.dev/workflow/prebuild/

  **WHY Each Reference Matters**:
  - `app.config.js`: Must verify `newArchEnabled: false` is in the right place(s) — wrong placement means New Arch stays enabled on one platform and `react-native-razorpay` crashes
  - `react-native-razorpay` docs: Confirms required Expo config + plugin setup

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: New Architecture disabled in config
    Tool: Bash
    Preconditions: app.config.js has been verified/modified
    Steps:
      1. Run: node -e "const c = require('./app.config.js').default || require('./app.config.js'); console.log('root:', c.expo?.newArchEnabled, 'android:', c.expo?.android?.newArchEnabled, 'ios:', c.expo?.ios?.newArchEnabled);"
      2. Assert: root newArchEnabled is false (already present at line 13)
      3. Verify per-platform overrides are present or root-level is sufficient
    Expected Result: newArchEnabled is false at root level and/or both platform sections
    Failure Indicators: undefined or true at any level
    Evidence: .sisyphus/evidence/task-2-new-arch-disabled.txt

  Scenario: react-native-razorpay installed
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run: node -e "const p = require('./package.json'); console.log('razorpay:', p.dependencies['react-native-razorpay']);"
      2. Assert output contains a version string (e.g., `razorpay: ^2.3.1`)
      3. Run: ls node_modules/react-native-razorpay/package.json
      4. Assert file exists
    Expected Result: Package installed with valid version
    Evidence: .sisyphus/evidence/task-2-razorpay-installed.txt

  Scenario: app.config.js exports valid config
    Tool: Bash
    Preconditions: Changes saved
    Steps:
      1. Run: node -e "const c = require('./app.config.js').default || require('./app.config.js'); if(c.expo) console.log('valid config'); else throw new Error('no expo key');"
      2. Assert: `valid config` (no errors)
    Expected Result: Config file is valid and exports expo config
    Evidence: .sisyphus/evidence/task-2-config-valid.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore: verify New Architecture disabled and install react-native-razorpay`
  - Files: `app.config.js`, `package.json`, `package-lock.json` (or equivalent), `src/types/react-native-razorpay.d.ts`
  - Pre-commit: `node -e "require('./app.config.js')"`

- [x] 3. Supabase Migration — Subscription Tables

  **What to do**:
  - Create migration file `supabase/migrations/20260220000001_add_subscription_tables.sql` with:
  - **Table `subscription_plans`** (configurable tier definitions):
    ```sql
    CREATE TABLE subscription_plans (
      id TEXT PRIMARY KEY,  -- 'free', 'basic', 'pro'
      name TEXT NOT NULL,
      description TEXT,
      price_monthly INTEGER NOT NULL DEFAULT 0,  -- in paisa (29900 = ₹299)
      price_yearly INTEGER,  -- in paisa (399900 = ₹3999), NULL if no yearly
      currency TEXT NOT NULL DEFAULT 'INR',
      razorpay_plan_id_monthly TEXT,  -- NULL for free tier
      razorpay_plan_id_yearly TEXT,   -- NULL if no yearly option
      features JSONB NOT NULL DEFAULT '{}',  -- { "ai_generations_per_day": 0, "ai_generations_per_month": 1, "scans_per_day": 10, "unlimited_scans": false, "analytics": false, "coaching": false }
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
  - **Table `subscriptions`** (user subscription records):
    ```sql
    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      razorpay_subscription_id TEXT UNIQUE,
      razorpay_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'created',  -- created, authenticated, active, pending, halted, paused, cancelled, completed
      billing_period TEXT NOT NULL DEFAULT 'monthly',  -- monthly, yearly
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      paused_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_user_active_subscription UNIQUE (user_id)  -- one subscription per user
    );
    ```
  - **Table `feature_usage`** (usage tracking):
    ```sql
    CREATE TABLE feature_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      feature_key TEXT NOT NULL,  -- 'ai_generation', 'food_scan', 'chat'
      period_type TEXT NOT NULL,  -- 'daily', 'monthly'
      period_start DATE NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_user_feature_period UNIQUE (user_id, feature_key, period_type, period_start)
    );
    ```
  - **Table `webhook_events`** (idempotency log):
    ```sql
    CREATE TABLE webhook_events (
      id TEXT PRIMARY KEY,  -- x-razorpay-event-id
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
  - Add RLS policies: Users can read their own subscriptions and usage; service role can write all
  - Seed `subscription_plans` with 3 tiers:
    - `free`: ai_generations_per_month=1, scans_per_day=10, analytics=false, coaching=false
    - `basic`: ai_generations_per_day=10, unlimited_scans=true, analytics=false, coaching=false, price_monthly=29900
    - `pro`: unlimited_ai=true, unlimited_scans=true, analytics=true, coaching=true, price_monthly=49900, price_yearly=399900
  - Add indexes on `subscriptions(user_id)`, `feature_usage(user_id, feature_key, period_start)`, `webhook_events(processed_at)`
  - Add `updated_at` trigger function (reuse if exists from prior migrations)

  **Must NOT do**:
  - Do NOT modify existing tables (`user_workout_plans`, `user_meal_plans`, etc.)
  - Do NOT hardcode Razorpay plan IDs in seed data — leave `razorpay_plan_id_monthly` NULL (filled after Task 4)
  - Do NOT create admin-only tables or views

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single SQL migration file — well-scoped database schema task
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 6, 7, 8, 10
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `supabase/migrations/20250129000001_add_user_plan_tables.sql` — Existing migration pattern: table structure, RLS policies, trigger functions — follow same SQL style
  - `supabase/migrations/20250115000004_add_rls_policies.sql` — RLS policy patterns used in this project
  - `supabase/migrations/20250115000001_add_cache_tables.sql` — Table creation conventions (DEFAULT, NOT NULL, TIMESTAMPTZ)

  **API/Type References**:
  - Razorpay subscription statuses: `created → authenticated → active → completed` with branches to `pending → halted`, `paused`, `cancelled`
  - Feature limit keys must match what middleware will check: `ai_generation`, `food_scan`, `chat`

  **External References**:
  - Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security

  **WHY Each Reference Matters**:
  - `20250129000001`: Shows exact SQL conventions (timestamp defaults, UUID generation, foreign key patterns) — must match for consistency
  - `20250115000004`: Shows how RLS policies are structured in this project — must follow same format
  - Feature limit keys: Must be consistent between DB seed, middleware, and frontend — single source of truth

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Migration file is valid SQL
    Tool: Bash
    Preconditions: Migration file created
    Steps:
      1. Run: cat supabase/migrations/20260220000001_add_subscription_tables.sql | head -5
      2. Assert: File starts with valid SQL (CREATE TABLE or comment)
      3. Run: grep -c "CREATE TABLE" supabase/migrations/20260220000001_add_subscription_tables.sql
      4. Assert: Output is 4 (subscription_plans, subscriptions, feature_usage, webhook_events)
    Expected Result: 4 CREATE TABLE statements
    Failure Indicators: Fewer tables, syntax errors, missing semicolons
    Evidence: .sisyphus/evidence/task-3-migration-valid.txt

  Scenario: Seed data contains all 3 tiers
    Tool: Bash
    Preconditions: Migration file contains INSERT statements
    Steps:
      1. Run: grep "INSERT INTO subscription_plans" supabase/migrations/20260220000001_add_subscription_tables.sql
      2. Assert: Contains 'free', 'basic', 'pro' plan IDs
      3. Run: grep "ai_generations_per_month" supabase/migrations/20260220000001_add_subscription_tables.sql
      4. Assert: Free tier has ai_generations_per_month = 1
    Expected Result: All 3 tiers seeded with correct feature limits
    Evidence: .sisyphus/evidence/task-3-seed-data.txt

  Scenario: RLS policies present
    Tool: Bash
    Preconditions: Migration file exists
    Steps:
      1. Run: grep -c "CREATE POLICY" supabase/migrations/20260220000001_add_subscription_tables.sql
      2. Assert: At least 4 policies (read own subscription, read own usage, read plans, etc.)
      3. Run: grep "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260220000001_add_subscription_tables.sql
      4. Assert: All 4 tables have RLS enabled
    Expected Result: RLS enabled on all tables with appropriate policies
    Evidence: .sisyphus/evidence/task-3-rls-policies.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(db): add subscription_plans, subscriptions, feature_usage, and webhook_events tables`
  - Files: `supabase/migrations/20260220000001_add_subscription_tables.sql`
  - Pre-commit: SQL syntax visual check (no automated SQL linter configured)

- [x] 4. Razorpay Plan Creation Script (Test Mode)

  **What to do**:
  - Create a one-time setup script `scripts/create-razorpay-plans.ts` that creates 3 Razorpay subscription plans via their API:
    - `basic_monthly`: ₹299/month (`period: "monthly"`, `interval: 1`, `item.amount: 29900`, `item.currency: "INR"`, `item.name: "FitAI Basic"`)
    - `pro_monthly`: ₹499/month (`period: "monthly"`, `interval: 1`, `item.amount: 49900`, `item.currency: "INR"`, `item.name: "FitAI Pro Monthly"`)
    - `pro_yearly`: ₹3999/year (`period: "yearly"`, `interval: 1`, `item.amount: 399900`, `item.currency: "INR"`, `item.name: "FitAI Pro Yearly"`)
  - Script reads `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from environment variables (`.env` file or CLI args)
  - Script uses `fetch()` to `POST https://api.razorpay.com/v1/plans` with Basic auth
  - Script outputs the created plan IDs in a format ready to copy into Cloudflare Workers secrets / wrangler.jsonc vars
  - Script is idempotent: if plans already exist (check by listing), skip creation
  - Add `scripts/.env.example` with `RAZORPAY_KEY_ID=rzp_test_xxx` and `RAZORPAY_KEY_SECRET=xxx`
  - Note: Plans are IMMUTABLE in Razorpay — once created, they cannot be modified. Create new ones if changes needed.

  **Must NOT do**:
  - Do NOT commit actual Razorpay keys — only `.env.example` with placeholders
  - Do NOT auto-run this script in CI — it's a one-time manual operation
  - Do NOT create plans for free tier (free = no Razorpay plan needed)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single utility script with straightforward Razorpay API calls
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Tasks 6, 17
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `fitai-workers/src/utils/razorpay.ts` (from Task 1) — `razorpayFetch` helper pattern for API calls

  **External References**:
  - Razorpay Create Plan API: `POST /v1/plans` — https://razorpay.com/docs/api/subscriptions/plans/create-plan
  - Razorpay Test Keys: https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/

  **WHY Each Reference Matters**:
  - Create Plan API docs: Exact request/response schema needed — `item.amount` is in paisa, `period` must be "monthly"/"yearly"
  - razorpayFetch pattern: Reuse the same Basic auth pattern as the Workers utility

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Script file exists and is syntactically valid
    Tool: Bash
    Preconditions: Script created
    Steps:
      1. Run: npx tsx --check scripts/create-razorpay-plans.ts
      2. Assert: No syntax errors (exit code 0)
      3. Run: grep "api.razorpay.com/v1/plans" scripts/create-razorpay-plans.ts
      4. Assert: API endpoint referenced correctly
    Expected Result: Script compiles without errors and targets correct API
    Failure Indicators: Syntax errors, wrong API URL
    Evidence: .sisyphus/evidence/task-4-script-valid.txt

  Scenario: .env.example contains required vars
    Tool: Bash
    Preconditions: .env.example created
    Steps:
      1. Run: cat scripts/.env.example
      2. Assert: Contains RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET placeholders
      3. Run: grep -c "rzp_test" scripts/.env.example
      4. Assert: At least 1 (shows test key format)
    Expected Result: Example env file with clear placeholder format
    Evidence: .sisyphus/evidence/task-4-env-example.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore: add Razorpay plan creation script for test mode setup`
  - Files: `scripts/create-razorpay-plans.ts`, `scripts/.env.example`
  - Pre-commit: `npx tsx --check scripts/create-razorpay-plans.ts`

- [x] 5. Delete Old IAP Code + Create Subscription Store Stub

  **What to do**:
  - **Delete old IAP service files**:
    - Delete `src/services/SubscriptionService.ts` — the monolithic IAP service (disabled, constructor says "Client-side IAP is disabled")
    - Delete entire `src/services/subscription/` directory (7 files: `index.ts`, `service.ts`, `storage.ts`, `validation.ts`, `purchases.ts`, `plans.ts`, `types.ts`)
    - Remove `react-native-iap` from `package.json` dependencies (will be fully cleaned up in Task 18, but remove the dependency now to catch import errors early)
  - **Fix broken imports** — after deleting, multiple files will have broken imports. Fix them:
    - `src/stores/subscriptionStore.ts`: Currently imports from `../services/subscription` or `../services/SubscriptionService`. Create a minimal **stub** replacement that exports the same store interface but with empty/placeholder implementations:
      ```typescript
      // Temporary stub — will be fully rewritten in Task 10
      // Keep the same Zustand persist+subscribeWithSelector middleware stack
      // State: isLoading, isInitialized, currentPlan (null), subscriptionStatus (null), features (free defaults), usage (zeroed)
      // Actions: all async functions that just log "[stub] not implemented" for now
      // This prevents import errors in consuming components during Wave 1
      ```
    - `src/hooks/usePaywall.ts`: Currently imports from old services. Update imports to point to the stub store. Keep the hook functional but with stub behavior (will be fully rewritten in Task 11)
    - `src/components/subscription/PaywallModal.tsx` and sub-components: May import old types. Fix imports to use stub types. These will be fully rewritten in Task 13 but must compile now.
    - `src/components/subscription/PremiumGate.tsx`, `PremiumBadge.tsx`: Fix any broken imports from old service
  - **Search and fix all import references**:
    - Run `grep -r "SubscriptionService\|services/subscription\|react-native-iap" src/ --include="*.ts" --include="*.tsx"` to find ALL references
    - Fix each reference to either: (a) import from stub store, (b) remove the import if unused, or (c) add a temporary type placeholder
  - **Verify compilation**: After all fixes, `npx tsc --noEmit` should produce no NEW errors from subscription-related files

  **Must NOT do**:
  - Do NOT fully implement the new subscription store — that's Task 10. Only create a minimal stub that exports the same interface with placeholder implementations
  - Do NOT modify any AI handler code (workoutGeneration, dietGeneration, etc.) — only fix subscription-related imports
  - Do NOT delete the paywall UI components — only fix their imports. They'll be redesigned in Task 13
  - Do NOT remove the `react-native-iap` package from node_modules yet — just remove from package.json dependencies

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful import graph analysis, multiple file edits, and ensuring compilation — more than a quick fix
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after initial setup)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4) — but best to start after Task 1 so new types are available
  - **Blocks**: Tasks 9, 10, 11, 18
  - **Blocked By**: Task 1 (needs new types for stub store)

  **References**:

  **Pattern References**:
  - `src/services/SubscriptionService.ts` — File to delete (disabled IAP service, constructor says "Client-side IAP is disabled")
  - `src/services/subscription/` — Directory to delete (7 files: index.ts, service.ts, storage.ts, validation.ts, purchases.ts, plans.ts, types.ts)
  - `src/stores/subscriptionStore.ts` (457 lines) — Current Zustand store that imports from old services. Must be rewritten as minimal stub keeping same export name and middleware pattern (persist + subscribeWithSelector + AsyncStorage)
  - `src/hooks/usePaywall.ts` (118 lines) — Imports from old subscription service. Fix imports to point to stub
  - `src/components/subscription/PaywallModal.tsx` — May import old types. Fix imports
  - `src/components/subscription/PremiumGate.tsx` — May import old types. Fix imports
  - `src/components/subscription/PremiumBadge.tsx` — May import old types. Fix imports

  **API/Type References**:
  - `fitai-workers/src/utils/types.ts` (from Task 1) — New subscription types to use in stub store interface

  **WHY Each Reference Matters**:
  - SubscriptionService.ts + subscription/ directory: These are the DELETE targets — executor must verify they exist before deleting
  - subscriptionStore.ts: CRITICAL — this is consumed by many components. The stub must maintain the same export API to prevent cascading import failures
  - usePaywall.ts + UI components: These import from old services — executor must grep and fix ALL broken imports, not just obvious ones

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Old IAP service files deleted
    Tool: Bash
    Steps:
      1. Run: ls src/services/SubscriptionService.ts 2>&1
      2. Assert: "No such file" (file deleted)
      3. Run: ls src/services/subscription/ 2>&1
      4. Assert: "No such file or directory" (directory deleted)
    Expected Result: Both old IAP service locations are gone
    Failure Indicators: Files still exist
    Evidence: .sisyphus/evidence/task-5-files-deleted.txt

  Scenario: No broken imports from deleted files
    Tool: Bash
    Steps:
      1. Run: grep -r "services/SubscriptionService\|services/subscription/" src/ --include="*.ts" --include="*.tsx" | grep "^[^/]*import"
      2. Assert: Empty output (no imports pointing to deleted files)
      3. Run: grep -r "from.*SubscriptionService\|from.*services/subscription" src/ --include="*.ts" --include="*.tsx"
      4. Assert: Empty output
    Expected Result: Zero imports referencing deleted file paths
    Failure Indicators: Any import still pointing to old paths
    Evidence: .sisyphus/evidence/task-5-no-broken-imports.txt

  Scenario: Subscription store stub compiles
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep "subscriptionStore\|usePaywall\|PaywallModal\|PremiumGate" | grep "error TS"
      2. Assert: No TypeScript errors in subscription-related files
    Expected Result: Stub store and all consuming files compile
    Failure Indicators: TypeScript errors in subscription files
    Evidence: .sisyphus/evidence/task-5-stub-compiles.txt

  Scenario: react-native-iap removed from package.json
    Tool: Bash
    Steps:
      1. Run: node -e "const p = require('./package.json'); console.log(p.dependencies['react-native-iap'] || 'removed');"
      2. Assert: Output is "removed" (not a version string)
    Expected Result: react-native-iap no longer in dependencies
    Evidence: .sisyphus/evidence/task-5-iap-removed.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `refactor(subscription): delete old IAP service code and create subscription store stub`
  - Files: (deleted) `src/services/SubscriptionService.ts`, (deleted) `src/services/subscription/*`, `src/stores/subscriptionStore.ts`, `src/hooks/usePaywall.ts`, `package.json`, and any other files with fixed imports
  - Pre-commit: `npx tsc --noEmit` (tolerate pre-existing errors only)

### Wave 2 Tasks (Core Backend — after Wave 1)

- [x] 6. Razorpay Subscription Endpoints

  **What to do**:
  - Create `fitai-workers/src/handlers/subscription.ts` with these Hono handlers:
    - `handleCreateSubscription(c)`: POST — Creates a Razorpay subscription for the authenticated user
      1. Read `plan_id` from request body (e.g., `"basic_monthly"`, `"pro_monthly"`, `"pro_yearly"`)
      2. Look up plan in Supabase `subscription_plans` table to get `razorpay_plan_id_monthly` or `razorpay_plan_id_yearly`
      3. Check if user already has active subscription → return 409 if so
      4. Call `razorpayFetch(env, '/subscriptions', 'POST', { plan_id, customer_notify: 1, total_count: 12, notes: { user_id, plan } })` to create subscription
      5. Insert row into Supabase `subscriptions` table with status `'created'`
      6. Return `{ success: true, data: { subscription_id, key_id: env.RAZORPAY_KEY_ID } }` — client uses this to open checkout
    - `handleVerifyPayment(c)`: POST — Verifies Razorpay payment signature after checkout
      1. Read `razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature` from body
      2. Call `verifyPaymentSignature()` from `../utils/razorpay`
      3. If valid: Update subscription status to `'authenticated'` in Supabase, return success
      4. If invalid: Return 400 with `PAYMENT_VERIFICATION_FAILED`
    - `handleWebhook(c)`: POST — Processes Razorpay webhook events (NO auth middleware — public endpoint with signature verification)
      1. Read raw body as string (c.req.text())
      2. Verify webhook signature from `X-Razorpay-Signature` header using `verifyWebhookSignature()`
      3. Check `x-razorpay-event-id` against `webhook_events` table for deduplication — if exists, return 200 (already processed)
      4. Parse body as JSON, extract `event` and `payload.subscription.entity`
      5. Handle events: `subscription.activated` → set status `active`, `subscription.charged` → update `current_period_start/end`, `subscription.pending` → set `pending`, `subscription.halted` → set `halted`, `subscription.paused` → set `paused`, `subscription.resumed` → set `active`, `subscription.cancelled` → set `cancelled`
      6. Insert into `webhook_events` for idempotency
      7. Always return 200 (even on internal errors — log error but don't trigger Razorpay retry storm)
    - `handleGetSubscriptionStatus(c)`: GET — Returns current subscription status for authenticated user
      1. Query `subscriptions` table joined with `subscription_plans` for user_id
      2. If no subscription → return free tier defaults from `subscription_plans` where id='free'
      3. Return: `{ plan, status, features: { limits from subscription_plans.features }, current_period_end, is_active }`
  - Register all routes in `fitai-workers/src/index.ts`:
    - `app.post('/api/subscription/create', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleCreateSubscription)`
    - `app.post('/api/subscription/verify', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleVerifyPayment)`
    - `app.post('/api/webhook/razorpay', handleWebhook)` — NO auth middleware, NO rate limit (Razorpay needs unrestricted access)
    - `app.get('/api/subscription/status', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleGetSubscriptionStatus)`

  **Must NOT do**:
  - Do NOT add auth middleware to webhook endpoint — it uses signature verification instead
  - Do NOT re-serialize webhook body before signature check — use `c.req.text()` raw string
  - Do NOT use `razorpay` npm package — use `razorpayFetch()` utility from Task 1
  - Do NOT return non-200 from webhook for internal errors — Razorpay will disable endpoint after 24hr of failures
  - Do NOT store `key_secret` in any response — only return `key_id` (public key)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-handler file with crypto verification, external API calls, database operations, and careful error handling
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction — pure backend

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8)
  - **Blocks**: Tasks 8, 9, 10, 12, 17
  - **Blocked By**: Tasks 1, 3, 4

  **References**:

  **Pattern References**:
  - `fitai-workers/src/handlers/workoutGeneration.ts` — Handler pattern: how to read body, access env, query Supabase, return JSON responses with `c.json({ success, data })` shape
  - `fitai-workers/src/handlers/foodRecognition.ts` — Another handler example with similar auth + error handling patterns
  - `fitai-workers/src/index.ts:222-313` — Route registration pattern: `app.post(path, authMiddleware, rateLimitMiddleware(...), handler)`
  - `fitai-workers/src/utils/razorpay.ts` (from Task 1) — `verifyPaymentSignature`, `verifyWebhookSignature`, `razorpayFetch` utilities
  - `fitai-workers/src/utils/supabase.ts` — `getSupabaseClient(env)` for database operations

  **API/Type References**:
  - `fitai-workers/src/utils/types.ts` (from Task 1) — `RazorpaySubscription`, `RazorpayWebhookEvent`, `SubscriptionTier`, `Env` with Razorpay bindings
  - `fitai-workers/src/utils/errorCodes.ts` (from Task 1) — `FEATURE_LIMIT_EXCEEDED`, `PAYMENT_VERIFICATION_FAILED`, etc.

  **External References**:
  - Razorpay Create Subscription: `POST /v1/subscriptions` — https://razorpay.com/docs/api/subscriptions/create
  - Razorpay Webhook Events: https://razorpay.com/docs/webhooks/subscriptions/
  - Razorpay webhook header: `X-Razorpay-Signature`, dedup: `x-razorpay-event-id`

  **WHY Each Reference Matters**:
  - `workoutGeneration.ts`: Shows exact Hono handler signature, how to get user from context (`c.get('user')`), error response patterns — executor MUST follow same conventions
  - `index.ts:222-313`: Shows exact route registration pattern — must add new routes in same style
  - Webhook docs: Critical for knowing all event types and payload structures — miss one and subscriptions break

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Create subscription endpoint returns subscription_id
    Tool: Bash (curl)
    Preconditions: Workers running locally (npx wrangler dev), Supabase migration applied, Razorpay test keys configured
    Steps:
      1. Get a valid JWT: export TOKEN=$(get-test-token)
      2. Run: curl -s -X POST http://localhost:8787/api/subscription/create \
           -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" \
           -d '{"plan_id":"basic_monthly"}' | jq .
      3. Assert: Response has `.success == true` and `.data.subscription_id` starts with "sub_"
      4. Assert: Response has `.data.key_id` that starts with "rzp_test_"
    Expected Result: { success: true, data: { subscription_id: "sub_xxx", key_id: "rzp_test_xxx" } }
    Failure Indicators: 500 error, missing subscription_id, key_secret in response (SECURITY BUG)
    Evidence: .sisyphus/evidence/task-6-create-subscription.txt

  Scenario: Webhook rejects invalid signature
    Tool: Bash (curl)
    Preconditions: Workers running locally
    Steps:
      1. Run: curl -s -X POST http://localhost:8787/api/webhook/razorpay \
           -H "Content-Type: application/json" \
           -H "X-Razorpay-Signature: invalid_signature_here" \
           -H "X-Razorpay-Event-Id: evt_test_001" \
           -d '{"event":"subscription.activated","payload":{}}' \
           -w "\n%{http_code}"
      2. Assert: HTTP status is 200 (always return 200 to Razorpay) BUT internal processing skipped
      3. Check server logs for signature verification failure message
    Expected Result: 200 status but event not processed (logged as invalid)
    Failure Indicators: Non-200 status (would trigger Razorpay disabling), or event processed despite invalid sig
    Evidence: .sisyphus/evidence/task-6-webhook-invalid-sig.txt

  Scenario: Duplicate webhook event is idempotent
    Tool: Bash (curl)
    Preconditions: First webhook call succeeded
    Steps:
      1. Send valid webhook with event-id "evt_test_002"
      2. Send SAME webhook with SAME event-id "evt_test_002"
      3. Assert: Second call returns 200 but does NOT duplicate database operations
      4. Query Supabase: SELECT count(*) FROM webhook_events WHERE id = 'evt_test_002'
      5. Assert: count = 1 (not 2)
    Expected Result: Exactly one webhook_events row per event ID
    Evidence: .sisyphus/evidence/task-6-webhook-idempotent.txt

  Scenario: Get subscription status returns free tier for new user
    Tool: Bash (curl)
    Preconditions: Workers running, user has no subscription
    Steps:
      1. Run: curl -s http://localhost:8787/api/subscription/status \
           -H "Authorization: Bearer $TOKEN" | jq .
      2. Assert: `.data.plan.id == "free"`
      3. Assert: `.data.features.ai_generations_per_month == 1`
      4. Assert: `.data.features.scans_per_day == 10`
    Expected Result: Free tier with correct feature limits from subscription_plans table
    Evidence: .sisyphus/evidence/task-6-status-free-user.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(subscription): add Razorpay create, verify, webhook, and status endpoints`
  - Files: `fitai-workers/src/handlers/subscription.ts`, `fitai-workers/src/index.ts`
  - Pre-commit: `cd fitai-workers && npx tsc --noEmit`

- [x] 7. Usage Tracking Service

  **What to do**:
  - Create `fitai-workers/src/services/usageTracker.ts` with:
    - `incrementUsage(env, userId, featureKey, periodType)`: Upsert into `feature_usage` table — increment `usage_count` for current period. Use `ON CONFLICT (user_id, feature_key, period_type, period_start) DO UPDATE SET usage_count = feature_usage.usage_count + 1, updated_at = NOW()`. Calculate `period_start` as: daily = today's date, monthly = first day of current month.
    - `checkUsageLimit(env, userId, featureKey, planFeatures)`: Query current usage count vs plan's limit for that feature. Return `{ allowed: boolean, current: number, limit: number, remaining: number }`. For features with `unlimited: true`, always return `allowed: true`.
    - `getUsageSummary(env, userId)`: Return all feature usage for current daily + monthly periods — used by frontend to show "3/10 AI generations used today".
    - `resetExpiredUsage(env)`: Optional — clean up old usage records (could be a scheduled Worker or ignored for MVP, since queries filter by period_start).
  - Feature keys: `'ai_generation'` (covers workout, diet, chat), `'food_scan'` (covers food recognition)
  - Period mapping: `ai_generation` checks both daily (basic tier) and monthly (free tier) limits; `food_scan` checks daily limits
  - Limit lookup: Query `subscription_plans.features` JSONB for the user's current plan — use `features->>'ai_generations_per_day'`, `features->>'ai_generations_per_month'`, `features->>'scans_per_day'`

  **Must NOT do**:
  - Do NOT hardcode any limits — ALL limits come from `subscription_plans.features` JSONB
  - Do NOT create a separate cron job for resets — period_start filtering handles this naturally
  - Do NOT track usage for unlimited features (skip increment when plan says unlimited)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — database operations with upsert logic and JSONB querying
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - `fitai-workers/src/utils/supabase.ts` — `getSupabaseClient(env)` pattern for database access
  - `fitai-workers/src/handlers/workoutGeneration.ts` — How existing handlers query Supabase (`.from('table').select().eq()` pattern)
  - `supabase/migrations/20260220000001_add_subscription_tables.sql` (from Task 3) — `feature_usage` table schema with UNIQUE constraint for upsert

  **API/Type References**:
  - `fitai-workers/src/utils/types.ts` (from Task 1) — `UsageRecord`, `FeatureLimitConfig` types

  **WHY Each Reference Matters**:
  - supabase.ts: Must use same client pattern — singleton per request
  - feature_usage schema: The UNIQUE constraint `(user_id, feature_key, period_type, period_start)` is what makes upsert work — executor must match this exactly in ON CONFLICT clause

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Increment usage and check limit
    Tool: Bash (bun/node REPL or curl against local Workers)
    Preconditions: Supabase migration applied, subscription_plans seeded
    Steps:
      1. Insert test free user subscription in Supabase
      2. Call incrementUsage for 'ai_generation' once
      3. Call checkUsageLimit — expect { allowed: true, current: 1, limit: 1, remaining: 0 }
      4. Call incrementUsage again (2nd time)
      5. Call checkUsageLimit — expect { allowed: false, current: 2, limit: 1, remaining: 0 }
    Expected Result: First call allowed, second blocked (free tier = 1/month)
    Failure Indicators: Both calls allowed (limit not enforced), or first call blocked (off-by-one)
    Evidence: .sisyphus/evidence/task-7-usage-limit.txt

  Scenario: Unlimited plan bypasses limits
    Tool: Bash
    Preconditions: Pro tier subscription for test user
    Steps:
      1. Set test user to pro plan
      2. Call incrementUsage 100 times for 'ai_generation'
      3. Call checkUsageLimit — expect { allowed: true }
    Expected Result: Pro users never hit limits
    Evidence: .sisyphus/evidence/task-7-unlimited-plan.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(subscription): add usage tracking service with configurable limits`
  - Files: `fitai-workers/src/services/usageTracker.ts`
  - Pre-commit: `cd fitai-workers && npx tsc --noEmit`

- [x] 8. Subscription Gate Middleware + Wire into AI Endpoints

  **What to do**:
  - Create `fitai-workers/src/middleware/subscriptionGate.ts` with:
    - `subscriptionGateMiddleware(featureKey: string)` — Returns a Hono middleware function that:
      1. Get `userId` from `c.get('user').id` (runs AFTER authMiddleware)
      2. Query user's subscription from `subscriptions` table joined with `subscription_plans`
      3. If no subscription → treat as free tier (query `subscription_plans` where id='free')
      4. Check if subscription status is `'active'`, `'authenticated'`, or `'pending'` (grace period — allow access during `pending` state)
      5. Call `checkUsageLimit(env, userId, featureKey, planFeatures)` from Task 7
      6. If limit exceeded → return 403 with `{ success: false, error: { code: "FEATURE_LIMIT_EXCEEDED", message: "...", data: { current, limit, plan, upgrade_url } } }`
      7. If allowed → call `incrementUsage()` then `await next()` to proceed to actual handler
      8. Set `c.set('subscription', { plan, features, usage })` so handlers can access subscription info if needed
  - Wire middleware into ALL 4 AI endpoints in `fitai-workers/src/index.ts`:
    - `app.post('/workout/generate', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), subscriptionGateMiddleware('ai_generation'), handleWorkoutGeneration)`
    - `app.post('/diet/generate', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), subscriptionGateMiddleware('ai_generation'), handleDietGeneration)`
    - `app.post('/food/recognize', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), subscriptionGateMiddleware('food_scan'), handleFoodRecognition)`
    - `app.post('/chat/ai', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), subscriptionGateMiddleware('ai_generation'), handleChat)`
  - Order matters: auth → rate limit → subscription gate → handler

  **Must NOT do**:
  - Do NOT modify the existing handler functions — only insert middleware BEFORE them in the chain
  - Do NOT hardcode any limits in the middleware — ALL limits fetched from `subscription_plans.features`
  - Do NOT block access during `pending` status — treat as grace period (user retains current tier access)
  - Do NOT double-count usage (increment only on success path, not on limit check)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex middleware with database queries, usage tracking integration, and careful middleware ordering — architectural decision point
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Wave 1)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7) — but depends on Task 7 completing for `checkUsageLimit`
  - **Blocks**: Tasks 16, 17
  - **Blocked By**: Tasks 1, 6, 7

  **References**:

  **Pattern References**:
  - `fitai-workers/src/middleware/rateLimit.ts` — Existing middleware pattern — `rateLimitMiddleware(config)` returns `async (c, next) => { ... }` — follow EXACT same pattern for subscriptionGate
  - `fitai-workers/src/middleware/auth.ts:26-28` — `AuthContext` interface pattern for setting context variables (`c.set()`)
  - `fitai-workers/src/index.ts:222-313` — Current endpoint registrations — add `subscriptionGateMiddleware` between rate limit and handler
  - `fitai-workers/src/services/usageTracker.ts` (from Task 7) — `checkUsageLimit()`, `incrementUsage()` APIs

  **API/Type References**:
  - `fitai-workers/src/utils/types.ts` (from Task 1) — `Env` bindings, subscription types
  - `fitai-workers/src/utils/errorCodes.ts` (from Task 1) — `FEATURE_LIMIT_EXCEEDED` error code

  **WHY Each Reference Matters**:
  - `rateLimit.ts`: This is the CANONICAL middleware pattern in this codebase — executor must replicate the function-returning-middleware structure exactly
  - `index.ts:222-313`: Shows exact 4 endpoints to modify — executor adds one middleware call per line, between rateLimitMiddleware and handler
  - `usageTracker.ts`: Direct dependency — must call `checkUsageLimit` before allowing request and `incrementUsage` after passing

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Free user blocked after 1 AI generation per month
    Tool: Bash (curl)
    Preconditions: Workers running locally, test user with free tier (no subscription), usage reset
    Steps:
      1. Run first AI call: curl -s -X POST http://localhost:8787/workout/generate \
           -H "Authorization: Bearer $FREE_TOKEN" \
           -H "Content-Type: application/json" \
           -d '{"goals":["strength"]}' -w "\n%{http_code}"
      2. Assert: 200 status (first generation allowed)
      3. Run second AI call (same endpoint)
      4. Assert: 403 status
      5. Assert response body: `.error.code == "FEATURE_LIMIT_EXCEEDED"`
      6. Assert response body has `.error.data.current`, `.error.data.limit`, `.error.data.plan`
    Expected Result: First call succeeds, second call returns 403 with limit info
    Failure Indicators: Second call also succeeds (limit not enforced), or first call blocked
    Evidence: .sisyphus/evidence/task-8-free-user-limit.txt

  Scenario: Pro user unlimited AI generations
    Tool: Bash (curl)
    Preconditions: Test user with active pro subscription
    Steps:
      1. Run 5 AI generation calls in sequence
      2. Assert: All return 200
    Expected Result: No limits for pro tier
    Evidence: .sisyphus/evidence/task-8-pro-unlimited.txt

  Scenario: Middleware order is correct (auth → rate → gate → handler)
    Tool: Bash (grep)
    Preconditions: index.ts has been modified
    Steps:
      1. Run: grep "workout/generate" fitai-workers/src/index.ts
      2. Assert: Line contains `authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), subscriptionGateMiddleware('ai_generation'), handleWorkoutGeneration` in that exact order
      3. Repeat for diet/generate, food/recognize, chat/ai
    Expected Result: All 4 AI endpoints have subscriptionGateMiddleware inserted correctly
    Evidence: .sisyphus/evidence/task-8-middleware-order.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(subscription): add subscription gate middleware and wire into all AI endpoints`
  - Files: `fitai-workers/src/middleware/subscriptionGate.ts`, `fitai-workers/src/index.ts`
  - Pre-commit: `cd fitai-workers && npx tsc --noEmit`

---

### Wave 3 Tasks (Frontend Services — after Wave 2)

- [x] 9. Fresh RazorpayService.ts (Frontend)

  **What to do**:
  - Create `src/services/RazorpayService.ts` — a clean, focused service for frontend Razorpay operations:
    - `createSubscription(planId: string)`: Call Workers API `POST /api/subscription/create` with the plan ID → returns `{ subscription_id, key_id }`
    - `openCheckout(subscriptionId: string, keyId: string, userInfo: { email, name, phone })`: Call `RazorpayCheckout.open({ key: keyId, subscription_id: subscriptionId, name: 'FitAI', prefill: userInfo, theme: { color: '#4F46E5' } })` → returns `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }`
    - `verifyPayment(paymentId, subscriptionId, signature)`: Call Workers API `POST /api/subscription/verify` → returns success/failure
    - `getSubscriptionStatus()`: Call Workers API `GET /api/subscription/status` → returns current plan, features, usage
    - `cancelSubscription()`: Call Workers API `POST /api/subscription/cancel`
    - `pauseSubscription()`: Call Workers API `POST /api/subscription/pause`
    - `resumeSubscription()`: Call Workers API `POST /api/subscription/resume`
  - Use existing API client pattern from `src/config/api.ts` for base URL and auth headers
  - Handle errors gracefully: Razorpay SDK errors (user cancelled, payment failed), network errors, API errors
  - Export as singleton instance (matching project patterns)

  **Must NOT do**:
  - Do NOT include `RAZORPAY_KEY_SECRET` anywhere in this file — only `key_id` (public key) comes from server
  - Do NOT do signature verification on client — server handles this
  - Do NOT cache subscription status — always fetch fresh from server

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — integrating native SDK with API calls and error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12)
  - **Blocks**: Tasks 11, 13, 17
  - **Blocked By**: Tasks 1, 2, 5, 6

  **References**:

  **Pattern References**:
  - `src/config/api.ts` — API base URL and request configuration — use same pattern for Workers API calls
  - `src/services/` — Existing service patterns in the project (singleton, error handling)
  - `src/types/react-native-razorpay.d.ts` (from Task 2) — TypeScript types for RazorpayCheckout.open()

  **External References**:
  - `react-native-razorpay` checkout options: https://razorpay.com/docs/payments/payment-gateway/react-native-integration/standard/
  - Razorpay checkout response: `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }`

  **WHY Each Reference Matters**:
  - `api.ts`: Must use same base URL and auth token injection pattern — inconsistency breaks API calls
  - `react-native-razorpay.d.ts`: TypeScript types define the exact options shape — prevents runtime errors

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: RazorpayService TypeScript compilation
    Tool: Bash
    Preconditions: Service file created
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep "RazorpayService"
      2. Assert: No TypeScript errors in the new file
    Expected Result: Clean compilation
    Evidence: .sisyphus/evidence/task-9-tsc-check.txt

  Scenario: Service exports all required methods
    Tool: Bash
    Preconditions: Service file exists
    Steps:
      1. Run: grep -c "async " src/services/RazorpayService.ts
      2. Assert: At least 7 (createSubscription, openCheckout, verifyPayment, getSubscriptionStatus, cancelSubscription, pauseSubscription, resumeSubscription)
      3. Run: grep "RAZORPAY_KEY_SECRET\|key_secret" src/services/RazorpayService.ts
      4. Assert: Empty output (no secrets in frontend code)
    Expected Result: All methods present, no secrets leaked
    Failure Indicators: Missing methods, or key_secret present in file
    Evidence: .sisyphus/evidence/task-9-exports-check.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(subscription): add fresh RazorpayService for frontend checkout and management`
  - Files: `src/services/RazorpayService.ts`

- [x] 10. Refactor subscriptionStore.ts (Zustand Store)

  **What to do**:
  - Completely rewrite `src/stores/subscriptionStore.ts` to work with the new Razorpay backend:
  - **New state shape**:
    ```typescript
    interface SubscriptionState {
      isLoading: boolean;
      isInitialized: boolean;
      currentPlan: PlanInfo | null;  // { id, name, price_monthly, features }
      subscriptionStatus: SubscriptionStatusType | null;  // 'active', 'paused', etc.
      features: FeatureLimits;  // { ai_generations_per_day, scans_per_day, analytics, coaching, ... }
      usage: UsageSummary;  // { ai_generation: { current, limit, remaining }, food_scan: { ... } }
      currentPeriodEnd: string | null;
    }
    ```
  - **Actions**:
    - `fetchSubscriptionStatus()`: Call `RazorpayService.getSubscriptionStatus()` → populate store
    - `initializeSubscription()`: Called on app launch → fetch status from backend, set isInitialized
    - `refreshUsage()`: Fetch latest usage counts from backend
    - `isPremium()`: Derived — returns true if status is 'active' and plan is 'basic' or 'pro'
    - `canUseFeature(featureKey)`: Check frontend-side if usage allows (for immediate UX — server is source of truth)
    - `clearSubscription()`: Reset store on logout
  - Remove ALL references to `react-native-iap`, `subscriptionService`, `SubscriptionPlan` (old type), `SubscriptionStatus` (old type)
  - Remove trial-related logic (no trials in Razorpay model)
  - Keep `persist` middleware with AsyncStorage for offline access (cache last known status)
  - Replace the stub created in Task 5 with this full implementation

  **Must NOT do**:
  - Do NOT do feature limit enforcement in the store — server is source of truth; store is for UX display only
  - Do NOT cache subscription status longer than 5 minutes — always re-fetch on app foreground
  - Do NOT import old SubscriptionService — use new RazorpayService

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Full Zustand store rewrite with new state shape and API integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12)
  - **Blocks**: Tasks 11, 13, 14
  - **Blocked By**: Tasks 3, 5, 6

  **References**:

  **Pattern References**:
  - `src/stores/subscriptionStore.ts` (current file — 457 lines) — Zustand store structure: `create()`, `persist()`, `subscribeWithSelector()` middleware, AsyncStorage — keep same middleware stack but rewrite state/actions
  - `src/stores/` — Other stores in the project for convention reference (import patterns, naming)

  **API/Type References**:
  - `src/services/RazorpayService.ts` (from Task 9) — API methods to call from store actions
  - `fitai-workers/src/utils/types.ts` (from Task 1) — Backend type definitions to mirror on frontend

  **WHY Each Reference Matters**:
  - Current subscriptionStore.ts: Shows the Zustand middleware stack pattern — must keep `persist + subscribeWithSelector + AsyncStorage` but completely new state shape
  - RazorpayService: Direct dependency — store actions call service methods

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Store compiles and exports correctly
    Tool: Bash
    Preconditions: Store rewritten
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep "subscriptionStore"
      2. Assert: No TypeScript errors
      3. Run: grep "react-native-iap\|SubscriptionService\|isTrialActive" src/stores/subscriptionStore.ts
      4. Assert: Empty output (all old IAP references removed)
    Expected Result: Clean compile, no IAP references
    Evidence: .sisyphus/evidence/task-10-store-clean.txt

  Scenario: Store has required actions
    Tool: Bash
    Preconditions: Store file exists
    Steps:
      1. Run: grep "fetchSubscriptionStatus\|initializeSubscription\|isPremium\|canUseFeature\|clearSubscription" src/stores/subscriptionStore.ts | wc -l
      2. Assert: At least 5 matches (all actions present)
    Expected Result: All required actions exported
    Evidence: .sisyphus/evidence/task-10-store-actions.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(subscription): rewrite subscriptionStore for Razorpay backend integration`
  - Files: `src/stores/subscriptionStore.ts`

- [x] 11. Update usePaywall.ts Hook

  **What to do**:
  - Refactor `src/hooks/usePaywall.ts` (currently 118 lines) to work with new Razorpay flow:
  - **New hook interface**:
    ```typescript
    function usePaywall() {
      return {
        isLoading: boolean;
        showPaywall: boolean;
        currentPlan: PlanInfo;
        plans: PlanInfo[];  // all 3 tiers from backend
        usage: UsageSummary;
        subscribe: (planId: string) => Promise<boolean>;  // full flow: create → checkout → verify
        dismiss: () => void;
        triggerPaywall: (reason: string) => void;  // show paywall with specific upgrade reason
      };
    }
    ```
  - `subscribe(planId)` orchestrates: call `RazorpayService.createSubscription(planId)` → `RazorpayService.openCheckout(...)` → on success: `RazorpayService.verifyPayment(...)` → refresh store → return true. On any failure: show error toast, return false.
  - `triggerPaywall(reason)` sets paywall visible with context (e.g., "You've used your free AI generation this month. Upgrade to continue.")
  - Fetch available plans from backend on mount (or use cached from store)
  - Handle Razorpay SDK dismiss (user closed modal without paying) — not an error, just dismiss paywall

  **Must NOT do**:
  - Do NOT reference react-native-iap in any way
  - Do NOT handle payment processing — delegate entirely to RazorpayService
  - Do NOT hardcode plan prices — fetch from backend

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Hook refactor — relatively small file with clear new interface
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 5, 9, 10

  **References**:

  **Pattern References**:
  - `src/hooks/usePaywall.ts` (current — 118 lines) — Current hook structure to refactor; keep same export name
  - `src/services/RazorpayService.ts` (from Task 9) — Methods to call: createSubscription, openCheckout, verifyPayment
  - `src/stores/subscriptionStore.ts` (from Task 10) — Store to read state from and trigger refresh after payment

  **WHY Each Reference Matters**:
  - Current usePaywall.ts: Must understand current consumers to maintain compatible API where possible
  - RazorpayService: The hook orchestrates the service methods into a single flow

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Hook compiles without IAP references
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep "usePaywall"
      2. Assert: No TypeScript errors
      3. Run: grep "react-native-iap\|IAP\|iap" src/hooks/usePaywall.ts
      4. Assert: Empty output
    Expected Result: Clean compile, no IAP references
    Evidence: .sisyphus/evidence/task-11-hook-clean.txt

  Scenario: Hook exports required interface
    Tool: Bash
    Steps:
      1. Run: grep "subscribe\|dismiss\|triggerPaywall\|showPaywall\|plans" src/hooks/usePaywall.ts | wc -l
      2. Assert: At least 5 matches
    Expected Result: All required methods/properties exported
    Evidence: .sisyphus/evidence/task-11-hook-interface.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(subscription): refactor usePaywall hook for Razorpay checkout flow`
  - Files: `src/hooks/usePaywall.ts`

- [x] 12. Subscription Management Endpoints (cancel, pause, resume)

  **What to do**:
  - Add management handlers to `fitai-workers/src/handlers/subscription.ts`:
    - `handleCancelSubscription(c)`: POST — Cancel the user's active subscription
      1. Look up user's subscription in Supabase
      2. Call `razorpayFetch(env, '/subscriptions/' + razorpay_subscription_id + '/cancel', 'POST', { cancel_at_cycle_end: true })` — cancel at end of current billing cycle (not immediately)
      3. Update Supabase: set `cancelled_at = NOW()` but keep status as `active` until Razorpay webhook confirms cancellation at period end
      4. Return current period end date so UI can show "Your subscription ends on..."
    - `handlePauseSubscription(c)`: POST — Pause subscription (Razorpay supports this for card/UPI)
      1. Call `razorpayFetch(env, '/subscriptions/' + id + '/pause', 'POST', { pause_initiated_by: 'customer' })`
      2. Update Supabase status to `paused`, set `paused_at`
      3. Return success with pause info
    - `handleResumeSubscription(c)`: POST — Resume paused subscription
      1. Call `razorpayFetch(env, '/subscriptions/' + id + '/resume', 'POST', { resume_at: 'now' })`
      2. Update Supabase status back to `active`, clear `paused_at`
      3. Return success
  - Register routes in `fitai-workers/src/index.ts`:
    - `app.post('/api/subscription/cancel', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleCancelSubscription)`
    - `app.post('/api/subscription/pause', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handlePauseSubscription)`
    - `app.post('/api/subscription/resume', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleResumeSubscription)`

  **Must NOT do**:
  - Do NOT cancel immediately — use `cancel_at_cycle_end: true` (user paid for remaining period)
  - Do NOT allow pause/resume on free tier — return 400
  - Do NOT implement upgrade/downgrade in this task — out of scope for MVP

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple Razorpay API integrations with state management
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: Tasks 14, 17
  - **Blocked By**: Tasks 1, 6

  **References**:

  **Pattern References**:
  - `fitai-workers/src/handlers/subscription.ts` (from Task 6) — Add to the same file; follow same handler patterns
  - `fitai-workers/src/utils/razorpay.ts` (from Task 1) — `razorpayFetch()` utility

  **External References**:
  - Razorpay Cancel Subscription: https://razorpay.com/docs/api/subscriptions/cancel
  - Razorpay Pause/Resume: https://razorpay.com/docs/api/subscriptions/pause-subscription

  **WHY Each Reference Matters**:
  - Cancel API docs: `cancel_at_cycle_end` parameter is critical — wrong value = immediate cancellation and angry users
  - Pause/Resume docs: UPI pause limitations (customer-only resume) must be documented in response

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Cancel subscription returns period end date
    Tool: Bash (curl)
    Preconditions: Test user with active subscription
    Steps:
      1. Run: curl -s -X POST http://localhost:8787/api/subscription/cancel \
           -H "Authorization: Bearer $TOKEN" | jq .
      2. Assert: `.success == true`
      3. Assert: `.data.current_period_end` is a valid ISO date
      4. Assert: `.data.message` contains "ends on" or similar
    Expected Result: Subscription cancelled at end of cycle with clear end date
    Evidence: .sisyphus/evidence/task-12-cancel.txt

  Scenario: Free user cannot pause
    Tool: Bash (curl)
    Preconditions: User with no subscription (free tier)
    Steps:
      1. Run: curl -s -X POST http://localhost:8787/api/subscription/pause \
           -H "Authorization: Bearer $FREE_TOKEN" -w "\n%{http_code}"
      2. Assert: 400 status
      3. Assert: Error message about no active subscription
    Expected Result: 400 with clear error for free users
    Evidence: .sisyphus/evidence/task-12-pause-free-user.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(subscription): add cancel, pause, and resume subscription endpoints`
  - Files: `fitai-workers/src/handlers/subscription.ts`, `fitai-workers/src/index.ts`

---

### Wave 4 Tasks (UI + Tests — after Wave 3)

- [x] 13. Paywall UI — 3-Tier Plan Comparison Modal

  **What to do**:
  - Redesign `src/components/subscription/PaywallModal.tsx` and sub-components for Razorpay:
    - **PaywallHeader.tsx**: App logo + "Choose Your Plan" headline + upgrade reason context (from `triggerPaywall(reason)`)
    - **PaywallPlanCard.tsx**: Reusable card showing plan name, price, feature list, CTA button. Highlight "Popular" on Basic tier. Monthly/Yearly toggle for Pro tier only (₹499/mo vs ₹3999/yr — "Save 33%")
    - **PaywallFeaturesList.tsx**: 3-column comparison grid — Free vs Basic vs Pro. Check/X icons for boolean features, numbers for limits (e.g., "1/month" vs "10/day" vs "Unlimited")
    - **PaywallActions.tsx**: Subscribe button calls `usePaywall().subscribe(planId)` → shows loading → handles success (close modal, show confetti/success toast) and failure (show error toast)
  - **PaywallModal.tsx** orchestration:
    1. Fetch plans from store (populated by `usePaywall` hook from backend)
    2. Display current plan highlighted, upgrade options prominent
    3. Monthly/Yearly toggle state (local state)
    4. On plan select → call subscribe → Razorpay native checkout opens → verify → update store → close modal
    5. Dismiss button (X) always available
  - NativeWind styling throughout — match existing app design language
  - Plans must come from backend (via store), NOT hardcoded in UI
  - Responsive layout — works on small phones (320px) to tablets

  **Must NOT do**:
  - Do NOT hardcode plan names, prices, or features in JSX — read from `plans` array provided by hook
  - Do NOT handle payment logic in UI components — delegate to `usePaywall().subscribe()`
  - Do NOT add new npm packages for UI — use existing NativeWind + React Native built-ins
  - Do NOT add animations beyond simple opacity/scale transitions — keep it performant

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI-intensive work — component redesign, responsive layout, visual hierarchy, NativeWind styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Design-to-code for the plan comparison layout and visual polish

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15, 16)
  - **Blocks**: Tasks 17, F3
  - **Blocked By**: Tasks 9, 10, 11

  **References**:

  **Pattern References**:
  - `src/components/subscription/PaywallModal.tsx` — Current modal structure to redesign (keep same file path, rewrite content)
  - `src/components/subscription/paywall/PaywallActions.tsx` — Current sub-component to refactor
  - `src/components/subscription/paywall/PaywallFeaturesList.tsx` — Current features list to refactor
  - `src/components/subscription/paywall/PaywallPlanCard.tsx` — Current plan card to refactor
  - `src/components/subscription/paywall/PaywallHeader.tsx` — Current header to refactor
  - `src/hooks/usePaywall.ts` (from Task 11) — Hook providing `plans`, `subscribe()`, `dismiss()`, `triggerPaywall()`

  **API/Type References**:
  - `src/stores/subscriptionStore.ts` (from Task 10) — `currentPlan`, `features`, `usage` state shape
  - Plan type includes: `{ id, name, display_name, price_monthly, price_yearly, features: { ai_generations_per_day, scans_per_day, analytics, coaching } }`

  **External References**:
  - NativeWind docs: https://www.nativewind.dev/ — className-based styling for React Native

  **WHY Each Reference Matters**:
  - Existing paywall components: Same file paths are reused — executor must know current structure to fully replace content
  - usePaywall hook: The ONLY interface between UI and payment logic — all user actions flow through this hook
  - Store types: UI must display plan info matching exact data shape from backend

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Paywall modal renders 3 tiers from backend data
    Tool: Bash (grep + tsc)
    Preconditions: All paywall components refactored
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep -i "paywall\|PaywallModal\|PlanCard"
      2. Assert: No TypeScript errors in paywall components
      3. Run: grep "hardcoded\|₹299\|₹499\|₹3999" src/components/subscription/paywall/PaywallPlanCard.tsx
      4. Assert: Empty output (no hardcoded prices — all from props/store)
      5. Run: grep "plans\|subscribe\|usePaywall" src/components/subscription/PaywallModal.tsx | wc -l
      6. Assert: At least 3 matches (using hook data)
    Expected Result: Components compile cleanly, prices from data not hardcoded
    Failure Indicators: TypeScript errors, hardcoded prices found
    Evidence: .sisyphus/evidence/task-13-paywall-compile.txt

  Scenario: Monthly/Yearly toggle exists for Pro tier
    Tool: Bash (grep)
    Preconditions: PaywallPlanCard refactored
    Steps:
      1. Run: grep -i "monthly\|yearly\|annual\|toggle\|billing" src/components/subscription/PaywallModal.tsx src/components/subscription/paywall/*.tsx | wc -l
      2. Assert: At least 2 matches (toggle logic exists)
    Expected Result: Billing period toggle present in paywall components
    Evidence: .sisyphus/evidence/task-13-billing-toggle.txt

  Scenario: No react-native-iap references in paywall
    Tool: Bash (grep)
    Steps:
      1. Run: grep -r "react-native-iap\|IAP\|purchaseSubscription\|requestSubscription" src/components/subscription/
      2. Assert: Empty output (all IAP references removed)
    Expected Result: Zero IAP references in subscription UI components
    Evidence: .sisyphus/evidence/task-13-no-iap.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(subscription): redesign paywall UI with 3-tier Razorpay plan comparison`
  - Files: `src/components/subscription/PaywallModal.tsx`, `src/components/subscription/paywall/PaywallActions.tsx`, `src/components/subscription/paywall/PaywallFeaturesList.tsx`, `src/components/subscription/paywall/PaywallPlanCard.tsx`, `src/components/subscription/paywall/PaywallHeader.tsx`

- [x] 14. Subscription Management Screen

  **What to do**:
  - Create `src/screens/profile/SubscriptionManagement.tsx` — a new screen for managing active subscriptions:
    - **Current Plan Section**: Plan name badge (Free/Basic/Pro), status indicator (active/paused/cancelled), renewal date
    - **Usage Section**: Progress bars for each tracked feature:
      - AI Generations: `${current}/${limit} this month` (or "Unlimited" for Pro) with colored progress bar
      - Food Scans: `${current}/${limit} today` with progress bar
      - Analytics: Locked/Unlocked badge
      - Coaching: Locked/Unlocked badge
    - **Actions Section**:
      - If active: "Cancel Subscription" button (red, with confirmation dialog: "Your subscription will remain active until {period_end}")
      - If active: "Pause Subscription" button (yellow, with confirmation)
      - If paused: "Resume Subscription" button (green)
      - If cancelled: "Resubscribe" button (redirect to paywall)
      - "Billing History" link — opens Razorpay `short_url` in in-app browser (from subscription data)
    - **Upgrade CTA**: If on Free/Basic, show upgrade card with next tier benefits
  - Register this screen in the navigation stack (profile section)
  - Add navigation link from Profile screen to this new screen
  - Use NativeWind for all styling

  **Must NOT do**:
  - Do NOT implement upgrade/downgrade flow — redirect to paywall for upgrades
  - Do NOT show Razorpay internal IDs to users — only human-readable plan names and dates
  - Do NOT handle actual API calls in the screen component — use store actions and RazorpayService

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New screen with progress bars, status indicators, action buttons — heavy UI work
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout design for dashboard-style management screen

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 13, 15, 16)
  - **Blocks**: Tasks 17, F3
  - **Blocked By**: Tasks 10, 12

  **References**:

  **Pattern References**:
  - `src/screens/profile/` — Existing profile screens for navigation + layout conventions
  - `src/stores/subscriptionStore.ts` (from Task 10) — `currentPlan`, `subscriptionStatus`, `usage`, `currentPeriodEnd`
  - `src/services/RazorpayService.ts` (from Task 9) — `cancelSubscription()`, `pauseSubscription()`, `resumeSubscription()`

  **API/Type References**:
  - Usage shape: `{ ai_generation: { current: number, limit: number, remaining: number }, food_scan: { ... } }`
  - Plan shape: `{ id, display_name, price_monthly, features }`
  - Subscription status values: `'active' | 'paused' | 'cancelled' | 'pending' | 'halted'`

  **External References**:
  - NativeWind docs: https://www.nativewind.dev/
  - React Navigation: Screen registration pattern

  **WHY Each Reference Matters**:
  - Profile screens: Must match existing navigation patterns and screen conventions
  - Store: All displayed data comes from the store — executor must understand exact state shape
  - RazorpayService: Action buttons call service methods — must know available APIs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Management screen compiles and navigates
    Tool: Bash
    Preconditions: Screen file created and registered
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep "SubscriptionManagement"
      2. Assert: No TypeScript errors
      3. Run: grep "SubscriptionManagement" src/screens/profile/*.tsx src/navigation/*.tsx | wc -l
      4. Assert: At least 2 matches (screen file + navigation registration)
    Expected Result: Screen exists and is registered in navigation
    Failure Indicators: TypeScript errors, screen not found in navigation
    Evidence: .sisyphus/evidence/task-14-management-screen.txt

  Scenario: Usage progress bars use store data
    Tool: Bash (grep)
    Steps:
      1. Run: grep "usage\|current\|limit\|remaining\|progress" src/screens/profile/SubscriptionManagement.tsx | wc -l
      2. Assert: At least 4 matches (usage data referenced for progress bars)
      3. Run: grep "cancelSubscription\|pauseSubscription\|resumeSubscription" src/screens/profile/SubscriptionManagement.tsx | wc -l
      4. Assert: At least 3 matches (all management actions present)
    Expected Result: Screen references usage data and all management actions
    Evidence: .sisyphus/evidence/task-14-management-data.txt

  Scenario: No Razorpay IDs shown in UI
    Tool: Bash (grep)
    Steps:
      1. Run: grep "razorpay_subscription_id\|sub_\|plan_" src/screens/profile/SubscriptionManagement.tsx
      2. Assert: Empty or only in non-displayed logic (not in JSX text content)
    Expected Result: Users see human-readable names only, no internal IDs
    Evidence: .sisyphus/evidence/task-14-no-internal-ids.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(subscription): add subscription management screen with usage tracking and actions`
  - Files: `src/screens/profile/SubscriptionManagement.tsx`, navigation registration file

- [x] 15. Feature Gate UI Components

  **What to do**:
  - Update `src/components/subscription/PremiumGate.tsx`:
    - Wrap any premium-only feature section
    - Check `canUseFeature(featureKey)` from store
    - If limit NOT reached: render children normally, optionally show remaining usage counter ("3 of 10 scans remaining today")
    - If limit reached: render blurred/dimmed children overlay with upgrade CTA card: "You've used all your free AI generations this month. Upgrade to Basic for 10/day."
    - Handle 403 `FEATURE_LIMIT_EXCEEDED` API responses — if an API call returns this error, automatically show upgrade prompt with the returned limit data
  - Update `src/components/subscription/PremiumBadge.tsx`:
    - Small badge component showing "PRO" or "BASIC" next to premium features
    - Shows usage counter: "2/10" next to feature usage indicators
    - Adapts color based on usage (green when plenty, yellow when approaching limit, red when at limit)
  - Create `src/components/subscription/UsageCounter.tsx`:
    - Reusable component: shows `${current}/${limit}` with color-coded progress indicator
    - Used by both PremiumGate and SubscriptionManagement screen
    - Shows "Unlimited" text for Pro tier features with no limit
  - Handle API error integration: When any AI endpoint returns 403 FEATURE_LIMIT_EXCEEDED, the error handler should trigger `usePaywall().triggerPaywall(reason)` with context from the error response

  **Must NOT do**:
  - Do NOT enforce limits on the frontend — display only, server is source of truth
  - Do NOT block UI navigation to premium screens — only block the ACTION (e.g., "Generate Workout" button disabled, but user can view the screen)
  - Do NOT add intrusive full-screen blocks — subtle inline prompts preferred

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI components with dynamic states, color transitions, and usage visualization
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Visual design for gate overlays and usage indicators

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 13, 14, 16)
  - **Blocks**: Tasks 17, F3
  - **Blocked By**: Tasks 10, 11

  **References**:

  **Pattern References**:
  - `src/components/subscription/PremiumGate.tsx` — Current gate component to update (keep same approach, add usage awareness)
  - `src/components/subscription/PremiumBadge.tsx` — Current badge to update with usage counters
  - `src/hooks/usePaywall.ts` (from Task 11) — `triggerPaywall(reason)` for showing upgrade prompt on limit hit
  - `src/stores/subscriptionStore.ts` (from Task 10) — `canUseFeature()`, `usage` state

  **API/Type References**:
  - Error response shape from backend (Task 8): `{ success: false, error: { code: "FEATURE_LIMIT_EXCEEDED", message: "...", data: { current, limit, plan, upgrade_url } } }`
  - Usage shape: `{ ai_generation: { current, limit, remaining }, food_scan: { current, limit, remaining } }`

  **WHY Each Reference Matters**:
  - PremiumGate.tsx: Must understand current wrapping pattern to preserve backward compatibility
  - Error response shape: Frontend must parse the exact error structure to show contextual upgrade messages
  - Store's canUseFeature: The primary frontend check for displaying limit-reached states

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: PremiumGate and UsageCounter compile
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep -i "PremiumGate\|PremiumBadge\|UsageCounter"
      2. Assert: No TypeScript errors
      3. Run: ls src/components/subscription/UsageCounter.tsx
      4. Assert: File exists (new component created)
    Expected Result: All gate components compile cleanly
    Evidence: .sisyphus/evidence/task-15-gate-compile.txt

  Scenario: PremiumGate uses store for feature checking
    Tool: Bash (grep)
    Steps:
      1. Run: grep "canUseFeature\|useSubscription\|subscriptionStore" src/components/subscription/PremiumGate.tsx | wc -l
      2. Assert: At least 2 matches (store integration present)
      3. Run: grep "FEATURE_LIMIT_EXCEEDED\|triggerPaywall" src/components/subscription/PremiumGate.tsx | wc -l
      4. Assert: At least 1 match (error handling integration)
    Expected Result: Gate component integrates with store and handles API errors
    Evidence: .sisyphus/evidence/task-15-gate-integration.txt

  Scenario: No frontend enforcement of limits
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "throw\|reject\|block\|prevent" src/components/subscription/PremiumGate.tsx
      2. Assert: No hard-blocking logic — only visual indicators and CTA display
    Expected Result: Frontend displays limits but doesn't enforce — server is source of truth
    Evidence: .sisyphus/evidence/task-15-no-enforcement.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(subscription): update feature gate UI with usage counters and limit-reached prompts`
  - Files: `src/components/subscription/PremiumGate.tsx`, `src/components/subscription/PremiumBadge.tsx`, `src/components/subscription/UsageCounter.tsx`

- [x] 16. Backend Tests

  **What to do**:
  - Create comprehensive test files in `fitai-workers/test/`:
    - `fitai-workers/test/subscription.test.ts` — Subscription endpoint tests:
      - POST /api/subscription/create: valid plan → subscription ID returned; invalid plan → 400; unauthenticated → 401
      - POST /api/subscription/verify: valid signature → 200 + subscription active; invalid signature → 400
      - GET /api/subscription/status: active user → full plan info + usage; free user → free tier defaults
      - POST /api/subscription/cancel: active → cancelled_at set; free → 400
      - POST /api/subscription/pause: active → paused; POST /api/subscription/resume: paused → active
      - Webhook POST: valid signature → 200; invalid → 401; idempotent reprocessing → 200
    - `fitai-workers/test/usageTracker.test.ts` — Usage tracking tests:
      - incrementUsage: counter increases correctly; respects period boundaries
      - checkUsageLimit: free user at limit → blocked; under limit → allowed; pro user → always allowed
      - resetUsage: counters reset correctly at period boundary
      - Concurrent usage increments: no race conditions (if applicable)
    - `fitai-workers/test/subscriptionGate.test.ts` — Middleware tests:
      - Free user first request → passes; second request (over limit) → 403
      - Basic user within limit → passes; over limit → 403
      - Pro user → always passes (unlimited)
      - User with paused subscription → treated as grace period (passes)
      - Error response format matches spec: `{ success: false, error: { code: "FEATURE_LIMIT_EXCEEDED", data: { current, limit, plan } } }`
    - `fitai-workers/test/razorpay.test.ts` — Razorpay utility tests:
      - razorpayFetch: correct Basic auth header construction; handles 200, 400, 500 responses
      - verifyWebhookSignature: valid HMAC → true; invalid → false; empty body → false
      - verifyPaymentSignature: valid → true; tampered → false
  - Mock Razorpay API responses (no real API calls in tests)
  - Mock Supabase client responses
  - Use vitest or bun test (whichever is configured in fitai-workers)
  - Target: minimum 20 test cases total across all files

  **Must NOT do**:
  - Do NOT make real Razorpay API calls in tests — mock all external calls
  - Do NOT make real Supabase calls — mock database operations
  - Do NOT test frontend code in these backend tests
  - Do NOT add test framework dependencies if one already exists (check package.json first)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex test setup with mocking, multiple test files, edge case coverage
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 13, 14, 15)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 6, 7, 8

  **References**:

  **Pattern References**:
  - `fitai-workers/test/` — Existing test directory (check for existing test patterns, test config, mock utilities)
  - `fitai-workers/package.json` — Test framework configuration (check "scripts.test" and devDependencies)
  - `fitai-workers/src/handlers/subscription.ts` (from Tasks 6, 12) — Handlers being tested
  - `fitai-workers/src/services/usageTracker.ts` (from Task 7) — Usage tracking being tested
  - `fitai-workers/src/middleware/subscriptionGate.ts` (from Task 8) — Middleware being tested
  - `fitai-workers/src/utils/razorpay.ts` (from Task 1) — Razorpay utilities being tested

  **External References**:
  - Razorpay test mode: https://razorpay.com/docs/payments/test-mode/ — Test keys and expected behaviors
  - Vitest mocking: https://vitest.dev/guide/mocking.html (if vitest is used)

  **WHY Each Reference Matters**:
  - Existing test directory: Must follow established test patterns for consistency
  - Handler/service files: These are the actual units being tested — need to understand their interfaces to write correct mocks
  - Razorpay test mode docs: Understanding test vs live behavior differences

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All test files exist and pass
    Tool: Bash
    Steps:
      1. Run: ls fitai-workers/test/subscription.test.ts fitai-workers/test/usageTracker.test.ts fitai-workers/test/subscriptionGate.test.ts fitai-workers/test/razorpay.test.ts
      2. Assert: All 4 files exist
      3. Run: cd fitai-workers && bun test 2>&1
      4. Assert: Exit code 0 (all tests pass)
      5. Count total test cases in output
      6. Assert: At least 20 test cases total
    Expected Result: 4 test files, all tests passing, 20+ test cases
    Failure Indicators: Missing files, test failures, fewer than 20 tests
    Evidence: .sisyphus/evidence/task-16-test-results.txt

  Scenario: Tests mock external services (no real API calls)
    Tool: Bash (grep)
    Steps:
      1. Run: grep -r "mock\|Mock\|vi.fn\|jest.fn\|stub" fitai-workers/test/ | wc -l
      2. Assert: At least 10 mock usages across test files
      3. Run: grep -r "rzp_live\|rzp_test.*real\|fetch.*razorpay\.com" fitai-workers/test/
      4. Assert: Empty (no real API calls)
    Expected Result: All external calls properly mocked
    Evidence: .sisyphus/evidence/task-16-mocking-check.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `test(subscription): add comprehensive backend tests for subscription endpoints and middleware`
  - Files: `fitai-workers/test/subscription.test.ts`, `fitai-workers/test/usageTracker.test.ts`, `fitai-workers/test/subscriptionGate.test.ts`, `fitai-workers/test/razorpay.test.ts`

---

### Wave 5 Tasks (Integration + Cleanup — after Wave 4)

- [x] 17. E2E Integration Test

  **What to do**:
  - Create `fitai-workers/test/integration/subscription-flow.test.ts` — end-to-end flow tests that test multiple components working together:
    - **Flow 1 — Free user hits limit**:
      1. Create test user (free tier, no subscription)
      2. Call `POST /workout/generate` → 200 (first generation)
      3. Call `POST /workout/generate` again → 403 with FEATURE_LIMIT_EXCEEDED
      4. Verify error response includes: current count, limit, plan name, upgrade suggestion
    - **Flow 2 — Full subscription lifecycle**:
      1. Call `POST /api/subscription/create` with `plan: "basic_monthly"` → get subscription_id
      2. Simulate Razorpay payment (mock checkout) → get payment_id, signature
      3. Call `POST /api/subscription/verify` with payment data → 200
      4. Call `GET /api/subscription/status` → active, basic plan, correct features
      5. Call `POST /workout/generate` 10 times → all succeed (basic limit: 10/day)
      6. Call `POST /workout/generate` 11th time → 403 (limit reached)
    - **Flow 3 — Cancel subscription**:
      1. Active subscriber calls `POST /api/subscription/cancel`
      2. Verify: subscription still active until period end
      3. Simulate webhook `subscription.cancelled` → status updates to cancelled
      4. Verify: user falls back to free tier limits
    - **Flow 4 — Pause and resume**:
      1. Active subscriber calls `POST /api/subscription/pause`
      2. Verify: status is paused, features still accessible (grace period)
      3. Call `POST /api/subscription/resume` → status back to active
    - **Flow 5 — Webhook idempotency**:
      1. Send same webhook event twice (same `x-razorpay-event-id`)
      2. Both return 200
      3. Verify: subscription state only changed once (no double-processing)
    - **Flow 6 — Usage reset at period boundary**:
      1. User at limit (e.g., 1/1 for free tier)
      2. Simulate period boundary (advance time or call reset)
      3. Verify: usage counters reset, user can generate again
  - Use the same test framework as Task 16
  - These tests may need a more complex setup (sequential operations, state management between steps)

  **Must NOT do**:
  - Do NOT make real Razorpay API calls — mock the Razorpay fetch utility
  - Do NOT run these in parallel with unit tests if they share mutable state
  - Do NOT test UI components — backend only

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-step integration flows with state management between steps
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Wave 4 completes)
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: Tasks 6, 7, 8, 12, 16

  **References**:

  **Pattern References**:
  - `fitai-workers/test/` (from Task 16) — Test utilities, mocks, and patterns established in unit tests
  - `fitai-workers/src/handlers/subscription.ts` — All subscription endpoints being tested end-to-end
  - `fitai-workers/src/services/usageTracker.ts` — Usage tracking behavior across flows
  - `fitai-workers/src/middleware/subscriptionGate.ts` — Gating behavior in integration context

  **API/Type References**:
  - Full endpoint list: POST /api/subscription/create, POST /api/subscription/verify, GET /api/subscription/status, POST /api/subscription/cancel, POST /api/subscription/pause, POST /api/subscription/resume, POST /api/webhooks/razorpay
  - Feature limit config (from DB): `{ ai_generations_per_day: 1 (free), 10 (basic), -1 (pro) }`

  **WHY Each Reference Matters**:
  - Unit test mocks (Task 16): Reuse mock utilities instead of rebuilding — DRY test infrastructure
  - Handler files: Integration tests call the full handler chain — need to understand the complete request flow
  - Usage tracker: Flow tests must understand usage counting to verify correct limits after state changes

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All 6 integration flows pass
    Tool: Bash
    Steps:
      1. Run: cd fitai-workers && bun test test/integration/subscription-flow.test.ts 2>&1
      2. Assert: Exit code 0
      3. Assert: All 6 flows (free limit, lifecycle, cancel, pause/resume, idempotency, usage reset) pass
      4. Count test cases: at least 15 assertions across all flows
    Expected Result: All integration flows pass
    Failure Indicators: Any flow fails, fewer than 15 assertions
    Evidence: .sisyphus/evidence/task-17-integration-results.txt

  Scenario: Integration tests don't call real APIs
    Tool: Bash (grep)
    Steps:
      1. Run: grep -c "mock\|Mock" fitai-workers/test/integration/subscription-flow.test.ts
      2. Assert: At least 5 mock usages
    Expected Result: All external dependencies properly mocked
    Evidence: .sisyphus/evidence/task-17-no-real-api.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `test(subscription): add end-to-end integration tests for subscription flows`
  - Files: `fitai-workers/test/integration/subscription-flow.test.ts`

- [x] 18. Cleanup and Final Touches

  **What to do**:
  - **Remove residual IAP references**:
    - Search entire codebase for `react-native-iap`, `SubscriptionService` (old import paths), `IAP`, `inAppPurchase`
    - Remove or update any remaining imports, type references, or dead code
    - Verify `src/services/SubscriptionService.ts` was deleted in Task 5
    - Verify `src/services/subscription/` directory was deleted in Task 5
  - **Update environment configuration**:
    - Update `.env.example` (if exists) with new Razorpay env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_BASIC_MONTHLY`, `RAZORPAY_PLAN_PRO_MONTHLY`, `RAZORPAY_PLAN_PRO_YEARLY`
    - Update `fitai-workers/wrangler.jsonc` — add any new KV bindings or env var references needed
  - **Update documentation**:
    - Update `FEATURE_INVENTORY.md` — reflect new Razorpay-based subscription system, remove IAP references, update feature limits matrix
  - **Final TypeScript check**:
    - Run `npx tsc --noEmit` in both root project and `fitai-workers/` — fix any errors introduced by the subscription work (not pre-existing errors)
  - **Remove `react-native-iap` dependency**:
    - Remove from `package.json` dependencies
    - Run `npm install` to update lockfile
  - **Verify no secrets in frontend code**:
    - Search frontend `src/` for any Razorpay secret keys (should only have public `key_id`)

  **Must NOT do**:
  - Do NOT fix pre-existing TypeScript errors (documented in plan Context) — only fix errors from OUR changes
  - Do NOT modify any handler logic — cleanup only
  - Do NOT add new features or "nice-to-haves" — strict cleanup scope

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cleanup task — search-and-remove, config updates, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (can run alongside Task 17)
  - **Parallel Group**: Wave 5 (with Task 17)
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: Tasks 5, 13, 14, 15

  **References**:

  **Pattern References**:
  - `package.json` — Remove `react-native-iap` from dependencies
  - `fitai-workers/wrangler.jsonc` — Add Razorpay env var bindings
  - `.env.example` — Add Razorpay environment variables
  - `FEATURE_INVENTORY.md` — Update subscription section

  **WHY Each Reference Matters**:
  - package.json: `react-native-iap` must be fully removed — leaving it creates confusion and unnecessary bundle size
  - wrangler.jsonc: Workers need correct env bindings to read Razorpay secrets at runtime
  - FEATURE_INVENTORY.md: Must reflect actual system state — wrong docs cause wrong assumptions

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Zero IAP references remain in codebase
    Tool: Bash (grep)
    Steps:
      1. Run: grep -r "react-native-iap" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
      2. Assert: Empty output
      3. Run: grep -r "SubscriptionService" src/ --include="*.ts" --include="*.tsx" | grep -v "RazorpayService"
      4. Assert: Empty output (old service references gone)
      5. Run: ls src/services/SubscriptionService.ts 2>&1
      6. Assert: "No such file" (file deleted)
      7. Run: ls src/services/subscription/ 2>&1
      8. Assert: "No such file or directory" (directory deleted)
    Expected Result: Complete IAP cleanup — zero traces remain
    Failure Indicators: Any IAP references found, old files still exist
    Evidence: .sisyphus/evidence/task-18-iap-cleanup.txt

  Scenario: No secrets in frontend code
    Tool: Bash (grep)
    Steps:
      1. Run: grep -r "RAZORPAY_KEY_SECRET\|key_secret\|rzp_test_.*secret\|WEBHOOK_SECRET" src/ --include="*.ts" --include="*.tsx"
      2. Assert: Empty output (no secrets in frontend)
    Expected Result: Zero Razorpay secrets in frontend source
    Evidence: .sisyphus/evidence/task-18-no-secrets.txt

  Scenario: TypeScript compiles without new errors
    Tool: Bash
    Steps:
      1. Run: cd fitai-workers && npx tsc --noEmit 2>&1 | wc -l
      2. Note line count (may have pre-existing errors)
      3. Run: npx tsc --noEmit 2>&1 | grep -i "razorpay\|subscription\|usage\|paywall" | wc -l
      4. Assert: 0 (no errors from our new code)
    Expected Result: No new TypeScript errors from subscription work
    Evidence: .sisyphus/evidence/task-18-tsc-check.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `chore(subscription): cleanup IAP references, update env config, and remove react-native-iap`
  - Files: `package.json`, `.env.example`, `fitai-workers/wrangler.jsonc`, `FEATURE_INVENTORY.md`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`
  **RESULT**: Must Have 9/9 ✅ | Must NOT Have 9/9 ✅ | VERDICT: APPROVE (session ses_383fe9146ffecXn8aKOOU6ytiP)

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` in fitai-workers/ + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify Razorpay key_secret is NEVER in frontend code.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`
  **RESULT**: Build PASS | Tests 68/68 | Zero as-any/console.log/key_secret | VERDICT: APPROVE (session ses_383fe462dffeZx4K05CIoMviz3)

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions, expired subscriptions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`
  **RESULT**: Scenarios 20/20 | Integration 20/20 | Edge Cases 6 tested | VERDICT: APPROVE (session ses_383f38d42ffelxcOnBzeD5UCzI)

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`
  **RESULT**: Tasks 15/18 compliant | All 8 Must-NOT-Do guardrails PASS | VERDICT: CONDITIONAL APPROVE (session ses_383fde5e3ffeceJOj33y2nNFPa) — remaining gaps fixed in post-F4 remediation commits

---

## Commit Strategy

| Wave | Commit Message | Files | Pre-commit Check |
|------|---------------|-------|-----------------|
| 1 | `feat(subscription): add types, DB schema, and config scaffolding` | types.ts, migration.sql, app.json, package.json | `tsc --noEmit` in fitai-workers/ |
| 2 | `feat(subscription): add Razorpay endpoints, usage tracking, and feature gating` | subscription.ts, razorpay.ts, usageTracker.ts, subscriptionGate.ts, index.ts | `bun test` in fitai-workers/ |
| 3 | `feat(subscription): add frontend Razorpay service and refactor store` | RazorpayService.ts, subscriptionStore.ts, usePaywall.ts | TypeScript compile check |
| 4 | `feat(subscription): add paywall UI, management screen, and backend tests` | PaywallModal.tsx, SubscriptionManagement.tsx, FeatureGate components, test files | `bun test` |
| 5 | `feat(subscription): integration test and cleanup` | test files, package.json, .env.example | Full test suite |

---

## Success Criteria

### Verification Commands
```bash
# Backend: Workers deploy successfully
cd fitai-workers && npx wrangler deploy --dry-run  # Expected: no errors

# Backend: TypeScript compiles
cd fitai-workers && npx tsc --noEmit  # Expected: 0 errors (new code only)

# Backend: Tests pass
cd fitai-workers && bun test  # Expected: all subscription tests PASS

# API: Create subscription
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/api/subscription/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro_monthly"}'
# Expected: { "success": true, "data": { "subscription_id": "sub_xxx" } }

# API: Feature gating works for free user
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate \
  -H "Authorization: Bearer $FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goals":["strength"]}'
# Expected after limit: { "success": false, "error": { "code": "FEATURE_LIMIT_EXCEEDED" } }

# Frontend: App builds
npx expo export --platform android  # Expected: successful build
```

### Final Checklist
- [ ] All "Must Have" items present and verified
- [ ] All "Must NOT Have" items absent (grep confirmed)
- [ ] All backend tests pass
- [ ] Razorpay test mode payment flow works end-to-end
- [ ] Feature limits enforced server-side for all AI endpoints
- [ ] Limits are configurable via database (no hardcoded values)
- [ ] Paywall UI renders correctly with 3 tiers
- [ ] Subscription management (cancel/pause) works
- [ ] No Razorpay secrets leaked to frontend code
- [ ] Webhook signature verification passes for valid + rejects invalid
