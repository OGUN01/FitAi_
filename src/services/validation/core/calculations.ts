/**
 * Calculations Module
 * Handles all metabolic and macro calculations
 */

export class ValidationCalculations {
  /**
   * Calculate sleep duration from wake and sleep times
   */
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeH, wakeM] = wakeTime.split(":").map(Number);
    const [sleepH, sleepM] = sleepTime.split(":").map(Number);
    const wakeMinutes = wakeH * 60 + wakeM;
    const sleepMinutes = sleepH * 60 + sleepM;
    let durationMinutes = wakeMinutes - sleepMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    return durationMinutes / 60;
  }

  /**
   * Calculate protein requirements based on weight and goal
   */
  static calculateProtein(weight: number, goalDirection: string): number {
    const PROTEIN_REQUIREMENTS: Record<string, number> = {
      cutting: 2.2,
      recomp: 2.4,
      maintenance: 1.6,
      bulking: 1.8,
      weight_gain: 1.6,
    };
    const multiplier = PROTEIN_REQUIREMENTS[goalDirection] || 1.6;
    return Math.round(weight * multiplier);
  }

  /**
   * Calculate macronutrient distribution
   */
  static calculateMacros(
    dailyCalories: number,
    proteinGrams: number,
    workoutFrequency: number,
    intensity: string,
  ): { protein: number; carbs: number; fat: number } {
    const proteinCalories = proteinGrams * 4;
    const remainingCalories = dailyCalories - proteinCalories;

    let carbPercent: number;
    if (intensity === "advanced" && workoutFrequency >= 4) {
      carbPercent = 0.5;
    } else if (workoutFrequency >= 3) {
      carbPercent = 0.45;
    } else {
      carbPercent = 0.4;
    }

    const carbCalories = remainingCalories * carbPercent;
    const fatCalories = remainingCalories - carbCalories;

    return {
      protein: proteinGrams,
      carbs: Math.round(carbCalories / 4),
      fat: Math.round(fatCalories / 9),
    };
  }
}
