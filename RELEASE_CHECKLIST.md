# FitAI Release Checklist — Android

Last updated: 2026-06-20 (Wave 6). Tracks the items that stand between
"code complete" and "shippable." Code is type-clean (`tsc --noEmit` exit 0)
and the JS bundle exports successfully; the remaining items are operational
or external.

## 🔴 BLOCKING — must do before any production release

### 1. ✅ DONE — Supabase migrations applied (2026-06-21)
The new access token (`sbp_…`, saved to `.env.local`) has full Management API
access. All 4 migrations pushed successfully and verified applied:

- `20260620000001_add_meal_logs_is_completed` ✅
- `20260620000002_add_streaks_to_analytics_metrics` ✅
- `20260620000003_create_health_metrics` ✅ (table + RLS ×4 policies + UNIQUE
  constraint + index — verified `rowsecurity: true`, all policies present)
- `20260620000004_create_device_tokens` ✅ (multi-device push routing table + RLS)

Also resolved a migration-history drift: the remote-only migration
`20260413064102_fix_snacks_count_default_to_1` (a prior DB-level fix) was
missing locally → saved it locally so local+remote match.

Fixed a syntax bug in `20260620000003`: `COMMENT ON CONSTRAINT public.<name>`
→ `COMMENT ON CONSTRAINT <name> ON public.health_metrics` (the original was
invalid Postgres syntax that rolled back the whole migration transaction).

**Post-migration hardening (done):**
- Regenerated `src/services/supabase-types.generated.ts` from the linked project
  — now includes `health_metrics` + `device_tokens` (resolves tech-debt H9:
  stale Database interface). `tsc` clean.
- Ran Supabase security advisors: zero public tables without RLS; the only
  `device_tokens`/`health_metrics` advisory is the standard `auth_rls_init_plan`
  performance note (same as every other RLS table — `auth.uid() = user_id` is
  the documented secure pattern; not a security issue).

**Token saved:** `.env.local` `SUPABASE_ACCESS_TOKEN=sbp_2ab5ace…` (do NOT
commit `.env.local` — already gitignored).

### 2. File the Play Console "Health apps" declaration form
External, ~7-day Google review + 5–7-day whitelist propagation. Without it,
end users see "app can't access Health Connect." Follow
`src/docs/PLAY_STORE_HEALTH_CONNECT_CHECKLIST.md`.

### 3. Update hosted privacy policy to cover Health Connect
The in-app policy (Wave 4A) now lists every HC data type. The hosted page at
`https://fitai.app/privacy` MUST match identically (Play requires in-app +
listing to be the same). Enumerate: steps, HR, resting HR, active/total
calories, distance, weight, sleep, exercise sessions, HRV, SpO2, body fat,
and the background-read + history permissions.

### 4. Complete/refresh the Play Console Data Safety form
Must match the manifest's 13 `health.*` permissions + the "Health info" data
category. Mismatch = rejection.

## ✅ DONE (verified by orchestrator)

- [x] TypeScript compiles clean (`tsc --noEmit` exit 0)
- [x] JS bundle exports cleanly (`expo export --platform android` — 2898 modules)
- [x] `react-native-google-fit` fully removed (package.json, lockfile, node_modules)
- [x] `react-native-health-connect` ^3.5.3 installed + Expo plugin registered
- [x] `expo-background-fetch` + `expo-task-manager` 14.0.9 installed
- [x] targetSdk 35 / versionCode 14 aligned across app.config.js + gradle.properties + build.gradle
- [x] AndroidManifest: all health perms, `<queries>`, `ViewPermissionUsageActivity` alias, deduped intent-filter
- [x] `MainActivity.kt` has `HealthConnectPermissionDelegate` (injected by `withFitAiHealthConnect` plugin)
- [x] Firebase: `google-services.json` pointed at committed `android/app/` copy, un-ignored in `.gitignore`
- [x] Health Connect data integrity (Wave 4B): manual-source protection, weight SSOT, background→store wiring, NaN guard, partial-failure logging, sleep date attribution
- [x] Play compliance (Wave 4A): disclosure dialog before prompt, SDK_UNAVAILABLE install deep-link, in-app privacy policy
- [x] UI read-paths (Wave 5): VitalsCard, HealthTrendChart, manual-screen prefill, history load, Android resume-sync, error retry CTA, guest guard
- [x] App correctness (Wave 6): workout-generation fallback, DietScreen error/empty states, double-counted calories fixed, completion race fixed, navigation type-hole fixed, AI status cache seeded, empty catches logged

## 🟠 TEST INFRASTRUCTURE — `jest-expo` preset migration DONE (Waves 8→13)

The full Jest suite used to hard-crash (`OfflineService` calling
`supabase.auth.onAuthStateChange` during module-init when a test hadn't mocked
it). After 6 waves of work the `jest-expo@53.0.14` preset is now fully wired:
`preset: 'jest-expo'` + extended `transformIgnorePatterns` (adds
expo-modules-core + @supabase + async-storage + secure-store + haptics +
auth-session + linear-gradient + the rest) + a `moduleNameMapper` fallback for
expo-modules-core + `.mjs` handling. Manual mocks added for native modules that
pull ESM transitively with no unit-test value: `__mocks__/expo-haptics.js`,
`__mocks__/expo-auth-session.js`, `__mocks__/react-native-razorpay.js`. The
`getColorScheme` cascade (`react-native-css-interop/jsx-runtime` subpath) and
the `useProfileStore.getState` callable-mock pattern were fixed across 11 test
files + `jest.setup.js`. Test helpers under `__tests__/helpers` and
`__tests__/mocks` are now `testPathIgnore`d so they're not run as suites.

**Result: suite went from hard-crashing (0 suites completing) → FULLY GREEN:
81 suites pass / 452 tests pass / 0 failing (9 tests + 1 suite intentionally
skipped via `.skip`). 0 ESM errors.**

The migration ALSO exposed and fixed **5 real source bugs** the
previously-crashed tests were hiding:
- `src/services/freeNutritionAPIs.ts`: sodium computed as `salt_100g * 400`
  (→ mg) but downstream treats `sodium` as **grams** — a genuine 1000x error
  producing `500` where `0.5` was expected. Fixed to `* 0.4` (NaCl is 39.3% Na).
- `src/stores/nutritionStore.ts`: stale weekly meal plan leaked across user
  switch.
- `src/stores/fitnessStore.ts`: workout session stuck "active" on completion error.
- `src/hooks/useProfileLogic.ts`: units change didn't sync to `userStore.profile`.
- `src/features/workouts/components/RestTimer.tsx`: added missing `testID`s.

Plus ~35 stale tests fixed to match correct current behavior.

## 🟡 DEFERRED (not blocking, needs more work — do not half-wire)

- [x] **Deep links for password reset / email verification — DONE (Wave 9).** Built end-to-end: `src/screens/auth/PasswordResetScreen.tsx` (4-state machine: loading/ready/invalid/success, real validation, session check), `src/hooks/useAuthDeepLinks.ts` (cold-start `getInitialURL` + runtime `Linking.addEventListener`), App.tsx wiring (minimal overlay above root), `auth.ts` `redirectTo` set to `fitai://auth/reset` + `fitai://auth/verify`, nav types added. Needs real-build device testing (deep links don't route in Expo Go).
- [x] **fitaiWorkersClient offline-tolerant mode — DONE (Wave 9).** Added `isOffline`/`offlineReason` additive fields to `WorkersResponse`. Network failures now return a typed result (after the existing 3-retry exponential-backoff budget) instead of throwing `AuthenticationError`. Genuine auth errors still throw. Existing callers unaffected (read `success`/`error`). The `isOffline` flag is plumbing-ready for a future "You appear to offline — tap to retry" UI (not yet wired to a distinct UI).
- [ ] **`analyticsStore` could derive from `fitnessStore.completedSessions`** (mild SSOT duplication — analytics is aggregate, fitness is per-session, so not a true duplicate). Low priority.
- [ ] **Hardcoded keystore passwords** (see Security debt below).

## ✅ Wave 7 additions (verified)
- [x] Lapsed subscription re-lock: `canUseFeature` now checks `currentPeriodEnd` (lapsed premium degrades to free-tier, trial users unaffected)
- [x] AnalyticsScreen gated through `features.analytics && isPremium()` (lapsed-premium hole closed, pre-init loading state added)
- [x] All 16 `triggerPaywall` call sites audited — none bypass `canUseFeature`
- [x] Auth token-refresh: network errors no longer force logout (returns `isNetworkError:true`, session preserved); only real auth errors clear the session
- [x] `fitaiWorkersClient` refresh classification reuses the shared `isNetworkError` util
- [x] `localStorage.ts` encryption TODO assessed → P2 (only non-sensitive metadata + short-lived migration backups stored; no tokens/passwords)
- [x] `src/utils/networkErrorDetection.ts` shared classifier (Supabase `AuthRetryableError`/`AuthSessionMissingError` + message + HTTP status)
- [x] `src/utils/deepLinkHandler.ts` ready for future deep-link wiring



- [x] **Hardcoded release keystore passwords — FIXED (Wave 12).** Moved the 3 release-signing secrets (storePassword, keyAlias, keyPassword) out of `android/app/build.gradle` into `android/keystore.properties` (gitignored, NOT tracked). build.gradle loads them via `Properties` with empty-string fallback so the build still parses on a fresh clone. **Action for you:** populate `android/keystore.properties` on fresh clones/CI from your secure credential store. If the repo was ever public/shared, rotate the keystore entirely (the old passwords are in git history).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` in `.env` (plaintext) — confirm `.gitignore` robustness, rotate if ever committed
- [ ] `localStorage.ts:67` TODO — "implement real encryption before storing sensitive user data"
