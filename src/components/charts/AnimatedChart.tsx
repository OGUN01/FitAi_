import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Svg, { Line, Circle, Path, G, Text as SvgText } from "react-native-svg";
import { rf, rp, rw, rh } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { ChartTooltip } from "../ui/ChartTooltip";
import { hapticSelection } from "../../utils/haptics";

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
  currentLabel = "Current",
  targetLabel = "Target",
  unit = "kg",
  showProgress = true,
  progressWeeks = 12,
  width: rawWidth = 300,
  height: rawHeight = 200,
  style,
}) => {
  // Sanitize and round all numeric props to avoid NaN and precision errors on Android
  const safeCurrentValue = Number.isFinite(rawCurrentValue)
    ? rawCurrentValue
    : 70;
  const safeTargetValue = Number.isFinite(rawTargetValue) ? rawTargetValue : 65;
  const currentValue = Math.round(safeCurrentValue * 10) / 10; // Keep 1 decimal
  const targetValue = Math.round(safeTargetValue * 10) / 10;
  const width = Math.round(Number.isFinite(rawWidth) ? rawWidth : 300);
  const height = Math.round(Number.isFinite(rawHeight) ? rawHeight : 200);

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
    label: "",
  });

  useEffect(() => {
    progress.value = withSpring(1, {
      damping: 20,
      stiffness: 90,
    });
  }, [currentValue, targetValue]);

  // Calculate chart dimensions with better padding for labels
  const paddingLeft = 50; // More space for Y-axis labels
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35; // More space for X-axis labels
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determine min and max for Y-axis with nice rounded values
  const rawMin = Math.min(currentValue, targetValue);
  const rawMax = Math.max(currentValue, targetValue);
  const range = rawMax - rawMin;

  // Round to nice values for cleaner axis labels
  const step = range > 20 ? 10 : range > 10 ? 5 : 2;
  const minValue = Math.floor(rawMin / step) * step - step;
  const maxValue = Math.ceil(rawMax / step) * step + step;
  const valueRange = maxValue - minValue;

  // Convert value to Y coordinate - round to prevent precision errors
  const valueToY = (value: number): number => {
    const normalized = (value - minValue) / valueRange;
    return Math.round(paddingTop + chartHeight - normalized * chartHeight);
  };

  // Generate milestone points - limit to 5 points max for cleaner labels
  const milestones: DataPoint[] = [];
  const valueStep = (targetValue - currentValue) / progressWeeks;

  // Calculate optimal step to get ~4-5 milestones
  const maxMilestones = 5;
  const weekStep = Math.ceil(progressWeeks / (maxMilestones - 1));

  for (let week = 0; week <= progressWeeks; week += weekStep) {
    const value = currentValue + valueStep * week;
    milestones.push({
      label: week === 0 ? "0" : `${week}w`,
      value,
    });
  }

  // Ensure final target is included
  const lastMilestone = milestones[milestones.length - 1];
  if (
    lastMilestone.label !== `${progressWeeks}w` &&
    lastMilestone.label !== "0"
  ) {
    milestones.push({
      label: `${progressWeeks}w`,
      value: targetValue,
    });
  }

  // Create path for the line - round all values
  const createLinePath = (): string => {
    const startX = Math.round(paddingLeft);
    const endX = Math.round(paddingLeft + chartWidth);
    const startY = valueToY(currentValue);
    const endY = valueToY(targetValue);

    // Create a smooth curve with rounded values
    const controlX1 = Math.round(startX + chartWidth * 0.33);
    const controlY1 = startY;
    const controlX2 = Math.round(startX + chartWidth * 0.66);
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
        touchX >= paddingLeft &&
        touchX <= paddingLeft + chartWidth &&
        touchY >= paddingTop &&
        touchY <= paddingTop + chartHeight
      ) {
        // Find nearest milestone
        let nearestMilestone = milestones[0];
        let minDistance = Infinity;

        milestones.forEach((milestone, index) => {
          const milestoneX =
            paddingLeft + (chartWidth / (milestones.length - 1)) * index;
          const milestoneY = valueToY(milestone.value);
          const distance = Math.sqrt(
            Math.pow(touchX - milestoneX, 2) + Math.pow(touchY - milestoneY, 2),
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestMilestone = milestone;
          }
        });

        // Show tooltip if touch is close enough (within 30px)
        if (minDistance < 30) {
          const milestoneIndex = milestones.indexOf(nearestMilestone);
          const milestoneX =
            paddingLeft +
            (chartWidth / (milestones.length - 1)) * milestoneIndex;
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
      [paddingLeft, paddingLeft + chartWidth],
      Extrapolate.CLAMP,
    );

    const translateY = interpolate(
      progress.value,
      [0, 1],
      [startY, endY],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  // Calculate percentage change
  const percentageChange = ((targetValue - currentValue) / currentValue) * 100;
  const changeDirection = percentageChange > 0 ? "increase" : "decrease";
  const changeText = `${Math.abs(percentageChange).toFixed(1)}% ${changeDirection}`;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>{currentLabel}</Text>
          <Text style={styles.valueCurrent}>
            {currentValue} {unit}
          </Text>
        </View>

        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.changeText}>{changeText}</Text>
        </View>

        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>{targetLabel}</Text>
          <Text style={styles.valueTarget}>
            {targetValue} {unit}
          </Text>
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
            formatValue={(val) =>
              `${typeof val === "number" ? val.toFixed(1) : val} ${unit}`
            }
          />
          <Svg width={width} height={height}>
            {/* Y-axis grid lines with nice round values */}
            {(() => {
              // Generate Y-axis values at nice intervals
              const yAxisValues: number[] = [];
              for (let val = minValue; val <= maxValue; val += step) {
                yAxisValues.push(val);
              }
              // Limit to max 5 lines
              const skipFactor = Math.ceil(yAxisValues.length / 5);
              const filteredValues = yAxisValues.filter(
                (_, i) => i % skipFactor === 0,
              );

              return filteredValues.map((value, index) => {
                const y = valueToY(value);

                return (
                  <G key={index}>
                    <Line
                      x1={paddingLeft}
                      y1={y}
                      x2={paddingLeft + chartWidth}
                      y2={y}
                      stroke={ResponsiveTheme.colors.border}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity={0.4}
                    />
                    <SvgText
                      x={paddingLeft - 10}
                      y={y + 1}
                      fontSize={rf(11)}
                      fill={ResponsiveTheme.colors.textMuted}
                      textAnchor="end"
                      alignmentBaseline="middle"
                    >
                      {value}
                    </SvgText>
                  </G>
                );
              });
            })()}

            {/* X-axis */}
            <Line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={paddingLeft + chartWidth}
              y2={paddingTop + chartHeight}
              stroke={ResponsiveTheme.colors.border}
              strokeWidth="1"
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
              cx={paddingLeft}
              cy={valueToY(currentValue)}
              r="6"
              fill={ResponsiveTheme.colors.secondary}
              stroke={ResponsiveTheme.colors.white}
              strokeWidth="2"
            />

            {/* End point */}
            <Circle
              cx={paddingLeft + chartWidth}
              cy={valueToY(targetValue)}
              r="6"
              fill={ResponsiveTheme.colors.success}
              stroke={ResponsiveTheme.colors.white}
              strokeWidth="2"
            />

            {/* Milestone markers */}
            {showProgress &&
              milestones.map((milestone, index) => {
                const x = Math.round(
                  paddingLeft + (chartWidth / (milestones.length - 1)) * index,
                );
                const y = valueToY(milestone.value);

                return (
                  <G key={index}>
                    <Circle
                      cx={x}
                      cy={y}
                      r={4}
                      fill={ResponsiveTheme.colors.primary}
                      opacity={0.5}
                    />
                    <SvgText
                      x={x}
                      y={Math.round(paddingTop + chartHeight + 18)}
                      fontSize={rf(10)}
                      fill={ResponsiveTheme.colors.textMuted}
                      textAnchor="middle"
                      fontWeight="500"
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
            {(Math.abs(currentValue - targetValue) / progressWeeks).toFixed(2)}{" "}
            {unit}/week
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  valueBox: {
    flex: 1,
    alignItems: "center",
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
    alignItems: "center",
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
    alignItems: "center",
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
