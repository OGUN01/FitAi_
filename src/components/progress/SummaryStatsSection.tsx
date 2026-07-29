import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  typography,
} from "../../theme/aurora-tokens";

interface SummaryStatsSectionProps {
  weeklyProgress: any;
  realWeeklyData: any[];
  progressStats: any;
  totalCaloriesBurned: number;
}

export const SummaryStatsSection: React.FC<SummaryStatsSectionProps> = ({
  weeklyProgress,
  realWeeklyData,
  progressStats,
  totalCaloriesBurned,
}) => {
  const totalDurationMinutes = realWeeklyData.reduce((total, day) => total + day.duration, 0);
  const displayDuration = totalDurationMinutes > 0
    ? `${Math.round(totalDurationMinutes / 60)}h`
    : progressStats?.totalDuration
      ? `${Math.round(progressStats.totalDuration / 60)}h`
      : "0h";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Overall Summary</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {weeklyProgress?.workoutsCompleted ?? "--"}
            </Text>
            <Text style={styles.summaryLabel}>Total Workouts</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{displayDuration}</Text>
            <Text style={styles.summaryLabel}>Time Exercised</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {totalCaloriesBurned > 0
                ? totalCaloriesBurned.toLocaleString()
                : progressStats?.totalCalories?.toLocaleString() ?? "0"}
            </Text>
            <Text style={styles.summaryLabel}>Calories Burned</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {weeklyProgress?.streak ?? "--"}
            </Text>
            <Text style={styles.summaryLabel}>Day Streak</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  summaryCard: {
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  summaryItem: {
    width: "45%",
    alignItems: "center",
  },
  summaryValue: {
    ...typography.variants.cardHeadline,
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    color: colors.primary.DEFAULT,
  },
  summaryLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
