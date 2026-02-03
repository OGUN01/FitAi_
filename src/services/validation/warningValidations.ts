import { ValidationResult } from "./types";

export function warnAggressiveTimeline(
  requiredRate: number,
  currentWeight: number,
  targetWeight: number,
  currentTimeline: number,
  tdee: number,
): ValidationResult {
  const extremeLimit = currentWeight * 0.015;
  const moderateAggressive = currentWeight * 0.01;
  const optimal = currentWeight * 0.0075;
  const conservative = currentWeight * 0.005;
  const weightDifference = Math.abs(currentWeight - targetWeight);

  if (requiredRate > optimal && requiredRate <= extremeLimit) {
    const optimalWeeks = Math.ceil(weightDifference / optimal);
    const conservativeWeeks = Math.ceil(weightDifference / conservative);
    const aggressiveDeficit = (requiredRate * 7700) / 7;
    const optimalDeficit = (optimal * 7700) / 7;
    const conservativeDeficit = (conservative * 7700) / 7;
    const isVeryAggressive = requiredRate > moderateAggressive;

    return {
      status: "WARNING",
      code: "AGGRESSIVE_TIMELINE",
      message: isVeryAggressive
        ? `Your goal rate (${requiredRate.toFixed(2)}kg/week) is very aggressive`
        : `Your goal rate (${requiredRate.toFixed(2)}kg/week) is aggressive`,
      impact: `Recommended: ${optimal.toFixed(2)}kg/week for optimal muscle retention`,
      risks: isVeryAggressive
        ? [
            "Significant muscle loss risk",
            "Strong metabolic adaptation",
            "Higher chance of regaining weight",
            "May require diet breaks",
          ]
        : [
            "Increased muscle loss",
            "Metabolic adaptation",
            "Harder to maintain long-term",
          ],
      alternatives: [
        {
          option: "keep_aggressive",
          name: "Keep My Pace",
          description: `${requiredRate.toFixed(2)} kg/week • ${currentTimeline} weeks`,
          weeklyRate: requiredRate,
          newTimeline: currentTimeline,
          dailyCalories: Math.round(tdee - aggressiveDeficit),
          icon: isVeryAggressive ? "flame" : "flash",
          iconColor: isVeryAggressive ? "#EF4444" : "#F59E0B",
          approach: isVeryAggressive
            ? "Very aggressive - monitor closely"
            : "Aggressive but achievable",
          pros: ["Fastest results", "Shortest commitment"],
          cons: isVeryAggressive
            ? [
                "High muscle loss risk",
                "Requires strict adherence",
                "Consider diet breaks every 4-6 weeks",
              ]
            : ["Higher muscle loss risk", "May feel harder to sustain"],
        },
        {
          option: "optimal",
          name: "Recommended Pace",
          description: `${optimal.toFixed(2)} kg/week • ${optimalWeeks} weeks`,
          weeklyRate: optimal,
          newTimeline: optimalWeeks,
          dailyCalories: Math.round(tdee - optimalDeficit),
          icon: "shield-checkmark",
          iconColor: "#10B981",
          approach: "Balanced for muscle retention",
          pros: ["Better muscle preservation", "More sustainable"],
          cons: ["Takes longer"],
          isRecommended: true,
        },
        {
          option: "conservative",
          name: "Steady & Safe",
          description: `${conservative.toFixed(2)} kg/week • ${conservativeWeeks} weeks`,
          weeklyRate: conservative,
          newTimeline: conservativeWeeks,
          dailyCalories: Math.round(tdee - conservativeDeficit),
          icon: "leaf",
          iconColor: "#06B6D4",
          approach: "Maximum muscle preservation",
          pros: [
            "Minimal muscle loss",
            "Easiest to maintain",
            "Best for long-term success",
          ],
          cons: ["Slowest progress"],
        },
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnElderlyUser(age: number): ValidationResult {
  if (age >= 75) {
    return {
      status: "WARNING",
      code: "ELDERLY_USER",
      message: "Age 75+ requires special considerations for safe exercise",
      recommendations: [
        "🩺 Consult doctor before starting exercise program",
        "💪 Resistance training critical for bone density",
        "⚖️ Balance exercises prevent falls",
        "🧘 Flexibility work for mobility",
        "Protein: 2.0g/kg minimum (sarcopenia prevention)",
        "Intensity: Start beginner, progress slowly",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnTeenAthlete(
  age: number,
  activityLevel: string,
  goalType: string,
): ValidationResult {
  if (
    age >= 13 &&
    age <= 17 &&
    activityLevel === "extreme" &&
    goalType === "weight-loss"
  ) {
    return {
      status: "WARNING",
      code: "TEEN_ATHLETE_RESTRICTION",
      message: "Teen athletes should NEVER restrict calories during growth",
      recommendations: [
        "Still growing (growth plates open until ~18)",
        "High energy needs for development",
        "Hormonal development critical",
        "Athletic performance needs fuel",
        "Recommended: Maintenance or surplus calories only",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

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

export function warnMenopause(gender: string, age: number): ValidationResult {
  if (gender === "female" && age >= 45 && age <= 55) {
    return {
      status: "WARNING",
      code: "MENOPAUSE_AGE_RANGE",
      message:
        "Potential perimenopause/menopause - special considerations apply",
      recommendations: [
        "Metabolism may slow by additional 5-10%",
        "💪 Resistance training 3-4×/week (bone density)",
        "🥩 Higher protein (2.0g/kg for muscle preservation)",
        "🧘 Include balance and flexibility work",
        "😴 Prioritize sleep (hormonal changes affect it)",
        "Timeline may need 10-15% longer than younger women",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnLowSleep(sleepHours: number): ValidationResult {
  if (sleepHours < 7) {
    const impactPercent = Math.round((7 - sleepHours) * 10);
    return {
      status: "WARNING",
      code: "INSUFFICIENT_SLEEP",
      message: `Sleep ${sleepHours}hrs/night. Optimal: 7-9hrs`,
      impact: `Fat loss ~${impactPercent}% slower`,
      risks: [
        "Increased hunger hormones",
        "Decreased satiety hormones",
        "Elevated cortisol",
        "Poor recovery",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnMedicalConditions(
  conditions: string[],
  aggressive: boolean,
): ValidationResult {
  const HIGH_RISK = [
    "diabetes-type1",
    "diabetes-type2",
    "heart-disease",
    "hypertension",
  ];
  const hasHighRisk = conditions.some((c) => HIGH_RISK.includes(c));

  if (hasHighRisk && aggressive) {
    return {
      status: "WARNING",
      code: "MEDICAL_SUPERVISION",
      message: `Medical condition detected: ${conditions.filter((c) => HIGH_RISK.includes(c)).join(", ")}`,
      recommendations: [
        "🩺 Consult doctor before starting",
        "Using conservative deficit (15% max)",
        "Monitor health markers regularly",
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

export function warnSubstanceImpact(
  alcohol: boolean,
  tobacco: boolean,
  aggressive: boolean,
): ValidationResult[] {
  const warnings: ValidationResult[] = [];

  if (alcohol && aggressive) {
    warnings.push({
      status: "WARNING",
      code: "ALCOHOL_IMPACT",
      message: "Alcohol will slow progress 10-15%",
      recommendations: ["Limit to 1-2 drinks/week maximum"],
      canProceed: true,
    });
  }

  if (tobacco) {
    warnings.push({
      status: "WARNING",
      code: "TOBACCO_IMPACT",
      message: "Smoking reduces cardio capacity ~20-30%",
      recommendations: [
        "Consider quitting",
        "Start with lower-intensity cardio",
      ],
      canProceed: true,
    });
  }

  return warnings;
}

export function warnHeartDisease(
  medicalConditions: string[],
  intensity: string,
): ValidationResult {
  if (medicalConditions.includes("heart-disease")) {
    return {
      status: "WARNING",
      code: "HEART_DISEASE_CLEARANCE",
      message:
        "Heart disease detected - medical clearance REQUIRED before starting",
      recommendations: [
        "🩺 Get doctor approval before beginning exercise",
        "May need cardiac stress test",
        "Start with cardiac rehabilitation if available",
        "Monitor heart rate during all sessions",
        "Stop immediately if chest pain, dizziness, or shortness of breath",
        "Focus on moderate-intensity continuous exercise",
        `Intensity capped at: intermediate (max)`,
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

export function warnObesitySpecialGuidance(
  bmi: number,
  weeklyRate: number,
  currentWeight: number,
): ValidationResult {
  if (bmi >= 35) {
    const adjustedMaxRate = currentWeight * 0.015;
    return {
      status: "WARNING",
      code: "OBESITY_ADJUSTED_RATES",
      message: "Higher BMI allows for faster initial weight loss",
      recommendations: [
        `Class II obesity (BMI ≥ 35) can tolerate larger deficits safely`,
        `Up to ${adjustedMaxRate.toFixed(2)}kg/week is safe for you`,
        "Rate will naturally slow as you lose weight",
        "Initial rapid loss is mostly water - expect slower after 2-4 weeks",
        "Consider medical supervision for best results",
      ],
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

export function warnLowDietReadiness(
  dietReadinessScore: number,
  weeklyRate: number,
  currentWeight: number,
): ValidationResult {
  const isAggressive = weeklyRate > currentWeight * 0.0075;

  if (dietReadinessScore < 40 && isAggressive) {
    return {
      status: "WARNING",
      code: "LOW_DIET_READINESS",
      message: `Low diet readiness score (${dietReadinessScore}/100) with aggressive goal`,
      recommendations: [
        "Current habits indicate low adherence likelihood",
        "Option 1: Habit Building Phase First (4 weeks)",
        "Option 2: Reduce goal aggressiveness",
        "Option 3: Get accountability support (nutritionist/group)",
        `Success prediction: ${dietReadinessScore}% adherence probability`,
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnVeganProteinLimitations(
  dietType: string,
  allergies: string[],
  protein: number,
): ValidationResult {
  const VEGAN_SOURCES = [
    "soy",
    "tofu",
    "legumes",
    "beans",
    "nuts",
    "peanuts",
    "seeds",
  ];
  const hasProteinAllergies = allergies.some((a) =>
    VEGAN_SOURCES.some((source) => a.toLowerCase().includes(source)),
  );

  if (dietType === "vegan" && hasProteinAllergies && protein > 150) {
    return {
      status: "WARNING",
      code: "LIMITED_VEGAN_PROTEIN",
      message: "Limited vegan protein sources due to allergies",
      recommendations: [
        `Target protein (${protein}g) may be difficult - adjusted to ${Math.round(protein * 0.9)}g`,
        "💊 Consider pea/rice protein powder",
        "🌾 Focus on quinoa, hemp, chia",
        "🥦 Combine incomplete proteins",
        "🩺 May need B12, iron, omega-3 supplements",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnMedicationEffects(medications: string[]): ValidationResult {
  const METABOLISM_MEDS = [
    "levothyroxine",
    "synthroid",
    "antidepressant",
    "beta-blocker",
    "prednisone",
    "insulin",
  ];
  const hasMetabolismMeds = medications.some((med) =>
    METABOLISM_MEDS.some((known) => med.toLowerCase().includes(known)),
  );

  if (hasMetabolismMeds) {
    return {
      status: "WARNING",
      code: "MEDICATION_EFFECTS",
      message: "Medications may affect metabolism and weight management",
      recommendations: [
        "💊 Discuss plans with prescribing doctor",
        "📊 Dosages may need adjustment as weight changes",
        "⚖️ Some weight changes may be water weight",
        "Using conservative TDEE estimates to account for variability",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnExcessiveWeightGain(
  weeklyGainRate: number,
  currentWeight: number,
): ValidationResult {
  const extremeLimit = currentWeight * 0.01;

  if (weeklyGainRate > extremeLimit) {
    const maxOptimal = currentWeight * 0.005;
    return {
      status: "WARNING",
      code: "EXCESSIVE_GAIN_RATE",
      message: `Gain rate (${weeklyGainRate.toFixed(2)}kg/week) will be mostly fat, not muscle`,
      recommendations: [
        "Novice: Max ~0.5-1kg muscle per MONTH",
        "Intermediate: Max ~0.25-0.5kg muscle per MONTH",
        "Advanced: Max ~0.125-0.25kg muscle per MONTH",
        `Optimal rate: ${maxOptimal.toFixed(2)}kg/week for lean gain`,
      ],
      impact: "Anything above these rates is primarily fat gain",
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnMultipleBadHabits(
  sleepHours: number,
  tobacco: boolean,
  alcohol: boolean,
): ValidationResult {
  let count = 0;
  const habits: string[] = [];

  if (sleepHours < 6) {
    count++;
    habits.push("Low sleep");
  }
  if (tobacco) {
    count++;
    habits.push("Tobacco use");
  }
  if (alcohol) {
    count++;
    habits.push("Alcohol consumption");
  }

  if (count >= 2) {
    return {
      status: "WARNING",
      code: "MULTIPLE_LIFESTYLE_FACTORS",
      message: `${count} lifestyle factors will significantly impact results`,
      recommendations: [
        `Factors detected: ${habits.join(", ")}`,
        "Timeline may extend by 40-60%",
        "🎯 Fix ONE habit at a time",
        "😴 Sleep has biggest impact - start there",
        "Success still possible but requires commitment",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}
