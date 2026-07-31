import React from "react";
import { Platform } from "react-native";
import { Path, Circle, Line, G, Rect, Text as SvgText } from "react-native-svg";
import Animated from "react-native-reanimated";
import {
  surface,
  border,
  colors,
  typography,
  borderRadius,
} from "../../../../theme/aurora-tokens";
import { rf, rw, rh } from "../../../../utils/responsive";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface GridLinesProps {
  yLabels: number[];
  paddingLeft: number;
  paddingTop: number;
  chartAreaWidth: number;
  chartAreaHeight: number;
}

export const GridLines: React.FC<GridLinesProps> = ({
  yLabels,
  paddingLeft,
  paddingTop,
  chartAreaWidth,
  chartAreaHeight,
}) => (
  <>
    {yLabels.map((_, index) => {
      const y = paddingTop + (index / (yLabels.length - 1)) * chartAreaHeight;
      return (
        <Line
          key={`grid-${index}`}
          x1={paddingLeft}
          y1={y}
          x2={paddingLeft + chartAreaWidth}
          y2={y}
          stroke={border.subtle}
          strokeWidth={1}
          strokeDasharray={index === yLabels.length - 1 ? "0" : "4,6"}
        />
      );
    })}
  </>
);

interface YAxisLabelsProps {
  yLabels: number[];
  paddingLeft: number;
  paddingTop: number;
  chartAreaHeight: number;
}

export const YAxisLabels: React.FC<YAxisLabelsProps> = ({
  yLabels,
  paddingLeft,
  paddingTop,
  chartAreaHeight,
}) => (
  <>
    {yLabels.map((value, index) => {
      const y = paddingTop + (index / (yLabels.length - 1)) * chartAreaHeight;
      return (
        <SvgText
          key={`y-label-${index}`}
          x={paddingLeft - 8}
          y={y + 4}
          fill={colors.text.muted}
          fontSize={rf(10)}
          textAnchor="end"
          fontFamily={typography.variants.caption.fontFamily}
        >
          {value % 1 === 0 ? String(value) : value.toFixed(1)}
        </SvgText>
      );
    })}
  </>
);

interface AnimatedChartPathsProps {
  smoothPath: string;
  areaPath: string;
  animatedLineProps: any;
  animatedAreaProps: any;
}

export const AnimatedChartPaths: React.FC<AnimatedChartPathsProps> = ({
  smoothPath,
  areaPath,
  animatedLineProps,
  animatedAreaProps,
}) => (
  <>
    <AnimatedPath
      d={areaPath}
      fill="url(#areaGradient)"
      animatedProps={animatedAreaProps}
    />
    <AnimatedPath
      d={smoothPath}
      stroke="url(#lineGradient)"
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={1000}
      animatedProps={animatedLineProps}
    />
  </>
);

interface DataPointsProps {
  data: Array<{ label: string; value: number }>;
  getX: (index: number) => number;
  getY: (value: number) => number;
  color: string;
  selectedPoint: number | null;
  onPointPress: (index: number | null) => void;
}

export const DataPoints: React.FC<DataPointsProps> = ({
  data,
  getX,
  getY,
  color,
  selectedPoint,
  onPointPress,
}) => (
  <>
    {data.map((item, index) => {
      const isLast = index === data.length - 1;
      // Year-period charts carry up to 365 daily points: a dot per point
      // smears into a solid band and the rw(15) touch circles overlap into
      // random targets. Thin the dot layer to ~30 dots when dense; the
      // smooth path is drawn separately and stays intact.
      if (data.length > 60 && !isLast && index % Math.ceil(data.length / 30) !== 0) {
        return null;
      }
      const x = getX(index);
      const y = getY(item.value);
      const isSelected = selectedPoint === index;

      return (
        <G key={`point-${index}`}>
          {isLast && (
            <>
              <Circle cx={x} cy={y} r={rw(16)} fill={color} opacity={0.15} />
              <Circle cx={x} cy={y} r={rw(10)} fill={color} opacity={0.25} />
            </>
          )}
          <Circle
            cx={x}
            cy={y}
            r={isLast ? rw(6) : isSelected ? rw(5) : rw(4)}
            fill={isLast ? color : "rgba(255,255,255,0.9)"}
            stroke={color}
            strokeWidth={isLast ? 3 : 2}
          />
          <Circle
            cx={x}
            cy={y}
            r={rw(15)}
            fill="transparent"
            {...(Platform.OS === 'web'
              ? { onClick: () => onPointPress(selectedPoint === index ? -1 : index) }
              : { onPress: () => onPointPress(selectedPoint === index ? -1 : index) }
            )}
          />
        </G>
      );
    })}
  </>
);

interface XAxisLabelsProps {
  data: Array<{ label: string; value: number }>;
  getX: (index: number) => number;
  chartHeight: number;
  color: string;
}

export const XAxisLabels: React.FC<XAxisLabelsProps> = ({
  data,
  getX,
  chartHeight,
  color,
}) => (
  <>
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
          y={chartHeight - 8}
          fill={isLast ? color : colors.text.muted}
          fontSize={rf(10)}
          textAnchor="middle"
          fontFamily={isLast ? typography.variants.cardHeadline.fontFamily : typography.variants.caption.fontFamily}
        >
          {item.label}
        </SvgText>
      );
    })}
  </>
);

interface SelectedPointTooltipProps {
  selectedPoint: number;
  data: Array<{ label: string; value: number }>;
  getX: (index: number) => number;
  getY: (value: number) => number;
  unit: string;
}

export const SelectedPointTooltip: React.FC<SelectedPointTooltipProps> = ({
  selectedPoint,
  data,
  getX,
  getY,
  unit,
}) => {
  const point = data[selectedPoint];

  if (!point) {
    return null;
  }

  // Clamp the tooltip inside the SVG canvas: react-native-svg clips children
  // to the Svg bounds, so the rw(60)-wide rect ran off the right edge for the
  // last point and above the canvas for points near the chart max. The right
  // canvas edge is getX(last) + PADDING_RIGHT (rw(15)) from the parent chart.
  const chartWidth = getX(data.length - 1) + rw(15);
  const rectX = Math.min(
    Math.max(getX(selectedPoint) - rw(30), rw(4)),
    Math.max(chartWidth - rw(64), rw(4)),
  );
  const rectY = Math.max(getY(point.value) - rh(35), rh(4));

  return (
    <G>
      <Rect
        x={rectX}
        y={rectY}
        width={rw(60)}
        height={rh(26)}
        rx={rw(borderRadius.md)}
        fill={surface[2]}
        stroke={border.DEFAULT}
        strokeWidth={1}
      />
      <SvgText
        x={rectX + rw(30)}
        y={rectY + rh(17)}
        fill={colors.text.primary}
        fontSize={rf(11)}
        textAnchor="middle"
        fontFamily={typography.variants.cardHeadline.fontFamily}
      >
        {point.value % 1 === 0 ? String(point.value) : point.value.toFixed(1)}
        {unit}
      </SvgText>
    </G>
  );
};
