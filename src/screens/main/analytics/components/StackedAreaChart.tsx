import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { runOnJS } from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Path,
  Circle,
  G,
  Text as SvgText,
} from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import {
  chart as chartColors,
  surface,
  border,
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../../theme/aurora-tokens";
import { rf, rh, rw } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import {
  generateSmoothPath,
  generateAreaPath,
} from "./chartUtils";

export interface ChartData {
  label: string;
  value: number;
}

interface StackedAreaChartProps {
  consumedData: ChartData[];
  burnedData: ChartData[];
}

const CHART_HEIGHT = 180;
const LABEL_HEIGHT = 28;
const AREA_HEIGHT = CHART_HEIGHT - LABEL_HEIGHT;
const PADDING_TOP = rh(8);
const PADDING_LEFT = rw(4);
const PADDING_RIGHT = rw(4);

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SERIES = [
  { key: "consumed", color: chartColors[4], areaId: "stackConsumedArea" },
  { key: "burned", color: chartColors[5], areaId: "stackBurnedArea" },
] as const;

export const StackedAreaChart: React.FC<StackedAreaChartProps> = React.memo(({
  consumedData,
  burnedData,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const animationProgress = useSharedValue(0);

  const maxValue = useMemo(() => {
    const values: number[] = [1];
    for (const d of consumedData) values.push(d.value);
    for (const d of burnedData) values.push(d.value);
    return Math.max(...values);
  }, [consumedData, burnedData]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
  };

  useEffect(() => {
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    setSelectedIndex(null);
  }, [consumedData, burnedData]);

  const chartWidth = containerWidth - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = AREA_HEIGHT - PADDING_TOP;

  const geometry = useMemo(() => {
    const divisor = consumedData.length > 1 ? consumedData.length - 1 : 1;
    const getX = (index: number) =>
      PADDING_LEFT + (index / divisor) * chartWidth;
    const getY = (value: number) =>
      PADDING_TOP + plotHeight - (value / maxValue) * plotHeight;
    const build = (seriesData: ChartData[]) => {
      const line = generateSmoothPath(
        seriesData,
        getX,
        getY,
        PADDING_LEFT,
        PADDING_TOP,
        plotHeight
      );
      const area = generateAreaPath(
        seriesData,
        line,
        getX,
        PADDING_LEFT,
        PADDING_TOP,
        chartWidth,
        plotHeight
      );
      return { line, area };
    };
    return {
      getX,
      getY,
      consumed: build(consumedData),
      burned: build(burnedData),
    };
  }, [consumedData, burnedData, chartWidth, plotHeight, maxValue]);

  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.4, 1], [0, 0, 1]),
  }));

  const animatedLineProps = useAnimatedProps(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.3, 1], [0, 0.4, 1]),
  }));

  const handleSelect = (index: number) => {
    if (index < 0 || index >= consumedData.length) return;
    if (selectedIndex !== index) {
      haptics.light();
      setSelectedIndex(index);
    }
  };

  const handleTap = (index: number) => {
    haptics.light();
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  const clearSelection = () => setSelectedIndex(null);

  const tapGesture = Gesture.Tap().onEnd((e) => {
    if (chartWidth <= 0 || consumedData.length === 0) return;
    const divisor = consumedData.length > 1 ? consumedData.length - 1 : 1;
    const idx = Math.round(((e.x - PADDING_LEFT) / chartWidth) * divisor);
    runOnJS(handleTap)(Math.max(0, Math.min(idx, consumedData.length - 1)));
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart((e) => {
      if (chartWidth <= 0 || consumedData.length === 0) return;
      const divisor = consumedData.length > 1 ? consumedData.length - 1 : 1;
      const idx = Math.round(((e.x - PADDING_LEFT) / chartWidth) * divisor);
      runOnJS(handleSelect)(Math.max(0, Math.min(idx, consumedData.length - 1)));
    })
    .onEnd(() => {
      runOnJS(clearSelection)();
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {containerWidth > 0 && consumedData.length > 0 && (
        <View style={styles.chartWrap}>
          <GestureDetector gesture={composedGesture}>
            <Svg width={containerWidth} height={CHART_HEIGHT}>
              <Defs>
                <SvgLinearGradient id="stackConsumedArea" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={chartColors[4]} stopOpacity="0.35" />
                  <Stop offset="100%" stopColor={chartColors[4]} stopOpacity="0.02" />
                </SvgLinearGradient>
                <SvgLinearGradient id="stackBurnedArea" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={chartColors[5]} stopOpacity="0.3" />
                  <Stop offset="100%" stopColor={chartColors[5]} stopOpacity="0.02" />
                </SvgLinearGradient>
              </Defs>

              {/* Baseline */}
              <Line
                x1={PADDING_LEFT}
                y1={AREA_HEIGHT}
                x2={containerWidth - PADDING_RIGHT}
                y2={AREA_HEIGHT}
                stroke={border.subtle}
                strokeWidth={1}
              />

              {/* Burned series (behind) */}
              <AnimatedPath
                d={geometry.burned.area}
                fill="url(#stackBurnedArea)"
                animatedProps={animatedAreaProps}
              />
              <AnimatedPath
                d={geometry.burned.line}
                stroke={chartColors[5]}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                animatedProps={animatedLineProps}
              />

              {/* Consumed series (front) */}
              <AnimatedPath
                d={geometry.consumed.area}
                fill="url(#stackConsumedArea)"
                animatedProps={animatedAreaProps}
              />
              <AnimatedPath
                d={geometry.consumed.line}
                stroke={chartColors[4]}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                animatedProps={animatedLineProps}
              />

              {/* Selection indicator */}
              {selectedIndex !== null && consumedData[selectedIndex] && (
                <G>
                  <Line
                    x1={geometry.getX(selectedIndex)}
                    y1={PADDING_TOP}
                    x2={geometry.getX(selectedIndex)}
                    y2={AREA_HEIGHT}
                    stroke={border.strong}
                    strokeWidth={1}
                    strokeDasharray="3,4"
                  />
                  <Circle
                    cx={geometry.getX(selectedIndex)}
                    cy={geometry.getY(consumedData[selectedIndex].value)}
                    r={rw(5)}
                    fill={chartColors[4]}
                    stroke={surface[1]}
                    strokeWidth={2}
                  />
                  {burnedData[selectedIndex] && (
                    <Circle
                      cx={geometry.getX(selectedIndex)}
                      cy={geometry.getY(burnedData[selectedIndex].value)}
                      r={rw(5)}
                      fill={chartColors[5]}
                      stroke={surface[1]}
                      strokeWidth={2}
                    />
                  )}
                </G>
              )}

              {/* X labels */}
              {consumedData.map((item, index) => {
                const showLabel =
                  consumedData.length <= 5 ||
                  index === 0 ||
                  index === consumedData.length - 1 ||
                  index % Math.ceil(consumedData.length / 4) === 0;
                if (!showLabel) return null;
                return (
                  <SvgText
                    key={`x-${index}`}
                    x={geometry.getX(index)}
                    y={CHART_HEIGHT - 6}
                    fill={
                      selectedIndex === index
                        ? chartColors[4]
                        : colors.text.muted
                    }
                    fontSize={rf(10)}
                    fontFamily={typography.variants.caption.fontFamily}
                    textAnchor="middle"
                  >
                    {item.label}
                  </SvgText>
                );
              })}
            </Svg>
          </GestureDetector>

          {/* Legend */}
          <View style={styles.legendRow}>
            {SERIES.map((s) => (
              <View key={s.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendText}>
                  {s.key === "consumed" ? "Consumed" : "Burned"}
                </Text>
              </View>
            ))}
          </View>

          {/* Selected detail */}
          {selectedIndex !== null && consumedData[selectedIndex] && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>
                {consumedData[selectedIndex].label}:{" "}
                <Text style={[styles.detailValue, { color: chartColors[4] }]}>
                  {consumedData[selectedIndex].value} in
                </Text>
                {" / "}
                <Text style={[styles.detailValue, { color: chartColors[5] }]}>
                  {burnedData[selectedIndex]?.value || 0} out
                </Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  chartWrap: {
    width: "100%",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: borderRadius.sm,
  },
  legendText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(11),
    color: colors.text.secondary,
  },
  detailRow: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  detailText: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: rf(13),
    color: colors.text.secondary,
  },
  detailValue: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(13),
  },
});
