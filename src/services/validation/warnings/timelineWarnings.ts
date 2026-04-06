import { ValidationResult } from "../types";
import { CALORIE_PER_KG } from "../constants";

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

  if (requiredRate > optimal) {
    const optimalWeeks = Math.ceil(weightDifference / optimal);
    const conservativeWeeks = Math.ceil(weightDifference / conservative);
    const aggressiveDeficit = (requiredRate * CALORIE_PER_KG) / 7;
    const optimalDeficit = (optimal * CALORIE_PER_KG) / 7;
    const conservativeDeficit = (conservative * CALORIE_PER_KG) / 7;
    const isVeryAggressive = requiredRate > moderateAggressive;
    // BUG-22: extremeLimit was defined but never used — rates above it now get ERROR severity
    const isExtreme = requiredRate > extremeLimit;

    return {
      status: isExtreme ? "BLOCKED" : "WARNING",
      code: isExtreme ? "EXTREME_RATE" : "AGGRESSIVE_TIMELINE",
      message: isExtreme
        ? `Your goal rate (${requiredRate.toFixed(2)}kg/week) exceeds safe medical limits — health risk`
        : isVeryAggressive
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
      canProceed: !isExtreme,
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
