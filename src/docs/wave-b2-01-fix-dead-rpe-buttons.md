# Wave B2-01 — Fix Dead RPE Buttons (B-P0-2)

**Agent:** Wave B2 code-fix agent (flat, no device)
**Date:** 2026-06-24
**Mode:** CODE FIX ONLY — hot-reload re-verification by device agent
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md` (Wave B2)
**Device finding:** `src/docs/wave-b-01-device-workout-session.md` (Issue B-P0-2)

---

## 1. Root Cause (CONFIRMED — matches device agent's hypothesis)

`AnimatedPressable` (`src/components/ui/aurora/AnimatedPressable.tsx:242`) wraps its
inner `<Pressable>` in an `<Animated.View style={[containerStyle, animatedStyle]}>`
with **no `pointerEvents` prop**. When `AnimatedPressable` is nested inside
`BottomSheet`'s `GestureHandlerRootView` → `KeyboardAvoidingView` → `GlassCard` →
`Animated.View` (sheet transform) stack, that wrapper `Animated.View` intercepts/blocks
touch propagation to the inner `Pressable` on Android — but only for elements in the
lower portion of the sheet.

**On-device evidence (from B-01 device agent, `.maestro-artifacts/wave-b/`):**
- RPE buttons Easy `[66,1842][145,1926]`, Just Right `[156,1842][324,1926]`,
  Hard `[334,1842][416,1926]` — taps do NOT save the set (modal stays open).
- "Cancel set log" button `[66,2122][1014,2271]` — taps do NOT close the modal.
- ✕ Close button at TOP `[899,694][1014,810]` DOES work — it's a plain `Pressable`,
  not wrapped by `AnimatedPressable`.
- Weight/reps steppers (also `AnimatedPressable`) at y=1409-1714 PARTIALLY work —
  the touch barrier is position-dependent (lower elements more affected).

This is the **same family** as the BottomSheet a11y-bridge stall
(`bottomsheet-uiautomator-stall.md`) — both stem from gesture-handler/animated-view
nesting inside BottomSheet — but DISTINCT: B-P0-2 is a *touch-interception* bug
(destructive to the user flow), the stall is an *a11y-tree-bridging* bug (destructive
to automated testing). They share a root surface (BottomSheet nesting) but the fix
here targets touch propagation only and does NOT edit BottomSheet.

---

## 2. Fix Applied

**File:** `src/components/ui/aurora/AnimatedPressable.tsx`
**Line:** 251 (was 242 before the added comment block)

**Before:**
```tsx
  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        ...
```

**After:**
```tsx
  // pointerEvents="box-none" on the wrapper: the wrapper itself can never be the
  // touch target, but its subviews (the inner Pressable) can. This is critical
  // when AnimatedPressable is nested inside BottomSheet's GestureHandlerRootView +
  // KeyboardAvoidingView — without it, the Animated.View wrapper intercepts/
  // blocks touch propagation to the inner Pressable on Android, producing dead
  // controls (e.g. SetLogModal RPE + Cancel buttons). box-none is safe for all
  // callers because the inner Pressable is the only child + the actual target;
  // it cannot change behavior for already-working taps (box-none is strictly
  // permissive for children). See wave-b2-01-fix-dead-rpe-buttons.md.
  return (
    <Animated.View style={[containerStyle, animatedStyle]} pointerEvents="box-none">
      <Pressable
        ...
```

**Why `pointerEvents="box-none"` (not `none` / not a structural rewrite):**
- Per the React Native docs: `box-none` = "this View can never be the target of touch
  events, but its subviews can." This is exactly the desired semantics — the wrapper
  stays transparent to touches while the inner `Pressable` (the only child, the real
  target) receives them.
- `pointerEvents="none"` would be WRONG — it would make the wrapper AND its children
  ignore touches, killing every `AnimatedPressable` consumer (158 files).
- A structural rewrite (moving the `Pressable` to be the animated element directly) was
  rejected: it would risk the web-DOM-property warning the original wrapper exists to
  avoid (see the comment at line 128-130) and would be a high-blast-radius change
  across 158 consumers. `box-none` is the minimal, safe, surgical fix.

---

## 3. Caller-Safety Analysis

`AnimatedPressable` has **108 importers** (code-review-graph `importers_of`) /
**158 files referencing it** (Grep `AnimatedPressable` in `*.tsx`).

**Checked via code-review-graph `query_graph importers_of`** — the callers span every
screen/modal in the app (Home, Fitness, Diet, Analytics, Profile, Settings,
Onboarding, Auth, Workout session, all aurora primitives like `GlassCard`/
`GlassButton`/`FeatureGrid`/`EmptyState`).

**Why `box-none` is safe for ALL of them:**
1. The wrapper `Animated.View` has exactly ONE child: the inner `Pressable`. The
   `Pressable` is the actual touch target and carries all the `onPress`/`onPressIn`/
   `onPressOut`/`accessibility*`/`testID`/`style` props. The wrapper only carries
   `containerStyle` + the animated `transform`/`opacity`.
2. `box-none` is **strictly permissive for children** — it only changes whether the
   wrapper *itself* can be a touch target (it cannot). It does NOT alter layout,
   animation, accessibility, or the inner `Pressable`'s behavior in any way.
3. No consumer passes `pointerEvents` through to the wrapper (the prop is not in the
   `AnimatedPressableProps` interface and is not spread onto the wrapper), so there is
   no override conflict.
4. The existing test suite
   (`src/__tests__/components/ui/aurora/AnimatedPressable.test.tsx`) asserts on the
   inner `Pressable`'s props (`style`, `onPressIn`, `accessible`) — none of which are
   affected by a `pointerEvents` prop on the wrapper `Animated.View`.

**No caller relied on the wrapper intercepting touches** — verified by reading the
component: the wrapper has no `onTouchStart`/`onResponder*`/gesture handlers; it is
purely a layout+animation container. Making it transparent to touches is a strict
improvement.

---

## 4. tsc Result

```
npx tsc --noEmit
EXIT_CODE=0
```

Clean exit 0. No new type errors introduced. (Full jest + `expo export` gates are
handled by the wave-close gate, per task scope — not run here.)

---

## 5. Out-of-Scope Notes (for orchestrator routing)

### B-P2-2 — Floating-point weight accumulation (2.5 → 2.5445) — ROUTE TO CODE AGENT

- **Files:** `src/components/workout/SetLogModal.tsx:193-194, 536-546` +
  `src/services/calibrationService.ts` (the source of `calibrationStartKg`).
- **Root cause (confirmed by reading SetLogModal):** The weight `TextInput` at line 536
  uses `onChangeText={setWeight}` storing the RAW string. The corruption originates in
  `calibrationService.ts` (`calibrationStartKg` carries fp error), then the calibration
  `useEffect` (line 193-194) re-seeds from the progressively-corrupted stored value
  across modal re-opens. `kgToDisplay`'s `toFixed(1)` truncates correctly, but the
  raw-string `setWeight` path bypasses it on user typing.
- **Why not fixed here:** `calibrationService.ts` is OUTSIDE this agent's edit scope
  (prompt: "IF it's in a file you own for this fix (SetLogModal or the weight-display
  component). If it's elsewhere, just note it for routing"). A correct fix belongs in
  `calibrationService.ts` (round `calibrationStartKg` to 1 decimal at the source) +
  optionally a `toFixed(1)` normalization in the SetLogModal calibration `useEffect`.
  Patching only SetLogModal would mask the upstream corruption.

### B-P0-1 partial — friendly prompt when body_analysis missing — ROUTE TO CODE AGENT

- Owned by a parallel agent (`useFitnessLogic.ts` pre-flight guard). Not touched here.

### BottomSheet a11y-bridge stall (B-P1-1) — SEPARATE TRACKED ISSUE

- `BottomSheet.tsx` was NOT edited (out of scope; tracked in
  `bottomsheet-uiautomator-stall.md`). The B-P0-2 fix targets touch propagation
  through `AnimatedPressable`'s wrapper, which is orthogonal to the BottomSheet
  gesture-handler a11y-bridge issue.

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/components/ui/aurora/AnimatedPressable.tsx` | Added `pointerEvents="box-none"` to wrapper `Animated.View` (line 251) + explanatory comment. |

No other files edited. No new deps. No `Alert.alert`. No `console.log` in prod.
Aurora tokens only (no new tokens introduced — this is a behavioral prop, not styling).
