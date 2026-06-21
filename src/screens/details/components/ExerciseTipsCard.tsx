import React from "react";
import { Text, StyleSheet } from "react-native";
import { Card } from "../../../components/ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

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
    marginBottom: spacing.md,
    backgroundColor: colors.success + "10",
    borderWidth: 1,
    borderColor: colors.success + "30",
  },
  safetyTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  safetyTip: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  mistakesCard: {
    marginBottom: spacing.xxl,
    backgroundColor: colors.warning + "10",
    borderWidth: 1,
    borderColor: colors.warning + "30",
  },
  mistakesTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  mistakeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});
