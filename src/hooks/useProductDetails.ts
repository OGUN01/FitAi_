import { Alert } from "react-native";
import type { ScannedProduct } from "../services/barcodeService";

export const useProductDetails = (
  product: ScannedProduct,
  onAddToMeal?: (product: ScannedProduct) => void,
  onClose?: () => void,
) => {
  const handleAddToMeal = () => {
    if (onAddToMeal) {
      onAddToMeal(product);
      Alert.alert(
        "Added to Meal",
        `${product.name} has been added to your current meal.`,
        [{ text: "OK", onPress: onClose }],
      );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#84cc16";
    if (score >= 40) return "#eab308";
    if (score >= 20) return "#f97316";
    return "#ef4444";
  };

  return {
    handleAddToMeal,
    getScoreColor,
  };
};
