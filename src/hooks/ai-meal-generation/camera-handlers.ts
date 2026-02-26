import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import {
  foodRecognitionService,
  MealType,
} from "../../services/foodRecognitionService";
import { recognizedFoodLogger } from "../../services/recognizedFoodLogger";
import { foodRecognitionFeedbackService } from "../../services/foodRecognitionFeedbackService";
import { PortionData, FeedbackData } from "./types";

export const createCameraHandlers = (
  isGuestMode: boolean,
  userId: string | undefined,
  selectedMealType: MealType,
  dietaryRestrictions: string[] | undefined,
  setIsGeneratingMeal: (loading: boolean) => void,
  setAiError: (error: string | null) => void,
  setPortionData: (data: PortionData | null) => void,
  setShowPortionAdjustment: (show: boolean) => void,
  setFeedbackData: (
    data:
      | FeedbackData
      | null
      | ((prev: FeedbackData | null) => FeedbackData | null),
  ) => void,
  setShowFeedbackModal: (show: boolean) => void,
  loadDailyNutrition: () => Promise<void>,
  refreshAll: () => Promise<void>,
) => {
  const handleCameraCapture = async (
    imageUri: string,
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (isGuestMode || !userId) {
      crossPlatformAlert(
        "Sign Up for AI Features",
        "AI food recognition uses advanced machine learning to analyze your meals with 90%+ accuracy.\n\nCreate a free account to:\n• Scan food photos instantly\n• Get personalized nutrition insights\n• Track your meals automatically",
        [
          { text: "Maybe Later", style: "cancel" },
          {
            text: "Sign Up Free",
            onPress: () => setShowGuestSignUp(true),
            style: "default",
          },
        ],
      );
      return;
    }

    if (!foodRecognitionService) {
      crossPlatformAlert("Error", "Food recognition service not available.");
      return;
    }

    try {
      setIsGeneratingMeal(true);
      setAiError(null);

      const result = await foodRecognitionService.recognizeFood(
        imageUri,
        selectedMealType,
        dietaryRestrictions,
      );

      if (result.success && result.foods) {
        const recognizedFoods = result.foods;
        const totalCalories = recognizedFoods.reduce(
          (sum: number, food: any) => sum + food.nutrition.calories,
          0,
        );

        crossPlatformAlert(
          "Food Recognition Complete!",
          `Recognized ${recognizedFoods.length} food item(s):\n\n` +
            `${recognizedFoods.map((food: any) => `• ${food.name} (${Math.round(food.nutrition.calories)} cal)`).join("\n")}\n\n` +
            `Total: ${Math.round(totalCalories)} calories\n` +
            `Confidence: ${result.overallConfidence}%`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Adjust Portions",
              onPress: () => {
                setPortionData({ recognizedFoods, imageUri });
                setShowPortionAdjustment(true);
              },
            },
            {
              text: "Give Feedback",
              onPress: () => {
                setFeedbackData({
                  recognizedFoods,
                  imageUri,
                  mealId: `temp_${Date.now()}`,
                });
                setShowFeedbackModal(true);
              },
            },
            {
              text: "Log Meal",
              onPress: async () => {
                try {
                  if (!userId) {
                    crossPlatformAlert(
                      "Sign In Required",
                      "Please sign in to log meals.",
                    );
                    return;
                  }
                  const logResult =
                    await recognizedFoodLogger.logRecognizedFoods(
                      userId,
                      recognizedFoods,
                      selectedMealType,
                    );

                  if (logResult.success) {
                    crossPlatformAlert(
                      "Meal Logged Successfully!",
                      `${recognizedFoods.length} food item(s) logged`,
                    );

                    setFeedbackData((prev) =>
                      prev ? { ...prev, mealId: logResult.mealId! } : null,
                    );

                    await loadDailyNutrition();
                    await refreshAll();
                  } else {
                    throw new Error(logResult.error || "Failed to log meal");
                  }
                } catch (logError) {
                  crossPlatformAlert("Meal Logging Failed", String(logError));
                }
              },
            },
          ],
        );
      } else {
        throw new Error(result.error || "Food recognition failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setAiError(errorMessage);
      crossPlatformAlert("Recognition Failed", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: any[]) => {
    const currentFeedbackData =
      typeof setFeedbackData === "function" ? undefined : setFeedbackData;

    if (!currentFeedbackData) return;
    try {
      if (!userId) {
        crossPlatformAlert("Sign In Required", "Please sign in to submit feedback.");
        return;
      }
      const result = await foodRecognitionFeedbackService.submitFeedback(
        userId,
        (currentFeedbackData as any).mealId,
        feedback,
        (currentFeedbackData as any).imageUri,
        (currentFeedbackData as any).recognizedFoods,
      );

      if (!result.success) {
        crossPlatformAlert("Error", "Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      crossPlatformAlert("Error", "Failed to submit feedback. Please try again.");
    }
  };

  const handlePortionAdjustmentComplete = async (
    adjustedFoods: any[],
    currentPortionData: PortionData | null,
  ) => {
    setShowPortionAdjustment(false);
    const totalCalories = adjustedFoods.reduce(
      (sum: number, food: any) => sum + food.nutrition.calories,
      0,
    );

    const adjustedCount = adjustedFoods.filter(
      (food: any) =>
        food.portionSize.estimatedGrams !==
        currentPortionData?.recognizedFoods.find((orig) => orig.id === food.id)
          ?.portionSize.estimatedGrams,
    ).length;

    crossPlatformAlert(
      "Portions Updated!",
      `${adjustedCount > 0 ? `Updated ${adjustedCount} portion size${adjustedCount !== 1 ? "s" : ""}!\n\n` : ""}` +
        `${adjustedFoods.map((food: any) => `- ${food.name} (${food.portionSize.estimatedGrams}g - ${Math.round(food.nutrition.calories)} cal)`).join("\n")}\n\n` +
        `Total: ${Math.round(totalCalories)} calories`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Give Feedback",
          onPress: () => {
            setFeedbackData({
              recognizedFoods: adjustedFoods,
              imageUri: currentPortionData?.imageUri || "",
              mealId: `temp_${Date.now()}`,
            });
            setShowFeedbackModal(true);
          },
        },
        {
          text: "Log Meal",
          onPress: async () => {
            try {
              if (!userId) {
                crossPlatformAlert("Sign In Required", "Please sign in to log meals.");
                return;
              }
              const logResult = await recognizedFoodLogger.logRecognizedFoods(
                userId,
                adjustedFoods,
                selectedMealType,
              );

              if (logResult.success) {
                crossPlatformAlert(
                  "Meal Logged Successfully!",
                  `${adjustedFoods.length} food item${adjustedFoods.length !== 1 ? "s" : ""} logged\n` +
                    `Total: ${logResult.totalCalories} calories\n` +
                    `Meal Type: ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}\n` +
                    `Meal ID: ${logResult.mealId?.slice(-8)}\n\n` +
                    `Your nutrition tracking has been updated!`,
                  [{ text: "Awesome!" }],
                );

                await loadDailyNutrition();
                await refreshAll();
              } else {
                throw new Error(logResult.error || "Failed to log meal");
              }
            } catch (error) {
              crossPlatformAlert("Error", "Failed to log meal. Please try again.");
            }
          },
        },
      ],
    );

    setPortionData(null);
  };

  return {
    handleCameraCapture,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
  };
};
