import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from '../../../utils/constants';
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
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  metricIcon: {
    fontSize: ResponsiveTheme.fontSize.xl,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  metricValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  changeContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  changeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  goalProgress: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  goalText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: rbr(2),
  },
  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(2),
  },
});
