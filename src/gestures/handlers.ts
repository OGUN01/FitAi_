/**
 * Gesture Handlers
 * Reusable gesture logic for pull-to-refresh, drag-to-reorder, pinch-to-zoom,
 * and double tap.
 * Built on React Native Gesture Handler and Reanimated
 */

import { Gesture } from 'react-native-gesture-handler';
import { useCallback, useMemo } from 'react';
import {
  runOnJS,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { animations } from '../theme/animations';
import { haptics } from '../utils/haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface PullToRefreshConfig {
  threshold?: number; // Pull distance threshold
  onRefresh: () => Promise<void>;
  refreshingHeight?: number; // Height when refreshing
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

  // Note: `isRefreshing` is checked *inside* onUpdate/onEnd (worklet-safe
  // reads) rather than snapshotted into `.enabled()` — a shared-value read in
  // `.enabled()` would freeze at whatever isRefreshing.value was when this
  // gesture object was built and never re-evaluate, since shared-value
  // mutations don't trigger a re-render/rebuild.
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          if (event.translationY > 0 && !isRefreshing.value) {
            // Apply rubber band effect
            const damping = event.translationY > threshold ? 2 : 1;
            translateY.value = Math.max(0, event.translationY / damping);
          }
        })
        .onEnd(() => {
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
          } else if (!isRefreshing.value) {
            // Snap back
            translateY.value = withSpring(0, animations.spring.default);
          }
        }),
    [threshold, refreshingHeight, onRefresh, translateY, isRefreshing],
  );

  return { gesture, translateY, isRefreshing };
};

// ============================================================================
// DRAG TO REORDER
// ============================================================================

/**
 * Create a drag-to-reorder gesture
 * Returns gesture and animated values for use with GestureDetector + Animated.View
 *
 * Usage:
 *   const { gesture, translateY, isDragging } = useDragToReorder(index, config);
 *   <GestureDetector gesture={gesture}>
 *     <Animated.View style={animatedStyle}>...</Animated.View>
 *   </GestureDetector>
 */
export const useDragToReorder = (
  itemIndex: number,
  config: DragToReorderConfig
) => {
  const {
    activationDelay = animations.gesture.longPressDuration,
    onDragStart,
    onDragMove,
    onDragEnd,
    itemHeight,
    hapticFeedback = true,
  } = config;

  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Reset position must run on JS thread (setTimeout is a JS-thread API)
  const resetPosition = useCallback(() => {
    setTimeout(() => {
      translateY.value = withSpring(0, animations.spring.default);
    }, 100);
  }, [translateY]);

  // Recreating the native gesture recognizer on every parent re-render can
  // drop an in-progress gesture, so the composition is memoized and only
  // rebuilt when an input that actually changes its behavior changes.
  const gesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(activationDelay)
      .onStart(() => {
        isDragging.value = true;
        if (hapticFeedback) {
          runOnJS(haptics.dragStart)();
        }
        if (onDragStart) {
          runOnJS(onDragStart)(itemIndex);
        }
      });

    const pan = Gesture.Pan()
      .onUpdate((event) => {
        if (!isDragging.value) return;
        translateY.value = event.translationY;

        // Calculate target index based on translation
        const targetIndex = Math.round(event.translationY / itemHeight) + itemIndex;

        if (onDragMove) {
          runOnJS(onDragMove)(itemIndex, targetIndex);
        }
      })
      .onEnd((event) => {
        if (!isDragging.value) return;

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

        // Reset position after snap animation completes (runs on JS thread)
        runOnJS(resetPosition)();
      });

    // Compose as simultaneous so pan tracking works while long-press is active
    return Gesture.Simultaneous(longPress, pan);
  }, [
    itemIndex,
    activationDelay,
    onDragStart,
    onDragMove,
    onDragEnd,
    itemHeight,
    hapticFeedback,
    translateY,
    isDragging,
    resetPosition,
  ]);

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

  const gesture = useMemo(
    () =>
      Gesture.Pinch()
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
        }),
    [minScale, maxScale, hapticAtLimits, scale, savedScale, focalX, focalY],
  );

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
//
// NOTE: A `useMoveExerciseBetweenDays` cross-day drag hook previously lived
// here (~190 lines). It had zero call sites anywhere in the app —
// WeeklyBuilderScreen's header comment described it as "available for Phase
// 8 polish" but never imported or called it — and its own `itemHeight` config
// field was dead (destructured and listed in the gesture's useMemo deps, but
// never read inside onUpdate/onEnd). Removed rather than shipping unverified,
// unexercised gesture logic; reintroduce it (with itemHeight actually wired
// into the target-index math, the same way useDragToReorder uses it) once
// WeeklyBuilderScreen's cross-day drag is actually built.

export const gestures = {
  pullToRefresh: usePullToRefresh,
  dragToReorder: useDragToReorder,
  pinchToZoom: usePinchToZoom,
  doubleTap: createDoubleTapGesture,
} as const;

export default gestures;
