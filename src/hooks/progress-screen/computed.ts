import { Period, Stats, WeeklyDataPoint } from "./types";

export const getPeriods = (): Period[] => [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export const computeStats = (
  progressStats: any,
  calculatedMetrics: any,
  progressGoals: any,
): Stats => {
  if (progressStats) {
    return {
      weight: {
        current: progressStats.weightChange.current,
        change: progressStats.weightChange.change,
        unit: "kg",
        goal: calculatedMetrics?.targetWeightKg,
        trend:
          progressStats.weightChange.change < 0
            ? "decreasing"
            : progressStats.weightChange.change > 0
              ? "increasing"
              : "stable",
        weeklyAvg: progressStats.weightChange.current,
      },
      bodyFat: {
        current: progressStats.bodyFatChange.current,
        change: progressStats.bodyFatChange.change,
        unit: "%",
        goal: calculatedMetrics?.ideal_body_fat_max,
        trend:
          progressStats.bodyFatChange.change < 0
            ? "decreasing"
            : progressStats.bodyFatChange.change > 0
              ? "increasing"
              : "stable",
        weeklyAvg: progressStats.bodyFatChange.current,
      },
      muscle: {
        current: progressStats.muscleChange.current,
        change: progressStats.muscleChange.change,
        unit: "kg",
        goal: progressGoals?.target_muscle_mass_kg ?? null,
        trend:
          progressStats.muscleChange.change < 0
            ? "decreasing"
            : progressStats.muscleChange.change > 0
              ? "increasing"
              : "stable",
        weeklyAvg: progressStats.muscleChange.current,
      },
      bmi: {
        current: calculatedMetrics?.calculatedBMI || null,
        change: null,
        unit: "",
        goal: null,
        trend: "stable",
        weeklyAvg: calculatedMetrics?.calculatedBMI || null,
      },
    };
  }

  return {
    weight: {
      current: null,
      change: null,
      unit: "kg",
      goal: calculatedMetrics?.targetWeightKg,
      trend: "stable",
      weeklyAvg: null,
    },
    bodyFat: {
      current: null,
      change: null,
      unit: "%",
      goal: null,
      trend: "stable",
      weeklyAvg: null,
    },
    muscle: {
      current: null,
      change: null,
      unit: "kg",
      goal: null,
      trend: "stable",
      weeklyAvg: null,
    },
    bmi: {
      current: calculatedMetrics?.calculatedBMI || null,
      change: null,
      unit: "",
      goal: null,
      trend: "stable",
      weeklyAvg: null,
    },
  };
};

// Achievement definitions live in useProgressScreen.ts (uses live todaysData + weeklyProgress).
// computeAchievements was removed to maintain a single source of truth.

export const getWeeklyData = (
  realWeeklyData: WeeklyDataPoint[],
): WeeklyDataPoint[] => {
  if (realWeeklyData.length > 0) {
    return realWeeklyData;
  }

  return [
    { day: "Mon", workouts: 0, meals: 0, calories: 0, duration: 0 },
    { day: "Tue", workouts: 0, meals: 0, calories: 0, duration: 0 },
    { day: "Wed", workouts: 0, meals: 0, calories: 0, duration: 0 },
    { day: "Thu", workouts: 0, meals: 0, calories: 0, duration: 0 },
    { day: "Fri", workouts: 0, meals: 0, calories: 0, duration: 0 },
    { day: "Sat", workouts: 0, meals: 0, calories: 0, duration: 0 },
    { day: "Sun", workouts: 0, meals: 0, calories: 0, duration: 0 },
  ];
};
