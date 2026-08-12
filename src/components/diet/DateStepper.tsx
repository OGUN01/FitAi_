import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from '../../theme/aurora-tokens';
import { getLocalDateString } from '../../utils/weekUtils';
import { fontFamilyForWeight } from '../../theme/fonts';
import { rf, rw } from '../../utils/responsive';

interface DateStepperProps {
  selectedDate: string;
  onPrevious: () => void;
  onNext: () => void;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// 44px accessibility touch-target floor, matching the sibling pattern in
// FoodSearchSheet.tsx / MealsTimeline.tsx (Math.max(rw(44), 44)) so these
// controls never shrink below the minimum tap size on small-width devices
// (widthScale < 1).
const TOUCH_TARGET = Math.max(rw(44), 44);
const TOUCH_TARGET_RADIUS = TOUCH_TARGET / 2;

export const DateStepper: React.FC<DateStepperProps> = ({
  selectedDate,
  onPrevious,
  onNext,
  onSelectDate,
}) => {
  const selected = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1, 12)
  );

  // Upper bound: never let the user navigate past today. ISO date strings
  // ("YYYY-MM-DD") compare correctly with plain string comparison.
  const todayKey = getLocalDateString();
  const isViewingToday = selectedDate >= todayKey;

  const label = selected.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const calendarDays = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const shiftMonth = (amount: number) => {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1, 12));
  };

  const openCalendar = () => {
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
    setCalendarOpen(true);
  };

  return (
    <>
      <View style={styles.stepper}>
        <AnimatedPressable
          style={styles.arrow}
          onPress={onPrevious}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hapticType="light"
        >
          <Ionicons name="chevron-back" size={rf(22)} color={colors.text} />
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.dateButton}
          onPress={openCalendar}
          accessibilityRole="button"
          accessibilityLabel={`Choose date, currently ${label}`}
          hapticType="light"
        >
          <Ionicons name="calendar-outline" size={rf(18)} color={colors.primary} />
          <Text style={styles.dateLabel}>{label}</Text>
          <Ionicons name="chevron-down" size={rf(16)} color={colors.textSecondary} />
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.arrow, isViewingToday && styles.arrowDisabled]}
          onPress={onNext}
          disabled={isViewingToday}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          accessibilityState={{ disabled: isViewingToday }}
          hapticType="light"
        >
          <Ionicons
            name="chevron-forward"
            size={rf(22)}
            color={isViewingToday ? colors.textMuted : colors.text}
          />
        </AnimatedPressable>
      </View>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <AnimatedPressable
                style={styles.monthArrow}
                onPress={() => shiftMonth(-1)}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
              </AnimatedPressable>
              <Text style={styles.monthLabel}>
                {visibleMonth.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <AnimatedPressable
                style={styles.monthArrow}
                onPress={() => shiftMonth(1)}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={rf(20)} color={colors.text} />
              </AnimatedPressable>
            </View>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {calendarDays.map((date) => {
                const dateKey = getLocalDateString(date);
                const isSelected = dateKey === selectedDate;
                const inMonth = date.getMonth() === visibleMonth.getMonth();
                const isToday = dateKey === todayKey;
                const isFuture = dateKey > todayKey;
                return (
                  <AnimatedPressable
                    key={dateKey}
                    style={[
                      styles.day,
                      isToday && !isSelected && styles.dayToday,
                      isSelected && styles.daySelected,
                    ]}
                    onPress={() => {
                      if (isFuture) return;
                      onSelectDate(dateKey);
                      setCalendarOpen(false);
                    }}
                    disabled={isFuture}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: isFuture }}
                    accessibilityLabel={
                      isToday
                        ? `Today, ${date.toLocaleDateString()}`
                        : date.toLocaleDateString()
                    }
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dayTextMuted,
                        isFuture && styles.dayTextFuture,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <AnimatedPressable
              style={styles.closeButton}
              onPress={() => setCalendarOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
            >
              <Text style={styles.closeText}>Close</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  arrow: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  dateButton: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dateLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  calendar: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthArrow: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    width: '14.285%',
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: {
    width: '14.285%',
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH_TARGET_RADIUS,
  },
  daySelected: { backgroundColor: colors.primary },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: { color: colors.text, fontSize: fontSize.sm },
  dayTextMuted: { color: colors.textMuted },
  dayTextFuture: { color: colors.textMuted, opacity: 0.5 },
  dayTextToday: {
    color: colors.primary,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  dayTextSelected: {
    color: colors.white,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  closeButton: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  closeText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
});

export default DateStepper;
