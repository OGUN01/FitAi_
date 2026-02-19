import {
  FitnessMetrics,
  WorkoutFrequencyData,
  WeightProgressData,
  SleepPatternData,
  PerformanceScoreData,
  CaloriesBurnedData,
  WaterIntakeData,
  ChartData,
} from "./types";
import { getHydrationGoal, getHealthMetrics } from "./lazyImports";

export const getWorkoutFrequencyData = (
  metricsHistory: FitnessMetrics[],
  days: number,
): WorkoutFrequencyData[] => {
  return metricsHistory
    .slice(0, days)
    .map((m) => ({
      date: m.date,
      count: m.workoutCount,
    }))
    .reverse();
};

export const getWeightProgressData = (
  metricsHistory: FitnessMetrics[],
  days: number,
): WeightProgressData[] => {
  return metricsHistory
    .slice(0, days)
    .filter((m) => m.weight !== undefined)
    .map((m) => ({
      date: m.date,
      weight: m.weight!,
    }))
    .reverse();
};

export const getSleepPatternData = (
  metricsHistory: FitnessMetrics[],
  days: number,
): SleepPatternData[] => {
  return metricsHistory
    .slice(0, days)
    .map((m) => ({
      date: m.date,
      hours: m.sleepHours,
      quality: m.sleepQuality,
    }))
    .reverse();
};

export const getPerformanceScoreData = (
  metricsHistory: FitnessMetrics[],
  days: number,
): PerformanceScoreData[] => {
  return metricsHistory
    .slice(0, days)
    .map((m) => {
      let score = 50;

      score += Math.min(30, m.workoutCount * 10);

      const sleepOptimal = 8;
      const sleepScore = Math.max(
        0,
        25 - Math.abs(m.sleepHours - sleepOptimal) * 5,
      );
      score += sleepScore;

      const waterGoalML = getHydrationGoal();
      if (waterGoalML && m.waterIntake) {
        const waterScore = Math.min(
          15,
          (m.waterIntake / (waterGoalML / 1000)) * 15,
        );
        score += waterScore;
      }

      const healthMetrics = getHealthMetrics();
      if (healthMetrics?.stepsGoal && m.steps) {
        const stepsScore = Math.min(
          15,
          (m.steps / healthMetrics.stepsGoal) * 15,
        );
        score += stepsScore;
      }

      if (m.mood && m.energyLevel) {
        score += ((m.mood + m.energyLevel) / 2 - 5) * 3;
      }

      return {
        date: m.date,
        score: Math.round(Math.min(100, Math.max(0, score))),
      };
    })
    .reverse();
};

export const generateChartData = (
  metricsHistory: FitnessMetrics[],
  getWorkoutFrequency: (days: number) => WorkoutFrequencyData[],
  getWeightProgress: (days: number) => WeightProgressData[],
  getSleepPattern: (days: number) => SleepPatternData[],
  getPerformanceScore: (days: number) => PerformanceScoreData[],
): ChartData => {
  if (metricsHistory.length === 0) {
    return {
      workoutFrequency: [],
      weightProgress: [],
      sleepPattern: [],
      caloriesBurned: [],
      waterIntake: [],
      performanceScore: [],
    };
  }

  return {
    workoutFrequency: getWorkoutFrequency(30),
    weightProgress: getWeightProgress(90),
    sleepPattern: getSleepPattern(30),
    caloriesBurned: metricsHistory
      .slice(0, 30)
      .map((m) => ({
        date: m.date,
        calories: m.caloriesBurned,
      }))
      .reverse(),
    waterIntake: metricsHistory
      .slice(0, 30)
      .map((m) => ({
        date: m.date,
        milliliters: m.waterIntake,
      }))
      .reverse(),
    performanceScore: getPerformanceScore(30),
  };
};
