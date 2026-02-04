import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  G,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rw, rh } from "../../../../utils/responsive";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ChartData {
  label: string;
  value: number;
}

interface LineChartProps {
  data: ChartData[];
  color: string;
  unit?: string;
  showValues?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  color,
  unit = "",
  showValues = true,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const animationProgress = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  // Chart dimensions
  const CHART_WIDTH = rw(280);
  const CHART_HEIGHT = rh(180);
  const PADDING_LEFT = rw(45);
  const PADDING_RIGHT = rw(15);
  const PADDING_TOP = rh(25);
  const PADDING_BOTTOM = rh(35);

  const chartAreaWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartAreaHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Check if we have valid data
  const hasData = data && data.length > 0;

  // Calculate data bounds with nice padding (use safe defaults when no data)
  const values = hasData ? data.map((d) => d.value) : [0];
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const paddingAmount = range * 0.2;
  const chartMax = maxVal + paddingAmount;
  const chartMin = Math.max(0, minVal - paddingAmount);
  const chartRange = chartMax - chartMin || 1;

  // Calculate coordinates
  const getX = (index: number) => {
    const divisor = hasData && data.length > 1 ? data.length - 1 : 1;
    return PADDING_LEFT + (index / divisor) * chartAreaWidth;
  };

  const getY = (value: number) => {
    return (
      PADDING_TOP +
      chartAreaHeight -
      ((value - chartMin) / chartRange) * chartAreaHeight
    );
  };

  // Generate smooth bezier curve path
  const generateSmoothPath = () => {
    if (!hasData) return `M ${PADDING_LEFT} ${PADDING_TOP + chartAreaHeight}`;

    if (data.length < 2) {
      const x = getX(0);
      const y = getY(data[0].value);
      return `M ${x} ${y}`;
    }

    let path = `M ${getX(0)} ${getY(data[0].value)}`;

    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(data[i].value);
      const x1 = getX(i + 1);
      const y1 = getY(data[i + 1].value);

      // Control point distance
      const cpDist = (x1 - x0) * 0.4;

      // Smooth bezier curve
      path += ` C ${x0 + cpDist} ${y0}, ${x1 - cpDist} ${y1}, ${x1} ${y1}`;
    }

    return path;
  };

  // Generate gradient fill area path
  const generateAreaPath = () => {
    if (!hasData)
      return `M ${PADDING_LEFT} ${PADDING_TOP + chartAreaHeight} L ${PADDING_LEFT + chartAreaWidth} ${PADDING_TOP + chartAreaHeight} Z`;

    const linePath = generateSmoothPath();
    const lastX = getX(data.length - 1);
    const firstX = getX(0);
    const bottomY = PADDING_TOP + chartAreaHeight;

    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Animation - MUST be called unconditionally (before any early returns)
  useEffect(() => {
    if (hasData) {
      animationProgress.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
      glowIntensity.value = withDelay(800, withSpring(1, { damping: 12 }));
    }
  }, [data, hasData]);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(animationProgress.value, [0, 1], [1000, 0]),
  }));

  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.5, 1], [0, 0, 0.3]),
  }));

  // Y-axis labels
  const yLabels = [chartMax, (chartMax + chartMin) / 2, chartMin];

  // ✅ EARLY RETURN - Now AFTER all hooks are called
  if (!hasData) {
    return (
      <View style={styles.emptyChart}>
        <View style={styles.emptyChartIconContainer}>
          <LinearGradient
            colors={["rgba(156, 39, 176, 0.2)", "rgba(156, 39, 176, 0.05)"]}
            style={styles.emptyChartIconBg}
          />
          <Ionicons
            name="analytics-outline"
            size={rf(36)}
            color="rgba(156, 39, 176, 0.6)"
          />
        </View>
        <Text style={styles.emptyChartText}>No weight data recorded</Text>
        <Text style={styles.emptyChartSubtext}>
          Log your weight to see your progress journey
        </Text>
        <View style={styles.emptyChartHint}>
          <Ionicons
            name="add-circle-outline"
            size={rf(14)}
            color={ResponsiveTheme.colors.primary}
          />
          <Text style={styles.emptyChartHintText}>
            Tap Profile → Log Weight
          </Text>
        </View>
      </View>
    );
  }

  // Trend calculation
  const trend =
    data.length >= 2 ? data[data.length - 1].value - data[0].value : 0;
  const trendPercent =
    data[0].value > 0 ? ((trend / data[0].value) * 100).toFixed(1) : "0";
  const isPositiveTrend = trend >= 0;

  return (
    <View style={styles.premiumChartContainer}>
      {/* Stats Header */}
      <View style={styles.chartStatsHeader}>
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValueLabel}>Current</Text>
          <Text style={[styles.currentValue, { color }]}>
            {data[data.length - 1].value.toFixed(1)}
            {unit}
          </Text>
        </View>
        <View style={styles.trendContainer}>
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: isPositiveTrend
                  ? "rgba(76, 175, 80, 0.15)"
                  : "rgba(244, 67, 54, 0.15)",
              },
            ]}
          >
            <Ionicons
              name={isPositiveTrend ? "trending-up" : "trending-down"}
              size={rf(12)}
              color={isPositiveTrend ? "#4CAF50" : "#F44336"}
            />
            <Text
              style={[
                styles.trendText,
                { color: isPositiveTrend ? "#4CAF50" : "#F44336" },
              ]}
            >
              {Math.abs(parseFloat(trendPercent))}%
            </Text>
          </View>
          <Text style={styles.trendPeriod}>vs start</Text>
        </View>
      </View>

      {/* SVG Chart */}
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          {/* Gradient for area fill */}
          <SvgLinearGradient
            id="areaGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="50%" stopColor={color} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </SvgLinearGradient>

          {/* Gradient for line stroke */}
          <SvgLinearGradient
            id="lineGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <Stop offset="50%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </SvgLinearGradient>

          {/* Glow filter effect */}
          <SvgLinearGradient
            id="glowGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </SvgLinearGradient>
        </Defs>

        {/* Subtle grid lines */}
        {yLabels.map((_, index) => {
          const y =
            PADDING_TOP + (index / (yLabels.length - 1)) * chartAreaHeight;
          return (
            <Line
              key={`grid-${index}`}
              x1={PADDING_LEFT}
              y1={y}
              x2={PADDING_LEFT + chartAreaWidth}
              y2={y}
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={1}
              strokeDasharray={index === yLabels.length - 1 ? "0" : "4,6"}
            />
          );
        })}

        {/* Y-axis labels */}
        {yLabels.map((value, index) => {
          const y =
            PADDING_TOP + (index / (yLabels.length - 1)) * chartAreaHeight;
          return (
            <SvgText
              key={`y-label-${index}`}
              x={PADDING_LEFT - 8}
              y={y + 4}
              fill={ResponsiveTheme.colors.textMuted}
              fontSize={rf(9)}
              textAnchor="end"
              fontWeight="500"
            >
              {value.toFixed(1)}
            </SvgText>
          );
        })}

        {/* Area fill with animation */}
        <AnimatedPath
          d={generateAreaPath()}
          fill="url(#areaGradient)"
          animatedProps={animatedAreaProps}
        />

        {/* Main line with animation */}
        <AnimatedPath
          d={generateSmoothPath()}
          stroke="url(#lineGradient)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={1000}
          animatedProps={animatedLineProps}
        />

        {/* Data points */}
        {data.map((item, index) => {
          const x = getX(index);
          const y = getY(item.value);
          const isLast = index === data.length - 1;
          const isSelected = selectedPoint === index;

          return (
            <G key={`point-${index}`}>
              {/* Outer glow for last point */}
              {isLast && (
                <>
                  <Circle
                    cx={x}
                    cy={y}
                    r={rw(16)}
                    fill={color}
                    opacity={0.15}
                  />
                  <Circle
                    cx={x}
                    cy={y}
                    r={rw(10)}
                    fill={color}
                    opacity={0.25}
                  />
                </>
              )}

              {/* Point circle */}
              <Circle
                cx={x}
                cy={y}
                r={isLast ? rw(6) : isSelected ? rw(5) : rw(4)}
                fill={isLast ? color : "rgba(255,255,255,0.9)"}
                stroke={color}
                strokeWidth={isLast ? 3 : 2}
              />

              {/* Touchable area */}
              <Circle
                cx={x}
                cy={y}
                r={rw(15)}
                fill="transparent"
                onPress={() =>
                  setSelectedPoint(selectedPoint === index ? null : index)
                }
              />
            </G>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          const x = getX(index);
          const isFirst = index === 0;
          const isLast = index === data.length - 1;
          const showLabel =
            isFirst ||
            isLast ||
            data.length <= 5 ||
            index % Math.ceil(data.length / 4) === 0;

          if (!showLabel) return null;

          return (
            <SvgText
              key={`x-label-${index}`}
              x={x}
              y={CHART_HEIGHT - 8}
              fill={isLast ? color : ResponsiveTheme.colors.textMuted}
              fontSize={rf(10)}
              textAnchor="middle"
              fontWeight={isLast ? "700" : "500"}
            >
              {item.label}
            </SvgText>
          );
        })}

        {/* Selected point tooltip */}
        {selectedPoint !== null && (
          <G>
            <Rect
              x={getX(selectedPoint) - rw(30)}
              y={getY(data[selectedPoint].value) - rh(35)}
              width={rw(60)}
              height={rh(26)}
              rx={rw(8)}
              fill="rgba(0,0,0,0.85)"
            />
            <SvgText
              x={getX(selectedPoint)}
              y={getY(data[selectedPoint].value) - rh(18)}
              fill="#fff"
              fontSize={rf(11)}
              textAnchor="middle"
              fontWeight="700"
            >
              {data[selectedPoint].value.toFixed(1)}
              {unit}
            </SvgText>
          </G>
        )}
      </Svg>

      {/* Bottom insight */}
      <View style={styles.chartInsight}>
        <Ionicons name="sparkles" size={rf(12)} color={color} />
        <Text style={styles.chartInsightText}>
          {trend > 0
            ? `Gained ${Math.abs(trend).toFixed(1)}${unit} over this period`
            : trend < 0
              ? `Lost ${Math.abs(trend).toFixed(1)}${unit} over this period`
              : "Weight stable over this period"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  premiumChartContainer: {
    alignItems: "center",
  },
  chartStatsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },
  currentValueContainer: {
    alignItems: "flex-start",
  },
  currentValueLabel: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  currentValue: {
    fontSize: rf(28),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  trendContainer: {
    alignItems: "flex-end",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: rw(12),
    gap: 4,
  },
  trendText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  trendPeriod: {
    fontSize: rf(9),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textMuted,
    marginTop: 4,
  },
  chartInsight: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: rw(20),
  },
  chartInsightText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  // Empty chart state
  emptyChart: {
    minHeight: rh(180),
    justifyContent: "center",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  emptyChartIconContainer: {
    width: rw(70),
    height: rw(70),
    borderRadius: rw(35),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
    overflow: "hidden",
  },
  emptyChartIconBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyChartText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
  emptyChartSubtext: {
    fontSize: rf(12),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },
  emptyChartHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderRadius: rw(16),
  },
  emptyChartHintText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
});
