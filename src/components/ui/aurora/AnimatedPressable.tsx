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
  StyleProp,
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
  style?: StyleProp<ViewStyle>;

  /**
   * Optional wrapper style for the animated container
   */
  containerStyle?: StyleProp<ViewStyle>;

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

// Fire-and-forget haptic — never await, never block the JS thread
const triggerHaptic = (type: HapticType) => {
  haptics.trigger(type);
};

const DEFAULT_PRESS_RETENTION_OFFSET = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12,
} as const;

const getSpringConfig = (config: string) => {
  const springKey = config as keyof typeof animations.spring;
  return animations.spring[springKey] || animations.spring.default;
};

// Use Animated.View wrapping a Pressable — avoids injecting CSS property names
// (like `transform-origin`) directly onto the <button> DOM element on web,
// which would cause React's `Invalid DOM property` warning.

export const AnimatedPressable: React.FC<AnimatedPressableProps> = React.memo(({
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
  containerStyle,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  testID,
  ...pressableProps
}) => {
  const isInteractive =
    !disabled &&
    Boolean(
      pressableProps.onPress ||
        pressableProps.onLongPress ||
        onPressIn ||
        onPressOut,
    );

  // Animated values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle press in
  const handlePressIn = useCallback(
    (event: any) => {
      if (!disableAnimation && isInteractive) {
        scale.value = withTiming(scaleValue, {
          duration: animations.duration.instant,
        });

        if (fadeOnPress) {
          opacity.value = withTiming(pressOpacity, {
            duration: animations.duration.instant,
          });
        }
      }

      if (hapticFeedback && isInteractive) {
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
      isInteractive,
      hapticType,
      onPressIn,
    ],
  );

  // Handle press out
  const handlePressOut = useCallback(
    (event: any) => {
      if (!disableAnimation && isInteractive) {
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
    [
      disableAnimation,
      isInteractive,
      useSpring,
      springConfig,
      fadeOnPress,
      onPressOut,
    ],
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        {...pressableProps}
        onPressIn={isInteractive ? handlePressIn : undefined}
        onPressOut={isInteractive ? handlePressOut : undefined}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled: !!disabled }}
        pressRetentionOffset={
          isInteractive
            ? pressableProps.pressRetentionOffset ??
              DEFAULT_PRESS_RETENTION_OFFSET
            : undefined
        }
        style={style}
        testID={testID}
        accessible={isInteractive}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});

// Export default
export default AnimatedPressable;
