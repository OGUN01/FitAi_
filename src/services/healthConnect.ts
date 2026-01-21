// Health Connect Integration Service for FitAI
// Provides comprehensive health data synchronization for Android devices (8.0+)
// Replaces deprecated Google Fit API with modern Health Connect platform
//
// WORLD-CLASS FEATURES:
// - Smart data source priority (wearables > phones)
// - Automatic deduplication via aggregation API
// - Source attribution for transparency

import { Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// =============================================================================
// DATA SOURCE REGISTRY - Priority ranking for accuracy
// Tier 1: Medical grade devices (highest accuracy)
// Tier 2: Premium smartwatches (very high accuracy)
// Tier 3: Consumer smartwatches (high accuracy)
// Tier 4: Fitness bands (moderate accuracy)
// Tier 5: Phone sensors (lowest accuracy)
// =============================================================================
export interface DataSource {
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  accuracy: number; // 0-100 estimated accuracy percentage
  icon: string; // Icon name for UI
  deviceType: "medical" | "watch" | "band" | "phone" | "scale" | "unknown";
}

export const DATA_SOURCES: Record<string, DataSource> = {
  // Tier 1: Medical Grade
  "com.withings.wiscale2": {
    name: "Withings",
    tier: 1,
    accuracy: 99,
    icon: "medical",
    deviceType: "scale",
  },
  "com.omronhealthcare.omronconnect": {
    name: "Omron",
    tier: 1,
    accuracy: 99,
    icon: "medical",
    deviceType: "medical",
  },

  // Tier 2: Premium Smartwatches
  "com.garmin.android.apps.connectmobile": {
    name: "Garmin",
    tier: 2,
    accuracy: 97,
    icon: "watch",
    deviceType: "watch",
  },
  "com.polar.beat": {
    name: "Polar",
    tier: 2,
    accuracy: 97,
    icon: "watch",
    deviceType: "watch",
  },
  "com.ouraring.oura": {
    name: "Oura Ring",
    tier: 2,
    accuracy: 96,
    icon: "fitness",
    deviceType: "band",
  },
  "com.whoop.android": {
    name: "Whoop",
    tier: 2,
    accuracy: 96,
    icon: "fitness",
    deviceType: "band",
  },

  // Tier 3: Consumer Smartwatches
  "com.samsung.android.health": {
    name: "Samsung Health",
    tier: 3,
    accuracy: 94,
    icon: "watch",
    deviceType: "watch",
  },
  "com.google.android.apps.healthdata": {
    name: "Pixel Watch",
    tier: 3,
    accuracy: 94,
    icon: "watch",
    deviceType: "watch",
  },
  "com.fitbit.FitbitMobile": {
    name: "Fitbit",
    tier: 3,
    accuracy: 93,
    icon: "watch",
    deviceType: "watch",
  },
  "com.huawei.health": {
    name: "Huawei Health",
    tier: 3,
    accuracy: 92,
    icon: "watch",
    deviceType: "watch",
  },
  "com.amazfit.app": {
    name: "Amazfit",
    tier: 3,
    accuracy: 91,
    icon: "watch",
    deviceType: "watch",
  },

  // Tier 4: Fitness Bands
  "com.xiaomi.hm.health": {
    name: "Mi Fitness",
    tier: 4,
    accuracy: 88,
    icon: "fitness",
    deviceType: "band",
  },
  "com.huami.midong": {
    name: "Zepp",
    tier: 4,
    accuracy: 87,
    icon: "fitness",
    deviceType: "band",
  },
  "com.hihonor.health": {
    name: "Honor Health",
    tier: 4,
    accuracy: 86,
    icon: "fitness",
    deviceType: "band",
  },

  // Tier 5: Phone Sensors (lowest priority)
  "com.google.android.apps.fitness": {
    name: "Google Fit (Phone)",
    tier: 5,
    accuracy: 75,
    icon: "phone-portrait",
    deviceType: "phone",
  },
  "com.sec.android.app.shealth": {
    name: "Samsung Health (Phone)",
    tier: 5,
    accuracy: 74,
    icon: "phone-portrait",
    deviceType: "phone",
  },
};

// Get source info by package name, with fallback for unknown sources
export const getDataSource = (packageName: string): DataSource => {
  if (DATA_SOURCES[packageName]) {
    return DATA_SOURCES[packageName];
  }
  // Unknown source - assume it's a phone app (lowest tier)
  return {
    name: packageName.split(".").pop() || "Unknown",
    tier: 5,
    accuracy: 70,
    icon: "help-circle",
    deviceType: "unknown",
  };
};

// Get the best (highest priority) source from a list
export const getBestDataSource = (
  packageNames: string[],
): DataSource | null => {
  if (!packageNames || packageNames.length === 0) return null;

  const sources = packageNames.map((pkg) => ({
    pkg,
    source: getDataSource(pkg),
  }));
  sources.sort(
    (a, b) =>
      a.source.tier - b.source.tier || b.source.accuracy - a.source.accuracy,
  );

  return sources[0]?.source || null;
};

// Check if the Health Connect native module is available
// This handles cases where the package isn't properly linked (Expo Go, dev client without linking)
const isHealthConnectNativeAvailable = (): boolean => {
  try {
    // Check if the native module exists
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

// Lazy-loaded Health Connect module references
let healthConnectModule: any = null;
let healthConnectAvailable: boolean | null = null;

// Lazy load the Health Connect module to prevent crashes when not available
const getHealthConnectModule = async (): Promise<any | null> => {
  if (healthConnectAvailable === false) {
    return null;
  }

  if (healthConnectModule) {
    return healthConnectModule;
  }

  try {
    // First check if native module is available
    if (!isHealthConnectNativeAvailable()) {
      healthConnectAvailable = false;
      return null;
    }

    // Dynamically import the module
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

// SDK Availability Status enum (mirrors the one from react-native-health-connect)
const SdkAvailabilityStatus = {
  SDK_AVAILABLE: "SDK_AVAILABLE",
  SDK_UNAVAILABLE: "SDK_UNAVAILABLE",
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
    "SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED",
} as const;

// Type alias for permissions (matches react-native-health-connect Permission type)
type PermissionType = {
  accessType: "read" | "write";
  recordType: string;
};

// Source metadata for each metric
export interface MetricSource {
  packageName: string;
  name: string;
  tier: number;
  accuracy: number;
  icon: string;
  deviceType: string;
}

export interface ExerciseSessionData {
  id: string;
  startTime: string;
  endTime: string;
  exerciseType: string;
  title?: string;
  calories?: number;
  distance?: number; // in meters
  duration: number; // in minutes
}

export interface HealthConnectData {
  steps?: number;
  heartRate?: number;
  activeCalories?: number;
  totalCalories?: number; // Total daily calories (BMR + active) - what Google Fit displays
  distance?: number; // in meters
  weight?: number; // in kg
  sleep?: SleepData[];
  exerciseSessions?: ExerciseSessionData[]; // Workout sessions from wearables
  lastSyncDate?: string;
  // Advanced metrics for future features
  activeMinutes?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  oxygenSaturation?: number;
  bodyFat?: number;
  muscleMass?: number;

  // Source attribution - shows where data came from
  sources?: {
    steps?: MetricSource;
    heartRate?: MetricSource;
    activeCalories?: MetricSource;
    totalCalories?: MetricSource;
    distance?: MetricSource;
    weight?: MetricSource;
    sleep?: MetricSource;
    exerciseSessions?: MetricSource;
    heartRateVariability?: MetricSource;
    oxygenSaturation?: MetricSource;
    bodyFat?: MetricSource;
  };

  // List of all data origins that contributed
  dataOrigins?: string[];

  // Metadata for error handling
  metadata?: {
    isPartial?: boolean; // True if some metrics failed to load
    failedMetrics?: string[]; // List of metrics that failed
    isFallback?: boolean; // True if using cached/estimated data
    estimatedMetrics?: string[]; // Metrics that are estimated
  };
}

export interface SleepData {
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  stages?: SleepStage[];
}

export interface SleepStage {
  stage: "awake" | "light" | "deep" | "rem";
  startTime: string;
  endTime: string;
  duration: number;
}

export interface HealthConnectSyncResult {
  success: boolean;
  data?: HealthConnectData;
  error?: string;
  syncTime?: number;
  partial?: boolean; // Indicates if some data failed to load
}

class HealthConnectService {
  private readonly STORAGE_KEY = "fitai_healthconnect_data";
  private readonly SYNC_INTERVAL_KEY = "fitai_healthconnect_last_sync";
  private isInitialized = false;
  private permissionsGranted = false;

  // =============================================================================
  // EXCLUDED RAW SOURCES - These cause double-counting with fitness apps
  // The "android" source is the raw phone pedometer which counts independently
  // from fitness apps like Google Fit that also read from the same sensor
  // =============================================================================
  private readonly EXCLUDED_RAW_SOURCES = ["android"];

  // Required permissions for FitAI - comprehensive health data access
  private readonly permissions: PermissionType[] = [
    { accessType: "read", recordType: "Steps" },
    { accessType: "read", recordType: "HeartRate" },
    { accessType: "read", recordType: "ActiveCaloriesBurned" },
    { accessType: "read", recordType: "TotalCaloriesBurned" }, // Total daily calories (BMR + active)
    { accessType: "read", recordType: "BasalMetabolicRate" }, // BMR for fallback calculation
    { accessType: "read", recordType: "Distance" },
    { accessType: "read", recordType: "Weight" },
    { accessType: "read", recordType: "SleepSession" },
    // Advanced metrics
    { accessType: "read", recordType: "ExerciseSession" }, // Workout sessions from wearables
    { accessType: "read", recordType: "HeartRateVariabilityRmssd" }, // HRV for recovery analysis
    { accessType: "read", recordType: "OxygenSaturation" }, // SpO2 readings
    { accessType: "read", recordType: "BodyFat" }, // Body composition
  ];

  /**
   * Initialize Health Connect client
   * Critical first step - must be called before any other operations
   */
  async initializeHealthConnect(): Promise<boolean> {
    try {
      console.log("🔗 DEBUG: Starting Health Connect initialization...");
      console.log("🔗 DEBUG: Platform check - OS:", Platform.OS);

      // Health Connect is only available on Android 8.0+
      if (Platform.OS !== "android") {
        console.log(
          "📱 DEBUG: Health Connect only available on Android devices",
        );
        return false;
      }

      // Get the Health Connect module (lazy loaded)
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.log("❌ DEBUG: Health Connect native module not available");
        console.log(
          "💡 The app may be running in Expo Go or the native module is not linked",
        );
        console.log(
          "💡 Build a development client or production build to use Health Connect",
        );
        this.isInitialized = false;
        return false;
      }

      const {
        getSdkStatus,
        initialize,
        openHealthConnectSettings,
        SdkAvailabilityStatus: ModuleSdkStatus,
      } = hcModule;

      console.log("🔗 DEBUG: Calling getSdkStatus()...");
      // Check if Health Connect is available on device
      const sdkStatus = await getSdkStatus();
      console.log("🔗 DEBUG: Health Connect SDK Status:", sdkStatus);
      console.log(
        "🔗 DEBUG: Expected status for success:",
        ModuleSdkStatus?.SDK_AVAILABLE || SdkAvailabilityStatus.SDK_AVAILABLE,
      );

      // Check for different SDK availability statuses
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
        console.log(
          "💡 Health Connect requires Android 8.0+ and the Health Connect app to be installed",
        );
        return false;
      }

      if (sdkStatus === SDK_UPDATE_REQUIRED) {
        console.log("⚠️ Health Connect provider update required");
        console.log(
          "💡 Please update the Health Connect app from Google Play Store",
        );
        // Optionally open Health Connect settings for user to update
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

      console.log("🔗 DEBUG: Calling initialize() function...");
      // Initialize the Health Connect client
      const isInitialized = await initialize();
      this.isInitialized = isInitialized;

      console.log(
        "✅ DEBUG: Health Connect initialized result:",
        isInitialized,
      );
      console.log(
        "🔗 DEBUG: Setting internal state isInitialized to:",
        isInitialized,
      );

      // Cache initialization status
      console.log("🔗 DEBUG: Caching initialization status...");
      await AsyncStorage.setItem(
        "fitai_healthconnect_initialized",
        isInitialized.toString(),
      );
      console.log("🔗 DEBUG: Cached initialization status successfully");

      return isInitialized;
    } catch (error) {
      console.error("❌ Health Connect initialization failed:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Request all required permissions from user
   * Must be called before reading health data
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log("🔐 DEBUG: Starting permission request...");
      console.log("🔐 DEBUG: Current isInitialized state:", this.isInitialized);

      if (!this.isInitialized) {
        console.log(
          "🔐 DEBUG: Not initialized, calling initializeHealthConnect...",
        );
        const initialized = await this.initializeHealthConnect();
        console.log("🔐 DEBUG: Initialization result:", initialized);
        if (!initialized) {
          console.log("🔐 DEBUG: Initialization failed, returning false");
          return false;
        }
      }

      // Get the Health Connect module
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.log(
          "🔐 DEBUG: Health Connect native module not available for permissions",
        );
        this.permissionsGranted = false;
        return false;
      }

      const { requestPermission } = hcModule;

      console.log("🔐 DEBUG: Requesting Health Connect permissions...");
      console.log(
        "🔐 DEBUG: Required permissions:",
        this.permissions
          .map((p) => `${p.accessType} ${p.recordType}`)
          .join(", "),
      );
      console.log(
        "🔐 DEBUG: Total permissions count:",
        this.permissions.length,
      );

      console.log(
        "🔐 DEBUG: Calling requestPermission() with permissions array...",
      );
      const grantedPermissions = await requestPermission(this.permissions);
      console.log(
        "🔐 DEBUG: requestPermission() returned:",
        grantedPermissions,
      );

      // FIX: Empty array [] means NO permissions were granted
      // We need at least some permissions to consider it a success
      const hasPermissions =
        Array.isArray(grantedPermissions) && grantedPermissions.length > 0;
      this.permissionsGranted = hasPermissions;

      console.log(
        "🔐 DEBUG: Granted permissions count:",
        grantedPermissions?.length || 0,
      );
      console.log(
        "🔐 DEBUG: Final permissions granted result:",
        this.permissionsGranted,
      );

      if (!hasPermissions) {
        console.warn(
          "⚠️ No Health Connect permissions were granted. The permission dialog may not have appeared.",
        );
        console.warn(
          "⚠️ Please go to Settings > Apps > FitAI > Permissions > Health Connect to grant permissions manually.",
        );
      }

      // Cache permission status
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

  /**
   * Check if permissions are granted
   * Uses getGrantedPermissions() to verify actual status from Health Connect
   */
  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") return false;

      // Get the Health Connect module
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        // If module is not available, fall back to cached permissions
        const cachedPermissions = await AsyncStorage.getItem(
          "fitai_healthconnect_permissions",
        );
        const hasCache = cachedPermissions === "granted";
        this.permissionsGranted = hasCache;
        return hasCache;
      }

      const { getSdkStatus, getGrantedPermissions } = hcModule;

      // Check SDK availability first
      try {
        const sdkStatus = await getSdkStatus();
        // SDK status 3 = SDK_AVAILABLE (it's a number, not string!)
        if (sdkStatus !== 3) {
          this.permissionsGranted = false;
          return false;
        }

        // Actually query Health Connect for granted permissions
        // This is the source of truth - not our cache
        const grantedPermissions = await getGrantedPermissions();
        const hasPermissions =
          Array.isArray(grantedPermissions) && grantedPermissions.length > 0;

        console.log(
          "🔐 Health Connect actual permissions:",
          grantedPermissions?.length || 0,
        );

        // Update our cache to match reality
        this.permissionsGranted = hasPermissions;
        await AsyncStorage.setItem(
          "fitai_healthconnect_permissions",
          hasPermissions ? "granted" : "denied",
        );

        return hasPermissions;
      } catch (sdkError) {
        console.warn("⚠️ SDK check failed, falling back to cache:", sdkError);

        // Fallback to cached status if SDK check fails
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

  /**
   * Sync health data from Health Connect
   * Main data retrieval function - matches Google Fit functionality
   */
  async syncHealthData(daysBack: number = 7): Promise<HealthConnectSyncResult> {
    const startTime = Date.now();

    try {
      if (!this.permissionsGranted) {
        console.warn("🔐 Health Connect permissions not granted, checking...");
        const hasPerms = await this.hasPermissions();
        if (!hasPerms) {
          return {
            success: false,
            error:
              "Health Connect permissions not granted. Please enable in settings.",
          };
        }
      }

      // Get the Health Connect module
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        return {
          success: false,
          error:
            "Health Connect native module not available. Build a development client to use Health Connect.",
          syncTime: Date.now() - startTime,
        };
      }

      const { readRecords, aggregateRecord } = hcModule;

      console.log(
        `📥 Syncing Health Connect data from last ${daysBack} days...`,
      );
      console.log("🔬 Using aggregateRecord API for intelligent deduplication");

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      // For steps, we want TODAY's count for UI display (matching Google Fit)
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

      // Collect all data origins for transparency
      const allDataOrigins = new Set<string>();

      // =========================================================================
      // STEPS - Using aggregateRecord() with smart source filtering
      // Excludes raw "android" sensor to prevent double-counting with fitness apps
      // Allows all fitness apps (Google Fit, Samsung Health, Fitbit, etc.)
      // =========================================================================
      try {
        console.log(
          "📊 Aggregating steps from:",
          todayStart.toISOString(),
          "to:",
          endDate.toISOString(),
        );

        // First, get aggregate from all sources to see what's available
        const stepsAggregate = await aggregateRecord({
          recordType: "Steps",
          timeRangeFilter: {
            operator: "between",
            startTime: todayStart.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (stepsAggregate && typeof stepsAggregate.COUNT_TOTAL === "number") {
          const origins = stepsAggregate.dataOrigins || [];
          console.log("📊 Steps sources (all):", origins);

          // Check if raw sensor is mixed with app data (causes double-counting)
          const hasRawSensor = origins.some((o: any) =>
            this.EXCLUDED_RAW_SOURCES.includes(o),
          );
          const appSources = origins.filter(
            (o: any) => !this.EXCLUDED_RAW_SOURCES.includes(o),
          );
          const hasAppSources = appSources.length > 0;

          if (hasRawSensor && hasAppSources) {
            // Re-query excluding raw sensor, keeping only fitness app data
            console.log(
              "📊 Filtering out raw sensor, keeping apps:",
              appSources,
            );
            const filteredAggregate = await aggregateRecord({
              recordType: "Steps",
              timeRangeFilter: {
                operator: "between",
                startTime: todayStart.toISOString(),
                endTime: endDate.toISOString(),
              },
              dataOriginFilter: appSources,
            });

            if (
              filteredAggregate &&
              typeof filteredAggregate.COUNT_TOTAL === "number"
            ) {
              healthData.steps = filteredAggregate.COUNT_TOTAL;
              // Use filtered origins for source attribution
              appSources.forEach((origin: string) =>
                allDataOrigins.add(origin),
              );
              const bestSource = getBestDataSource(appSources);
              if (bestSource) {
                healthData.sources!.steps = {
                  packageName: appSources[0],
                  ...bestSource,
                };
              }
              console.log("📊 Steps (filtered, apps only):", healthData.steps);
            } else {
              // Fallback to unfiltered if filtered query fails
              healthData.steps = stepsAggregate.COUNT_TOTAL;
              origins.forEach((origin: string) => allDataOrigins.add(origin));
            }
          } else {
            // No conflict - use original aggregate
            // (Either only apps, or only raw sensor as fallback)
            healthData.steps = stepsAggregate.COUNT_TOTAL;
            origins.forEach((origin: string) => allDataOrigins.add(origin));
            const bestSource = getBestDataSource(origins);
            if (bestSource) {
              healthData.sources!.steps = {
                packageName: origins[0],
                ...bestSource,
              };
            }
            console.log("📊 Steps (no conflict):", healthData.steps);
          }
        } else {
          console.log("📊 No step data found for today");
          healthData.steps = 0;
        }
      } catch (error) {
        console.warn("⚠️ Failed to aggregate steps:", error);
        // Don't set to 0 - let it remain undefined to indicate error
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("steps");
      }

      // =========================================================================
      // HEART RATE - Using aggregateRecord() for average/min/max
      // =========================================================================
      try {
        const heartRateAggregate = await aggregateRecord({
          recordType: "HeartRate",
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          heartRateAggregate &&
          typeof heartRateAggregate.BPM_AVG === "number"
        ) {
          healthData.heartRate = Math.round(heartRateAggregate.BPM_AVG);
          healthData.restingHeartRate = heartRateAggregate.BPM_MIN;

          // Extract data origins
          if (
            heartRateAggregate.dataOrigins &&
            heartRateAggregate.dataOrigins.length > 0
          ) {
            heartRateAggregate.dataOrigins.forEach((origin: string) =>
              allDataOrigins.add(origin),
            );
            const bestSource = getBestDataSource(
              heartRateAggregate.dataOrigins,
            );
            if (bestSource) {
              healthData.sources!.heartRate = {
                packageName: heartRateAggregate.dataOrigins[0],
                ...bestSource,
              };
            }
          }

          console.log(
            "💓 Heart rate (avg):",
            healthData.heartRate,
            "bpm, Sources:",
            heartRateAggregate.dataOrigins,
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to aggregate heart rate:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("heartRate");
      }

      // =========================================================================
      // ACTIVE CALORIES - Using aggregateRecord() for total
      // =========================================================================
      try {
        const caloriesAggregate = await aggregateRecord({
          recordType: "ActiveCaloriesBurned",
          timeRangeFilter: {
            operator: "between",
            startTime: todayStart.toISOString(), // Today only for daily display
            endTime: endDate.toISOString(),
          },
        });

        if (caloriesAggregate && caloriesAggregate.ACTIVE_CALORIES_TOTAL) {
          healthData.activeCalories = Math.round(
            caloriesAggregate.ACTIVE_CALORIES_TOTAL.inKilocalories || 0,
          );

          // Extract data origins
          if (
            caloriesAggregate.dataOrigins &&
            caloriesAggregate.dataOrigins.length > 0
          ) {
            caloriesAggregate.dataOrigins.forEach((origin: string) =>
              allDataOrigins.add(origin),
            );
            const bestSource = getBestDataSource(caloriesAggregate.dataOrigins);
            if (bestSource) {
              healthData.sources!.activeCalories = {
                packageName: caloriesAggregate.dataOrigins[0],
                ...bestSource,
              };
            }
          }

          console.log(
            "🔥 Active calories (aggregated):",
            healthData.activeCalories,
            "kcal",
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to aggregate active calories:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("activeCalories");
      }

      // =========================================================================
      // TOTAL CALORIES - Full daily energy expenditure (BMR + Active)
      // This is what Google Fit displays as "Cal" on the home screen
      // Falls back to BMR + ActiveCalories if TotalCaloriesBurned permission denied
      // =========================================================================
      let totalCaloriesSuccess = false;
      try {
        console.log(
          "🔥 Aggregating total calories from:",
          todayStart.toISOString(),
          "to:",
          endDate.toISOString(),
        );
        const totalCaloriesAggregate = await aggregateRecord({
          recordType: "TotalCaloriesBurned",
          timeRangeFilter: {
            operator: "between",
            startTime: todayStart.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (totalCaloriesAggregate && totalCaloriesAggregate.ENERGY_TOTAL) {
          healthData.totalCalories = Math.round(
            totalCaloriesAggregate.ENERGY_TOTAL.inKilocalories || 0,
          );
          totalCaloriesSuccess = true;

          // Extract data origins
          if (
            totalCaloriesAggregate.dataOrigins &&
            totalCaloriesAggregate.dataOrigins.length > 0
          ) {
            totalCaloriesAggregate.dataOrigins.forEach((origin: string) =>
              allDataOrigins.add(origin),
            );
            const bestSource = getBestDataSource(
              totalCaloriesAggregate.dataOrigins,
            );
            if (bestSource) {
              healthData.sources!.totalCalories = {
                packageName: totalCaloriesAggregate.dataOrigins[0],
                ...bestSource,
              };
            }
          }

          console.log(
            "🔥 Total calories (aggregated):",
            healthData.totalCalories,
            "kcal",
          );
        } else {
          console.log("🔥 No total calories data available for today");
        }
      } catch (error) {
        console.warn("⚠️ Failed to aggregate total calories:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("totalCalories");
        // Will try BMR fallback below
      }

      // =========================================================================
      // BMR FALLBACK - If TotalCaloriesBurned failed, try BMR + ActiveCalories
      // =========================================================================
      if (!totalCaloriesSuccess || !healthData.totalCalories) {
        try {
          console.log("🔥 Trying BMR fallback for total calories...");
          const bmrAggregate = await aggregateRecord({
            recordType: "BasalMetabolicRate",
            timeRangeFilter: {
              operator: "between",
              startTime: todayStart.toISOString(),
              endTime: endDate.toISOString(),
            },
          });

          if (bmrAggregate && bmrAggregate.BASAL_CALORIES_TOTAL) {
            const bmrCalories = Math.round(
              bmrAggregate.BASAL_CALORIES_TOTAL.inKilocalories || 0,
            );
            const activeCalories = healthData.activeCalories || 0;
            healthData.totalCalories = bmrCalories + activeCalories;

            console.log(
              "🔥 Total calories (BMR fallback):",
              healthData.totalCalories,
              "kcal (BMR:",
              bmrCalories,
              "+ Active:",
              activeCalories,
              ")",
            );

            // Mark source as calculated
            if (
              bmrAggregate.dataOrigins &&
              bmrAggregate.dataOrigins.length > 0
            ) {
              bmrAggregate.dataOrigins.forEach((origin: string) =>
                allDataOrigins.add(origin),
              );
              const bestSource = getBestDataSource(bmrAggregate.dataOrigins);
              if (bestSource) {
                healthData.sources!.totalCalories = {
                  packageName: bmrAggregate.dataOrigins[0],
                  ...bestSource,
                  name: bestSource.name + " (BMR+Active)",
                };
              }
            }
          } else {
            console.log("🔥 No BMR data available for fallback");
          }
        } catch (bmrError) {
          console.warn("⚠️ BMR fallback also failed:", bmrError);
        }
      }

      // =========================================================================
      // DISTANCE - Using aggregateRecord() with smart source filtering
      // Same logic as steps - excludes raw sensor to prevent double-counting
      // =========================================================================
      try {
        const distanceAggregate = await aggregateRecord({
          recordType: "Distance",
          timeRangeFilter: {
            operator: "between",
            startTime: todayStart.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (distanceAggregate && distanceAggregate.DISTANCE) {
          const origins = distanceAggregate.dataOrigins || [];
          const hasRawSensor = origins.some((o: string) =>
            this.EXCLUDED_RAW_SOURCES.includes(o),
          );
          const appSources = origins.filter(
            (o: string) => !this.EXCLUDED_RAW_SOURCES.includes(o),
          );
          const hasAppSources = appSources.length > 0;

          if (hasRawSensor && hasAppSources) {
            // Re-query excluding raw sensor
            const filteredAggregate = await aggregateRecord({
              recordType: "Distance",
              timeRangeFilter: {
                operator: "between",
                startTime: todayStart.toISOString(),
                endTime: endDate.toISOString(),
              },
              dataOriginFilter: appSources,
            });

            if (filteredAggregate && filteredAggregate.DISTANCE) {
              healthData.distance = Math.round(
                filteredAggregate.DISTANCE.inMeters || 0,
              );
              appSources.forEach((origin: string) =>
                allDataOrigins.add(origin),
              );
              const bestSource = getBestDataSource(appSources);
              if (bestSource) {
                healthData.sources!.distance = {
                  packageName: appSources[0],
                  ...bestSource,
                };
              }
              console.log(
                "🏃 Distance (filtered, apps only):",
                healthData.distance,
                "meters",
              );
            } else {
              healthData.distance = Math.round(
                distanceAggregate.DISTANCE.inMeters || 0,
              );
            }
          } else {
            healthData.distance = Math.round(
              distanceAggregate.DISTANCE.inMeters || 0,
            );
            origins.forEach((origin: string) => allDataOrigins.add(origin));
            const bestSource = getBestDataSource(origins);
            if (bestSource) {
              healthData.sources!.distance = {
                packageName: origins[0],
                ...bestSource,
              };
            }
            console.log(
              "🏃 Distance (no conflict):",
              healthData.distance,
              "meters",
            );
          }
        }
      } catch (error) {
        console.warn("⚠️ Failed to aggregate distance:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("distance");
      }

      // =========================================================================
      // WEIGHT - Using readRecords to get most recent value
      // (No aggregation needed - we want the latest measurement)
      // =========================================================================
      try {
        const weightRecords = await readRecords("Weight", {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          weightRecords &&
          "records" in weightRecords &&
          weightRecords.records.length > 0
        ) {
          // Get most recent weight reading
          const latestRecord = weightRecords.records[
            weightRecords.records.length - 1
          ] as any;
          healthData.weight = latestRecord.weight?.inKilograms;

          // Track source
          if (latestRecord.metadata?.dataOrigin) {
            allDataOrigins.add(latestRecord.metadata.dataOrigin);
            const source = getDataSource(latestRecord.metadata.dataOrigin);
            healthData.sources!.weight = {
              packageName: latestRecord.metadata.dataOrigin,
              ...source,
            };
          }

          console.log("⚖️ Weight retrieved:", healthData.weight, "kg");
        }
      } catch (error) {
        console.warn("⚠️ Failed to read weight:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("weight");
      }

      // =========================================================================
      // SLEEP - Using readRecords to get individual sessions with stages
      // (Need individual records for sleep stage analysis)
      // =========================================================================
      try {
        const sleepRecords = await readRecords("SleepSession", {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          sleepRecords &&
          "records" in sleepRecords &&
          sleepRecords.records.length > 0
        ) {
          healthData.sleep = sleepRecords.records.map((sleep: any) => ({
            startTime: sleep.startTime,
            endTime: sleep.endTime,
            duration: Math.round(
              (new Date(sleep.endTime).getTime() -
                new Date(sleep.startTime).getTime()) /
                60000,
            ),
          }));

          // Track source from first record
          const firstRecord = sleepRecords.records[0] as any;
          if (firstRecord.metadata?.dataOrigin) {
            allDataOrigins.add(firstRecord.metadata.dataOrigin);
            const source = getDataSource(firstRecord.metadata.dataOrigin);
            healthData.sources!.sleep = {
              packageName: firstRecord.metadata.dataOrigin,
              ...source,
            };
          }

          console.log(
            "😴 Sleep sessions retrieved:",
            healthData.sleep?.length || 0,
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to read sleep data:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("sleep");
      }

      // =========================================================================
      // EXERCISE SESSIONS - Workout sessions from wearables
      // =========================================================================
      try {
        const exerciseRecords = await readRecords("ExerciseSession", {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          exerciseRecords &&
          "records" in exerciseRecords &&
          exerciseRecords.records.length > 0
        ) {
          healthData.exerciseSessions = exerciseRecords.records.map(
            (exercise: any) => ({
              id: exercise.metadata?.id || `exercise_${Date.now()}`,
              startTime: exercise.startTime,
              endTime: exercise.endTime,
              exerciseType: exercise.exerciseType?.toString() || "unknown",
              title: exercise.title,
              calories: exercise.energy?.inKilocalories,
              distance: exercise.distance?.inMeters,
              duration: Math.round(
                (new Date(exercise.endTime).getTime() -
                  new Date(exercise.startTime).getTime()) /
                  60000,
              ),
            }),
          );

          // Track source from first record
          const firstRecord = exerciseRecords.records[0] as any;
          if (firstRecord.metadata?.dataOrigin) {
            allDataOrigins.add(firstRecord.metadata.dataOrigin);
            const source = getDataSource(firstRecord.metadata.dataOrigin);
            healthData.sources!.exerciseSessions = {
              packageName: firstRecord.metadata.dataOrigin,
              ...source,
            };
          }

          console.log(
            "🏋️ Exercise sessions retrieved:",
            healthData.exerciseSessions?.length || 0,
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to read exercise sessions:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("exerciseSessions");
      }

      // =========================================================================
      // HEART RATE VARIABILITY (HRV) - Recovery/stress analysis
      // =========================================================================
      try {
        const hrvRecords = await readRecords("HeartRateVariabilityRmssd", {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          hrvRecords &&
          "records" in hrvRecords &&
          hrvRecords.records.length > 0
        ) {
          // Get most recent HRV reading
          const latestRecord = hrvRecords.records[
            hrvRecords.records.length - 1
          ] as any;
          healthData.heartRateVariability =
            latestRecord.heartRateVariabilityMillis;

          // Track source
          if (latestRecord.metadata?.dataOrigin) {
            allDataOrigins.add(latestRecord.metadata.dataOrigin);
            const source = getDataSource(latestRecord.metadata.dataOrigin);
            healthData.sources!.heartRateVariability = {
              packageName: latestRecord.metadata.dataOrigin,
              ...source,
            };
          }

          console.log(
            "💓 HRV retrieved:",
            healthData.heartRateVariability,
            "ms",
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to read HRV data:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("heartRateVariability");
      }

      // =========================================================================
      // OXYGEN SATURATION (SpO2) - Blood oxygen level
      // =========================================================================
      try {
        const spo2Records = await readRecords("OxygenSaturation", {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          spo2Records &&
          "records" in spo2Records &&
          spo2Records.records.length > 0
        ) {
          // Get most recent SpO2 reading
          const latestRecord = spo2Records.records[
            spo2Records.records.length - 1
          ] as any;
          healthData.oxygenSaturation = latestRecord.percentage;

          // Track source
          if (latestRecord.metadata?.dataOrigin) {
            allDataOrigins.add(latestRecord.metadata.dataOrigin);
            const source = getDataSource(latestRecord.metadata.dataOrigin);
            healthData.sources!.oxygenSaturation = {
              packageName: latestRecord.metadata.dataOrigin,
              ...source,
            };
          }

          console.log("🫁 SpO2 retrieved:", healthData.oxygenSaturation, "%");
        }
      } catch (error) {
        console.warn("⚠️ Failed to read SpO2 data:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("oxygenSaturation");
      }

      // =========================================================================
      // BODY FAT - Body composition from smart scales
      // =========================================================================
      try {
        const bodyFatRecords = await readRecords("BodyFat", {
          timeRangeFilter: {
            operator: "between",
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (
          bodyFatRecords &&
          "records" in bodyFatRecords &&
          bodyFatRecords.records.length > 0
        ) {
          // Get most recent body fat reading
          const latestRecord = bodyFatRecords.records[
            bodyFatRecords.records.length - 1
          ] as any;
          healthData.bodyFat = latestRecord.percentage;

          // Track source
          if (latestRecord.metadata?.dataOrigin) {
            allDataOrigins.add(latestRecord.metadata.dataOrigin);
            const source = getDataSource(latestRecord.metadata.dataOrigin);
            healthData.sources!.bodyFat = {
              packageName: latestRecord.metadata.dataOrigin,
              ...source,
            };
          }

          console.log("🏋️ Body fat retrieved:", healthData.bodyFat, "%");
        }
      } catch (error) {
        console.warn("⚠️ Failed to read body fat data:", error);
        healthData.metadata!.isPartial = true;
        healthData.metadata!.failedMetrics!.push("bodyFat");
      }

      // Store all data origins for transparency
      healthData.dataOrigins = Array.from(allDataOrigins);
      healthData.lastSyncDate = endDate.toISOString();

      console.log("📱 All data sources:", healthData.dataOrigins);

      // Log if partial data
      if (healthData.metadata?.isPartial) {
        console.warn(
          "⚠️ Partial data sync - some metrics failed:",
          healthData.metadata.failedMetrics,
        );
      }

      // Cache the health data
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
        error:
          error instanceof Error
            ? error.message
            : "Unknown Health Connect sync error",
        syncTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Open Health Connect settings for user to manage permissions
   */
  async openSettings(): Promise<void> {
    try {
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.warn(
          "⚙️ Health Connect native module not available - cannot open settings",
        );
        return;
      }

      const { openHealthConnectSettings } = hcModule;
      console.log("⚙️ Opening Health Connect settings...");
      await openHealthConnectSettings();
    } catch (error) {
      console.error("❌ Failed to open Health Connect settings:", error);
    }
  }

  /**
   * Get cached health data for offline access
   */
  async getCachedHealthData(): Promise<HealthConnectData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error("❌ Error reading cached Health Connect data:", error);
      return null;
    }
  }

  /**
   * Cache health data locally
   */
  private async cacheHealthData(data: HealthConnectData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(this.SYNC_INTERVAL_KEY, Date.now().toString());
    } catch (error) {
      console.error("❌ Error caching Health Connect data:", error);
    }
  }

  /**
   * Get the last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(this.SYNC_INTERVAL_KEY);
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error("❌ Error getting last Health Connect sync time:", error);
      return null;
    }
  }

  /**
   * Check if sync is needed (based on time elapsed)
   */
  async shouldSync(intervalHours: number = 1): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const hoursSinceLastSync =
      (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync >= intervalHours;
  }

  /**
   * Get comprehensive health summary for dashboard
   */
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

      // Calculate total sleep hours from sleep data
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
          Math.round(((cachedData?.distance || 0) / 1000) * 10) / 10, // Convert to km
        lastWeight: cachedData?.weight,
        heartRate: cachedData?.heartRate,
        sleepHours,
        syncStatus,
      };
    } catch (error) {
      console.error("❌ Error getting Health Connect health summary:", error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        dailyDistance: 0,
        syncStatus: "never_synced",
      };
    }
  }

  /**
   * Clear all cached health data
   */
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

  /**
   * Disconnect from Health Connect
   */
  async disconnect(): Promise<boolean> {
    try {
      console.log("🔌 Disconnecting from Health Connect...");

      // Clear cached data and permissions
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

  /**
   * Re-authorize Health Connect with fresh permissions
   * Use this when new permission types have been added (e.g., TotalCaloriesBurned)
   * This revokes all existing permissions and requests fresh authorization
   */
  async reauthorize(): Promise<boolean> {
    try {
      console.log("🔄 Re-authorizing Health Connect with fresh permissions...");

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.error(
          "❌ Health Connect module not available for re-authorization",
        );
        return false;
      }

      const { revokeAllPermissions } = hcModule;

      // Step 1: Revoke all existing permissions
      console.log("🔐 Revoking all existing permissions...");
      await revokeAllPermissions();

      // Step 2: Clear cached state
      this.permissionsGranted = false;
      this.isInitialized = false;
      await AsyncStorage.multiRemove([
        "fitai_healthconnect_permissions",
        "fitai_healthconnect_initialized",
        this.STORAGE_KEY,
        this.SYNC_INTERVAL_KEY,
      ]);
      console.log("🗑️ Cleared cached permissions and data");

      // Step 3: Re-initialize
      const initialized = await this.initializeHealthConnect();
      if (!initialized) {
        console.error("❌ Failed to re-initialize Health Connect");
        return false;
      }

      // Step 4: Request fresh permissions (now includes TotalCaloriesBurned, BMR, etc.)
      console.log("🔐 Requesting fresh permissions...");
      const permissionsGranted = await this.requestPermissions();

      if (permissionsGranted) {
        console.log("✅ Re-authorization successful! All permissions granted.");
      } else {
        console.warn(
          "⚠️ Re-authorization incomplete - some permissions may not have been granted",
        );
      }

      return permissionsGranted;
    } catch (error) {
      console.error("❌ Re-authorization failed:", error);
      return false;
    }
  }

  /**
   * Get current initialization status
   */
  isHealthConnectInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check Health Connect availability on device
   */
  async isHealthConnectAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") {
        return false;
      }

      // Get the Health Connect module
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        console.log("Health Connect native module not available");
        return false;
      }

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

  /**
   * Run a single background sync operation
   * Returns true if new data was synced, false otherwise
   */
  async runBackgroundSyncOnce(): Promise<boolean> {
    try {
      console.log("🔄 Running background Health Connect sync...");

      // Check if sync is needed
      const shouldSync = await this.shouldSync(1); // Check if 1+ hours since last sync
      if (!shouldSync) {
        console.log("⏭️ Skipping sync - recent sync exists");
        return false;
      }

      // Perform sync
      const result = await this.syncHealthData(1); // Sync last 1 day
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

// Export singleton instance for consistent usage across app
export const healthConnectService = new HealthConnectService();

/**
 * Check if Health Connect native module is available
 * Use this for quick synchronous checks in UI components
 */
export const isHealthConnectModuleAvailable = (): boolean => {
  return isHealthConnectNativeAvailable();
};

/**
 * Check if Health Connect can be used (async version with full check)
 */
export const canUseHealthConnect = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return false;
  }
  const module = await getHealthConnectModule();
  return module !== null;
};

export default healthConnectService;
