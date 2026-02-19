import { FitnessMetrics, NutritionAnalytics } from "./types";
import { calculateVariance } from "./helpers";

export function analyzeNutrition(
  metrics: FitnessMetrics[],
): NutritionAnalytics {
  const nutritionScores = metrics
    .filter((m) => m.nutritionScore)
    .map((m) => m.nutritionScore!);
  const waterIntakes = metrics.map((m) => m.waterIntake);

  const avgNutritionScore =
    nutritionScores.length > 0
      ? nutritionScores.reduce((sum, score) => sum + score, 0) /
        nutritionScores.length
      : 0;

  const avgWaterIntake =
    waterIntakes.length > 0
      ? waterIntakes.reduce((sum, water) => sum + water, 0) /
        waterIntakes.length
      : 0;

  const macroData = calculateAverageMacros(metrics);
  const averageMacros = macroData.macros;
  const averageCaloriesPerDay = macroData.averageCalories;

  const daysWithNutritionData = metrics.filter(
    (m) => m.nutritionScore !== undefined && m.nutritionScore > 0,
  ).length;
  const mealLoggingConsistency =
    metrics.length > 0
      ? Math.round((daysWithNutritionData / metrics.length) * 100)
      : 0;

  const deficiencies: string[] = [];
  if (avgWaterIntake > 0 && avgWaterIntake < 2.0) {
    deficiencies.push("Hydration");
  }
  if (averageMacros.protein < 50) {
    deficiencies.push("Protein Intake");
  }
  if (averageMacros.fiber < 20) {
    deficiencies.push("Fiber Intake");
  }

  const improvements: string[] = [];
  if (avgNutritionScore > 80) {
    improvements.push("Balanced Macros");
  }
  if (avgWaterIntake >= 2.5) {
    improvements.push("Good Hydration");
  }
  if (mealLoggingConsistency > 80) {
    improvements.push("Consistent Tracking");
  }

  const varietyScore = calculateNutritionVarietyScore(metrics);
  const mealTimingScore = calculateMealTimingScore(metrics);

  return {
    averageCaloriesPerDay,
    averageMacros,
    nutritionScore: avgNutritionScore,
    mealLoggingConsistency,
    waterIntakeAverage: avgWaterIntake,
    deficiencies: deficiencies.length > 0 ? deficiencies : [],
    improvements: improvements.length > 0 ? improvements : [],
    mealTimingScore,
    varietyScore,
    processingScore: 0,
  };
}

export function calculateAverageMacros(metrics: FitnessMetrics[]): {
  macros: { protein: number; carbs: number; fat: number; fiber: number };
  averageCalories: number;
} {
  const metricsWithNutrition = metrics.filter(
    (m) => (m as any).nutrition || m.nutritionScore,
  );

  if (metricsWithNutrition.length === 0) {
    return {
      macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
      averageCalories: 0,
    };
  }

  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalCalories = 0;
  let dataPoints = 0;

  for (const metric of metrics) {
    const nutrition = (metric as any).nutrition;
    if (nutrition) {
      totalProtein += nutrition.protein || 0;
      totalCarbs += nutrition.carbohydrates || nutrition.carbs || 0;
      totalFat += nutrition.fat || 0;
      totalFiber += nutrition.fiber || 0;
      totalCalories += nutrition.calories || 0;
      dataPoints++;
    }
  }

  const divisor = Math.max(1, dataPoints);
  return {
    macros: {
      protein: Math.round(totalProtein / divisor),
      carbs: Math.round(totalCarbs / divisor),
      fat: Math.round(totalFat / divisor),
      fiber: Math.round(totalFiber / divisor),
    },
    averageCalories: Math.round(totalCalories / divisor),
  };
}

export function calculateNutritionVarietyScore(
  metrics: FitnessMetrics[],
): number {
  const nutritionScores = metrics
    .filter((m) => m.nutritionScore)
    .map((m) => m.nutritionScore!);

  if (nutritionScores.length < 3) {
    return 0;
  }

  const avgScore =
    nutritionScores.reduce((a, b) => a + b, 0) / nutritionScores.length;
  const variance = calculateVariance(nutritionScores);

  let score = avgScore;
  if (variance > 15) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateMealTimingScore(metrics: FitnessMetrics[]): number {
  const daysWithData = metrics.filter(
    (m) => m.nutritionScore && m.nutritionScore > 0,
  ).length;

  if (daysWithData === 0) {
    return 0;
  }

  const consistencyRatio = daysWithData / metrics.length;
  return Math.round(consistencyRatio * 100);
}
