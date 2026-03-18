/**
 * GoalProgressSection — "Am I getting closer to my goals?"
 *
 * DATA SOURCES (single sources of truth):
 *  - Weight goal: progressStats.weightChange.current + calculatedMetrics.targetWeightKg / currentWeightKg
 *  - Workout frequency: weeklyProgress.workoutsCompleted + calculatedMetrics.workoutFrequencyPerWeek
 *  - Calorie adherence: weeklyProgress.caloriesConsumed + calculatedMetrics.dailyCalories (7 days)
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import type { ProgressStats } from "../../services/progressData";
import type { CalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rbr, rs } from "../../utils/responsive";

interface WeeklyProgress {
  workoutsCompleted: number;
  mealsCompleted: number;
  caloriesConsumed?: number;
  streak: number;
}

interface GoalProgressSectionProps {
  progressStats: ProgressStats | null;
  calculatedMetrics: CalculatedMetrics | null;
  weeklyProgress: WeeklyProgress | null;
}

interface GoalBarProps {
  label: string;
  icon: string;
  iconColor: string;
  current: number | null;
  target: number | null;
  unit: string;
  higherIsBetter?: boolean;
  formatCurrent?: (v: number) => string;
  formatTarget?: (v: number) => string;
}

const GoalBar: React.FC<GoalBarProps> = ({
  label,
  icon,
  iconColor,
  current,
  target,
  unit,
  higherIsBetter = false,
  formatCurrent,
  formatTarget,
}) => {
  if (current == null || target == null || target === 0) {
    return (
      <View style={styles.goalBarContainer}>
        <View style={styles.goalBarHeader}>
          <Ionicons name={icon as any} size={rf(14)} color={iconColor} />
          <Text style={styles.goalBarLabel}>{label}</Text>
        </View>
        <Text style={styles.noDataText}>No goal set</Text>
      </View>
    );
  }

  // For weight loss goal: start=onboarding weight, current=now, target=goal weight
  // progress = how far from start toward target
  let progress: number;
  if (higherIsBetter) {
    progress = Math.min(1, current / target);
  } else {
    // Weight loss: lower current = more progress
    // We need a start baseline — use progressStats for this
    // Clamp between 0-1
    progress = Math.min(1, Math.max(0, current / target));
  }

  const pct = Math.round(progress * 100);
  const isComplete = pct >= 100;

  const displayCurrent = formatCurrent ? formatCurrent(current) : `${current}`;
  const displayTarget = formatTarget ? formatTarget(target) : `${target}`;

  return (
    <View style={styles.goalBarContainer}>
      <View style={styles.goalBarHeader}>
        <Ionicons name={icon as any} size={rf(14)} color={iconColor} />
        <Text style={styles.goalBarLabel}>{label}</Text>
        <Text style={[styles.goalBarPct, { color: isComplete ? ResponsiveTheme.colors.success : iconColor }]}>
          {pct}%
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, pct)}%` as any,
              backgroundColor: isComplete ? ResponsiveTheme.colors.success : iconColor,
            },
          ]}
        />
      </View>
      <View style={styles.goalBarFooter}>
        <Text style={styles.goalBarSub}>
          {displayCurrent}{unit}
        </Text>
        <Text style={styles.goalBarSub}>
          Goal: {displayTarget}{unit}
        </Text>
      </View>
    </View>
  );
};

export const GoalProgressSection: React.FC<GoalProgressSectionProps> = ({
  progressStats,
  calculatedMetrics,
  weeklyProgress,
}) => {
  const currentWeight = progressStats?.weightChange.current ?? null;
  const targetWeight = calculatedMetrics?.targetWeightKg ?? null;
  const startWeight = calculatedMetrics?.currentWeightKg ?? null;

  // Weight progress: progress = (startWeight - currentWeight) / (startWeight - targetWeight)
  // clamped 0→1
  let weightProgress: number | null = null;
  if (currentWeight != null && targetWeight != null && startWeight != null) {
    const totalToLose = Math.abs(startWeight - targetWeight);
    const alreadyLost = Math.abs(startWeight - currentWeight);
    weightProgress = totalToLose > 0 ? Math.min(1, alreadyLost / totalToLose) : 1;
  }

  // Workout frequency: workoutsCompleted this week / target per week
  const workoutsCompleted = weeklyProgress?.workoutsCompleted ?? null;
  const workoutTarget = calculatedMetrics?.workoutFrequencyPerWeek ?? null;

  // Calorie adherence this week: average daily calories vs target
  // weeklyProgress doesn't have caloriesConsumed exposed — use meals as proxy
  // (If we have it we show it, else skip)
  const weeklyCalories = (weeklyProgress as any)?.caloriesConsumed ?? null;
  const dailyCalorieTarget = calculatedMetrics?.dailyCalories ?? null;
  // weeklyCalorieTarget = 7 days
  const weeklyCalorieTarget = dailyCalorieTarget != null ? dailyCalorieTarget * 7 : null;

  // Timeline estimate — use the same rate the review page shows:
  // (startWeight - targetWeight) / user's chosen timeline weeks
  const targetTimelineWeeks = calculatedMetrics?.targetTimelineWeeks ?? null;
  const weeklyRate =
    startWeight != null && targetWeight != null && targetTimelineWeeks != null && targetTimelineWeeks > 0
      ? Math.round((Math.abs(startWeight - targetWeight) / targetTimelineWeeks) * 100) / 100
      : (calculatedMetrics?.weeklyWeightLossRate ?? null);
  // Weeks left based on current gap / original rate
  const weeksLeft =
    currentWeight != null && targetWeight != null && weeklyRate != null && weeklyRate > 0
      ? Math.ceil(Math.abs(currentWeight - targetWeight) / weeklyRate)
      : null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <LinearGradient
          colors={["rgba(255,107,53,0.25)", "rgba(255,107,53,0.05)"]}
          style={styles.iconBg}
        >
          <Ionicons name="flag" size={rf(16)} color={ResponsiveTheme.colors.primary} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Goal Progress</Text>
      </View>

      {/* Weight Goal */}
      {weightProgress != null && (
        <View style={styles.goalBarContainer}>
          <View style={styles.goalBarHeader}>
            <Ionicons name="scale-outline" size={rf(14)} color={ResponsiveTheme.colors.primary} />
            <Text style={styles.goalBarLabel}>Weight Goal</Text>
            <Text style={[styles.goalBarPct, { color: weightProgress >= 1 ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.primary }]}>
              {Math.round(weightProgress * 100)}%
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, Math.round(weightProgress * 100))}%` as any,
                  backgroundColor: weightProgress >= 1 ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.primary,
                },
              ]}
            />
          </View>
          <View style={styles.goalBarFooter}>
            <Text style={styles.goalBarSub}>{currentWeight?.toFixed(1) ?? "--"} kg now</Text>
            <Text style={styles.goalBarSub}>Goal: {targetWeight?.toFixed(1) ?? "--"} kg</Text>
          </View>
          {weeksLeft != null && weeklyRate != null && weightProgress < 1 && (
            <Text style={styles.timelineHint}>
              At {weeklyRate} kg/week — est. {weeksLeft} weeks left
            </Text>
          )}
        </View>
      )}

      {/* Workout Frequency */}
      <GoalBar
        label="Workouts This Week"
        icon="barbell-outline"
        iconColor="#3B82F6"
        current={workoutsCompleted}
        target={workoutTarget}
        unit=" sessions"
        higherIsBetter
        formatCurrent={(v) => `${v}`}
        formatTarget={(v) => `${v}`}
      />

      {/* Calorie adherence — only if data available */}
      {weeklyCalories != null && weeklyCalorieTarget != null && (
        <GoalBar
          label="Calorie Adherence (Week)"
          icon="flame-outline"
          iconColor="#F97316"
          current={weeklyCalories}
          target={weeklyCalorieTarget}
          unit=" kcal"
          higherIsBetter
          formatCurrent={(v) => `${Math.round(v)}`}
          formatTarget={(v) => `${Math.round(v)}`}
        />
      )}

      {/* Empty state */}
      {weightProgress == null && workoutsCompleted == null && (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={rf(28)} color={ResponsiveTheme.colors.textMuted} />
          <Text style={styles.emptyText}>Complete onboarding to see your goal progress</Text>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    padding: rp(16),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: rp(14),
  },
  iconBg: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(8),
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  goalBarContainer: {
    marginBottom: rp(14),
  },
  goalBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginBottom: rp(6),
  },
  goalBarLabel: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalBarPct: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  barTrack: {
    height: rh(7),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: rbr(4),
  },
  goalBarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: rp(4),
  },
  goalBarSub: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
  },
  timelineHint: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.primary,
    marginTop: rp(3),
    fontStyle: "italic",
  },
  noDataText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
    marginTop: rp(4),
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: rp(16),
    gap: rp(8),
  },
  emptyText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },
});
