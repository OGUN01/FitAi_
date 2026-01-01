import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { rf, rp, rh } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  style?: any;
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

  // Calculate actual width - use container width if available, otherwise fallback
  const actualWidth = containerWidth > 0 ? containerWidth : Math.round(SCREEN_WIDTH * 0.85);

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
      weight: currentWeight + (weeklyChange * week),
    });
  }

  // Convert weight to Y coordinate - round all values to prevent precision errors
  const minWeight = Math.min(currentWeight, targetWeight) - 5;
  const maxWeight = Math.max(currentWeight, targetWeight) + 5;
  const weightRange = maxWeight - minWeight;

  const getY = (weight: number) => {
    return Math.round(padding + chartHeight - ((weight - minWeight) / weightRange) * chartHeight);
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
    .join(' ');

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
  const milestonePoints = milestones.map(week => {
    const point = points.find(p => p.week === week);
    if (!point) return null;
    return {
      x: getX(point.week),
      y: getY(point.weight),
      week: point.week,
      weight: point.weight,
    };
  }).filter(Boolean);

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
          x={Math.round(padding + chartWidth)}
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
          <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
        {milestones.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Milestone</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.md,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
