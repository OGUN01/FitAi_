/**
 * TodayHero — flat editorial coach briefing at the top of the home screen.
 * Pure typography on the Aurora black background; the solid orange CTA is the
 * only warm element. Restraint is the luxury.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedPressable from '../../../components/ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from '../../../theme/aurora-tokens';
import { rf, rp } from '../../../utils/responsive';

type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'mixed';

interface TodayHeroProps {
  insightText: string;
  insightColor?: string;
  workoutInfo: {
    hasWeeklyPlan: boolean;
    isRestDay: boolean;
    isCompleted: boolean;
    hasWorkout: boolean;
    workoutType?: WorkoutType;
    workoutTitle?: string;
    duration?: number;
    exerciseCount?: number;
    estimatedCalories?: number;
  };
  workoutProgress?: number;
  onPress: () => void;
}

function capitalizeType(type?: WorkoutType): string {
  if (!type) return 'Workout';
  const map: Record<WorkoutType, string> = {
    strength: 'Strength',
    cardio: 'Cardio',
    flexibility: 'Flexibility',
    hiit: 'HIIT',
    mixed: 'Mixed',
  };
  return map[type];
}

const TodayHero: React.FC<TodayHeroProps> = ({
  insightText,
  insightColor,
  workoutInfo,
  workoutProgress = 0,
  onPress,
}) => {
  const cta = useMemo(() => {
    const { hasWeeklyPlan, isRestDay, isCompleted, hasWorkout, workoutType, workoutTitle } =
      workoutInfo;

    if (!hasWeeklyPlan) {
      return {
        label: 'Create Your Plan',
        background: colors.primary,
        textColor: '#FFFFFF',
      } as const;
    }

    if (isRestDay) {
      return {
        label: 'Plan Next Workout',
        background: colors.backgroundTertiary,
        textColor: colors.text,
      } as const;
    }

    if (isCompleted) {
      return {
        label: 'View Summary',
        background: colors.success,
        textColor: '#FFFFFF',
      } as const;
    }

    if (hasWorkout && workoutProgress > 0) {
      return {
        label: `Continue · ${Math.round(workoutProgress)}%`,
        background: colors.primary,
        textColor: '#FFFFFF',
      } as const;
    }

    if (hasWorkout) {
      const title = workoutTitle?.trim() || capitalizeType(workoutType) || 'Workout';
      return {
        label: `Start ${title}`,
        background: colors.primary,
        textColor: '#FFFFFF',
      } as const;
    }

    // hasWeeklyPlan but no workout today and not a rest day — fall through to plan action.
    return {
      label: 'Plan Next Workout',
      background: colors.backgroundTertiary,
      textColor: colors.text,
    } as const;
  }, [workoutInfo, workoutProgress]);

  const metaLine = useMemo(() => {
    const {
      hasWeeklyPlan,
      isRestDay,
      isCompleted,
      hasWorkout,
      duration,
      exerciseCount,
      estimatedCalories,
    } = workoutInfo;

    if (!hasWeeklyPlan) return null;
    if (isRestDay) return 'Recovery day · rest well';
    if (isCompleted) return 'Workout complete';
    if (!hasWorkout) return null;

    const parts: string[] = [];
    if (typeof duration === 'number') parts.push(`${duration} min`);
    if (typeof exerciseCount === 'number') parts.push(`${exerciseCount} exercises`);
    if (typeof estimatedCalories === 'number') {
      parts.push(`~${estimatedCalories} kcal`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [workoutInfo]);

  return (
    <View style={styles.container}>
      {/* Coach insight line — the emotional hook. Header above owns the
          greeting, so TodayHero opens directly with the coach line. */}
      <View style={styles.coachRow} accessibilityLabel={insightText}>
        {insightColor ? (
          <View style={[styles.insightDot, { backgroundColor: insightColor }]} />
        ) : null}
        <Text style={styles.coachText} numberOfLines={2}>
          {insightText}
        </Text>
      </View>

      {/* 3. Workout meta line */}
      {metaLine ? (
        <Text style={styles.metaText} numberOfLines={1}>
          {metaLine}
        </Text>
      ) : null}

      {/* 4. CTA button */}
      <AnimatedPressable
        scaleValue={0.98}
        hapticFeedback
        hapticType="light"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={cta.label}
        style={[styles.cta, { backgroundColor: cta.background }]}
      >
        <Text
          style={[styles.ctaText, { color: cta.textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {cta.label}
        </Text>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rp(spacing.md),
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  insightDot: {
    width: rf(5),
    height: rf(5),
    borderRadius: rf(5) / 2,
    marginTop: rf(8),
    marginRight: spacing.xs,
  },
  coachText: {
    flex: 1,
    fontFamily: typography.variants.sectionTitle.fontFamily,
    fontSize: rf(20),
    lineHeight: rf(26), // RN lineHeight is absolute points, not a CSS multiplier
    color: colors.text,
  },
  metaText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(typography.variants.caption.fontSize),
    // RN lineHeight is absolute points — the variant token now carries the
    // pre-computed absolute value (16.8 ≈ 12 × 1.4), so scale it directly.
    lineHeight: rf(typography.variants.caption.lineHeight),
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cta: {
    width: '100%',
    minHeight: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  ctaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: rf(15),
    lineHeight: 20,
    color: '#FFFFFF',
  },
});

const TodayHeroMemo = React.memo(TodayHero);

export { TodayHeroMemo as TodayHero };
export default TodayHeroMemo;
