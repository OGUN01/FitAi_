/**
 * DetentBottomSheet
 * Multi-snap-point bottom sheet (WHOOP / Apple style) built on top of the
 * existing `BottomSheet`. Adds:
 *   - `snapPoints` array (e.g. [0.3, 0.6, 0.95] of screen height)
 *   - spring transitions between detents via `withSpring`
 *   - the drag handle tracks the finger during pan; on release it springs to
 *     the nearest snap point
 *   - `onSnapChange` callback when the active detent changes
 *
 * It COMPOSES BottomSheet rather than duplicating it — backdrop fade,
 * KeyboardAvoidingView, safe-area inset, GlassCard surface, and the close
 * button are all reused from the base sheet. This file only adds the detent
 * translation layer + the snap logic.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  type PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet, type BottomSheetProps } from "./BottomSheet";
import { GlassCard } from "./GlassCard";
import {
  colors,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { animations, springConfig } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { rp, rf, dimensions } from "../../../utils/responsive";

// ============================================================================
// TYPES
// ============================================================================

export interface DetentBottomSheetProps
  extends Omit<
    BottomSheetProps,
    "dismissOnDrag" | "maxHeightFraction"
  > {
  /** Snap points as fractions of screen height (0..1), ascending. @default [0.3, 0.6, 0.95] */
  snapPoints?: number[];
  /** Index into snapPoints to open at. @default last (highest) */
  initialSnapIndex?: number;
  /** Fires when the sheet settles on a new detent. */
  onSnapChange?: (index: number) => void;
  /**
   * When true, dragging past the lowest detent dismisses the sheet (Apple-style).
   * @default true
   */
  dismissOnLowestDrag?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SNAP_POINTS = [0.3, 0.6, 0.95] as const;
const DISMISS_VELOCITY = 500; // px/s — fast flick down dismisses even if not past threshold

// ============================================================================
// COMPONENT
// ============================================================================

export const DetentBottomSheet: React.FC<DetentBottomSheetProps> = ({
  snapPoints = DEFAULT_SNAP_POINTS as unknown as number[],
  initialSnapIndex,
  onSnapChange,
  dismissOnLowestDrag = true,
  visible,
  onClose,
  children,
  ...bottomSheetProps
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const screenHeight = dimensions.screenHeight;

  // Sort ascending + dedupe defensively.
  const sortedPoints = useMemo(() => {
    const unique = Array.from(new Set(snapPoints));
    return unique.sort((a, b) => a - b);
  }, [snapPoints]);

  const startSnapIndex =
    initialSnapIndex != null
      ? Math.max(0, Math.min(sortedPoints.length - 1, initialSnapIndex))
      : sortedPoints.length - 1;

  // translateY: 0 = fully open at the active detent; positive = dragged down.
  const translateY = useSharedValue(0);
  const currentSnapIndex = useSharedValue(startSnapIndex);
  const currentSnapHeight = useSharedValue(
    screenHeight * sortedPoints[startSnapIndex],
  );

  // Initialize on open.
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      currentSnapIndex.value = startSnapIndex;
      currentSnapHeight.value = screenHeight * sortedPoints[startSnapIndex];
    }
  }, [visible, startSnapIndex, sortedPoints, screenHeight, translateY, currentSnapIndex, currentSnapHeight]);

  const settleToSnap = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(sortedPoints.length - 1, index));
      const targetHeight = screenHeight * sortedPoints[clamped];
      currentSnapIndex.value = clamped;
      currentSnapHeight.value = targetHeight;
      translateY.value = reduceMotion
        ? 0
        : withSpring(0, springConfig.smooth);
      if (clamped !== startSnapIndex || visible) {
        onSnapChange?.(clamped);
      }
    },
    [sortedPoints, screenHeight, translateY, currentSnapIndex, currentSnapHeight, reduceMotion, startSnapIndex, visible, onSnapChange],
  );

  // Pan gesture on the drag handle: tracks finger, springs to nearest detent
  // on release. Dragging down past the lowest detent (with sufficient velocity
  // or distance) dismisses the sheet.
  const gestureHandler =
    useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { startY: number; startIndex: number }
    >({
      onStart: (_e, ctx) => {
        ctx.startY = translateY.value;
        ctx.startIndex = currentSnapIndex.value;
      },
      onActive: (event, ctx) => {
        // Only allow dragging DOWN (positive). Upward drag is permitted too —
        // it moves to a higher detent on release.
        translateY.value = ctx.startY + event.translationY;
      },
      onEnd: (event, ctx) => {
        const currentTop = currentSnapHeight.value + translateY.value;
        // currentTop = distance from bottom of screen to the sheet's top edge.
        // Find the nearest snap point by comparing heights.
        let nearestIndex = ctx.startIndex;
        let nearestDelta = Infinity;
        for (let i = 0; i < sortedPoints.length; i++) {
          const pointHeight = screenHeight * sortedPoints[i];
          // Project where the sheet top would rest at this detent given the
          // current drag: the sheet's "rest height" for index i minus how far
          // we've dragged down from the start.
          const projected = pointHeight - ctx.startY;
          const delta = Math.abs(currentTop - projected);
          if (delta < nearestDelta) {
            nearestDelta = delta;
            nearestIndex = i;
          }
        }

        // Dismiss if dragged far past the lowest detent OR a fast flick down.
        const lowestHeight = screenHeight * sortedPoints[0];
        const overdragPastLowest =
          currentSnapHeight.value + translateY.value - lowestHeight;
        const isLowest = nearestIndex === 0;
        if (
          dismissOnLowestDrag &&
          isLowest &&
          (overdragPastLowest > 80 || event.velocityY > DISMISS_VELOCITY)
        ) {
          translateY.value = withTiming(screenHeight, {
            duration: animations.duration.normal,
          });
          runOnJS(onClose)();
          return;
        }

        runOnJS(haptics.selection)();
        runOnJS(settleToSnap)(nearestIndex);
      },
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    // The sheet's height animates to the active detent; translateY offsets it
    // during drag. We express the sheet wrapper height directly.
    return {
      height: currentSnapHeight.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  // Grabber opacity dims slightly as the sheet is dragged down.
  const grabberAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, 80],
      [1, 0.4],
      Extrapolate.CLAMP,
    ),
  }));

  // We render our own GlassCard surface (with the detent height + pan handle)
  // inside a transparent BottomSheet so we inherit the portal, backdrop,
  // KeyboardAvoidingView, and close-button behaviors without duplicating them.
  // The base BottomSheet's own sheet surface is hidden by passing a transparent
  // content style and maxHeightFraction=1 (so it never clips our taller sheet).
  return (
    <BottomSheet
      {...bottomSheetProps}
      visible={visible}
      onClose={onClose}
      dismissOnDrag={false}
      maxHeightFraction={1}
      showCloseButton={false}
      title={undefined}
      backdropOpacity={0.6}
      contentStyle={styles.detentContent}
    >
      <Animated.View
        style={[
          styles.detentSheet,
          {
            paddingBottom: insets.bottom || rp(spacing.md),
          },
          sheetAnimatedStyle,
        ]}
      >
        <GlassCard
          blurIntensity="heavy"
          elevation={6}
          padding="none"
          borderRadius="xxl"
          style={styles.sheetSurface}
          contentStyle={styles.sheetContent}
        >
          {/* Drag handle region (pan-driven detents) */}
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View
              accessibilityRole="adjustable"
              accessibilityLabel="Sheet detent"
              accessibilityHint="Drag up or down to change sheet height"
            >
              <Animated.View style={[styles.grabberRow, grabberAnimatedStyle]}>
                <View style={styles.grabber} />
                {/* Detent dots row — visual hint of how many snap points exist */}
                <View
                  style={styles.detentDots}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {sortedPoints.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.detentDot,
                        // Active dot is wider (pill); others are small dots.
                        i === startSnapIndex && styles.detentDotActive,
                      ]}
                    />
                  ))}
                </View>
              </Animated.View>
            </Animated.View>
          </PanGestureHandler>

          {/* Optional close button (top-right), in case caller disabled header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                haptics.light();
                onClose();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={rf(14)}
                color={colors.text.secondary}
              />
            </Pressable>
          </View>

          {/* Content — scrollable area within the detent */}
          <View style={styles.content}>{children}</View>
        </GlassCard>
      </Animated.View>
    </BottomSheet>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  detentContent: {
    backgroundColor: "transparent",
    padding: 0,
  },
  detentSheet: {
    width: "100%",
  },
  sheetSurface: {
    backgroundColor: colors.background.secondary,
    flex: 1,
  },
  sheetContent: {
    backgroundColor: "transparent",
    flex: 1,
  },
  grabberRow: {
    alignItems: "center",
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xs),
    gap: rp(spacing.xs),
  },
  grabber: {
    width: rp(40),
    height: rp(4),
    borderRadius: borderRadius.full,
    backgroundColor: colors.text.tertiary,
  },
  detentDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  detentDot: {
    width: rp(4),
    height: rp(4),
    borderRadius: borderRadius.full,
    backgroundColor: colors.text.tertiary,
    opacity: 0.5,
  },
  detentDotActive: {
    width: rp(16),
    opacity: 1,
    backgroundColor: colors.primary[500],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.xs),
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.lg),
  },
});

export default DetentBottomSheet;
