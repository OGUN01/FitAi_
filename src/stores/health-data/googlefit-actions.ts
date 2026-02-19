import type {
  HealthDataState,
  GoogleFitSyncResult,
  GoogleFitHeartRateZones,
  SleepRecommendations,
  ActivityAdjustedCalories,
  DetectedActivities,
  HealthMetrics,
} from "./types";
import { googleFitService } from "../../services/googleFit";
import { weightTrackingService } from "../../services/WeightTrackingService";

export const createGoogleFitActions = (
  set: (
    partial:
      | Partial<HealthDataState>
      | ((state: HealthDataState) => Partial<HealthDataState>),
  ) => void,
  get: () => HealthDataState,
) => ({
  initializeGoogleFit: async (): Promise<boolean> => {
    try {
      console.log("🤖 Initializing Google Fit in store...");
      const isAvailable = await googleFitService.initialize();

      if (isAvailable) {
        const hasPermissions = await googleFitService.hasPermissions();
        console.log(
          `🤖 Google Fit available: ${isAvailable}, permissions: ${hasPermissions}`,
        );
        return hasPermissions;
      }

      return false;
    } catch (error) {
      console.error("❌ Failed to initialize Google Fit:", error);
      return false;
    }
  },

  syncFromGoogleFit: async (
    daysBack: number = 7,
  ): Promise<GoogleFitSyncResult> => {
    try {
      console.log("🤖 Syncing data from Google Fit...");
      set({ syncStatus: "syncing" });

      const result =
        await googleFitService.syncHealthDataFromGoogleFit(daysBack);

      if (result.success && result.data) {
        const currentMetrics = get().metrics;
        const updatedMetrics: HealthMetrics = {
          ...currentMetrics,
          steps: result.data.steps || currentMetrics.steps,
          activeCalories: result.data.calories || currentMetrics.activeCalories,
          distance: result.data.distance
            ? result.data.distance / 1000
            : currentMetrics.distance,
          heartRate: result.data.heartRate || currentMetrics.heartRate,
          weight: result.data.weight || currentMetrics.weight,
          lastUpdated: new Date().toISOString(),
        };

        if (result.data.workouts) {
          updatedMetrics.recentWorkouts = [
            ...result.data.workouts.map((workout) => ({
              id: workout.id,
              type: workout.type,
              duration: workout.duration,
              calories: workout.calories,
              date: workout.startDate,
              source: "GoogleFit" as const,
            })),
            ...currentMetrics.recentWorkouts
              .filter((w) => w.source !== "GoogleFit")
              .slice(0, 5),
          ].slice(0, 10);
        }

        set({
          metrics: updatedMetrics,
          syncStatus: "success",
          lastSyncTime: new Date().toISOString(),
          syncError: undefined,
        });

        if (result.data.weight) {
          weightTrackingService.setWeight(result.data.weight);
        }

        console.log("✅ Google Fit sync completed successfully");
      } else {
        set({
          syncStatus: "error",
          syncError: result.error || "Unknown Google Fit sync error",
        });
        console.error("❌ Google Fit sync failed:", result.error);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        syncStatus: "error",
        syncError: errorMessage,
      });
      console.error("❌ Google Fit sync failed:", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  getGoogleFitHeartRateZones: async (
    age: number,
  ): Promise<GoogleFitHeartRateZones> => {
    try {
      console.log("❤️ Getting heart rate zones from Google Fit...");
      return await googleFitService.getHeartRateZones(age);
    } catch (error) {
      console.error(
        "❌ Failed to get heart rate zones from Google Fit:",
        error,
      );
      const maxHR = 220 - age;
      return {
        maxHR,
        zones: {
          zone1: {
            min: Math.round(maxHR * 0.5),
            max: Math.round(maxHR * 0.6),
            name: "Recovery",
          },
          zone2: {
            min: Math.round(maxHR * 0.6),
            max: Math.round(maxHR * 0.7),
            name: "Aerobic Base",
          },
          zone3: {
            min: Math.round(maxHR * 0.7),
            max: Math.round(maxHR * 0.8),
            name: "Aerobic",
          },
          zone4: {
            min: Math.round(maxHR * 0.8),
            max: Math.round(maxHR * 0.9),
            name: "Lactate Threshold",
          },
          zone5: {
            min: Math.round(maxHR * 0.9),
            max: maxHR,
            name: "VO2 Max",
          },
        },
      };
    }
  },

  getGoogleFitSleepRecommendations: async (): Promise<SleepRecommendations> => {
    try {
      console.log(
        "😴 Getting sleep-based workout recommendations from Google Fit...",
      );
      const recommendations =
        await googleFitService.getSleepBasedWorkoutRecommendations();
      return {
        sleepQuality: recommendations.sleepQuality,
        sleepDuration: recommendations.sleepDuration,
        workoutRecommendations: recommendations.recommendations,
      };
    } catch (error) {
      console.error(
        "❌ Failed to get sleep recommendations from Google Fit:",
        error,
      );
      return {
        sleepQuality: "fair",
        sleepDuration: 7,
        workoutRecommendations: {
          intensityAdjustment: 0,
          workoutType: "moderate",
          duration: "normal",
          notes: ["Sleep data unavailable - proceeding with normal workout"],
        },
      };
    }
  },

  getGoogleFitActivityAdjustedCalories: async (
    baseCalories: number,
  ): Promise<ActivityAdjustedCalories> => {
    try {
      console.log("🔥 Getting activity-adjusted calories from Google Fit...");
      return await googleFitService.getActivityAdjustedCalories(baseCalories);
    } catch (error) {
      console.error(
        "❌ Failed to get activity-adjusted calories from Google Fit:",
        error,
      );
      return {
        adjustedCalories: baseCalories,
        activityMultiplier: 1.0,
        breakdown: {
          baseCalories,
          activeEnergy: 0,
          exerciseBonus: 0,
          stepBonus: 0,
        },
        recommendations: [
          "Error calculating activity adjustment - using base calories",
        ],
      };
    }
  },

  detectAndLogGoogleFitActivities: async (): Promise<DetectedActivities> => {
    try {
      console.log("🤖 Detecting and logging activities from Google Fit...");
      return await googleFitService.detectAndLogActivities();
    } catch (error) {
      console.error("❌ Failed to detect activities from Google Fit:", error);
      return {
        detectedActivities: [],
        autoLoggedCount: 0,
      };
    }
  },
});
