/**
 * DialStepper — numeric stepper (blueprint §7.5)
 *
 * ± cells (surface.1 + border.subtle, radius 4–8), value in heroStat
 * (Manrope_800ExtraBold 40). impactAsync(Medium) per step. Long-press
 * accelerates (scrub) via a repeating timer.
 */

import React, { useCallback, useRef } from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";

const VALUE_SPRING = { damping: 18, stiffness: 140 };

export interface DialStepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  format?: (v: number) => string;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

const fireImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

const clampStep = (v: number, min: number, max: number, step: number) => {
  const clamped = Math.max(min, Math.min(max, v));
  // Snap to step grid.
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Math.max(min, Math.min(max, snapped));
};

export const DialStepper: React.FC<DialStepperProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  unit,
  format,
  style,
  testID,
}) => {
  const display = useSharedValue(value);

  React.useEffect(() => {
    display.value = withSpring(value, VALUE_SPRING);
  }, [value, display]);

  const apply = useCallback(
    (next: number) => {
      const v = clampStep(next, min, max, step);
      if (v !== value) {
        fireImpact();
        onChange(v);
      }
    },
    [min, max, step, value, onChange]
  );

  // Long-press scrub: a timer that repeatedly steps while held.
  const scrubRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startScrub = useCallback(
    (dir: 1 | -1) => {
      stopScrub();
      scrubRef.current = setInterval(() => {
        apply(value + dir * step);
      }, 90);
    },
    [apply, value, step]
  );
  const stopScrub = useCallback(() => {
    if (scrubRef.current) {
      clearInterval(scrubRef.current);
      scrubRef.current = null;
    }
  }, []);
  React.useEffect(() => stopScrub, [stopScrub]);

  const valueStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }));

  const formatted = format ? format(value) : String(value);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <StepButton
        icon="remove"
        disabled={value <= min}
        onPress={() => apply(value - step)}
        onLongPress={() => startScrub(-1)}
        onLongPressRelease={stopScrub}
      />
      <View style={styles.valueCell}>
        <Animated.Text style={[styles.value, valueStyle]}>
          {formatted}
          {unit ? <Animated.Text style={styles.unit}> {unit}</Animated.Text> : null}
        </Animated.Text>
      </View>
      <StepButton
        icon="add"
        disabled={value >= max}
        onPress={() => apply(value + step)}
        onLongPress={() => startScrub(1)}
        onLongPressRelease={stopScrub}
      />
    </View>
  );
};

interface StepButtonProps {
  icon: "add" | "remove";
  disabled: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onLongPressRelease: () => void;
}

const StepButton: React.FC<StepButtonProps> = ({
  icon,
  disabled,
  onPress,
  onLongPress,
  onLongPressRelease,
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      delayLongPress={400}
      onPressIn={() => {
        scale.value = withSpring(0.94, VALUE_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, VALUE_SPRING);
        onLongPressRelease();
      }}
      accessibilityRole="button"
      accessibilityLabel={icon === "add" ? "Increase" : "Decrease"}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[styles.stepCell, animStyle]}>
        <Ionicons name={icon} size={22} color={colors.text.primary} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepCell: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: surface[1],
    alignItems: "center",
    justifyContent: "center",
  },
  valueCell: {
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  value: {
    fontFamily: typography.variants.heroStat.fontFamily,
    fontSize: typography.variants.heroStat.fontSize,
    lineHeight: typography.variants.heroStat.fontSize * typography.variants.heroStat.lineHeight,
    color: colors.text.primary,
  },
  unit: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: typography.variants.caption2.fontSize,
    color: colors.text.tertiary,
  },
});
