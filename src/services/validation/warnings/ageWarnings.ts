import { ValidationResult } from "../types";

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
