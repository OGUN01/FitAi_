import { SmartAlternative, SmartAlternativesResult, RiskLevel } from "./types";

const CALORIE_PER_KG = 7700;
const MIN_CALORIES_FEMALE = 1200;
const MIN_CALORIES_MALE = 1500;

export function calculateSmartAlternatives(
  userRequestedRate: number,
  bmr: number,
  tdee: number,
  currentWeight: number,
  targetWeight: number,
  gender: "male" | "female",
): SmartAlternativesResult {
  const minimumCalorieFloor =
    gender === "female" ? MIN_CALORIES_FEMALE : MIN_CALORIES_MALE;
  const weightToLose = Math.abs(currentWeight - targetWeight);

  const bmrDeficit = tdee - bmr;
  const rateAtBMR = (bmrDeficit * 7) / CALORIE_PER_KG;

  const rateTiers: Array<{
    id: string;
    rate: number;
    label: string;
    icon: string;
    isUserOriginal?: boolean;
    isRecommended?: boolean;
  }> = [
    {
      id: "user_original",
      rate: userRequestedRate,
      label: "KEEP MY GOAL",
      icon: "flame",
      isUserOriginal: true,
    },
    { id: "aggressive", rate: 1.0, label: "AGGRESSIVE", icon: "flash" },
    { id: "challenging", rate: 0.8, label: "CHALLENGING", icon: "fitness" },
    {
      id: "at_bmr",
      rate: Math.round(rateAtBMR * 100) / 100,
      label: "AT YOUR BMR",
      icon: "shield-checkmark",
      isRecommended: true,
    },
    {
      id: "comfortable",
      rate: Math.max(0.3, Math.round((rateAtBMR - 0.15) * 100) / 100),
      label: "COMFORTABLE",
      icon: "leaf",
    },
  ];

  const exerciseOptions = [
    {
      id: "exercise_light",
      exerciseType: "light" as const,
      minutes: 30,
      caloriesBurn: 150,
      icon: "walk",
      label: "LIGHT ACTIVITY",
      description: "30 min walk",
    },
    {
      id: "exercise_moderate",
      exerciseType: "moderate" as const,
      minutes: 30,
      caloriesBurn: 300,
      icon: "bicycle",
      label: "MODERATE ACTIVITY",
      description: "30 min jog",
    },
    {
      id: "exercise_intense",
      exerciseType: "intense" as const,
      minutes: 30,
      caloriesBurn: 450,
      icon: "barbell",
      label: "INTENSE ACTIVITY",
      description: "30 min HIIT",
    },
  ];

  const alternatives: SmartAlternative[] = [];

  const getDescription = (riskLevel: RiskLevel, bmrDiff: number): string => {
    switch (riskLevel) {
      case "blocked":
        return "Below safe minimum - not available";
      case "dangerous":
        return `${Math.abs(bmrDiff)} cal below BMR - significant health risks`;
      case "caution":
        return `${Math.abs(bmrDiff)} cal below BMR - proceed with caution`;
      case "moderate":
        return `${Math.abs(bmrDiff)} cal below BMR - challenging but manageable`;
      case "safe":
        return "Safe & effective fat loss";
      case "easy":
        return "Easier to maintain, minimal hunger";
      default:
        return "";
    }
  };

  for (const tier of rateTiers) {
    if (!tier.isUserOriginal && Math.abs(tier.rate - userRequestedRate) < 0.05)
      continue;
    if (tier.rate <= 0) continue;

    const dailyDeficit = (tier.rate * CALORIE_PER_KG) / 7;
    const dailyCalories = Math.round(tdee - dailyDeficit);
    const bmrDifference = dailyCalories - bmr;
    const timelineWeeks =
      weightToLose > 0 ? Math.ceil(weightToLose / tier.rate) : 0;

    let riskLevel: RiskLevel;
    let badge: string;

    if (dailyCalories < minimumCalorieFloor) {
      riskLevel = "blocked";
      badge = "Blocked";
    } else if (bmrDifference < -500) {
      riskLevel = "dangerous";
      badge = "Risky";
    } else if (bmrDifference < -200) {
      riskLevel = "caution";
      badge = "Caution";
    } else if (bmrDifference < 0) {
      riskLevel = "moderate";
      badge = "Moderate";
    } else if (tier.isRecommended) {
      riskLevel = "safe";
      badge = "Recommended";
    } else {
      riskLevel = "easy";
      badge = "Easy";
    }

    alternatives.push({
      id: tier.id,
      label: tier.label,
      weeklyRate: Math.round(tier.rate * 100) / 100,
      dailyCalories,
      bmrDifference: Math.round(bmrDifference),
      timelineWeeks,
      riskLevel,
      icon: tier.icon,
      badge,
      description: getDescription(riskLevel, bmrDifference),
      isUserOriginal: tier.isUserOriginal || false,
      isRecommended: tier.isRecommended || false,
      isBlocked: riskLevel === "blocked",
      blockReason:
        riskLevel === "blocked"
          ? `Below minimum ${minimumCalorieFloor} cal/day`
          : undefined,
      requiresExercise: false,
    });
  }

  for (const exercise of exerciseOptions) {
    const totalDailyDeficit = bmrDeficit + exercise.caloriesBurn;
    const weeklyRate = (totalDailyDeficit * 7) / CALORIE_PER_KG;
    const timelineWeeks =
      weightToLose > 0 ? Math.ceil(weightToLose / weeklyRate) : 0;

    if (weeklyRate <= 0) continue;

    let riskLevel: RiskLevel;
    let badge: string;

    if (exercise.exerciseType === "intense") {
      riskLevel = "moderate";
      badge = "Intense";
    } else if (exercise.exerciseType === "moderate") {
      riskLevel = "safe";
      badge = "Active";
    } else {
      riskLevel = "easy";
      badge = "Easy";
    }

    alternatives.push({
      id: exercise.id,
      label: exercise.label,
      weeklyRate: Math.round(weeklyRate * 100) / 100,
      dailyCalories: Math.round(bmr),
      bmrDifference: 0,
      timelineWeeks,
      riskLevel,
      icon: exercise.icon,
      badge,
      description: `Eat at BMR + burn ${exercise.caloriesBurn} cal through ${exercise.description}`,
      isUserOriginal: false,
      isRecommended: false,
      isBlocked: false,
      requiresExercise: true,
      exerciseType: exercise.exerciseType,
      exerciseMinutes: exercise.minutes,
      exerciseCaloriesBurned: exercise.caloriesBurn,
      exerciseDescription: exercise.description,
    });
  }

  alternatives.sort((a, b) => {
    if (a.isUserOriginal) return -1;
    if (b.isUserOriginal) return 1;
    if (!a.requiresExercise && b.requiresExercise) return -1;
    if (a.requiresExercise && !b.requiresExercise) return 1;
    return b.weeklyRate - a.weeklyRate;
  });

  return {
    alternatives,
    userBMR: Math.round(bmr),
    userTDEE: Math.round(tdee),
    currentWeight,
    targetWeight,
    weightToLose,
    originalRequestedRate: userRequestedRate,
    showRateComparison: alternatives.length > 1,
    minimumCalorieFloor,
    rateAtBMR: Math.round(rateAtBMR * 100) / 100,
  };
}
