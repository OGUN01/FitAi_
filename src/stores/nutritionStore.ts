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
import { getCurrentUserId, getUserIdOrGuest } from "../services/authUtils";
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

const MEAL_LOG_SELECT =
  "id, meal_plan_id, meal_type, meal_name, from_plan, plan_meal_id, portion_multiplier, total_calories, total_protein, total_carbohydrates, total_fat, food_items, logged_at, logging_mode, truth_level, confidence, country_context, requires_review, source_metadata";

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

interface MealProgress {
  mealId: string;
  progress: number; // 0-100
  completedAt?: string;
  logId?: string;
}

// Consumed nutrition computed from completed meals - SINGLE SOURCE OF TRUTH
interface ConsumedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

const EMPTY_CONSUMED_NUTRITION: ConsumedNutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
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

interface NutritionState {
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
          // Clear any failed UUID attempts in the queue first
          await offlineService.clearFailedActionsForTable("weekly_meal_plans");

          // Get authenticated user ID via StoreCoordinator (removes cross-store dependency)
          const userId = getCurrentUserId();
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
            userId: getUserIdOrGuest(),
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
            const updatedNotes = (existingLog?.notes || "") + " [COMPLETED]";

            await crudOperations.updateMealLog(logId, {
              notes: updatedNotes,
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

          // FALLBACK: Queue for offline sync if database update fails
          await offlineService.queueAction({
            type: "UPDATE",
            table: "meal_logs",
            data: {
              id: logId,
              notes: "[COMPLETED]",
            },
            userId: getUserIdOrGuest(),
            maxRetries: 3,
          });

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
              lastSyncedAt: null,
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

          // Update log as completed
          await crudOperations.updateMealLog(logId, {
            notes:
              ((await crudOperations.readMealLog(logId))?.notes || "") +
              " [COMPLETED]",
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
              loggedAt: new Date().toISOString(),
              photos: [],
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastSyncedAt: null,
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
              }
              if (todaysConsumedLogsResult?.error) {
                console.error(
                  "Failed to fetch today's consumed meal logs:",
                  todaysConsumedLogsResult.error,
                );
              }

              const plannedLogs = plannedLogsResult?.data || [];
              const todaysConsumedLogs = todaysConsumedLogsResult?.data || [];

              if (plannedLogs.length > 0) {
                // Rebuild mealProgress â€” skip IDs already tracked (from this session)
                const existingProgress = get().mealProgress;
                const remoteProgressKeys = new Set<string>();
                const remoteLogIds = new Set<string>();
                const restoredProgress: Record<string, any> = {};
                (plannedLogs ?? []).forEach((log) => {
                  const progressKey = log.plan_meal_id || log.id;

                  if (progressKey) {
                    remoteProgressKeys.add(progressKey);
                  }
                  if (log.id) {
                    remoteLogIds.add(log.id);
                  }

                  if (progressKey && !restoredProgress[progressKey]) {
                    restoredProgress[progressKey] = {
                      mealId: progressKey,
                      planMealId: log.plan_meal_id || undefined,
                      progress: 100,
                      completedAt: log.logged_at,
                      logId: log.id,
                    };
                  }
                });
                if (Object.keys(restoredProgress).length > 0) {
                  const preservedLocalProgress = Object.fromEntries(
                    Object.entries(existingProgress).filter(
                      ([key, progress]) => {
                        const localProgress = progress as any;
                        if (remoteProgressKeys.has(key)) return false;
                        if (
                          localProgress?.logId &&
                          remoteLogIds.has(localProgress.logId)
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

                if (
                  progressKey &&
                  !authoritativeRestoredProgress[progressKey]
                ) {
                  authoritativeRestoredProgress[progressKey] = {
                    mealId: progressKey,
                    planMealId: log.plan_meal_id || undefined,
                    progress: 100,
                    completedAt: log.logged_at,
                    logId: log.id,
                  };
                }
              });

              const preservedInFlightProgress = Object.fromEntries(
                Object.entries(get().mealProgress).filter(([key, progress]) => {
                  const localProgress = progress as any;
                  if (authoritativeRemoteProgressKeys.has(key)) return false;
                  if (
                    localProgress?.logId &&
                    authoritativeRemoteLogIds.has(localProgress.logId)
                  ) {
                    return false;
                  }

                  return (localProgress?.progress ?? 0) < 100;
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
                  type: log.meal_type || "snack",
                  name: log.meal_name || "Meal",
                  totalCalories: log.total_calories || 0,
                  totalMacros: {
                    protein: log.total_protein || 0,
                    carbohydrates: log.total_carbohydrates || 0,
                    fat: log.total_fat || 0,
                    fiber: deriveMealLogFiber(foodItems),
                    sugar: deriveMealLogSugar(foodItems),
                  },
                  items: foodItems as any[],
                  loggedAt: log.logged_at,
                  // Required Meal fields with safe defaults for Supabase-hydrated entries
                  tags: [] as string[],
                  isPersonalized: false,
                  aiGenerated: false,
                  createdAt: log.logged_at || new Date().toISOString(),
                  updatedAt: log.logged_at || new Date().toISOString(),
                  sourceMetadata: log.logging_mode
                    ? {
                        mode: log.logging_mode,
                        truthLevel: log.truth_level || "curated",
                        confidence: log.confidence || null,
                        countryContext: log.country_context || null,
                        requiresReview: log.requires_review || false,
                        source: log.source_metadata?.source || null,
                        productIdentity:
                          log.source_metadata?.productIdentity || null,
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
              get().loadData();
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
        state?.removeLegacyScanShadows?.();
      },
    },
  ),
);

export default useNutritionStore;

export const selectMealProgress = (state: NutritionState) => state.mealProgress;
export const selectWeeklyMealPlan = (state: NutritionState) => state.weeklyMealPlan;
export const selectConsumedNutrition = (state: NutritionState) => state.dailyMeals;
