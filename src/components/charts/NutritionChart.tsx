import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { THEME } from '../../utils/constants';

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
  style?: any;
}

export const NutritionChart: React.FC<NutritionChartProps> = ({
  data,
  targetCalories = 2000,
  style,
}) => {
  // Calculate percentages and prepare chart data
  const totalMacros = data.carbs + data.protein + data.fat;

  const chartData = [
    {
      name: 'Carbs',
      population: data.carbs,
      color: THEME.colors.secondary,
      legendFontColor: THEME.colors.textSecondary,
      legendFontSize: 12,
    },
    {
      name: 'Protein',
      population: data.protein,
      color: THEME.colors.primary,
      legendFontColor: THEME.colors.textSecondary,
      legendFontSize: 12,
    },
    {
      name: 'Fat',
      population: data.fat,
      color: THEME.colors.warning,
      legendFontColor: THEME.colors.textSecondary,
      legendFontSize: 12,
    },
  ];

  const chartConfig = {
    backgroundColor: THEME.colors.backgroundTertiary,
    backgroundGradientFrom: THEME.colors.backgroundTertiary,
    backgroundGradientTo: THEME.colors.backgroundTertiary,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(176, 176, 176, ${opacity})`,
  };

  // Calculate macro percentages
  const carbsPercentage = totalMacros > 0 ? (data.carbs / totalMacros) * 100 : 0;
  const proteinPercentage = totalMacros > 0 ? (data.protein / totalMacros) * 100 : 0;
  const fatPercentage = totalMacros > 0 ? (data.fat / totalMacros) * 100 : 0;

  // Calculate calories from macros (4 cal/g for carbs and protein, 9 cal/g for fat)
  const calculatedCalories = data.carbs * 4 + data.protein * 4 + data.fat * 9;
  const caloriesProgress = targetCalories > 0 ? (data.calories / targetCalories) * 100 : 0;

  const macroStats = [
    {
      name: 'Carbs',
      grams: data.carbs,
      percentage: carbsPercentage,
      color: THEME.colors.secondary,
    },
    {
      name: 'Protein',
      grams: data.protein,
      percentage: proteinPercentage,
      color: THEME.colors.primary,
    },
    {
      name: 'Fat',
      grams: data.fat,
      percentage: fatPercentage,
      color: THEME.colors.warning,
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
                backgroundColor: caloriesProgress > 100 ? THEME.colors.error : THEME.colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{caloriesProgress.toFixed(0)}% of daily goal</Text>
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
          <Text style={styles.noDataSubtext}>Log your meals to see breakdown</Text>
        </View>
      )}

      {/* Macro Stats */}
      <View style={styles.macroStats}>
        {macroStats.map((macro, index) => (
          <View key={index} style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <View style={[styles.macroColorDot, { backgroundColor: macro.color }]} />
              <Text style={styles.macroName}>{macro.name}</Text>
            </View>
            <Text style={styles.macroGrams}>{macro.grams}g</Text>
            <Text style={styles.macroPercentage}>{macro.percentage.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  caloriesContainer: {
    alignItems: 'flex-end',
  },

  caloriesValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  caloriesLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  progressContainer: {
    marginBottom: THEME.spacing.lg,
  },

  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: THEME.spacing.xs,
  },

  progressFill: {
    height: '100%',
    borderRadius: THEME.borderRadius.sm,
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  chartContainer: {
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },

  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xxl,
  },

  noDataText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },

  noDataSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
  },

  macroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.md,
  },

  macroItem: {
    flex: 1,
    alignItems: 'center',
  },

  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },

  macroColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: THEME.spacing.xs,
  },

  macroName: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  macroGrams: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  macroPercentage: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
});
