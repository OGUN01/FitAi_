/**
 * ChipPicker — single/multi-select chips (blueprint §7.4)
 *
 * Unselected: surface.1 + border.subtle + body text.
 * Selected: chart-color tint (TINT_ALPHA_LOW) + border.DEFAULT + primary text,
 * scales 1.04 spring (damping 14, stiffness 140); unselected fade to 0.5.
 * `suggestions` ids get a subtle bulb tint to surface them.
 * radius 12 (chips). selectionAsync on select.
 */

import React, { useCallback, useMemo } from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
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
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT } from "../../../utils/colors";

const SELECT_SPRING = { damping: 14, stiffness: 140 };

export interface ChipOption {
  id: string;
  label: string;
  icon?: string;
}

export interface ChipPickerProps {
  options: ChipOption[];
  /** Single id (single-select) or array of ids (multi-select). */
  value: string | string[];
  onSelect: (id: string) => void;
  multi?: boolean;
  /** ids to surface with a subtle bulb tint (e.g. body-type-aware suggestions). */
  suggestions?: string[];
  /** Accent chart color for the selected tint. @default chart[1] */
  accentColor?: string;
  /** Extra style for the wrapping row. */
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const ChipPicker: React.FC<ChipPickerProps> = ({
  options,
  value,
  onSelect,
  multi,
  suggestions,
  accentColor = chart[1],
  style,
  testID,
}) => {
  // Plain JS memo — `value` is a regular prop, not a shared value. A
  // useDerivedValue here forced a `.value` read during React render (Reanimated
  // strict warning) and could serve a stale set between worklet re-evals.
  const selectedSet = useMemo(
    () => new Set(Array.isArray(value) ? value : [value]),
    [value],
  );

  const handleSelect = useCallback(
    (id: string) => {
      runOnJS(fireSelection)();
      onSelect(id);
    },
    [onSelect]
  );

  return (
    <Animated.View style={[styles.row, style]} testID={testID}>
      {options.map((opt) => (
        <Chip
          key={opt.id}
          option={opt}
          selected={selectedSet.has(opt.id)}
          suggested={!!suggestions && suggestions.includes(opt.id)}
          accentColor={accentColor}
          onPress={handleSelect}
        />
      ))}
    </Animated.View>
  );
};

interface ChipProps {
  option: ChipOption;
  selected: boolean;
  suggested: boolean;
  accentColor: string;
  onPress: (id: string) => void;
}

const Chip: React.FC<ChipProps> = ({
  option,
  selected,
  suggested,
  accentColor,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(selected ? 1 : 0.5);

  React.useEffect(() => {
    opacity.value = withTiming(selected ? 1 : 0.5, { duration: 200 });
    if (selected) scale.value = withSpring(1.04, SELECT_SPRING);
    else scale.value = withSpring(1, SELECT_SPRING);
  }, [selected, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const selectedBg = hexToRgba(accentColor, TINT_ALPHA_LOW);
  const suggestedTint = hexToRgba(accentColor, TINT_ALPHA_SOFT);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(option.id)}
        style={[
          styles.chip,
          selected
            ? { backgroundColor: selectedBg, borderColor: border.DEFAULT }
            : { backgroundColor: surface[1], borderColor: border.subtle },
          suggested && !selected && { backgroundColor: suggestedTint },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={option.label}
      >
        {option.icon && (
          <Ionicons
            name={option.icon as React.ComponentProps<typeof Ionicons>["name"]}
            size={16}
            color={selected ? accentColor : colors.text.tertiary}
            style={styles.chipIcon}
          />
        )}
        <Animated.Text
          style={[
            styles.chipLabel,
            { color: selected ? colors.text.primary : colors.text.secondary },
          ]}
        >
          {option.label}
        </Animated.Text>
        {suggested && (
          <View style={[styles.bulb, { backgroundColor: accentColor }]} />
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipLabel: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    lineHeight: typography.variants.body.lineHeight,
  },
  bulb: {
    width: 6,
    height: 6,
    borderRadius: 9999,
    marginLeft: spacing.xs,
  },
});
