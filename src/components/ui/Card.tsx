import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Text,
} from "react-native";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { THEME } from "../../utils/constants";
import { ResponsiveTheme } from "../../utils/constants";

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

  const wrapChild = (
    child: React.ReactNode,
    index?: number,
  ): React.ReactNode => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return child;
    }

    if (typeof child === "string" || typeof child === "number") {
      return <Text key={index}>{child}</Text>;
    }

    if (Array.isArray(child)) {
      return child.map((nestedChild, nestedIndex) =>
        wrapChild(nestedChild, nestedIndex),
      );
    }

    if (React.isValidElement(child)) {
      if (child.type === React.Fragment) {
        const wrapped = React.Children.map(
          (child.props as any).children,
          wrapChild,
        );
        return (
          <React.Fragment key={child.key ?? index}>{wrapped}</React.Fragment>
        );
      }

      if (
        typeof child.type === "string" &&
        child.type.toLowerCase() === "text"
      ) {
        return child;
      }

      if (child.props && (child.props as any).children) {
        const wrappedChildren = React.Children.map(
          (child.props as any).children,
          wrapChild,
        );
        if (wrappedChildren !== (child.props as any).children) {
          return React.cloneElement(child, child.props, wrappedChildren);
        }
      }
    }

    return child;
  };

  const renderChildrenSafely = (node: React.ReactNode): React.ReactNode => {
    return React.Children.map(node, wrapChild);
  };

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {renderChildrenSafely(children)}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{renderChildrenSafely(children)}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  // Variants
  default: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  elevated: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    ...THEME.shadows.md,
  },

  outlined: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  // Padding variants
  none: {
    padding: rp(0),
  },

  sm: {
    padding: ResponsiveTheme.spacing.sm,
  },

  md: {
    padding: ResponsiveTheme.spacing.md,
  },

  lg: {
    padding: ResponsiveTheme.spacing.lg,
  },
});
