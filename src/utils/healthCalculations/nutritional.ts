import { MacronutrientDistribution } from "./shared-types";
import { macroCalculator } from "./calculators/macroCalculator";
import type { Goal, DietType } from "./types";
import type { DietPreferencesData } from "../../types/onboarding";

/**
 * Resolve the effective macro DietType from user diet preferences.
 * Readiness flags take precedence over the base diet_type.
 * Exported so every engine (master-engine, ValidationEngine) uses the same mapping.
 */
export function resolveDietType(prefs: DietPreferencesData): DietType {
  if (prefs.keto_ready) return 'keto';
  if (prefs.paleo_ready) return 'paleo';
  if (prefs.mediterranean_ready) return 'mediterranean';
  if (prefs.low_carb_ready) return 'low_carb';
  switch (prefs.diet_type) {
    case 'vegetarian': return 'vegetarian';
    case 'vegan': return 'vegan';
    case 'pescatarian': return 'pescatarian';
    default: return 'omnivore'; // 'non-veg' and any unknown value
  }
}

export class NutritionalCalculations {
  static calculateDailyCaloriesForGoal(
    tdee: number,
    weeklyWeightChangeKg: number,
    isWeightLoss: boolean = true,
  ): number {
    const weeklyCalorieChange = weeklyWeightChangeKg * 7700;
    const dailyCalorieChange = weeklyCalorieChange / 7;

    const result = isWeightLoss ? tdee - dailyCalorieChange : tdee + dailyCalorieChange;
    // Enforce clinical minimum — never below 1200 kcal/day regardless of deficit size
    return isWeightLoss ? Math.max(result, 1200) : result;
  }

  /**
   * Calculate macronutrients using weight-based protein (g/kg body weight).
   * DietAdaptiveMacroCalculator is the single source of truth for all macro splits.
   *
   * Protein: 1.6–2.2 g/kg depending on goal (lean mass used when body fat % is known).
   * Carbs/fat: split from remaining calories based on dietType ratios.
   */
  static calculateMacronutrients(
    dailyCalories: number,
    weightKg: number,
    primaryGoal: Goal,
    dietType: DietType,
    bodyFatPercent?: number,
    targetWeightKg?: number,
  ): MacronutrientDistribution {
    const protein = macroCalculator.calculateProtein(
      weightKg,
      primaryGoal,
      dietType,
      bodyFatPercent,
      targetWeightKg,
    );
    const { fat, carbs } = macroCalculator.calculateMacroSplit(
      dailyCalories,
      protein,
      dietType,
    );
    return { protein, fat, carbs };
  }
}
