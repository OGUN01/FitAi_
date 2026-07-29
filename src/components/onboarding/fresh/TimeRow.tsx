/**
 * TimeRow — compact time stepper (docs/onboarding-fresh-design.md)
 *
 * THE replacement for the oversized filled sleep/wake dials. A single 56px
 * hairline-separated row: label on the left, a quiet [-] HH:MM [+] stepper on
 * the right. No giant dials, no filled circles — the time is the only thing
 * that draws the eye.
 *
 * Value is an "HH:MM" 24h string; +/- step by `stepMinutes` (default 15),
 * wrapping around midnight. Buttons are 32px ghost circles (hairline border),
 * 120ms opacity press feedback. Transparent background always.
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { tokens, type as typeScale, spacing } from "./tokens";

const PRESS_DURATION = 120;
const PRESS_OPACITY = 0.5;
const VALUE_PULSE_DURATION = 180;
const VALUE_PULSE_OPACITY = 0.35;
const MINUTES_PER_DAY = 1440;

const toMinutes = (hhmm: string): number => {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const toHHMM = (mins: number): string => {
  const wrapped = ((mins % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export interface TimeRowProps {
  label: string;
  /** "HH:MM" 24h value. */
  value: string;
  /** Called with the new "HH:MM" string. */
  onChange: (hhmm: string) => void;
  /** Step size in minutes. @default 15 */
  stepMinutes?: number;
  testID?: string;
}

export const TimeRow: React.FC<TimeRowProps> = ({
  label,
  value,
  onChange,
  stepMinutes = 15,
  testID,
}) => {
  const step = (dir: 1 | -1) =>
    onChange(toHHMM(toMinutes(value) + dir * stepMinutes));

  // Value pulse: every change dips the time to 35% and back (180ms) so the
  // step feels paid off — same acknowledgement language as AgeStepper and
  // SleepInsight. Skipped on mount (firstRender guard) to avoid mount shimmer.
  const valueOpacity = useSharedValue(1);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    valueOpacity.value = VALUE_PULSE_OPACITY;
    valueOpacity.value = withTiming(1, { duration: VALUE_PULSE_DURATION });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const valueStyle = useAnimatedStyle(() => ({ opacity: valueOpacity.value }));

  return (
    <View testID={testID}>
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.stepper}>
          <StepButton
            icon="remove"
            onPress={() => step(-1)}
            accessibilityLabel={`Decrease ${label}`}
            testID={testID ? `${testID}-minus` : undefined}
          />
          <Animated.Text style={[styles.time, valueStyle]}>
            {value}
          </Animated.Text>
          <StepButton
            icon="add"
            onPress={() => step(1)}
            accessibilityLabel={`Increase ${label}`}
            testID={testID ? `${testID}-plus` : undefined}
          />
        </View>
      </View>
      <View style={styles.hairline} />
    </View>
  );
};

const StepButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}> = ({ icon, onPress, accessibilityLabel, testID }) => {
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        opacity.value = withTiming(PRESS_OPACITY, { duration: PRESS_DURATION });
      }}
      onPressOut={() => {
        opacity.value = withTiming(1, { duration: PRESS_DURATION });
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={8}
    >
      <Animated.View style={[styles.btn, animatedStyle]}>
        <Ionicons name={icon} size={18} color={tokens.ink} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    height: spacing.rowH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  label: {
    ...typeScale.value,
    color: tokens.ink2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
  },
  time: {
    ...typeScale.valueLg,
    color: tokens.ink,
    minWidth: 72,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  hairline: {
    height: spacing.hair,
    backgroundColor: tokens.hairline,
    alignSelf: "stretch",
  },
});

export default TimeRow;
