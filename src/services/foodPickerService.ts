/**
 * Food Picker service — recents/favourites persistence + regional quick-picks
 * and macro-gap recommendations, mirroring `exercisePickerService.ts`'s
 * structure (same AsyncStorage error policy: every op wrapped in try/catch,
 * returning a safe default — pure functions never throw, per CLAUDE.md §5).
 *
 * Also owns the `FoodSearchHit` type (the normalised search result shape) and
 * the `buildMealItemFromMacros` adapter used by both `FoodPickerSheet`'s
 * manual-entry form and `savedMealsStore`'s ingredient→MealItem conversion.
 *
 * Search itself (the debounced SQLite + Indian DB + IFCT merge) lives in
 * `FoodPickerSheet` — this service covers what that sheet doesn't.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { INDIAN_FOOD_DATABASE, type IndianFoodData } from "../data/indianFoodDatabase";
import { caloriesFromMacros } from "../utils/nutritionRecalc";
import type { MealItem, Food } from "../types/diet";

/**
 * Normalised search result handed to the picker's parent. Lives in the
 * service (the single source for food-picker types) rather than a component,
 * so `FoodPickerSheet` and `savedMealsStore` can import the type without
 * pulling in a UI module. Previously this interface was exported by the
 * now-deleted `FoodSearchSheet.tsx` component (an orphan duplicated by
 * `FoodPickerSheet`).
 */
export interface FoodSearchHit {
  /** Stable key for FlatList */
  key: string;
  /** Display name */
  name: string;
  /** Brand or region subtitle (may be empty) */
  subtitle?: string;
  /** per-100g macros (calories always required; others 0 when missing) */
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
  };
  /** "sqlite" (offline packaged DB) | "indian" (curated dish DB) |
   * "ifct" (IFCT 2017 generic-ingredient DB) | "custom" (hand-typed, no DB) */
  source: 'sqlite' | 'indian' | 'ifct' | 'custom';
  /** Barcode when source === "sqlite" (used to dedupe against scan cache) */
  barcode?: string;
  /** Nutriscore grade a-e when available */
  nutriScore?: string;
  /** Nova group 1-4 when available */
  novaGroup?: number;
  /** Image URL when available */
  imageUrl?: string;
}

const RECENT_STORAGE_KEY = "food_picker_recent";
const FAV_STORAGE_KEY = "favorite_foods";
export const MAX_RECENT_SEARCHES = 10;

// ----------------------------------------------------------------------------
// RECENT SEARCHES (AsyncStorage)
// ----------------------------------------------------------------------------

export async function getRecentFoodSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES);
  } catch (error) {
    console.error("[foodPickerService] getRecentFoodSearches failed:", error);
    return [];
  }
}

export async function addRecentFoodSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const current = await getRecentFoodSearches();
    const deduped = [trimmed, ...current.filter((c) => c.toLowerCase() !== trimmed.toLowerCase())];
    const next = deduped.slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("[foodPickerService] addRecentFoodSearch failed:", error);
  }
}

export async function clearRecentFoodSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
  } catch (error) {
    console.error("[foodPickerService] clearRecentFoodSearches failed:", error);
  }
}

// ----------------------------------------------------------------------------
// FAVOURITES (AsyncStorage) — keyed by FoodSearchHit.key
// ("indian:<dbKey>" | "sqlite:<barcode>"), the identity scheme FoodSearchSheet
// already uses, so favourites line up with search results without a second
// id scheme.
// ----------------------------------------------------------------------------

export async function getFavoriteFoods(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch (error) {
    console.error("[foodPickerService] getFavoriteFoods failed:", error);
    return [];
  }
}

export async function toggleFavoriteFood(foodKey: string): Promise<boolean> {
  try {
    const current = await getFavoriteFoods();
    const exists = current.includes(foodKey);
    const next = exists ? current.filter((k) => k !== foodKey) : [...current, foodKey];
    await AsyncStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(next));
    return !exists; // new state: true = now favourited
  } catch (error) {
    console.error("[foodPickerService] toggleFavoriteFood failed:", error);
    return false;
  }
}

// ----------------------------------------------------------------------------
// REGIONAL QUICK PICKS — curated, like exercisePickerService's POPULAR_IDS
// ----------------------------------------------------------------------------

const QUICK_PICK_KEYS = [
  "biryani",
  "dal makhani",
  "dosa",
  "idli",
  "roti",
  "rajma",
  "paneer butter masala",
  "chai",
];

/** A small curated set for the picker's "Quick Picks" row — deliberately
 * hardcoded (like exercisePickerService.getPopularExercises), not derived
 * from telemetry that doesn't exist. */
export function getQuickFoodPicks(): (IndianFoodData & { key: string })[] {
  return QUICK_PICK_KEYS.map((key) => {
    const entry = INDIAN_FOOD_DATABASE[key];
    return entry ? { ...entry, key } : null;
  }).filter((x): x is IndianFoodData & { key: string } => Boolean(x));
}

export function getFoodPicksForRegion(
  region: string
): (IndianFoodData & { key: string })[] {
  return Object.entries(INDIAN_FOOD_DATABASE)
    .filter(([, food]) => food.region === region || food.region === "pan-indian")
    .map(([key, food]) => ({ ...food, key }));
}

// ----------------------------------------------------------------------------
// MACRO-GAP RECOMMENDATION — same inverse-coverage idea as
// exercisePickerService.getRecommendedForDay, applied to a meal's macro
// composition instead of a workout's muscle coverage.
// ----------------------------------------------------------------------------

export type MacroKey = "protein" | "carbs" | "fat";

export interface MacroGapContext {
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

/** Which macro has the largest relative shortfall right now. Returns null
 * when every macro is already at or above target (nothing to recommend for). */
function biggestGap(ctx: MacroGapContext): MacroKey | null {
  const gaps: Array<{ key: MacroKey; ratio: number }> = [
    { key: "protein", ratio: ctx.targetProtein > 0 ? ctx.currentProtein / ctx.targetProtein : 1 },
    { key: "carbs", ratio: ctx.targetCarbs > 0 ? ctx.currentCarbs / ctx.targetCarbs : 1 },
    { key: "fat", ratio: ctx.targetFat > 0 ? ctx.currentFat / ctx.targetFat : 1 },
  ];
  const under = gaps.filter((g) => g.ratio < 0.95);
  if (under.length === 0) return null;
  return under.reduce((worst, g) => (g.ratio < worst.ratio ? g : worst)).key;
}

function macroDensity(food: IndianFoodData, macro: MacroKey): number {
  const calories = food.nutritionPer100g.calories || 1;
  const grams =
    macro === "protein"
      ? food.nutritionPer100g.protein
      : macro === "carbs"
        ? food.nutritionPer100g.carbs
        : food.nutritionPer100g.fat;
  // Grams of the target macro per 100 kcal — a density measure that doesn't
  // just reward "the food with the most calories."
  return (grams / calories) * 100;
}

/**
 * Recommend up to `limit` foods that would help close the day's biggest
 * macro gap, ranked by density of that macro (not raw amount). Mirrors
 * exercisePickerService.getRecommendedForDay's inverse-coverage shape,
 * applied to macros instead of muscle groups.
 */
export function getRecommendedFoodsForGap(
  ctx: MacroGapContext,
  excludeKeys: string[] = [],
  limit = 6
): { key: string; food: IndianFoodData; gapMacro: MacroKey }[] {
  const gapMacro = biggestGap(ctx);
  if (!gapMacro) return [];

  const excludeSet = new Set(excludeKeys.map((k) => k.toLowerCase()));
  return Object.entries(INDIAN_FOOD_DATABASE)
    .filter(([key]) => !excludeSet.has(key.toLowerCase()))
    .map(([key, food]) => ({ key, food, density: macroDensity(food, gapMacro) }))
    .sort((a, b) => b.density - a.density)
    .slice(0, limit)
    .map(({ key, food }) => ({ key, food, gapMacro }));
}

// ----------------------------------------------------------------------------
// CUSTOM (HAND-TYPED) FOOD → MEAL ITEM
// ----------------------------------------------------------------------------

export interface CustomFoodInput {
  name: string;
  /** Absolute grams this entry represents — NOT a per-100g density. */
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Build a MealItem from hand-typed macros for a single quantity (not a
 * per-100g density) — the Meal Builder's escape hatch for any food no
 * database contains (P0 of the Phase 6 plan). Calories are derived via
 * Atwater (4/4/9), the same `caloriesFromMacros` LogMealModal already uses,
 * so "boiled water" (all macros 0) correctly lands at 0 kcal with no
 * special-casing.
 *
 * Shared by FoodPickerSheet's "Add custom food" form and
 * savedMealsStore.ingredientToMealItem (which parses its string fields and
 * delegates here) so the Food-object fabrication logic exists in one place.
 */
export function buildMealItemFromMacros(input: CustomFoodInput): MealItem {
  const { name, grams, protein, carbs, fat, fiber } = input;
  const calories = caloriesFromMacros({ protein, carbs, fat, fiber });
  const now = new Date().toISOString();
  const id = `custom_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
  const food: Food = {
    id,
    name,
    category: "proteins",
    nutrition: {
      calories,
      macros: { protein, carbohydrates: carbs, fat, fiber },
      servingSize: grams,
      servingUnit: "g",
    },
    allergens: [],
    dietaryLabels: [],
    verified: false,
    createdAt: now,
    updatedAt: now,
  };
  return {
    foodId: food.id,
    food,
    name,
    quantity: grams,
    unit: "g",
    calories,
    macros: { protein, carbohydrates: carbs, fat, fiber },
  };
}
