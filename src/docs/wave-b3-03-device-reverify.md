# Wave B3-03 — Device Re-Verify of Both Code Fixes

**Agent:** Wave B3 device-driving agent (sole emulator access, flat, no sub-agents)
**Date:** 2026-06-24
**Mode:** DEVICE RE-VERIFICATION of FIX B3-01 (ScrollView keyboard fix) + FIX B3-02 (body_analysis hydration)
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`
**Test user:** `testwavea_20260623_232241@fitai.test` / id `4fbc509f-146e-41ca-95bc-3651a2f0107c`

---

## 0. Hot-Reload Loop Verification

| Check | Result |
|---|---|
| Metro | HTTP 200, `packager-status:running` |
| Emulator | `emulator-5554` (sniff_avd) — booted, stable |
| adb reverse | `tcp:8081 tcp:8081` set |
| Fast Refresh | ON (dev menu confirmed) |
| App package | `com.fitai.app` |
| Cold bundle | Loaded via deep-link relaunch + full Reload (dev menu). JS logs confirmed fresh bundle: `Backend initialized successfully`, user `4fbc509f`, `hasProfile=true`. |
| ReactNativeJS logging | **INTERMITTENTLY DEAD** — JS logs stopped emitting to logcat mid-session (known emulator issue). Recovery requires emulator cold-boot. This blocked logcat-based handler verification. |

**Fix presence in source (confirmed before device work):**
- FIX B3-01: `SetLogModal.tsx:32,437-698,708-716` — `<ScrollView>` wraps the entire modal body with `keyboardShouldPersistTaps="handled"`, `style={styles.modalScroll}` (`flex:1`), `contentContainerStyle={styles.modalScrollContent}` (`paddingBottom: rp(spacing.xl)`). CONFIRMED in source + reloaded bundle.
- FIX B3-02: `App.tsx:759-788` — `void runAfterInteractions(async () => { ... await dataBridge.loadAllData(user.id); ... })` added to the `user && profile` (valid) branch of `loadExistingData`. CONFIRMED in source + reloaded bundle.

---

## 1. FIX B3-02 Verification — body_analysis Hydration (kills guard false-positive)

### Setup
body_analysis SEEDED (75kg/175cm/18.5%bf) via Supabase Management API. feature_usage `ai_generation` count=0 (quota available). Cold bundle loaded (fresh Zustand persist — local AsyncStorage empty, simulating fresh install / cleared cache).

### Test A — Happy path (body_analysis SEEDED): EXPECTED generation succeeds, NO false-positive guard

**Action:** Workout tab → Regenerate → confirmation dialog → REGENERATE.
**Result:** **FALSE POSITIVE PERSISTS.** The guard fired and showed:
> "Body Analysis Required"
> "Please complete your body analysis (age, weight, and height) in onboarding to generate a personalized workout plan." [OK]

Evidence: dump `b3-03-regen-result.xml` — alert text "Body Analysis Required", "OK". Same false positive as B2.

**Retried after 15s hydration settle:** Tap Regenerate → REGENERATE again. Same false positive (dump `b3-06-regen-result2.xml`).

### Root cause of persistent false positive (CONFIRMED via code trace)

The B3-02 fix calls `dataBridge.loadAllData(user.id)` fire-and-forget, BUT `loadAllData` **short-circuits** at `DataBridge.ts:248`:
```ts
if (profileStoreState.isHydrated && !options?.forceRefresh) {
  return { ..., bodyAnalysis: profileStoreState.bodyAnalysis, source: "local" };
}
```

The `profileStore` Zustand persist (`profileStore.ts:253-272`) has TWO mechanisms that set `isHydrated=true` WITHOUT loading bodyAnalysis from Supabase:
1. **`partialize` persists `isHydrated: state.isHydrated`** (line 265) to AsyncStorage. If `isHydrated` was ever set true in a prior session (via `hydrateFromLegacy`), the persisted state has `isHydrated:true`.
2. **`onRehydrateStorage` FORCES `isHydrated = true`** (line 270) after ANY AsyncStorage rehydration — even if `bodyAnalysis` is null.

So after a cold launch with empty local storage, `isHydrated` is `true` (forced by `onRehydrateStorage`) but `bodyAnalysis` is `null`. The B3-02 fix's `loadAllData` call hits the short-circuit (`isHydrated && !forceRefresh`) → returns cached `bodyAnalysis: null` → guard reads null → fires false positive.

**This is a SHARED-SERVICE issue** — the fix is in `App.tsx` + `DataBridge.ts` + `profileStore.ts` (all outside `src/components/fitness/` edit scope). The B3-02 fix is **INEFFECTIVE** as written because it doesn't pass `{ forceRefresh: true }` to bypass the short-circuit, and `onRehydrateStorage` unconditionally marks the store hydrated.

**Fix direction (for routing):** Either (a) pass `{ forceRefresh: true }` in the `App.tsx:780` call, OR (b) remove `isHydrated` from the `partialize` set + remove the `onRehydrateStorage` force-true (let `isHydrated` only be set by an actual `hydrateFromLegacy` call with real data), OR (c) have the guard read bodyAnalysis directly from Supabase instead of the store.

### Test B — Missing-data path (body_analysis DELETED): EXPECTED friendly prompt

**Action:** Deleted body_analysis row (verified count=0). Reloaded JS (clears store). Workout tab → Regenerate → REGENERATE.
**Result:** **FRIENDLY PROMPT shown** (dump `b3-67-missing-result.xml`): "Body Analysis Required", "Please complete your body analysis (age, weight, and height) in onboarding...". **No raw Zod error** in logcat (grep for `zod|profile.weight|profile.age|Too small|Required` = empty — only an unrelated IPCThreadState binder warning).

### Verdict: FIX B3-02 PARTIALLY WORKS (same as B2)

- **Missing-data case (Test B): WORKS.** The guard intercepts before the worker call, shows a friendly prompt, no raw Zod error. The P0-1 raw-error goal is achieved. (No regression from B2.)
- **Happy-path case (Test A): FALSE POSITIVE PERSISTS.** The B3-02 fix is ineffective because `loadAllData` short-circuits on `isHydrated` (which `onRehydrateStorage` forces true on every cold launch). The fix does NOT populate `profileStore.bodyAnalysis` from Supabase. Users with seeded body data still cannot generate workouts.

**body_analysis re-seeded** after testing (75kg/175cm/18.5%bf verified via DB query).

---

## 2. FIX B3-01 Verification — ScrollView Keyboard Fix (RPE/Cancel tappable)

### Setup
Navigated: Home → Workout tab → MON day (Lower Body A) → Start Workout → Begin Workout → WorkoutSessionScreen (preview) → Start Exercise → ExerciseSessionModal (performing, "Set 1 of 3") → Complete Set → SetLogModal.

### The a11y bridge stall (BLOCKER for bounds verification)

**The ExerciseGifPlayer GIF animation makes uiautomator dumps impossible while the SetLogModal is open.** The ExerciseSessionModal renders `<ExerciseGifPlayer showControls={false} />` (line 438 — no pause button) in the performing phase. The GIF animates continuously via expo-image's native decoder (the `isPlaying` React state only controls a play/pause overlay UI, NOT the native animation — confirmed by reading `ExerciseGifPlayer.tsx:49,136-137`).

When the SetLogModal (a `BottomSheet` `<Modal>`) opens over the animating GIF, the uiautomator bridge returns "could not get idle state" / "null root node" / a truncated 3927-7418 byte dump (vs the full ~25000 byte dump). This is the **known, pre-existing, tracked** B2-P2-1 / `bottomsheet-uiautomator-stall.md` issue.

**Verification attempts (all blocked by the stall):**
1. **20 consecutive dumps** while SetLogModal open — all 3927 bytes (stalled).
2. **Rapid post-reload dump** (within GIF network-load window) — GIF is disk-cached (`cachePolicy: "memory-disk"`), loads instantly, no static window.
3. **Force-stop + relaunch** (clears memory cache) — disk cache persists, GIF loads instantly.
4. **Temporary `autoPlay={false}` edit** to ExerciseSessionModal (hot-reloaded, then reverted) — ineffective: `autoPlay` only sets initial `isPlaying` state, doesn't stop native GIF animation.
5. **GIF pause button** — `showControls={false}` in performing phase, no pause button rendered.

The B2 report's successful `31-setlog.xml` dump (24944 bytes, 70 nodes) was a fortunate exception (likely captured during a GIF network-fetch window in that session) that could not be reproduced in this session.

### Behavioral verification (bounds-independent)

Since bounds could not be obtained, I attempted behavioral verification via DB queries:

1. **Weight stepper tap** (B2 bounds center 959,1464 — `AnimatedPressable` at y=1409-1520, ABOVE the keyboard): tapped twice. The B2 report confirmed steppers work (upper-positioned `AnimatedPressable`).
2. **RPE tap at B2 bounds** (Easy 105,1884 / Just Right 240,1884 / Hard 375,1884 — all BELOW keyboard top ~y=1600): tapped with keyboard dismissed (tapped title area to blur weight field first).
3. **Systematic 45-point sweep** across the entire modal (y=800-2200, step 100; x=105/240/375 per row) — covers all possible RPE positions after ScrollView layout shift.
4. **Post-scroll taps** (swiped up 3x to expose RPE, then tapped y=850-1550).

**DB query after each attempt:** `SELECT * FROM exercise_sets WHERE session_id = '<latest>'` → **always empty.** No set was ever saved.

### Why behavioral verification is INCONCLUSIVE

The empty DB results cannot definitively prove RPE is dead, because of TWO confounds:
1. **Stale bounds:** The ScrollView fix CHANGED the layout (added ScrollView wrapper + `paddingBottom: spacing.xl` = 32px). The B2 bounds (y=1842 for RPE) are from the PRE-fix layout. My blind taps at B2 coordinates likely missed the RPE buttons entirely.
2. **Validation blocking:** `handleSave` (line 336-348) validates `repsValue > 0` and rejects with a "Reps required" alert if reps=0. The reps field defaults to "10" (from `maxReps`), BUT my blind sweep taps may have hit the reps `TextInput` and cleared it, causing the validation to block the save even if RPE's `onPress` fired.

### Code inspection (the fix is structurally correct)

The ScrollView fix is correctly applied in source:
- `<ScrollView>` (line 437) wraps the entire modal body (header → exercise name → calibration banner → set-type → weight steppers → reps steppers → RPE three-tap → volume footer → Back button) → `</ScrollView>` (line 698).
- `keyboardShouldPersistTaps="handled"` (line 440) — taps on buttons fire even with keyboard up.
- `style={styles.modalScroll}` = `{ flex: 1 }` (line 712) — ScrollView fills available content height, scrolls when content overflows.
- `contentContainerStyle={styles.modalScrollContent}` = `{ paddingBottom: rp(spacing.xl) }` (line 715) — 32px bottom inset so last control clears the keyboard.
- RPE `onPress` handlers are correctly wired: `onPress={() => handleSave(1)}` (Easy, line 635), `handleSave(2)` (Just Right, line 648), `handleSave(3)` (Hard, line 661).
- The fix follows the established codebase pattern (`ExerciseInstructionModal.tsx:247-257` uses `<ScrollView>` inside `BottomSheet` for tall content).

The fix addresses the ROOT CAUSE identified in the B3-01 fix doc: the Android RN-Modal + no-op-`KeyboardAvoidingView` combination leaves the keyboard occluding the lower modal content. The ScrollView lets the user scroll RPE/Cancel into view above the keyboard. The fix is **structurally correct** — but I could not confirm it behaviorally on-device due to the a11y bridge stall preventing fresh bounds capture.

### Session completion: NOT REACHED

The full session completion flow (all sets → WorkoutCompleteDialog → caloriesBurned persisted) could NOT be verified because:
- Sets cannot be saved without RPE (RPE is the ONLY save path — the Back button calls `onCancel`, not save).
- Without saving sets, the session cannot progress past Set 1.
- The a11y bridge stall prevented bounds-based verification of whether the ScrollView fix makes RPE tappable.

**This is NOT a confirmation that B-P0-2 persists** — it is an INCONCLUSIVE result due to a testing-tool limitation (the GIF a11y bridge stall). The fix is structurally correct in source; behavioral confirmation requires either (a) a Maestro flow (handles non-idle state better than raw uiautomator), (b) a human tester, or (c) a release-APK build with the GIF disabled for testing.

---

## 3. NEW / Confirmed Issues

### B3-P0-1 (NEW, P0) — dataBridge.loadAllData short-circuits on isHydrated; B3-02 fix ineffective

- **Impact:** The B3-02 fix (App.tsx:780 `dataBridge.loadAllData(user.id)`) does NOT populate `profileStore.bodyAnalysis` from Supabase because `loadAllData` short-circuits at `DataBridge.ts:248` when `profileStore.isHydrated` is true. `profileStore.ts:270` `onRehydrateStorage` forces `isHydrated=true` on EVERY cold launch (even with empty local storage), so the short-circuit always fires. The guard false-positive PERSISTS.
- **Root cause:** `profileStore.ts:265` persists `isHydrated` + `profileStore.ts:270` forces it true on rehydrate; `DataBridge.ts:248` trusts it as a cache-hit signal.
- **Files:** `App.tsx:780` (needs `{ forceRefresh: true }`), `DataBridge.ts:248`, `profileStore.ts:265,270`. All shared-service (out of edit scope).
- **Fix direction:** Pass `{ forceRefresh: true }` in the App.tsx call, OR fix `onRehydrateStorage` to not force `isHydrated=true` when the persisted data is empty.

### B2-P2-1 (EXISTING, confirmed persistent) — GIF animation blocks uiautomator dump

- The ExerciseGifPlayer's animated GIF (expo-image, native decoder, `showControls={false}` in performing phase = no pause button) keeps the UI thread non-idle, causing uiautomator dump to return truncated/empty results while ANY modal overlays it. This blocked all bounds-based verification of the SetLogModal fix. NOT a code bug — a testing-tool constraint. Persists across sessions.
- **Mitigation needed:** Either (a) add a hidden test-mode prop to disable GIF autoplay for verification, (b) use Maestro flows (handle non-idle state), or (c) accept this as a verification gap requiring human/release-APK sign-off.

### B2-P1-1 (EXISTING, confirmed) — ReactNativeJS logcat intermittently dies

- JS logs stopped emitting to logcat mid-session (0 ReactNativeJS lines after reload). This blocked handler-firing verification via console.error. Recovery requires emulator cold-boot.

### B3-P2-1 (NEW, P2) — Back key closes SetLogModal instead of just dismissing keyboard

- Pressing the hardware Back key while the SetLogModal is open closes the ENTIRE modal (returns to performing phase), rather than just dismissing the soft keyboard. This is a minor UX issue — users expecting Back to dismiss the keyboard will lose their set-entry progress. NOT a regression (pre-existing). The `keyboardShouldPersistTaps="handled"` ScrollView prop doesn't affect Back-key behavior.

---

## 4. Issues Summary

| ID | Severity | Issue | Status |
|---|---|---|---|
| B3-P0-1 | P0 (NEW) | `dataBridge.loadAllData` short-circuits on `isHydrated` (forced true by `onRehydrateStorage`); B3-02 fix ineffective — guard false-positive PERSISTS on happy path | **NEW** — shared-service (`App.tsx`/`DataBridge.ts`/`profileStore.ts`). Out of edit scope. |
| B-P0-2 | P0 | SetLogModal RPE/Cancel tappable after ScrollView fix? | **INCONCLUSIVE** — fix structurally correct in source; behavioral verification blocked by GIF a11y bridge stall (B2-P2-1). Session completion NOT reached. |
| B2-P2-1 | P2 | GIF animation blocks uiautomator dump (persistent across sessions) | **EXISTING** — testing-tool constraint, not a code bug |
| B2-P1-1 | P1 | ReactNativeJS logcat intermittently dies | **EXISTING** — emulator issue |
| B3-P2-1 | P2 (NEW) | Back key closes SetLogModal instead of dismissing keyboard | **NEW** — minor UX, pre-existing behavior |

---

## 5. Flow Clean? Verdict

**NOT CLEAN.** Two P0 issues remain:

1. **B3-P0-1 (guard false-positive PERSISTS):** The B3-02 fix is **ineffective** — `dataBridge.loadAllData` short-circuits on `isHydrated` (which `onRezureStorage` forces true on every cold launch). The guard still fires a false positive when body_analysis IS seeded, blocking legitimate workout generation. The fix needs `{ forceRefresh: true }` or a fix to `onRehydrateStorage`. (Shared-service — out of this agent's edit scope.)

2. **B-P0-2 (RPE/Cancel tappable — INCONCLUSIVE):** The B3-01 ScrollView fix is **structurally correct** in source (ScrollView wraps the modal body, `keyboardShouldPersistTaps="handled"`, RPE handlers correctly wired, follows the established `ExerciseInstructionModal` pattern). However, behavioral verification was **blocked** by the persistent GIF a11y bridge stall (B2-P2-1) — I could not capture fresh bounds to confirm the RPE buttons receive taps after scrolling. A 45-point blind sweep produced no saved set, but this is inconclusive due to stale-bounds and validation-blocking confounds. Session completion could NOT be reached.

**What WORKS:**
- FIX B3-02 missing-data case: friendly "Body Analysis Required" prompt shows, no raw Zod error. (No regression from B2 — the P0-1 raw-error goal is achieved.)
- The `box-none` AnimatedPressable fix (B2): upper-positioned steppers work.
- Navigation, plan display, workout session start, ExerciseSessionModal performing phase — all functional.
- tsc gate: EXIT 0 (source clean after temporary verification edits reverted).
- body_analysis re-seeded (75kg/175cm/18.5%bf).

**What CANNOT be confirmed on-device this session:**
- Whether the ScrollView fix actually makes RPE/Cancel tappable (blocked by GIF a11y bridge stall).
- Full session completion → caloriesBurned persistence (blocked by RPE verification gap).

**Recommended next steps:**
1. Fix B3-P0-1 (pass `{ forceRefresh: true }` in App.tsx:780, or fix `onRehydrateStorage`) — re-verify the happy-path generation.
2. Re-verify B-P0-2 via Maestro flow OR release-APK with GIF disabled, to get bounds + confirm RPE tappable + complete a session end-to-end.

---

## 6. Artifacts Inventory

All artifacts under `D:/FitAi/FitAI/.maestro-artifacts/wave-b3/`:
- **~25 uiautomator dumps** (`.xml`) — readable text+a11y tree. SetLogModal dumps are truncated (3927-7418 bytes) due to GIF stall; performing-screen dumps are full (24390 bytes).
- **6 screenshots** (`.png`) — saved only, NOT read (per rules). Available for the user to view.

Key artifact → screen mapping:
- `b3-00-home.xml` — Home (initial load, profile hydrated)
- `b3-01-workout-tab.xml` — Workout tab (AI plan, Week 1)
- `b3-03-regen-result.xml` — Guard FALSE POSITIVE (body_analysis seeded, guard fired)
- `b3-06-regen-result2.xml` — Guard false positive (after 15s hydration settle)
- `b3-07-mon-day.xml` — MON day (Lower Body A, Start Workout)
- `b3-10-performing.xml` — ExerciseSessionModal (performing, Set 1 of 3)
- `b3-11-setlog.xml` / `b3-16-setlog.xml` / `b3-29-setlog2.xml` — SetLogModal (TRUNCATED, GIF stall)
- `b3-60-performing.xml` — Performing (Set 1 of 3 — no set saved after sweep)
- `b3-67-missing-result.xml` — Guard CORRECT (body_analysis deleted, friendly prompt, no Zod error)
