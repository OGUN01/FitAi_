import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Path, Circle, Line, G, Text as SvgText } from "react-native-svg";
import { rf, rp, rh, rw } from "../../utils/responsive";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../theme/aurora-tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface MilestonePoint {
  week: number;
  weight: number;
  label?: string;
}

interface WeightProjectionChartProps {
  currentWeight: number;
  targetWeight: number;
  weeks: number;
  width?: number | string; // Now accepts percentage strings too
  height?: number;
  milestones?: number[];
  style?: StyleProp<ViewStyle>;
}

export const WeightProjectionChart: React.FC<WeightProjectionChartProps> = ({
  currentWeight,
  targetWeight,
  weeks,
  width: widthProp,
  height = 200,
  milestones = [],
  style,
}) => {
  const progress = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Handle layout to get actual container width
  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(Math.round(width));
  };

  // Calculate actual width - use measured container width if available,
  // otherwise fall back to a phone-sized estimate (clamped to the 480px app
  // column on web/tablet via rw()) until onLayout fires.
  const actualWidth = containerWidth > 0 ? containerWidth : rw(300);

  const padding = 40;
  const chartWidth = Math.round(actualWidth - padding * 2);
  const chartHeight = Math.round(height - padding * 2);

  // Calculate data points
  const points: MilestonePoint[] = [];
  const weightDiff = targetWeight - currentWeight;
  const weeklyChange = weightDiff / weeks;

  for (let week = 0; week <= weeks; week++) {
    points.push({
      week,
      weight: currentWeight + weeklyChange * week,
    });
  }

  // Convert weight to Y coordinate - round all values to prevent precision errors
  const minWeight = Math.min(currentWeight, targetWeight) - 5;
  const maxWeight = Math.max(currentWeight, targetWeight) + 5;
  const weightRange = maxWeight - minWeight;

  const getY = (weight: number) => {
    return Math.round(
      padding +
        chartHeight -
        ((weight - minWeight) / weightRange) * chartHeight,
    );
  };

  const getX = (week: number) => {
    // Guard against division by zero
    if (weeks === 0 || chartWidth <= 0) return padding;
    return Math.round(padding + (week / weeks) * chartWidth);
  };

  // Create line path
  const linePath = points
    .map((point, index) => {
      const x = getX(point.week);
      const y = getY(point.weight);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
    return () => { cancelAnimation(progress); };
  }, []);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: (1 - progress.value) * 1000,
    };
  });

  // Milestone points
  const milestonePoints = milestones
    .map((week) => {
      const point = points.find((p) => p.week === week);
      if (!point) return null;
      return {
        x: getX(point.week),
        y: getY(point.weight),
        week: point.week,
        weight: point.weight,
      };
    })
    .filter(Boolean);

  // Don't render until we have a valid width
  if (containerWidth === 0) {
    return (
      <View style={[styles.container, style]} onLayout={onLayout}>
        <View style={{ height }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <Svg width={actualWidth} height={height}>
        {/* Grid lines */}
        <G>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
            <Line
              key={`grid-${i}`}
              x1={padding}
              y1={Math.round(padding + chartHeight * fraction)}
              x2={Math.round(padding + chartWidth)}
              y2={Math.round(padding + chartHeight * fraction)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.3}
            />
          ))}
        </G>

        {/* Animated line path */}
        <AnimatedPath
          d={linePath}
          stroke={colors.success}
          strokeWidth={3}
          fill="none"
          strokeDasharray={1000}
          animatedProps={animatedProps}
        />

        {/* Start point */}
        <Circle
          cx={getX(0)}
          cy={getY(currentWeight)}
          r={6}
          fill={colors.primary}
          stroke={colors.white}
          strokeWidth={2}
        />

        {/* End point */}
        <Circle
          cx={getX(weeks)}
          cy={getY(targetWeight)}
          r={6}
          fill={colors.success}
          stroke={colors.white}
          strokeWidth={2}
        />

        {/* Milestone markers */}
        {milestonePoints.map((point, index) => (
          <G key={`milestone-${index}`}>
            <Circle
              cx={point!.x}
              cy={point!.y}
              r={4}
              fill={colors.info}
              stroke={colors.white}
              strokeWidth={1.5}
            />
          </G>
        ))}

        {/* Labels */}
        <SvgText
          x={getX(0)}
          y={getY(currentWeight) - 15}
          fill={colors.text}
          fontSize={rf(12)}
          textAnchor="middle"
          fontWeight="bold"
        >
          {currentWeight}kg
        </SvgText>

        <SvgText
          x={getX(weeks)}
          y={getY(targetWeight) - 15}
          fill={colors.text}
          fontSize={rf(12)}
          textAnchor="middle"
          fontWeight="bold"
        >
          {targetWeight}kg
        </SvgText>

        {/* Week labels */}
        <SvgText
          x={padding}
          y={height - 10}
          fill={colors.textSecondary}
          fontSize={rf(10)}
          textAnchor="middle"
        >
          Now
        </SvgText>

        <SvgText
          x={Math.round(padding + chartWidth)}
          y={height - 10}
          fill={colors.textSecondary}
          fontSize={rf(10)}
          textAnchor="middle"
        >
          Week {weeks}
        </SvgText>
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
        {milestones.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
            <Text style={styles.legendText}>Milestone</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.sm,
    gap: spacing.md,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  legendDot: {
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },

  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
