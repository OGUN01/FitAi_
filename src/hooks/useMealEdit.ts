/**
 * useMealEdit - Hook for meal editing logic
 * Extracts all state management and business logic from MealEditModal
 */

import { useState, useEffect } from "react";
import { Alert } from "react-native";
import type { DayMeal } from "../types/ai";
import { useNutritionStore } from "../stores/nutritionStore";
import { supabase } from "../services/supabase";
import { haptics } from "../utils/haptics";

const MEAL_TIMES = {
  breakfast: "08:00",
  lunch: "12:00",
  dinner: "18:00",
  snack: "15:00",
};

export const useMealEdit = (
  visible: boolean,
  meal: DayMeal | null,
  onSave: (updatedMeal: DayMeal) => void,
  onClose: () => void,
  userId?: string,
) => {
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState<
    "breakfast" | "lunch" | "dinner" | "snack"
  >("lunch");
  const [mealTime, setMealTime] = useState("12:00");
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { weeklyMealPlan, setWeeklyMealPlan, saveWeeklyMealPlan } =
    useNutritionStore();

  // Load meal data when modal opens
  useEffect(() => {
    if (visible && meal) {
      setMealName(meal.name || "");
      setMealType((meal.type as any) || "lunch");
      setMealTime(
        meal.timing ||
          MEAL_TIMES[meal.type as keyof typeof MEAL_TIMES] ||
          "12:00",
      );
      setIngredients(meal.items || []);
    }
  }, [visible, meal]);

  // Calculate total nutrition from ingredients
  const calculateNutrition = () => {
    return ingredients.reduce(
      (acc, item) => {
        const calories = item.calories || 0;
        const protein = item.macros?.protein || 0;
        const carbs = item.macros?.carbohydrates || 0;
        const fat = item.macros?.fat || 0;

        return {
          calories: acc.calories + calories,
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fat: acc.fat + fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  };

  // Handle ingredient quantity change
  const handleQuantityChange = (index: number, newQuantity: number) => {
    const updatedIngredients = [...ingredients];
    const item = updatedIngredients[index];

    // Recalculate nutrition based on new quantity
    const ratio = newQuantity / (item.quantity || 100);

    updatedIngredients[index] = {
      ...item,
      quantity: newQuantity,
      calories: (item.calories || 0) * ratio,
      macros: {
        protein: (item.macros?.protein || 0) * ratio,
        carbohydrates: (item.macros?.carbohydrates || 0) * ratio,
        fat: (item.macros?.fat || 0) * ratio,
        fiber: (item.macros?.fiber || 0) * ratio,
      },
    };

    setIngredients(updatedIngredients);
  };

  // Handle ingredient removal
  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(updatedIngredients);
  };

  // Handle meal type change
  const handleMealTypeChange = (type: typeof mealType) => {
    setMealType(type);
    setMealTime(MEAL_TIMES[type]);
    haptics.light();
  };

  // Save changes
  const handleSave = async () => {
    if (!meal || !mealName.trim()) {
      Alert.alert("Error", "Please enter a meal name");
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert("Error", "Please add at least one ingredient");
      return;
    }

    setIsSaving(true);
    haptics.light();

    try {
      const nutrition = calculateNutrition();

      // Create updated meal object
      const updatedMeal: DayMeal = {
        ...meal,
        name: mealName.trim(),
        type: mealType,
        timing: mealTime,
        items: ingredients,
        totalCalories: nutrition.calories,
        totalMacros: {
          protein: nutrition.protein,
          carbohydrates: nutrition.carbs,
          fat: nutrition.fat,
          fiber: ingredients.reduce(
            (sum, item) => sum + (item.macros?.fiber || 0),
            0,
          ),
        },
      };

      // Update in weekly meal plan
      if (weeklyMealPlan) {
        const updatedMeals = weeklyMealPlan.meals.map((m) =>
          m.id === meal.id ? updatedMeal : m,
        );

        const updatedPlan = {
          ...weeklyMealPlan,
          meals: updatedMeals,
        };

        // Save to store and database
        setWeeklyMealPlan(updatedPlan);
        await saveWeeklyMealPlan(updatedPlan);
      }

      // Update in database if meal has a log ID
      const { getMealProgress } = useNutritionStore.getState();
      const mealProgressData = getMealProgress(meal.id);

      if (mealProgressData?.logId && userId) {
        const { error } = await supabase
          .from("meals")
          .update({
            name: mealName.trim(),
            type: mealType,
            timing: mealTime,
            total_calories: nutrition.calories,
            total_protein: nutrition.protein,
            total_carbs: nutrition.carbs,
            total_fat: nutrition.fat,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mealProgressData.logId);

        if (error) {
          console.error("Error updating meal in database:", error);
        }
      }

      haptics.success();
      Alert.alert("Success", "Meal updated successfully");
      onSave(updatedMeal);
      onClose();
    } catch (error) {
      console.error("Error saving meal:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    mealName,
    setMealName,
    mealType,
    mealTime,
    setMealTime,
    ingredients,
    isSaving,
    calculateNutrition,
    handleQuantityChange,
    handleRemoveIngredient,
    handleMealTypeChange,
    handleSave,
  };
};
