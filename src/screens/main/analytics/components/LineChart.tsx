import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import {
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
import {
  surface,
  border as borderTokens,
  chart as chartColors,
  colors,
  typography,
  spacing,
} from "../../../../theme/aurora-tokens";
import { rf, rw, rh } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
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
  showHeader?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  weightLossGoal?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  color,
  unit = "",
  showValues = true,
  showHeader = true,
  emptyTitle = "No data recorded",
  emptySubtitle = "Start tracking to see progress",
  weightLossGoal = false,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const animationProgress = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const handlePointSelect = (index: number | null) => {
    if (index !== null && index !== selectedPoint) {
      haptics.light();
    }
    setSelectedPoint(index);
  };

  const CHART_WIDTH = containerWidth > 0 ? containerWidth : rw(300);
  const CHART_HEIGHT = rh(180);
  const PADDING_LEFT = rw(45);
  const PADDING_RIGHT = rw(15);
  const PADDING_TOP = rh(25);
  const PADDING_BOTTOM = rh(35);

  const chartAreaWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartAreaHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const hasData = data && data.length > 0;
  const dataSignature = useMemo(
    () => data.map(({ label, value }) => `${label}:${value}`).join("|"),
    [data],
  );
  const selectedDataPoint =
    selectedPoint !== null ? data[selectedPoint] : undefined;

  const { chartMax, chartMin, chartRange, getX, getY, smoothPath, areaPath } = useMemo(() => {
    const bounds = calculateChartBounds(hasData ? data : []);
    const _getX = (index: number) => {
      const divisor = hasData && data.length > 1 ? data.length - 1 : 1;
      return PADDING_LEFT + (index / divisor) * chartAreaWidth;
    };
    const _getY = (value: number) => {
      return PADDING_TOP + chartAreaHeight - ((value - bounds.chartMin) / bounds.chartRange) * chartAreaHeight;
    };
    const _smoothPath = generateSmoothPath(
      hasData ? data : [], _getX, _getY, PADDING_LEFT, PADDING_TOP, chartAreaHeight,
    );
    const _areaPath = generateAreaPath(
      hasData ? data : [], _smoothPath, _getX, PADDING_LEFT, PADDING_TOP, chartAreaWidth, chartAreaHeight,
    );
    return { ...bounds, getX: _getX, getY: _getY, smoothPath: _smoothPath, areaPath: _areaPath };
  }, [data, PADDING_LEFT, PADDING_TOP, chartAreaWidth, chartAreaHeight, hasData]);

  useEffect(() => {
    if (hasData) {
      animationProgress.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
      glowIntensity.value = withDelay(800, withSpring(1, { damping: 12 }));
    }
  }, [data, hasData]);

  useEffect(() => {
    setSelectedPoint(null);
  }, [dataSignature]);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(animationProgress.value, [0, 1], [1000, 0]),
  }));

  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.5, 1], [0, 0, 0.3]),
  }));

  const yLabels = [chartMax, (chartMax + chartMin) / 2, chartMin];

  if (!hasData) {
    return (
      <View style={styles.emptyChart} onLayout={handleLayout}>
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name="analytics-outline"
            size={rf(32)}
            color={surface[2]}
          />
        </View>
        <Text style={styles.emptyTitle} numberOfLines={2}>{emptyTitle}</Text>
        <Text style={styles.emptySubtitle} numberOfLines={2}>{emptySubtitle}</Text>
      </View>
    );
  }

  const { trend, trendPercent, isPositiveTrend } = calculateTrend(data, weightLossGoal);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Stats Header */}
      {showHeader && (
        <View style={styles.statsHeader}>
          <View style={styles.currentValueWrap}>
            <Text style={styles.currentLabel}>Current</Text>
            <Text
              style={[styles.currentValue, { color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {data[data.length - 1].value.toFixed(1)}
              {unit}
            </Text>
          </View>
          <View style={styles.trendWrap}>
            <View
              style={[
                styles.trendBadge,
                {
                  backgroundColor: isPositiveTrend
                    ? surface[2]
                    : surface[2],
                },
              ]}
            >
              <Ionicons
                name={isPositiveTrend ? "trending-up" : "trending-down"}
                size={rf(12)}
                color={isPositiveTrend ? chartColors[4] : chartColors[6]}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: isPositiveTrend ? chartColors[4] : chartColors[6] },
                ]}
                numberOfLines={1}
              >
                {Math.abs(parseFloat(trendPercent))}%
              </Text>
            </View>
            <Text style={styles.trendPeriod} numberOfLines={1}>vs start</Text>
          </View>
        </View>
      )}

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
          onPointPress={(idx) => handlePointSelect(idx === -1 ? null : idx)}
        />

        <XAxisLabels
          data={data}
          getX={getX}
          chartHeight={CHART_HEIGHT}
          color={color}
        />

        {selectedPoint !== null && selectedDataPoint && (
          <SelectedPointTooltip
            selectedPoint={selectedPoint}
            data={data}
            getX={getX}
            getY={getY}
            unit={unit}
          />
        )}
      </Svg>

      {/* Insight strip */}
      <View style={styles.insightStrip}>
        <View style={[styles.insightDot, { backgroundColor: color }]} />
        <Text style={styles.insightText} numberOfLines={2}>
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
  container: {
    width: "100%",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  currentValueWrap: {
    alignItems: "flex-start",
  },
  currentLabel: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(10),
    color: surface[2],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rh(2),
  },
  currentValue: {
    fontFamily: typography.variants.pageTitle.fontFamily,
    fontSize: rf(28),
    letterSpacing: -0.5,
  },
  trendWrap: {
    alignItems: "flex-end",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: rh(4),
    borderRadius: 12,
    gap: rw(4),
  },
  trendText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(12),
  },
  trendPeriod: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(10),
    color: surface[2],
    marginTop: rh(4),
  },
  insightStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  insightDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  insightText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(12),
    color: colors.text.secondary,
  },
  emptyChart: {
    minHeight: rh(160),
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyIconWrap: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    backgroundColor: surface[1],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(15),
    color: colors.text.primary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(12),
    color: colors.text.secondary,
    textAlign: "center",
  },
});
