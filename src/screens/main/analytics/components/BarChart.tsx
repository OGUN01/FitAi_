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
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { ChartTooltip } from "../../../../components/ui/ChartTooltip";
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

export interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  color: string;
  gradientColors: [string, string];
  maxValue?: number;
}

const CHART_HEIGHT = 160;
const LABEL_HEIGHT = 28;
const BAR_AREA_HEIGHT = CHART_HEIGHT - LABEL_HEIGHT;
const TOOLTIP_OFFSET = 52;

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

  useEffect(() => {
    progress.value = withDelay(
      index * 40,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    height: progress.value * finalHeight,
    y: BAR_AREA_HEIGHT - progress.value * finalHeight,
  }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={rw(borderRadius.md)}
      fill={isSelected ? color : "url(#barGradient)"}
      opacity={isSelected ? 1 : 0.9}
      animatedProps={animatedProps}
    />
  );
});

export const BarChart: React.FC<BarChartProps> = React.memo(({
  data,
  color,
  gradientColors,
  maxValue,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const max = useMemo(() => {
    if (maxValue) return maxValue;
    const values: number[] = [1];
    for (const d of data) values.push(d.value);
    return Math.max(...values);
  }, [data, maxValue]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
  };

  useEffect(() => {
    setSelectedIndex(null);
  }, [data]);

  const barGap = data.length > 7 ? rw(4) : rw(8);

  const barWidth = useMemo(() => {
    if (containerWidth <= 0 || data.length === 0) return 0;
    const totalGap = barGap * (data.length + 1);
    return Math.max((containerWidth - totalGap) / data.length, rw(8));
  }, [containerWidth, data.length, barGap]);

  const barTopY = useMemo(() => {
    if (selectedIndex === null || !data[selectedIndex]) return 0;
    const barHeight = Math.max(
      (data[selectedIndex].value / max) * BAR_AREA_HEIGHT,
      rh(4)
    );
    return BAR_AREA_HEIGHT - barHeight;
  }, [selectedIndex, data, max]);

  const handleBarSelect = (index: number) => {
    if (index < 0 || index >= data.length) return;
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
    if (barWidth <= 0 || data.length === 0) return;
    const idx = Math.floor((e.x - barGap / 2) / (barWidth + barGap));
    runOnJS(handleBarPress)(Math.max(0, Math.min(idx, data.length - 1)), e.x);
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart((e) => {
      if (barWidth <= 0 || data.length === 0) return;
      const idx = Math.floor((e.x - barGap / 2) / (barWidth + barGap));
      runOnJS(handleBarSelect)(Math.max(0, Math.min(idx, data.length - 1)));
    })
    .onEnd(() => {
      runOnJS(clearSelection)();
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const selectedData = selectedIndex !== null ? data[selectedIndex] : null;
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
              <Defs>
                <SvgLinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
                  <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="0.5" />
                </SvgLinearGradient>
              </Defs>

              <Line
                x1={0}
                y1={BAR_AREA_HEIGHT}
                x2={containerWidth}
                y2={BAR_AREA_HEIGHT}
                stroke={border.subtle}
                strokeWidth={1}
              />

              {data.map((item, index) => {
                const barHeight = Math.max((item.value / max) * BAR_AREA_HEIGHT, rh(4));
                const x = barGap + index * (barWidth + barGap);
                const isSelected = selectedIndex === index;
                const showLabel =
                  data.length <= 5 ||
                  index === 0 ||
                  index === data.length - 1 ||
                  index % Math.ceil(data.length / 4) === 0;

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
            <ChartTooltip
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
