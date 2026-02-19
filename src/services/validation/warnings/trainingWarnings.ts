import { ValidationResult } from "../types";

export function warnZeroExercise(
  frequency: number,
  goalType: string,
): ValidationResult {
  if (frequency === 0 && goalType === "weight-loss") {
    return {
      status: "WARNING",
      code: "NO_EXERCISE_PLANNED",
      message: "No exercise planned - weight loss relies entirely on diet",
      recommendations: [
        "Add at least 2 resistance sessions/week",
        "Benefits: Preserves muscle mass",
        "Benefits: Improves health beyond weight",
        "Benefits: Creates larger calorie deficit",
        "Benefits: Increases metabolism long-term",
      ],
      impact: "Slower progress, increased muscle loss",
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnHighTrainingVolume(
  frequency: number,
  duration: number,
  intensity: string,
): ValidationResult {
  const totalWeeklyHours = (frequency * duration) / 60;

  if (totalWeeklyHours > 12 && intensity === "advanced") {
    return {
      status: "WARNING",
      code: "HIGH_TRAINING_VOLUME",
      message: `High volume (${totalWeeklyHours.toFixed(1)} hrs/week) increases overtraining risk`,
      risks: [
        "Overtraining syndrome",
        "Elevated resting heart rate",
        "Mood disturbances",
        "Performance decline",
        "Injury risk",
        "Immune suppression",
      ],
      recommendations: [
        "😴 Ensure 8-9 hours sleep (critical)",
        "📅 Include 1-2 full rest days",
        "📊 Monitor fatigue and performance",
        "🔄 Consider periodization",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnConcurrentTrainingInterference(
  goals: string[],
): ValidationResult {
  if (goals.includes("muscle-gain") && goals.includes("endurance")) {
    return {
      status: "WARNING",
      code: "CONCURRENT_TRAINING_INTERFERENCE",
      message:
        "Cardio + muscle building: Interference effect may slow progress",
      recommendations: [
        "✅ Prioritize ONE goal as primary for faster results",
        "✅ If both: Do strength first, cardio after (same session)",
        "✅ Limit cardio to 2-3 moderate sessions/week (20-30 min)",
        "✅ Ensure calorie surplus if bulking",
        "✅ Consider separating sessions by 6+ hours",
      ],
      impact:
        "Optimal: Focus muscle gain first (12 weeks), then endurance (8 weeks)",
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnEquipmentLimitations(
  goals: string[],
  location: string,
  equipment: string[],
): ValidationResult {
  if (
    goals.includes("muscle-gain") &&
    location === "home" &&
    equipment.length === 0
  ) {
    return {
      status: "WARNING",
      code: "LIMITED_EQUIPMENT_MUSCLE_GAIN",
      message: "Building muscle at home with no equipment is challenging",
      recommendations: [
        "Add basic equipment: Adjustable dumbbells, resistance bands, pull-up bar",
        "OR: Focus on calisthenics progression (slower but effective)",
        "OR: Join gym for optimal muscle building equipment",
      ],
      impact: "Bodyweight exercises have progression limits",
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnPhysicalLimitationsVsIntensity(
  limitations: string[],
  intensity: string,
): ValidationResult {
  const HIGH_IMPACT = [
    "knee-issues",
    "back-pain",
    "arthritis",
    "joint-problems",
  ];
  const hasHighImpact = limitations.some((lim) =>
    HIGH_IMPACT.some((high) => lim.toLowerCase().includes(high)),
  );

  if (hasHighImpact && intensity === "advanced") {
    return {
      status: "WARNING",
      code: "PHYSICAL_LIMITATION_INTENSITY",
      message: "Physical limitations detected with high intensity selected",
      recommendations: [
        "Auto-reducing to intermediate intensity for safety",
        "Focus on low-impact exercises",
        "Emphasize proper form over weight/speed",
        "Include mobility and flexibility work",
        "Consider physical therapy assessment",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnBodyRecomp(
  goals: string[],
  experience: number,
  bodyFat?: number,
): ValidationResult {
  const wantsMusclePlusFatLoss =
    goals.includes("muscle-gain") && goals.includes("weight-loss");
  if (!wantsMusclePlusFatLoss) return { status: "OK" };

  const isNovice = experience < 2;
  const isOverweight = bodyFat ? bodyFat > 20 : false;

  if (isNovice || isOverweight) {
    return {
      status: "WARNING",
      code: "BODY_RECOMP_POSSIBLE",
      message: "Body recomposition is possible!",
      recommendations: [
        "Eat at maintenance calories",
        "Very high protein (2.4g/kg)",
        "Progressive strength training 4-5x/week",
        "Expect: Slow fat loss + muscle gains",
      ],
      canProceed: true,
    };
  }
  return {
    status: "WARNING",
    code: "BODY_RECOMP_SLOW",
    message: "Body recomposition will be very slow",
    recommendations: [
      "Recommend: Cut to goal weight first, then bulk",
      "Or: Accept very slow progress with recomp",
    ],
    canProceed: true,
  };
}
