/**
 * @deprecated Prefer `GlassButton` from `./aurora/GlassButton` for a filled
 * CTA — it's the canonical app-wide primary/secondary/success/warning/error
 * button (see DESIGN.md §7). This component stays alive ONLY for its
 * `outline`/`ghost` variants, which `GlassButton` doesn't cover (a
 * de-emphasized secondary action, e.g. "Edit"/"Delete"/"Cancel" next to a
 * primary CTA) — reskinned to flat tokens (no shadow, no gradient, no
 * fontWeight) per DESIGN.md, but kept as its own component rather than
 * folded into GlassButton to avoid overloading one component with two
 * different visual languages (filled-CTA vs. hairline/text action).
 */
import React, { useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { colors, chart, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";
import { useReducedMotion } from "../../utils/accessibility/hooks";
import { AuroraSpinner } from "./aurora/AuroraSpinner";
import { rf } from "../../utils/responsive";

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

// Same near-black label used by GlassButton's flat fills — every filled
// variant here is bright enough for a dark label to read clearly.
const FILLED_LABEL_COLOR = colors.background.DEFAULT;

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
  const reduceMotion = useReducedMotion();

  // Continuous pulse animation — gated behind Reduce Motion like every other
  // infinite withRepeat loop in the design system (AnimatedPressable,
  // DragHandleRow, Confetti).
  useEffect(() => {
    if (pulse && !disabled && !loading && !reduceMotion) {
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
  }, [pulse, disabled, loading, reduceMotion]);

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
    <AuroraSpinner
      customSize={rf(16)}
      theme={variant === "outline" || variant === "ghost" ? "primary" : "dark"}
    />
  ) : (
    <Text style={[getTextStyle(), disabled && styles.disabledText, textStyle]}>
      {title}
    </Text>
  );

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
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
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

  // Variants — flat fills only (no gradient, no shadow), matching
  // GlassButton's reskin. `secondary` uses chart[2] (cyan), the same source
  // GlassButton draws its own secondary from.
  primary: {
    backgroundColor: colors.primary.DEFAULT,
  },
  secondary: {
    backgroundColor: chart[2],
  },
  outline: {
    backgroundColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_LOW),
    borderWidth: 1.5,
    borderColor: colors.primary.DEFAULT,
  },
  ghost: {
    backgroundColor: "transparent",
  },

  // Text styles
  baseText: {
    fontFamily: FONT_FAMILY.semibold,
    textAlign: "center",
  },
  smText: {
    fontSize: rf(typography.fontSize.caption),
  },
  mdText: {
    fontSize: rf(typography.fontSize.body),
  },
  lgText: {
    fontSize: rf(typography.fontSize.h3),
  },

  // Text variants
  primaryText: {
    color: FILLED_LABEL_COLOR,
  },
  secondaryText: {
    color: FILLED_LABEL_COLOR,
  },
  outlineText: {
    color: colors.primary.DEFAULT,
  },
  ghostText: {
    color: colors.primary.DEFAULT,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },

  // Layout
  // Use flex:1 instead of width:"100%" so the button sizes correctly when
  // placed inside a flex row alongside other elements (known issue pattern:
  // width:100% in a row forces the button to the full container width and
  // pushes siblings off-screen). flex:1 makes it share the row evenly.
  fullWidth: {
    flex: 1,
  },
});
