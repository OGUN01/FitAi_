import { useProfileStore } from "../../stores/profileStore";
import { syncEngine } from "../SyncEngine";
import { ConfigManager } from "./config";
import {
  DataBridgeConfig,
  ShadowModeReport,
  AllDataResult,
  SaveResult,
  MigrationResult,
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  PersonalInfo,
  DietPreferences,
  WorkoutPreferences,
} from "./types";
import { savePersonalInfo } from "./personalInfo";
import { saveDietPreferences } from "./dietPreferences";
import { saveBodyAnalysis } from "./bodyAnalysis";
import { saveWorkoutPreferences } from "./workoutPreferences";
import { saveAdvancedReview } from "./advancedReview";
import {
  saveToLocal,
  getOnboardingData,
  storeOnboardingData,
} from "./localStorage";
import {
  storeWorkoutSession,
  getWorkoutSessions,
  updateWorkoutSession,
  storeMealLog,
  getMealLogs,
  storeBodyMeasurement,
  getBodyMeasurements,
  clearAllStorageData,
  getStorageInfo,
  isQuotaExceeded,
  getUserPreferences,
} from "./storage";
import {
  loadFromLocal,
  loadAllData,
  hasLocalData,
  getShadowModeReport,
  clearLocalData,
  getProfileDataSummary,
} from "./sync";
import { migrateGuestToUser } from "./migration";
import {
  exportAllData,
  getDataStatistics,
  importData,
  importUserData,
  importFitnessData,
  importNutritionData,
  importProgressData,
} from "./exportImport";
import {
  testLocalStorageMethods,
  testMigrationDetection,
  createSampleProfileData,
} from "./testUtils";

class DataBridge {
  private static instance: DataBridge;
  private currentUserId: string | null = null;
  private isOnline: boolean = true;
  private isInitialized: boolean = false;
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = new ConfigManager();
  }

  static getInstance(): DataBridge {
    if (!DataBridge.instance) DataBridge.instance = new DataBridge();
    return DataBridge.instance;
  }

  switchToNewSystem(): void {
    this.configManager.switchToNewSystem();
  }
  switchToOldSystem(): void {
    this.configManager.switchToOldSystem();
  }
  setShadowMode(enabled: boolean): void {
    this.configManager.setShadowMode(enabled);
  }
  getConfig(): DataBridgeConfig {
    return this.configManager.getConfig();
  }

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
    if (userId) syncEngine.setUserId(userId);
  }

  getUserId(): string | null {
    return this.currentUserId;
  }
  isGuest(): boolean {
    return !this.currentUserId;
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      const data = await loadFromLocal();
      if (data.personalInfo) {
        const store = useProfileStore.getState();
        if (data.personalInfo)
          store.updatePersonalInfo(data.personalInfo as PersonalInfoData);
        if (data.dietPreferences)
          store.updateDietPreferences(
            data.dietPreferences as DietPreferencesData,
          );
        if (data.bodyAnalysis) store.updateBodyAnalysis(data.bodyAnalysis);
        if (data.workoutPreferences)
          store.updateWorkoutPreferences(
            data.workoutPreferences as WorkoutPreferencesData,
          );
        if (data.advancedReview)
          store.updateAdvancedReview(data.advancedReview);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("[DataBridge] Initialization error:", error);
      this.isInitialized = true;
    }
  }

  async loadAllData(userId?: string): Promise<AllDataResult> {
    return loadAllData(this.currentUserId, userId);
  }

  async loadPersonalInfo(
    userId?: string,
  ): Promise<PersonalInfoData | PersonalInfo | null> {
    return (await this.loadAllData(userId)).personalInfo;
  }

  async loadDietPreferences(
    userId?: string,
  ): Promise<DietPreferencesData | DietPreferences | null> {
    return (await this.loadAllData(userId)).dietPreferences;
  }

  async loadBodyAnalysis(userId?: string): Promise<BodyAnalysisData | null> {
    return (await this.loadAllData(userId)).bodyAnalysis;
  }

  async loadWorkoutPreferences(
    userId?: string,
  ): Promise<WorkoutPreferencesData | WorkoutPreferences | null> {
    return (await this.loadAllData(userId)).workoutPreferences;
  }

  async loadAdvancedReview(
    userId?: string,
  ): Promise<AdvancedReviewData | null> {
    return (await this.loadAllData(userId)).advancedReview;
  }

  async loadFitnessGoals(
    userId?: string,
  ): Promise<WorkoutPreferencesData | WorkoutPreferences | null> {
    return this.loadWorkoutPreferences(userId);
  }

  async savePersonalInfo(
    data: PersonalInfoData | PersonalInfo,
    userId?: string,
  ): Promise<SaveResult> {
    return savePersonalInfo(data, userId || this.currentUserId);
  }

  async saveDietPreferences(
    data: DietPreferencesData | DietPreferences,
    userId?: string,
  ): Promise<SaveResult> {
    return saveDietPreferences(data, userId || this.currentUserId);
  }

  async saveBodyAnalysis(
    data: BodyAnalysisData,
    userId?: string,
  ): Promise<SaveResult> {
    return saveBodyAnalysis(data, userId || this.currentUserId);
  }

  async saveWorkoutPreferences(
    data: WorkoutPreferencesData | WorkoutPreferences,
    userId?: string,
  ): Promise<SaveResult> {
    return saveWorkoutPreferences(data, userId || this.currentUserId);
  }

  async saveAdvancedReview(
    data: AdvancedReviewData,
    userId?: string,
  ): Promise<SaveResult> {
    return saveAdvancedReview(data, userId || this.currentUserId);
  }

  async saveFitnessGoals(
    data: WorkoutPreferencesData | WorkoutPreferences,
    userId?: string,
  ): Promise<SaveResult> {
    return this.saveWorkoutPreferences(data, userId);
  }

  async migrateGuestToUser(userId: string): Promise<MigrationResult> {
    return migrateGuestToUser(userId, (id) => this.setUserId(id));
  }

  async hasLocalData(): Promise<boolean> {
    return hasLocalData();
  }

  async getShadowModeReport(): Promise<ShadowModeReport> {
    return getShadowModeReport(() => this.loadAllData());
  }

  async clearLocalData(): Promise<void> {
    await clearLocalData();
    await clearAllStorageData();
  }

  async hasGuestDataForMigration(): Promise<boolean> {
    return this.hasLocalData();
  }
  async migrateGuestDataToUser(userId: string): Promise<MigrationResult> {
    return this.migrateGuestToUser(userId);
  }

  async storeOnboardingData(data: any): Promise<boolean> {
    const success = await storeOnboardingData(data);
    if (success) {
      const store = useProfileStore.getState();
      if (data.personalInfo) store.updatePersonalInfo(data.personalInfo);
      if (data.dietPreferences)
        store.updateDietPreferences(data.dietPreferences);
      if (data.bodyAnalysis) store.updateBodyAnalysis(data.bodyAnalysis);
      if (data.workoutPreferences)
        store.updateWorkoutPreferences(data.workoutPreferences);
      if (data.advancedReview) store.updateAdvancedReview(data.advancedReview);
    }
    return success;
  }

  async getOnboardingData(): Promise<any | null> {
    return getOnboardingData();
  }
  async storeWorkoutSession(session: any): Promise<boolean> {
    return storeWorkoutSession(session);
  }
  async getWorkoutSessions(limit: number = 10): Promise<any[]> {
    return getWorkoutSessions(limit);
  }
  async updateWorkoutSession(
    sessionId: string,
    updates: any,
  ): Promise<boolean> {
    return updateWorkoutSession(sessionId, updates);
  }
  async storeMealLog(mealLog: any): Promise<boolean> {
    return storeMealLog(mealLog);
  }
  async getMealLogs(date?: string, limit: number = 50): Promise<any[]> {
    return getMealLogs(date, limit);
  }
  async storeBodyMeasurement(measurement: any): Promise<boolean> {
    return storeBodyMeasurement(measurement);
  }
  async getBodyMeasurements(limit: number = 10): Promise<any[]> {
    return getBodyMeasurements(limit);
  }
  async exportAllData(): Promise<any> {
    return exportAllData(() => this.loadAllData());
  }

  async getDataStatistics(): Promise<any> {
    return getDataStatistics(
      () => this.loadPersonalInfo(),
      () => this.loadDietPreferences(),
      () => this.loadWorkoutPreferences(),
    );
  }

  async importData(data: any): Promise<boolean> {
    return importData(
      data,
      (d) => this.savePersonalInfo(d),
      (d) => this.saveDietPreferences(d),
      (d) => this.saveWorkoutPreferences(d),
      (d) => this.saveBodyAnalysis(d),
      (d) => this.saveAdvancedReview(d),
    );
  }

  async importAllData(data: any): Promise<boolean> {
    return this.importData(data);
  }

  async importUserData(data: any): Promise<boolean> {
    return importUserData(
      data,
      (d) => this.savePersonalInfo(d),
      (d) => this.saveDietPreferences(d),
      (d) => this.saveWorkoutPreferences(d),
    );
  }

  async importFitnessData(data: any): Promise<boolean> {
    return importFitnessData(data, (d) => this.saveBodyAnalysis(d));
  }
  async importNutritionData(data: any): Promise<boolean> {
    return importNutritionData(data);
  }
  async importProgressData(data: any): Promise<boolean> {
    return importProgressData(data, (d) => this.saveAdvancedReview(d));
  }

  async updateUserPreferences(preferences: any): Promise<boolean> {
    try {
      const store = useProfileStore.getState();
      const updated = { ...(store.personalInfo || {}), ...preferences };
      store.updatePersonalInfo(updated as PersonalInfoData);
      await saveToLocal("userPreferences", preferences);
      return true;
    } catch (error) {
      console.error("[DataBridge] updateUserPreferences error:", error);
      return false;
    }
  }

  async getUserPreferences(): Promise<any | null> {
    return getUserPreferences();
  }
  async clearAllData(): Promise<void> {
    return this.clearLocalData();
  }

  async getStorageInfo(): Promise<any> {
    const [info, stats] = await Promise.all([
      getStorageInfo(),
      this.getDataStatistics(),
    ]);
    return { ...info, ...stats };
  }

  async isQuotaExceeded(): Promise<boolean> {
    return isQuotaExceeded();
  }
  async testLocalStorageMethods(): Promise<{
    success: boolean;
    results: any[];
  }> {
    return testLocalStorageMethods();
  }
  async testMigrationDetection(): Promise<{
    hasData: boolean;
    dataTypes: string[];
  }> {
    return testMigrationDetection(() => this.loadAllData());
  }
  async createSampleProfileData(): Promise<boolean> {
    return createSampleProfileData((d) => this.savePersonalInfo(d));
  }
  async getProfileDataSummary(): Promise<any> {
    return getProfileDataSummary(() => this.loadAllData());
  }
}

export const dataBridge = DataBridge.getInstance();
export default dataBridge;
export { DataBridge };
export type {
  DataBridgeConfig,
  ShadowModeReport,
  AllDataResult,
  SaveResult,
  MigrationResult,
} from "./types";
export { ShadowModeDiscrepancy } from "./types";
