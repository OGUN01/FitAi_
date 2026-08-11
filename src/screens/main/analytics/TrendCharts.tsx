/**
 * TrendCharts Component
 * Premium analytics charts with world-class styling
 * Inspired by Apple Health, Fitbit, and modern fintech dashboards
 */

import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  chart,
  colors,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { rf, rh } from "../../../utils/responsive";
import type { WeightUnit } from "../../../utils/units";
import { SectionHeader } from "./SectionHeader";
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
  weightUnit?: WeightUnit;
}

export const TrendCharts: React.FC<TrendChartsProps> = React.memo(({
  weightData,
  calorieData,
  workoutData,
  period,
  onChartPress,
  weightUnit = "kg",
}) => {
  const hasWeightData = Boolean(weightData && weightData.length > 0);
  const hasCalorieData = Boolean(calorieData && calorieData.length > 0);
  const hasWorkoutData = Boolean(workoutData && workoutData.length > 0);
  const safeCalorieData = calorieData ?? [];
  const safeWorkoutData = workoutData ?? [];

  const weightLegend = useMemo(
    () => (hasWeightData ? [{ color: chart[1], label: "Weight" }] : undefined),
    [hasWeightData],
  );
  const calorieLegend = useMemo(
    () => (hasCalorieData ? [{ color: chart[4], label: "Consumed" }] : undefined),
    [hasCalorieData],
  );
  const handleWeightPress = useCallback(() => onChartPress?.("weight"), [onChartPress]);
  const handleCaloriePress = useCallback(() => onChartPress?.("calories"), [onChartPress]);
  const handleWorkoutPress = useCallback(() => onChartPress?.("workouts"), [onChartPress]);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionHeader
          title="Detailed Analytics"
          icon="bar-chart"
          iconColor={chart[1]}
        />
      </View>

      <View style={styles.chartsContainer}>
        <ChartCard
          title="Weight Progress"
          // A directional icon here would contradict the LineChart body,
          // which already computes and shows the real trend arrow/badge
          // from the data (via calculateTrend + weightLossGoal below). Use a
          // neutral topic icon instead, matching the "flame"/"barbell"
          // pattern used by the other two cards.
          icon="body-outline"
          iconColor={chart[1]}
          legend={weightLegend}
          delay={0}
          onPress={hasWeightData ? handleWeightPress : undefined}
        >
          <LineChart
            data={weightData || []}
            color={chart[1]}
            unit={weightUnit}
            // Matches the "down is good" convention already used by
            // MetricSummaryGrid and WeightJourneySection for weight —
            // without this, calculateTrend()'s default (gain = positive)
            // showed a falling weight as a red/negative trend here while
            // the rest of the app showed it green.
            weightLossGoal
          />
        </ChartCard>

        <ChartCard
          title="Calorie Analysis"
          icon="flame"
          iconColor={chart[5]}
          legend={calorieLegend}
          delay={100}
          onPress={hasCalorieData ? handleCaloriePress : undefined}
        >
          {hasCalorieData ? (
            <BarChart
              data={safeCalorieData}
              color={chart[4]}
              gradientColors={[chart[4], chart[4]]}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="flame-outline"
                size={rf(32)}
                color={colors.text.muted}
              />
              <Text style={styles.emptyChartText} numberOfLines={2}>
                No calorie data recorded
              </Text>
              <Text style={styles.emptyChartSubtext} numberOfLines={2}>
                Start tracking meals to see analysis
              </Text>
            </View>
          )}
        </ChartCard>

        <ChartCard
          title="Workout Consistency"
          icon="barbell"
          iconColor={chart[2]}
          delay={200}
          onPress={hasWorkoutData ? handleWorkoutPress : undefined}
        >
          {hasWorkoutData ? (
            <BarChart
              data={safeWorkoutData}
              color={chart[2]}
              gradientColors={[chart[2], chart[2]]}
              maxValue={Math.max(...safeWorkoutData.map((d) => d.value), 4)}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="barbell-outline"
                size={rf(32)}
                color={colors.text.muted}
              />
              <Text style={styles.emptyChartText} numberOfLines={2}>
                No workout data this {period}
              </Text>
              <Text style={styles.emptyChartSubtext} numberOfLines={2}>
                Complete workouts to see consistency
              </Text>
            </View>
          )}
        </ChartCard>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
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
    fontFamily: "Manrope_700Bold",
    fontSize: rf(15),
    color: colors.text.primary,
    textAlign: "center",
  },
  emptyChartSubtext: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
});

export default TrendCharts;
