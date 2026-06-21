import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';


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
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryContainer: {
    gap: spacing.sm,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
});
