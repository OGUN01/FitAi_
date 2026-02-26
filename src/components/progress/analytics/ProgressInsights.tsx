import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from '../../../utils/constants';


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
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  insightsContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },
  insightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
});
