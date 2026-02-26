import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { ResponsiveTheme } from "../../utils/constants";
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
      color: ResponsiveTheme.colors.secondary,
      legendFontColor: ResponsiveTheme.colors.textSecondary,
      legendFontSize: rf(12),
    },
    {
      name: "Protein",
      population: data.protein,
      color: ResponsiveTheme.colors.primary,
      legendFontColor: ResponsiveTheme.colors.textSecondary,
      legendFontSize: rf(12),
    },
    {
      name: "Fat",
      population: data.fat,
      color: ResponsiveTheme.colors.warning,
      legendFontColor: ResponsiveTheme.colors.textSecondary,
      legendFontSize: rf(12),
    },
  ];

  const chartConfig = {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    backgroundGradientFrom: ResponsiveTheme.colors.backgroundTertiary,
    backgroundGradientTo: ResponsiveTheme.colors.backgroundTertiary,
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
      color: ResponsiveTheme.colors.secondary,
    },
    {
      name: "Protein",
      grams: data.protein,
      percentage: proteinPercentage,
      color: ResponsiveTheme.colors.primary,
    },
    {
      name: "Fat",
      grams: data.fat,
      percentage: fatPercentage,
      color: ResponsiveTheme.colors.warning,
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
                    ? ResponsiveTheme.colors.error
                    : ResponsiveTheme.colors.primary,
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
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginVertical: ResponsiveTheme.spacing.sm,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  caloriesContainer: {
    alignItems: "flex-end",
  },

  caloriesValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  caloriesLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  progressContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    overflow: "hidden",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: "100%",
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  chartContainer: {
    alignItems: "center" as const,
    marginVertical: ResponsiveTheme.spacing.md,
  },

  noDataContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.xxl,
  },

  noDataText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  noDataSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
  },

  macroStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    marginTop: ResponsiveTheme.spacing.md,
  },

  macroItem: {
    flex: 1,
    alignItems: "center" as const,
  },

  macroHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  macroColorDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rbr(4),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  macroName: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  macroGrams: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  macroPercentage: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
});
