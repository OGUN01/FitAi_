/**
 * DailyProgressRings Component
 * Premium Apple Fitness-style activity rings — the hero card of the home screen.
 * Concentric Move/Exercise/Nutrition/Steps rings with a hero overall % score
 * at the center and a calm stat stack to the right. Same data, same props.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedReaction,
  runOnJS,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, typography, borderRadius, border } from '../../../theme/aurora-tokens';
import { rf, rw, rp } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring configuration — the four Aurora ring colors (flat token strokes)
const RINGS = {
  move: { color: colors.errorLight, icon: 'flame' as const },
  exercise: {
    color: colors.success,
    icon: 'barbell' as const,
  },
  nutrition: {
    color: colors.info,
    icon: 'restaurant' as const,
  },
  steps: {
    color: colors.primary,
    icon: 'footsteps' as const,
  },
};

interface DailyProgressRingsProps {
  // Actual values (not percentages)
  caloriesBurned: number;
  caloriesGoal: number;
  workoutMinutes: number;
  workoutGoal: number;
  mealsLogged: number;
  mealsGoal: number;
  // Steps (from Health Connect/HealthKit)
  steps?: number;
  stepsGoal?: number;
  onPress?: () => void;
}

// Single Ring Component
const Ring: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  delay?: number;
}> = ({ progress, size, strokeWidth, color, delay = 0 }) => {
  const animatedProgress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  useEffect(() => {
    animatedProgress.value = withDelay(
      delay,
      withSpring(Math.min(progress, 100), { damping: 15, stiffness: 80 })
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * animatedProgress.value) / 100,
  }));

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={hexToRgba(color, 0.08)}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
};

export const DailyProgressRings: React.FC<DailyProgressRingsProps> = ({
  caloriesBurned,
  caloriesGoal,
  workoutMinutes,
  workoutGoal,
  mealsLogged,
  mealsGoal,
  steps = 0,
  stepsGoal = 0,
  onPress,
}) => {
  // Check for empty/unset goals state
  const hasNoGoals = caloriesGoal === 0 && workoutGoal === 0 && mealsGoal === 0;

  // Calculate percentages - guard against division by zero (show 0 instead of NaN).
  // Hoisted ABOVE the hooks + early return so overallScore is available to the
  // count-up hook (rules-of-hooks: all hooks must run unconditionally).
  const moveProgress = caloriesGoal > 0 ? Math.min((caloriesBurned / caloriesGoal) * 100, 100) : 0;
  const exerciseProgress =
    workoutGoal > 0 ? Math.min((workoutMinutes / workoutGoal) * 100, 100) : 0;
  const nutritionProgress = mealsGoal > 0 ? Math.min((mealsLogged / mealsGoal) * 100, 100) : 0;
  const stepsProgress = stepsGoal > 0 ? Math.min((steps / stepsGoal) * 100, 100) : 0;
  // Only include steps in overall score if user has wearable data (steps > 0 or stepsGoal > 0)
  const hasStepsData = steps > 0 || stepsGoal > 0;
  const activeRingCount = hasStepsData ? 4 : 3;
  const overallScore =
    Math.round(
      (moveProgress + exerciseProgress + nutritionProgress + (hasStepsData ? stepsProgress : 0)) /
        activeRingCount
    ) || 0;

  // Breathing center score — a slow, tiny scale pulse so the hero number feels
  // alive (paired with the glow, the rings "emit" + "breathe"). Amplitude is
  // deliberately small (1 → 1.035) and slow (3.8s) — premium calm, not gimmick.
  // Hooks declared ABOVE the hasNoGoals early return so hook count is stable
  // across the empty→filled transition (rules-of-hooks). Honors reduce-motion:
  // disables entirely for a11y + automation.
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(breath);
    };
  }, [reduceMotion, breath]);
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  // Count-up score — the hero % ticks 0 → overallScore over 1.2s on mount,
  // paired with the staggered ring sweep so the number "arrives" as the rings
  // fill. Re-runs if overallScore changes mid-day (meal/workout logged). Honors
  // reduce-motion: snaps to the final value instantly.
  // NOTE: the value is bridged to JS state instead of an animatedProps `text`
  // prop — reanimated's `text` prop only paints on TextInput, so on Android the
  // hero number never rendered (observed on ColorOS, old arch).
  const displayScore = useSharedValue(0);
  const [scoreText, setScoreText] = useState('0');
  useEffect(() => {
    if (reduceMotion) {
      displayScore.value = overallScore;
      return;
    }
    displayScore.value = withTiming(overallScore, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    return () => {
      cancelAnimation(displayScore);
    };
  }, [reduceMotion, overallScore, displayScore]);
  useAnimatedReaction(
    () => Math.round(displayScore.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setScoreText)(String(current));
      }
    }
  );

  // Show empty state when goals are not set
  if (hasNoGoals) {
    return (
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel="Set your goals"
      >
        <View style={styles.surface}>
          <View style={styles.emptyStateContainer}>
            <Ionicons name="fitness-outline" size={rf(48)} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle} numberOfLines={1}>
              Set Your Goals
            </Text>
            <Text style={styles.emptyStateText} numberOfLines={2}>
              Complete your profile to track daily progress
            </Text>
            <View style={styles.emptyStateCta}>
              <Text style={styles.emptyStateCtaText}>Complete Profile</Text>
              <Ionicons name="chevron-forward" size={rf(14)} color={colors.white} />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // Ring sizes — luxury hero scale. One centered focal point, generous air.
  const outerSize = rw(180); // Move (calories) — the hero ring
  const middleSize = rw(142); // Exercise (workout)
  const innerSize = rw(104); // Nutrition (meals)
  const innermostSize = rw(70); // Steps
  const strokeWidth = rw(12); // Bold, confident rings
  const innerStrokeWidth = rw(8); // Slightly thinner for the innermost ring

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel={`Daily progress ${overallScore}%`}
      testID="daily-progress-rings"
    >
      <View style={styles.surface}>
        <View style={styles.container}>
          {/* Rings — the single centered focal point */}
          <View style={styles.ringsHero}>
            <View style={[styles.ringsContainer, { width: outerSize, height: outerSize }]}>
              <Ring
                progress={moveProgress}
                size={outerSize}
                strokeWidth={strokeWidth}
                color={RINGS.move.color}
                delay={0}
              />
              <View
                style={[
                  styles.ringOverlay,
                  {
                    width: middleSize,
                    height: middleSize,
                    top: (outerSize - middleSize) / 2,
                    left: (outerSize - middleSize) / 2,
                  },
                ]}
              >
                <Ring
                  progress={exerciseProgress}
                  size={middleSize}
                  strokeWidth={strokeWidth}
                  color={RINGS.exercise.color}
                  delay={80}
                />
              </View>
              <View
                style={[
                  styles.ringOverlay,
                  {
                    width: innerSize,
                    height: innerSize,
                    top: (outerSize - innerSize) / 2,
                    left: (outerSize - innerSize) / 2,
                  },
                ]}
              >
                <Ring
                  progress={nutritionProgress}
                  size={innerSize}
                  strokeWidth={innerStrokeWidth}
                  color={RINGS.nutrition.color}
                  delay={160}
                />
              </View>
              <View
                style={[
                  styles.ringOverlay,
                  {
                    width: innermostSize,
                    height: innermostSize,
                    top: (outerSize - innermostSize) / 2,
                    left: (outerSize - innermostSize) / 2,
                  },
                ]}
              >
                <Ring
                  progress={stepsProgress}
                  size={innermostSize}
                  strokeWidth={innerStrokeWidth}
                  color={RINGS.steps.color}
                  delay={240}
                />
              </View>
              <Animated.View style={[styles.centerContent, breathStyle]}>
                <Text
                  style={styles.scoreText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}
                >
                  {scoreText}
                </Text>
                <Text style={styles.scoreLabel} numberOfLines={1}>
                  %
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Stats — quiet chip row below the hero, supporting not competing */}
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name={RINGS.move.icon} size={rf(13)} color={RINGS.move.color} />
              <Text
                style={styles.chipValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {caloriesBurned}
                <Text style={styles.chipUnit}>/{caloriesGoal > 0 ? caloriesGoal : '--'}</Text>
              </Text>
              <Text style={styles.chipLabel} numberOfLines={1}>
                Move
              </Text>
            </View>
            <View style={styles.chipDivider} />
            <View style={styles.chip}>
              <Ionicons name={RINGS.exercise.icon} size={rf(13)} color={RINGS.exercise.color} />
              <Text
                style={styles.chipValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {workoutMinutes}
                <Text style={styles.chipUnit}>/{workoutGoal > 0 ? workoutGoal : '--'}</Text>
              </Text>
              <Text style={styles.chipLabel} numberOfLines={1}>
                Exercise
              </Text>
            </View>
            <View style={styles.chipDivider} />
            <View style={styles.chip}>
              <Ionicons name={RINGS.nutrition.icon} size={rf(13)} color={RINGS.nutrition.color} />
              <Text
                style={styles.chipValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {mealsLogged}
                <Text style={styles.chipUnit}>/{mealsGoal > 0 ? mealsGoal : '--'}</Text>
              </Text>
              <Text style={styles.chipLabel} numberOfLines={1}>
                Nutrition
              </Text>
            </View>
            {hasStepsData ? (
              <>
                <View style={styles.chipDivider} />
                <View style={styles.chip}>
                  <Ionicons name={RINGS.steps.icon} size={rf(13)} color={RINGS.steps.color} />
                  <Text
                    style={styles.chipValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {steps.toLocaleString()}
                    <Text style={styles.chipUnit}>/{stepsGoal.toLocaleString()}</Text>
                  </Text>
                  <Text style={styles.chipLabel} numberOfLines={1}>
                    Steps
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  // Flat Editorial-Dark surface replacing the former GlassCard (no blur, no
  // elevation). Depth comes from the 1px hairline border on a surface[1] fill.
  surface: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.md),
  },
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyStateText: {
    ...typography.variants.caption2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Explicit tap affordance — a solid-color pill, matching the CTA pattern
  // used by every other empty state on Home (EmptyMealsMessage, EmptyCalendarMessage).
  emptyStateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  emptyStateCtaText: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_700Bold',
    color: colors.white,
  },
  ringsHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  ringsContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOverlay: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...typography.variants.heroStat,
    color: colors.text,
    fontSize: rf(38),
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    ...typography.variants.caption,
    color: colors.textTertiary,
    marginTop: -spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chipDivider: {
    width: 1,
    backgroundColor: border.subtle,
    marginVertical: spacing.xs,
  },
  chipValue: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_700Bold',
    fontSize: rf(14),
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  chipUnit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: rf(11),
    fontWeight: '500',
    color: colors.textTertiary,
  },
  chipLabel: {
    ...typography.variants.caption,
    fontSize: rf(12),
    color: colors.textSecondary,
  },
});

export default DailyProgressRings;
