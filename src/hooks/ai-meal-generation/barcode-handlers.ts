import { barcodeService, ScannedProduct } from "../../services/barcodeService";
import { recognizedFoodLogger } from "../../services/recognizedFoodLogger";
import {
  MealType,
  RecognizedFood,
  CuisineType,
} from "../../services/foodRecognitionService";
import { generateHealthAssessment } from "./health-assessment";
import { HealthAssessment } from "./types";


function mapScannedProductToRecognizedFood(
  product: ScannedProduct,
): RecognizedFood {
  const servingGrams = product.nutrition.servingSize || 100;

  const nutrition: RecognizedFood["nutrition"] = {
    calories: product.nutrition.calories,
    protein: product.nutrition.protein,
    carbs: product.nutrition.carbs,
    fat: product.nutrition.fat,
    fiber: product.nutrition.fiber,
    sugar: product.nutrition.sugar,
    sodium: product.nutrition.sodium,
  };

  // Per-100g values: if serving is already 100g reuse; otherwise scale
  const scale = servingGrams === 0 ? 1 : 100 / servingGrams;
  const nutritionPer100g: RecognizedFood["nutritionPer100g"] = {
    calories: Math.round(product.nutrition.calories * scale),
    protein: Math.round(product.nutrition.protein * scale * 10) / 10,
    carbs: Math.round(product.nutrition.carbs * scale * 10) / 10,
    fat: Math.round(product.nutrition.fat * scale * 10) / 10,
    fiber: Math.round(product.nutrition.fiber * scale * 10) / 10,
    sugar:
      product.nutrition.sugar != null
        ? Math.round(product.nutrition.sugar * scale * 10) / 10
        : undefined,
    sodium:
      product.nutrition.sodium != null
        ? Math.round(product.nutrition.sodium * scale * 10) / 10
        : undefined,
  };

  const cuisine: CuisineType = "other";
  const category: RecognizedFood["category"] = "main";

  return {
    id: `barcode_${product.barcode}_${Date.now()}`,
    name: product.name,
    category,
    cuisine,
    estimatedGrams: servingGrams,
    servingDescription: product.nutrition.servingUnit || "serving",
    nutrition,
    nutritionPer100g,
    confidence: product.confidence,
  };
}

export const createBarcodeHandlers = (
  isGuestMode: boolean,
  userId: string | undefined,
  selectedMealType: MealType,
  setIsProcessingBarcode: (processing: boolean) => void,
  setScannedProduct: (product: ScannedProduct | null) => void,
  setProductHealthAssessment: (assessment: HealthAssessment | null) => void,
  setShowProductModal: (show: boolean) => void,
  loadDailyNutrition: () => Promise<void>,
  refreshAll: () => Promise<void>,
  canUseFeature: (featureKey: "ai_generation" | "barcode_scan") => boolean,
  incrementUsage: (featureKey: "ai_generation" | "barcode_scan") => void,
  triggerPaywall: (reason: string) => void,
  onBarcodeNotFound?: (barcode: string) => void,
) => {
  const handleBarcodeScanned = async (barcode: string) => {
    if (!canUseFeature('barcode_scan')) {
      triggerPaywall('barcode_scan_limit');
      return;
    }
    setIsProcessingBarcode(true);

    try {
      const lookupResult = await barcodeService.lookupProduct(barcode);

      if (!lookupResult.success || !lookupResult.product) {
        // Let the caller/UI handle the "not found" state via scannedProduct being null
        setScannedProduct(null);
        setProductHealthAssessment(null);
        onBarcodeNotFound?.(barcode);
        return;
      }

      let product = lookupResult.product;

      // AI estimation routing: if product has name/brand but no nutrition data
      if (product.needsNutritionEstimate && product.name) {
        try {
          const { estimateNutritionWithAI } = await import(
            "../../services/freeNutritionAPIs"
          );
          if (typeof estimateNutritionWithAI === "function") {
            const aiResult = await estimateNutritionWithAI(
              product.name,
              product.brand || "",
              product.gs1Country || "",
            );
            if (aiResult?.nutrition) {
              product = {
                ...product,
                nutrition: {
                  ...product.nutrition,
                  calories: aiResult.nutrition.calories,
                  protein: aiResult.nutrition.protein,
                  carbs: aiResult.nutrition.carbs,
                  fat: aiResult.nutrition.fat,
                  fiber: aiResult.nutrition.fiber,
                  sugar: aiResult.nutrition.sugar,
                  sodium: aiResult.nutrition.sodium,
                },
                isAIEstimated: true,
              };
            }
          }
        } catch {
          // estimateNutritionWithAI not available yet — continue with existing data
        }
      }

      const healthAssessment = generateHealthAssessment(product);

      incrementUsage('barcode_scan');

      setScannedProduct(product);
      setProductHealthAssessment(healthAssessment);
      setShowProductModal(true);
    } catch (error) {
      setScannedProduct(null);
      setProductHealthAssessment(null);
    } finally {
      setIsProcessingBarcode(false);
    }
  };

  const handleAddProductToMeal = (
    product: ScannedProduct,
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (isGuestMode || !userId) {
      setShowProductModal(false);
      setShowGuestSignUp(true);
      return;
    }

    const foodEntry = mapScannedProductToRecognizedFood(product);

    const doAdd = async () => {
      try {
        const logResult = await recognizedFoodLogger.logRecognizedFoods(
          userId,
          [foodEntry],
          selectedMealType,
        );

        if (logResult.success) {
          setShowProductModal(false);
          await loadDailyNutrition();
          await refreshAll();
        } else {
        }
      } catch (error) {
      }
    };

    doAdd();
  };

  return {
    handleBarcodeScanned,
    handleAddProductToMeal,
  };
};
