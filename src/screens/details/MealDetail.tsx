import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Button, Card, THEME } from "../../components/ui";
import { NutritionChart } from "../../components/charts";
import useCalculatedMetrics from "../../hooks/useCalculatedMetrics";
import { useNutritionStore } from "../../stores/nutritionStore";

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

interface MealDetailProps {
  mealId: string;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MealDetail: React.FC<MealDetailProps> = ({
  mealId,
  onBack,
  onEdit,
  onDelete,
}) => {
  // Get user's calorie target - NO HARDCODED VALUES
  const calculatedMetrics = useCalculatedMetrics();
  const { weeklyMealPlan, mealProgress, isGeneratingPlan } =
    useNutritionStore();

  // Find the meal from the store by ID
  // WeeklyMealPlan has: meals: DayMeal[]
  // DayMeal has: id, type, name, items (or foods), totalCalories, totalMacros
  const meal = useMemo(() => {
    if (!weeklyMealPlan?.meals) return null;

    // Search through meals array directly
    for (const m of weeklyMealPlan.meals) {
      if (m.id === mealId) {
        // Get foods/items from meal
        const foods: FoodItem[] = (m.items || m.foods || []).map(
          (food: any, index: number) => ({
            id: food.id || `food_${index}`,
            name: food.name || "Food Item",
            quantity: food.quantity || food.servingSize || 100,
            unit: food.unit || food.servingUnit || "g",
            calories: food.calories || 0,
            protein: food.protein || food.macros?.protein || 0,
            carbs:
              food.carbs ||
              food.carbohydrates ||
              food.macros?.carbohydrates ||
              0,
            fat: food.fat || food.fats || food.macros?.fat || 0,
            fiber: food.fiber || food.macros?.fiber,
            sugar: food.sugar,
          }),
        );

        const totalCalories =
          m.totalCalories ||
          foods.reduce((sum: number, f: FoodItem) => sum + f.calories, 0);
        const totalProtein =
          m.totalMacros?.protein ||
          m.totalProtein ||
          foods.reduce((sum: number, f: FoodItem) => sum + f.protein, 0);
        const totalCarbs =
          m.totalMacros?.carbohydrates ||
          m.totalCarbs ||
          foods.reduce((sum: number, f: FoodItem) => sum + f.carbs, 0);
        const totalFat =
          m.totalMacros?.fat ||
          m.totalFat ||
          foods.reduce((sum: number, f: FoodItem) => sum + f.fat, 0);

        // Check completion status from mealProgress - has completedAt not completed
        const progressData = mealProgress[mealId];
        const isCompleted = progressData?.completedAt !== undefined;

        return {
          id: m.id,
          name: m.name || m.type || "Meal",
          time: m.timing || "",
          date:
            m.createdAt?.split("T")[0] ||
            new Date().toISOString().split("T")[0],
          totalCalories: Math.round(totalCalories),
          totalProtein: Math.round(totalProtein),
          totalCarbs: Math.round(totalCarbs),
          totalFat: Math.round(totalFat),
          foods,
          notes: m.description || "",
          isCompleted,
        };
      }
    }
    return null;
  }, [weeklyMealPlan, mealId, mealProgress]);

  const nutritionData = meal
    ? {
        calories: meal.totalCalories,
        protein: meal.totalProtein,
        carbs: meal.totalCarbs,
        fat: meal.totalFat,
      }
    : null;

  const getMealIcon = (mealName: string) => {
    const name = mealName.toLowerCase();
    if (name.includes("breakfast")) return "🌅";
    if (name.includes("lunch")) return "☀️";
    if (name.includes("dinner")) return "🌙";
    if (name.includes("snack")) return "🍎";
    return "🍽️";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Generate insights based on actual meal data
  interface MealData {
    id: string;
    name: string;
    time: string;
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    foods: FoodItem[];
    notes: string;
    isCompleted: boolean;
  }

  const generateInsights = (mealData: MealData) => {
    const insights: { icon: string; text: string }[] = [];

    if (mealData.totalProtein >= 20) {
      insights.push({
        icon: "check",
        text: "Good protein content for muscle maintenance",
      });
    } else if (mealData.totalProtein < 10) {
      insights.push({
        icon: "warning",
        text: "Consider adding more protein to this meal",
      });
    }

    const totalMacros =
      mealData.totalProtein + mealData.totalCarbs + mealData.totalFat;
    const proteinRatio =
      totalMacros > 0 ? (mealData.totalProtein / totalMacros) * 100 : 0;
    const carbsRatio =
      totalMacros > 0 ? (mealData.totalCarbs / totalMacros) * 100 : 0;

    if (
      proteinRatio >= 20 &&
      proteinRatio <= 35 &&
      carbsRatio >= 40 &&
      carbsRatio <= 55
    ) {
      insights.push({
        icon: "check",
        text: "Balanced macronutrient distribution",
      });
    }

    const totalFiber = mealData.foods.reduce(
      (sum: number, f: FoodItem) => sum + (f.fiber || 0),
      0,
    );
    if (totalFiber < 5) {
      insights.push({
        icon: "⚠️",
        text: "Consider adding more fiber-rich foods",
      });
    } else if (totalFiber >= 8) {
      insights.push({
        icon: "✅",
        text: "Good fiber content for digestive health",
      });
    }

    if (mealData.totalCalories >= 300 && mealData.totalCalories <= 600) {
      insights.push({
        icon: "✅",
        text: "Appropriate calorie range for a main meal",
      });
    }

    return insights.length > 0
      ? insights
      : [{ icon: "ℹ️", text: "Log more meals to get personalized insights" }];
  };

  // Loading state
  if (isGeneratingPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading meal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Meal not found
  if (!meal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Details</Text>
          <View style={styles.editButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>Meal Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This meal may have been removed or is not available.
          </Text>
          <Button
            title="Go Back"
            onPress={onBack || (() => {})}
            variant="primary"
            style={{ marginTop: THEME.spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const insights = generateInsights(meal);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Details</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Info Card */}
        <Card style={styles.mealCard} variant="elevated">
          <View style={styles.mealHeader}>
            <View style={styles.mealInfo}>
              <View style={styles.mealTitleRow}>
                <Text style={styles.mealIcon}>{getMealIcon(meal.name)}</Text>
                <Text style={styles.mealName}>{meal.name}</Text>
                {meal.isCompleted && (
                  <Text style={styles.completedBadge}>✓</Text>
                )}
              </View>
              <Text style={styles.mealTime}>
                {meal.time ? `${meal.time} • ` : ""}
                {formatDate(meal.date)}
              </Text>
            </View>

            <View style={styles.caloriesContainer}>
              <Text style={styles.caloriesValue}>{meal.totalCalories}</Text>
              <Text style={styles.caloriesLabel}>calories</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.totalProtein}g</Text>
              <Text style={styles.statLabel}>Protein</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.totalCarbs}g</Text>
              <Text style={styles.statLabel}>Carbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.totalFat}g</Text>
              <Text style={styles.statLabel}>Fat</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.foods.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
          </View>
        </Card>

        {/* Nutrition Chart */}
        {nutritionData && (
          <NutritionChart
            data={nutritionData}
            targetCalories={calculatedMetrics?.dailyCalories ?? undefined}
            style={styles.chartContainer}
          />
        )}

        {/* Food Items */}
        <View style={styles.foodSection}>
          <Text style={styles.sectionTitle}>Food Items</Text>

          {meal.foods.length > 0 ? (
            meal.foods.map((food) => (
              <Card key={food.id} style={styles.foodCard}>
                <View style={styles.foodHeader}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodQuantity}>
                      {food.quantity} {food.unit}
                    </Text>
                  </View>
                  <Text style={styles.foodCalories}>{food.calories} cal</Text>
                </View>

                {/* Food Macros */}
                <View style={styles.foodMacros}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{food.protein}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{food.carbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{food.fat}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                  {food.fiber !== undefined && food.fiber > 0 && (
                    <View style={styles.macroItem}>
                      <Text style={styles.macroValue}>{food.fiber}g</Text>
                      <Text style={styles.macroLabel}>Fiber</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.foodCard}>
              <Text style={styles.noFoodsText}>
                No food items recorded for this meal.
              </Text>
            </Card>
          )}
        </View>

        {/* Meal Notes */}
        {meal.notes && (
          <Card style={styles.notesCard}>
            <Text style={styles.notesTitle}>📝 Meal Notes</Text>
            <Text style={styles.notesText}>{meal.notes}</Text>
          </Card>
        )}

        {/* Meal Insights */}
        <Card style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 Nutritional Insights</Text>
          <View style={styles.insightsList}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Text style={styles.insightIcon}>{insight.icon}</Text>
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.actionButtons}>
          <Button
            title="Edit Meal"
            onPress={onEdit || (() => {})}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="Delete Meal"
            onPress={onDelete || (() => {})}
            variant="outline"
            style={[styles.actionButton, styles.deleteButton] as any}
            textStyle={styles.deleteButtonText}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },

  emptyTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  emptySubtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
  },

  noFoodsText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    padding: THEME.spacing.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  backIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  headerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  editIcon: {
    fontSize: THEME.fontSize.md,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
  },

  mealCard: {
    marginVertical: THEME.spacing.md,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },

  mealInfo: {
    flex: 1,
  },

  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: THEME.spacing.xs,
  },

  mealIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },

  mealName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  completedBadge: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.success,
    marginLeft: THEME.spacing.sm,
  },

  mealTime: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  caloriesContainer: {
    alignItems: "center" as const,
    backgroundColor: THEME.colors.primary + "20",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  caloriesValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  caloriesLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    marginTop: THEME.spacing.xs / 2,
  },

  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  statItem: {
    alignItems: "center" as const,
  },

  statValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  chartContainer: {
    marginBottom: THEME.spacing.md,
  },

  foodSection: {
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  foodCard: {
    marginBottom: THEME.spacing.sm,
  },

  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: THEME.spacing.sm,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  foodQuantity: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  foodCalories: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  foodMacros: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  macroItem: {
    alignItems: "center" as const,
  },

  macroValue: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  macroLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 4,
  },

  notesCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.secondary + "10",
    borderWidth: 1,
    borderColor: THEME.colors.secondary + "30",
  },

  notesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.secondary,
    marginBottom: THEME.spacing.sm,
  },

  notesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },

  insightsCard: {
    marginBottom: THEME.spacing.xxl,
    backgroundColor: THEME.colors.info + "10",
    borderWidth: 1,
    borderColor: THEME.colors.info + "30",
  },

  insightsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.info,
    marginBottom: THEME.spacing.sm,
  },

  insightsList: {
    gap: THEME.spacing.xs,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  insightIcon: {
    fontSize: THEME.fontSize.sm,
    marginRight: THEME.spacing.sm,
  },

  insightText: {
    flex: 1,
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },

  actionButtons: {
    flexDirection: "row",
    gap: THEME.spacing.sm,
  },

  actionButton: {
    flex: 1,
  },

  deleteButton: {
    borderColor: THEME.colors.error,
  },

  deleteButtonText: {
    color: THEME.colors.error,
  },
});
