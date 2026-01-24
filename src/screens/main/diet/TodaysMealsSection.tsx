/**
 * TodaysMealsSection Component
 * Displays today's planned meals with status indicators
 * Fixes Issue #14 - Adds proper status badges for meal completion
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ListRenderItem } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";

// Meal type configuration
const MEAL_CONFIG = {
  breakfast: {
    icon: "sunny-outline" as const,
    color: "#FF9800",
    time: "8:00 AM",
    gradient: ["#FF9800", "#FFB74D"],
  },
  lunch: {
    icon: "restaurant-outline" as const,
    color: "#4CAF50",
    time: "1:00 PM",
    gradient: ["#4CAF50", "#81C784"],
  },
  dinner: {
    icon: "moon-outline" as const,
    color: "#667eea",
    time: "7:00 PM",
    gradient: ["#667eea", "#764ba2"],
  },
  snack: {
    icon: "nutrition-outline" as const,
    color: "#FF6B6B",
    time: "4:00 PM",
    gradient: ["#FF6B6B", "#FF8E53"],
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
                  <Ionicons name="checkmark" size={rf(10)} color="#fff" />
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
                    { backgroundColor: "rgba(255,107,107,0.12)" },
                  ]}
                >
                  <Text style={[styles.macroBadgeText, { color: "#FF6B6B" }]}>
                    P {Math.round(meal.protein)}g
                  </Text>
                </View>
                <View
                  style={[
                    styles.macroBadge,
                    { backgroundColor: "rgba(78,205,196,0.12)" },
                  ]}
                >
                  <Text style={[styles.macroBadgeText, { color: "#4ECDC4" }]}>
                    C {Math.round(meal.carbs)}g
                  </Text>
                </View>
                <View
                  style={[
                    styles.macroBadge,
                    { backgroundColor: "rgba(255,193,7,0.12)" },
                  ]}
                >
                  <Text style={[styles.macroBadgeText, { color: "#FFC107" }]}>
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
                { backgroundColor: isCompleted ? "#4CAF50" : config.color },
              ]}
            >
              <Ionicons
                name={isCompleted ? "checkmark" : "play"}
                size={rf(16)}
                color="#fff"
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
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateButtonGradient}
            >
              <Ionicons name="sparkles" size={rf(16)} color="#fff" />
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

  // Render item for FlatList - memoized for performance
  const renderMealItem: ListRenderItem<Meal> = useCallback(
    ({ item, index }) => (
      <MealCard
        key={item.id}
        meal={item}
        index={index}
        onPress={() => onMealPress(item)}
        onStart={() => onStartMeal(item)}
      />
    ),
    [onMealPress, onStartMeal],
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Meal) => item.id, []);

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
                { backgroundColor: "rgba(102,126,234,0.15)" },
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
        <FlatList
          data={meals}
          renderItem={renderMealItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.mealsList}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={5}
          windowSize={5}
        />
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
    gap: 6,
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
    marginBottom: 0,
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
    top: -4,
    right: -4,
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: "#4CAF50",
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
    marginBottom: 2,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    backgroundColor: "rgba(255,255,255,0.05)",
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
    color: "#fff",
  },
});

export default TodaysMealsSection;
