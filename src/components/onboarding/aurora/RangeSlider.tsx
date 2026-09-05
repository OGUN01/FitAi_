/**
 * RangeSlider — value slider (blueprint §7.6)
 *
 * Track surface.2; fill accentColor; thumb colors.text.primary with a
 * border.DEFAULT ring; radius full thumb. impactAsync(Medium) every
 * tickHapticEvery (default 8% of track). Fill animates with the drag (no lag).
 */

import React, { useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  surface,
  border,
  colors,
  spacing,
  chart,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";

export interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  /** Fire impactAsync(Medium) every N% of track travel. @default 8 */
  tickHapticEvery?: number;
  /** Accent chart color for the fill. @default chart[1] */
  accentColor?: string;
  /** Show the live value bubble above the thumb. @default true */
  showValue?: boolean;
  /** Accessible name announced by screen readers (e.g. "Height"). Falls back
      to the unit string if omitted — always pass a real label per field. */
  accessibilityLabel?: string;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

const fireImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

const snap = (v: number, min: number, step: number) => {
  const snapped = Math.round((v - min) / step) * step + min;
  return snapped;
};

export const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  unit,
  tickHapticEvery = 8,
  accentColor = chart[1],
  showValue = true,
  accessibilityLabel,
  style,
  testID,
}) => {
  const trackWidth = useSharedValue(0);
  const lastTickBucket = useRef<number>(-1);
  // Absolute page offset of the track — gestureState x0/moveX are
  // screen-relative (pageX), so the fraction MUST subtract this or web's
  // centered layout (track starts hundreds of px into the viewport) reads
  // every touch as fraction > 1 and the slider pins to max.
  const trackPageX = useRef(0);
  const trackRef = useRef<View | null>(null);

  const fraction = max > min ? (value - min) / (max - min) : 0;
  const clampedFraction = Math.max(0, Math.min(1, fraction));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${clampedFraction * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${clampedFraction * 100}%`,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
    const node = trackRef.current as unknown as {
      measure?: (
        cb: (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => void,
      ) => void;
    } | null;
    node?.measure?.((_x, _y, _w, _h, pageX) => {
      if (typeof pageX === "number" && Number.isFinite(pageX)) {
        trackPageX.current = pageX;
      }
    });
  };

  const updateFromFraction = useCallback(
    (fx: number) => {
      // Guard against the first-touch race: onLayout's async measure() may not
      // have resolved yet, leaving trackPageX.current at 0. Gesture math then
      // computes (g.x0 - 0) / w, a fraction far above 1 that clamps to 1 and
      // writes max (e.g. height_cm=250) — corrupting persisted state. Skip the
      // write entirely until the track position is actually known.
      if (trackPageX.current === 0) return;
      const clamped = Math.max(0, Math.min(1, fx));
      const raw = min + clamped * (max - min);
      const snapped = snap(raw, min, step);
      const v = Math.max(min, Math.min(max, snapped));
      // Tick haptic: bucket the fraction into tickHapticEvery% bins.
      const bucket = Math.floor(clamped * (100 / tickHapticEvery));
      if (bucket !== lastTickBucket.current) {
        lastTickBucket.current = bucket;
        runOnJS(fireImpact)();
      }
      onChange(v);
    },
    [min, max, step, tickHapticEvery, onChange]
  );

  // The PanResponder below is created ONCE (useRef initializer) so it never
  // re-binds mid-gesture — but that means its grant/move handlers would
  // permanently close over the FIRST-render `updateFromFraction`, which closes
  // over the first-render `onChange` → the caller's first-render state setter
  // (e.g. useBodyAnalysis.updateField spreads mount-time formData). The
  // visible symptom was the "slider coupling" bug: dragging the weight slider
  // re-wrote height back to its mount value. Route every touch through a ref
  // so the responder always calls the LATEST callback (same pattern as
  // GoalVisualizationSection's applyTouchRef).
  const updateFromFractionRef = useRef(updateFromFraction);
  updateFromFractionRef.current = updateFromFraction;

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        const w = trackWidth.value || 1;
        updateFromFractionRef.current((g.x0 - trackPageX.current) / w);
      },
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        const w = trackWidth.value || 1;
        updateFromFractionRef.current((g.x0 + g.dx - trackPageX.current) / w);
      },
      onPanResponderRelease: () => {
        runOnJS(fireImpact)();
      },
    })
  ).current;

  // VoiceOver/TalkBack: swipe-up/down on an "adjustable" element fires these
  // actions instead of the pan gesture (screen-reader users can't drag).
  // Nudge by one step per action so the control is actually operable.
  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      const delta = event.nativeEvent.actionName === "increment" ? step : -step;
      const next = Math.max(min, Math.min(max, value + delta));
      onChange(next);
    },
    [min, max, step, value, onChange]
  );

  // Web keyboard support: `accessibilityRole="adjustable"` maps to `role=
  // "slider"` in the DOM, but an ARIA role alone does not make an element
  // keyboard-focusable or -operable — that needs an explicit `tabIndex` plus
  // a real key handler. Without this, the ONLY way to operate this control
  // on web was a pointer drag (confirmed live: `document.activeElement`
  // never left `body` after tapping the track, and arrow-key presses did
  // nothing at all) — a real keyboard-accessibility gap, since this control
  // is used for onboarding fields like height/weight. Mirrors the exact
  // increment/decrement step math already used for VoiceOver/TalkBack above.
  const handleKeyDown = useCallback(
    (event: { key: string; preventDefault?: () => void }) => {
      let delta = 0;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") delta = step;
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") delta = -step;
      else if (event.key === "Home") delta = min - value;
      else if (event.key === "End") delta = max - value;
      else return;
      event.preventDefault?.();
      const next = Math.max(min, Math.min(max, value + delta));
      onChange(next);
    },
    [min, max, step, value, onChange]
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* touchArea is the REAL interactive/measured element (44px min
          height) — the visual track inside it is a deliberately thin 4px
          line, and the thumb is purely decorative (no touch handler of its
          own). `hitSlop` was tried here first but confirmed INERT on web:
          react-native-web's `View` only forwards props in its own
          allow-list (`forwardPropsList` in
          node_modules/react-native-web/dist/exports/View/index.js), which
          does not include `hitSlop` — it's silently dropped, and
          `Pressable` doesn't intercept it either (spreads straight through
          to `View`). Confirmed empirically too: `elementFromPoint` just
          outside the visual box (but inside the claimed hitSlop zone)
          returned nothing. A REAL enlarged box is the only thing that
          actually expands the hit-testable region on web; native RN's
          hitSlop still works, so this fix is web-motivated but harmless on
          native (just a taller invisible touch layer). */}
      <View
        ref={trackRef}
        style={styles.touchArea}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel || (unit ? `Value in ${unit}` : "Value")}
        accessibilityValue={{
          min,
          max,
          now: value,
          text: `${value}${unit ? " " + unit : ""}`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Increase" },
          { name: "decrement", label: "Decrease" },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
        tabIndex={0}
        // @ts-expect-error — `onKeyDown` is a react-native-web-only prop
        // (forwarded straight to the DOM node), not present in React
        // Native's core `ViewProps` typings; harmlessly ignored on native.
        onKeyDown={handleKeyDown}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle, { backgroundColor: accentColor }]} />
          <Animated.View style={[styles.thumbWrap, thumbStyle]}>
            <View style={styles.thumb} />
            {showValue && (
              <View style={styles.valueBubble}>
                <Animated.Text style={styles.valueText}>
                  {value}
                  {unit ? ` ${unit}` : ""}
                </Animated.Text>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: spacing.md,
  },
  // Real (not hitSlop) 44px-minimum interactive layer — see the comment
  // above its usage for why hitSlop doesn't work here on web.
  touchArea: {
    width: "100%",
    minHeight: 44,
    justifyContent: "center",
  },
  track: {
    height: 4,
    width: "100%",
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    height: 4,
    borderRadius: borderRadius.full,
  },
  thumbWrap: {
    position: "absolute",
    top: "50%",
    transform: [{ translateX: -14 }, { translateY: -14 }],
    alignItems: "center",
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text.primary,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  valueBubble: {
    position: "absolute",
    bottom: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.md,
    backgroundColor: surface[2],
    borderWidth: 1,
    borderColor: border.subtle,
  },
  valueText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.text.primary,
  },
});
