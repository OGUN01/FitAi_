import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rs, rbr, rh } from "../../utils/responsive";

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

  const chartData = [
    {
      name: "Carbs",
      population: data.carbs,
      color: colors.secondary,
      legendFontColor: colors.textSecondary,
      legendFontSize: rf(12),
    },
    {
      name: "Protein",
      population: data.protein,
      color: colors.primary,
      legendFontColor: colors.textSecondary,
      legendFontSize: rf(12),
    },
    {
      name: "Fat",
      population: data.fat,
      color: colors.warning,
      legendFontColor: colors.textSecondary,
      legendFontSize: rf(12),
    },
  ];

  const chartConfig = {
    backgroundColor: colors.backgroundTertiary,
    backgroundGradientFrom: colors.backgroundTertiary,
    backgroundGradientTo: colors.backgroundTertiary,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(176, 176, 176, ${opacity})`,
  };

  // Calculate macro percentages
  const carbsPercentage =
    totalMacros > 0 ? (data.carbs / totalMacros) * 100 : 0;
  const proteinPercentage =
    totalMacros > 0 ? (data.protein / totalMacros) * 100 : 0;
  const fatPercentage = totalMacros > 0 ? (data.fat / totalMacros) * 100 : 0;

  // Calculate calories from macros (4 cal/g for carbs and protein, 9 cal/g for fat)
  const calculatedCalories = data.carbs * 4 + data.protein * 4 + data.fat * 9;
  const caloriesProgress =
    (targetCalories ?? 0) > 0
      ? (data.calories / (targetCalories ?? 1)) * 100
      : 0;

  const macroStats = [
    {
      name: "Carbs",
      grams: data.carbs,
      percentage: carbsPercentage,
      color: colors.secondary,
    },
    {
      name: "Protein",
      grams: data.protein,
      percentage: proteinPercentage,
      color: colors.primary,
    },
    {
      name: "Fat",
      grams: data.fat,
      percentage: fatPercentage,
      color: colors.warning,
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Breakdown</Text>
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesValue}>{data.calories}</Text>
          <Text style={styles.caloriesLabel}>/ {targetCalories} cal</Text>
        </View>
      </View>

      {/* Calories Progress Bar */}
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

      {/* Pie Chart */}
      {totalMacros > 0 ? (
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={300} // Fixed width for charts
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute={false}
          />
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
    marginBottom: spacing.xs / 2,
  },

  macroPercentage: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
