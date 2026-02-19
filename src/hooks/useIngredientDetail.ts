import { useState } from "react";
import { Alert } from "react-native";
import { DayMeal, MealItem } from "../types/ai";
import { completionTrackingService } from "../services/completionTracking";
import { mealMotivationService } from "../features/nutrition/MealMotivation";

interface UseIngredientDetailProps {
  ingredientName: string;
  meal: DayMeal;
  onMealComplete?: (mealId: string) => void;
  onClose: () => void;
  mealProgress?: number;
}

export const useIngredientDetail = ({
  ingredientName,
  meal,
  onMealComplete,
  onClose,
  mealProgress = 0,
}: UseIngredientDetailProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const isCompleted = mealProgress >= 100;

  // Find the ingredient in the meal's items array
  const ingredientData = meal.items?.find(
    (item) =>
      item.name?.toLowerCase().includes(ingredientName.toLowerCase()) ||
      ingredientName.toLowerCase().includes(item.name?.toLowerCase() || ""),
  );

  const handleMarkComplete = async () => {
    if (isCompleted || isCompleting) {
      console.log("🍽️ Meal already completed or completing in progress");
      return;
    }

    try {
      setIsCompleting(true);
      console.log(
        "🍽️ IngredientDetailModal: Marking meal as completed:",
        meal.name,
        meal.id,
      );

      // Use the completion tracking service to mark meal as complete
      const success = await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "ingredient_detail_modal",
        quickComplete: true,
      });

      if (success) {
        // Generate dynamic completion message
        const completionMessage = mealMotivationService.getCompletionMessage(
          meal,
          {},
        );

        Alert.alert("🎉 Meal Completed!", completionMessage, [
          {
            text: "Awesome! 🍽️",
            onPress: () => {
              console.log(
                "🍽️ IngredientDetailModal: Meal completion confirmed",
              );

              // Call the completion callback
              if (onMealComplete) {
                onMealComplete(meal.id);
              }

              // Close the modal
              onClose();
            },
          },
        ]);

        console.log("✅ Meal completed successfully from ingredient modal");
      } else {
        throw new Error("Failed to complete meal");
      }
    } catch (error) {
      console.error("❌ Failed to complete meal from ingredient modal:", error);
      Alert.alert(
        "❌ Error",
        "Failed to mark meal as completed. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsCompleting(false);
    }
  };

  return {
    isCompleting,
    isCompleted,
    ingredientData,
    handleMarkComplete,
  };
};
