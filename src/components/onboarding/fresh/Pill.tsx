/**
 * Pill — minimal selectable chip for MULTI-select sets (docs/onboarding-fresh-design.md)
 *
 * Equipment, workout types, habits. Text + 1px hairline border, radius 999,
 * paddingH 14 / paddingV 8.
 *
 * Selected:   border + text turn accent, background accentDim.
 * Unselected: hairline border, ink2 text, transparent bg.
 *
 * Tab agents lay Pills out in a wrapping row: flexDirection "row",
 * flexWrap "wrap", gap 8.
 */

import React from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { tokens, type as typeScale } from "./tokens";

const PRESS_DURATION = 120;
const PRESS_OPACITY = 0.6;
const PRESS_SCALE = 0.96;

export interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Optional leading icon (16px) — always shown. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon-swap system: when set, unselected shows this icon (e.g. "add"),
      selected shows "checkmark". Overrides `icon` display. */
  iconOff?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  testID?: string;
}

export const Pill: React.FC<PillProps> = ({
  label,
  selected,
  onPress,
  icon,
  iconOff,
  disabled = false,
  testID,
}) => {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (disabled) return;
    opacity.value = withTiming(PRESS_OPACITY, { duration: PRESS_DURATION });
    scale.value = withTiming(PRESS_SCALE, { duration: PRESS_DURATION });
  };
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: PRESS_DURATION });
    scale.value = withTiming(1, { duration: PRESS_DURATION });
  };

  const shownIcon = iconOff ? (selected ? "checkmark" : iconOff) : icon;

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
      <Animated.View
        style={[
          styles.pill,
          selected && styles.pillSelected,
          animatedStyle,
        ]}
      >
        {shownIcon && (
          <Ionicons
            name={shownIcon}
            size={16}
            color={selected ? tokens.accent : tokens.ink2}
            style={styles.icon}
          />
        )}
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    // Real (not hitSlop) 44px-minimum touch target — measured ~37px live on
    // web (this component has no hitSlop of its own to begin with, but the
    // same web-only hitSlop-inertness finding applies to any caller that
    // assumed padding + hitSlop was "close enough"). minHeight forces the
    // full chip to at least 44px while paddingVertical keeps the visual
    // label/icon vertically centered — no visual size change beyond a
    // slightly taller chip.
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.hairline,
    backgroundColor: "transparent",
  },
  pillSelected: {
    borderColor: tokens.accent,
    backgroundColor: tokens.accentDim,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    ...typeScale.body,
    color: tokens.ink2,
  },
  labelSelected: {
    color: tokens.accent,
  },
});

export default Pill;
