import { PlatformService } from "./platformService";
import { DataSyncService } from "./dataSync";
import { DataExportService } from "./dataExport";
import { InsightsService } from "./insights";
import {
  UnifiedHealthData,
  UnifiedHeartRateZones,
  UnifiedSleepRecommendations,
  UnifiedActivityAdjustedCalories,
  UnifiedDetectedActivities,
  WearableIntegrationStatus,
  WearableExportData,
  NutritionExportData,
  PlatformType,
} from "./types";

class WearableManager {
  private platformService: PlatformService;
  private dataSyncService: DataSyncService;
  private dataExportService: DataExportService;
  private insightsService: InsightsService;

  constructor() {
    this.platformService = new PlatformService();
    this.dataSyncService = new DataSyncService(() =>
      this.platformService.getCurrentPlatform(),
    );
    this.dataExportService = new DataExportService(() =>
      this.platformService.getCurrentPlatform(),
    );
    this.insightsService = new InsightsService(() =>
      this.platformService.getCurrentPlatform(),
    );
  }

  async initialize(): Promise<boolean> {
    return this.platformService.initialize();
  }

  async requestPermissions(): Promise<boolean> {
    return this.platformService.requestPermissions();
  }

  async hasPermissions(): Promise<boolean> {
    return this.platformService.hasPermissions();
  }

  async syncHealthData(daysBack: number = 7): Promise<{
    success: boolean;
    data?: UnifiedHealthData;
    error?: string;
  }> {
    return this.dataSyncService.syncHealthData(daysBack);
  }

  async exportWorkout(workout: WearableExportData): Promise<boolean> {
    return this.dataExportService.exportWorkout(workout);
  }

  async exportNutrition(nutrition: NutritionExportData): Promise<boolean> {
    return this.dataExportService.exportNutrition(nutrition);
  }

  async exportBodyWeight(
    weight: number,
    date: Date = new Date(),
  ): Promise<boolean> {
    return this.dataExportService.exportBodyWeight(weight, date);
  }

  async getIntegrationStatus(): Promise<WearableIntegrationStatus> {
    return this.platformService.getIntegrationStatus();
  }

  async getHealthSummary(): Promise<any> {
    return this.platformService.getHealthSummary();
  }

  async clearCache(): Promise<void> {
    return this.platformService.clearCache();
  }

  async getHeartRateZones(age: number): Promise<UnifiedHeartRateZones | null> {
    return this.insightsService.getHeartRateZones(age);
  }

  async getSleepBasedWorkoutRecommendations(): Promise<UnifiedSleepRecommendations | null> {
    return this.insightsService.getSleepBasedWorkoutRecommendations();
  }

  async getActivityAdjustedCalories(
    baseCalories: number,
  ): Promise<UnifiedActivityAdjustedCalories | null> {
    return this.insightsService.getActivityAdjustedCalories(baseCalories);
  }

  async detectAndLogActivities(): Promise<UnifiedDetectedActivities | null> {
    return this.insightsService.detectAndLogActivities();
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
    return this.insightsService.getWearableInsights(age, baseCalories);
  }

  getPlatformInfo(): {
    platform: PlatformType;
    serviceName: string;
    isSupported: boolean;
  } {
    return this.platformService.getPlatformInfo();
  }
}

export const wearableManager = new WearableManager();
export default wearableManager;

export type {
  UnifiedHealthData,
  UnifiedHeartRateZones,
  UnifiedSleepRecommendations,
  UnifiedActivityAdjustedCalories,
  UnifiedDetectedActivities,
  WearableIntegrationStatus,
  WearableExportData,
  NutritionExportData,
  PlatformType,
};
