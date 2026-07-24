/**
 * Nutrition recalculation helpers — shared between LogMealModal and the
 * scan/portion-adjustment flow so macro math has ONE source of truth.
 *
 * Conventions:
 *   - All macros are in GRAMS.
 *   - Calories are derived from the 4/4/9 Atwater factors (protein 4, carbs 4, fat 9).
 *   - `per100g` values describe a food's nutrient density per 100 g.
 *   - `grams` is the actual portion weight the user will consume.
 */

import { parseLocalFloat } from "./units";

export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Scale a per-100g macro profile to an arbitrary portion weight.
 * Returns grams of each macro for the given portion.
 */
export function scaleMacrosByGrams(
  per100g: MacroGrams,
  grams: number,
): MacroGrams {
  const ratio = (Number(grams) || 0) / 100;
  return {
    protein: per100g.protein * ratio,
    carbs: per100g.carbs * ratio,
    fat: per100g.fat * ratio,
    fiber: per100g.fiber * ratio,
  };
}

/**
 * Inverse of scaleMacrosByGrams: given a macro value (e.g. protein) and its
 * per-100g density, derive the grams of the portion. Useful when the user
 * edits a single macro field and we want to back out the implied portion.
 */
export function gramsFromMacroAndDensity(
  macroValue: number,
  per100gMacro: number,
): number {
  if (!per100gMacro || per100gMacro <= 0) return 0;
  return (Number(macroValue) || 0) * (100 / per100gMacro);
}

/**
 * Derive calories from macros using the Atwater factors.
 * protein 4 cal/g, carbs 4 cal/g, fat 9 cal/g. Fiber is indigestible
 * carbohydrate and contributes 0 cal/g (2 cal/g if you want net carbs,
 * but FitAI uses gross carbs for calorie derivation — fiber excluded).
 */
export function caloriesFromMacros(macros: MacroGrams): number {
  return Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9);
}

/**
 * Sum a list of macro entries into totals.
 */
export function sumMacros(entries: MacroGrams[]): MacroGrams {
  return entries.reduce(
    (acc, m) => ({
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
      fiber: acc.fiber + (m.fiber || 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

/**
 * Parse a user-entered macro string (which may use a comma decimal separator)
 * into a number, defaulting to 0. Mirrors the parseNum helper that was
 * previously inlined in LogMealModal — extracted so both flows share it.
 */
export function parseMacroString(value: string): number {
  return parseLocalFloat(value) || 0;
}
