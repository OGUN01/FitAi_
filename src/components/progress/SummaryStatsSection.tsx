import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import DataRetrievalService from "../../services/dataRetrieval";

interface SummaryStatsSectionProps {
  weeklyProgress: any;
  realWeeklyData: any[];
  progressStats: any;
}

export const SummaryStatsSection: React.FC<SummaryStatsSectionProps> = ({
  weeklyProgress,
  realWeeklyData,
  progressStats,
}) => {
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
            <Text style={styles.summaryValue}>
              {realWeeklyData.reduce((total, day) => total + day.duration, 0) >
              0
                ? `${Math.round(
                    realWeeklyData.reduce(
                      (total, day) => total + day.duration,
                      0,
                    ) / 60,
                  )}h`
                : progressStats?.totalDuration
                  ? `${Math.round(progressStats.totalDuration / 60)}h`
                  : "0h"}
            </Text>
            <Text style={styles.summaryLabel}>Time Exercised</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {DataRetrievalService.getTotalCaloriesBurned()?.toLocaleString() ||
                progressStats?.totalCalories?.toLocaleString() ||
                "0"}
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  summaryCard: {
    padding: ResponsiveTheme.spacing.lg,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.lg,
  },
  summaryItem: {
    width: "45%",
    alignItems: "center",
  },
  summaryValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  summaryLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
});
