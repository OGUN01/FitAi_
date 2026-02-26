import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HealthConnectData, HealthConnectSyncResult } from "../types";
import { getHealthConnectModule } from "./moduleLoader";
import { PermissionsManager } from "./permissions";
import { SyncManager } from "./sync";
import { StorageManager } from "./storage";
import { SdkAvailabilityStatus, STORAGE_KEYS } from "./types";

export class HealthConnectService {
  private isInitialized = false;
  private permissionsManager: PermissionsManager;
  private syncManager: SyncManager;
  private storageManager: StorageManager;

  constructor() {
    this.permissionsManager = new PermissionsManager();
    this.syncManager = new SyncManager();
    this.storageManager = new StorageManager();
  }

  async initializeHealthConnect(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") {
        return false;
      }

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        this.isInitialized = false;
        return false;
      }

      const {
        getSdkStatus,
        initialize,
        openHealthConnectSettings,
        SdkAvailabilityStatus: ModuleSdkStatus,
      } = hcModule;

      const sdkStatus = await getSdkStatus();
      const SDK_UNAVAILABLE =
        ModuleSdkStatus?.SDK_UNAVAILABLE ||
        SdkAvailabilityStatus.SDK_UNAVAILABLE;
      const SDK_UPDATE_REQUIRED =
        ModuleSdkStatus?.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ||
        SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED;
      const SDK_AVAILABLE =
        ModuleSdkStatus?.SDK_AVAILABLE || SdkAvailabilityStatus.SDK_AVAILABLE;

      if (sdkStatus === SDK_UNAVAILABLE) {
        return false;
      }

      if (sdkStatus === SDK_UPDATE_REQUIRED) {
        await openHealthConnectSettings();
        return false;
      }

      if (sdkStatus !== SDK_AVAILABLE && sdkStatus !== "SDK_AVAILABLE") {
        return false;
      }

      const isInitialized = await initialize();
      this.isInitialized = isInitialized;

      await AsyncStorage.setItem(
        STORAGE_KEYS.INITIALIZED_KEY,
        isInitialized.toString(),
      );

      return isInitialized;
    } catch (error) {
      console.error("❌ Health Connect initialization failed:", error);
      this.isInitialized = false;
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initializeHealthConnect();
        if (!initialized) return false;
      }

      const result = await this.permissionsManager.requestPermissions();
      return result;
    } catch (error) {
      console.error("❌ Permission request failed:", error);
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    return this.permissionsManager.hasPermissions();
  }

  async syncHealthData(daysBack: number = 7): Promise<HealthConnectSyncResult> {
    try {
      if (!this.permissionsManager.isPermissionsGranted()) {
        const hasPerms = await this.hasPermissions();
        if (!hasPerms) {
          return {
            success: false,
            error: "Health Connect permissions not granted.",
          };
        }
      }

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        return {
          success: false,
          error: "Health Connect native module not available.",
          syncTime: 0,
        };
      }

      const { readRecords, aggregateRecord } = hcModule;

      const result = await this.syncManager.syncHealthData(
        daysBack,
        readRecords,
        aggregateRecord,
      );

      if (result.success && result.data) {
        await this.storageManager.cacheHealthData(result.data);
      }

      return result;
    } catch (error) {
      console.error("❌ Health Connect sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
        syncTime: 0,
      };
    }
  }

  async openSettings(): Promise<void> {
    try {
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.warn("⚙️ Health Connect native module not available");
        return;
      }

      const { openHealthConnectSettings } = hcModule;
      await openHealthConnectSettings();
    } catch (error) {
      console.error("❌ Failed to open Health Connect settings:", error);
    }
  }

  async getCachedHealthData(): Promise<HealthConnectData | null> {
    return this.storageManager.getCachedHealthData();
  }

  async getLastSyncTime(): Promise<Date | null> {
    return this.storageManager.getLastSyncTime();
  }

  async shouldSync(intervalHours: number = 1): Promise<boolean> {
    return this.storageManager.shouldSync(intervalHours);
  }

  async getHealthSummary(): Promise<{
    dailySteps: number;
    dailyCalories: number;
    dailyDistance: number;
    lastWeight?: number;
    heartRate?: number;
    sleepHours?: number;
    syncStatus: "synced" | "needs_sync" | "never_synced";
  }> {
    try {
      const cachedData = await this.getCachedHealthData();
      const lastSync = await this.getLastSyncTime();

      let syncStatus: "synced" | "needs_sync" | "never_synced" = "never_synced";

      if (lastSync) {
        const hoursSinceSync =
          (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        syncStatus = hoursSinceSync < 2 ? "synced" : "needs_sync";
      }

      let sleepHours: number | undefined;
      if (cachedData?.sleep && cachedData.sleep.length > 0) {
        const totalSleepMinutes = cachedData.sleep.reduce(
          (total, sleep) => total + sleep.duration,
          0,
        );
        sleepHours = totalSleepMinutes / 60;
      }

      return {
        dailySteps: cachedData?.steps || 0,
        dailyCalories: cachedData?.activeCalories || 0,
        dailyDistance:
          Math.round(((cachedData?.distance || 0) / 1000) * 10) / 10,
        lastWeight: cachedData?.weight,
        heartRate: cachedData?.heartRate,
        sleepHours,
        syncStatus,
      };
    } catch (error) {
      console.error("❌ Error getting health summary:", error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        dailyDistance: 0,
        syncStatus: "never_synced",
      };
    }
  }

  async clearCache(): Promise<void> {
    await this.storageManager.clearCache();
  }

  async disconnect(): Promise<boolean> {
    try {
      await this.clearCache();
      this.permissionsManager.setPermissionsGranted(false);
      this.isInitialized = false;
      return true;
    } catch (error) {
      console.error("❌ Failed to disconnect from Health Connect:", error);
      return false;
    }
  }

  async reauthorize(): Promise<boolean> {
    try {
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.error("❌ Health Connect module not available");
        return false;
      }

      await this.permissionsManager.revokeAllPermissions();
      this.permissionsManager.setPermissionsGranted(false);
      this.isInitialized = false;
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PERMISSIONS_KEY,
        STORAGE_KEYS.INITIALIZED_KEY,
        STORAGE_KEYS.STORAGE_KEY,
        STORAGE_KEYS.SYNC_INTERVAL_KEY,
      ]);

      const initialized = await this.initializeHealthConnect();
      if (!initialized) {
        console.error("❌ Failed to re-initialize Health Connect");
        return false;
      }

      const permissionsGranted = await this.requestPermissions();

      if (permissionsGranted) {
      } else {
        console.warn("⚠️ Re-authorization incomplete");
      }

      return permissionsGranted;
    } catch (error) {
      console.error("❌ Re-authorization failed:", error);
      return false;
    }
  }

  isHealthConnectInitialized(): boolean {
    return this.isInitialized;
  }

  async isHealthConnectAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") return false;

      const hcModule = await getHealthConnectModule();
      if (!hcModule) return false;

      const { getSdkStatus, SdkAvailabilityStatus: ModuleSdkStatus } = hcModule;
      const SDK_AVAILABLE =
        ModuleSdkStatus?.SDK_AVAILABLE || SdkAvailabilityStatus.SDK_AVAILABLE;

      const sdkStatus = await getSdkStatus();
      return sdkStatus === SDK_AVAILABLE || sdkStatus === "SDK_AVAILABLE";
    } catch (error) {
      console.error("❌ Error checking Health Connect availability:", error);
      return false;
    }
  }

  async runBackgroundSyncOnce(): Promise<boolean> {
    try {
      const shouldSync = await this.shouldSync(1);
      if (!shouldSync) {
        return false;
      }

      const result = await this.syncHealthData(1);
      if (result.success && result.data) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Background sync failed:", error);
      return false;
    }
  }

  async writeWorkoutSession(workout: {
    exerciseType: number;
    startTime: Date;
    endTime: Date;
    title?: string;
    calories?: number;
    notes?: string;
  }): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
      if (Platform.OS !== "android") {
        return {
          success: false,
          error: "Health Connect only available on Android",
        };
      }

      if (!this.isInitialized) {
        const initialized = await this.initializeHealthConnect();
        if (!initialized) {
          return {
            success: false,
            error: "Failed to initialize Health Connect",
          };
        }
      }

      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        return {
          success: false,
          error: "Health Connect write permissions not granted",
        };
      }

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        return {
          success: false,
          error: "Health Connect native module not available",
        };
      }

      const { insertRecords } = hcModule;
      if (!insertRecords) {
        return {
          success: false,
          error: "insertRecords function not available",
        };
      }

      const exerciseRecord: any = {
        recordType: "ExerciseSession",
        exerciseType: workout.exerciseType,
        startTime: workout.startTime.toISOString(),
        endTime: workout.endTime.toISOString(),
      };

      if (workout.title) {
        exerciseRecord.title = workout.title;
      }

      if (workout.notes) {
        exerciseRecord.notes = workout.notes;
      }

      const recordIds = await insertRecords([exerciseRecord]);

      if (workout.calories && workout.calories > 0) {
        try {
          await insertRecords([
            {
              recordType: "ActiveCaloriesBurned",
              energy: { unit: "kilocalories", value: workout.calories },
              startTime: workout.startTime.toISOString(),
              endTime: workout.endTime.toISOString(),
            },
          ]);
        } catch (calorieError) {
          console.warn("⚠️ Failed to write calories:", calorieError);
        }
      }

      return { success: true, recordId: recordIds[0] };
    } catch (error) {
      console.error("❌ Failed to write workout session:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error writing workout",
      };
    }
  }
}
