/**
 * GoalProgressSection - "Am I getting closer to my goals?" (Aurora 2026)
 *
 * Minimal: one horizontal gradient progress bar + % text per goal.
 * No boxed card — sits directly on the screen background.
 *
 * DATA SOURCES (single sources of truth):
 *  - Weight goal: latest weightHistory entry (same SSOT as WeightJourneySection
 *    hero and AnalyticsScreen) + target weight
 *  - Workout frequency: weeklyProgress.workoutsCompleted + calculatedMetrics.workoutFrequencyPerWeek
 */

import React, { useEffect, useMemo } from 'react';
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
  // SSOT: current weight comes from the latest weightHistory entry — the same
  // source as the WeightJourneySection hero and AnalyticsScreen. progressStats
  // (progressData service) is only a fallback when no history exists yet.
  const currentWeightKg = useMemo(() => {
    if (weightHistory.length > 0) {
      const sorted = [...weightHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const latest = sorted[sorted.length - 1].weight;
      if (Number.isFinite(latest)) return latest;
    }
    return progressStats?.weightChange.current ?? null;
  }, [weightHistory, progressStats?.weightChange.current]);
  const targetWeightKg = calculatedMetrics?.targetWeightKg ?? null;
  const workoutsCompleted = weeklyProgress?.workoutsCompleted ?? null;
  const workoutTarget = calculatedMetrics?.workoutFrequencyPerWeek ?? null;

  // No fake baseline: falling back to currentWeightKg pins start === current
  // and the bar at a permanent 0%. Only a real weigh-in history establishes a
  // start weight; without it the weight row is hidden (same contract as
  // analytics/GoalProgressCard).
  const hasStartWeight = weightHistory.some((entry) =>
    Number.isFinite(entry.weight),
  );
  const { weightProgress } = getWeightGoalProgress({
    currentWeightKg,
    targetWeightKg,
    weightHistory,
    fallbackStartWeightKg: null,
    weeklyRateKg: calculatedMetrics?.weeklyWeightLossRate ?? null,
    targetTimelineWeeks: calculatedMetrics?.targetTimelineWeeks ?? null,
  });

  const displayCurrentWeight = toDisplayWeight(currentWeightKg, unit);
  const displayTargetWeight = toDisplayWeight(targetWeightKg, unit);

  const workoutProgress =
    workoutsCompleted != null && workoutTarget != null && workoutTarget > 0
      ? workoutsCompleted / workoutTarget
      : null;

  const showWeightRow = hasStartWeight && weightProgress != null;
  const hasAnyGoal = showWeightRow || workoutProgress != null;

  return (
    <Animated.View
      entering={FadeInDown.delay(90).duration(320)}
      style={styles.section}
    >
      {/* Distinct title from analytics/GoalProgressCard (shown on
          ProgressTrends) — that card tracks Weight + Daily Calorie Target,
          this section tracks Weight + Workouts This Week. Same "Goal
          Progress" title on both screens read as duplicate/inconsistent
          widgets; naming this one for its weekly workout scope disambiguates
          them without changing either's data contract or visual language. */}
      <Text style={styles.sectionTitle}>This Week's Goals</Text>

      {showWeightRow && (
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
