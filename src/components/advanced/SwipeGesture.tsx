import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { THEME } from '../../utils/constants';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface SwipeGestureProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  hapticFeedback?: boolean;
  disabled?: boolean;
  style?: any;
}

export const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  hapticFeedback = true,
  disabled = false,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const isSwipeActive = useRef(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return !disabled && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },

    onPanResponderGrant: () => {
      isSwipeActive.current = true;
      translateX.setOffset(lastOffset.current);
      translateX.setValue(0);
    },

    onPanResponderMove: (_, gestureState) => {
      if (!isSwipeActive.current) return;

      const { dx } = gestureState;
      const maxLeftSwipe = leftActions.length > 0 ? 80 * leftActions.length : 0;
      const maxRightSwipe = rightActions.length > 0 ? -80 * rightActions.length : 0;

      // Constrain the movement
      const constrainedDx = Math.max(maxRightSwipe, Math.min(maxLeftSwipe, dx));
      translateX.setValue(constrainedDx);

      // Haptic feedback at thresholds
      if (hapticFeedback) {
        if (Math.abs(dx) > swipeThreshold && Math.abs(dx) < swipeThreshold + 10) {
          Vibration.vibrate(10);
        }
      }
    },

    onPanResponderRelease: (_, gestureState) => {
      if (!isSwipeActive.current) return;

      const { dx, vx } = gestureState;
      const velocity = Math.abs(vx);
      const shouldTriggerAction = Math.abs(dx) > swipeThreshold || velocity > 0.5;

      translateX.flattenOffset();
      lastOffset.current = translateX._value;

      if (shouldTriggerAction) {
        if (dx > 0) {
          // Swiped right - show left actions or trigger onSwipeRight
          if (leftActions.length > 0) {
            animateToPosition(80 * leftActions.length);
          } else if (onSwipeRight) {
            onSwipeRight();
            resetPosition();
          }
        } else {
          // Swiped left - show right actions or trigger onSwipeLeft
          if (rightActions.length > 0) {
            animateToPosition(-80 * rightActions.length);
          } else if (onSwipeLeft) {
            onSwipeLeft();
            resetPosition();
          }
        }
      } else {
        resetPosition();
      }

      isSwipeActive.current = false;
    },
  });

  const animateToPosition = (position: number) => {
    Animated.spring(translateX, {
      toValue: position,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    lastOffset.current = position;
  };

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    lastOffset.current = 0;
  };

  const handleActionPress = (action: SwipeAction) => {
    if (hapticFeedback) {
      Vibration.vibrate(20);
    }
    action.onPress();
    resetPosition();
  };

  const renderActions = (actions: SwipeAction[], isLeft: boolean) => {
    if (actions.length === 0) return null;

    return (
      <View style={[styles.actionsContainer, isLeft ? styles.leftActions : styles.rightActions]}>
        {actions.map((action, index) => (
          <Animated.View
            key={action.id}
            style={[
              styles.actionButton,
              { backgroundColor: action.color },
              {
                transform: [
                  {
                    translateX: translateX.interpolate({
                      inputRange: isLeft ? [0, 80 * actions.length] : [-80 * actions.length, 0],
                      outputRange: isLeft
                        ? [-80 * (actions.length - index), 0]
                        : [0, 80 * (actions.length - index)],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.actionContent,
                {
                  opacity: translateX.interpolate({
                    inputRange: isLeft
                      ? [40 * (index + 1), 80 * (index + 1)]
                      : [-80 * (index + 1), -40 * (index + 1)],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
              onTouchEnd={() => handleActionPress(action)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Animated.View>
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Left Actions */}
      {renderActions(leftActions, true)}

      {/* Right Actions */}
      {renderActions(rightActions, false)}

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },

  content: {
    backgroundColor: THEME.colors.background,
    zIndex: 1,
  },

  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },

  leftActions: {
    left: 0,
  },

  rightActions: {
    right: 0,
  },

  actionButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIcon: {
    fontSize: 20,
    color: THEME.colors.white,
    marginBottom: 4,
  },

  actionLabel: {
    fontSize: 12,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.medium as '500',
    textAlign: 'center',
  },
});
