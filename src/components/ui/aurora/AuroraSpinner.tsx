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
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  gradients,
  toLinearGradientProps,
  gradientAuroraSpace,
} from "../../../theme/gradients";
import { animations } from "../../../theme/animations";

// ============================================================================
// TYPES
// ============================================================================

export type SpinnerSize = "sm" | "md" | "lg" | "xl";
export type SpinnerTheme = "primary" | "secondary" | "aurora" | "white";

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

  // Determine actual size
  const spinnerSize = customSize || SPINNER_SIZES[size];
  const ringThickness = customSize
    ? Math.max(3, Math.floor(customSize / 10))
    : RING_THICKNESS[size];

  // Start rotation animation on mount
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration,
        easing: Easing.linear,
      }),
      -1, // Infinite loop
      false, // Don't reverse
    );
  }, [duration]);

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
          {...(toLinearGradientProps(gradient) as any)}
          style={
            [
              styles.gradient,
              {
                width: spinnerSize,
                height: spinnerSize,
                borderRadius: spinnerSize / 2,
              },
            ] as any
          }
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
    backgroundColor: "transparent",
    // Add dark background to create ring effect
    // This will be transparent, showing the parent background through
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default AuroraSpinner;
