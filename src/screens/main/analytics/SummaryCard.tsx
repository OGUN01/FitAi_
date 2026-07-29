import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  surface,
  border,
  chart,
  colors,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { TrendPeriod } from "../../../hooks/useProgressTrendsLogic";
import { DailyMetrics } from "../../../services/analyticsData";

interface SummaryCardProps {
  selectedPeriod: TrendPeriod;
  workoutTrend: { total: number };
  metricsHistory: DailyMetrics[];
}

export const SummaryCard: React.FC<SummaryCardProps> = React.memo(({
  selectedPeriod,
  workoutTrend,
  metricsHistory,
}) => {
  const { mealsLogged, waterLiters } = useMemo(() => {
    const meals = metricsHistory.reduce((sum, m) => sum + (m.mealsLogged || 0), 0);
    const waterMl = metricsHistory.reduce((sum, m) => sum + (m.waterIntakeMl || 0), 0);
    return { mealsLogged: meals, waterLiters: (waterMl / 1000).toFixed(1) + "L" };
  }, [metricsHistory]);

  const stats = [
    { id: "workouts", value: workoutTrend.total, label: "Workouts", color: chart[2] },
    { id: "meals", value: mealsLogged, label: "Meals", color: chart[4] },
    { id: "water", value: waterLiters, label: "Water", color: chart[3] },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.panel}
    >
      <Text style={styles.title} numberOfLines={1}>
        {selectedPeriod.charAt(0).toUpperCase() +
          selectedPeriod.slice(1) +
          "ly Summary"}
      </Text>
      <View style={styles.row}>
        {stats.map((stat, i) => (
          <React.Fragment key={stat.id}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: stat.color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {stat.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
            </View>
            {i < stats.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
  },
  title: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  statValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(24),
    letterSpacing: -0.5,
  },
  statLabel: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: border.subtle,
  },
});
