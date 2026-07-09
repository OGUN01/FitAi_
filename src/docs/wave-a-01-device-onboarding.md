# Wave A-01 — Device Onboarding + Auth + Home Discovery Report

**Agent:** Wave A device-driving agent (sole emulator access)
**Date:** 2026-06-23 / 2026-06-24 (session crossed midnight)
**Mode:** DISCOVERY ONLY — no source fixes applied this wave
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`

---

## 1. Hot-Reload Loop Status

| Check | Result |
|---|---|
| Metro running | YES — `curl http://localhost:8081/status` → HTTP 200, `packager-status:running`. Bundle endpoint `/index.bundle` serves HTTP 200. |
| Emulator online | YES — `emulator-5554` (sniff_avd, SDK 36). Cold-booted fresh this session (50s to `sys.boot_completed=1`). |
| adb reverse | YES — `adb reverse tcp:8081 tcp:8081` set (host-16). |
| Fast Refresh | ENABLED — dev menu shows "Disable Fast Refresh" (i.e. currently ON). HMR functionally active. |
| App package | `com.fitai.app` |
| Dev-client build | Loaded JS from Metro at runtime. Bundle ~3036 modules, ~50s cold, ~2s incremental. |

**Loop is ALIVE and functional.** One operational note: after `pm clear`, the Expo dev-launcher screen appears and does NOT auto-reconnect to Metro. The reliable re-launch method is the deep link: `adb shell am start -a android.intent.action.VIEW -d "exp+fitai://expo-development-client/?url=http://localhost:8081"`. This deep link is registered on `MainActivity` (scheme `exp+fitai`). The dev-launcher's own WebView UI is invisible to uiautomator (only 9 native nodes) so blind taps fail — use the deep link instead.

---

## 2. Fresh Test User

- **Email:** `testwavea_20260623_232241@fitai.test` (Supabase lowercased it)
- **Password:** `WaveA-Test12345!`
- **User ID:** `4fbc509f-146e-41ca-95bc-3651a2f0107c`
- **Email confirmed:** YES (set via Auth Admin API `email_confirm: true`)
- **Credentials file:** `.maestro-artifacts/wave-a/test-user-credentials.txt`
- **Prior user (avoid):** `testuser@fitai.dev` / `TestPass12345` (id `4cc39bd9`, confirmed, has stale profile data)

**How the user was created:** Supabase Auth Admin API (`POST /auth/v1/admin/users` with service role key from `.env.local`, `email_confirm: true`). This bypasses the email-verification friction (the register flow at `src/services/auth/register.ts` requires email confirmation before sign-in — `login.ts` line 75 blocks unverified users). Creating a confirmed user via admin API is the dev-mode equivalent of completing email verification, and lets the onboarding UI be exercised on-device.

**Seeded profile data:** Because adb `input text` could not reliably clear/retype RN TextInput fields (see issue P1-1 below), a complete profile was seeded directly into Supabase so sign-in would land on Home and exercise the downstream tabs:
- `profiles` row: first_name=Alex, last_name=Rivera, age=28, gender=male, country=India, state=Maharashtra, region=Mumbai, units=metric
- `workout_preferences` row: location=gym, intensity=intermediate, workout_types=[strength], primary_goals=[build_muscle], activity_level=active, equipment=[barbell,dumbbell]
- `body_analysis`, `diet_preferences`, `advanced_review`: NOT seeded (intentionally — to discover missing-data handling)

**Repro:** Later waves can reuse this user (sign in with the credentials above) or create a fresh one with the same admin-API method.

---

## 3. Onboarding Path Taken (screen by screen)

1. **Welcome screen** (`src/screens/onboarding/WelcomeScreen.tsx`) — FitAI branding, 3 feature cards (AI-Powered Workouts, Smart Meal Planning, Track Your Progress), "Get Started" / "Sign In" / "Continue as Guest". **OK.**
2. **Sign In screen** — "Welcome Back", Google button, email/password fields, "Sign Up" link. **OK** (after clearing stale password input — see P1-2).
3. **Sign-in** → app calls `loadExistingData` (App.tsx line 724) → `getCompleteProfile` → `checkProfileComplete`. With seeded profile complete → `setIsOnboardingComplete(true)` → lands on **Home**. *(Onboarding form tabs were reached on a prior attempt but blocked by input issues — see P1-1.)*
4. **Home tab** — greeting "Good evening, Alex Rivera", rest-day message, Health Intelligence (No Data / Connect Health Data), Move/Exercise/Nutrition/Steps cards (all 0), "No meals logged today", "Log Meal" CTA. **OK.**
5. **Workout tab** — "Create Your AI Workout Plan", profile-based summary (5 workouts, 1.5 weeks, Intermediate, Build Muscle), "Generate AI Workout" CTA, AI Plan/My Plan segmented control. **OK.**
6. **Diet tab** — "Nutrition Plan", day navigator, Generate Week/Log Meal buttons, offline food DB download prompt (300MB), macro summary 0/0. **OK.**
7. **Profile tab** — avatar "AR", "Alex Rivera", stats (0 streak/workouts/calories/achievements), account sections (Personal Information, Goals & Preferences, Body Measurements, Manage Subscription - Free tier). **OK.**
8. **Analytics tab** — "Premium Feature" paywall ("Detailed analytics and trend charts... Upgrade to Unlock"). **OK** (paywalled, expected for free tier).
9. **Generate AI Workout** (Workout tab → tap CTA) — **FAILED**: "Generation Failed: profile.weight: Too small: expected number to..." (see P0-1).
10. **Personal Information edit modal** (Profile → tap row) — opened correctly, showed seeded data (Alex Rivera, 28, Male, Activity Level selector). **OK.**

---

## 4. Issues Found

### P0 — Critical

**P0-1: AI Workout Generation fails — missing body weight not handled gracefully**
- **Screen:** Workout tab → "Generate AI Workout"
- **Evidence:** Alert "Generation Failed: profile.weight: Too small: expected number to..." (screenshot `16-generate-workout.png`, dump `16-generate-workout.xml`). Logcat `16-generate-workout.log`.
- **Root cause:** The seeded user has no `body_analysis` row (no weight). The AI generation worker validates `profile.weight` as a required number and rejects the request. The app surfaces a raw validation error instead of guiding the user to complete body analysis first.
- **Fix direction (Wave B/C):** Before calling generation, check body_analysis exists with weight != null; if missing, route user to Body Analysis onboarding/edit. Never show raw worker validation strings — map to user-friendly guidance.

### P1 — High

**P1-1: Onboarding form TextInput fields cannot be cleared/focused via adb (and likely a11y tools)**
- **Screen:** Onboarding Personal Info tab (and sign-in password field)
- **Evidence:** Tapping First Name, then typing, then tapping Last Name — focus stayed on First Name; all typed text concatenated into First Name ("AlexiRiveraAlexex28"). KEYCODE_DEL (67), KEYCODE_FORWARD_DEL (112), KEYCODE_CLEAR (28), double-tap, triple-tap, long-press, drag-select ALL failed to clear/select text. TAB (keyevent 61) DID move focus sometimes. The field values render as `View` class (not `EditText`) in the a11y tree, and no node had `focused="true"` after taps.
- **Dumps:** `04-after-signin.xml`, `05b-keyboard-up.xml`, `05c-gender.xml`, `06c-after-alert.xml`.
- **Impact:** Blocks automated E2E onboarding completion; may indicate the RN TextInput doesn't expose standard Android text-edit semantics (selection, focus) to a11y/automation — a real accessibility concern for TalkBack users who rely on text selection.
- **Note:** This is why a complete profile was seeded via Supabase REST API instead of driving the onboarding form to completion. Wave B/C should re-test with a human-driven or Maestro `swipeElement`-based selection, and investigate whether the custom `Input` component (`src/components/ui/Input.tsx`) sets `accessible`/`focusable` props incorrectly.

**P1-2: Sign-in password field retains stale input across failed attempts**
- **Screen:** Sign In screen
- **Evidence:** After a failed sign-in (wrong password due to P1-1 concatenation), dismissing the "Sign In Failed" alert returned to the sign-in form with the password field still containing 44 masked characters (should be 16). The email field retained its value correctly, but the password field did not reset. Required a full `pm clear` + relaunch to get a clean field.
- **Impact:** A user who mistypes their password sees a stale (longer) masked value and may repeatedly fail without understanding why.

**P1-3: `getDietPreferences` null dereference error on Home load**
- **Screen:** Home tab (on first load after sign-in)
- **Evidence:** logcat `11-home.log`: `[userProfile] getDietPreferences failed: TypeError: Cannot read property 'dietType' of null`
- **Root cause:** The seeded user has no `diet_preferences` row. The `getDietPreferences` function dereferences `dietType` on a null result without a null guard. This is a silent-ish failure (logged to console.error but not surfaced to UI).
- **Fix direction:** Add null guard in the diet-preferences loader; return a safe default or null rather than throwing.

### P2 — Medium (a11y / layout)

**P2-1: Inverted/negative bounds across multiple screens (recurring pattern)**
- **Screens:** Home, Workout, Diet, Analytics (all tabs)
- **Evidence (logcat "Skipping invisible child"):**
  - Home (`11-home.log`): `Rect(45, 2268 - 1035, 2166)` y1>y2; `Rect(0, 2544 - 1080, 2166)` y1>y2; `Rect(45, 2801 - 1035, 2166)` y1>y2
  - Workout (`12-workout-tab.log`): `Rect(66, 2110 - 1014, 2038)` y1>y2; `Rect(66, 2327 - 1014, 2038)` y1>y2
  - Diet (`13-diet-tab.log`): `Rect(129, 2222 - 150, 2166)` y1>y2; `Rect(161, 2208 - 232, 2166)` y1>y2
- **Pattern:** Content rendered below the viewport bottom (y > 2166) with inverted bounds (y1 > y2 = 2166). This matches the spec's "negative/inverted bounds" defect category — likely caused by percentage `maxHeight`, `overflow:"hidden"`, or missing height constraints on bottom-of-screen containers. The bottom tab bar sits at y~2166-2400.
- **Fix direction:** Grep `maxHeight: "9` / percentage heights + `overflow: "hidden"` (per spec). Constrain bottom containers to actual viewport height.

**P2-2: Zero-dimension invisible elements (zero width AND zero height)**
- **Screens:** Home, Diet, Analytics
- **Evidence:** `Rect(0, 0 - 0, 0)` repeatedly; `Rect(90, 1193 - 90, 1193)` (zero width); `Rect(278, 1232 - 278, 1232)` (zero width); `Rect(540, 191 - 540, 191)` (zero width/height)
- **Pattern:** Animated/collapsing elements rendering at zero size (likely `Animated.View` with `flexShrink:1` + no height, or not-yet-measured layout). Matches the spec's "collapsed/invisible controls" category.
- **Note:** The Home `content-desc="Continue as guest"` node (`viewIdResName: guest-option`) rendered at `Rect(0,0 - 0,0)` — an invisible-but-present guest option that should not be on the Home screen at all (it's a Welcome-screen element leaking into an authenticated screen).

**P2-3: "Region/City (Optional)" label contradicts validation "State is required"**
- **Screen:** Onboarding Personal Info tab
- **Evidence:** Field labeled "Region/City (Optional)" but Next-button validation error says "State is required". (`04-after-signin.xml`, validation alert `06-diet-tab.xml`)
- **Impact:** User confusion — a field marked optional is actually required.

**P2-4: Dev launcher not auto-reconnecting after `pm clear`**
- **Screen:** Expo dev-launcher (post `pm clear`)
- **Evidence:** After clearing app data, `am start -n com.fitai.app/.MainActivity` lands on DevLauncherActivity which renders its own WebView (invisible to a11y, 9 native nodes). Metro log shows it re-bundling `index.js (1 module)` repeatedly (the launcher's own bundle) without proceeding to the app entry. Blind taps on the launcher screen did not trigger "Open latest dev build".
- **Workaround:** Use the deep link `exp+fitai://expo-development-client/?url=http://localhost:8081` to bypass the launcher and load the app bundle directly.
- **Impact:** Slows iteration; any agent or developer who clears app data must know the deep-link workaround.

### P3 — Low

**P3-1: Stale Metro log lines from prior session**
- The Metro log (`.maestro-artifacts/metro.log`) contained lines from the prior `testuser@fitai.dev` session (user `4cc39bd9`) even after `pm clear`. These are buffered/stdout lines, not a live state issue, but can mislead an agent reading the log to infer the wrong user is active. Confirm the active user via logcat `ReactNativeJS` lines (`👤 user=...`) instead.

**P3-2: Onboarding form state survives JS reload**
- After dev-menu → Reload, the onboarding form values persisted ("AlexiRiveraAlexex28" remained in First Name). This is because the onboarding store is persisted to AsyncStorage (via `onboarding-state/persistence.ts`). Not a bug per se, but means reload does NOT reset the form — `pm clear` is required for a truly fresh onboarding state.

---

## 5. Screens NOT yet driven (deferred to later waves)

Per the spec's screen inventory, these were NOT exercised in Wave A (onboarding form itself was blocked by P1-1; the rest are scoped to their waves):
- **Onboarding tabs 2-5** (Diet Preferences, Body Analysis, Workout Preferences, Advanced Review) — blocked by P1-1; needs Maestro/human input or a TextInput fix first.
- **Auth: password reset, Continue as Guest** — not reached.
- **Workout session + all nested modals** (ExerciseSessionModal, SetLogModal, RestTimer, etc.) — Wave B.
- **Diet flow modals** (LogMealModal, MealDetailModal, ContributeFood, cooking session, water log) — Wave C.
- **Analytics charts** (paywalled) — Wave D.
- **Settings, HealthKit settings, Achievements, Paywall detail** — Wave E.

---

## 6. Spec Wave Plan Summary (B–F) for orchestrator dispatch

From `src/docs/UIUX-DATA-INTEGRITY-GOAL.md` lines 78–85:

| Wave | Device flow (1 device agent) | Code-only agents (3-4, parallel) |
|---|---|---|
| **B** | Workout session + ALL nested modals (ExerciseSessionModal overload/complete-set controls — user's priority; SetLogModal RPE/inputs; RestTimer; ExerciseInstructionModal; ExerciseHistoryScreen; DeloadModal; NextExercisePreview; WorkoutHeader/ProgressBar) | Progressive-overload deep audit (mesocycle `MESOCYCLE_WEEK_MULTIPLIERS`, `priorPerformance` wiring); calories SSOT deep audit (`WorkoutProgress.caloriesBurned` vs `estimatedCalories`); offline-queue audit (`_writeExerciseSets`); schema/RLS audit |
| **C** | Diet flow + all modals (LogMealModal By-Ingredients + Direct Entry; MealDetailModal; ContributeFood; cooking/meal-session; water log; diet compliance) | Diet-save integrity; water-log offline; meal/macro compliance |
| **D** | Analytics + achievements + progress (weight trend, volume, calorie/macro compliance, ProgressTrends charts — note: paywalled, may need premium-tier seeding) | Analytics data sources; measurement sync |
| **E** | Profile + settings + paywall (personal info edit, goals & preferences, stats summary; units selection modal; HealthKit settings; cache clear; notifications; manual health entry; subscription/paywall plan cards) | Settings persistence; subscription state |
| **F** | Regression sweep across all fixed screens + release-APK sign-off build (`./gradlew assembleRelease --rerun-tasks` + uninstall + reinstall) | — |

**Adjustment notes for orchestrator:**
- Wave B is the user's stated priority (workout session nested modals). Dispatch first.
- The workout-generation failure (P0-1) means Wave B's device agent should first seed a `body_analysis` row (with weight) for the test user before exercising the session flow, OR use the existing `testuser@fitai.dev` who may have a complete profile.
- The `getDietPreferences` null-deref (P1-3) should be folded into Wave C's code audit.
- The inverted-bounds pattern (P2-1) spans ALL tabs — a code-only agent in an early wave should grep `maxHeight: "9` / percentage heights + `overflow: "hidden"` across all screens to produce a master list before device agents re-verify.

---

## 7. Artifacts Inventory

All artifacts under `D:/FitAi/FitAI/.maestro-artifacts/wave-a/`:
- **25 screenshots** (`.png`) — NEVER read these (binary). Viewable by the user.
- **42 uiautomator dumps** (`.xml`) — readable text+a11y tree.
- **11 logcat files** (`.log`) — readable.
- **1 credentials file** (`test-user-credentials.txt`).

Key artifact → screen mapping:
- `02-welcome.*` — Welcome screen
- `03-signin.*` / `09-signin2.*` / `12-signin3.*` — Sign In screen
- `04-after-signin.*` through `06c-after-alert.*` — Onboarding Personal Info tab (form input issues)
- `08-welcome-2.*` — Welcome (post pm-clear)
- `11-home.*` — Home tab
- `12-workout-tab.*` — Workout tab
- `13-diet-tab.*` — Diet tab
- `14-profile-tab.*` — Profile tab
- `15-analytics-tab.*` — Analytics tab (paywall)
- `16-generate-workout.*` — Generate AI Workout failure (P0-1)
- `17-personal-info-edit.*` — Personal Information edit modal
- `devmenu*.xml` — dev menu dumps (Fast Refresh confirmation)
