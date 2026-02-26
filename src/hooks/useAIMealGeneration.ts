import { useState, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { useUserStore, useNutritionStore } from "../stores";
import { aiService } from "../ai";
import {
  foodRecognitionService,
  MealType,
} from "../services/foodRecognitionService";
import { recognizedFoodLogger } from "../services/recognizedFoodLogger";
import { foodRecognitionFeedbackService } from "../services/foodRecognitionFeedbackService";
import { barcodeService, ScannedProduct } from "../services/barcodeService";
import { useAuth } from "./useAuth";
import { useNutritionData } from "./useNutritionData";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { Meal, DayMeal, WeeklyMealPlan } from "../types/ai";

const generateHealthAssessment = (product: ScannedProduct) => {
  const { nutrition, healthScore } = product;
  const score = healthScore ?? 50;

  const getCategory = (
    s: number,
  ): "excellent" | "good" | "moderate" | "poor" | "unhealthy" => {
    if (s >= 80) return "excellent";
    if (s >= 60) return "good";
    if (s >= 40) return "moderate";
    if (s >= 20) return "poor";
    return "unhealthy";
  };

  const calorieScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, (nutrition.calories - 200) / 4)),
  );
  const macroScore = Math.min(
    100,
    nutrition.protein * 2 + Math.max(0, 50 - nutrition.fat),
  );
  const sugarPenalty =
    (nutrition.sugar ?? 0) > 10 ? 30 : (nutrition.sugar ?? 0) > 5 ? 15 : 0;
  const sodiumPenalty =
    (nutrition.sodium ?? 0) > 1 ? 20 : (nutrition.sodium ?? 0) > 0.5 ? 10 : 0;

  const recommendations: string[] = [];
  const alerts: string[] = [];
  const healthBenefits: string[] = [];
  const concerns: string[] = [];

  if (nutrition.protein > 15)
    healthBenefits.push("High protein content supports muscle health");
  if (nutrition.fiber > 5) healthBenefits.push("Good source of dietary fiber");
  if (nutrition.calories < 150) healthBenefits.push("Low calorie option");

  if ((nutrition.sugar ?? 0) > 15) {
    alerts.push("High sugar content");
    recommendations.push("Consider limiting portion size due to sugar content");
  }
  if ((nutrition.sodium ?? 0) > 1.5) {
    alerts.push("High sodium content");
    concerns.push("May contribute to increased blood pressure");
  }
  if (nutrition.fat > 20) {
    concerns.push("High fat content per serving");
    recommendations.push("Balance with lower fat foods in other meals");
  }
  if (nutrition.protein < 5) {
    recommendations.push("Pair with a protein source for a balanced meal");
  }

  return {
    overallScore: score,
    category: getCategory(score),
    breakdown: {
      calories: {
        score: Math.round(calorieScore),
        status:
          calorieScore >= 70
            ? "good"
            : calorieScore >= 40
              ? "moderate"
              : "high",
        message:
          nutrition.calories < 200
            ? "Low calorie content"
            : nutrition.calories < 400
              ? "Moderate calories"
              : "High calorie content",
      },
      macros: {
        score: Math.round(macroScore),
        status:
          macroScore >= 70
            ? "balanced"
            : macroScore >= 40
              ? "acceptable"
              : "imbalanced",
        message: `${nutrition.protein}g protein, ${nutrition.carbs}g carbs, ${nutrition.fat}g fat`,
      },
      additives: {
        score: Math.round(100 - sugarPenalty),
        status:
          sugarPenalty === 0
            ? "good"
            : sugarPenalty <= 15
              ? "moderate"
              : "concerning",
        message:
          (nutrition.sugar ?? 0) > 10
            ? "Contains added sugars"
            : "Sugar content acceptable",
      },
      processing: {
        score: Math.round(100 - sodiumPenalty),
        status:
          sodiumPenalty === 0
            ? "minimal"
            : sodiumPenalty <= 10
              ? "moderate"
              : "high",
        message:
          (nutrition.sodium ?? 0) > 1
            ? "Higher sodium indicates processing"
            : "Sodium levels acceptable",
      },
    },
    recommendations:
      recommendations.length > 0
        ? recommendations
        : ["Enjoy as part of a balanced diet"],
    alerts,
    healthBenefits:
      healthBenefits.length > 0 ? healthBenefits : ["Part of a varied diet"],
    concerns,
    alternatives:
      score < 50
        ? ["Consider whole food alternatives", "Look for lower sodium options"]
        : undefined,
  };
};

export const useAIMealGeneration = () => {
  const { user, isGuestMode } = useAuth();
  const { weeklyMealPlan, setWeeklyMealPlan } = useNutritionStore();
  const { profile } = useUserStore();
  const { foods, loadDailyNutrition, refreshAll, dietPreferences } =
    useNutritionData();
  const { getCalorieTarget } = useCalculatedMetrics();

  const [aiMeals, setAiMeals] = useState<DayMeal[]>([]);
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"food" | "progress" | "barcode">(
    "food",
  );

  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null,
  );
  const [productHealthAssessment, setProductHealthAssessment] =
    useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);

  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");

  const [portionData, setPortionData] = useState<{
    recognizedFoods: any[];
    imageUri: string;
  } | null>(null);
  const [showPortionAdjustment, setShowPortionAdjustment] = useState(false);

  const [feedbackData, setFeedbackData] = useState<{
    recognizedFoods: any[];
    imageUri: string;
    mealId: string;
  } | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
      }
    };
  }, []);

  const handleMealTypeSelected = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowMealTypeSelector(false);
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
    }
    cameraTimeoutRef.current = setTimeout(() => {
      setShowCamera(true);
    }, 300);
  };

  const handleScanFood = () => {
    setShowMealTypeSelector(true);
  };

  const handleScanProduct = () => {
    setCameraMode("barcode");
    setShowCamera(true);
  };

  const handleCameraCapture = async (
    imageUri: string,
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    setShowCamera(false);

    if (isGuestMode || !user?.id) {
      Alert.alert(
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
      Alert.alert("Error", "Food recognition service not available.");
      return;
    }

    try {
      setIsGeneratingMeal(true);
      setAiError(null);

      const dietaryRestrictions =
        profile?.dietPreferences?.allergies || undefined;
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

        Alert.alert(
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
                  if (!user?.id) {
                    Alert.alert(
                      "Sign In Required",
                      "Please sign in to log meals.",
                    );
                    return;
                  }
                  const logResult =
                    await recognizedFoodLogger.logRecognizedFoods(
                      user.id,
                      recognizedFoods,
                      selectedMealType,
                    );

                  if (logResult.success) {
                    Alert.alert(
                      "Meal Logged Successfully!",
                      `${recognizedFoods.length} food item(s) logged`,
                    );

                    if (feedbackData) {
                      setFeedbackData((prev) =>
                        prev ? { ...prev, mealId: logResult.mealId! } : null,
                      );
                    }

                    await loadDailyNutrition();
                    await refreshAll();
                  } else {
                    throw new Error(logResult.error || "Failed to log meal");
                  }
                } catch (logError) {
                  Alert.alert("Meal Logging Failed", String(logError));
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
      Alert.alert("Recognition Failed", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: any[]) => {
    if (!feedbackData) return;
    try {
      if (!user?.id) {
        Alert.alert("Sign In Required", "Please sign in to submit feedback.");
        return;
      }
      const result = await foodRecognitionFeedbackService.submitFeedback(
        user.id,
        feedbackData.mealId,
        feedback,
        feedbackData.imageUri,
        feedbackData.recognizedFoods,
      );

      if (!result.success) {
        Alert.alert("Error", "Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    }
  };

  const handlePortionAdjustmentComplete = async (adjustedFoods: any[]) => {
    setShowPortionAdjustment(false);
    const totalCalories = adjustedFoods.reduce(
      (sum: number, food: any) => sum + food.nutrition.calories,
      0,
    );
    const adjustedCount = adjustedFoods.filter(
      (food: any) =>
        food.portionSize.estimatedGrams !==
        portionData?.recognizedFoods.find((orig) => orig.id === food.id)
          ?.portionSize.estimatedGrams,
    ).length;

    Alert.alert(
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
              imageUri: portionData?.imageUri || "",
              mealId: `temp_${Date.now()}`,
            });
            setShowFeedbackModal(true);
          },
        },
        {
          text: "Log Meal",
          onPress: async () => {
            try {
              if (!user?.id) {
                Alert.alert("Sign In Required", "Please sign in to log meals.");
                return;
              }
              const logResult = await recognizedFoodLogger.logRecognizedFoods(
                user.id,
                adjustedFoods,
                selectedMealType,
              );

              if (logResult.success) {
                Alert.alert(
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
              Alert.alert("Error", "Failed to log meal. Please try again.");
            }
          },
        },
      ],
    );

    setPortionData(null);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setIsProcessingBarcode(true);
    setShowCamera(false);

    try {
      const lookupResult = await barcodeService.lookupProduct(barcode);

      if (!lookupResult.success || !lookupResult.product) {
        Alert.alert(
          "Product Not Found",
          lookupResult.error || "Product not in database.",
        );
        return;
      }

      const product = lookupResult.product;
      const healthAssessment = generateHealthAssessment(product);

      setScannedProduct(product);
      setProductHealthAssessment(healthAssessment);
      setShowProductModal(true);

      Alert.alert(
        "Product Scanned Successfully!",
        `Found: ${product.name}\nHealth Score: ${healthAssessment.overallScore}/100`,
        [{ text: "View Details", onPress: () => setShowProductModal(true) }],
      );
    } catch (error) {
      Alert.alert("Scanning Error", String(error));
    } finally {
      setIsProcessingBarcode(false);
    }
  };

  const handleAddProductToMeal = (
    product: ScannedProduct,
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (isGuestMode || !user?.id) {
      Alert.alert(
        "Sign Up to Log Meals",
        "Create an account to track your meals.",
        [
          { text: "Just Viewing", style: "cancel" },
          {
            text: "Sign Up Free",
            onPress: () => {
              setShowProductModal(false);
              setShowGuestSignUp(true);
            },
            style: "default",
          },
        ],
      );
      return;
    }

    Alert.alert("Add to Meal", `Add ${product.name} to your current meal?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Add",
        onPress: async () => {
          try {
            const foodEntry = {
              id: `barcode_${product.barcode}_${Date.now()}`,
              name: product.name,
              category: "main",
              cuisine: "international",
              portionSize: {
                estimatedGrams: product.nutrition.servingSize || 100,
                confidence: 95,
                servingType: "medium",
              },
              nutrition: product.nutrition,
              confidence: product.confidence,
              enhancementSource: "barcode",
              estimatedGrams: product.nutrition.servingSize || 100,
              servingDescription: product.nutrition.servingUnit || "serving",
              nutritionPer100g: product.nutrition,
            } as any;

            const logResult = await recognizedFoodLogger.logRecognizedFoods(
              user.id,
              [foodEntry],
              selectedMealType,
            );

            if (logResult.success) {
              Alert.alert(
                "Added to Meal",
                `${product.name} added to ${selectedMealType}.`,
              );
              setShowProductModal(false);
              await loadDailyNutrition();
              await refreshAll();
            } else {
              throw new Error(logResult.error || "Failed to log meal");
            }
          } catch (error) {
            Alert.alert("Error", "Failed to add product to meal.");
          }
        },
      },
    ]);
  };

  const generateAIMeal = async (
    mealType: string,
    setShowGuestSignUp: (show: boolean) => void,
    options?: any,
  ) => {
    if (mealType === "daily_plan") {
      return generateDailyMealPlan(setShowGuestSignUp);
    }

    if (!user?.id || user.id.startsWith("guest")) {
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI meals.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const calorieTarget = getCalorieTarget();
      if (!calorieTarget) throw new Error("Calorie target not calculated.");

      const preferences = {
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreference: options?.cuisinePreference || "any",
        prepTimeLimit: options?.quickEasy ? 20 : 30,
        calorieTarget: calorieTarget,
        dietType: dietPreferences?.diet_type || [],
        dislikes: dietPreferences?.dislikes || [],
        customOptions: options?.customOptions || {},
        suggestions: options?.suggestions || [],
      };

      let actualMealType = mealType;
      const specialActionType = [
        "meal_prep",
        "goal_focused",
        "quick_easy",
      ].includes(mealType)
        ? mealType
        : undefined;

      if (specialActionType) {
        actualMealType = "lunch";
        (preferences as any).specialAction = specialActionType;
      }

      const response = await aiService.generateMeal(
        profile.personalInfo,
        profile.fitnessGoals,
        actualMealType as "breakfast" | "lunch" | "dinner" | "snack",
        preferences as any,
      );

      if (response.success && response.data) {
        setAiMeals((prev) => [response.data!, ...prev]);
        // Push generated meal to Zustand nutrition store so DietScreen renders it
        const currentMeals = weeklyMealPlan?.meals || [];
        const updatedPlan: WeeklyMealPlan = {
          id: weeklyMealPlan?.id || `meal_plan_${Date.now()}`,
          weekNumber: weeklyMealPlan?.weekNumber || Math.ceil(new Date().getDate() / 7),
          meals: [...currentMeals, response.data],
          planTitle: weeklyMealPlan?.planTitle || "AI Generated Meals",
        };
        setWeeklyMealPlan(updatedPlan);

        Alert.alert(
          "Meal Generated!",
          `Your personalized ${mealType} is ready!`,
        );
      } else {
        setAiError(response.error || "Failed to generate meal");
        Alert.alert("Generation Failed", response.error || "Failed.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAiError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const generateDailyMealPlan = async (
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (!user?.id || user.id.startsWith("guest")) {
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const userCalorieTarget = getCalorieTarget();
      if (!userCalorieTarget) throw new Error("Calorie target not calculated.");

      const preferences = {
        calorieTarget: userCalorieTarget,
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreferences: ["any"],
      };

      const response = await aiService.generateDailyMealPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        preferences as any,
      );

      if (response.success && response.data) {
        setAiMeals((prev) => [...(response.data!.meals as unknown as DayMeal[]), ...prev]);
        Alert.alert("Daily Meal Plan Generated!", "Your plan is ready!");
      } else {
        setAiError(response.error || "Failed to generate plan");
        Alert.alert("Generation Failed", response.error || "Failed.");
      }
    } catch (error) {
      setAiError(String(error));
      Alert.alert("Error", String(error));
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  return {
    aiMeals,
    isGeneratingMeal,
    aiError,

    showCamera,
    setShowCamera,
    cameraMode,
    setCameraMode,

    scannedProduct,
    productHealthAssessment,
    showProductModal,
    setShowProductModal,
    isProcessingBarcode,

    showMealTypeSelector,
    setShowMealTypeSelector,
    selectedMealType,
    setSelectedMealType,

    portionData,
    setPortionData,
    showPortionAdjustment,
    setShowPortionAdjustment,

    feedbackData,
    setFeedbackData,
    showFeedbackModal,
    setShowFeedbackModal,

    handleMealTypeSelected,
    handleScanFood,
    handleScanProduct,
    handleCameraCapture,
    handleBarcodeScanned,
    handleAddProductToMeal,
    generateAIMeal,
    generateDailyMealPlan,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
  };
};
