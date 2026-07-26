/**
 * GlassFormSwitch - Glassmorphic Toggle Switch Component
 *
 * Features:
 * - Glassmorphic card styling
 * - Icon support
 * - Description text
 * - Animated switch
 *
 * The whole row is NOT wrapped in a Pressable — only the Switch itself is
 * interactive. The previous implementation wrapped the row in an
 * AnimatedPressable AND wired the inner Switch, so a single tap fired both
 * handlers (double toggle) or conflicted with gesture handling.
 */

import React from "react";
import { View, Text, StyleSheet, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius } from "../../../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from "../../../../utils/colors";
import { haptics } from "../../../../utils/haptics";

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
  iconColor = colors.primary,
  value,
  onValueChange,
  disabled = false,
}) => {
  const handleValueChange = (newValue: boolean) => {
    if (disabled) return;
    haptics.light();
    onValueChange(newValue);
  };

  return (
    <View
      style={[styles.container, disabled && styles.containerDisabled]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      {/* Icon */}
      {icon && (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: hexToRgba(iconColor, TINT_ALPHA_LOW + 0.03) },
          ]}
        >
          <Ionicons
            name={icon}
            size={rf(18)}
            color={disabled ? colors.textMuted : iconColor}
          />
        </View>
      )}

      {/* Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]} numberOfLines={2}>
          {label}
        </Text>
        {description && (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        )}
      </View>

      {/* Switch — the only interactive element. The row itself is not
          pressable, eliminating the double-toggle conflict. */}
      <Switch
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        trackColor={{
          false: "rgba(255, 255, 255, 0.15)",
          true: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM + 0.4),
        }}
        thumbColor={value ? colors.primary : "rgba(255, 255, 255, 0.6)"}
        ios_backgroundColor="rgba(255, 255, 255, 0.15)"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: rf(15),
    fontWeight: "500",
    color: colors.white,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  description: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
    lineHeight: rf(16),
  },
});

export default GlassFormSwitch;
