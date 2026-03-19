import { useState, useCallback, useMemo, useRef } from "react";
import { Platform, Vibration } from "react-native";
import { DayWorkout } from "../types/ai";
import completionTrackingService from "../services/completionTracking";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "../services/calorieCalculator";
import { useProfileStore } from "../stores/profileStore";

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
      completedSets: new Array(safeNumber(exercise?.sets, 3)).fill(
        index < initialExerciseIndex,
      ),
      isCompleted: index < initialExerciseIndex,
    })),
  );
  const [isRestTime, setIsRestTime] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [workoutStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showNextExercisePreview, setShowNextExercisePreview] = useState(false);
  const [showExerciseSession, setShowExerciseSession] = useState(false);
  const [showExerciseTimer, setShowExerciseTimer] = useState(false);

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

  const workoutStats = useMemo((): WorkoutStats => {
    const durationSeconds = Math.floor(
      (currentTime.getTime() - workoutStartTime.getTime()) / 1000,
    );
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
      const userWeight =
        useProfileStore.getState().bodyAnalysis?.current_weight_kg;
      if (userWeight && userWeight > 0) {
        caloriesBurned = calculateWorkoutCalories(
          completedInputs,
          userWeight,
        ).totalCalories;
      }
    }

    return {
      totalDuration: Math.max(0, durationSeconds),
      exercisesCompleted: Math.max(0, exercisesCompleted),
      setsCompleted: Math.max(0, setsCompleted),
      caloriesBurned: Math.max(0, caloriesBurned),
    };
  }, [currentTime, workoutStartTime, exerciseProgress, workout.exercises]);

  const nextExercise = useMemo(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1];
    }
    return null;
  }, [currentExerciseIndex, totalExercises, workout.exercises]);

  const workoutStatsRef = useRef(workoutStats);
  workoutStatsRef.current = workoutStats;

  const handleSetComplete = useCallback(
    async (setIndex: number, onMilestone?: (percentage: number) => void) => {
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
        updated.completedSets[setIndex] = !updated.completedSets[setIndex];

        const allSetsCompleted = updated.completedSets.every(Boolean);
        updated.isCompleted = allSetsCompleted;

        if (allSetsCompleted && !updated.endTime) {
          updated.endTime = new Date();
        }

        newProgress[currentExerciseIndex] = updated;
        setExerciseProgress(newProgress);

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

        const currentSets = safeNumber(currentExercise.sets, 3);
        if (updated.completedSets[setIndex] && setIndex < currentSets - 1) {
          const restTime = safeNumber(currentExercise.restTime, 60);
          setIsRestTime(true);
          setRestTimeRemaining(restTime);
        }

        if (allSetsCompleted && currentExerciseIndex < totalExercises - 1) {
          setShowNextExercisePreview(true);
          if (nextExercisePreviewTimeoutRef.current) {
            clearTimeout(nextExercisePreviewTimeoutRef.current);
          }
          nextExercisePreviewTimeoutRef.current = setTimeout(
            () => setShowNextExercisePreview(false),
            3000,
          );
        }

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
      currentExercise,
      sessionId,
      workout.id,
      totalExercises,
    ],
  );

  const goToNextExercise = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setIsRestTime(false);
      setRestTimeRemaining(0);
      setShowNextExercisePreview(false);
    }
  }, [currentExerciseIndex, totalExercises]);

  const goToPreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setIsRestTime(false);
      setRestTimeRemaining(0);
    }
  }, [currentExerciseIndex]);

  const completeSetAfterTimer = useCallback(() => {
    try {
      setShowExerciseTimer(false);
      const sets = exerciseProgress[currentExerciseIndex]?.completedSets || [];
      const nextIncompleteIndex = sets.findIndex((s) => !s);
      if (nextIncompleteIndex !== -1) {
        handleSetComplete(nextIncompleteIndex);
      }
    } catch (err) {
      console.error("completeSetAfterTimer error:", err);
      setShowExerciseTimer(false);
    }
  }, [exerciseProgress, currentExerciseIndex, handleSetComplete]);

  const completeSetFromSession = useCallback(() => {
    try {
      setShowExerciseSession(false);
      const sets = exerciseProgress[currentExerciseIndex]?.completedSets || [];
      const nextIncompleteIndex = sets.findIndex((s) => !s);
      if (nextIncompleteIndex !== -1) {
        handleSetComplete(nextIncompleteIndex);
      }
    } catch (err) {
      console.error("completeSetFromSession error:", err);
      setShowExerciseSession(false);
    }
  }, [exerciseProgress, currentExerciseIndex, handleSetComplete]);

  return {
    currentExerciseIndex,
    exerciseProgress,
    isRestTime,
    restTimeRemaining,
    workoutStartTime,
    currentTime,
    showInstructionModal,
    showNextExercisePreview,
    showExerciseSession,
    showExerciseTimer,
    currentExercise,
    currentProgress,
    totalExercises,
    overallProgress,
    workoutStats,
    nextExercise,
    setCurrentTime,
    setIsRestTime,
    setShowInstructionModal,
    setShowExerciseSession,
    setShowExerciseTimer,
    handleSetComplete,
    goToNextExercise,
    goToPreviousExercise,
    completeSetAfterTimer,
    completeSetFromSession,
    nextExercisePreviewTimeoutRef,
  };
};
