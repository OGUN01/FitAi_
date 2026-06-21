/**
 * GlassFormPicker - Glassmorphic Selection Picker Component
 *
 * Features:
 * - Single and multi-select modes
 * - Glassmorphic option buttons
 * - Icon support
 * - Animated selection state
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

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

export const GlassFormPicker: React.FC<GlassFormPickerProps> = ({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
  columns = 2,
  error,
  hint,
}) => {
  const isSelected = (optionValue: string): boolean => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleSelect = (optionValue: string) => {
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
  };

  const getColumnWidth = () => {
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
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Options Grid */}
      <View
        style={[styles.optionsGrid, columns === 1 && styles.optionsGridSingle]}
      >
        {options.map((option, index) => {
          const selected = isSelected(option.value);

          return (
            <Animated.View
              key={option.value}
              entering={FadeIn.delay(index * 50).duration(300)}
              style={[styles.optionWrapper, { width: getColumnWidth() }]}
            >
              <AnimatedPressable
                onPress={() => handleSelect(option.value)}
                scaleValue={0.95}
                hapticFeedback={false}
              >
                <View
                  style={[
                    styles.optionButton,
                    selected && styles.optionButtonSelected,
                  ]}
                >
                  {selected && (
                    <LinearGradient
                      colors={[
                        "rgba(255, 107, 53, 0.2)",
                        "rgba(229, 90, 43, 0.15)",
                      ]}
                      style={StyleSheet.absoluteFill}
                    />
                  )}

                  <View style={styles.optionContent}>
                    {option.icon && (
                      <View
                        style={[
                          styles.optionIcon,
                          selected && styles.optionIconSelected,
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={rf(18)}
                          color={
                            selected
                              ? colors.primary
                              : colors.textSecondary
                          }
                        />
                      </View>
                    )}

                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionLabel,
                          selected && styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text
                          style={styles.optionDescription}
                          numberOfLines={1}
                        >
                          {option.description}
                        </Text>
                      )}
                    </View>

                    {selected && (
                      <View style={styles.checkmark}>
                        <Ionicons
                          name="checkmark"
                          size={rf(14)}
                          color={colors.primary}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Error or Hint */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={rf(12)}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between" as const,
    gap: spacing.sm,
  },
  optionsGridSingle: {
    flexDirection: "column",
  },
  optionWrapper: {
    marginBottom: spacing.xs,
  },
  optionButton: {
    backgroundColor: colors.glassSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    minHeight: rw(52),
    justifyContent: "center" as const,
  },
  optionButtonSelected: {
    borderColor: "rgba(255, 107, 53, 0.4)",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.sm,
  },
  optionIconSelected: {
    backgroundColor: "rgba(255, 107, 53, 0.15)",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: rf(14),
    fontWeight: "500",
    color: colors.textSecondary,
  },
  optionLabelSelected: {
    color: colors.white,
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: rp(2),
  },
  checkmark: {
    width: rw(22),
    height: rw(22),
    borderRadius: rw(11),
    backgroundColor: "rgba(255, 107, 53, 0.2)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorText: {
    fontSize: rf(11),
    color: colors.error,
  },
  hintText: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
});

export default GlassFormPicker;
