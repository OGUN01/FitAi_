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
  style,
  testID,
}) => {
  const trackWidth = useSharedValue(0);
  const lastTickBucket = useRef<number>(-1);

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
  };

  const updateFromFraction = useCallback(
    (fx: number) => {
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

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        const w = trackWidth.value || 1;
        updateFromFraction(g.x0 / w);
      },
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        const w = trackWidth.value || 1;
        updateFromFraction((g.x0 + g.dx) / w);
      },
      onPanResponderRelease: () => {
        runOnJS(fireImpact)();
      },
    })
  ).current;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={styles.track}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityValue={{
          min,
          max,
          now: value,
          text: `${value}${unit ? " " + unit : ""}`,
        }}
      >
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
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: spacing.md,
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
