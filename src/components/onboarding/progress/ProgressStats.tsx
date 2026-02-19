import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

interface ProgressStatsProps {
  completedTabs: number;
  totalTabs: number;
  totalErrors: number;
}

export const ProgressStats: React.FC<ProgressStatsProps> = ({
  completedTabs,
  totalTabs,
  totalErrors,
}) => {
  return (
    <View style={styles.statsSection}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{completedTabs}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalTabs - completedTabs}</Text>
        <Text style={styles.statLabel}>Remaining</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalErrors}</Text>
        <Text style={styles.statLabel}>Errors</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
