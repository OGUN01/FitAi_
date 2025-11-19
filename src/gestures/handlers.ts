/**
 * Gesture Handlers
 * Reusable gesture logic for swipe, pull-to-refresh, long press, etc.
 * Built on React Native Gesture Handler and Reanimated
 */

import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { animations } from '../theme/animations';
import { haptics } from '../utils/haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface SwipeConfig {
  threshold?: number; // Distance threshold in pixels
  velocity?: number; // Velocity threshold in px/s
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface PullToRefreshConfig {
  threshold?: number; // Pull distance threshold
  onRefresh: () => Promise<void>;
  refreshingHeight?: number; // Height when refreshing
}

export interface LongPressConfig {
  duration?: number; // Long press duration in ms
  onLongPress: () => void;
  hapticFeedback?: boolean;
}

export interface DragToReorderConfig {
  activationDelay?: number; // Long press to activate drag
  onDragStart?: (index: number) => void;
  onDragMove?: (fromIndex: number, toIndex: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  itemHeight: number; // Height of each item for snap calculations
  hapticFeedback?: boolean;
}

// ============================================================================
// SWIPE GESTURE
// ============================================================================

/**
 * Create a swipe gesture handler
 * Detects swipe direction and triggers callbacks
 */
export const createSwipeGesture = (config: SwipeConfig) => {
  const {
    threshold = animations.gesture.swipeDistance,
    velocity = animations.gesture.swipeVelocity,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = config;

  return Gesture.Pan()
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;

      // Horizontal swipe
      if (Math.abs(translationX) > Math.abs(translationY)) {
        if (translationX > threshold || velocityX > velocity) {
          onSwipeRight && runOnJS(onSwipeRight)();
        } else if (translationX < -threshold || velocityX < -velocity) {
          onSwipeLeft && runOnJS(onSwipeLeft)();
        }
      }
      // Vertical swipe
      else {
        if (translationY > threshold || velocityY > velocity) {
          onSwipeDown && runOnJS(onSwipeDown)();
        } else if (translationY < -threshold || velocityY < -velocity) {
          onSwipeUp && runOnJS(onSwipeUp)();
        }
      }
    });
};

// ============================================================================
// SWIPE TO DELETE
// ============================================================================

/**
 * Create a swipe-to-delete gesture
 * Returns gesture and animated values
 */
export const useSwipeToDelete = (
  onDelete: () => void,
  options?: {
    threshold?: number;
    deleteWidth?: number;
    hapticFeedback?: boolean;
  }
) => {
  const translateX = useSharedValue(0);
  const deleteThreshold = options?.threshold ?? -100;
  const deleteWidth = options?.deleteWidth ?? -200;
  const hapticFeedback = options?.hapticFeedback ?? true;

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(deleteWidth, event.translationX);
      }
    })
    .onEnd(() => {
      if (translateX.value < deleteThreshold) {
        // Delete action
        translateX.value = withTiming(deleteWidth, { duration: 200 });
        if (hapticFeedback) {
          runOnJS(haptics.delete)();
        }
        runOnJS(onDelete)();
      } else {
        // Snap back
        translateX.value = withSpring(0, animations.spring.default);
      }
    });

  return { gesture, translateX };
};

// ============================================================================
// PULL TO REFRESH
// ============================================================================

/**
 * Create a pull-to-refresh gesture
 * Returns gesture and animated values for UI
 */
export const usePullToRefresh = (config: PullToRefreshConfig) => {
  const {
    threshold = 80,
    onRefresh,
    refreshingHeight = 60,
  } = config;

  const translateY = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const gesture = Gesture.Pan()
    .enabled(!isRefreshing.value)
    .onUpdate((event) => {
      if (event.translationY > 0 && !isRefreshing.value) {
        // Apply rubber band effect
        const damping = event.translationY > threshold ? 2 : 1;
        translateY.value = Math.max(0, event.translationY / damping);
      }
    })
    .onEnd(async () => {
      if (translateY.value >= threshold && !isRefreshing.value) {
        // Trigger refresh
        isRefreshing.value = true;
        translateY.value = withSpring(refreshingHeight, animations.spring.gentle);

        // Haptic feedback
        runOnJS(haptics.refreshComplete)();

        // Execute refresh callback
        runOnJS(async () => {
          try {
            await onRefresh();
          } finally {
            // Reset after refresh completes
            isRefreshing.value = false;
            translateY.value = withSpring(0, animations.spring.default);
          }
        })();
      } else {
        // Snap back
        translateY.value = withSpring(0, animations.spring.default);
      }
    });

  return { gesture, translateY, isRefreshing };
};

// ============================================================================
// LONG PRESS
// ============================================================================

/**
 * Create a long press gesture
 */
export const createLongPressGesture = (config: LongPressConfig) => {
  const {
    duration = animations.gesture.longPressDuration,
    onLongPress,
    hapticFeedback = true,
  } = config;

  return Gesture.LongPress()
    .minDuration(duration)
    .onStart(() => {
      if (hapticFeedback) {
        runOnJS(haptics.longPress)();
      }
      runOnJS(onLongPress)();
    });
};

// ============================================================================
// DRAG TO REORDER
// ============================================================================

/**
 * Create a drag-to-reorder gesture
 * Returns gesture and animated values
 */
export const useDragToReorder = (
  itemIndex: number,
  config: DragToReorderConfig
) => {
  const {
    activationDelay = 500,
    onDragStart,
    onDragMove,
    onDragEnd,
    itemHeight,
    hapticFeedback = true,
  } = config;

  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragStarted = useSharedValue(false);

  const gesture = Gesture.LongPress()
    .minDuration(activationDelay)
    .onStart(() => {
      isDragging.value = true;
      if (hapticFeedback) {
        runOnJS(haptics.dragStart)();
      }
      if (onDragStart) {
        runOnJS(onDragStart)(itemIndex);
      }
    })
    .simultaneousWithExternalGesture(
      Gesture.Pan()
        .enabled(isDragging.value)
        .onUpdate((event) => {
          if (isDragging.value) {
            translateY.value = event.translationY;

            // Calculate target index based on translation
            const targetIndex = Math.round(event.translationY / itemHeight) + itemIndex;

            if (onDragMove && !dragStarted.value) {
              runOnJS(onDragMove)(itemIndex, targetIndex);
            }
          }
        })
        .onEnd((event) => {
          if (isDragging.value) {
            const targetIndex = Math.round(event.translationY / itemHeight) + itemIndex;

            // Snap to target position
            const snapPosition = (targetIndex - itemIndex) * itemHeight;
            translateY.value = withSpring(snapPosition, animations.spring.snappy);

            if (hapticFeedback) {
              runOnJS(haptics.dragDrop)();
            }

            if (onDragEnd) {
              runOnJS(onDragEnd)(itemIndex, targetIndex);
            }

            // Reset drag state
            isDragging.value = false;
            dragStarted.value = false;

            // Reset position after animation
            setTimeout(() => {
              translateY.value = withSpring(0, animations.spring.default);
            }, 100);
          }
        })
    );

  return { gesture, translateY, isDragging };
};

// ============================================================================
// PINCH TO ZOOM
// ============================================================================

/**
 * Create a pinch-to-zoom gesture
 * Returns gesture and animated values
 */
export const usePinchToZoom = (
  minScale: number = 1.0,
  maxScale: number = 3.0,
  options?: {
    hapticAtLimits?: boolean;
  }
) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const hapticAtLimits = options?.hapticAtLimits ?? true;

  const gesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;

      // Clamp scale between min and max
      scale.value = Math.max(minScale, Math.min(maxScale, newScale));

      // Update focal point
      focalX.value = event.focalX;
      focalY.value = event.focalY;

      // Haptic feedback at limits
      if (hapticAtLimits) {
        if (scale.value === minScale || scale.value === maxScale) {
          runOnJS(haptics.boundary)();
        }
      }
    })
    .onEnd(() => {
      savedScale.value = scale.value;

      // Snap to min/max if very close
      if (Math.abs(scale.value - minScale) < 0.1) {
        scale.value = withSpring(minScale, animations.spring.gentle);
        savedScale.value = minScale;
      } else if (Math.abs(scale.value - maxScale) < 0.1) {
        scale.value = withSpring(maxScale, animations.spring.gentle);
        savedScale.value = maxScale;
      }
    });

  const resetZoom = () => {
    'worklet';
    scale.value = withSpring(1, animations.spring.default);
    savedScale.value = 1;
  };

  return { gesture, scale, focalX, focalY, resetZoom };
};

// ============================================================================
// DOUBLE TAP
// ============================================================================

/**
 * Create a double tap gesture
 */
export const createDoubleTapGesture = (
  onDoubleTap: () => void,
  options?: {
    maxDelay?: number;
    hapticFeedback?: boolean;
  }
) => {
  const maxDelay = options?.maxDelay ?? animations.gesture.doubleTapDelay;
  const hapticFeedback = options?.hapticFeedback ?? true;

  return Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(maxDelay)
    .onStart(() => {
      if (hapticFeedback) {
        runOnJS(haptics.selection)();
      }
      runOnJS(onDoubleTap)();
    });
};

// ============================================================================
// EXPORTS
// ============================================================================

export const gestures = {
  swipe: createSwipeGesture,
  swipeToDelete: useSwipeToDelete,
  pullToRefresh: usePullToRefresh,
  longPress: createLongPressGesture,
  dragToReorder: useDragToReorder,
  pinchToZoom: usePinchToZoom,
  doubleTap: createDoubleTapGesture,
} as const;

export default gestures;
