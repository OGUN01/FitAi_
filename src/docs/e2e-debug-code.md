# E2E Debug — Code-Level Accessibility Exposure (Post-Complete-Set Stall)

Investigation of why React Native nodes are not exposed to the Android
accessibility tree when the post-"Complete Set" `SetLogModal` is open.
Focus: CODE only. Device/runtime confirmation is a separate round.

Scope: `WorkoutSessionScreen.tsx`, `SetLogModal.tsx`, `ExerciseSessionModal.tsx`,
`BottomSheet.tsx`, `AnimatedPressable.tsx`, `AuroraBackground.tsx`,
`useWorkoutAnimations.ts`, `useReducedMotion`.

---

## SUSPECTS (ranked most -> least likely)

### 1. BOTTOM SHEET PORTAL — Animated.View wrapper has no `importantForAccessibility`, and the `Pressable` inside is the only accessible node — but the wrapper's animated `opacity` can transiently hide it.
- **File:** `src/components/ui/aurora/BottomSheet.tsx:194-203`
- The sheet content sits inside `<Animated.View style={[sheetWrapper, sheetAnimatedStyle]}>` where `sheetAnimatedStyle` drives `transform: [{ translateY: translateY.value }]` via a **spring** that settles to 0.
- The `Animated.View` wrapper itself has NO `accessible` / `importantForAccessibility` prop. RN's a11y tree on Android only descends into `Animated.View` nodes that are marked accessible OR that contain accessible descendants — but when the parent is mid-spring (translateY != 0, still settling), RN's native a11y bridge may skip exposing the subtree until the spring is **idle**. Reanimated springs with `damping:20, stiffness:120` (`animations.spring.smooth`) can oscillate for ~1s and, on a slow emulator, may not reach the `runOnJS` idle callback that RN's `Modal` accessibility bridge waits for.
- The backdrop `<Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>` (`BottomSheet.tsx:187`) animates `opacity` 0 -> 0.6 via `withTiming` — a second concurrent animation keeping the UI thread non-idle during the dump window.
- This is the strongest suspect because: (a) `BottomSheet` uses RN `<Modal>` portal (`RNModal` at `:173`), so its content is in a SEPARATE window from the WorkoutSessionScreen — the dump returns "valid XML but empty ViewGroups" because the modal window's React root hasn't exposed its accessible nodes yet; (b) two concurrent Reanimated animations (spring + timing) on the wrapper keep the subtree non-idle.

### 2. AnimatedPressable wrapper opacity — `opacity: opacity.value` on the `<Animated.View>` wrapping every button.
- **File:** `src/components/ui/aurora/AnimatedPressable.tsx:236-242`
- Every RPE/stepper/back button in `SetLogModal` is an `AnimatedPressable`. Its render is:
  ```tsx
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,        // <-- animated opacity on wrapper
  }));
  return (
    <Animated.View style={[containerStyle, animatedStyle]}>   // NOT accessible
      <Pressable ... accessible={isInteractive} />              // accessible
    </Animated.View>
  );
  ```
- The `Pressable` (accessible=true) is wrapped by an `Animated.View` that is NOT marked accessible. On Android, when a non-accessible parent has an animated `opacity != 1`, RN's `AccessibilityNodeInfo` provider may skip the child because the parent's `getImportantForAccessibility()` defaults to `auto` and the parent reports `!isVisible` while its opacity is in transit. The `fadeOnPress` feature (line 230) means `opacity.value` can be < 1 even at rest if a press animation didn't fully complete.
- Combined with suspect #1, the modal's buttons sit under TWO animated non-accessible wrappers, compounding the exposure gap.

### 3. ExerciseSessionModal overlay (`styles.overlay`) — still mounted behind SetLogModal during `logging` phase? NO (dismissed), but its `breathingOuterStyle` animated opacity could leak if isVisible logic is wrong.
- **File:** `src/components/fitness/ExerciseSessionModal.tsx:382, 354-357`
- `styles.overlay` is `...StyleSheet.absoluteFillObject` with `backgroundColor: rgba(0,0,0,0.8)` — an absolute-positioned opaque overlay.
- `breathingOuterStyle` animates `opacity: pulseOpacity.value` (0<->1 infinite withRepeat) on `<Animated.View style={[styles.breathingCircleOuter, breathingOuterStyle]}>` at `:422`.
- VERIFIED: this modal is gated by `isVisible={session.exercisePhase === "performing"}` (WorkoutSessionScreen:934), and `ExerciseSessionModal` early-returns `null` when `!isVisible` (`:362`). During the `logging` phase this modal is unmounted — NOT the culprit for the post-Complete-Set stall. Only relevant if the phase machine fails to transition.

### 4. exerciseContainerStyle animated opacity/scale on the ScrollView content.
- **File:** `src/screens/workout/WorkoutSessionScreen.tsx:726-729, 774-776`
- `exerciseContainerStyle` animates `opacity: fadeAnim.value` + `transform:[{scale: scaleAnim.value}]` on the `<Animated.View>` wrapping the exercise preview inside `<ScrollView>`.
- REFUTED as the primary cause: `SetLogModal` is NOT inside this wrapper. SetLogModal is rendered as a SIBLING at `WorkoutSessionScreen.tsx:957`, outside the `</ScrollView>` (which closes at `:928`). The animated container can't hide the modal's nodes.
- However: `fadeAnim`/`scaleAnim` are `SharedValue<number>` initialized to `1` (`useWorkoutAnimations.ts:23-24`) and only animate via `animateTransition()` on exercise changes. At rest they are 1 (idle). Not a perpetual blocker — only transient during transitions.

### 5. AuroraBackground pulse — reduce-motion gating is correct.
- **File:** `src/components/ui/aurora/AuroraBackground.tsx:86-110`
- `shouldAnimate = animated && !reduceMotion` (`:87`). When reduce-motion is on, `opacity.value = 1` (static, `:107`). When off, runs `withRepeat(..., -1, ...)` infinite (`:92-105`).
- This is the ROOT of the workout screen tree (`WorkoutSessionScreen.tsx:732`). If `useReducedMotion()` returns `false` on the emulator (animation scale 0 does NOT map to `isReduceMotionEnabled()` on all Android/RN versions — see E2E-VERIFICATION-PLAN.md:349-351), the infinite pulse keeps the ROOT node's opacity perpetually non-idle.
- The `AnimatedLinearGradient` root wraps `<SafeAreaView>` -> `<ScrollView>` -> ... -> the screen content. A perpetually-animating opacity on the ROOT can keep the entire native a11y subtree flagged transient.
- BUT: this would also stall ExerciseSessionModal, which the prior fix (9ca76b5) addressed by gating breathing loops. If the post-Complete-Set stall is NEW (only after Complete Set, not during Performing), AuroraBackground alone is insufficient — but it's a CONTRIBUTING FACTOR that keeps the host window non-idle while the BottomSheet portal tries to expose its own nodes.

---

## TOP_FIX (try FIRST)

**Force-expose the BottomSheet sheet surface to the a11y tree and settle its animations to idle.**

The single highest-leverage change: add `importantForAccessibility="yes"` + `accessible={true}` to the `<Animated.View style={[styles.sheetWrapper, ...]}>` in `BottomSheet.tsx`, and add `accessibilityViewIsModal={true}` to the `RNModal` so Android treats the portal window as the active modal for a11y.

**File:** `src/components/ui/aurora/BottomSheet.tsx`
**Lines:** 172-203 (the `RNModal` + sheet wrapper)

```tsx
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      testID={testID}
      statusBarTranslucent
      accessibilityViewIsModal={true}          // <-- ADD: portal = active a11y modal
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        {/* Animated backdrop. */}
        <Pressable
          onPress={closeOnOverlayPress ? handleClose : undefined}
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss"          // <-- ADD (optional)
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </Pressable>

        <PanGestureHandler
          enabled={dismissOnDrag}
          onGestureEvent={gestureHandler}
        >
          <Animated.View
            style={[
              styles.sheetWrapper,
              {
                maxHeight: getScreenHeight() * maxHeightFraction,
                paddingBottom: insets.bottom || rp(spacing.md),
              },
              sheetAnimatedStyle,
            ]}
            accessible={true}                          // <-- ADD
            importantForAccessibility="yes"            // <-- ADD
            accessibilityRole="summary"               // <-- ADD (or "none")
            accessibilityLabel={title ?? "Sheet"}     // <-- ADD
          >
```

Rationale: The RN `<Modal>` portal creates a new native window. uiautomator dumps the
topmost window's a11y tree, but RN's bridge only populates `AccessibilityNodeInfo`
for nodes flagged accessible (or that have accessible descendants AND an idle
parent). The sheet's `<Animated.View>` wrapper has neither flag, so when its
`translateY` spring is still settling (or the backdrop timing is mid-flight), the
bridge skips the subtree. Marking the wrapper `importantForAccessibility="yes"`
forces RN to emit a node regardless of the animated parent state, and
`accessibilityViewIsModal={true}` tells Android this window should be the a11y
root (so the dump targets it, not the underlying WorkoutSessionScreen window).

---

## SECONDARY_FIXES (if TOP_FIX doesn't fully expose)

### 2a. Stop the BottomSheet animations from running when the modal is open AND reduce-motion is on — make the entrance instant so the wrapper is at translateY=0 immediately.
**File:** `src/components/ui/aurora/BottomSheet.tsx:113-127`
```tsx
  // Animate in/out when `visible` changes.
  useEffect(() => {
    if (visible) {
      // When reduce-motion, snap to final state — no spring, no timing.
      // Keeps the UI thread idle so the a11y bridge exposes nodes.
      translateY.value = 0;
      backdropOpacitySV.value = backdropOpacity;
    } else {
      translateY.value = getScreenHeight();
      backdropOpacitySV.value = 0;
    }
  }, [visible, backdropOpacity, translateY, backdropOpacitySV]);
```
(Import `useReducedMotion` from `../../../utils/accessibility/hooks` and gate the `withSpring`/`withTiming` calls behind `!reduceMotion`.) This eliminates the two concurrent non-idle animations that keep the wrapper transient.

### 2b. Mark the AnimatedPressable wrapper View as accessible OR move accessibility props onto the Animated.View.
**File:** `src/components/ui/aurora/AnimatedPressable.tsx:241-264`
```tsx
  return (
    <Animated.View
      style={[containerStyle, animatedStyle]}
      accessible={isInteractive}                    // <-- ADD
      importantForAccessibility={isInteractive ? "yes" : "no"}   // <-- ADD
      accessibilityRole={accessibilityRole}         // <-- MOVE from Pressable
      accessibilityLabel={accessibilityLabel}       // <-- MOVE from Pressable
      accessibilityState={{ disabled: !!disabled }} // <-- MOVE from Pressable
    >
      <Pressable
        {...pressableProps}
        onPressIn={isInteractive ? handlePressIn : undefined}
        onPressOut={isInteractive ? handlePressOut : undefined}
        disabled={disabled}
        pressRetentionOffset={...}
        style={style}
        testID={testID}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
```
Rationale: moves the a11y contract onto the node whose `opacity`/`scale` RN actually inspects. The inner `Pressable`'s a11y props are ignored by RN's bridge when the wrapping `Animated.View` reports a transient opacity.

---

## EVIDENCE (offending blocks, abbreviated)

`BottomSheet.tsx:159-165, 194-203` — two animated styles, neither flagged accessible:
```tsx
const sheetAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
}));
const backdropAnimatedStyle = useAnimatedStyle(() => ({
  opacity: backdropOpacitySV.value,
}));
// ...
<Animated.View
  style={[styles.sheetWrapper, { maxHeight: ..., paddingBottom: ... }, sheetAnimatedStyle]}
>   // <-- no accessible / importantForAccessibility
```

`BottomSheet.tsx:113-127` — spring + timing run concurrently on open:
```tsx
if (visible) {
  translateY.value = withSpring(0, animations.spring.smooth);        // damping:20, stiffness:120
  backdropOpacitySV.value = withTiming(backdropOpacity, { duration: 300 });
}
```

`BottomSheet.tsx:172-180` — RN Modal portal (separate window):
```tsx
<RNModal visible={visible} transparent animationType="none" onRequestClose={handleClose} ...>
  <GestureHandlerRootView style={styles.gestureRoot}>
```

`AnimatedPressable.tsx:236-264` — animated opacity on non-accessible wrapper:
```tsx
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));
return (
  <Animated.View style={[containerStyle, animatedStyle]}>   // not accessible
    <Pressable ... accessible={isInteractive} />             // a11y here, ignored under transient parent
```

`AuroraBackground.tsx:89-110` — infinite withRepeat on root opacity when reduce-motion off:
```tsx
if (shouldAnimate) {
  opacity.value = withRepeat(withSequence(withTiming(1 - intensity, ...), withTiming(1, ...)), -1, false);
} else { opacity.value = 1; }
```

`useReducedMotion` `hooks.ts:14-23` — probes `AccessibilityInfo.isReduceMotionEnabled()`, which does NOT reliably reflect Android "animation scale 0" on all RN/Android versions (see E2E-VERIFICATION-PLAN.md:349-351). If it returns false on the emulator, AuroraBackground's root pulse runs forever, keeping the host window non-idle.

`ExerciseSessionModal.tsx:362` — confirmed unmounts when not visible (NOT the culprit during logging phase):
```tsx
if (!isVisible) return null;
```
