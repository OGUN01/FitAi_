/**
 * SuggestedWorkouts Component
 * Horizontal scroll of workout suggestions based on user's plan/preferences
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../ui/aurora";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
import { ExtraWorkoutTemplate } from "../../stores/fitness/types";

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
    case "strength":
      return {
        icon: "barbell-outline" as const,
        gradient: ["#4ECDC4", "#44A08D"] as [string, string],
        // Derived from the gradient start color via hexToRgba (was a duplicate
        // rgba() literal that would drift if the gradient changed).
        bgColor: hexToRgba("#4ECDC4", 0.15),
      };
    case "cardio":
      return {
        icon: "heart-outline" as const,
        gradient: ["#FF6B6B", "#FF8E53"] as [string, string],
        bgColor: hexToRgba("#FF6B6B", 0.15),
      };
    case "hiit":
      return {
        icon: "flash-outline" as const,
        gradient: ["#f093fb", "#f5576c"] as [string, string],
        bgColor: hexToRgba("#f093fb", 0.15),
      };
    case "flexibility":
    case "yoga":
      return {
        icon: "body-outline" as const,
        gradient: ["#FF6B35", "#E55A2B"] as [string, string],
        bgColor: hexToRgba(colors.primary, 0.15),
      };
    default:
      return {
        icon: "fitness-outline" as const,
        gradient: ["#FF6B6B", "#FF8E53"] as [string, string],
        bgColor: hexToRgba("#FF6B6B", 0.15),
      };
  }
};

const getDifficultyConfig = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      // Was hardcoded "#10b981" — use the success token (single source of truth).
      return { label: "Beginner", color: colors.success };
    case "intermediate":
      // Was hardcoded "#FF8E53" — use primary.light token.
      return { label: "Intermediate", color: colors.primaryLight };
    case "advanced":
      // Was hardcoded "#ef4444" — use the error token.
      return { label: "Advanced", color: colors.error };
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
          <View style={styles.sectionHeaderLeft}>
            <Ionicons
              name="sparkles-outline"
              size={rf(18)}
              color={colors.text}
            />
            <Text style={styles.sectionTitle}>Quick Workouts</Text>
          </View>
        </View>
        <View style={styles.emptyPlaceholder}>
          <Ionicons
            name="barbell-outline"
            size={rf(20)}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyPlaceholderText}>No quick workouts</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons
            name="sparkles-outline"
            size={rf(18)}
            color={colors.text}
          />
          <Text style={styles.sectionTitle}>Quick Workouts</Text>
        </View>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={rw(160) + rp(spacing.md)}
      >
        {workouts.map((workout, _index) => {
          const categoryConfig = getCategoryConfig(workout.category);
          const difficultyConfig = getDifficultyConfig(workout.difficulty);
          const status = getTemplateStatus(workout);

          // P2-cal-ssot: prefer ACTUAL burned calories over the pre-generation
          // estimate when the workout is completed (CLAUDE.md #9). Falls back
          // to estimatedCalories for idle / in_progress / unknown.
          const actualBurned =
            status === 'completed' && getCompletedCalories
              ? getCompletedCalories(workout)
              : null;
          const displayCalories =
            actualBurned !== null
              ? actualBurned
              : workout.estimatedCalories || 0;

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
            >
              <GlassCard
                elevation={2}
                blurIntensity="light"
                padding="md"
                borderRadius="xl"
                style={styles.card}
              >
                {/* Icon */}
                <LinearGradient
                  colors={categoryConfig.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconContainer}
                >
                  <Ionicons
                    name={categoryConfig.icon}
                    size={rf(28)}
                    color={colors.white}
                  />
                </LinearGradient>

                {/* Title */}
                <Text style={styles.title} numberOfLines={2}>
                  {workout.title}
                </Text>

                {/* Meta Info */}
                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time-outline"
                      size={rf(12)}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{workout.duration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="flame-outline"
                      size={rf(12)}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {displayCalories} cal
                    </Text>
                  </View>
                </View>

                {/* Difficulty Badge */}
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: hexToRgba(difficultyConfig.color, 0.08) },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      { color: difficultyConfig.color },
                    ]}
                  >
                    {difficultyConfig.label}
                  </Text>
                </View>

                {/* Action Button — START / RESUME / COMPLETED */}
                {isGenerating && status === 'idle' ? (
                  <View style={styles.generatingRow}>
                    <AuroraSpinner size="sm" />
                    <Text style={styles.generatingText}>Generating...</Text>
                  </View>
                ) : status === 'completed' ? (
                  <View style={styles.completedButton}>
                    <Ionicons name="checkmark-circle" size={rf(13)} color={colors.successAlt} />
                    <Text style={styles.completedButtonText}>COMPLETED</Text>
                  </View>
                ) : status === 'in_progress' ? (
                  <LinearGradient
                    colors={["#f59e0b", "#d97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startButton}
                  >
                    <Ionicons name="play-circle-outline" size={rf(12)} color={colors.white} />
                    <Text style={styles.startButtonText}>RESUME</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={categoryConfig.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startButton}
                  >
                    <Text style={styles.startButtonText}>START</Text>
                  </LinearGradient>
                )}
              </GlassCard>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: rw(160),
    alignItems: "center",
  },
  iconContainer: {
    width: rw(60),
    height: rw(60),
    borderRadius: rw(30),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: rf(13),
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
    minHeight: rf(36),
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(3),
  },
  metaText: {
    fontSize: rf(10),
    color: colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(3),
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  difficultyText: {
    fontSize: rf(10),
    fontWeight: "600",
  },
  startButton: {
    width: "100%",
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: rp(4),
  },
  startButtonText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  // Solid success bg with white text — was green-on-green ~3.2:1 fail.
  completedButton: {
    width: "100%",
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: rp(4),
    backgroundColor: colors.success,
    borderWidth: 1,
    borderColor: colors.successAlt,
  },
  completedButtonText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  emptyPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyPlaceholderText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  generatingRow: {
    width: "100%",
    paddingVertical: spacing.sm,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(6),
  },
  generatingText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default SuggestedWorkouts;
