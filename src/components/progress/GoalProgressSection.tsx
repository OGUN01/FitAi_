/**
 * GoalProgressSection - "Am I getting closer to my goals?"
 *
 * DATA SOURCES (single sources of truth):
 *  - Weight goal: latest progress stats + earliest known weight history + target weight
 *  - Workout frequency: weeklyProgress.workoutsCompleted + calculatedMetrics.workoutFrequencyPerWeek
 *  - Calorie adherence: weeklyProgress.caloriesConsumed + calculatedMetrics.dailyCalories (7 days)
 */

import React, { type ComponentProps } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import type { ProgressStats } from '../../services/progressData';
import type { CalculatedMetrics } from '../../hooks/useCalculatedMetrics';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rp, rh, rbr, rs } from '../../utils/responsive';
import { type WeightUnit, toDisplayWeight } from '../../utils/units';
import { getWeightGoalProgress } from './goalProgressUtils';

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
  weightHistory?: Array<{ date: string; weight: number }>;
  unit?: WeightUnit;
}

interface GoalBarProps {
  label: string;
  icon: string;
  iconColor: string;
  current: number | null;
  target: number | null;
  unit: string;
  higherIsBetter?: boolean;
  displayCurrent?: string;
  displayTarget?: string;
}

const GoalBar: React.FC<GoalBarProps> = ({
  label,
  icon,
  iconColor,
  current,
  target,
  unit,
  higherIsBetter = false,
  displayCurrent,
  displayTarget,
}) => {
  if (current == null || target == null || target === 0) {
    return (
      <View style={styles.goalBarContainer}>
        <View style={styles.goalBarHeader}>
          <Ionicons name={icon as ComponentProps<typeof Ionicons>['name']} size={rf(14)} color={iconColor} />
          <Text style={styles.goalBarLabel}>{label}</Text>
        </View>
        <Text style={styles.noDataText}>No goal set</Text>
      </View>
    );
  }

  const progress = higherIsBetter
    ? Math.min(1, current / target)
    : Math.min(1, Math.max(0, current / target));
  const pct = Math.round(progress * 100);
  const isComplete = pct >= 100;

  return (
    <View style={styles.goalBarContainer}>
      <View style={styles.goalBarHeader}>
        <Ionicons name={icon as ComponentProps<typeof Ionicons>['name']} size={rf(14)} color={iconColor} />
        <Text style={styles.goalBarLabel}>{label}</Text>
        <Text
          style={[
            styles.goalBarPct,
            { color: isComplete ? ResponsiveTheme.colors.success : iconColor },
          ]}
        >
          {pct}%
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, pct)}%` as const,
              backgroundColor: isComplete ? ResponsiveTheme.colors.success : iconColor,
            },
          ]}
        />
      </View>
      <View style={styles.goalBarFooter}>
        <Text style={styles.goalBarSub}>
          {displayCurrent ?? `${current}`}
          {unit}
        </Text>
        <Text style={styles.goalBarSub}>
          Goal: {displayTarget ?? `${target}`}
          {unit}
        </Text>
      </View>
    </View>
  );
};

export const GoalProgressSection: React.FC<GoalProgressSectionProps> = ({
  progressStats,
  calculatedMetrics,
  weeklyProgress,
  weightHistory = [],
  unit = 'kg',
}) => {
  const currentWeightKg = progressStats?.weightChange.current ?? null;
  const targetWeightKg = calculatedMetrics?.targetWeightKg ?? null;
  const workoutsCompleted = weeklyProgress?.workoutsCompleted ?? null;
  const workoutTarget = calculatedMetrics?.workoutFrequencyPerWeek ?? null;
  const weeklyCalories =
    (weeklyProgress as { caloriesConsumed?: number } | null)?.caloriesConsumed ?? null;
  const dailyCalorieTarget = calculatedMetrics?.dailyCalories ?? null;
  const weeklyCalorieTarget = dailyCalorieTarget != null ? dailyCalorieTarget * 7 : null;

  const { weightProgress, weeklyRateKg, weeksLeft } = getWeightGoalProgress({
    currentWeightKg,
    targetWeightKg,
    weightHistory,
    fallbackStartWeightKg: calculatedMetrics?.currentWeightKg ?? null,
    weeklyRateKg: calculatedMetrics?.weeklyWeightLossRate ?? null,
    targetTimelineWeeks: calculatedMetrics?.targetTimelineWeeks ?? null,
  });

  const displayCurrentWeight = toDisplayWeight(currentWeightKg, unit);
  const displayTargetWeight = toDisplayWeight(targetWeightKg, unit);
  const displayWeeklyRate = toDisplayWeight(weeklyRateKg, unit);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(255,107,53,0.25)', 'rgba(255,107,53,0.05)']}
          style={styles.iconBg}
        >
          <Ionicons name="flag" size={rf(16)} color={ResponsiveTheme.colors.primary} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Goal Progress</Text>
      </View>

      {weightProgress != null && (
        <View style={styles.goalBarContainer}>
          <View style={styles.goalBarHeader}>
            <Ionicons name="scale-outline" size={rf(14)} color={ResponsiveTheme.colors.primary} />
            <Text style={styles.goalBarLabel}>Weight Goal</Text>
            <Text
              style={[
                styles.goalBarPct,
                {
                  color:
                    weightProgress >= 1
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.primary,
                },
              ]}
            >
              {Math.round(weightProgress * 100)}%
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, Math.round(weightProgress * 100))}%` as const,
                  backgroundColor:
                    weightProgress >= 1
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.primary,
                },
              ]}
            />
          </View>
          <View style={styles.goalBarFooter}>
            <Text style={styles.goalBarSub}>
              {displayCurrentWeight?.toFixed(1) ?? '--'} {unit} now
            </Text>
            <Text style={styles.goalBarSub}>
              Goal: {displayTargetWeight?.toFixed(1) ?? '--'} {unit}
            </Text>
          </View>
          {weeksLeft != null && displayWeeklyRate != null && weightProgress < 1 && (
            <Text style={styles.timelineHint}>
              At {displayWeeklyRate.toFixed(2)} {unit}/week - est. {weeksLeft} weeks left
            </Text>
          )}
        </View>
      )}

      <GoalBar
        label="Workouts This Week"
        icon="barbell-outline"
        iconColor="#3B82F6"
        current={workoutsCompleted}
        target={workoutTarget}
        unit=" sessions"
        higherIsBetter
        displayCurrent={workoutsCompleted != null ? `${workoutsCompleted}` : undefined}
        displayTarget={workoutTarget != null ? `${workoutTarget}` : undefined}
      />

      {weeklyCalories != null && weeklyCalorieTarget != null && (
        <GoalBar
          label="Calorie Adherence (Week)"
          icon="flame-outline"
          iconColor="#F97316"
          current={weeklyCalories}
          target={weeklyCalorieTarget}
          unit=" kcal"
          higherIsBetter
          displayCurrent={weeklyCalories != null ? `${Math.round(weeklyCalories)}` : undefined}
          displayTarget={
            weeklyCalorieTarget != null ? `${Math.round(weeklyCalorieTarget)}` : undefined
          }
        />
      )}

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(8),
    marginBottom: rp(14),
  },
  iconBg: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  goalBarContainer: {
    marginBottom: rp(14),
  },
  goalBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(6),
    marginBottom: rp(6),
  },
  goalBarLabel: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalBarPct: {
    fontSize: rf(13),
    fontWeight: '700',
  },
  barTrack: {
    height: rh(7),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderRadius: rbr(4),
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: rbr(4),
  },
  goalBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
    marginTop: rp(4),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: rp(16),
    gap: rp(8),
  },
  emptyText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
  },
});
