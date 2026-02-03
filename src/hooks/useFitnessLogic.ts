import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Stores
import { useUserStore, useFitnessStore, useAppStateStore } from "../stores";
import { useAuth } from "./useAuth";
import { useFitnessData } from "./useFitnessData";

// AI Service
import { aiService } from "../ai";
import { DayWorkout } from "../types/ai";
import { completionTrackingService } from "../services/completionTracking";
import { haptics } from "../utils/haptics";

export const useFitnessLogic = (navigation: any) => {
  // Auth & User
  const { user, isGuestMode } = useAuth();
  const { profile } = useUserStore();

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
  } = useFitnessStore();

  // Fitness Data Hook
  const { startWorkoutSession } = useFitnessData();

  // SHARED UI STATE - Single Source of Truth from appStateStore
  const {
    selectedDay,
    setSelectedDay,
    isSelectedDayToday: isSelectedDayTodayFn,
  } = useAppStateStore();

  // Local UI State
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(
    null,
  );
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);
  const [showRecoveryTipsModal, setShowRecoveryTipsModal] = useState(false);

  // Load data on mount and subscribe to completion events
  useEffect(() => {
    loadFitnessData();

    console.log(
      "[EVENT] useFitnessLogic: Setting up completion event listener",
    );
    const unsubscribe = completionTrackingService.subscribe((event) => {
      console.log("[EVENT] useFitnessLogic: Received completion event:", event);
      if (event.type === "workout") {
        loadFitnessData();
      }
    });

    return () => {
      console.log(
        "[EVENT] useFitnessLogic: Unsubscribing from completion events",
      );
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
  const isSelectedDayToday = isSelectedDayTodayFn();

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

  // Calculate week stats
  const weekStats = useMemo(() => {
    const totalWorkouts = weeklyWorkoutPlan?.workouts?.length || 0;
    const completedCount = Object.values(workoutProgress).filter(
      (p) => p.progress === 100,
    ).length;
    return { totalWorkouts, completedCount };
  }, [weeklyWorkoutPlan, workoutProgress]);

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
    if (!user?.id || user.id.startsWith("guest")) {
      console.log("[AUTH] User not authenticated for AI generation:", user?.id);
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI workout plans. Your fitness data will be securely stored and used for customized recommendations.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Up",
            onPress: () => {
              // Navigate to auth screen - in a real app this would navigate
            },
          },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        "Profile Incomplete",
        "Please complete your profile to generate a personalized workout plan.",
        [{ text: "OK" }],
      );
      return;
    }

    setGeneratingPlan(true);
    haptics.medium();

    try {
      const response = await aiService.generateWeeklyWorkoutPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        1,
      );

      if (response.success && response.data) {
        setWeeklyWorkoutPlan(response.data);
        await saveWeeklyWorkoutPlan(response.data);

        haptics.success();
        Alert.alert(
          "Plan Generated!",
          `Your personalized workout plan "${response.data.planTitle}" is ready with ${response.data.workouts.length} workouts.`,
          [{ text: "Let's Go!" }],
        );
      } else {
        Alert.alert(
          "Generation Failed",
          response.error || "Failed to generate workout plan",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", errorMessage);
    } finally {
      setGeneratingPlan(false);
    }
  }, [
    user,
    profile,
    setGeneratingPlan,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
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
        Alert.alert(
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
        Alert.alert("Error", "Failed to start workout. Please try again.");
      }
    },
    [user, isGuestMode, startStoreWorkoutSession],
  );

  const handleStartSelectedDayWorkout = useCallback(() => {
    if (selectedDayWorkout) {
      handleStartWorkout(selectedDayWorkout as any);
    } else if (!weeklyWorkoutPlan) {
      generateWeeklyWorkoutPlan();
    }
  }, [
    selectedDayWorkout,
    weeklyWorkoutPlan,
    handleStartWorkout,
    generateWeeklyWorkoutPlan,
  ]);

  const handleViewWorkoutDetails = useCallback(() => {
    if (selectedDayWorkout) {
      Alert.alert(
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
        sessionId: (selectedWorkout as any).sessionId,
      });
    }
  }, [selectedWorkout, navigation]);

  const handleWorkoutStartCancel = useCallback(() => {
    setShowWorkoutStartDialog(false);
    setSelectedWorkout(null);
  }, []);

  const handleRepeatWorkout = useCallback(
    (workout: any) => {
      const originalWorkout = weeklyWorkoutPlan?.workouts?.find(
        (w) => w.id === workout.workoutId,
      );
      if (originalWorkout) {
        handleStartWorkout(originalWorkout as any);
      }
    },
    [weeklyWorkoutPlan, handleStartWorkout],
  );

  const handleDeleteWorkout = useCallback((workout: any) => {
    Alert.alert("Deleted", `${workout.title} has been removed from history.`);
  }, []);

  const handleViewHistoryWorkout = useCallback((workout: any) => {
    Alert.alert(
      workout.title,
      `Completed on ${new Date(workout.completedAt).toLocaleDateString()}\n\nDuration: ${workout.duration} min\nCalories: ${workout.caloriesBurned}`,
    );
  }, []);

  const handleStartSuggestedWorkout = useCallback(
    (suggested: any) => {
      const workout = weeklyWorkoutPlan?.workouts?.find(
        (w) => w.id === suggested.id,
      );
      if (workout) {
        handleStartWorkout(workout as any);
      }
    },
    [weeklyWorkoutPlan, handleStartWorkout],
  );

  const handleCalendarPress = useCallback(() => {
    Alert.alert("Weekly Calendar", "Full calendar view coming soon!");
  }, []);

  const handleViewFullPlan = useCallback(() => {
    if (weeklyWorkoutPlan) {
      Alert.alert(
        weeklyWorkoutPlan.planTitle || "",
        `${weeklyWorkoutPlan.planDescription}\n\nTotal Workouts: ${weeklyWorkoutPlan.workouts?.length || 0}\nRest Days: ${weeklyWorkoutPlan.restDays?.length || 0}`,
      );
    }
  }, [weeklyWorkoutPlan]);

  const handleRegeneratePlan = useCallback(() => {
    Alert.alert(
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
  };
};
