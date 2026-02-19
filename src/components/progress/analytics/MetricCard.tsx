import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

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
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },
  metricIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },
  metricValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  metricLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
  },
  changeContainer: {
    marginBottom: THEME.spacing.sm,
  },
  changeText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },
  goalProgress: {
    marginTop: THEME.spacing.sm,
  },
  goalText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
});
