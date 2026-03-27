import type { StateCreator } from "zustand";
import type {
  HealthDataState,
  HealthMetrics,
  WorkoutExport,
  NutritionExport,
  HealthSyncResult,
} from "./types";
import { healthKitService } from "../../services/healthKit";
import { weightTrackingService } from "../../services/WeightTrackingService";
import { useProfileStore } from "../profileStore";

export const createHealthKitActions = (
  set: (
    partial:
      | Partial<HealthDataState>
      | ((state: HealthDataState) => Partial<HealthDataState>),
  ) => void,
  get: () => HealthDataState,
) => ({
  initializeHealthKit: async (): Promise<boolean> => {
    try {
      const isAvailable = await healthKitService.initialize();
      const hasPermissions = await healthKitService.hasPermissions();

      set({
        isHealthKitAvailable: isAvailable,
        isHealthKitAuthorized: hasPermissions,
      });

      if (isAvailable && hasPermissions) {
        get().syncHealthData(false);
      }

      return isAvailable;
    } catch (error) {
      console.error("❌ Failed to initialize HealthKit:", error);
      return false;
    }
  },

  requestHealthKitPermissions: async (): Promise<boolean> => {
    try {
      set({ syncStatus: "syncing" });

      const granted = await healthKitService.initialize();

      set({
        isHealthKitAuthorized: granted,
        syncStatus: granted ? "success" : "error",
        syncError: granted ? undefined : "HealthKit permissions denied",
      });

      if (granted) {
        await get().syncHealthData(true);
      }

      return granted;
    } catch (error) {
      console.error("❌ Failed to request HealthKit permissions:", error);
      set({
        syncStatus: "error",
        syncError:
          error instanceof Error ? error.message : "Permission request failed",
      });
      return false;
    }
  },

  syncHealthData: async (force: boolean = false): Promise<void> => {
    try {
      const { settings, isHealthKitAuthorized } = get();

      if (!settings.healthKitEnabled || !isHealthKitAuthorized) {
        return;
      }

      set({ syncStatus: "syncing", syncError: undefined });

      const syncResult: HealthSyncResult = {
        success: true,
        data: {} as any,
      };

      if (syncResult.success && syncResult.data) {
        const newMetrics: HealthMetrics = {
          ...get().metrics,
          steps: syncResult.data.steps || 0,
          activeCalories: syncResult.data.activeEnergy || 0,
          weight: syncResult.data.bodyWeight,
          heartRate: syncResult.data.heartRate,
          sleepHours: syncResult.data.sleepHours,
          recentWorkouts: [
            ...get().metrics.recentWorkouts,
            ...(syncResult.data.workouts?.map((workout: any) => ({
              id: workout.id || `workout_${Date.now()}`,
              type: workout.type || "unknown",
              duration: workout.duration || 0,
              calories: workout.caloriesBurned || 0,
              date: workout.startDate || new Date().toISOString(),
              source: "HealthKit" as const,
            })) || []),
          ].slice(-20),
          lastUpdated: new Date().toISOString(),
        };

        set({
          metrics: newMetrics,
          syncStatus: "success",
          lastSyncTime: new Date().toISOString(),
          syncError: undefined,
        });

        if (syncResult.data.bodyWeight) {
          useProfileStore
            .getState()
            .updateBodyAnalysis({
              current_weight_kg: syncResult.data.bodyWeight,
            });
          weightTrackingService.setWeight(syncResult.data.bodyWeight);
        }

        const insights = get().getHealthInsights();
        if (insights.length > 0) {
          set({ healthTipOfDay: insights[0] });
        }
      } else {
        throw new Error(syncResult.error || "Sync failed");
      }
    } catch (error) {
      console.error("❌ HealthKit sync failed:", error);
      set({
        syncStatus: "error",
        syncError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  },

  exportWorkoutToHealthKit: async (
    workout: WorkoutExport,
  ): Promise<boolean> => {
    try {
      const { settings, isHealthKitAuthorized } = get();

      if (!settings.exportToHealthKit || !isHealthKitAuthorized) {
        return false;
      }

      const success = await healthKitService.saveWorkoutToHealthKit({
        type: workout.type,
        duration: Math.round(
          (workout.endDate.getTime() - workout.startDate.getTime()) / 60000,
        ),
        calories: workout.calories,
        distance: workout.distance,
      });

      if (success) {
        const workoutEntry = {
          id: `fitai_${Date.now()}`,
          type: workout.type,
          duration: Math.round(
            (workout.endDate.getTime() - workout.startDate.getTime()) / 60000,
          ),
          calories: workout.calories,
          date: workout.startDate.toISOString(),
          source: "FitAI" as const,
        };

        get().updateHealthMetrics({
          recentWorkouts: [...get().metrics.recentWorkouts, workoutEntry].slice(
            -20,
          ),
        });
      }

      return success;
    } catch (error) {
      console.error("❌ Failed to export workout to HealthKit:", error);
      return false;
    }
  },

  exportNutritionToHealthKit: async (
    nutrition: NutritionExport,
  ): Promise<boolean> => {
    try {
      const { settings, isHealthKitAuthorized } = get();

      if (
        !settings.exportToHealthKit ||
        !settings.dataTypesToSync.nutrition ||
        !isHealthKitAuthorized
      ) {
        return false;
      }

      return false;
    } catch (error) {
      console.error("❌ Failed to export nutrition to HealthKit:", error);
      return false;
    }
  },
});
