import { FitnessState, WorkoutProgress } from "./types";
import { crudOperations } from "../../services/crudOperations";
import { offlineService } from "../../services/offline";
import { getUserIdOrGuest } from "../../services/authUtils";

export const createProgressActions = (
  set: (
    partial:
      | Partial<FitnessState>
      | ((state: FitnessState) => Partial<FitnessState>),
  ) => void,
  get: () => FitnessState,
) => ({
  updateWorkoutProgress: (
    workoutId: string,
    progress: number,
    metadata?: { exerciseIndex?: number; caloriesBurned?: number },
  ) => {
    set((state) => ({
      workoutProgress: {
        ...state.workoutProgress,
        [workoutId]: {
          ...state.workoutProgress[workoutId],
          workoutId,
          progress,
          ...(metadata?.exerciseIndex !== undefined && { exerciseIndex: metadata.exerciseIndex }),
          ...(metadata?.caloriesBurned !== undefined && { caloriesBurned: metadata.caloriesBurned }),
        },
      },
    }));
  },

  completeWorkout: async (workoutId: string, sessionId?: string, caloriesBurned?: number) => {
    const completedAt = new Date().toISOString();

    try {
      if (sessionId) {
        await crudOperations.updateWorkoutSession(sessionId, {
          completedAt,
          isCompleted: true,
          syncMetadata: {
            lastModifiedAt: completedAt,
            syncVersion: 1,
            deviceId: "dev-device",
          },
        });
      }

      set((state) => ({
        workoutProgress: {
          ...state.workoutProgress,
          [workoutId]: {
            workoutId,
            progress: 100,
            completedAt,
            sessionId,
            ...(caloriesBurned !== undefined && { caloriesBurned }),
          },
        },
      }));
    } catch (error) {
      console.error(`❌ Failed to complete workout ${workoutId}:`, error);

      await offlineService.queueAction({
        type: "UPDATE",
        table: "workout_sessions",
        data: {
          id: sessionId,
          completed_at: completedAt,
          is_completed: true,
        },
        userId: getUserIdOrGuest(),
        maxRetries: 3,
      });

      set((state) => ({
        workoutProgress: {
          ...state.workoutProgress,
          [workoutId]: {
            workoutId,
            progress: 100,
            completedAt,
            sessionId,
            ...(caloriesBurned !== undefined && { caloriesBurned }),
          },
        },
      }));
    }
  },

  getWorkoutProgress: (workoutId: string): WorkoutProgress | null => {
    return get().workoutProgress[workoutId] || null;
  },
});
