import { ScannedProduct } from "../../services/barcodeService";
import { HealthAssessment } from "./types";

export const generateHealthAssessment = (
  product: ScannedProduct,
): HealthAssessment => {
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
