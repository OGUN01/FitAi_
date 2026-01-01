import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Svg, { Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { rf, rp, rw, rh } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { ChartTooltip } from './ChartTooltip';
import { hapticSelection } from '../../utils/haptics';

interface DataPoint {
  label: string;
  value: number;
}

interface AnimatedChartProps {
  currentValue: number;
  targetValue: number;
  currentLabel?: string;
  targetLabel?: string;
  unit?: string;
  showProgress?: boolean;
  progressWeeks?: number;
  width?: number;
  height?: number;
  style?: any;
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({
  currentValue: rawCurrentValue,
  targetValue: rawTargetValue,
  currentLabel = 'Current',
  targetLabel = 'Target',
  unit = 'kg',
  showProgress = true,
  progressWeeks = 12,
  width = 300,
  height = 200,
  style,
}) => {
  // Sanitize inputs to prevent NaN
  const currentValue = Number.isFinite(rawCurrentValue) ? rawCurrentValue : 70;
  const targetValue = Number.isFinite(rawTargetValue) ? rawTargetValue : 65;
  
  const progress = useSharedValue(0);
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: number;
    label: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    label: '',
  });

  useEffect(() => {
    progress.value = withSpring(1, {
      damping: 20,
      stiffness: 90,
    });
  }, [currentValue, targetValue]);

  // Calculate chart dimensions
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Determine min and max for Y-axis
  const minValue = Math.min(currentValue, targetValue) * 0.95;
  const maxValue = Math.max(currentValue, targetValue) * 1.05;
  const valueRange = maxValue - minValue;

  // Convert value to Y coordinate
  const valueToY = (value: number): number => {
    const normalized = (value - minValue) / valueRange;
    return padding + chartHeight - normalized * chartHeight;
  };

  // Generate milestone points
  const milestones: DataPoint[] = [];
  const valueStep = (targetValue - currentValue) / progressWeeks;

  for (let week = 0; week <= progressWeeks; week += 4) {
    const value = currentValue + valueStep * week;
    milestones.push({
      label: `Week ${week}`,
      value,
    });
  }

  // Add final target if not already included
  if (milestones[milestones.length - 1].label !== `Week ${progressWeeks}`) {
    milestones.push({
      label: targetLabel,
      value: targetValue,
    });
  }

  // Create path for the line
  const createLinePath = (): string => {
    const startX = padding;
    const endX = padding + chartWidth;
    const startY = valueToY(currentValue);
    const endY = valueToY(targetValue);

    // Create a smooth curve
    const controlX1 = startX + chartWidth * 0.33;
    const controlY1 = startY;
    const controlX2 = startX + chartWidth * 0.66;
    const controlY2 = endY;

    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
  };

  const linePath = createLinePath();

  // Touch gesture handler
  const tapGesture = Gesture.Tap()
    .onBegin((event) => {
      const touchX = event.x;
      const touchY = event.y;

      // Check if touch is within chart bounds
      if (
        touchX >= padding &&
        touchX <= padding + chartWidth &&
        touchY >= padding &&
        touchY <= padding + chartHeight
      ) {
        // Find nearest milestone
        let nearestMilestone = milestones[0];
        let minDistance = Infinity;

        milestones.forEach((milestone, index) => {
          const milestoneX = padding + (chartWidth / (milestones.length - 1)) * index;
          const milestoneY = valueToY(milestone.value);
          const distance = Math.sqrt(
            Math.pow(touchX - milestoneX, 2) + Math.pow(touchY - milestoneY, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestMilestone = milestone;
          }
        });

        // Show tooltip if touch is close enough (within 30px)
        if (minDistance < 30) {
          const milestoneIndex = milestones.indexOf(nearestMilestone);
          const milestoneX = padding + (chartWidth / (milestones.length - 1)) * milestoneIndex;
          const milestoneY = valueToY(nearestMilestone.value);

          hapticSelection();

          setTooltipData({
            visible: true,
            x: milestoneX - 50, // Center the tooltip
            y: milestoneY - 60, // Position above the point
            value: nearestMilestone.value,
            label: nearestMilestone.label,
          });
        }
      }
    })
    .onEnd(() => {
      // Hide tooltip after a delay
      setTimeout(() => {
        setTooltipData((prev) => ({ ...prev, visible: false }));
      }, 2000);
    });

  // Pre-calculate Y values outside the worklet (worklets can't call JS functions)
  const startY = valueToY(currentValue);
  const endY = valueToY(targetValue);

  // Animated progress indicator
  const animatedProgressStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [padding, padding + chartWidth],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      progress.value,
      [0, 1],
      [startY, endY],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX },
        { translateY },
      ],
    };
  });

  // Calculate percentage change (handle division by zero)
  const percentageChange = currentValue !== 0 
    ? ((targetValue - currentValue) / currentValue) * 100 
    : 0;
  const changeDirection = percentageChange > 0 ? 'increase' : 'decrease';
  const changeText = Number.isFinite(percentageChange) 
    ? `${Math.abs(percentageChange).toFixed(1)}% ${changeDirection}`
    : '--';

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>{currentLabel}</Text>
          <Text style={styles.valueCurrent}>{currentValue} {unit}</Text>
        </View>

        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.changeText}>{changeText}</Text>
        </View>

        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>{targetLabel}</Text>
          <Text style={styles.valueTarget}>{targetValue} {unit}</Text>
        </View>
      </View>

      {/* Chart with touch interaction */}
      <GestureDetector gesture={tapGesture}>
        <View>
          <ChartTooltip
            visible={tooltipData.visible}
            x={tooltipData.x}
            y={tooltipData.y}
            value={tooltipData.value}
            label={tooltipData.label}
            formatValue={(val) => `${typeof val === 'number' ? val.toFixed(1) : val} ${unit}`}
          />
          <Svg width={width} height={height}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction, index) => {
          const y = padding + chartHeight * (1 - fraction);
          const value = minValue + valueRange * fraction;

          return (
            <G key={index}>
              <Line
                x1={padding}
                y1={y}
                x2={padding + chartWidth}
                y2={y}
                stroke={ResponsiveTheme.colors.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <SvgText
                x={padding - 10}
                y={y}
                fontSize={rf(10)}
                fill={ResponsiveTheme.colors.textMuted}
                textAnchor="end"
                alignmentBaseline="middle"
              >
                {value.toFixed(0)}
              </SvgText>
            </G>
          );
        })}

        {/* X-axis */}
        <Line
          x1={padding}
          y1={padding + chartHeight}
          x2={padding + chartWidth}
          y2={padding + chartHeight}
          stroke={ResponsiveTheme.colors.border}
          strokeWidth="2"
        />

        {/* Progress line */}
        <Path
          d={linePath}
          fill="transparent"
          stroke={ResponsiveTheme.colors.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Start point */}
        <Circle
          cx={padding}
          cy={valueToY(currentValue)}
          r="6"
          fill={ResponsiveTheme.colors.secondary}
          stroke={ResponsiveTheme.colors.white}
          strokeWidth="2"
        />

        {/* End point */}
        <Circle
          cx={padding + chartWidth}
          cy={valueToY(targetValue)}
          r="6"
          fill={ResponsiveTheme.colors.success}
          stroke={ResponsiveTheme.colors.white}
          strokeWidth="2"
        />

        {/* Milestone markers */}
        {showProgress && milestones.map((milestone, index) => {
          const x = padding + (chartWidth / (milestones.length - 1)) * index;
          const y = valueToY(milestone.value);

          return (
            <G key={index}>
              <Circle
                cx={x}
                cy={y}
                r="4"
                fill={ResponsiveTheme.colors.primary}
                opacity="0.5"
              />
              <SvgText
                x={x}
                y={padding + chartHeight + 15}
                fontSize={rf(9)}
                fill={ResponsiveTheme.colors.textMuted}
                textAnchor="middle"
              >
                {milestone.label}
              </SvgText>
            </G>
          );
        })}
          </Svg>
        </View>
      </GestureDetector>

      {/* Timeline info */}
      {showProgress && (
        <View style={styles.timeline}>
          <Text style={styles.timelineText}>
            📅 {progressWeeks}-week progression plan
          </Text>
          <Text style={styles.timelineSubtext}>
            {(Math.abs(currentValue - targetValue) / progressWeeks).toFixed(2)} {unit}/week
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  valueBox: {
    flex: 1,
    alignItems: 'center',
  },

  valueLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  valueCurrent: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },

  valueTarget: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.success,
  },

  arrow: {
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  arrowText: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.primary,
  },

  changeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  timeline: {
    alignItems: 'center',
    marginTop: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.sm,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  timelineText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  timelineSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
});
