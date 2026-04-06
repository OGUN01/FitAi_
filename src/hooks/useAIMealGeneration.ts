import { useState, useRef, useEffect, useCallback } from "react";
import { ScanResultData } from "../components/diet/ScanResultModal";
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
import {
  barcodeService,
  ProductLookupResult,
  ScannedProduct,
} from "../services/barcodeService";
import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import { useAuth } from "./useAuth";
import { useNutritionData } from "./useNutritionData";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { DayMeal, WeeklyMealPlan } from "../types/ai";
import { useSubscriptionStore } from "../stores/subscriptionStore";
// usePaywall import removed â€” triggerPaywall now via subscriptionStore
import { LogMealScanResult } from "../components/diet/LogMealModal";
import { MealLogProvenance } from "../types/nutritionLogging";
import {
  clampPackagedFoodGrams,
  getDefaultPackagedFoodGrams,
  scaleScannedProductNutrition,
} from "../utils/packagedFoodNutrition";
import { imageAssetToDataUrl, imageUriToDataUrl } from "../utils/imageDataUrl";
import { normalizeMealLogFiberValue } from "../utils/mealLogNutrition";
import {
  buildPackagedFoodProvenance as buildSharedPackagedFoodProvenance,
  generatePackagedFoodHealthAssessment,
  mapScannedProductToScanResult as mapSharedScannedProductToScanResult,
} from "../features/barcode/packagedFood";

const buildMealPhotoProvenance = (confidence?: number): MealLogProvenance => {
  const country = useProfileStore.getState().personalInfo?.country ?? null;
  if (!country) {
    console.warn('Meal generation: country not set in profile');
  }
  return {
    mode: "meal_photo",
    truthLevel: "estimated",
    confidence: confidence ?? null,
    countryContext: country,
    requiresReview: true,
    source: "food-recognition",
  };
};

const buildPackagedFoodEntry = (product: ScannedProduct, grams: number) => {
  const safeGrams = clampPackagedFoodGrams(grams);
  const scaledNutrition = scaleScannedProductNutrition(product, safeGrams);
  const packagedFoodSource =
    product.source === "vision-label" ? "label" : "barcode";

  return {
    id: `packaged_${packagedFoodSource}_${Date.now()}`,
    name: product.name,
    category: "main",
    cuisine: "international",
    barcode:
      packagedFoodSource === "barcode" ? product.barcode : undefined,
    portionSize: {
      estimatedGrams: safeGrams,
      confidence: 95,
      servingType: "medium",
    },
    nutrition: scaledNutrition,
    confidence: product.confidence,
    enhancementSource: packagedFoodSource,
    estimatedGrams: safeGrams,
    userGrams: safeGrams,
    servingDescription: `${safeGrams}g serving`,
    nutritionPer100g: {
      ...product.nutrition,
      servingSize: 100,
      servingUnit: "g",
    },
  } as any;
};

const getNormalizedRecognizedFoodFiber = (food: any) =>
  normalizeMealLogFiberValue(food?.nutrition?.fiber) ?? 0;

type BarcodeEntryPoint =
  | "diet_barcode"
  | "log_meal_barcode"
  | "log_meal_label"
  | "manual_barcode"
  | "label_scan";

type BarcodeCameraSessionState =
  | "idle"
  | "decoding"
  | "lookup_in_progress"
  | "transient_retry"
  | "resolved";

type BarcodeInlineAction = {
  id: "retry" | "manual" | "label" | "cancel" | "contribute";
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

type DietCameraMode = "food" | "progress" | "barcode" | "label";

type BarcodeDebugEvent = {
  entryPoint: BarcodeEntryPoint;
  rawSymbology?: string;
  rawBarcode: string;
  normalizedBarcode: string | null;
  outcome: string;
  retryCount: number;
  finalRoute:
    | "open_product_modal"
    | "log_meal_result"
    | "inline_retry_actions"
    | "weak_data_prompt"
    | "cancelled"
    | "label_scan"
    | "manual_entry"
    | "contribute_product";
};

export const useAIMealGeneration = (options?: {
  onBarcodeNotFound?: (barcode: string) => void;
  onOpenManualEntry?: () => void;
}) => {
  const { user, isGuestMode } = useAuth();
  const weeklyMealPlan = useNutritionStore((state) => state.weeklyMealPlan);
  const setWeeklyMealPlan = useNutritionStore(
    (state) => state.setWeeklyMealPlan,
  );
  // SSOT: profileStore is authoritative for all onboarding data
  const profilePersonalInfo = useProfileStore((state) => state.personalInfo);
  const profileWorkoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );
  const profileDietPreferencesStore = useProfileStore(
    (state) => state.dietPreferences,
  );
  const { loadDailyNutrition, refreshAll } = useNutritionData({
    autoRefresh: false,
  });
  const { getCalorieTarget } = useCalculatedMetrics();
  const canUseFeature = useSubscriptionStore((state) => state.canUseFeature);
  const incrementUsage = useSubscriptionStore((state) => state.incrementUsage);
  const triggerPaywall = useSubscriptionStore((state) => state.triggerPaywall);

  // SSOT: Build merged fitnessGoals â€” profileStore.workoutPreferences is authoritative
  const mergedFitnessGoals = profileWorkoutPreferences
    ? {
        primary_goals: profileWorkoutPreferences.primary_goals || [],
        primaryGoals: profileWorkoutPreferences.primary_goals || [],
        experience: profileWorkoutPreferences.intensity || "beginner",
        experience_level: profileWorkoutPreferences.intensity || "beginner",
        time_commitment: String(
          profileWorkoutPreferences.time_preference ?? 45,
        ),
        preferred_equipment: profileWorkoutPreferences.equipment,
        target_areas: undefined,
      }
    : null;

  // SSOT: Build merged dietPreferences â€” profileStore.dietPreferences is authoritative
  const mergedDietPrefs = profileDietPreferencesStore
    ? {
        ...profileDietPreferencesStore,
      }
    : null;

  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<DietCameraMode>("food");

  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null,
  );
  const [productHealthAssessment, setProductHealthAssessment] =
    useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const [barcodeCameraState, setBarcodeCameraState] =
    useState<BarcodeCameraSessionState>("idle");
  const [barcodeStatusMessage, setBarcodeStatusMessage] = useState<
    string | null
  >(null);
  const [barcodeInlineActions, setBarcodeInlineActions] = useState<
    BarcodeInlineAction[]
  >([]);
  const [activeBarcodeEntryPoint, setActiveBarcodeEntryPoint] =
    useState<BarcodeEntryPoint>("diet_barcode");

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
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [showScanResult, setShowScanResult] = useState(false);

  const pendingPhotoUriRef = useRef<string | null>(null);
  const pendingPhotoGuestRef = useRef<((show: boolean) => void) | null>(null);
  const pendingLabelScanRef = useRef<{
    portionGrams?: number | null;
    productNameHint?: string;
  } | null>(null);

  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logMealCallbackRef = useRef<
    ((result: LogMealScanResult) => void) | null
  >(null);
  const barcodeRetryCountRef = useRef(0);
  const activeLookupBarcodeRef = useRef<string | null>(null);
  const lookupInProgressRef = useRef(false);

  const setLogMealScanCallback = useCallback(
    (cb: ((result: LogMealScanResult) => void) | null) => {
      logMealCallbackRef.current = cb;
    },
    [],
  );

  const clearPendingLabelScan = useCallback(() => {
    pendingLabelScanRef.current = null;
  }, []);

  const getLabelEntryPoint = useCallback(
    (entryPoint?: BarcodeEntryPoint): BarcodeEntryPoint => {
      if (entryPoint) {
        return entryPoint;
      }

      return activeBarcodeEntryPoint === "log_meal_barcode" ||
        logMealCallbackRef.current
        ? "log_meal_label"
        : "label_scan";
    },
    [activeBarcodeEntryPoint],
  );

  useEffect(() => {
    return () => {
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
      }
    };
  }, []);

  const emitBarcodeDebugEvent = useCallback((event: BarcodeDebugEvent) => {
    const shouldRecord =
      (typeof __DEV__ !== "undefined" && __DEV__) ||
      process.env.NODE_ENV === "test";

    if (!shouldRecord) return;

    const target = globalThis as typeof globalThis & {
      __FITAI_BARCODE_DEBUG_EVENTS__?: BarcodeDebugEvent[];
    };
    target.__FITAI_BARCODE_DEBUG_EVENTS__ = [
      ...(target.__FITAI_BARCODE_DEBUG_EVENTS__ ?? []),
      event,
    ];

    if (process.env.NODE_ENV !== "test") {
      console.info("[BarcodeSession]", event);
    }
  }, []);

  const resetBarcodeScannerUi = useCallback(() => {
    setBarcodeCameraState("idle");
    setBarcodeStatusMessage(null);
    setBarcodeInlineActions([]);
    activeLookupBarcodeRef.current = null;
    barcodeRetryCountRef.current = 0;
  }, []);

  const clearBarcodeSession = useCallback(
    (options?: { clearLogMealCallback?: boolean; resetEntryPoint?: boolean }) => {
      resetBarcodeScannerUi();
      if (options?.clearLogMealCallback) {
        logMealCallbackRef.current = null;
      }
      if (options?.resetEntryPoint ?? true) {
        setActiveBarcodeEntryPoint("diet_barcode");
      }
    },
    [resetBarcodeScannerUi],
  );

  const showInlineBarcodeResolution = useCallback(
    (message: string, actions: BarcodeInlineAction[]) => {
      setBarcodeCameraState("resolved");
      setBarcodeStatusMessage(message);
      setBarcodeInlineActions(actions);
    },
    [],
  );

  const openManualEntryFromBarcode = useCallback(() => {
    emitBarcodeDebugEvent({
      entryPoint: activeBarcodeEntryPoint,
      rawBarcode: activeLookupBarcodeRef.current || "",
      normalizedBarcode: activeLookupBarcodeRef.current,
      outcome: "manual_entry",
      retryCount: barcodeRetryCountRef.current,
      finalRoute: "manual_entry",
    });
    setShowCamera(false);
    resetBarcodeScannerUi();
    options?.onOpenManualEntry?.();
  }, [
    activeBarcodeEntryPoint,
    emitBarcodeDebugEvent,
    options,
    resetBarcodeScannerUi,
  ]);

  const handleBarcodeCameraClose = useCallback(() => {
    emitBarcodeDebugEvent({
      entryPoint: activeBarcodeEntryPoint,
      rawBarcode: activeLookupBarcodeRef.current || "",
      normalizedBarcode: activeLookupBarcodeRef.current,
      outcome: "cancelled",
      retryCount: barcodeRetryCountRef.current,
      finalRoute: "cancelled",
    });
    logMealCallbackRef.current = null;
    setShowCamera(false);
    clearBarcodeSession();
  }, [activeBarcodeEntryPoint, clearBarcodeSession, emitBarcodeDebugEvent]);

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

      // Scanned meals are already persisted as meal_logs and hydrated via
      // refreshAll/loadData. Mirroring them into weeklyMealPlan would double-count.
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

  const handleScanProduct = (
    entryPoint: BarcodeEntryPoint = "diet_barcode",
  ) => {
    if (!canUseFeature("barcode_scan")) {
      triggerPaywall(
        "You've reached your barcode scan limit. Upgrade to Pro for unlimited barcode scanning.",
      );
      return;
    }
    clearBarcodeSession({
      clearLogMealCallback: entryPoint !== "log_meal_barcode",
      resetEntryPoint: false,
    });
    setActiveBarcodeEntryPoint(entryPoint);
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
        "AI food recognition uses advanced machine learning to analyze your meals with 90%+ accuracy.\n\nCreate a free account to:\nâ€¢ Scan food photos instantly\nâ€¢ Get personalized nutrition insights\nâ€¢ Track your meals automatically",
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
        "You've reached your AI food scan limit. Upgrade to Pro for unlimited food recognition.",
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
      const userCountry = useProfileStore.getState().personalInfo?.country ?? undefined;
      if (!userCountry) {
        console.warn('Meal generation: country not set in profile');
      }
      const userCuisine = useProfileStore.getState().dietPreferences?.cuisine_preferences?.[0] ?? userCountry;
      const result = await foodRecognitionService.recognizeFood(
        imageUri,
        selectedMealType,
        dietaryRestrictions,
        weightGrams ?? portionGrams ?? undefined,
        userCountry,
        userCuisine,
      );
      setPortionGrams(null);

      if (result.success && result.foods) {
        const recognizedFoods = result.foods;
        const totalCalories = recognizedFoods.reduce(
          (sum: number, food: any) => sum + food.nutrition.calories,
          0,
        );

        if (logMealCallbackRef.current) {
          try {
            await (logMealCallbackRef.current(
              mapRecognizedFoodsToScanResult(
                recognizedFoods,
                selectedMealType,
                result.overallConfidence,
              ),
            ) ?? Promise.resolve());
          } catch (err) {
            console.error('[AIMealGeneration] logMealCallback failed:', err);
          }
          logMealCallbackRef.current = null;
          setIsGeneratingMeal(false);
          return;
        }

        const totalProteinScan = recognizedFoods.reduce(
          (s: number, f: any) => s + (f.nutrition?.protein || 0),
          0,
        );
        const totalCarbsScan = recognizedFoods.reduce(
          (s: number, f: any) => s + (f.nutrition?.carbs || 0),
          0,
        );
        const totalFatScan = recognizedFoods.reduce(
          (s: number, f: any) => s + (f.nutrition?.fat || 0),
          0,
        );
        const totalFiberScan = recognizedFoods.reduce(
          (s: number, f: any) => s + getNormalizedRecognizedFoodFiber(f),
          0,
        );

        setScanResult({
          recognizedFoods,
          totalCalories,
          totalProtein: totalProteinScan,
          totalCarbs: totalCarbsScan,
          totalFat: totalFatScan,
          totalFiber: totalFiberScan,
          confidence: result.overallConfidence ?? 0,
          mealType: selectedMealType,
          imageUri,
        });
        setShowScanResult(true);
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

  const openPackagedFoodDetails = useCallback(
    (
      product: ScannedProduct,
      options: {
        outcome: string;
        clearLogMealCallback?: boolean;
        resetEntryPoint?: boolean;
      },
    ) => {
      const isLabelResult = product.source === "vision-label";
      const rawBarcode = isLabelResult
        ? ""
        : activeLookupBarcodeRef.current || product.barcode;
      const healthAssessment = generatePackagedFoodHealthAssessment(product);

      setShowCamera(false);
      setScannedProduct(product);
      setProductHealthAssessment(healthAssessment);
      setShowProductModal(true);
      clearBarcodeSession({
        clearLogMealCallback: options.clearLogMealCallback,
        resetEntryPoint: options.resetEntryPoint,
      });
      emitBarcodeDebugEvent({
        entryPoint: activeBarcodeEntryPoint,
        rawBarcode,
        normalizedBarcode: isLabelResult ? null : product.barcode,
        outcome: options.outcome,
        retryCount: barcodeRetryCountRef.current,
        finalRoute: "open_product_modal",
      });
    },
    [activeBarcodeEntryPoint, clearBarcodeSession, emitBarcodeDebugEvent],
  );

  const finishPackagedFoodRoute = useCallback(
    (product: ScannedProduct, mode: "barcode" | "label") => {
      const pendingPortionGrams =
        mode === "label" ? pendingLabelScanRef.current?.portionGrams : null;
      const productForRoute =
        mode === "label" &&
        pendingPortionGrams != null &&
        pendingPortionGrams > 0
          ? {
              ...product,
              nutrition: {
                ...product.nutrition,
                servingSize: pendingPortionGrams,
                servingUnit: "g",
              },
            }
          : product;

      if (
        activeBarcodeEntryPoint === "log_meal_barcode" &&
        logMealCallbackRef.current
      ) {
        logMealCallbackRef.current(
          mapSharedScannedProductToScanResult(productForRoute, mode),
        );
        logMealCallbackRef.current = null;
        clearBarcodeSession();
        setShowCamera(false);
        emitBarcodeDebugEvent({
          entryPoint: activeBarcodeEntryPoint,
          rawBarcode: activeLookupBarcodeRef.current || productForRoute.barcode,
          normalizedBarcode: productForRoute.barcode,
          outcome: mode === "label" ? "label_resolved" : "authoritative_hit",
          retryCount: barcodeRetryCountRef.current,
          finalRoute: "log_meal_result",
        });
        return;
      }

      openPackagedFoodDetails(productForRoute, {
        outcome: mode === "label" ? "label_resolved" : "authoritative_hit",
        clearLogMealCallback: true,
      });
    },
    [
      activeBarcodeEntryPoint,
      clearBarcodeSession,
      emitBarcodeDebugEvent,
      openPackagedFoodDetails,
    ],
  );

  function presentWeakDataPrompt(product: ScannedProduct) {
      setShowCamera(false);

      crossPlatformAlert(
        "Scan Nutrition Label",
        `We found ${product.name}, but the nutrition is still estimated. Scan the label to read the printed values before logging.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              clearBarcodeSession({
                clearLogMealCallback: activeBarcodeEntryPoint === "log_meal_barcode",
              });
              emitBarcodeDebugEvent({
                entryPoint: activeBarcodeEntryPoint,
                rawBarcode: activeLookupBarcodeRef.current || product.barcode,
                normalizedBarcode: product.barcode,
                outcome: "weak_data",
                retryCount: barcodeRetryCountRef.current,
                finalRoute: "cancelled",
              });
            },
          },
          {
            text: "Scan Label",
            onPress: () => {
              emitBarcodeDebugEvent({
                entryPoint: activeBarcodeEntryPoint,
                rawBarcode: activeLookupBarcodeRef.current || product.barcode,
                normalizedBarcode: product.barcode,
                outcome: "weak_data",
                retryCount: barcodeRetryCountRef.current,
                finalRoute: "label_scan",
              });
              clearBarcodeSession({ resetEntryPoint: false });
              void handleLabelScanned(undefined, undefined, product.name);
            },
          },
          {
            text: "View Anyway",
            onPress: () => {
              openPackagedFoodDetails(product, {
                outcome: "weak_data",
                clearLogMealCallback: activeBarcodeEntryPoint !== "log_meal_barcode",
                resetEntryPoint: true,
              });
            },
          },
        ],
      );
  }

  const handleBarcodeScanned = async (
    normalizedBarcode: string,
    rawSymbology?: string,
    rawBarcode?: string,
  ) => {
    if (lookupInProgressRef.current) {
      return;
    }
    if (
      barcodeCameraState !== "idle" &&
      barcodeCameraState !== "decoding" &&
      barcodeCameraState !== "transient_retry"
    ) {
      return;
    }

    lookupInProgressRef.current = true;
    const effectiveRawBarcode = rawBarcode ?? normalizedBarcode;
    if (activeLookupBarcodeRef.current === normalizedBarcode) {
      return;
    }

    activeLookupBarcodeRef.current = normalizedBarcode;
    setBarcodeCameraState("decoding");
    setBarcodeStatusMessage("Reading barcode...");
    setBarcodeInlineActions([]);
    setIsProcessingBarcode(true);

    const runLookup = async (attempt: number): Promise<void> => {
      barcodeRetryCountRef.current = attempt;
      setBarcodeCameraState(
        attempt === 0 ? "lookup_in_progress" : "transient_retry",
      );
      setBarcodeStatusMessage(
        attempt === 0 ? "Looking up product..." : "Retrying lookup...",
      );

      const lookupResult = await barcodeService.lookupProduct(effectiveRawBarcode, {
        rawSymbology,
      });

      if (lookupResult.outcome === "transient_failure" && attempt === 0) {
        emitBarcodeDebugEvent({
          entryPoint: activeBarcodeEntryPoint,
          rawSymbology,
          rawBarcode: effectiveRawBarcode,
          normalizedBarcode: lookupResult.meta.normalizedBarcode,
          outcome: lookupResult.outcome,
          retryCount: attempt,
          finalRoute: "inline_retry_actions",
        });
        await runLookup(1);
        return;
      }

      switch (lookupResult.outcome) {
        case "authoritative_hit":
          if (lookupResult.product) {
            incrementUsage("barcode_scan");
            finishPackagedFoodRoute(lookupResult.product, "barcode");
          }
          break;
        case "weak_data":
          if (lookupResult.product) {
            emitBarcodeDebugEvent({
              entryPoint: activeBarcodeEntryPoint,
              rawSymbology,
              rawBarcode: effectiveRawBarcode,
              normalizedBarcode: lookupResult.meta.normalizedBarcode,
              outcome: lookupResult.outcome,
              retryCount: attempt,
              finalRoute: "weak_data_prompt",
            });
            presentWeakDataPrompt(lookupResult.product);
          }
          break;
        case "not_found":
          emitBarcodeDebugEvent({
            entryPoint: activeBarcodeEntryPoint,
            rawSymbology,
            rawBarcode: effectiveRawBarcode,
            normalizedBarcode: lookupResult.meta.normalizedBarcode,
            outcome: lookupResult.outcome,
            retryCount: attempt,
            finalRoute: "inline_retry_actions",
          });
          showInlineBarcodeResolution(
            "Product not found in trusted sources. You can retry, enter it manually, scan the label, or contribute it.",
            [
              {
                id: "retry",
                label: "Retry",
                variant: "primary",
                onPress: () => {
                  activeLookupBarcodeRef.current = null;
                  setBarcodeStatusMessage(null);
                  setBarcodeInlineActions([]);
                  setBarcodeCameraState("idle");
                },
              },
              {
                id: "manual",
                label: "Enter Manually",
                variant: "secondary",
                onPress: openManualEntryFromBarcode,
              },
              {
                id: "label",
                label: "Scan Label",
                variant: "secondary",
                onPress: () => {
                  emitBarcodeDebugEvent({
                    entryPoint: activeBarcodeEntryPoint,
                    rawSymbology,
                    rawBarcode: effectiveRawBarcode,
                    normalizedBarcode: lookupResult.meta.normalizedBarcode,
                    outcome: lookupResult.outcome,
                    retryCount: attempt,
                    finalRoute: "label_scan",
                  });
                  setShowCamera(false);
                  clearBarcodeSession({ resetEntryPoint: false });
                  void handleLabelScanned();
                },
              },
              {
                id: "contribute",
                label: "Contribute Product",
                variant: "ghost",
                onPress: () => {
                  emitBarcodeDebugEvent({
                    entryPoint: activeBarcodeEntryPoint,
                    rawSymbology,
                    rawBarcode: effectiveRawBarcode,
                    normalizedBarcode: lookupResult.meta.normalizedBarcode,
                    outcome: lookupResult.outcome,
                    retryCount: attempt,
                    finalRoute: "contribute_product",
                  });
                  logMealCallbackRef.current = null;
                  setShowCamera(false);
                  clearBarcodeSession();
                  options?.onBarcodeNotFound?.(normalizedBarcode);
                },
              },
              {
                id: "cancel",
                label: "Cancel",
                variant: "ghost",
                onPress: () => {
                  emitBarcodeDebugEvent({
                    entryPoint: activeBarcodeEntryPoint,
                    rawSymbology,
                    rawBarcode: effectiveRawBarcode,
                    normalizedBarcode: lookupResult.meta.normalizedBarcode,
                    outcome: lookupResult.outcome,
                    retryCount: attempt,
                    finalRoute: "cancelled",
                  });
                  logMealCallbackRef.current = null;
                  setShowCamera(false);
                  clearBarcodeSession();
                },
              },
            ],
          );
          break;
        case "invalid_scan":
          showInlineBarcodeResolution(
            lookupResult.error ||
              "That code is not a supported packaged-food barcode. Try scanning again or enter it manually.",
            [
              {
                id: "retry",
                label: "Retry",
                variant: "primary",
                onPress: () => {
                  activeLookupBarcodeRef.current = null;
                  setBarcodeStatusMessage(null);
                  setBarcodeInlineActions([]);
                  setBarcodeCameraState("idle");
                },
              },
              {
                id: "manual",
                label: "Enter Manually",
                variant: "secondary",
                onPress: openManualEntryFromBarcode,
              },
              {
                id: "cancel",
                label: "Cancel",
                variant: "ghost",
                onPress: () => {
                  logMealCallbackRef.current = null;
                  setShowCamera(false);
                  clearBarcodeSession();
                },
              },
            ],
          );
          break;
        case "transient_failure":
          showInlineBarcodeResolution(
            lookupResult.error ||
              "Lookup failed before trusted sources completed. Retry or use a fallback.",
            [
              {
                id: "retry",
                label: "Retry",
                variant: "primary",
                onPress: () => {
                  activeLookupBarcodeRef.current = null;
                  setBarcodeStatusMessage(null);
                  setBarcodeInlineActions([]);
                  setBarcodeCameraState("idle");
                },
              },
              {
                id: "manual",
                label: "Enter Manually",
                variant: "secondary",
                onPress: openManualEntryFromBarcode,
              },
              {
                id: "label",
                label: "Scan Label",
                variant: "secondary",
                onPress: () => {
                  setShowCamera(false);
                  clearBarcodeSession({ resetEntryPoint: false });
                  void handleLabelScanned();
                },
              },
              {
                id: "cancel",
                label: "Cancel",
                variant: "ghost",
                onPress: () => {
                  logMealCallbackRef.current = null;
                  setShowCamera(false);
                  clearBarcodeSession();
                },
              },
            ],
          );
          break;
        default:
          break;
      }
    };

    try {
      await runLookup(0);
    } catch (error) {
      showInlineBarcodeResolution("Unexpected barcode error. Retry or use a fallback.", [
        {
          id: "retry",
          label: "Retry",
          variant: "primary",
          onPress: () => {
            activeLookupBarcodeRef.current = null;
            setBarcodeStatusMessage(null);
            setBarcodeInlineActions([]);
            setBarcodeCameraState("idle");
          },
        },
        {
          id: "manual",
          label: "Enter Manually",
          variant: "secondary",
          onPress: openManualEntryFromBarcode,
        },
        {
          id: "cancel",
          label: "Cancel",
          variant: "ghost",
          onPress: () => {
            logMealCallbackRef.current = null;
            setShowCamera(false);
            clearBarcodeSession();
          },
        },
      ]);
    } finally {
      lookupInProgressRef.current = false;
      setIsProcessingBarcode(false);
    }
  };

  const handleManualLookupResolved = useCallback(
    (lookupResult: ProductLookupResult) => {
      if (!lookupResult.product) {
        return;
      }

      if (activeBarcodeEntryPoint !== "log_meal_barcode") {
        setActiveBarcodeEntryPoint("manual_barcode");
      }

      if (lookupResult.outcome === "weak_data") {
        presentWeakDataPrompt(lookupResult.product);
        return;
      }

      finishPackagedFoodRoute(lookupResult.product, "barcode");
    },
    [
      activeBarcodeEntryPoint,
      finishPackagedFoodRoute,
      presentWeakDataPrompt,
    ],
  );

  const handleAddProductToMeal = async (
    product: ScannedProduct,
    setShowGuestSignUp: (show: boolean) => void,
    grams?: number,
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

    try {
      const quantityGrams = clampPackagedFoodGrams(
        grams ?? getDefaultPackagedFoodGrams(product),
      );
      const foodEntry = buildPackagedFoodEntry(product, quantityGrams);

      const packagedFoodProvenance = buildSharedPackagedFoodProvenance(
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

      if (!logResult.success) {
        throw new Error(logResult.error || "Failed to log meal");
      }

      // Packaged-food logs share the same meal_logs hydration path as photo scans.
      // Do not create a second local "planned meal" copy here.
      crossPlatformAlert(
        "Added to Meal",
        `${product.name} (${quantityGrams}g) added to ${selectedMealType}.`,
      );
      setShowProductModal(false);
      await loadDailyNutrition();
      await refreshAll();
    } catch (error) {
      crossPlatformAlert("Error", "Failed to add product to meal.");
    }
  };

  // Post-generation allergen safety check — called after any AI meal response
  const checkAllergenViolations = (meals: any[]): void => {
    if (!mergedDietPrefs?.allergies?.length || !meals?.length) return;
    const allergyKeywords = mergedDietPrefs.allergies.map((a: string) => a.toLowerCase());
    const violations: string[] = [];

    for (const meal of meals) {
      const mealName = (meal?.name ?? meal?.title ?? '').toLowerCase();
      const ingredients = (meal?.ingredients ?? []).map((i: any) =>
        (typeof i === 'string' ? i : i.name ?? '').toLowerCase()
      );
      const allText = [mealName, ...ingredients].join(' ');

      for (const allergen of allergyKeywords) {
        if (allText.includes(allergen)) {
          violations.push(`"${meal?.name ?? 'Unknown meal'}" may contain ${allergen}`);
        }
      }
    }

    if (violations.length > 0) {
      console.warn('[useAIMealGeneration] Potential allergen violations in generated meals:', violations);
      setGenerationWarning(
        `Generated meal may conflict with your dietary restrictions. Please review: ${violations.slice(0, 3).join('; ')}`
      );
    }
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

      // Snapshot profile state upfront before any await to avoid mid-async stale reads
      const { bodyAnalysis: snapshotBodyAnalysis, dietPreferences: snapshotDietPreferences } = useProfileStore.getState();
      const preferences = {
        bodyMetrics: snapshotBodyAnalysis,
        // NOTE: dietPreferences already contains allergies. dietaryRestrictions is a
        // convenience field used by some AI prompt builders. The AI service should treat
        // dietPreferences.allergies as authoritative; dietaryRestrictions is a redundant
        // copy kept for legacy prompt templates that only read the top-level field.
        dietPreferences: snapshotDietPreferences,
        calorieTarget: calorieTarget,
        dietaryRestrictions: mergedDietPrefs?.allergies || [],
        cuisinePreference: options?.cuisinePreference || "any",
        prepTimeLimit: options?.quickEasy ? 20 : 30,
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
        // Post-generation allergen check
        checkAllergenViolations([response.data]);

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

      // Snapshot profile state upfront before any await to avoid mid-async stale reads
      const { bodyAnalysis: snapshotBodyAnalysis2, dietPreferences: snapshotDietPreferences2 } = useProfileStore.getState();
      const preferences = {
        bodyMetrics: snapshotBodyAnalysis2,
        // NOTE: dietPreferences already contains allergies; dietaryRestrictions is a
        // redundant convenience copy for legacy prompt templates. dietPreferences.allergies
        // is authoritative.
        dietPreferences: snapshotDietPreferences2,
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

        // Post-generation allergen check
        checkAllergenViolations(generatedMeals);

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
   * Start the in-app camera flow for a nutrition label scan.
   */
  const handleLabelScanned = async (
    setShowGuestSignUp?: ((show: boolean) => void) | undefined,
    portionGrams?: number | null,
    productNameHint?: string,
    entryPoint?: BarcodeEntryPoint,
  ): Promise<boolean> => {
    setActiveBarcodeEntryPoint(getLabelEntryPoint(entryPoint));

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
      return false;
    }

    if (!canUseFeature("barcode_scan")) {
      triggerPaywall(
        "You've reached your AI food scan limit. Upgrade to Pro for unlimited label scanning.",
      );
      return false;
    }

    pendingLabelScanRef.current = {
      portionGrams: portionGrams ?? null,
      productNameHint,
    };
    setCameraMode("label");
    setShowCamera(true);
    return true;
  };

  const handleLabelCameraCapture = async (imageUri: string) => {
    const pendingScan = pendingLabelScanRef.current;

    setShowCamera(false);
    try {
      const imageBase64 = await imageUriToDataUrl(imageUri);
      await _processLabelImage(imageBase64, pendingScan?.productNameHint);
    } catch (err) {
      crossPlatformAlert("Label Scan Failed", String(err));
    }
  };

  const handleLabelLibraryPick = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");

      const mediaLibraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryPermission.status !== "granted") {
        crossPlatformAlert(
          "Permission Required",
          "Photo library permission is needed to pick a nutrition label image.",
          [{ text: "OK" }],
        );
        return;
      }

      const galleryResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (galleryResult.canceled || !galleryResult.assets?.[0]) {
        return;
      }

      const pendingScan = pendingLabelScanRef.current;
      setShowCamera(false);
      const imageBase64 = await imageAssetToDataUrl(galleryResult.assets[0]);
      await _processLabelImage(imageBase64, pendingScan?.productNameHint);
    } catch (err) {
      crossPlatformAlert("Label Scan Failed", String(err));
    }
  };

  /**
   * Helper: send image to the Worker, map response â†’ ScannedProduct, show modal.
   */
  const _processLabelImage = async (
    imageBase64: string,
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

      // Map Worker response â†’ ScannedProduct (same shape as barcode lookup result)
      const product: ScannedProduct = {
        barcode: `label_${Date.now()}`, // internal reference for this scan
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
          servingSize: d.servingSize,
          servingUnit: d.servingUnit,
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
        healthScore: undefined, // populated from packaged-food health assessment below
        confidence: d.confidence,
        source: "vision-label",
        lastScanned: new Date().toISOString(),
        isAIEstimated: false,
      };

      product.healthScore =
        generatePackagedFoodHealthAssessment(product).overallScore;
      incrementUsage("barcode_scan");
      finishPackagedFoodRoute(product, "label");
    } catch (err) {
      crossPlatformAlert("Label Scan Error", String(err));
    } finally {
      setIsProcessingBarcode(false);
      clearPendingLabelScan();
      setCameraMode("food");
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
      fiber: getNormalizedRecognizedFoodFiber(f).toFixed(1),
    })),
    confidence,
    provenance: buildMealPhotoProvenance(confidence),
    reviewNote:
      "AI meal estimate. Review the food names, portions, and macros before saving.",
  });

  const handleScanResultAccept = useCallback(() => {
    if (!scanResult) return;
    setShowScanResult(false);
    promptMealPhotoCatalogSave(
      scanResult.recognizedFoods,
      scanResult.mealType as MealType,
      {
        confidence: scanResult.confidence,
      },
    );
    setScanResult(null);
  }, [scanResult, selectedMealType]);

  const handleScanResultAdjust = useCallback(() => {
    if (!scanResult) return;
    setShowScanResult(false);
    setPortionData({
      recognizedFoods: scanResult.recognizedFoods,
      imageUri: scanResult.imageUri,
    });
    setShowPortionAdjustment(true);
    setScanResult(null);
  }, [scanResult]);

  const handleScanResultFeedback = useCallback(() => {
    if (!scanResult) return;
    setShowScanResult(false);
    setFeedbackData({
      recognizedFoods: scanResult.recognizedFoods,
      imageUri: scanResult.imageUri,
      mealId: `temp_${Date.now()}`,
    });
    setShowFeedbackModal(true);
    setScanResult(null);
  }, [scanResult]);

  const handleScanResultDismiss = useCallback(() => {
    setShowScanResult(false);
    setScanResult(null);
  }, []);

  return {
    isGeneratingMeal,
    aiError,
    generationWarning,

    showCamera,
    setShowCamera,
    cameraMode,
    setCameraMode,

    scannedProduct,
    productHealthAssessment,
    showProductModal,
    setShowProductModal,
    isProcessingBarcode,
    barcodeCameraState,
    barcodeStatusMessage,
    barcodeInlineActions,

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

    scanResult,
    showScanResult,

    handleMealTypeSelected,
    handleScanFood,
    handleScanProduct,
    handleCameraCapture,
    handleBarcodeScanned,
    handleBarcodeCameraClose,
    handleManualLookupResolved,
    handleLabelScanned,
    handleLabelCameraCapture,
    handleLabelLibraryPick,
    handleAddProductToMeal,
    generateAIMeal,
    generateDailyMealPlan,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
    handleScanResultAccept,
    handleScanResultAdjust,
    handleScanResultFeedback,
    handleScanResultDismiss,

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
