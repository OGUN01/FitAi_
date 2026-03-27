import type { LogMealScanResult } from "@/components/diet/LogMealModal";
import type { ScannedProduct } from "@/services/barcodeService";
import type { MealLogProvenance } from "@/types/nutritionLogging";

export const BARCODE_REVIEW_THRESHOLD = 85;
export const LABEL_REVIEW_THRESHOLD = 75;

export interface PackagedFoodHealthAssessment {
  overallScore: number;
  category: "excellent" | "good" | "moderate" | "poor" | "unhealthy";
  breakdown: {
    calories: { score: number; status: string; message: string };
    macros: { score: number; status: string; message: string };
    additives: { score: number; status: string; message: string };
    processing: { score: number; status: string; message: string };
  };
  recommendations: string[];
  alerts: string[];
  healthBenefits: string[];
  concerns: string[];
  alternatives?: string[];
}

export function isWeakPackagedFoodProduct(
  product: ScannedProduct,
  mode: "barcode" | "label" = "barcode",
): boolean {
  const confidenceThreshold =
    mode === "label" ? LABEL_REVIEW_THRESHOLD : BARCODE_REVIEW_THRESHOLD;
  const hasMeaningfulNutrition = [
    product.nutrition.calories,
    product.nutrition.protein,
    product.nutrition.carbs,
    product.nutrition.fat,
    product.nutrition.fiber,
  ].some((value) => Number.isFinite(value) && value > 0);

  return (
    Boolean(product.needsNutritionEstimate) ||
    Boolean(product.isAIEstimated) ||
    product.confidence < confidenceThreshold ||
    !hasMeaningfulNutrition
  );
}

export function generatePackagedFoodHealthAssessment(
  product: ScannedProduct,
): PackagedFoodHealthAssessment {
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

  if (nutrition.protein > 15) {
    healthBenefits.push("High protein content supports muscle health");
  }
  if (nutrition.fiber > 5) {
    healthBenefits.push("Good source of dietary fiber");
  }
  if (nutrition.calories < 150) {
    healthBenefits.push("Low calorie option");
  }

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
}

export function buildPackagedFoodProvenance(
  product: ScannedProduct,
  mode: "barcode" | "label",
): MealLogProvenance {
  const requiresReview =
    isWeakPackagedFoodProduct(product, mode) ||
    product.confidence <
      (mode === "label" ? LABEL_REVIEW_THRESHOLD : BARCODE_REVIEW_THRESHOLD);

  return {
    mode,
    truthLevel: isWeakPackagedFoodProduct(product, mode)
      ? "estimated"
      : "authoritative",
    confidence: product.confidence,
    countryContext: product.gs1Country || "IN",
    requiresReview,
    source: product.source,
    productIdentity: {
      barcode: mode === "label" ? null : product.barcode,
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
}

export function mapScannedProductToScanResult(
  product: ScannedProduct,
  mode: "barcode" | "label",
): LogMealScanResult {
  const provenance = buildPackagedFoodProvenance(product, mode);
  const usePerServing = mode === "label" && product.perServing != null;
  const nutrition = usePerServing ? product.perServing! : product.nutrition;

  return {
    type: mode,
    mealName: product.brand ? `${product.name} (${product.brand})` : product.name,
    directEntry:
      mode === "barcode"
        ? {
            calories: Math.round(nutrition.calories).toString(),
            protein: (nutrition.protein ?? 0).toFixed(1),
            carbs: (nutrition.carbs ?? 0).toFixed(1),
            fat: (nutrition.fat ?? 0).toFixed(1),
            fiber: ("fiber" in nutrition ? (nutrition.fiber ?? 0) : 0).toFixed(
              1,
            ),
          }
        : undefined,
    packagedFood:
      mode === "label"
        ? {
            referenceId: product.barcode,
            source: product.source,
            serving: {
              size: product.nutrition.servingSize ?? null,
              unit: product.nutrition.servingUnit ?? null,
            },
            per100g: {
              calories: product.nutrition.calories,
              protein: product.nutrition.protein,
              carbs: product.nutrition.carbs,
              fat: product.nutrition.fat,
              fiber: product.nutrition.fiber,
              sugar: product.nutrition.sugar,
              sodium: product.nutrition.sodium,
            },
            perServing: product.perServing,
          }
        : undefined,
    portionAssumptionGrams:
      mode === "label" &&
      typeof product.nutrition.servingSize === "number" &&
      Number.isFinite(product.nutrition.servingSize)
        ? product.nutrition.servingSize
        : undefined,
    confidence: product.confidence,
    provenance,
    reviewNote:
      mode === "label"
        ? "Label values were read from the package. Review before saving if anything looks off."
        : provenance.truthLevel === "estimated"
          ? "Barcode identity was found, but the nutrition is still estimated. Prefer a label scan when possible."
          : provenance.requiresReview
            ? "Barcode nutrition is available, but this result should be reviewed before saving."
            : "Barcode nutrition was matched from a product database.",
  };
}
