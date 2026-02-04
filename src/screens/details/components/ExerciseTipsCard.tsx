import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../../../components/ui";

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
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.success + "10",
    borderWidth: 1,
    borderColor: THEME.colors.success + "30",
  },
  safetyTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.success,
    marginBottom: THEME.spacing.sm,
  },
  safetyTip: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.xs,
  },
  mistakesCard: {
    marginBottom: THEME.spacing.xxl,
    backgroundColor: THEME.colors.warning + "10",
    borderWidth: 1,
    borderColor: THEME.colors.warning + "30",
  },
  mistakesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.warning,
    marginBottom: THEME.spacing.sm,
  },
  mistakeText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.xs,
  },
});
