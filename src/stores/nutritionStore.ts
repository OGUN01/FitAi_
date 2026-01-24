import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WeeklyMealPlan, DayMeal, MealItem } from "../ai";
import { SyncStatus, LoggedFood } from "../types/localData";
import { Meal } from "../types/ai";
import { crudOperations } from "../services/crudOperations";
import { dataBridge } from "../services/DataBridge";
import { offlineService } from "../services/offline";
import { supabase } from "../services/supabase";
import { generateUUID, isValidUUID } from "../utils/uuid";
import {
  getCurrentUserId,
  getUserIdOrGuest,
} from "../services/StoreCoordinator";

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
}

// PERF-005 FIX: Cache for consumed nutrition to avoid O(n²) recalculation
let consumedNutritionCache: ConsumedNutrition | null = null;
let consumedNutritionCacheKey: string = "";
let todaysConsumedNutritionCache: ConsumedNutrition | null = null;
let todaysConsumedNutritionCacheKey: string = "";

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

      // Weekly meal plan actions
      setWeeklyMealPlan: (plan) => {
        set({ weeklyMealPlan: plan });
      },

      saveWeeklyMealPlan: async (plan) => {
        try {
          const planTitle =
            plan.planTitle || `Week ${plan.weekNumber} Meal Plan`;
          console.log("🍽️ Saving weekly meal plan:", planTitle);

          // Save to local storage via Zustand persist first
          set({ weeklyMealPlan: plan });
          console.log("✅ Meal plan saved to local storage");

          // Validate plan data
          if (!plan.meals || plan.meals.length === 0) {
            console.warn("⚠️ No meals in plan to save to database");
            return;
          }

          console.log(`📋 Saving ${plan.meals.length} meals to database`);
          console.log(
            `🔍 Meals breakdown by day:`,
            plan.meals.reduce(
              (acc, meal) => {
                acc[meal.dayOfWeek] = (acc[meal.dayOfWeek] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
          );

          // PERF-008 FIX: Save individual meals to database in parallel for tracking
          const timestamp = Date.now();
          const mealLogPromises = plan.meals
            .filter((meal) => meal.id && meal.name) // Validate meal data upfront
            .map(async (meal, mealIndex) => {
              try {
                // Create a proper MealLog object matching the expected schema
                const mealLog: import("../types/localData").MealLog = {
                  id: `meal_${meal.id}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
                  mealType: toMealType(meal.type),
                  foods: (meal.items || []).map(
                    (item: MealItem, index: number) =>
                      createLoggedFood(item, meal.id, index),
                  ),
                  totalCalories: meal.totalCalories || 0,
                  totalMacros: {
                    protein: meal.totalMacros?.protein ?? 0,
                    carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                    fat: meal.totalMacros?.fat ?? 0,
                    fiber: meal.totalMacros?.fiber ?? 0,
                  },
                  loggedAt: new Date().toISOString(),
                  photos: [],
                  syncStatus: SyncStatus.PENDING,
                  syncMetadata: {
                    lastSyncedAt: undefined,
                    lastModifiedAt: new Date().toISOString(),
                    syncVersion: 1,
                    deviceId: "dev-device",
                  },
                };

                await crudOperations.createMealLog(mealLog);
                return { success: true, meal: meal.name };
              } catch (mealError) {
                console.error(
                  `❌ Failed to save meal ${meal.name}:`,
                  mealError,
                );
                return { success: false, meal: meal.name, error: mealError };
              }
            });

          // PERF-008 FIX: Execute all saves in parallel instead of sequential
          const results = await Promise.all(mealLogPromises);
          const savedCount = results.filter((r) => r.success).length;
          const errorCount = results.filter((r) => !r.success).length;
          const invalidCount = plan.meals.length - results.length;

          if (invalidCount > 0) {
            console.error(`❌ ${invalidCount} invalid meals skipped`);
          }

          console.log(
            `✅ Weekly meal plan saved: ${savedCount} successful, ${errorCount} errors`,
          );

          if (errorCount > 0 && savedCount === 0) {
            throw new Error(`Failed to save any meals (${errorCount} errors)`);
          }
        } catch (error) {
          console.error("❌ Failed to save meal plan:", error);
          // ARCH-003 FIX: Set error state instead of silently swallowing
          const errorMessage =
            error instanceof Error ? error.message : "Failed to save meal plan";
          set({ planError: errorMessage });

          // Don't throw error if local storage succeeded
          if (!get().weeklyMealPlan) {
            throw error;
          }
          console.log("⚠️ Meal plan saved locally but database save failed");
        }

        // ALSO save the complete weekly meal plan to the new weekly_meal_plans table
        try {
          // Clear any failed UUID attempts in the queue first
          await offlineService.clearFailedActionsForTable("weekly_meal_plans");

          console.log("🍽️ Saving complete weekly meal plan to database...");

          // Get authenticated user ID via StoreCoordinator (removes cross-store dependency)
          const userId = getCurrentUserId();
          const planId = generateUUID();

          console.log("🍽️ NutritionStore: User ID from coordinator:", userId);
          console.log("🍽️ NutritionStore: Plan ID generated:", planId);

          // Ensure user is authenticated before database operation
          if (!userId) {
            console.error("❌ No authenticated user - cannot save to database");
            throw new Error("User must be authenticated to save meal plans");
          }

          // Validate UUIDs before database operation
          if (!isValidUUID(userId)) {
            console.error("❌ Invalid user UUID format:", userId);
            throw new Error("Invalid user UUID format");
          }
          if (!isValidUUID(planId)) {
            console.error("❌ Invalid plan UUID format:", planId);
            throw new Error("Invalid plan UUID format");
          }

          console.log("✅ UUID validation passed:", { userId, planId });

          const weeklyMealPlanData = {
            id: planId,
            user_id: userId,
            plan_title: plan.planTitle || `Week ${plan.weekNumber} Plan`,
            plan_description:
              plan.planDescription || `${plan.meals.length} meals planned`,
            week_number: plan.weekNumber || 1,
            total_meals: plan.meals.length,
            total_calories:
              plan.totalEstimatedCalories ||
              plan.meals.reduce(
                (sum: number, meal: DayMeal) => sum + (meal.totalCalories || 0),
                0,
              ),
            plan_data: plan, // Store complete meal plan as JSONB
            is_active: true,
          };

          await offlineService.queueAction({
            type: "CREATE",
            table: "weekly_meal_plans",
            data: weeklyMealPlanData,
            userId: getUserIdOrGuest(),
            maxRetries: 3,
          });
          console.log("✅ Weekly meal plan queued for database sync");
        } catch (weeklyMealPlanError) {
          console.error(
            "❌ Failed to save weekly meal plan to database:",
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
          // First check local storage
          const currentPlan = get().weeklyMealPlan;
          if (currentPlan) {
            console.log("📋 Found meal plan in store:", {
              title: currentPlan.planTitle || `Week ${currentPlan.weekNumber}`,
              meals: currentPlan.meals.length,
              mealsByDay: currentPlan.meals.reduce(
                (acc, meal) => {
                  acc[meal.dayOfWeek] = (acc[meal.dayOfWeek] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            });
            return currentPlan;
          }

          // Try to load complete weekly meal plan from database
          try {
            const userId = getCurrentUserId();
            if (userId) {
              console.log("🔄 Loading weekly meal plan from database...");
              const { data: weeklyMealPlans, error } = await supabase
                .from("weekly_meal_plans")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(1);

              if (!error && weeklyMealPlans && weeklyMealPlans.length > 0) {
                const latestPlan = weeklyMealPlans[0];
                console.log(
                  `✅ Found weekly meal plan in database: ${latestPlan.plan_title}`,
                );

                // Extract the complete plan data from JSONB
                const planData = latestPlan.plan_data;
                if (planData && planData.meals) {
                  // Update local storage with retrieved plan
                  set({ weeklyMealPlan: planData });
                  console.log(
                    "📋 Restored weekly meal plan from database to local storage",
                  );
                  return planData;
                }
              } else {
                console.log("📋 No weekly meal plan found in database");
              }
            }
          } catch (dbError) {
            console.warn(
              "⚠️ Failed to load from database, trying individual meal logs:",
              dbError,
            );
          }

          // Fallback: Try to load individual meal logs
          const mealLogs = await crudOperations.readMealLogs();
          if (mealLogs.length > 0) {
            console.log("📋 Found existing meal logs in database:", {
              totalLogs: mealLogs.length,
              logsByType: mealLogs.reduce(
                (acc, log) => {
                  acc[log.mealType] = (acc[log.mealType] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            });
            // Could reconstruct weekly plan from logs if needed in the future
          } else {
            console.log("📭 No meal logs found in database");
          }

          return null;
        } catch (error) {
          console.error("❌ Failed to load meal plan:", error);
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
        console.log("🍽️ NutritionStore: completeMeal called:", {
          mealId,
          logId,
        });

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
                deviceId: "dev-device",
              },
            });
            console.log(`✅ Meal ${mealId} marked complete in database`);
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

            console.log(
              "🍽️ NutritionStore: Cache updated:",
              newProgress[mealId],
            );

            return {
              mealProgress: newProgress,
            };
          });
        } catch (error) {
          console.error(`❌ Failed to complete meal ${mealId}:`, error);

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
          console.log(`📥 Meal ${mealId} queued for offline sync`);
        }
      },

      getMealProgress: (mealId) => {
        return get().mealProgress[mealId] || null;
      },

      // PERF-005 FIX: COMPUTED SELECTORS with caching - SINGLE SOURCE OF TRUTH for consumed nutrition
      // This calculates consumed nutrition from mealProgress (local state)
      // avoiding dual-source issues between Zustand and Supabase
      getConsumedNutrition: () => {
        const state = get();

        // Create cache key from mealProgress state
        const cacheKey = JSON.stringify(state.mealProgress);

        // Return cached value if state hasn't changed
        if (consumedNutritionCache && consumedNutritionCacheKey === cacheKey) {
          return consumedNutritionCache;
        }

        // Get all meal IDs that are 100% completed
        const completedMealIds = Object.entries(state.mealProgress)
          .filter(([_, progress]) => progress.progress === 100)
          .map(([id]) => id);

        // PERF-005 FIX: Use Set for O(1) lookup instead of O(n) includes
        const completedMealIdSet = new Set(completedMealIds);

        // Find the actual meal data from weekly plan
        const completedMeals =
          state.weeklyMealPlan?.meals.filter((meal) =>
            completedMealIdSet.has(meal.id),
          ) || [];

        // Sum up all nutrition from completed meals
        const result = completedMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (meal.totalCalories || 0),
            protein: acc.protein + (meal.totalMacros?.protein || 0),
            carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
            fat: acc.fat + (meal.totalMacros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        // Cache the result
        consumedNutritionCache = result;
        consumedNutritionCacheKey = cacheKey;

        return result;
      },

      // PERF-005 FIX: Get consumed nutrition for TODAY only with caching
      getTodaysConsumedNutrition: () => {
        const state = get();
        const today = new Date();
        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const todayName = dayNames[today.getDay()];

        // Create cache key from mealProgress state + today's date
        const cacheKey = JSON.stringify(state.mealProgress) + "_" + todayName;

        // Return cached value if state hasn't changed
        if (
          todaysConsumedNutritionCache &&
          todaysConsumedNutritionCacheKey === cacheKey
        ) {
          return todaysConsumedNutritionCache;
        }

        // Get all meal IDs that are 100% completed
        const completedMealIds = Object.entries(state.mealProgress)
          .filter(([_, progress]) => progress.progress === 100)
          .map(([id]) => id);

        // PERF-005 FIX: Use Set for O(1) lookup instead of O(n) includes
        const completedMealIdSet = new Set(completedMealIds);

        // Filter to only today's completed meals
        const todaysCompletedMeals =
          state.weeklyMealPlan?.meals.filter(
            (meal) =>
              completedMealIdSet.has(meal.id) && meal.dayOfWeek === todayName,
          ) || [];

        const result = todaysCompletedMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (meal.totalCalories || 0),
            protein: acc.protein + (meal.totalMacros?.protein || 0),
            carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
            fat: acc.fat + (meal.totalMacros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        // Cache the result
        todaysConsumedNutritionCache = result;
        todaysConsumedNutritionCacheKey = cacheKey;

        return result;
      },

      // Meal session actions
      startMealSession: async (meal) => {
        const logId = `log_${meal.id}_${Date.now()}`;

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
            },
            loggedAt: new Date().toISOString(),
            photos: [],
            syncStatus: SyncStatus.PENDING,
            syncMetadata: {
              lastSyncedAt: undefined,
              lastModifiedAt: new Date().toISOString(),
              syncVersion: 1,
              deviceId: "dev-device",
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

          console.log(`🍽️ Started meal session: ${logId}`);
          return logId;
        } catch (error) {
          console.error("❌ Failed to start meal session:", error);
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

          console.log(`✅ Completed meal session: ${logId}`);
        } catch (error) {
          console.error("❌ Failed to end meal session:", error);
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
      persistData: async () => {
        try {
          const state = get();

          if (state.weeklyMealPlan) {
            await get().saveWeeklyMealPlan(state.weeklyMealPlan);
          }

          // Save daily meals as individual logs
          for (const meal of state.dailyMeals) {
            const mealId = meal.id || String(Date.now());
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
              },
              loggedAt: new Date().toISOString(),
              photos: [],
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastSyncedAt: undefined,
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: "dev-device",
              },
            };

            await crudOperations.createMealLog(mealLog);
          }

          console.log("💾 Nutrition data persisted");
        } catch (error) {
          console.error("❌ Failed to persist nutrition data:", error);
        }
      },

      loadData: async () => {
        try {
          console.log("📂 NutritionStore: Loading data...");

          // Preserve existing meal progress before loading
          const currentMealProgress = get().mealProgress;
          console.log(
            "📂 NutritionStore: Current meal progress before load:",
            currentMealProgress,
          );

          const plan = await get().loadWeeklyMealPlan();
          if (plan) {
            // Set the plan while preserving meal progress
            set((state) => ({
              weeklyMealPlan: plan,
              mealProgress: { ...currentMealProgress }, // Preserve meal progress
            }));
          }

          // Load recent meal logs
          const mealLogs = await crudOperations.readMealLogs(
            new Date().toISOString().split("T")[0],
          );

          console.log(
            "📂 NutritionStore: Data loaded, final meal progress:",
            get().mealProgress,
          );
          console.log("📂 Nutrition data loaded");
        } catch (error) {
          console.error("❌ Failed to load nutrition data:", error);
        }
      },

      clearData: () => {
        set({
          weeklyMealPlan: null,
          mealProgress: {},
          dailyMeals: [],
          currentMealSession: null,
          planError: null,
          mealError: null,
        });
      },

      // Reset store to initial state (for logout)
      reset: () => {
        set({
          weeklyMealPlan: null,
          isGeneratingPlan: false,
          planError: null,
          mealProgress: {},
          dailyMeals: [],
          isGeneratingMeal: false,
          mealError: null,
          currentMealSession: null,
        });
      },
    }),
    {
      name: "nutrition-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weeklyMealPlan: state.weeklyMealPlan,
        mealProgress: state.mealProgress,
        dailyMeals: state.dailyMeals,
      }),
    },
  ),
);

export default useNutritionStore;
