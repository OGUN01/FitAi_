import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import {
  useNutritionStore,
  useAppStateStore,
  useAchievementStore,
  DayName,
} from "../stores";
import { useProfileStore } from "../stores/profileStore";
import { useUserStore } from "../stores/userStore";
import { aiService } from "../ai";
import { completionTrackingService } from "../services/completionTracking";
import { WeeklyMealPlan, DayMeal } from "../types/ai";
import { crudOperations } from "../services/crudOperations";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { useNutritionData } from "./useNutritionData";
import { useAuth } from "./useAuth";
import { useSubscriptionStore } from "../stores/subscriptionStore";
// usePaywall import removed â€” triggerPaywall now via subscriptionStore
import { mealMotivationService } from "../features/nutrition/MealMotivation";
import {
  buildLegacyDietPreferences,
  buildLegacyFitnessGoals,
  buildLegacyPersonalInfo,
} from "../utils/profileLegacyAdapter";

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
  const asyncJobPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRemoteHydratedUserIdRef = useRef<string | null>(null);

  const [showMealPreparationModal, setShowMealPreparationModal] =
    useState(false);
  const [selectedMealForPreparation, setSelectedMealForPreparation] =
    useState<DayMeal | null>(null);

  const weeklyMealPlan = useNutritionStore((state) => state.weeklyMealPlan);
  const isGeneratingPlan = useNutritionStore((state) => state.isGeneratingPlan);
  const mealProgress = useNutritionStore((state) => state.mealProgress);
  const dailyMeals = useNutritionStore((state) => state.dailyMeals);
  const saveWeeklyMealPlan = useNutritionStore(
    (state) => state.saveWeeklyMealPlan,
  );
  const setWeeklyMealPlan = useNutritionStore(
    (state) => state.setWeeklyMealPlan,
  );
  const setGeneratingPlan = useNutritionStore(
    (state) => state.setGeneratingPlan,
  );
  const mealProgressMap = useNutritionStore((state) => state.mealProgress);
  const getMealProgress = (mealId: string) => mealProgressMap[mealId] ?? null;
  const loadNutritionStoreData = useNutritionStore((state) => state.loadData);
  const profile = useUserStore((state) => state.profile);

  const selectedDay = useAppStateStore((state) => state.selectedDay);
  const { user } = useAuth();
  // SSOT: profileStore is authoritative for all onboarding data
  const bodyAnalysis = useProfileStore((state) => state.bodyAnalysis);
  const profilePersonalInfo = useProfileStore((state) => state.personalInfo);
  const profileWorkoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );
  const profileDietPreferences = useProfileStore(
    (state) => state.dietPreferences,
  );
  const profileAdvancedReview = useProfileStore(
    (state) => state.advancedReview,
  );
  const achievementStreak = useAchievementStore((state) => state.currentStreak);

  const legacyPersonalInfo = useMemo(
    () =>
      buildLegacyPersonalInfo({
        personalInfo: profilePersonalInfo,
        bodyAnalysis,
        workoutPreferences: profileWorkoutPreferences,
      }),
    [profilePersonalInfo, bodyAnalysis, profileWorkoutPreferences],
  );
  const mergedFitnessGoals = useMemo(
    () => buildLegacyFitnessGoals(profileWorkoutPreferences, profile),
    [profileWorkoutPreferences, profile],
  );
  const mergedDietPreferences = useMemo(
    () => buildLegacyDietPreferences(profileDietPreferences, profile),
    [profileDietPreferences, profile],
  );

  const { getCalorieTarget } = useCalculatedMetrics();
  const canUseFeature = useSubscriptionStore((state) => state.canUseFeature);
  const incrementUsage = useSubscriptionStore((state) => state.incrementUsage);
  const triggerPaywall = useSubscriptionStore((state) => state.triggerPaywall);

  const { dietPreferences, loadDailyNutrition } = useNutritionData();

  const forceRefresh = useCallback(async () => {
    await loadNutritionStoreData();
  }, [loadNutritionStoreData]);

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
    let isMounted = true;

    const authenticatedUserId =
      user?.id && !user.id.startsWith("guest") ? user.id : null;

    if (authenticatedUserId) {
      if (lastRemoteHydratedUserIdRef.current === authenticatedUserId) {
        return () => { isMounted = false; };
      }

      lastRemoteHydratedUserIdRef.current = authenticatedUserId;
      if (isMounted) {
        loadNutritionStoreData().catch((error) => {
          console.error("[ERROR] Error loading remote meal plan:", error);
        });
      }
      return () => { isMounted = false; };
    }

    lastRemoteHydratedUserIdRef.current = null;
    const hasHydratedDietData =
      Boolean(weeklyMealPlan) ||
      Object.keys(mealProgress).length > 0 ||
      dailyMeals.length > 0;

    if (!hasHydratedDietData && isMounted) {
      loadNutritionStoreData().catch((error) => {
        console.error("[ERROR] Error loading meal plan:", error);
      });
    }

    return () => { isMounted = false; };
  }, [
    dailyMeals.length,
    loadNutritionStoreData,
    Object.keys(mealProgress).length,
    user?.id,
    weeklyMealPlan?.id,
  ]);

  useEffect(() => {
    return () => {
      if (asyncJobPollingRef.current) {
        clearTimeout(asyncJobPollingRef.current);
      }
    };
  }, []);

  const refreshMealData = useCallback(async () => {
    try {
      await loadNutritionStoreData();
    } catch (error) {
      console.error("[ERROR] Error refreshing meal data:", error);
    }
  }, [loadNutritionStoreData]);

  const handleMealPlanResult = async (weeklyPlan: WeeklyMealPlan) => {
    await saveWeeklyMealPlan(weeklyPlan);
    setWeeklyMealPlan(weeklyPlan);

    crossPlatformAlert(
      "Meal Plan Generated!",
      `Your personalized 7-day meal plan "${weeklyPlan.planTitle}" is ready!`,
      [{ text: "View Plan", onPress: () => {} }],
    );
    incrementUsage("ai_generation");
  };

  const startJobPolling = (jobId: string) => {
    let pollAttempt = 0;
    const maxAttempts = 60;
    const initialInterval = 3000;
    const maxInterval = 15000;
    const startTime = Date.now();
    const MAX_WALL_MS = 3 * 60 * 1000; // 3-minute absolute deadline

    const poll = async () => {
      pollAttempt++;

      // Wall-clock absolute deadline check
      if (Date.now() - startTime > MAX_WALL_MS) {
        handlePollTimeout();
        return;
      }

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
          crossPlatformAlert(
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
      } catch {
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
      setAsyncJob(null);
      crossPlatformAlert("Taking Longer Than Expected", "Check back later.");
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

  // eslint-disable-next-line no-unused-vars
  const generateWeeklyMealPlan = async (
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (!user?.id || user.id.startsWith("guest")) {
      crossPlatformAlert(
        "Sign In Required",
        "Create a free account to generate your personalized AI meal plan and save your progress.",
        [
          {
            text: "Sign Up",
            onPress: () => setShowGuestSignUp(true),
          },
          { text: "Not Now", style: "cancel" },
        ],
      );
      return;
    }

    const missingItems = [];
    if (!legacyPersonalInfo) missingItems.push("Personal Information");
    if (
      !mergedFitnessGoals?.primary_goals?.length &&
      !mergedFitnessGoals?.primaryGoals?.length
    )
      missingItems.push("Fitness Goals");
    if (!mergedDietPreferences && !dietPreferences)
      missingItems.push("Diet Preferences");

    if (missingItems.length > 0) {
      crossPlatformAlert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    if (!canUseFeature("ai_generation")) {
      triggerPaywall(
        "You've used your free AI generation for this month. Upgrade to Pro for unlimited meal plans.",
      );
      return;
    }

    setGeneratingPlan(true);
    setAiError(null);

    try {
      const userCalorieTarget = getCalorieTarget();
      if (!userCalorieTarget) throw new Error("Calorie target not calculated");

      const response = await aiService.generateWeeklyMealPlanAsync(
        legacyPersonalInfo!,
        mergedFitnessGoals!,
        1,
        {
          bodyMetrics: bodyAnalysis || undefined,
          dietPreferences: ((profileDietPreferences as any) ||
            mergedDietPreferences ||
            dietPreferences ||
            undefined) as any,
          calorieTarget: userCalorieTarget,
          advancedReview: profileAdvancedReview || undefined,
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
        if (asyncJobPollingRef.current) {
          clearTimeout(asyncJobPollingRef.current);
          asyncJobPollingRef.current = null;
        }
        setAsyncJob({
          jobId: response.data.jobId,
          status: "pending",
          createdAt: new Date().toISOString(),
          estimatedTimeRemaining: response.data.estimatedTimeMinutes * 60,
        });
        startJobPolling(response.data.jobId);
        setGeneratingPlan(false); // Polling manages its own state from here
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (
        errMsg.toLowerCase().includes("feature limit exceeded") ||
        errMsg.toLowerCase().includes("limit exceeded")
      ) {
        triggerPaywall(
          "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
        );
      } else {
        setAiError(errMsg);
        crossPlatformAlert("Error", "Failed to start meal plan generation.");
      }
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

  const getTodaysMeals = useMemo((): DayMeal[] => {
    if (!weeklyMealPlan?.meals) {
      return [];
    }
    return weeklyMealPlan.meals.filter(
      (meal) => meal.dayOfWeek === selectedDay,
    );
  }, [weeklyMealPlan?.meals, selectedDay]);

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
      if (mealProgressData?.logId) {
        await crudOperations.deleteMealLog(mealProgressData.logId);
      }

      try {
        const currentProgress = { ...mealProgress };
        delete currentProgress[meal.id];
        useNutritionStore.setState({ mealProgress: currentProgress });
      } catch (progressError) {
        console.error('[MealPlanning] Failed to remove meal progress from store:', progressError);
      }

      await loadNutritionStoreData();
      forceRefresh();
      return true;
    } catch (error) {
      console.error("Delete failed", error);
      crossPlatformAlert("Error", "Failed to delete meal");
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
      crossPlatformAlert("Error", "Navigation not available");
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
      personalInfo: legacyPersonalInfo || undefined,
      fitnessGoals: mergedFitnessGoals || undefined,
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

    crossPlatformAlert("Ready to Cook?", fullMessage, [
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
          crossPlatformAlert(
            "Meal Complete!",
            `You've completed "${meal.name}"!\n\nCheck the Progress tab to see your achievement!`,
          );
        }
      } else {
        crossPlatformAlert("Error", "Failed to mark meal as complete.");
      }
    } catch {
      crossPlatformAlert("Error", "Failed to mark meal as complete.");
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

    todaysMeals: getTodaysMeals,
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
