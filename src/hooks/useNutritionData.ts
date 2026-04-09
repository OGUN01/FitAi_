import { useState, useEffect, useCallback, useRef } from "react";
import { InteractionManager } from "react-native";
import {
  nutritionDataService,
  Food,
  Meal,
  UserDietPreferences,
  NutritionGoals,
} from "../services/nutritionData";
import { useAuth } from "./useAuth";
import useTrackBIntegration from "./useTrackBIntegration";
import { nutritionRefreshService } from "../services/nutritionRefreshService";
import { useNutritionStore } from "../stores/nutritionStore";
import { getLocalDateString } from "../utils/weekUtils";

interface UseNutritionDataReturn {
  // Foods
  foods: Food[];
  foodsLoading: boolean;
  foodsError: string | null;
  loadFoods: (filters?: {
    category?: string;
    search?: string;
    barcode?: string;
  }) => Promise<void>;

  // User meals
  userMeals: Meal[];
  userMealsLoading: boolean;
  userMealsError: string | null;
  loadUserMeals: (date?: string, limit?: number) => Promise<void>;

  // Diet preferences
  dietPreferences: UserDietPreferences | null;
  preferencesLoading: boolean;
  preferencesError: string | null;
  loadDietPreferences: () => Promise<void>;

  // Nutrition goals
  nutritionGoals: NutritionGoals | null;
  goalsLoading: boolean;
  goalsError: string | null;
  loadNutritionGoals: () => Promise<void>;

  // Daily nutrition stats
  dailyNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    mealsCount: number;
  } | null;
  statsLoading: boolean;
  statsError: string | null;
  loadDailyNutrition: (date?: string) => Promise<void>;

  // Actions
  logMeal: (mealData: {
    name: string;
    type: "breakfast" | "lunch" | "dinner" | "snack";
    foods: {
      food_id: string;
      quantity_grams: number;
    }[];
  }) => Promise<boolean>;

  // Track B integration
  trackBStatus: {
    isConnected: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
  };

  // Utility
  refreshAll: () => Promise<void>;
  clearErrors: () => void;
}

interface UseNutritionDataOptions {
  autoRefresh?: boolean;
}

export const useNutritionData = ({
  autoRefresh = true,
}: UseNutritionDataOptions = {}): UseNutritionDataReturn => {
  const { user, isAuthenticated } = useAuth();
  const trackB = useTrackBIntegration();

  // Foods state
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [foodsError, setFoodsError] = useState<string | null>(null);

  // User meals state
  const [userMeals, setUserMeals] = useState<Meal[]>([]);
  const [userMealsLoading, setUserMealsLoading] = useState(false);
  const [userMealsError, setUserMealsError] = useState<string | null>(null);

  // Diet preferences state
  const [dietPreferences, setDietPreferences] =
    useState<UserDietPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  // Nutrition goals state
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(
    null,
  );
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  // SSOT fix: dailyNutrition derived from nutritionStore.getTodaysConsumedNutrition()
  // instead of getUserMeals() which reads meal_templates (recipe catalogue), not meal_logs.
  const getTodaysConsumedNutrition = useNutritionStore(
    (s) => s.getTodaysConsumedNutrition,
  );
  const storeDailyMeals = useNutritionStore((s) => s.dailyMeals);
  const dailyNutrition = (() => {
    const n = getTodaysConsumedNutrition();
    const todayDate = getLocalDateString();
    const completedLoggedMeals = storeDailyMeals.filter(
      (meal) => {
        const mealRecord = meal as unknown as Record<string, unknown>;
        const loggedAt = mealRecord.loggedAt;
        return typeof loggedAt === "string" &&
          getLocalDateString(loggedAt) === todayDate;
      },
    ).length;

    return {
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      mealsCount: completedLoggedMeals,
    };
  })();
  // statsLoading and statsError are always false/null â€” dailyNutrition is derived synchronously from the store.
  const statsLoading = false;
  const statsError: string | null = null;

  // Initialize Track B integration
  useEffect(() => {
    if (isAuthenticated && !trackB.integration.isInitialized) {
      trackB.actions.initialize();
    }
  }, [isAuthenticated, trackB.integration.isInitialized]);

  // Load foods
  const loadFoods = useCallback(
    async (filters?: {
      category?: string;
      search?: string;
      barcode?: string;
    }) => {
      setFoodsLoading(true);
      setFoodsError(null);

      try {
        const response = await nutritionDataService.getFoods(filters);

        if (response.success && response.data) {
          setFoods(response.data);
        } else {
          setFoodsError(response.error || "Failed to load foods");
        }
      } catch (error) {
        setFoodsError(
          error instanceof Error ? error.message : "Failed to load foods",
        );
      } finally {
        setFoodsLoading(false);
      }
    },
    [],
  );

  // Load user meals
  const loadUserMeals = useCallback(
    async (date?: string, limit?: number) => {
      if (!user?.id) return;

      setUserMealsLoading(true);
      setUserMealsError(null);

      try {
        const response = await nutritionDataService.getUserMeals(
          user.id,
          date,
          limit,
        );

        if (response.success && response.data) {
          setUserMeals(response.data);
        } else {
          setUserMealsError(response.error || "Failed to load meals");
        }
      } catch (error) {
        setUserMealsError(
          error instanceof Error ? error.message : "Failed to load meals",
        );
      } finally {
        setUserMealsLoading(false);
      }
    },
    [user?.id],
  );

  // Load diet preferences
  const loadDietPreferences = useCallback(async () => {
    if (!user?.id) return;

    setPreferencesLoading(true);
    setPreferencesError(null);

    try {
      const response = await nutritionDataService.getUserDietPreferences(
        user.id,
      );

      if (response.success && response.data) {
        setDietPreferences(response.data);
      } else {
        setPreferencesError(
          response.error || "Failed to load diet preferences",
        );
      }
    } catch (error) {
      setPreferencesError(
        error instanceof Error
          ? error.message
          : "Failed to load diet preferences",
      );
    } finally {
      setPreferencesLoading(false);
    }
  }, [user?.id]);

  // Load nutrition goals
  const loadNutritionGoals = useCallback(async () => {
    if (!user?.id) return;

    setGoalsLoading(true);
    setGoalsError(null);

    try {
      const response = await nutritionDataService.getUserNutritionGoals(
        user.id,
      );

      if (response.success && response.data) {
        setNutritionGoals(response.data);
      } else {
        setGoalsError(response.error || "Failed to load nutrition goals");
      }
    } catch (error) {
      setGoalsError(
        error instanceof Error
          ? error.message
          : "Failed to load nutrition goals",
      );
    } finally {
      setGoalsLoading(false);
    }
  }, [user?.id]);

  // loadDailyNutrition removed â€” dailyNutrition now auto-derived (Fix 14).

  // Log meal
  const logMeal = useCallback(
    async (mealData: {
      name: string;
      type: "breakfast" | "lunch" | "dinner" | "snack";
      foods: {
        food_id: string;
        quantity_grams: number;
      }[];
    }): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const response = await nutritionDataService.logMeal(user.id, mealData);

        if (response.success) {
          await Promise.all([
            loadUserMeals(),
            useNutritionStore.getState().loadData(),
          ]);
          return true;
        } else {
          setUserMealsError(response.error || "Failed to log meal");
          return false;
        }
      } catch (error) {
        setUserMealsError(
          error instanceof Error ? error.message : "Failed to log meal",
        );
        return false;
      }
    },
    [user?.id, loadUserMeals],
  );

  // Refresh all data â€” critical data first, deferred data after interactions
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    // Critical: meal plan + daily meals (what user sees immediately)
    await Promise.all([
      loadUserMeals(),
      useNutritionStore.getState().loadData(),
    ]);

    // Deferred: secondary data that doesn't block the UI
    InteractionManager.runAfterInteractions(() => {
      Promise.all([
        loadFoods(),
        loadDietPreferences(),
        loadNutritionGoals(),
      ]).catch((err) =>
        console.error("[NutritionData] Deferred refresh failed:", err),
      );
    });
  }, [
    isAuthenticated,
    user?.id,
    loadFoods,
    loadUserMeals,
    loadDietPreferences,
    loadNutritionGoals,
  ]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setFoodsError(null);
    setUserMealsError(null);
    setPreferencesError(null);
    setGoalsError(null);
  }, []);

  // PERF-004 FIX: Use ref to prevent infinite re-fetch loop
  const initialFetchDoneRef = useRef(false);
  const lastUserIdRef = useRef<string | undefined>(undefined);

  // Load initial data when user is authenticated
  useEffect(() => {
    // PERF-004 FIX: Only fetch once per user session
    if (
      autoRefresh &&
      isAuthenticated &&
      user?.id &&
      trackB.integration.isInitialized
    ) {
      // Only fetch if user changed or first time
      if (!initialFetchDoneRef.current || lastUserIdRef.current !== user.id) {
        initialFetchDoneRef.current = true;
        lastUserIdRef.current = user.id;
        void refreshAll();
      }
    }
  }, [
    autoRefresh,
    isAuthenticated,
    user?.id,
    trackB.integration.isInitialized,
  ]); // Removed refreshAll from deps

  // Ref to hold latest refreshAll without causing subscription to re-register
  const refreshAllRef = useRef(refreshAll);
  useEffect(() => { refreshAllRef.current = refreshAll; }, [refreshAll]);

  // Register with nutrition refresh service for automatic updates
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const unsubscribe = nutritionRefreshService.onRefreshNeeded(() => refreshAllRef.current());

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated, user?.id]); // refreshAllRef is stable (ref object); refreshAll kept current via effect above

  // Track B status
  const trackBStatus = {
    isConnected: trackB.integration.isConnected,
    isOnline: trackB.sync.isOnline,
    isSyncing: trackB.sync.isSyncing,
    lastSyncTime: trackB.sync.lastSyncTime,
  };

  return {
    // Foods
    foods,
    foodsLoading,
    foodsError,
    loadFoods,

    // User meals
    userMeals,
    userMealsLoading,
    userMealsError,
    loadUserMeals,

    // Diet preferences
    dietPreferences,
    preferencesLoading,
    preferencesError,
    loadDietPreferences,

    // Nutrition goals
    nutritionGoals,
    goalsLoading,
    goalsError,
    loadNutritionGoals,

    dailyNutrition,
    statsLoading,
    statsError,
    loadDailyNutrition: async () => {},

    // Actions
    logMeal,

    // Track B integration
    trackBStatus,

    // Utility
    refreshAll,
    clearErrors,
  };
};
