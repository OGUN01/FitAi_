import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from '../../../utils/constants';


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
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  summaryContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },
  summaryText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
});
