/**
 * AuroraBackground Component
 * Animated gradient background inspired by Aurora Borealis
 * Supports 4 theme variants with smooth color transitions
 */

import React, { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import {
  gradients,
  type AuroraTheme,
  getAuroraGradient,
} from "../../../theme/gradients";
import { toLinearGradientProps } from "../../../theme/gradients";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface AuroraBackgroundProps {
  /**
   * Aurora theme variant
   * @default 'space'
   */
  theme?: AuroraTheme;

  /**
   * Animation speed multiplier
   * Higher values = faster animation
   * @default 1
   */
  animationSpeed?: number;

  /**
   * Animation intensity (opacity variation)
   * 0 = no animation, 1 = full animation
   * @default 0.3
   */
  intensity?: number;

  /**
   * Enable continuous animation
   * @default true
   */
  animated?: boolean;

  /**
   * Children components to render over background
   */
  children?: React.ReactNode;

  /**
   * Additional styles
   */
  style?: ViewStyle;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  theme = "space",
  animationSpeed = 1,
  intensity = 0.3,
  animated = true,
  children,
  style,
}) => {
  // Get gradient configuration for selected theme
  const gradientConfig = getAuroraGradient(theme);
  const gradientProps = toLinearGradientProps(gradientConfig);

  // Animated opacity for gentle pulsing effect
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      // Gentle pulsing animation
      opacity.value = withRepeat(
        withSequence(
          withTiming(1 - intensity, {
            duration: 3000 / animationSpeed,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 3000 / animationSpeed,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1, // infinite repeat
        false, // don't reverse
      );
    } else {
      opacity.value = 1;
    }
  }, [animated, animationSpeed, intensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedLinearGradient
      {...(gradientProps as any)}
      style={[styles.container, animatedStyle, style] as any}
    >
      {children}
    </AnimatedLinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

// Export default
export default AuroraBackground;
