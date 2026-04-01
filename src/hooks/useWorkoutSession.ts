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

export const useWorkoutSession = (
  workout: DayWorkout,
  sessionId?: string,
  initialExerciseIndex: number = 0,
) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] =
    useState(initialExerciseIndex);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    workout.exercises.map((exercise, index) => ({
      exerciseIndex: index,
      completedSets: new Array(
        Math.max(1, safeNumber(exercise?.sets, 3)),
      ).fill(index < initialExerciseIndex),
      isCompleted: index < initialExerciseIndex,
    })),
  );

  // Phase state machine: preview → performing → logging → resting → performing…
  const [exercisePhase, setExercisePhase] = useState<ExercisePhase>("preview");
  // Which set (0-indexed) the user is currently on
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  const [isRestTime, setIsRestTime] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
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

  // Exercise-based stats — only recalculate when sets are completed, NOT every timer tick.
  // This prevents calories from jumping during rest periods.
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
      const completedSets = ep?.completedSets?.filter(Boolean).length || 0;
      if (completedSets > 0) {
        const exercise = workout.exercises[idx];
        if (exercise) {
          completedInputs.push({
            exerciseId: exercise.exerciseId,
            name: (exercise as any).name || (exercise as any).exerciseName,
            sets: completedSets,
            reps: exercise.reps,
            restTime: exercise.restTime,
          });
        }
      }
    });

    let caloriesBurned = 0;
    if (completedInputs.length > 0) {
      const userWeight = resolveCurrentWeightFromStores({
        bodyAnalysisWeight:
          useProfileStore.getState().bodyAnalysis?.current_weight_kg,
      }).value;
      if (userWeight && userWeight > 0) {
        caloriesBurned = calculateWorkoutCalories(
          completedInputs,
          userWeight,
        ).totalCalories;
      }
    }

    return {
      exercisesCompleted: Math.max(0, exercisesCompleted),
      setsCompleted: Math.max(0, setsCompleted),
      caloriesBurned: Math.max(0, caloriesBurned),
    };
  }, [exerciseProgress, workout.exercises]);

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

  const nextExercise = useMemo(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1];
    }
    return null;
  }, [currentExerciseIndex, totalExercises, workout.exercises]);

  const workoutStatsRef = useRef(workoutStats);
  useEffect(() => {
    workoutStatsRef.current = workoutStats;
  }, [workoutStats]);

  // Internal: marks a set as completed in exerciseProgress and persists progress
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

        const newProgress = [...exerciseProgress];
        if (!newProgress[currentExerciseIndex]) return;

        const updated = {
          ...newProgress[currentExerciseIndex],
          completedSets: [...newProgress[currentExerciseIndex].completedSets],
        };
        updated.completedSets[setIndex] = true;

        const allSetsCompleted = updated.completedSets.every(Boolean);
        updated.isCompleted = allSetsCompleted;

        if (allSetsCompleted && !updated.endTime) {
          updated.endTime = new Date();
        }

        newProgress[currentExerciseIndex] = updated;
        setExerciseProgress(newProgress);

        if (allSetsCompleted && onAllSetsCompleted) {
          await onAllSetsCompleted();
        }

        const completedExercises = newProgress.filter(
          (ep) => ep?.isCompleted,
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
    // Return directly to preview; the screen's handleTimeBasedSetComplete
    // will call advanceAfterLog with auto-filled data.
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
        // All sets done — show next exercise preview, let the screen handle
        // the transition to the next exercise (or workout complete)
        if (currentExerciseIndex < totalExercises - 1) {
          setShowNextExercisePreview(true);
          // Banner stays visible until goToNextExercise() clears it
          if (nextExercisePreviewTimeoutRef.current) {
            clearTimeout(nextExercisePreviewTimeoutRef.current);
            nextExercisePreviewTimeoutRef.current = null;
          }
        }
        // Phase stays at logging momentarily; screen transitions via goToNextExercise
        setExercisePhase("preview");
      } else {
        // More sets to go — start rest timer
        const restSecs = safeNumber(currentExercise.restTime, 60);
        setRestTimeRemaining(restSecs);
        setExercisePhase("resting");
      }
    },
    [currentExercise.restTime, currentExerciseIndex, totalExercises],
  );

  // Phase transition: resting → performing (rest timer expired or skipped)
  const onRestComplete = useCallback(() => {
    setCurrentSetIndex((prev) => prev + 1);
    setExercisePhase("performing");
  }, []);

  const goToNextExercise = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setIsRestTime(false);
      setRestTimeRemaining(0);
      setShowNextExercisePreview(false);
      setExercisePhase("preview");
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex, totalExercises]);

  const goToPreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setIsRestTime(false);
      setRestTimeRemaining(0);
      setExercisePhase("preview");
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex]);

  return {
    currentExerciseIndex,
    exerciseProgress,
    exercisePhase,
    currentSetIndex,
    isRestTime,
    restTimeRemaining,
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
    setIsRestTime,
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
