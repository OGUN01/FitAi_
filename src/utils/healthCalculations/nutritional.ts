import { MacronutrientDistribution } from "./shared-types";
import { macroCalculator } from "./calculators/macroCalculator";
import type { Goal, DietType } from "./types";
import type { DietPreferencesData } from "../../types/onboarding";
import { CALORIE_PER_KG, MIN_CALORIES_FEMALE, MIN_CALORIES_MALE } from "../../services/validation/constants";
import { mapDietTypeForHealthCalc } from "../../utils/typeTransformers";

/**
 * Resolve the effective macro DietType from user diet preferences.
 *
 * SSOT: the diet_type → base DietType mapping is centralized in
 * typeTransformers.mapDietTypeForHealthCalc. This function layers the
 * readiness-flag override on top, with a SAFETY GUARD:
 *
 * A readiness flag (keto_ready, paleo_ready, etc.) must NOT silently override a
 * medically-incompatible explicit user diet choice. The override only applies
 * when the base diet is compatible with the readiness flag. When a conflict
 * exists (e.g. user is vegan but has keto_ready=true), we log a warning and
 * PREFER THE EXPLICIT USER CHOICE — keto is not a vegan-safe diet, so applying
 * it would be a dangerous mismatch.
 *
 * Exported so every engine (master-engine, ValidationEngine) uses the same
 * resolution. See FITAI_DATA_ARCHITECTURE.md section D.2 for the enum table.
 */
export function resolveDietType(prefs: DietPreferencesData): DietType {
  // Base diet from the centralized mapper (handles non-veg/balanced → omnivore).
  const baseDiet = mapDietTypeForHealthCalc(prefs.diet_type) as DietType;

  // A readiness flag is only eligible to override the base diet when the base
  // diet is compatible with it. Vegetarian/vegan exclude meat-heavy or
  // animal-fat-heavy specialized diets; the override is suppressed and the
  // explicit user choice wins. omnivore is compatible with all readiness flags.
  const canOverride = baseDiet === "omnivore";

  if (canOverride) {
    if (prefs.keto_ready) return "keto";
    if (prefs.paleo_ready) return "paleo";
    if (prefs.mediterranean_ready) return "mediterranean";
    if (prefs.low_carb_ready) return "low_carb";
  } else if (
    prefs.keto_ready ||
    prefs.paleo_ready ||
    prefs.low_carb_ready
  ) {
    // Conflict: user explicitly chose a restrictive plant-based/pescatarian diet
    // but a meat/animal-fat-heavy readiness flag is set. Prefer the user's
    // explicit choice and surface the conflict so it can be reconciled.
    console.warn(
      `[resolveDietType] Readiness flag conflicts with explicit diet_type "${prefs.diet_type}" ` +
        `(keto_ready=${prefs.keto_ready}, paleo_ready=${prefs.paleo_ready}, ` +
        `low_carb_ready=${prefs.low_carb_ready}). Preferring the user's explicit ` +
        `diet choice ("${baseDiet}") — the readiness flag is ignored for macros.`,
    );
  }
  // mediterranean_ready is compatible with pescatarian (fish + olive oil), so
  // allow it even when the base diet is pescatarian.
  if (prefs.mediterranean_ready && baseDiet === "pescatarian") {
    return "mediterranean";
  }

  // high_protein_ready is an AI-only flag: it signals the AI generator to
  // emphasise protein in the meal plan but it is NOT a DietType value. Macro
  // splits are handled by macroCalculator based on goal (e.g. muscle_gain
  // already applies a high protein multiplier). It must not change the
  // DietType returned here.
  return baseDiet;
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
