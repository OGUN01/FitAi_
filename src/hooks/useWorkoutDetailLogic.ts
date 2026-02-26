import React from "react";
import { useFitnessStore } from "../stores/fitnessStore";
import { ResponsiveTheme } from "../utils/constants";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  duration?: string;
  restTime: string;
  instructions: string[];
  targetMuscles: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  equipment: string[];
}

interface Workout {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: string;
  targetMuscles: string[];
  equipment: string[];
  calories: number;
  exercises: Exercise[];
}

export const useWorkoutDetailLogic = (workoutId: string) => {
  const { weeklyWorkoutPlan, workoutProgress, isGeneratingPlan } =
    useFitnessStore();
  const [selectedExercise, setSelectedExercise] =
    React.useState<Exercise | null>(null);
  const [isFavorited, setIsFavorited] = React.useState(false);

  // Find the workout from the store by ID
  const workout = React.useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return null;

    // Search through all workouts in the weekly plan
    // DayWorkout extends Workout which has: title, category, targetMuscleGroups, estimatedCalories, difficulty
    for (const dailyWorkout of weeklyWorkoutPlan.workouts) {
      if (dailyWorkout.id === workoutId) {
        return {
          id: dailyWorkout.id,
          name: dailyWorkout.title || dailyWorkout.category || "Workout",
          description:
            dailyWorkout.description ||
            `${dailyWorkout.category} workout focusing on ${dailyWorkout.targetMuscleGroups?.join(", ") || "full body"}`,
          duration: dailyWorkout.duration
            ? `${dailyWorkout.duration} min`
            : "45-60 min",
          difficulty: dailyWorkout.difficulty || "intermediate",
          targetMuscles: dailyWorkout.targetMuscleGroups || [],
          equipment: dailyWorkout.equipment || [],
          calories: dailyWorkout.estimatedCalories || 0,
          exercises: (dailyWorkout.exercises || []).map(
            (ex: any, index: number) => ({
              id: ex.id || `ex_${index}`,
              name: ex.name || ex.exercise?.name || "Exercise",
              sets: ex.sets || 3,
              reps:
                ex.reps?.toString() || ex.repetitions?.toString() || "10-12",
              weight: ex.weight || ex.suggestedWeight,
              duration: ex.duration,
              restTime:
                ex.restTime || (ex.restSeconds ? `${ex.restSeconds}s` : "60s"),
              instructions: ex.instructions || ex.formTips || [],
              targetMuscles: ex.targetMuscles || ex.muscleGroups || [],
              difficulty: ex.difficulty || "Intermediate",
              equipment: ex.equipment || [],
            }),
          ) as Exercise[],
        };
      }
    }
    return null;
  }, [weeklyWorkoutPlan, workoutId]);

  // Get progress for this workout - WorkoutProgress has: progress (0-100), completedAt
  const progressData = workoutProgress[workoutId];
  const isCompleted = progressData?.completedAt !== undefined;
  const completionPercentage = progressData?.progress || 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return ResponsiveTheme.colors.success;
      case "Intermediate":
        return ResponsiveTheme.colors.warning;
      case "Advanced":
        return ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.textSecondary;
    }
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  return {
    state: {
      workout,
      selectedExercise,
      isFavorited,
      isCompleted,
      completionPercentage,
      isGeneratingPlan,
    },
    actions: {
      toggleFavorite,
      handleExerciseSelect,
      getDifficultyColor,
    },
  };
};
