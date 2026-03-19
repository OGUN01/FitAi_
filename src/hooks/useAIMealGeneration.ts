import { useState, useRef, useEffect, useCallback } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { useNutritionStore } from "../stores";
import { useProfileStore } from "../stores/profileStore";
import { aiService } from "../ai";
import {
  foodRecognitionService,
  MealType,
} from "../services/foodRecognitionService";
import { recognizedFoodLogger } from "../services/recognizedFoodLogger";
import { foodRecognitionFeedbackService } from "../services/foodRecognitionFeedbackService";
import { barcodeService, ScannedProduct } from "../services/barcodeService";
import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import { useAuth } from "./useAuth";
import { useNutritionData } from "./useNutritionData";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { Meal, DayMeal, WeeklyMealPlan } from "../types/ai";
import { useSubscriptionStore } from "../stores/subscriptionStore";
// usePaywall import removed — triggerPaywall now via subscriptionStore
import { LogMealScanResult } from "../components/diet/LogMealModal";
import { MealLogProvenance } from "../types/nutritionLogging";

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

const buildMealPhotoProvenance = (confidence?: number): MealLogProvenance => ({
  mode: "meal_photo",
  truthLevel: "estimated",
  confidence: confidence ?? null,
  countryContext: "IN",
  requiresReview: true,
  source: "food-recognition",
});

const buildPackagedFoodProvenance = (
  product: ScannedProduct,
  mode: "barcode" | "label",
): MealLogProvenance => {
  const estimatedPackagedNutrition =
    Boolean(product.needsNutritionEstimate) || Boolean(product.isAIEstimated);
  const requiresReview =
    estimatedPackagedNutrition ||
    product.confidence < (mode === "label" ? 75 : 85);

  return {
    mode,
    truthLevel: estimatedPackagedNutrition ? "estimated" : "authoritative",
    confidence: product.confidence,
    countryContext: product.gs1Country || "IN",
    requiresReview,
    source: product.source,
    productIdentity: {
      barcode: product.barcode,
      productName: product.name,
      brand: product.brand ?? null,
    },
    conflict:
      mode === "label"
        ? {
            labelSource: product.source,
            chosenTruthSource: "label",
          }
        : null,
  };
};

export const useAIMealGeneration = (options?: {
  onBarcodeNotFound?: (barcode: string) => void;
}) => {
  const { user, isGuestMode } = useAuth();
  const { weeklyMealPlan, setWeeklyMealPlan, completeMeal } =
    useNutritionStore();
  // SSOT: profileStore is authoritative for all onboarding data
  const {
    personalInfo: profilePersonalInfo,
    workoutPreferences: profileWorkoutPreferences,
    dietPreferences: profileDietPreferencesStore,
  } = useProfileStore();
  const { foods, loadDailyNutrition, refreshAll } = useNutritionData();
  const { getCalorieTarget } = useCalculatedMetrics();
  const { canUseFeature, incrementUsage, triggerPaywall } =
    useSubscriptionStore();

  // SSOT: Build merged fitnessGoals — profileStore.workoutPreferences is authoritative
  const mergedFitnessGoals = profileWorkoutPreferences
    ? {
        primary_goals: profileWorkoutPreferences.primary_goals || [],
        primaryGoals: profileWorkoutPreferences.primary_goals || [],
        experience: profileWorkoutPreferences.intensity || "beginner",
        experience_level: profileWorkoutPreferences.intensity || "beginner",
        time_commitment: String(
          profileWorkoutPreferences.time_preference || 45,
        ),
        preferred_equipment: profileWorkoutPreferences.equipment,
        target_areas: undefined,
      }
    : null;

  // SSOT: Build merged dietPreferences — profileStore.dietPreferences is authoritative
  const mergedDietPrefs = profileDietPreferencesStore
    ? {
        allergies: profileDietPreferencesStore.allergies || [],
        diet_type: profileDietPreferencesStore.diet_type,
        restrictions: profileDietPreferencesStore.restrictions || [],
        dislikes: [],
      }
    : null;

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

  // Optional pre-scan portion hint (grams) to pass to AI for better estimation
  const [portionGrams, setPortionGrams] = useState<number | null>(null);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const pendingPhotoUriRef = useRef<string | null>(null);
  const pendingPhotoGuestRef = useRef<((show: boolean) => void) | null>(null);

  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logMealCallbackRef = useRef<
    ((result: LogMealScanResult) => void) | null
  >(null);

  const setLogMealScanCallback = useCallback(
    (cb: ((result: LogMealScanResult) => void) | null) => {
      logMealCallbackRef.current = cb;
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Build a DayMeal-compatible object from recognized foods so it can be
   * added to weeklyMealPlan and immediately counted in getTodaysConsumedNutrition.
   */
  const buildScannedMeal = (
    recognizedFoods: any[],
    mealType: MealType,
    mealId: string,
  ) => {
    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()];

    const totalCalories = recognizedFoods.reduce(
      (s: number, f: any) => s + (f.nutrition?.calories || 0),
      0,
    );
    const totalProtein = recognizedFoods.reduce(
      (s: number, f: any) => s + (f.nutrition?.protein || 0),
      0,
    );
    const totalCarbs = recognizedFoods.reduce(
      (s: number, f: any) => s + (f.nutrition?.carbs || 0),
      0,
    );
    const totalFat = recognizedFoods.reduce(
      (s: number, f: any) => s + (f.nutrition?.fat || 0),
      0,
    );

    return {
      id: mealId,
      type: mealType,
      name:
        recognizedFoods.length === 1
          ? recognizedFoods[0].name
          : `${recognizedFoods[0]?.name || mealType} + ${recognizedFoods.length - 1} more`,
      description: `Scanned ${mealType} - ${recognizedFoods.length} item(s)`,
      items: recognizedFoods.map((f: any, idx: number) => ({
        id: `${mealId}_item_${idx}`,
        name: f.name,
        quantity: f.userGrams ?? f.estimatedGrams ?? 100,
        unit: "g",
        calories: f.nutrition?.calories || 0,
        macros: {
          protein: f.nutrition?.protein || 0,
          carbohydrates: f.nutrition?.carbs || 0,
          fat: f.nutrition?.fat || 0,
          fiber: f.nutrition?.fiber || 0,
        },
      })),
      totalCalories: Math.round(totalCalories),
      totalMacros: {
        protein: Math.round(totalProtein * 10) / 10,
        carbohydrates: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        fiber: 0,
      },
      preparationTime: 0,
      difficulty: "easy" as const,
      tags: ["scanned"],
      dayOfWeek: todayName,
      isPersonalized: false,
      aiGenerated: false,
      createdAt: today.toISOString(),
      isCompleted: true,
      completedAt: today.toISOString(),
    };
  };

  /**
   * Update nutritionStore after a successful scan log so daily macro bars reflect instantly.
   */
  const addScannedMealToStore = async (
    recognizedFoods: any[],
    mealType: MealType,
    provenance?: MealLogProvenance,
  ) => {
    const mealId = `scanned_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const scannedMeal = buildScannedMeal(recognizedFoods, mealType, mealId);
    if (provenance) {
      (scannedMeal as any).sourceMetadata = provenance;
    }
    const currentPlan = weeklyMealPlan || {
      id: `plan_${Date.now()}`,
      weekNumber: Math.ceil(new Date().getDate() / 7),
      meals: [],
      planTitle: "Scanned Meals",
    };
    setWeeklyMealPlan({
      ...currentPlan,
      meals: [...currentPlan.meals, scannedMeal as any],
    });
    await completeMeal(mealId);
  };

  const getAverageRecognitionConfidence = (recognizedFoods: any[]) => {
    if (!recognizedFoods.length) return undefined;
    return (
      recognizedFoods.reduce(
        (sum: number, food: any) => sum + (food.confidence || 0),
        0,
      ) / recognizedFoods.length
    );
  };

  const logRecognizedMealWithReview = async (
    recognizedFoods: any[],
    mealType: MealType,
    options?: {
      confidence?: number;
      persistCatalogFoods?: boolean;
      successMessage?: string;
    },
  ) => {
    try {
      if (!user?.id) {
        crossPlatformAlert("Sign In Required", "Please sign in to log meals.");
        return;
      }

      const provenance = buildMealPhotoProvenance(options?.confidence);
      const persistCatalogFoods = options?.persistCatalogFoods ?? false;
      const logResult = await recognizedFoodLogger.logRecognizedFoods(
        user.id,
        recognizedFoods,
        mealType,
        undefined,
        {
          provenance,
          persistCatalogFoods,
        },
      );

      if (!logResult.success) {
        throw new Error(logResult.error || "Failed to log meal");
      }

      await addScannedMealToStore(recognizedFoods, mealType, provenance);

      const successMessage =
        options?.successMessage ||
        `${recognizedFoods.length} food item${recognizedFoods.length !== 1 ? "s" : ""} logged` +
          (persistCatalogFoods
            ? `\n\nSaved as reusable foods for future logging.`
            : "");

      crossPlatformAlert("Meal Logged Successfully!", successMessage);

      if (feedbackData) {
        setFeedbackData((prev) =>
          prev ? { ...prev, mealId: logResult.mealId! } : null,
        );
      }

      await loadDailyNutrition();
      await refreshAll();
    } catch (error) {
      crossPlatformAlert("Meal Logging Failed", String(error));
    }
  };

  const promptMealPhotoCatalogSave = (
    recognizedFoods: any[],
    mealType: MealType,
    options?: {
      confidence?: number;
      successMessage?: string;
    },
  ) => {
    crossPlatformAlert(
      "Save As Reusable Foods?",
      "Meal-photo scans are still estimates. Save reusable foods only after you have reviewed the names and portions.",
      [
        {
          text: "Log Only",
          style: "cancel",
          onPress: () => {
            void logRecognizedMealWithReview(recognizedFoods, mealType, {
              confidence: options?.confidence,
              persistCatalogFoods: false,
              successMessage: options?.successMessage,
            });
          },
        },
        {
          text: "Log + Save Foods",
          onPress: () => {
            void logRecognizedMealWithReview(recognizedFoods, mealType, {
              confidence: options?.confidence,
              persistCatalogFoods: true,
              successMessage:
                options?.successMessage &&
                `${options.successMessage}\n\nSaved as reusable foods for future logging.`,
            });
          },
        },
      ],
    );
  };

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

    if (!canUseFeature("barcode_scan")) {
      triggerPaywall(
        "You've reached your free AI scan limit. Upgrade to Pro for unlimited food recognition.",
      );
      return;
    }

    pendingPhotoUriRef.current = imageUri;
    pendingPhotoGuestRef.current = setShowGuestSignUp;
    setShowWeightPrompt(true);
  };

  const confirmPhotoRecognition = async (weightGrams?: number) => {
    const imageUri = pendingPhotoUriRef.current;
    const setShowGuestSignUp = pendingPhotoGuestRef.current;
    pendingPhotoUriRef.current = null;
    pendingPhotoGuestRef.current = null;
    setShowWeightPrompt(false);

    if (!imageUri) return;

    try {
      setIsGeneratingMeal(true);
      setAiError(null);

      const dietaryRestrictions = mergedDietPrefs?.allergies || undefined;
      const result = await foodRecognitionService.recognizeFood(
        imageUri,
        selectedMealType,
        dietaryRestrictions,
        weightGrams ?? portionGrams ?? undefined,
        "IN",
        "indian",
      );
      setPortionGrams(null);

      if (result.success && result.foods) {
        const recognizedFoods = result.foods;
        const totalCalories = recognizedFoods.reduce(
          (sum: number, food: any) => sum + food.nutrition.calories,
          0,
        );

        if (logMealCallbackRef.current) {
          logMealCallbackRef.current(
            mapRecognizedFoodsToScanResult(
              recognizedFoods,
              selectedMealType,
              result.overallConfidence,
            ),
          );
          logMealCallbackRef.current = null;
          setIsGeneratingMeal(false);
          return;
        }

        crossPlatformAlert(
          "Meal Estimate Ready",
          `Recognized ${recognizedFoods.length} food item(s):\n\n` +
            `${recognizedFoods.map((food: any) => `• ${food.name} (${Math.round(food.nutrition.calories)} cal)`).join("\n")}\n\n` +
            `Total: ${Math.round(totalCalories)} calories\n` +
            `Confidence: ${result.overallConfidence}%\n\n` +
            `This is an AI estimate. Review the foods and portions before logging.`,
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
              onPress: () => {
                promptMealPhotoCatalogSave(recognizedFoods, selectedMealType, {
                  confidence: result.overallConfidence,
                });
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
    if (!feedbackData) return;
    try {
      if (!user?.id) {
        crossPlatformAlert(
          "Sign In Required",
          "Please sign in to submit feedback.",
        );
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
        crossPlatformAlert(
          "Error",
          "Failed to submit feedback. Please try again.",
        );
      }
    } catch (error) {
      crossPlatformAlert(
        "Error",
        "Failed to submit feedback. Please try again.",
      );
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
              imageUri: portionData?.imageUri || "",
              mealId: `temp_${Date.now()}`,
            });
            setShowFeedbackModal(true);
          },
        },
        {
          text: "Log Meal",
          onPress: () => {
            promptMealPhotoCatalogSave(adjustedFoods, selectedMealType, {
              confidence: getAverageRecognitionConfidence(adjustedFoods),
              successMessage:
                `${adjustedFoods.length} food item${adjustedFoods.length !== 1 ? "s" : ""} logged\n` +
                `Total: ${Math.round(totalCalories)} calories\n` +
                `Meal Type: ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}\n\n` +
                `Your nutrition tracking has been updated!`,
            });
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
        crossPlatformAlert(
          "Scan Nutrition Label",
          "We could not find trustworthy packaged-food nutrition for this barcode. Scan the label to read the printed values.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Scan Label",
              onPress: () => {
                void handleLabelScanned(undefined, null);
              },
            },
            {
              text: "Contribute Product",
              onPress: () => options?.onBarcodeNotFound?.(barcode),
            },
          ],
        );
        return;
      }

      const product = lookupResult.product;
      const healthAssessment = generateHealthAssessment(product);
      const packagedFoodProvenance = buildPackagedFoodProvenance(
        product,
        "barcode",
      );

      if (packagedFoodProvenance.truthLevel === "estimated") {
        crossPlatformAlert(
          "Scan Nutrition Label",
          `We found ${product.name}, but the nutrition is still estimated. Scan the label to read the printed values before logging.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Scan Label",
              onPress: () => {
                void handleLabelScanned(undefined, null, product.name);
              },
            },
            {
              text: "View Anyway",
              onPress: () => {
                setScannedProduct(product);
                setProductHealthAssessment(healthAssessment);
                setShowProductModal(true);
              },
            },
          ],
        );
        return;
      }

      if (logMealCallbackRef.current) {
        logMealCallbackRef.current(
          mapScannedProductToScanResult(product, "barcode"),
        );
        logMealCallbackRef.current = null;
        return;
      }

      setScannedProduct(product);
      setProductHealthAssessment(healthAssessment);
      setShowProductModal(true);

      crossPlatformAlert(
        "Product Scanned Successfully!",
        `Found: ${product.name}\nHealth Score: ${healthAssessment.overallScore}/100` +
          (packagedFoodProvenance.requiresReview
            ? `\n\nReview the nutrition before logging.`
            : ""),
        [{ text: "View Details", onPress: () => setShowProductModal(true) }],
      );
    } catch (error) {
      crossPlatformAlert("Scanning Error", String(error));
    } finally {
      setIsProcessingBarcode(false);
    }
  };

  const handleAddProductToMeal = (
    product: ScannedProduct,
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (isGuestMode || !user?.id) {
      crossPlatformAlert(
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

    crossPlatformAlert(
      "Add to Meal",
      `Add ${product.name} to your current meal?`,
      [
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
                barcode: product.barcode,
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

              const packagedFoodProvenance = buildPackagedFoodProvenance(
                product,
                product.source === "vision-label" ? "label" : "barcode",
              );

              const logResult = await recognizedFoodLogger.logRecognizedFoods(
                user.id,
                [foodEntry],
                selectedMealType,
                undefined,
                {
                  provenance: packagedFoodProvenance,
                  persistCatalogFoods:
                    packagedFoodProvenance.truthLevel !== "estimated",
                },
              );

              if (logResult.success) {
                // Update nutritionStore so daily macro bars update immediately
                await addScannedMealToStore([foodEntry], selectedMealType);

                crossPlatformAlert(
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
              crossPlatformAlert("Error", "Failed to add product to meal.");
            }
          },
        },
      ],
    );
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
      crossPlatformAlert(
        "Sign Up Required",
        "Create an account to generate personalized AI meals.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!profilePersonalInfo || !mergedFitnessGoals?.primary_goals?.length) {
      crossPlatformAlert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    if (!canUseFeature("ai_generation")) {
      triggerPaywall(
        "You've used your free AI generation for this month. Upgrade to Pro for unlimited meal plans.",
      );
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const calorieTarget = getCalorieTarget();
      if (!calorieTarget) throw new Error("Calorie target not calculated.");

      const preferences = {
        dietaryRestrictions: mergedDietPrefs?.allergies || [],
        cuisinePreference: options?.cuisinePreference || "any",
        prepTimeLimit: options?.quickEasy ? 20 : 30,
        calorieTarget: calorieTarget,
        dietType: mergedDietPrefs?.diet_type || [],
        dislikes: (mergedDietPrefs as any)?.dislikes || [],
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
        profilePersonalInfo!,
        mergedFitnessGoals as any,
        actualMealType as "breakfast" | "lunch" | "dinner" | "snack",
        preferences as any,
      );

      if (response.success && response.data) {
        // Push generated meal to Zustand nutrition store so DietScreen renders it
        const currentMeals = weeklyMealPlan?.meals || [];
        const updatedPlan: WeeklyMealPlan = {
          id: weeklyMealPlan?.id || `meal_plan_${Date.now()}`,
          weekNumber:
            weeklyMealPlan?.weekNumber || Math.ceil(new Date().getDate() / 7),
          meals: [...currentMeals, response.data],
          planTitle: weeklyMealPlan?.planTitle || "AI Generated Meals",
        };
        setWeeklyMealPlan(updatedPlan);

        crossPlatformAlert(
          "Meal Generated!",
          `Your personalized ${mealType} is ready!`,
        );
        incrementUsage("ai_generation");
      } else {
        const errMsg = response.error || "Failed to generate meal";
        if (
          errMsg.toLowerCase().includes("feature limit exceeded") ||
          errMsg.toLowerCase().includes("limit exceeded")
        ) {
          triggerPaywall(
            "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
          );
        } else {
          setAiError(errMsg);
          crossPlatformAlert("Generation Failed", errMsg);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.toLowerCase().includes("feature limit exceeded") ||
        errorMessage.toLowerCase().includes("limit exceeded")
      ) {
        triggerPaywall(
          "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
        );
      } else {
        setAiError(errorMessage);
        crossPlatformAlert("Error", errorMessage);
      }
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const generateDailyMealPlan = async (
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (!user?.id || user.id.startsWith("guest")) {
      crossPlatformAlert(
        "Sign Up Required",
        "Create an account to generate meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!profilePersonalInfo || !mergedFitnessGoals?.primary_goals?.length) {
      crossPlatformAlert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    if (!canUseFeature("ai_generation")) {
      triggerPaywall(
        "You've used your free AI generation for this month. Upgrade to Pro for unlimited meal plans.",
      );
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const userCalorieTarget = getCalorieTarget();
      if (!userCalorieTarget) throw new Error("Calorie target not calculated.");

      const preferences = {
        calorieTarget: userCalorieTarget,
        dietaryRestrictions: mergedDietPrefs?.allergies || [],
        cuisinePreferences: ["any"],
      };

      const response = await aiService.generateDailyMealPlan(
        profilePersonalInfo!,
        mergedFitnessGoals as any,
        preferences as any,
      );

      if (response.success && response.data) {
        const generatedMeals = response.data.meals as unknown as DayMeal[];

        // Push to weeklyMealPlan store so MealPlanView renders the new meals immediately
        const currentPlan = weeklyMealPlan || {
          id: `plan_${Date.now()}`,
          weekNumber: Math.ceil(new Date().getDate() / 7),
          meals: [],
          planTitle: "Daily Meal Plan",
        };
        const updatedPlan: WeeklyMealPlan = {
          ...currentPlan,
          meals: [...currentPlan.meals, ...generatedMeals],
          planTitle: currentPlan.planTitle || "Daily Meal Plan",
        };
        setWeeklyMealPlan(updatedPlan);

        crossPlatformAlert("Daily Meal Plan Generated!", "Your plan is ready!");
        incrementUsage("ai_generation");
      } else {
        const errMsg = response.error || "Failed to generate plan";
        if (
          errMsg.toLowerCase().includes("feature limit exceeded") ||
          errMsg.toLowerCase().includes("limit exceeded")
        ) {
          triggerPaywall(
            "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
          );
        } else {
          setAiError(errMsg);
          crossPlatformAlert("Generation Failed", errMsg);
        }
      }
    } catch (error) {
      setAiError(String(error));
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.toLowerCase().includes("feature limit exceeded") ||
        errorMessage.toLowerCase().includes("limit exceeded")
      ) {
        triggerPaywall(
          "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
        );
      } else {
        crossPlatformAlert("Error", errorMessage);
      }
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  /**
   * Let the user pick a photo of a nutrition facts table.
   * Gemini Vision reads the values verbatim and we display the result in
   * the same ProductDetailsModal used by the barcode scanner.
   */
  const handleLabelScanned = async (
    setShowGuestSignUp?: ((show: boolean) => void) | undefined,
    portionGrams?: number | null,
    productNameHint?: string,
  ) => {
    if (isGuestMode || !user?.id) {
      crossPlatformAlert(
        "Sign Up for Label Scan",
        "Create a free account to use AI nutrition label scanning.",
        [
          { text: "Maybe Later", style: "cancel" },
          {
            text: "Sign Up Free",
            onPress: () => setShowGuestSignUp?.(true),
            style: "default",
          },
        ],
      );
      return;
    }

    if (!canUseFeature("barcode_scan")) {
      triggerPaywall(
        "You've reached your scan limit. Upgrade to Pro for unlimited label scanning.",
      );
      return;
    }

    try {
      // Dynamically import expo-image-picker to avoid loading it at startup.
      // expo-image-picker is a first-party Expo module that ships with Expo SDK.
      const ImagePicker = await import("expo-image-picker");

      await ImagePicker.requestCameraPermissionsAsync();

      // Open camera first so user can capture the label directly.
      // If they cancel the camera, fall back to gallery upload.
      const camResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ("images" as any),
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (camResult.canceled || !camResult.assets?.[0]) {
        // Camera cancelled — let user pick from gallery instead
        const galleryResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ("images" as any),
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });

        if (galleryResult.canceled || !galleryResult.assets?.[0]) {
          return; // User cancelled both
        }

        const asset = galleryResult.assets[0];
        const mimeType = asset.mimeType || "image/jpeg";
        const imageBase64 = `data:${mimeType};base64,${asset.base64}`;
        await _processLabelImage(imageBase64, portionGrams, productNameHint);
      } else {
        const asset = camResult.assets[0];
        const mimeType = asset.mimeType || "image/jpeg";
        const imageBase64 = `data:${mimeType};base64,${asset.base64}`;
        await _processLabelImage(imageBase64, portionGrams, productNameHint);
      }
    } catch (err) {
      crossPlatformAlert("Label Scan Failed", String(err));
    }
  };

  /**
   * Helper: send image to the Worker, map response → ScannedProduct, show modal.
   */
  const _processLabelImage = async (
    imageBase64: string,
    portionGrams?: number | null,
    productNameHint?: string,
  ) => {
    setIsProcessingBarcode(true);
    try {
      const response = await fitaiWorkersClient.scanNutritionLabel(
        imageBase64,
        productNameHint,
      );

      if (!response.success || !response.data) {
        crossPlatformAlert(
          "Label Not Read",
          "Could not extract nutrition data. Ensure the label is well-lit and the entire nutrition facts table is visible.",
        );
        return;
      }

      const d = response.data;

      // Map Worker response → ScannedProduct (same shape as barcode lookup result)
      const product: ScannedProduct = {
        barcode: `label_${Date.now()}`, // synthetic barcode for this scan
        name: d.productName || "Scanned Product",
        brand: d.brand,
        nutrition: {
          // Prefer per-100g values for consistency with the rest of the app
          calories: d.per100g.calories,
          protein: d.per100g.protein,
          carbs: d.per100g.carbs,
          fat: d.per100g.fat,
          fiber: d.per100g.fiber ?? 0,
          sugar: d.per100g.sugar,
          sodium: d.per100g.sodium,
          // If user provided portion grams, use that as the serving size for accurate scaling
          servingSize:
            portionGrams != null && portionGrams > 0
              ? portionGrams
              : d.servingSize,
          servingUnit:
            portionGrams != null && portionGrams > 0 ? "g" : d.servingUnit,
        },
        perServing: d.perServing
          ? {
              calories: d.perServing.calories,
              protein: d.perServing.protein,
              carbs: d.perServing.carbs,
              fat: d.perServing.fat,
              fiber: d.perServing.fiber,
              sugar: d.perServing.sugar,
              sodium: d.perServing.sodium,
            }
          : undefined,
        additionalInfo: {
          ingredients: d.ingredients
            ? d.ingredients.split(",").map((s) => s.trim())
            : undefined,
          allergens: d.allergens,
        },
        healthScore: undefined, // will be generated by generateHealthAssessment below
        confidence: d.confidence,
        source: "vision-label",
        lastScanned: new Date().toISOString(),
        isAIEstimated: false,
      };

      product.healthScore = generateHealthAssessment(product).overallScore;

      const healthAssessment = generateHealthAssessment(product);
      incrementUsage("barcode_scan");

      if (logMealCallbackRef.current) {
        logMealCallbackRef.current(
          mapScannedProductToScanResult(product, "label"),
        );
        logMealCallbackRef.current = null;
        return;
      }

      setScannedProduct(product);
      setProductHealthAssessment(healthAssessment);
      setShowProductModal(true);
    } catch (err) {
      crossPlatformAlert("Label Scan Error", String(err));
    } finally {
      setIsProcessingBarcode(false);
    }
  };

  const mapRecognizedFoodsToScanResult = (
    foods: any[],
    mealType?: MealType,
    confidence?: number,
  ): LogMealScanResult => ({
    type: "food",
    mealName: foods.map((f: any) => f.localName || f.name).join(", "),
    suggestedMealType: mealType,
    portionAssumptionGrams:
      foods.reduce(
        (sum: number, f: any) => sum + (f.userGrams ?? f.estimatedGrams ?? 0),
        0,
      ) || undefined,
    ingredients: foods.map((f: any) => ({
      name: f.localName || f.name,
      grams: (f.userGrams ?? f.estimatedGrams ?? 100).toFixed(0),
      protein: (f.nutrition?.protein ?? 0).toFixed(1),
      carbs: (f.nutrition?.carbs ?? 0).toFixed(1),
      fat: (f.nutrition?.fat ?? 0).toFixed(1),
      fiber: (f.nutrition?.fiber ?? 0).toFixed(1),
    })),
    confidence,
    provenance: buildMealPhotoProvenance(confidence),
    reviewNote:
      "AI meal estimate. Review the food names, portions, and macros before saving.",
  });

  const mapScannedProductToScanResult = (
    product: ScannedProduct,
    type: "label" | "barcode",
  ): LogMealScanResult => {
    const provenance = buildPackagedFoodProvenance(product, type);
    const usePerServing = type === "label" && product.perServing != null;
    const n = usePerServing ? product.perServing! : product.nutrition;
    return {
      type,
      mealName: product.brand
        ? `${product.name} (${product.brand})`
        : product.name,
      directEntry: {
        calories: Math.round(n.calories).toString(),
        protein: (n.protein ?? 0).toFixed(1),
        carbs: (n.carbs ?? 0).toFixed(1),
        fat: (n.fat ?? 0).toFixed(1),
        fiber: ("fiber" in n ? (n.fiber ?? 0) : 0).toFixed(1),
      },
      confidence: product.confidence,
      provenance,
      reviewNote:
        type === "label"
          ? "Label values were read from the package. Review before saving if anything looks off."
          : provenance.truthLevel === "estimated"
            ? "Barcode identity was found, but the nutrition is still estimated. Prefer a label scan when possible."
            : provenance.requiresReview
              ? "Barcode nutrition is available, but this result should be reviewed before saving."
              : "Barcode nutrition was matched from a product database.",
    };
  };

  return {
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
    handleLabelScanned,
    handleAddProductToMeal,
    generateAIMeal,
    generateDailyMealPlan,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,

    portionGrams,
    setPortionGrams,
    showWeightPrompt,
    confirmPhotoRecognition,
    dismissWeightPrompt: () => {
      pendingPhotoUriRef.current = null;
      pendingPhotoGuestRef.current = null;
      setShowWeightPrompt(false);
    },
    setLogMealScanCallback,
  };
};
