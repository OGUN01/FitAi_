import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { rw, rh, rbr, rp } from '../../utils/responsive';
import { getWeekDates } from './dietViewModel';
import { getLocalDateString } from '../../utils/weekUtils';

export interface WeekCalendarStripProps {
  selectedDate: string;
  onDateSelect: (dateStr: string) => void;
  testID?: string;
  /** Per-day completion percent keyed by date string (YYYY-MM-DD). Values
   * 0–100. Drives a small dot under each day pill: green ≥100, amber 1–99,
   * hollow for 0/undefined. Only past/today days render the dot, and dots
   * only appear at all when this prop is supplied. */
  dayCompletion?: Record<string, number>;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WeekCalendarStrip: React.FC<WeekCalendarStripProps> = ({
  selectedDate,
  onDateSelect,
  testID,
  dayCompletion,
}) => {
  const todayStr = getLocalDateString(new Date());
  const weekDates = getWeekDates(new Date(`${selectedDate}T12:00:00`));

  return (
    <Animated.View style={styles.container} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {weekDates.map((date, index) => {
          const dateStr = getLocalDateString(date);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const dayLabel = DAY_LABELS[index];
          const dayNumber = date.getDate();
          // Completion dot only for past/today (skip future days). Only
          // rendered when the parent supplies a dayCompletion map — absent
          // means no dots at all, so the strip stays clean when unused.
          const isPastOrToday = dateStr <= todayStr;
          const hasCompletion = dayCompletion !== undefined;
          const percent = hasCompletion ? dayCompletion[dateStr] : undefined;
          const completionDotStyle =
            hasCompletion && isPastOrToday
              ? percent === undefined || percent === 0
                ? styles.completionDotHollow
                : percent >= 100
                  ? styles.completionDotFull
                  : styles.completionDotPartial
              : null;

          return (
            <Animated.View
              key={dateStr}
              entering={FadeInDown.delay(200 + index * 40).duration(300)}
            >
              <AnimatedPressable
                onPress={() => onDateSelect(dateStr)}
                scaleValue={0.92}
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel} ${dayNumber}`}
                style={[
                  styles.dayPill,
                  isSelected && styles.dayPillSelected,
                  !isSelected && isToday && styles.dayPillToday,
                ]}
              >
                <Text
                  style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {dayLabel}
                </Text>
                <Text
                  style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {dayNumber}
                </Text>
                {isToday && !isSelected && <View style={styles.todayDot} />}
                {completionDotStyle ? (
                  <View style={[styles.completionDot, completionDotStyle]} />
                ) : null}
              </AnimatedPressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  scrollContent: {
    flexDirection: 'row' as const,
    gap: rp(6),
    paddingHorizontal: spacing.lg,
  },
  dayPill: {
    // rw-scaled but never below the 44pt minimum touch-target width (on
    // 320pt-class phones bare rw(44) shrinks to ~37pt).
    width: Math.max(rw(44), 44),
    height: Math.max(rh(68), 44),
    borderRadius: rbr(borderRadius.lg),
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 2,
  },
  dayPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayPillToday: {
    borderColor: colors.primary,
  },
  dayLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dayLabelSelected: {
    color: colors.white,
  },
  dateNumber: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  dateNumberSelected: {
    color: colors.white,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  completionDot: {
    width: rw(4),
    height: rw(4),
    borderRadius: rw(2),
    marginTop: 2,
  },
  completionDotFull: {
    backgroundColor: colors.success,
  },
  completionDotPartial: {
    backgroundColor: colors.warning,
  },
  completionDotHollow: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default WeekCalendarStrip;
