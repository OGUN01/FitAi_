/**
 * AnimatedIcon Component
 * Icons with built-in micro-interactions
 * Supports scale, bounce, pulse, and rotate animations
 */

import React, { useEffect } from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { springConfig, duration } from '../../../theme/animations';
import { haptics } from '../../../utils/haptics';

type AnimationType = 'scale' | 'bounce' | 'pulse' | 'rotate' | 'none';

export interface AnimatedIconProps {
  /**
   * Icon component to render
   * Can be any React component (typically from @expo/vector-icons)
   */
  icon: React.ReactNode;

  /**
   * Animation type
   * @default 'scale'
   */
  animationType?: AnimationType;

  /**
   * Icon size (width and height)
   * @default 24
   */
  size?: number;

  /**
   * Icon color
   */
  color?: string;

  /**
   * Press handler
   */
  onPress?: () => void;

  /**
   * Enable haptic feedback on press
   * @default true
   */
  hapticFeedback?: boolean;

  /**
   * Enable continuous animation (for pulse/rotate)
   * @default false
   */
  continuous?: boolean;

  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional styles
   */
  style?: ViewStyle;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;

  /**
   * Test ID for testing
   */
  testID?: string;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon,
  animationType = 'scale',
  size = 24,
  color,
  onPress,
  hapticFeedback = true,
  continuous = false,
  animationDuration = 300,
  disabled = false,
  style,
  accessibilityLabel,
  testID,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Setup continuous animations
  useEffect(() => {
    if (continuous) {
      if (animationType === 'pulse') {
        // Pulse animation: scale up and down
        scale.value = withRepeat(
          withSequence(
            withTiming(1.2, {
              duration: animationDuration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
              duration: animationDuration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1, // infinite
          false
        );

        // Pulse opacity as well
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.6, {
              duration: animationDuration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
              duration: animationDuration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
      } else if (animationType === 'rotate') {
        // Continuous rotation
        rotation.value = withRepeat(
          withTiming(360, {
            duration: animationDuration * 4, // Slower rotation
            easing: Easing.linear,
          }),
          -1,
          false
        );
      }
    } else {
      // Stop continuous animations
      cancelAnimation(scale);
      cancelAnimation(rotation);
      cancelAnimation(opacity);
      scale.value = 1;
      rotation.value = 0;
      opacity.value = 1;
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(rotation);
      cancelAnimation(opacity);
    };
  }, [continuous, animationType, animationDuration]);

  // Handle press with animation
  const handlePress = () => {
    if (disabled) return;

    // Haptic feedback
    if (hapticFeedback) {
      haptics.light();
    }

    // Trigger press animation
    if (!continuous) {
      switch (animationType) {
        case 'scale':
          scale.value = withSequence(
            withTiming(0.85, { duration: 100 }),
            withSpring(1, springConfig.bounce)
          );
          break;

        case 'bounce':
          scale.value = withSequence(
            withTiming(0.9, { duration: 100 }),
            withSpring(1.2, springConfig.bounce),
            withSpring(1, springConfig.smooth)
          );
          break;

        case 'pulse':
          scale.value = withSequence(
            withTiming(1.2, { duration: 150 }),
            withSpring(1, springConfig.smooth)
          );
          opacity.value = withSequence(
            withTiming(0.6, { duration: 150 }),
            withTiming(1, { duration: 150 })
          );
          break;

        case 'rotate':
          rotation.value = withSequence(
            withTiming(15, { duration: 100 }),
            withTiming(-15, { duration: 100 }),
            withSpring(0, springConfig.smooth)
          );
          break;

        case 'none':
        default:
          // No animation
          break;
      }
    }

    // Call onPress handler
    onPress?.();
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[styles.container, style]}
    >
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            width: size,
            height: size,
          },
          animatedStyle,
        ]}
      >
        {icon}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Export default
export default AnimatedIcon;
