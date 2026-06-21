import React, { useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, flatShadows as shadows, typography } from "../../theme/aurora-tokens";

// Hoist outside component — expensive factory should only run once
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  pulse?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  pulse = false,
  accessibilityLabel,
}) => {
  const pulseAnimation = useSharedValue(1);

  // Continuous pulse animation
  useEffect(() => {
    if (pulse && !disabled && !loading) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pulseAnimation.value = withTiming(1, { duration: 200 });
    }
    return () => { cancelAnimation(pulseAnimation); };
  }, [pulse, disabled, loading]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[size],
      ...(fullWidth && styles.fullWidth),
    };

    switch (variant) {
      case "primary":
        return { ...baseStyle, ...styles.primary };
      case "secondary":
        return { ...baseStyle, ...styles.secondary };
      case "outline":
        return { ...baseStyle, ...styles.outline };
      case "ghost":
        return { ...baseStyle, ...styles.ghost };
      default:
        return { ...baseStyle, ...styles.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.baseText,
      ...styles[`${size}Text` as keyof typeof styles],
    };

    switch (variant) {
      case "primary":
        return { ...baseTextStyle, ...styles.primaryText };
      case "secondary":
        return { ...baseTextStyle, ...styles.secondaryText };
      case "outline":
        return { ...baseTextStyle, ...styles.outlineText };
      case "ghost":
        return { ...baseTextStyle, ...styles.ghostText };
      default:
        return { ...baseTextStyle, ...styles.primaryText };
    }
  };

  const buttonContent = loading ? (
    <ActivityIndicator
      color={
        variant === "outline" || variant === "ghost"
          ? colors.primary
          : colors.white
      }
      size="small"
    />
  ) : (
    <Text style={[getTextStyle(), disabled && styles.disabledText, textStyle]}>
      {title}
    </Text>
  );

  // Use gradient for primary variant
  if (variant === "primary" && !disabled) {
    return (
      <AnimatedTouchable
        style={[
          styles.base,
          styles[size],
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
          animatedStyle,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientContainer, styles[size]]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      style={[
        getButtonStyle(),
        disabled && styles.disabled,
        style,
        animatedStyle,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {buttonContent}
    </AnimatedTouchable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },

  gradientContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
  },

  // Sizes
  sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  secondary: {
    backgroundColor: colors.secondary,
    ...shadows.md,
  },
  outline: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },

  // Text styles
  baseText: {
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
  },
  smText: {
    fontSize: fontSize.sm,
  },
  mdText: {
    fontSize: fontSize.md,
  },
  lgText: {
    fontSize: fontSize.lg,
  },

  // Text variants
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },

  // Layout
  fullWidth: {
    width: "100%",
  },
});
