/**
 * SavedMealsStore — user-saved meals for reuse in the Log Meal modal AND the
 * Meal Builder's "My Saved Meals" template source (Decision 2 of the diet
 * plan: extend this store rather than adding a parallel
 * `custom_meal_templates` concept).
 *
 * Single runtime source of truth for meals the user has saved for future
 * reuse. Persisted to AsyncStorage via createDebouncedStorage (same pattern as
 * hydrationStore / nutritionStore) AND, since Phase 1's migration, synced to
 * Supabase's `saved_meals` table (fire-and-forget after the local write, so
 * the store stays the runtime SSOT either way — Principle 6). Guests never
 * reach the Supabase path (getSyncableUserId guard, P1-6).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { caloriesFromMacros } from "../utils/nutritionRecalc";
import { getSyncableUserId } from "../services/authUtils";
import { offlineService } from "../services/offline";
import { supabase } from "../services/supabase";
import { buildMealItemFromMacros } from "../services/foodPickerService";
import type { MealItem } from "../types/diet";

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

/** The 6 meal types the app actually uses (types/diet.ts:149-157) — wider
 * than the "breakfast"|"lunch"|"dinner"|"snack" the field was originally
 * typed as loosely in prose. Kept as `string` on SavedMeal itself for
 * backward compatibility with meals saved before this widened, but new
 * saves should use this union. */
export type SavedMealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_workout"
  | "post_workout";

export interface SavedMeal {
  id: string;
  name: string;
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

/** What a saved meal turns into when applied to a schedule day — ready to
 * hand to `dietBuilderStore.applyMealTemplate(dayOfWeek, mealType, template)`.
 * Kept here rather than importing dietBuilderStore (which would couple this
 * domain-pure nutrition store to the builder) — the caller wires the two. */
export interface MealTemplatePayload {
  name: string;
  items: MealItem[];
}

interface SavedMealsState {
  meals: SavedMeal[];
  isLoadingFromCloud: boolean;

  // Actions
  saveMeal: (input: SaveMealInput) => SavedMeal;
  deleteMeal: (id: string) => void;
  /** Filter saved meals by a name query (case-insensitive, ≥1 char) and meal type. */
  getMealsByName: (query: string, mealType?: string) => SavedMeal[];
  getAll: () => SavedMeal[];
  /** Convert a saved meal into a template payload for the Meal Builder.
   * Returns null if the meal id doesn't exist. */
  applyToSchedule: (mealId: string) => MealTemplatePayload | null;
  /** Hydrate `meals` from Supabase (multi-device sync). Merges by id,
   * cloud rows win on conflict since they're the most-recently-synced
   * source. Not yet wired into the app's central load sequence
   * (useHomeLogic/remoteDataSync's Promise.all) — call explicitly for now;
   * wiring it there is a small follow-up, not required for the store to be
   * correct locally. */
  loadFromCloud: () => Promise<void>;

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

/** Build a minimal valid Food object for an ingredient that only has
 * already-computed totals (not a per-100g density) — a SavedMealIngredient
 * stores the amount actually used, not a reusable nutrition-per-100g fact, so
 * the MealItem carries the ingredient's numbers directly as its own
 * calories/macros rather than re-deriving them from a synthesized density. */
function ingredientToMealItem(ing: SavedMealIngredient): MealItem {
  return buildMealItemFromMacros({
    name: ing.name,
    grams: parseFloat(ing.grams.replace(",", ".")) || 0,
    protein: parseFloat(ing.protein.replace(",", ".")) || 0,
    carbs: parseFloat(ing.carbs.replace(",", ".")) || 0,
    fat: parseFloat(ing.fat.replace(",", ".")) || 0,
    fiber: parseFloat(ing.fiber.replace(",", ".")) || 0,
  });
}

function toSupabaseRow(userId: string, meal: SavedMeal) {
  return {
    id: meal.id,
    user_id: userId,
    name: meal.name,
    meal_type: meal.mealType,
    ingredients: meal.ingredients,
    total_calories: meal.totalCalories,
    total_protein: meal.totalProtein,
    total_carbs: meal.totalCarbs,
    total_fat: meal.totalFat,
    total_fiber: meal.totalFiber,
  };
}

export const useSavedMealsStore = create<SavedMealsState>()(
  persist(
    (set, get) => ({
      meals: [],
      isLoadingFromCloud: false,

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

        // P1-6: guests never reach the offline queue (fire-and-forget — the
        // local write above already made this store the runtime SSOT).
        const syncableUserId = getSyncableUserId();
        if (syncableUserId) {
          offlineService
            .queueAction({
              type: "CREATE",
              table: "saved_meals",
              data: toSupabaseRow(syncableUserId, meal),
              userId: syncableUserId,
              maxRetries: 3,
            })
            .catch((error) => {
              console.error("[savedMealsStore] Failed to queue saved_meals CREATE:", error);
            });
        }

        return meal;
      },

      deleteMeal: (id) => {
        set((state) => ({ meals: state.meals.filter((m) => m.id !== id) }));

        const syncableUserId = getSyncableUserId();
        if (syncableUserId) {
          offlineService
            .queueAction({
              type: "DELETE",
              table: "saved_meals",
              data: { id },
              userId: syncableUserId,
              maxRetries: 3,
            })
            .catch((error) => {
              console.error("[savedMealsStore] Failed to queue saved_meals DELETE:", error);
            });
        }
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

      applyToSchedule: (mealId) => {
        const meal = get().meals.find((m) => m.id === mealId);
        if (!meal) return null;
        return {
          name: meal.name,
          items: meal.ingredients.map(ingredientToMealItem),
        };
      },

      loadFromCloud: async () => {
        const syncableUserId = getSyncableUserId();
        if (!syncableUserId) return;

        set({ isLoadingFromCloud: true });
        try {
          const { data, error } = await supabase
            .from("saved_meals")
            .select("*")
            .eq("user_id", syncableUserId)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("[savedMealsStore] loadFromCloud query failed:", error);
            return;
          }
          if (!data) return;

          const cloudMeals: SavedMeal[] = data.map((row) => ({
            id: row.id,
            name: row.name,
            mealType: row.meal_type,
            ingredients: (row.ingredients ?? []) as SavedMealIngredient[],
            totalCalories: row.total_calories ?? 0,
            totalProtein: Number(row.total_protein) || 0,
            totalCarbs: Number(row.total_carbs) || 0,
            totalFat: Number(row.total_fat) || 0,
            totalFiber: Number(row.total_fiber) || 0,
            createdAt: row.created_at ?? new Date().toISOString(),
          }));

          // Merge by id — cloud rows win on conflict since they're the
          // most-recently-synced source; local-only meals (not yet synced,
          // or created offline) are kept as-is.
          set((state) => {
            const cloudIds = new Set(cloudMeals.map((m) => m.id));
            const localOnly = state.meals.filter((m) => !cloudIds.has(m.id));
            return { meals: [...cloudMeals, ...localOnly] };
          });
        } catch (error) {
          console.error("[savedMealsStore] loadFromCloud failed:", error);
        } finally {
          set({ isLoadingFromCloud: false });
        }
      },

      reset: () => set({ meals: [], isLoadingFromCloud: false }),
    }),
    {
      name: "fitai-saved-meals-storage",
      storage: createDebouncedStorage(),
      partialize: (state) => ({ meals: state.meals }),
    },
  ),
);

export default useSavedMealsStore;
