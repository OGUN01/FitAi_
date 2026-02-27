import { useState, useEffect, useCallback, useMemo } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

// Stores
import { useUserStore, useFitnessStore, useAppStateStore, useProfileStore } from "../stores";
import { useAuth } from "./useAuth";
import { useFitnessData } from "./useFitnessData";

// AI Service
import { aiService } from "../ai";
import { DayWorkout } from "../types/ai";
import { completionTrackingService } from "../services/completionTracking";
import { haptics } from "../utils/haptics";
import { useSubscriptionStore } from "../stores/subscriptionStore";

// Type for completed workout history items
interface CompletedWorkoutItem {
  id: string;
  workoutId: string;
  title: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  completedAt: string;
  progress: number;
}

// Type for suggested workout items
interface SuggestedWorkoutItem {
  id: string;
  title: string;
  category: string;
  duration: number;
  estimatedCalories: number;
  difficulty: "beginner" | "intermediate" | "advanced";
}

// Navigation interface matching MainNavigation's shape
export interface FitnessNavigation {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

export const useFitnessLogic = (navigation: FitnessNavigation) => {
  // Auth & User
  const { user, isGuestMode } = useAuth();
  const { profile } = useUserStore();
  const { bodyAnalysis, workoutPreferences: profileWorkoutPreferences } = useProfileStore();

  // Fitness Store
  const {
    weeklyWorkoutPlan,
    isGeneratingPlan,
    workoutProgress,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
    setGeneratingPlan,
    startWorkoutSession: startStoreWorkoutSession,
    loadData: loadFitnessData,
    getWorkoutProgress,
    getCompletedWorkoutStats,
  } = useFitnessStore();

  // Fitness Data Hook
  const { startWorkoutSession } = useFitnessData();

  // SHARED UI STATE - Single Source of Truth from appStateStore
  const {
    selectedDay,
    setSelectedDay,
    isSelectedDayToday: isSelectedDayTodayFn,
  } = useAppStateStore();
  // Subscription store for AI generation gating
  const { canUseFeature, incrementUsage, triggerPaywall } = useSubscriptionStore();

  // Local UI State
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<(DayWorkout & { sessionId?: string }) | null>(
    null,
  );
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);
  const [showRecoveryTipsModal, setShowRecoveryTipsModal] = useState(false);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);

  // Load data on mount and subscribe to completion events
  useEffect(() => {
    loadFitnessData();

    const unsubscribe = completionTrackingService.subscribe((event) => {
      if (event.type === "workout") {
        loadFitnessData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadFitnessData]);

  // Get selected day's workout (syncs with calendar selection)
  const selectedDayWorkout = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return null;
    return (
      weeklyWorkoutPlan.workouts.find((w) => w.dayOfWeek === selectedDay) ||
      null
    );
  }, [weeklyWorkoutPlan, selectedDay]);

  // Check if selected day is rest day
  const isSelectedDayRestDay = useMemo(() => {
    if (!weeklyWorkoutPlan?.restDays) return false;
    const dayIndex = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].indexOf(selectedDay);
    return weeklyWorkoutPlan.restDays.includes(dayIndex);
  }, [weeklyWorkoutPlan, selectedDay]);

  // Check if selected day is today - from appStateStore
  const isSelectedDayToday = useMemo(() => isSelectedDayTodayFn(), [isSelectedDayTodayFn]);

  // Get selected day's workout progress
  const selectedDayProgress = useMemo(() => {
    if (!selectedDayWorkout) return 0;
    return getWorkoutProgress(selectedDayWorkout.id)?.progress; // NO FALLBACK
  }, [selectedDayWorkout, getWorkoutProgress]);

  // Get completed workouts for history
  const completedWorkouts = useMemo(() => {
    const completed: Array<{
      id: string;
      workoutId: string;
      title: string;
      category: string;
      duration: number;
      caloriesBurned: number;
      completedAt: string;
      progress: number;
    }> = [];

    Object.entries(workoutProgress).forEach(([workoutId, progress]) => {
      const workout = weeklyWorkoutPlan?.workouts?.find(
        (w) => w.id === workoutId,
      );
      if (workout && progress.progress > 0) {
        completed.push({
          id: `history_${workoutId}`,
          workoutId,
          title: workout.title,
          category: workout.category,
          duration: workout.duration,
          caloriesBurned: workout.estimatedCalories,
          completedAt: progress.completedAt || new Date().toISOString(),
          progress: progress.progress,
        });
      }
    });

    // Sort by completion date (most recent first)
    return completed.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }, [workoutProgress, weeklyWorkoutPlan]);

  // Calculate week stats — delegates to store's single source of truth
  const weekStats = useMemo(() => {
    const totalWorkouts = weeklyWorkoutPlan?.workouts?.length || 0;
    const completedCount = getCompletedWorkoutStats().count;
    return { totalWorkouts, completedCount };
  }, [weeklyWorkoutPlan, getCompletedWorkoutStats]);

  // Get suggested workouts from plan (upcoming ones)
  const suggestedWorkouts = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return [];

    const today = new Date().getDay();
    const dayOrder = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    return weeklyWorkoutPlan.workouts
      .filter((w) => {
        const workoutDayIndex = dayOrder.indexOf(w.dayOfWeek || "");
        const progress = getWorkoutProgress(w.id)?.progress ?? 0;
        return workoutDayIndex > today && progress < 100;
      })
      .slice(0, 3)
      .map((w) => ({
        id: w.id,
        title: w.title,
        category: w.category,
        duration: w.duration,
        estimatedCalories: w.estimatedCalories,
        difficulty: w.difficulty as "beginner" | "intermediate" | "advanced",
      }));
  }, [weeklyWorkoutPlan, getWorkoutProgress]);

  // Generate weekly workout plan
  const generateWeeklyWorkoutPlan = useCallback(async () => {
    // Allow guest users to generate plans (they have profile data)
    if (!user?.id && !isGuestMode) {
      console.log("[AUTH] No user and not guest mode, showing sign up");
      setShowGuestSignUp(true);
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      crossPlatformAlert(
        "Profile Incomplete",
        "Please complete your profile to generate a personalized workout plan.",
        [{ text: "OK" }],
      );
      return;
    }

    // Check subscription gate before hitting the server
    if (!canUseFeature('ai_generation')) {
      triggerPaywall("You've used your free AI generation for this month. Upgrade to Pro for unlimited workout plans.");
      return;
    }
    setGeneratingPlan(true);
    haptics.medium();

    try {
      const response = await aiService.generateWeeklyWorkoutPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        1,
        {
          bodyMetrics: bodyAnalysis ?? undefined,
          workoutPreferences: profileWorkoutPreferences ?? undefined,
        },
      );

      if (response.success && response.data) {
        setWeeklyWorkoutPlan(response.data);
        await saveWeeklyWorkoutPlan(response.data);
        incrementUsage('ai_generation');

        haptics.success();
        crossPlatformAlert(
          "Plan Generated!",
          `Your personalized workout plan "${response.data.planTitle}" is ready with ${response.data.workouts.length} workouts.`,
          [{ text: "Let's Go!" }],
        );
      } else {
        const errMsg = (response.error || "").toLowerCase();
        if (errMsg.includes('feature limit exceeded')) {
          triggerPaywall("You've reached your AI generation limit. Upgrade to Pro for unlimited access.");
        } else {
          crossPlatformAlert(
            "Generation Failed",
            response.error || "Failed to generate workout plan",
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.toLowerCase().includes('feature limit exceeded')) {
        triggerPaywall("You've reached your AI generation limit. Upgrade to Pro for unlimited access.");
      } else {
        crossPlatformAlert("Error", errorMessage);
      }
    } finally {
      setGeneratingPlan(false);
    }
  }, [
    user,
    profile,
    bodyAnalysis,
    profileWorkoutPreferences,
    setGeneratingPlan,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
    canUseFeature,
    incrementUsage,
    triggerPaywall,
  ]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await loadFitnessData();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadFitnessData]);

  const handleStartWorkout = useCallback(
    async (workout: DayWorkout) => {
      if (!user?.id && !isGuestMode) {
        crossPlatformAlert(
          "Authentication Required",
          "Please sign in to start workouts.",
        );
        return;
      }

      haptics.medium();

      try {
        let sessionId = "";
        try {
          sessionId = await startStoreWorkoutSession(workout);
        } catch (error) {
          sessionId = `fallback_session_${workout.id}_${Date.now()}`;
        }

        const workoutWithSession = { ...workout, sessionId };
        setSelectedWorkout(workoutWithSession);
        setShowWorkoutStartDialog(true);
      } catch (error) {
        console.error("Failed to start workout:", error);
        crossPlatformAlert("Error", "Failed to start workout. Please try again.");
      }
    },
    [user, isGuestMode, startStoreWorkoutSession],
  );

  const handleStartSelectedDayWorkout = useCallback(() => {
    if (selectedDayWorkout) {
      handleStartWorkout(selectedDayWorkout);
    } else if (!weeklyWorkoutPlan) {
      generateWeeklyWorkoutPlan();
    } else {
      const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const todayIndex = new Date().getDay();
      const workoutDays = (weeklyWorkoutPlan.workouts ?? []).map((w) =>
        w.dayOfWeek ? dayOrder.indexOf(w.dayOfWeek.toLowerCase()) : -1,
      ).filter((i) => i !== -1);
      const nextDay = dayOrder.find(
        (_, i) => i > todayIndex && workoutDays.includes(i),
      ) ?? dayOrder.find((_, i) => workoutDays.includes(i));
      const todayName = dayOrder[todayIndex];
      const capitalizedToday = todayName.charAt(0).toUpperCase() + todayName.slice(1);
      const capitalizedNext = nextDay
        ? nextDay.charAt(0).toUpperCase() + nextDay.slice(1)
        : "a future day";
      crossPlatformAlert(
        "No Workout Today",
        `${capitalizedToday} is a rest day in your current plan. Your next scheduled workout is on ${capitalizedNext}.`,
        [{ text: "OK" }],
      );
    }
  }, [
    selectedDayWorkout,
    weeklyWorkoutPlan,
    handleStartWorkout,
    generateWeeklyWorkoutPlan,
  ]);

  const handleViewWorkoutDetails = useCallback(() => {
    if (selectedDayWorkout) {
    crossPlatformAlert(
      selectedDayWorkout.title,
      `${selectedDayWorkout.description}\n\nDuration: ${selectedDayWorkout.duration} min\nCalories: ${selectedDayWorkout.estimatedCalories}\nExercises: ${selectedDayWorkout.exercises?.length ?? 0}`,
      [{ text: "OK" }],
    );
    }
  }, [selectedDayWorkout]);

  const handleRecoveryTips = useCallback(() => {
    haptics.light();
    setShowRecoveryTipsModal(true);
  }, []);

  const handleCloseRecoveryTips = useCallback(() => {
    setShowRecoveryTipsModal(false);
  }, []);

  const handleWorkoutStartConfirm = useCallback(() => {
    if (selectedWorkout) {
      setShowWorkoutStartDialog(false);
      haptics.success();

      navigation.navigate("WorkoutSession", {
        workout: {
          ...selectedWorkout,
          exercises: selectedWorkout.exercises || [],
        },
        sessionId: selectedWorkout.sessionId,
      });
    }
  }, [selectedWorkout, navigation]);

  const handleWorkoutStartCancel = useCallback(() => {
    setShowWorkoutStartDialog(false);
    setSelectedWorkout(null);
  }, []);

  const handleRepeatWorkout = useCallback(
    (workout: CompletedWorkoutItem) => {
      const originalWorkout = weeklyWorkoutPlan?.workouts?.find(
        (w) => w.id === workout.workoutId,
      );
      if (originalWorkout) {
        handleStartWorkout(originalWorkout);
      }
    },
    [weeklyWorkoutPlan, handleStartWorkout],
  );

  const handleDeleteWorkout = useCallback((workout: CompletedWorkoutItem) => {
    crossPlatformAlert("Deleted", `${workout.title} has been removed from history.`);
  }, []);

  const handleViewHistoryWorkout = useCallback((workout: CompletedWorkoutItem) => {
    crossPlatformAlert(
      workout.title,
      `Completed on ${new Date(workout.completedAt).toLocaleDateString()}\n\nDuration: ${workout.duration} min\nCalories: ${workout.caloriesBurned}`,
    );
  }, []);

  const handleStartSuggestedWorkout = useCallback(
    (suggested: SuggestedWorkoutItem) => {
      const workout = weeklyWorkoutPlan?.workouts?.find(
        (w) => w.id === suggested.id,
      );
      if (workout) {
        handleStartWorkout(workout);
      }
    },
    [weeklyWorkoutPlan, handleStartWorkout],
  );

  const handleCalendarPress = useCallback(() => {
    crossPlatformAlert("Weekly Calendar", "Full calendar view coming soon!");
  }, []);

  const handleViewFullPlan = useCallback(() => {
    if (weeklyWorkoutPlan) {
      crossPlatformAlert(
        weeklyWorkoutPlan.planTitle || "",
        `${weeklyWorkoutPlan.planDescription}\n\nTotal Workouts: ${weeklyWorkoutPlan.workouts?.length || 0}\nRest Days: ${weeklyWorkoutPlan.restDays?.length || 0}`,
      );
    }
  }, [weeklyWorkoutPlan]);

  const handleRegeneratePlan = useCallback(() => {
    crossPlatformAlert(
      "Regenerate Workout Plan",
      "This will create a new AI-generated workout plan and replace your current one. Your workout history will be preserved.\n\nContinue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Regenerate",
          style: "default",
          onPress: generateWeeklyWorkoutPlan,
        },
      ],
    );
  }, [generateWeeklyWorkoutPlan]);

  const userName = profile?.personalInfo?.name;

  return {
    state: {
      weeklyWorkoutPlan,
      isGeneratingPlan,
      workoutProgress,
      selectedDay,
      selectedDayWorkout,
      isSelectedDayRestDay,
      isSelectedDayToday,
      selectedDayProgress,
      completedWorkouts,
      weekStats,
      suggestedWorkouts,
      refreshing,
      selectedWorkout,
      showWorkoutStartDialog,
      showRecoveryTipsModal,
      userName,
      profile,
      showGuestSignUp,
    },
    actions: {
      setRefreshing,
      setSelectedDay,
      generateWeeklyWorkoutPlan,
      handleRefresh,
      handleStartWorkout,
      handleStartSelectedDayWorkout,
      handleViewWorkoutDetails,
      handleRecoveryTips,
      handleCloseRecoveryTips,
      handleWorkoutStartConfirm,
      handleWorkoutStartCancel,
      handleRepeatWorkout,
      handleDeleteWorkout,
      handleViewHistoryWorkout,
      handleStartSuggestedWorkout,
      handleCalendarPress,
      handleViewFullPlan,
      handleRegeneratePlan,
    },
    setShowGuestSignUp,
  };
};
