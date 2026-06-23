# Mobile QA Report

**Date:** 2026-06-22
**Agent:** Mobile QA (Maestro v2.3.0)
**Device:** Android emulator-5554 (sniff_avd)
**APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (258MB, Expo dev build)

## Emulator/APK state

- Emulator `emulator-5554` booted successfully via `sniff_avd` AVD.
- `com.fitai.app` was already installed (dev build, versionCode 14, Expo SDK 53).
- Metro dev server started on host port 8081 (`npx expo start --dev-client --port 8081`).
- **Critical connectivity issue:** The Expo dev client could NOT connect to Metro via `localhost:8081` (adb reverse) or `192.168.1.38:8081` (LAN IP). Both resulted in `DevLauncherErrorActivity` with a timeout in `readResponseHeaders`.
- **Working connection:** Deep link `exp+fitai://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081` (emulator's host alias, NO adb reverse) successfully connected the dev client to Metro. Bundle downloaded and JS executed (confirmed via Metro logs showing `Android Bundled` + app WARN/INFO messages).
- **Rendering issue:** Despite the JS bundle loading successfully (guest mode active, onboarding data null), the React Native view tree is NOT exposed to uiautomator/accessibility. UI hierarchy dumps return empty FrameLayouts with no text, content-desc, or resource-id. Maestro cannot find any elements (`tab-home`, "Continue as Guest", etc.).

## Credentials (found / used / blocked)

- **TEST_EMAIL / TEST_PASSWORD:** NOT found in `.env`, `.env.local`, or codebase. Only `test@example.com` exists in unit test files (`src/__tests__/services/authEvents.test.ts`), not usable for real auth.
- **Guest path:** EXISTS. `WelcomeScreen.tsx` line 311 has "Continue as Guest" text. It calls `onGetStarted` which sets `showWelcome=false`, leading to `OnboardingContainer`. Guest mode auto-enables in `App.tsx` when `user=null` (line 889: `setGuestModeInStore(true)`).
- **No hardcoded credentials, no devLogin bypass, no skipAuth** found in production code.
- **Supabase keys** are in `.env.local` (anon + service role), but no test user credentials.
- **Conclusion:** Authenticated flow (01) is BLOCKED — no test credentials available. Guest flow (02) is the correct path to test.

## Per-screen results

| Screen | Status | Note |
|--------|--------|------|
| Welcome/Login | ❌ BLOCKED | App's RN view tree not exposed to uiautomator. Maestro can't find "Continue as Guest" text or any UI elements. JS bundle loads (Metro logs confirm guest mode active) but accessibility tree is empty. |
| Onboarding | ❌ BLOCKED | Same rendering issue — app likely shows OnboardingContainer (guest mode, no onboarding data) but uiautomator sees blank hierarchy. |
| Home | ❌ BLOCKED | `tab-home` testID not found by Maestro. TestID IS set in source (`TabBar.tsx` line 74: `testID={`tab-${tab.key}`}`), confirmed valid for all 5 tabs. Issue is accessibility tree exposure, not missing testIDs. |
| Fitness | ❌ BLOCKED | `tab-fitness` not reachable — same accessibility tree issue. |
| Diet | ❌ BLOCKED | `tab-diet` not reachable. |
| Profile | ❌ BLOCKED | `tab-profile` not reachable. |
| Analytics | ❌ BLOCKED | `tab-analytics` not reachable. |
| Paywall | ❌ BLOCKED | Not reachable — requires navigating through authenticated/guest flow first. |

## Flow fixes applied

### `.maestro/flows/02-guest-onboarding-screens.yaml`
1. **Screenshot command:** Verified `takeScreenshot` is correct (NOT `captureScreenshot`). Both flows already used the correct command.
2. **Removed `clearState: true`**: Clearing app data also clears the dev launcher's cached Metro server URL, causing the app to revert to the "Searching for development servers..." screen. Changed to `launchApp` without `clearState`.
3. **Added deep link launch:** Replaced `launchApp` with `killApp` + `openLink: exp+fitai://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081` to reconnect the dev client to Metro on each run.
4. **Added dev menu dismissal:** Added `runFlow when visible: "Reload"` to dismiss the RN dev menu dialog that appears on first launch.
5. **Added `--output` flag** to the run command for screenshot output directory.
6. **Improved guest mode selector:** Changed `.*[Gg]uest.*` regex to exact `"Continue as Guest"` text for reliability.
7. **Added onboarding screenshot step:** Added `takeScreenshot: 10a-onboarding-step` to capture the onboarding screen if the app goes straight to onboarding (bypassing Welcome).
8. **Added extended wait:** Added `extendedWaitUntil visible: text: ".*" timeout: 90000` after deep link to allow bundle download time.

### `.maestro/flows/01-authenticated-full-screens.yaml`
- No changes needed — flow syntax is correct. Uses `${TEST_EMAIL}` and `${TEST_PASS}` env vars. Cannot be run due to missing credentials.

## Blockers

### BLOCKER 1: RN view tree not exposed to uiautomator (PRIMARY)
**Severity:** Critical — blocks all screen testing.
**Description:** The app's JS bundle loads successfully (Metro logs confirm `Android Bundled` + guest mode active + onboarding data null), but the React Native view hierarchy is completely invisible to Android's accessibility/uiautomator. UI dumps return only empty `FrameLayout` nodes with no text, content-desc, or resource-id. This means Maestro cannot find ANY elements — not `tab-home`, not "Continue as Guest", not even loading text.
**Reproduced:** Consistently across 6+ Maestro runs on 2026-06-22 and also present in 2026-06-21 run (`.maestro/output/2026-06-21_211945/`).
**Possible causes:**
1. React Native accessibility bridge not initialized properly in the dev build.
2. The app may be stuck on a loading screen (`App.tsx` line 1168: `isLoadingOnboarding || appConfigLoading`) that renders only an `ActivityIndicator` + `Text` — but even the `Text` ("Loading your profile...") isn't visible to uiautomator.
3. The require cycle (`authStore → auth → migrationManager → ... → authStore`) causes `Error loading metrics history: Cannot read property 'getState' of undefined` which may be blocking the analytics store initialization, keeping the app in a loading state.
**Recommended fix:** Investigate why the RN accessibility tree is empty. Check if `appConfigLoading` is stuck true, or if the `isInitialized` flag never resolves. The `TypeError: Cannot read property 'getState' of undefined` error in the require cycle is suspicious.

### BLOCKER 2: No test credentials
**Severity:** Medium — blocks authenticated flow.
**Description:** No `TEST_EMAIL` / `TEST_PASSWORD` in env files or codebase. The authenticated flow (01) cannot run. Only the guest flow (02) is testable.
**Recommended fix:** Create a test user in Supabase auth and add credentials to `.env.local` as `TEST_EMAIL` and `TEST_PASSWORD`.

### BLOCKER 3: Dev client networking
**Severity:** Low — workaround found.
**Description:** `adb reverse tcp:8081 tcp:8081` does NOT work for the Expo dev client. The dev client receives `localhost:8081` or `127.0.0.1:8081` in the deep link, but the emulator's loopback doesn't reach the host. `10.0.2.2:8081` (without adb reverse) is the working approach.
**Workaround:** Use `openLink: exp+fitai://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081` in Maestro flows instead of `launchApp`.

## Environment details

- Metro bundler running on `localhost:8081` (host)
- Emulator connects via `10.0.2.2:8081` (no adb reverse)
- App package: `com.fitai.app`, versionCode 14
- Expo SDK 53, React Native with Hermes engine
- Metro logs at `.maestro/metro2.log`
- Screenshots collected in `.maestro/screenshots/`
- Debug artifacts in `C:/Users/Harsh/.maestro/tests/2026-06-22_*`
