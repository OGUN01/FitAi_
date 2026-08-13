/**
 * Aurora Spinner Component
 * Custom loading spinner with rotating gradient ring
 * Matches active Aurora theme with smooth 360-degree rotation
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  gradients,
  toLinearGradientProps,
  gradientAuroraSpace,
} from "../../../theme/gradients";
import { colors } from "../../../theme/aurora-tokens";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// ============================================================================
// TYPES
// ============================================================================

export type SpinnerSize = "sm" | "md" | "lg" | "xl";
export type SpinnerTheme = "primary" | "secondary" | "aurora" | "white" | "dark";

export interface AuroraSpinnerProps {
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: SpinnerSize;

  /**
   * Color theme for the gradient
   * @default 'primary'
   */
  theme?: SpinnerTheme;

  /**
   * Custom size in pixels (overrides size prop)
   */
  customSize?: number;

  /**
   * Animation speed in milliseconds
   * @default 1200
   */
  duration?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SPINNER_SIZES: Record<SpinnerSize, number> = {
  sm: 24,
  md: 40,
  lg: 60,
  xl: 80,
};

const RING_THICKNESS: Record<SpinnerSize, number> = {
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AuroraSpinner: React.FC<AuroraSpinnerProps> = ({
  size = "md",
  theme = "primary",
  customSize,
  duration = 1200,
}) => {
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  // Determine actual size
  const spinnerSize = customSize || SPINNER_SIZES[size];
  const ringThickness = customSize
    ? Math.max(3, Math.floor(customSize / 10))
    : RING_THICKNESS[size];

  // Start rotation animation on mount
  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    rotation.value = withRepeat(
      withTiming(360, {
        duration,
        easing: Easing.linear,
      }),
      -1, // Infinite loop
      false, // Don't reverse
    );
    return () => { cancelAnimation(rotation); };
  }, [duration, reducedMotion, rotation]);

  // Animated rotation style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Select gradient based on theme
  const getGradient = () => {
    switch (theme) {
      case "primary":
        return gradients.primary;
      case "secondary":
        return gradients.secondary;
      case "aurora":
        return gradientAuroraSpace;
      case "white":
        return {
          colors: [
            "rgba(255,255,255,0.2)",
            "rgba(255,255,255,1)",
            "rgba(255,255,255,0.2)",
          ],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
        };
      case "dark":
        // Near-black ring for use on light/bright solid backgrounds (e.g.
        // colors.primary/success/warning) where a white spinner fails WCAG's
        // 3:1 UI-component contrast minimum.
        return {
          colors: [
            "rgba(10,10,15,0.2)",
            "rgba(10,10,15,1)",
            "rgba(10,10,15,0.2)",
          ],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
        };
      default:
        return gradients.primary;
    }
  };

  const gradient = getGradient();

  return (
    <View
      style={[
        styles.container,
        {
          width: spinnerSize,
          height: spinnerSize,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessible={true}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderRadius: spinnerSize / 2,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          {...toLinearGradientProps(gradient)}
          style={[
              styles.gradient,
              {
                width: spinnerSize,
                height: spinnerSize,
                borderRadius: spinnerSize / 2,
              },
            ]}
        >
          {/* Inner transparent circle to create ring effect */}
          <View
            style={[
              styles.innerCircle,
              {
                width: spinnerSize - ringThickness * 2,
                height: spinnerSize - ringThickness * 2,
                borderRadius: (spinnerSize - ringThickness * 2) / 2,
              },
            ]}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: {
    // Use the app background tier so the spinner renders as a true ring even
    // when the parent has a solid (non-blurred) background. The previous
    // "transparent" left a full disc on solid-card parents because there was
    // nothing behind the gradient to "punch through" to.
    backgroundColor: colors.background.DEFAULT,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default AuroraSpinner;
