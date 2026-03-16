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
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { ExtraWorkoutTemplate } from "../../stores/fitness/types";

interface SuggestedWorkoutsProps {
  workouts: ExtraWorkoutTemplate[];
  onStartWorkout: (workout: ExtraWorkoutTemplate) => void;
  isGenerating?: boolean;
}

const getCategoryConfig = (category: string) => {
  switch (category?.toLowerCase()) {
    case "strength":
      return {
        icon: "barbell-outline" as const,
        gradient: ["#4ECDC4", "#44A08D"] as [string, string],
        bgColor: "rgba(78, 205, 196, 0.15)",
      };
    case "cardio":
      return {
        icon: "heart-outline" as const,
        gradient: ["#FF6B6B", "#FF8E53"] as [string, string],
        bgColor: "rgba(255, 107, 107, 0.15)",
      };
    case "hiit":
      return {
        icon: "flash-outline" as const,
        gradient: ["#f093fb", "#f5576c"] as [string, string],
        bgColor: "rgba(240, 147, 251, 0.15)",
      };
    case "flexibility":
    case "yoga":
      return {
        icon: "body-outline" as const,
        gradient: ["#FF6B35", "#E55A2B"] as [string, string],
        bgColor: "rgba(255, 107, 53, 0.15)",
      };
    default:
      return {
        icon: "fitness-outline" as const,
        gradient: ["#FF6B6B", "#FF8E53"] as [string, string],
        bgColor: "rgba(255, 107, 107, 0.15)",
      };
  }
};

const getDifficultyConfig = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      return { label: "Beginner", color: "#10b981" };
    case "intermediate":
      return { label: "Intermediate", color: "#FF8E53" };
    case "advanced":
      return { label: "Advanced", color: "#ef4444" };
    default:
      return { label: difficulty, color: ResponsiveTheme.colors.textSecondary };
  }
};

export const SuggestedWorkouts: React.FC<SuggestedWorkoutsProps> = ({
  workouts,
  onStartWorkout,
  isGenerating,
}) => {
  if (workouts.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons
            name="sparkles-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.text}
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
        snapToInterval={rw(160) + ResponsiveTheme.spacing.md}
      >
        {workouts.map((workout, index) => {
          const categoryConfig = getCategoryConfig(workout.category);
          const difficultyConfig = getDifficultyConfig(workout.difficulty);

          return (
            <AnimatedPressable
              key={workout.id}
              onPress={() => onStartWorkout(workout)}
              scaleValue={0.95}
              hapticFeedback={true}
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
                    color={ResponsiveTheme.colors.white}
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
                      color={ResponsiveTheme.colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{workout.duration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="flame-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {workout.estimatedCalories || 0} cal
                    </Text>
                  </View>
                </View>

                {/* Difficulty Badge */}
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: `${difficultyConfig.color}15` },
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

                {/* Start Button */}
                {isGenerating ? (
                  <Text style={styles.generatingText}>Generating...</Text>
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
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
    marginBottom: ResponsiveTheme.spacing.md,
  },
  title: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    minHeight: rf(36),
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(3),
  },
  metaText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: rp(3),
    borderRadius: ResponsiveTheme.borderRadius.full,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  difficultyText: {
    fontSize: rf(10),
    fontWeight: "600",
  },
  startButton: {
    width: "100%",
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    letterSpacing: 0.5,
  },
  generatingText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    paddingVertical: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },
});

export default SuggestedWorkouts;
