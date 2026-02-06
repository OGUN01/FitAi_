import type { HealthDataState, HealthConnectSyncResult } from "./types";
import { healthConnectService } from "../../services/healthConnect";
import { weightTrackingService } from "../../services/WeightTrackingService";
import { mapWorkoutTypeToHealthConnect } from "../../services/health/types";

export interface WriteWorkoutResult {
  success: boolean;
  recordId?: string;
  error?: string;
}

export const createHealthConnectActions = (
  set: (
    partial:
      | Partial<HealthDataState>
      | ((state: HealthDataState) => Partial<HealthDataState>),
  ) => void,
  get: () => HealthDataState,
) => ({
  initializeHealthConnect: async (): Promise<boolean> => {
    try {
      console.log("🔗 Initializing Health Connect in store...");

      const isAvailable = await healthConnectService.initializeHealthConnect();

      if (isAvailable) {
        const hasPermissions = await healthConnectService.hasPermissions();
        console.log(
          `Health Connect - Available: ${isAvailable}, Permissions: ${hasPermissions}`,
        );

        set((state) => ({
          isHealthConnectAvailable: isAvailable,
          isHealthConnectAuthorized: hasPermissions,
        }));

        return hasPermissions;
      }

      set({ isHealthConnectAvailable: false });
      return false;
    } catch (error) {
      console.error("❌ Failed to initialize Health Connect:", error);
      set({ syncStatus: "error" });
      return false;
    }
  },

  requestHealthConnectPermissions: async (): Promise<boolean> => {
    try {
      console.log("🔐 Requesting Health Connect permissions from store...");

      const permissionGranted = await healthConnectService.requestPermissions();

      set((state) => ({
        isHealthConnectAuthorized: permissionGranted,
        syncStatus: permissionGranted ? "idle" : "error",
      }));

      return permissionGranted;
    } catch (error) {
      console.error("❌ Failed to request Health Connect permissions:", error);
      set({ syncStatus: "error" });
      return false;
    }
  },

  reauthorizeHealthConnect: async (): Promise<boolean> => {
    try {
      console.log("🔄 Re-authorizing Health Connect from store...");

      set({ isHealthConnectAuthorized: false, syncStatus: "syncing" });

      const success = await healthConnectService.reauthorize();

      set((state) => ({
        isHealthConnectAuthorized: success,
        syncStatus: success ? "idle" : "error",
      }));

      if (success) {
        console.log("✅ Re-authorization successful, syncing data...");
        await get().syncFromHealthConnect(7);
      }

      return success;
    } catch (error) {
      console.error("❌ Failed to re-authorize Health Connect:", error);
      set({ syncStatus: "error", isHealthConnectAuthorized: false });
      return false;
    }
  },

  syncFromHealthConnect: async (
    daysBack: number = 7,
  ): Promise<HealthConnectSyncResult> => {
    try {
      console.log("🔄 Syncing health data from Health Connect...");

      const isInitialized =
        await healthConnectService.initializeHealthConnect();
      if (!isInitialized) {
        console.warn("⚠️ Health Connect not available, skipping sync");
        return { success: false, error: "Health Connect not initialized" };
      }

      set({ syncStatus: "syncing" });

      const healthData = await healthConnectService.syncHealthData(daysBack);

      if (healthData.success && healthData.data) {
        set((state) => ({
          metrics: {
            ...state.metrics,
            steps: healthData.data?.steps ?? state.metrics.steps,
            stepsGoal: state.metrics.stepsGoal ?? 10000,
            heartRate: healthData.data?.heartRate ?? state.metrics.heartRate,
            activeCalories:
              healthData.data?.activeCalories ?? state.metrics.activeCalories,
            totalCalories:
              healthData.data?.totalCalories ?? state.metrics.totalCalories,
            distance: healthData.data?.distance
              ? healthData.data.distance / 1000
              : state.metrics.distance,
            weight: healthData.data?.weight ?? state.metrics.weight,
            sleepHours: healthData.data?.sleep
              ? healthData.data.sleep.reduce(
                  (total, sleep) => total + sleep.duration,
                  0,
                ) / 60
              : state.metrics.sleepHours,
            lastUpdated: new Date().toISOString(),
            sources: healthData.data?.sources ?? state.metrics.sources,
            dataOrigins:
              healthData.data?.dataOrigins ?? state.metrics.dataOrigins,
          },
          lastSyncTime: new Date().toISOString(),
          syncStatus: "success",
        }));

        if (healthData.data?.weight) {
          weightTrackingService.setWeight(healthData.data.weight);
        }

        if (healthData.data?.sources) {
          console.log("📱 Data sources:");
          Object.entries(healthData.data.sources).forEach(
            ([metric, source]) => {
              if (source) {
                console.log(
                  `  ${metric}: ${source.name} (Tier ${source.tier}, ${source.accuracy}% accuracy)`,
                );
              }
            },
          );
        }

        console.log("✅ Health Connect sync completed successfully");
      } else {
        set({
          syncStatus: "error",
          syncError: healthData.error || "Unknown Health Connect sync error",
        });
      }

      return healthData;
    } catch (error) {
      console.error("❌ Health Connect sync failed:", error);

      set({ syncStatus: "error" });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  },

  writeWorkoutToHealthConnect: async (workout: {
    workoutType: string;
    startTime: Date;
    endTime: Date;
    title?: string;
    calories?: number;
    notes?: string;
  }): Promise<WriteWorkoutResult> => {
    try {
      console.log("📝 Writing workout to Health Connect from store...");

      const state = get();
      if (!state.isHealthConnectAvailable) {
        return { success: false, error: "Health Connect not available" };
      }

      if (!state.isHealthConnectAuthorized) {
        return { success: false, error: "Health Connect not authorized" };
      }

      const exerciseType = mapWorkoutTypeToHealthConnect(workout.workoutType);

      const result = await healthConnectService.writeWorkoutSession({
        exerciseType,
        startTime: workout.startTime,
        endTime: workout.endTime,
        title: workout.title,
        calories: workout.calories,
        notes: workout.notes,
      });

      if (result.success) {
        console.log("✅ Workout synced to Health Connect:", result.recordId);
      }

      return result;
    } catch (error) {
      console.error("❌ Failed to write workout to Health Connect:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
