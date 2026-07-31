/**
 * FullPlanScreen — flat "Full Plan" surface for the active weekly workout plan.
 *
 * Replaces the dead-end "View All" CTA that previously opened an Alert with the
 * plan description (audit finding #2). Reads the live plan straight from
 * `useFitnessStore` (the runtime source of truth) — pure presentational, no
 * writes.
 *
 * Design language (2026 flat):
 *  - Custom flat header: back chevron + uppercase letterspaced "WEEK N"
 *    eyebrow + bold "Full Plan" title. No glass cards anywhere.
 *  - Each of the 7 days is a flat section directly on the aurora background:
 *    day name + date, workout title (semibold), muted meta
 *    (duration • exercises • kcal), hairline separators.
 *  - Completed day: successAlt check + "Done" text. Rest day: moon + muted
 *    "Rest". Tappable days navigate to 'WorkoutDetail' with the exact params
 *    `useFitnessLogic.handleViewWorkoutDetails` uses.
 *
 * Calories follow CLAUDE.md §9: actual burned calories (completedSession) win
 * over the plan's pre-generation estimate.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { useFitnessStore } from '../../stores/fitnessStore';
import { flatColors as colors, spacing } from '../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../theme/fonts';
import { rf, rw, rp, rbr } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { getCurrentWeekStart, getWeekStartForDate } from '../../utils/weekUtils';
import { findCompletedSessionForWorkout } from '../../utils/workoutIdentity';
import type { DayWorkout } from '../../types/ai';

// ----------------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------------

interface FullPlanScreenNavigation {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
}

export interface FullPlanScreenProps {
  navigation: FullPlanScreenNavigation;
  /** Route params are optional — the screen reads the plan from the store. */
  route?: { params?: Record<string, unknown> };
}

/** Monday-first day keys — mirrors DAY_KEYS_MON in useFitnessLogic. */
const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// Rest-day violet — sourced from the `colors.rest` token (aurora-tokens.ts).
// Mirrors WeeklyPlanOverview; both consumers share the single token so the
// rest-day accent stays in sync across the weekly plan + full-plan views.
const REST_DAY_VIOLET = colors.rest;

interface DayRowModel {
  dayKey: (typeof DAY_KEYS)[number];
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isRestDay: boolean;
  workout: DayWorkout | null;
  isCompleted: boolean;
  meta: string | null;
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const FullPlanScreen: React.FC<FullPlanScreenProps> = ({ navigation }) => {
  const weeklyWorkoutPlan = useFitnessStore((state) => state.weeklyWorkoutPlan);
  const workoutProgress = useFitnessStore((state) => state.workoutProgress);
  const completedSessions = useFitnessStore((state) => state.completedSessions);

  const currentWeekStart = getCurrentWeekStart();

  const days = useMemo<DayRowModel[]>(() => {
    const plan = weeklyWorkoutPlan;
    const todayKey = DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

    return DAY_KEYS.map((dayKey, index) => {
      const date = new Date(`${currentWeekStart}T00:00:00`);
      date.setDate(date.getDate() + index);
      const dateLabel = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const workout = plan?.workouts?.find((w) => w.dayOfWeek?.toLowerCase() === dayKey) ?? null;
      const isRestDay = (plan?.restDays || []).some((d: number | string) =>
        typeof d === 'string' ? d.toLowerCase() === dayKey : d === index
      );

      // Completion — mirrors WeeklyPlanOverview.getDayStatus: real session wins;
      // a stale 100% progress entry from a previous week does not count.
      const completedSession = workout
        ? findCompletedSessionForWorkout({
            completedSessions,
            workout,
            plan,
            weekStart: currentWeekStart,
          })
        : null;
      const progressEntry = workout ? workoutProgress[workout.id] : null;
      const hasStaleCompletedProgress =
        progressEntry?.progress === 100 &&
        !!progressEntry.completedAt &&
        getWeekStartForDate(progressEntry.completedAt) !== currentWeekStart;
      const isCompleted = !!completedSession;

      let meta: string | null = null;
      if (workout && !isRestDay) {
        const duration = workout.duration || 0;
        const exerciseCount = workout.plannedExercises?.length ?? workout.exercises?.length ?? 0;
        // §9: actual burned kcal at completion beats the pre-gen estimate.
        const kcal = completedSession?.caloriesBurned ?? workout.estimatedCalories ?? 0;
        const parts = [
          duration > 0 ? `${duration} min` : null,
          `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`,
          kcal > 0 ? `${kcal} kcal` : null,
        ].filter(Boolean);
        meta = parts.join(' • ');
        // Surface live progress for an in-progress (non-stale) workout.
        if (!isCompleted && !hasStaleCompletedProgress && (progressEntry?.progress ?? 0) > 0) {
          meta = `${Math.min(progressEntry?.progress ?? 0, 99)}% • ${meta}`;
        }
      }

      return {
        dayKey,
        dayLabel: DAY_LABELS[index],
        dateLabel,
        isToday: todayKey === dayKey,
        isRestDay: isRestDay || !workout,
        workout,
        isCompleted,
        meta,
      };
    });
  }, [weeklyWorkoutPlan, workoutProgress, completedSessions, currentWeekStart]);

  const weekNumber = weeklyWorkoutPlan?.weekNumber;
  const eyebrow = weekNumber ? `WEEK ${weekNumber}` : 'THIS WEEK';

  const scheduledCount = days.filter((d) => d.workout && !d.isRestDay).length;
  const completedCount = days.filter((d) => d.isCompleted).length;

  // Same navigation call as useFitnessLogic.handleViewWorkoutDetails.
  const handleDayPress = useCallback(
    (workout: DayWorkout) => {
      const dayIdx = DAY_KEYS.indexOf(
        (workout.dayOfWeek?.toLowerCase() ?? 'monday') as (typeof DAY_KEYS)[number]
      );
      navigation.navigate('WorkoutDetail', {
        workout,
        dayIndex: dayIdx >= 0 ? dayIdx : 0,
      });
    },
    [navigation]
  );

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex} edges={['top']} testID="full-plan-screen">
        {/* Flat header — back + eyebrow + title */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={navigation.goBack}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="full-plan-back"
          >
            <Ionicons name="chevron-back" size={rf(26)} color={colors.text} />
          </AnimatedPressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              Full Plan
            </Text>
          </View>
          {/* Spacer balances the back button so the title block stays put */}
          <View style={styles.backButton} />
        </View>

        {weeklyWorkoutPlan && scheduledCount > 0 ? (
          <>
            {/* Week summary line */}
            <Text style={styles.summary} numberOfLines={1}>
              {completedCount} of {scheduledCount} workouts done
            </Text>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              testID="full-plan-list"
            >
              {days.map((day, index) => {
                const tappable = !!day.workout && !day.isRestDay;
                return (
                  <Animated.View
                    key={day.dayKey}
                    entering={FadeInDown.delay(60 + index * 60).duration(300)}
                  >
                    <AnimatedPressable
                      onPress={
                        tappable ? () => handleDayPress(day.workout as DayWorkout) : undefined
                      }
                      disabled={!tappable}
                      scaleValue={0.98}
                      springConfig="smooth"
                      hapticType="light"
                      style={styles.dayRow}
                      accessibilityRole={tappable ? 'button' : undefined}
                      accessibilityLabel={
                        tappable
                          ? `${day.dayLabel}, ${day.workout?.title}`
                          : `${day.dayLabel}, ${day.isRestDay ? 'Rest day' : 'No workout'}`
                      }
                      testID={`full-plan-day-${day.dayKey}`}
                    >
                      {/* Day header — name + date left, status right */}
                      <View style={styles.dayHeader}>
                        <Text
                          style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}
                          numberOfLines={1}
                        >
                          {day.dayLabel} · {day.dateLabel}
                        </Text>
                        {day.isCompleted ? (
                          <View style={styles.statusDone}>
                            <Ionicons
                              name="checkmark-circle"
                              size={rf(16)}
                              color={colors.successAlt}
                            />
                            <Text style={styles.statusDoneText}>Done</Text>
                          </View>
                        ) : day.isRestDay ? (
                          <View style={styles.statusRest}>
                            <Ionicons
                              name="moon"
                              size={rf(13)}
                              color={hexToRgba(REST_DAY_VIOLET, 0.7)}
                            />
                            <Text style={styles.statusRestText}>Rest</Text>
                          </View>
                        ) : (
                          <Ionicons
                            name="chevron-forward"
                            size={rf(16)}
                            color={colors.textTertiary}
                          />
                        )}
                      </View>

                      {/* Workout title + meta */}
                      {day.isRestDay ? null : (
                        <>
                          <Text style={styles.workoutTitle} numberOfLines={1}>
                            {day.workout?.title}
                          </Text>
                          {day.meta ? (
                            <Text style={styles.workoutMeta} numberOfLines={1}>
                              {day.meta}
                            </Text>
                          ) : null}
                        </>
                      )}
                    </AnimatedPressable>
                    {/* Hairline separator between day sections */}
                    {index < days.length - 1 ? <View style={styles.separator} /> : null}
                  </Animated.View>
                );
              })}
            </ScrollView>
          </>
        ) : (
          /* Muted empty state — no plan generated yet */
          <View style={styles.emptyState} testID="full-plan-empty">
            <Ionicons name="calendar-outline" size={rf(28)} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Plan Yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a weekly workout plan from the Workout tab to see your full week here.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xs),
  },
  backButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: rbr(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(22),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    color: colors.text,
    marginTop: rp(2),
  },
  summary: {
    fontSize: rf(12),
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
  },
  listContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.xs),
    paddingBottom: rp(spacing.xxl),
  },
  dayRow: {
    paddingVertical: rp(spacing.md),
    minHeight: 44,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayLabelToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
  },
  statusDoneText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.successAlt,
  },
  statusRest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
  },
  statusRestText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: colors.textTertiary,
  },
  workoutTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: colors.text,
    marginTop: rp(spacing.xs),
  },
  workoutMeta: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  separator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: rp(spacing.lg),
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
  },
});

export default FullPlanScreen;
