// Progress Chart Component
// Beautiful charts for analytics visualization using Victory Native

import React from "react";
import { View, Text, Dimensions } from "react-native";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../utils/responsive";

// Temporarily disabled victory-native to resolve Skia module issues
// import { VictoryChart, VictoryLine, VictoryArea, VictoryBar, VictoryAxis, VictoryTheme, VictoryTooltip } from 'victory-native';

interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
}

interface ProgressChartProps {
  title: string;
  data: ChartDataPoint[];
  type: "line" | "area" | "bar";
  color?: string;
  height?: number;
  showGrid?: boolean;
  animate?: boolean;
  unit?: string; // Added for compatibility with usage in AnalyticsScreen
  gradientColors?: string[]; // Added for gradient support
}

const { width: screenWidth } = Dimensions.get("window");

export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  data,
  type,
  color = colors.primary.DEFAULT,
  height = 200,
  showGrid = true,
  animate = true,
}) => {
  // Temporary placeholder while victory-native Skia issues are resolved
  return (
    <View
      style={{
        width: screenWidth - 40,
        height: height + 60,
        backgroundColor: colors.background.secondary,
        justifyContent: "center",
        borderRadius: rbr(12),
        padding: rp(20),
        marginVertical: rp(10),
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.glass.border,
      }}    >
      <Text
        style={{
          fontSize: rf(18),
          fontWeight: "600",
          marginBottom: rp(10),
          color: colors.text.primary,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: rf(14),
          color: colors.text.secondary,
          textAlign: "center",
        }}
      >
        Chart visualization temporarily disabled
      </Text>
      <Text
        style={{
          fontSize: rf(12),
          color: colors.text.tertiary,
          marginTop: rp(8),
          textAlign: "center",
        }}
      >
        {data.length} data points • {type} chart
      </Text>
    </View>
  );
};

export default ProgressChart;
