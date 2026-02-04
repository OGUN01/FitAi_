import { useState, useCallback, useMemo, useRef } from "react";
import { Platform, Vibration } from "react-native";
import { DayWorkout } from "../types/ai";
import completionTrackingService from "../services/completionTracking";

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

export const useWorkoutSession = (workout: DayWorkout, sessionId?: string) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    workout.exercises.map((exercise, index) => ({
      exerciseIndex: index,
      completedSets: new Array(safeNumber(exercise?.sets, 3)).fill(false),
      isCompleted: false,
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
    const duration = Math.round(
      (currentTime.getTime() - workoutStartTime.getTime()) / 60000,
    );
    const exercisesCompleted = exerciseProgress.filter(
      (ep) => ep?.isCompleted,
    ).length;
    const setsCompleted = exerciseProgress.reduce(
      (total, ep) => total + (ep?.completedSets?.filter(Boolean).length || 0),
      0,
    );
    const caloriesBurned = Math.round(
      (duration * safeNumber(workout.estimatedCalories, 300)) / 60,
    );

    return {
      totalDuration: Math.max(0, duration),
      exercisesCompleted: Math.max(0, exercisesCompleted),
      setsCompleted: Math.max(0, setsCompleted),
      caloriesBurned: Math.max(0, caloriesBurned),
    };
  }, [
    currentTime,
    workoutStartTime,
    exerciseProgress,
    workout.estimatedCalories,
  ]);

  const nextExercise = useMemo(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1];
    }
    return null;
  }, [currentExerciseIndex, totalExercises, workout.exercises]);

  const handleSetComplete = useCallback(
    async (setIndex: number, onMilestone?: (percentage: number) => void) => {
      try {
        if (Platform.OS !== "web") {
          Vibration.vibrate(50);
        }

        const newProgress = [...exerciseProgress];
        if (!newProgress[currentExerciseIndex]) return;

        newProgress[currentExerciseIndex].completedSets[setIndex] =
          !newProgress[currentExerciseIndex].completedSets[setIndex];

        const allSetsCompleted =
          newProgress[currentExerciseIndex].completedSets.every(Boolean);
        newProgress[currentExerciseIndex].isCompleted = allSetsCompleted;

        if (allSetsCompleted && !newProgress[currentExerciseIndex].endTime) {
          newProgress[currentExerciseIndex].endTime = new Date();
        }

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
            stats: workoutStats,
          },
        );

        const currentSets = safeNumber(currentExercise.sets, 3);
        if (
          newProgress[currentExerciseIndex].completedSets[setIndex] &&
          setIndex < currentSets - 1
        ) {
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
      workoutStats,
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
    // State
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

    // Computed
    currentExercise,
    currentProgress,
    totalExercises,
    overallProgress,
    workoutStats,
    nextExercise,

    // Actions
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

    // Refs
    nextExercisePreviewTimeoutRef,
  };
};
