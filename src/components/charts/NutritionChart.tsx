import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { MACRO_PILL_COLORS } from "../diet/macroColors";
import { rs, rbr, rh, rw } from "../../utils/responsive";

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth } = Dimensions.get('window');

interface NutritionData {
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
}

interface NutritionChartProps {
  data: NutritionData;
  targetCalories?: number;
  style?: StyleProp<ViewStyle>;
}

export const NutritionChart: React.FC<NutritionChartProps> = ({
  data,
  targetCalories, // NO DEFAULT - must be passed from calculatedMetrics
  style,
}) => {
  // Calculate percentages and prepare chart data
  const totalMacros = data.carbs + data.protein + data.fat;

  // Measure container width so the donut is responsive (hardcoded 300
  // overflowed 320px screens).
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
  };
  const chartWidth = containerWidth > 0 ? containerWidth : rw(300);
  const chartHeight = rh(180);

  // Calculate macro percentages
  const carbsPercentage =
    totalMacros > 0 ? (data.carbs / totalMacros) * 100 : 0;
  const proteinPercentage =
    totalMacros > 0 ? (data.protein / totalMacros) * 100 : 0;
  const fatPercentage = totalMacros > 0 ? (data.fat / totalMacros) * 100 : 0;

  const caloriesProgress =
    (targetCalories ?? 0) > 0
      ? (data.calories / (targetCalories ?? 1)) * 100
      : 0;

  const macroStats = [
    {
      name: "Carbs",
      grams: data.carbs,
      percentage: carbsPercentage,
      color: MACRO_PILL_COLORS.carbs,
    },
    {
      name: "Protein",
      grams: data.protein,
      percentage: proteinPercentage,
      color: MACRO_PILL_COLORS.protein,
    },
    {
      name: "Fat",
      grams: data.fat,
      percentage: fatPercentage,
      color: MACRO_PILL_COLORS.fat,
    },
  ];

  // Custom SVG donut (replaces react-native-chart-kit PieChart): flat token
  // strokes on a hairline track, matching the custom SVG/Skia chart language
  // used across Progress/Analytics.
  const donutSize = Math.min(chartWidth, chartHeight);
  const donutStroke = rs(24);
  const donutRadius = Math.max((donutSize - donutStroke) / 2, 1);
  const donutCenter = donutSize / 2;
  const circumference = 2 * Math.PI * donutRadius;

  const donutSegments = useMemo(() => {
    let acc = 0;
    return macroStats.map((macro) => {
      const fraction = totalMacros > 0 ? macro.grams / totalMacros : 0;
      const length = fraction * circumference;
      const segment = { color: macro.color, offset: -acc, length };
      acc += length;
      return segment;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.carbs, data.protein, data.fat, totalMacros, circumference]);

  const donutA11y = macroStats
    .map((macro) => `${macro.name} ${macro.percentage.toFixed(0)}%`)
    .join(", ");

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Breakdown</Text>
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesValue}>{data.calories}</Text>
          <Text style={styles.caloriesLabel}>
            {targetCalories != null ? `/ ${targetCalories} cal` : "cal"}
          </Text>
        </View>
      </View>

      {/* Calories Progress Bar — only show when a target is set, otherwise
          "0% of daily goal" is misleading. */}
      {targetCalories != null && targetCalories > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(caloriesProgress, 100)}%`,
                  backgroundColor:
                    caloriesProgress > 100
                      ? colors.error
                      : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {caloriesProgress.toFixed(0)}% of daily goal
          </Text>
        </View>
      )}

      {/* Macro donut */}
      {totalMacros > 0 ? (
        <View
          style={styles.chartContainer}
          accessibilityRole="image"
          accessibilityLabel={`Macro breakdown: ${donutA11y}`}
        >
          <Svg width={donutSize} height={donutSize}>
            <G rotation={-90} origin={`${donutCenter}, ${donutCenter}`}>
              {/* Track ring */}
              <Circle
                cx={donutCenter}
                cy={donutCenter}
                r={donutRadius}
                stroke={colors.surface}
                strokeWidth={donutStroke}
                fill="none"
              />
              {donutSegments.map((segment, index) => (
                <Circle
                  key={index}
                  cx={donutCenter}
                  cy={donutCenter}
                  r={donutRadius}
                  stroke={segment.color}
                  strokeWidth={donutStroke}
                  fill="none"
                  strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                  strokeDashoffset={segment.offset}
                  strokeLinecap="butt"
                />
              ))}
            </G>
          </Svg>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No nutrition data</Text>
          <Text style={styles.noDataSubtext}>
            Log your meals to see breakdown
          </Text>
        </View>
      )}

      {/* Macro Stats */}
      <View style={styles.macroStats}>
        {macroStats.map((macro, index) => (
          <View key={index} style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <View
                style={[styles.macroColorDot, { backgroundColor: macro.color }]}
              />
              <Text style={styles.macroName}>{macro.name}</Text>
            </View>
            <Text style={styles.macroGrams}>{macro.grams}g</Text>
            <Text style={styles.macroPercentage}>
              {macro.percentage.toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
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
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: spacing.md,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  caloriesContainer: {
    alignItems: "flex-end",
  },

  caloriesValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },

  caloriesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  progressContainer: {
    marginBottom: spacing.lg,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },

  progressFill: {
    height: "100%",
    borderRadius: borderRadius.sm,
  },

  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  chartContainer: {
    alignItems: "center" as const,
    marginVertical: spacing.md,
  },

  noDataContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
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

  macroStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    marginTop: spacing.md,
  },

  macroItem: {
    flex: 1,
    alignItems: "center" as const,
  },

  macroHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.xs,
  },

  macroColorDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rbr(4),
    marginRight: spacing.xs,
  },

  macroName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  macroGrams: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    fontVariant: ["tabular-nums"],
  },

  macroPercentage: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
