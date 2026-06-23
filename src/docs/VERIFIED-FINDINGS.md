# FitAI — Verified Findings (root-caused, not yet fixed)

> Orchestrator-verified findings. Each has a confirmed root cause traced across the full data flow (store → service → worker → DB → UI) before being recorded here. Severity-ranked. Fixes deferred until the improvement catalog is reviewed — this file exists so nothing is lost across context windows.

Last updated: 2026-06-22

---

## P0-1 — Workout generation breaks for `extreme` activity-level users

**Status:** ✅ FIXED 2026-06-21 (tsc 0, jest 457/82 green, +2 regression tests).

**Symptom:** Any user who selected `extreme` activity level during onboarding cannot generate a weekly workout plan. The request is rejected by the worker's Zod validation (400). Diet generation for the same user works fine.

**Root cause — two-sided contradiction:**

1. The workout request transformer applies `mapActivityLevelForHealthCalc()` at the **workout-request** boundary, converting onboarding `extreme` → health-calc `very_active`:
   - `src/services/aiRequestTransformers.ts:178` — `profile.activityLevel` path (inside `transformForDietRequest`-adjacent profile builder; the `mapActivityLevelForHealthCalc` call at line 178, comment line 177 says "worker TDEE expects this")
   - `src/services/aiRequestTransformers.ts:540-542` — `weeklyPlan.activityLevel` path (inside the workout request builder)

2. But the worker's **workout** Zod enum only allows `extreme`, NOT `very_active`:
   - `fitai-workers/src/utils/validation.ts:173` — `activityLevel: z.enum(['sedentary','light','moderate','active','extreme'])` (UserProfileSchema)
   - `fitai-workers/src/utils/validation.ts:212` — same enum on `weeklyPlan.activityLevel`

3. Even if validation passed, the worker's split scorer only recognizes `extreme`, not `very_active`:
   - `fitai-workers/src/utils/workoutSplits.ts:683` — `else if (activityLevel === 'active' || activityLevel === 'extreme')` — a `very_active` value falls through to the **moderate-recovery** branch, mis-scoring an `extreme` athlete as moderate.

**Why the transformer comment is stale:** The comment at `aiRequestTransformers.ts:177` ("worker TDEE expects this") is wrong for the workout path. TDEE is computed in the health-calc layer (`src/utils/healthCalculations/`), which treats `extreme` as a **backward-compat alias** for `very_active` everywhere (`tdeeCalculation.ts:29-30`, `nutritionCalculators.ts:78-79`, `waterCalculator.ts:33-34`, etc. — ~15 alias sites). So the health-calc layer happily accepts `extreme` directly; the map to `very_active` is unnecessary there and actively harmful at the workout-worker boundary.

**Contrast — diet path is correct:** `fitai-workers/src/utils/validation.ts:417-421` intentionally uses `z.string()` for `activity_level` precisely because both vocabularies can arrive (comment documents this). The workout path should follow the same tolerance, OR (preferred) the transformer should stop mapping at the workout boundary.

**Fix (recommended, minimal, schema-correct):** Remove `mapActivityLevelForHealthCalc` from the **workout-request** builder only (`aiRequestTransformers.ts:540-542`, and the profile path at `:178` if that profile feeds the workout worker). Pass `extreme` through unchanged. The worker Zod enum already accepts `extreme`, and the split scorer already keys on `extreme`. Leave the diet path alone (it works). Add a regression test: a workout-generation request with `activityLevel: 'extreme'` must pass worker validation AND score as high-recovery-capable.

**Alternative fix (broader, deferred):** Align the whole enum vocabulary to one canonical set (health-calc `very_active` everywhere) — but that touches ~15 alias sites + onboarding + DB. Defer; the minimal fix resolves the P0 today.

**Verification commands after fix:**
```bash
npx tsc --noEmit              # exit 0
npx jest                      # must not regress below 455/82 baseline
# + new regression test for extreme activityLevel workout request
```

---

## P0-2 — Diet-save silent failure (false "Meal Plan Generated!" alert + data loss)

**Status:** ✅ FIXED 2026-06-21 (tsc 0, jest 457/82 green).

**Symptom:** After AI generated a weekly meal plan, the user always saw "Meal Plan Generated!" — even when (a) the plan was empty (AI returned 0 meals) or (b) the Supabase `weekly_meal_plans` write failed. On reload the plan vanished. Silent data loss.

**Root cause** (traced store → caller):
- `src/stores/nutritionStore.ts:311-314` — `saveWeeklyMealPlan` returned silently on empty meals (`console.warn` + bare `return`), no throw.
- `src/stores/nutritionStore.ts:437-449` — DB-save catch block explicitly swallowed the error ("Don't throw - local save succeeded"), setting `planError` state but no component read it.
- `src/hooks/useMealPlanning.ts:184-199` — `handleMealPlanResult` ran the success alert unconditionally after the try/catch; its catch only re-threw (which the screen layer swallowed).

**Fix:**
- `nutritionStore.ts` — empty-plan check moved BEFORE the try/catch (the catch's `if (!get().weeklyMealPlan)` fallback was swallowing the throw because `weeklyMealPlan` was already set). Now throws cleanly. DB-save catch re-throws. `planError` state still set.
- `useMealPlanning.ts:184-211` — `handleMealPlanResult` rewritten: on save failure, show `crossPlatformAlert("Couldn't save meal plan", reason)` and `return` before the success alert. Success alert + store update + `incrementUsage` now only fire after a real save.
- **Same pattern fixed in `fitnessStore.ts`** (workout-save silent failure, mirror of P0-2).
- **Verified by integration test** (`nutritionStore.test.ts` "throws when saving an empty meal plan") — the test caught an incomplete first attempt where the throw was swallowed by the catch, proving the value of real verification.

**Note:** This is a store↔hook contract change. Any other caller of `saveWeeklyMealPlan` that relied on it never throwing must be audited. (Verified: `useMealPlanning.handleMealPlanResult` is the only caller per the flow audit.)

---

## P0-4 — HomeScreen crashed for every logged-in user ("Rendered more hooks")

**Status:** ✅ FIXED (structurally). tsc 0, jest 467/0 green. **On-device verification INCONCLUSIVE — see below.** Uncovered ONLY by signing in + testing as a user (no test caught it).

**Symptom:** On sign-in, HomeScreen crashed: `Error: Rendered more hooks than during the previous render.` The ScreenErrorBoundary caught it → "Oops! Something went wrong / Try Again." This happened for EVERY logged-in user since the Aurora modernization commit (`76c889a`). Hidden in dev because the crash only fires when `isLoading` flips true→false (after data loads) — and dev testing rarely completed a full authed load.

**Root cause:** `src/screens/main/HomeScreen.tsx:213-228` — `useAnimatedStyle` (line 228) was called AFTER an early `if (isLoading) return <HomeSkeleton/>` (line 213). On the loading render, the early return skipped `useAnimatedStyle` (fewer hooks). Once data loaded (`isLoading=false`), the main render called `useAnimatedStyle` (more hooks) → React's hook-count invariant violated → crash. React requires hooks unconditionally + same order every render.

**Fix:** Moved `useAnimatedStyle` ABOVE both early returns (`if (showGuestSignUp)` and `if (isLoading)`) so it runs on every render unconditionally. Now verified by re-reading the source: every hook in `HomeScreen` (lines 74-211) sits before the early returns (213, 222). tsc 0, jest 467 passed.

**On-device verification status (HONEST — 2026-06-22, post-fix, fresh bundle):** The fix is **verified live on-device**. Process: cleared logcat buffer (`adb logcat -c`, eliminating the stale-buffer false-signal trap), confirmed Metro served a fresh bundle containing the fix's marker comment (`grep "MUST run before ALL early returns"` in the served bundle = 1 match), force-stopped + relaunched the app, and watched live logcat. Result across the full app init path (bundle load → `loadExistingData` → backend init → guest-mode entry → analytics init):
- `Rendered more hooks` crashes: **0**
- `FATAL EXCEPTION`: **0**
- `ScreenErrorBoundary` triggers: **0**
- `Backend initialized successfully`: 1
- `isGuestMode=true` (guest fallback entered cleanly): 1

The crash that fired for every logged-in user since the Aurora commit does NOT fire with the fix in place. Combined with the deterministic RTL hook-invariant test (`HomeScreen.hookInvariant.test.tsx`, which fails against the reintroduced bug and passes against the fix), the P0-4 question is closed.

**Remaining gap (honest):** The full *authenticated* generate→complete→regenerate loop could not be completed on-device because the emulator has no outbound internet (`ping 8.8.8.8` = 100% loss; only the host bridge `10.0.2.2` works, so Metro loads but Supabase auth can't reach the server → app falls to guest mode). That is an environment limitation, not an app defect. The generation/saving/completeness logic is independently verified via integration tests (`aiService.workout.integration.test.ts`, `aiService.diet.integration.test.ts`, `nutritionStore.test.ts` P0-2 regression).

**Lesson:** When verifying hook-order crashes on-device, (a) `adb logcat -c` before every check to avoid re-reading stale buffer lines, (b) `pm clear` invalidates login state, so a "crash gone" result after `pm clear` is only meaningful if the user is re-signed-in AND HomeScreen actually renders, and (c) confirm the served bundle contains the fix's marker string before trusting on-device behavior.

---

**⚠️ CORRECTION (2026-06-22, E2E verification session):** The "verified live on-device" claim above was a **double false positive** for the authenticated path:

1. **It ran in guest mode** (the record itself shows `isGuestMode=true`), because the prior session's emulator had no outbound network and couldn't reach Supabase auth. Guest mode does NOT trigger the P0-4 crash (different render path), so "0 crashes" proved nothing about the authenticated user.
2. **The device was running a stale pre-fix embedded release bundle.** The installed APK is a release build (`applicationInfo flags=0x0` → no FLAG_DEBUGGABLE, not a dev-client); its embedded `index.android.bundle` (mtime 11:59 AM) predates the fix commit `2934f55` (18:35 PM) by ~6.5h, and the fix marker `MUST run before ALL early returns` is ABSENT from that embedded bundle (`grep -c = 0`). So the device ran the PRE-FIX HomeScreen throughout — the original P0-4 crash.

When this session signed in as `testuser@fitai.dev` (emulator internet now works — DNS+TCP to Supabase verified), the crash fired DETERMINISTICALLY on every authenticated cold start (logcat ×7): `Error: Rendered more hooks than during the previous render.` at HomeScreen, caught by ScreenErrorBoundary. This was NOT a code regression — the fix in source (`HomeScreen.tsx:212`) is correct. An exhaustive re-analysis confirmed real Reanimated `useAnimatedStyle`/`useAnimatedProps` call a fixed number of unconditional hooks (6 each), and every HomeScreen descendant with an early return (`DailyProgressRings`, `HealthIntelligenceHub`, `SyncStatusIndicator`, `BodyProgressCard`, `MotivationBanner`) calls all its own hooks BEFORE the early return — so no second conditional-hook site exists. The crash stops once the fix is in the RUNNING bundle.

**Fix = rebuild + reinstall the APK** (`bash build-both-apks.sh`; the dev APK loads JS from Metro → serves the fixed bundle, the preview APK embeds the freshly-built fixed bundle). Then re-verify on-device: `adb logcat -c` → sign in → assert 0 "Rendered more hooks" matches. See `src/docs/E2E-VERIFICATION-PLAN.md` "Execution results" for the full evidence chain.

**Reinforced lesson:** the "served bundle" check in the original record grepped `localhost:8081/index.bundle` (the HOST Metro bundle) — which DID contain the marker — but the DEVICE was running the embedded APK bundle, which did NOT. Always verify the marker is in the bundle the DEVICE actually executes (the embedded `index.android.bundle` for release builds), not the host Metro bundle. The `exp+fitai://expo-development-client/...` deep link is a no-op against a release build (no dev-client installed).

**Status:** ✅ FIXED (rule-based + AI paths) 2026-06-21. Worker tsc clean for edited files (pre-existing errors elsewhere untouched). 6 new unit tests pass. Main-app jest 457/82 green.

**Symptom:** `weekNumber` (mesocycle week 1-4) only affected the cache key + a text note (`generateProgressionNotes`). The actual sets/reps/rest produced by `assignWorkoutParameters` were IDENTICAL across all 4 weeks — the "progressive overload" product claim was aspirational text, not a real mechanism. Worse, no prior workout history was sent to generation, so each plan was blind to what the user previously lifted.

**Root cause** (traced): `assignWorkoutParameters(workoutDay, profile, safetyProfile)` did not accept `weekNumber`; the call site (`workoutGenerationRuleBased.ts:229`) had `weekNumber` in scope but only passed it to `generateProgressionNotes` (line 241). The AI prompt path (`buildWorkoutPrompt`) never mentioned the week either.

**Fix (applied):**
- `fitai-workers/src/utils/workoutStructure.ts` — added `MESOCYCLE_WEEK_MULTIPLIERS` (W1 baseline, W2 +rep-ceiling volume, W3 +rep-floor intensity +rest, W4 -30% sets / -reps / +rest deload) + `applyMesocycleToReps` helper + optional `weekNumber` param on `assignWorkoutParameters` (default 1, backward-compatible). Multipliers applied after goal adjustments, before medical mods (safety always wins). Cardio excluded from rep changes (time-based).
- `fitai-workers/src/handlers/workoutGenerationRuleBased.ts:229` — passes `weekNumber` through.
- `fitai-workers/src/handlers/workoutGeneration.ts` (`buildWorkoutPrompt`) — injects a "Mesocycle Progressive Overload — Week N of 4" section with explicit scaling instructions so the AI path also honors the mesocycle.
- `fitai-workers/src/utils/workoutStructure.test.ts` — 6 new unit tests pinning: deload < baseline (sets/reps/rest), peak > baseline (reps floor + rest), week-2 volume bump, ≥3 distinct weekly plans, default=week-1 backward-compat, out-of-range clamps to 1-4.

**Not yet done — closed loop (tracked P1-4 below):** Generation still doesn't receive the user's last-completed sets/PRs, so "increase weight 5-10%" is guidance, not computed. This is the larger follow-up.

---

## P1-4 — Closed-loop progressive overload (feed history into generation)

**Status:** ✅ FIXED 2026-06-22. tsc 0, jest 457/82 green.

**Discovery:** `progressionService.ts` (Double Progression engine) + `exerciseHistoryService.getLastSession` already existed but were **never wired into generation** — the audit flagged "no closed loop." This was a wiring task, not a build.

**Fix (4 layers):**
1. **Schema** (`fitai-workers/src/utils/validation.ts`) — added optional `priorPerformance: z.array(...)` to `WorkoutGenerationRequestSchema` (exerciseId, exerciseName, lastSession{completedAt, sets[{setNumber, weightKg, reps, rpe}]}).
2. **Type** (`src/services/fitaiWorkersClient.ts`) — added matching `priorPerformance?: PriorPerformanceEntry[]` + exported `PriorPerformanceEntry` interface.
3. **Fetch** (`src/ai/index.ts`) — added `fetchPriorPerformance()` helper that queries `exercise_sets` (last 200, grouped by exercise_id, top 8 by recency, excludes calibration sets + excluded exercises). Returns `[]` for guests/first-time (non-fatal). Wired into **both** workout-generation call sites (single + weekly).
4. **Prompt** (`fitai-workers/src/handlers/workoutGeneration.ts` `buildWorkoutPrompt`) — injects a "Prior Performance" section: per-exercise last sets + a computed progression target ("last 60kg×8,8,8 → target 61.5kg or 60kg×9") + Double Progression instructions tied to the mesocycle week.

**Effect:** The AI now sees what the user actually lifted last session and prescribes a real progression (increase if top of range hit, hold if RPE 3, deload after 2 tough sessions). Combined with P0-3's week-over-week scaling, progressive overload is now both adaptive (history-driven) and structured (mesocycle-driven).

---

## Security-1 — Cache SELECT policy allows cross-user reads of NULL-user_id entries

**Status:** ✅ FIXED + deployed to production 2026-06-22 (migration `20260622000001` applied via `supabase db push --linked`; live policies verified strict).

**Finding:** `workout_cache` + `meal_cache` SELECT policy (migration `20250129000003`) was:
```sql
USING (auth.uid() = user_id OR user_id IS NULL)
```
The worker wrote `user_id: userId || null` (`fitai-workers/src/utils/cache.ts`). Any entry written without a userId (guest users, legacy rows) was readable by **every** authenticated user via the anon key. `cache_key` is a deterministic hash of request params (not a secret), so an attacker could enumerate keys for common param combinations and read other users' generated plans — which contain personal health data (weight, goals, medical conditions, diet). **Verified on the live production DB before fixing** (the policy qual literally read `(... = user_id) OR (user_id IS NULL)`).

**Root cause confirmed:** No app path relied on the shared/NULL branch. The worker reads via the service role key (bypasses RLS) AND adds `.eq('user_id', userId)` on every read (`cache.ts`), so it never reads NULL rows. The `OR user_id IS NULL` clause was only reachable client-side — exactly the attack surface.

**Fix (2 parts):**
1. Migration `20260622000001_tighten_cache_rls.sql` — DROP + recreate both SELECT policies as strict `(auth.uid() = user_id)` (append-only; original `20250129000003` untouched per principle 7). Existing NULL rows are now invisible to clients and age out via the 7/30-day expiry + `cleanup_expired_cache`.
2. `fitai-workers/src/utils/cache.ts` — stop writing NULL `user_id` for guests. Guests can never read cache (read path filters by userId), so a NULL row was pure pollution that also fed the leak. Guests now get KV-only caching.

**Verification:** Live policies re-queried post-deploy → both now `(auth.uid() = user_id)`. Security advisor: no cache advisories.

**Note:** `cache_key` remains global (NOT folded with userId) — this is the intentional cost-optimization sharing model (two users with identical needs share a generated plan). The `user_id` column tracks last-writer, not ownership. That model is unaffected by this fix; the leak was specifically the NULL-read branch, now closed.

---

## UX-1 — "Continue as Guest" launched the full sign-up flow

**Status:** ✅ FIXED 2026-06-21 (tsc 0, jest 457/82 green).

**Symptom:** On the Welcome screen, tapping "Continue as Guest" ran the **same handler as "Get Started"** — it did not enter guest mode; it launched the full sign-up/onboarding flow. The link was effectively a duplicate of the primary button.

**Root cause:** `WelcomeScreen.tsx:310-312` wired the guest link's `onPress` to `onGetStarted`. `WelcomeScreenProps` had no `onContinueAsGuest` prop at all — the guest path (`authStore.setGuestMode(true)`, which generates a `guestId` + sets `isGuestMode:true`/`isAuthenticated:false`) was never reachable from the welcome screen.

**Fix:**
- `src/screens/onboarding/WelcomeScreen.tsx` — added optional `onContinueAsGuest?: () => void` prop; guest link now calls it (falls back to `onGetStarted` if omitted, for backward compatibility).
- `App.tsx:1272` — passes `onContinueAsGuest` that calls `setGuestModeInStore(true)` (already in scope at `App.tsx:234`, already used at `App.tsx:889`) + `setShowWelcome(false)` so the app shell mounts in guest state.

**Note:** This was originally flagged by the Mobile QA agent as "Continue as Guest not visible at launch" (a Maestro matcher issue) — the real, deeper bug was that the link was wired to the wrong handler.

---

## A11Y-1 — RN view tree not exposed to Android accessibility/uiautomator

**Status:** ✅ FIXED 2026-06-22. On-device verified: uiautomator dump now returns the full view tree.

**Evidence:** `adb shell uiautomator dump` on a running, focused `com.fitai.app/.MainActivity` (JS bundle loaded — Metro confirmed `Android Bundled 3016 modules`, app stable, 52KB screenshot with real content) returns a hierarchy of **6 empty `android.widget.FrameLayout` nodes** — only the native shell containers. The `ReactRootView`'s children (buttons, text, Aurora background, testIDs like `tab-home`) are entirely absent from the accessibility tree. `text=""`, `content-desc=""`, `resource-id=""` on every node.

**Root cause (confirmed):** `AuroraBackground.tsx` ran an infinite `withRepeat(..., -1)` opacity pulse via `react-native-reanimated`. The perpetual animation kept the UI thread "busy," so uiautomator's `waitForIdle()` never resolved → "could not get idle state" → empty dump. This also impacted real users: motion-sensitive users + TalkBack users got a non-idle, non-accessible surface.

**Fix:** `src/components/ui/aurora/AuroraBackground.tsx` now calls the existing `useReducedMotion()` hook (`src/utils/accessibility/hooks.ts`) and skips the infinite pulse when reduce-motion is on: `const shouldAnimate = animated && !reduceMotion`. When the OS "Remove Animations" / reduce-motion setting is enabled (or animation scales set to 0), the Aurora renders static — uiautomator reaches idle, the full view tree is exposed, AND motion-sensitive users get a calm surface. **On-device verified:** with global animation scales at 0, `uiautomator dump` returned **45 nodes** including the full Welcome screen text ("FitAI", "Your AI-Powered Fitness Companion", "Get Started", "Continue as Guest"). This unblocks ALL future Maestro/uiautomator per-screen automation.

**Note:** The fix is opt-in via the OS setting — normal users (reduce-motion off) still see the animated Aurora. This is the correct accessibility behavior, not a visual downgrade.

**Impact:**
1. **Accessibility** — the app is unusable with TalkBack (Android screen reader). Every RN control is invisible to assistive tech. This affects real users with disabilities.
2. **Test automation** — Maestro/uiautomator cannot find any element by testID/text, blocking the entire `.maestro` E2E flow (the QA agent hit this wall).

**Likely cause (needs confirmation):** React Native's accessibility bridge isn't exposing virtual nodes. Suspects: (a) missing `setTestIDentifier`/`accessibilityLabel` propagation in the Aurora component layer, (b) a fabric/old-arch accessibility config gap, (c) the `react-native-reanimated` animated wrappers not setting `accessible`. **Not** caused by today's code changes — reproduces on the prior build too.

**On-device verification outcome:** App launches cleanly with all session fixes (no crash — the release-APK env crash is a separate build-config issue, see below). JS bundle compiles + loads. Visual screenshots capture real UI. But element-level automation is blocked by A11Y-1, so per-screen Maestro capture could not be completed.

## Build-1 — Release APK crashes: EXPO_PUBLIC_* not inlined

**Status:** ✅ FIXED 2026-06-22. The release APK now launches and runs.

**Root cause (confirmed with certainty via `expo export:embed` bundle inspection):**
`babel-preset-expo`'s `inline-env-vars` plugin statically substitutes `EXPO_PUBLIC_*` references — but ONLY for `process.env.X` and `process.env['X']` (literal) forms. Two patterns in `src/services/supabase.ts` defeated it:
1. **Optional chaining** `process.env?.EXPO_PUBLIC_SUPABASE_URL` (line 80) — the `?.` defeats static analysis → left unsubstituted → `undefined` at runtime → throws.
2. **Dynamic bracket access** `process.env[key]` in `getEnvVar` (line 70) — used for `EXPO_PUBLIC_SUPABASE_ANON_KEY` → can't be statically resolved → unsubstituted → `""` fallback → "Missing Supabase environment variables" throw in prod.

**Evidence of fix:** `expo export:embed` bundle now has **0** occurrences of `process.env?.EXPO_PUBLIC_SUPABASE_URL` (was 1) and the URL is inlined as a string literal: `process?"https://mqfrwtmkokivoxgukgsz.supabase.co":(()=>{throw...`.

**On-device verification (real emulator, release APK):** App now `Running "main"` (registered successfully), `Backend initialized successfully`, `isGuestMode=true | guestId=guest-a49ce6b3...`, `Enhanced Local Storage Service initialized`. No `FATAL EXCEPTION`. Previously: crashed instantly with `EXPO_PUBLIC_SUPABASE_URL is required`.

**Fix applied:** `src/services/supabase.ts` — changed `supabaseUrl` + `supabaseAnonKey` to direct static `process.env.EXPO_PUBLIC_*` access (no `?.`, no dynamic key). Kept the `typeof process !== "undefined"` guard for SSR/test safety. Added an explanatory comment so the pattern isn't reintroduced. Also `build-both-apks.sh` now sources `.env.local` before gradle.

**Rule for the codebase:** Never read `EXPO_PUBLIC_*` via optional chaining (`process.env?.X`) or dynamic bracket (`process.env[var]`). Always use `process.env.EXPO_PUBLIC_X` directly. Other files already comply (audited — the Supabase reads were the only crash sites; Google client IDs use dynamic `getEnvVar` but have `|| ""` fallbacks so they degrade gracefully rather than crash).

**Status:** ✅ FIXED (P1-1). The original AI-gen audit reported `src/services/aiRequestTransformers.ts:335-343` fabricated a calorie target by goal (1800 cut / 2200 maintain / 2800 bulk) when both `calorieTarget` and `advancedReview.daily_calories` were missing — violating CLAUDE.md principle 8. **Verified fixed:** the transformer now passes `undefined` when no target is available (with a `console.error` documenting why), so the worker/AI surfaces a missing-target state instead of planning around a made-up deficit. Grep for `1800|2200|2800` returns only the comment describing the prior bug — zero fabrication sites remain.

---

## P1-2 — Worker silently falls back to 70kg weight when metrics missing

**Status:** ✅ FIXED. The original report flagged `fitai-workers/src/handlers/workoutGeneration.ts:335,361` falling back to `weight || 70` when metrics were missing (violating CLAUDE.md principle 8). **Verified fixed:** grep for `|| 70` / `?? 70` across all workers returns zero matches — the worker now returns `0` + warns, consistent with the transformer side. No plan is generated on a 70kg fiction.

---

## P1-3 — `getAIStatus()` audit was based on a dead duplicate

**Status:** ✅ RESOLVED 2026-06-21 (deleted the dead file; the live impl was already honest).

**Correction:** The AI-gen audit flagged `src/ai/service.ts:202` as "always returns isAvailable:true". Tracing the import chain: callers import `from "../ai"` → resolves to the barrel `src/ai/index.ts`, whose `getAIStatus` (`index.ts:847`) is **already honest** — it consults `cachedBackendStatus` and returns `isAvailable:false, mode:"demo"` with a real reason when the last probe failed. The lying version was in `src/ai/service.ts`, a **219-line orphan duplicate** with zero direct importers and a strict-subset method surface. Deleted `service.ts`; tsc + jest green. The only residual is the live `getAIStatus`'s deliberate "optimistic default" when no fresh probe exists (returns `true` to avoid false "unavailable" on first launch) — a documented tradeoff, not a bug.

---

## P2 items (lower severity, batched for later) — see IMPROVEMENTS-CATALOG.md

- ✅ FIXED: `src/ai/index.ts:433` — daily plan no longer hardcodes `fiber: 0`. Now sums fiber from meal/food nutrition (with `dailyTotals.fiber` fallback). `waterIntake: 0` kept (legitimately tracked by hydration store).
- ✅ FIXED: `src/ai/index.ts:998-1027` `handleError` — NetworkError + generic errors now set `retryable: true`; `WorkersAPIError` sets retryable based on status (5xx/429 = retryable, 4xx = not); `AuthenticationError` = not retryable. Callers checking `response.retryable` for retry UX now work.
- ✅ FIXED: `src/services/completionTracking.ts:1128-1148` `_writeExerciseSets` — insert failure no longer silently loses set-level data. Now queues each row via `offlineService.queueAction` (maxRetries 5) for retry, mirroring the `workout_sessions` BUG-4 pattern. The very data progressive overload (P1-4) depends on is now resilient to network blips.
- ✅ FIXED: `src/services/completionTracking.ts:105-107` `calculateActualCalories` — now `console.warn`s when user weight is unavailable (mirroring `calculateWorkoutCalories`), so a zero-calorie workout is traceable at the completion layer.
- ✅ FIXED: `fitai-workers/src/handlers/dietGeneration.ts:572-580` — missing `diet_type` no longer silently skips diet-compliance validation. Now derives `diet_type` from `restrictions` (vegetarian/vegan/pescatarian) so a vegan user can't silently receive a meat dish.
- ✅ FIXED: `src/stores/fitnessStore.ts:108-111` + `src/hooks/useFitnessLogic.ts:444-465` — workout-save silent failure (mirror of diet-save P0-2). `saveWeeklyWorkoutPlan` now throws on empty-plan + DB-save failure; `useFitnessLogic` gates the "Plan Generated!" alert on real save success and shows "Couldn't save workout plan" on failure. No more false success alerts + silent data loss.
- `src/ai/index.ts:622,654,759` debug `console.warn` snapshots left in production paths.
- `src/components/fitness/ExerciseGifPlayer.tsx:49,136-138` play/pause button is a no-op (expo-image can't pause GIFs).
- `fitai-workers/src/utils/mediaProvider.ts:109,150,189` premium video providers have empty maps → mp4 video feature entirely non-functional.
- `src/services/youtubeVideoService.ts:539-583` misleading fallback YouTube IDs labeled as the user's meal.

---

## Open investigations (in flight, await background agents)
