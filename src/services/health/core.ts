import { Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  HealthConnectData,
  HealthConnectSyncResult,
  PermissionType,
} from "./types";
import { syncAllMetrics, SyncContext } from "./syncHelpers";

const isHealthConnectNativeAvailable = (): boolean => {
  try {
    const hasNativeModule = !!(
      NativeModules.HealthConnect || NativeModules.RNHealthConnect
    );
    if (!hasNativeModule) {
      console.log(
        "Health Connect native module not found - package may not be linked",
      );
      return false;
    }
    return true;
  } catch (error) {
    console.log(
      "Error checking Health Connect native module availability:",
      error,
    );
    return false;
  }
};

let healthConnectModule: any = null;
let healthConnectAvailable: boolean | null = null;

const getHealthConnectModule = async (): Promise<any | null> => {
  if (healthConnectAvailable === false) {
    return null;
  }

  if (healthConnectModule) {
    return healthConnectModule;
  }

  try {
    if (!isHealthConnectNativeAvailable()) {
      healthConnectAvailable = false;
      return null;
    }

    const module = await import("react-native-health-connect");
    healthConnectModule = module;
    healthConnectAvailable = true;
    return module;
  } catch (error) {
    console.warn("Failed to load react-native-health-connect:", error);
    healthConnectAvailable = false;
    return null;
  }
};

const SdkAvailabilityStatus = {
  SDK_AVAILABLE: "SDK_AVAILABLE",
  SDK_UNAVAILABLE: "SDK_UNAVAILABLE",
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
    "SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED",
} as const;

class HealthConnectService {
  private readonly STORAGE_KEY = "fitai_healthconnect_data";
  private readonly SYNC_INTERVAL_KEY = "fitai_healthconnect_last_sync";
  private isInitialized = false;
  private permissionsGranted = false;
  private readonly EXCLUDED_RAW_SOURCES = ["android"];

  private readonly permissions: PermissionType[] = [
    { accessType: "read", recordType: "Steps" },
    { accessType: "read", recordType: "HeartRate" },
    { accessType: "read", recordType: "ActiveCaloriesBurned" },
    { accessType: "read", recordType: "TotalCaloriesBurned" },
    { accessType: "read", recordType: "BasalMetabolicRate" },
    { accessType: "read", recordType: "Distance" },
    { accessType: "read", recordType: "Weight" },
    { accessType: "read", recordType: "SleepSession" },
    { accessType: "read", recordType: "ExerciseSession" },
    { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
    { accessType: "read", recordType: "OxygenSaturation" },
    { accessType: "read", recordType: "BodyFat" },
  ];

  async initializeHealthConnect(): Promise<boolean> {
    try {
      console.log("🔗 Starting Health Connect initialization...");

      if (Platform.OS !== "android") {
        console.log("📱 Health Connect only available on Android devices");
        return false;
      }

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.log("❌ Health Connect native module not available");
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
      console.log("🔗 Health Connect SDK Status:", sdkStatus);

      const SDK_UNAVAILABLE =
        ModuleSdkStatus?.SDK_UNAVAILABLE ||
        SdkAvailabilityStatus.SDK_UNAVAILABLE;
      const SDK_UPDATE_REQUIRED =
        ModuleSdkStatus?.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ||
        SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED;
      const SDK_AVAILABLE =
        ModuleSdkStatus?.SDK_AVAILABLE || SdkAvailabilityStatus.SDK_AVAILABLE;

      if (sdkStatus === SDK_UNAVAILABLE) {
        console.log("❌ Health Connect SDK is unavailable on this device");
        return false;
      }

      if (sdkStatus === SDK_UPDATE_REQUIRED) {
        console.log("⚠️ Health Connect provider update required");
        await openHealthConnectSettings();
        return false;
      }

      if (sdkStatus !== SDK_AVAILABLE && sdkStatus !== "SDK_AVAILABLE") {
        console.log(
          "❌ Health Connect not available - Unknown status:",
          sdkStatus,
        );
        return false;
      }

      const isInitialized = await initialize();
      this.isInitialized = isInitialized;

      await AsyncStorage.setItem(
        "fitai_healthconnect_initialized",
        isInitialized.toString(),
      );

      console.log("✅ Health Connect initialized:", isInitialized);
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

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        this.permissionsGranted = false;
        return false;
      }

      const { requestPermission } = hcModule;
      const grantedPermissions = await requestPermission(this.permissions);

      const hasPermissions =
        Array.isArray(grantedPermissions) && grantedPermissions.length > 0;
      this.permissionsGranted = hasPermissions;

      if (!hasPermissions) {
        console.warn("⚠️ No Health Connect permissions were granted");
      }

      await AsyncStorage.setItem(
        "fitai_healthconnect_permissions",
        this.permissionsGranted ? "granted" : "denied",
      );

      return this.permissionsGranted;
    } catch (error) {
      console.error("❌ Permission request failed:", error);
      this.permissionsGranted = false;
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") return false;

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        const cachedPermissions = await AsyncStorage.getItem(
          "fitai_healthconnect_permissions",
        );
        const hasCache = cachedPermissions === "granted";
        this.permissionsGranted = hasCache;
        return hasCache;
      }

      const { getSdkStatus, getGrantedPermissions } = hcModule;

      try {
        const sdkStatus = await getSdkStatus();
        if (sdkStatus !== 3) {
          this.permissionsGranted = false;
          return false;
        }

        const grantedPermissions = await getGrantedPermissions();
        const hasPermissions =
          Array.isArray(grantedPermissions) && grantedPermissions.length > 0;

        this.permissionsGranted = hasPermissions;
        await AsyncStorage.setItem(
          "fitai_healthconnect_permissions",
          hasPermissions ? "granted" : "denied",
        );

        return hasPermissions;
      } catch (sdkError) {
        console.warn("⚠️ SDK check failed, falling back to cache:", sdkError);
        const cachedPermissions = await AsyncStorage.getItem(
          "fitai_healthconnect_permissions",
        );
        const hasCache = cachedPermissions === "granted";
        this.permissionsGranted = hasCache;
        return hasCache;
      }
    } catch (error) {
      console.error("❌ Error checking Health Connect permissions:", error);
      this.permissionsGranted = false;
      return false;
    }
  }

  async syncHealthData(daysBack: number = 7): Promise<HealthConnectSyncResult> {
    const startTime = Date.now();

    try {
      if (!this.permissionsGranted) {
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
          syncTime: Date.now() - startTime,
        };
      }

      const { readRecords, aggregateRecord } = hcModule;

      console.log(
        `📥 Syncing Health Connect data from last ${daysBack} days...`,
      );

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const healthData: HealthConnectData = {
        sources: {},
        dataOrigins: [],
        metadata: {
          isPartial: false,
          failedMetrics: [],
          isFallback: false,
          estimatedMetrics: [],
        },
      };

      const allDataOrigins = new Set<string>();

      const ctx: SyncContext = {
        healthData,
        allDataOrigins,
        excludedRawSources: this.EXCLUDED_RAW_SOURCES,
        aggregateRecord,
        readRecords,
        startDate,
        endDate,
        todayStart,
      };

      await syncAllMetrics(ctx);

      healthData.dataOrigins = Array.from(allDataOrigins);
      healthData.lastSyncDate = endDate.toISOString();

      await this.cacheHealthData(healthData);

      const syncTime = Date.now() - startTime;
      console.log(`✅ Health Connect sync completed in ${syncTime}ms`);

      return {
        success: true,
        data: healthData,
        syncTime,
        partial: healthData.metadata?.isPartial,
      };
    } catch (error) {
      console.error("❌ Health Connect sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
        syncTime: Date.now() - startTime,
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
      console.log("⚙️ Opening Health Connect settings...");
      await openHealthConnectSettings();
    } catch (error) {
      console.error("❌ Failed to open Health Connect settings:", error);
    }
  }

  async getCachedHealthData(): Promise<HealthConnectData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error("❌ Error reading cached Health Connect data:", error);
      return null;
    }
  }

  private async cacheHealthData(data: HealthConnectData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(this.SYNC_INTERVAL_KEY, Date.now().toString());
    } catch (error) {
      console.error("❌ Error caching Health Connect data:", error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(this.SYNC_INTERVAL_KEY);
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error("❌ Error getting last sync time:", error);
      return null;
    }
  }

  async shouldSync(intervalHours: number = 1): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const hoursSinceLastSync =
      (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync >= intervalHours;
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
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEY,
        this.SYNC_INTERVAL_KEY,
        "fitai_healthconnect_permissions",
        "fitai_healthconnect_initialized",
      ]);
      console.log("✅ Health Connect cache cleared");
    } catch (error) {
      console.error("❌ Error clearing Health Connect cache:", error);
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      console.log("🔌 Disconnecting from Health Connect...");
      await this.clearCache();
      this.permissionsGranted = false;
      this.isInitialized = false;
      console.log("✅ Successfully disconnected from Health Connect");
      return true;
    } catch (error) {
      console.error("❌ Failed to disconnect from Health Connect:", error);
      return false;
    }
  }

  async reauthorize(): Promise<boolean> {
    try {
      console.log("🔄 Re-authorizing Health Connect...");

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.error("❌ Health Connect module not available");
        return false;
      }

      const { revokeAllPermissions } = hcModule;

      await revokeAllPermissions();
      this.permissionsGranted = false;
      this.isInitialized = false;
      await AsyncStorage.multiRemove([
        "fitai_healthconnect_permissions",
        "fitai_healthconnect_initialized",
        this.STORAGE_KEY,
        this.SYNC_INTERVAL_KEY,
      ]);

      const initialized = await this.initializeHealthConnect();
      if (!initialized) {
        console.error("❌ Failed to re-initialize Health Connect");
        return false;
      }

      const permissionsGranted = await this.requestPermissions();

      if (permissionsGranted) {
        console.log("✅ Re-authorization successful!");
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
      console.log("🔄 Running background Health Connect sync...");

      const shouldSync = await this.shouldSync(1);
      if (!shouldSync) {
        console.log("⏭️ Skipping sync - recent sync exists");
        return false;
      }

      const result = await this.syncHealthData(1);
      if (result.success && result.data) {
        console.log("✅ Background sync completed successfully");
        return true;
      }

      console.log("⚠️ Background sync completed with no new data");
      return false;
    } catch (error) {
      console.error("❌ Background sync failed:", error);
      return false;
    }
  }
}

export const healthConnectService = new HealthConnectService();

export const isHealthConnectModuleAvailable = (): boolean => {
  try {
    return !!(NativeModules.HealthConnect || NativeModules.RNHealthConnect);
  } catch {
    return false;
  }
};

export const canUseHealthConnect = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return false;
  const module = await getHealthConnectModule();
  return module !== null;
};

export { HealthConnectService };
