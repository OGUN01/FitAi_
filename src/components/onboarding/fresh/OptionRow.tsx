/**
 * OptionRow — THE replacement for card tiles (docs/onboarding-fresh-design.md)
 *
 * Full-width row, height 56, hairline below. Left: label (value type).
 * Optional sublabel (caption, ink3). Optional left icon (ink2, 20px).
 *
 * Selected:   label full ink + 2px accent bar on the left edge + accent check
 *             (Ionicons "checkmark", 18px) on the right.
 * Unselected: label ink2, no check, no bar (a transparent 2px slot keeps every
 *             row's label aligned — no layout shift on toggle).
 *
 * Transparent background ALWAYS. Tap fires onPress with a 120ms opacity 0.6
 * press feedback.
 */

import React, { useEffect } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { tokens, type as typeScale, spacing } from "./tokens";

const PRESS_DURATION = 120;
const PRESS_OPACITY = 0.6;
const BAR_FADE_DURATION = 160;

export interface OptionRowProps {
  label: string;
  /** Optional secondary line (caption, ink3). */
  sublabel?: string;
  /** Optional left icon (20px, ink2 — full ink when selected). */
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export const OptionRow: React.FC<OptionRowProps> = ({
  label,
  sublabel,
  icon,
  selected,
  onPress,
  disabled = false,
  testID,
}) => {
  const opacity = useSharedValue(1);
  // Selection payoff: the 2px accent bar fades in/out (160ms) and the check
  // springs in, so a tap reads as "done" instead of an instant swap.
  const barOpacity = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    barOpacity.value = withTiming(selected ? 1 : 0, {
      duration: BAR_FADE_DURATION,
    });
  }, [selected, barOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }));

  const onPressIn = () => {
    if (disabled) return;
    opacity.value = withTiming(PRESS_OPACITY, { duration: PRESS_DURATION });
  };
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: PRESS_DURATION });
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.row}>
          {/* 2px left-edge slot: accent bar when selected, transparent spacer
              otherwise so labels never shift on toggle. */}
          <View style={styles.bar}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={selected ? tokens.ink : tokens.ink2}
              style={styles.icon}
            />
          )}
          <View style={styles.textWrap}>
            <Text
              style={[
                styles.label,
                !selected && styles.labelUnselected,
                disabled && styles.labelDisabled,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {sublabel && (
              <Text style={styles.sublabel} numberOfLines={1}>
                {sublabel}
              </Text>
            )}
          </View>
          {selected && (
            <Animated.View entering={ZoomIn.springify().damping(15).stiffness(260)}>
              <Ionicons
                name="checkmark"
                size={18}
                color={tokens.accent}
                style={styles.check}
              />
            </Animated.View>
          )}
        </View>
        {/* hairline below the row */}
        <View style={styles.hairline} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    height: spacing.rowH,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bar: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: "transparent",
    marginRight: 14,
  },
  barFill: {
    flex: 1,
    backgroundColor: tokens.accent,
  },
  icon: {
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    ...typeScale.value,
  },
  labelUnselected: {
    color: tokens.ink2,
  },
  labelDisabled: {
    color: tokens.ink3,
  },
  sublabel: {
    ...typeScale.caption,
    marginTop: 2,
  },
  check: {
    marginLeft: 12,
  },
  hairline: {
    height: spacing.hair,
    backgroundColor: tokens.hairline,
    alignSelf: "stretch",
  },
});

export default OptionRow;
