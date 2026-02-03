import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from "react-native-svg";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf } from "../../../../utils/responsive";

interface TrendChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  width,
  height,
  color,
}) => {
  // Filter out NaN and invalid values
  const validData = data.filter((v) => Number.isFinite(v));

  if (validData.length < 2) {
    return (
      <View style={[styles.emptyChart, { width, height }]}>
        <Text style={styles.emptyChartText}>Not enough data</Text>
      </View>
    );
  }

  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minValue = Math.min(...validData) - 1;
  const maxValue = Math.max(...validData) + 1;
  const range = maxValue - minValue || 1;

  const points = validData.map((value, index) => {
    // Guard against division by zero when only 1 data point
    const xDivisor = validData.length > 1 ? validData.length - 1 : 1;
    const x = Math.round(padding + (index / xDivisor) * chartWidth);
    const y = Math.round(
      padding + chartHeight - ((value - minValue) / range) * chartHeight,
    );
    return { x, y };
  });

  // Create smooth curve path - round all values to prevent NaN in Android native
  const pathData = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const prev = points[index - 1];
    const cpX = Math.round((prev.x + point.x) / 2);
    const cpY = Math.round((prev.y + point.y) / 2);
    return `${acc} Q ${cpX} ${prev.y}, ${cpX} ${cpY} T ${point.x} ${point.y}`;
  }, "");

  // Area fill path
  const lastX = points[points.length - 1]?.x ?? padding;
  const areaPath = `${pathData} L ${lastX} ${height - padding} L ${padding} ${height - padding} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </LinearGradient>
      </Defs>
      {/* Grid lines */}
      <Line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
      <Line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
      {/* Area fill */}
      <Path d={areaPath} fill="url(#chartGradient)" />
      {/* Line */}
      <Path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Current point */}
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={color} />
      <Circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={6}
        fill={color}
        fillOpacity={0.3}
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  emptyChart: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  emptyChartText: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
});
