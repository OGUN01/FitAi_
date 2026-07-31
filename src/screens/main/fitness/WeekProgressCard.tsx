/**
 * WeekProgressCard Component
 *
 * Single source of truth for weekly workout progress on the Fitness dashboard.
 * REDESIGNED (2026): slim FLAT stats row — no card, no border, transparent
 * background. A "WEEK N" eyebrow + progress ring on the left, and plain
 * stacked stats (X/Y workouts, weekly kcal) to the right. Reads as one
 * cohesive section with the flat day strip in WeeklyPlanOverview below it.
 *
 * All displayed numbers are preserved: weekNumber, completedWorkouts,
 * totalWorkouts, weeklyCalories, progressPercent.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ProgressRing } from '../../../components/ui/aurora/ProgressRing';
import { flatColors as colors, spacing } from '../../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../../theme/fonts';
import { rf, rw, rp } from '../../../utils/responsive';

export interface WeekProgressCardProps {
  weekNumber: number;
  completedWorkouts: number;
  totalWorkouts: number;
  /** Actual calories burned this week from completed sessions (no estimates). */
  weeklyCalories: number;
  /** 0-100, derived from completedWorkouts/totalWorkouts. */
  progressPercent: number;
}

export const WeekProgressCard: React.FC<WeekProgressCardProps> = ({
  weekNumber,
  completedWorkouts,
  totalWorkouts,
  weeklyCalories,
  progressPercent,
}) => {
  const ringProgress = totalWorkouts > 0 ? progressPercent : 0;
  const ringSize = rw(72);
  const ringStroke = rw(6);

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.container}>
      {/* Left: thin progress ring with % in the center */}
      <ProgressRing
        progress={ringProgress}
        size={ringSize}
        strokeWidth={ringStroke}
        color={colors.primary}
        backgroundColor={colors.glassSurface}
        showText={false}
        animated={true}
      >
        <View style={styles.ringCenter}>
          <Text
            style={styles.ringValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {Math.round(progressPercent)}%
          </Text>
        </View>
      </ProgressRing>

      {/* Right: eyebrow + plain stacked stats */}
      <View style={styles.statsColumn}>
        <Text style={styles.weekEyebrow} numberOfLines={1}>
          Week {weekNumber}
        </Text>
        <Text
          style={styles.workoutsValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {completedWorkouts}/{totalWorkouts} workouts
        </Text>
        <Text style={styles.kcalLabel} numberOfLines={1}>
          {Math.round(weeklyCalories).toLocaleString('en-US')} kcal burned
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.lg),
    paddingVertical: rp(spacing.sm),
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: rf(16),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    color: colors.text,
  },
  statsColumn: {
    flex: 1,
    minWidth: 0,
    gap: rp(spacing.xs),
  },
  weekEyebrow: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  workoutsValue: {
    fontSize: rf(17),
    fontWeight: '700',
    color: colors.text,
  },
  kcalLabel: {
    fontSize: rf(13),
    fontWeight: '500',
    color: colors.textTertiary,
  },
});

export default WeekProgressCard;
