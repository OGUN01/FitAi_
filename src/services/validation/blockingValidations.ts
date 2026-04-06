import { ValidationResult } from "./types";
import { CALORIE_PER_KG, MIN_CALORIES_FEMALE, MIN_CALORIES_MALE } from "./constants";

export function validateMinimumBodyFat(
  bodyFat: number | undefined,
  gender: string,
): ValidationResult {
  if (!bodyFat) return { status: "OK" };
  const MIN_ESSENTIAL_FAT = gender === "female" ? 12 : 5;

  if (bodyFat <= MIN_ESSENTIAL_FAT) {
    return {
      status: "BLOCKED",
      code: "AT_ESSENTIAL_BODY_FAT",
      message: `Body fat (${bodyFat}%) is at essential minimum for ${gender}`,
      recommendations: [
        "Essential fat required for organ function",
        "Hormone production needs minimum fat",
        "Immune system requires fat stores",
        "Switch to maintenance or lean bulk instead",
      ],
    };
  }
  return { status: "OK" };
}

export function validateMinimumBMI(
  currentBMI: number,
  targetWeight: number,
  height: number,
): ValidationResult {
  const heightM = height / 100;
  const targetBMI = targetWeight / (heightM * heightM);
  const UNDERWEIGHT_THRESHOLD = 17.5;

  if (targetBMI < UNDERWEIGHT_THRESHOLD) {
    const minSafeWeight = 18.5 * heightM * heightM;
    return {
      status: "BLOCKED",
      code: "TARGET_BMI_UNDERWEIGHT",
      message: `Target BMI (${targetBMI.toFixed(1)}) is clinically underweight`,
      recommendations: [
        "Minimum safe BMI: 18.5",
        `Minimum safe weight: ${Math.round(minSafeWeight)}kg`,
        "Adjust target weight to healthy range",
      ],
    };
  }
  return { status: "OK" };
}

export function validateBMRSafety(
  targetCalories: number,
  bmr: number,
): ValidationResult {
  if (targetCalories < bmr) {
    return {
      status: "BLOCKED",
      code: "BELOW_BMR",
      message: `Target calories (${Math.round(targetCalories)}) is below your BMR (${Math.round(bmr)})`,
      recommendations: [
        "Extend timeline to increase daily calories",
        "Increase workout frequency to burn more calories",
        "Accept slower, healthier weight loss rate",
      ],
    };
  }
  return { status: "OK" };
}

export function validateAbsoluteMinimum(
  targetCalories: number,
  gender: string,
): ValidationResult {
  const absoluteMin = gender === "female" ? MIN_CALORIES_FEMALE : MIN_CALORIES_MALE;
  if (targetCalories < absoluteMin) {
    return {
      status: "BLOCKED",
      code: "BELOW_ABSOLUTE_MINIMUM",
      message: `Target (${Math.round(targetCalories)}) is below safe minimum (${absoluteMin} cal)`,
      recommendations: ["Extend timeline or reduce deficit"],
    };
  }
  return { status: "OK" };
}

export function validateTimeline(
  currentWeight: number,
  targetWeight: number,
  timelineWeeks: number,
  weeklyWeightLossGoal?: number,
): ValidationResult {
  const weightDifference = Math.abs(targetWeight - currentWeight);
  const requiredWeeklyRate =
    (weeklyWeightLossGoal ?? 0) > 0
      ? weeklyWeightLossGoal!
      : weightDifference / timelineWeeks;
  const extremeLimit = currentWeight * 0.015;

  if (requiredWeeklyRate > extremeLimit) {
    const safeWeeks = Math.ceil(weightDifference / (currentWeight * 0.0075));
    return {
      status: "BLOCKED",
      code: "EXTREMELY_UNREALISTIC",
      message: `Rate ${requiredWeeklyRate.toFixed(2)}kg/week is dangerous`,
      alternatives: [
        {
          option: "extend_timeline",
          newWeeks: safeWeeks,
          description: `Extend to ${safeWeeks} weeks (safe rate)`,
        },
      ],
    };
  }
  return { status: "OK" };
}

export function validatePregnancyBreastfeeding(
  pregnancy: boolean,
  breastfeeding: boolean,
  targetCalories: number,
  tdee: number,
): ValidationResult {
  if ((pregnancy || breastfeeding) && targetCalories < tdee) {
    return {
      status: "BLOCKED",
      code: "UNSAFE_PREGNANCY_BREASTFEEDING",
      message: "Weight loss during pregnancy/breastfeeding is not safe",
      recommendations: [
        "Switched to maintenance or surplus calories",
        "Focus on nutrient-dense foods",
        "Consult doctor before any dietary changes",
      ],
    };
  }
  return { status: "OK" };
}

export function validateGoalConflict(primaryGoals: string[]): ValidationResult {
  const hasWeightLoss = primaryGoals.includes("weight-loss");
  const hasWeightGain = primaryGoals.includes("weight-gain");

  if (hasWeightLoss && hasWeightGain) {
    return {
      status: "BLOCKED",
      code: "CONFLICTING_GOALS",
      message: "Cannot lose weight and gain weight simultaneously",
      recommendations: ["Choose your primary goal: weight loss OR weight gain"],
    };
  }
  return { status: "OK" };
}

export function validateMealsEnabled(
  breakfast: boolean,
  lunch: boolean,
  dinner: boolean,
  snacks: boolean,
): ValidationResult {
  const anyMealEnabled = breakfast || lunch || dinner || snacks;

  if (!anyMealEnabled) {
    return {
      status: "BLOCKED",
      code: "NO_MEALS_ENABLED",
      message: "At least one meal must be enabled to create a meal plan",
      recommendations: [
        "Enable at least breakfast, lunch, or dinner",
        "Meal plans require at least one meal slot",
      ],
    };
  }
  return { status: "OK" };
}

export function validateSleepAggressiveCombo(
  sleepHours: number,
  weeklyRate: number,
  currentWeight: number,
): ValidationResult {
  const isAggressive = weeklyRate > currentWeight * 0.0075;

  if (sleepHours < 5 && isAggressive) {
    return {
      status: "BLOCKED",
      code: "SEVERE_SLEEP_DEPRIVATION",
      message: `Sleep (${sleepHours.toFixed(1)}hrs) + aggressive goal is dangerous`,
      recommendations: [
        "Severe sleep deprivation impairs fat loss by 55%",
        "Dramatically increases muscle loss",
        "Impossible to recover from workouts",
        "Either improve sleep to 6+ hours OR reduce goal aggressiveness",
      ],
    };
  }
  return { status: "OK" };
}

export function validateTrainingVolume(
  frequency: number,
  duration: number,
  intensity: string,
  activityLevel: string,
): ValidationResult {
  const totalWeeklyHours = (frequency * duration) / 60;
  // Support both legacy occupation_type and activity_level values
  const isVeryActive = activityLevel === "very_active" || activityLevel === "extreme" || activityLevel === "active";
  const isHeavyLabor = activityLevel === "heavy_labor";
  const ABSOLUTE_MAX_HOURS =
    isVeryActive ? 20
    : isHeavyLabor ? 18
    : 15;

  if (totalWeeklyHours > ABSOLUTE_MAX_HOURS) {
    return {
      status: "BLOCKED",
      code: "EXCESSIVE_TRAINING_VOLUME",
      message: `Training volume (${totalWeeklyHours.toFixed(1)} hrs/week) exceeds safe limits`,
      recommendations: [
        `Maximum safe: ${ABSOLUTE_MAX_HOURS} hours/week for non-athletes`,
        "Risk: Overtraining syndrome, chronic fatigue",
        "Risk: Suppressed immune function, injury",
        "Reduce frequency or session duration",
      ],
    };
  }
  return { status: "OK" };
}

export function validateInsufficientExercise(
  frequency: number,
  weeklyRate: number,
  currentWeight: number,
  tdee: number,
  bmr: number,
  actualTargetCalories?: number,
): ValidationResult {
  const isAggressive = weeklyRate > currentWeight * 0.0075;
  // Use actual post-cap calories if provided; otherwise compute from uncapped rate
  const targetCalories = actualTargetCalories ?? tdee - (weeklyRate * CALORIE_PER_KG) / 7;

  if (frequency < 2 && isAggressive && targetCalories < bmr) {
    return {
      status: "BLOCKED",
      code: "INSUFFICIENT_EXERCISE",
      message: `Your aggressive goal with only ${frequency} workout(s)/week requires unsafe calorie restriction`,
      recommendations: [
        `📊 Current plan: ${Math.round(targetCalories)} cal/day (below your BMR of ${Math.round(bmr)})`,
        `🏋️ Increase to at least 3 workouts/week to create deficit via exercise`,
        `⏰ OR: Extend timeline to reduce required daily deficit`,
        `🚶 OR: Add daily walking (10,000 steps = ~300-400 cal/day)`,
        `⚠️ Without more activity, this goal requires starvation-level calories`,
      ],
      risks: [
        "Calories below BMR will cause muscle loss",
        "Extreme fatigue and low energy",
        "Hormonal disruption",
        "Unsustainable long-term",
      ],
    };
  }
  return { status: "OK" };
}
