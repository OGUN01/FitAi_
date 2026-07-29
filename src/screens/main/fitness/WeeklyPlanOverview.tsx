/**
 * WeeklyPlanOverview Component
 * Flat full-width week strip (Mon–Sun) — 2026 redesign.
 *
 *  - No card wrapper: a small uppercase "THIS WEEK" eyebrow header (with a
 *    right-aligned "View plan" text button) and 7 day cells sit directly on
 *    the screen background.
 *  - Day cell anatomy: day letter on top, date number in a circle, status dot
 *    below. States:
 *      selected  = filled primary date circle
 *      today     = accent ring around the date
 *      completed = success check dot
 *      rest      = moon icon (violet)
 *      scheduled = muted filled dot (primary when also today)
 *      none      = hollow dot
 *  - A thin 4px weekly completion bar sits under the strip.
 *
 * All completion / stale-progress detection logic is unchanged.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing } from '../../../theme/aurora-tokens';
import { rf, rw, rp, rbr } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { WeeklyWorkoutPlan } from '../../../ai';
import { DayName } from '../../../stores/appStateStore';
import { useFitnessStore } from '../../../stores/fitnessStore';
import { getCurrentWeekStart, getWeekStartForDate } from '../../../utils/weekUtils';
import { findCompletedSessionForWorkout } from '../../../utils/workoutIdentity';

interface WorkoutProgressItem {
  workoutId: string;
  progress: number;
  completedAt?: string;
}

interface WeeklyPlanOverviewProps {
  plan: WeeklyWorkoutPlan;
  workoutProgress: Record<string, WorkoutProgressItem>;
  selectedDay: string;
  onDayPress: (day: DayName) => void;
  onViewFullPlan: () => void;
  onRegeneratePlan?: () => void;
  isRegenerating?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS: DayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// rest-day violet — see note in original file; no token available.
const REST_DAY_VIOLET = '#A78BFA';

export const WeeklyPlanOverview: React.FC<WeeklyPlanOverviewProps> = ({
  plan,
  workoutProgress,
  selectedDay,
  onDayPress,
  onViewFullPlan,
  onRegeneratePlan,
  isRegenerating = false,
}) => {
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const currentWeekStart = getCurrentWeekStart();

  // Calendar date number for each day of the current week (Mon..Sun).
  const weekDates = DAY_KEYS.map((_, index) => {
    const date = new Date(`${currentWeekStart}T00:00:00`);
    date.setDate(date.getDate() + index);
    return date.getDate();
  });

  // Get day status for mini calendar
  const getDayStatus = (dayKey: string) => {
    const workout = plan.workouts?.find((w) => w.dayOfWeek?.toLowerCase() === dayKey);
    const restDayIndices = plan.restDays || [];
    const dayIndex = DAY_KEYS.indexOf(dayKey as DayName);
    const isRestDay = restDayIndices.some((d: number | string) =>
      typeof d === 'string' ? d.toLowerCase() === dayKey : d === dayIndex
    );
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
    const progress = workout
      ? completedSession
        ? 100
        : hasStaleCompletedProgress
          ? 0
          : Math.min(progressEntry?.progress ?? 0, 99)
      : 0;
    const isSelected = selectedDay === dayKey;
    const isToday = DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === dayKey;

    return {
      hasWorkout: !!workout && !isRestDay,
      isRestDay,
      isCompleted: !!completedSession,
      isSelected,
      isToday,
      progress,
    };
  };

  const statuses = DAY_KEYS.map((dayKey) => getDayStatus(dayKey));
  const scheduledCount = statuses.filter((s) => s.hasWorkout).length;
  const completedCount = statuses.filter((s) => s.isCompleted).length;
  const barPercent = scheduledCount > 0 ? (completedCount / scheduledCount) * 100 : 0;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      {/* Section header — eyebrow + actions */}
      <View style={styles.header}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          This Week
        </Text>
        <View style={styles.headerActions}>
          {onRegeneratePlan && (
            <AnimatedPressable
              onPress={onRegeneratePlan}
              disabled={isRegenerating}
              accessibilityRole="button"
              accessibilityLabel="Regenerate plan"
              accessibilityState={{ disabled: isRegenerating }}
              style={styles.regenerateButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              scaleValue={0.95}
              springConfig="snappy"
              hapticType="medium"
            >
              <Ionicons
                name={isRegenerating ? 'sync' : 'refresh'}
                size={rf(16)}
                color={isRegenerating ? colors.textSecondary : colors.text}
              />
            </AnimatedPressable>
          )}
          <AnimatedPressable
            onPress={onViewFullPlan}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="light"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.viewPlanButton}
          >
            <View style={styles.viewPlanContent}>
              <Text style={styles.viewPlanText} numberOfLines={1}>
                View plan
              </Text>
              <Ionicons name="chevron-forward" size={rf(14)} color={colors.primary} />
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Day strip — 7 flat cells directly on the background */}
      <View style={styles.dayStrip}>
        {DAYS.map((day, index) => {
          const dayKey = DAY_KEYS[index];
          const status = statuses[index];

          return (
            <AnimatedPressable
              key={dayKey}
              onPress={() => onDayPress(dayKey)}
              scaleValue={0.97}
              hapticFeedback={true}
              hapticType="light"
              style={styles.dayCell}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.dayLabel,
                  (status.isToday || status.isSelected) && styles.dayLabelActive,
                ]}
              >
                {day}
              </Text>
              <View
                style={[
                  styles.dateCircle,
                  status.isSelected && styles.dateCircleSelected,
                  status.isToday && !status.isSelected && styles.dateCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    status.isSelected && styles.dateTextSelected,
                    status.isToday && !status.isSelected && styles.dateTextToday,
                  ]}
                >
                  {weekDates[index]}
                </Text>
              </View>
              <View style={styles.dotSlot}>
                <DayDot status={status} />
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Thin weekly completion bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${barPercent}%` }]} />
      </View>
    </Animated.View>
  );
};

/** Day status shape produced by `getDayStatus`. */
interface DayStatus {
  hasWorkout: boolean;
  isRestDay: boolean;
  isCompleted: boolean;
  isSelected: boolean;
  isToday: boolean;
  progress: number;
}

/** Dot indicator below the date circle. Encodes the day's state. */
interface DayDotProps {
  status: DayStatus;
}

const DayDot: React.FC<DayDotProps> = ({ status }) => {
  if (status.isCompleted) {
    // Green filled dot with a subtle checkmark for a11y + testability.
    return (
      <View style={[styles.dotDone]}>
        <Ionicons name="checkmark" size={rf(9)} color={colors.white} />
      </View>
    );
  }
  if (status.isRestDay) {
    return <Ionicons name="moon" size={rf(11)} color={hexToRgba(REST_DAY_VIOLET, 0.7)} />;
  }
  if (status.hasWorkout) {
    // Scheduled (not done, not today) — filled muted dot.
    // Today with a workout gets the primary fill.
    return <View style={[styles.dot, status.isToday ? styles.dotToday : styles.dotScheduled]} />;
  }
  // Future / no workout — hollow dot.
  return <View style={[styles.dot, styles.dotFuture]} />;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  regenerateButton: {
    width: rw(40),
    height: rw(40),
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: rbr(20),
  },
  viewPlanButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  viewPlanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(2),
  },
  viewPlanText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.primary,
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: rp(6),
    paddingVertical: rp(spacing.xs),
  },
  dayLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  dayLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  dateCircle: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCircleSelected: {
    backgroundColor: colors.primary,
  },
  dateCircleToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dateText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  dateTextToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  dotSlot: {
    height: rp(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rbr(3),
  },
  dotToday: {
    backgroundColor: colors.primary,
  },
  dotDone: {
    width: rw(14),
    height: rw(14),
    borderRadius: rbr(7),
    backgroundColor: colors.successAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotScheduled: {
    backgroundColor: colors.glassBorder,
  },
  dotFuture: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressTrack: {
    height: 4,
    borderRadius: rbr(2),
    backgroundColor: hexToRgba(colors.text, 0.08),
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: rbr(2),
    backgroundColor: colors.primary,
  },
});

export default WeeklyPlanOverview;
