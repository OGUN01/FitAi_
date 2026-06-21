// Health Data Store for managing HealthKit integration state
// Handles health metrics, sync status, and integration preferences

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import {
  healthKitService,
  HealthKitData,
  HealthSyncResult,
} from "../services/healthKit";
import {
  healthConnectService,
  HealthConnectData,
  HealthConnectSyncResult,
  MetricSource,
  DataSource,
} from "../services/healthConnect";
import { mapWorkoutTypeToHealthConnect } from "../services/health/types";
import { resolveCurrentWeightForUser } from "../services/currentWeight";
import { weightTrackingService } from "../services/WeightTrackingService";
import { useProfileStore } from "./profileStore";
import { useAuthStore } from "./authStore";
import { getLocalDateString } from "../utils/weekUtils";
import {
  healthMetricsDataService,
  ALL_METRIC_TYPES,
} from "../services/healthMetricsData";

function mergeRecentWorkouts(
  existing: HealthMetrics["recentWorkouts"],
  incoming: HealthMetrics["recentWorkouts"],
): HealthMetrics["recentWorkouts"] {
  const seen = new Set<string>();
  return [...incoming, ...existing]
    .filter((workout) => {
      const key = `${workout.source}:${workout.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
}

/**
 * Task 2 (Weight SSOT): resolves the CANONICAL weight for the user via
 * `resolveCurrentWeightForUser` and writes it to BOTH the profile store
 * (`body_analysis.current_weight_kg`) AND the weight-tracking service.
 *
 * Returns the resolved canonical weight so callers (the HC sync path) can use
 * the SAME canonical value for `health_metrics.weight_kg` — guaranteeing
 * `health_metrics.weight_kg` and `body_analysis.current_weight_kg` hold one
 * consistent value (CLAUDE.md #1 single source of truth). Returns undefined
 * if no weight was supplied or resolution failed (CLAUDE.md #8 — no fake
 * fallbacks).
 */
async function syncWeightToProfile(
  weight?: number,
): Promise<number | undefined> {
  if (!weight || weight <= 0) return undefined;
  try {
    const userId = useAuthStore.getState().user?.id;
    const resolvedCurrentWeight = userId
      ? await resolveCurrentWeightForUser(userId, {
          bodyAnalysisWeight: weight,
        })
      : {
          value: weight,
          source: "body_analysis" as const,
          asOf: null,
        };
    const canonicalWeight = resolvedCurrentWeight.value ?? weight;

    useProfileStore.getState().updateBodyAnalysis({
      current_weight_kg: canonicalWeight,
    });
    weightTrackingService.setWeight(canonicalWeight);
    return canonicalWeight;
  } catch (e) {
    console.error('[HealthDataStore] syncWeightToProfile failed:', e);
    return undefined;
  }
}

// Re-export MetricSource for UI components
export type { MetricSource, DataSource };

export interface HealthMetrics {
  // Daily Activity
  steps: number;
  stepsGoal?: number; // Daily step goal - from user settings or calculated
  activeCalories: number;
  totalCalories?: number; // Total daily calories (BMR + active) - from Health Connect
  caloriesGoal?: number; // Daily calories goal - from user settings or calculated
  distance?: number; // in kilometers

  // Body Metrics
  weight?: number; // in kg
  bodyFatPercentage?: number;
  muscleMass?: number;

  // Vital Signs
  heartRate?: number; // BPM
  restingHeartRate?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };

  // Advanced Vitals (B-5: surfaced from Health Connect — previously read and discarded)
  heartRateVariability?: number; // RMSSD in ms — recovery indicator
  oxygenSaturation?: number; // SpO2 percentage — health monitoring
  bodyFat?: number; // Body fat percentage from smart scales / Health Connect

  // Recovery & Sleep
  sleepHours?: number;
  sleepQuality?: "poor" | "fair" | "good" | "excellent";
  stressLevel?: number; // 1-10 scale

  // Workout Data
  recentWorkouts: Array<{
    id: string;
    type: string;
    duration: number;
    calories: number;
    date: string;
    source: "FitAI" | "HealthKit" | "HealthConnect" | "Manual";
  }>;

  // Timing
  lastUpdated: string;

  // Data Source Attribution - shows where each metric came from
  sources?: {
    steps?: MetricSource;
    heartRate?: MetricSource;
    activeCalories?: MetricSource;
    totalCalories?: MetricSource;
    distance?: MetricSource;
    weight?: MetricSource;
    sleep?: MetricSource;
    heartRateVariability?: MetricSource;
    oxygenSaturation?: MetricSource;
    bodyFat?: MetricSource;
  };

  // All data origins that contributed to current metrics
  dataOrigins?: string[];

  // Advanced Vitals sources (B-5: attribution for HRV / SpO2 / BodyFat)
  hrvSource?: MetricSource;
  spo2Source?: MetricSource;
  bodyFatSource?: MetricSource;
}

interface HealthIntegrationSettings {
  healthKitEnabled: boolean;
  healthConnectEnabled: boolean; // Health Connect integration
  autoSyncEnabled: boolean;
  syncFrequency: "realtime" | "hourly" | "daily"; // How often to sync
  dataTypesToSync: {
    steps: boolean;
    heartRate: boolean;
    workouts: boolean;
    sleep: boolean;
    weight: boolean;
    nutrition: boolean;
    hrv: boolean; // Heart Rate Variability
    spo2: boolean; // Oxygen Saturation
    bodyFat: boolean; // Body composition
  };
  exportToHealthKit: boolean; // Whether to write FitAI data to HealthKit
  backgroundSyncEnabled: boolean;
  // Google Fit REST API is deprecated (shutdown end-2026) and removed from
  // the app. HealthKit (iOS) and Health Connect (Android) are the only
  // supported providers. See B-2/B-3 in the architecture doc.
  preferredProvider: "healthkit" | "healthconnect";
}

interface HealthDataState {
  // Current Health Data
  metrics: HealthMetrics;

  // Wave 3: Persisted historical snapshots from the health_metrics Supabase
  // table. Populated by loadHealthMetricsHistory(). Read path for the charts
  // UI — the store remains the runtime source of truth (CLAUDE.md #6).
  metricsHistory: Record<
    string,
    Array<{ date: string; value: number }>
  >;

  // Integration Status
  isHealthKitAvailable: boolean;
  isHealthKitAuthorized: boolean;
  isHealthConnectAvailable: boolean; // Health Connect availability
  isHealthConnectAuthorized: boolean; // Health Connect authorization
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncTime?: string;
  syncError?: string;

  // Settings
  settings: HealthIntegrationSettings;

  // UI State
  showingHealthDashboard: boolean;
  healthTipOfDay?: string;

  // Actions
  initializeHealthKit: () => Promise<boolean>;
  requestHealthKitPermissions: () => Promise<boolean>;
  initializeHealthConnect: () => Promise<boolean>; // Health Connect initialization
  requestHealthConnectPermissions: () => Promise<boolean>; // Health Connect permissions
  reauthorizeHealthConnect: () => Promise<boolean>; // Re-authorize with fresh permissions (for new permission types)
  syncHealthData: (force?: boolean) => Promise<void>;
  syncFromHealthConnect: (
    daysBack?: number,
  ) => Promise<HealthConnectSyncResult>; // Health Connect sync
  updateHealthMetrics: (metrics: Partial<HealthMetrics>) => void;
  updateSettings: (settings: Partial<HealthIntegrationSettings>) => void;
  exportWorkoutToHealthKit: (workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
  }) => Promise<boolean>;
  // B-2: Android mirror of exportWorkoutToHealthKit — writes a completed
  // FitAI workout back to Health Connect so other Android health apps see it.
  // Gated on Health Connect being authorized; errors are logged, not swallowed.
  exportWorkoutToHealthConnect: (workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
    title?: string;
    notes?: string;
  }) => Promise<boolean>;
  exportNutritionToHealthKit: (nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water?: number;
    date: Date;
  }) => Promise<boolean>;

  // Advanced Health Features (Roadmap Week 1 requirements)
  // Uses actual HealthKit/Health Connect data when available, falls back to age-based formulas
  getHeartRateZones: (age: number) => Promise<{
    restingHR?: number;
    maxHR: number;
    calculationMethod?: string;
    zones: Record<
      string,
      { min: number; max: number; name: string; description?: string }
    >;
  }>;
  getSleepRecommendations: () => Promise<{
    sleepQuality: string;
    sleepDuration: number;
    workoutRecommendations: {
      intensityAdjustment: number;
      workoutType: string;
      duration: string;
      notes: string[];
    };
  }>;
  getActivityAdjustedCalories: (baseCalories: number) => Promise<{
    adjustedCalories: number;
    activityMultiplier: number;
    breakdown: Record<string, number>;
    recommendations: string[];
  }>;

  // Actions - Step Goal
  setStepsGoal: (goal: number) => void;

  setShowHealthDashboard: (show: boolean) => void;
  getHealthInsights: () => string[];

  // Wave 3: Load persisted historical health metrics from Supabase into the
  // store so charts have a read path. Fire-and-forget-safe — failures only
  // log, they do not throw into the caller.
  loadHealthMetricsHistory: (days?: number) => Promise<void>;

  resetHealthData: () => void;

  // Reset store (for logout) - alias for resetHealthData
  reset: () => void;
}

export const useHealthDataStore = create<HealthDataState>()(
  persist(
    (set, get) => ({
      // Initial State
      metrics: {
        steps: 0,
        activeCalories: 0,
        recentWorkouts: [],
        lastUpdated: new Date().toISOString(),
      },

      // Wave 3: empty until loadHealthMetricsHistory() is called.
      metricsHistory: {},

      isHealthKitAvailable: false,
      isHealthKitAuthorized: false,
      isHealthConnectAvailable: false, // Health Connect availability
      isHealthConnectAuthorized: false, // Health Connect authorization
      syncStatus: "idle",

      settings: {
        healthKitEnabled: true,
        healthConnectEnabled: true, // Enable Health Connect by default
        autoSyncEnabled: true,
        syncFrequency: "hourly",
        dataTypesToSync: {
          steps: true,
          heartRate: true,
          workouts: true,
          sleep: true,
          weight: true,
          nutrition: false, // Default off for privacy
          hrv: true, // Heart Rate Variability - useful for recovery
          spo2: true, // Oxygen Saturation - health monitoring
          bodyFat: true, // Body composition from smart scales
        },
        exportToHealthKit: true,
        backgroundSyncEnabled: true,
        preferredProvider: "healthconnect", // Default to Health Connect for Android
      },

      showingHealthDashboard: false,

      // Actions
      initializeHealthKit: async (): Promise<boolean> => {
        try {

          const isAvailable = await healthKitService.initialize();
          const hasPermissions = await healthKitService.hasPermissions();

          set({
            isHealthKitAvailable: isAvailable,
            isHealthKitAuthorized: hasPermissions,
          });

          // If we have permissions, perform initial sync
          if (isAvailable && hasPermissions) {
            get().syncHealthData(false);
          }

          return isAvailable;
        } catch (error) {
          console.error("❌ Failed to initialize HealthKit:", error);
          return false;
        }
      },

      requestHealthKitPermissions: async (): Promise<boolean> => {
        try {
          set({ syncStatus: "syncing" });

          const granted = await healthKitService.initialize();

          set({
            isHealthKitAuthorized: granted,
            syncStatus: granted ? "success" : "error",
            syncError: granted ? undefined : "HealthKit permissions denied",
          });

          // If permissions granted, perform initial sync
          if (granted) {
            await get().syncHealthData(true);
          }

          return granted;
        } catch (error) {
          console.error("❌ Failed to request HealthKit permissions:", error);
          set({
            syncStatus: "error",
            syncError:
              error instanceof Error
                ? error.message
                : "Permission request failed",
          });
          return false;
        }
      },

      // Health Connect Actions
      initializeHealthConnect: async (): Promise<boolean> => {
        try {

          // Check if Health Connect is available and initialize
          const isAvailable =
            await healthConnectService.initializeHealthConnect();

          if (isAvailable) {
            // Check if permissions are already granted
            const hasPermissions = await healthConnectService.hasPermissions();

            // Update store state
            set((state) => ({
              isHealthConnectAvailable: isAvailable,
              isHealthConnectAuthorized: hasPermissions,
            }));

            return hasPermissions;
          }

          set({ isHealthConnectAvailable: false });
          return false;
        } catch (error) {
          console.error("❌ Failed to initialize Health Connect:", error);
          set({ syncStatus: "error" });
          return false;
        }
      },

      requestHealthConnectPermissions: async (): Promise<boolean> => {
        try {

          const permissionGranted =
            await healthConnectService.requestPermissions();

          // Update store state based on permission result
          set((state) => ({
            isHealthConnectAuthorized: permissionGranted,
            syncStatus: permissionGranted ? "idle" : "error",
          }));

          return permissionGranted;
        } catch (error) {
          console.error(
            "❌ Failed to request Health Connect permissions:",
            error,
          );
          set({ syncStatus: "error" });
          return false;
        }
      },

      reauthorizeHealthConnect: async (): Promise<boolean> => {
        try {

          // Reset authorization state before re-auth
          set({ isHealthConnectAuthorized: false, syncStatus: "syncing" });

          const success = await healthConnectService.reauthorize();

          // Update store state based on result
          set((state) => ({
            isHealthConnectAuthorized: success,
            syncStatus: success ? "idle" : "error",
          }));

          if (success) {
            // Automatically sync after successful re-authorization
            await get().syncFromHealthConnect(7);
          }

          return success;
        } catch (error) {
          console.error("❌ Failed to re-authorize Health Connect:", error);
          set({ syncStatus: "error", isHealthConnectAuthorized: false });
          return false;
        }
      },

      syncFromHealthConnect: async (
        daysBack: number = 7,
      ): Promise<HealthConnectSyncResult> => {
        try {
          // Re-entrancy guard: three callers can trigger a sync concurrently
          // (background fetch task, AppState resume-sync, manual tap/Home
          // mount). Without this guard two syncs overlap, call the native HC
          // reader twice, and thrash syncStatus (one path's "error" clobbers
          // the other's "success"). The upsert is idempotent on
          // (user_id, date, metric_type) so no data corruption, but the UI
          // state would flicker. Bail if a sync is already in flight.
          if (get().syncStatus === "syncing") {
            return {
              success: false,
              error: "Sync already in progress",
            };
          }

          // IMPORTANT: Ensure Health Connect is initialized before syncing
          // This fixes the race condition where sync is called before native client is ready
          const isInitialized =
            await healthConnectService.initializeHealthConnect();
          if (!isInitialized) {
            return { success: false, error: "Health Connect not initialized" };
          }

          // Update sync status to loading
          set({ syncStatus: "syncing" });

          // Perform health data sync
          const healthData =
            await healthConnectService.syncHealthData(daysBack);

          if (healthData.success && healthData.data) {
            // Update store state with new health data including sources
            set((state) => ({
              metrics: {
                ...state.metrics,
                steps: healthData.data?.steps ?? state.metrics.steps,
                stepsGoal: state.metrics.stepsGoal,
                heartRate:
                  healthData.data?.heartRate ?? state.metrics.heartRate,
                activeCalories:
                  healthData.data?.activeCalories ??
                  state.metrics.activeCalories,
              totalCalories:
                  healthData.data?.totalCalories ?? state.metrics.totalCalories,
                distance: healthData.data?.distance
                  ? healthData.data.distance / 1000
                  : state.metrics.distance,
                weight: healthData.data?.weight ?? state.metrics.weight,
                sleepHours: healthData.data?.sleep
                  ? healthData.data.sleep.reduce(
                      (total, sleep) => total + sleep.duration,
                      0,
                    ) / 60
                  : state.metrics.sleepHours,
                recentWorkouts: mergeRecentWorkouts(
                  state.metrics.recentWorkouts,
                  (healthData.data?.exerciseSessions || []).map((workout) => ({
                    id: workout.id,
                    type: workout.exerciseType,
                    duration: workout.duration,
                    calories: workout.calories || 0,
                    date: workout.startTime,
                    source: "HealthConnect" as const,
                  })),
                ),
                lastUpdated: new Date().toISOString(),
                sources: healthData.data?.sources ?? state.metrics.sources,
                dataOrigins:
                  healthData.data?.dataOrigins ?? state.metrics.dataOrigins,
                // B-5: surface HRV / SpO2 / BodyFat from Health Connect.
                // syncHelpers reads these records and sets them on
                // HealthConnectData; copy them through so the store is the
                // single runtime source for these metrics (UI surfacing is a
                // follow-up — the fields existing in the store is the fix).
                // Use `undefined` (not `null`) to match the optional-field
                // contract of HealthMetrics — CLAUDE.md #8: surface missing
                // data as absent, never as a fake fallback.
                heartRateVariability:
                  healthData.data?.heartRateVariability ?? undefined,
                oxygenSaturation:
                  healthData.data?.oxygenSaturation ?? undefined,
                bodyFat: healthData.data?.bodyFat ?? undefined,
                // restingHeartRate was persisted to health_metrics but
                // previously dropped here — the VitalsCard "Resting HR" tile
                // stayed blank and getHeartRateZones silently fell back to the
                // age-based Tanaka formula. Copy it through like the other
                // vitals so the store is the runtime SSOT.
                restingHeartRate:
                  healthData.data?.restingHeartRate ??
                  state.metrics.restingHeartRate,
                hrvSource: healthData.data?.sources?.heartRateVariability,
                spo2Source: healthData.data?.sources?.oxygenSaturation,
                bodyFatSource: healthData.data?.sources?.bodyFat,
              },
              lastSyncTime: new Date().toISOString(),
              syncStatus: "success",
            }));

            // Task 2 (Weight SSOT): capture the canonical weight resolved by
            // syncWeightToProfile and use THAT for the snapshot.weight_kg below,
            // so health_metrics.weight_kg and body_analysis.current_weight_kg
            // hold the same value (CLAUDE.md #1).
            const canonicalWeight = await syncWeightToProfile(healthData.data?.weight);

            // Wave 3 + Task 6: Fire-and-forget persistence of today's health
            // snapshot to the health_metrics Supabase table. Persistence
            // failures must NEVER block the UI sync — the store is already
            // updated above, so a failed write just means no historical chart
            // row for today. Intentionally not awaited by the user-facing
            // sync flow, but the persist result IS inspected/logged (Task 4:
            // no silent failures — saveHealthSnapshot resolves {success:false}
            // rather than throwing, so the old .catch never fired).
            const snapshot: Record<string, number> = {};
            const d = healthData.data;
            if (d) {
              if (typeof d.steps === "number") snapshot.steps = d.steps;
              if (typeof d.heartRate === "number") snapshot.heart_rate = d.heartRate;
              if (typeof d.restingHeartRate === "number") snapshot.resting_heart_rate = d.restingHeartRate;
              if (typeof d.activeCalories === "number") snapshot.active_calories = d.activeCalories;
              if (typeof d.totalCalories === "number") snapshot.total_calories = d.totalCalories;
              if (typeof d.distance === "number") snapshot.distance_km = d.distance / 1000;
              // Task 2: use CANONICAL weight (resolved across body_analysis +
              // weightTrackingService + HC input), NOT the raw HC weight, so
              // the snapshot matches the profile's current_weight_kg.
              if (typeof canonicalWeight === "number") {
                snapshot.weight_kg = canonicalWeight;
              } else if (typeof d.weight === "number") {
                // Fallback: weight came in but profile sync failed/returned
                // undefined — persist the raw HC weight rather than nothing
                // (still better than no row; profile will reconcile on next sync).
                snapshot.weight_kg = d.weight;
              }
              if (typeof d.heartRateVariability === "number") snapshot.heart_rate_variability = d.heartRateVariability;
              if (typeof d.oxygenSaturation === "number") snapshot.oxygen_saturation = d.oxygenSaturation;
              if (typeof d.bodyFat === "number") snapshot.body_fat = d.bodyFat;
              // NOTE: sleep_hours is handled SEPARATELY below (Task 6) — it must
              // be attributed to the sleep session's START date (the night it
              // belongs to), not today's sync date.
            }
            if (Object.keys(snapshot).length > 0) {
              // Task 4 — surface partial failure. saveHealthSnapshot resolves
              // {success:false} on error (never throws), so awaiting and
              // checking success is the only way to log a real DB failure.
              // Kept non-blocking to the user-facing sync (the await is on the
              // persistence layer, not on the UI render).
              const persistResult = await healthMetricsDataService.saveHealthSnapshot(
                snapshot,
                "healthconnect",
              );
              if (!persistResult.success) {
                console.error(
                  "[healthDataStore] persisting health snapshot failed:",
                  "saved=" + persistResult.saved,
                  "error=" + persistResult.error,
                );
              }
            }

            // Task 6 — Sleep date attribution near midnight. A sleep session
            // starting 11:30pm and ending 7am belongs to the PREVIOUS night,
            // not today. Key sleep_hours to the EARLIEST sleep session's
            // START date (local), not today's sync date. This is a dedicated
            // single-row write (skipped from the batched snapshot above) so
            // we can pass an explicit dateStr. If there are multiple sessions
            // in the window, attribute the summed total to the earliest
            // session's start date (a single "last night" sleep value).
            if (Array.isArray(d?.sleep) && d.sleep.length > 0) {
              const earliestStart = d.sleep
                .map((s) => new Date(s.startTime).getTime())
                .filter((t) => !Number.isNaN(t))
                .sort((a, b) => a - b)[0];
              if (earliestStart !== undefined) {
                const sleepMinutes = d.sleep.reduce(
                  (t, s) => t + (s.duration || 0),
                  0,
                );
                const sleepHours = sleepMinutes / 60;
                const sleepStartDateStr = getLocalDateString(new Date(earliestStart));
                const sleepPersistResult = await healthMetricsDataService.saveHealthMetric(
                  "sleep_hours",
                  sleepHours,
                  "hours",
                  "healthconnect",
                  sleepStartDateStr,
                );
                if (!sleepPersistResult.success) {
                  console.error(
                    "[healthDataStore] persisting sleep_hours failed:",
                    "error=" + sleepPersistResult.error,
                  );
                }
              }
            }

            // Log sources for debugging

          } else {
            set({
              syncStatus: "error",
              syncError:
                healthData.error || "Unknown Health Connect sync error",
            });
          }

          return healthData;
        } catch (error) {
          console.error("❌ Health Connect sync failed:", error);

          // Update store state to reflect error
          set({ syncStatus: "error" });

          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown sync error",
          };
        }
      },

      syncHealthData: async (force: boolean = false): Promise<void> => {
        try {
          const { settings, isHealthKitAuthorized } = get();

          if (!settings.healthKitEnabled || !isHealthKitAuthorized) {
            return;
          }

          // P5-reentry: re-entrancy guard mirroring the Health Connect path
          // (syncFromHealthConnect, above). `useHealthKitSync` and
          // `useHealthKitDashboard` can BOTH mount their own AppState listener
          // + setInterval, so a foreground event can fire syncHealthData while
          // a periodic one is already mid-flight. Both paths share the same
          // `syncStatus` field, so without this guard one sync's "error" /
          // "success" clobbers the other and the UI status flickers. Bail if a
          // sync is already in flight. (The same field also blocks an HC sync
          // started during a HealthKit sync and vice versa — desirable, since
          // both write metrics + syncStatus.)
          if (get().syncStatus === "syncing") {
            return;
          }

          // Check if sync is needed (skip for now - always sync when called)
          // if (!force && !await healthKitService.shouldSync()) {
          //   return;
          // }

          set({ syncStatus: "syncing", syncError: undefined });

          const syncResult = await healthKitService.syncHealthDataFromHealthKit(
            force ? 7 : 1,
          );

          const hasMeaningfulData =
            !!syncResult.data &&
            ((syncResult.data.steps ?? 0) > 0 ||
              (syncResult.data.activeEnergy ?? 0) > 0 ||
              !!syncResult.data.bodyWeight ||
              !!syncResult.data.heartRate ||
              !!syncResult.data.sleepHours ||
              (syncResult.data.workouts?.length ?? 0) > 0);

          if (syncResult.success && syncResult.data && hasMeaningfulData) {
            // Update metrics from HealthKit data
            const newMetrics: HealthMetrics = {
              ...get().metrics,
              steps: syncResult.data.steps ?? get().metrics.steps,
              activeCalories:
                syncResult.data.activeEnergy ?? get().metrics.activeCalories,
              weight: syncResult.data.bodyWeight ?? get().metrics.weight,
              heartRate: syncResult.data.heartRate ?? get().metrics.heartRate,
              sleepHours:
                syncResult.data.sleepHours ?? get().metrics.sleepHours,
              recentWorkouts: mergeRecentWorkouts(
                get().metrics.recentWorkouts,
                syncResult.data.workouts?.map((workout: any) => ({
                  id:
                    workout.id ||
                    `${workout.activityType || "unknown"}_${workout.startDate || "unknown"}`,
                  type: workout.activityType || "unknown",
                  duration: workout.duration || 0,
                  calories: workout.energyBurned || 0,
                  date: workout.startDate || new Date().toISOString(),
                  source: "HealthKit" as const,
                })) || [],
              ),
              lastUpdated: new Date().toISOString(),
            };

            set({
              metrics: newMetrics,
              syncStatus: "success",
              lastSyncTime: new Date().toISOString(),
              syncError: undefined,
            });

            await syncWeightToProfile(syncResult.data.bodyWeight);


            // Generate health tip based on new data
            const insights = get().getHealthInsights();
            if (insights.length > 0) {
              set({ healthTipOfDay: insights[0] });
            }
          } else {
            throw new Error(syncResult.error || "No HealthKit data returned");
          }
        } catch (error) {
          console.error("❌ HealthKit sync failed:", error);
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "Sync failed",
          });
        }
      },

      updateHealthMetrics: (newMetrics: Partial<HealthMetrics>): void => {
        void syncWeightToProfile(newMetrics.weight);
        set((state) => ({
          metrics: {
            ...state.metrics,
            ...newMetrics,
            lastUpdated: new Date().toISOString(),
          },
        }));
      },

      updateSettings: (
        newSettings: Partial<HealthIntegrationSettings>,
      ): void => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));

        // If HealthKit was enabled, initialize it
        if (newSettings.healthKitEnabled === true) {
          get().initializeHealthKit();
        }
      },

      exportWorkoutToHealthKit: async (workout): Promise<boolean> => {
        try {
          const { settings, isHealthKitAuthorized } = get();

          if (!settings.exportToHealthKit || !isHealthKitAuthorized) {
            return false;
          }


          const success = await healthKitService.saveWorkoutToHealthKit({
            type: workout.type,
            duration: Math.round(
              (workout.endDate.getTime() - workout.startDate.getTime()) / 60000,
            ),
            calories: workout.calories,
            distance: workout.distance,
          });

          if (success) {
            // Add to our local workout history
            const workoutEntry = {
              id: `fitai_${Date.now()}`,
              type: workout.type,
              duration: Math.round(
                (workout.endDate.getTime() - workout.startDate.getTime()) /
                  60000,
              ),
              calories: workout.calories,
              date: workout.startDate.toISOString(),
              source: "FitAI" as const,
            };

            get().updateHealthMetrics({
              recentWorkouts: [
                ...get().metrics.recentWorkouts,
                workoutEntry,
              ].slice(-20),
            });
          }

          return success;
        } catch (error) {
          console.error("❌ Failed to export workout to HealthKit:", error);
          return false;
        }
      },

      // B-2: Android workout write-back via Health Connect.
      // Mirrors exportWorkoutToHealthKit — writes an ExerciseSession record
      // (plus an ActiveCaloriesBurned record when calories > 0) so other
      // Android health apps (Google Fit, Samsung Health, Fitbit) see the
      // completed FitAI workout. Never throws into the completion flow.
      exportWorkoutToHealthConnect: async (workout): Promise<boolean> => {
        try {
          const { settings, isHealthConnectAuthorized } = get();

          // Gate on Health Connect being enabled AND authorized. A missing
          // auth flag is a legitimate no-op (not an error to surface), but a
          // failed write is logged per CLAUDE.md #5 (no silent failures).
          if (!settings.healthConnectEnabled || !isHealthConnectAuthorized) {
            return false;
          }

          const exerciseType = mapWorkoutTypeToHealthConnect(workout.type);

          const result = await healthConnectService.writeWorkoutSession({
            exerciseType,
            startTime: workout.startDate,
            endTime: workout.endDate,
            title: workout.title,
            notes: workout.notes,
            calories: workout.calories,
          });

          if (!result.success) {
            console.error(
              "❌ Failed to export workout to Health Connect:",
              result.error,
            );
            return false;
          }

          // Add to our local workout history so the session shows up
          // immediately in recent workouts without waiting for next sync.
          const durationMinutes = Math.round(
            (workout.endDate.getTime() - workout.startDate.getTime()) / 60000,
          );
          const workoutEntry = {
            id: `fitai_hc_${Date.now()}`,
            type: workout.type,
            duration: durationMinutes,
            calories: workout.calories,
            date: workout.startDate.toISOString(),
            source: "FitAI" as const,
          };

          get().updateHealthMetrics({
            recentWorkouts: [
              ...get().metrics.recentWorkouts,
              workoutEntry,
            ].slice(-20),
          });

          return true;
        } catch (error) {
          console.error(
            "❌ Failed to export workout to Health Connect:",
            error,
          );
          return false;
        }
      },

      exportNutritionToHealthKit: async (nutrition): Promise<boolean> => {
        try {
          const { settings, isHealthKitAuthorized } = get();

          if (
            !settings.exportToHealthKit ||
            !settings.dataTypesToSync.nutrition ||
            !isHealthKitAuthorized
          ) {
            return false;
          }


          // LIBRARY LIMITATION: expo-health-kit (v1.0.8) only supports reading health data,
          // not writing nutrition data to HealthKit. Nutrition is tracked locally in FitAI.
          // See healthKit.ts:exportNutritionToHealthKit for full explanation.
          return false;
        } catch (error) {
          console.error("❌ Failed to export nutrition to HealthKit:", error);
          return false;
        }
      },

      setStepsGoal: (goal: number): void => {
        set((state) => ({
          metrics: {
            ...state.metrics,
            stepsGoal: goal,
          },
        }));
      },

      setShowHealthDashboard: (show: boolean): void => {
        set({ showingHealthDashboard: show });
      },

      getHealthInsights: (): string[] => {
        const { metrics } = get();
        const insights: string[] = [];

        // Steps insights
        if (metrics.steps > 0) {
          const stepsGoal = metrics.stepsGoal; // Use stored goal, not hardcoded
          if (stepsGoal) {
            if (metrics.steps >= stepsGoal) {
              insights.push(
                "🎉 Great job! You've exceeded your daily step goal.",
              );
            } else if (metrics.steps >= stepsGoal / 2) {
              insights.push(
                `💪 You're halfway to your step goal! ${stepsGoal - metrics.steps} steps to go.`,
              );
            } else {
              insights.push(
                "🚶 Consider taking a walk to boost your daily activity.",
              );
            }
          }
        }

        // Heart rate insights
        if (metrics.heartRate) {
          if (metrics.heartRate > 100) {
            insights.push(
              "❤️ Your heart rate suggests you've been active - great work!",
            );
          } else if (
            metrics.restingHeartRate &&
            metrics.heartRate < metrics.restingHeartRate + 20
          ) {
            insights.push(
              "🧘 Your heart rate indicates good recovery - perfect for your next workout.",
            );
          }
        }

        // Sleep insights
        if (metrics.sleepHours) {
          if (metrics.sleepHours >= 7) {
            insights.push(
              `😴 Excellent sleep! ${metrics.sleepHours} hours will fuel your fitness goals.`,
            );
          } else if (metrics.sleepHours >= 6) {
            insights.push(
              "💤 Decent sleep, but aim for 7-8 hours for optimal recovery.",
            );
          } else {
            insights.push(
              "⚠️ Low sleep detected. Consider adjusting workout intensity today.",
            );
          }
        }

        // Workout consistency
        if (metrics.recentWorkouts.length >= 3) {
          insights.push(
            "🔥 Amazing consistency! Regular workouts are building your fitness foundation.",
          );
        } else if (metrics.recentWorkouts.length === 0) {
          insights.push(
            "🏃 Ready to start your fitness journey? Your first workout awaits!",
          );
        }

        // Weight tracking
        if (metrics.weight) {
          insights.push(
            "📊 Weight tracking active - consistency is key for accurate progress monitoring.",
          );
        }

        return insights;
      },

      // Advanced Health Features (Roadmap Week 1 implementations)
      // Heart Rate Zone Calculation Methods:
      // 1. Uses actual resting HR from HealthKit/Health Connect if available
      // 2. Falls back to age-based Tanaka formula (208 - 0.7 * age) which is more accurate than 220-age
      // 3. Karvonen formula for zone calculation when resting HR is available
      getHeartRateZones: async (age: number) => {
        try {
          const { metrics, isHealthKitAuthorized, isHealthConnectAuthorized } =
            get();

          // Get resting heart rate from actual health data if available
          let restingHR: number | undefined = metrics.restingHeartRate;

          // If no resting HR stored, try to get latest heart rate as approximation
          // (actual resting HR should be measured at rest, morning preferred)
          if (!restingHR && metrics.heartRate && metrics.heartRate < 80) {
            // Only use current HR if it's in resting range
            restingHR = metrics.heartRate;
          }

          // Calculate max HR using Tanaka formula (more accurate than 220-age)
          // Tanaka et al. (2001): HRmax = 208 - (0.7 × age)
          const maxHR = Math.round(208 - 0.7 * age);

          // Determine calculation method for transparency
          const hasHealthData =
            isHealthKitAuthorized || isHealthConnectAuthorized;
          const calculationMethod = restingHR
            ? "Karvonen (with actual resting HR)"
            : hasHealthData
              ? "Age-based Tanaka formula (no resting HR data yet)"
              : "Age-based Tanaka formula (connect health app for personalized zones)";


          // Calculate zones using Karvonen method if resting HR available
          // Otherwise use percentage of max HR
          const calculateZone = (
            minPct: number,
            maxPct: number,
          ): { min: number; max: number } => {
            if (restingHR) {
              // Karvonen formula: Target HR = ((max HR − resting HR) × %intensity) + resting HR
              const heartRateReserve = maxHR - restingHR;
              return {
                min: Math.round(heartRateReserve * minPct + restingHR),
                max: Math.round(heartRateReserve * maxPct + restingHR),
              };
            } else {
              // Simple percentage of max HR
              return {
                min: Math.round(maxHR * minPct),
                max: Math.round(maxHR * maxPct),
              };
            }
          };

          return {
            restingHR,
            maxHR,
            calculationMethod,
            zones: {
              zone1: {
                ...calculateZone(0.5, 0.6),
                name: "Recovery",
                description: "Light activity, active recovery",
              },
              zone2: {
                ...calculateZone(0.6, 0.7),
                name: "Aerobic Base",
                description: "Fat burning, endurance building",
              },
              zone3: {
                ...calculateZone(0.7, 0.8),
                name: "Aerobic",
                description: "Cardiovascular fitness improvement",
              },
              zone4: {
                ...calculateZone(0.8, 0.9),
                name: "Lactate Threshold",
                description: "Increased speed endurance",
              },
              zone5: {
                ...calculateZone(0.9, 1.0),
                name: "VO2 Max",
                description: "Maximum effort, anaerobic training",
              },
            },
          };
        } catch (error) {
          console.error("❌ Failed to get heart rate zones:", error);
          // Return fallback zones based on Tanaka formula
          const maxHR = Math.round(208 - 0.7 * age);
          return {
            restingHR: undefined,
            maxHR,
            calculationMethod: "Age-based Tanaka formula (fallback)",
            zones: {
              zone1: {
                min: Math.round(maxHR * 0.5),
                max: Math.round(maxHR * 0.6),
                name: "Recovery",
                description: "Light activity, active recovery",
              },
              zone2: {
                min: Math.round(maxHR * 0.6),
                max: Math.round(maxHR * 0.7),
                name: "Aerobic Base",
                description: "Fat burning, endurance building",
              },
              zone3: {
                min: Math.round(maxHR * 0.7),
                max: Math.round(maxHR * 0.8),
                name: "Aerobic",
                description: "Cardiovascular fitness improvement",
              },
              zone4: {
                min: Math.round(maxHR * 0.8),
                max: Math.round(maxHR * 0.9),
                name: "Lactate Threshold",
                description: "Increased speed endurance",
              },
              zone5: {
                min: Math.round(maxHR * 0.9),
                max: maxHR,
                name: "VO2 Max",
                description: "Maximum effort, anaerobic training",
              },
            },
          };
        }
      },

      getSleepRecommendations: async () => {
        try {

          // Try to get recommendations from HealthKit service (iOS)
          const { isHealthKitAuthorized, settings } = get();

          if (isHealthKitAuthorized && settings.dataTypesToSync.sleep) {
            const recommendations =
              await healthKitService.getSleepBasedWorkoutRecommendations();

            // If we got valid sleep data from HealthKit
            if (
              recommendations.sleepQuality !== null &&
              recommendations.sleepDuration !== null
            ) {
              return {
                sleepQuality: recommendations.sleepQuality,
                sleepDuration: recommendations.sleepDuration,
                workoutRecommendations: recommendations.recommendations,
              };
            }
          }

          // Try Health Connect (Android)
          const { isHealthConnectAvailable, isHealthConnectAuthorized } = get();
          if (isHealthConnectAvailable && isHealthConnectAuthorized) {
            const metrics = get().metrics;
            if (metrics.sleepHours && metrics.sleepHours > 0) {
              let sleepQuality: "poor" | "fair" | "good" | "excellent" = "fair";
              if (metrics.sleepHours < 6) sleepQuality = "poor";
              else if (metrics.sleepHours < 7) sleepQuality = "fair";
              else if (metrics.sleepHours < 9) sleepQuality = "good";
              else sleepQuality = "excellent";

              const intensityAdjustment =
                sleepQuality === "poor"
                  ? -2
                  : sleepQuality === "fair"
                    ? -1
                    : sleepQuality === "good"
                      ? 0
                      : 1;
              const workoutType =
                sleepQuality === "poor"
                  ? "recovery"
                  : sleepQuality === "fair"
                    ? "light"
                    : sleepQuality === "good"
                      ? "moderate"
                      : "intense";
              const duration =
                sleepQuality === "poor" || sleepQuality === "fair"
                  ? "shorter"
                  : sleepQuality === "good"
                    ? "normal"
                    : "longer";

              return {
                sleepQuality,
                sleepDuration: metrics.sleepHours,
                workoutRecommendations: {
                  intensityAdjustment,
                  workoutType,
                  duration,
                  notes: [
                    `Sleep quality: ${sleepQuality}`,
                    `${metrics.sleepHours.toFixed(1)} hours of sleep`,
                  ],
                },
              };
            }
          }

          // No sleep data available - return null recommendations (not defaults)
          return {
            sleepQuality: null,
            sleepDuration: null,
            workoutRecommendations: null,
          };
        } catch (error) {
          console.error("❌ Failed to get sleep recommendations:", error);
          return {
            sleepQuality: null,
            sleepDuration: null,
            workoutRecommendations: null,
          };
        }
      },

      getActivityAdjustedCalories: async (baseCalories: number) => {
        try {

          const {
            isHealthKitAuthorized,
            isHealthConnectAuthorized,
            isHealthConnectAvailable,
            metrics,
            settings,
          } = get();

          // Try HealthKit first (iOS) - use workouts setting as proxy for activity tracking
          if (isHealthKitAuthorized && settings.dataTypesToSync.workouts) {
            const result =
              await healthKitService.getActivityAdjustedCalories(baseCalories);

            if (
              result.activityMultiplier !== 1.0 ||
              result.breakdown.activeEnergy > 0
            ) {
              return result;
            }
          }

          // Try Health Connect (Android)
          if (isHealthConnectAvailable && isHealthConnectAuthorized) {
            const activeEnergy = metrics.activeCalories || 0;
            const steps = metrics.steps || 0;

            // Calculate activity multiplier based on active energy and steps
            let activityMultiplier = 1.0;
            if (activeEnergy > 600 || steps > 15000) activityMultiplier = 1.2;
            else if (activeEnergy > 400 || steps > 10000)
              activityMultiplier = 1.15;
            else if (activeEnergy > 200 || steps > 7500)
              activityMultiplier = 1.1;
            else if (activeEnergy > 100 || steps > 5000)
              activityMultiplier = 1.05;
            else if (activeEnergy < 50 && steps < 2000)
              activityMultiplier = 0.95;

            const stepBonus = Math.floor(steps / 1000) * 20; // ~20 cal per 1000 steps
            const exerciseBonus = Math.round(activeEnergy * 0.1); // 10% bonus for activity
            const adjustedCalories = Math.round(
              baseCalories * activityMultiplier,
            );


            // Generate activity recommendations inline (can't use `this` in Zustand)
            const recommendations: string[] = [];
            if (activityMultiplier < 1.0) {
              recommendations.push(
                "Your activity level is below average. Consider adding a short walk or light exercise.",
              );
            }
            if (steps < 5000) {
              recommendations.push(
                `You've taken ${steps.toLocaleString()} steps today. Aim for 7,500-10,000 steps for optimal health.`,
              );
            } else if (steps >= 10000) {
              recommendations.push(
                `Great job! You've hit ${steps.toLocaleString()} steps today.`,
              );
            }
            if (activeEnergy < 200) {
              recommendations.push(
                "Consider adding 20-30 minutes of moderate exercise to boost your active calorie burn.",
              );
            } else if (activeEnergy >= 500) {
              recommendations.push(
                `Excellent activity level! You've burned ${activeEnergy} active calories today.`,
              );
            }
            if (recommendations.length === 0) {
              recommendations.push(
                "You're on track with your activity goals. Keep it up!",
              );
            }

            return {
              adjustedCalories,
              activityMultiplier,
              breakdown: {
                baseCalories,
                activeEnergy,
                exerciseBonus,
                stepBonus,
              },
              recommendations,
            };
          }

          // No activity data available - use base calories with 1.0 multiplier
          return {
            adjustedCalories: baseCalories,
            activityMultiplier: 1.0,
            breakdown: {
              baseCalories,
              activeEnergy: 0,
              exerciseBonus: 0,
              stepBonus: 0,
            },
            recommendations: [
              "Connect to Apple Health or Health Connect to get personalized calorie adjustments based on your activity",
            ],
          };
        } catch (error) {
          console.error("❌ Failed to get activity-adjusted calories:", error);
          return {
            adjustedCalories: baseCalories,
            activityMultiplier: 1.0,
            breakdown: {
              baseCalories,
              activeEnergy: 0,
              exerciseBonus: 0,
              stepBonus: 0,
            },
            recommendations: [
              "Error calculating activity adjustment - using base calories",
            ],
          };
        }
      },

      // Wave 3: Load persisted historical health metrics from Supabase into the
      // store. Read path for historical charts. Failures only log — they never
      // throw into the caller (the UI just shows empty charts on error).
      loadHealthMetricsHistory: async (days: number = 30): Promise<void> => {
        try {
          const result = await healthMetricsDataService.getMultiMetricHistory(
            ALL_METRIC_TYPES,
            days,
          );
          if (result.success) {
            set({ metricsHistory: result.data });
          }
          // On failure the service already logged; leave existing history as-is.
        } catch (e) {
          console.error("[healthDataStore] loadHealthMetricsHistory failed:", e);
        }
      },

      resetHealthData: (): void => {
        // Preserve goal values across resets (they are user-specific, not daily)
        const { stepsGoal, caloriesGoal } = get().metrics;
        set({
          metrics: {
            steps: 0,
            activeCalories: 0,
            recentWorkouts: [],
            stepsGoal,
            caloriesGoal,
            lastUpdated: new Date().toISOString(),
            sources: undefined,
            dataOrigins: undefined,
          },
          // Wave 3: clear persisted history so a new user never sees the
          // previous user's chart data after logout.
          metricsHistory: {},
          syncStatus: "idle",
          lastSyncTime: undefined,
          syncError: undefined,
          healthTipOfDay: undefined,
        });
      },

      // Alias for reset (for consistency with other stores)
      reset: () => {
        get().resetHealthData();
      },
    }),
    {
      name: "fitai-health-data-store",
      storage: createDebouncedStorage(),
      partialize: (state) => ({
        metrics: state.metrics,
        settings: state.settings,
        isHealthKitAuthorized: state.isHealthKitAuthorized,
        isHealthConnectAuthorized: state.isHealthConnectAuthorized, // Persist Health Connect auth
        lastSyncTime: state.lastSyncTime,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!state || error) return;
        // Reset daily metrics if lastSyncTime is from a previous day.
        // Preserve goal values (stepsGoal, caloriesGoal) across daily resets.
        const lastSync = state.lastSyncTime;
        if (lastSync && getLocalDateString(lastSync) !== getLocalDateString()) {
          const { stepsGoal, caloriesGoal } = state.metrics;
          state.metrics = {
            steps: 0,
            activeCalories: 0,
            recentWorkouts: [],
            lastUpdated: new Date().toISOString(),
            stepsGoal,
            caloriesGoal,
          };
        }
      },
    },
  ),
);
