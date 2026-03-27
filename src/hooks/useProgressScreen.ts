import { useState, useEffect, useRef, useMemo } from "react";
import { Animated, Platform, Share } from "react-native";
import { useAuth } from "./useAuth";
import { useProgressData } from "./useProgressData";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { completionTrackingService } from "../services/completionTracking";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { useAchievementStore } from "../stores/achievementStore";
import { useFitnessStore } from "../stores/fitnessStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { getCurrentWeekStart, getWeekStartForDate } from "../utils/weekUtils";
import { buildAchievementViewModels } from "../utils/achievementViewModel";
import { useProfileStore } from "../stores/profileStore";
import { type WeightUnit, toDisplayWeight } from "../utils/units";

export const useProgressScreen = (navigation: unknown) => {
  void navigation;
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const currentStreak = useAchievementStore((s) => s.currentStreak);
  const initializeAchievements = useAchievementStore((s) => s.initialize);
  const areAchievementsInitialized = useAchievementStore(
    (s) => s.isInitialized,
  );
  const achievementDefinitions = useAchievementStore((s) => s.achievements);
  const userAchievements = useAchievementStore((s) => s.userAchievements);

  const completedSessions = useFitnessStore((s) => s.completedSessions);
  const workoutsCompleted = useMemo(() => {
    const weekStart = getCurrentWeekStart();
    return completedSessions.filter(
      (s) => s.type === "planned" && s.weekStart === weekStart,
    ).length;
  }, [completedSessions]);

  const mealProgress = useNutritionStore((s) => s.mealProgress);
  const mealsCompleted = useMemo(() => {
    const weekStart = getCurrentWeekStart();
    return Object.values(mealProgress).filter(
      (p) =>
        p.progress === 100 &&
        p.completedAt &&
        getWeekStartForDate(p.completedAt) === weekStart,
    ).length;
  }, [mealProgress]);

  const weightHistory = useAnalyticsStore((s) => s.weightHistory);

  const { user, isAuthenticated } = useAuth();
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const weightUnit: WeightUnit =
    personalInfo?.units === "imperial" ? "lbs" : "kg";

  useEffect(() => {
    if (!user?.id || areAchievementsInitialized) {
      return;
    }

    initializeAchievements(user.id).catch((error) => {
      console.warn(
        "[ProgressScreen] Failed to initialize achievements:",
        error,
      );
    });
  }, [user?.id, areAchievementsInitialized, initializeAchievements]);

  const {
    progressEntries,
    progressLoading,
    progressError,
    analysisError,
    progressStats,
    statsError,
    trackBStatus,
    refreshAll,
  } = useProgressData();

  const { metrics: calculatedMetrics, hasCalculatedMetrics } =
    useCalculatedMetrics();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Keep ref to avoid stale closure in completionTracking callback
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refreshProgressData = async () => {
    try {
      await refreshAll();
      if (user?.id) {
        await useAchievementStore.getState().reconcileWithCurrentData(user.id);
      }
    } catch (error) {
      console.error("Failed to load progress data:", error);
    }
  };

  useEffect(() => {
    refreshRef.current = refreshProgressData;
  }, [refreshProgressData]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshProgressData();
      } catch (e) {
        console.error("Progress init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const unsubscribe = completionTrackingService.subscribe((event) => {
      if (event.type === "meal" || event.type === "workout") {
        refreshRef.current();
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      unsubscribe();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } catch {
      crossPlatformAlert("Error", "Failed to refresh progress data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddProgressEntry = () => {
    setShowWeightModal(true);
  };

  const handleShareProgress = async () => {
    const currentWeight = progressStats?.weightChange?.current;
    const displayWeight = toDisplayWeight(currentWeight, weightUnit);
    const weightDisplay =
      displayWeight != null
        ? `${displayWeight.toFixed(1)} ${weightUnit}`
        : "Not recorded";
    const bmi = calculatedMetrics?.calculatedBMI
      ? calculatedMetrics.calculatedBMI.toFixed(1)
      : "Not calculated";
    const message = `My FitAI Progress Update!\n\nCurrent Weight: ${weightDisplay}\nBMI: ${bmi}\n\nTrack your fitness journey with FitAI!`;

    try {
      await Share.share({ message, title: "My FitAI Progress" });
    } catch {
      if (
        Platform.OS === "web" &&
        typeof globalThis !== "undefined" &&
        "navigator" in globalThis &&
        globalThis.navigator?.clipboard
      ) {
        await globalThis.navigator.clipboard.writeText(message).catch((err) => {
          console.error("[ProgressScreen] Clipboard write failed:", err);
        });
      }
    }
  };

  const achievementItems = useMemo(
    () => buildAchievementViewModels(achievementDefinitions, userAchievements),
    [achievementDefinitions, userAchievements],
  );
  const achievements = useMemo(
    () =>
      achievementItems.slice(0, 6).map((achievement) => ({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        iconName: achievement.iconName,
        date: achievement.unlockedAt || "",
        completed: achievement.completed,
        category: achievement.categoryLabel,
        points: achievement.points,
        rarity: achievement.tier,
        progress: achievement.progress,
        target: achievement.target,
      })),
    [achievementItems],
  );
  const completedAchievementCount = useMemo(
    () =>
      achievementItems.filter((achievement) => achievement.completed).length,
    [achievementItems],
  );
  const totalAchievementCount = achievementItems.length;

  return {
    state: {
      refreshing,
      isLoading,
      showWeightModal,
      weeklyProgress: {
        workoutsCompleted,
        mealsCompleted,
        streak: currentStreak,
      },
      user,
      isAuthenticated,
      progressLoading,
      progressError,
      analysisError,
      statsError,
      calculatedMetrics,
      hasCalculatedMetrics,
      fadeAnim,
      slideAnim,
      trackBStatus,
      progressEntries,
      progressStats,
      weightHistory,
      weightUnit,
    },
    computed: {
      achievements,
      completedAchievementCount,
      totalAchievementCount,
    },
    actions: {
      setShowWeightModal,
      onRefresh,
      handleAddProgressEntry,
      handleShareProgress,
    },
  };
};
