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
