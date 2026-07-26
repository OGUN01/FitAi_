import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DayMeal } from '../../types/ai';
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from '../../theme/aurora-tokens';

export interface DailyMealListProps {
  title: string;
  meals: DayMeal[];
  status: 'logged' | 'planned';
}

export const DailyMealList = React.memo(({ title, meals, status }: DailyMealListProps) => (
  <View style={styles.section}>
    <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
      {title}
    </Text>
    {meals.map((meal) => (
      <View key={meal.id} style={styles.row}>
        <View style={styles.info}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={styles.name}
          >
            {meal.name || meal.type}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={styles.macros}
          >
            {Math.round(meal.totalCalories || 0)} kcal ·{' '}
            {Math.round(meal.totalMacros?.protein || 0)}P ·{' '}
            {Math.round(meal.totalMacros?.carbohydrates || 0)}C ·{' '}
            {Math.round(meal.totalMacros?.fat || 0)}F
          </Text>
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={status === 'logged' ? styles.logged : styles.planned}
        >
          {status === 'logged' ? 'Logged' : 'Planned'}
        </Text>
      </View>
    ))}
  </View>
));

const styles = StyleSheet.create({
  section: {
    minWidth: 0,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  row: {
    minHeight: 56,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  macros: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: fontSize.micro,
    marginTop: spacing.xxs,
  },
  logged: {
    flexShrink: 0,
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  planned: {
    flexShrink: 0,
    color: colors.purple,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
});
