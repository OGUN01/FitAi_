import { useState, useRef, useEffect } from "react";
import { useUserStore } from "../../stores";
import { MealType } from "../../services/foodRecognitionService";
import { useAuth } from "../useAuth";
import { useNutritionData } from "../useNutritionData";
import { useCalculatedMetrics } from "../useCalculatedMetrics";
import { Meal } from "../../types/ai";
import { ScannedProduct } from "../../services/barcodeService";
import { createCameraHandlers } from "./camera-handlers";
import { createBarcodeHandlers } from "./barcode-handlers";
import { createMealGenerationHandlers } from "./meal-generation";
import {
  CameraMode,
  PortionData,
  FeedbackData,
  HealthAssessment,
  UseAIMealGenerationReturn,
} from "./types";

export const useAIMealGeneration = (): UseAIMealGenerationReturn => {
  const { user, isGuestMode } = useAuth();
  const { profile } = useUserStore();
  const { foods, loadDailyNutrition, refreshAll, dietPreferences } =
    useNutritionData();
  const { getCalorieTarget } = useCalculatedMetrics();

  const [aiMeals, setAiMeals] = useState<Meal[]>([]);
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("food");

  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null,
  );
  const [productHealthAssessment, setProductHealthAssessment] =
    useState<HealthAssessment | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);

  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");

  const [portionData, setPortionData] = useState<PortionData | null>(null);
  const [showPortionAdjustment, setShowPortionAdjustment] = useState(false);

  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
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

  const cameraHandlers = createCameraHandlers(
    isGuestMode,
    user?.id,
    selectedMealType,
    profile?.dietPreferences?.allergies,
    setIsGeneratingMeal,
    setAiError,
    setPortionData,
    setShowPortionAdjustment,
    setFeedbackData,
    setShowFeedbackModal,
    loadDailyNutrition,
    refreshAll,
  );

  const barcodeHandlers = createBarcodeHandlers(
    isGuestMode,
    user?.id,
    selectedMealType,
    setIsProcessingBarcode,
    setScannedProduct,
    setProductHealthAssessment,
    setShowProductModal,
    loadDailyNutrition,
    refreshAll,
  );

  const mealGenerationHandlers = createMealGenerationHandlers(
    user?.id,
    profile,
    foods,
    dietPreferences || undefined,
    getCalorieTarget,
    setIsGeneratingMeal,
    setAiError,
    setAiMeals,
  );

  const handlePortionAdjustmentComplete = (adjustedFoods: any[]) => {
    return cameraHandlers.handlePortionAdjustmentComplete(
      adjustedFoods,
      portionData,
    );
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
    handleCameraCapture: cameraHandlers.handleCameraCapture,
    handleBarcodeScanned: barcodeHandlers.handleBarcodeScanned,
    handleAddProductToMeal: barcodeHandlers.handleAddProductToMeal,
    generateAIMeal: mealGenerationHandlers.generateAIMeal,
    generateDailyMealPlan: mealGenerationHandlers.generateDailyMealPlan,
    handleFeedbackSubmit: cameraHandlers.handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
  };
};
