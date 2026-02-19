import { Alert } from "react-native";
import { barcodeService, ScannedProduct } from "../../services/barcodeService";
import { recognizedFoodLogger } from "../../services/recognizedFoodLogger";
import { MealType } from "../../services/foodRecognitionService";
import { generateHealthAssessment } from "./health-assessment";
import { HealthAssessment } from "./types";

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
) => {
  const handleBarcodeScanned = async (barcode: string) => {
    setIsProcessingBarcode(true);

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
    if (isGuestMode || !userId) {
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
              userId,
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

  return {
    handleBarcodeScanned,
    handleAddProductToMeal,
  };
};
