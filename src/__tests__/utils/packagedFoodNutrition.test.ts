import {
  clampPackagedFoodGrams,
  getDefaultPackagedFoodGrams,
  scalePackagedNutrition,
} from "../../utils/packagedFoodNutrition";
import type { ScannedProduct } from "../../services/barcodeService";

describe("packagedFoodNutrition", () => {
  const product: ScannedProduct = {
    barcode: "1234567890123",
    name: "Protein Bar",
    nutrition: {
      calories: 400,
      protein: 20,
      carbs: 30,
      fat: 10,
      fiber: 8,
      sugar: 12,
      sodium: 0.24,
      servingSize: 60,
      servingUnit: "g",
    },
    confidence: 92,
    source: "sqlite-local",
    lastScanned: new Date().toISOString(),
  };

  it("uses the product serving size as the default grams", () => {
    expect(getDefaultPackagedFoodGrams(product)).toBe(60);
  });

  it("falls back to 100g for invalid grams", () => {
    expect(clampPackagedFoodGrams(0)).toBe(100);
    expect(clampPackagedFoodGrams(Number.NaN)).toBe(100);
  });

  it("scales displayed nutrition from per-100g values", () => {
    expect(scalePackagedNutrition(product.nutrition, 50)).toEqual({
      calories: 200,
      protein: 10,
      carbs: 15,
      fat: 5,
      fiber: 4,
      sugar: 6,
      sodium: 0.12,
      servingSize: 50,
      servingUnit: "g",
    });
  });
});
