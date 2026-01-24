/**
 * Progress Ring Component
 * Circular progress indicator with animated fill and gradient support
 * Used for metrics, health scores, and goal tracking
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { animations } from "../../theme/animations";
import { colors } from "../../theme/aurora-tokens";

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressRingProps {
  /**
   * Progress value (0-100)
   */
  progress: number;

  /**
   * Ring size in pixels
   * @default 120
   */
  size?: number;

  /**
   * Ring stroke width
   * @default 10
   */
  strokeWidth?: number;

  /**
   * Ring color (or use gradient)
   */
  color?: string;

  /**
   * Use gradient instead of solid color
   * @default false
   */
  gradient?: boolean;

  /**
   * Gradient colors (if gradient is true)
   */
  gradientColors?: string[];

  /**
   * Background ring color
   * @default colors.glass.surface
   */
  backgroundColor?: string;

  /**
   * Show progress text in center
   * @default true
   */
  showText?: boolean;

  /**
   * Custom text to display (overrides progress percentage)
   */
  text?: string;

  /**
   * Text color
   * @default colors.text.primary
   */
  textColor?: string;

  /**
   * Animate on mount
   * @default true
   */
  animated?: boolean;

  /**
   * Animation duration in ms
   * @default 1000
   */
  duration?: number;

  /**
   * Children to render in center (overrides text)
   */
  children?: React.ReactNode;
}

// ============================================================================
// ANIMATED CIRCLE COMPONENT
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// COMPONENT
// ============================================================================

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress: rawProgress,
  size: rawSize = 120,
  strokeWidth: rawStrokeWidth = 10,
  color = colors.primary[500],
  gradient = false,
  gradientColors = [colors.primary[400], colors.secondary[500]],
  backgroundColor = colors.glass.surface,
  showText = true,
  text,
  textColor = colors.text.primary,
  animated = true,
  duration = 1000,
  children,
}) => {
  // Round all numeric props to avoid precision errors on Android native
  const progress = Math.round(rawProgress);
  const size = Math.round(rawSize);
  const strokeWidth = Math.round(rawStrokeWidth);

  const animatedProgress = useSharedValue(0);

  // Calculate circle properties - already using rounded inputs
  const radius = Math.round((size - strokeWidth) / 2);
  const circumference = Math.round(radius * 2 * Math.PI);
  const centerX = Math.round(size / 2);
  const centerY = Math.round(size / 2);

  // Animate progress on mount or when progress changes
  useEffect(() => {
    if (animated) {
      // Use spring animation for natural, bouncy feel
      animatedProgress.value = withSpring(progress, {
        damping: 15,
        stiffness: 90,
        overshootClamping: false,
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, duration]);

  // Animated circle props - round to avoid precision errors
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = Math.round(
      circumference - (circumference * animatedProgress.value) / 100,
    );

    return {
      strokeDashoffset,
    };
  });

  // Progress text
  const displayText = text ?? `${Math.round(progress)}%`;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: progress, min: 0, max: 100 }}
      accessible={true}
    >
      <Svg width={size} height={size}>
        {/* Define gradient if enabled */}
        {gradient && (
          <Defs>
            <SvgLinearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {gradientColors.map((color, index) => (
                <Stop
                  key={index}
                  offset={`${(index / (gradientColors.length - 1)) * 100}%`}
                  stopColor={color}
                  stopOpacity="1"
                />
              ))}
            </SvgLinearGradient>
          </Defs>
        )}

        {/* Background circle */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={gradient ? "url(#progressGradient)" : color}
          strokeWidth={strokeWidth}
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
        {children ? (
          children
        ) : showText ? (
          <Text style={[styles.text, { color: textColor }]}>{displayText}</Text>
        ) : null}
      </View>
    </View>
  );
};

// ============================================================================
// MINI PROGRESS RING (FOR QUICK STATS)
// ============================================================================

export const MiniProgressRing: React.FC<
  Omit<ProgressRingProps, "size" | "strokeWidth">
> = (props) => {
  return <ProgressRing {...props} size={48} strokeWidth={6} />;
};

// ============================================================================
// LARGE PROGRESS RING (FOR HERO SECTIONS)
// ============================================================================

export const LargeProgressRing: React.FC<
  Omit<ProgressRingProps, "size" | "strokeWidth">
> = (props) => {
  return <ProgressRing {...props} size={200} strokeWidth={16} />;
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
  text: {
    fontSize: 24,
    fontWeight: "700",
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default ProgressRing;
