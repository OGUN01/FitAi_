import { healthKitService } from "../../healthKit";
import { googleFitService } from "../../googleFit";
import {
  UnifiedHeartRateZones,
  UnifiedSleepRecommendations,
  UnifiedActivityAdjustedCalories,
  UnifiedDetectedActivities,
  PlatformType,
} from "./types";

export class InsightsService {
  constructor(private getPlatform: () => PlatformType) {}

  async getHeartRateZones(age: number): Promise<UnifiedHeartRateZones | null> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios": {
          const zones = await healthKitService.getHeartRateZones(age);
          return zones;
        }

        case "android": {
          const zones = await googleFitService.getHeartRateZones(age);
          return zones;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error("❌ Failed to get heart rate zones:", error);
      return null;
    }
  }

  async getSleepBasedWorkoutRecommendations(): Promise<UnifiedSleepRecommendations | null> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios": {
          const recommendations =
            await healthKitService.getSleepBasedWorkoutRecommendations();
          return recommendations;
        }

        case "android": {
          const recommendations =
            await googleFitService.getSleepBasedWorkoutRecommendations();
          return recommendations;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error("❌ Failed to get sleep recommendations:", error);
      return null;
    }
  }

  async getActivityAdjustedCalories(
    baseCalories: number,
  ): Promise<UnifiedActivityAdjustedCalories | null> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios": {
          const calories =
            await healthKitService.getActivityAdjustedCalories(baseCalories);
          return calories;
        }

        case "android": {
          const calories =
            await googleFitService.getActivityAdjustedCalories(baseCalories);
          return calories;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error("❌ Failed to get activity-adjusted calories:", error);
      return null;
    }
  }

  async detectAndLogActivities(): Promise<UnifiedDetectedActivities | null> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios": {
          const activities = await healthKitService.detectAndLogActivities();
          return activities;
        }

        case "android": {
          const activities = await googleFitService.detectAndLogActivities();
          return activities;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error("❌ Failed to detect activities:", error);
      return null;
    }
  }

  async getWearableInsights(
    age: number,
    baseCalories: number,
  ): Promise<{
    heartRateZones?: UnifiedHeartRateZones;
    sleepRecommendations?: UnifiedSleepRecommendations;
    adjustedCalories?: UnifiedActivityAdjustedCalories;
    recentActivities?: UnifiedDetectedActivities;
    platform: string;
    timestamp: string;
  }> {
    try {
      const platform = this.getPlatform();

      const [
        heartRateZones,
        sleepRecommendations,
        adjustedCalories,
        recentActivities,
      ] = await Promise.all([
        this.getHeartRateZones(age),
        this.getSleepBasedWorkoutRecommendations(),
        this.getActivityAdjustedCalories(baseCalories),
        this.detectAndLogActivities(),
      ]);

      return {
        heartRateZones: heartRateZones || undefined,
        sleepRecommendations: sleepRecommendations || undefined,
        adjustedCalories: adjustedCalories || undefined,
        recentActivities: recentActivities || undefined,
        platform,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Failed to get wearable insights:", error);
      return {
        platform: this.getPlatform(),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
