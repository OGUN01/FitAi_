export interface DataSource {
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  accuracy: number;
  icon: string;
  deviceType: "medical" | "watch" | "band" | "phone" | "scale" | "unknown";
}

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
  distance?: number;
  duration: number;
}

export interface HealthConnectData {
  steps?: number;
  heartRate?: number;
  activeCalories?: number;
  totalCalories?: number;
  distance?: number;
  weight?: number;
  sleep?: SleepData[];
  exerciseSessions?: ExerciseSessionData[];
  lastSyncDate?: string;
  activeMinutes?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  oxygenSaturation?: number;
  bodyFat?: number;
  muscleMass?: number;
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
  dataOrigins?: string[];
  metadata?: {
    isPartial?: boolean;
    failedMetrics?: string[];
    isFallback?: boolean;
    estimatedMetrics?: string[];
  };
}

export interface SleepData {
  startTime: string;
  endTime: string;
  duration: number;
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
  partial?: boolean;
}

export type PermissionType = {
  accessType: "read" | "write";
  recordType: string;
};
