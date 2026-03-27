import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { getLocalDateString } from "../../utils/weekUtils";
import { DayWorkout } from "../../types/ai";
import { WorkoutTimer } from "../../components/fitness/WorkoutTimer";
import { ExerciseGifPlayer } from "../../components/fitness/ExerciseGifPlayer";
import { ExerciseInstructionModal } from "../../components/fitness/ExerciseInstructionModal";
import { ExerciseSessionModal } from "../../components/fitness/ExerciseSessionModal";
import completionTrackingService from "../../services/completionTracking";
import { completeExtraWorkout } from "../../services/extraWorkoutService";
import { analyticsHelpers } from "../../stores/analyticsStore";
// analyticsDataService removed: updateTodaysMetrics is already called inside
// completionTrackingService.completeWorkout() and completeExtraWorkout().
// Calling it again here would double-count calories/workouts in analytics_metrics.
import { useFitnessStore } from "../../stores/fitnessStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exerciseFilterService } from "../../services/exerciseFilterService";
import { getCurrentUserId } from "../../services/authUtils";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { useWorkoutAchievements } from "../../hooks/useWorkoutAchievements";
import { useWorkoutAnimations } from "../../hooks/useWorkoutAnimations";
import { WorkoutHeader } from "../../components/workout/WorkoutHeader";
import { WorkoutProgressBar } from "../../components/workout/WorkoutProgressBar";
import {
  ExerciseCard,
  SetCompletionData,
} from "../../features/workouts/components/ExerciseCard";
import { RestTimer } from "../../features/workouts/components/RestTimer";
import { DeloadModal } from "../../features/workouts/components/DeloadModal";
import { startTimer } from "../../services/restTimerService";
import {
  checkReactiveDeload,
  RecentSessionForDeload,
  DeloadSuggestion,
} from "../../services/deloadService";
import { exerciseHistoryService } from "../../services/exerciseHistoryService";
import { WorkoutNavigation } from "../../components/workout/WorkoutNavigation";
import { AchievementNotifications } from "../../components/workout/AchievementNotifications";
import { WorkoutErrorState } from "../../components/workout/WorkoutErrorState";
import { NextExercisePreview } from "../../components/workout/NextExercisePreview";
import { useProfileStore } from "../../stores/profileStore";
import {
  showWorkoutCompleteErrorAlert,
  showExitWorkoutAlert,
} from "./workoutAlerts";
import { WorkoutCompleteDialog } from "../../components/ui/CustomDialog";

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

const parseDurationFromReps = (reps: any): number => {
  if (!reps) return 0;
  const str = String(reps).toLowerCase().trim();

  if (
    str.includes("-") ||
    str.includes("to") ||
    str.match(/^\d+\s*[-–]\s*\d+$/)
  ) {
    return 0;
  }

  const mmss = str.match(/^(\d+):(\d{1,2})$/);
  if (mmss) {
    const m = parseInt(mmss[1], 10);
    const s = parseInt(mmss[2], 10);
    if (!Number.isNaN(m) && !Number.isNaN(s)) return m * 60 + s;
  }

  const sec = str.match(/^(\d+)\s*(seconds|second|secs|sec|s)$/);
  if (sec) {
    const v = parseInt(sec[1], 10);
    return Number.isNaN(v) ? 0 : v;
  }

  const min = str.match(/^(\d+)\s*(minutes|minute|mins|min|m)$/);
  if (min) {
    const v = parseInt(min[1], 10);
    return Number.isNaN(v) ? 0 : v * 60;
  }

  const pure = parseInt(str, 10);
  if (!Number.isNaN(pure) && str === pure.toString()) {
    return pure;
  }

  return 0;
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

  // Workout complete dialog state (replaces crossPlatformAlert on web)
  const [completeDialog, setCompleteDialog] = useState<{
    visible: boolean;
    durationMins: number;
    calories: number;
    exercisesCompleted: number;
    setsCompleted: number;
    onViewProgress: () => void;
    onDone: () => void;
  } | null>(null);

  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  const [deloadSuggestion, setDeloadSuggestion] =
    useState<DeloadSuggestion | null>(null);

  const userId = getCurrentUserId() || undefined;
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const userUnits: "kg" | "lbs" =
    personalInfo?.units === "imperial" ? "lbs" : "kg";

  // All hooks must be declared before any early returns (Rules of Hooks).
  // The guards below still run before the render JSX.

  const derivedExerciseDuration = useMemo(() => {
    const repsDuration = parseDurationFromReps(session.currentExercise.reps);
    const restSeconds = safeNumber(session.currentExercise.restTime, 0);
    return repsDuration || restSeconds || 30;
  }, [session.currentExercise.reps, session.currentExercise.restTime]);

  const getExerciseName = useCallback((exerciseId: string): string => {
    if (!exerciseId) return "Exercise";
    const exercise = exerciseFilterService.getExerciseById(exerciseId);
    if (exercise?.name) {
      return exercise.name;
    }
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

  useEffect(() => {
    return () => {
      if (session.nextExercisePreviewTimeoutRef.current) {
        clearTimeout(session.nextExercisePreviewTimeoutRef.current);
      }
    };
  }, []);

  const handleSetComplete = useCallback(
    async (setIndex: number, _setData?: SetCompletionData) => {
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
          // Called when ALL sets of the current exercise are completed
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

      // Rest timer: only fire when not the last set (i.e. not all sets completed).
      // The hook-level rest timer (setIsRestTime) already fires inside handleSetComplete
      // for the WorkoutTimer overlay. Here we fire the RestTimer overlay (timestamp-based)
      // only when enabled and NOT all sets done.
      if (!wasAllSetsCompleted) {
        const restTimerEnabled = useFitnessStore.getState().restTimerEnabled;
        if (restTimerEnabled) {
          session.setIsRestTime(false);
          const restSecs = safeNumber(session.currentExercise.restTime, 60);
          if (restSecs > 0) {
            setRestTimerEndTime(startTimer(restSecs));
          }
        }

        // Per-set achievement tracking (only fires when NOT all sets completed)
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
    },
    [session, achievements, workout.category],
  );

  const completeWorkout = useCallback(async () => {
    try {
      const elapsedSeconds = Math.floor(
        (new Date().getTime() - session.workoutStartTime.getTime()) / 1000,
      );
      const finalStats = {
        ...session.workoutStats,
        totalDuration: elapsedSeconds,
      };
      // completionTrackingService expects duration in minutes
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

      let success: boolean;
      if (isExtra === true || (isExtra as any) === "true") {
        success = await completeExtraWorkout(
          workout,
          {
            sessionId: sessionId || "unknown",
            duration: durationMinutes,
            startedAt: session.workoutStartTime.toISOString(),
            stats: finalStats,
          },
          getCurrentUserId() || undefined,
        );
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
          durationMinutes, // achievements expect minutes, not seconds
          finalStats.caloriesBurned,
          finalStats.exercisesCompleted,
          finalStats.setsCompleted,
          session.totalExercises,
          workout.title,
        );

        // SSOT fix: feed analyticsStore so its metricsHistory and currentAnalytics
        // are based on real completion data (analyticsEngine was previously never
        // called on workout completion, leaving analyticsStore always empty).
        analyticsHelpers.trackWorkoutCompleted({
          date: getLocalDateString(),
          duration: durationMinutes,
          caloriesBurned: finalStats.caloriesBurned,
          type: workout.category || "general",
        });

        // NOTE: analyticsDataService.updateTodaysMetrics() is already called by
        // completionTrackingService.completeWorkout() and completeExtraWorkout().
        // Do NOT call it again here — that would double-count calories/workoutsCompleted.

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
          onDone: () => {
            setCompleteDialog(null);
            navigation.goBack();
          },
        });
      } else {
        throw new Error("Failed to save workout completion");
      }
    } catch (error) {
      console.error("🚨 Error completing workout:", error);
      showWorkoutCompleteErrorAlert(workout, session.workoutStats, () =>
        navigation.goBack(),
      );
    }
  }, [workout, sessionId, isExtra, session, achievements, navigation]);

  const goToNextExercise = useCallback(() => {
    if (session.currentExerciseIndex < session.totalExercises - 1) {
      animations.animateTransition(() => {
        session.goToNextExercise();
      });
    } else {
      completeWorkout();
    }
  }, [session, animations, completeWorkout]);

  const goToPreviousExercise = useCallback(() => {
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

        // Never overwrite a higher prior progress with a lower value
        // (e.g. user navigated but did no sets this session).
        const savedPrior =
          useFitnessStore.getState().getWorkoutProgress(workout.id || "unknown")
            ?.progress ?? 0;
        const progressToSave = Math.max(progressPercentage, savedPrior);

        // 1. Emit event to subscribers (e.g. fitness screen refresh)
        await completionTrackingService.updateWorkoutProgress(
          workout.id || "unknown",
          progressToSave,
          {
            sessionId: sessionId || "unknown",
            partialCompletion: true,
            exitedAt: new Date().toISOString(),
            stats: session.workoutStats,
          },
        );

        // 2. Always persist exerciseIndex so resume lands on the correct exercise.
        //    Use the first incomplete exercise (not currentExerciseIndex) so that
        //    if the user finished all sets on Exercise N but never tapped "Next",
        //    resume jumps to Exercise N+1 instead of replaying N from scratch.
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

        // 3. For extra workouts: update the persisted active session so the card
        //    shows RESUME at the correct exercise index.
        //    Use currentExerciseIndex (where user is now), not firstIncompleteIdx
        //    — if no sets were completed, firstIncompleteIdx would be 0 regardless.
        if (isExtra === true || (isExtra as any) === "true") {
          // updateActiveExtraProgress is an optional method — guard call in case
          // the fitnessStore version in use hasn't implemented it yet.
          const storeState = useFitnessStore.getState() as any;
          if (typeof storeState.updateActiveExtraProgress === "function") {
            storeState.updateActiveExtraProgress(session.currentExerciseIndex);
          }
        }

        // 4. Clear the in-memory session so next "Continue" uses the
        //    persisted exerciseIndex (single source of truth).
        useFitnessStore.setState({ currentWorkoutSession: null });
      } catch (error) {
        console.error("❌ Failed to save progress:", error);
      }
      navigation.goBack();
    };

    // Always pass saveProgress for both paths so exerciseIndex is persisted
    // even when the user navigated forward but completed no sets yet.
    showExitWorkoutAlert(
      hasProgress,
      session.workoutStats.exercisesCompleted,
      session.totalExercises,
      session.workoutStats.setsCompleted,
      saveProgress,
      saveProgress,
    );
  }, [session, workout.id, sessionId, navigation]);

  // Guard returns are placed HERE — after all hooks — to satisfy Rules of Hooks.
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

  return (
    <SafeAreaView style={styles.container}>
      <WorkoutHeader
        workoutTitle={workout.title}
        currentExercise={session.currentExerciseIndex + 1}
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

      <WorkoutTimer
        isVisible={session.isRestTime}
        duration={session.restTimeRemaining}
        title="Rest Time"
        onComplete={() => {
          session.setIsRestTime(false);
          if (parseDurationFromReps(session.currentExercise.reps) > 0) {
            session.setShowExerciseTimer(true);
          } else {
            session.setShowExerciseSession(true);
          }
        }}
        onCancel={() => session.setIsRestTime(false)}
      />

      <WorkoutTimer
        isVisible={session.showExerciseTimer}
        duration={derivedExerciseDuration}
        title={safeString(session.currentExercise.name || "Exercise Timer")}
        onComplete={session.completeSetAfterTimer}
        onCancel={() => session.setShowExerciseTimer(false)}
      >
        <ExerciseGifPlayer
          exerciseId={safeString(session.currentExercise.exerciseId, "")}
          exerciseName={safeString(session.currentExercise.name, "")}
          height={180}
          width={220}
          showTitle={false}
          showInstructions={false}
          style={{ marginBottom: ResponsiveTheme.spacing.md }}
        />
      </WorkoutTimer>

      {session.showNextExercisePreview && session.nextExercise && (
        <NextExercisePreview
          exerciseName={safeString(
            session.nextExercise.name ||
              getExerciseName(session.nextExercise.exerciseId),
            "Next Exercise",
          )}
        />
      )}

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
          <ExerciseGifPlayer
            exerciseId={safeString(session.currentExercise.exerciseId, "")}
            exerciseName={safeString(session.currentExercise.name, "")}
            height={280}
            width={320}
            showTitle={false}
            showInstructions={true}
            onInstructionsPress={() => session.setShowInstructionModal(true)}
            style={styles.exerciseGifPlayer}
          />

          <ExerciseCard
            exercise={{
              exerciseId: session.currentExercise.exerciseId || "",
              exerciseName:
                session.currentExercise.name ||
                getExerciseName(session.currentExercise.exerciseId),
              sets: safeNumber(session.currentExercise.sets, 3),
              reps: session.currentExercise.reps ?? 0,
              restTime: session.currentExercise.restTime,
              weight: session.currentExercise.weight,
            }}
            exerciseIndex={session.currentExerciseIndex}
            onSetComplete={handleSetComplete}
            onExerciseNamePress={() => {
              const exId = session.currentExercise.exerciseId;
              if (!exId) return;
              navigation.navigate("ExerciseHistory", {
                exerciseId: exId,
                exerciseName:
                  session.currentExercise.name ||
                  getExerciseName(session.currentExercise.exerciseId),
              });
            }}
            userId={userId}
            userUnits={userUnits}
          />
        </Animated.View>
      </ScrollView>

      <ExerciseInstructionModal
        isVisible={session.showInstructionModal}
        onClose={() => session.setShowInstructionModal(false)}
        exerciseId={safeString(session.currentExercise.exerciseId, "")}
        exerciseName={safeString(session.currentExercise.name, "")}
      />

      <ExerciseSessionModal
        isVisible={session.showExerciseSession}
        onComplete={session.completeSetFromSession}
        onCancel={() => session.setShowExerciseSession(false)}
        exerciseId={safeString(session.currentExercise.exerciseId, "")}
        exerciseName={safeString(
          session.currentExercise.name ||
            getExerciseName(session.currentExercise.exerciseId),
          "Current Exercise",
        )}
        reps={safeString(session.currentExercise.reps, "")}
        currentSet={
          (session.exerciseProgress[
            session.currentExerciseIndex
          ]?.completedSets?.filter(Boolean).length || 0) + 1
        }
        totalSets={safeNumber(session.currentExercise.sets, 3)}
      />

      <WorkoutNavigation
        currentExercise={session.currentExerciseIndex}
        totalExercises={session.totalExercises}
        canAdvance={session.currentProgress.isCompleted}
        onPrevious={goToPreviousExercise}
        onNext={goToNextExercise}
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

      <RestTimer
        targetEndTime={restTimerEndTime}
        onExpire={() => setRestTimerEndTime(null)}
        onSkip={() => setRestTimerEndTime(null)}
      />

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
});
