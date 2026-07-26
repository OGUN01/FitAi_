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
}

export const Card: React.FC<CardProps> = (props) => {
  const {
    children,
    style,
    onPress,
    variant = "default",
    padding = "md",
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

  const cardStyle = [getCardStyle(), style];

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
        activeOpacity={0.8}
        accessibilityRole="button"
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
});
