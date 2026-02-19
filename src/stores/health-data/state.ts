import type { HealthMetrics, HealthIntegrationSettings } from "./types";

export const initialMetrics: HealthMetrics = {
  steps: 0,
  activeCalories: 0,
  recentWorkouts: [],
  lastUpdated: new Date().toISOString(),
};

export const initialSettings: HealthIntegrationSettings = {
  healthKitEnabled: true,
  healthConnectEnabled: true,
  autoSyncEnabled: true,
  syncFrequency: "hourly",
  dataTypesToSync: {
    steps: true,
    heartRate: true,
    workouts: true,
    sleep: true,
    weight: true,
    nutrition: false,
    hrv: true,
    spo2: true,
    bodyFat: true,
  },
  exportToHealthKit: true,
  backgroundSyncEnabled: true,
  preferredProvider: "healthconnect",
};

export const initialState = {
  metrics: initialMetrics,
  isHealthKitAvailable: false,
  isHealthKitAuthorized: false,
  isHealthConnectAvailable: false,
  isHealthConnectAuthorized: false,
  syncStatus: "idle" as const,
  settings: initialSettings,
  showingHealthDashboard: false,
};
