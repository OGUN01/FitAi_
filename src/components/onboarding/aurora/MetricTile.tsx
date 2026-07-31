/**
 * MetricTile — S5 dashboard tile (blueprint §7.12)
 *
 * surface.1 + border.subtle, radius 20, value in heroStat variant colored
 * with chartColor, label in caption variant in text.secondary. FadeInDown
 * 250ms staggered 40ms. Tap → 0.97 spring → selectionAsync → onEdit.
 */

import React from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  colors,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";

const PRESS_SPRING = { damping: 14, stiffness: 140 };

export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  /** Tile accent chart color (drives the value color + edit affordance). */
  chartColor: string;
  onEdit?: () => void;
  /** @default true when onEdit is provided. */
  editable?: boolean;
  /** FadeInDown stagger delay in ms. @default 0 */
  delay?: number;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  icon,
  chartColor,
  onEdit,
  editable,
  delay = 0,
  style,
  testID,
}) => {
  const isEditable = editable ?? !!onEdit;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!isEditable || !onEdit) return;
    runOnJS(fireSelection)();
    onEdit();
  };

  const displayValue = typeof value === "number" ? String(value) : value;

  return (
    <Animated.View
      entering={FadeInDown.duration(250).delay(delay)}
      style={[styles.container, style]}
      testID={testID}
    >
      <Pressable
        onPress={handlePress}
        disabled={!isEditable}
        onPressIn={() => {
          if (isEditable) scale.value = withSpring(0.97, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        accessibilityRole={isEditable ? "button" : "text"}
        accessibilityLabel={`${label}: ${displayValue}${unit ? " " + unit : ""}`}
        accessibilityHint={isEditable ? "Tap to edit" : undefined}
      >
        <Animated.View style={[styles.tile, animatedStyle]}>
          <View style={styles.header}>
            {icon && (
              <Ionicons
                name={icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={16}
                color={chartColor}
              />
            )}
            <Animated.Text style={styles.label}>{label}</Animated.Text>
            {isEditable && (
              <Ionicons name="pencil" size={12} color={colors.text.tertiary} />
            )}
          </View>
          <View style={styles.valueRow}>
            <Animated.Text style={[styles.value, { color: chartColor }]}>
              {displayValue}
            </Animated.Text>
            {unit && <Animated.Text style={styles.unit}>{unit}</Animated.Text>}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tile: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.md,
    minHeight: 96,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    flex: 1,
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.lineHeight,
    color: colors.text.secondary,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xxs,
  },
  value: {
    fontFamily: typography.variants.heroStat.fontFamily,
    fontSize: typography.variants.heroStat.fontSize,
    lineHeight: typography.variants.heroStat.lineHeight,
  },
  unit: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: typography.variants.caption2.fontSize,
    color: colors.text.tertiary,
  },
});
