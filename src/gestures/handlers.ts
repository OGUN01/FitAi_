/**
 * Gesture Handlers
 * Reusable gesture logic for pull-to-refresh, drag-to-reorder (within-day and
 * cross-day), pinch-to-zoom, and double tap.
 * Built on React Native Gesture Handler and Reanimated
 */

import { Gesture } from 'react-native-gesture-handler';
import { useCallback, useMemo } from 'react';
import {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
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
    activationDelay = 500,
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
// MOVE EXERCISE BETWEEN DAYS (cross-list drag)
// ============================================================================

/**
 * Cross-day drag hook — extends the useDragToReorder pattern to support moving
 * an exercise row from one day's expanded list into a DIFFERENT day's list.
 *
 * On pan-update, the hook reports the absolute Y position so the caller can
 * hit-test which day the finger is over and highlight that day. On drop, the
 * caller resolves (fromDay, fromIndex) → (toDay, toIndex) and calls the store's
 * `moveExerciseBetweenDays`.
 *
 * Haptics:
 *  - longPress on pick-up
 *  - dragStart on pick-up
 *  - boundary when the finger crosses into a new day (caller fires this via
 *    `haptics.boundary()` when `onDayCross` first fires for a new toDay)
 *  - dragDrop on release
 *
 * The hook itself does NOT know about days — it only reports absolute Y and
 * relative drag offsets. The caller owns the day hit-testing (because day
 * layout positions are a UI concern, not a gesture concern). This keeps the
 * hook reusable and testable.
 *
 * Used by WeeklyBuilderScreen for cross-day exercise drag (Phase 8 wiring —
 * see that screen's file-header doc comment for the integration plan).
 */
export interface MoveExerciseBetweenDaysConfig {
  /** Long-press activation delay before drag engages. @default 400 */
  activationDelay?: number;
  /** Height of each exercise row (for within-day reorder math). */
  itemHeight: number;
  /** Fired when drag begins. */
  onDragStart?: (fromIndex: number) => void;
  /**
   * Fired on every pan move with the absolute Y translation (relative to the
   * drag start point). The caller hit-tests this against day block rects to
   * determine the target day + index.
   */
  onDragMove?: (absoluteY: number, fromIndex: number) => void;
  /**
   * Fired when the finger crosses into a new day (caller-driven). The caller
   * tracks the last toDay it computed and fires this hook's
   * `notifyDayCross(toDay)` when it changes — which this hook routes to the
   * boundary haptic. Provided for convenience; the caller can also fire
   * `haptics.boundary()` directly.
   */
  onDayCross?: (toDay: number) => void;
  /**
   * Fired on drop. Caller resolves toDay/toIndex from its own layout refs and
   * invokes `moveExerciseBetweenDays(fromDay, fromIndex, toDay, toIndex)`.
   * If the drop target is the same day, `toIndex` is the within-day reorder
   * target (caller should clamp to [0, dayLength-1]).
   */
  onDragEnd?: (
    fromIndex: number,
    absoluteY: number,
    translationX: number,
    translationY: number,
  ) => void;
  hapticFeedback?: boolean;
}

export const useMoveExerciseBetweenDays = (
  itemIndex: number,
  config: MoveExerciseBetweenDaysConfig,
) => {
  const {
    activationDelay = 400,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDayCross,
    itemHeight,
    hapticFeedback = true,
  } = config;

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastCrossedDay = useSharedValue(-1);

  const resetPosition = useCallback(() => {
    setTimeout(() => {
      translateY.value = withSpring(0, animations.spring.default);
      translateX.value = withSpring(0, animations.spring.default);
    }, 100);
  }, [translateY, translateX]);

  // Recreating the native gesture recognizer on every parent re-render can
  // drop an in-progress gesture, so the composition is memoized and only
  // rebuilt when an input that actually changes its behavior changes.
  const gesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(activationDelay)
      .onStart(() => {
        isDragging.value = true;
        if (hapticFeedback) {
          runOnJS(haptics.longPress)();
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
        translateX.value = event.translationX;
        if (onDragMove) {
          runOnJS(onDragMove)(event.absoluteY, itemIndex);
        }
      })
      .onEnd((event) => {
        if (!isDragging.value) return;

        if (hapticFeedback) {
          runOnJS(haptics.dragDrop)();
        }

        if (onDragEnd) {
          runOnJS(onDragEnd)(
            itemIndex,
            event.absoluteY,
            event.translationX,
            event.translationY,
          );
        }

        // Reset
        isDragging.value = false;
        lastCrossedDay.value = -1;
        runOnJS(resetPosition)();
      });

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
    translateX,
    isDragging,
    lastCrossedDay,
    resetPosition,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: isDragging.value ? 0.9 : 1,
    zIndex: isDragging.value ? 200 : 0,
    elevation: isDragging.value ? 8 : 0,
  }));

  /**
   * Caller invokes this when its hit-test detects the finger has entered a new
   * day's bounds. Fires the boundary haptic + onDayCross callback on change.
   */
  const notifyDayCross = useCallback(
    (toDay: number) => {
      if (lastCrossedDay.value === toDay) return;
      lastCrossedDay.value = toDay;
      if (hapticFeedback) {
        runOnJS(haptics.boundary)();
      }
      if (onDayCross) {
        runOnJS(onDayCross)(toDay);
      }
    },
    [onDayCross, hapticFeedback, lastCrossedDay],
  );

  return {
    gesture,
    translateY,
    translateX,
    isDragging,
    animatedStyle,
    notifyDayCross,
    /** Reset the last-crossed-day tracker (call when a drag ends). */
    resetCrossTracker: () => {
      lastCrossedDay.value = -1;
    },
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export const gestures = {
  pullToRefresh: usePullToRefresh,
  dragToReorder: useDragToReorder,
  pinchToZoom: usePinchToZoom,
  doubleTap: createDoubleTapGesture,
  moveExerciseBetweenDays: useMoveExerciseBetweenDays,
} as const;

export default gestures;
