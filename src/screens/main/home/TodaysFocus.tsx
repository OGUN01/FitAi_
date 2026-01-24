/**
 * TodaysFocus Component
 * Compact workout card - NO redundant meal section (meals shown in rings)
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";

interface WorkoutInfo {
  hasWeeklyPlan: boolean;
  isRestDay: boolean;
  isCompleted: boolean;
  hasWorkout: boolean;
  dayStatus: string;
  workoutType?: "strength" | "cardio" | "flexibility" | "hiit" | "mixed";
  workout?: {
    title: string;
    duration: number;
    estimatedCalories: number;
    exercises?: number;
  };
}

interface TodaysFocusProps {
  workoutInfo: WorkoutInfo;
  workoutProgress?: number;
  onWorkoutPress: () => void;
}

export const TodaysFocus: React.FC<TodaysFocusProps> = ({
  workoutInfo,
  workoutProgress = 0,
  onWorkoutPress,
}) => {
  const getWorkoutIcon = (): keyof typeof Ionicons.glyphMap => {
    if (workoutInfo.isRestDay) return "bed-outline";
    if (workoutInfo.isCompleted) return "checkmark-circle";
    switch (workoutInfo.workoutType) {
      case "strength":
        return "barbell-outline";
      case "cardio":
        return "heart-outline";
      case "flexibility":
        return "body-outline";
      case "hiit":
        return "flash-outline";
      default:
        return "fitness-outline";
    }
  };

  const getWorkoutColor = () => {
    if (workoutInfo.isRestDay) return ResponsiveTheme.colors.info;
    if (workoutInfo.isCompleted) return ResponsiveTheme.colors.success;
    return ResponsiveTheme.colors.primary;
  };

  const getWorkoutTitle = () => {
    if (!workoutInfo.hasWeeklyPlan) return "Create Your Plan";
    if (workoutInfo.isRestDay) return "Rest Day";
    if (workoutInfo.isCompleted) return "Workout Complete";
    return workoutInfo.workout?.title || "Today's Workout";
  };

  const getWorkoutSubtitle = () => {
    if (!workoutInfo.hasWeeklyPlan)
      return "Generate a personalized workout plan";
    if (workoutInfo.isRestDay) return "Recovery is essential for progress";
    if (workoutInfo.isCompleted) return "Great job! You crushed it today";
    if (workoutInfo.hasWorkout && workoutInfo.workout) {
      const parts = [];
      if (workoutInfo.workout.duration)
        parts.push(`${workoutInfo.workout.duration} min`);
      if (workoutInfo.workout.exercises)
        parts.push(`${workoutInfo.workout.exercises} exercises`);
      if (workoutInfo.workout.estimatedCalories)
        parts.push(`~${workoutInfo.workout.estimatedCalories} cal`);
      return parts.join(" • ") || "Ready to start";
    }
    return "Ready when you are";
  };

  const getButtonText = () => {
    if (!workoutInfo.hasWeeklyPlan) return "Get Started";
    if (workoutInfo.isRestDay) return "View Plan";
    if (workoutInfo.isCompleted) return "View Summary";
    if (workoutProgress > 0) return "Continue";
    return "Start Workout";
  };

  const color = getWorkoutColor();

  return (
    <AnimatedPressable
      onPress={onWorkoutPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="medium"
    >
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        <View style={styles.container}>
          {/* Left: Icon */}
          <View
            style={[styles.iconContainer, { backgroundColor: `${color}12` }]}
          >
            <Ionicons name={getWorkoutIcon()} size={rf(24)} color={color} />
          </View>

          {/* Middle: Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {getWorkoutTitle()}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {getWorkoutSubtitle()}
            </Text>

            {/* Progress bar (only if in progress) */}
            {workoutProgress > 0 &&
              workoutProgress < 100 &&
              !workoutInfo.isRestDay && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${workoutProgress}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color }]}>
                    {workoutProgress}%
                  </Text>
                </View>
              )}
          </View>

          {/* Right: Button */}
          <View style={[styles.actionButton, { backgroundColor: color }]}>
            <Ionicons
              name={workoutInfo.isCompleted ? "eye-outline" : "play"}
              size={rf(16)}
              color="#fff"
            />
          </View>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
  },
  iconContainer: {
    width: rw(52),
    height: rw(52),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  subtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rh(2),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rh(2),
  },
  progressText: {
    fontSize: rf(10),
    fontWeight: "700",
  },
  actionButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TodaysFocus;
