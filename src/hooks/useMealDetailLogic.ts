import { useMemo } from "react";
import { useNutritionStore } from "../stores/nutritionStore";
import { getLocalDateString } from "../utils/weekUtils";

export interface FoodItem {
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

export interface MealData {
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

export interface MealInsight {
  icon: string;
  text: string;
}

export const useMealDetailLogic = (mealId: string) => {
  const { weeklyMealPlan, customWeeklyMealPlan, activeDietSource, mealProgress, isGeneratingPlan } =
    useNutritionStore();
  // Look up the meal in whichever plan is actually active — a mealId from
  // a custom plan would otherwise never be found here.
  const activeWeeklyMealPlan =
    activeDietSource === "custom" ? customWeeklyMealPlan : weeklyMealPlan;

  const meal = useMemo(() => {
    if (!activeWeeklyMealPlan?.meals) return null;

    for (const m of activeWeeklyMealPlan.meals) {
      if (m.id === mealId) {
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

        const progressData = mealProgress[mealId];
        const isCompleted = progressData?.completedAt !== undefined;

        return {
          id: m.id,
          name: m.name || m.type || "Meal",
          time: m.timing || "",
          date: m.createdAt ? getLocalDateString(m.createdAt) : getLocalDateString(),
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
  }, [activeWeeklyMealPlan, mealId, mealProgress]);

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

  const generateInsights = (mealData: MealData): MealInsight[] => {
    const insights: MealInsight[] = [];

    if (mealData.totalProtein >= 20) {
      insights.push({
        icon: "checkmark-circle",
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
        icon: "checkmark-circle",
        text: "Balanced macronutrient distribution",
      });
    }

    const totalFiber = mealData.foods.reduce(
      (sum: number, f: FoodItem) => sum + (f.fiber || 0),
      0,
    );
    if (totalFiber < 5) {
      insights.push({
        icon: "alert-circle-outline",
        text: "Consider adding more fiber-rich foods",
      });
    } else if (totalFiber >= 8) {
      insights.push({
        icon: "checkmark-circle",
        text: "Good fiber content for digestive health",
      });
    }

    if (mealData.totalCalories >= 300 && mealData.totalCalories <= 600) {
      insights.push({
        icon: "flame-outline",
        text: "Appropriate calorie range for a main meal",
      });
    }

    return insights.length > 0
      ? insights
      : [{ icon: "bulb-outline", text: "Log more meals to get personalized insights" }];
  };

  const insights = meal ? generateInsights(meal) : [];

  return {
    meal,
    nutritionData,
    insights,
    isGeneratingPlan,
    getMealIcon,
    formatDate,
  };
};
