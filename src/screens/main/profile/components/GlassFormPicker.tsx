/**
 * GlassFormPicker - Unified FormField pattern for selection
 * Label above, 14px radius, focused accent border on selected.
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
} from "../../../../theme/aurora-tokens";
import { rf, rw } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";

const { variants } = typography;

interface PickerOption {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface GlassFormPickerProps {
  label: string;
  options: PickerOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
  columns?: 1 | 2 | 3;
  error?: string;
  hint?: string;
}

export const GlassFormPicker: React.FC<GlassFormPickerProps> = React.memo(({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
  columns = 2,
  error,
  hint,
}) => {
  const isSelected = useCallback(
    (optionValue: string): boolean => {
      if (multiSelect && Array.isArray(value)) {
        return value.includes(optionValue);
      }
      return value === optionValue;
    },
    [multiSelect, value],
  );

  const handleSelect = useCallback(
    (optionValue: string) => {
      haptics.light();
      if (multiSelect) {
        const currentValues = Array.isArray(value) ? value : [];
        if (currentValues.includes(optionValue)) {
          onChange(currentValues.filter((v) => v !== optionValue));
        } else {
          onChange([...currentValues, optionValue]);
        }
      } else {
        onChange(optionValue);
      }
    },
    [multiSelect, value, onChange],
  );

  const getColumnWidth = useCallback(() => {
    switch (columns) {
      case 1:
        return "100%";
      case 2:
        return "48.5%";
      case 3:
        return "31.5%";
      default:
        return "48.5%";
    }
  }, [columns]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[styles.optionsGrid, columns === 1 && styles.optionsGridSingle]}
      >
        {options.map((option, index) => {
          const selected = isSelected(option.value);

          return (
            <Animated.View
              key={option.value}
              entering={FadeInDown.delay(index * 40).duration(250)}
              style={[styles.optionWrapper, { width: getColumnWidth() }]}
            >
              <Pressable
                onPress={() => handleSelect(option.value)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={selected ? { selected: true } : undefined}
                style={({ pressed }) => [
                  styles.optionButton,
                  selected && styles.optionButtonSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <View
                  style={[
                    styles.optionContent,
                    columns === 3 && { paddingHorizontal: spacing.xs },
                  ]}
                >
                  {option.icon && (
                    <View
                      style={[
                        styles.optionIcon,
                        selected && styles.optionIconSelected,
                        columns === 3 && {
                          width: rw(24),
                          height: rw(24),
                          borderRadius: rw(12),
                          marginRight: spacing.xs,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={columns === 3 ? rf(14) : rf(18)}
                        color={
                          selected ? colors.primary.DEFAULT : colors.text.secondary
                        }
                      />
                    </View>
                  )}

                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                        columns === 3 && { fontSize: rf(12) },
                      ]}
                      numberOfLines={columns === 3 ? 1 : 2}
                      ellipsizeMode="tail"
                    >
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text
                        style={styles.optionDescription}
                        numberOfLines={columns === 3 ? 1 : 2}
                        ellipsizeMode="tail"
                      >
                        {option.description}
                      </Text>
                    )}
                  </View>

                  {selected && (
                    <View
                      style={[
                        styles.checkmark,
                        columns === 3 && {
                          width: rw(18),
                          height: rw(18),
                          borderRadius: rw(9),
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={columns === 3 ? rf(10) : rf(14)}
                        color={colors.primary.DEFAULT}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={rf(12)}
            color={colors.error.DEFAULT}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...variants.caption,
    fontSize: rf(13),
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  optionsGridSingle: {
    flexDirection: "column",
  },
  optionWrapper: {
    marginBottom: spacing.xs,
  },
  optionButton: {
    backgroundColor: surface[1],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    overflow: "hidden",
    minHeight: Math.max(rw(52), 44),
    justifyContent: "center",
  },
  optionButtonSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: surface[2],
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  optionIconSelected: {
    backgroundColor: `${colors.primary.DEFAULT}14`,
  },
  optionTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    ...variants.body,
    fontSize: rf(14),
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    color: colors.text.primary,
    fontFamily: "Manrope_600SemiBold",
  },
  optionDescription: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  checkmark: {
    width: rw(22),
    height: rw(22),
    borderRadius: rw(11),
    backgroundColor: `${colors.primary.DEFAULT}26`,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorText: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.error.DEFAULT,
  },
  hintText: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
});

export default GlassFormPicker;
