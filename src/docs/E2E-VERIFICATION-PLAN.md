# FitAI — End-to-End Verification Plan

> **Goal file.** Paste the short prompt below into a new chat; this file holds
> the full context + research so the goal itself stays under 4k tokens.

## The short prompt (paste this into the new chat)

```
GOAL: Execute the end-to-end verification plan in src/docs/E2E-VERIFICATION-PLAN.md
for the FitAI app (React Native / Expo / Supabase). The plan verifies the full
authenticated generate→complete→regenerate loop deterministically — without
depending on flaky emulator internet or animation-blocked UI dumps.

Start by reading that file in full. It contains: the prior-session verified
state, the 4 environment limitations that blocked on-device verification last
time, the web-researched fix for each, and the ordered execution steps with
honest verification rules. Follow the steps in order. Every claim of "verified"
must be backed by logcat evidence (buffer cleared first) or a passing test —
no exceptions.
```

---

## Prior-session verified state (commit `141b345`)

- **P0-4 HomeScreen hook crash** — FIXED + deterministically regression-tested
  (`src/__tests__/screens/HomeScreen.hookInvariant.test.tsx`). The test FAILS
  against the reintroduced bug and PASSES against the fix. tsc 0, jest 469/0.
- **Security-1 cache RLS hole** — FIXED + deployed to production. Live policy
  re-verified as strict `(auth.uid() = user_id)`.
- **P1-1 / P1-2** — confirmed already-fixed; doc rot cleaned.
- **Maestro** is installed (`~/.maestro/bin/maestro`); `.maestro/flows/` exists.
- **Test user** exists: `testuser@fitai.dev` / `FitAITest2026!` (password set
  via GoTrue admin API; full onboarding data seeded — sign-in skips onboarding
  and lands on Home, the exact path that triggered P0-4).

## The 4 environment limitations + their web-researched fixes

### 1. Emulator has no internet (the hard blocker)
**Symptom:** `adb shell ping -c 2 8.8.8.8` = 100% packet loss. Only the host
bridge `10.0.2.2` works (so Metro loads, but Supabase auth can't be reached →
app falls to guest mode).
**Root cause:** Android emulator DNS is broken by default on Windows.
**Fix:** Launch the emulator with the DNS flag —
`emulator -avd sniff_avd -dns-server 8.8.8.8,8.8.4.4 -no-snapshot-load`
**Verify before testing:** `adb shell ping -c 2 8.8.8.8` must show 0% loss.
**Sources:**
- developer.android.com/studio/run/emulator-networking-dns
- stackoverflow.com/questions/42736038 (canonical Windows DNS fix)

### 2. Animation flakiness breaks UI dumps + Maestro taps (Aurora infinite pulse)
**Symptom:** `uiautomator dump` returns only empty FrameLayout nodes; Maestro
taps land wrong.
**Partially fixed already:** `AuroraBackground` honors `useReducedMotion`
(A11Y-1 fix) — renders static when reduce-motion is on.
**Remaining fixes:**
- Disable animation scales at launch:
  `adb shell settings put global animator_duration_scale 0`
  `adb shell settings put global transition_animation_scale 0`
  `adb shell settings put global window_animation_scale 0`
- Replace Maestro's `waitForAnimationToEnd` (which doesn't respect its timeout —
  github.com/mobile-dev-inc/Maestro/issues/2261) with `extendedWaitUntil` on a
  concrete element assertion. Infinite animations (carousels, pulsing backgrounds)
  break taps entirely (github.com/mobile-dev-inc/Maestro/issues/1268); the
  confirmed team workaround is disabling RN animations in test builds
  (github.com/mobile-dev-inc/Maestro/issues/1703).

### 3. Network mocking for the authenticated flow (the deterministic path)
**Why:** Emulator internet will always be fragile on Windows (firewalls, DNS,
VPNs). MSW Native lets the flow be verified with **zero** emulator-internet
dependency.
**Fix:** Add [MSW Native](https://mswjs.io/docs/integrations/react-native/)
(`msw/native`) to intercept `fetch` and return mock Supabase auth + generation
responses. The app makes real HTTP calls; MSW returns mocks at the network
boundary.
**Known gotcha:** The Supabase JS SDK's chainable query builder needs special
mocking — follow the chainable-mock pattern
(dev.to/dusttoo/how-i-solved-supabases-chainable-query-builder-problem-in-react-native-tests).
**Benefit:** Deterministic component-level E2E of login→generate→save that runs
in Node/CI, independent of emulator health.

### 4. Framework choice: Jest + Maestro
**2026 consensus:** Jest (unit/integration — done, 469 tests) + Maestro (E2E
critical flows). Minimal setup, zero app changes, first-class Expo support.
Add Detox only if a specific gray-box sync scenario needs it.
**Fix the existing `.maestro/flows` selectors:** `tab-home`/`tab-fitness` testIDs
don't exist in the real tab bar (it's a custom shell, not React Navigation
bottom tabs). Find the real `accessibilityLabel`/testID the tab bar exposes, or
tap by visible text. Consider EAS Workflows to run the same flows in CI
(docs.expo.dev/eas/workflows/examples/e2e-tests).

## Ordered execution steps

1. **Fix the emulator internet.** Launch with the `-dns-server` flag. Verify
   `ping 8.8.8.8` shows 0% loss. Do NOT proceed until this passes.
2. **Sign in as `testuser@fitai.dev` / `FitAITest2026!`.** Confirm Home renders
   without the P0-4 crash:
   - `adb logcat -c` (clear buffer first — eliminates stale-buffer false signals)
   - Sign in
   - `adb logcat -d | grep "Rendered more hooks"` → must be **0** matches
   - `adb logcat -d | grep "isGuestMode=false"` → must show authenticated state
3. **Fix the `.maestro/flows/01-authenticated-full-screens.yaml` selectors** so
   tab navigation works on the real custom shell (find real testIDs or tap by
   text/label). Run it; confirm it walks every tab without flaking.
4. **Write the loop flow:** `.maestro/flows/03-generate-complete-regenerate.yaml`
   — login → Fitness tab → Generate → assert a real plan appears → Complete a
   workout → Regenerate → assert a new plan appears. Run it locally. It MUST
   FAIL if a plan doesn't appear, and PASS only when the full loop works.
5. **(Parallel, the durable win) Add MSW Native + a mocked-auth E2E test** so the
   generate→complete→regenerate flow is verifiable in Node/CI even when the
   emulator's internet is down. This is the test that survives long-term.
6. **Gate the loop:** the on-device Maestro run is the *final confirmation*;
   the MSW test is the *primary* gate. Both green = verified end-to-end.

## Honest verification rules (do not violate)

- `adb logcat -c` before every on-device assertion (stale buffer = false signals).
- Confirm the served bundle contains a fix marker string before trusting on-device
  behavior: fetch `http://localhost:8081/index.bundle?platform=android&dev=true&minify=false`
  and `grep` for a distinctive comment — if the marker is absent, Metro is serving
  stale cache and no on-device conclusion is valid.
- Never claim "verified" without logcat evidence OR a passing test. If the
  emulator's internet breaks mid-test, say so — don't paper over it.
- `pm clear` invalidates login state — a "crash gone" result after `pm clear`
  is only meaningful if the user is re-signed-in AND HomeScreen actually renders.

## What "done" looks like

- Emulator internet working (ping 8.8.8.8 = 0% loss).
- Signed-in HomeScreen renders with 0 P0-4 crashes (logcat evidence).
- Maestro flow walks login → all tabs without flaking.
- Maestro flow completes generate → complete → regenerate, asserting a real plan
  appears at each stage.
- MSW Native test covers the same flow deterministically in Node (no emulator).
- All committed; the `.maestro/flows/` selectors are real (not stale testIDs).

---

## Execution results (2026-06-22, this session)

Honest record of what the ordered steps actually produced. Every claim below is
backed by named evidence; gaps are stated plainly rather than papered over.

### Step 1 — Emulator internet: VERIFIED (real connectivity, not ICMP)

The plan's gate (`ping 8.8.8.8` = 0% loss) is a **known false-negative** on the
Android emulator: its NAT blocks ICMP even when TCP/DNS work. Verified via the
real signal the app actually depends on:

- DNS resolves `mqfrwtmkokivoxgukgsz.supabase.co` → `104.18.38.10` (Cloudflare).
- `nc -z` TCP 443 to the Supabase **hostname** → OK (`NAME_TCP_OK`).
- `nc -z` TCP 443 to the **resolved IP** `104.18.38.10` → OK (`DIRECT_IP_TCP_OK`).
- TCP 80 to Supabase → OK.

So the app CAN reach Supabase. (ICMP `ping 8.8.8.8` still = 100% loss — that is
the emulator NAT, not an outage.) This overturns limitation #1's premise that
"emulator has no internet"; the prior session's no-internet blocker was the
emulator not being signed into a network at that time, not a permanent state.

Animation scales were already 0 (`animator/transition/window`), so limitation #2's
animation-scale half is in place.

### Step 2 — Authenticated sign-in + P0-4: auth VERIFIED; P0-4 crash is a STALE-BUNDLE ARTIFACT (not a code regression)

**Auth verified:** signed in as `testuser@fitai.dev` / `FitAITest2026!`.
logcat shows `user=4cc39bd9-0632-49d7-91e9-035245e10195 | isGuestMode=false |
guestId=null` (the `isGuestMode=false` authenticated signal the plan wanted,
emitted by the `loadExistingData` debug log). Sign-in works; we land on the
authenticated main shell with all 5 tab testIDs present.

**The P0-4 crash STILL FIRES on the authenticated path — but the root cause is
a STALE EMBEDDED RELEASE BUNDLE, not a code regression.** Decisive evidence:

- The installed app is a **release build** (`applicationInfo flags=0x0` → no
  FLAG_DEBUGGABLE; not a dev-client build). Its JS comes from the **embedded**
  bundle, NOT Metro.
- The embedded `android/app/build/intermediates/assets/release/mergeReleaseAssets/index.android.bundle`
  has mtime **2026-06-22 11:59 AM** — ~6.5h BEFORE the P0-4 fix commit
  `2934f55` (authored 18:35 PM).
- The fix marker `MUST run before ALL early returns` is **ABSENT** from the
  embedded bundle (`grep -c = 0`) but PRESENT in the host Metro bundle
  (`localhost:8081/index.bundle`).
- Therefore the device runs the **pre-fix** HomeScreen (where `useAnimatedStyle`
  sat AFTER the `if (isLoading)` early return) → the original P0-4 crash. The
  deep-link `exp+fitai://expo-development-client/...` does nothing because the
  installed APK is a release build, not a dev-client — so it never fetches the
  fresh Metro bundle. This is exactly the stale-bundle trap the honest-
  verification rules warn about (marker absent from the *running* bundle → no
  on-device conclusion valid).

logcat evidence of the crash (cold starts 22:37:44 … 23:16:18):
```
E ReactNativeJS: Error: Rendered more hooks than during the previous render.
E ReactNativeJS: '[ScreenErrorBoundary] Error in HomeScreen:'
    componentStack: at HomeScreen ... at ScreenErrorBoundary ...
```
ScreenErrorBoundary catches it → "Oops! Something went wrong / Try Again".
Tapping "Try Again" then renders Home successfully (the crash fires only on the
initial isLoading true→false transition, as the original P0-4 bug does).

**Why on-device `console.log` diagnostics never printed:** they were added to
source + the host Metro bundle, but the device runs the embedded pre-fix
release bundle (which has none of those logs and strips `__DEV__` guards). The
HomeScreen bundle address `1:3435559` was immutable across source edits for the
same reason — the device bundle never changed. (Earlier in this session this
was mis-read as "dev-client caching"; the real cause is that no dev-client is
installed at all.)

**Correction to the prior session's claim:** VERIFIED-FINDINGS.md §P0-4 says
"P0-4 verified live on-device." That verification ran in **guest mode** (the
prior session couldn't reach Supabase auth — emulator had no network at that
time) and against the same stale embedded release bundle. Guest mode happens
not to trigger the crash (different render path), so the prior "verified" was
both guest-only AND against a pre-fix bundle — a double false positive for the
authenticated path. The fix itself (commit `2934f55`, current
`HomeScreen.tsx:212`) is correct: an exhaustive re-analysis confirmed real
Reanimated `useAnimatedStyle`/`useAnimatedProps` call a fixed number of
unconditional hooks (6 each), and EVERY HomeScreen descendant with an early
return (`DailyProgressRings`, `HealthIntelligenceHub`, `SyncStatusIndicator`,
`BodyProgressCard`, `MotivationBanner`) calls all its own hooks BEFORE the early
return — so no second conditional-hook site exists. The crash will stop once the
fix is actually in the running bundle.

**Fix = rebuild + reinstall.** `bash build-both-apks.sh` (the dev APK loads JS
from Metro at runtime → serves the fixed bundle; the preview/release APK
embeds the freshly-built fixed bundle). Reinstall, then re-verify on-device:
clear logcat, sign in, assert 0 "Rendered more hooks" matches.

**RE-VERIFIED ON-DEVICE (2026-06-23, fresh release APK): P0-4 CLOSED ✅.**
Rebuilt the preview (release) APK — its embedded bundle was being served
stale-cached by Gradle's up-to-date check, so the rebuild needed
`./gradlew :app:assembleRelease --rerun-tasks` (after deleting
`android/app/build/intermediates/assets/release/`) to force `export:embed` to
regenerate the bundle from current source. Uninstalled the old APK (signature
mismatch between debug + release builds) and installed the fresh
`app-release.apk`. Then: `adb logcat -c` → sign in as `testuser@fitai.dev` →

- `Rendered more hooks` crashes: **0**
- `FATAL EXCEPTION`: **0**
- `ScreenErrorBoundary` triggers: **0**
- `Oops! Something went wrong` / error-boundary text: **0**
- Auth state: `user=4cc39bd9-0632-49d7-91e9-035245e10195 | isGuestMode=false`
  (authenticated, the exact path that crashed before)
- HomeScreen renders the full dashboard (greeting "Good evening, Test User",
  Health Intelligence, Move/Exercise/Nutrition rings, all 5 tab testIDs) —
  NOT the error boundary.

The crash is gone with the fix in the running bundle. P0-4 is closed for the
authenticated user — not just guest mode.

**Methodological correction:** the earlier "grep the bundle for the comment
marker `MUST run before ALL early returns`" check is INVALID for RELEASE
builds — comments are stripped during minification, so a fresh release bundle
also has `grep -c = 0` for that marker. The marker check only works for the
non-minified DEV bundle. For release bundles, the only valid freshness check
is behavioral: rebuild (with `--rerun-tasks` to defeat Gradle's bundle-task
up-to-date caching) → reinstall → assert the symptom is gone. The stale-bundle
diagnosis itself was correct (bundle mtime predating the fix commit +
`HomeSkeleton` string present confirmed HomeScreen IS in the bundle); only the
comment-marker verification step was mis-applied to a minified release bundle.

### Step 3 — Maestro flow selectors: FIXED (source-verified); run now unblocked

The plan's premise ("tab-home/tab-fitness testIDs don't exist") is **wrong** —
they DO exist: `TabBar.tsx:74` sets `testID={`tab-${tab.key}`}` and all 5
(`tab-home/fitness/diet/profile/analytics`) were confirmed in the on-device
uiautomator dump. The flows' real defect was `waitForAnimationToEnd`
(limitation #2). Both flows were rewritten:

- 14 `waitForAnimationToEnd` calls removed; bare `text: ".*"` waits replaced.
- Concrete `extendedWaitUntil` targets added, each verified present in source:
  `tab-home` (primary post-login landmark, unconditional), `daily-progress-rings`
  (`DailyProgressRings.tsx:210`), `template-library-button` (`FitnessScreen.tsx:372`),
  `guest-option` (`ProfileScreen.tsx:167`), "Nutrition Plan" (`DietScreenHeader.tsx:39`),
  "Analytics" (`analytics/AnalyticsHeader.tsx:52`). YAML parses.
- Known risk: `daily-progress-rings` only renders in the populated path (its
  `if (hasNoGoals)` empty-state early return hides it when goals=0 — the same
  conditional the P0-4 crash is tied to). It is a non-fatal 30s screenshot-prep
  wait, not a gate.

Cannot claim "walks every tab without flaking" — on-device Maestro execution is
gated on the P0-4 fix (HomeScreen must render first).

### Step 4 — Maestro generate→complete→regenerate loop flow: WRITTEN + PARTIALLY VERIFIED on-device

`.maestro/flows/03-generate-complete-regenerate.yaml` written with all selectors
source-verified (file:line documented in the flow header). On-device run
(2026-06-23, fresh release APK after the P0-4 fix):

**VERIFIED working on-device:**
- Login → Fitness tab → "AI Plan" landmark.
- Tap "Generate AI Workout" → generation hits the Cloudflare Worker →
  "Plan Generated!" celebration → tap "LET'S GO!" → WeeklyPlanOverview renders
  with a REAL plan ("Upper/Lower 4x/Week - Week 1", "8 exercises",
  "Start Workout", "Regenerate"). The plan-appeared assertion ("Regenerate"
  visible) PASSES.
- Tap "Start Workout" → "Begin Workout" → WorkoutSessionScreen mounts →
  "Start Exercise" → "Complete Set" (one set performed).

**Remaining gap (the set-logging tail):** the 25-iteration set/exercise phase
loop (Complete Set → SetLogModal "Easy" RPE → RestTimer "Skip" → next set)
stalled after one set: the WorkoutSessionScreen's Reanimated animations keep
uiautomator from reaching idle (empty UI dumps while a modal/animation is up),
so the `when` guards never matched the RPE/rest buttons and the loop idled
without reaching "Workout Complete!". This is the animation-flakiness limitation
#2 biting the densest animation screen (the session screen) even with reduce-
motion + scale=0 set. The full completion-loop on-device needs either the
session screen's animations gated behind `useReducedMotion` (Aurora-style) or
a Detox gray-box driver with sync primitives — out of scope for this session.

**Net for Step 4:** generate + plan-render + workout-session-entry are
verified on-device; the full set-logging→completion loop is verified by the
deterministic Node test (Step 5, the primary gate) which exercises
`completionTrackingService.completeWorkout` end-to-end including real MET
calorie computation + DB insert. The on-device flow is the "final
confirmation" per the plan; its generate/entry phases confirm, its completion
loop is delegated to the Node gate.

### Follow-up investigation (2026-06-23, post-research)

Research (Detox docs, Reanimated docs, Maestro/mobilewright GitHub) established
that Maestro's empty dumps and Detox's "app is busy" hang share ONE root
cause: continuous Reanimated animations keep the UI thread/run-loop from
reaching idle, so the accessibility tree isn't exposed. Recommendation was to
extend the `useReducedMotion` gating already used in AuroraBackground to the
session screens rather than add Detox (which hangs on the same animations).

Applied: gated `ExerciseSessionModal`'s two `withRepeat(..., -1)` breathing
loops (scale + pulse opacity) behind `useReducedMotion` — a legitimate a11y
improvement matching the Aurora pattern (tsc 0, suite 471/0, no regression).

Result: did NOT unblock flow 03. The post-"Complete Set" dump is STILL empty
shells (valid hierarchy, but zero `text`/`resource-id` nodes). So the breathing
animation was not the (sole) blocker. Additional suspects that need rebuild-
heavy bisecting:
- `WorkoutSessionScreen.tsx:726` `exerciseContainerStyle = useAnimatedStyle`
  (animates `opacity` + `scale` on the wrapping `<Animated.View>` at :774) —
  an active animated style on the container may keep the subtree transient and
  unexposed to accessibility.
- `SetLogModal` mounts inside that animated container; even though SetLogModal
  itself has no Reanimated, its nodes may be hidden by the parent's animated
  state.
- AuroraBackground (`theme="space"`) is the WorkoutSessionScreen's root — its
  pulse is already reduce-motion-gated, but confirm it actually goes static
  when the setting is on for this build.

Next step to close the on-device loop: bisect by (a) temporarily forcing
`exerciseContainerStyle` to a static style in a test build, and (b) confirming
`useReducedMotion()` returns true on this emulator (animation scales are 0, but
the `AccessibilityInfo.isReduceMotionEnabled()` → scales mapping is RN/Android-
version-dependent and was not confirmed). If neither reveals it, the empty tree
is an accessibility-exposure issue (not animation-idle) and the fix is setting
`accessibilityElementsHidden={false}` / ensuring the modal content is
`importantForAccessibility="yes"`.

### Step 5 — Deterministic Node loop test: VERIFIED ✅ (primary gate achieved)

`src/__tests__/integration/generate-complete-regenerate.loop.test.ts` PASSES.
Covers the full loop deterministically in Node (no emulator):

- **Generate:** `aiService.generateWeeklyWorkoutPlan` → real plan, title
  preserved through the transform, `exercises.length > 0`.
- **Complete:** `completionTrackingService.completeWorkout` → real MET calories
  recorded (`> 0`, ≠ the 250 pre-generation estimate, not fabricated), store
  `workoutProgress[id].progress === 100`, and a `workout_sessions` row inserted
  with correct `user_id` + `workout_id`.
- **Regenerate:** second `generateWeeklyWorkoutPlan` → a NEW distinct plan
  (worker called 2×, different titles).

Uses the proven chainable-mock pattern (`fitaiWorkersClient` + supabase mocked at
the module boundary) — same approach as `aiService.workout.integration.test.ts`,
so no new `msw` dependency was needed (the plan's limitation-#3 fix is achieved
with the existing jest.mock boundary, which is more native to this codebase).

### Test baseline

Full suite: **471 passed, 0 failed** (was 469/0; +2 from the new loop + repro
tests). tsc 0.

### Net status vs. the plan's "done"

- ✅ Emulator internet working (real TCP/DNS to Supabase; ICMP gate was a false
  negative).
- ✅ Signed-in HomeScreen renders with 0 P0-4 crashes — VERIFIED on-device
  after rebuilding + reinstalling the APK (the installed APK had been a stale
  pre-fix release bundle). 0 "Rendered more hooks", 0 FATAL, 0 error boundary;
  full dashboard renders for the authenticated user. P0-4 CLOSED.
- ✅ Maestro flow 01 (authenticated full screens) PASSES end-to-end on-device:
  login → Home → Fitness → Diet → Analytics → Profile, every tab walked with
  concrete landmarks, 0 flaking.
- ◐ Maestro flow 03 (generate→complete→regenerate loop): generate + plan-render
  + workout-session-entry verified on-device; the full set-logging→completion
  loop blocked by WorkoutSessionScreen animation-flakiness (uiautomator can't
  reach idle under the session's Reanimated modals). Delegated to the Node gate.
- ✅ Deterministic Node loop test covers generate→complete→regenerate (primary
  gate) — real plan, real MET calories, DB row insert, regeneration produces a
  new plan. Full suite 471/0, tsc 0.

### Final status

The plan's PRIMARY gate (deterministic Node loop test) is GREEN — the
generate→complete→regenerate logic is verified end-to-end. The on-device
"final confirmation" (Maestro) confirms: internet works, auth works, P0-4 is
gone, login→all-tabs walks cleanly, and generate→plan-render→session-entry
work. The only on-device gap is the dense workout-session completion loop,
which is animation-blocked and whose logic is independently covered by the
Node gate. The plan's "done" criteria are met for the primary gate; the
on-device completion loop remains a future hardening item (gate the session
screen's animations behind `useReducedMotion`, or adopt Detox for gray-box
sync).

### Correction of an earlier in-session misdiagnosis

Mid-session this was mis-read as "the Expo dev-client is caching a stale
bundle." The real cause, confirmed by `applicationInfo flags=0x0` (no
FLAG_DEBUGGABLE) and the embedded bundle's mtime predating the fix: **no
dev-client is installed at all** — the device runs a release APK with the
pre-fix embedded bundle. The deep-link `expo-development-client` scheme is a
no-op against a release build, which is why host Metro edits never reached the
device. Lesson reinforced: verify the fix marker is in the *running* bundle
before trusting any on-device behavior (the honest-verification rule).

### Second environment finding: dev-client bundle download also broken on this Windows setup

After installing a freshly-built debug (dev-support) APK, the dev-client DOES
fetch from Metro (`BundleDownloader` hitting `http://10.0.2.2:8081/...`), but
the multipart bundle download fails:
`java.net.ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd`
in `Http1ExchangeCodec$ChunkedSource.readChunkSize` — an HTTP chunked-transfer
corruption between Metro (Windows host) and the emulator's OkHttp. This is a
known Windows/Metro + emulator incompatibility, not a code issue. So the
dev-client path is ALSO unreliable here. The robust path is the **preview
(release) APK** whose embedded bundle is freshly built from current source
(contains the fix) and requires no Metro download. Building that now.

## Session 4 update (2026-06-23) — on-device SetLogModal dump: 5 hypotheses disproven

The on-device set-logging step (flow 03) remains blocked by the empty uiautomator
dump when SetLogModal opens. This session pursued 5 root-cause hypotheses via
instrumented release-APK rebuilds; ALL were disproven with direct evidence:

1. **expo-blur BlurView sinks a11y** — IMPOSSIBLE. `GlassView.tsx:98` defaults
   `optimizeForAndroid=true`, so on Android it renders a plain `<View>` fallback
   (line 106-108); the real BlurView never instantiates. (Claimed by two agents;
   wrong twice.)
2. **RN `<Modal>` separate window** — FALSE. `dumpsys` shows both com.fitai.app
   windows share one `ActivityRecord` token; `uiautomator dump --windows` added
   only status-bar chrome, 0 RPE.
3. **a11y labels/roles** — no-op; post-fix dump byte-identical to stall.
4. **reduce-motion freezes entrance spring → sheet off-screen** — DISPROVEN.
   Instrumentation: `translateY.value=0` (on-screen), `backdropOpacity=0.6`,
   children mounted (`title='Set 1 of 4'`). AND reduce-motion ON vs OFF produce
   identical empty dumps. Not reduce-motion-specific.
5. **11ms auto-close / phantom press / clock-tick reset** — DISPROVEN.
   Close-path logging showed ZERO close triggers for 34s after opening. The
   earlier "oscillation" was a misread of two stable modals interleaving on the
   1s `setCurrentTime` re-render.

**What instrumentation proved (solid):** the sheet is correctly on-screen,
open, stable (no auto-close), content mounted, wrapped (on Android) in plain
Views — yet the RPE buttons / Reps / Weight EditTexts never bridge to the
uiautomator a11y tree. The working session screen (`04-session.xml`) bridges
GlassCard-descendant content fine ("Start Exercise", "View Instructions"), so
GlassCard itself is not the blocker.

**Strongest untested hypothesis:** the structural difference is that
`BottomSheet` wraps content in `GestureHandlerRootView` → `PanGestureHandler` →
`Animated.View` → `GlassCard` → `KeyboardAvoidingView`, whereas the working
session screen uses `GlassCard` directly (no gesture handler).
`react-native-gesture-handler`'s `PanGestureHandler`/`GestureHandlerRootView`
may not bridge a11y to descendants on Android. Next diagnostic: temporarily
remove/relocate the PanGestureHandler wrapper and re-dump.

**Current state:** all speculative changes reverted; working tree clean at
9ca76b5. Gates green (tsc 0; jest 471/480, 87 suites). Diagnostic artifacts in
`.maestro-artifacts/` (text/XML only — verdict .md files conflict with each
other; trust the logcat evidence, not the per-agent verdicts).

**Honesty note:** ~6 release-APK rebuild cycles were spent on inferred root
causes before instrumentation nailed the symptom. The primary verification
gate (Node integration test, `src/__tests__/integration/generate-complete-regenerate.loop.test.ts`)
remains GREEN and deterministically covers the loop's logic — the on-device path
is the explicitly-secondary/flaky route per this plan's own framing (line 12).

## Session 4 update (2026-06-23) — ROOT CAUSE CONFIRMED (6th hypothesis)

**RESOLVED.** After 5 disproven hypotheses, instrumentation + a gesture-handler-strip
diagnostic build confirmed the root cause: `react-native-gesture-handler`'s
`GestureHandlerRootView` + `PanGestureHandler` wrapper in `BottomSheet.tsx`
(lines ~181/193) does NOT bridge a11y to descendants on Android.

**Decisive evidence (diagnostic build with wrappers stripped):** SetLogModal's full
subtree appeared in the uiautomator dump — RPE hits (3 RPE + Reps + kg + weight),
2 EditTexts (`Weight (KG)="40.0"`, `Reps="8"`), text ("How hard was that?", "Set
Type", "Starting at 40kg..."), non-full-screen sheet bounds `[0,652][1080,2337]`.
Vs prior: 9 nodes, 0 RPE, all full-screen. The working session screen bridges
because it uses `GlassCard` directly with NO gesture handler.

**Why it took 6 hypotheses:** the symptom (empty dump) looked like an a11y-prop or
animation problem; the actual cause was a gesture-handler layer outside the a11y
tree. Instrumentation (CLAUDE.md "log at handoffs before fixing") was the right
tool but arrived late; ~6 release-APK rebuild cycles were spent on inferred causes
first.

**Real fix (not yet implemented):** preserve drag-to-dismiss while bridging a11y —
recommended approach: move `PanGestureHandler` to wrap ONLY the grabber/header
region (not the content), so content sits in a sibling plain View and bridges.
Source reverted to clean 9ca76b5; gates green (tsc 0, jest 471/480). Diagnostic
artifacts + full verdict in `.maestro-artifacts/gesture-handler-verdict.md`.
