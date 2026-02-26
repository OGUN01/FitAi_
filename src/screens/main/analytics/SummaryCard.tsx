import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../../utils/responsive";
import { TrendPeriod } from "../../../hooks/useProgressTrendsLogic";
import { DailyMetrics } from "../../../services/analyticsData";

interface SummaryCardProps {
  selectedPeriod: TrendPeriod;
  workoutTrend: { total: number };
  metricsHistory: DailyMetrics[];
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  selectedPeriod,
  workoutTrend,
  metricsHistory,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={styles.summaryCard}
    >
      <Text style={styles.summaryTitle}>
        {selectedPeriod.charAt(0).toUpperCase() +
          selectedPeriod.slice(1) +
          "ly Summary"}
      </Text>
      <View style={styles.summaryStats}>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{workoutTrend.total}</Text>
          <Text style={styles.summaryStatLabel}>Workouts</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>
            {metricsHistory.reduce((sum, m) => sum + (m.mealsLogged || 0), 0)}
          </Text>
          <Text style={styles.summaryStatLabel}>Meals Logged</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>
            {(
              metricsHistory.reduce(
                (sum, m) => sum + (m.waterIntakeMl || 0),
                0,
              ) / 1000
            ).toFixed(1) + "L"}
          </Text>
          <Text style={styles.summaryStatLabel}>Water</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: rp(16),
  },
  summaryTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(12),
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStatItem: {
    alignItems: "center",
  },
  summaryStatValue: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  summaryStatLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(6),
  },
});
