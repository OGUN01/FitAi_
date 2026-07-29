# Razorpay Subscription - Learnings

## Task 16: Test Files (2026-02-20)

### Key Discoveries

1. **Hono apps in tests need `app.onError()` for APIError** — Handler functions throw `APIError` instances for validation errors. Without an error handler, Hono returns generic 500. The fix is to add `app.onError()` that checks `err instanceof APIError` and converts to proper JSON response with the correct status code.

2. **Supabase `.maybeSingle()` returns `{ data: null, error: null }` when no row found** — This is different from `.single()` which returns an error. When mocking `maybeSingle()` for "no subscription" scenarios, use `error: null` NOT `error: { message: 'not found' }`. Using the wrong error value triggers fail-closed 500 paths.

3. **Mock chain depth matters** — The `subscriptionGateMiddleware` queries `subscription_plans` with `.select('*').eq('id', 'free').single()` (ONE `.eq()`). An extra `.eq()` in the mock chain causes `undefined` to be returned at runtime, breaking the test.

4. **`@cloudflare/vitest-pool-workers` provides `crypto.subtle` natively** — No need to mock HMAC functions. The Workers runtime in the pool has full Web Crypto API support.

5. **`vi.mock()` works correctly in Workers vitest pool** — Despite running in V8 isolates, `vi.mock()` with module path strings works for mocking dependencies like `../src/utils/supabase`.

6. **Test count achieved: 46→50 tests across 4 files** — Target was 20+. Updated breakdown: razorpay(10), usageTracker(12), subscriptionGate(6), subscription(22).

### Task 16a Continuation — Subscription Tests Enhanced (2026-02-20)

7. **Per-table Supabase mocking** — When a handler queries multiple tables (e.g., `handleGetSubscriptionStatus` hits both `subscriptions` and `subscription_plans`), use `client.from.mockImplementation(table => { switch(table) { ... } })` to return different chains per table. The simpler `makeSupabaseMock()` single-chain approach doesn't work here.

8. **Webhook always returns HTTP 200** — `handleWebhook` intentionally returns 200 for ALL cases (invalid signature, unknown events, processing errors). This prevents Razorpay retry storms. Tests must assert on response body `status` field ("ok"/"error"), NOT HTTP status code.

9. **Free tier cancel returns 400** — `handleCancelSubscription` checks `subscription_tier === 'free'` early and returns 400 without making any Razorpay API call. Good edge case to test since it validates business logic gating.

10. **409 on duplicate active subscription** — `handleCreateSubscription` queries existing subscriptions first. If one is active, returns 409 Conflict. Mock the supabase chain to return `data: [{ id: '...', status: 'active' }]` for the select query.

11. **502 on Razorpay API failure** — When `razorpayFetch` throws (Razorpay is down), handlers should surface a 502 Bad Gateway. Test by having `razorpayFetch.mockRejectedValueOnce(new Error('API error'))`.

12. **`subscription.charged` webhook event** — Updates `current_period_start` and `current_period_end` on the subscription row. Different from `subscription.activated` which changes status. Both are important webhook test scenarios.

## Task 18: Cleanup and Final Touches (2026-02-20)

### Key Discoveries

13. **`react-native-iap` was NOT removed in Wave 1** — Despite the plan saying Wave 1 removed it, the package was still present at `^12.16.4` in `package.json` line 110. Always verify empirically rather than trusting prior-task notes.

14. **Evidence files via bash redirect vs Write tool** — The `grep ... 2>&1 > file.txt` redirect creates empty files when grep finds no matches (exit 1). Use explicit `echo`/`cat` or Write tool to put meaningful content in the evidence files afterward.

15. **wrangler.jsonc supports C-style comments** — Since the format is JSONC (JSON with Comments), adding `// Secrets:` comment blocks before the `vars` section is valid and will not break `wrangler deploy`.

16. **Root `.env.example` vs scripts/.env.example** — Two separate env example files exist. The `scripts/.env.example` (in scripts/ subfolder) already had Razorpay vars from earlier work. The root `.env.example` needed independent updating.

17. **npm install with `--legacy-peer-deps`** — Required due to peer dependency conflicts in the project. After removing `react-native-iap`, `package-lock.json` was updated and committed alongside `package.json`.

### Final State After T18
- `react-native-iap` fully removed from package.json + package-lock.json
- Root `.env.example` has Razorpay section (lines 55-71)
- `fitai-workers/wrangler.jsonc` has secrets comment block before vars section
- Zero IAP refs in `src/` confirmed by grep
- Zero Razorpay secret refs in frontend `src/` confirmed by grep
- Commit: 9afd9e1

## Task 17: Integration Tests for Subscription Flows (2026-02-20)

### Key Discoveries

18. **Integration tests work with `worker.fetch(request, env, ctx)`** — Importing `worker from '../../src/index'` and calling `worker.fetch()` with a full `Request`, `Env`, and `ExecutionContext` exercises the entire Hono middleware chain (logging → CORS → auth → rateLimit → subscriptionGate → handler) without spinning up a server.

19. **Per-table mock configurators scale well** — Using `makeSupabaseMock({ tableName: (chain) => { ... return chain; } })` pattern where `client.from(table)` creates a fresh chain each time and applies a per-table configurator is clean and avoids the "same mock called by multiple middleware" issue that plagues shared-chain approaches.

20. **`client.rpc` must be mocked separately from `client.from`** — The usage tracker calls `supabase.rpc('get_feature_usage')` and `supabase.rpc('increment_feature_usage')` directly on the client, NOT via `.from()`. The mock must have both `client.from` and `client.rpc` configured independently.

21. **Logging middleware tolerates missing Supabase gracefully** — When the auth middleware rejects (401) before setting up the Supabase client, the logging middleware's `logToSupabase()` gets `undefined` for the client. This throws `TypeError: Cannot read properties of undefined (reading 'from')` but is caught by `waitUntil` and doesn't crash the response. Tests that hit 401 see this in stderr but it's benign.

22. **Webhook endpoint doesn't use auth middleware** — The `/api/webhook/razorpay` route uses its own signature verification instead of JWT auth. The webhook request helper doesn't include an Authorization header — it uses `x-razorpay-signature` and `x-razorpay-event-id` headers instead.

23. **`chain.insert` must return a Promise, not a chainable** — When mocking `supabase.from('table').insert(data)`, the return value must be `Promise.resolve({ data: null, error: null })` directly, NOT a chainable object. The handler code awaits the insert call immediately.

24. **18 integration tests first-run success** — All 18 tests passed on first execution with zero fixes needed. The careful pre-analysis of all middleware layers and mock patterns from unit tests (Tasks 16/16a) paid off.

## Task 17-fix: Integration Test Mock Bleed Fix (2026-02-20)

### Key Discovery

25. **`@cloudflare/vitest-pool-workers` shares module mocks across test files** — When `subscriptionGate.test.ts` does `vi.mock('../src/services/usageTracker', () => ({ checkUsageLimit: vi.fn(), incrementUsage: vi.fn() }))`, this module mock persists into `integration/subscription-flow.test.ts` when run in the same pool. The integration test's `vi.resetAllMocks()` only resets call history/implementations, NOT the module mock registration. Result: `checkUsageLimit` becomes a bare `vi.fn()` returning `undefined` instead of the real function, causing the subscription gate to misbehave (gate passes when it should block → 400 Zod error instead of 403).

26. **Fix: Re-declare `vi.mock()` in every file that depends on a module** — The integration test must explicitly `vi.mock('../../src/services/usageTracker', () => ({ checkUsageLimit: vi.fn(), incrementUsage: vi.fn() }))` to "own" the mock. Then configure `checkUsageLimit` directly per-test with `.mockResolvedValue({ allowed: false, current: 1, limit: 1, remaining: 0 })` instead of relying on `client.rpc` mock passthrough. This is more explicit and resistant to mock bleed.

27. **`vi.importActual` is NOT available in `@cloudflare/vitest-pool-workers`** — Cannot use the standard vitest pattern of re-exporting real implementations from a mock factory. Must either reimplement logic inline or mock at the function level and configure per-test.

## Legacy IAP File Cleanup (2026-02-21)
- `PaywallActions.tsx` and `PaywallPlanCard.tsx` in `src/components/subscription/paywall/` were dead code — not exported from any index, not imported anywhere, referenced deleted `SubscriptionService.ts`.
- `src/screens/settings/SubscriptionScreen.tsx` was the old IAP-era subscription screen with stale store shape (`availablePlans`, `trialInfo`, `showPaywallModal`) — not wired to any navigator.
- The live Razorpay paywall is `src/components/subscription/PaywallModal.tsx` and the live subscription screen is `src/screens/profile/SubscriptionManagement.tsx`.
- After deletion + `useHomeLogic.ts` store init fix + UI text fix: `npx tsc --noEmit` reports ZERO errors.
- Commit: ae2b326 `fix(subscription): remove legacy IAP files and fix store init + UI text`


## Subscription Flow Fix (2026-02-22)

- `subscription_plans` table was already seeded (3 rows: free/basic/pro) but anon key returns `[]` due to RLS requiring `auth.role() = 'authenticated'`. Use service_role key to verify data outside app context.
 Supabase `price_monthly`/`price_yearly` are in **paisa** (29900 = ₹299). Must divide by 100 when mapping to UI display values.
 A single `subscription_plans` row for pro generates TWO PlanConfig entries (monthly + yearly). The same Supabase UUID is used for both — backend resolves which Razorpay plan ID to use based on `billing_cycle`.
 The backend expects `{ plan_id, billing_cycle }` NOT `{ planId }`. Field naming convention is snake_case for API bodies.
 `effectiveSelectedId` in PaywallModal falls through to `plans[0]?.id` — once plans are fetched from Supabase with real UUIDs, the button auto-enables without any PaywallModal changes.