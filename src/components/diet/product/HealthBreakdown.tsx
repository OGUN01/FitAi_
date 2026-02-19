import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

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
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  breakdownItem: {
    marginBottom: THEME.spacing.md,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.xs,
  },
  breakdownLabel: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
  },
  breakdownScore: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },
  breakdownScoreText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.white,
  },
  breakdownMessage: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});
