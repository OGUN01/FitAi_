/**
 * GlassButton Component
 * Primary call-to-action button for the Aurora design language.
 *
 * LinearGradient fill (tokenized via gradientButton presets) wrapped in an
 * AnimatedPressable (spring-scale + haptic), with an inline AuroraSpinner
 * loading state. Retires the flat `Button` from src/components/ui/Button.tsx
 * for primary CTAs — one styled glass button with consistent motion/tokens.
 */

import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "./AnimatedPressable";
import { AuroraSpinner } from "./AuroraSpinner";
import { colors, spacing, typography, borderRadius } from "../../../theme/aurora-tokens";
import { gradientButton } from "../../../theme/gradients";
import { rp, rf } from "../../../utils/responsive";

export type GlassButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error";

export interface GlassButtonProps {
  /** Button label. */
  label: string;
  /** Tap handler. */
  onPress: () => void;
  /** Visual variant (drives the gradient + tint). @default 'primary' */
  variant?: GlassButtonVariant;
  /** Optional leading Ionicons icon name. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show the loading spinner + disable interaction. @default false */
  loading?: boolean;
  /** Disable interaction. @default false */
  disabled?: boolean;
  /** Stretch to full container width. @default false */
  fullWidth?: boolean;
  /** Override the gradient colors (advanced). */
  colors?: [string, string];
  /** Container style. */
  style?: ViewStyle;
  /** Label text style override. */
  textStyle?: TextStyle;
  /** Haptic type on press. @default 'medium' */
  hapticType?: "light" | "medium" | "heavy";
  /** Accessible label. */
  accessibilityLabel?: string;
  /** Test ID. */
  testID?: string;
}

const VARIANT_GRADIENT: Record<GlassButtonVariant, [string, string]> = {
  primary: [gradientButton.primary.colors[0], gradientButton.primary.colors[1]],
  secondary: [gradientButton.secondary.colors[0], gradientButton.secondary.colors[1]],
  success: [gradientButton.success.colors[0], gradientButton.success.colors[1]],
  warning: [gradientButton.warning.colors[0], gradientButton.warning.colors[1]],
  error: [gradientButton.error.colors[0], gradientButton.error.colors[1]],
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  colors: customColors,
  style,
  textStyle,
  hapticType = "medium",
  accessibilityLabel,
  testID,
}) => {
  const gradColors = customColors ?? VARIANT_GRADIENT[variant];
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleValue={isDisabled ? 1 : 0.96}
      springConfig="snappy"
      hapticType={isDisabled ? undefined : (hapticType as any)}
      disableAnimation={isDisabled}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <AuroraSpinner customSize={rf(20)} theme="white" />
        ) : (
          <View style={styles.content}>
            {icon ? (
              <Ionicons
                name={icon}
                size={rf(typography.fontSize.body)}
                color={colors.text.primary}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.label, textStyle]}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: rf(48),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: rp(spacing.sm),
  },
  label: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GlassButton;
