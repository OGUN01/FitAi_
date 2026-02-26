import { FitnessMetrics, BodyCompositionAnalytics } from "./types";

export function analyzeBodyComposition(
  metrics: FitnessMetrics[],
): BodyCompositionAnalytics {
  const weights = metrics
    .filter((m) => m.weight)
    .map((m) => ({ date: m.date, weight: m.weight! }));

  if (weights.length === 0) {
    return {
      weightTrend: "maintaining",
      weightChangeRate: 0,
      bmiCategory: "Unknown",
      progressTowardsGoal: 0,
      recommendedWeightRange: { min: 0, max: 0 },
    };
  }

  const recentWeights = weights.slice(0, Math.min(7, weights.length));
  const olderWeights = weights.slice(-Math.min(7, weights.length));

  const recentAvg =
    recentWeights.reduce((sum, w) => sum + w.weight, 0) / recentWeights.length;
  const olderAvg =
    olderWeights.reduce((sum, w) => sum + w.weight, 0) / olderWeights.length;

  let weightTrend: "losing" | "gaining" | "maintaining" = "maintaining";
  if (recentAvg < olderAvg - 0.5) weightTrend = "losing";
  else if (recentAvg > olderAvg + 0.5) weightTrend = "gaining";

  const weightChangeRate =
    weights.length > 7 ? (recentAvg - olderAvg) / (weights.length / 7) : 0;

  const currentWeight = weights[0].weight;
  const userHeight = getUserHeight(metrics);

  let bmiCategory = "Unknown";
  if (userHeight > 0) {
    const bmi = currentWeight / (userHeight * userHeight);
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal";
    else if (bmi < 30) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  const bodyFatData = metrics.filter((m) => m.bodyFat).map((m) => m.bodyFat!);
  const muscleMassData = metrics
    .filter((m) => m.muscleMass)
    .map((m) => m.muscleMass!);

  let bodyFatTrend: "decreasing" | "increasing" | "stable" | undefined =
    undefined;
  if (bodyFatData.length >= 2) {
    const recentBF = bodyFatData.slice(0, Math.ceil(bodyFatData.length / 2));
    const olderBF = bodyFatData.slice(Math.ceil(bodyFatData.length / 2));
    const recentAvgBF = recentBF.reduce((a, b) => a + b, 0) / recentBF.length;
    const olderAvgBF = olderBF.reduce((a, b) => a + b, 0) / olderBF.length;

    if (recentAvgBF < olderAvgBF - 0.5) bodyFatTrend = "decreasing";
    else if (recentAvgBF > olderAvgBF + 0.5) bodyFatTrend = "increasing";
    else bodyFatTrend = "stable";
  }

  let muscleMassTrend: "gaining" | "losing" | "stable" | undefined = undefined;
  if (muscleMassData.length >= 2) {
    const recentMM = muscleMassData.slice(
      0,
      Math.ceil(muscleMassData.length / 2),
    );
    const olderMM = muscleMassData.slice(Math.ceil(muscleMassData.length / 2));
    const recentAvgMM = recentMM.reduce((a, b) => a + b, 0) / recentMM.length;
    const olderAvgMM = olderMM.reduce((a, b) => a + b, 0) / olderMM.length;

    if (recentAvgMM > olderAvgMM + 0.2) muscleMassTrend = "gaining";
    else if (recentAvgMM < olderAvgMM - 0.2) muscleMassTrend = "losing";
    else muscleMassTrend = "stable";
  }

  const progressTowardsGoal = calculateGoalProgress(weights, weightTrend);
  const predictedGoalDate = predictGoalDate(
    weights,
    weightTrend,
    weightChangeRate,
  );

  let recommendedWeightRange = {
    min: currentWeight - 5,
    max: currentWeight + 5,
  };
  if (userHeight > 0) {
    recommendedWeightRange = {
      min: Math.round(18.5 * userHeight * userHeight),
      max: Math.round(24.9 * userHeight * userHeight),
    };
  }

  return {
    weightTrend,
    weightChangeRate,
    bodyFatTrend,
    muscleMassTrend,
    bmiCategory,
    progressTowardsGoal,
    predictedGoalDate,
    recommendedWeightRange,
  };
}

export function getUserHeight(metrics: FitnessMetrics[]): number {
  for (const metric of metrics) {
    if (metric.height && metric.height > 0) {
      return metric.height;
    }
  }
  return 0;
}

export function calculateGoalProgress(
  weights: Array<{ date: string; weight: number }>,
  trend: "losing" | "gaining" | "maintaining",
): number {
  if (weights.length < 2) return 0;

  const firstWeight = weights[weights.length - 1].weight;
  const currentWeight = weights[0].weight;
  const change = Math.abs(currentWeight - firstWeight);

  const assumedGoal = 5;
  return Math.min(100, Math.round((change / assumedGoal) * 100));
}

export function predictGoalDate(
  weights: Array<{ date: string; weight: number }>,
  trend: "losing" | "gaining" | "maintaining",
  weeklyRate: number,
): string | undefined {
  if (trend === "maintaining" || Math.abs(weeklyRate) < 0.1) {
    return undefined;
  }

  const assumedGoalChange = 5;
  const weeksToGoal = Math.abs(assumedGoalChange / weeklyRate);

  if (weeksToGoal > 52) {
    return undefined;
  }

  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + Math.round(weeksToGoal * 7));
  return predictedDate.toISOString();
}
