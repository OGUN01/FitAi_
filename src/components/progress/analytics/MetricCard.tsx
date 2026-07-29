/**
 * MetricCard - Aurora 2026
 *
 * Single surface.1 tile, big number (Manrope_700Bold), icon squircle,
 * hairline progress bar. No drop shadows, no emojis.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";

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

const toIonicon = (icon: string): keyof typeof Ionicons.glyphMap => {
  switch (icon) {
    case "📈":
      return "trending-up";
    case "📉":
      return "trending-down";
    case "⚖️":
      return "scale-outline";
    case "💪":
      return "barbell-outline";
    case "📊":
      return "analytics-outline";
    case "➡️":
    default:
      return "remove";
  }
};

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

  const accent = getProgressColor(change);

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View
          style={[styles.metricIconWrap, { backgroundColor: `${accent}1A` }]}
        >
          <Ionicons name={toIonicon(icon)} size={18} color={accent} />
        </View>
        <Ionicons
          name={toIonicon(getProgressIcon(change))}
          size={14}
          color={accent}
        />
      </View>
      <Text style={styles.metricValue}>
        {value.toFixed(1)}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.changeText, { color: accent }]}>
        {formatChange(change, changeUnit)}
      </Text>
      {goal ? (
        <View style={styles.goalBlock}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%`, backgroundColor: accent },
              ]}
            />
          </View>
          <Text style={styles.goalText}>
            {goalLabel || "Goal"}: {goal}
            {unit}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: spacing.md,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  metricUnit: {
    ...typography.variants.caption2,
    color: colors.text.muted,
  },
  metricLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  changeText: {
    ...typography.variants.caption,
    fontFamily: "Manrope_600SemiBold",
    marginTop: spacing.xs,
  },
  goalBlock: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: surface[2],
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.sm,
  },
  goalText: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
});

export default MetricCard;
