/**
 * GlassFormSwitch - Glassmorphic Toggle Switch Component
 *
 * Features:
 * - Glassmorphic card styling
 * - Icon support
 * - Description text
 * - Animated switch
 */

import React from "react";
import { View, Text, StyleSheet, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface GlassFormSwitchProps {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const GlassFormSwitch: React.FC<GlassFormSwitchProps> = ({
  label,
  description,
  icon,
  iconColor = ResponsiveTheme.colors.primary,
  value,
  onValueChange,
  disabled = false,
}) => {
  const handlePress = () => {
    if (!disabled) {
      haptics.light();
      onValueChange(!value);
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      scaleValue={0.98}
      hapticFeedback={false}
      disabled={disabled}
    >
      <View style={[styles.container, disabled && styles.containerDisabled]}>
        {/* Icon */}
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons
              name={icon}
              size={rf(18)}
              color={disabled ? ResponsiveTheme.colors.textMuted : iconColor}
            />
          </View>
        )}

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {label}
          </Text>
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>

        {/* Switch */}
        <Switch
          value={value}
          onValueChange={(newValue) => {
            haptics.light();
            onValueChange(newValue);
          }}
          disabled={disabled}
          trackColor={{
            false: "rgba(255, 255, 255, 0.1)",
            true: `${ResponsiveTheme.colors.primary}50`,
          }}
          thumbColor={
            value ? ResponsiveTheme.colors.primary : "rgba(255, 255, 255, 0.4)"
          }
          ios_backgroundColor="rgba(255, 255, 255, 0.1)"
        />
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.md,
  },
  label: {
    fontSize: rf(15),
    fontWeight: "500",
    color: "#fff",
  },
  labelDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },
  description: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
    lineHeight: rf(16),
  },
});

export default GlassFormSwitch;
