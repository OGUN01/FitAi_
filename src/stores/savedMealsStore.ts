/**
 * SavedMealsStore — user-saved meals for reuse in the Log Meal modal.
 *
 * Single runtime source of truth for meals the user has saved for future
 * reuse. Persisted to AsyncStorage via createDebouncedStorage (same pattern as
 * hydrationStore / nutritionStore).
 *
 * Supabase sync is NOT wired here: no `saved_meals` / `user_foods` table exists
 * in supabase/migrations/ (verified before writing). AsyncStorage-only for now;
 * Supabase persistence is a flagged follow-up (see report). When a table is
 * added later, wire it through a savedMealsDataService mirroring
 * hydrationDataService, and call saveMeal's Supabase path fire-and-forget —
 * the store stays the runtime SSOT in either case (Principle 6).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { caloriesFromMacros } from "../utils/nutritionRecalc";

/**
 * A single ingredient row on a saved meal. Mirrors the Ingredient shape used
 * by LogMealModal (string fields, since the user edits them in TextInputs),
 * but typed here as a stable persistence contract.
 */
export interface SavedMealIngredient {
  name: string;
  grams: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

export interface SavedMeal {
  id: string;
  name: string;
  /** "breakfast" | "lunch" | "dinner" | "snack" */
  mealType: string;
  ingredients: SavedMealIngredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  createdAt: string; // ISO timestamp
}

export interface SaveMealInput {
  name: string;
  mealType: string;
  ingredients: SavedMealIngredient[];
}

interface SavedMealsState {
  meals: SavedMeal[];

  // Actions
  saveMeal: (input: SaveMealInput) => SavedMeal;
  deleteMeal: (id: string) => void;
  /** Filter saved meals by a name query (case-insensitive, ≥1 char) and meal type. */
  getMealsByName: (query: string, mealType?: string) => SavedMeal[];
  getAll: () => SavedMeal[];

  // Reset (for logout)
  reset: () => void;
}

/**
 * Compute totals from an ingredient list so the stored SavedMeal always
 * matches what the Log Meal modal would derive on the fly. Single source of
 * truth for the totals — never store a stale snapshot that diverges from the
 * ingredients (Principle 1).
 */
function computeTotals(ingredients: SavedMealIngredient[]) {
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  for (const ing of ingredients) {
    const p = parseFloat(ing.protein.replace(",", ".")) || 0;
    const c = parseFloat(ing.carbs.replace(",", ".")) || 0;
    const f = parseFloat(ing.fat.replace(",", ".")) || 0;
    const fi = parseFloat(ing.fiber.replace(",", ".")) || 0;
    protein += p;
    carbs += c;
    fat += f;
    fiber += fi;
  }
  return {
    totalCalories: caloriesFromMacros({ protein, carbs, fat, fiber }),
    totalProtein: protein,
    totalCarbs: carbs,
    totalFat: fat,
    totalFiber: fiber,
  };
}

function makeId(): string {
  return `saved_meal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const useSavedMealsStore = create<SavedMealsState>()(
  persist(
    (set, get) => ({
      meals: [],

      saveMeal: (input) => {
        const trimmedName = input.name.trim();
        if (!trimmedName) {
          throw new Error("Saved meal must have a name.");
        }
        const totals = computeTotals(input.ingredients);
        const meal: SavedMeal = {
          id: makeId(),
          name: trimmedName,
          mealType: input.mealType,
          ingredients: input.ingredients.map((ing) => ({
            name: ing.name,
            grams: ing.grams,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            fiber: ing.fiber,
          })),
          ...totals,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ meals: [meal, ...state.meals] }));
        return meal;
      },

      deleteMeal: (id) => {
        set((state) => ({ meals: state.meals.filter((m) => m.id !== id) }));
      },

      getMealsByName: (query, mealType) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return get().meals.filter((m) => {
          const nameMatch = m.name.toLowerCase().includes(q);
          const typeMatch = mealType ? m.mealType === mealType : true;
          return nameMatch && typeMatch;
        });
      },

      getAll: () => get().meals,

      reset: () => set({ meals: [] }),
    }),
    {
      name: "fitai-saved-meals-storage",
      storage: createDebouncedStorage(),
      partialize: (state) => ({ meals: state.meals }),
    },
  ),
);

export default useSavedMealsStore;
