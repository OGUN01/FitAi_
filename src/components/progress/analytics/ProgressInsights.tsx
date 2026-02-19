import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

interface ProgressStats {
  totalEntries: number;
  weightChange: {
    change: number;
  };
  muscleChange: {
    change: number;
  };
  bodyFatChange: {
    change: number;
  };
}

interface ProgressInsightsProps {
  stats: ProgressStats;
}

export const ProgressInsights: React.FC<ProgressInsightsProps> = ({
  stats,
}) => {
  const hasInsights =
    stats.totalEntries >= 2 ||
    stats.weightChange.change < 0 ||
    stats.muscleChange.change > 0 ||
    stats.bodyFatChange.change < 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Insights</Text>
      <View style={styles.insightsContainer}>
        {stats.totalEntries === 0 ? (
          <Text style={styles.insightText}>
            📊 Start tracking your measurements to see progress insights!
          </Text>
        ) : (
          <>
            {stats.totalEntries >= 2 && (
              <Text style={styles.insightText}>
                🎯 Great consistency! You have {stats.totalEntries} measurements
                recorded.
              </Text>
            )}

            {stats.weightChange.change < 0 && (
              <Text style={styles.insightText}>
                📉 You're making progress with weight loss! Keep up the great
                work.
              </Text>
            )}

            {stats.muscleChange.change > 0 && (
              <Text style={styles.insightText}>
                💪 Excellent muscle gain! Your strength training is paying off.
              </Text>
            )}

            {stats.bodyFatChange.change < 0 && (
              <Text style={styles.insightText}>
                🔥 Body fat reduction detected! Your fitness routine is working.
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  insightsContainer: {
    gap: THEME.spacing.sm,
  },
  insightText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
});
