import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Platform, Vibration } from "react-native";
import { DayWorkout } from "../types/ai";
import completionTrackingService from "../services/completionTracking";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "../services/calorieCalculator";
import { useProfileStore } from "../stores/profileStore";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";
import { useFitnessStore } from "../stores/fitnessStore";

export type ExercisePhase = "preview" | "performing" | "logging" | "resting";

interface ExerciseProgress {
  exerciseIndex: number;
  completedSets: boolean[];
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface WorkoutStats {
  totalDuration: number;
  exercisesCompleted: number;
  setsCompleted: number;
  caloriesBurned: number;
}

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

/**
 * Build an ExerciseProgress view derived from the store's
 * currentWorkoutSession.exercises[].sets[] (the SSOT for set data).
 *
 * The store is the single source of truth for set weight/reps/rpe/completed.
 * The hook's exerciseProgress is now a READ-ONLY projection of that state —
 * it no longer holds a parallel mutated copy.
 */
function deriveProgressFromStore(
  workout: DayWorkout,
  initialExerciseIndex: number,
  storeExercises: { sets: Array<{ completed: boolean }> }[] | undefined,
): ExerciseProgress[] {
  return workout.exercises.map((exercise, index) => {
    const storeEx = storeExercises?.[index];
    const plannedSets = Math.max(1, safeNumber(exercise?.sets, 3));
    const storeSets = storeEx?.sets;
    const completedSets =
      storeSets && storeSets.length === plannedSets
        ? storeSets.map((s) => Boolean(s.completed))
        : new Array(plannedSets).fill(index < initialExerciseIndex);
    return {
      exerciseIndex: index,
      completedSets,
      isCompleted:
        completedSets.length > 0 && completedSets.every(Boolean),
    };
  });
}

export const useWorkoutSession = (
  workout: DayWorkout,
  sessionId?: string,
  initialExerciseIndex: number = 0,
) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] =
    useState(initialExerciseIndex);

  // Subscribe to the store's currentWorkoutSession.exercises so set-completion
  // state stays in sync with the SSOT (set data is written there by SetLogModal
  // via updateSetData). We only read exercises[] here — never mutate.
  const storeExercises = useFitnessStore(
    (s) => s.currentWorkoutSession?.exercises,
  );

  // exerciseProgress is now a DERIVED view of the store sets. There is no
  // parallel mutated copy. When the user logs a set, SetLogModal.handleSave
  // writes weight/reps/rpe/completed into the store via updateSetData, and
  // this derivation recomputes automatically.
  const exerciseProgress = useMemo<ExerciseProgress[]>(
    () =>
      deriveProgressFromStore(
        workout,
        initialExerciseIndex,
        storeExercises as
          | { sets: Array<{ completed: boolean }> }[]
          | undefined,
      ),
    [workout, initialExerciseIndex, storeExercises],
  );

  // Phase state machine: preview → performing → logging → resting → performing…
  const [exercisePhase, setExercisePhase] = useState<ExercisePhase>("preview");
  // Which set (0-indexed) the user is currently on
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  const [workoutStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showNextExercisePreview, setShowNextExercisePreview] = useState(false);

  const nextExercisePreviewTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const currentExercise = useMemo(() => {
    return workout.exercises[currentExerciseIndex] || {};
  }, [workout.exercises, currentExerciseIndex]);

  const currentProgress = useMemo(() => {
    return (
      exerciseProgress[currentExerciseIndex] || {
        completedSets: [],
        isCompleted: false,
      }
    );
  }, [exerciseProgress, currentExerciseIndex]);

  const totalExercises = useMemo(() => {
    return safeNumber(workout.exercises?.length, 0);
  }, [workout.exercises]);

  const overallProgress = useMemo(() => {
    const completed = exerciseProgress.filter((ep) => ep?.isCompleted).length;
    return totalExercises > 0 ? completed / totalExercises : 0;
  }, [exerciseProgress, totalExercises]);

  // Subscribe reactively to user weight so calorie stats recompute when weight
  // changes mid-workout (P2-12 fix).
  const bodyAnalysisWeight = useProfileStore(
    (s) => s.bodyAnalysis?.current_weight_kg,
  );
  const resolvedWeight = useMemo(
    () =>
      resolveCurrentWeightFromStores({
        bodyAnalysisWeight,
      }).value,
    [bodyAnalysisWeight],
  );

  // Exercise-based stats — only recalculate when sets are completed, NOT every
  // timer tick. This prevents calories from jumping during rest periods.
  //
  // P0-4 fix: calorie calculation now reads ACTUAL logged reps/weight from the
  // store's currentWorkoutSession.exercises[].sets[] (the SSOT), not the plan.
  // When a set has been logged (completed=true, reps>0) we use those actuals;
  // otherwise the exercise contributes nothing until the user logs it.
  const exerciseStats = useMemo(() => {
    const exercisesCompleted = exerciseProgress.filter(
      (ep) => ep?.isCompleted,
    ).length;
    const setsCompleted = exerciseProgress.reduce(
      (total, ep) => total + (ep?.completedSets?.filter(Boolean).length || 0),
      0,
    );

    const completedInputs: ExerciseCalorieInput[] = [];
    exerciseProgress.forEach((ep, idx) => {
      const completedSetCount =
        ep?.completedSets?.filter(Boolean).length || 0;
      if (completedSetCount > 0) {
        const exercise = workout.exercises[idx];
        const storeEx = (storeExercises as
          | { exerciseId?: string; sets?: Array<{ reps?: number; weight?: number; completed?: boolean }> }[]
          | undefined)?.[idx];
        if (exercise && storeEx) {
          // Read actual logged reps from the store's SSOT sets. Falls back to
          // plan reps only if a set is marked completed but has no logged reps
          // (e.g. time-based auto-logged with reps:0 — duration drives the calc
          // via exercise.duration which is passed through below).
          const actualSets = (storeEx.sets || [])
            .filter((s) => s?.completed)
            .slice(0, completedSetCount);
          const avgReps =
            actualSets.length > 0
              ? actualSets.reduce((sum, s) => sum + (s.reps ?? 0), 0) /
                actualSets.length
              : 0;
          completedInputs.push({
            exerciseId: exercise.exerciseId,
            name:
              (exercise as unknown as Record<string, unknown>).name as string ||
              (exercise as unknown as Record<string, unknown>).exerciseName as string,
            sets: completedSetCount,
            reps: avgReps > 0 ? avgReps : exercise.reps,
            duration: exercise.duration,
            restTime: exercise.restTime,
          });
        }
      }
    });

    let caloriesBurned = 0;
    if (completedInputs.length > 0 && resolvedWeight && resolvedWeight > 0) {
      // calculateWorkoutCalories honors per-exercise sets + reps; we pass the
      // ACTUAL completed set count and the average of actually-logged reps so
      // the MET calc reflects what the user did, not the plan.
      caloriesBurned = calculateWorkoutCalories(
        completedInputs,
        resolvedWeight,
      ).totalCalories;
    }

    return {
      exercisesCompleted: Math.max(0, exercisesCompleted),
      setsCompleted: Math.max(0, setsCompleted),
      caloriesBurned: Math.max(0, caloriesBurned),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseProgress, workout.exercises, storeExercises, resolvedWeight]);

  // Time-based stats — recalculate every second for the live duration display.
  const workoutStats = useMemo((): WorkoutStats => {
    const durationSeconds = Math.floor(
      (currentTime.getTime() - workoutStartTime.getTime()) / 1000,
    );
    return {
      totalDuration: Math.max(0, durationSeconds),
      ...exerciseStats,
    };
  }, [currentTime, workoutStartTime, exerciseStats]);

  // P2-13 fix: keep the ref in sync synchronously at render time (not via an
  // effect that runs after render). This guarantees handleSetComplete emits the
  // current stats, not the previous render's.
  const workoutStatsRef = useRef(workoutStats);
  workoutStatsRef.current = workoutStats;

  const nextExercise = useMemo(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1];
    }
    return null;
  }, [currentExerciseIndex, totalExercises, workout.exercises]);

  // Internal: persists workout progress metadata (percent + calories) after a
  // set is logged. Set DATA itself (weight/reps/rpe) is written to the store
  // SSOT by SetLogModal.handleSave → updateSetData, NOT here. This function
  // only emits the progress event + writes workoutProgress metadata.
  const handleSetComplete = useCallback(
    async (
      setIndex: number,
      onMilestone?: (percentage: number) => void,
      onAllSetsCompleted?: () => Promise<void> | void,
    ) => {
      try {
        if (Platform.OS !== "web") {
          Vibration.vibrate(50);
        }

        // exerciseProgress is now derived from the store SSOT, so we read the
        // current (post-updateSetData) state directly — no local mutation.
        const ep = exerciseProgress[currentExerciseIndex];
        if (!ep) return;

        const allSetsCompleted = ep.completedSets.every(Boolean);

        if (allSetsCompleted && onAllSetsCompleted) {
          await onAllSetsCompleted();
        }

        const completedExercises = exerciseProgress.filter(
          (p) => p?.isCompleted,
        ).length;
        const progressPercentage =
          totalExercises > 0
            ? Math.round((completedExercises / totalExercises) * 100)
            : 0;

        await completionTrackingService.updateWorkoutProgress(
          workout.id || "unknown",
          progressPercentage,
          {
            sessionId: sessionId || "unknown",
            exerciseIndex: currentExerciseIndex,
            setIndex,
            completedExercises,
            totalExercises,
            timestamp: new Date().toISOString(),
            stats: workoutStatsRef.current,
          },
        );

        if (onMilestone) {
          const completionPercentage =
            (completedExercises / totalExercises) * 100;
          if (completionPercentage === 50 || completionPercentage === 75) {
            onMilestone(completionPercentage);
          }
        }
      } catch (error) {
        console.error("Failed to update workout progress:", error);
      }
    },
    [
      exerciseProgress,
      currentExerciseIndex,
      sessionId,
      workout.id,
      totalExercises,
    ],
  );

  // Phase transition: preview → performing (user taps "Start Exercise")
  const startExercise = useCallback(() => {
    const progress = exerciseProgress[currentExerciseIndex];
    const firstIncomplete = progress
      ? progress.completedSets.findIndex((s) => !s)
      : 0;
    setCurrentSetIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
    setExercisePhase("performing");
  }, [exerciseProgress, currentExerciseIndex]);

  // Phase transition: performing → logging (user taps "Complete Set" in breathing card)
  const completeCurrentSet = useCallback(() => {
    if (Platform.OS !== "web") {
      Vibration.vibrate(50); // Immediate tactile confirmation
    }
    setExercisePhase("logging");
  }, []);

  /**
   * Phase transition: performing → preview/resting (time-based exercises only).
   * Bypasses the "logging" phase entirely — screen auto-logs { reps:0, weight:0 }
   * and calls handleSaveSetData directly, skipping SetLogModal.
   */
  const completeTimeBasedSet = useCallback(() => {
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 150, 50, 150]);
    }
    setExercisePhase("preview");
  }, []);

  // Phase transition: performing → preview (user cancels the breathing card)
  const cancelPerforming = useCallback(() => {
    setExercisePhase("preview");
  }, []);

  // Phase transition: logging → performing (user taps Back on SetLogModal to redo the set)
  const cancelLogging = useCallback(() => {
    setExercisePhase("performing");
  }, []);

  // Phase transition: logging → resting or exercise complete
  // Called after user submits weight/reps. handleSetComplete is invoked here
  // so the screen's handleSetComplete wrapper (with achievement tracking) is used.
  const advanceAfterLog = useCallback(
    (allSetsCompleted: boolean) => {
      if (allSetsCompleted) {
        if (currentExerciseIndex < totalExercises - 1) {
          setShowNextExercisePreview(true);
          if (nextExercisePreviewTimeoutRef.current) {
            clearTimeout(nextExercisePreviewTimeoutRef.current);
            nextExercisePreviewTimeoutRef.current = null;
          }
        }
        setExercisePhase("preview");
      } else {
        setExercisePhase("resting");
      }
    },
    [currentExerciseIndex, totalExercises],
  );

  // Phase transition: resting → performing (rest timer expired or skipped)
  const onRestComplete = useCallback(() => {
    setCurrentSetIndex((prev) => prev + 1);
    setExercisePhase("performing");
  }, []);

  const goToNextExercise = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setShowNextExercisePreview(false);
      setExercisePhase("preview");
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex, totalExercises]);

  const goToPreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setExercisePhase("preview");
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex]);

  return {
    currentExerciseIndex,
    exerciseProgress,
    exercisePhase,
    currentSetIndex,
    workoutStartTime,
    currentTime,
    showInstructionModal,
    showNextExercisePreview,
    currentExercise,
    currentProgress,
    totalExercises,
    overallProgress,
    workoutStats,
    nextExercise,
    setCurrentTime,
    setShowInstructionModal,
    handleSetComplete,
    startExercise,
    completeCurrentSet,
    completeTimeBasedSet,
    cancelPerforming,
    cancelLogging,
    advanceAfterLog,
    onRestComplete,
    goToNextExercise,
    goToPreviousExercise,
    nextExercisePreviewTimeoutRef,
  };
};

/**
 * Helper reserved for future per-exercise progress lookups. Currently the
 * calorie calc reads completed-set counts + avg reps directly from the store
 * SSOT, so no progress-map indexing is needed.
 */
// (intentionally empty — kept as a seam for future per-exercise breakdown)
