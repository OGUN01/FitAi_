import { useState } from "react";
import {
  Exercise,
  Workout,
  UserWorkoutPreferences,
  FitnessGoals,
  WorkoutStats,
} from "./types";

export const useFitnessDataState = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  const [userWorkouts, setUserWorkouts] = useState<Workout[]>([]);
  const [userWorkoutsLoading, setUserWorkoutsLoading] = useState(false);
  const [userWorkoutsError, setUserWorkoutsError] = useState<string | null>(
    null,
  );

  const [workoutPreferences, setWorkoutPreferences] =
    useState<UserWorkoutPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoals | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  return {
    exercises,
    setExercises,
    exercisesLoading,
    setExercisesLoading,
    exercisesError,
    setExercisesError,

    userWorkouts,
    setUserWorkouts,
    userWorkoutsLoading,
    setUserWorkoutsLoading,
    userWorkoutsError,
    setUserWorkoutsError,

    workoutPreferences,
    setWorkoutPreferences,
    preferencesLoading,
    setPreferencesLoading,
    preferencesError,
    setPreferencesError,

    fitnessGoals,
    setFitnessGoals,
    goalsLoading,
    setGoalsLoading,
    goalsError,
    setGoalsError,

    workoutStats,
    setWorkoutStats,
    statsLoading,
    setStatsLoading,
    statsError,
    setStatsError,
  };
};
