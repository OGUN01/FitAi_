// Google Fit Type Definitions

export interface GoogleFitData {
  steps?: number;
  calories?: number;
  distance?: number; // in meters
  heartRate?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  weight?: number; // in kg
  workouts?: GoogleFitWorkout[];
  sleepData?: GoogleFitSleep[];
  lastSyncDate?: string;
  // Advanced metrics for roadmap requirements
  activeMinutes?: number;
  sedentaryMinutes?: number;
  oxygenSaturation?: number;
  stressLevel?: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface GoogleFitWorkout {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number; // in minutes
  calories: number;
  distance?: number;
}

export interface GoogleFitSleep {
  startDate: string;
  endDate: string;
  duration: number; // in minutes
}

export interface GoogleFitSyncResult {
  success: boolean;
  data?: GoogleFitData;
  error?: string;
  syncTime?: number;
}

export interface HeartRateZones {
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

export interface SleepRecommendations {
  sleepQuality: "poor" | "fair" | "good" | "excellent";
  sleepDuration: number;
  recommendations: {
    intensityAdjustment: number; // -2 to +2 scale
    workoutType: "recovery" | "light" | "moderate" | "intense";
    duration: "shorter" | "normal" | "longer";
    notes: string[];
  };
}

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

export interface DetectedActivity {
  type: string;
  confidence: number;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface ActivityDetectionResult {
  detectedActivities: DetectedActivity[];
  autoLoggedCount: number;
}

export interface HealthSummary {
  dailySteps: number;
  dailyCalories: number;
  dailyDistance: number;
  lastWeight?: number;
  heartRate?: number;
  recentWorkouts: number;
  syncStatus: "synced" | "needs_sync" | "never_synced";
}

export interface WorkoutExportData {
  type: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calories: number;
  distance?: number;
}

export interface NutritionExportData {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  date: Date;
}
