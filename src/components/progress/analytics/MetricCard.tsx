import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';
import { rh, rbr } from "../../../utils/responsive";


interface MetricCardProps {
  icon: string;
  value: number;
  unit: string;
  label: string;
  change: number;
  changeUnit: string;
  getProgressColor: (change: number) => string;
  getProgressIcon: (change: number) => string;
  formatChange: (change: number, unit: string) => string;
  goal?: number;
  goalLabel?: string;
  calculateGoalProgress?: (current: number, goal: number) => number;
  invertProgress?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  value,
  unit,
  label,
  change,
  changeUnit,
  getProgressColor,
  getProgressIcon,
  formatChange,
  goal,
  goalLabel,
  calculateGoalProgress,
  invertProgress = false,
}) => {
  const progressPercentage =
    goal && calculateGoalProgress
      ? invertProgress
        ? 100 - calculateGoalProgress(value, goal)
        : calculateGoalProgress(value, goal)
      : 0;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricValue}>
          {value.toFixed(1)}
          {unit}
        </Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.changeContainer}>
        <Text style={[styles.changeText, { color: getProgressColor(change) }]}>
          {getProgressIcon(change)} {formatChange(change, changeUnit)}
        </Text>
      </View>
      {goal && (
        <View style={styles.goalProgress}>
          <Text style={styles.goalText}>
            {goalLabel || "Goal"}: {goal}
            {unit}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercentage}%` }]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metricIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  changeContainer: {
    marginBottom: spacing.sm,
  },
  changeText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  goalProgress: {
    marginTop: spacing.sm,
  },
  goalText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(2),
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },
});
