/**
 * GoalProgressSection - "Am I getting closer to my goals?" (Aurora 2026)
 *
 * Minimal: one horizontal gradient progress bar + % text per goal.
 * No boxed card — sits directly on the screen background.
 *
 * DATA SOURCES (single sources of truth):
 *  - Weight goal: latest progress stats + earliest known weight history + target weight
 *  - Workout frequency: weeklyProgress.workoutsCompleted + calculatedMetrics.workoutFrequencyPerWeek
 *  - Calorie adherence: weeklyProgress.caloriesConsumed + calculatedMetrics.dailyCalories (7 days)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { ProgressStats } from '../../services/progressData';
import type { CalculatedMetrics } from '../../hooks/useCalculatedMetrics';
import {
  chart,
  colors,
  surface,
  typography,
  spacing,
  borderRadius,
} from '../../theme/aurora-tokens';
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

interface GoalRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  progress: number | null;
  leftText: string;
  rightText: string;
  delay?: number;
}

const GoalRow: React.FC<GoalRowProps> = ({
  label,
  icon,
  accent,
  progress,
  leftText,
  rightText,
  delay = 0,
}) => {
  const width = useSharedValue(0);
  const pct = progress == null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  useEffect(() => {
    if (pct != null) {
      width.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) });
    }
  }, [pct, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(280)}
      style={styles.goalRow}
    >
      <View style={styles.goalHeader}>
        <Ionicons name={icon} size={14} color={accent} />
        <Text style={styles.goalLabel}>{label}</Text>
        <Text style={[styles.goalPct, { color: accent }]}>
          {pct == null ? '—' : `${pct}%`}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFillWrap, fillStyle]}>
          <LinearGradient
            colors={[accent, chart[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barFill}
          />
        </Animated.View>
      </View>
      <View style={styles.goalFooter}>
        <Text style={styles.goalSub}>{leftText}</Text>
        <Text style={styles.goalSub}>{rightText}</Text>
      </View>
    </Animated.View>
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

  const { weightProgress } = getWeightGoalProgress({
    currentWeightKg,
    targetWeightKg,
    weightHistory,
    fallbackStartWeightKg: calculatedMetrics?.currentWeightKg ?? null,
    weeklyRateKg: calculatedMetrics?.weeklyWeightLossRate ?? null,
    targetTimelineWeeks: calculatedMetrics?.targetTimelineWeeks ?? null,
  });

  const displayCurrentWeight = toDisplayWeight(currentWeightKg, unit);
  const displayTargetWeight = toDisplayWeight(targetWeightKg, unit);

  const workoutProgress =
    workoutsCompleted != null && workoutTarget != null && workoutTarget > 0
      ? workoutsCompleted / workoutTarget
      : null;
  const calorieProgress =
    weeklyCalories != null && weeklyCalorieTarget != null && weeklyCalorieTarget > 0
      ? weeklyCalories / weeklyCalorieTarget
      : null;

  const hasAnyGoal =
    weightProgress != null || workoutProgress != null || calorieProgress != null;

  return (
    <Animated.View
      entering={FadeInDown.delay(90).duration(320)}
      style={styles.section}
    >
      <Text style={styles.sectionTitle}>Goal Progress</Text>

      {weightProgress != null && (
        <GoalRow
          label="Weight Goal"
          icon="scale-outline"
          accent={chart[1]}
          progress={weightProgress}
          leftText={`${displayCurrentWeight?.toFixed(1) ?? '--'} ${unit} now`}
          rightText={`Goal ${displayTargetWeight?.toFixed(1) ?? '--'} ${unit}`}
          delay={120}
        />
      )}

      {workoutProgress != null && (
        <GoalRow
          label="Workouts This Week"
          icon="barbell-outline"
          accent={chart[2]}
          progress={workoutProgress}
          leftText={`${workoutsCompleted} sessions`}
          rightText={`Goal ${workoutTarget}`}
          delay={160}
        />
      )}

      {calorieProgress != null && (
        <GoalRow
          label="Calorie Adherence"
          icon="flame-outline"
          accent={chart[5]}
          progress={calorieProgress}
          leftText={`${Math.round(weeklyCalories ?? 0)} kcal`}
          rightText={`Goal ${Math.round(weeklyCalorieTarget ?? 0)}`}
          delay={200}
        />
      )}

      {!hasAnyGoal && (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={24} color={colors.text.muted} />
          <Text style={styles.emptyText}>Complete onboarding to see your goal progress</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  goalRow: {
    marginBottom: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  goalLabel: {
    flex: 1,
    ...typography.variants.caption2,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.text.secondary,
  },
  goalPct: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_700Bold',
  },
  barTrack: {
    height: 8,
    backgroundColor: surface[1],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  barFillWrap: {
    height: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  barFill: {
    flex: 1,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  goalSub: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.variants.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
});

export default GoalProgressSection;
