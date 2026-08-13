import React, { useEffect } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { rh } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { useReducedMotion } from "../../utils/accessibility/hooks";

export interface BarData {
  label: string;
  value: number;
  maxValue: number;
  /**
   * @deprecated Bars render with a flat fill (de-gradient initiative) — only
   * the first color is used, and only when `color` is not supplied. Now
   * optional so callers no longer have to pass an array whose contents are
   * thrown away; prefer `color` instead.
   */
  gradient?: string[];
  /** Flat fill color for the bar. Preferred over the deprecated `gradient`. */
  color?: string;
  unit?: string;
}

interface GradientBarChartProps {
  data: BarData[];
  height?: number;
  animated?: boolean;
  showValues?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const GradientBarChart: React.FC<GradientBarChartProps> = ({
  data,
  height = rh(200),
  animated = true,
  showValues = true,
  style,
}) => {
  const barHeight =
    (height - (data.length - 1) * spacing.md) / data.length;

  return (
    <View style={[styles.container, { minHeight: height }, style]}>
      {data.map((bar, index) => (
        <BarItem
          key={bar.label}
          data={bar}
          height={barHeight}
          index={index}
          animated={animated}
          showValue={showValues}
        />
      ))}
    </View>
  );
};

interface BarItemProps {
  data: BarData;
  height: number;
  index: number;
  animated: boolean;
  showValue: boolean;
}

const BarItem: React.FC<BarItemProps> = ({
  data,
  height,
  index,
  animated,
  showValue,
}) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const percentage =
    Number.isFinite(data.value) && Number.isFinite(data.maxValue) && data.maxValue > 0
      ? Math.max(0, Math.min(100, (data.value / data.maxValue) * 100))
      : 0;

  useEffect(() => {
    if (animated && !reduceMotion) {
      progress.value = withDelay(
        index * 150,
        withTiming(percentage, {
          duration: 1000,
          easing: Easing.out(Easing.cubic),
        }),
      );
    } else {
      progress.value = percentage;
    }
  }, [animated, index, percentage, progress, reduceMotion]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      style={[styles.barContainer, { minHeight: height }]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${data.label}: ${data.value}${data.unit || "g"}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
    >
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{data.label}</Text>
        {showValue && (
          <Text style={styles.barValue}>
            {data.value}
            {data.unit || "g"}
          </Text>
        )}
      </View>
      <View style={styles.barTrack}>
        {/* Flat token fill — gradient-as-filler retired (de-gradient). */}
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: data.color ?? data.gradient?.[0] ?? colors.primary },
            animatedBarStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "space-between" as const,
  },

  barContainer: {
    marginBottom: spacing.sm,
  },

  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  barLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },

  barValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },

  barTrack: {
    width: "100%",
    height: rh(20),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
});
