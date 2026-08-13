import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { ChartCallout } from "../../../../components/charts/ChartCallout";
import {
  border,
  surface,
  chart,
  typography,
  colors,
  borderRadius,
} from "../../../../theme/aurora-tokens";
import { rf, rh, rw } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import { useReducedMotion } from "../../../../utils/accessibility/hooks";

export interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  color: string;
  /**
   * @deprecated Bars render with a flat token fill (de-gradient initiative);
   * kept in the contract so existing callers compile unchanged.
   */
  gradientColors: [string, string];
  maxValue?: number;
}

const CHART_HEIGHT = 160;
const LABEL_HEIGHT = 28;
const BAR_AREA_HEIGHT = CHART_HEIGHT - LABEL_HEIGHT;
const TOOLTIP_OFFSET = 52;
// Unlike LineChart's DataPoints (which thins to ~30 dots past 60 points),
// BarChart previously rendered one AnimatedBar per data point with no cap —
// a Quarter/Year calorie chart could mount up to 90-365 Reanimated shared
// values, each staggered by index*40ms (a fully-logged year didn't finish
// animating in until ~14.5s after mount). Cap and bucket-average dense
// series down to at most MAX_BARS bars.
const MAX_BARS = 45;
// Cap the animation stagger too — with MAX_BARS bars the last bar now starts
// by MAX_BAR_STAGGER_INDEX * 40ms regardless of how many bars are rendered.
const MAX_BAR_STAGGER_INDEX = 30;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const AnimatedBar: React.FC<{
  x: number;
  finalHeight: number;
  width: number;
  index: number;
  isSelected: boolean;
  color: string;
}> = React.memo(({ x, finalHeight, width, index, isSelected, color }) => {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    progress.value = reducedMotion
      ? 1
      : withDelay(
          Math.min(index, MAX_BAR_STAGGER_INDEX) * 40,
          withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
        );
  }, [index, progress, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    height: progress.value * finalHeight,
    y: BAR_AREA_HEIGHT - progress.value * finalHeight,
  }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={rw(borderRadius.md)}
      fill={color}
      opacity={isSelected ? 1 : 0.9}
      animatedProps={animatedProps}
    />
  );
});

export const BarChart: React.FC<BarChartProps> = React.memo(({
  data,
  color,
  maxValue,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Downsample dense (Quarter/Year, up to 90-365 point) series into at most
  // MAX_BARS bars by bucket-averaging consecutive points, mirroring
  // LineChart's DataPoints thinning. Bars that are already bucketed upstream
  // (e.g. AnalyticsScreen's month/quarter/year workout buckets, always <= 6
  // points) pass through unchanged.
  const chartData = useMemo(() => {
    if (data.length <= MAX_BARS) return data;
    const bucketSize = Math.ceil(data.length / MAX_BARS);
    const buckets: ChartData[] = [];
    for (let i = 0; i < data.length; i += bucketSize) {
      const chunk = data.slice(i, i + bucketSize);
      const avg = chunk.reduce((sum, d) => sum + d.value, 0) / chunk.length;
      buckets.push({ label: chunk[0].label, value: avg });
    }
    return buckets;
  }, [data]);

  const max = useMemo(() => {
    if (maxValue) return maxValue;
    const values: number[] = [1];
    for (const d of chartData) values.push(d.value);
    return Math.max(...values);
  }, [chartData, maxValue]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
  };

  useEffect(() => {
    setSelectedIndex(null);
  }, [chartData]);

  // Month/quarter/year periods feed 30-365 daily entries into a fixed-width
  // SVG — scale gap/width density down instead of clamping to a min width
  // that pushes the rightmost bars off the canvas.
  const dense = chartData.length > 14;
  const barGap = dense ? rw(2) : chartData.length > 7 ? rw(4) : rw(8);

  const barWidth = useMemo(() => {
    if (containerWidth <= 0 || chartData.length === 0) return 0;
    const totalGap = barGap * (chartData.length + 1);
    return Math.max((containerWidth - totalGap) / chartData.length, dense ? rw(2) : rw(8));
  }, [containerWidth, chartData.length, barGap, dense]);

  const barTopY = useMemo(() => {
    if (selectedIndex === null || !chartData[selectedIndex]) return 0;
    const barHeight = Math.max(
      (chartData[selectedIndex].value / max) * BAR_AREA_HEIGHT,
      rh(4)
    );
    return BAR_AREA_HEIGHT - barHeight;
  }, [selectedIndex, chartData, max]);

  const handleBarSelect = (index: number) => {
    if (index < 0 || index >= chartData.length) return;
    if (selectedIndex !== index) {
      haptics.light();
    }
    const x = barGap + index * (barWidth + barGap);
    setSelectedIndex(index);
    setTooltipPos({ x: x + barWidth / 2 - rw(30), y: 0 });
  };

  const handleBarPress = (index: number, cx: number) => {
    haptics.light();
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      const x = barGap + index * (barWidth + barGap);
      setSelectedIndex(index);
      setTooltipPos({ x: x + barWidth / 2 - rw(30), y: 0 });
    }
  };

  const clearSelection = () => setSelectedIndex(null);

  const tapGesture = Gesture.Tap().onEnd((e) => {
    if (barWidth <= 0 || chartData.length === 0) return;
    const idx = Math.floor((e.x - barGap / 2) / (barWidth + barGap));
    runOnJS(handleBarPress)(Math.max(0, Math.min(idx, chartData.length - 1)), e.x);
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart((e) => {
      if (barWidth <= 0 || chartData.length === 0) return;
      const idx = Math.floor((e.x - barGap / 2) / (barWidth + barGap));
      runOnJS(handleBarSelect)(Math.max(0, Math.min(idx, chartData.length - 1)));
    })
    .onEnd(() => {
      runOnJS(clearSelection)();
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const selectedData = selectedIndex !== null ? chartData[selectedIndex] : null;
  const tooltipX = Math.max(
    0,
    Math.min(tooltipPos.x, containerWidth - rw(60))
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {containerWidth > 0 && (
        <View style={styles.chartWrap}>
          <GestureDetector gesture={composedGesture}>
            <Svg width={containerWidth} height={CHART_HEIGHT}>
              <Line
                x1={0}
                y1={BAR_AREA_HEIGHT}
                x2={containerWidth}
                y2={BAR_AREA_HEIGHT}
                stroke={border.subtle}
                strokeWidth={1}
              />
              {/* Y-axis scale reference — without this, bars only convey their
                  value relative to each other (via tap-to-reveal tooltip), so
                  e.g. two bars of near-equal height read as "same value" even
                  when a caller passes an explicit maxValue far above both. */}
              <Line
                x1={0}
                y1={2}
                x2={containerWidth}
                y2={2}
                stroke={border.subtle}
                strokeWidth={1}
                strokeDasharray="2,4"
              />
              <SvgText
                x={containerWidth}
                y={12}
                fill={colors.text.muted}
                fontSize={rf(9)}
                fontFamily={typography.variants.caption.fontFamily}
                textAnchor="end"
              >
                {Math.round(max).toLocaleString()}
              </SvgText>

              {chartData.map((item, index) => {
                const barHeight = Math.max((item.value / max) * BAR_AREA_HEIGHT, rh(4));
                const x = barGap + index * (barWidth + barGap);
                const isSelected = selectedIndex === index;
                const showLabel =
                  chartData.length <= 5 ||
                  index === 0 ||
                  index === chartData.length - 1 ||
                  index % Math.ceil(chartData.length / 4) === 0;

                return (
                  <React.Fragment key={`bar-${index}`}>
                    <AnimatedBar
                      x={x}
                      finalHeight={barHeight}
                      width={barWidth}
                      index={index}
                      isSelected={isSelected}
                      color={color}
                    />
                    {showLabel && (
                      <SvgText
                        x={x + barWidth / 2}
                        y={CHART_HEIGHT - 6}
                        fill={isSelected ? color : colors.text.muted}
                        fontSize={rf(10)}
                        fontFamily={typography.variants.caption.fontFamily}
                        textAnchor="middle"
                      >
                        {item.label}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>
          </GestureDetector>

          {selectedData && (
            <ChartCallout
              visible={true}
              x={tooltipX}
              y={barTopY - rh(TOOLTIP_OFFSET)}
              value={selectedData.value}
              label={selectedData.label}
            />
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
    position: "relative",
    width: "100%",
  },
});
