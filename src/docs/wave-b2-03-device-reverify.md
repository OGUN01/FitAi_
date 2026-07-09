# Wave B2-03 — Device Re-Verify of Both Code Fixes

**Agent:** Wave B2 device-driving agent (sole emulator access)
**Date:** 2026-06-24
**Mode:** DEVICE RE-VERIFICATION (B2 fixes: box-none AnimatedPressable + useFitnessLogic pre-flight guard)
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`
**Test user:** `testwavea_20260623_232241@fitai.test` / id `4fbc509f-146e-41ca-95bc-3651a2f0107c`

---

## 0. Hot-Reload Loop Verification

| Check | Result |
|---|---|
| Metro | HTTP 200, `packager-status:running` |
| Emulator | `emulator-5554` (sniff_avd) — cold-booted fresh (prior system_server wedge) |
| adb reverse | `tcp:8081 tcp:8081` set |
| Fast Refresh | ON (dev menu confirmed) |
| App package | `com.fitai.app` |
| Deep-link relaunch | `exp+fitai://expo-development-client/?url=http://localhost:8081` — works |

**Cold-boot required:** The emulator's `system_server` was wedged at session start
("is system_server running?" / "could not get idle state" in logcat). Full cold-boot
(kill qemu + restart emulator + adb reverse) restored a stable loop. uiautomator dumps
succeed after cold-boot, EXCEPT when the workout-session GIF animation keeps the UI
non-idle (mitigation: tap the GIF pause button before dumping — discovered this session).

**Fix presence in source (confirmed before device work):**
- FIX 1: `AnimatedPressable.tsx:251` — `pointerEvents="box-none"` on wrapper `Animated.View`. CONFIRMED.
- FIX 2: `useFitnessLogic.ts:429-443` — pre-flight guard reading `legacyPersonalInfo.age` +
  `resolveCurrentWeightFromStores({ bodyAnalysisWeight: bodyAnalysis?.current_weight_kg }).value`,
  surfaces `crossPlatformAlert("Body Analysis Required", ...)`. CONFIRMED.

**Bundle reload:** Forced full Reload via dev menu (twice during session). JS logs confirmed
fresh bundle: "Backend initialized successfully", user `4fbc509f`, `hasProfile=true`.

---

## 1. FIX 1 Verification — Dead RPE Buttons (B-P0-2)

### Setup
Navigated: Home → Workout tab → MON day → Start Workout → Begin Workout → WorkoutSessionScreen
(preview phase) → Start Exercise → ExerciseSessionModal (performing phase, "Set 1 of 3") →
Complete Set → SetLogModal.

### Before fix (Wave B-01, for reference)
- RPE buttons Easy/Just Right/Hard at y=1842-1926: taps did NOT save the set.
- Cancel button at y=2122-2271: taps did NOT close the modal.
- Close (✕) at top y=694-810: DID work (plain Pressable, not AnimatedPressable).
- Weight steppers at y=1409-1714: PARTIALLY worked.

### After fix (box-none) — THIS SESSION

**SetLogModal opened (dump `31-setlog.xml`, `33-after-stepper.xml`):**
All controls present with non-zero bounds:
- Easy: `[66,1842][145,1926]` (84×79px)
- Just Right: `[156,1842][324,1926]` (84×168px)
- Hard: `[334,1842][416,1926]` (84×82px)
- Cancel: `[66,2122][1014,2271]` (149×948px)
- Increase weight: `[904,1409][1014,1520]` (111×110px)

**Test 1 — Tap "Just Right" RPE (center 240,1884):**
- Cleared logcat, tapped, waited 5s.
- Modal STAYED OPEN. Set NOT saved. No rest timer appeared.
- Logcat: NO ReactNativeJS log for the tap firing. **RPE button STILL DEAD.**

**Test 2 — Tap "Just Right" with long-press (100ms hold, `input swipe`):**
- Modal STAYED OPEN. **Still dead.**

**Test 3 — Tap "Just Right" 3× rapidly + offset:**
- Modal STAYED OPEN. Logcat: no JS handler fired. **Still dead.**

**Test 4 — Tap "Increase weight" stepper (center 959,1464, AnimatedPressable at y=1409):**
- Weight changed 2.5 → **5.0** (dump `33-after-stepper.xml`). **STEPPER WORKS.**

**Test 5 — Tap Close (✕) button (plain Pressable, center 956,752):**
- Modal CLOSED. Returned to performing phase. **Close WORKS.**

### Verdict: FIX 1 (box-none) DID NOT RESOLVE B-P0-2

The `pointerEvents="box-none"` fix is correctly applied in source and confirmed in the
reloaded bundle, but it did NOT fix the dead RPE/Cancel buttons. Evidence:
- Upper-positioned AnimatedPressable (weight stepper at y=1409) WORKS after the fix.
- Lower-positioned AnimatedPressable (RPE at y=1842, Cancel at y=2122) remains DEAD.
- The touch barrier is position-dependent — lower elements in the BottomSheet do not
  receive touch events.

### Root cause analysis (post-fix)

The `box-none` fix made the wrapper transparent to touches (correct), but the real
blocker is deeper in the BottomSheet nesting stack:
`GestureHandlerRootView` → `Animated.View` (sheet) → `GlassCard` (`overflow: "hidden"` at
`GlassCard.tsx:182,194`) → `KeyboardAvoidingView` → content.

The GlassCard's `overflow: "hidden"` clips the content area. When the SetLogModal content
exceeds the GlassCard's rendered height (constrained by `sheetWrapper.maxHeight` =
`screenHeight * 0.9` = 2160px), the lower portion is laid out (visible in the a11y tree
with non-zero bounds) but touches do not propagate to it. The boundary between
"touchable" and "dead" falls between y=1714 (last working stepper) and y=1842 (first
dead RPE button).

**This is a shared-service issue** — the fix belongs in `BottomSheet.tsx` and/or
`GlassCard.tsx` (both outside `src/components/fitness/` edit scope). Possible fixes:
1. Wrap SetLogModal content in a `ScrollView` so it scrolls within the clipped bounds.
2. Increase `maxHeightFraction` or make the sheet content scrollable by default.
3. Remove `overflow: "hidden"` from GlassCard's content container (may break blur).

### Session completion: NOT REACHED

B-P0-2 remains a P0 blocker. The RPE buttons are the ONLY way to save a set in the
SetLogModal. Without saving sets, the workout session cannot be completed. The full
completion flow (all sets → WorkoutCompleteDialog → Supabase insert) remains untested
on-device because it is blocked by this dead-control issue.

---

## 2. FIX 2 Verification — Pre-flight Guard (P0-1 friendly prompt)

### Setup
body_analysis row SEEDED (75kg/175cm/18.5%bf) via Supabase REST API. feature_usage
reset to 0 (monthly quota available). Navigated to Workout tab → Regenerate button.

### Test A — Happy path (body_analysis SEEDED): EXPECTED generation succeeds

**Action:** Tapped Regenerate → confirmation dialog → REGENERATE.
**Result:** **FALSE POSITIVE.** The guard fired and showed:
> "Body Analysis Required"
> "Please complete your body analysis (age, weight, and height) in onboarding to
> generate a personalized workout plan." [OK]

This is WRONG — body_analysis IS seeded in Supabase. The guard should NOT have fired.

**Retried after 20s hydration wait:** Same false positive. Not a timing issue.

### Root cause of false positive (CONFIRMED via code trace)

The guard reads `bodyAnalysis?.current_weight_kg` from `useProfileStore().bodyAnalysis`
(`useFitnessLogic.ts:90,429-432`). The profileStore starts with `bodyAnalysis: null`
(`profileStore.ts:112`) and hydrates from **local AsyncStorage** (Zustand `persist`),
NOT from Supabase.

The Supabase→store hydration path in `App.tsx:loadExistingData` (line 724):
- If `user && profile` (our case — `hasProfile=true`): calls
  `verifyAndSyncProfileInBackground` (line 761) which runs `verifyDatabaseData` +
  `syncLocalToDatabase`. NEITHER of these loads `bodyAnalysis` FROM Supabase INTO
  the profileStore. The store's `bodyAnalysis` stays `null`.
- If `user && !profile`: calls `getCompleteProfile(user.id)` (line 796) which DOES
  load bodyAnalysis. But this path only runs when the profile is missing.

**Conclusion:** When a user has an existing profile but the local AsyncStorage was
cleared (cold-boot, fresh install, app data cleared), the profileStore.bodyAnalysis
is NEVER loaded from Supabase. The guard reads null → fires false positive.

This is a PRE-EXISTING data-integrity bug (profileStore doesn't rehydrate bodyAnalysis
from Supabase when local storage is empty but the user has a profile). The new guard
CORRECTLY reads the SSOT — but the SSOT is not populated. The guard EXPOSED this gap.

**The guard's `legacyPersonalInfo.age` check is ALSO affected** — `legacyPersonalInfo`
is built from `profileStore.personalInfo` which is also null when local storage is empty.

### Test B — Missing-data path (body_analysis DELETED): EXPECTED friendly prompt

**Action:** Deleted body_analysis row via Supabase REST DELETE (verified empty).
Tapped Regenerate → REGENERATE.
**Result:** **FRIENDLY PROMPT shown** (same "Body Analysis Required" alert). **No raw
"profile.weight: Too small" / "profile.age: Required" Zod error in logcat.**

Dump evidence: `47-missing-result.xml` — alert text: "Body Analysis Required",
"Please complete your body analysis (age, weight, and height) in onboarding...".
Logcat grep for `zod|profile\.weight|profile\.age|Too small|Required` = **empty**.

### Verdict: FIX 2 PARTIALLY WORKS

- **Missing-data case (Test B): WORKS.** The guard intercepts before the worker call,
  shows a friendly prompt, no raw Zod error. The primary P0-1 goal (no raw error to user)
  is ACHIEVED.
- **Happy-path case (Test A): FALSE POSITIVE.** The guard fires even when body_analysis
  IS seeded, because profileStore.bodyAnalysis is not loaded from Supabase. This BLOCKS
  legitimate workout generation. Users with seeded body data cannot generate workouts.

**Re-seeded** body_analysis row after testing (75kg/175cm/18.5%bf verified).

---

## 3. NEW Issues Found During Re-Verify

### B2-P0-3 (NEW, P0) — profileStore.bodyAnalysis never loaded from Supabase when user has existing profile

- **Impact:** Any user whose local AsyncStorage is cleared (fresh install, app data
  cleared, cold-boot after cache wipe) will have `profileStore.bodyAnalysis = null` and
  `profileStore.personalInfo = null` even though the data EXISTS in Supabase. This
  breaks the pre-flight guard (false positive) AND any other code reading bodyAnalysis
  from the store (backfill effects, calorie calc, etc.).
- **Root cause:** `App.tsx:loadExistingData` line 750-788 — when `user && profile` is
  true, it calls `verifyAndSyncProfileInBackground` (which syncs local→DB, NOT
  DB→local) but never calls `getCompleteProfile` to load bodyAnalysis INTO the store.
- **Files:** `App.tsx:705-722,750-788` (out of edit scope).
- **Fix direction:** In `verifyAndSyncProfileInBackground`, after verifying DB data,
  also call `getCompleteProfile(userId)` and populate profileStore with the result
  (including bodyAnalysis, personalInfo, etc.). OR: have the guard in
  `useFitnessLogic.ts` read bodyAnalysis directly from Supabase instead of the store.

### B2-P1-1 (EXISTING, confirmed) — BottomSheet a11y bridge stall

- After ANY interaction with the SetLogModal BottomSheet (tapping buttons, closing),
  uiautomator dump returns empty/"could not get idle state". Recovery: JS reload or
  GIF pause + wait. Known issue (`bottomsheet-uiautomator-stall.md`).

### B2-P2-1 (EXISTING, confirmed) — GIF animation blocks uiautomator dump

- The ExerciseGifPlayer's animated GIF keeps the UI thread non-idle, causing
  uiautomator dump to fail with "could not get idle state". Mitigation: tap the GIF
  pause button (||) before dumping. NOT a code bug — a testing constraint.

### B2-P2-2 (EXISTING, B-P2-2) — Weight display floating-point accumulation

- Observed: weight showed "2.54" on one SetLogModal open (dump `15-after-rpe-tap.xml`),
  but "2.5" on another (dump `31-setlog.xml`) after a fresh reload. The corruption is
  intermittent and originates in `calibrationService.ts`. NOT FIXED (out of scope).

---

## 4. Issues Summary

| ID | Severity | Issue | Status |
|---|---|---|---|
| B-P0-2 | P0 | SetLogModal RPE + Cancel buttons dead — box-none fix did NOT resolve | **UNFIXED** — root cause is GlassCard `overflow:hidden` + BottomSheet nesting, not AnimatedPressable wrapper |
| B2-P0-3 | P0 (NEW) | profileStore.bodyAnalysis never loaded from Supabase when user has existing profile — causes guard false positive | **NEW** — `App.tsx:loadExistingData` path bug. Out of edit scope. |
| B2-P1-1 | P1 | BottomSheet a11y bridge stall after interaction | **EXISTING** — known issue, not regressed |
| B2-P2-1 | P2 | GIF animation blocks uiautomator dump | **EXISTING** — testing constraint, not a code bug |
| B2-P2-2 | P2 | Weight display floating-point accumulation (2.5 → 2.54) | **EXISTING** — B-P2-2, not regressed |

---

## 5. Flow Clean? Verdict

**NOT CLEAN.** The workout session flow has TWO P0 blockers:

1. **B-P0-2 (dead RPE buttons):** The `box-none` fix did NOT resolve the dead controls.
   The RPE buttons and Cancel remain unresponsive. Session completion is still blocked.
   Root cause is the GlassCard `overflow: "hidden"` + BottomSheet maxHeight clipping
   touch propagation to lower-positioned elements, NOT the AnimatedPressable wrapper.

2. **B2-P0-3 (guard false positive):** The pre-flight guard fires even when body_analysis
   IS seeded, because `profileStore.bodyAnalysis` is never loaded from Supabase when the
   user has an existing profile. This blocks legitimate workout generation.

**What WORKS:**
- FIX 2 guard correctly shows a friendly prompt (no raw Zod error) in the missing-data
  case — the P0-1 raw-error goal is achieved.
- The `box-none` fix improved upper-positioned AnimatedPressable reliability (steppers
  now work consistently), but did not fix the lower-positioned buttons.
- The breathing animation a11y gating (commit 9ca76b5) continues to work.
- Navigation, plan display, workout generation confirmation dialogs all work.

---

## 6. Artifacts Inventory

All artifacts under `D:/FitAi/FitAI/.maestro-artifacts/wave-b2/`:
- **17 uiautomator dumps** (`.xml`) — readable text+a11y tree.
- **1 cold-boot log** (`coldboot.log`).

Key artifact → screen mapping:
- `01-home-afterlaunch.xml` — Home (initial load)
- `09-workout-tab.xml` — Workout tab (plan view, Week 1)
- `10-mon-day.xml` — Monday workout (Lower Body A)
- `12-session-screen.xml` — WorkoutSessionScreen (preview phase)
- `13-performing.xml` / `30-performing-paused.xml` — ExerciseSessionModal (performing)
- `14-setlog-modal.xml` / `31-setlog.xml` — SetLogModal (RPE buttons present)
- `32-after-rpe.xml` / `34-longpress-rpe.xml` — After RPE tap (modal still open = dead)
- `33-after-stepper.xml` — After weight stepper tap (2.5→5.0 = works)
- `43-regen-result.xml` — Guard false positive (body_analysis seeded, guard fired)
- `47-missing-result.xml` — Guard correct (body_analysis deleted, friendly prompt)
