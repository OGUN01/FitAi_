/**
 * AnimatedSection Component
 * Wrapper that adds fade-in + slide-up entrance animation to sections
 * Used for onboarding tab sections to create a smooth, staggered entrance effect
 */

import React, { useEffect } from "react";
import { StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  cancelAnimation,
} from "react-native-reanimated";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// ============================================================================
// TYPES
// ============================================================================

export interface AnimatedSectionProps {
  /**
   * Children to animate
   */
  children: React.ReactNode;

  /**
   * Delay before animation starts (ms)
   * @default 0
   */
  delay?: number;

  /**
   * Animation duration (ms)
   * @default 600
   */
  duration?: number;

  /**
   * Slide distance in pixels
   * @default 20
   */
  slideDistance?: number;

  /**
   * Custom style
   */
  style?: StyleProp<ViewStyle>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
  duration = 600,
  slideDistance = 20,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideDistance);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    // Animate on mount with delay
    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 20,
        stiffness: 90,
      }),
    );

    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 20,
        stiffness: 90,
      }),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [delay, opacity, reducedMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle, style]}
      accessible={true}
    >
      {children}
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
