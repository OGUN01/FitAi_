// Type definitions for unified wearables manager

export interface UnifiedHealthData {
  steps: number;
  calories: number;
  distance: number; // in km
  heartRate?: number;
  weight?: number;
  sleepHours?: number;
  workouts: Array<{
    id: string;
    type: string;
    name: string;
    duration: number;
    calories: number;
    date: string;
    source: string;
  }>;
  lastSyncDate: string;
  platform: "ios" | "android" | "web";
}

export interface UnifiedHeartRateZones {
  restingHR?: number;
  maxHR: number;
  zones: {
    zone1: { min: number; max: number; name: string }; // Recovery
    zone2: { min: number; max: number; name: string }; // Aerobic Base
    zone3: { min: number; max: number; name: string }; // Aerobic
    zone4: { min: number; max: number; name: string }; // Lactate Threshold
    zone5: { min: number; max: number; name: string }; // VO2 Max
  };
}

export interface UnifiedSleepRecommendations {
  sleepQuality: "poor" | "fair" | "good" | "excellent";
  sleepDuration: number;
  recommendations: {
    intensityAdjustment: number; // -2 to +2 scale
    workoutType: "recovery" | "light" | "moderate" | "intense";
    duration: "shorter" | "normal" | "longer";
    notes: string[];
  };
}

export interface UnifiedActivityAdjustedCalories {
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

export interface UnifiedDetectedActivities {
  detectedActivities: Array<{
    type: string;
    confidence: number;
    duration: number;
    startTime: string;
    endTime: string;
  }>;
  autoLoggedCount: number;
}

export interface WearableIntegrationStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  platform: "ios" | "android" | "web";
  serviceName: string;
  supportedFeatures: string[];
  lastSync?: string;
}

export interface WearableExportData {
  type: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calories: number;
  distance?: number;
}

export interface NutritionExportData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water?: number;
  date: Date;
}

export type PlatformType = "ios" | "android" | "web";
