/**
 * MealsListView
 *
 * Full-screen "Today's Meals" list view for the Diet tab. Opens when the user
 * taps "View Today" on CompactDietCard. Renders a vertical list of meal rows
 * (one per planned meal for the selected day) with a back-button header.
 *
 * Each row is an AnimatedPressable that invokes `onMealPress(meal)` — the
 * parent (DietScreen) opens meal detail from that callback.
 *
 * Data shape: `DayMeal[]` from `nutritionStore.weeklyMealPlan.meals` filtered
 * by the selected day (already done by `useMealPlanning.todaysMeals`).
 * DayMeal carries totalCalories, totalMacros {protein, carbohydrates, fat,
 * fiber, sugar?}, type, name, and preparationTime. Meal time is derived via
 * `getMealTime(meal.type, mealSchedule)` so the row shows the scheduled slot.
 */

import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { DayMeal } from "../../types/ai";
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { Button } from "../ui";
import { getMealTime, MealSchedule } from "../../utils/mealSchedule";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";

/** Planned meal row type — DayMeal from the weekly meal plan. */
export type MealsListViewMeal = DayMeal;

export interface MealsListViewProps {
  /** Today's planned meals (from weeklyMealPlan.meals filtered by selectedDay). */
  meals: DayMeal[];
  /** Meal schedule (wake/sleep-derived) used to render each meal's time slot. */
  mealSchedule: MealSchedule;
  /** Tap handler for a meal row — parent opens meal detail. */
  onMealPress: (meal: DayMeal) => void;
  /** Back button handler — parent sets showMealsList=false. */
  onBack: () => void;
  /** Optional: invoked when the empty-state "Generate meal plan" CTA is tapped. */
  onGeneratePlan?: () => void;
  /** Optional testID prefix for the root container. */
  testID?: string;
}

// Reuse the same icon map the rest of the diet tab uses (LogMealModal).
const MEAL_TYPE_ICONS: Record<DayMeal["type"], string> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

const MEAL_TYPE_LABELS: Record<DayMeal["type"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Macro pill color map — protein/carbs/fat/fiber, sourced from flatColors.
const MACRO_PILL_COLORS = {
  protein: colors.primary,
  carbs: colors.amber,
  fat: colors.purple,
  fiber: colors.teal,
} as const;

interface MacroPillProps {
  label: string;
  value: number;
  color: string;
}

const MacroPill = React.memo(({ label, value, color }: MacroPillProps) => (
  <View
    style={[styles.macroPill, { backgroundColor: hexToRgba(color, TINT_ALPHA_LOW) }]}
  >
    <View style={[styles.macroPillDot, { backgroundColor: color }]} />
    <Text
      style={[styles.macroPillText, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {Math.round(value || 0)}g {label}
    </Text>
  </View>
));

interface MealRowProps {
  meal: DayMeal;
  mealTime: string;
  onPress: (meal: DayMeal) => void;
}

const MealRow = React.memo(({ meal, mealTime, onPress }: MealRowProps) => {
  const handlePress = useCallback(() => onPress(meal), [onPress, meal]);
  const iconName = MEAL_TYPE_ICONS[meal.type] ?? "restaurant-outline";
  const mealLabel = MEAL_TYPE_LABELS[meal.type] ?? meal.type;
  const calories = Math.round(meal.totalCalories || 0);
  const protein = Math.round(meal.totalMacros?.protein || 0);
  const carbs = Math.round(meal.totalMacros?.carbohydrates || 0);
  const fat = Math.round(meal.totalMacros?.fat || 0);
  const fiber = Math.round(meal.totalMacros?.fiber || 0);

  return (
    <AnimatedPressable
      onPress={handlePress}
      scaleValue={0.97}
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel={`${mealLabel}: ${meal.name || meal.type}, ${calories} calories`}
      accessibilityHint="Opens meal details"
      testID={`meals-list-row-${meal.id}`}
    >
      <GlassCard elevation={1} padding="md" style={styles.mealCard}>
        <View style={styles.mealRowTop}>
          <View style={styles.mealIconWrap}>
            <Ionicons
              name={iconName as keyof typeof Ionicons.glyphMap}
              size={rf(20)}
              color={colors.primary}
            />
          </View>
          <View style={styles.mealInfo}>
            <View style={styles.mealHeaderRow}>
              <Text
                style={styles.mealTypeLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {mealLabel}
              </Text>
              <View style={styles.mealTimeBadge}>
                <Ionicons
                  name="time-outline"
                  size={rf(11)}
                  color={colors.textSecondary}
                />
                <Text
                  style={styles.mealTimeText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {mealTime}
                </Text>
              </View>
            </View>
            <Text
              style={styles.mealName}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {meal.name || meal.type}
            </Text>
            <View style={styles.calorieRow}>
              <Ionicons
                name="flame-outline"
                size={rf(13)}
                color={colors.primary}
              />
              <Text
                style={styles.calorieText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {calories} kcal
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={rf(18)}
            color={colors.textTertiary}
          />
        </View>
        <View style={styles.macroPillsRow}>
          <MacroPill label="P" value={protein} color={MACRO_PILL_COLORS.protein} />
          <MacroPill label="C" value={carbs} color={MACRO_PILL_COLORS.carbs} />
          <MacroPill label="F" value={fat} color={MACRO_PILL_COLORS.fat} />
          <MacroPill label="Fib" value={fiber} color={MACRO_PILL_COLORS.fiber} />
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
});

export const MealsListView: React.FC<MealsListViewProps> = React.memo(
  ({
    meals,
    mealSchedule,
    onMealPress,
    onBack,
    onGeneratePlan,
    testID = "meals-list-view",
  }) => {
    const handleBack = useCallback(() => onBack(), [onBack]);

    // Precompute each meal's scheduled time slot once.
    const mealsWithTime = useMemo(
      () =>
        meals.map((meal) => ({
          meal,
          time: getMealTime(meal.type, mealSchedule),
        })),
      [meals, mealSchedule],
    );

    const hasMeals = mealsWithTime.length > 0;

    return (
      <View style={styles.container} testID={testID}>
        {/* Header: back button + title */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={handleBack}
            scaleValue={0.92}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Back to diet overview"
            testID="meals-list-back"
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={rf(22)} color={colors.text} />
          </AnimatedPressable>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Today's Meals
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasMeals ? (
            <View style={styles.mealsList}>
              {mealsWithTime.map(({ meal, time }) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  mealTime={time}
                  onPress={onMealPress}
                />
              ))}
            </View>
          ) : (
            <GlassCard
              elevation={1}
              padding="lg"
              borderRadius="lg"
              style={styles.emptyState}
            >
              <View style={styles.emptyStateInner}>
                <Ionicons
                  name="restaurant-outline"
                  size={rf(40)}
                  color={colors.textSecondary}
                  style={styles.emptyStateIcon}
                />
                <Text
                  style={styles.emptyStateTitle}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  No meals planned for today
                </Text>
                <Text
                  style={styles.emptyStateSubtitle}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Generate a personalized meal plan to see today's meals here.
                </Text>
                {onGeneratePlan ? (
                  <Button
                    title="Generate meal plan"
                    onPress={onGeneratePlan}
                    variant="primary"
                    size="md"
                  />
                ) : null}
              </View>
            </GlassCard>
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: "700" as const,
    color: colors.text,
  },
  headerSpacer: {
    width: rw(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: rp(40),
  },
  mealsList: {
    gap: spacing.md,
  },
  mealCard: {
    gap: spacing.sm,
  },
  mealRowTop: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: spacing.sm,
  },
  mealIconWrap: {
    width: rw(36),
    height: rw(36),
    borderRadius: borderRadius.md,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  mealTypeLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700" as const,
    color: colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  mealTimeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  mealTimeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: "600" as const,
  },
  mealName: {
    fontSize: fontSize.md,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  calorieRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
  },
  calorieText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "700" as const,
  },
  macroPillsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  macroPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  macroPillDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: borderRadius.full,
  },
  macroPillText: {
    fontSize: fontSize.xs,
    fontWeight: "700" as const,
  },
  emptyState: {
    marginTop: spacing.xl,
  },
  emptyStateInner: {
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  emptyStateIcon: {
    opacity: 0.5,
    marginBottom: spacing.xs,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700" as const,
    color: colors.text,
    textAlign: "center" as const,
  },
  emptyStateSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: spacing.sm,
  },
  bottomSpacing: {
    height: rp(24),
  },
});
