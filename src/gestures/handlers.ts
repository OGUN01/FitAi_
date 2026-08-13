/**
 * Gesture Handlers
 * Reusable gesture logic for pull-to-refresh, drag-to-reorder, pinch-to-zoom,
 * and double tap.
 * Built on React Native Gesture Handler and Reanimated
 */

import { Gesture } from 'react-native-gesture-handler';
import { useCallback, useEffect, useMemo } from 'react';
import {
  runOnJS,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { animations } from '../theme/animations';
import { haptics } from '../utils/haptics';
import { useReducedMotion } from '../utils/accessibility/hooks';

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

  // Reduce Motion: snap-back/settle animations collapse to an instant
  // (0ms) move instead of a spring, matching the pattern already used by
  // DetentBottomSheet's settleToSnap.
  const reduceMotion = useReducedMotion();

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
            translateY.value = reduceMotion
              ? withTiming(refreshingHeight, { duration: 0 })
              : withSpring(refreshingHeight, animations.spring.gentle);

            // Haptic feedback
            runOnJS(haptics.refreshComplete)();

            // Execute refresh callback
            runOnJS(async () => {
              try {
                await onRefresh();
              } finally {
                // Reset after refresh completes
                isRefreshing.value = false;
                translateY.value = reduceMotion
                  ? withTiming(0, { duration: 0 })
                  : withSpring(0, animations.spring.default);
              }
            })();
          } else if (!isRefreshing.value) {
            // Snap back
            translateY.value = reduceMotion
              ? withTiming(0, { duration: 0 })
              : withSpring(0, animations.spring.default);
          }
        }),
    [threshold, refreshingHeight, onRefresh, translateY, isRefreshing, reduceMotion],
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

  // Reduce Motion: snap-to-position animations collapse to an instant
  // (0ms) move instead of a spring, matching the pattern already used by
  // DetentBottomSheet's settleToSnap.
  const reduceMotion = useReducedMotion();

  // Reset position must run on JS thread (setTimeout is a JS-thread API)
  const resetPosition = useCallback(() => {
    setTimeout(() => {
      translateY.value = reduceMotion
        ? withTiming(0, { duration: 0 })
        : withSpring(0, animations.spring.default);
    }, 100);
  }, [translateY, reduceMotion]);

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
        translateY.value = reduceMotion
          ? withTiming(snapPosition, { duration: 0 })
          : withSpring(snapPosition, animations.spring.snappy);

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
    reduceMotion,
  ]);

  return { gesture, translateY, isDragging };
};

// ============================================================================
// DRAG REFLOW (live sibling-row reflow during drag-to-reorder)
// ============================================================================

/**
 * Companion to useDragToReorder: tracks a per-item translateY offset array so
 * sibling rows visibly shift out of the way while one item is mid-drag,
 * instead of only animating the dragged item itself. A parent list creates
 * ONE of these (sized to its item count) and:
 *   - reads `offsets` inside each row's own useAnimatedStyle as
 *     `offsets.value[index] ?? 0` (added to that row's own translateY),
 *   - wires `reportDragMove` into the dragged row's `useDragToReorder`
 *     `onDragMove` callback,
 *   - calls `resetOffsets()` once the drop is committed (alongside the real
 *     reorder callback), so shifted siblings snap back before the list
 *     itself re-renders in its new order.
 *
 * itemHeight must match the same value passed to useDragToReorder for the
 * items in this list (the two must agree on what "one slot" means).
 */
export const useDragReflow = (count: number, itemHeight: number) => {
  const offsets = useSharedValue<number[]>(new Array(Math.max(0, count)).fill(0));
  const reduceMotion = useReducedMotion();

  // Keep the offsets array sized to the current item count (items added or
  // removed elsewhere in the builder while nothing here is mid-drag).
  useEffect(() => {
    if (offsets.value.length !== count) {
      offsets.value = new Array(Math.max(0, count)).fill(0);
    }
  }, [count, offsets]);

  const reportDragMove = useCallback(
    (fromIndex: number, targetIndex: number) => {
      if (count <= 0) return;
      const clamped = Math.max(0, Math.min(count - 1, targetIndex));
      const next = new Array(count).fill(0);
      if (fromIndex !== clamped) {
        if (fromIndex < clamped) {
          // Dragging down: items between the source and target shift UP one
          // slot to fill the gap the dragged item is passing over.
          for (let i = fromIndex + 1; i <= clamped; i++) next[i] = -itemHeight;
        } else {
          // Dragging up: items between the target and source shift DOWN one
          // slot.
          for (let i = clamped; i < fromIndex; i++) next[i] = itemHeight;
        }
      }
      offsets.value = reduceMotion
        ? next
        : next.map((v) => withTiming(v, { duration: animations.duration.quick }));
    },
    [count, itemHeight, offsets, reduceMotion],
  );

  const resetOffsets = useCallback(() => {
    offsets.value = new Array(Math.max(0, count)).fill(0);
  }, [count, offsets]);

  return { offsets, reportDragMove, resetOffsets };
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
  // Tracks whether the pinch is currently pinned at a limit, so the boundary
  // haptic fires once on the false→true transition instead of on every
  // onUpdate frame while the user holds the pinch against the limit.
  const atLimit = useSharedValue(false);

  const hapticAtLimits = options?.hapticAtLimits ?? true;

  // Reduce Motion: the min/max limit-snap animation collapses to an instant
  // (0ms) move instead of a spring, matching the pattern already used by
  // DetentBottomSheet's settleToSnap.
  const reduceMotion = useReducedMotion();

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

          // Haptic feedback at limits — edge-triggered (fires once per
          // approach to the limit, not once per frame while pinned there).
          if (hapticAtLimits) {
            const isAtLimit = scale.value === minScale || scale.value === maxScale;
            if (isAtLimit && !atLimit.value) {
              atLimit.value = true;
              runOnJS(haptics.boundary)();
            } else if (!isAtLimit && atLimit.value) {
              atLimit.value = false;
            }
          }
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          atLimit.value = false;

          // Snap to min/max if very close
          if (Math.abs(scale.value - minScale) < 0.1) {
            scale.value = reduceMotion
              ? withTiming(minScale, { duration: 0 })
              : withSpring(minScale, animations.spring.gentle);
            savedScale.value = minScale;
          } else if (Math.abs(scale.value - maxScale) < 0.1) {
            scale.value = reduceMotion
              ? withTiming(maxScale, { duration: 0 })
              : withSpring(maxScale, animations.spring.gentle);
            savedScale.value = maxScale;
          }
        })
        // onEnd only fires on a clean gesture end; a cancelled/interrupted
        // pinch (e.g. a system gesture taking over mid-pinch) skips it and
        // would leave atLimit stuck true, suppressing the boundary haptic on
        // the next pinch's first limit-hit. onFinalize always fires.
        .onFinalize(() => {
          atLimit.value = false;
        }),
    [minScale, maxScale, hapticAtLimits, scale, savedScale, focalX, focalY, atLimit, reduceMotion],
  );

  const resetZoom = () => {
    'worklet';
    scale.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(1, animations.spring.default);
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
  dragReflow: useDragReflow,
  pinchToZoom: usePinchToZoom,
  doubleTap: createDoubleTapGesture,
} as const;

export default gestures;
