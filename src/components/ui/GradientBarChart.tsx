import React, { useEffect } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rh } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

export interface BarData {
  label: string;
  value: number;
  maxValue: number;
  gradient: string[];
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
    <View style={[styles.container, { height }, style]}>
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
  const progress = useSharedValue(0);
  const percentage = (data.value / data.maxValue) * 100;

  useEffect(() => {
    if (animated) {
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
  }, [data.value, data.maxValue]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={[styles.barContainer, { height }]}>
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
        <Animated.View style={[styles.barFill, animatedBarStyle]}>
          <LinearGradient
            colors={data.gradient as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barGradient}
          />
        </Animated.View>
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
    alignItems: "center" as const,
    marginBottom: spacing.xs,
  },

  barLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  barValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
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
  },

  barGradient: {
    flex: 1,
    borderRadius: borderRadius.full,
  },
});
