import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Text,
} from "react-native";
import { rp } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatShadows as shadows } from "../../theme/aurora-tokens";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  /**
   * Disables the pressable interaction (only relevant when `onPress` is
   * supplied). Mirrors Button/GlassCard/GlassButton's `disabled` prop so
   * Card matches the rest of the library's prop contract.
   * @default false
   */
  disabled?: boolean;
  /** Accessibility label for screen readers (used when `onPress` is supplied). */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers (used when `onPress` is supplied). */
  accessibilityHint?: string;
}

export const Card: React.FC<CardProps> = (props) => {
  const {
    children,
    style,
    onPress,
    variant = "default",
    padding = "md",
    disabled = false,
    accessibilityLabel,
    accessibilityHint,
  } = props;

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[padding],
    };

    switch (variant) {
      case "elevated":
        return { ...baseStyle, ...styles.elevated };
      case "outlined":
        return { ...baseStyle, ...styles.outlined };
      default:
        return { ...baseStyle, ...styles.default };
    }
  };

  const cardStyle = [getCardStyle(), disabled && styles.disabled, style];

  // Only wrap top-level string/number children in <Text>. The previous
  // recursion descended into nested <Text> children and could break inline
  // text styling (e.g. a bold span inside a paragraph would be re-cloned
  // without its style).
  const renderChildrenSafely = (node: React.ReactNode): React.ReactNode => {
    return React.Children.map(node, (child) => {
      if (typeof child === "string" || typeof child === "number") {
        return <Text>{child}</Text>;
      }
      return child;
    });
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {renderChildrenSafely(children)}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{renderChildrenSafely(children)}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
  },

  // Variants
  default: {
    backgroundColor: colors.backgroundTertiary,
  },

  elevated: {
    backgroundColor: colors.backgroundTertiary,
    ...shadows.md,
  },

  outlined: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Padding variants
  none: {
    padding: rp(0),
  },

  sm: {
    padding: spacing.sm,
  },

  md: {
    padding: spacing.md,
  },

  lg: {
    padding: spacing.lg,
  },

  disabled: {
    // 0.6 (not 0.5) keeps disabled label/content above the WCAG AA 4.5:1
    // contrast threshold — see aurora/GlassButton's disabled style for the
    // same fix; 0.5 was proven to drop contrast below AA there.
    opacity: 0.6,
  },
});
