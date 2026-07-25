/**
 * SupersetConnector
 * SVG curved dashed connector drawn between grouped exercise rows to visually
 * indicate a superset/circuit grouping. The connector animates its stroke draw
 * (spring, ~400ms) on mount and (optionally) when its endpoints change.
 *
 * Built on react-native-svg (already a project dependency) rather than Skia —
 * Skia is reserved for the radar chart per the plan, and SVG is the existing
 * pattern for chart primitives (see ProgressRing, AnimatedChart).
 */

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { colors, flatColors } from "../../../theme/aurora-tokens";
import { springConfig, duration } from "../../../theme/animations";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// ============================================================================
// TYPES
// ============================================================================

export interface SupersetConnectorProps {
  /** Y coordinate of the connector start (top), in px relative to the SVG. */
  startY: number;
  /** Y coordinate of the connector end (bottom), in px relative to the SVG. */
  endY: number;
  /** Connector color. @default purple #9333EA (the superset accent in tokens) */
  color?: string;
  /** Animate the stroke draw on mount / endpoint change. @default true */
  animated?: boolean;
  /** Stroke width in px. @default 2 */
  strokeWidth?: number;
  /** Horizontal inset from the left edge where the curve is anchored. @default 16 */
  insetX?: number;
  /** Container width. @default 40 (narrow gutter on the left of the rows) */
  width?: number;
  /** Extra container styles. */
  style?: ViewStyle;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// ANIMATED SVG PATH
// ============================================================================

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ============================================================================
// COMPONENT
// ============================================================================

export const SupersetConnector: React.FC<SupersetConnectorProps> = ({
  startY,
  endY,
  color = flatColors.purple, // #9333EA — the superset accent in aurora tokens
  animated = true,
  strokeWidth = 2,
  insetX = 16,
  width = 40,
  style,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // Stroke draw progress: 0 (no path drawn) -> 1 (full path).
  const drawProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !animated) {
      drawProgress.value = 1;
    } else {
      drawProgress.value = 0;
      drawProgress.value = withSpring(1, springConfig.snappy);
    }
  }, [reduceMotion, animated, drawProgress, startY, endY]);

  // Build the curved path: a gentle S-curve from (insetX, startY) down to
  // (insetX, endY) with a horizontal bulge for visual interest. Uses cubic
  // bezier with control points offset horizontally to create the curve.
  const pathD = useMemo(() => {
    const midY = (startY + endY) / 2;
    const bulge = width * 0.4;
    return `M ${insetX} ${startY} C ${insetX + bulge} ${startY}, ${
      insetX + bulge
    } ${midY}, ${insetX} ${midY} C ${insetX - bulge} ${midY}, ${
      insetX - bulge
    } ${endY}, ${insetX} ${endY}`;
  }, [startY, endY, insetX, width]);

  // Animated stroke-dashoffset drives the draw-in. We compute the path length
  // once via a ref measurement; for simplicity (and because the curve length is
  // stable for given endpoints), we estimate it as a function of the bounding
  // box. The dasharray is set to the path length; offset animates from len -> 0.
  const pathLength = useMemo(() => {
    // Approximate arc length of the S-curve: ~2x the vertical span (the bulge
    // adds roughly the same again). Good enough for a dash animation — the
    // visual draw-in is approximate, not pixel-perfect.
    const verticalSpan = Math.abs(endY - startY);
    return Math.max(20, verticalSpan * 1.6);
  }, [startY, endY]);

  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const offset = pathLength * (1 - drawProgress.value);
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View
      testID={testID}
      style={[{ width, height: Math.max(1, endY - startY) + 4 }, styles.container, style]}
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel="Superset connector"
      accessibilityHint="Visually groups these exercises as a superset"
    >
      <Svg width={width} height={Math.max(1, endY - startY) + 4}>
        {/* Track (faint, full-length dashed line behind the animated one) */}
        <Path
          d={pathD}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray="4 4"
          opacity={0.25}
          strokeLinecap="round"
        />
        {/* Animated draw-in on top */}
        <AnimatedPath
          d={pathD}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${pathLength}`}
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
        {/* Endpoint dots for emphasis */}
        <Path
          d={`M ${insetX} ${startY} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`}
          fill={color}
        />
        <Path
          d={`M ${insetX} ${endY} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`}
          fill={color}
        />
      </Svg>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});

export default SupersetConnector;
