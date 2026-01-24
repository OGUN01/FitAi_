/**
 * TodaysFocus Component
 * Combined workout card (eliminates duplicate) with meal plan
 * Fixes Issues #4, #10, #18, #19 - Duplicate sections, meal card design, static data
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { gradients, toLinearGradientProps } from "../../theme/gradients";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { SectionHeader } from "../common/SectionHeader";

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
    description?: string;
  };
}

interface MealInfo {
  type: "breakfast" | "lunch" | "dinner" | "snacks";
  calories: number;
  logged?: boolean;
}

interface TodaysFocusProps {
  workoutInfo: WorkoutInfo;
  meals: MealInfo[];
  workoutProgress?: number;
  onWorkoutPress: () => void;
  onMealPress?: (mealType: string) => void;
  primaryGoals?: string[];
}

export const TodaysFocus: React.FC<TodaysFocusProps> = ({
  workoutInfo,
  meals,
  workoutProgress = 0,
  onWorkoutPress,
  onMealPress,
  primaryGoals = [],
}) => {
  // Get workout icon based on type
  const getWorkoutIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!workoutInfo.hasWeeklyPlan) return "fitness-outline";
    if (workoutInfo.isRestDay) return "moon-outline";
    if (workoutInfo.isCompleted) return "checkmark-circle-outline";

    switch (workoutInfo.workoutType) {
      case "strength":
        return "barbell-outline";
      case "cardio":
        return "walk-outline";
      case "flexibility":
        return "body-outline";
      case "hiit":
        return "flash-outline";
      default:
        return "fitness-outline";
    }
  };

  // Get workout icon color
  const getWorkoutIconColor = () => {
    if (workoutInfo.isRestDay) return ResponsiveTheme.colors.info;
    if (workoutInfo.isCompleted) return ResponsiveTheme.colors.success;
    if (workoutInfo.workoutType === "cardio")
      return ResponsiveTheme.colors.error;
    if (workoutInfo.workoutType === "flexibility")
      return ResponsiveTheme.colors.success;
    if (workoutInfo.workoutType === "hiit")
      return ResponsiveTheme.colors.warning;
    return ResponsiveTheme.colors.primary;
  };

  // Get workout title
  const getWorkoutTitle = () => {
    if (!workoutInfo.hasWeeklyPlan) return "Start Your First Workout";
    if (workoutInfo.isRestDay) return "Rest Day";
    if (workoutInfo.isCompleted) return "Workout Complete!";
    return workoutInfo.workout?.title || workoutInfo.dayStatus;
  };

  // Get workout subtitle
  const getWorkoutSubtitle = () => {
    if (!workoutInfo.hasWeeklyPlan) return "Personalized based on your goals";
    if (workoutInfo.isRestDay)
      return "Recovery is just as important as training!";
    if (workoutInfo.hasWorkout) {
      return `${workoutInfo.workout?.duration || 0} min • ${workoutInfo.workout?.estimatedCalories || 0} cal`;
    }
    return "Ready for today's workout?";
  };

  // Get button text
  const getButtonText = () => {
    if (!workoutInfo.hasWeeklyPlan) return "Generate Workout";
    if (workoutInfo.isRestDay) return "View Weekly Plan";
    if (workoutInfo.hasWorkout) {
      return workoutInfo.isCompleted ? "View Details" : "Continue Workout";
    }
    return "Start Workout";
  };

  // Get meal icon
  const getMealIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "breakfast":
        return "sunny-outline";
      case "lunch":
        return "leaf-outline";
      case "dinner":
        return "restaurant-outline";
      case "snacks":
        return "nutrition-outline";
      default:
        return "restaurant-outline";
    }
  };

  // Get meal icon color
  const getMealIconColor = (type: string) => {
    switch (type) {
      case "breakfast":
        return ResponsiveTheme.colors.warning;
      case "lunch":
        return ResponsiveTheme.colors.success;
      case "dinner":
        return ResponsiveTheme.colors.primary;
      case "snacks":
        return ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <SectionHeader title="Today's Focus" />

      {/* Workout Card - Single consolidated card (fixes Issue #4) */}
      <AnimatedPressable
        onPress={onWorkoutPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="medium"
        accessibilityLabel={`Today's workout: ${getWorkoutTitle()}`}
        accessibilityRole="button"
      >
        <GlassCard
          elevation={3}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
          style={styles.workoutCard}
        >
          <View style={styles.workoutHeader}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle} numberOfLines={1}>
                {getWorkoutTitle()}
              </Text>
              <Text style={styles.workoutSubtitle} numberOfLines={1}>
                {getWorkoutSubtitle()}
              </Text>
            </View>
            <View
              style={[
                styles.workoutIcon,
                { backgroundColor: `${getWorkoutIconColor()}15` },
              ]}
            >
              <Ionicons
                name={getWorkoutIcon()}
                size={rf(28)}
                color={getWorkoutIconColor()}
              />
            </View>
          </View>

          {/* Progress bar (only show when applicable) */}
          {workoutInfo.hasWorkout &&
            !workoutInfo.isRestDay &&
            workoutProgress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${workoutProgress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {workoutProgress}% Complete
                </Text>
              </View>
            )}

          {/* Action Button */}
          <AnimatedPressable
            onPress={onWorkoutPress}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="medium"
            style={styles.actionButton}
          >
            <LinearGradient
              {...(toLinearGradientProps(
                workoutInfo.isRestDay
                  ? gradients.button.secondary
                  : gradients.button.primary,
              ) as any)}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>{getButtonText()}</Text>
              <Ionicons
                name="arrow-forward"
                size={rf(16)}
                color={ResponsiveTheme.colors.white}
              />
            </LinearGradient>
          </AnimatedPressable>
        </GlassCard>
      </AnimatedPressable>

      {/* Meal Plan Card - Redesigned (fixes Issue #10) */}
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
        style={styles.mealCard}
      >
        <Text style={styles.mealTitle}>Today's Meals</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mealScroll}
          snapToInterval={rw(90) + ResponsiveTheme.spacing.sm}
          decelerationRate="fast"
        >
          {meals.map((meal, index) => (
            <AnimatedPressable
              key={meal.type}
              onPress={() => onMealPress?.(meal.type)}
              scaleValue={0.95}
              hapticFeedback={true}
              hapticType="light"
              style={styles.mealItem}
              accessibilityLabel={`${meal.type}: ${meal.calories} calories`}
            >
              <View
                style={[
                  styles.mealIconContainer,
                  meal.logged && styles.mealIconLogged,
                ]}
              >
                <Ionicons
                  name={getMealIcon(meal.type)}
                  size={rf(24)}
                  color={getMealIconColor(meal.type)}
                />
                {meal.logged && (
                  <View style={styles.checkBadge}>
                    <Ionicons
                      name="checkmark"
                      size={rf(10)}
                      color={ResponsiveTheme.colors.white}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.mealLabel} numberOfLines={1}>
                {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
              </Text>
              <Text style={styles.mealCalories}>
                {meal.calories > 0 ? `${meal.calories} cal` : "--"}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
  workoutCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  workoutInfo: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.md,
  },
  workoutTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  workoutSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  workoutIcon: {
    width: rw(52),
    height: rw(52),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  progressBar: {
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  actionButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  actionButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },
  // Meal Card Styles - Redesigned for horizontal layout (Issue #10)
  mealCard: {
    marginTop: ResponsiveTheme.spacing.xs,
  },
  mealTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  mealScroll: {
    gap: ResponsiveTheme.spacing.sm,
    paddingRight: ResponsiveTheme.spacing.sm,
  },
  mealItem: {
    alignItems: "center",
    width: rw(70), // Reduced from 80
  },
  mealIconContainer: {
    width: rw(52), // Reduced from 80
    height: rw(52),
    borderRadius: rw(26),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    position: "relative",
  },
  mealIconLogged: {
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.success,
  },
  checkBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  mealLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
    textAlign: "center",
  },
  mealCalories: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
});

export default TodaysFocus;
