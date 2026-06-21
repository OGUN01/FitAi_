/**
 * TrendCharts Component
 * Premium analytics charts with world-class styling
 * Inspired by Apple Health, Fitbit, and modern fintech dashboards
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing } from "../../../theme/aurora-tokens";
import { rf, rh } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";
import { Period } from "./PeriodSelector";
import { BarChart, ChartData } from "./components/BarChart";
import { LineChart } from "./components/LineChart";
import { ChartCard } from "./components/ChartCard";

interface TrendChartsProps {
  weightData?: ChartData[];
  calorieData?: ChartData[];
  workoutData?: ChartData[];
  period: Period;
  onChartPress?: (chartType: string) => void;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  weightData,
  calorieData,
  workoutData,
  period,
  onChartPress,
}) => {
  const hasWeightData = Boolean(weightData && weightData.length > 0);
  const hasCalorieData = Boolean(calorieData && calorieData.length > 0);
  const hasWorkoutData = Boolean(workoutData && workoutData.length > 0);
  const safeCalorieData = calorieData ?? [];
  const safeWorkoutData = workoutData ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionHeader
          title="Detailed Analytics"
          icon="bar-chart"
          iconColor={colors.primary}
        />
      </View>

      <View style={styles.chartsContainer}>
        <ChartCard
          title="Weight Progress"
          icon="trending-down"
          iconColor={colors.primary}
          legend={
            hasWeightData
              ? [{ color: colors.primary, label: "Weight" }]
              : undefined
          }
          delay={0}
          onPress={hasWeightData ? () => onChartPress?.("weight") : undefined}
        >
          <LineChart data={weightData || []} color={colors.primary} unit="kg" />
        </ChartCard>

        <ChartCard
          title="Calorie Analysis"
          icon="flame"
          iconColor={colors.warning}
          legend={
            hasCalorieData
              ? [{ color: colors.success, label: "Consumed" }]
              : undefined
          }
          delay={100}
          onPress={hasCalorieData ? () => onChartPress?.("calories") : undefined}
        >
          {hasCalorieData ? (
            <BarChart
              data={safeCalorieData}
              color={colors.success}
              gradientColors={[colors.success, colors.successLight]}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="flame-outline"
                size={rf(32)}
                color={colors.textMuted}
              />
              <Text style={styles.emptyChartText}>
                No calorie data recorded
              </Text>
              <Text style={styles.emptyChartSubtext}>
                Start tracking meals to see analysis
              </Text>
            </View>
          )}
        </ChartCard>

        <ChartCard
          title="Workout Consistency"
          icon="barbell"
          iconColor={colors.info}
          delay={200}
          onPress={hasWorkoutData ? () => onChartPress?.("workouts") : undefined}
        >
          {hasWorkoutData ? (
            <BarChart
              data={safeWorkoutData}
              color={colors.info}
              gradientColors={[colors.info, colors.info]}
              maxValue={Math.max(...safeWorkoutData.map((d) => d.value), 4)}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="barbell-outline"
                size={rf(32)}
                color={colors.textMuted}
              />
              <Text style={styles.emptyChartText}>
                No workout data this {period}
              </Text>
              <Text style={styles.emptyChartSubtext}>
                Complete workouts to see consistency
              </Text>
            </View>
          )}
        </ChartCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chartsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  emptyChart: {
    minHeight: rh(180),
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyChartText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyChartSubtext: {
    fontSize: rf(12),
    fontWeight: "500",
    color: colors.textMuted,
    textAlign: "center",
  },
});

export default TrendCharts;
