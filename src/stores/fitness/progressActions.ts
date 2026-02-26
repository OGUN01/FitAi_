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
  updateWorkoutProgress: (workoutId: string, progress: number) => {
    set((state) => ({
      workoutProgress: {
        ...state.workoutProgress,
        [workoutId]: {
          ...state.workoutProgress[workoutId],
          workoutId,
          progress,
        },
      },
    }));
  },

  completeWorkout: async (workoutId: string, sessionId?: string) => {
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
          },
        },
      }));
    }
  },

  getWorkoutProgress: (workoutId: string): WorkoutProgress | null => {
    return get().workoutProgress[workoutId] || null;
  },
});
