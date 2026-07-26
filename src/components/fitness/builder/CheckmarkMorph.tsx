/**
 * CheckmarkMorph — Reanimated morph animation: a circle that draws a
 * checkmark on its surface when `trigger` becomes true. Used on save/complete
 * affordances (BuilderSummaryFooter save, future workout-complete).
 *
 * Animation:
 *  1. Circle ring stroke draws in (stroke-dashoffset 0 → circumference)
 *  2. Checkmark path draws in (stroke-dashoffset length → 0)
 *  3. `haptics.celebration()` fires once when the morph completes
 *
 * Reduce-motion guard: when OS "Reduce Motion" is on, the morph snaps to the
 * final state instantly (no draw animation) and the haptic still fires.
 *
 * All colors from aurora-tokens. Spring config from animations.ts presets.
 */
import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../../theme/aurora-tokens";
import { springConfig, duration } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// ============================================================================
// TYPES
// ============================================================================

export interface CheckmarkMorphProps {
  /** Fire the morph (circle → checkmark) when this becomes true. */
  trigger: boolean;
  /** Disc diameter in px. @default 28 */
  size?: number;
  /** Stroke color (ring + check). @default colors.success.DEFAULT */
  color?: string;
  /** Background fill of the disc once complete. @default transparent */
  fillColor?: string;
  /** Extra container style. */
  style?: ViewStyle;
  /** Fired once when the morph completes (use to chain state). */
  onComplete?: () => void;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// ANIMATED SVG COMPONENTS
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ============================================================================
// COMPONENT
// ============================================================================

export const CheckmarkMorph: React.FC<CheckmarkMorphProps> = ({
  trigger,
  size: rawSize = 28,
  color = colors.success.DEFAULT,
  fillColor = "transparent",
  style,
  onComplete,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // Sanitize size (avoid NaN on Android native)
  const size = Number.isFinite(rawSize) ? Math.max(Math.round(rawSize), 16) : 28;
  const strokeWidth = Math.max(2, Math.round(size / 10));
  const radius = Math.max(2, Math.round((size - strokeWidth * 2) / 2));
  const circumference = Math.round(radius * 2 * Math.PI);
  const centerX = Math.round(size / 2);
  const centerY = Math.round(size / 2);

  // Checkmark path geometry — fits inside the disc with padding.
  // Start near (size*0.28, size*0.52), elbow at (size*0.44, size*0.66),
  // end near (size*0.72, size*0.34).
  const checkPath = `M ${size * 0.28} ${size * 0.52} L ${size * 0.44} ${
    size * 0.66
  } L ${size * 0.72} ${size * 0.34}`;
  // Approximate path length for the dash animation (good enough visually).
  const checkLength = Math.round(size * 0.9);

  // Progress values: 0 = nothing drawn, 1 = fully drawn
  const ringProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);

  useEffect(() => {
    if (!trigger) {
      ringProgress.value = 0;
      checkProgress.value = 0;
      return;
    }

    if (reduceMotion) {
      // Snap to final state; still fire haptic + callback.
      ringProgress.value = 1;
      checkProgress.value = 1;
      runOnJS(haptics.celebration)();
      if (onComplete) runOnJS(onComplete)();
      return;
    }

    // 1. Ring draws in (spring), 2. check draws in (timing), 3. haptic fires.
    ringProgress.value = withSpring(1, springConfig.snappy);
    checkProgress.value = withDelay(
      duration.quick,
      withTiming(1, {
        duration: duration.normal,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Fire celebration haptic when the check finishes drawing.
    const totalDelay = duration.quick + duration.normal;
    const t = setTimeout(() => {
      runOnJS(haptics.celebration)();
      if (onComplete) runOnJS(onComplete)();
    }, totalDelay);
    return () => clearTimeout(t);
  }, [trigger, reduceMotion, ringProgress, checkProgress, onComplete]);

  // Animated ring stroke-dashoffset: circumference → 0 as progress 0 → 1
  const ringAnimatedProps = useAnimatedProps(() => {
    "worklet";
    const offset = circumference * (1 - ringProgress.value);
    return { strokeDashoffset: Math.round(offset) };
  });

  // Animated check stroke-dashoffset: checkLength → 0 as progress 0 → 1
  const checkAnimatedProps = useAnimatedProps(() => {
    "worklet";
    const offset = checkLength * (1 - checkProgress.value);
    return { strokeDashoffset: Math.round(offset) };
  });

  return (
    <View
      testID={testID}
      style={[{ width: size, height: size }, styles.container, style]}
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel={trigger ? "Completed" : "Not completed"}
    >
      <Svg width={size} height={size}>
        {/* Background disc fill (appears once ring starts drawing) */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill={fillColor}
          opacity={trigger ? 1 : 0}
        />
        {/* Track ring (faint, full circle behind the animated one) */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={0.2}
        />
        {/* Animated ring draw-in */}
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animatedProps={ringAnimatedProps}
          rotation="-90"
          origin={`${centerX}, ${centerY}`}
        />
        {/* Animated checkmark draw-in */}
        <AnimatedPath
          d={checkPath}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={checkLength}
          strokeDashoffset={checkLength}
          animatedProps={checkAnimatedProps}
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
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CheckmarkMorph;
