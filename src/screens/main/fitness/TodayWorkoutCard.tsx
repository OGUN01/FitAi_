/**
 * TodayWorkoutCard Component
 * Immersive hero card for today's scheduled workout.
 * Full-bleed image, bottom-anchored content, single gradient CTA.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing } from '../../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../../theme/fonts';
import { rf, rw, rh, rbr } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { DayWorkout } from '../../../ai';

// Category-specific hero treatment. The previous full-bleed hero image
// (assets/images/hero-workout.png) was a solid near-black placeholder that
// never varied by workout type — every category rendered the identical
// featureless tile. This replaces it with a designed diagonal gradient +
// oversized icon watermark, keyed off workout.category, so strength/cardio/
// HIIT/flexibility/rest each read as visually distinct at a glance.
type HeroCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'hiit'
  | 'yoga'
  | 'pilates'
  | 'hybrid'
  | 'rest';

const HERO_CONFIG: Record<
  HeroCategory,
  { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap }
> = {
  strength: { gradient: [colors.purple, colors.primaryDark], icon: 'barbell-outline' },
  cardio: { gradient: [colors.orange, colors.errorAlt], icon: 'heart-outline' },
  hiit: { gradient: [colors.errorAlt, colors.pink], icon: 'flash-outline' },
  flexibility: { gradient: [colors.teal, colors.cyan], icon: 'body-outline' },
  yoga: { gradient: [colors.teal, colors.cyan], icon: 'body-outline' },
  pilates: { gradient: [colors.teal, colors.cyan], icon: 'body-outline' },
  hybrid: { gradient: [colors.blue, colors.purple], icon: 'layers-outline' },
  rest: { gradient: [colors.backgroundTertiary, colors.backgroundSecondary], icon: 'moon-outline' },
};

const getHeroConfig = (
  workout: DayWorkout | null,
  isRestDay: boolean,
  hasNoExercises: boolean
): (typeof HERO_CONFIG)[HeroCategory] => {
  if (isRestDay || !workout || hasNoExercises) return HERO_CONFIG.rest;
  const category = workout.category as HeroCategory | undefined;
  return (category && HERO_CONFIG[category]) || HERO_CONFIG.strength;
};

interface TodayWorkoutCardProps {
  workout: DayWorkout | null;
  isRestDay: boolean;
  isCompleted: boolean;
  progress: number;
  /** When provided, overrides workout.estimatedCalories for the calories display.
   *  Pass actual burned calories when the workout is partially or fully complete. */
  displayCalories?: number;
  /** GAP-15: ISO string of when this workout was last completed (any week). */
  lastPerformedAt?: string;
  /** ISO timestamp of when this workout was completed THIS WEEK. Used to
   *  distinguish "Completed Today" from "Completed" (earlier in the week)
   *  so the readiness pill reflects whether the user has already trained today. */
  completedAt?: string;
  onStartWorkout: () => void;
  onViewDetails: () => void;
  onRecoveryTips?: () => void;
  selectedDay?: string;
  isToday?: boolean;
}

// Helper to format day name for display
const formatDayName = (day: string): string => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

// Map a day-of-week key ("monday" … "sunday") to its 1-based plan day number
// (Monday = Day 1 … Sunday = Day 7). Falls back to null when unknown.
const DAY_NUMBER_BY_KEY: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

// Map a JS getDay() index (0=Sun … 6=Sat) to a day key.
const DAY_KEY_BY_JS_INDEX: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// Bullet separator used between meta items (kept as a constant so it's easy to
// tweak and stays visually consistent across the card).
const META_BULLET = '   •   ';

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  workout,
  isRestDay,
  isCompleted,
  progress,
  displayCalories,
  lastPerformedAt,
  completedAt,
  onStartWorkout,
  onViewDetails,
  onRecoveryTips,
  selectedDay,
  isToday = true,
}) => {
  const getStatusConfig = () => {
    if (isCompleted) {
      // Distinguish "Completed Today" from "Completed" (earlier in the week)
      // so the status reflects whether the user has already trained today.
      const isCompletedToday =
        completedAt && new Date(completedAt).toDateString() === new Date().toDateString();
      return {
        color: colors.successAlt,
        gradient: [colors.successAlt, colors.successAltDark] as [string, string],
        label: isCompletedToday ? 'Completed Today' : 'Completed',
        buttonText: 'View Summary',
      };
    }
    if (isRestDay) {
      return {
        color: colors.primary,
        gradient: [colors.primary, colors.primaryDark] as [string, string],
        label: 'Rest Day',
        buttonText: 'Recovery Tips',
      };
    }
    // A workout object with ZERO exercises (custom-builder rest days persist
    // as { title: 'Rest Day', exercises: [] }) is NOT "Ready to Go" — starting
    // it lands on the player's "No Exercises Found" guard. Treat it as a rest
    // day: honest label + recovery CTA instead of a dead Start Workout.
    if (workout && (workout.exercises?.length ?? 0) === 0) {
      return {
        color: colors.primary,
        gradient: [colors.primary, colors.primaryDark] as [string, string],
        label: 'Rest Day',
        buttonText: 'Recovery Tips',
      };
    }
    // Unscheduled day (no workout AND not a designated rest day). Previously
    // this fell through to "Ready to Go / Start Workout", then the handler
    // showed a "No Workout Today" alert — the card lied. Show the honest
    // empty state; the CTA offers recovery guidance instead of a dead start.
    // Use a visible neutral gradient (tertiary surface) — glassSurface is 5%
    // white and renders an invisible button container on the dark hero.
    if (!workout) {
      return {
        color: colors.textSecondary,
        gradient: [colors.backgroundTertiary, colors.backgroundSecondary] as [string, string],
        label: 'No Workout Scheduled',
        buttonText: 'Recovery Tips',
      };
    }
    if (progress > 0) {
      return {
        color: colors.primary,
        gradient: [colors.primary, colors.primaryLight] as [string, string],
        label: `${progress}% Complete`,
        buttonText: 'Continue Workout',
      };
    }
    return {
      color: colors.primary,
      gradient: [colors.primary, colors.primaryLight] as [string, string],
      label: 'Ready to Go',
      buttonText: 'Start Workout',
    };
  };

  const config = getStatusConfig();
  const exerciseCount = workout?.exercises?.length || 0;
  // Zero-exercise workout object = effective rest day (see getStatusConfig).
  const hasNoExercises = workout != null && exerciseCount === 0;
  const hero = getHeroConfig(workout, isRestDay, hasNoExercises);

  // Compute the plan "Day N" label (Monday=1 … Sunday=7).
  // Prefer the workout's dayOfWeek; otherwise use the selectedDay; otherwise
  // fall back to today's real weekday when viewing "today".
  const computeDayNumber = (): number | null => {
    const dayKey =
      workout?.dayOfWeek ||
      selectedDay ||
      (isToday ? DAY_KEY_BY_JS_INDEX[new Date().getDay()] : null);
    if (!dayKey) return null;
    return DAY_NUMBER_BY_KEY[dayKey.toLowerCase()] ?? null;
  };

  const dayNumber = computeDayNumber();
  const todayLabel = dayNumber ? `TODAY • DAY ${dayNumber}` : 'TODAY';

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <View style={styles.card}>
        {/* Full-bleed hero — category-specific diagonal gradient (strength,
            cardio, HIIT, flexibility, rest each get a distinct treatment) */}
        <LinearGradient
          colors={hero.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Oversized icon watermark for visual texture (decorative only) */}
        <View style={styles.heroWatermark} pointerEvents="none">
          <Ionicons name={hero.icon} size={rf(160)} color={hexToRgba(colors.white, 0.12)} />
        </View>
        {/* Bottom-to-top scrim so text stays readable over the gradient */}
        <LinearGradient
          colors={['rgba(10,15,28,0)', 'rgba(10,15,28,0.55)', 'rgba(10,15,28,0.95)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Bottom-anchored content */}
        <View style={styles.body}>
          <AnimatedPressable
            onPress={onViewDetails}
            accessibilityRole="button"
            accessibilityLabel={`View workout details for ${isRestDay ? 'Rest & Recover' : workout?.title || "Today's Workout"}`}
            accessibilityHint="Double tap to view workout details"
            scaleValue={0.99}
            springConfig="smooth"
            hapticType="light"
          >
            {/* Eyebrow — uppercase TODAY • DAY N */}
            <Text style={styles.eyebrow} numberOfLines={1}>
              {isToday
                ? todayLabel
                : selectedDay
                  ? formatDayName(selectedDay).toUpperCase()
                  : 'TODAY'}
            </Text>

            {/* Hero title */}
            <Text style={styles.title} numberOfLines={2}>
              {isRestDay || hasNoExercises
                ? 'Rest & Recover'
                : workout?.title || (isToday ? 'No Workout Today' : 'No Workout Scheduled')}
            </Text>

            {/* Status — colored dot + text only */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: config.color }]} />
              <Text style={[styles.statusText, { color: config.color }]} numberOfLines={1}>
                {config.label}
              </Text>
            </View>

            {/* Meta — plain text row, no chips (hidden for rest days AND
                zero-exercise placeholders, which would read "0 min • 0 exercises") */}
            {!isRestDay && workout && !hasNoExercises && (
              <Text style={styles.metaRow} numberOfLines={1}>
                {`${workout.duration} min${META_BULLET}${exerciseCount} exercises${META_BULLET}${
                  displayCalories !== undefined ? displayCalories : workout.estimatedCalories || 0
                } kcal`}
              </Text>
            )}

            {/* GAP-15: Last performed context */}
            {!isRestDay && !isCompleted && lastPerformedAt && (
              <Text style={styles.lastPerformedText}>
                Last done:{' '}
                {new Date(lastPerformedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            )}

            {(isRestDay || hasNoExercises) && (
              <Text style={styles.restDaySubtitle}>
                Recovery is essential for muscle growth and preventing injury
              </Text>
            )}

            {/* Progress Bar (if in progress) */}
            {progress > 0 && progress < 100 && !isRestDay && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: config.color },
                  ]}
                />
              </View>
            )}
          </AnimatedPressable>

          {/* Single full-width gradient CTA */}
          <AnimatedPressable
            onPress={
              (isRestDay || !workout || hasNoExercises) && onRecoveryTips
                ? onRecoveryTips
                : isCompleted
                  ? onViewDetails
                  : onStartWorkout
            }
            scaleValue={0.97}
            hapticFeedback={true}
            hapticType="medium"
            style={styles.actionButton}
            accessibilityLabel={
              isRestDay || !workout || hasNoExercises
                ? 'Recovery tips'
                : isCompleted
                  ? 'View workout summary'
                  : 'Start workout'
            }
          >
            <LinearGradient
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>{config.buttonText}</Text>
              <Ionicons
                name={
                  isRestDay || !workout
                    ? 'leaf-outline'
                    : isCompleted
                      ? 'eye-outline'
                      : 'arrow-forward'
                }
                size={rf(18)}
                color={colors.white}
              />
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: rh(320),
    borderRadius: rbr(24),
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.08),
  },
  heroWatermark: {
    position: 'absolute',
    top: -rh(28),
    right: -rw(28),
  },
  body: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  eyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: rf(28),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: '800',
    color: colors.text,
    lineHeight: rf(34),
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(6),
    marginTop: spacing.sm,
  },
  statusDot: {
    width: rw(7),
    height: rw(7),
    borderRadius: rw(4),
  },
  statusText: {
    fontSize: rf(12),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metaRow: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginTop: spacing.sm,
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  restDaySubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: rf(17),
  },
  progressBar: {
    height: rh(4),
    backgroundColor: hexToRgba(colors.white, 0.12),
    borderRadius: rh(2),
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: rh(2),
  },
  // GAP-15: last performed label
  lastPerformedText: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actionButton: {
    borderRadius: rbr(16),
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
  actionButtonText: {
    fontSize: rf(16),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.3,
  },
});

export default TodayWorkoutCard;
