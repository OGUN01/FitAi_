import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { generateUUID } from "../utils/uuid";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

// Stores
import {
  useFitnessStore,
  useAppStateStore,
  useProfileStore,
  useUserStore,
} from "../stores";
import { useAchievementStore } from "../stores/achievementStore";
import { useAuth } from "./useAuth";
import { supabase } from "../services/supabase";

// AI Service
import { aiService } from "../ai";
import { DayWorkout } from "../types/ai";
import { completionTrackingService } from "../services/completionTracking";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "../services/calorieCalculator";
import { haptics } from "../utils/haptics";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { checkProactiveDeload } from "../services/deloadService";
import {
  findCompletedSessionForWorkout,
  getWorkoutDayKey,
  getWorkoutSlotKey,
} from "../utils/workoutIdentity";
import { getCurrentWeekStart, getWeekStartForDate } from "../utils/weekUtils";
import {
  buildLegacyFitnessGoals,
  buildLegacyPersonalInfo,
} from "../utils/profileLegacyAdapter";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";

// Type for completed workout history items
interface CompletedWorkoutItem {
  id: string;
  sessionId?: string;
  workoutId: string;
  title: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  completedAt: string;
  progress: number;
  workoutSnapshot?: {
    title: string;
    category: string;
    duration: number;
    exercises: Array<{
      name: string;
      sets: number;
      reps: number | string;
      exerciseId?: string;
      duration?: number;
      restTime?: number;
    }>;
  };
}

const WORKOUT_CATEGORY_VALUES = [
  "strength",
  "cardio",
  "flexibility",
  "hiit",
  "yoga",
  "pilates",
  "hybrid",
] as const;

const normalizeWorkoutCategory = (value: string): DayWorkout["category"] =>
  WORKOUT_CATEGORY_VALUES.includes(value as DayWorkout["category"])
    ? (value as DayWorkout["category"])
    : "strength";

// Navigation interface matching MainNavigation's shape
export interface FitnessNavigation {
  // eslint-disable-next-line no-unused-vars
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

export const useFitnessLogic = (navigation: FitnessNavigation) => {
  // Auth & User
  const { user, isGuestMode } = useAuth();
  const profile = useUserStore((state) => state.profile);
  const {
    bodyAnalysis,
    workoutPreferences: profileWorkoutPreferences,
    personalInfo: profilePersonalInfo,
  } = useProfileStore();
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

  // Fitness Store
  const {
    weeklyWorkoutPlan,
    customWeeklyPlan,
    isGeneratingPlan,
    workoutProgress,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
    setGeneratingPlan,
    startWorkoutSession: startStoreWorkoutSession,
    loadData: loadFitnessData,
    getWorkoutProgress,
    getCompletedWorkoutStats,
    updateWorkoutProgress,
    getActivePlan,
  } = useFitnessStore();
  const activePlanSource = useFitnessStore((state) => state.activePlanSource);
  const completedSessions = useFitnessStore((state) => state.completedSessions);

  // The plan to display — follows the user's toggle between AI and Custom
  const displayPlan = getActivePlan();

  const _hasHydrated = useFitnessStore((state) => state._hasHydrated);
  const completedSessionsHydrated = useFitnessStore(
    (state) => state.completedSessionsHydrated,
  );
  const markCompletedSessionsHydrated = useFitnessStore(
    (state) => state.markCompletedSessionsHydrated,
  );

  // SHARED UI STATE - Single Source of Truth from appStateStore
  const {
    selectedDay,
    setSelectedDay,
    isSelectedDayToday: isSelectedDayTodayFn,
  } = useAppStateStore();
  // Subscription store for AI generation gating
  const { canUseFeature, incrementUsage, triggerPaywall } =
    useSubscriptionStore();

  // Local UI State
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<
    | (DayWorkout & {
        sessionId?: string;
        resumeExerciseIndex?: number;
        isResuming?: boolean;
      })
    | null
  >(null);
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);
  const [showRecoveryTipsModal, setShowRecoveryTipsModal] = useState(false);
  const [workoutDetailsWorkout, setWorkoutDetailsWorkout] =
    useState<DayWorkout | null>(null);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [proactiveDeload, setProactiveDeload] = useState<{
    visible: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadFitnessData();

    const mesocycleWeek = useFitnessStore.getState().getMesocycleWeek();
    if (mesocycleWeek > 0) {
      const suggestion = checkProactiveDeload(mesocycleWeek);
      if (suggestion) {
        setProactiveDeload({ visible: true, message: suggestion.reason });
      }
    }

    const unsubscribe = completionTrackingService.subscribe((event) => {
      if (event.type === "workout") {
        loadFitnessData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadFitnessData, isGuestMode]);

  // Backfill completedSessions from workoutProgress for users upgrading from older versions.
  // Guards: _hasHydrated (Zustand hydration complete) + completedSessionsHydrated (run once per session)
  useEffect(() => {
    if (!_hasHydrated || completedSessionsHydrated) return;

    const {
      workoutProgress: wp,
      weeklyWorkoutPlan: plan,
      customWeeklyPlan: customPlan,
      addCompletedSession,
      completedSessions: currentCompletedSessions,
    } = useFitnessStore.getState();
    Object.entries(wp).forEach(([workoutId, progress]) => {
      if (!progress.completedAt || progress.progress < 100) return;
      const workout = plan?.workouts?.find((w) => w.id === workoutId) ?? customPlan?.workouts?.find((w) => w.id === workoutId);
      if (!workout) return;
      if (
        findCompletedSessionForWorkout({
          completedSessions: currentCompletedSessions,
          workout,
          plan,
          weekStart: getWeekStartForDate(progress.completedAt),
        })
      ) {
        return;
      }

      const weekStart = getWeekStartForDate(progress.completedAt);

      addCompletedSession({
        sessionId: progress.sessionId || `backfill-${workoutId}`,
        type: "planned" as const,
        workoutId,
        plannedDayKey: getWorkoutDayKey(workout),
        planSlotKey: getWorkoutSlotKey(workout, plan || undefined),
        workoutSnapshot: {
          title: workout.title,
          category: workout.category || "general",
          duration: workout.duration || 0,
          exercises: (workout.exercises || []).map((ex: any) => ({
            name: ex.exerciseName || ex.name || "",
            sets: typeof ex.sets === "number" ? ex.sets : 0,
            reps: typeof ex.reps === "number" ? ex.reps : 0,
            exerciseId: ex.exerciseId || ex.id,
            duration: ex.duration,
            restTime: ex.restTime,
          })),
        },
        caloriesBurned: progress.caloriesBurned || 0,
        durationMinutes: workout.duration || 0,
        completedAt: progress.completedAt,
        weekStart,
      });
    });

    markCompletedSessionsHydrated();
    // SSOT Fix 19: recompute streak after backfill
    useAchievementStore.getState().updateCurrentStreak();
  }, [_hasHydrated, completedSessionsHydrated, markCompletedSessionsHydrated]);

  // Backfill caloriesBurned for completed workouts that are missing it.
  // Reads canonical completedSessions first so values stay attached to the
  // correct planned slot instead of title-matching across history.
  const backfilledWorkoutIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.id || !weeklyWorkoutPlan?.workouts) return;

    const currentWorkoutProgress = useFitnessStore.getState().workoutProgress;
    const toBackfill = weeklyWorkoutPlan.workouts.filter((w) => {
      if (backfilledWorkoutIds.current.has(w.id)) return false;
      const p = currentWorkoutProgress[w.id];
      return (
        p?.progress === 100 &&
        (p.caloriesBurned == null || p.caloriesBurned === 0)
      );
    });

    if (toBackfill.length === 0) return;

    // Mark as attempted immediately to prevent re-runs
    toBackfill.forEach((w) => backfilledWorkoutIds.current.add(w.id));

    const userWeight = resolveCurrentWeightFromStores({
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    }).value;

    toBackfill.forEach((w) => {
      const completedSession = findCompletedSessionForWorkout({
        completedSessions,
        workout: w,
        plan: weeklyWorkoutPlan,
        weekStart: getCurrentWeekStart(),
      });
      if (
        completedSession?.caloriesBurned &&
        completedSession.caloriesBurned > 0
      ) {
        updateWorkoutProgress(w.id, 100, {
          caloriesBurned: completedSession.caloriesBurned,
        });
        return;
      }

      if (userWeight && userWeight > 0 && w.exercises?.length) {
        const inputs: ExerciseCalorieInput[] = w.exercises.map((ex: any) => ({
          exerciseId: ex.exerciseId || ex.id,
          name: ex.exerciseName || ex.name,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          restTime: ex.restTime,
        }));
        const result = calculateWorkoutCalories(inputs, userWeight);
        if (result.totalCalories > 0) {
          updateWorkoutProgress(w.id, 100, {
            caloriesBurned: result.totalCalories,
          });
        }
      }
    });
  }, [
    user?.id,
    weeklyWorkoutPlan,
    updateWorkoutProgress,
    completedSessions,
    bodyAnalysis,
  ]);

  // Get selected day's workouts (array, since there might be multiple per day)
  const selectedDayWorkouts = useMemo(() => {
    if (!displayPlan?.workouts) return [];
    return displayPlan.workouts.filter(
      (w) => w.dayOfWeek === selectedDay,
    );
  }, [displayPlan, selectedDay]);

  // Keep legacy single-workout selector for backwards compatibility
  const selectedDayWorkout = useMemo(() => {
    return selectedDayWorkouts.length > 0 ? selectedDayWorkouts[0] : null;
  }, [selectedDayWorkouts]);

  // Check if selected day is rest day
  // IMPORTANT: restDays uses Monday-based indices [0=monday, 1=tuesday, ..., 6=sunday]
  // This matches DAY_KEYS in WeeklyPlanOverview and calendarWorkoutData in FitnessScreen
  const isSelectedDayRestDay = useMemo(() => {
    if (!displayPlan?.restDays) return false;
    const DAY_KEYS_MON = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const dayIndex = DAY_KEYS_MON.indexOf(selectedDay);
    // restDays may contain number indices (Monday-based) or string day names
    return displayPlan.restDays.some((d: number | string) =>
      typeof d === "string" ? d === selectedDay : d === dayIndex,
    );
  }, [displayPlan, selectedDay]);

  // Check if selected day is today - from appStateStore
  const isSelectedDayToday = useMemo(
    () => isSelectedDayTodayFn(),
    [isSelectedDayTodayFn],
  );

  // Get selected day's workout progress
  const selectedDayProgress = useMemo(() => {
    if (!selectedDayWorkout) return 0;
    return getWorkoutProgress(selectedDayWorkout.id)?.progress ?? 0;
  }, [selectedDayWorkout, getWorkoutProgress]);

  // Get completed workouts for history
  const completedWorkouts = useMemo(() => {
    return completedSessions
      .filter((s) => s.completedAt)
      .map((s) => ({
        id: `history_${s.sessionId}`,
        sessionId: s.sessionId,
        workoutId: s.workoutId,
        title: s.workoutSnapshot.title,
        category: s.workoutSnapshot.category,
        duration: s.durationMinutes || s.workoutSnapshot.duration,
        caloriesBurned: s.caloriesBurned,
        completedAt: s.completedAt,
        progress: 100,
        workoutSnapshot: s.workoutSnapshot,
      }))
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
  }, [completedSessions]);

  // Calculate week stats — filtered to only count sessions from the active display plan
  const weekStats = useMemo(() => {
    const totalWorkouts = displayPlan?.workouts?.length || 0;
    const displayPlanIds = new Set(displayPlan?.workouts?.map((w) => w.id) || []);
    const completedCount = completedSessions.filter(
      (s) => s.type === "planned" && displayPlanIds.has(s.workoutId)
    ).length;
    return { totalWorkouts, completedCount };
  }, [displayPlan, completedSessions]);

  // Generate weekly workout plan
  const generateWeeklyWorkoutPlan = useCallback(async () => {
    // Allow guest users to generate plans (they have profile data)
    if (!user?.id && !isGuestMode) {
      setShowGuestSignUp(true);
      return;
    }

    if (!legacyPersonalInfo || !mergedFitnessGoals?.primary_goals?.length) {
      crossPlatformAlert(
        "Profile Incomplete",
        "Please complete your profile to generate a personalized workout plan.",
        [{ text: "OK" }],
      );
      return;
    }

    // Check subscription gate before hitting the server
    if (!canUseFeature("ai_generation")) {
      triggerPaywall(
        "You've used your free AI generation for this month. Upgrade to Pro for unlimited workout plans.",
      );
      return;
    }
    setGeneratingPlan(true);
    haptics.medium();

    try {
      // GAP-13: Use actual mesocycle week (1-4) rather than always sending 1.
      // getMesocycleWeek() calculates weeks elapsed since first plan generation.
      // Returns 0 if no start date set yet; we clamp to min 1 so Worker doesn't get 0.
      const mesocycleWeek = Math.max(1, Math.min(4, useFitnessStore.getState().getMesocycleWeek() || 1));

      const response = await aiService.generateWeeklyWorkoutPlan(
        legacyPersonalInfo,
        mergedFitnessGoals,
        mesocycleWeek,
        {
          bodyMetrics: bodyAnalysis ?? undefined,
          workoutPreferences: profileWorkoutPreferences ?? undefined,
          regenerationSeed: Date.now() % 1000000, // Varies exercise selection on each generation
        },
      );

      if (response.success && response.data) {
        setWeeklyWorkoutPlan(response.data);
        await saveWeeklyWorkoutPlan(response.data);
        incrementUsage("ai_generation");

        if (!useFitnessStore.getState().mesocycleStartDate) {
          useFitnessStore
            .getState()
            .setMesocycleStartDate(new Date().toISOString());
        }

        haptics.success();
        crossPlatformAlert(
          "Plan Generated!",
          `Your personalized workout plan "${response.data.planTitle}" is ready with ${response.data.workouts.length} workouts.`,
          [{ text: "Let's Go!" }],
        );
      } else {
        const errMsg = (response.error || "").toLowerCase();
        if (errMsg.includes("feature limit exceeded")) {
          triggerPaywall(
            "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
          );
        } else {
          crossPlatformAlert(
            "Generation Failed",
            response.error || "Failed to generate workout plan",
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.toLowerCase().includes("feature limit exceeded")) {
        triggerPaywall(
          "You've reached your AI generation limit. Upgrade to Pro for unlimited access.",
        );
      } else {
        crossPlatformAlert("Error", errorMessage);
      }
    } finally {
      setGeneratingPlan(false);
    }
  // NOTE: 11 deps are justified — each one guards a distinct branch of the
  // generation flow (auth gate, profile completeness, subscription gate,
  // store writes). Splitting would lose memoization benefits.
  }, [
    user,
    legacyPersonalInfo,
    mergedFitnessGoals,
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
        // Single source of truth for resume: the persisted workoutProgress entry.
        // currentWorkoutSession is cleared on exit, so we never rely on stale
        // in-memory state where exercises[].completed was never updated.
        const savedProgress = useFitnessStore
          .getState()
          .getWorkoutProgress(workout.id);
        const progressPct = savedProgress?.progress ?? 0;
        const savedExerciseIndex = savedProgress?.exerciseIndex;
        // hasPartialProgress is true when there's set-based progress OR when
        // exerciseIndex > 0 (user navigated forward but may have done no sets).
        const hasPartialProgress =
          (progressPct > 0 && progressPct < 100) ||
          (savedExerciseIndex !== undefined && savedExerciseIndex > 0);

        // Fallback: check in-memory session only when exitWorkout was NOT called
        // (e.g. user pressed hardware back button during the session).
        const existingSession =
          useFitnessStore.getState().currentWorkoutSession;
        const inMemoryResume =
          existingSession && existingSession.workoutId === workout.id;

        let resumeExerciseIndex = 0;

        if (hasPartialProgress) {
          // Resume path: use saved exerciseIndex (precise) or fall back to progress %.
          if (savedExerciseIndex !== undefined) {
            resumeExerciseIndex = savedExerciseIndex;
          } else if (inMemoryResume) {
            const firstIncomplete = existingSession.exercises.findIndex(
              (ex) => !ex.completed,
            );
            resumeExerciseIndex =
              firstIncomplete !== -1
                ? firstIncomplete
                : existingSession.exercises.length - 1;
          } else {
            const totalExercises = workout.exercises?.length || 1;
            resumeExerciseIndex = Math.min(
              Math.floor((progressPct / 100) * totalExercises),
              totalExercises - 1,
            );
          }
        }

        // Generate a local placeholder ID here — the real DB session is created
        // only if/when the user confirms the dialog (in handleWorkoutStartConfirm).
        // This prevents store mutations (progress reset, new session records) from
        // happening when the user just opens then cancels the dialog.
        const pendingSessionId = generateUUID();

        // isResuming drives the dialog title: "Resume Workout?" vs "Ready to Start?"
        const isResuming = hasPartialProgress || resumeExerciseIndex > 0;
        const workoutWithSession = {
          ...workout,
          sessionId: pendingSessionId,
          resumeExerciseIndex,
          isResuming,
        };
        setSelectedWorkout(workoutWithSession);
        setShowWorkoutStartDialog(true);
      } catch (error) {
        console.error("Failed to start workout:", error);
        crossPlatformAlert(
          "Error",
          "Failed to start workout. Please try again.",
        );
      }
    },
    [user, isGuestMode],
  );

  const handleStartSelectedDayWorkout = useCallback(
    (workoutArg?: DayWorkout) => {
      const targetWorkout = workoutArg || selectedDayWorkout;
      if (targetWorkout) {
        handleStartWorkout(targetWorkout);
      } else if (!displayPlan) {
        if (activePlanSource === 'ai') {
          generateWeeklyWorkoutPlan();
        } else {
          crossPlatformAlert(
            "No Plan",
            "It's a rest day on your custom schedule.",
            [{ text: "OK" }],
          );
        }
      } else {
        if (activePlanSource !== 'ai') {
          crossPlatformAlert(
            "Rest Day",
            "It's a rest day on your custom schedule.",
            [{ text: "OK" }],
          );
          return;
        }
        const dayOrder = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const todayIndex = new Date().getDay();
        const workoutDays = (displayPlan.workouts ?? [])
          .map((w) =>
            w.dayOfWeek ? dayOrder.indexOf(w.dayOfWeek.toLowerCase()) : -1,
          )
          .filter((i) => i !== -1);
        const nextDay =
          dayOrder.find((_, i) => i > todayIndex && workoutDays.includes(i)) ??
          dayOrder.find((_, i) => workoutDays.includes(i));
        const todayName = dayOrder[todayIndex];
        const capitalizedToday =
          todayName.charAt(0).toUpperCase() + todayName.slice(1);
        const capitalizedNext = nextDay
          ? nextDay.charAt(0).toUpperCase() + nextDay.slice(1)
          : "a future day";
        crossPlatformAlert(
          "No Workout Today",
          `${capitalizedToday} is a rest day in your current plan. Your next scheduled workout is on ${capitalizedNext}.`,
          [{ text: "OK" }],
        );
      }
    },
    [
      selectedDayWorkout,
      displayPlan,
      activePlanSource,
      handleStartWorkout,
      generateWeeklyWorkoutPlan,
    ],
  );

  const handleViewWorkoutDetails = useCallback(
    (workoutArg?: DayWorkout) => {
      const targetWorkout = workoutArg || selectedDayWorkout;
      if (targetWorkout) {
        setWorkoutDetailsWorkout(targetWorkout);
      }
    },
    [selectedDayWorkout],
  );

  const handleCloseWorkoutDetails = useCallback(() => {
    setWorkoutDetailsWorkout(null);
  }, []);

  const handleRecoveryTips = useCallback(() => {
    haptics.light();
    setShowRecoveryTipsModal(true);
  }, []);

  const handleCloseRecoveryTips = useCallback(() => {
    setShowRecoveryTipsModal(false);
  }, []);

  const handleWorkoutStartConfirm = useCallback(async () => {
    if (selectedWorkout) {
      setShowWorkoutStartDialog(false);
      haptics.success();

      // Create the real DB session only on confirmation — not on dialog open —
      // so canceling the dialog never side-effects the store or resets progress.
      let finalSessionId = selectedWorkout.sessionId;
      if (!selectedWorkout.isResuming) {
        // Fresh start: create a new session record now.
        try {
          finalSessionId = await startStoreWorkoutSession(selectedWorkout);
        } catch (error) {
          // Keep the locally-generated UUID as fallback.
          console.error(
            "[useFitnessLogic] startStoreWorkoutSession failed:",
            error,
          );
        }
      }
      // Resume: reuse the pending UUID — the existing session record in DB is
      // still valid; WorkoutSessionScreen's completionTracking calls reference it.

      navigation.navigate("WorkoutSession", {
        workout: {
          ...selectedWorkout,
          exercises: selectedWorkout.exercises || [],
        },
        sessionId: finalSessionId,
        resumeExerciseIndex: selectedWorkout.resumeExerciseIndex ?? 0,
      });
    }
  }, [selectedWorkout, navigation, startStoreWorkoutSession]);

  const handleWorkoutStartCancel = useCallback(() => {
    setShowWorkoutStartDialog(false);
    setSelectedWorkout(null);
  }, []);

  const handleRepeatWorkout = useCallback(
    (workout: CompletedWorkoutItem) => {
      const normalizedCategory = normalizeWorkoutCategory(workout.category);
      const originalWorkout =
        weeklyWorkoutPlan?.workouts?.find((w) => w.id === workout.workoutId) ??
        customWeeklyPlan?.workouts?.find((w) => w.id === workout.workoutId) ??
        ({
          id: workout.workoutId || `history-${workout.sessionId}`,
          title: workout.title,
          description: `Repeat workout based on your ${workout.title} history entry.`,
          category: normalizedCategory,
          duration: workout.duration,
          estimatedCalories: workout.caloriesBurned,
          exercises: (workout.workoutSnapshot?.exercises || []).map(
            (exercise) => ({
              exerciseId: exercise.exerciseId || exercise.name,
              name: exercise.name,
              exerciseName: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              duration: exercise.duration,
              restTime: exercise.restTime,
            }),
          ),
          difficulty: "medium",
          tags: ["history-repeat"],
          equipment: [],
          targetMuscleGroups: [],
          icon: "fitness-outline",
          dayOfWeek: selectedDay,
          subCategory: normalizedCategory,
          intensityLevel: "moderate",
          warmUp: [],
          coolDown: [],
          progressionNotes: [],
          safetyConsiderations: [],
          expectedBenefits: [],
          isExtra: true,
          aiGenerated: false,
          isPersonalized: true,
          createdAt: workout.completedAt,
        } as unknown as DayWorkout);

      handleStartWorkout(originalWorkout);
    },
    [weeklyWorkoutPlan, customWeeklyPlan, handleStartWorkout, selectedDay],
  );

  const handleDeleteWorkout = useCallback(
    async (workout: CompletedWorkoutItem) => {
      const storeState = useFitnessStore.getState();
      const previousWorkoutProgress = storeState.workoutProgress;
      const previousCompletedSessions = storeState.completedSessions;
      const nextWorkoutProgress = { ...previousWorkoutProgress };

      if (
        nextWorkoutProgress[workout.workoutId]?.sessionId === workout.sessionId
      ) {
        delete nextWorkoutProgress[workout.workoutId];
      }

      useFitnessStore.setState({
        workoutProgress: nextWorkoutProgress,
        completedSessions: previousCompletedSessions.filter(
          (session) => session.sessionId !== workout.sessionId,
        ),
      });

      try {
        if (workout.sessionId) {
          const { error } = await supabase
            .from("workout_sessions")
            .delete()
            .eq("id", workout.sessionId);
          if (error) {
            throw error;
          }
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id) {
            const { error } = await supabase
              .from("workout_sessions")
              .delete()
              .eq("workout_id", workout.workoutId)
              .eq("user_id", user.id)
              .eq("completed_at", workout.completedAt);
            if (error) {
              throw error;
            }
          }
        }
      } catch (err) {
        useFitnessStore.setState({
          workoutProgress: previousWorkoutProgress,
          completedSessions: previousCompletedSessions,
        });
        console.warn("[useFitnessLogic] Supabase delete error:", err);
        crossPlatformAlert(
          "Delete Failed",
          `We couldn't remove ${workout.title} from your history. Please try again.`,
        );
        return;
      }

      crossPlatformAlert(
        "Deleted",
        `${workout.title} has been removed from history.`,
      );
    },
    [],
  );

  const handleViewHistoryWorkout = useCallback(
    (workout: CompletedWorkoutItem) => {
      crossPlatformAlert(
        workout.title,
        `Completed on ${new Date(workout.completedAt).toLocaleDateString()}\n\nDuration: ${workout.duration ?? "N/A"} min\nCalories: ${workout.caloriesBurned ?? "N/A"}`,
      );
    },
    [],
  );

  const handleCalendarPress = useCallback(() => {
    // Reset calendar to today's date
    const { resetToToday } = useAppStateStore.getState();
    resetToToday();
    haptics.light();
  }, []);

  const handleViewFullPlan = useCallback(() => {
    if (displayPlan) {
      crossPlatformAlert(
        displayPlan.planTitle || "",
        `${displayPlan.planDescription}\n\nTotal Workouts: ${displayPlan.workouts?.length || 0}\nRest Days: ${displayPlan.restDays?.length || 0}`,
      );
    }
  }, [displayPlan]);

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

  // SSOT: profileStore.personalInfo is authoritative; userStore profile is legacy fallback
  const profileFitnessName =
    `${profilePersonalInfo?.first_name || ""} ${profilePersonalInfo?.last_name || ""}`.trim();
  const userName = profileFitnessName || legacyPersonalInfo?.name;

  // Build a mergedProfile with SSOT fitnessGoals injected so downstream
  // consumers (PlanSection → EmptyPlanState) see the correct data.
  const mergedProfile = mergedFitnessGoals
    ? { personalInfo: legacyPersonalInfo, fitnessGoals: mergedFitnessGoals }
    : { personalInfo: legacyPersonalInfo, fitnessGoals: null };

  return {
    state: {
      weeklyWorkoutPlan: displayPlan,
      isGeneratingPlan,
      workoutProgress,
      selectedDay,
      selectedDayWorkout,
      selectedDayWorkouts,
      isSelectedDayRestDay,
      isSelectedDayToday,
      selectedDayProgress,
      completedWorkouts,
      weekStats,
      completedSessions,
      refreshing,
      selectedWorkout,
      showWorkoutStartDialog,
      showRecoveryTipsModal,
      workoutDetailsWorkout,
      userName,
      profile: mergedProfile, // SSOT: mergedProfile has profileStore fitnessGoals injected
      showGuestSignUp,
      proactiveDeload,
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
      handleCloseWorkoutDetails,
      handleWorkoutStartConfirm,
      handleWorkoutStartCancel,
      handleRepeatWorkout,
      handleDeleteWorkout,
      handleViewHistoryWorkout,
      handleCalendarPress,
      handleViewFullPlan,
      handleRegeneratePlan,
      dismissProactiveDeload: () => setProactiveDeload(null),
    },
    setShowGuestSignUp,
  };
};
