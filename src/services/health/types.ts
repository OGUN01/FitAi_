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

export const HealthConnectExerciseType = {
  UNKNOWN: 0,
  BADMINTON: 2,
  BASEBALL: 4,
  BASKETBALL: 5,
  BIKING: 8,
  BIKING_STATIONARY: 9,
  BOOT_CAMP: 10,
  BOXING: 11,
  CALISTHENICS: 13,
  CRICKET: 14,
  DANCING: 16,
  ELLIPTICAL: 25,
  EXERCISE_CLASS: 26,
  FENCING: 27,
  FOOTBALL_AMERICAN: 28,
  FOOTBALL_AUSTRALIAN: 29,
  FRISBEE_DISC: 31,
  GOLF: 32,
  GUIDED_BREATHING: 33,
  GYMNASTICS: 34,
  HANDBALL: 35,
  HIGH_INTENSITY_INTERVAL_TRAINING: 36,
  HIKING: 37,
  ICE_HOCKEY: 38,
  ICE_SKATING: 39,
  MARTIAL_ARTS: 44,
  PADDLING: 46,
  PARAGLIDING: 47,
  PILATES: 48,
  RACQUETBALL: 50,
  ROCK_CLIMBING: 51,
  ROLLER_HOCKEY: 52,
  ROWING: 53,
  ROWING_MACHINE: 54,
  RUGBY: 55,
  RUNNING: 56,
  RUNNING_TREADMILL: 57,
  SAILING: 58,
  SCUBA_DIVING: 59,
  SKATING: 60,
  SKIING: 61,
  SNOWBOARDING: 62,
  SNOWSHOEING: 63,
  SOCCER: 64,
  SOFTBALL: 65,
  SQUASH: 66,
  STAIR_CLIMBING: 68,
  STAIR_CLIMBING_MACHINE: 69,
  STRENGTH_TRAINING: 70,
  STRETCHING: 71,
  SURFING: 72,
  SWIMMING_OPEN_WATER: 73,
  SWIMMING_POOL: 74,
  TABLE_TENNIS: 75,
  TENNIS: 76,
  VOLLEYBALL: 78,
  WALKING: 79,
  WATER_POLO: 80,
  WEIGHTLIFTING: 81,
  WHEELCHAIR: 82,
  YOGA: 83,
} as const;

export type HealthConnectExerciseTypeValue =
  (typeof HealthConnectExerciseType)[keyof typeof HealthConnectExerciseType];

export function mapWorkoutTypeToHealthConnect(workoutType: string): number {
  const typeMap: Record<string, number> = {
    running: HealthConnectExerciseType.RUNNING,
    run: HealthConnectExerciseType.RUNNING,
    treadmill: HealthConnectExerciseType.RUNNING_TREADMILL,
    walking: HealthConnectExerciseType.WALKING,
    walk: HealthConnectExerciseType.WALKING,
    cycling: HealthConnectExerciseType.BIKING,
    biking: HealthConnectExerciseType.BIKING,
    bike: HealthConnectExerciseType.BIKING,
    stationary_bike: HealthConnectExerciseType.BIKING_STATIONARY,
    swimming: HealthConnectExerciseType.SWIMMING_POOL,
    swim: HealthConnectExerciseType.SWIMMING_POOL,
    strength: HealthConnectExerciseType.STRENGTH_TRAINING,
    strength_training: HealthConnectExerciseType.STRENGTH_TRAINING,
    weight_training: HealthConnectExerciseType.WEIGHTLIFTING,
    weightlifting: HealthConnectExerciseType.WEIGHTLIFTING,
    weights: HealthConnectExerciseType.WEIGHTLIFTING,
    yoga: HealthConnectExerciseType.YOGA,
    pilates: HealthConnectExerciseType.PILATES,
    stretching: HealthConnectExerciseType.STRETCHING,
    hiit: HealthConnectExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING,
    high_intensity: HealthConnectExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING,
    circuit: HealthConnectExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING,
    boxing: HealthConnectExerciseType.BOXING,
    martial_arts: HealthConnectExerciseType.MARTIAL_ARTS,
    kickboxing: HealthConnectExerciseType.MARTIAL_ARTS,
    rowing: HealthConnectExerciseType.ROWING,
    rowing_machine: HealthConnectExerciseType.ROWING_MACHINE,
    elliptical: HealthConnectExerciseType.ELLIPTICAL,
    stair_climber: HealthConnectExerciseType.STAIR_CLIMBING_MACHINE,
    stairs: HealthConnectExerciseType.STAIR_CLIMBING,
    hiking: HealthConnectExerciseType.HIKING,
    hike: HealthConnectExerciseType.HIKING,
    rock_climbing: HealthConnectExerciseType.ROCK_CLIMBING,
    climbing: HealthConnectExerciseType.ROCK_CLIMBING,
    dancing: HealthConnectExerciseType.DANCING,
    dance: HealthConnectExerciseType.DANCING,
    aerobics: HealthConnectExerciseType.EXERCISE_CLASS,
    class: HealthConnectExerciseType.EXERCISE_CLASS,
    bootcamp: HealthConnectExerciseType.BOOT_CAMP,
    boot_camp: HealthConnectExerciseType.BOOT_CAMP,
    calisthenics: HealthConnectExerciseType.CALISTHENICS,
    bodyweight: HealthConnectExerciseType.CALISTHENICS,
    tennis: HealthConnectExerciseType.TENNIS,
    basketball: HealthConnectExerciseType.BASKETBALL,
    soccer: HealthConnectExerciseType.SOCCER,
    football: HealthConnectExerciseType.SOCCER,
    volleyball: HealthConnectExerciseType.VOLLEYBALL,
    golf: HealthConnectExerciseType.GOLF,
    skiing: HealthConnectExerciseType.SKIING,
    snowboarding: HealthConnectExerciseType.SNOWBOARDING,
    surfing: HealthConnectExerciseType.SURFING,
  };

  const normalized = workoutType.toLowerCase().replace(/[\s-]/g, "_");
  return typeMap[normalized] ?? HealthConnectExerciseType.UNKNOWN;
}
