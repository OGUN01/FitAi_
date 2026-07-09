# Wave B3-01 — Fix SetLogModal Dead RPE/Cancel Buttons (B-P0-2)

**Agent:** Wave B3 code-fix agent (flat, no device)
**Date:** 2026-06-24
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`
**Issue:** B-P0-2 — SetLogModal RPE buttons (Easy/Just Right/Hard) + Cancel/Back button dead on Android
**Status:** **FIXED (code) — pending device re-verify via hot-reload**

---

## 1. Root Cause (CONFIRMED with uiautomator bounds — disproves the overflow:hidden hypothesis)

The Wave B2 device agent hypothesized the cause was `GlassCard.tsx:182,194` `overflow:"hidden"` +
`BottomSheet` `maxHeight` clipping touch propagation to lower-positioned elements. **The uiautomator
bounds data in `31-setlog.xml` disproves this.** The real cause is **keyboard occlusion**.

### Bounds evidence (`.maestro-artifacts/wave-b2/31-setlog.xml`)

| Element | Bounds | y-range | Status |
|---|---|---|---|
| Sheet wrapper (BottomSheet `Animated.View`) | `[0,652][1080,2337]` | 652–2337 | rendered |
| GlassCard content region (KeyboardAvoidingView) | `[0,831][1080,2337]` | 831–2337 | rendered |
| Weight "Increase" stepper (AnimatedPressable) | `[904,1409][1014,1520]` | 1409–1520 | **WORKS** |
| Reps "Increase" stepper (AnimatedPressable) | `[904,1603][1014,1714]` | 1603–1714 | **WORKS** |
| Easy RPE (AnimatedPressable) | `[66,1842][145,1926]` | 1842–1926 | **DEAD** |
| Just Right RPE (AnimatedPressable) | `[156,1842][324,1926]` | 1842–1926 | **DEAD** |
| Hard RPE (AnimatedPressable) | `[334,1842][416,1926]` | 1842–1926 | **DEAD** |
| Cancel/Back (GlassButton → AnimatedPressable) | `[66,2122][1014,2271]` | 2122–2271 | **DEAD** |
| Weight EditText | `[452,1389][894,1538]` | — | **`focused="true"`** |

### Why the overflow:hidden + maxHeight hypotheses are WRONG

1. **maxHeight is NOT binding.** `BottomSheet` `maxHeightFraction=0.9` → `2400 × 0.9 = 2160px`.
   The actual sheet height is `2337 − 652 = 1685px` — well under 2160. The sheet is NOT being clamped
   by maxHeight. Content is NOT being truncated by the sheet's height constraint.

2. **`overflow:"hidden"` is NOT clipping the dead buttons.** The GlassCard/content region runs
   y=831 to y=2337. The dead buttons (Easy at y=1842, Cancel at y=2122) are **entirely WITHIN**
   this rendered region — they have non-zero, valid bounds in the a11y tree. If `overflow:"hidden"`
   were clipping them, they would either be absent from the tree or have zero/inverted bounds.
   They do not. They are laid out and visible — they just don't receive touches.

3. **The working/dead boundary is at y≈1714→1842**, which is exactly where the Android soft
   keyboard's top edge sits (the keyboard on this device is ~760–800px tall, covering roughly
   y=1600–2400). Everything above the keyboard works (steppers at y≤1714); everything below the
   keyboard's top is occluded and dead (RPE at y≥1842, Cancel at y=2122).

4. **The weight EditText has `focused="true"`** — the keyboard is UP (the weight input has
   `autoFocus` at `SetLogModal.tsx:543`). The keyboard physically covers the RPE + Cancel buttons.
   Taps land on the keyboard, not the buttons.

### The actual root cause (option d in the step-1 checklist)

- The app's `AndroidManifest.xml:52` sets `windowSoftInputMode="adjustResize"` on the root activity.
  But the `BottomSheet` renders via the stock RN `<Modal>` (`BottomSheet.tsx:173`), which opens in a
  **separate dialog window** that does NOT inherit the root activity's `adjustResize` behavior — the
  Modal window is sized to the full screen and does not shrink when the keyboard appears.
- `BottomSheet.tsx:250-255` wraps content in `<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>`.
  On Android `behavior={undefined}`, so the `KeyboardAvoidingView` is a **no-op** — it does not shift
  content up to make room for the keyboard.
- Net effect: the keyboard opens over the lower portion of the modal, and nothing compensates. The
  RPE buttons + Cancel sit behind the keyboard and are untouchable. This is **not** a touch-clipping
  bug, **not** a GlassCard bug, **not** a BottomSheet maxHeight bug — it is a keyboard-occlusion bug
  specific to the Android RN-Modal + no-op-KeyboardAvoidingView combination.

---

## 2. Fix Applied

**File:** `src/components/workout/SetLogModal.tsx`
**Approach:** Wrap the modal body in a `ScrollView` with `keyboardShouldPersistTaps="handled"` so the
lower controls (RPE three-tap + Back/Cancel) can be scrolled into view above the keyboard.

### Why this approach over the alternatives

| Alternative | Why not |
|---|---|
| Remove `overflow:"hidden"` from GlassCard | **Disproven by bounds** — overflow isn't the cause; removing it breaks the glass rounded-corner aesthetic globally for all consumers. Not minimal. |
| Increase BottomSheet `maxHeight` / per-instance prop | **Disproven by bounds** — maxHeight (2160) isn't binding (actual sheet 1685). Increasing it would not help; the problem is the keyboard covering the bottom, not the sheet being too short. |
| Reduce content height (pad/spacing) | Would shrink the modal but the keyboard still covers ~760px from the bottom regardless — the RPE buttons would still be occluded unless the modal were <840px tall, which is impractical for this content. |
| Make BottomSheet's KeyboardAvoidingView work on Android (`behavior="height"`) | Changes BottomSheet's **global** behavior for all ~7 consumers (SetLogModal, MealDetailModal, ProductDetailsModal, ExerciseInstructionModal, edit modals, etc.). Out of scope per the wave rules (don't change BottomSheet global behavior — the a11y-bridge stall is a separate tracked issue). Risk of regressions. |
| **ScrollView in SetLogModal** (chosen) | Minimal, surgical, scoped to SetLogModal only. Follows the **established codebase pattern**: `ExerciseInstructionModal.tsx:247-257` already uses `<ScrollView>` inside a `BottomSheet` for tall content, and `keyboardShouldPersistTaps="handled"` is the dominant pattern (17 call sites across LogMealModal, MealEditModal, onboarding tabs, settings, etc.). No global behavior change. |

### Exact changes

1. **Import** (`SetLogModal.tsx:29-34`): added `ScrollView` to the `react-native` import list.

2. **Wrap body** (`SetLogModal.tsx:437-443`): opened a `<ScrollView>` immediately after the
   `<BottomSheet>` opening tag, wrapping the entire body (headerRow → exerciseName → calibration
   banner → set-type → weight steppers → reps steppers → RPE three-tap → volume footer → Back
   button). Props: `style={styles.modalScroll}`, `contentContainerStyle={styles.modalScrollContent}`,
   `keyboardShouldPersistTaps="handled"`, `showsVerticalScrollIndicator={false}`, `bounces={false}`.

3. **Close ScrollView** (`SetLogModal.tsx:698`): added `</ScrollView>` after the `GlassButton` Back
   button, before `</BottomSheet>`.

4. **Styles** (`SetLogModal.tsx:708-716`): added `modalScroll: { flex: 1 }` (so the ScrollView fills
   the available content height and scrolls when content overflows) and `modalScrollContent:
   { paddingBottom: rp(spacing.xl) }` (32px bottom inset so the last control clears the safe-area /
   keyboard top with breathing room). Both use aurora tokens (`spacing.xl`, `rp()`).

### Diff stat
```
src/components/workout/SetLogModal.tsx | 32 ++++++++++++++++++++++++++++++++
1 file changed, 32 insertions(+)
```
Pure additive — 0 deletions. No behavior change to GlassCard, BottomSheet, AnimatedPressable, or any
other consumer.

---

## 3. Caller-Safety (no other consumers affected)

The fix touches **only** `SetLogModal.tsx`. The following were checked and are **untouched**:

- **`GlassCard.tsx`** — NOT modified. `overflow:"hidden"` at lines 182/194 unchanged. All GlassCard
  consumers (SetLogModal's volume footer, ExerciseInstructionModal, every other GlassCard user) are
  unaffected. The bounds data proved GlassCard was never the cause.
- **`BottomSheet.tsx`** — NOT modified. `maxHeightFraction`, `KeyboardAvoidingView`, the gesture
  handler structure, and the PanGestureHandler-on-grabber-only fix (from the a11y-bridge-stall
  memory) are all unchanged. The a11y-bridge stall (`bottomsheet-uiautomator-stall.md`) is a
  **separate tracked issue** and was NOT conflated with this fix. Other BottomSheet consumers
  (ExerciseInstructionModal already uses its own ScrollView; MealDetailModal, ProductDetailsModal,
  edit modals) are unaffected.
- **`AnimatedPressable.tsx`** — NOT modified (the B2 `pointerEvents="box-none"` fix at line 251 is
  preserved and still in place). The box-none fix was necessary (it fixed the steppers) but
  insufficient (it couldn't fix keyboard occlusion — that's a layout problem, not a touch-propagation
  problem).
- **`GlassButton.tsx`** — NOT modified. The Back button (GlassButton → AnimatedPressable) will now
  be scrollable into view above the keyboard.

The fix is a pure, additive, per-component layout change that follows an existing pattern in the
codebase. No global behavior is altered.

---

## 4. tsc Gate

```
npx tsc --noEmit
---EXIT:0---
```

Exit 0, zero errors. No pre-existing errors surfaced. The gate is green.

---

## 5. What the Device Agent Should Re-Verify

After hot-reload (save → Fast Refresh, or force Reload via dev menu), the device agent should:

1. Navigate to SetLogModal (Workout tab → Start Workout → ExerciseSessionModal → Complete Set).
2. **Confirm the RPE buttons (Easy/Just Right/Hard) are now tappable** — tapping "Just Right" should
   save the set (weight + reps + rpe=2 written to store, modal closes, rest timer appears).
3. **Confirm the Back/Cancel button is now tappable** — tapping it should close the modal without
   saving.
4. **Confirm the modal body scrolls** — with the weight input focused (keyboard up), the user can
   scroll down to reach the RPE buttons above the keyboard.
5. uiautomator dump should still show all controls with valid bounds (now inside a ScrollView
   node).
6. **Note for the device agent:** the a11y-bridge stall (`bottomsheet-uiautomator-stall.md`) may
   still intermittently block dumps after interacting with the BottomSheet — this is a SEPARATE,
   pre-existing, tracked issue and is NOT caused by or fixed by this change. Use JS reload to
   recover if a dump comes back empty.
