/**
 * MealDetailView
 *
 * Full-screen meal-detail overlay for the Diet tab. Opens when the user taps a
 * meal row in MealsListView. Renders the meal's full nutrition profile:
 *   - Header (back button + meal name)
 *   - Meal type label + scheduled time + prep time
 *   - Total calories (big number)
 *   - Macro grid (Protein / Carbs / Fat / Fiber) — colored pills matching the
 *     MealsListView visual language so the list→detail transition reads as one
 *     system.
 *   - Food items list — each row shows name, quantity+unit, calories, and a
 *     mini P/C/F macro line.
 *   - "Log this meal" CTA (AnimatedPressable) when the meal is not yet
 *     completed; "Completed ✓" badge when it is.
 *
 * Data shape: `DayMeal` from `nutritionStore.weeklyMealPlan.meals`.
 *   - totalCalories, totalMacros { protein, carbohydrates, fat, fiber, sugar? }
 *   - items: MealItem[] (name?, quantity, unit?, calories, macros)
 *   - type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
 *   - preparationTime / prepTime (minutes)
 *
 * The "Log this meal" CTA delegates to the parent's `onLogMeal` callback,
 * which wires into the existing `completeMealPreparation` flow from
 * useMealPlanning — no new logging logic here.
 *
 * Reused building blocks (Search Before Building):
 *   - getMealTime + MealSchedule from utils/mealSchedule (scheduled time slot)
 *   - mealTypeGradients + macroColors from hooks/useMealCard (icon + macro
 *     color scheme shared with the rest of the diet tab)
 *   - hexToRgba + TINT_ALPHA_LOW/SOFT from utils/colors
 *   - AnimatedPressable, GlassCard, flatColors/flatFontSize/spacing/borderRadius,
 *     rf/rw/rp/rh
 *
 * MacroRings/NutritionBreakdown were NOT reused: they require computed
 * macroPercentages (derived from macro targets, which the detail view does not
 * have) and use the nested colors API. IngredientsList was NOT reused: it is a
 * collapsible toggle designed for the compact meal card, whereas the detail
 * view needs an always-expanded, richer per-item layout. Building fresh here
 * keeps the detail view visually consistent with MealsListView (same flat
 * tokens, same MacroPill style) and avoids plumbing a no-op toggle.
 */

import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { DayMeal, MealItem } from "../../types/ai";
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
} from "../../theme/aurora-tokens";
import { rf, rw, rp, rh } from "../../utils/responsive";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { getMealTime, MealSchedule } from "../../utils/mealSchedule";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT } from "../../utils/colors";
import { macroColors, mealTypeGradients } from "../../hooks/useMealCard";

export interface MealDetailViewProps {
  /** The meal to render in detail. */
  meal: DayMeal;
  /** Whether the meal has been logged/completed (progress >= 100). */
  isCompleted: boolean;
  /** Back-button handler — parent clears showMealDetail + selectedMeal. */
  onBack: () => void;
  /**
   * Optional CTA handler — parent invokes the existing meal-logging flow
   * (completeMealPreparation from useMealPlanning). When omitted, no CTA is
   * rendered.
   */
  onLogMeal?: (meal: DayMeal) => void;
  /** Meal schedule (wake/sleep-derived) used to render the scheduled time. */
  mealSchedule?: MealSchedule;
  /** Optional testID prefix for the root container. */
  testID?: string;
}

// Meal type → Ionicons icon name (matches MealsListView's icon map).
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

// Macro pill colors — protein/carbs/fat/fiber. Mirrors MealsListView so the
// list→detail transition is visually continuous.
const MACRO_PILL_COLORS = {
  protein: colors.primary,
  carbs: colors.amber,
  fat: colors.purple,
  fiber: colors.teal,
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

interface FoodItemRowProps {
  item: MealItem;
  index: number;
  isLast: boolean;
}

const FoodItemRow = React.memo(({ item, index, isLast }: FoodItemRowProps) => {
  const name = item.name || item.food?.name || "Food item";
  const quantityStr =
    typeof item.quantity === "string" && item.quantity.length > 0
      ? item.quantity
      : `${item.amount || item.quantity || 1} ${item.unit || "serving"}`;
  const calories = Math.round(item.calories || 0);

  return (
    <View style={[styles.foodItem, isLast && styles.foodItemLast]}>
      <View style={styles.foodItemLeft}>
        <Text
          style={styles.foodItemName}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {name}
        </Text>
      </View>
      <View style={styles.foodItemRight}>
        <Text
          style={styles.foodItemQuantity}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {quantityStr}
        </Text>
        <Text
          style={styles.foodItemCalories}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {calories} cal
        </Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const MealDetailView: React.FC<MealDetailViewProps> = ({
  meal,
  isCompleted,
  onBack,
  onLogMeal,
  mealSchedule,
  testID = "meal-detail-view",
}) => {
  const handleBack = useCallback(() => onBack(), [onBack]);
  const handleLogMeal = useCallback(() => {
    onLogMeal?.(meal);
  }, [onLogMeal, meal]);

  const mealLabel = MEAL_TYPE_LABELS[meal.type] ?? meal.type;
  const iconName = MEAL_TYPE_ICONS[meal.type] ?? "restaurant-outline";
  const calories = Math.round(meal.totalCalories || 0);
  const protein = Math.round(meal.totalMacros?.protein || 0);
  const carbs = Math.round(meal.totalMacros?.carbohydrates || 0);
  const fat = Math.round(meal.totalMacros?.fat || 0);
  const fiber = Math.round(meal.totalMacros?.fiber || 0);

  // Scheduled time slot derived from the user's wake/sleep schedule.
  const scheduledTime = useMemo(
    () => (mealSchedule ? getMealTime(meal.type, mealSchedule) : null),
    [meal.type, mealSchedule],
  );

  // Prep time — DayMeal carries preparationTime (canonical) with prepTime as
  // a backward-compat alias.
  const prepTime = meal.preparationTime || meal.prepTime || null;

  // Food items — items is canonical; foods is a back-compat alias.
  const foodItems = useMemo(
    () => meal.items ?? meal.foods ?? [],
    [meal.items, meal.foods],
  );

  // Meal-type accent color (first gradient stop) for the type chip + icon.
  const accentColor = mealTypeGradients[meal.type]?.colors[0] ?? colors.primary;

  return (
    <View style={styles.container} testID={testID}>
      {/* Header: back button + meal name */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={handleBack}
          scaleValue={0.92}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="Back to meals list"
          testID="meal-detail-back"
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={rf(22)} color={colors.text} />
        </AnimatedPressable>
        <Text
          style={styles.headerTitle}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {meal.name || mealLabel}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal type chip + scheduled/prep time meta row */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.typeChip,
              { backgroundColor: hexToRgba(accentColor, TINT_ALPHA_LOW) },
            ]}
          >
            <Ionicons
              name={iconName as keyof typeof Ionicons.glyphMap}
              size={rf(14)}
              color={accentColor}
            />
            <Text
              style={[styles.typeChipText, { color: accentColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {mealLabel}
            </Text>
          </View>
          {scheduledTime ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={rf(13)}
                color={colors.textSecondary}
              />
              <Text
                style={styles.metaText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {scheduledTime}
              </Text>
            </View>
          ) : null}
          {prepTime ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="hourglass-outline"
                size={rf(13)}
                color={colors.textSecondary}
              />
              <Text
                style={styles.metaText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {prepTime} min prep
              </Text>
            </View>
          ) : null}
        </View>

        {/* Description (if present) */}
        {meal.description ? (
          <Text
            style={styles.description}
            numberOfLines={4}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {meal.description}
          </Text>
        ) : null}

        {/* Calories hero */}
        <GlassCard elevation={1} padding="md" style={styles.calorieCard}>
          <View style={styles.calorieRow}>
            <Ionicons name="flame-outline" size={rf(28)} color={colors.primary} />
            <View style={styles.calorieTextWrap}>
              <Text
                style={styles.calorieValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {calories}
              </Text>
              <Text style={styles.calorieLabel}>calories</Text>
            </View>
          </View>
        </GlassCard>

        {/* Macro grid — Protein / Carbs / Fat / Fiber */}
        <View style={styles.macroPillsRow}>
          <MacroPill label="Protein" value={protein} color={MACRO_PILL_COLORS.protein} />
          <MacroPill label="Carbs" value={carbs} color={MACRO_PILL_COLORS.carbs} />
          <MacroPill label="Fat" value={fat} color={MACRO_PILL_COLORS.fat} />
          <MacroPill label="Fiber" value={fiber} color={MACRO_PILL_COLORS.fiber} />
        </View>

        {/* Food items list */}
        {foodItems.length > 0 ? (
          <View style={styles.foodItemsSection}>
            <Text style={styles.sectionLabel}>Ingredients</Text>
            <GlassCard elevation={1} padding="none" style={styles.foodItemsCard}>
              {foodItems.map((item, index) => (
                <FoodItemRow
                  key={item.id || `food-item-${index}`}
                  item={item}
                  index={index}
                  isLast={index === foodItems.length - 1}
                />
              ))}
            </GlassCard>
          </View>
        ) : null}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* CTA: "Log this meal" or "Completed ✓" */}
      {onLogMeal ? (
        <View style={styles.ctaContainer}>
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={rf(20)}
                color={colors.primary}
              />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : (
            <AnimatedPressable
              onPress={handleLogMeal}
              scaleValue={0.97}
              hapticType="medium"
              accessibilityRole="button"
              accessibilityLabel={`Log ${meal.name || mealLabel}`}
              accessibilityHint="Marks this meal as logged"
              testID="meal-detail-log-cta"
              style={styles.logButton}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={rf(20)}
                color={colors.white}
              />
              <Text
                style={styles.logButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Log this meal
              </Text>
            </AnimatedPressable>
          )}
        </View>
      ) : null}
    </View>
  );
};

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
    fontSize: fontSize.lg,
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
    paddingBottom: rp(24),
  },
  // Meta row (type chip + time + prep)
  metaRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeChipText: {
    fontSize: fontSize.xs,
    fontWeight: "700" as const,
  },
  metaItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xxs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: "500" as const,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: rf(20),
  },
  // Calories hero card
  calorieCard: {
    marginBottom: spacing.md,
  },
  calorieRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
  },
  calorieTextWrap: {
    flex: 1,
  },
  calorieValue: {
    fontSize: fontSize.xxl,
    fontWeight: "bold" as const,
    color: colors.primary,
  },
  calorieLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  // Macro pills
  macroPillsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  macroPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  // Food items
  foodItemsSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  foodItemsCard: {
    overflow: "hidden" as const,
  },
  foodItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  foodItemLast: {
    borderBottomWidth: 0,
  },
  foodItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodItemName: {
    fontSize: fontSize.md,
    fontWeight: "600" as const,
    color: colors.text,
  },
  foodItemRight: {
    alignItems: "flex-end" as const,
    gap: rp(2),
  },
  foodItemQuantity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  foodItemCalories: {
    fontSize: fontSize.sm,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  bottomSpacing: {
    height: rh(80),
  },
  // CTA
  ctaContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: rp(24),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  logButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    minHeight: 52,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  logButtonText: {
    fontSize: fontSize.md,
    fontWeight: "700" as const,
    color: colors.white,
  },
  completedBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    minHeight: 52,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
  },
  completedText: {
    fontSize: fontSize.md,
    fontWeight: "700" as const,
    color: colors.primary,
  },
});
