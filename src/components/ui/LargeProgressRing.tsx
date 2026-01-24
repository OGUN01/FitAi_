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
import { rf, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LargeProgressRingProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  gradient?: string[];
  showGlow?: boolean;
  showValue?: boolean;
  label?: string;
  style?: any;
}

export const LargeProgressRing: React.FC<LargeProgressRingProps> = ({
  value: rawValue,
  maxValue: rawMaxValue = 100,
  size: rawSize = 200,
  strokeWidth: rawStrokeWidth = 16,
  gradient = ["#4CAF50", "#45A049"],
  showGlow = true,
  showValue = true,
  label,
  style,
}) => {
  // Sanitize and round all numeric props to avoid NaN and precision errors on Android native
  const value = Number.isFinite(rawValue) ? Math.round(rawValue) : 0;
  const maxValue =
    Number.isFinite(rawMaxValue) && rawMaxValue > 0
      ? Math.round(rawMaxValue)
      : 100;
  const size = Number.isFinite(rawSize) ? Math.round(rawSize) : 200;
  const strokeWidth = Number.isFinite(rawStrokeWidth)
    ? Math.round(rawStrokeWidth)
    : 16;

  const progress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // Calculate with already-rounded values
  const radius = Math.round((size - strokeWidth) / 2);
  const circumference = Math.round(2 * Math.PI * radius);
  const center = Math.round(size / 2);
  const percentage = Math.round(Math.min((value / maxValue) * 100, 100));

  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });

    if (showGlow) {
      glowOpacity.value = withSpring(0.6, {
        damping: 20,
        stiffness: 90,
      });
    }
  }, [value, maxValue]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = Math.round(
      circumference - (circumference * progress.value) / 100,
    );
    return {
      strokeDashoffset,
    };
  });

  const animatedGlowStyle = useAnimatedProps(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </SvgLinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ResponsiveTheme.colors.backgroundTertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Glow effect */}
        {showGlow && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={strokeWidth + 4}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            animatedProps={animatedGlowStyle}
            opacity={0.3}
          />
        )}

        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      {showValue && (
        <View style={styles.centerContent}>
          <Text style={[styles.valueText, { fontSize: rf(size / 4) }]}>
            {Math.round(value)}
          </Text>
          {label && (
            <Text style={[styles.labelText, { fontSize: rf(size / 12) }]}>
              {label}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  valueText: {
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  labelText: {
    marginTop: rp(4),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
