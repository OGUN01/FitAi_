import React from "react";
import { Platform } from "react-native";
import { Path, Circle, Line, G, Rect, Text as SvgText } from "react-native-svg";
import Animated from "react-native-reanimated";
import { ResponsiveTheme } from "../../../../utils/constants";
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
          stroke="rgba(255, 255, 255, 0.06)"
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
          fill={ResponsiveTheme.colors.textMuted}
          fontSize={rf(9)}
          textAnchor="end"
          fontWeight="500"
        >
          {value.toFixed(1)}
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
      const x = getX(index);
      const y = getY(item.value);
      const isLast = index === data.length - 1;
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
          fill={isLast ? color : ResponsiveTheme.colors.textMuted}
          fontSize={rf(10)}
          textAnchor="middle"
          fontWeight={isLast ? "700" : "500"}
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

  return (
    <G>
      <Rect
        x={getX(selectedPoint) - rw(30)}
        y={getY(point.value) - rh(35)}
        width={rw(60)}
        height={rh(26)}
        rx={rw(8)}
        fill="rgba(0,0,0,0.85)"
      />
      <SvgText
        x={getX(selectedPoint)}
        y={getY(point.value) - rh(18)}
        fill={ResponsiveTheme.colors.white}
        fontSize={rf(11)}
        textAnchor="middle"
        fontWeight="700"
      >
        {point.value.toFixed(1)}
        {unit}
      </SvgText>
    </G>
  );
};
