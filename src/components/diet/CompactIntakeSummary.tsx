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

interface CompactIntakeSummaryProps {
  consumedCalories: number;
  calorieTarget: number;
  mealCount: number;
  plannedMealCount: number;
  onLogMeal: () => void;
  onViewPlan?: () => void;
}

export const CompactIntakeSummary: React.FC<CompactIntakeSummaryProps> = ({
  consumedCalories,
  calorieTarget,
  mealCount,
  plannedMealCount,
  onLogMeal,
  onViewPlan,
}) => {
  const remaining = Math.max(0, calorieTarget - consumedCalories);
  const percent =
    calorieTarget > 0 ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>Selected-day intake</Text>
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
          accessibilityLabel="View today's plan"
          hapticType="light"
        >
          <Text style={styles.planText}>View Today&apos;s Plan</Text>
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
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  mealCount: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  percent: { color: colors.primary, fontSize: fontSize.lg, fontWeight: '800' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statRight: { alignItems: 'flex-end' },
  statValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
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
  logText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' },
  planButton: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  planText: { color: colors.white, fontSize: fontSize.md, fontWeight: '800' },
});

export default CompactIntakeSummary;
