import { healthKitService, HealthKitData } from "../../healthKit";
import { googleFitService, GoogleFitData } from "../../googleFit";
import { UnifiedHealthData, PlatformType } from "./types";

export class DataSyncService {
  constructor(private getPlatform: () => PlatformType) {}

  async syncHealthData(daysBack: number = 7): Promise<{
    success: boolean;
    data?: UnifiedHealthData;
    error?: string;
  }> {
    try {
      const platform = this.getPlatform();
      console.log(`🔄 Syncing health data from ${platform} wearables...`);

      let platformData: HealthKitData | GoogleFitData | null = null;

      switch (platform) {
        case "ios": {
          const result =
            await healthKitService.syncHealthDataFromHealthKit(daysBack);
          if (result.success && result.data) {
            platformData = result.data;
          } else {
            return { success: false, error: result.error };
          }
          break;
        }

        case "android": {
          const result =
            await googleFitService.syncHealthDataFromGoogleFit(daysBack);
          if (result.success && result.data) {
            platformData = result.data;
          } else {
            return { success: false, error: result.error };
          }
          break;
        }

        default:
          return { success: false, error: "Platform not supported" };
      }

      if (!platformData) {
        return {
          success: false,
          error: "No data received from wearable service",
        };
      }

      const unifiedData = this.convertToUnifiedFormat(platformData, platform);

      return { success: true, data: unifiedData };
    } catch (error) {
      console.error("❌ Health data sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  private convertToUnifiedFormat(
    platformData: HealthKitData | GoogleFitData,
    platform: PlatformType,
  ): UnifiedHealthData {
    if ("sleepHours" in platformData) {
      const healthKitData = platformData as HealthKitData;

      return {
        steps: healthKitData.steps || 0,
        calories: healthKitData.activeEnergy || 0,
        distance: healthKitData.distance || 0,
        heartRate: healthKitData.heartRate,
        weight: healthKitData.bodyWeight,
        sleepHours: healthKitData.sleepHours,
        workouts:
          healthKitData.workouts?.map((workout) => ({
            id: workout.id,
            type: workout.activityType,
            name: workout.activityType,
            duration: workout.duration,
            calories: workout.energyBurned,
            date: workout.startDate.toISOString(),
            source: "HealthKit",
          })) || [],
        lastSyncDate: new Date().toISOString(),
        platform: "ios",
      };
    }

    const googleFitData = platformData as GoogleFitData;

    return {
      steps: googleFitData.steps || 0,
      calories: googleFitData.calories || 0,
      distance: googleFitData.distance
        ? Math.round((googleFitData.distance / 1000) * 10) / 10
        : 0,
      heartRate: googleFitData.heartRate,
      weight: googleFitData.weight,
      sleepHours: googleFitData.sleepData?.length
        ? googleFitData.sleepData.reduce(
            (sum, sleep) => sum + sleep.duration,
            0,
          ) / 60
        : undefined,
      workouts:
        googleFitData.workouts?.map((workout) => ({
          id: workout.id,
          type: workout.type,
          name: workout.name,
          duration: workout.duration,
          calories: workout.calories,
          date: workout.startDate,
          source: "Google Fit",
        })) || [],
      lastSyncDate: googleFitData.lastSyncDate || new Date().toISOString(),
      platform: "android",
    };
  }
}
