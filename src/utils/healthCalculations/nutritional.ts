import { MacronutrientDistribution } from "./shared-types";

export class NutritionalCalculations {
  static calculateDailyCaloriesForGoal(
    tdee: number,
    weeklyWeightChangeKg: number,
    isWeightLoss: boolean = true,
  ): number {
    const weeklyCalorieChange = weeklyWeightChangeKg * 7700;
    const dailyCalorieChange = weeklyCalorieChange / 7;

    return isWeightLoss ? tdee - dailyCalorieChange : tdee + dailyCalorieChange;
  }

  static calculateMacronutrients(
    dailyCalories: number,
    primaryGoals: string[],
    dietReadiness: any,
  ): MacronutrientDistribution {
    let proteinPercent = 0.25;
    let carbPercent = 0.45;
    let fatPercent = 0.3;

    if (dietReadiness.keto_ready) {
      proteinPercent = 0.25;
      carbPercent = 0.05;
      fatPercent = 0.7;
    } else if (dietReadiness.high_protein_ready) {
      proteinPercent = 0.35;
      carbPercent = 0.35;
      fatPercent = 0.3;
    } else if (dietReadiness.low_carb_ready) {
      proteinPercent = 0.3;
      carbPercent = 0.25;
      fatPercent = 0.45;
    }

    if (primaryGoals.includes("muscle_gain")) {
      proteinPercent = Math.max(proteinPercent, 0.3);
    }

    return {
      protein: Math.round((dailyCalories * proteinPercent) / 4),
      carbs: Math.round((dailyCalories * carbPercent) / 4),
      fat: Math.round((dailyCalories * fatPercent) / 9),
    };
  }
}
