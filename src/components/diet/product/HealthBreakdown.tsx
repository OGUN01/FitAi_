import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

interface HealthBreakdownProps {
  breakdown: {
    [key: string]: {
      score: number;
      status: string;
      message: string;
    };
  };
  getScoreColor: (score: number) => string;
}

export const HealthBreakdown: React.FC<HealthBreakdownProps> = ({
  breakdown,
  getScoreColor,
}) => (
  <View style={styles.breakdownContainer}>
    <Text style={styles.sectionTitle}>Health Breakdown</Text>
    {Object.entries(breakdown).map(([key, assessment]) => (
      <View key={key} style={styles.breakdownItem}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownLabel}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Text>
          <View
            style={[
              styles.breakdownScore,
              { backgroundColor: getScoreColor(assessment.score) },
            ]}
          >
            <Text style={styles.breakdownScoreText}>{assessment.score}</Text>
          </View>
        </View>
        <Text style={styles.breakdownMessage}>{assessment.message}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  breakdownContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  breakdownItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  breakdownLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
  },
  breakdownScore: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  breakdownScoreText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.white,
  },
  breakdownMessage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
