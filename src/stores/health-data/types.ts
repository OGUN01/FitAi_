// Types and interfaces for Health Data Store
// Re-exports types from health services and defines store-specific types

import type { HealthKitData, HealthSyncResult } from "../../services/healthKit";
import type {
  GoogleFitData,
  GoogleFitSyncResult,
} from "../../services/googleFit";
import type {
  HealthConnectData,
  HealthConnectSyncResult,
  MetricSource,
  DataSource,
} from "../../services/healthConnect";

// Re-export service types for UI components
export type { MetricSource, DataSource };
export type { HealthKitData, HealthSyncResult };
export type { GoogleFitData, GoogleFitSyncResult };
export type { HealthConnectData, HealthConnectSyncResult };

// Health Metrics Interface
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
    source: "FitAI" | "HealthKit" | "Manual" | "GoogleFit";
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
  };

  // All data origins that contributed to current metrics
  dataOrigins?: string[];
}

// Health Integration Settings
export interface HealthIntegrationSettings {
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
  preferredProvider: "healthkit" | "googlefit" | "healthconnect"; // User's preferred health data provider
}

// Heart Rate Zone Calculation Result
export interface HeartRateZones {
  restingHR?: number;
  maxHR: number;
  calculationMethod?: string;
  zones: Record<
    string,
    { min: number; max: number; name: string; description?: string }
  >;
}

// Sleep Recommendations Result
export interface SleepRecommendations {
  sleepQuality: string | null;
  sleepDuration: number | null;
  workoutRecommendations: {
    intensityAdjustment: number;
    workoutType: string;
    duration: string;
    notes: string[];
  } | null;
}

// Activity Adjusted Calories Result
export interface ActivityAdjustedCalories {
  adjustedCalories: number;
  activityMultiplier: number;
  breakdown: {
    baseCalories: number;
    activeEnergy: number;
    exerciseBonus: number;
    stepBonus: number;
  };
  recommendations: string[];
}

// Workout Export Data
export interface WorkoutExport {
  type: string;
  startDate: Date;
  endDate: Date;
  calories: number;
  distance?: number;
}

// Nutrition Export Data
export interface NutritionExport {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water?: number;
  date: Date;
}

// Google Fit Heart Rate Zones Result
export interface GoogleFitHeartRateZones {
  maxHR: number;
  zones: Record<string, { min: number; max: number; name: string }>;
}

// Detected Activities Result
export interface DetectedActivities {
  detectedActivities: any[];
  autoLoggedCount: number;
}

// Health Data State Interface
export interface HealthDataState {
  // Current Health Data
  metrics: HealthMetrics;

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

  // Actions - HealthKit
  initializeHealthKit: () => Promise<boolean>;
  requestHealthKitPermissions: () => Promise<boolean>;
  syncHealthData: (force?: boolean) => Promise<void>;
  exportWorkoutToHealthKit: (workout: WorkoutExport) => Promise<boolean>;
  exportNutritionToHealthKit: (nutrition: NutritionExport) => Promise<boolean>;

  // Actions - Health Connect
  initializeHealthConnect: () => Promise<boolean>;
  requestHealthConnectPermissions: () => Promise<boolean>;
  reauthorizeHealthConnect: () => Promise<boolean>;
  syncFromHealthConnect: (
    daysBack?: number,
  ) => Promise<HealthConnectSyncResult>;

  // Actions - Google Fit
  initializeGoogleFit: () => Promise<boolean>;
  syncFromGoogleFit: (daysBack?: number) => Promise<GoogleFitSyncResult>;
  getGoogleFitHeartRateZones: (age: number) => Promise<GoogleFitHeartRateZones>;
  getGoogleFitSleepRecommendations: () => Promise<SleepRecommendations>;
  getGoogleFitActivityAdjustedCalories: (
    baseCalories: number,
  ) => Promise<ActivityAdjustedCalories>;
  detectAndLogGoogleFitActivities: () => Promise<DetectedActivities>;

  // Actions - Advanced Features
  getHeartRateZones: (age: number) => Promise<HeartRateZones>;
  getSleepRecommendations: () => Promise<SleepRecommendations>;
  getActivityAdjustedCalories: (
    baseCalories: number,
  ) => Promise<ActivityAdjustedCalories>;

  // Actions - Step Goal
  setStepsGoal: (goal: number) => void;

  // Actions - General
  updateHealthMetrics: (metrics: Partial<HealthMetrics>) => void;
  updateSettings: (settings: Partial<HealthIntegrationSettings>) => void;
  setShowHealthDashboard: (show: boolean) => void;
  getHealthInsights: () => string[];
  resetHealthData: () => void;
  reset: () => void; // Alias for resetHealthData
}
