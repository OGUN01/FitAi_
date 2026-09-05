import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

import type { DayMeal } from '../../types/ai';
import { MealSchedule, getMealTime } from '../../utils/mealSchedule';
import { getMealPlanStatus, MealPlanStatus } from './dietViewModel';
import { StatusPill } from './StatusPill';
import { MealImage } from './MealImage';
import { EmptyState } from '../ui/aurora/EmptyState';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { springConfig } from '../../theme/animations';
import { rf, rw } from '../../utils/responsive';
import { fontFamilyForWeight } from '../../theme/fonts';
import { useReducedMotion } from '../../utils/accessibility/hooks';

export interface MealsTimelineProps {
  meals: DayMeal[];
  mealSchedule: MealSchedule;
  mealProgress?: Record<string, { progress: number } | null>;
  onMealPress: (meal: DayMeal) => void;
  onGeneratePlan: () => void;
  isGeneratingPlan?: boolean;
  title?: string;
  testID?: string;
  /** ISO date ("YYYY-MM-DD") of the day being viewed, so status derivation can
   * treat past days as fully overdue and future days as fully upcoming. */
  selectedDate?: string | null;
  /** Optional secondary action — "log a meal manually" link. When omitted the
   * link is not rendered (safe for parents that don't wire it up yet). */
  onLogMeal?: () => void;
}

const MEAL_TYPE_LABELS: Record<DayMeal['type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface RowProps {
  meal: DayMeal;
  mealSchedule: MealSchedule;
  status: MealPlanStatus;
  progress: number;
  isLast: boolean;
  index: number;
  onPress: (meal: DayMeal) => void;
}

// Per-card progress micro-bar fill color — mirrors StatusPill's STATUS_CONFIG
// so a scan down the timeline shows status color + fill width in one glance
// (Apple Fitness "rings at a glance" pattern).
const progressColorFor = (status: MealPlanStatus): string =>
  status === 'completed'
    ? colors.success
    : status === 'in_progress'
      ? colors.info
      : colors.surface;

const macroSplit = (meal: DayMeal): string => {
  const m = meal.totalMacros;
  if (!m) return '';
  const p = Math.round(m.protein || 0);
  const c = Math.round(m.carbohydrates || 0);
  const f = Math.round(m.fat || 0);
  return `${p}P ${c}C ${f}F`;
};

const TimelineRow = React.memo(
  ({ meal, mealSchedule, status, progress, isLast, index, onPress }: RowProps) => {
    const reducedMotion = useReducedMotion();
    const time = getMealTime(meal.type, mealSchedule);
    // The timeline dot is structural (timeline spine), not a status signal —
    // the StatusPill carries status (primary) and the progress micro-bar's
    // fill is the ambient cue. Encoding status in the dot's color too was a
    // third, redundant signal in one row.
    const dotStyle = {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.textMuted,
    };

    // Animated 2px progress micro-bar flush to the card's bottom edge.
    // Spring-driven so progress changes settle smoothly (springConfig.smooth).
    const progressSV = useSharedValue(0);
    useEffect(() => {
      const nextProgress = Math.max(0, Math.min(progress, 100)) / 100;
      progressSV.value = reducedMotion
        ? nextProgress
        : withSpring(nextProgress, springConfig.smooth);
    }, [progress, progressSV, reducedMotion]);
    const progressAnimStyle = useAnimatedStyle(() => ({
      width: `${progressSV.value * 100}%`,
    }));

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, dotStyle]} />
          {!isLast ? <View style={styles.timelineConnector} /> : null}
        </View>
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.delay(150 + index * 50).duration(350)}
          style={styles.timelineRight}
        >
          <AnimatedPressable
            onPress={() => onPress(meal)}
            scaleValue={0.97}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel={`${MEAL_TYPE_LABELS[meal.type]} - ${meal.name}`}
            testID={`meal-timeline-card-${meal.id}`}
            style={styles.rowPressable}
          >
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.delay(300 + index * 50).duration(400)}
              style={styles.mealImageWrap}
            >
              <MealImage
                uri={meal.imageUrl}
                meal={meal}
                size={rw(56)}
                testID={`meal-image-${meal.id}`}
              />
            </Animated.View>
            <View style={styles.mealInfo}>
              <View style={styles.headerRow}>
                <View style={styles.headerRowLeft}>
                  <Text style={styles.mealTypeLabel} numberOfLines={1}>
                    {MEAL_TYPE_LABELS[meal.type]}
                  </Text>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={rf(13)} color={colors.textSecondary} />
                    <Text style={styles.timeText} numberOfLines={1}>
                      {time}
                    </Text>
                  </View>
                </View>
                <StatusPill status={status} size="sm" />
              </View>
              <Text
                style={styles.mealName}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {meal.name}
              </Text>
              <View style={styles.calorieRow}>
                <Ionicons name="flame-outline" size={rf(13)} color={colors.primary} />
                <Text style={styles.calorieText} numberOfLines={1}>
                  {Math.round(meal.totalCalories || 0)} kcal
                </Text>
                <Text style={styles.macroText} numberOfLines={1}>
                  {macroSplit(meal)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={rf(18)} color={colors.textMuted} />
            {/* 2px progress micro-bar flush to the card's bottom edge — scan
                down the timeline to read each meal's fill + status color. */}
            <Animated.View
              style={[styles.progressBar, { backgroundColor: progressColorFor(status) }, progressAnimStyle]}
            />
          </AnimatedPressable>
        </Animated.View>
      </View>
    );
  }
);

// Premium hint of the upcoming meal structure: three breathing shimmer rows
// that mimic the timeline's avatar + two-line layout. Built inline (rather
// than reusing SkeletonListItem) so it stays compatible with test suites that
// mock @/utils/responsive with only { rf, rw, rp, rh } — SkeletonLoader pulls
// `rbr`/`rs` at module-load, which those mocks lack.
const ShimmerMealRow: React.FC = () => {
  const pulse = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
    } else {
      pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0.8]),
  }));

  return (
    <Animated.View style={[styles.shimmerRow, animStyle]}>
      <View style={styles.shimmerAvatar} />
      <View style={styles.shimmerLines}>
        <View style={styles.shimmerLineTitle} />
        <View style={styles.shimmerLineSub} />
      </View>
    </Animated.View>
  );
};

const ShimmerMeals: React.FC = () => (
  <View style={styles.shimmerSection}>
    <Text style={styles.shimmerLabel} numberOfLines={1}>
      Your day at a glance
    </Text>
    <View style={styles.shimmerList}>
      {[0, 1, 2].map((i) => (
        <ShimmerMealRow key={i} />
      ))}
    </View>
  </View>
);

export const MealsTimeline: React.FC<MealsTimelineProps> = ({
  meals,
  mealSchedule,
  mealProgress,
  onMealPress,
  onGeneratePlan,
  isGeneratingPlan,
  title = "Today's Meals",
  testID,
  selectedDate,
  onLogMeal,
}) => {
  const items = useMemo(
    () =>
      meals.map((meal) => ({
        meal,
        status: getMealPlanStatus(
          mealProgress?.[meal.id]?.progress ?? 0,
          getMealTime(meal.type, mealSchedule),
          selectedDate,
        ),
        progress: mealProgress?.[meal.id]?.progress ?? 0,
      })),
    [meals, mealProgress, mealSchedule, selectedDate]
  );

  const hasMeals = items.length > 0;
  const generating = Boolean(isGeneratingPlan);
  // Premium hint: when there's no plan yet (and we're not actively generating),
  // preview the structure the user will get with shimmer meal rows.
  const showShimmer = !hasMeals && !generating;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {hasMeals ? (
          <View style={styles.countPill}>
            <Text style={styles.count} numberOfLines={1}>
              {items.length} meals
            </Text>
          </View>
        ) : null}
      </View>

      {hasMeals ? (
        <View style={styles.timeline}>
          {items.map(({ meal, status, progress }, index) => (
            <TimelineRow
              key={meal.id}
              meal={meal}
              mealSchedule={mealSchedule}
              status={status}
              progress={progress}
              isLast={index === items.length - 1}
              index={index}
              onPress={onMealPress}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          {showShimmer ? <ShimmerMeals /> : null}
          <EmptyState
            icon="restaurant-outline"
            title="No meals planned"
            subtitle={
              generating
                ? 'Building your personalized plan — this usually takes a few seconds.'
                : 'Generate a personalized plan tuned to your calories, macros, and preferences, or log a meal yourself to get started.'
            }
            ctaText={generating ? 'Generating…' : 'Generate Plan'}
            onCta={generating ? undefined : onGeneratePlan}
            style={styles.emptyState}
          />
          {!generating && onLogMeal ? (
            <AnimatedPressable
              onPress={onLogMeal}
              scaleValue={0.98}
              hapticType="light"
              accessibilityRole="link"
              accessibilityLabel="Log a meal manually"
              style={styles.secondaryLink}
            >
              <Text style={styles.secondaryLinkText} numberOfLines={1}>
                or log a meal manually
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: rf(fontSize.lg),
    fontFamily: fontFamilyForWeight('bold'),
    color: colors.text,
  },
  countPill: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  count: {
    fontSize: rf(fontSize.xs),
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  timeline: {
    position: 'relative' as const,
  },
  timelineRow: {
    flexDirection: 'row' as const,
  },
  timelineLeft: {
    width: rw(20),
    alignItems: 'center' as const,
    paddingTop: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  mealImageWrap: {
    // Wrapper hosts the separate image fade-in so thumbs resolve after the
    // row slides in, rather than popping alongside the row animation.
    borderRadius: borderRadius.md,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressable: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.xs,
  },
  headerRowLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexShrink: 1,
    gap: spacing.xs,
  },
  mealTypeLabel: {
    fontSize: rf(fontSize.xs),
    fontFamily: fontFamilyForWeight('700'),
    color: colors.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  timeText: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    fontFamily: fontFamilyForWeight('600'),
  },
  mealName: {
    fontSize: rf(fontSize.md),
    fontFamily: fontFamilyForWeight('600'),
    color: colors.text,
  },
  calorieRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  calorieText: {
    fontSize: rf(fontSize.sm),
    color: colors.primary,
    fontFamily: fontFamilyForWeight('700'),
    fontVariant: ['tabular-nums'],
  },
  macroText: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    fontFamily: fontFamilyForWeight('500'),
    flexShrink: 1,
  },
  // 2px progress micro-bar — absolutely positioned flush to the card's
  // bottom edge; card overflow:hidden clips it to the rounded corners.
  progressBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    height: 2,
  },
  emptyWrap: {
    alignItems: 'stretch' as const,
  },
  emptyState: {
    paddingVertical: spacing.xl,
  },
  // Premium shimmer hint of the upcoming meal structure.
  shimmerSection: {
    marginBottom: spacing.lg,
  },
  shimmerLabel: {
    fontSize: rf(fontSize.xs),
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  shimmerList: {
    gap: spacing.md,
  },
  shimmerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  shimmerAvatar: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: colors.surface,
  },
  shimmerLines: {
    flex: 1,
    gap: spacing.xs,
  },
  shimmerLineTitle: {
    width: '55%' as const,
    height: rf(fontSize.sm),
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  shimmerLineSub: {
    width: '35%' as const,
    height: rf(fontSize.xs),
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  // Secondary action under the primary CTA — quieter text link.
  secondaryLink: {
    alignSelf: 'center' as const,
    minHeight: Math.max(rw(44), 44),
    paddingHorizontal: spacing.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: spacing.xs,
  },
  secondaryLinkText: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    fontFamily: fontFamilyForWeight('600'),
    textDecorationLine: 'underline' as const,
  },
});

export default MealsTimeline;
