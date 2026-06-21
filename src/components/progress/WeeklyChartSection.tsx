import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { rp, rh, rw, rs } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

interface WeeklyChartSectionProps {
  weeklyData: any[];
}

const MAX_BAR_HEIGHT = 70;

export const WeeklyChartSection: React.FC<WeeklyChartSectionProps> = ({
  weeklyData,
}) => {
  const maxWorkouts = useMemo(
    () => Math.max(1, ...weeklyData.map((d) => d.workouts ?? 0)),
    [weeklyData],
  );
  const maxMeals = useMemo(
    () => Math.max(1, ...weeklyData.map((d) => d.meals ?? 0)),
    [weeklyData],
  );
  const maxCalories = useMemo(
    () => Math.max(1, ...weeklyData.map((d) => d.calories ?? 0)),
    [weeklyData],
  );
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>This Week's Activity</Text>
      <GlassCard
        style={styles.chartCard}
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Activity & Nutrition</Text>
          <Text style={styles.chartSubtitle}>Last 7 days</Text>
        </View>

        <View style={styles.chart}>
          {weeklyData.map((day, index) => (
            <View key={index} style={styles.chartDay}>
              <View style={styles.chartBars}>
                <View
                  style={[
                    styles.chartBar,
                    styles.workoutBar,
                    { height: Math.min((((day.workouts ?? 0) / maxWorkouts) * MAX_BAR_HEIGHT) + 4, MAX_BAR_HEIGHT) },
                  ]}
                />
                <View
                  style={[
                    styles.chartBar,
                    styles.mealBar,
                    { height: Math.min((((day.meals ?? 0) / maxMeals) * MAX_BAR_HEIGHT) + 4, MAX_BAR_HEIGHT) },
                  ]}
                />
                <View
                  style={[
                    styles.chartBar,
                    styles.calorieBar,
                    { height: Math.min((((day.calories ?? 0) / maxCalories) * MAX_BAR_HEIGHT) + 4, MAX_BAR_HEIGHT) },
                  ]}
                />
              </View>
              <Text style={styles.chartDayLabel}>{day.day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.primary },
              ]}
            />
            <Text style={styles.legendText}>Workouts</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Meals</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: colors.secondary,
                },
              ]}
            />
            <Text style={styles.legendText}>Calories</Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartCard: {
    padding: spacing.lg,
  },
  chartHeader: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  chartSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: rh(100),
    marginBottom: spacing.lg,
  },
  chartDay: {
    alignItems: "center",
    flex: 1,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: rh(80),
    marginBottom: spacing.sm,
  },
  chartBar: {
    width: rw(8),
    borderRadius: borderRadius.sm,
    marginHorizontal: rp(1),
  },
  workoutBar: {
    backgroundColor: colors.primary,
  },
  mealBar: {
    backgroundColor: colors.success,
  },
  calorieBar: {
    backgroundColor: colors.secondary,
  },
  chartDayLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: rw(8),
    height: rh(8),
    borderRadius: rs(4),
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
