/**
 * AnimatedPressable Component
 * Enhanced Pressable with scale animation, haptic feedback, and accessibility
 * 60-120fps performance using React Native Reanimated 3
 * Phase 4: Enhanced with full haptic support and accessibility features
 */

import React, { useCallback } from "react";
import {
  Pressable,
  PressableProps,
  ViewStyle,
  AccessibilityRole,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { animations } from "../../../theme/animations";
import { haptics, type HapticType } from "../../../utils/haptics";

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  /**
   * Scale value when pressed
   * @default 0.95
   */
  scaleValue?: number;

  /**
   * Use spring animation for release
   * @default true
   */
  useSpring?: boolean;

  /**
   * Spring configuration
   * @default 'default'
   */
  springConfig?: "default" | "bounce" | "smooth" | "gentle" | "snappy";

  /**
   * Enable haptic feedback
   * @default true
   */
  hapticFeedback?: boolean;

  /**
   * Haptic feedback type
   * @default 'light'
   */
  hapticType?: HapticType;

  /**
   * Disable animation
   * @default false
   */
  disableAnimation?: boolean;

  /**
   * Additional opacity animation on press
   * @default false
   */
  fadeOnPress?: boolean;

  /**
   * Opacity value when pressed (if fadeOnPress is true)
   * @default 0.6
   */
  pressOpacity?: number;

  /**
   * Children components
   */
  children: React.ReactNode;

  /**
   * Style prop (supports animated values)
   */
  style?: ViewStyle | ViewStyle[];

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;

  /**
   * Accessibility hint for screen readers
   */
  accessibilityHint?: string;

  /**
   * Accessibility role
   * @default 'button'
   */
  accessibilityRole?: AccessibilityRole;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// Haptic feedback helper using our centralized haptics utility
const triggerHaptic = async (type: HapticType) => {
  await haptics.trigger(type);
};

const getSpringConfig = (config: string) => {
  const springKey = config as keyof typeof animations.spring;
  return animations.spring[springKey] || animations.spring.default;
};

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  scaleValue = animations.scale.press,
  useSpring = true,
  springConfig = "default",
  hapticFeedback = true,
  hapticType = "light",
  disableAnimation = false,
  fadeOnPress = false,
  pressOpacity = 0.6,
  children,
  style,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  testID,
  ...pressableProps
}) => {
  // Animated values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle press in
  const handlePressIn = useCallback(
    (event: any) => {
      if (!disableAnimation) {
        scale.value = withTiming(scaleValue, {
          duration: animations.duration.instant,
        });

        if (fadeOnPress) {
          opacity.value = withTiming(pressOpacity, {
            duration: animations.duration.instant,
          });
        }
      }

      if (hapticFeedback && !disabled) {
        triggerHaptic(hapticType);
      }

      onPressIn?.(event);
    },
    [
      disableAnimation,
      scaleValue,
      fadeOnPress,
      pressOpacity,
      hapticFeedback,
      disabled,
      hapticType,
      onPressIn,
    ],
  );

  // Handle press out
  const handlePressOut = useCallback(
    (event: any) => {
      if (!disableAnimation) {
        if (useSpring) {
          const spring = getSpringConfig(springConfig);
          scale.value = withSpring(1, spring);

          if (fadeOnPress) {
            opacity.value = withSpring(1, spring);
          }
        } else {
          scale.value = withTiming(1, {
            duration: animations.duration.quick,
          });

          if (fadeOnPress) {
            opacity.value = withTiming(1, {
              duration: animations.duration.quick,
            });
          }
        }
      }

      onPressOut?.(event);
    },
    [disableAnimation, useSpring, springConfig, fadeOnPress, onPressOut],
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      {...pressableProps}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      accessible={true}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
};

// Export default
export default AnimatedPressable;
