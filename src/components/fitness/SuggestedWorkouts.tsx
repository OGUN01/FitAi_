/**
 * SuggestedWorkouts Component
 *
 * Horizontal snap carousel of quick-workout suggestions (Apple Fitness+ /
 * Nike Training Club flat-card language). Heavy glass chrome removed:
 *  - Top: category gradient "image" area, rounded rbr(16), with centered icon
 *  - Below: title + meta as PLAIN TEXT (no inner card wrapper)
 *  - Status badge only when meaningful (in-progress / completed)
 *
 * Props, data logic (calorie SSoT, status derivation, press handlers), and
 * snap-scroll behavior are unchanged from the previous chrome-heavy version.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { AuroraSpinner } from '../ui/aurora';
import { flatColors as colors, spacing } from '../../theme/aurora-tokens';
import { rf, rw, rp, rbr } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { ExtraWorkoutTemplate } from '../../stores/fitness/types';

interface SuggestedWorkoutsProps {
  workouts: ExtraWorkoutTemplate[];
  onStartWorkout: (workout: ExtraWorkoutTemplate) => void;
  onResumeWorkout: (workout: ExtraWorkoutTemplate) => void;
  getTemplateStatus: (workout: ExtraWorkoutTemplate) => 'idle' | 'in_progress' | 'completed';
  /**
   * P2-cal-ssot: returns the ACTUAL calories burned for a completed extra
   * workout today, or null. When provided and non-null, overrides
   * workout.estimatedCalories (the pre-generation display-only estimate).
   * CLAUDE.md #9: actual calories come from completedSession.caloriesBurned.
   */
  getCompletedCalories?: (workout: ExtraWorkoutTemplate) => number | null;
  isGenerating?: boolean;
}

const getCategoryConfig = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'strength':
      return {
        icon: 'barbell-outline' as const,
        gradient: [colors.teal, colors.successAltDark] as [string, string],
      };
    case 'cardio':
      return {
        icon: 'heart-outline' as const,
        gradient: [colors.error, colors.primaryLight] as [string, string],
      };
    case 'hiit':
      return {
        icon: 'flash-outline' as const,
        gradient: [colors.pink, colors.purple] as [string, string],
      };
    case 'flexibility':
    case 'yoga':
      return {
        icon: 'body-outline' as const,
        gradient: [colors.primary, colors.primaryDark] as [string, string],
      };
    default:
      return {
        icon: 'fitness-outline' as const,
        gradient: [colors.error, colors.primaryLight] as [string, string],
      };
  }
};

const getDifficultyConfig = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      // Was hardcoded "#10b981" — use the success token (single source of truth).
      return { label: 'Beginner', color: colors.success };
    case 'intermediate':
      // Was hardcoded "#FF8E53" — use primary.light token.
      return { label: 'Intermediate', color: colors.primaryLight };
    case 'advanced':
      // Was hardcoded "#ef4444" — use the error token.
      return { label: 'Advanced', color: colors.error };
    default:
      return { label: difficulty, color: colors.textSecondary };
  }
};

export const SuggestedWorkouts: React.FC<SuggestedWorkoutsProps> = ({
  workouts,
  onStartWorkout,
  onResumeWorkout,
  getTemplateStatus,
  getCompletedCalories,
  isGenerating,
}) => {
  if (workouts.length === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>QUICK WORKOUTS</Text>
        </View>
        <View style={styles.emptyPlaceholder}>
          <Ionicons name="barbell-outline" size={rf(20)} color={colors.textTertiary} />
          <Text style={styles.emptyPlaceholderText}>No quick workouts</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      {/* Section Header — uppercase letterspaced muted label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>QUICK WORKOUTS</Text>
      </View>

      {/* Horizontal snap carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={rw(160) + rp(spacing.md)}
      >
        {workouts.map((workout) => {
          const categoryConfig = getCategoryConfig(workout.category);
          const difficultyConfig = getDifficultyConfig(workout.difficulty);
          const status = getTemplateStatus(workout);

          // P2-cal-ssot: prefer ACTUAL burned calories over the pre-generation
          // estimate when the workout is completed (CLAUDE.md #9). Falls back
          // to estimatedCalories for idle / in_progress / unknown.
          const actualBurned =
            status === 'completed' && getCompletedCalories ? getCompletedCalories(workout) : null;
          const displayCalories =
            actualBurned !== null ? actualBurned : workout.estimatedCalories || 0;

          const handlePress = () => {
            if (status === 'in_progress') onResumeWorkout(workout);
            else if (status === 'idle') onStartWorkout(workout);
          };

          return (
            <AnimatedPressable
              key={workout.id}
              onPress={handlePress}
              scaleValue={status === 'completed' ? 1 : 0.95}
              hapticFeedback={status !== 'completed'}
              hapticType="medium"
              style={styles.card}
            >
              {/* Top: gradient "image" area, rounded rbr(16) */}
              <View style={styles.imageArea}>
                <LinearGradient
                  colors={categoryConfig.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  <Ionicons name={categoryConfig.icon} size={rf(34)} color={colors.white} />
                </LinearGradient>

                {/* Status badge overlay — only when meaningful */}
                {status === 'in_progress' && (
                  <View style={[styles.statusBadge, styles.inProgressBadge]}>
                    <Ionicons name="play-circle-outline" size={rf(11)} color={colors.white} />
                    <Text style={styles.statusBadgeText}>RESUME</Text>
                  </View>
                )}
                {status === 'completed' && (
                  <View style={[styles.statusBadge, styles.completedBadge]}>
                    <Ionicons name="checkmark-circle" size={rf(11)} color={colors.white} />
                    <Text style={styles.statusBadgeText}>DONE</Text>
                  </View>
                )}

                {/* Generating overlay — spinner while an idle card is generating */}
                {isGenerating && status === 'idle' && (
                  <View style={styles.generatingOverlay}>
                    <AuroraSpinner size="sm" />
                  </View>
                )}
              </View>

              {/* Below: plain text title + meta (no inner card wrapper) */}
              <View style={styles.textArea}>
                <Text style={styles.title} numberOfLines={2}>
                  {workout.title}
                </Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {workout.duration} min • {displayCalories} cal
                </Text>
                <Text
                  style={[styles.difficultyText, { color: difficultyConfig.color }]}
                  numberOfLines={1}
                >
                  {difficultyConfig.label}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: rw(160),
  },
  imageArea: {
    width: '100%',
    height: rw(120),
    borderRadius: rbr(16),
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: rp(spacing.sm),
    left: rp(spacing.sm),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(3),
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(3),
    borderRadius: rbr(8),
    minHeight: rf(20),
  },
  inProgressBadge: {
    backgroundColor: hexToRgba('#f59e0b', 0.92),
  },
  completedBadge: {
    backgroundColor: hexToRgba(colors.success, 0.92),
  },
  statusBadgeText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.4,
  },
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: hexToRgba(colors.background, 0.55),
  },
  textArea: {
    marginTop: spacing.sm,
    paddingHorizontal: rp(2),
  },
  title: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.text,
    minHeight: rf(36),
  },
  metaText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: rp(3),
  },
  difficultyText: {
    fontSize: rf(11),
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: rp(2),
  },
  emptyPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyPlaceholderText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
});

export default SuggestedWorkouts;
