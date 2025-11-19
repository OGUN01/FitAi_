/**
 * AnimatedSection Component
 * Wrapper that adds fade-in + slide-up entrance animation to sections
 * Used for onboarding tab sections to create a smooth, staggered entrance effect
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

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
  style?: any;
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

  useEffect(() => {
    // Animate on mount with delay
    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 20,
        stiffness: 90,
      })
    );

    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 20,
        stiffness: 90,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
