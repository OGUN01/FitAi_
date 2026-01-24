import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Path, Circle, Line, G, Text as SvgText } from "react-native-svg";
import { rf, rp, rh } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

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
  width?: number;
  height?: number;
  milestones?: number[];
  style?: any;
}

export const WeightProjectionChart: React.FC<WeightProjectionChartProps> = ({
  currentWeight: rawCurrentWeight,
  targetWeight: rawTargetWeight,
  weeks: rawWeeks,
  width = 320,
  height = 200,
  milestones = [],
  style,
}) => {
  const progress = useSharedValue(0);

  // Sanitize inputs to prevent NaN - use safe defaults
  const currentWeight = Number.isFinite(rawCurrentWeight)
    ? rawCurrentWeight
    : 70;
  const targetWeight = Number.isFinite(rawTargetWeight) ? rawTargetWeight : 65;
  const weeks = Number.isFinite(rawWeeks) && rawWeeks > 0 ? rawWeeks : 12;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate data points
  const points: MilestonePoint[] = [];
  const weightDiff = targetWeight - currentWeight;
  const weeklyChange = weeks > 0 ? weightDiff / weeks : 0;

  for (let week = 0; week <= weeks; week++) {
    points.push({
      week,
      weight: currentWeight + weeklyChange * week,
    });
  }

  // Convert weight to Y coordinate
  const minWeight = Math.min(currentWeight, targetWeight) - 5;
  const maxWeight = Math.max(currentWeight, targetWeight) + 5;
  const weightRange = maxWeight - minWeight;

  const getY = (weight: number) => {
    return (
      padding + chartHeight - ((weight - minWeight) / weightRange) * chartHeight
    );
  };

  const getX = (week: number) => {
    return padding + (week / weeks) * chartWidth;
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

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        <G>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
            <Line
              key={`grid-${i}`}
              x1={padding}
              y1={padding + chartHeight * fraction}
              x2={padding + chartWidth}
              y2={padding + chartHeight * fraction}
              stroke={ResponsiveTheme.colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.3}
            />
          ))}
        </G>

        {/* Animated line path */}
        <AnimatedPath
          d={linePath}
          stroke="#4CAF50"
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
          fill="#FF6B35"
          stroke="#fff"
          strokeWidth={2}
        />

        {/* End point */}
        <Circle
          cx={getX(weeks)}
          cy={getY(targetWeight)}
          r={6}
          fill="#4CAF50"
          stroke="#fff"
          strokeWidth={2}
        />

        {/* Milestone markers */}
        {milestonePoints.map((point, index) => (
          <G key={`milestone-${index}`}>
            <Circle
              cx={point!.x}
              cy={point!.y}
              r={4}
              fill="#2196F3"
              stroke="#fff"
              strokeWidth={1.5}
            />
          </G>
        ))}

        {/* Labels */}
        <SvgText
          x={getX(0)}
          y={getY(currentWeight) - 15}
          fill={ResponsiveTheme.colors.text}
          fontSize={12}
          textAnchor="middle"
          fontWeight="bold"
        >
          {currentWeight}kg
        </SvgText>

        <SvgText
          x={getX(weeks)}
          y={getY(targetWeight) - 15}
          fill={ResponsiveTheme.colors.text}
          fontSize={12}
          textAnchor="middle"
          fontWeight="bold"
        >
          {targetWeight}kg
        </SvgText>

        {/* Week labels */}
        <SvgText
          x={padding}
          y={height - 10}
          fill={ResponsiveTheme.colors.textSecondary}
          fontSize={10}
          textAnchor="middle"
        >
          Now
        </SvgText>

        <SvgText
          x={padding + chartWidth}
          y={height - 10}
          fill={ResponsiveTheme.colors.textSecondary}
          fontSize={10}
          textAnchor="middle"
        >
          Week {weeks}
        </SvgText>
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FF6B35" }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
        {milestones.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
            <Text style={styles.legendText}>Milestone</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.md,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },

  legendDot: {
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },

  legendText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
