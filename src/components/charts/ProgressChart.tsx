import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { ChartTooltip } from "../ui/ChartTooltip";
import { hapticSelection } from "../../utils/haptics";

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth } = Dimensions.get('window');

interface ProgressDataPoint {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  metric: "weight" | "bodyFat" | "muscleMass";
  title: string;
  unit: string;
  style?: StyleProp<ViewStyle>;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  metric,
  title,
  unit,
  style,
}) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<
    "week" | "month" | "year"
  >("month");
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: number;
    label: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    label: "",
  });

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const lastTapRef = useRef(0);

  // Filter data based on selected period
  const getFilteredData = () => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedPeriod) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return data.filter((point) => new Date(point.date) >= cutoffDate);
  };

  const filteredData = getFilteredData();

  // Prepare chart data
  const chartData = {
    labels: filteredData.map((point) => {
      const date = new Date(point.date);
      if (selectedPeriod === "week") {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else if (selectedPeriod === "month") {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        return date.toLocaleDateString("en-US", { month: "short" });
      }
    }),
    datasets: [
      {
        data: filteredData.map((point) => point[metric] || 0),
        color: (opacity = 1) => colors.primary,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.backgroundTertiary,
    backgroundGradientFrom: colors.backgroundTertiary,
    backgroundGradientTo: colors.backgroundTertiary,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(176, 176, 176, ${opacity})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary,
      fill: colors.backgroundTertiary,
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  const periods = [
    { key: "week", label: "7D" },
    { key: "month", label: "1M" },
    { key: "year", label: "1Y" },
  ];

  // Calculate trend
  const getTrend = () => {
    if (filteredData.length < 2) return { value: 0, isPositive: true };

    const firstValue = filteredData[0][metric] || 0;
    const lastValue = filteredData[filteredData.length - 1][metric] || 0;
    const change = lastValue - firstValue;

    return {
      value: Math.abs(change),
      isPositive: change >= 0,
    };
  };

  const trend = getTrend();

  // Handle data point click (debounced to 300ms to prevent rapid-tap duplicates)
  const handleDataPointClick = (data: any) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;

    const { value, index, x, y } = data;

    hapticSelection();

    setTooltipData({
      visible: true,
      x: x - 50, // Center the tooltip
      y: y - 60, // Position above the point
      value: value,
      label: chartData.labels[index] || "",
    });

    // Hide tooltip after 2 seconds
    setTimeout(() => {
      if (mountedRef.current) {
        setTooltipData((prev) => ({ ...prev, visible: false }));
      }
    }, 2000);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Chart Tooltip */}
      <ChartTooltip
        visible={tooltipData.visible}
        x={tooltipData.x}
        y={tooltipData.y}
        value={tooltipData.value}
        label={tooltipData.label}
        formatValue={(val) =>
          `${typeof val === "number" ? val.toFixed(1) : val} ${unit}`
        }
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.trendContainer}>
            <Text style={styles.trendValue}>
              {trend.isPositive ? "+" : "-"}
              {trend.value.toFixed(1)} {unit}
            </Text>
            <Text
              style={[
                styles.trendLabel,
                {
                  color: trend.isPositive
                    ? colors.success
                    : colors.error,
                },
              ]}
            >
              {trend.isPositive ? "↗" : "↘"} {selectedPeriod}
            </Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.key as "week" | "month" | "year")}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key &&
                    styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart */}
      {filteredData.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(350, filteredData.length * 50)} // Fixed min width
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
            onDataPointClick={handleDataPointClick}
          />
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
          <Text style={styles.noDataSubtext}>
            Start tracking to see your progress
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  trendValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },

  trendLabel: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  periodSelector: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs / 2,
  },

  periodButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  periodButtonActive: {
    backgroundColor: colors.primary,
  },

  periodButtonText: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },

  periodButtonTextActive: {
    color: colors.white,
  },

  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },

  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },

  noDataText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  noDataSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
