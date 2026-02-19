import { GoogleFitAuth } from "./auth";
import { GoogleFitDataReader } from "./data-reading";
import { GoogleFitDataWriter } from "./data-writing";
import { GoogleFitAnalytics } from "./analytics";
import { GoogleFitCache } from "./cache";
import {
  GoogleFitData,
  GoogleFitSyncResult,
  HealthSummary,
  HeartRateZones,
  SleepRecommendations,
  ActivityAdjustedCalories,
  ActivityDetectionResult,
  WorkoutExportData,
  NutritionExportData,
} from "./types";

class GoogleFitService {
  private auth: GoogleFitAuth;
  private dataReader: GoogleFitDataReader;
  private dataWriter: GoogleFitDataWriter;
  private analytics: GoogleFitAnalytics;
  private cache: GoogleFitCache;

  constructor() {
    this.auth = new GoogleFitAuth();
    this.dataReader = new GoogleFitDataReader();
    this.dataWriter = new GoogleFitDataWriter();
    this.analytics = new GoogleFitAnalytics(this.dataReader, this.dataWriter);
    this.cache = new GoogleFitCache();
  }

  async initialize(): Promise<boolean> {
    return this.auth.initialize();
  }

  async requestPermissions(): Promise<boolean> {
    return this.auth.requestPermissions();
  }

  async hasPermissions(): Promise<boolean> {
    return this.auth.hasPermissions();
  }

  async disconnect(): Promise<boolean> {
    await this.cache.clearCache();
    return this.auth.disconnect();
  }

  async syncHealthDataFromGoogleFit(
    daysBack: number = 7,
  ): Promise<GoogleFitSyncResult> {
    const result = await this.dataReader.syncHealthData(
      daysBack,
      this.hasPermissions.bind(this),
    );
    if (result.success && result.data) {
      await this.cache.cacheHealthData(result.data);
    }
    return result;
  }

  async exportWorkoutToGoogleFit(workout: WorkoutExportData): Promise<boolean> {
    return this.dataWriter.exportWorkout(
      workout,
      this.hasPermissions.bind(this),
    );
  }

  async exportNutritionToGoogleFit(
    nutritionData: NutritionExportData,
  ): Promise<boolean> {
    return this.dataWriter.exportNutrition(
      nutritionData,
      this.hasPermissions.bind(this),
    );
  }

  async exportBodyWeightToGoogleFit(
    weight: number,
    date: Date = new Date(),
  ): Promise<boolean> {
    return this.dataWriter.exportBodyWeight(
      weight,
      date,
      this.hasPermissions.bind(this),
    );
  }

  async getCachedHealthData(): Promise<GoogleFitData | null> {
    return this.cache.getCachedHealthData();
  }

  async getLastSyncTime(): Promise<Date | null> {
    return this.cache.getLastSyncTime();
  }

  async shouldSync(intervalHours: number = 1): Promise<boolean> {
    return this.cache.shouldSync(intervalHours);
  }

  async getHealthSummary(): Promise<HealthSummary> {
    return this.cache.getHealthSummary();
  }

  async clearCache(): Promise<void> {
    return this.cache.clearCache();
  }

  async getHeartRateZones(age: number): Promise<HeartRateZones> {
    return this.analytics.getHeartRateZones(age);
  }

  async getSleepBasedWorkoutRecommendations(): Promise<SleepRecommendations> {
    return this.analytics.getSleepBasedWorkoutRecommendations();
  }

  async getActivityAdjustedCalories(
    baseCalories: number,
  ): Promise<ActivityAdjustedCalories> {
    return this.analytics.getActivityAdjustedCalories(
      baseCalories,
      this.hasPermissions.bind(this),
    );
  }

  async detectAndLogActivities(): Promise<ActivityDetectionResult> {
    return this.analytics.detectAndLogActivities(
      this.hasPermissions.bind(this),
    );
  }
}

export const googleFitService = new GoogleFitService();
export default googleFitService;

export * from "./types";
export { GoogleFitAuth } from "./auth";
export { GoogleFitDataReader } from "./data-reading";
export { GoogleFitDataWriter } from "./data-writing";
export { GoogleFitAnalytics } from "./analytics";
export { GoogleFitCache } from "./cache";
