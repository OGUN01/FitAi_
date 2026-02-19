import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

interface ProgressStats {
  totalEntries: number;
  timeRange: number;
  weightChange: {
    changePercentage: number;
  };
}

interface ProgressSummaryProps {
  stats: ProgressStats;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({ stats }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Summary</Text>
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          📈 Total Entries: {stats.totalEntries}
        </Text>
        <Text style={styles.summaryText}>
          📅 Tracking Period: {stats.timeRange} days
        </Text>
        {stats.weightChange.changePercentage !== 0 && (
          <Text style={styles.summaryText}>
            ⚖️ Weight Change: {stats.weightChange.changePercentage.toFixed(1)}%
          </Text>
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
  summaryContainer: {
    gap: THEME.spacing.sm,
  },
  summaryText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
});
