import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { flatColors as colors } from "../../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../../utils/responsive";
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

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.summaryCard}
    >
      <Text style={styles.summaryTitle} numberOfLines={1}>
        {selectedPeriod.charAt(0).toUpperCase() +
          selectedPeriod.slice(1) +
          "ly Summary"}
      </Text>
      <View style={styles.summaryStats}>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue} numberOfLines={1} adjustsFontSizeToFit>{workoutTrend.total}</Text>
          <Text style={styles.summaryStatLabel} numberOfLines={1}>Workouts</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue} numberOfLines={1} adjustsFontSizeToFit>
            {mealsLogged}
          </Text>
          <Text style={styles.summaryStatLabel} numberOfLines={1}>Meals Logged</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue} numberOfLines={1} adjustsFontSizeToFit>
            {waterLiters}
          </Text>
          <Text style={styles.summaryStatLabel} numberOfLines={1}>Water</Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: rp(16),
  },
  summaryTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rp(12),
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStatItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  summaryStatValue: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: colors.primary,
  },
  summaryStatLabel: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(6),
  },
});
