/**
 * TogglePill — boolean toggle (blueprint §7.8)
 *
 * Off: surface.1 + border.subtle. On: chart-color tint (TINT_ALPHA_LOW) +
 * border.DEFAULT. radius 12. Knob slides via withSpring 200ms; selectionAsync.
 */

import React, { useEffect } from "react";
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
  chart,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";

const KNOB_SPRING = { damping: 18, stiffness: 200 };
const KNOB_TRAVEL = 22; // px the knob travels when toggled on

export interface TogglePillProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
  /** Accent chart color for the on-tint. @default chart[1] */
  accentColor?: string;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const TogglePill: React.FC<TogglePillProps> = ({
  label,
  value,
  onChange,
  icon,
  accentColor = chart[1],
  style,
  testID,
}) => {
  const knob = useSharedValue(value ? KNOB_TRAVEL : 0);

  useEffect(() => {
    knob.value = withSpring(value ? KNOB_TRAVEL : 0, KNOB_SPRING);
  }, [value, knob]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knob.value }],
  }));

  const onBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Pressable
      onPress={() => {
        fireSelection();
        onChange(!value);
      }}
      style={[
        styles.container,
        value
          ? { backgroundColor: onBg, borderColor: border.DEFAULT }
          : { backgroundColor: surface[1], borderColor: border.subtle },
        style,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      testID={testID}
    >
      {icon && (
        <Ionicons
          name={icon as React.ComponentProps<typeof Ionicons>["name"]}
          size={16}
          color={value ? accentColor : colors.text.tertiary}
          style={styles.icon}
        />
      )}
      <Animated.Text
        style={[
          styles.label,
          { color: value ? colors.text.primary : colors.text.secondary },
        ]}
      >
        {label}
      </Animated.Text>
      <View style={styles.track}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    gap: spacing.sm,
  },
  icon: {
    marginRight: spacing.xxs,
  },
  label: {
    flex: 1,
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    lineHeight: typography.variants.body.fontSize * typography.variants.body.lineHeight,
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text.primary,
  },
});
