import { Alternative, CurrentData } from "./types";
import { FALLBACK_DAILY_CALORIES } from "../../constants/diet";
import { CALORIE_PER_KG } from "../../services/validation/constants";
import { logger } from "../../utils/logger";
import {
  calculateWeightRateAlternatives,
  calculateExerciseAlternatives,
  calculateTrainingReductionAlternatives,
} from "./weightCalculations";

export const calculateGainRateAlternatives = (
  data: CurrentData,
  hasMuscleGoal: boolean,
  safeOptimalRate: number,
): Alternative[] => {
  const {
    bmr,
    tdee,
    currentWeight,
    targetWeight,
    currentFrequency,
  } = data;
  // Bug 2 fix: guard against missing target_timeline_weeks (0 / null)
  const currentTimeline = (data.currentTimeline > 0 ? data.currentTimeline : null) ?? 12;
  const weightDiff = Math.abs(targetWeight - currentWeight);
  const alternatives: Alternative[] = [];

  const leanGainRate = currentWeight * 0.005;
  const moderateGainRate = currentWeight * 0.0075;

  const leanWeeks = Math.ceil(weightDiff / leanGainRate);
  alternatives.push({
    name: "Lean Bulk",
    icon: "trending-up",
    iconColor: "#10B981",
    goalType: "muscle-gain",
    newTimeline: leanWeeks,
    newWorkoutFrequency: Math.min(currentFrequency + 1, 6),
    newStrengthSessions: 5,
    dailyCalories: Math.round(tdee + (leanGainRate * CALORIE_PER_KG) / 7),
    weeklyRate: leanGainRate,
    newProteinTarget: Math.round(currentWeight * 2.4),
    approach: "Slow surplus for maximum muscle, minimal fat",
    pros: [
      "Mostly muscle gain",
      "Stay lean",
      "Better aesthetics",
      "No harsh cut needed after",
    ],
    cons: ["Slower weight gain", `${leanWeeks} weeks timeline`],
  });

  alternatives.push({
    name: "Strength Focus",
    icon: "barbell-outline",
    iconColor: "#FF8A5C",
    goalType: "strength",
    newTimeline: Math.ceil(weightDiff / moderateGainRate),
    newWorkoutFrequency: Math.min(currentFrequency, 5),
    newStrengthSessions: 4,
    dailyCalories: Math.round(tdee + (moderateGainRate * CALORIE_PER_KG) / 7),
    weeklyRate: moderateGainRate,
    newProteinTarget: Math.round(currentWeight * 2.2),
    newIntensity: "advanced",
    approach: "Focus on getting stronger, weight follows",
    pros: [
      "Strength gains priority",
      "Moderate bulk rate",
      "Balanced approach",
      "Performance based",
    ],
    cons: ["Some fat gain expected", "High intensity required"],
  });

  alternatives.push({
    name: "Body Recomposition",
    icon: "swap-horizontal-outline",
    iconColor: "#3B82F6",
    goalType: "body-recomp",
    newTimeline: currentTimeline,
    newWorkoutFrequency: Math.min(currentFrequency + 1, 5),
    newStrengthSessions: 4,
    newCardioMinutes: 90,
    dailyCalories: tdee,
    weeklyRate: 0,
    newProteinTarget: Math.round(currentWeight * 2.4),
    approach: "Build muscle at maintenance, slow but lean",
    pros: [
      "Stay same weight",
      "Lose fat, gain muscle",
      "No bulk/cut cycles",
      "Sustainable",
    ],
    cons: ["Very slow progress", "Requires patience"],
  });

  const achievableGain = leanGainRate * currentTimeline;
  const newTarget = currentWeight + achievableGain;

  alternatives.push({
    name: "Adjust Target",
    icon: "flag-outline",
    iconColor: "#F59E0B",
    goalType: "weight-gain",
    newTimeline: currentTimeline,
    newTargetWeight: Math.round(newTarget * 10) / 10,
    newWorkoutFrequency: currentFrequency,
    dailyCalories: Math.round(tdee + (leanGainRate * CALORIE_PER_KG) / 7),
    weeklyRate: leanGainRate,
    newProteinTarget: Math.round(currentWeight * 2.2),
    approach: `Gain ${achievableGain.toFixed(1)}kg quality mass in your timeframe`,
    pros: [
      "Keep your timeline",
      "Realistic target",
      "Quality gains",
      "No rushing",
    ],
    cons: [`${(targetWeight - newTarget).toFixed(1)}kg less than planned`],
  });

  return alternatives;
};

export const calculateAlternativesForError = (
  errorCode: string,
  data: CurrentData,
  goals: string[],
): Alternative[] => {
  const {
    bmr,
    tdee,
    currentWeight,
    targetWeight,
    currentTimeline,
    currentFrequency,
  } = data;

  const hasValidData =
    bmr > 0 &&
    tdee > 0 &&
    currentWeight > 0 &&
    targetWeight > 0 &&
    currentTimeline > 0;

  if (!hasValidData) {
    logger.warn('[AdjustmentWizard] Invalid data for calculations', {
      bmr,
      tdee,
      currentWeight,
      targetWeight,
      currentTimeline,
    });
    return [
      {
        name: "Extend Timeline",
        icon: "calendar-outline",
        iconColor: "#3B82F6",
        goalType: "weight-loss",
        newTimeline: Math.max(currentTimeline * 2, 12),
        dailyCalories: bmr > 0 ? Math.round(bmr * 1.2) : FALLBACK_DAILY_CALORIES,
        weeklyRate: 0.5,
        newWorkoutFrequency: currentFrequency || 3,
        approach: "Safe, gradual approach to your goal",
        pros: ["Sustainable", "Preserves muscle", "Easier to maintain"],
        cons: ["Takes longer"],
      },
    ];
  }

  const weightDiff = Math.abs(targetWeight - currentWeight);
  const isWeightLoss = currentWeight > targetWeight;
  const isWeightGain = currentWeight < targetWeight;

  const hasMuscleGoal =
    goals.includes("muscle-gain") || goals.includes("strength");
  const hasEnduranceGoal =
    goals.includes("endurance") || goals.includes("cardio");
  const hasRecompGoal =
    goals.includes("body-recomp") ||
    (goals.includes("weight-loss") && goals.includes("muscle-gain"));

  // Bug 1 fix: prefer SSOT weekly_weight_loss_goal when available; fall back to body-weight %
  const derivedOptimalRate = currentWeight * 0.0075;
  const derivedMaxRate = currentWeight * 0.01;
  const safeOptimalRate = data.weeklyWeightLossGoal ?? derivedOptimalRate;
  const safeMaxRate = data.weeklyWeightLossGoal
    ? Math.min(data.weeklyWeightLossGoal * 1.33, derivedMaxRate)
    : derivedMaxRate;

  switch (errorCode) {
    case "EXTREMELY_UNREALISTIC":
    case "BELOW_BMR":
    case "BELOW_ABSOLUTE_MINIMUM":
      return calculateWeightRateAlternatives(
        data,
        isWeightLoss,
        isWeightGain,
        hasMuscleGoal,
        safeOptimalRate,
        safeMaxRate,
      );

    case "INSUFFICIENT_EXERCISE":
      return calculateExerciseAlternatives(
        data,
        isWeightLoss,
        hasMuscleGoal,
        hasEnduranceGoal,
        safeOptimalRate,
      );

    case "EXCESSIVE_TRAINING_VOLUME":
      return calculateTrainingReductionAlternatives(data, isWeightLoss);

    case "EXCESSIVE_GAIN_RATE":
      return calculateGainRateAlternatives(
        data,
        hasMuscleGoal,
        safeOptimalRate,
      );

    default:
      return calculateWeightRateAlternatives(
        data,
        isWeightLoss,
        isWeightGain,
        hasMuscleGoal,
        safeOptimalRate,
        safeMaxRate,
      );
  }
};
