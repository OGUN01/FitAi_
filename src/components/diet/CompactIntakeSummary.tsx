import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from '../../theme/aurora-tokens';
import { fontFamilyForWeight } from '../../theme/fonts';
import { getLocalDateString } from '../../utils/weekUtils';
import { DateFormatters } from '../../utils/formatters/dateFormatters';

interface CompactIntakeSummaryProps {
  consumedCalories: number;
  calorieTarget: number;
  mealCount: number;
  plannedMealCount: number;
  onLogMeal: () => void;
  onViewPlan?: () => void;
  /** ISO date the card is summarizing. Defaults to today when omitted so
   * existing callers keep the "Today" copy. */
  selectedDate?: string;
}

export const CompactIntakeSummary: React.FC<CompactIntakeSummaryProps> = ({
  consumedCalories,
  calorieTarget,
  mealCount,
  plannedMealCount,
  onLogMeal,
  onViewPlan,
  selectedDate,
}) => {
  const remaining = Math.max(0, calorieTarget - consumedCalories);
  const percent =
    calorieTarget > 0 ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100)) : 0;

  const isToday = !selectedDate || selectedDate === getLocalDateString();
  const title = isToday
    ? "Today's intake"
    : `${DateFormatters.weekdayShort(`${selectedDate}T12:00:00`)}, ${DateFormatters.short(`${selectedDate}T12:00:00`)} intake`;
  const planButtonLabel = isToday ? "View Today's Plan" : 'View Plan';
  const planButtonA11yLabel = isToday ? "View today's plan" : 'View plan';

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.mealCount}>
            {mealCount} logged
            {plannedMealCount > 0 ? ` · ${plannedMealCount} planned` : ''}
          </Text>
        </View>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statValue}>{Math.round(consumedCalories)}</Text>
          <Text style={styles.statLabel}>Consumed kcal</Text>
        </View>
        <View style={styles.statRight}>
          <Text style={styles.statValue}>{Math.round(remaining)}</Text>
          <Text style={styles.statLabel}>Remaining kcal</Text>
        </View>
      </View>
      <AnimatedPressable
        style={styles.logButton}
        onPress={onLogMeal}
        accessibilityRole="button"
        accessibilityLabel="Log a meal or food"
        hapticType="light"
      >
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text style={styles.logText}>Log a Meal / Food</Text>
      </AnimatedPressable>
      {onViewPlan ? (
        <AnimatedPressable
          style={styles.planButton}
          onPress={onViewPlan}
          accessibilityRole="button"
          accessibilityLabel={planButtonA11yLabel}
          hapticType="light"
        >
          <Text style={styles.planText}>{planButtonLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </AnimatedPressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  mealCount: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  percent: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('800'),
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statRight: { alignItems: 'flex-end' },
  statValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('800'),
    fontWeight: '800',
  },
  statLabel: { color: colors.textSecondary, fontSize: fontSize.xs },
  logButton: {
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  logText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700',
  },
  planButton: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  planText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fontFamilyForWeight('800'),
    fontWeight: '800',
  },
});

export default CompactIntakeSummary;
