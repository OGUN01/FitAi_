import { Platform } from "react-native";
import { healthKitService } from "../../healthKit";
import { googleFitService } from "../../googleFit";
import { PlatformType, WearableIntegrationStatus } from "./types";

export class PlatformService {
  private currentPlatform: PlatformType;

  constructor() {
    this.currentPlatform =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
          ? "android"
          : "web";
  }

  async initialize(): Promise<boolean> {
    try {

      switch (this.currentPlatform) {
        case "ios":
          return await healthKitService.initialize();

        case "android":
          return await googleFitService.initialize();

        case "web":
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Wearable manager initialization failed:", error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {

      switch (this.currentPlatform) {
        case "ios":
          return await healthKitService.requestPermissions();

        case "android":
          return await googleFitService.requestPermissions();

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Failed to request wearable permissions:", error);
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      switch (this.currentPlatform) {
        case "ios":
          return await healthKitService.hasPermissions();

        case "android":
          return await googleFitService.hasPermissions();

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Error checking wearable permissions:", error);
      return false;
    }
  }

  async getIntegrationStatus(): Promise<WearableIntegrationStatus> {
    try {
      const isAvailable = await this.isWearableServiceAvailable();
      const isAuthorized = await this.hasPermissions();

      let serviceName: string;
      let supportedFeatures: string[];
      let lastSync: string | undefined;

      switch (this.currentPlatform) {
        case "ios":
          serviceName = "Apple HealthKit";
          supportedFeatures = [
            "Steps",
            "Heart Rate",
            "Workouts",
            "Sleep",
            "Weight",
            "Body Composition",
            "Nutrition",
            "Active Energy",
          ];
          const healthKitLastSync = await healthKitService.getLastSyncTime();
          lastSync = healthKitLastSync?.toISOString();
          break;

        case "android":
          serviceName = "Google Fit";
          supportedFeatures = [
            "Steps",
            "Heart Rate",
            "Workouts",
            "Sleep",
            "Weight",
            "Distance",
            "Calories",
            "Activities",
          ];
          const googleFitLastSync = await googleFitService.getLastSyncTime();
          lastSync = googleFitLastSync?.toISOString();
          break;

        default:
          serviceName = "Not Supported";
          supportedFeatures = [];
          break;
      }

      return {
        isAvailable,
        isAuthorized,
        platform: this.currentPlatform,
        serviceName,
        supportedFeatures,
        lastSync,
      };
    } catch (error) {
      console.error("❌ Error getting integration status:", error);
      return {
        isAvailable: false,
        isAuthorized: false,
        platform: this.currentPlatform,
        serviceName: "Error",
        supportedFeatures: [],
      };
    }
  }

  async getHealthSummary(): Promise<any> {
    try {
      switch (this.currentPlatform) {
        case "ios":
          return await healthKitService.getHealthSummary();

        case "android":
          return await googleFitService.getHealthSummary();

        default:
          return {
            dailySteps: 0,
            dailyCalories: 0,
            recentWorkouts: 0,
            syncStatus: "never_synced",
          };
      }
    } catch (error) {
      console.error("❌ Error getting health summary:", error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        recentWorkouts: 0,
        syncStatus: "never_synced",
      };
    }
  }

  async clearCache(): Promise<void> {
    try {

      switch (this.currentPlatform) {
        case "ios":
          await healthKitService.clearCache();
          break;

        case "android":
          await googleFitService.clearCache();
          break;

        default:
          break;
      }

    } catch (error) {
      console.error("❌ Error clearing wearable cache:", error);
    }
  }

  getPlatformInfo(): {
    platform: PlatformType;
    serviceName: string;
    isSupported: boolean;
  } {
    return {
      platform: this.currentPlatform,
      serviceName:
        this.currentPlatform === "ios"
          ? "Apple HealthKit"
          : this.currentPlatform === "android"
            ? "Google Fit"
            : "Not Supported",
      isSupported: this.currentPlatform !== "web",
    };
  }

  getCurrentPlatform(): PlatformType {
    return this.currentPlatform;
  }

  private async isWearableServiceAvailable(): Promise<boolean> {
    try {
      switch (this.currentPlatform) {
        case "ios":
          return await healthKitService.initialize();

        case "android":
          return await googleFitService.initialize();

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Error checking wearable service availability:", error);
      return false;
    }
  }
}
