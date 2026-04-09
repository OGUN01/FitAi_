import React from "react";
import { Text, StyleSheet } from "react-native";
import { Card } from "../../../components/ui";
import { ResponsiveTheme } from "../../../utils/constants";

interface ExerciseTipsCardProps {
  tips: string[];
  safetyTips: string[];
}

export const ExerciseTipsCard: React.FC<ExerciseTipsCardProps> = ({
  tips,
  safetyTips,
}) => {
  return (
    <>
      {tips.length > 0 && (
        <Card style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>Tips</Text>
          {tips.map((tip: string, index: number) => (
            <Text key={index} style={styles.safetyTip}>
              • {tip}
            </Text>
          ))}
        </Card>
      )}

      {safetyTips.length > 0 && (
        <Card style={styles.mistakesCard}>
          <Text style={styles.mistakesTitle}>Safety Considerations</Text>
          {safetyTips.map((tip: string, index: number) => (
            <Text key={index} style={styles.mistakeText}>
              • {tip}
            </Text>
          ))}
        </Card>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  safetyCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.success + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.success + "30",
  },
  safetyTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  safetyTip: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  mistakesCard: {
    marginBottom: ResponsiveTheme.spacing.xxl,
    backgroundColor: ResponsiveTheme.colors.warning + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.warning + "30",
  },
  mistakesTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  mistakeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
});
