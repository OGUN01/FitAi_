import { storeLogger } from '../../utils/logger';
import { DayWorkout } from "../../ai";
import { generateUUID } from "../../utils/uuid";
import { FitnessState, CurrentWorkoutSession } from "./types";
import { crudOperations } from "../../services/crudOperations";
import { getUserIdOrGuest } from "../../services/authUtils";
import { LocalWorkoutSession, SyncStatus } from "../../types/localData";

export const createSessionActions = (
  set: (
    partial:
      | Partial<FitnessState>
      | ((state: FitnessState) => Partial<FitnessState>),
  ) => void,
  get: () => FitnessState,
) => ({
  startWorkoutSession: async (workout: DayWorkout): Promise<string> => {
    const sessionId = generateUUID();

    try {
      const workoutSession: LocalWorkoutSession = {
        id: sessionId,
        localId: `local_${sessionId}`,
        workoutId: workout.id,
        userId: getUserIdOrGuest(),
        startedAt: new Date().toISOString(),
        completedAt: null,
        duration: workout.duration
          ? Math.max(5, Math.min(300, workout.duration))
          : 0,
        caloriesBurned: workout.estimatedCalories
          ? Math.max(0, Math.min(10000, workout.estimatedCalories))
          : 0,
        exercises: workout.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: Array.from({ length: exercise.sets }, (_, index) => ({
            reps:
              typeof exercise.reps === "string"
                ? parseInt(exercise.reps) || 10
                : exercise.reps,
            weight: exercise.weight || 0,
            duration: 0,
            restTime: exercise.restTime || 60,
            rpe: 5,
            completed: false,
          })),
          notes: exercise.notes || "",
          personalRecord: false,
        })),
        notes: `Active session: ${workout.dayOfWeek} - ${workout.description || workout.title}`,
        rating: 0,
        isCompleted: false,
        syncStatus: "pending" as SyncStatus,
        syncMetadata: {
          lastSyncedAt: undefined,
          lastModifiedAt: new Date().toISOString(),
          syncVersion: 1,
          deviceId: "dev-device",
        },
      };

      await crudOperations.createWorkoutSession(workoutSession);

      set({
        currentWorkoutSession: {
          workoutId: workout.id,
          sessionId,
          startedAt: new Date().toISOString(),
          exercises: workout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            completed: false,
            sets: Array(exercise.sets)
              .fill(null)
              .map(() => ({
                reps: 0,
                weight: 0,
                completed: false,
              })),
          })),
        },
      });

      return sessionId;
    } catch (error) {
      storeLogger.error('Failed to start workout session', { error: String(error) });
      throw error;
    }
  },

  endWorkoutSession: async (sessionId: string) => {
    try {
      const currentSession = get().currentWorkoutSession;
      if (!currentSession) {
        throw new Error("No active workout session");
      }

      await crudOperations.updateWorkoutSession(sessionId, {
        completedAt: new Date().toISOString(),
      });

      await get().completeWorkout(currentSession.workoutId, sessionId);

      set({ currentWorkoutSession: null });

    } catch (error) {
      storeLogger.error('Failed to end workout session', { error: String(error) });
      throw error;
    }
  },

  updateExerciseProgress: (
    exerciseId: string,
    setIndex: number,
    reps: number,
    weight: number,
  ) => {
    set((state) => {
      if (!state.currentWorkoutSession) return state;

      const updatedExercises = state.currentWorkoutSession.exercises.map(
        (exercise) => {
          if (exercise.exerciseId === exerciseId) {
            const updatedSets = [...exercise.sets];
            if (updatedSets[setIndex]) {
              updatedSets[setIndex] = {
                reps,
                weight,
                completed: reps > 0,
              };
            }

            const completedSets = updatedSets.filter(
              (set) => set.completed,
            ).length;
            const exerciseCompleted = completedSets === updatedSets.length;

            return {
              ...exercise,
              sets: updatedSets,
              completed: exerciseCompleted,
            };
          }
          return exercise;
        },
      );

      const totalExercises = updatedExercises.length;
      const completedExercises = updatedExercises.filter(
        (ex) => ex.completed,
      ).length;
      const progressPercent = Math.round(
        (completedExercises / totalExercises) * 100,
      );

      get().updateWorkoutProgress(
        state.currentWorkoutSession!.workoutId,
        progressPercent,
      );

      return {
        ...state,
        currentWorkoutSession: {
          ...state.currentWorkoutSession,
          exercises: updatedExercises,
        },
      };
    });
  },
});
