/**
 * LiveVolumeRing
 * A ProgressRing variant that fills LIVE as a numeric `value` prop changes
 * (e.g. as the user adds sets in the workout builder, the ring grows toward
 * the day's max volume target). Unlike ProgressRing (which animates a one-shot
 * progress on mount), this component uses `useDerivedValue` + `withSpring` so
 * every change to `value` smoothly springs the ring to its new position.
 *
 * Built on the same SVG + Reanimated pattern as ProgressRing (see
 * src/components/ui/aurora/ProgressRing.tsx) but parameterized by an absolute
 * value + max instead of a 0..100 percentage, and always animated.
 */

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { colors } from "../../../theme/aurora-tokens";
import { springConfig } from "../../../theme/animations";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { rf } from "../../../utils/responsive";

// ============================================================================
// TYPES
// ============================================================================

export interface LiveVolumeRingProps {
  /** Current value (e.g. total volume in kg). Animates toward this. */
  value: number;
  /** Value at which the ring is considered full (100%). @default 100 */
  maxValue: number;
  /** Ring size in px. @default 120 */
  size?: number;
  /** Stroke width in px. @default 10 */
  strokeWidth?: number;
  /** Gradient colors [start, end]. @default [orange light, orange dark] */
  gradientColors?: [string, string];
  /** Optional center label (e.g. "VOLUME"). */
  label?: string;
  /** Show the numeric value in the center. @default true */
  showValue?: boolean;
  /** Number of decimals for the center value. @default 0 */
  precision?: number;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// ANIMATED CIRCLE
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// COMPONENT
// ============================================================================

export const LiveVolumeRing: React.FC<LiveVolumeRingProps> = ({
  value,
  maxValue,
  size = 120,
  strokeWidth = 10,
  gradientColors = [colors.primary[400], colors.primary[700]],
  label,
  showValue = true,
  precision = 0,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // Sanitize inputs (prevents NaN on Android native, per ProgressRing pattern).
  const safeSize = Number.isFinite(size) ? Math.round(size) : 120;
  const safeStrokeWidth = Number.isFinite(strokeWidth)
    ? Math.round(strokeWidth)
    : 10;
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;

  const radius = Math.round((safeSize - safeStrokeWidth) / 2);
  const circumference = Math.round(radius * 2 * Math.PI);
  const centerX = Math.round(safeSize / 2);
  const centerY = Math.round(safeSize / 2);

  // Target percentage (0..100), clamped.
  const targetPercent = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, (value / safeMax) * 100));
    return Number.isFinite(clamped) ? clamped : 0;
  }, [value, safeMax]);

  // Animated percentage — springs toward targetPercent on every change.
  const animatedPercent = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      animatedPercent.value = targetPercent;
    } else {
      animatedPercent.value = withSpring(targetPercent, {
        ...springConfig.smooth,
        overshootClamping: false,
      });
    }
  }, [targetPercent, reduceMotion, animatedPercent]);

  // The center text should reflect the animated value for a "ticking up"
  // effect. Use a derived value so it updates on the UI thread.
  const displayValue = useDerivedValue(() => {
    "worklet";
    // Map animated percent back to the value scale for the label.
    return (animatedPercent.value / 100) * safeMax;
  }, [safeMax]);

  // Animated stroke-dashoffset drives the ring fill.
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const offset = Math.round(
      circumference - (circumference * animatedPercent.value) / 100,
    );
    return { strokeDashoffset: offset };
  });

  // The label uses an animated text via a Reanimated-aware Text. Reanimated 3
  // doesn't ship an animated <Text> by default; we use a derived value + a
  // small animated style for opacity. For the numeric tick-up, we render the
  // rounded target value (springs are smooth enough that the discrete steps
  // are imperceptible at typical refresh rates).
  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedPercent.value,
      [0, 5, 100],
      [0.5, 1, 1],
      Extrapolate.CLAMP,
    ),
  }));

  // Gradient id must be unique per instance to avoid collisions when multiple
  // rings render on the same screen.
  const gradientId = useMemo(
    () => `liveVolumeRing-${Math.round(value)}-${safeSize}`,
    [value, safeSize],
  );

  return (
    <View
      testID={testID}
      style={[styles.container, { width: safeSize, height: safeSize }]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Volume: ${value} of ${safeMax}`}
      accessibilityLiveRegion="polite"
      accessibilityValue={{
        now: Math.round(targetPercent),
        min: 0,
        max: 100,
        text: `${value} of ${safeMax}`,
      }}
    >
      <Svg width={safeSize} height={safeSize}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={colors.glass.surface}
          strokeWidth={safeStrokeWidth}
          fill="transparent"
        />

        {/* Animated progress arc */}
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={safeStrokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${centerX}, ${centerY}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {showValue && (
          <Animated.Text style={[styles.valueText, labelAnimatedStyle]}>
            {displayValue.value.toFixed(precision)}
          </Animated.Text>
        )}
        {label ? <Text style={styles.labelText}>{label}</Text> : null}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  valueText: {
    fontSize: rf(22),
    fontWeight: "700",
    color: colors.text.primary,
  },
  labelText: {
    fontSize: rf(10),
    fontWeight: "600",
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default LiveVolumeRing;
