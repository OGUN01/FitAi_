import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";
import {
  useNutritionStore,
  useAppStateStore,
  useUserStore,
  useAchievementStore,
  DayName,
} from "../stores";
import { aiService } from "../ai";
import { completionTrackingService } from "../services/completionTracking";
import { supabase } from "../services/supabase";
import { WeeklyMealPlan, DayMeal } from "../types/ai";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { useNutritionData } from "./useNutritionData";
import { useAuth } from "./useAuth";
import { mealMotivationService } from "../features/nutrition/MealMotivation";

export const useMealPlanning = (navigation: any) => {
  const [asyncJob, setAsyncJob] = useState<{
    jobId: string;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    error?: string;
    createdAt: string;
    estimatedTimeRemaining?: number;
    generationTimeMs?: number;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const asyncJobPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showMealPreparationModal, setShowMealPreparationModal] =
    useState(false);
  const [selectedMealForPreparation, setSelectedMealForPreparation] =
    useState<DayMeal | null>(null);

  const {
    weeklyMealPlan,
    isGeneratingPlan,
    mealProgress,
    saveWeeklyMealPlan,
    setWeeklyMealPlan,
    setGeneratingPlan,
    getMealProgress,
    loadWeeklyMealPlan,
    loadData: loadNutritionStoreData,
  } = useNutritionStore();

  const { selectedDay } = useAppStateStore();
  const { profile } = useUserStore();
  const { user } = useAuth();
  const { currentStreak: achievementStreak } = useAchievementStore();

  const { getCalorieTarget } = useCalculatedMetrics();
  const { dietPreferences, loadDailyNutrition } = useNutritionData();

  const forceRefresh = useCallback(() => {
    setForceUpdate((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      forceRefresh();
    }, 50);
    return () => clearTimeout(timeout);
  }, [mealProgress, forceRefresh]);

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = completionTrackingService.subscribe((event) => {
      if (event.type === "meal") {
        refreshTimeout = setTimeout(() => {
          forceRefresh();
        }, 100);
      }
    });
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      unsubscribe();
    };
  }, [forceRefresh]);

  useEffect(() => {
    const loadExistingMealPlan = async () => {
      try {
        await loadNutritionStoreData();
        const existingPlan = await loadWeeklyMealPlan();
        if (existingPlan) {
          setWeeklyMealPlan(existingPlan);
        }
      } catch (error) {
        console.error("[ERROR] Error loading meal plan:", error);
      }
    };
    loadExistingMealPlan();
  }, []);

  useEffect(() => {
    return () => {
      if (asyncJobPollingRef.current) {
        clearTimeout(asyncJobPollingRef.current);
      }
    };
  }, []);

  const refreshMealData = async () => {
    try {
      await loadNutritionStoreData();
      forceRefresh();
    } catch (error) {
      console.error("[ERROR] Error refreshing meal data:", error);
    }
  };

  const handleMealPlanResult = async (weeklyPlan: WeeklyMealPlan) => {
    await saveWeeklyMealPlan(weeklyPlan);
    setWeeklyMealPlan(weeklyPlan);
    forceRefresh();

    Alert.alert(
      "Meal Plan Generated!",
      `Your personalized 7-day meal plan "${weeklyPlan.planTitle}" is ready!`,
      [{ text: "View Plan", onPress: () => {} }],
    );
  };

  const startJobPolling = (jobId: string) => {
    let pollAttempt = 0;
    const maxAttempts = 60;
    const initialInterval = 3000;
    const maxInterval = 15000;

    const poll = async () => {
      pollAttempt++;
      try {
        const response = await aiService.checkMealPlanJobStatus(jobId, 1);

        if (!response.success || !response.data) {
          if (pollAttempt < maxAttempts) scheduleNextPoll();
          else handlePollTimeout();
          return;
        }

        const { status, plan, error, generationTimeMs } = response.data;
        setAsyncJob((prev) =>
          prev ? { ...prev, status, error, generationTimeMs } : null,
        );

        if (status === "completed" && plan) {
          await handleMealPlanResult(plan);
          cleanupPolling();
          return;
        }

        if (status === "failed") {
          setAiError(error || "Meal plan generation failed");
          Alert.alert(
            "Generation Failed",
            error || "Failed to generate meal plan.",
          );
          cleanupPolling();
          return;
        }

        if (status === "cancelled") {
          cleanupPolling();
          return;
        }

        if (pollAttempt < maxAttempts) scheduleNextPoll();
        else handlePollTimeout();
      } catch (err) {
        if (pollAttempt < maxAttempts) scheduleNextPoll();
        else handlePollTimeout();
      }
    };

    const scheduleNextPoll = () => {
      const interval = Math.min(
        initialInterval * Math.pow(1.5, Math.floor(pollAttempt / 5)),
        maxInterval,
      );
      asyncJobPollingRef.current = setTimeout(poll, interval);
    };

    const handlePollTimeout = () => {
      setAiError("Generation is taking longer than expected.");
      Alert.alert("Taking Longer Than Expected", "Check back later.");
      cleanupPolling();
    };

    const cleanupPolling = () => {
      if (asyncJobPollingRef.current) {
        clearTimeout(asyncJobPollingRef.current);
        asyncJobPollingRef.current = null;
      }
      setGeneratingPlan(false);
    };

    asyncJobPollingRef.current = setTimeout(poll, initialInterval);
  };

  const generateWeeklyMealPlan = async (
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (!user?.id || user.id.startsWith("guest")) {
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Up",
            onPress: () => setShowGuestSignUp(true),
          },
        ],
      );
      return;
    }

    const missingItems = [];
    if (!profile?.personalInfo) missingItems.push("Personal Information");
    if (!profile?.fitnessGoals) missingItems.push("Fitness Goals");
    if (!profile?.dietPreferences && !dietPreferences)
      missingItems.push("Diet Preferences");

    if (missingItems.length > 0) {
      Alert.alert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    setGeneratingPlan(true);
    setAiError(null);

    try {
      const userCalorieTarget = getCalorieTarget();
      if (!userCalorieTarget) throw new Error("Calorie target not calculated");

      const response = await aiService.generateWeeklyMealPlanAsync(
        profile!.personalInfo,
        profile!.fitnessGoals,
        1,
        {
          bodyMetrics: profile!.bodyMetrics,
          dietPreferences: (profile!.dietPreferences ||
            dietPreferences ||
            undefined) as any,
          calorieTarget: userCalorieTarget,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to start generation");
      }

      if (response.data.type === "cache_hit") {
        await handleMealPlanResult(response.data.plan);
        setGeneratingPlan(false);
        return;
      }

      if (response.data.type === "job_started") {
        setAsyncJob({
          jobId: response.data.jobId,
          status: "pending",
          createdAt: new Date().toISOString(),
          estimatedTimeRemaining: response.data.estimatedTimeMinutes * 60,
        });
        startJobPolling(response.data.jobId);
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed");
      Alert.alert("Error", "Failed to start meal plan generation.");
      setGeneratingPlan(false);
    }
  };

  const cancelAsyncGeneration = () => {
    if (asyncJobPollingRef.current) {
      clearTimeout(asyncJobPollingRef.current);
      asyncJobPollingRef.current = null;
    }
    setAsyncJob(null);
    setGeneratingPlan(false);
    setAiError(null);
  };

  const getTodaysMeals = (): DayMeal[] => {
    if (!weeklyMealPlan?.meals) {
      return [];
    }
    const filtered = weeklyMealPlan.meals.filter(
      (meal) => meal.dayOfWeek === selectedDay,
    );
    return filtered;
  };

  const handleDeleteMeal = async (meal: DayMeal) => {
    try {
      if (weeklyMealPlan) {
        const updatedMeals = weeklyMealPlan.meals.filter(
          (m) => m.id !== meal.id,
        );
        const updatedPlan = { ...weeklyMealPlan, meals: updatedMeals };
        setWeeklyMealPlan(updatedPlan);
        await saveWeeklyMealPlan(updatedPlan);
      }

      const mealProgressData = getMealProgress(meal.id);
      if (mealProgressData?.logId && user?.id) {
        await supabase.from("meals").delete().eq("id", mealProgressData.logId);
      }

      const currentProgress = { ...mealProgress };
      delete currentProgress[meal.id];
      useNutritionStore.setState({ mealProgress: currentProgress });

      await loadNutritionStoreData();
      forceRefresh();
      return true;
    } catch (error) {
      console.error("Delete failed", error);
      Alert.alert("Error", "Failed to delete meal");
      return false;
    }
  };

  const startMealPreparation = async (meal: DayMeal) => {
    completionTrackingService.updateMealProgress(meal.id, 0, {
      source: "diet_screen_start",
      startedAt: new Date().toISOString(),
    });

    if (!meal.cookingInstructions || meal.cookingInstructions.length === 0) {
      meal.cookingInstructions = [
        {
          step: 1,
          instruction: "Gather all ingredients and prepare your workspace",
        },
        {
          step: 2,
          instruction: "Follow your preferred cooking method for this meal",
        },
        {
          step: 3,
          instruction: "Cook according to the preparation time specified",
        },
        { step: 4, instruction: "Season to taste and serve immediately" },
        { step: 5, instruction: "Enjoy your healthy meal!" },
      ];
    }

    if (navigation) {
      navigation.navigate("CookingSession", { meal });
    }
  };

  const handleStartMeal = (meal: DayMeal) => {
    if (!navigation) {
      Alert.alert("Error", "Navigation not available");
      return;
    }

    if (Platform.OS === "web") {
      setSelectedMealForPreparation(meal);
      setShowMealPreparationModal(true);
      return;
    }

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
    const todayName = dayNames[today.getDay()] as DayName;

    const completedMealsToday = Object.entries(mealProgress).filter(
      ([mealId, progress]) => {
        const m = weeklyMealPlan?.meals.find((m) => m.id === mealId);
        return progress.progress === 100 && m?.dayOfWeek === todayName;
      },
    ).length;

    const motivationConfig = {
      personalInfo: profile?.personalInfo,
      fitnessGoals: profile?.fitnessGoals,
      currentStreak: achievementStreak,
      completedMealsToday,
    };

    const dynamicMessage = mealMotivationService.getMealStartMessage(
      meal,
      motivationConfig,
    );
    const preparationTips = mealMotivationService.getPreparationTips(meal);

    const fullMessage = `${dynamicMessage}\n\nQuick Tips:\n${preparationTips
      .slice(0, 2)
      .map((tip) => `- ${tip}`)
      .join("\n")}`;

    Alert.alert("Ready to Cook?", fullMessage, [
      { text: "Maybe Later", style: "cancel" },
      {
        text: "Let's Cook!",
        onPress: () => startMealPreparation(meal),
      },
    ]);
  };

  const completeMealPreparation = async (meal: DayMeal) => {
    try {
      const success = await completionTrackingService.completeMeal(
        meal.id,
        {
          completedAt: new Date().toISOString(),
          source: "diet_screen_manual",
        },
        user?.id,
      );

      if (success) {
        try {
          await loadDailyNutrition();
        } catch (refreshError) {
          console.warn("Failed to refresh nutrition data:", refreshError);
        }

        if (Platform.OS === "web") {
          setShowMealPreparationModal(false);
          setSelectedMealForPreparation(null);
        } else {
          Alert.alert(
            "Meal Complete!",
            `You've completed "${meal.name}"!\n\nCheck the Progress tab to see your achievement!`,
          );
        }
      } else {
        Alert.alert("Error", "Failed to mark meal as complete.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to mark meal as complete.");
    }
  };

  return {
    weeklyMealPlan,
    isGeneratingPlan,
    mealProgress,
    selectedDay,
    asyncJob,
    aiError,
    showMealPreparationModal,
    setShowMealPreparationModal,
    selectedMealForPreparation,
    setSelectedMealForPreparation,

    getTodaysMeals,
    generateWeeklyMealPlan,
    cancelAsyncGeneration,
    handleDeleteMeal,
    refreshMealData,
    forceRefresh,
    handleStartMeal,
    startMealPreparation,
    completeMealPreparation,
  };
};
