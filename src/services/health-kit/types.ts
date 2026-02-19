export interface HealthKitData {
  steps?: number;
  activeEnergy?: number;
  heartRate?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  sleepHours?: number;
  sleepQuality?: "deep" | "rem" | "light" | "awake";
  bodyWeight?: number;
  workouts?: HealthKitWorkout[];
  distance?: number;
  flightsClimbed?: number;
  standHours?: number;
  exerciseMinutes?: number;
}

export interface HealthKitWorkout {
  id: string;
  activityType: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  energyBurned: number;
  distance?: number;
  heartRate?: number;
  source: string;
}

export interface HealthKitPermissionsStatus {
  granted: boolean;
  permissions?: {
    read: string[];
    write: string[];
  };
}

export interface HealthSyncResult {
  success: boolean;
  data?: HealthKitData;
  error?: string;
  lastSyncTime?: Date;
}

export interface WorkoutInput {
  type: string;
  duration: number;
  calories: number;
  distance?: number;
  heartRate?: number;
}

export interface WorkoutExportInput {
  type: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calories: number;
  distance?: number;
}

export interface NutritionExportInput {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water?: number;
  date: Date;
}
