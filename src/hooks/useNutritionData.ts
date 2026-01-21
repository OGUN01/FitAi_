import { useState, useEffect, useCallback } from "react";
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

export const useNutritionData = (): UseNutritionDataReturn => {
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

  // Daily nutrition stats state
  const [dailyNutrition, setDailyNutrition] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealsCount: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  // Load daily nutrition stats
  const loadDailyNutrition = useCallback(
    async (date?: string) => {
      if (!user?.id) return;

      setStatsLoading(true);
      setStatsError(null);

      try {
        const targetDate = date || new Date().toISOString().split("T")[0];
        const response = await nutritionDataService.getUserMeals(
          user.id,
          targetDate,
        );

        if (response.success && response.data) {
          const meals = response.data;
          const stats = meals.reduce(
            (acc, meal) => ({
              // Use database column names (snake_case) with fallback for compatibility
              calories:
                acc.calories +
                ((meal as any).total_calories ||
                  (meal as any).totalCalories ||
                  0),
              protein:
                acc.protein +
                ((meal as any).total_protein ||
                  (meal as any).totalMacros?.protein ||
                  0),
              carbs:
                acc.carbs +
                ((meal as any).total_carbohydrates ||
                  (meal as any).total_carbs ||
                  (meal as any).totalMacros?.carbs ||
                  0),
              fat:
                acc.fat +
                ((meal as any).total_fat ||
                  (meal as any).totalMacros?.fat ||
                  0),
              mealsCount: acc.mealsCount + 1,
            }),
            {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              mealsCount: 0,
            },
          );

          setDailyNutrition(stats);
        } else {
          setStatsError(response.error || "Failed to load daily nutrition");
        }
      } catch (error) {
        setStatsError(
          error instanceof Error
            ? error.message
            : "Failed to load daily nutrition",
        );
      } finally {
        setStatsLoading(false);
      }
    },
    [user?.id],
  );

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
          // Refresh meals and daily nutrition
          await Promise.all([loadUserMeals(), loadDailyNutrition()]);
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
    [user?.id, loadUserMeals, loadDailyNutrition],
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    await Promise.all([
      loadFoods(),
      loadUserMeals(),
      loadDietPreferences(),
      loadNutritionGoals(),
      loadDailyNutrition(),
    ]);
  }, [
    isAuthenticated,
    user?.id,
    loadFoods,
    loadUserMeals,
    loadDietPreferences,
    loadNutritionGoals,
    loadDailyNutrition,
  ]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setFoodsError(null);
    setUserMealsError(null);
    setPreferencesError(null);
    setGoalsError(null);
    setStatsError(null);
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id && trackB.integration.isInitialized) {
      refreshAll();
    }
  }, [isAuthenticated, user?.id, trackB.integration.isInitialized, refreshAll]);

  // Register with nutrition refresh service for automatic updates
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const unsubscribe = nutritionRefreshService.onRefreshNeeded(refreshAll);
      console.log("📡 Registered nutrition data hook with refresh service");

      return () => {
        unsubscribe();
        console.log("📡 Unregistered nutrition data hook from refresh service");
      };
    }
  }, [isAuthenticated, user?.id, refreshAll]);

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

    // Daily nutrition stats
    dailyNutrition,
    statsLoading,
    statsError,
    loadDailyNutrition,

    // Actions
    logMeal,

    // Track B integration
    trackBStatus,

    // Utility
    refreshAll,
    clearErrors,
  };
};
