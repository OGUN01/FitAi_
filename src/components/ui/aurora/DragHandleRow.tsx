/**
 * DragHandleRow
 * Generalized drag-to-reorder row for the workout builder. Wraps the existing
 * `useDragToReorder` gesture (src/gestures/handlers.ts:232) and adds:
 *   - a grabber glyph (Ionicons `reorder-three`)
 *   - elevation shadow + opacity dim during drag
 *   - haptic tier on threshold cross (fires once per index change while panning)
 *   - the accessibility hint mandated by the plan:
 *     "Double tap to enter reorder mode, then swipe up/down to move"
 *
 * This is a generalized, enhanced version of the inline `DraggableRow` pattern
 * currently living in `src/screens/workouts/CreateWorkoutScreen.tsx:61`.
 */

import React, { useCallback, useRef } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  useDragToReorder,
} from "../../../gestures/handlers";
import { colors, spacing } from "../../../theme/aurora-tokens";
import { animations, springConfig, duration } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { rs } from "../../../utils/responsive";

// ============================================================================
// TYPES
// ============================================================================

export interface DragHandleRowProps {
  /** Children rendered as the row content (to the right of the grabber). */
  children: React.ReactNode;
  /** Index of this row within the parent list. */
  index: number;
  /** Total number of rows in the list (used to clamp the target index). */
  totalCount: number;
  /** Height of each row in px - required by useDragToReorder for snap math. */
  itemHeight: number;
  /** Fires when the drag activates (long-press threshold reached). */
  onDragStart?: (index: number) => void;
  /** Fires continuously as the dragged item passes over a new index. */
  onDragMove?: (fromIndex: number, toIndex: number) => void;
  /** Fires on release with the final from/to indices (after clamping). */
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  /** External "this row is the actively dragged one" flag (for styling). */
  isActive?: boolean;
  /** Accessibility label for the grabber handle. */
  dragHandleAccessibilityLabel?: string;
  /** Long-press activation delay in ms. @default 400 */
  activationDelay?: number;
  /** Extra styles for the outer row container. */
  style?: ViewStyle;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DragHandleRow: React.FC<DragHandleRowProps> = ({
  children,
  index,
  totalCount,
  itemHeight,
  onDragStart,
  onDragMove,
  onDragEnd,
  isActive = false,
  dragHandleAccessibilityLabel = "Reorder handle",
  activationDelay = animations.gesture.longPressDuration - 100,
  style,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // Wire the existing drag gesture. We pass our own haptic-augmented callbacks
  // so we can fire the threshold-cross haptic on each index change.
  const lastTargetIndex = useRef<number>(index);

  const wrappedOnDragMove = useCallback(
    (from: number, to: number) => {
      const clamped = Math.max(0, Math.min(totalCount - 1, to));
      if (clamped !== lastTargetIndex.current) {
        lastTargetIndex.current = clamped;
        // Tier haptic: medium impact each time the dragged row crosses into a
        // new slot. Fire-and-forget (non-blocking).
        haptics.medium();
      }
      onDragMove?.(from, clamped);
    },
    [totalCount, onDragMove],
  );

  const wrappedOnDragEnd = useCallback(
    (from: number, to: number) => {
      const clampedTo = Math.max(0, Math.min(totalCount - 1, to));
      lastTargetIndex.current = index; // reset for next drag
      onDragEnd?.(from, clampedTo);
    },
    [totalCount, index, onDragEnd],
  );

  const { gesture, translateY, isDragging } = useDragToReorder(index, {
    itemHeight,
    activationDelay,
    onDragStart,
    onDragMove: wrappedOnDragMove,
    onDragEnd: wrappedOnDragEnd,
    hapticFeedback: true, // useDragToReorder already fires dragStart/dragDrop
  });

  // Animated row style: translateY follows the finger during drag; on release
  // it springs back / snaps (handled by useDragToReorder). During drag we add
  // elevation + opacity dim. Neighbors reflow via Reanimated's <Animated.View>
  // layout animations (enabled by `entering`/`exiting` on siblings in the parent
  // list — this component just keeps its own transform self-contained).
  const animatedStyle = useAnimatedStyle(() => {
    const dragging = isDragging.value;
    return {
      transform: [{ translateY: translateY.value }],
      opacity: dragging ? 0.9 : 1,
      zIndex: dragging ? 100 : 0,
      // Elevation/shadow only while dragging - matches the existing
      // CreateWorkoutScreen DraggableRow pattern but pulls from shadow tokens
      // for consistency with the Aurora system.
      ...(dragging
        ? {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: rs(6) },
            shadowOpacity: 0.3,
            shadowRadius: rs(12),
            elevation: 6,
          }
        : {}),
    };
  });

  // Grabber glyph subtly highlights when the row is the active drag target.
  const grabberStyle = useAnimatedStyle(() => {
    const active = isDragging.value || isActive;
    return {
      opacity: withTiming(active ? 1 : 0.55, {
        duration: reduceMotion ? 0 : duration.quick,
      }),
      transform: [
        {
          scale: reduceMotion
            ? active
              ? 1.15
              : 1
            : withSpring(active ? 1.15 : 1, springConfig.snappy),
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={dragHandleAccessibilityLabel}
        accessibilityHint="Double tap to enter reorder mode, then swipe up/down to move"
        accessibilityState={{ expanded: isDragging.value }}
        style={[styles.row, { minHeight: itemHeight }, animatedStyle, style]}
      >
        {/* Grabber handle */}
        <Animated.View
          style={[styles.grabber, grabberStyle]}
          pointerEvents="none"
        >
          <Ionicons
            name="reorder-three"
            size={rs(24)}
            color={colors.text.tertiary}
          />
        </Animated.View>

        {/* Row content */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </GestureDetector>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  grabber: {
    width: rs(32),
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
});

export default DragHandleRow;
