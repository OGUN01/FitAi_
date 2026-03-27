import type { ScannedProduct } from "../services/barcodeService";

const DEFAULT_PACKAGED_FOOD_GRAMS = 100;

type NutritionShape = ScannedProduct["nutrition"];

const toFiniteNumber = (value?: number | null): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const getDefaultPackagedFoodGrams = (
  product: ScannedProduct,
): number => {
  const grams = product.nutrition.servingSize;
  return grams && Number.isFinite(grams) && grams > 0
    ? grams
    : DEFAULT_PACKAGED_FOOD_GRAMS;
};

export const clampPackagedFoodGrams = (grams: number): number =>
  Number.isFinite(grams) && grams > 0
    ? roundTo(grams, 1)
    : DEFAULT_PACKAGED_FOOD_GRAMS;

export const scalePackagedNutrition = (
  nutrition: NutritionShape,
  grams: number,
): NutritionShape => {
  const safeGrams = clampPackagedFoodGrams(grams);
  const ratio = safeGrams / 100;

  return {
    calories: roundTo(toFiniteNumber(nutrition.calories) * ratio, 0),
    protein: roundTo(toFiniteNumber(nutrition.protein) * ratio, 1),
    carbs: roundTo(toFiniteNumber(nutrition.carbs) * ratio, 1),
    fat: roundTo(toFiniteNumber(nutrition.fat) * ratio, 1),
    fiber: roundTo(toFiniteNumber(nutrition.fiber) * ratio, 1),
    sugar:
      nutrition.sugar === undefined
        ? undefined
        : roundTo(toFiniteNumber(nutrition.sugar) * ratio, 1),
    sodium:
      nutrition.sodium === undefined
        ? undefined
        : roundTo(toFiniteNumber(nutrition.sodium) * ratio, 2),
    servingSize: safeGrams,
    servingUnit: "g",
  };
};

export const scaleScannedProductNutrition = (
  product: ScannedProduct,
  grams: number,
): NutritionShape => scalePackagedNutrition(product.nutrition, grams);
