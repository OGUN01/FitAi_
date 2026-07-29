/**
 * WeeklyChartSection - This Week's Activity (Aurora 2026)
 *
 * Grouped 3-series bar chart on surface.1 with hairline border,
 * chart-palette accents, Manrope type.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  colors,
  surface,
  border as borderTokens,
  chart,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rh, rw } from "../../utils/responsive";

interface WeeklyChartSectionProps {
  weeklyData: any[];
}

const MAX_BAR_HEIGHT = 70;

const SERIES = [
  { key: "workouts", label: "Workouts", color: chart[1] },
  { key: "meals", label: "Meals", color: chart[4] },
  { key: "calories", label: "Calories", color: chart[2] },
] as const;

export const WeeklyChartSection: React.FC<WeeklyChartSectionProps> = React.memo(({
  weeklyData,
}) => {
  const maxima = useMemo(
    () => ({
      workouts: Math.max(1, ...weeklyData.map((d) => d.workouts ?? 0)),
      meals: Math.max(1, ...weeklyData.map((d) => d.meals ?? 0)),
      calories: Math.max(1, ...weeklyData.map((d) => d.calories ?? 0)),
    }),
    [weeklyData],
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(150).duration(320)}
      style={styles.section}
    >
      <Text style={styles.sectionTitle}>This Week's Activity</Text>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Activity & Nutrition</Text>
          <Text style={styles.chartSubtitle}>Last 7 days</Text>
        </View>

        <View style={styles.chart}>
          {weeklyData.map((day, index) => (
            <View key={index} style={styles.chartDay}>
              <View style={styles.chartBars}>
                {SERIES.map((s) => {
                  const raw = day[s.key] ?? 0;
                  const height = Math.min(
                    (raw / maxima[s.key]) * (MAX_BAR_HEIGHT - 4) + 4,
                    MAX_BAR_HEIGHT,
                  );
                  return (
                    <View
                      key={s.key}
                      style={[
                        styles.chartBar,
                        { backgroundColor: s.color, height },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.chartDayLabel}>{day.day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartLegend}>
          {SERIES.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: s.color }]}
              />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  chartCard: {
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  chartHeader: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
  },
  chartSubtitle: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
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
    height: MAX_BAR_HEIGHT,
    marginBottom: spacing.sm,
  },
  chartBar: {
    width: rw(6),
    borderRadius: borderRadius.xs,
    marginHorizontal: 1,
  },
  chartDayLabel: {
    ...typography.variants.caption,
    color: colors.text.muted,
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
    height: rw(8),
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
});

export default WeeklyChartSection;
