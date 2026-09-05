/**
 * WeeklyMiniCalendar Component
 * Compact 7-day view - NO redundant legend
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, typography, borderRadius, border } from '../../../theme/aurora-tokens';
import { rf, rw, rp } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
  workoutCompleted: boolean;
  isRestDay: boolean;
}

interface WeeklyMiniCalendarProps {
  weekData?: DayActivity[];
  onDayPress?: (date: Date) => void;
  onViewFullCalendar?: () => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const WeeklyMiniCalendar: React.FC<WeeklyMiniCalendarProps> = ({
  weekData,
  onDayPress,
  onViewFullCalendar,
}) => {
  const week = useMemo(() => {
    // SSOT: do not fabricate workout data when the caller has none. Returning
    // an empty array renders an empty grid rather than fake Mon-Fri workouts.
    if (weekData && weekData.length === 7) return weekData;
    return [] as DayActivity[];
  }, [weekData]);

  const stats = useMemo(() => {
    const completed = week.filter((d) => d.workoutCompleted).length;
    const total = week.filter((d) => d.hasWorkout).length;
    return { completed, total };
  }, [week]);

  // No real week data → render nothing rather than an empty/misleading card.
  if (week.length === 0) return null;

  return (
    <View>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Ionicons name="calendar-outline" size={rf(14)} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              This Week
            </Text>
          </View>
          <AnimatedPressable
            onPress={onViewFullCalendar ?? undefined}
            scaleValue={0.97}
            hapticFeedback={true}
            hapticType="light"
            style={styles.statsRow}
            // Visual box was ~35x17, under the 44px WCAG touch-target
            // floor. `styles.statsRow` now carries a real minHeight:44 (see
            // that style's own comment for why hitSlop alone doesn't fix
            // this on web); hitSlop is kept too since it's a real,
            // additional expansion on native.
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`View full calendar, ${stats.completed} of ${stats.total} workouts completed`}
          >
            <Text style={styles.statsText} numberOfLines={1}>
              {stats.completed}/{stats.total}
            </Text>
            <Ionicons name="chevron-forward" size={rf(14)} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>

        {/* Week Grid */}
        <View style={styles.weekGrid}>
          {week.map((day, index) => {
            const today = new Date();
            const isToday = day.date.toDateString() === today.toDateString();
            const isPast = day.date < today && !isToday;

            let cellStyle = styles.defaultCell;
            let textColor = colors.textSecondary;

            if (isToday) {
              cellStyle = styles.todayCell;
              textColor = colors.primary;
            } else if (day.workoutCompleted) {
              cellStyle = styles.completedCell;
              textColor = colors.white;
            } else if (day.isRestDay) {
              cellStyle = styles.restCell;
            } else if (isPast && day.hasWorkout) {
              cellStyle = styles.missedCell;
            }

            return (
              <AnimatedPressable
                key={index}
                onPress={onDayPress ? () => onDayPress(day.date) : undefined}
                scaleValue={0.9}
                hapticFeedback={true}
                hapticType="light"
                style={styles.dayWrapper}
                // dayWrapper measured ~42px wide (flex:1 across 7 columns),
                // 2px short of the 44px floor. `styles.dayWrapper` now
                // carries a real minWidth:44 (see that style's own comment
                // for why hitSlop alone doesn't fix this on web); hitSlop
                // is kept too as a real, additional expansion on native.
                hitSlop={{ top: 6, bottom: 6, left: 5, right: 5 }}
                accessibilityRole="button"
                accessibilityLabel={`${day.date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}${isToday ? ', today' : ''}${
                  day.workoutCompleted
                    ? ', workout completed'
                    : day.isRestDay
                      ? ', rest day'
                      : day.hasWorkout
                        ? ', workout scheduled'
                        : ''
                }`}
              >
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]} numberOfLines={1}>
                  {DAY_LABELS[index]}
                </Text>
                <View style={[styles.dayCell, cellStyle]}>
                  {day.workoutCompleted ? (
                    // White-on-success computes to ~2.78:1, failing the 3:1
                    // icon minimum; near-black computes to ~8.6:1.
                    <Ionicons name="checkmark" size={rf(14)} color={colors.background} />
                  ) : (
                    <Text style={[styles.dayNumber, { color: textColor }]} numberOfLines={1}>
                      {day.date.getDate()}
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBg: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: hexToRgba(colors.primary, 0.07),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    // Real (not hitSlop) minHeight: hitSlop is confirmed inert on web
    // (react-native-web's View drops it — it's not in the module's own
    // prop allow-list, confirmed by reading the installed package source
    // and by an empirical elementFromPoint check). This `style` prop lands
    // directly on the real Pressable (AnimatedPressable forwards `style`
    // to its inner Pressable, `containerStyle` to the outer wrapper), so a
    // real minHeight here genuinely enlarges the touch target on web too.
    minHeight: 44,
  },
  statsText: {
    fontSize: rf(12),
    fontFamily: "Manrope_600SemiBold",
    color: colors.textSecondary,
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: rp(4),
    minHeight: 44,
    // Real (not hitSlop) minWidth — see the statsRow comment above for why
    // hitSlop alone doesn't work on web. Live-measured at 42px on a real
    // 390px viewport with ~22px of slack already free across the row's
    // gaps, so 44 fits without forcing a horizontal overflow.
    minWidth: 44,
    justifyContent: 'center',
  },
  dayLabel: {
    ...typography.variants.caption,
    color: colors.textSecondary,
  },
  todayLabel: {
    color: colors.primary,
    // Overrides dayLabel's spread-in typography.variants.caption family — a
    // bare numeric-weight style prop is a no-op (it doesn't select a bolder
    // Manrope file), so this never actually rendered bold.
    fontFamily: "Manrope_700Bold",
  },
  dayCell: {
    width: rw(34),
    height: rw(34),
    borderRadius: rw(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_700Bold",
  },
  defaultCell: {
    backgroundColor: colors.backgroundTertiary,
  },
  todayCell: {
    backgroundColor: hexToRgba(colors.primary, 0.09),
    borderWidth: 2,
    borderColor: colors.primary,
  },
  completedCell: {
    backgroundColor: colors.success,
  },
  restCell: {
    backgroundColor: hexToRgba(colors.info, 0.06),
  },
  missedCell: {
    backgroundColor: hexToRgba(colors.error, 0.06),
  },
});

export default WeeklyMiniCalendar;
