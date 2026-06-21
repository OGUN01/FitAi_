import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Platform } from "react-native";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { WeeklyMealPlan, DayMeal, MealItem } from "../ai";
import { SyncStatus, LoggedFood } from "../types/localData";
import { Meal } from "../types/ai";
import { crudOperations } from "../services/crudOperations";
import { offlineService } from "../services/offline";
import { supabase } from "../services/supabase";
import { generateUUID, isValidUUID } from "../utils/uuid";
import { getCurrentUserId } from "../services/authUtils";

/**
 * P1-6: Returns the real authenticated user id, or null when the user is a
 * guest / not authenticated. Callers use this to SKIP offline-queue sync for
 * guests (matching the pattern in analyticsData, achievementData,
 * crudOperations, extraWorkoutService). Guest IDs ("guest-...") must never
 * reach Supabase writes — RLS rejects them and they pollute the retry queue.
 */
function getSyncableUserId(): string | null {
  const userId = getCurrentUserId();
  if (!userId) return null;
  if (userId.startsWith("guest")) return null;
  return userId;
}
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  getLocalDateString,
  getLocalDayBounds,
} from "../utils/weekUtils";
import {
  deriveMealLogFiber,
  deriveMealLogSugar,
  normalizeMealLogFoodItems,
} from "../utils/mealLogNutrition";
import {
  pruneLegacyScanShadowState,
  sanitizeLegacyScanShadowPersistedState,
} from "./nutrition/legacyScanShadowCleanup";

let mealLogsChannel: RealtimeChannel | null = null;

// Row shape returned by Supabase meal_logs select
interface MealLogRow {
  id: string;
  meal_plan_id?: string | null;
  meal_type?: string | null;
  meal_name?: string | null;
  from_plan?: boolean | null;
  plan_meal_id?: string | null;
  portion_multiplier?: number | null;
  total_calories?: number | null;
  total_protein?: number | null;
  total_carbohydrates?: number | null;
  total_fat?: number | null;
  food_items?: unknown;
  logged_at?: string | null;
  logging_mode?: string | null;
  truth_level?: string | null;
  confidence?: number | null;
  country_context?: string | null;
  requires_review?: boolean | null;
  source_metadata?: Record<string, unknown> | null;
  // P2-11: explicit completion flag — replaces the "[COMPLETED]" notes string.
  is_completed?: boolean | null;
}

const MEAL_LOG_SELECT =
  "id, meal_plan_id, meal_type, meal_name, from_plan, plan_meal_id, portion_multiplier, total_calories, total_protein, total_carbohydrates, total_fat, food_items, logged_at, logging_mode, truth_level, confidence, country_context, requires_review, source_metadata, is_completed";

// Type guard for MealType - ensures type safety without 'as any'
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function toMealType(value: string | undefined): MealType {
  const normalized = (value || "snack").toLowerCase();
  if (VALID_MEAL_TYPES.includes(normalized as MealType)) {
    return normalized as MealType;
  }
  // Map common variations
  if (normalized.includes("break") || normalized.includes("morning"))
    return "breakfast";
  if (normalized.includes("lunch") || normalized.includes("noon"))
    return "lunch";
  if (normalized.includes("dinner") || normalized.includes("evening"))
    return "dinner";
  return "snack"; // Default fallback
}

// Helper to create a properly typed LoggedFood (uses lightweight version without full Food object)
function createLoggedFood(
  item: MealItem,
  mealId: string,
  index: number,
): LoggedFood {
  return {
    id: `food_${mealId}_${index}`,
    foodId: `food_${mealId}_${index}`,
    // food is optional - we use lightweight version
    quantity: typeof item.quantity === "number" ? item.quantity : 100,
    unit: "grams",
    calories: item.calories || 0,
    macros: {
      protein: item.macros?.protein ?? 0,
      carbohydrates: item.macros?.carbohydrates ?? 0,
      fat: item.macros?.fat ?? 0,
      fiber: item.macros?.fiber ?? 0,
      sugar: item.macros?.sugar ?? 0,
    },
  };
}

export interface MealProgress {
  mealId: string;
  progress: number; // 0-100
  completedAt?: string;
  logId?: string;
}

// Consumed nutrition computed from completed meals - SINGLE SOURCE OF TRUTH
export interface ConsumedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium?: number;
}

const EMPTY_CONSUMED_NUTRITION: ConsumedNutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};

function clearConsumedNutritionCaches() {
  consumedNutritionCache = null;
  lastConsumedMealProgressRef = null;
  lastConsumedDailyMealsRef = null;
  todaysConsumedNutritionCache = null;
  lastTodaysMealProgressRef2 = null;
  lastTodaysDailyMealsRef2 = null;
  lastTodaysDate2 = "";
}

/**
 * P0-2: Exported so clearUserData can clear the store's OWN module-level caches
 * on logout (replaces the deleted nutrition/selectors.ts#clearNutritionCache
 * which only cleared the divergent selector caches, not these).
 */
export { clearConsumedNutritionCaches };

function isLoggedMeal(meal: Meal | null | undefined): meal is Meal {
  return Boolean(meal && typeof meal.loggedAt === "string");
}

function getMealLocalDate(meal: Meal | null | undefined): string | null {
  if (!meal) return null;

  const dateValue =
    typeof meal.loggedAt === "string"
      ? meal.loggedAt
      : meal.createdAt;

  return typeof dateValue === "string" ? getLocalDateString(dateValue) : null;
}

function sumMealNutrition(meals: Meal[]): ConsumedNutrition {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
      fiber: acc.fiber + (meal.totalMacros?.fiber || 0),
      sugar: acc.sugar + (meal.totalMacros?.sugar || 0),
      sodium: (acc.sodium ?? 0) + (meal.totalMacros?.sodium || 0),
    }),
    { ...EMPTY_CONSUMED_NUTRITION },
  );
}

function getConsumedMealsFromState(state: NutritionState): Meal[] {
  return (state.dailyMeals || []).filter(isLoggedMeal);
}

// PERF-005 FIX: Cache for consumed nutrition to avoid O(nÂ²) recalculation
// Uses reference equality (O(1)) instead of JSON.stringify (O(n)) for cache invalidation
let consumedNutritionCache: ConsumedNutrition | null = null;
let lastConsumedMealProgressRef: any = null;
let lastConsumedDailyMealsRef: any = null;
let todaysConsumedNutritionCache: ConsumedNutrition | null = null;
let lastTodaysMealProgressRef2: any = null;
let lastTodaysDailyMealsRef2: any = null;
let lastTodaysDate2: string = "";

export interface NutritionState {
  // Weekly meal plan state
  weeklyMealPlan: WeeklyMealPlan | null;
  isGeneratingPlan: boolean;
  planError: string | null;

  // Meal progress tracking
  mealProgress: Record<string, MealProgress>;

  // Daily meal tracking
  dailyMeals: Meal[];
  isGeneratingMeal: boolean;
  mealError: string | null;

  // Current meal session
  currentMealSession: {
    mealId: string;
    logId: string;
    startedAt: string;
    ingredients: Array<{
      ingredientId: string;
      completed: boolean;
      quantity: number;
    }>;
  } | null;
  hydrationOwnerUserId: string | null;

  // Actions
  setWeeklyMealPlan: (plan: WeeklyMealPlan | null) => void;
  saveWeeklyMealPlan: (plan: WeeklyMealPlan) => Promise<void>;
  loadWeeklyMealPlan: () => Promise<WeeklyMealPlan | null>;
  setGeneratingPlan: (isGenerating: boolean) => void;
  setPlanError: (error: string | null) => void;

  // Daily meal actions
  addDailyMeal: (meal: Meal) => void;
  setDailyMeals: (meals: Meal[]) => void;
  setGeneratingMeal: (isGenerating: boolean) => void;
  setMealError: (error: string | null) => void;

  // Meal progress actions
  updateMealProgress: (mealId: string, progress: number) => void;
  completeMeal: (mealId: string, logId?: string) => Promise<void>;
  getMealProgress: (mealId: string) => MealProgress | null;

  // Computed selectors - SINGLE SOURCE OF TRUTH
  getConsumedNutrition: () => ConsumedNutrition;
  getTodaysConsumedNutrition: () => ConsumedNutrition;
  getConsumedNutritionForDate: (date: string) => ConsumedNutrition;

  // Meal session actions
  startMealSession: (meal: DayMeal) => Promise<string>;
  endMealSession: (logId: string) => Promise<void>;
  updateIngredientProgress: (ingredientId: string, quantity: number) => void;

  // Data persistence
  persistData: () => Promise<void>;
  loadData: () => Promise<void>;
  clearData: () => void;
  removeLegacyScanShadows: () => void;

  // Realtime subscriptions
  setupRealtimeSubscription: (userId: string) => void;
  cleanupRealtimeSubscription: () => void;
  /**
   * P0-4: Incremental handler for a single meal_logs realtime event.
   * Updates only the affected row in dailyMeals / mealProgress instead of
   * triggering a full loadData() that would wipe in-flight (progress<100)
   * local state. Exported on the store interface for testability.
   */
  handleMealLogRealtimeChange: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    old?: { id?: string } | null;
    new?: Record<string, unknown> | null;
  }) => void;

  // Reset store (for logout)
  reset: () => void;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      // Initial state
      weeklyMealPlan: null,
      isGeneratingPlan: false,
      planError: null,
      mealProgress: {},
      dailyMeals: [],
      isGeneratingMeal: false,
      mealError: null,
      currentMealSession: null,
      hydrationOwnerUserId: null,

      // Weekly meal plan actions
      setWeeklyMealPlan: (plan) => {
        set({ weeklyMealPlan: plan });
      },

      saveWeeklyMealPlan: async (plan) => {
        try {
          const planTitle =
            plan.planTitle || `Week ${plan.weekNumber} Meal Plan`;

          // Save to local storage via Zustand persist first
          set({ weeklyMealPlan: plan });

          // Validate plan data
          if (!plan.meals || plan.meals.length === 0) {
            console.warn("âš ï¸ No meals in plan to save to database");
            return;
          }
        } catch (error) {
          console.error("âŒ Failed to save meal plan:", error);
          // ARCH-003 FIX: Set error state instead of silently swallowing
          const errorMessage =
            error instanceof Error ? error.message : "Failed to save meal plan";
          set({ planError: errorMessage });

          // Don't throw error if local storage succeeded
          if (!get().weeklyMealPlan) {
            throw error;
          }
        }

        // ALSO save the complete weekly meal plan to the new weekly_meal_plans table
        try {
          // P1-6: Skip Supabase sync for guest users — local-only save above is
          // sufficient. Queueing a guest action would have RLS reject it on
          // every retry, polluting the offline queue indefinitely.
          const syncableUserId = getSyncableUserId();
          if (!syncableUserId) {
            // Guest or unauthenticated: local save already succeeded. No DB write.
            return;
          }

          // Clear any failed UUID attempts in the queue first
          await offlineService.clearFailedActionsForTable("weekly_meal_plans");

          // Get authenticated user ID (already validated non-guest above)
          const userId = syncableUserId;
          const planId = generateUUID();

          // Ensure user is authenticated before database operation
          if (!userId) {
            console.error("âŒ No authenticated user - cannot save to database");
            throw new Error("User must be authenticated to save meal plans");
          }

          // Validate UUIDs before database operation
          if (!isValidUUID(userId)) {
            console.error("âŒ Invalid user UUID format:", userId);
            throw new Error("Invalid user UUID format");
          }
          if (!isValidUUID(planId)) {
            console.error("âŒ Invalid plan UUID format:", planId);
            throw new Error("Invalid plan UUID format");
          }

          let activePlanRowId = plan.databaseId || null;
          if (!activePlanRowId) {
            try {
              const { data: activePlans, error: activePlansError } =
                await supabase
                  .from("weekly_meal_plans")
                  .select("id")
                  .eq("user_id", userId)
                  .eq("is_active", true)
                  .order("created_at", { ascending: false })
                  .limit(1);
              if (activePlansError) {
                console.error(
                  "[nutritionStore] Failed to look up active meal plan:",
                  activePlansError,
                );
              }
              activePlanRowId = activePlans?.[0]?.id || null;
            } catch (activePlanLookupError) {
              console.warn(
                "Failed to look up active weekly meal plan before queueing save; falling back to queued create:",
                activePlanLookupError,
              );
            }
          }

          const planRowId = activePlanRowId || planId;
          const hasConfirmedDatabaseId = Boolean(
            activePlanRowId || plan.databaseId,
          );
          const planDataWithDbId = hasConfirmedDatabaseId
            ? {
                ...plan,
                databaseId: activePlanRowId || plan.databaseId,
              }
            : plan;

          set({ weeklyMealPlan: planDataWithDbId });

          const weeklyMealPlanData = {
            id: planRowId,
            user_id: userId,
            plan_title:
              planDataWithDbId.planTitle || `Week ${plan.weekNumber} Plan`,
            plan_description:
              planDataWithDbId.planDescription ||
              `${plan.meals.length} meals planned`,
            week_number: plan.weekNumber || 1,
            total_meals: plan.meals.length,
            total_calories:
              planDataWithDbId.totalEstimatedCalories ||
              plan.meals.reduce(
                (sum: number, meal: DayMeal) => sum + (meal.totalCalories || 0),
                0,
              ),
            plan_data: planDataWithDbId, // Store complete plan as JSONB
            is_active: true,
          };

          await offlineService.queueAction({
            type: activePlanRowId ? "UPDATE" : "CREATE",
            table: "weekly_meal_plans",
            data: weeklyMealPlanData,
            // P1-6: Use the validated syncable userId, not getUserIdOrGuest()
            // which would fabricate "guest" and be rejected by RLS on every retry.
            userId,
            maxRetries: 3,
          });
        } catch (weeklyMealPlanError) {
          console.error(
            "âŒ Failed to save weekly meal plan to database:",
            weeklyMealPlanError,
          );
          // ARCH-003 FIX: Set error state instead of silently swallowing
          const errorMessage =
            weeklyMealPlanError instanceof Error
              ? weeklyMealPlanError.message
              : "Failed to save meal plan to database";
          set({ planError: errorMessage });
          // Don't throw - local save succeeded, just log the sync failure
        }
      },

      loadWeeklyMealPlan: async () => {
        try {
          try {
            const userId = getCurrentUserId();
            if (userId) {
              const { data: weeklyMealPlans, error } = await supabase
                .from("weekly_meal_plans")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(1);

              if (!error && weeklyMealPlans && weeklyMealPlans.length > 0) {
                const latestPlan = weeklyMealPlans[0];

                // Extract the complete plan data from JSONB
                const planData = latestPlan.plan_data;
                if (planData && planData.meals) {
                  const planWithDbId = {
                    ...planData,
                    databaseId: latestPlan.id,
                  };
                  // Update local storage with retrieved plan
                  set({ weeklyMealPlan: planWithDbId });
                  return planWithDbId;
                }
              } else if (!error) {
                // No rows in DB for this user — clear any stale local plan.
                // Previously this returned the existing local plan to avoid clobbering
                // an in-flight plan during a transient DB miss, but that leaked the
                // previous owner's plan across user switches (loadData() detects user
                // changes separately and handles preservation). The DB is the SSOT for
                // the active plan; an empty result means this user has no plan.
                set({ weeklyMealPlan: null });
                return null;
              }
            }
          } catch (dbError) {
            console.warn(
              "âš ï¸ Failed to load from database, trying individual meal logs:",
              dbError,
            );
          }

          // Fallback: Try to load individual meal logs
          const mealLogs = await crudOperations.readMealLogs();
          if (mealLogs && mealLogs.length > 0) {
            // Could reconstruct weekly plan from logs if needed in the future
          }

          return null;
        } catch (error) {
          console.error("âŒ Failed to load meal plan:", error);
          return null;
        }
      },

      setGeneratingPlan: (isGenerating) => {
        set({ isGeneratingPlan: isGenerating });
      },

      setPlanError: (error) => {
        set({ planError: error });
      },

      // Daily meal actions
      addDailyMeal: (meal) => {
        set((state) => ({
          dailyMeals: [meal, ...state.dailyMeals],
        }));
      },

      setDailyMeals: (meals) => {
        set({ dailyMeals: meals });
      },

      setGeneratingMeal: (isGenerating) => {
        set({ isGeneratingMeal: isGenerating });
      },

      setMealError: (error) => {
        set({ mealError: error });
      },

      // Meal progress actions
      updateMealProgress: (mealId, progress) => {
        set((state) => ({
          mealProgress: {
            ...state.mealProgress,
            [mealId]: {
              ...state.mealProgress[mealId],
              mealId,
              progress,
            },
          },
        }));
      },

      completeMeal: async (mealId, logId) => {
        const completedAt = new Date().toISOString();

        try {
          // DATABASE-FIRST PATTERN: Update database FIRST
          if (logId) {
            const existingLog = await crudOperations.readMealLog(logId);
            // P2-11: Set the explicit is_completed flag instead of appending
            // "[COMPLETED]" to notes (which could be spoofed by user input and
            // was never actually read by loadData). Preserve the existing notes.
            await crudOperations.updateMealLog(logId, {
              notes: existingLog?.notes || "",
              isCompleted: true,
              syncMetadata: {
                lastModifiedAt: completedAt,
                syncVersion: (existingLog?.syncMetadata?.syncVersion || 0) + 1,
                deviceId: Platform.OS ?? "unknown",
              },
            });
          }

          // THEN update Zustand cache
          set((state) => {
            const newProgress = {
              ...state.mealProgress,
              [mealId]: {
                ...state.mealProgress[mealId],
                mealId,
                progress: 100,
                completedAt,
                logId,
              },
            };

            return {
              mealProgress: newProgress,
            };
          });
        } catch (error) {
          console.error(`âŒ Failed to complete meal ${mealId}:`, error);

          // FALLBACK: Queue for offline sync if database update fails.
          // P1-6: Skip queueing for guest users — RLS would reject the write
          // on every retry and pollute the offline queue indefinitely. The
          // local optimistic UI update below still applies for guests.
          const syncableUserId = getSyncableUserId();
          if (syncableUserId) {
            await offlineService.queueAction({
              type: "UPDATE",
              table: "meal_logs",
              data: {
                id: logId,
                // P2-11: set the explicit is_completed column, not a notes string.
                is_completed: true,
              },
              userId: syncableUserId,
              maxRetries: 3,
            });
          }

          // Still update local cache for optimistic UI
          set((state) => ({
            mealProgress: {
              ...state.mealProgress,
              [mealId]: {
                ...state.mealProgress[mealId],
                mealId,
                progress: 100,
                completedAt,
                logId,
              },
            },
          }));
        }
      },

      getMealProgress: (mealId) => {
        return get().mealProgress[mealId] || null;
      },

      // Consumed nutrition is derived only from hydrated meal_logs entries.
      // weeklyMealPlan remains planning UI and must never contribute to consumed totals.
      getConsumedNutrition: () => {
        const state = get();

        if (
          consumedNutritionCache &&
          state.mealProgress === lastConsumedMealProgressRef &&
          state.dailyMeals === lastConsumedDailyMealsRef
        ) {
          return consumedNutritionCache;
        }

        const result = sumMealNutrition(getConsumedMealsFromState(state));

        consumedNutritionCache = result;
        lastConsumedMealProgressRef = state.mealProgress;
        lastConsumedDailyMealsRef = state.dailyMeals;

        return result;
      },

      getTodaysConsumedNutrition: () => {
        const state = get();
        const todayDate = getLocalDateString();

        if (
          todaysConsumedNutritionCache &&
          state.mealProgress === lastTodaysMealProgressRef2 &&
          state.dailyMeals === lastTodaysDailyMealsRef2 &&
          todayDate === lastTodaysDate2
        ) {
          return todaysConsumedNutritionCache;
        }

        const todaysLoggedMeals = getConsumedMealsFromState(state).filter(
          (meal) => getMealLocalDate(meal) === todayDate,
        );

        const result = sumMealNutrition(todaysLoggedMeals);

        todaysConsumedNutritionCache = result;
        lastTodaysMealProgressRef2 = state.mealProgress;
        lastTodaysDailyMealsRef2 = state.dailyMeals;
        lastTodaysDate2 = todayDate;

        return result;
      },

      getConsumedNutritionForDate: (date: string) => {
        const state = get();
        const mealsForDate = getConsumedMealsFromState(state).filter(
          (meal) => getMealLocalDate(meal) === date,
        );
        return sumMealNutrition(mealsForDate);
      },

      // Meal session actions
      startMealSession: async (meal) => {
        const logId = generateUUID();

        try {
          // Create a proper MealLog object for active session
          const mealLog: import("../types/localData").MealLog = {
            id: logId,
            mealType: toMealType(meal.type),
            foods: meal.items.map((item, index) =>
              createLoggedFood(item, meal.id, index),
            ),
            totalCalories: meal.totalCalories || 0,
            totalMacros: {
              protein: meal.totalMacros?.protein ?? 0,
              carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
              fat: meal.totalMacros?.fat ?? 0,
              fiber: meal.totalMacros?.fiber ?? 0,
              sugar: meal.totalMacros?.sugar ?? 0,
            },
            loggedAt: new Date().toISOString(),
            photos: [],
            syncStatus: SyncStatus.PENDING,
            syncMetadata: {
              lastSyncedAt: undefined,
              lastModifiedAt: new Date().toISOString(),
              syncVersion: 1,
              deviceId: Platform.OS ?? "unknown",
            },
            // Note: totalMacros will be computed elsewhere for active sessions
          };
          // Preserve extra UI fields separately if needed
          // Note: macros are saved on the mealLog.totalMacros above; these are UI-only vars if needed
          const totalMacros = {
            protein: meal.totalMacros?.protein ?? 0,
            carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
            fat: meal.totalMacros?.fat ?? 0,
            fiber: meal.totalMacros?.fiber ?? 0,
            sugar: meal.totalMacros?.sugar ?? 0,
          } as const;
          const notes = `Active session: ${meal.dayOfWeek} - ${meal.description || meal.name}`;
          const timestamp = new Date().toISOString();

          await crudOperations.createMealLog(mealLog);

          set({
            currentMealSession: {
              mealId: meal.id,
              logId,
              startedAt: new Date().toISOString(),
              ingredients: meal.items.map((item, index) => ({
                ingredientId: `${meal.id}_${index}`,
                completed: false,
                quantity:
                  typeof item.quantity === "number" ? item.quantity : 100,
              })),
            },
          });

          // Initialize progress
          get().updateMealProgress(meal.id, 0);

          return logId;
        } catch (error) {
          console.error("âŒ Failed to start meal session:", error);
          throw error;
        }
      },

      endMealSession: async (logId) => {
        try {
          const currentSession = get().currentMealSession;
          if (!currentSession) {
            throw new Error("No active meal session");
          }

          // P2-11: Mark the log completed via the explicit is_completed flag.
          // completeMeal() below also sets it, but we set it here first so the
          // row is marked complete even if completeMeal's progress update is
          // skipped for an in-flight session.
          await crudOperations.updateMealLog(logId, {
            isCompleted: true,
          });

          // Complete the meal
          await get().completeMeal(currentSession.mealId, logId);

          set({ currentMealSession: null });
        } catch (error) {
          console.error("âŒ Failed to end meal session:", error);
          throw error;
        }
      },

      updateIngredientProgress: (ingredientId, quantity) => {
        set((state) => {
          if (!state.currentMealSession) return state;

          const updatedIngredients = state.currentMealSession.ingredients.map(
            (ingredient) => {
              if (ingredient.ingredientId === ingredientId) {
                return {
                  ...ingredient,
                  quantity,
                  completed: quantity > 0,
                };
              }
              return ingredient;
            },
          );

          // Calculate overall progress
          const totalIngredients = updatedIngredients.length;
          const completedIngredients = updatedIngredients.filter(
            (ing) => ing.completed,
          ).length;
          const progressPercent = Math.round(
            (completedIngredients / totalIngredients) * 100,
          );

          // Update meal progress
          get().updateMealProgress(
            state.currentMealSession!.mealId,
            progressPercent,
          );

          return {
            ...state,
            currentMealSession: {
              ...state.currentMealSession,
              ingredients: updatedIngredients,
            },
          };
        });
      },

      // Data persistence
      removeLegacyScanShadows: () => {
        const cleanedState = pruneLegacyScanShadowState({
          weeklyMealPlan: get().weeklyMealPlan,
          mealProgress: get().mealProgress,
          currentMealSession: get().currentMealSession,
        });

        if (!cleanedState) {
          return;
        }

        set({
          weeklyMealPlan: cleanedState.weeklyMealPlan as WeeklyMealPlan | null,
          mealProgress: cleanedState.mealProgress as Record<
            string,
            MealProgress
          >,
          currentMealSession:
            (cleanedState.currentMealSession as NutritionState["currentMealSession"]) ??
            null,
        });
      },

      persistData: async () => {
        try {
          const state = get();

          if (state.weeklyMealPlan) {
            await get().saveWeeklyMealPlan(state.weeklyMealPlan);
          }

          // Save daily meals as individual logs — dedup within this call by meal ID
          const persistedInThisCall = new Set<string>();
          for (const meal of state.dailyMeals) {
            const mealId = meal.id || String(Date.now());
            if (persistedInThisCall.has(mealId)) continue;
            persistedInThisCall.add(mealId);
            const mealItems = meal.items || [];
            // P1-5: Preserve the original loggedAt/createdAt on re-persist.
            // Overwriting with now() would shift a meal logged yesterday into
            // today's totals if persist runs after midnight. Only set loggedAt
            // on first creation (when the meal has no loggedAt yet).
            const originalLoggedAt =
              typeof meal.loggedAt === "string"
                ? meal.loggedAt
                : typeof meal.createdAt === "string"
                  ? meal.createdAt
                  : new Date().toISOString();
            const mealLog: import("../types/localData").MealLog = {
              id: `daily_meal_${mealId}`,
              mealType: toMealType(meal.type),
              foods: mealItems.map((item, index) =>
                createLoggedFood(item, mealId, index),
              ),
              totalCalories: meal.totalCalories || 0,
              totalMacros: {
                protein: meal.totalMacros?.protein ?? 0,
                carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                fat: meal.totalMacros?.fat ?? 0,
                fiber: meal.totalMacros?.fiber ?? 0,
                sugar: meal.totalMacros?.sugar ?? 0,
              },
              loggedAt: originalLoggedAt,
              photos: [],
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastSyncedAt: undefined,
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: Platform.OS ?? "unknown",
              },
            };

            await crudOperations.createMealLog(mealLog);
          }
        } catch (error) {
          console.error("âŒ Failed to persist nutrition data:", error);
        }
      },

      loadData: async () => {
        try {
          get().removeLegacyScanShadows();

          const plan = await get().loadWeeklyMealPlan();
          if (plan) {
            set({ weeklyMealPlan: plan });
          }

          // Hydrate mealProgress + dailyMeals from Supabase on login
          try {
            const { data: authData, error: authError } =
              await supabase.auth.getUser();
            if (authError) {
              // AuthSessionMissingError is expected on cold start before the session is restored.
              // loadData() will be called again after login via the auth listener.
              console.warn(
                "[nutritionStore] No auth session during hydration (expected on cold start):",
                authError.message,
              );
            } else if (authData?.user?.id) {
              const authenticatedUserId = authData.user.id;
              const hadDifferentOwner =
                get().hydrationOwnerUserId !== authenticatedUserId;

              if (hadDifferentOwner) {
                clearConsumedNutritionCaches();
                set({
                  mealProgress: {},
                  dailyMeals: [],
                  currentMealSession: null,
                  hydrationOwnerUserId: authenticatedUserId,
                  weeklyMealPlan: plan ?? null,
                });
              }

              const todayBounds = getLocalDayBounds();
              const planMealIds =
                plan?.meals
                  ?.map((meal: any) => meal.id)
                  .filter(
                    (mealId: string | undefined): mealId is string => !!mealId,
                  ) || [];
              const runPlannedLogsQuery = async (selectColumns: string) =>
                planMealIds.length
                  ? supabase
                      .from("meal_logs")
                      .select(selectColumns)
                      .eq("user_id", authenticatedUserId)
                      .eq("from_plan", true)
                      .in("plan_meal_id", planMealIds)
                      .order("logged_at", { ascending: false })
                  : { data: [] as Array<Record<string, unknown>>, error: null };

              const runTodaysConsumedLogsQuery = async (selectColumns: string) =>
                supabase
                  .from("meal_logs")
                  .select(selectColumns)
                  .eq("user_id", authenticatedUserId)
                  .gte("logged_at", todayBounds.startIso)
                  .lte("logged_at", todayBounds.endIso)
                  .order("logged_at", { ascending: false });

              const [plannedLogsResult, todaysConsumedLogsResult] =
                await Promise.all([
                  runPlannedLogsQuery(MEAL_LOG_SELECT),
                  runTodaysConsumedLogsQuery(MEAL_LOG_SELECT),
                ]);

              if (plannedLogsResult?.error) {
                console.error(
                  "Failed to fetch planned meal logs:",
                  plannedLogsResult.error,
                );
                return;
              }
              if (todaysConsumedLogsResult?.error) {
                console.error(
                  "Failed to fetch today's consumed meal logs:",
                  todaysConsumedLogsResult.error,
                );
                return;
              }

              const plannedLogs = (plannedLogsResult?.data || []) as unknown as MealLogRow[];
              const todaysConsumedLogs = (todaysConsumedLogsResult?.data || []) as unknown as MealLogRow[];

              if (plannedLogs.length > 0) {
                // Rebuild mealProgress — skip IDs already tracked (from this session).
                // P2-11: Only treat a planned log as completed (progress=100) when
                // its is_completed flag is true. A planned log row with
                // is_completed=false represents an in-flight session that should
                // NOT be force-marked complete just because the row exists.
                const existingProgress = get().mealProgress;
                const remoteProgressKeys = new Set<string>();
                const remoteLogIds = new Set<string>();
                const restoredProgress: Record<string, MealProgress> = {};
                (plannedLogs ?? []).forEach((log) => {
                  const progressKey = log.plan_meal_id || log.id;

                  if (progressKey) {
                    remoteProgressKeys.add(progressKey);
                  }
                  if (log.id) {
                    remoteLogIds.add(log.id);
                  }

                  // Only restore progress=100 for explicitly-completed logs.
                  if (
                    progressKey &&
                    !restoredProgress[progressKey] &&
                    log.is_completed === true
                  ) {
                    restoredProgress[progressKey] = {
                      mealId: progressKey,
                      progress: 100,
                      completedAt: log.logged_at || undefined,
                      logId: log.id,
                    };
                  }
                });
                if (Object.keys(restoredProgress).length > 0) {
                  const preservedLocalProgress = Object.fromEntries(
                    Object.entries(existingProgress).filter(
                      ([key, progress]) => {
                        if (remoteProgressKeys.has(key)) return false;
                        if (
                          progress?.logId &&
                          remoteLogIds.has(progress.logId)
                        ) {
                          return false;
                        }
                        return true;
                      },
                    ),
                  );

                  set((state) => ({
                    mealProgress: {
                      ...preservedLocalProgress,
                      ...restoredProgress,
                    },
                  }));
                }
              }

              const authoritativeRemoteProgressKeys = new Set<string>();
              const authoritativeRemoteLogIds = new Set<string>();
              const authoritativeRestoredProgress: Record<string, any> = {};
              (plannedLogs ?? []).forEach((log) => {
                const progressKey = log.plan_meal_id || log.id;

                if (progressKey) {
                  authoritativeRemoteProgressKeys.add(progressKey);
                }
                if (log.id) {
                  authoritativeRemoteLogIds.add(log.id);
                }

                // P2-11: Only restore progress=100 for explicitly-completed logs.
                // A planned log row with is_completed=false is an in-flight
                // session, not a completed meal.
                if (
                  progressKey &&
                  !authoritativeRestoredProgress[progressKey] &&
                  log.is_completed === true
                ) {
                  authoritativeRestoredProgress[progressKey] = {
                    mealId: progressKey,
                    progress: 100,
                    completedAt: log.logged_at || undefined,
                    logId: log.id,
                  };
                }
              });

              const preservedInFlightProgress = Object.fromEntries(
                Object.entries(get().mealProgress).filter(([key, progress]) => {
                  if (authoritativeRemoteProgressKeys.has(key)) return false;
                  if (
                    progress?.logId &&
                    authoritativeRemoteLogIds.has(progress.logId)
                  ) {
                    return false;
                  }

                  return (progress?.progress ?? 0) < 100;
                }),
              );

              set({
                mealProgress: {
                  ...preservedInFlightProgress,
                  ...authoritativeRestoredProgress,
                },
              });

              const hydratedMeals: import("../types/ai").Meal[] = (
                todaysConsumedLogs ?? []
              ).map((log) => {
                const foodItems = normalizeMealLogFoodItems(log.food_items);
                return {
                  id: log.id,
                  type: toMealType(log.meal_type || undefined),
                  name: log.meal_name || "Meal",
                  totalCalories: log.total_calories || 0,
                  totalMacros: {
                    protein: log.total_protein || 0,
                    carbohydrates: log.total_carbohydrates || 0,
                    fat: log.total_fat || 0,
                    fiber: deriveMealLogFiber(foodItems),
                    sugar: deriveMealLogSugar(foodItems),
                  },
                  items: foodItems as unknown as MealItem[],
                  loggedAt: log.logged_at || undefined,
                  // Required Meal fields with safe defaults for Supabase-hydrated entries
                  tags: [] as string[],
                  isPersonalized: false,
                  aiGenerated: false,
                  createdAt: log.logged_at || new Date().toISOString(),
                  updatedAt: log.logged_at || new Date().toISOString(),
                  sourceMetadata: log.logging_mode
                    ? {
                        mode: log.logging_mode || undefined,
                        truthLevel: log.truth_level || "curated",
                        confidence: log.confidence || null,
                        countryContext: log.country_context || null,
                        requiresReview: log.requires_review || false,
                        source: (log.source_metadata?.source as string) || null,
                        productIdentity:
                          (log.source_metadata?.productIdentity as string) || null,
                        conflict: log.source_metadata?.conflict || null,
                      }
                    : undefined,
                };
              });

              const preservedLocalMeals = (get().dailyMeals || []).filter(
                (meal: any) => !meal.loggedAt,
              );

              set({
                hydrationOwnerUserId: authenticatedUserId,
                dailyMeals: [...hydratedMeals, ...preservedLocalMeals],
              });
            }
          } catch (supabaseError) {
            console.error(
              "âŒ Failed to hydrate meal data from Supabase:",
              supabaseError,
            );
          }
        } catch (error) {
          console.error("âŒ Failed to load nutrition data:", error);
        }
      },

      clearData: () => {
        clearConsumedNutritionCaches();
        set({
          weeklyMealPlan: null,
          mealProgress: {},
          dailyMeals: [],
          currentMealSession: null,
          hydrationOwnerUserId: null,
          planError: null,
          mealError: null,
        });
      },

      setupRealtimeSubscription: (userId: string) => {
        if (mealLogsChannel) {
          mealLogsChannel.unsubscribe();
        }

        mealLogsChannel = supabase
          .channel("meal_logs_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "meal_logs",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              // P0-4: Apply the change incrementally instead of full loadData().
              // This preserves in-flight local progress (progress<100) and avoids
              // clobbering optimistic UI state with a full remote re-fetch.
              const eventType = (payload.eventType || "UPDATE").toUpperCase() as
                | "INSERT"
                | "UPDATE"
                | "DELETE";
              get().handleMealLogRealtimeChange({
                eventType,
                old: (payload.old as { id?: string } | null) ?? null,
                new: (payload.new as Record<string, unknown> | null) ?? null,
              });
            },
          )
          .subscribe();
      },

      cleanupRealtimeSubscription: () => {
        if (mealLogsChannel) {
          mealLogsChannel.unsubscribe();
          mealLogsChannel = null;
        }
      },

      handleMealLogRealtimeChange: ({
        eventType,
        old,
        new: newRow,
      }) => {
        try {
          const state = get();

          if (eventType === "DELETE") {
            const deletedId = old?.id;
            if (!deletedId) return;
            // Remove from dailyMeals
            const filteredMeals = state.dailyMeals.filter(
              (m) => m.id !== deletedId,
            );
            // Remove from mealProgress ONLY if that entry is complete (a delete
            // of a completed log is authoritative). In-flight progress (<100)
            // for a different mealId is preserved.
            const newProgress = { ...state.mealProgress };
            const progressEntry = newProgress[deletedId];
            if (progressEntry && (progressEntry.progress ?? 0) >= 100) {
              delete newProgress[deletedId];
            } else if (progressEntry && progressEntry.logId === deletedId) {
              // The log backing an in-flight session was deleted remotely.
              // Drop the stale progress entry so the UI doesn't show a ghost.
              delete newProgress[deletedId];
            }
            clearConsumedNutritionCaches();
            set({ dailyMeals: filteredMeals, mealProgress: newProgress });
            return;
          }

          // INSERT or UPDATE: newRow holds the meal_logs row.
          if (!newRow || !newRow.id) return;
          const log = newRow as unknown as MealLogRow;
          const logId = String(log.id);

          const foodItems = normalizeMealLogFoodItems(log.food_items);
          const hydratedMeal: import("../types/ai").Meal = {
            id: logId,
            type: toMealType(log.meal_type || undefined),
            name: log.meal_name || "Meal",
            totalCalories: log.total_calories || 0,
            totalMacros: {
              protein: log.total_protein || 0,
              carbohydrates: log.total_carbohydrates || 0,
              fat: log.total_fat || 0,
              fiber: deriveMealLogFiber(foodItems),
              sugar: deriveMealLogSugar(foodItems),
            },
            items: foodItems as unknown as MealItem[],
            loggedAt: log.logged_at || undefined,
            tags: [] as string[],
            isPersonalized: false,
            aiGenerated: false,
            createdAt: log.logged_at || new Date().toISOString(),
            updatedAt: log.logged_at || new Date().toISOString(),
            sourceMetadata: log.logging_mode
              ? {
                  mode: log.logging_mode || undefined,
                  truthLevel: log.truth_level || "curated",
                  confidence: log.confidence || null,
                  countryContext: log.country_context || null,
                  requiresReview: log.requires_review || false,
                  source: (log.source_metadata?.source as string) || null,
                  productIdentity:
                    (log.source_metadata?.productIdentity as string) || null,
                  conflict: log.source_metadata?.conflict || null,
                }
              : undefined,
          };

          // Replace existing entry with same id, otherwise prepend.
          const existingIdx = state.dailyMeals.findIndex(
            (m) => m.id === logId,
          );
          const nextDailyMeals =
            existingIdx >= 0
              ? state.dailyMeals.map((m, i) => (i === existingIdx ? hydratedMeal : m))
              : [hydratedMeal, ...state.dailyMeals];

          // For from_plan logs, reflect completion in mealProgress — but ONLY
          // if there is no in-flight (<100) entry for the same plan_meal_id,
          // which would indicate an active session we must not clobber.
          const planMealId = log.plan_meal_id || undefined;
          if (planMealId) {
            const existing = state.mealProgress[planMealId];
            const isInFlight =
              existing && (existing.progress ?? 0) < 100;
            if (!isInFlight) {
              set({
                dailyMeals: nextDailyMeals,
                mealProgress: {
                  ...state.mealProgress,
                  [planMealId]: {
                    mealId: planMealId,
                    progress: 100,
                    completedAt: log.logged_at || undefined,
                    logId,
                  },
                },
              });
              clearConsumedNutritionCaches();
              return;
            }
          }

          clearConsumedNutritionCaches();
          set({ dailyMeals: nextDailyMeals });
        } catch (error) {
          // Fall back to a full reload only if the incremental path fails —
          // better to recover than to leave the UI stale.
          console.error(
            "[nutritionStore] Incremental realtime handler failed, falling back to loadData():",
            error,
          );
          get().loadData().catch((e) =>
            console.error("[nutritionStore] loadData fallback also failed:", e),
          );
        }
      },

      reset: () => {
        get().cleanupRealtimeSubscription();
        clearConsumedNutritionCaches();
        set({
          weeklyMealPlan: null,
          isGeneratingPlan: false,
          planError: null,
          mealProgress: {},
          dailyMeals: [],
          isGeneratingMeal: false,
          mealError: null,
          currentMealSession: null,
          hydrationOwnerUserId: null,
        });
      },
    }),
    {
      name: "nutrition-storage",
      version: 2,
      storage: createDebouncedStorage(),
      migrate: (persistedState) => {
        const sanitized = sanitizeLegacyScanShadowPersistedState(
          persistedState as {
            weeklyMealPlan?: WeeklyMealPlan | null;
            mealProgress?: Record<string, MealProgress>;
            dailyMeals?: Meal[];
            hydrationOwnerUserId?: string | null;
          } | null,
        );

        return {
          ...sanitized,
          hydrationOwnerUserId:
            (persistedState as { hydrationOwnerUserId?: string | null } | null)
              ?.hydrationOwnerUserId ?? null,
        };
      },
      partialize: (state) => ({
        weeklyMealPlan: state.weeklyMealPlan,
        mealProgress: state.mealProgress,
        dailyMeals: state.dailyMeals,
        hydrationOwnerUserId: state.hydrationOwnerUserId,
      }),
      onRehydrateStorage: () => (state) => {
        // Defer so the set() inside removeLegacyScanShadows doesn't fire during
        // the render cycle that triggered rehydration (React: "Cannot update a
        // component while rendering a different component").
        if (state?.removeLegacyScanShadows) {
          setTimeout(() => state.removeLegacyScanShadows(), 0);
        }
      },
    },
  ),
);

export default useNutritionStore;
