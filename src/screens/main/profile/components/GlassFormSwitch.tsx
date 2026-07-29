/**
 * GlassFormSwitch - Unified FormField pattern for toggles
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
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

interface GlassFormSwitchProps {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const GlassFormSwitch: React.FC<GlassFormSwitchProps> = React.memo(({
  label,
  description,
  icon,
  iconColor = colors.primary.DEFAULT,
  value,
  onValueChange,
  disabled = false,
}) => {
  const handleValueChange = useCallback(
    (newValue: boolean) => {
      if (disabled) return;
      haptics.light();
      onValueChange(newValue);
    },
    [disabled, onValueChange],
  );

  return (
    <View
      style={[styles.container, disabled && styles.containerDisabled]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      {icon && (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${iconColor}14` },
          ]}
        >
          <Ionicons
            name={icon}
            size={rf(18)}
            color={disabled ? colors.text.tertiary : iconColor}
          />
        </View>
      )}

      <View style={styles.textContainer}>
        <Text
          style={[styles.label, disabled && styles.labelDisabled]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {description && (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        trackColor={{
          false: border.DEFAULT,
          true: `${colors.primary.DEFAULT}66`,
        }}
        thumbColor={value ? colors.primary.DEFAULT : colors.text.tertiary}
        ios_backgroundColor={border.DEFAULT}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface[1],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    ...variants.body,
    color: colors.text.primary,
  },
  labelDisabled: {
    color: colors.text.tertiary,
  },
  description: {
    ...variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
});

export default GlassFormSwitch;
