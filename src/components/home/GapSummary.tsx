/**
 * GapSummary — Goal Engine Phase C daily gap surfaces (Home).
 *
 * Two compact gap lines sit beneath the Daily Progress Rings:
 *   - Food gap: today's intake vs the resolved calorie target.
 *   - Burn gap: today's actual burn vs the active plan's planned burn for today.
 *
 * The resolved calorie target already respects `goal_targets_mode` (it comes
 * from `useCalculatedMetrics`), so the food gap reads the SAME target the
 * Nutrition ring uses — no duplicated math. `targetsSource` labels the
 * fallback case ("Goal target — no meals planned today") so an empty custom-
 * plan day is explained, not silently reverted.
 *
 * The burn gap's actual value is `realCaloriesBurned` from `useHomeLogic` —
 * the SAME wearable-precedence-resolved number the Move ring uses (watch
 * `activeCalories` wins when fresh, app MET burn otherwise) — so Home and
 * the Phase D ledger can never disagree. Planned burn is the active plan's
 * per-day-of-week value for today (0 on rest days / no plan).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { fontFamilyForWeight } from '../../theme/fonts';
import { rf, rp } from '../../utils/responsive';

/** Mirrors `CalculatedMetrics.targetsSource` from useCalculatedMetrics. */
export type TargetsSource = 'goal' | 'plan' | 'goal_fallback_empty_day';

interface GapSummaryProps {
  /** Today's consumed kcal (intake). */
  consumedCalories: number;
  /** Resolved daily calorie target (already mode-aware via useCalculatedMetrics). */
  calorieTarget: number;
  /** Today's actual burn (wearable-precedence resolved — same as the Move ring). */
  actualBurn: number;
  /** Today's planned burn from the active workout plan (per-day-of-week). */
  plannedBurn: number;
  /** Which target source drove the calorie target. Omitted = no fallback label. */
  targetsSource?: TargetsSource;
}

const formatGap = (delta: number): string =>
  delta > 0 ? `${Math.round(delta)} over` : `${Math.abs(Math.round(delta))} to go`;

const GapSummaryComponent: React.FC<GapSummaryProps> = ({
  consumedCalories,
  calorieTarget,
  actualBurn,
  plannedBurn,
  targetsSource,
}) => {
  // Only render when at least one target is meaningful. A user with no
  // onboarding data (both targets 0) sees nothing rather than a dead "0 to go".
  const hasFoodGap = calorieTarget > 0;
  const hasBurnGap = plannedBurn > 0 || actualBurn > 0;
  if (!hasFoodGap && !hasBurnGap) return null;

  const foodDelta = consumedCalories - calorieTarget; // + = over target
  const burnDelta = actualBurn - plannedBurn; // + = ahead of plan

  return (
    <View style={styles.container}>
      {hasFoodGap ? (
        <View style={styles.row}>
          <Ionicons name="restaurant-outline" size={rf(14)} color={colors.info} />
          <Text style={styles.label} numberOfLines={1}>
            Food
          </Text>
          <Text
            style={[styles.value, foodDelta > 0 && styles.valueOver]}
            numberOfLines={1}
          >
            {formatGap(foodDelta)}
          </Text>
        </View>
      ) : null}
      {hasBurnGap ? (
        <View style={styles.row}>
          <Ionicons name="flame-outline" size={rf(14)} color={colors.errorLight} />
          <Text style={styles.label} numberOfLines={1}>
            Burn
          </Text>
          <Text
            style={[styles.value, burnDelta < 0 && styles.valueUnder]}
            numberOfLines={1}
          >
            {burnDelta < 0
              ? `${Math.abs(Math.round(burnDelta))} to go`
              : `${Math.round(burnDelta)} ahead`}
          </Text>
        </View>
      ) : null}
      {targetsSource === 'goal_fallback_empty_day' ? (
        <Text style={styles.fallbackLabel} numberOfLines={2}>
          Goal target — no meals planned today
        </Text>
      ) : null}
    </View>
  );
};

export const GapSummary = React.memo(GapSummaryComponent);

const styles = StyleSheet.create({
  container: {
    marginTop: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamilyForWeight('regular'),
  },
  value: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: fontFamilyForWeight('700'),
    fontVariant: ['tabular-nums'],
  },
  valueOver: {
    color: colors.error,
  },
  valueUnder: {
    color: colors.textSecondary,
  },
  fallbackLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    fontFamily: fontFamilyForWeight('regular'),
    fontStyle: 'italic',
  },
});

export default GapSummary;
