/**
 * GestureCard Component
 * Swipeable card with spring physics and configurable actions
 * Built on react-native-gesture-handler for smooth interactions
 */

import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GlassCard } from './GlassCard';
import { colors, typography, spacing } from '../../../theme/aurora-tokens';
import { springConfig } from '../../../theme/animations';
import { haptics } from '../../../utils/haptics';

export interface SwipeAction {
  /**
   * Action icon or emoji
   */
  icon?: React.ReactNode | string;

  /**
   * Action label
   */
  label: string;

  /**
   * Background color
   */
  backgroundColor: string;

  /**
   * Text color
   */
  textColor?: string;

  /**
   * Action handler
   */
  onAction: () => void;
}

export interface GestureCardProps {
  /**
   * Card content
   */
  children: React.ReactNode;

  /**
   * Left swipe action
   */
  onSwipeLeft?: SwipeAction;

  /**
   * Right swipe action
   */
  onSwipeRight?: SwipeAction;

  /**
   * Swipe distance threshold (in pixels)
   * @default 100
   */
  threshold?: number;

  /**
   * Spring configuration for animations
   * @default 'smooth'
   */
  springConfigType?: 'default' | 'bounce' | 'smooth' | 'gentle' | 'snappy' | 'slow';

  /**
   * Enable haptic feedback
   * @default true
   */
  hapticFeedback?: boolean;

  /**
   * Card elevation
   * @default 1
   */
  elevation?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  /**
   * Use glass effect
   * @default true
   */
  glassEffect?: boolean;

  /**
   * Additional styles
   */
  style?: ViewStyle;

  /**
   * Content style
   */
  contentStyle?: ViewStyle;
}

export const GestureCard: React.FC<GestureCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  springConfigType = 'smooth',
  hapticFeedback = true,
  elevation = 1,
  glassEffect = true,
  style,
  contentStyle,
}) => {
  // Animated values
  const translateX = useSharedValue(0);
  const actionTriggered = useSharedValue(false);

  // Get spring config
  const getSpringConfig = () => {
    return springConfig[springConfigType];
  };

  // Handle swipe action
  const handleSwipeAction = (action: SwipeAction | undefined) => {
    if (!action) return;

    // Haptic feedback
    if (hapticFeedback) {
      haptics.medium();
    }

    // Call action handler
    action.onAction();

    // Reset position
    translateX.value = withSpring(0, getSpringConfig());
    actionTriggered.value = false;
  };

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onChange((event) => {
      // Only allow swipe in direction where action is defined
      if (event.translationX < 0 && !onSwipeLeft) return;
      if (event.translationX > 0 && !onSwipeRight) return;

      translateX.value = event.translationX;

      // Trigger haptic at threshold
      if (!actionTriggered.value) {
        if (Math.abs(event.translationX) >= threshold) {
          actionTriggered.value = true;
          if (hapticFeedback) {
            runOnJS(haptics.selection)();
          }
        }
      } else {
        if (Math.abs(event.translationX) < threshold) {
          actionTriggered.value = false;
        }
      }
    })
    .onEnd((event) => {
      const { translationX: finalTranslation } = event;

      // Check if swipe threshold was met
      if (Math.abs(finalTranslation) >= threshold) {
        // Swipe left
        if (finalTranslation < 0 && onSwipeLeft) {
          runOnJS(handleSwipeAction)(onSwipeLeft);
          return;
        }
        // Swipe right
        if (finalTranslation > 0 && onSwipeRight) {
          runOnJS(handleSwipeAction)(onSwipeRight);
          return;
        }
      }

      // Reset to center if threshold not met
      translateX.value = withSpring(0, getSpringConfig());
      actionTriggered.value = false;
    });

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedLeftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(Math.abs(translateX.value) / threshold, 1) : 0,
  }));

  const animatedRightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(translateX.value / threshold, 1) : 0,
  }));

  // Render action background
  const renderAction = (action: SwipeAction | undefined, side: 'left' | 'right') => {
    if (!action) return null;

    const animatedStyle = side === 'left' ? animatedLeftActionStyle : animatedRightActionStyle;

    return (
      <Animated.View
        style={[
          styles.actionBackground,
          {
            backgroundColor: action.backgroundColor,
            [side]: 0,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.actionContent}>
          {typeof action.icon === 'string' ? (
            <Text style={[styles.actionIcon, { color: action.textColor || colors.text.primary }]}>
              {action.icon}
            </Text>
          ) : (
            action.icon
          )}
          <Text style={[styles.actionLabel, { color: action.textColor || colors.text.primary }]}>
            {action.label}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Action Backgrounds */}
      {renderAction(onSwipeLeft, 'left')}
      {renderAction(onSwipeRight, 'right')}

      {/* Swipeable Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
          {glassEffect ? (
            <GlassCard
              elevation={elevation}
              padding="md"
              borderRadius="lg"
              blurIntensity="light"
              style={contentStyle}
            >
              {children}
            </GlassCard>
          ) : (
            <View style={[styles.simpleCard, contentStyle]}>{children}</View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardWrapper: {
    width: '100%',
  },
  simpleCard: {
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: 12,
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 32,
  },
  actionLabel: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold as any,
  },
});

// Export default
export default GestureCard;
