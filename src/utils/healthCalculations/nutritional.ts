import { MacronutrientDistribution } from "./shared-types";
import { macroCalculator } from "./calculators/macroCalculator";
import type { Goal, DietType } from "./types";
import type { DietPreferencesData } from "../../types/onboarding";
import { CALORIE_PER_KG, MIN_CALORIES_FEMALE, MIN_CALORIES_MALE } from "../../services/validation/constants";

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
  // high_protein_ready is an AI-only flag: it signals the AI generator to
  // emphasise protein in the meal plan but it is NOT a DietType value.
  // Macro splits are handled by macroCalculator based on goal (e.g. muscle_gain
  // already applies a high protein multiplier). Mapping to a non-existent
  // DietType would break macroCalculator; the omnivore fallback below is
  // therefore the correct and intentional path for high_protein_ready users.
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
    gender: "male" | "female" = "female", // should always be provided; defaults to female for safety
  ): number {
    const weeklyCalorieChange = weeklyWeightChangeKg * CALORIE_PER_KG;
    const dailyCalorieChange = weeklyCalorieChange / 7;

    const result = isWeightLoss ? tdee - dailyCalorieChange : tdee + dailyCalorieChange;
    // Enforce clinical minimum — never below ACSM floor regardless of deficit size
    const minCalories = gender === "male" ? MIN_CALORIES_MALE : MIN_CALORIES_FEMALE;
    return isWeightLoss ? Math.max(result, minCalories) : result;
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
