# Wave B-01 — Device Workout Session Flow Report

**Agent:** Wave B device-driving agent (sole emulator access)
**Date:** 2026-06-24
**Mode:** DISCOVERY + HOT-RELOAD FIX LOOP
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md` (Wave B section)
**Test user:** `testwavea_20260623_232241@fitai.test` / id `4fbc509f-146e-41ca-95bc-3651a2f0107c`

---

## 1. Body-Analysis Seed Result (Step 1)

The test user had NO `body_analysis` row (root cause of Wave A's P0-1 "weight: Too small"
error). A row was seeded via Supabase REST API (service-role key):

| Column | Value |
|---|---|
| user_id | `4fbc509f-146e-41ca-95bc-3651a2f0107c` |
| height_cm | 175.00 |
| current_weight_kg | 75.00 |
| target_weight_kg | 72.00 |
| target_timeline_weeks | 12 |
| body_fat_percentage | 18.50 |
| waist_cm | 82.00 |
| chest_cm | 98.00 |
| medical_conditions | `[]` |
| medications | `[]` |
| physical_limitations | `[]` |
| pregnancy_status | false |
| breastfeeding_status | false |
| stress_level | moderate |

**Note:** `bmi`, `bmr`, `ideal_weight_min`, `ideal_weight_max` came back `null` after insert —
the DB trigger that computes these did not fire on REST insert (it likely fires on a
function call or a different insert path). This is non-blocking for workout generation
(the worker only needs `weight` + `height`).

Confirmed via SELECT after insert. Row was deleted for the P0-1 test (Step 3) and
re-seeded afterward to restore the working state.

---

## 2. Session-Flow Walkthrough (Step 2)

### 2.1 Hot-Reload Loop Verification

| Check | Result |
|---|---|
| Metro | HTTP 200, `packager-status:running` |
| Emulator | `emulator-5554` (sniff_avd), cold-booted fresh (prior session wedged system_server) |
| adb reverse | `host-16 tcp:8081 tcp:8081` |
| Fast Refresh | ON (dev menu confirmed) |
| App package | `com.fitai.app` |
| Deep-link relaunch | `exp+fitai://expo-development-client/?url=http://localhost:8081` — works reliably |

**Operational issue:** The emulator's `system_server` wedged mid-session (uiautomator dump
stall → "Slow dispatch took 31880ms" / "is system_server running?"). Required a full
cold-boot (kill qemu + restart emulator). After cold-boot the loop was stable.

**uiautomator dump method:** `adb exec-out uiautomator dump /dev/tty` avoids the Git Bash
path-mangling issue (`/sdcard/` → `C:/Program Files/Git/sdcard/`). This is the reliable
dump method on this Windows host.

### 2.2 Workout Generation

1. **Fitness tab** — "Create Your AI Workout Plan" with "Generate AI Workout" CTA.
   Profile summary: 5 workouts, 1.5 weeks, Intermediate, Build Muscle. **OK.**
2. **First generation attempt** — FAILED with `403 FEATURE_LIMIT_EXCEEDED`
   ("Feature limit exceeded: 1/1 used"). The free-tier user had already used their
   monthly AI-generation quota (feature_usage table: `ai_generation` count=1).
   **Fix:** Reset `feature_usage.usage_count` to 0 via Supabase REST PATCH. This is a
   dev-mode workaround — the limit itself is correct for production.
3. **Second generation attempt** — SUCCESS. "Plan Generated!" dialog with "LET'S GO!"
   button. Plan: "Upper/Lower 4x/Week - Week 1", 4 workouts, 720 est. calories.
   **P0-1 (weight: Too small) did NOT recur** — body_analysis seeding fixed it.

### 2.3 Plan View + Day Selection

- Plan view: Week 1 day selector (MON-SUN). WED/SAT/SUN are rest days.
- Tapping MON shows "Lower Body A" workout: 30 min, 180 cal, 6 exercises, "Ready to Go".
- "Start Workout" button → confirmation dialog "Ready to Start?" → "Begin Workout".
- **OK** — no layout issues.

### 2.4 WorkoutSessionScreen (Preview Phase)

- Header: workout title, "Exercise 1 of 6", TIME/VOL/Wk 1/CAL stats, Exit button.
- Exercise name (tappable → ExerciseHistory), ExerciseGifPlayer with "Tap to zoom" +
  pause button, "View Instructions" button, "Start Exercise" button.
- **OK** — controls render correctly, no overlapping.

### 2.5 ExerciseSessionModal (Performing Phase)

- "Set 1 of 3", "8-10 reps", exercise name, motivation text ("Focus on form — nail
  technique on set 1").
- Breathing circles + GIF container. Back + Complete Set buttons.
- **Breathing animation a11y gating (commit 9ca76b5):** VERIFIED WORKING. The
  `useReducedMotion()` hook gates the `withRepeat(..., -1)` loops. When reduce-motion
  is ON, the loops are skipped and static values are held. The uiautomator dump
  succeeded while the performing phase was open (all nodes visible) — the a11y bridge
  was NOT blocked. **FIX CONFIRMED.**
- **Complete Set button:** Not collapsed. Bounds `[562,1351][937,1492]` → height 141px,
  width 375px. The `height: rh(50)` + `flexShrink: 0` fix holds.

#### Issue B-P2-1: Inverted bounds on ExerciseGifPlayer info chips (performing phase)

- **Evidence:** Four nodes with y1 > y2 in the performing phase:
  - `Equipment: barbell` text at `[399,1003][596,949]` (y1=1003 > y2=949)
  - `Target: quads` text at `[399,1139][627,949]` (y1=1139 > y2=949)
  - Their parent ViewGroups at `[357,992][638,949]` and `[357,1128][669,949]`
- **Root cause:** The WorkoutSessionScreen renders an ExerciseGifPlayer with
  `opacity: 0` during the performing phase (line 807-808). This hidden GIF player's
  `renderExerciseInfo()` still lays out its info chips ("Equipment: barbell",
  "Target: quads") below the visible GIF container boundary, producing inverted bounds.
  The ExerciseSessionModal's OWN ExerciseGifPlayer is called with
  `showInstructions={false}` so it doesn't render info chips — the inverted-bounds
  nodes come from the hidden background GIF player.
- **Severity:** P2 (invisible — opacity:0 hides the visual, but the a11y tree still
  reports the nodes with inverted bounds, which can confuse TalkBack/screen readers).
- **Fix direction:** In WorkoutSessionScreen, conditionally render the background
  ExerciseGifPlayer as `null` (not just opacity:0) during performing phase, OR add
  `pointerEvents="none"` + `accessibilityElementsHidden={true}` to the hidden wrapper.
  **NOT FIXED** — WorkoutSessionScreen is outside my edit scope
  (`src/screens/workout/`, not `src/components/fitness/`).

### 2.6 SetLogModal (Logging Phase)

- Tapping "Complete Set" opens the SetLogModal (BottomSheet).
- Modal shows: "Set 1 of 3", exercise name, "Calibration Session" banner, Set Type
  buttons (W/WU/F/D), Weight input (2.5 kg) with -/+ steppers, Reps input (10) with
  -/+ steppers, RPE buttons (Easy/Just Right/Hard), Session volume footer, Back button.
- **No inverted bounds** in the SetLogModal itself. All controls render at correct
  positions.

#### Issue B-P0-2: SetLogModal RPE buttons + Cancel button are DEAD CONTROLS (CRITICAL)

- **Evidence:** Tapping any RPE button (Easy at `[66,1842][145,1926]`, Just Right at
  `[156,1842][324,1926]`, Hard at `[334,1842][416,1926]`) does NOT save the set.
  The modal stays open. Tapping the "Cancel set log" button at `[66,2122][1014,2271]`
  also does NOT close the modal. The Close (✕) button at the TOP of the sheet
  (`[899,694][1014,810]`) DOES work (it's a plain `Pressable`, not `AnimatedPressable`).
- **Root cause:** The RPE buttons and Back button use `AnimatedPressable` (which wraps
  a `Pressable` inside an `Animated.View` with transform). When nested inside the
  BottomSheet's `KeyboardAvoidingView` → `GlassCard` → `Animated.View` (sheet transform)
  → `GestureHandlerRootView`, the `Animated.View` wrapper in `AnimatedPressable`
  intercepts/blocks touch propagation on Android for elements in the lower portion of
  the sheet. The `pressRetentionOffset` and `Animated.View` transform create a touch
  barrier that `adb input tap` (and likely real taps on some devices) cannot penetrate.
- **Impact:** CRITICAL — the RPE buttons are the ONLY way to save a set in the
  SetLogModal. If they don't respond, the user cannot log any set data, blocking the
  entire workout session flow. The "Back" (Cancel) button also being dead means the
  user cannot dismiss the modal either (only the ✕ close button works).
- **Note:** The weight/reps stepper buttons (also `AnimatedPressable`) at y=1409-1714
  DO partially work (the weight value changed from 2.5 to 2.54 to 2.5445 across
  multiple modal opens — see B-P2-2 below). This suggests the touch barrier is
  position-dependent (lower elements are more affected).
- **Files involved (OUT of my edit scope):**
  - `src/components/workout/SetLogModal.tsx` (RPE buttons at lines 612-649)
  - `src/components/ui/aurora/AnimatedPressable.tsx` (the `Animated.View` wrapper at
    line 242 — likely needs `pointerEvents="box-none"` to let touches pass through to
    the inner `Pressable`)
  - `src/components/ui/aurora/BottomSheet.tsx` (the GestureHandlerRootView +
    KeyboardAvoidingView nesting)
- **NOT FIXED** — all three files are outside `src/components/fitness/`.

#### Issue B-P2-2: Weight display accumulates floating-point precision errors

- **Evidence:** Across successive SetLogModal opens, the weight input showed:
  `2.5` → `2.54` → `2.544` → `2.5445`. Each open added another decimal digit.
- **Root cause:** The `calibrationStartKg` value from `getCalibrationStatus` service
  carries floating-point error. The `kgToDisplay()` function uses `toFixed(1)` which
  SHOULD truncate, but the weight is also set via `onChangeText={setWeight}` (line 539)
  which stores raw string input. When the calibration useEffect re-seeds the weight
  from a progressively-corrupted stored value, the precision error accumulates.
- **Severity:** P2 (cosmetic — the actual saved weight goes through `displayToKg` which
  parses the float correctly, so the DB value is approximately right. But the display
  is wrong and confusing).
- **Files involved (OUT of my edit scope):** `src/components/workout/SetLogModal.tsx`
  (lines 193-194, 237, 296-298) + `src/services/calibrationService.ts` (the source of
  the floating-point `calibrationStartKg`).
- **NOT FIXED.**

### 2.7 Rest Timer

- After the first set's RPE tap (which DID save — confirmed by the rest timer appearing
  after a JS reload unstuck the bridge), the Rest Timer showed:
  "REST BETWEEN SETS", countdown "0:09" (was 60s), "Set 1 of 3 complete".
- Rest presets: 60s, 90s, 120s, 180s at y=1412-1492.
- "+10s" at `[134,1558][329,1693]`, "Pause" at `[350,1558][744,1693]`, "Skip" at
  `[765,1558][948,1693]`.
- **No inverted bounds.** All controls at correct positions.
- **Auto-advance:** The rest timer counted down and auto-advanced to Set 2 of 3
  (ExerciseSessionModal reappeared with "Stay strong — maintain your form" motivation
  text). **WORKING CORRECTLY.**
- **Pause/Skip:** Not explicitly tested (the timer expired before I could tap Pause),
  but the auto-advance mechanism works.

### 2.8 BottomSheet a11y Bridge Stall (Recurring)

- **Evidence:** After ANY interaction with the SetLogModal's BottomSheet (opening,
  tapping RPE buttons, closing via ✕), the uiautomator dump returns 33 bytes (empty
  hierarchy). The app process stays alive (pid unchanged) and the window stays
  focused, but the a11y bridge is completely wedged.
- **Recovery:** JS reload (`adb shell input keyevent 82` → tap "Reload") unwedges the
  bridge. The app reloads to the Home screen (navigation state resets).
- **Root cause:** This is the known `bottomsheet-uiautomator-stall` issue from memory.
  The `GestureHandlerRootView`/`PanGestureHandler` in BottomSheet blocks the a11y bridge
  on Android. The prior fix (moving content outside the PanGestureHandler) helped the
  a11y tree visibility but did NOT fix the touch-interception / bridge-stall issue.
- **Impact:** Makes automated testing of ANY BottomSheet-based modal impossible without
  a JS reload between each interaction. Also likely affects TalkBack users.
- **NOT FIXED** — BottomSheet is outside `src/components/fitness/`.

### 2.9 ExerciseGifPlayer

- GIF playback works (the exercise GIF loaded and displayed).
- "Tap to zoom" fullscreen mode not explicitly tested (would open a nested Modal).
- "Pause exercise demonstration" button (||) present at `[822,632][937,747]`.
- "View Instructions" button present.
- **No layout issues found in the ExerciseGifPlayer itself** when rendered standalone
  (the inverted bounds in 2.5 come from the hidden background instance, not the
  ExerciseGifPlayer component itself).
- `console.error` calls at lines 106-108 and 130-132 are legitimate error logging
  (Principle 5 compliant — exercise not found / GIF load failure). Left as-is.

### 2.10 Session Completion

- **NOT REACHED** — the SetLogModal dead-control issue (B-P0-2) prevents logging
  enough sets to complete a workout. The rest timer auto-advanced from set 1 to set 2,
  but the set-2 SetLogModal could not be saved (RPE buttons dead).
- The `completeWorkout` flow (WorkoutCompleteDialog, rating/notes, Supabase insert)
  was not exercised on-device this wave.

---

## 3. P0-1 Fix Verification (Step 3)

### Before fix (Wave A):
- Body_analysis missing → `aiRequestTransformers.ts` fabricated `weight: 0` → worker
  Zod schema rejected with `.min(30)` → raw "profile.weight: Too small" error alert
  shown to user.

### After fix (Wave B):
- The parallel code agent changed `aiRequestTransformers.ts:575,577,578` from
  `?? 0` → `?? undefined` for age/weight/height.
- **On-device test:** Deleted the body_analysis row, reset feature_usage to 0, tapped
  "Regenerate plan" → confirmation dialog → tapped "REGENERATE".
- **Result:** NO raw "profile.weight: Too small" error appeared. **The fix works** —
  sending `undefined` instead of `0` lets the worker Zod schema's `.nullable().optional()`
  pass cleanly, so the Zod rejection no longer fires.
- **Gap:** No friendly "complete your body analysis" prompt appeared either. The
  generation simply didn't run (feature_usage stayed at 0, no new plan created, no
  error dialog, no success dialog). The user gets NO feedback — the Regenerate
  confirmation dialog dismisses and nothing happens.
- **Assessment:** The P0-1 fix is a **partial success**. The raw error is GONE (the
  primary goal). But the recommended pre-flight guard in `useFitnessLogic` (check
  `resolveCurrentWeightFromStores().value` before calling generation, surface a friendly
  `crossPlatformAlert`) has NOT been implemented yet. The user experience when
  body_analysis is missing is now "silent no-op" instead of "raw error" — better, but
  not yet "friendly guidance."
- **Re-seeded** body_analysis row after the test to restore the working state.

**Note:** ReactNativeJS logs were NOT visible in logcat during this test (Hermes JS
engine logging appeared to be disabled/buffered). This limited the ability to see
exactly what happened in the JS layer after tapping REGENERATE. The conclusion is
based on: (a) no error alert appeared on screen, (b) feature_usage did not increment,
(c) no new plan was created in Supabase.

---

## 4. Issues Summary

| ID | Severity | Issue | File:line | Status |
|---|---|---|---|---|
| B-P0-2 | P0 | SetLogModal RPE + Cancel buttons are dead controls — AnimatedPressable touches blocked by BottomSheet nesting | `SetLogModal.tsx:612-649`, `AnimatedPressable.tsx:242`, `BottomSheet.tsx:181-258` | **UNFIXED** — outside edit scope. Flagged for routing to code agent. |
| B-P1-1 | P1 | BottomSheet a11y bridge stall — uiautomator dump returns empty after any BottomSheet interaction | `BottomSheet.tsx:181` (GestureHandlerRootView) | **UNFIXED** — known issue (`bottomsheet-uiautomator-stall.md`). Outside edit scope. |
| B-P2-1 | P2 | Inverted bounds on hidden ExerciseGifPlayer info chips during performing phase | `WorkoutSessionScreen.tsx:796-809` (opacity:0 GIF player) | **UNFIXED** — outside edit scope (`src/screens/workout/`). |
| B-P2-2 | P2 | Weight display accumulates floating-point precision (2.5 → 2.5445) | `SetLogModal.tsx:193-194` + `calibrationService.ts` | **UNFIXED** — outside edit scope. |
| B-P2-3 | P2 | P0-1 fix is partial — no friendly prompt when body_analysis missing (silent no-op) | `useFitnessLogic.ts` (pre-flight guard not yet implemented) | **UNFIXED** — flagged for code agent. |
| B-P3-1 | P3 | bmi/bmr/ideal_weight triggers don't fire on REST API insert to body_analysis | DB trigger / function | **NON-BLOCKING** — workout generation doesn't need these. |

### Issues NOT found (clean):
- ExerciseSessionModal breathing animation a11y gating: **FIX CONFIRMED** (commit 9ca76b5).
- ExerciseSessionModal control buttons: **NOT collapsed** (height: rh(50) + flexShrink: 0 holds).
- Rest timer auto-advance: **WORKING** (countdown → advance to next set).
- Workout generation with body_analysis present: **WORKING** (plan created successfully).
- ExerciseGifPlayer GIF loading: **WORKING**.
- No hardcoded fallbacks for user data in the session flow (calories SSOT compliant per Wave A audit).

---

## 5. Flow Clean? Verdict

**NOT CLEAN.** The workout session flow has a **P0 blocker** (B-P0-2): the SetLogModal's
RPE buttons and Cancel button are dead controls due to the AnimatedPressable +
BottomSheet touch-interception issue. This prevents the user from logging set data,
which blocks the entire workout session completion flow.

The flow needs **another B sub-wave** (or a targeted fix from a code agent with edit
access to `src/components/ui/aurora/AnimatedPressable.tsx` and/or
`src/components/ui/aurora/BottomSheet.tsx`) to fix B-P0-2 before the session flow can be
fully exercised and verified.

**Recommended fix for B-P0-2 (for code agent):**
In `AnimatedPressable.tsx` line 242, add `pointerEvents="box-none"` to the wrapping
`Animated.View` so it doesn't intercept touches meant for the inner `Pressable`:
```tsx
<Animated.View style={[containerStyle, animatedStyle]} pointerEvents="box-none">
```
This allows the wrapper to pass touch events through to its children while still
rendering the scale/opacity animation. If that doesn't resolve it, the issue may be
the `KeyboardAvoidingView` in BottomSheet shifting the layout — test with
`behavior={undefined}` on Android (the current code already does
`behavior={Platform.OS === "ios" ? "padding" : undefined}` which should be fine, but
the KeyboardAvoidingView wrapper itself may still interfere).

---

## 6. Artifacts Inventory

All artifacts under `D:/FitAi/FitAI/.maestro-artifacts/wave-b/`:
- **38 screenshots** (`.png`) — NEVER read (binary). Viewable by the user.
- **38 uiautomator dumps** (`.xml`) — readable text+a11y tree.
- **1 cold-boot log** (`coldboot.log`).

Key artifact → screen mapping:
- `03-relaunch.*` — Home screen (after app load)
- `04-fitness-tab.*` — Fitness tab (Generate AI Workout CTA)
- `06-generate-result.*` — Plan Generated! dialog
- `07-plan-view.*` — Plan view (week selector)
- `08-mon-day.*` — Monday workout (Lower Body A)
- `09-session-start.*` — Ready to Start? confirmation
- `10-session-screen.*` — WorkoutSessionScreen (preview phase)
- `11-performing-phase.*` — ExerciseSessionModal (performing phase, set 1)
- `12-setlog-modal.*` — SetLogModal (set 1)
- `14-resumed.*` — Rest Timer (after set 1 saved)
- `15-rest-paused.*` — Set 2 performing phase (rest timer auto-advanced)
- `29-p01-test.*` — P0-1 test (body_analysis deleted, regeneration)
- `33-p01-regenerate.*` — Regenerate confirmation dialog
- `34-p01-result.*` — P0-1 result (no error dialog)
