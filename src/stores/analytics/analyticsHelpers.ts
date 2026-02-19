import { FitnessMetrics, TimePeriod, ComprehensiveAnalytics } from "./types";
import { getPersonalizedRecommendation } from "./insightsSelectors";

export interface TrackWorkoutData {
  date: string;
  duration: number;
  caloriesBurned: number;
  type: string;
  heartRate?: number;
}

export interface TrackWellnessData {
  date: string;
  sleepHours: number;
  sleepQuality?: number;
  mood?: number;
  energyLevel?: number;
  stressLevel?: number;
  waterIntake: number;
}

export interface TrackBodyData {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
}

export const createTrackWorkoutCompleted =
  (
    getState: () => {
      metricsHistory: FitnessMetrics[];
      addDailyMetrics: (metrics: FitnessMetrics) => Promise<void>;
    },
  ) =>
  async (workoutData: TrackWorkoutData) => {
    const store = getState();

    const existingMetrics = store.metricsHistory.find(
      (m) => m.date === workoutData.date,
    );

    const updatedMetrics: FitnessMetrics = {
      ...existingMetrics,
      date: workoutData.date,
      workoutCount: (existingMetrics?.workoutCount || 0) + 1,
      totalWorkoutTime:
        (existingMetrics?.totalWorkoutTime || 0) + workoutData.duration,
      caloriesBurned:
        (existingMetrics?.caloriesBurned || 0) + workoutData.caloriesBurned,
      averageHeartRate:
        workoutData.heartRate || existingMetrics?.averageHeartRate,
      steps: existingMetrics?.steps || 0,
      distance: existingMetrics?.distance || 0,
      activeMinutes:
        (existingMetrics?.activeMinutes || 0) + workoutData.duration,
      sleepHours: existingMetrics?.sleepHours as number,
      waterIntake: existingMetrics?.waterIntake as number,
    };

    await store.addDailyMetrics(updatedMetrics);
  };

export const createTrackWellnessMetrics =
  (
    getState: () => {
      metricsHistory: FitnessMetrics[];
      addDailyMetrics: (metrics: FitnessMetrics) => Promise<void>;
    },
  ) =>
  async (wellnessData: TrackWellnessData) => {
    const store = getState();

    const existingMetrics = store.metricsHistory.find(
      (m) => m.date === wellnessData.date,
    );

    const updatedMetrics: FitnessMetrics = {
      ...existingMetrics,
      date: wellnessData.date,
      sleepHours: wellnessData.sleepHours,
      sleepQuality: wellnessData.sleepQuality,
      mood: wellnessData.mood,
      energyLevel: wellnessData.energyLevel,
      stressLevel: wellnessData.stressLevel,
      waterIntake: wellnessData.waterIntake,
      workoutCount: existingMetrics?.workoutCount || 0,
      totalWorkoutTime: existingMetrics?.totalWorkoutTime || 0,
      caloriesBurned: existingMetrics?.caloriesBurned || 0,
      steps: existingMetrics?.steps || 0,
      distance: existingMetrics?.distance || 0,
      activeMinutes: existingMetrics?.activeMinutes || 0,
    };

    await store.addDailyMetrics(updatedMetrics);
  };

export const createTrackBodyComposition =
  (
    getState: () => {
      metricsHistory: FitnessMetrics[];
      addDailyMetrics: (metrics: FitnessMetrics) => Promise<void>;
    },
  ) =>
  async (bodyData: TrackBodyData) => {
    const store = getState();

    const existingMetrics = store.metricsHistory.find(
      (m) => m.date === bodyData.date,
    );

    const updatedMetrics: FitnessMetrics = {
      ...existingMetrics,
      date: bodyData.date,
      weight: bodyData.weight,
      bodyFat: bodyData.bodyFat,
      muscleMass: bodyData.muscleMass,
      workoutCount: existingMetrics?.workoutCount || 0,
      totalWorkoutTime: existingMetrics?.totalWorkoutTime || 0,
      caloriesBurned: existingMetrics?.caloriesBurned || 0,
      steps: existingMetrics?.steps || 0,
      distance: existingMetrics?.distance || 0,
      activeMinutes: existingMetrics?.activeMinutes || 0,
      sleepHours: (existingMetrics?.sleepHours || 0) as number,
      waterIntake: (existingMetrics?.waterIntake || 0) as number,
    };

    await store.addDailyMetrics(updatedMetrics);
  };

export const createGetAnalyticsForPeriod =
  (
    getState: () => {
      generateAnalytics: (period: TimePeriod) => Promise<void>;
      currentAnalytics: ComprehensiveAnalytics | null;
    },
  ) =>
  async (period: TimePeriod) => {
    const store = getState();
    await store.generateAnalytics(period);
    return store.currentAnalytics;
  };

export const createGetPersonalizedRecommendation =
  (getState: () => { currentAnalytics: ComprehensiveAnalytics | null }) =>
  (): string => {
    const store = getState();
    return getPersonalizedRecommendation(store.currentAnalytics);
  };
