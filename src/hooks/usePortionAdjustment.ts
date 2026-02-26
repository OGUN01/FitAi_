import { logger } from '../utils/logger';
import { useState, useEffect } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { RecognizedFood } from "../services/foodRecognitionService";

export interface PortionAdjustment {
  foodId: string;
  originalGrams: number;
  adjustedGrams: number;
  adjustmentRatio: number;
}

export interface UsePortionAdjustmentReturn {
  adjustments: PortionAdjustment[];
  currentFoodIndex: number;
  isProcessing: boolean;
  currentFood: RecognizedFood | undefined;
  currentAdjustment: PortionAdjustment | undefined;
  effectiveGrams: number;
  minGrams: number;
  maxGrams: number;
  previewNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  setCurrentFoodIndex: (index: number | ((prev: number) => number)) => void;
  updateAdjustment: (index: number, adjustedGrams: number) => void;
  applyAdjustments: (
    onComplete: (adjustedFoods: RecognizedFood[]) => void,
  ) => Promise<void>;
  getServingSizeLabel: (grams: number) => string;
  getCommonPortionSizes: (
    foodName: string,
  ) => { label: string; grams: number }[];
}

export const usePortionAdjustment = (
  recognizedFoods: RecognizedFood[],
): UsePortionAdjustmentReturn => {
  const [adjustments, setAdjustments] = useState<PortionAdjustment[]>([]);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize adjustments when foods change
  useEffect(() => {
    if (recognizedFoods.length > 0) {
      setAdjustments(
        recognizedFoods.map((food) => ({
          foodId: food.id,
          originalGrams: food.userGrams ?? food.estimatedGrams,
          adjustedGrams: food.userGrams ?? food.estimatedGrams,
          adjustmentRatio: 1.0,
        })),
      );
      setCurrentFoodIndex(0);
    }
  }, [recognizedFoods]);

  const updateAdjustment = (index: number, adjustedGrams: number) => {
    const originalGrams =
      recognizedFoods[index].userGrams ?? recognizedFoods[index].estimatedGrams;
    const adjustmentRatio = adjustedGrams / originalGrams;

    setAdjustments((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              adjustedGrams: Math.round(adjustedGrams),
              adjustmentRatio: Math.round(adjustmentRatio * 100) / 100,
            }
          : item,
      ),
    );
  };

  const applyAdjustments = async (
    onComplete: (adjustedFoods: RecognizedFood[]) => void,
  ) => {
    setIsProcessing(true);

    try {
      const adjustedFoods: RecognizedFood[] = recognizedFoods.map(
        (food, index) => {
          const adjustment = adjustments[index];
          if (!adjustment || adjustment.adjustmentRatio === 1.0) {
            return food;
          }

          // Scale nutrition values based on portion adjustment
          const scaledNutrition = {
            calories: Math.round(
              food.nutrition.calories * adjustment.adjustmentRatio,
            ),
            protein:
              Math.round(
                food.nutrition.protein * adjustment.adjustmentRatio * 10,
              ) / 10,
            carbs:
              Math.round(
                food.nutrition.carbs * adjustment.adjustmentRatio * 10,
              ) / 10,
            fat:
              Math.round(food.nutrition.fat * adjustment.adjustmentRatio * 10) /
              10,
            fiber: food.nutrition.fiber
              ? Math.round(
                  food.nutrition.fiber * adjustment.adjustmentRatio * 10,
                ) / 10
              : undefined,
            sugar: food.nutrition.sugar
              ? Math.round(
                  food.nutrition.sugar * adjustment.adjustmentRatio * 10,
                ) / 10
              : undefined,
            sodium: food.nutrition.sodium
              ? Math.round(food.nutrition.sodium * adjustment.adjustmentRatio)
              : undefined,
          };

          return {
            ...food,
            userGrams: adjustment.adjustedGrams,
            nutrition: scaledNutrition,
          } as RecognizedFood;
        },
      );

      onComplete(adjustedFoods);

      // Show summary of adjustments
      const changedFoods = adjustments.filter(
        (adj) => adj.adjustmentRatio !== 1.0,
      );
      if (changedFoods.length > 0) {
        crossPlatformAlert(
          "✅ Portions Adjusted!",
          `Updated portion sizes for ${changedFoods.length} food item${changedFoods.length !== 1 ? "s" : ""}.

Nutrition values have been recalculated automatically.`,
          [{ text: "Perfect!" }],
        );
      }
    } catch (error) {
      logger.error('Error applying portion adjustments', { error: String(error) });
      crossPlatformAlert(
        "Error",
        "Failed to apply portion adjustments. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getServingSizeLabel = (grams: number): string => {
    if (grams < 50) return "Very Small";
    if (grams < 100) return "Small";
    if (grams < 150) return "Medium";
    if (grams < 250) return "Large";
    if (grams < 350) return "Very Large";
    return "Extra Large";
  };

  const getCommonPortionSizes = (
    foodName: string,
  ): { label: string; grams: number }[] => {
    const name = foodName.toLowerCase();

    if (
      name.includes("rice") ||
      name.includes("biryani") ||
      name.includes("pulao")
    ) {
      return [
        { label: "Small bowl", grams: 100 },
        { label: "Medium bowl", grams: 150 },
        { label: "Large bowl", grams: 200 },
        { label: "Full plate", grams: 300 },
      ];
    }

    if (
      name.includes("roti") ||
      name.includes("naan") ||
      name.includes("chapati")
    ) {
      return [
        { label: "1 piece", grams: 40 },
        { label: "2 pieces", grams: 80 },
        { label: "3 pieces", grams: 120 },
        { label: "4 pieces", grams: 160 },
      ];
    }

    if (
      name.includes("dal") ||
      name.includes("curry") ||
      name.includes("sabji")
    ) {
      return [
        { label: "Small serving", grams: 80 },
        { label: "Medium serving", grams: 120 },
        { label: "Large serving", grams: 180 },
        { label: "Extra serving", grams: 240 },
      ];
    }

    return [
      { label: "Small portion", grams: 75 },
      { label: "Medium portion", grams: 150 },
      { label: "Large portion", grams: 225 },
      { label: "Extra large", grams: 300 },
    ];
  };

  const currentFood = recognizedFoods[currentFoodIndex];
  const currentAdjustment = adjustments[currentFoodIndex];

  const effectiveGrams = currentFood
    ? (currentFood.userGrams ?? currentFood.estimatedGrams)
    : 0;
  const minGrams = Math.max(20, Math.round(effectiveGrams * 0.3));
  const maxGrams = Math.round(effectiveGrams * 3);

  const previewNutrition =
    currentFood && currentAdjustment
      ? {
          calories: Math.round(
            currentFood.nutrition.calories * currentAdjustment.adjustmentRatio,
          ),
          protein:
            Math.round(
              currentFood.nutrition.protein *
                currentAdjustment.adjustmentRatio *
                10,
            ) / 10,
          carbs:
            Math.round(
              currentFood.nutrition.carbs *
                currentAdjustment.adjustmentRatio *
                10,
            ) / 10,
          fat:
            Math.round(
              currentFood.nutrition.fat *
                currentAdjustment.adjustmentRatio *
                10,
            ) / 10,
        }
      : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return {
    adjustments,
    currentFoodIndex,
    isProcessing,
    currentFood,
    currentAdjustment,
    effectiveGrams,
    minGrams,
    maxGrams,
    previewNutrition,
    setCurrentFoodIndex,
    updateAdjustment,
    applyAdjustments,
    getServingSizeLabel,
    getCommonPortionSizes,
  };
};
