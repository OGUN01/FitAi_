import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassButton } from '../ui/aurora/GlassButton';
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from '../../theme/aurora-tokens';
import { fontFamilyForWeight } from '../../theme/fonts';
import { getLocalDateString } from '../../utils/weekUtils';
import { DateFormatters } from '../../utils/formatters/dateFormatters';
import { getIntakeSummary } from './dietViewModel';

/** Which target source drove the calorie target shown on this card.
 *  Mirrors `CalculatedMetrics.targetsSource` from useCalculatedMetrics. */
export type TargetsSource = 'goal' | 'plan' | 'goal_fallback_empty_day';

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
  /** Goal Engine Phase C: labels which target source the calorie target
   * came from so the user understands why a number is showing (goal vs
   * plan vs goal-fallback-on-empty-plan-day). Omitted = no caption. */
  targetsSource?: TargetsSource;
}

// Phase C: human-readable label for the target source. The empty-day
// fallback is the load-bearing case — previously the silent revert had
// no explanation; now the card says why it's showing the goal target.
const TARGET_SOURCE_LABEL: Record<TargetsSource, string> = {
  goal: 'Target from your goal profile',
  plan: "Target from today's plan",
  goal_fallback_empty_day: 'Goal target — no meals planned today',
};

const CompactIntakeSummaryComponent: React.FC<CompactIntakeSummaryProps> = ({
  consumedCalories,
  calorieTarget,
  mealCount,
  plannedMealCount,
  onLogMeal,
  onViewPlan,
  selectedDate,
  targetsSource,
}) => {
  // percent is clamped to 100 for the progress-bar fill, but remaining stays
  // signed so an over-target day shows the true overage (e.g. "-244") instead
  // of a misleading "0 Remaining" that hides it. Matches dietViewModel's
  // getIntakeSummary, the shared source of truth for this calculation.
  const { remaining, percent } = getIntakeSummary(consumedCalories, calorieTarget);
  // No real target set (calorieTarget <= 0, e.g. onboarding/goal not
  // completed) must never read as "over" — target(0) - consumed is always
  // negative the moment anything is logged, which would falsely claim the
  // user blew past a goal that doesn't exist yet.
  const hasTarget = calorieTarget > 0;
  const isOverTarget = hasTarget && remaining < 0;

  const isToday = !selectedDate || selectedDate === getLocalDateString();
  const title = isToday
    ? "Today's intake"
    : `${DateFormatters.weekdayShort(`${selectedDate}T12:00:00`)}, ${DateFormatters.short(`${selectedDate}T12:00:00`)} intake`;
  // Visible label stays short ("View Plan") so it fits comfortably in a
  // half-width button next to "Log Meal"; the fuller "today"/date-aware
  // phrasing lives in the accessibility label instead.
  const planButtonA11yLabel = isToday ? "View today's plan" : 'View plan';

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.mealCount} numberOfLines={2}>
            {mealCount} logged
            {plannedMealCount > 0 ? ` · ${plannedMealCount} planned` : ''}
          </Text>
          {targetsSource ? (
            <Text style={styles.targetSource} numberOfLines={2}>
              {TARGET_SOURCE_LABEL[targetsSource]}
            </Text>
          ) : null}
        </View>
        <Text
          style={[styles.percent, isOverTarget && styles.percentOver]}
          numberOfLines={1}
        >
          {percent}%
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View
          style={[styles.fill, isOverTarget && styles.fillOver, { width: `${percent}%` }]}
        />
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statColumn}>
          <Text
            style={styles.statValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {Math.round(consumedCalories)}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            Consumed kcal
          </Text>
        </View>
        <View style={[styles.statColumn, styles.statRight]}>
          <Text
            style={[styles.statValue, isOverTarget && styles.statValueOver]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {hasTarget ? Math.abs(Math.round(remaining)) : Math.round(consumedCalories)}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            {!hasTarget ? 'Logged kcal' : isOverTarget ? 'kcal over' : 'Remaining kcal'}
          </Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <GlassButton
          label={onViewPlan ? 'Log Meal' : 'Log a Meal / Food'}
          onPress={onLogMeal}
          icon="add"
          // "primary" (brand orange) — matches Log Meal's CTA color on Home
          // (EmptyMealsMessage). This button previously used "secondary"
          // (cyan) while View Plan used "primary", so the same action read
          // as a different color depending on which screen you were on.
          variant="primary"
          fullWidth
          hapticType="light"
          accessibilityLabel="Log a meal or food"
        />
        {onViewPlan ? (
          <GlassButton
            label="View Plan"
            onPress={onViewPlan}
            variant="secondary"
            fullWidth
            hapticType="light"
            accessibilityLabel={planButtonA11yLabel}
          />
        ) : null}
      </View>
    </View>
  );
};

// Memoized: DietScreen re-renders on every keystroke of its unrelated local
// input state (label-scan grams, photo weight, etc.); this component's props
// are plain primitives, so it should skip re-rendering when they haven't
// actually changed.
export const CompactIntakeSummary = React.memo(CompactIntakeSummaryComponent);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamilyForWeight('700'),
  },
  mealCount: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  targetSource: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
    fontStyle: 'italic',
  },
  percent: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('800'),
    flexShrink: 0,
  },
  percentOver: {
    color: colors.error,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  fillOver: { backgroundColor: colors.error },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statColumn: {
    flex: 1,
    minWidth: 0,
  },
  statRight: { alignItems: 'flex-end' },
  statValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('800'),
  },
  statValueOver: {
    color: colors.error,
  },
  statLabel: { color: colors.textSecondary, fontSize: fontSize.xs },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default CompactIntakeSummary;
