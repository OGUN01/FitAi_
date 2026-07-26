/**
 * MagneticTabIndicator
 * Horizontal tab picker whose indicator tracks the finger via a Pan gesture and
 * springs to the nearest tab on release. Built on the DynamicTabBar pattern but
 * adds direct finger-tracking + edge-boundary haptics for the workout builder's
 * day (Mon-Sun) selector.
 *
 * Indicator = gradient orange pill, spring config = snappy.
 * Haptic `selection` on tab change, `boundary` when finger reaches either edge.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View, Text, Pressable, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { colors, typography, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { springConfig } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { rs } from "../../../utils/responsive";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// ============================================================================
// TYPES
// ============================================================================

export interface MagneticTabIndicatorProps {
  /** Tab labels (e.g. ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]). */
  tabs: string[];
  /** Currently selected tab index. */
  selectedIndex: number;
  /** Selection callback (fires when user taps or releases a pan on a tab). */
  onSelect: (index: number) => void;
  /** Tab bar height. @default 48 */
  height?: number;
  /** Extra container styles. */
  style?: ViewStyle;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INDICATOR_HEIGHT = rs(36); // pill height
const EDGE_HAPTIC_THRESHOLD = 0.92; // fire boundary haptic at >=92% of travel

// ============================================================================
// COMPONENT
// ============================================================================

export const MagneticTabIndicator: React.FC<MagneticTabIndicatorProps> = ({
  tabs,
  selectedIndex,
  onSelect,
  height = 48,
  style,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // Normalized indicator position: 0..(tabs.length - 1).
  const indicatorX = useSharedValue(selectedIndex);
  // Pan offset in tab units (added to indicatorX during drag, 0 when idle).
  const panOffset = useSharedValue(0);
  // True while a pan gesture is in progress.
  const isPanning = useSharedValue(false);
  // Container width in px (measured via onLayout) - read by the pan worklet
  // so it can convert px translation -> tab units. SharedValues are worklet-
  // safe (unlike React state, which worklets cannot close over).
  const containerWidth = useSharedValue(0);
  // Track whether we've already fired the edge haptic this drag (debounce).
  const lastEdgeFired = useSharedValue<0 | 1 | -1>(0);

  // Drive the indicator from selectedIndex when not actively panning.
  useEffect(() => {
    if (isPanning.value) return;
    if (reduceMotion) {
      indicatorX.value = selectedIndex;
    } else {
      indicatorX.value = withSpring(selectedIndex, springConfig.snappy);
    }
  }, [selectedIndex, reduceMotion, indicatorX, isPanning]);

  const handleSelect = useCallback(
    (index: number) => {
      haptics.selection();
      onSelect(index);
    },
    [onSelect],
  );

  // Pan gesture: finger directly drives the indicator. On release, snap to the
  // nearest tab and fire onSelect.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(0)
        .onUpdate((event) => {
          isPanning.value = true;
          const width = containerWidth.value;
          // If we haven't measured yet, fall back to no-op pan.
          if (width <= 0) return;
          const tabWidth = width / tabs.length;
          // Convert px translation -> tab units.
          panOffset.value = event.translationX / tabWidth;

          // Edge-boundary haptic when finger pushes past either end.
          const total = indicatorX.value + panOffset.value;
          const maxIdx = tabs.length - 1;
          const normalized = maxIdx > 0 ? total / maxIdx : 0;
          if (normalized >= EDGE_HAPTIC_THRESHOLD && lastEdgeFired.value !== 1) {
            runOnJS(haptics.boundary)();
            lastEdgeFired.value = 1;
          } else if (normalized <= 1 - EDGE_HAPTIC_THRESHOLD && lastEdgeFired.value !== -1) {
            runOnJS(haptics.boundary)();
            lastEdgeFired.value = -1;
          } else if (
            normalized > 1 - EDGE_HAPTIC_THRESHOLD &&
            normalized < EDGE_HAPTIC_THRESHOLD
          ) {
            lastEdgeFired.value = 0;
          }
        })
        .onEnd(() => {
          // Compute nearest tab from the live position.
          const target = Math.max(
            0,
            Math.min(
              tabs.length - 1,
              Math.round(indicatorX.value + panOffset.value),
            ),
          );
          panOffset.value = 0;
          isPanning.value = false;
          lastEdgeFired.value = 0;
          indicatorX.value = withSpring(target, springConfig.snappy);
          runOnJS(handleSelect)(target);
        }),
    [tabs.length, indicatorX, panOffset, isPanning, containerWidth, lastEdgeFired, handleSelect],
  );

  // Animated style for the gradient pill indicator.
  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidthPct = 100 / tabs.length;
    const position = indicatorX.value + panOffset.value;
    // Clamp so the pill never leaves the bar during a drag.
    const clamped = Math.max(0, Math.min(tabs.length - 1, position));
    return {
      left: `${interpolate(
        clamped,
        [0, tabs.length - 1],
        [0, 100 - tabWidthPct],
        Extrapolate.CLAMP,
      )}%`,
      width: `${tabWidthPct}%`,
    };
  });

  // Measure container width on layout so the pan worklet can convert px
  // translation -> tab units. SharedValues are worklet-safe (unlike React
  // state, which worklets cannot close over).
  const handleLayout = useCallback(
    (width: number) => {
      containerWidth.value = width;
    },
    [containerWidth],
  );

  return (
    <View
      testID={testID}
      style={[styles.container, { height }, style]}
      accessibilityRole="tablist"
      onLayout={(e) => handleLayout(e.nativeEvent.layout.width)}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.tabsContainer}>
          {/* Gradient pill indicator */}
          <AnimatedLinearGradient
            colors={[colors.primary[600], colors.primary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.indicator, { height: INDICATOR_HEIGHT }, indicatorStyle]}
          />

          {/* Tabs */}
          {tabs.map((tab, index) => {
            const isActive = index === selectedIndex;
            return (
              <Pressable
                key={`${tab}-${index}`}
                onPress={() => handleSelect(index)}
                style={[styles.tab, { width: `${100 / tabs.length}%` }]}
                accessibilityRole="tab"
                accessibilityLabel={tab}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.full,
    padding: rs(4),
  },
  tabsContainer: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
  },
  indicator: {
    position: "absolute",
    top: "50%",
    marginTop: -INDICATOR_HEIGHT / 2,
    borderRadius: borderRadius.full,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // minHeight 44 to meet the touch-target minimum (the previous
    // paddingVertical: spacing.xs left the tab at ~20px tall).
    minHeight: 44,
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  tabText: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium as TextStyle["fontWeight"],
    color: colors.text.muted,
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold as TextStyle["fontWeight"],
  },
});

export default MagneticTabIndicator;
