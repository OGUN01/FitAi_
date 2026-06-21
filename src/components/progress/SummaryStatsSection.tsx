import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

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
      <GlassCard
        style={styles.summaryCard}
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
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
  summaryCard: {
    padding: spacing.lg,
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
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
