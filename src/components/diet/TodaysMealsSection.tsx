/**
 * TodaysMealsSection Component
 * Displays today's planned meals with status indicators
 * Fixes Issue #14 - Adds proper status badges for meal completion
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";

// Meal type configuration
const MEAL_CONFIG = {
  breakfast: {
    icon: "sunny-outline" as const,
    color: ResponsiveTheme.colors.warning,
    time: "8:00 AM",
    gradient: [ResponsiveTheme.colors.warning, "#FFB74D"],
  },
  lunch: {
    icon: "restaurant-outline" as const,
    color: ResponsiveTheme.colors.success,
    time: "1:00 PM",
    gradient: [ResponsiveTheme.colors.success, ResponsiveTheme.colors.successLight],
  },
  dinner: {
    icon: "moon-outline" as const,
    color: ResponsiveTheme.colors.primary,
    time: "7:00 PM",
    gradient: [ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryLight],
  },
  snack: {
    icon: "nutrition-outline" as const,
    color: ResponsiveTheme.colors.errorLight,
    time: "4:00 PM",
    gradient: [ResponsiveTheme.colors.errorLight, "#FF8E53"],
  },
};

interface Meal {
  id: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCompleted?: boolean;
  progress?: number;
}

interface TodaysMealsSectionProps {
  meals: Meal[];
  onMealPress: (meal: Meal) => void;
  onStartMeal: (meal: Meal) => void;
  onGeneratePlan?: () => void;
  isLoading?: boolean;
}

// Single Meal Card
const MealCard: React.FC<{
  meal: Meal;
  index: number;
  onPress: () => void;
  onStart: () => void;
}> = ({ meal, index, onPress, onStart }) => {
  const config = MEAL_CONFIG[meal.type] || MEAL_CONFIG.lunch;
  const isCompleted = meal.isCompleted || meal.progress === 100;

  return (
    <Animated.View entering={FadeInRight.duration(400).delay(100 + index * 80)}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
      >
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="md"
          borderRadius="lg"
          style={styles.mealCard}
        >
          <View style={styles.mealContent}>
            {/* Icon with gradient background */}
            <View
              style={[
                styles.mealIconContainer,
                { backgroundColor: `${config.color}15` },
              ]}
            >
              <Ionicons name={config.icon} size={rf(22)} color={config.color} />
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark" size={rf(10)} color={ResponsiveTheme.colors.white} />
                </View>
              )}
            </View>

            {/* Meal Info */}
            <View style={styles.mealInfo}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName} numberOfLines={1}>
                  {meal.name}
                </Text>
                <View
                  style={[
                    styles.timeBadge,
                    { backgroundColor: `${config.color}15` },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={rf(10)}
                    color={config.color}
                  />
                  <Text style={[styles.timeText, { color: config.color }]}>
                    {config.time}
                  </Text>
                </View>
              </View>

              <Text style={styles.mealCalories}>{meal.calories} cal</Text>

              {/* Macro badges */}
              <View style={styles.macroBadges}>
                <View
                  style={[
                    styles.macroBadge,
                    { backgroundColor: `${ResponsiveTheme.colors.errorLight}1F` },
                  ]}
                >
                  <Text style={[styles.macroBadgeText, { color: ResponsiveTheme.colors.errorLight }]}>
                    P {Math.round(meal.protein)}g
                  </Text>
                </View>
                <View
                  style={[
                    styles.macroBadge,
                    { backgroundColor: `${ResponsiveTheme.colors.teal}1F` },
                  ]}
                >
                  <Text style={[styles.macroBadgeText, { color: ResponsiveTheme.colors.teal }]}>
                    C {Math.round(meal.carbs)}g
                  </Text>
                </View>
                <View
                  style={[
                    styles.macroBadge,
                    { backgroundColor: `${ResponsiveTheme.colors.amber}1F` },
                  ]}
                >
                  <Text style={[styles.macroBadgeText, { color: ResponsiveTheme.colors.amber }]}>
                    F {Math.round(meal.fat)}g
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <AnimatedPressable
              onPress={onStart}
              scaleValue={0.85}
              hapticFeedback={true}
              hapticType="medium"
              style={[
                styles.actionButton,
                { backgroundColor: isCompleted ? ResponsiveTheme.colors.success : config.color },
              ]}
            >
              <Ionicons
                name={isCompleted ? "checkmark" : "play"}
                size={rf(16)}
                color={ResponsiveTheme.colors.white}
              />
            </AnimatedPressable>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

// Empty State
const EmptyMealsState: React.FC<{ onGenerate?: () => void }> = ({
  onGenerate,
}) => (
  <Animated.View
    entering={FadeInRight.duration(400).delay(100)}
    style={styles.emptyStateWrapper}
  >
    <GlassCard
      elevation={1}
      blurIntensity="light"
      padding="lg"
      borderRadius="lg"
    >
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="restaurant-outline"
            size={rf(32)}
            color={ResponsiveTheme.colors.textSecondary}
          />
        </View>
        <Text style={styles.emptyTitle}>No meals planned</Text>
        <Text style={styles.emptySubtitle}>
          Generate a personalized meal plan to get started
        </Text>

        {onGenerate && (
          <AnimatedPressable
            onPress={onGenerate}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="medium"
            style={styles.generateButton}
          >
            <LinearGradient
              colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateButtonGradient}
            >
              <Ionicons name="sparkles" size={rf(16)} color={ResponsiveTheme.colors.white} />
              <Text style={styles.generateButtonText}>Generate Plan</Text>
            </LinearGradient>
          </AnimatedPressable>
        )}
      </View>
    </GlassCard>
  </Animated.View>
);

export const TodaysMealsSection: React.FC<TodaysMealsSectionProps> = ({
  meals,
  onMealPress,
  onStartMeal,
  onGeneratePlan,
  isLoading,
}) => {
  // Summary stats
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const completedCount = meals.filter(
    (m) => m.isCompleted || m.progress === 100,
  ).length;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="calendar-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.primary}
          />
          <Text style={styles.sectionTitle}>Today's Meals</Text>
        </View>
        {meals.length > 0 && (
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${ResponsiveTheme.colors.primary}26` },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: ResponsiveTheme.colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: ResponsiveTheme.colors.primary },
                ]}
              >
                {completedCount}/{meals.length} done
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Meals List or Empty State */}
      {meals.length > 0 ? (
        <View style={styles.mealsList}>
          {meals.map((meal, index) => (
            <MealCard
              key={meal.id}
              meal={meal}
              index={index}
              onPress={() => onMealPress(meal)}
              onStart={() => onStartMeal(meal)}
            />
          ))}
        </View>
      ) : (
        <EmptyMealsState onGenerate={onGeneratePlan} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  emptyStateWrapper: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: rp(6),
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  mealsList: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
  },
  mealCard: {
    marginBottom: rp(0),
  },
  mealContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
    position: "relative",
  },
  completedBadge: {
    position: "absolute",
    top: rp(-4),
    right: rp(-4),
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
  },
  mealInfo: {
    flex: 1,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(2),
  },
  mealName: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rbr(6),
    gap: rp(3),
  },
  timeText: {
    fontSize: rf(9),
    fontWeight: "600",
  },
  mealCalories: {
    fontSize: rf(12),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  macroBadges: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.xs,
  },
  macroBadge: {
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rbr(4),
  },
  macroBadgeText: {
    fontSize: rf(9),
    fontWeight: "600",
  },
  actionButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.lg,
  },
  emptyIconContainer: {
    width: rw(64),
    height: rw(64),
    borderRadius: rw(32),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  generateButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  generateButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});

export default TodaysMealsSection;
