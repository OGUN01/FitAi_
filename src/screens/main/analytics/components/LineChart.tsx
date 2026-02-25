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
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rw, rh } from "../../../../utils/responsive";
import {
  GridLines,
  YAxisLabels,
  AnimatedChartPaths,
  DataPoints,
  XAxisLabels,
  SelectedPointTooltip,
} from "./ChartSvgElements";
import {
  generateSmoothPath,
  generateAreaPath,
  calculateChartBounds,
  calculateTrend,
} from "./chartUtils";

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

  const hasData = data && data.length > 0;

  const { chartMax, chartMin, chartRange } = calculateChartBounds(
    hasData ? data : [],
  );

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

  const smoothPath = generateSmoothPath(
    hasData ? data : [],
    getX,
    getY,
    PADDING_LEFT,
    PADDING_TOP,
    chartAreaHeight,
  );

  const areaPath = generateAreaPath(
    hasData ? data : [],
    smoothPath,
    getX,
    PADDING_LEFT,
    PADDING_TOP,
    chartAreaWidth,
    chartAreaHeight,
  );

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

  const yLabels = [chartMax, (chartMax + chartMin) / 2, chartMin];

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

  const { trend, trendPercent, isPositiveTrend } = calculateTrend(data);

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

        <GridLines
          yLabels={yLabels}
          paddingLeft={PADDING_LEFT}
          paddingTop={PADDING_TOP}
          chartAreaWidth={chartAreaWidth}
          chartAreaHeight={chartAreaHeight}
        />

        <YAxisLabels
          yLabels={yLabels}
          paddingLeft={PADDING_LEFT}
          paddingTop={PADDING_TOP}
          chartAreaHeight={chartAreaHeight}
        />

        <AnimatedChartPaths
          smoothPath={smoothPath}
          areaPath={areaPath}
          animatedLineProps={animatedLineProps}
          animatedAreaProps={animatedAreaProps}
        />

        <DataPoints
          data={data}
          getX={getX}
          getY={getY}
          color={color}
          selectedPoint={selectedPoint}
          onPointPress={(idx) => setSelectedPoint(idx === -1 ? null : idx)}
        />

        <XAxisLabels
          data={data}
          getX={getX}
          chartHeight={CHART_HEIGHT}
          color={color}
        />

        {selectedPoint !== null && (
          <SelectedPointTooltip
            selectedPoint={selectedPoint}
            data={data}
            getX={getX}
            getY={getY}
            unit={unit}
          />
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
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderRadius: rw(16),
  },
  emptyChartHintText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
});
