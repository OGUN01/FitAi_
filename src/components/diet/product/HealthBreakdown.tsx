import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

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
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownItem: {
    marginBottom: spacing.md,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
  },
  breakdownScore: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  breakdownScoreText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.white,
  },
  breakdownMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
