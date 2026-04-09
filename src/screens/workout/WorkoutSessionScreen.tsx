import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  TouchableOpacity,
  Pressable,
  BackHandler,
  Platform,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { getLocalDateString } from "../../utils/weekUtils";
import { DayWorkout } from "../../types/ai";
import { ExerciseGifPlayer } from "../../components/fitness/ExerciseGifPlayer";
import { ExerciseInstructionModal } from "../../components/fitness/ExerciseInstructionModal";
import { ExerciseSessionModal } from "../../components/fitness/ExerciseSessionModal";
import completionTrackingService from "../../services/completionTracking";
import { completeExtraWorkout } from "../../services/extraWorkoutService";
import { analyticsHelpers } from "../../stores/analyticsStore";
import { useFitnessStore } from "../../stores/fitnessStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exerciseFilterService } from "../../services/exerciseFilterService";
import { getCurrentUserId } from "../../services/authUtils";
import { supabase } from "../../services/supabase";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { useWorkoutAchievements } from "../../hooks/useWorkoutAchievements";
import { useWorkoutAnimations } from "../../hooks/useWorkoutAnimations";
import { WorkoutHeader } from "../../components/workout/WorkoutHeader";
import { WorkoutProgressBar } from "../../components/workout/WorkoutProgressBar";
import { SetLogModal, SetLogData } from "../../components/workout/SetLogModal";
import { RestTimer } from "../../features/workouts/components/RestTimer";
import { DeloadModal } from "../../features/workouts/components/DeloadModal";
import { parseTimedExercise } from "../../utils/exerciseDuration";
import { startTimer } from "../../services/restTimerService";
import {
  checkReactiveDeload,
  RecentSessionForDeload,
  DeloadSuggestion,
} from "../../services/deloadService";
import { exerciseHistoryService } from "../../services/exerciseHistoryService";
import { AchievementNotifications } from "../../components/workout/AchievementNotifications";
import { WorkoutErrorState } from "../../components/workout/WorkoutErrorState";
import { NextExercisePreview } from "../../components/workout/NextExercisePreview";
import { useProfileStore } from "../../stores/profileStore";
import {
  showWorkoutCompleteErrorAlert,
  showExitWorkoutAlert,
} from "./workoutAlerts";
import { WorkoutCompleteDialog } from "../../components/ui/CustomDialog";
import { getCalibrationStatus, CalibrationStatus } from "../../services/calibrationService";
import { generateWarmupSets, classifyExercise, WarmupSet } from "../../services/warmupService";

interface WorkoutSessionScreenProps {
  route: {
    params: {
      workout: DayWorkout;
      sessionId?: string;
      resumeExerciseIndex?: number;
      isExtra?: boolean;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

const safeString = (value: any, fallback: string = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { workout, sessionId, resumeExerciseIndex, isExtra } = route.params;
  const insets = useSafeAreaInsets();

  const parsedResumeIndex = safeNumber(resumeExerciseIndex, 0);
  const session = useWorkoutSession(
    (workout ?? { exercises: [] }) as DayWorkout,
    sessionId,
    parsedResumeIndex,
  );
  const achievements = useWorkoutAchievements();
  const animations = useWorkoutAnimations();

  const [completeDialog, setCompleteDialog] = useState<{
    visible: boolean;
    durationMins: number;
    calories: number;
    exercisesCompleted: number;
    setsCompleted: number;
    onViewProgress: () => void;
    onDone: (rating?: number, notes?: string) => void;
  } | null>(null);

  // Guard against double-tap on "Finish Workout" creating two Supabase rows (Bug 1)
  const isCompletingRef = useRef(false);
  // Stores the Supabase-generated row ID returned by completeExtraWorkout (Bug 3)
  const supabaseSessionIdRef = useRef<string | null>(null);

  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  // Total duration of the current rest period — for RestTimer progress bar
  const [restTotalDuration, setRestTotalDuration] = useState<number>(60);
  // When true, rest timer completion advances to next exercise (not next set)
  const [isInterExerciseRest, setIsInterExerciseRest] = useState(false);
  const [deloadSuggestion, setDeloadSuggestion] =
    useState<DeloadSuggestion | null>(null);

  // Calibration state: keyed by exerciseId
  const [calibrationMap, setCalibrationMap] = useState<Record<string, CalibrationStatus>>({});
  // Warm-up sets for current exercise
  const [warmupSets, setWarmupSets] = useState<WarmupSet[]>([]);
  const [warmupDoneMap, setWarmupDoneMap] = useState<Record<number, boolean>>({});

  const userId = getCurrentUserId() || undefined;
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);
  const userUnits: "kg" | "lbs" =
    personalInfo?.units === "imperial" ? "lbs" : "kg";
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  if (!bodyAnalysis?.current_weight_kg) console.warn('[WorkoutSession] User weight unavailable — defaulting to 70 kg for calorie calculation');
  const userWeightKg = bodyAnalysis?.current_weight_kg || 70;
  const experienceLevel: 'beginner' | 'intermediate' | 'advanced' =
    workoutPreferences?.intensity ?? 'beginner';

  const getExerciseName = useCallback((exerciseId: string): string => {
    if (!exerciseId) return "Exercise";
    const exercise = exerciseFilterService.getExerciseById(exerciseId);
    if (exercise?.name) return exercise.name;
    return safeString(exerciseId, "Exercise")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      session.setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [session.setCurrentTime]);

  // Load calibration status for each exercise once on mount
  useEffect(() => {
    if (!userId || !workout?.exercises) return;
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId) continue;
      getCalibrationStatus(
        exercise.exerciseId,
        userId,
        userWeightKg,
        experienceLevel,
      ).then((status) => {
        setCalibrationMap((prev) => ({
          ...prev,
          [exercise.exerciseId!]: status,
        }));
      }).catch(() => { /* non-blocking — defaults to no calibration */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load warm-up sets whenever exercise changes
  useEffect(() => {
    if (!userId || !session.currentExercise?.exerciseId) {
      setWarmupSets([]);
      return;
    }
    const exId = session.currentExercise.exerciseId;
    const kind = classifyExercise(exId);
    if (kind === 'bodyweight' || kind === 'time_based') {
      setWarmupSets([]);
      return;
    }
    exerciseHistoryService
      .getBestEstimated1RM(exId, userId)
      .then((e1rm) => {
        setWarmupSets(generateWarmupSets(e1rm, kind));
        setWarmupDoneMap({});
      })
      .catch(() => setWarmupSets([]));
  }, [session.currentExerciseIndex, userId]);

  useEffect(() => {
    return () => {
      if (session.nextExercisePreviewTimeoutRef.current) {
        clearTimeout(session.nextExercisePreviewTimeoutRef.current);
      }
    };
  }, []);

  // Called after user submits weight/reps in SetLogModal
  const handleSaveSetData = useCallback(
    async (setIndex: number, setData: SetLogData) => {
      let wasAllSetsCompleted = false;

      await session.handleSetComplete(
        setIndex,
        async (percentage) => {
          await achievements.trackMilestone(
            percentage,
            workout.category || "General",
            session.workoutStats.exercisesCompleted,
            session.totalExercises,
            Math.round(
              (new Date().getTime() - session.workoutStartTime.getTime()) /
                60000,
            ),
          );
        },
        async () => {
          wasAllSetsCompleted = true;
          await achievements.trackExerciseCompletion(
            session.currentExercise.name ||
              session.currentExercise.exerciseName ||
              "Exercise",
            workout.category || "General",
            session.currentProgress.completedSets.length,
            session.currentExerciseIndex,
            session.totalExercises,
          );
        },
      );

      // Per-set achievement tracking
      if (!wasAllSetsCompleted) {
        const totalSets = session.currentProgress.completedSets.length;
        await achievements.trackSetCompletion(
          session.currentExercise.name ||
            session.currentExercise.exerciseName ||
            "Exercise",
          setIndex + 1,
          totalSets,
          workout.category || "General",
        );
      }

      // Advance the phase state machine
      session.advanceAfterLog(wasAllSetsCompleted);

      if (wasAllSetsCompleted) {
        // Between exercises: longer rest (1.5x normal, min 60s)
        if (session.currentExerciseIndex < session.totalExercises - 1) {
          const restSecs = Math.max(
            60,
            Math.round(safeNumber(session.currentExercise.restTime, 60) * 1.5),
          );
          setIsInterExerciseRest(true);
          setRestTotalDuration(restSecs);
          setRestTimerEndTime(startTimer(restSecs));
        } else {
          // Last exercise — go straight to workout complete
          completeWorkout();
        }
      } else {
        // Between sets: normal rest timer
        const restSecs = safeNumber(session.currentExercise.restTime, 60);
        setIsInterExerciseRest(false);
        setRestTotalDuration(restSecs);
        if (restSecs > 0) {
          setRestTimerEndTime(startTimer(restSecs));
        } else {
          // No rest defined — go straight to next set
          session.onRestComplete();
        }
      }
    },
    [session, achievements, workout.category],
  );

  /**
   * Called when a time-based set completes (no logging UI shown).
   * Auto-logs a zero-data record so history still knows the exercise was done.
   */
  const handleTimeBasedSetComplete = useCallback(async () => {
    const autoData: SetLogData = {
      weightKg: 0,
      reps: 0,
      setType: "normal",
      completed: true,
      rpe: 2,              // neutral RPE for auto-logged time-based sets
      isCalibration: false,
    };
    await handleSaveSetData(session.currentSetIndex, autoData);
  }, [handleSaveSetData, session.currentSetIndex]);

  const handleRestTimerExpire = useCallback(() => {
    setRestTimerEndTime(null);
    setIsInterExerciseRest((prevIsInter) => {
      if (prevIsInter) {
        animations.animateTransition(() => {
          session.goToNextExercise();
        });
      } else {
        session.onRestComplete();
      }
      return false;
    });
  }, [session, animations]);

  const completeWorkout = useCallback(async () => {
    // Bug 1: prevent double-tap from creating two Supabase rows
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    try {
      const elapsedSeconds = Math.floor(
        (new Date().getTime() - session.workoutStartTime.getTime()) / 1000,
      );
      // Pull actual logged set data (weight, reps) from store.
      // currentWorkoutSession.exercises is updated by updateSetData() each time
      // the user submits a set in SetLogModal — this is the authoritative source.
      const loggedExercises =
        useFitnessStore.getState().currentWorkoutSession?.exercises ?? [];
      const finalStats = {
        ...session.workoutStats,
        totalDuration: elapsedSeconds,
        exercises: loggedExercises, // real weight/reps → _writeExerciseSets
      };
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

      let success: boolean;
      if (isExtra === true || String(isExtra) === "true") {
        const extraResult = await completeExtraWorkout(
          workout,
          {
            sessionId: sessionId || "unknown",
            duration: durationMinutes,
            startedAt: session.workoutStartTime.toISOString(),
            stats: finalStats,
          },
          getCurrentUserId() || undefined,
        );
        // Bug 3: store server-generated row ID for rating/notes update
        supabaseSessionIdRef.current = extraResult;
        success = extraResult !== null;
      } else {
        success = await completionTrackingService.completeWorkout(
          workout.id || "unknown",
          {
            sessionId: sessionId || "unknown",
            duration: durationMinutes,
            exercisesCompleted: finalStats.exercisesCompleted,
            totalExercises: session.totalExercises,
            completedAt: new Date().toISOString(),
            stats: finalStats,
          },
          getCurrentUserId() || undefined,
        );
      }

      if (success) {
        await achievements.trackWorkoutCompletion(
          workout.category || "General",
          durationMinutes,
          finalStats.caloriesBurned,
          finalStats.exercisesCompleted,
          finalStats.setsCompleted,
          session.totalExercises,
          workout.title,
        );

        analyticsHelpers.trackWorkoutCompleted({
          date: getLocalDateString(),
          duration: durationMinutes,
          caloriesBurned: finalStats.caloriesBurned,
          type: workout.category || "general",
        });

        if (userId) {
          for (const ex of workout.exercises) {
            if (!ex.exerciseId) continue;
            try {
              const history = await exerciseHistoryService.getHistory(
                ex.exerciseId,
                userId,
                30,
              );
              const recentSessions: RecentSessionForDeload[] = history.map(
                (h) => ({
                  sets: (h.sets || []).map((s) => ({
                    reps: s.reps ?? 0,
                    weight: s.weightKg ?? 0,
                    completed: true,
                  })),
                  repRange: [
                    typeof ex.reps === "number"
                      ? ex.reps
                      : parseInt(String(ex.reps), 10) || 8,
                    typeof ex.reps === "number"
                      ? ex.reps
                      : parseInt(String(ex.reps), 10) || 12,
                  ] as [number, number],
                }),
              );
              const mesocycleWeek = useFitnessStore
                .getState()
                .getMesocycleWeek();
              const suggestion = checkReactiveDeload(
                ex.exerciseId,
                recentSessions,
                mesocycleWeek ?? undefined,
              );
              if (suggestion) {
                setDeloadSuggestion(suggestion);
                break;
              }
            } catch (err) {
              console.error("[WorkoutSession] deload check failed:", err);
            }
          }
        }

        setCompleteDialog({
          visible: true,
          durationMins: durationMinutes,
          calories: finalStats.caloriesBurned,
          exercisesCompleted: finalStats.exercisesCompleted,
          setsCompleted: finalStats.setsCompleted,
          onViewProgress: () => {
            setCompleteDialog(null);
            navigation.navigate("Progress");
          },
          onDone: async (rating?: number, notes?: string) => {
            // H24: Save user-provided rating and notes to the workout session
            // Bug 3: for extra workouts use the server-generated row ID, not the local UUID
            const rowId =
              isExtra === true || String(isExtra) === "true"
                ? supabaseSessionIdRef.current
                : sessionId;
            if ((rating || notes) && rowId) {
              try {
                const userId = getCurrentUserId();
                if (userId) {
                  const updatePayload: Record<string, unknown> = {};
                  if (rating) updatePayload.rating = rating;
                  if (notes) updatePayload.notes = notes;
                  await supabase
                    .from("workout_sessions")
                    .update(updatePayload)
                    .eq("id", rowId)
                    .eq("user_id", userId);
                }
              } catch (err) {
                console.error("[WorkoutSession] Failed to save rating/notes:", err);
              }
            }
            setCompleteDialog(null);
            isCompletingRef.current = false;
            navigation.goBack();
          },
        });
      } else {
        throw new Error("Failed to save workout completion");
      }
    } catch (error) {
      console.error("🚨 Error completing workout:", error);
      isCompletingRef.current = false;
      showWorkoutCompleteErrorAlert(workout, session.workoutStats, () =>
        navigation.goBack(),
      );
    }
  }, [workout, sessionId, isExtra, session, achievements, navigation]);

  const goToNextExercise = useCallback(() => {
    // Always clear the rest timer before navigating — prevents ghost onExpire
    setRestTimerEndTime(null);
    setIsInterExerciseRest(false);
    if (session.currentExerciseIndex < session.totalExercises - 1) {
      animations.animateTransition(() => {
        session.goToNextExercise();
      });
    } else {
      completeWorkout();
    }
  }, [session, animations, completeWorkout]);

  const goToPreviousExercise = useCallback(() => {
    // Clear any running rest timer before going back
    setRestTimerEndTime(null);
    setIsInterExerciseRest(false);
    if (session.currentExerciseIndex > 0) {
      animations.animateTransition(() => {
        session.goToPreviousExercise();
      });
    }
  }, [session, animations]);

  const exitWorkout = useCallback(async () => {
    const hasProgress =
      session.workoutStats.exercisesCompleted > 0 ||
      session.workoutStats.setsCompleted > 0;

    const saveProgress = async () => {
      try {
        const totalSets = session.exerciseProgress.reduce(
          (sum, ep) => sum + (ep?.completedSets?.length || 0),
          0,
        );
        const completedSets = session.workoutStats.setsCompleted;
        const progressPercentage =
          totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

        const savedPrior =
          useFitnessStore.getState().getWorkoutProgress(workout.id || "unknown")
            ?.progress ?? 0;
        const progressToSave = Math.max(progressPercentage, savedPrior);

        const loggedExercisesOnExit =
          useFitnessStore.getState().currentWorkoutSession?.exercises ?? [];
        await completionTrackingService.updateWorkoutProgress(
          workout.id || "unknown",
          progressToSave,
          {
            sessionId: sessionId || "unknown",
            partialCompletion: true,
            exitedAt: new Date().toISOString(),
            stats: { ...session.workoutStats, exercises: loggedExercisesOnExit },
          },
        );

        const firstIncompleteIdx = session.exerciseProgress.findIndex(
          (ep) => !ep.isCompleted,
        );
        const resumeAt =
          firstIncompleteIdx !== -1
            ? firstIncompleteIdx
            : session.currentExerciseIndex;

        useFitnessStore
          .getState()
          .updateWorkoutProgress(workout.id || "unknown", progressToSave, {
            exerciseIndex: resumeAt,
            caloriesBurned: session.workoutStats.caloriesBurned,
          });

        if (isExtra === true || String(isExtra) === "true") {
          const storeState = useFitnessStore.getState() as { updateActiveExtraProgress?: (index: number) => void };
          if (typeof storeState.updateActiveExtraProgress === "function") {
            storeState.updateActiveExtraProgress(session.currentExerciseIndex);
          }
        }

        useFitnessStore.setState({ currentWorkoutSession: null });
      } catch (error) {
        console.error("❌ Failed to save progress:", error);
      }
      navigation.goBack();
    };

    showExitWorkoutAlert(
      hasProgress,
      session.workoutStats.exercisesCompleted,
      session.totalExercises,
      session.workoutStats.setsCompleted,
      saveProgress,
      saveProgress,
    );
  }, [session, workout.id, sessionId, navigation]);

  // Android hardware back button — show exit dialog instead of default nav
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      exitWorkout();
      return true; // prevent default back
    });
    return () => backHandler.remove();
  }, [exitWorkout]);

  // Guard returns — after all hooks
  if (!workout) {
    return (
      <WorkoutErrorState
        errorType="no-data"
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    return (
      <WorkoutErrorState
        errorType="no-exercises"
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  const exerciseName =
    session.currentExercise.name ||
    getExerciseName(session.currentExercise.exerciseId);

  const totalSets = safeNumber(session.currentExercise.sets, 3);
  const completedSetsCount =
    session.currentProgress.completedSets.filter(Boolean).length;
  // Is the current exercise time-based? Used to skip SetLogModal.
  const isTimeBased = parseTimedExercise(session.currentExercise.reps ?? "").isTimeBased;
  // Sets currently "in progress" index (0-based)
  const activeSetIndex =
    session.exercisePhase === "logging" || session.exercisePhase === "resting"
      ? session.currentSetIndex
      : session.currentSetIndex;

  return (
    <SafeAreaView style={styles.container}>
      <WorkoutHeader
        workoutTitle={workout.title}
        currentExercise={
          // During inter-exercise rest the CURRENT exercise is complete;
          // show the next exercise number so the header matches context.
          isInterExerciseRest
            ? session.currentExerciseIndex + 2
            : session.currentExerciseIndex + 1
        }
        totalExercises={session.totalExercises}
        duration={session.workoutStats.totalDuration}
        calories={session.workoutStats.caloriesBurned}
        onExit={exitWorkout}
        paddingTop={Math.max(insets.top, 12)}
      />

      <WorkoutProgressBar
        progress={session.overallProgress}
        fadeAnim={animations.fadeAnim}
      />

      {/* Next exercise preview banner */}
      {session.showNextExercisePreview && session.nextExercise && (
        <NextExercisePreview
          exerciseName={safeString(
            session.nextExercise.name ||
              getExerciseName(session.nextExercise.exerciseId),
            "Next Exercise",
          )}
        />
      )}

      {/* Main scroll content — always shows exercise preview */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.exerciseContainer,
            {
              opacity: animations.fadeAnim,
              transform: [{ scale: animations.scaleAnim }],
            },
          ]}
        >
          {/* Exercise GIF — hidden (opacity 0) during performing so it doesn't ghost behind the modal */}
          {/* GAP-05: Exercise name is tappable — navigates to ExerciseHistoryScreen */}
          <Pressable
            onPress={() =>
              navigation.navigate('ExerciseHistory', {
                exerciseId: session.currentExercise.exerciseId ?? '',
                exerciseName: exerciseName,
              } as never)
            }
            style={styles.exerciseNameRow}
            testID="exercise-name-history-tap"
          >
            <Text style={styles.exerciseNameTap} numberOfLines={1}>
              {exerciseName}
            </Text>
            <Text style={styles.exerciseHistoryHint}>📊 History</Text>
          </Pressable>

          <ExerciseGifPlayer
            key={session.currentExerciseIndex}
            exerciseId={safeString(session.currentExercise.exerciseId, "")}
            exerciseName={safeString(session.currentExercise.name, "")}
            height={280}
            width={320}
            showTitle={false}
            showInstructions={true}
            onInstructionsPress={() => session.setShowInstructionModal(true)}
            style={[
              styles.exerciseGifPlayer,
              session.exercisePhase === "performing" && { opacity: 0 },
            ]}
          />

          {/* Warm-up sets UI — shown in preview phase when history exists */}
          {session.exercisePhase === "preview" && warmupSets.length > 0 && !restTimerEndTime && (
            <View style={styles.warmupContainer}>
              <Text style={styles.warmupHeader}>WARM-UP (auto-generated)</Text>
              {warmupSets.map((ws, idx) => (
                <View key={idx} style={styles.warmupRow}>
                  <View style={styles.warmupInfo}>
                    <Text style={styles.warmupWeight}>
                      {userUnits === 'lbs'
                        ? `${(ws.weightKg * 2.2046).toFixed(1)} lbs`
                        : `${ws.weightKg} kg`}{' '}
                      × {ws.targetReps} reps
                    </Text>
                    <Text style={styles.warmupPercent}>{ws.percentLabel}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.warmupDoneBtn,
                      warmupDoneMap[idx] && styles.warmupDoneBtnActive,
                    ]}
                    onPress={() =>
                      setWarmupDoneMap((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                  >
                    <Text style={styles.warmupDoneText}>
                      {warmupDoneMap[idx] ? '✓' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.warmupDivider} />
              <Text style={styles.warmupWorkingLabel}>WORKING SETS</Text>
            </View>
          )}

          {/* Set progress indicator in preview phase — hidden during rest */}
          {session.exercisePhase === "preview" && totalSets > 1 && !restTimerEndTime && (
            <View style={styles.setProgressRow}>
              {Array.from({ length: totalSets }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.setDot,
                    i < completedSetsCount && styles.setDotCompleted,
                  ]}
                />
              ))}
            </View>
          )}

          {/* "Start Exercise" button in preview phase */}
          {session.exercisePhase === "preview" && (
            <TouchableOpacity
              style={[
                styles.startButton,
                session.currentProgress.isCompleted && styles.completedButton,
              ]}
              disabled={
                session.currentProgress.isCompleted &&
                session.currentExerciseIndex >= session.totalExercises - 1 &&
                isCompletingRef.current
              }
              onPress={
                session.currentProgress.isCompleted
                  ? goToNextExercise
                  : session.startExercise
              }
            >
              <Text style={styles.startButtonText}>
                {session.currentProgress.isCompleted
                  ? session.currentExerciseIndex < session.totalExercises - 1
                    ? "Next Exercise →"
                    : "Finish Workout"
                  : completedSetsCount > 0
                  ? `Continue — Set ${completedSetsCount + 1} of ${totalSets}`
                  : "Start Exercise"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Previous / Next Exercise nav (preview only) — Next link removed when isCompleted since main button already handles it */}
          {session.exercisePhase === "preview" && (
            <View style={styles.previewNav}>
              {session.currentExerciseIndex > 0 && (
                <TouchableOpacity
                  style={styles.prevExButton}
                  onPress={goToPreviousExercise}
                >
                  <Text style={styles.prevExText}>← Previous</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Modals / Overlays ── */}

      {/* PERFORMING phase: Breathing card */}
      <ExerciseSessionModal
        isVisible={session.exercisePhase === "performing"}
        onComplete={
          isTimeBased
            ? // Time-based: tap Complete Set → auto-log + skip SetLogModal
              () => {
                session.completeTimeBasedSet();
                handleTimeBasedSetComplete();
              }
            : session.completeCurrentSet
        }
        onCancel={session.cancelPerforming}
        exerciseId={safeString(session.currentExercise.exerciseId, "")}
        exerciseName={safeString(exerciseName, "Current Exercise")}
        reps={safeString(session.currentExercise.reps, "")}
        currentSet={session.currentSetIndex + 1}
        totalSets={totalSets}
      />

      {/* LOGGING phase: Data input — hidden for time-based exercises */}
      {!isTimeBased && (() => {
        const exId = safeString(session.currentExercise.exerciseId, '');
        const cali = calibrationMap[exId];
        return (
          <SetLogModal
            isVisible={session.exercisePhase === "logging"}
            exerciseId={exId}
            exerciseName={safeString(exerciseName, "Exercise")}
            reps={session.currentExercise.reps ?? 0}
            setIndex={activeSetIndex}
            totalSets={totalSets}
            userId={userId}
            userUnits={userUnits}
            calibrationMode={cali?.needsCalibration ?? false}
            calibrationStartKg={cali?.estimatedStartKg ?? 0}
            calibrationNote={cali?.referenceNote ?? ''}
            onSave={(data) => handleSaveSetData(activeSetIndex, data)}
            onCancel={session.cancelLogging}
            onPRDetected={(name) =>
              achievements.showAchievementMiniToast(`New PR! ${name}`)
            }
          />
        );
      })()}

      {/* RESTING phase: Rest timer */}
      <RestTimer
        targetEndTime={restTimerEndTime}
        onExpire={handleRestTimerExpire}
        onSkip={handleRestTimerExpire}
        isInterExercise={isInterExerciseRest}
        exerciseName={exerciseName}
        nextExerciseName={
          session.nextExercise
            ? safeString(
                session.nextExercise.name ||
                  getExerciseName(session.nextExercise.exerciseId),
                "Next Exercise",
              )
            : undefined
        }
        currentSet={!isInterExerciseRest ? completedSetsCount : undefined}
        totalSets={!isInterExerciseRest ? totalSets : undefined}
        totalDuration={restTotalDuration}
      />

      {/* Instructions modal (accessible from preview via GIF player) */}
      <ExerciseInstructionModal
        isVisible={session.showInstructionModal}
        onClose={() => session.setShowInstructionModal(false)}
        exerciseId={safeString(session.currentExercise.exerciseId, "")}
        exerciseName={safeString(session.currentExercise.name, "")}
      />

      <AchievementNotifications
        showCelebration={achievements.showCelebration}
        celebrationAchievement={achievements.celebrationAchievement}
        onCloseCelebration={achievements.hideCelebration}
        showAchievementToast={achievements.showAchievementToast}
        toastAchievement={achievements.toastAchievement}
        achievementToastAnim={achievements.achievementToastAnim}
        showMiniToast={achievements.showMiniToast}
        miniToastText={achievements.miniToastText}
        miniToastAnim={achievements.miniToastAnim}
      />

      {completeDialog && (
        <WorkoutCompleteDialog
          visible={completeDialog.visible}
          workoutTitle={safeString(workout.title, "Workout")}
          duration={completeDialog.durationMins}
          calories={completeDialog.calories}
          exercisesCompleted={completeDialog.exercisesCompleted}
          totalExercises={session.totalExercises}
          onViewProgress={completeDialog.onViewProgress}
          onDone={completeDialog.onDone}
        />
      )}

      {deloadSuggestion && (
        <DeloadModal
          visible={!!deloadSuggestion}
          variant={deloadSuggestion.type}
          message={deloadSuggestion.reason}
          exerciseName={deloadSuggestion.exerciseId}
          onAccept={() => setDeloadSuggestion(null)}
          onDismiss={() => setDeloadSuggestion(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  exerciseContainer: {
    marginTop: ResponsiveTheme.spacing.lg,
    alignItems: "center",
  },
  exerciseGifPlayer: {
    marginBottom: ResponsiveTheme.spacing.lg,
    alignSelf: "center",
    elevation: 4,
  },
  setProgressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: ResponsiveTheme.spacing.md,
    justifyContent: "center",
  },
  setDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#555",
  },
  setDotCompleted: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  startButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginBottom: ResponsiveTheme.spacing.md,
    alignSelf: "stretch",
    alignItems: "center",
  },
  completedButton: {
    backgroundColor: "#226F54", // distinct green — signals "done, advance" not "start/continue"
  },
  startButtonText: {
    color: "#FFF",
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  previewNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  prevExButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  prevExText: {
    color: "#888",
    fontSize: ResponsiveTheme.fontSize.sm,
  },
  nextExButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  nextExText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  // GAP-05: styles for tappable exercise name → ExerciseHistory
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: 8,
    marginBottom: 4,
  },
  exerciseNameTap: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    flex: 1,
  },
  exerciseHistoryHint: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: '#888',
    marginLeft: 8,
  },
  // Warm-up sets panel
  warmupContainer: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 152, 0, 0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.2)',
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  warmupHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  warmupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  warmupInfo: {
    flex: 1,
  },
  warmupWeight: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#FFF',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  warmupPercent: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  warmupDoneBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  warmupDoneBtnActive: {
    backgroundColor: 'rgba(255, 152, 0, 0.25)',
    borderColor: '#FF9800',
  },
  warmupDoneText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: '#CCC',
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  warmupDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  warmupWorkingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ResponsiveTheme.colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
});
