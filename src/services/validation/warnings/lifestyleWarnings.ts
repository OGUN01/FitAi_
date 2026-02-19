import { ValidationResult } from "../types";

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
