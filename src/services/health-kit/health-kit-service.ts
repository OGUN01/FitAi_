import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isHealthKitSupported, HealthKitModule } from "./platform";
import { requestAuthorization, hasPermissions } from "./permissions";
import { fetchHealthData, getLastSyncTime } from "./data-fetcher";
import {
  saveWorkoutToHealthKit,
  saveStepsToHealthKit,
  saveWeightToHealthKit,
} from "./data-writer";
import { SyncManager } from "./sync-manager";
import type {
  HealthKitData,
  HealthKitPermissionsStatus,
  WorkoutInput,
  WorkoutExportInput,
  NutritionExportInput,
} from "./types";

class HealthKitService {
  private static instance: HealthKitService;
  private isInitialized = false;
  private syncManager = new SyncManager();

  private constructor() {}

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      if (!Platform.OS || Platform.OS !== "ios") {
        return false;
      }

      if (!HealthKitModule) {
        return false;
      }

      const supported = await isHealthKitSupported();
      if (!supported) {
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize HealthKit:", error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    const result = await this.requestAuthorization();
    return result.granted;
  }

  async requestAuthorization(): Promise<HealthKitPermissionsStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return requestAuthorization();
  }

  async fetchHealthData(
    startDate?: Date,
    endDate?: Date,
  ): Promise<HealthKitData> {
    if (!this.isInitialized || Platform.OS !== "ios" || !HealthKitModule) {
      return {};
    }
    return fetchHealthData(startDate, endDate);
  }

  async saveWorkoutToHealthKit(workout: WorkoutInput): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    return saveWorkoutToHealthKit(workout);
  }

  async saveStepsToHealthKit(steps: number, date?: Date): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    return saveStepsToHealthKit(steps, date);
  }

  async saveWeightToHealthKit(
    weight: number,
    unit: "kg" | "lbs" = "kg",
  ): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    return saveWeightToHealthKit(weight, unit);
  }

  startAutoSync(intervalMinutes: number = 15): void {
    this.syncManager.startAutoSync(intervalMinutes);
  }

  stopAutoSync(): void {
    this.syncManager.stopAutoSync();
  }

  async hasPermissions(): Promise<boolean> {
    return hasPermissions();
  }

  async getLastSyncTime(): Promise<Date | null> {
    return getLastSyncTime();
  }

  isAvailable(): boolean {
    return Platform.OS === "ios" && this.isInitialized && !!HealthKitModule;
  }

  async syncHealthDataFromHealthKit(daysBack: number = 7): Promise<{
    success: boolean;
    data?: HealthKitData;
    error?: string;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const endDate = new Date();

      const data = await this.fetchHealthData(startDate, endDate);

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async exportWorkoutToHealthKit(
    workout: WorkoutExportInput,
  ): Promise<boolean> {
    return this.saveWorkoutToHealthKit({
      type: workout.type,
      duration:
        (workout.endDate.getTime() - workout.startDate.getTime()) / 60000,
      calories: workout.calories,
      distance: workout.distance,
    });
  }

  async exportNutritionToHealthKit(
    nutrition: NutritionExportInput,
  ): Promise<boolean> {
    return false;
  }

  async exportBodyWeightToHealthKit(
    weight: number,
    date: Date = new Date(),
  ): Promise<boolean> {
    return this.saveWeightToHealthKit(weight, "kg");
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove([
      "healthkit_authorized",
      "healthkit_auth_date",
      "healthkit_last_sync",
    ]);
  }

  async getHealthSummary(): Promise<any> {
    const data = await this.fetchHealthData();
    const lastSync = await this.getLastSyncTime();

    return {
      dailySteps: data.steps || 0,
      dailyCalories: data.activeEnergy || 0,
      dailyDistance: 0,
      lastWeight: data.bodyWeight,
      heartRate: data.heartRate,
      recentWorkouts: data.workouts?.length || 0,
      syncStatus: lastSync ? "synced" : "never_synced",
    };
  }

  async getHeartRateZones(age: number): Promise<any> {
    const maxHR = 220 - age;
    const restingHR = 60;

    const zones = {
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
      zone5: { min: Math.round(maxHR * 0.9), max: maxHR, name: "VO2 Max" },
    };

    return { restingHR, maxHR, zones };
  }

  async getSleepBasedWorkoutRecommendations(): Promise<any> {
    const data = await this.fetchHealthData();
    const sleepDuration = data.sleepHours;

    if (!sleepDuration) {
      return { sleepQuality: null, sleepDuration: null, recommendations: null };
    }

    let sleepQuality: "poor" | "fair" | "good" | "excellent" = "fair";
    if (sleepDuration < 6) sleepQuality = "poor";
    else if (sleepDuration < 7) sleepQuality = "fair";
    else if (sleepDuration < 9) sleepQuality = "good";
    else sleepQuality = "excellent";

    return {
      sleepQuality,
      sleepDuration,
      recommendations: {
        intensityAdjustment:
          sleepQuality === "poor"
            ? -2
            : sleepQuality === "fair"
              ? -1
              : sleepQuality === "good"
                ? 0
                : 1,
        workoutType:
          sleepQuality === "poor"
            ? "recovery"
            : sleepQuality === "fair"
              ? "light"
              : sleepQuality === "good"
                ? "moderate"
                : "intense",
        duration:
          sleepQuality === "poor" || sleepQuality === "fair"
            ? "shorter"
            : sleepQuality === "good"
              ? "normal"
              : "longer",
        notes: [`Sleep quality: ${sleepQuality}`],
      },
    };
  }

  async getActivityAdjustedCalories(baseCalories: number): Promise<any> {
    const data = await this.fetchHealthData();
    const activeEnergy = data.activeEnergy || 0;
    const steps = data.steps || 0;

    let activityMultiplier = 1.0;
    if (activeEnergy > 600) activityMultiplier = 1.15;
    else if (activeEnergy > 400) activityMultiplier = 1.1;
    else if (activeEnergy > 200) activityMultiplier = 1.05;
    else activityMultiplier = 0.95;

    const adjustedCalories = Math.round(baseCalories * activityMultiplier);

    return {
      adjustedCalories,
      activityMultiplier,
      breakdown: {
        baseCalories,
        activeEnergy,
        exerciseBonus: 0,
        stepBonus: 0,
      },
      recommendations: [],
    };
  }

  async detectAndLogActivities(): Promise<any> {
    return {
      detectedActivities: [],
      autoLoggedCount: 0,
    };
  }
}

const healthKitService = HealthKitService.getInstance();

export { healthKitService, HealthKitService };
export default healthKitService;
