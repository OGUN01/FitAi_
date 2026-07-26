import React from 'react';
import { DimensionValue, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { DayMeal } from '../../types/ai';
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from '../../theme/aurora-tokens';
import type { MealPlanStatus } from './dietViewModel';
import { rf } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT } from '../../utils/colors';

export interface MealPlanCardProps {
  meal: DayMeal;
  time: string;
  status: MealPlanStatus;
  progress: number;
  onPress: () => void;
}

const statusConfig = {
  completed: {
    label: 'Completed',
    color: colors.success,
    background: hexToRgba(colors.success, TINT_ALPHA_SOFT),
  },
  in_progress: {
    label: 'In Progress',
    color: colors.info,
    background: hexToRgba(colors.info, TINT_ALPHA_SOFT),
  },
  upcoming: {
    label: 'Upcoming',
    color: colors.purple,
    background: hexToRgba(colors.purple, TINT_ALPHA_SOFT),
  },
} as const;

const mealIcon = (type: DayMeal['type']) => {
  if (type === 'breakfast') return 'sunny';
  if (type === 'dinner') return 'moon';
  return 'restaurant';
};

const MealImage = ({ uri, meal }: { uri?: string; meal: DayMeal }) => {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <LinearGradient
        colors={[colors.backgroundTertiary, colors.backgroundSecondary]}
        testID={`meal-image-fallback-${meal.id}`}
        style={styles.image}
      >
        <Ionicons name={mealIcon(meal.type)} size={26} color={colors.primary} />
      </LinearGradient>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={`${meal.name} meal`}
    />
  );
};

export const MealPlanCard = React.memo(
  ({ meal, time, status, progress, onPress }: MealPlanCardProps) => {
    const config = statusConfig[status];
    const protein = meal.totalMacros?.protein ?? 0;
    const carbs = meal.totalMacros?.carbohydrates ?? 0;
    const fat = meal.totalMacros?.fat ?? 0;
    const safeProgress = Math.min(100, Math.max(0, progress || 0));

    return (
      <Pressable
        testID="meal-plan-card"
        accessibilityLabel={`Open ${meal.name}`}
        accessibilityHint={`Scheduled for ${time}`}
        accessibilityRole="button"
        style={styles.card}
        onPress={onPress}
      >
        <MealImage uri={meal.imageUrl} meal={meal} />
        <View style={styles.content}>
          <View style={styles.topLine}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={styles.type}
            >
              {meal.type}
            </Text>
            <View style={[styles.badge, { backgroundColor: config.background }]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.badgeText, { color: config.color }]}
              >
                {config.label}
              </Text>
            </View>
          </View>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
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
            <Text style={styles.protein}>{Math.round(protein)}P</Text> ·{' '}
            <Text style={styles.carbs}>{Math.round(carbs)}C</Text> ·{' '}
            <Text style={styles.fat}>{Math.round(fat)}F</Text>
          </Text>
          {status === 'in_progress' ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: safeProgress }}
              style={styles.progressTrack}
            >
              <View
                style={[styles.progressFill, { width: `${safeProgress}%` as DimensionValue }]}
              />
            </View>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  // PLAN-06: square-ish thumbnail (spec #41) rather than a 72×88 portrait.
  image: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  topLine: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  type: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: rf(fontSize.micro),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badge: {
    flexShrink: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    flexShrink: 1,
    fontSize: rf(fontSize.micro),
    fontWeight: '600',
  },
  name: {
    flexShrink: 1,
    color: colors.text,
    fontSize: rf(fontSize.sm),
    fontWeight: '700',
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  macros: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: rf(fontSize.micro),
    marginTop: spacing.xs,
  },
  protein: { color: colors.blue },
  carbs: { color: colors.amberBright },
  fat: { color: colors.successBright },
  progressTrack: {
    height: spacing.xs,
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.info,
  },
});
