import DataRetrievalService from "../../services/dataRetrieval";
import { Period, Stats, Achievement, WeeklyDataPoint } from "./types";

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

export const computeAchievements = (weeklyProgress: any): Achievement[] => [
  {
    id: "first-workout",
    title: "First Workout",
    description: "Complete your first workout",
    iconName: "barbell-outline",
    date: weeklyProgress?.workoutsCompleted > 0 ? "Completed" : "Not yet",
    completed: weeklyProgress?.workoutsCompleted > 0,
    category: "Milestone",
    points: 25,
    rarity: "common",
  },
  {
    id: "first-meal",
    title: "First Meal",
    description: "Complete your first meal",
    iconName: "restaurant-outline",
    date: weeklyProgress?.mealsCompleted > 0 ? "Completed" : "Not yet",
    completed: weeklyProgress?.mealsCompleted > 0,
    category: "Nutrition",
    points: 15,
    rarity: "common",
  },
  {
    id: "meal-streak",
    title: "Meal Master",
    description: "Complete 5 meals in a row",
    iconName: "nutrition-outline",
    date: weeklyProgress?.mealsCompleted >= 5 ? "Completed" : "Not yet",
    completed: weeklyProgress?.mealsCompleted >= 5,
    category: "Nutrition",
    points: 50,
    rarity: "uncommon",
    progress: weeklyProgress?.mealsCompleted,
    target: 5,
  },
  {
    id: "nutrition-week",
    title: "Nutrition Week",
    description: "Complete 21 meals (full week)",
    iconName: "star-outline",
    date: weeklyProgress?.mealsCompleted >= 21 ? "Completed" : "Not yet",
    completed: weeklyProgress?.mealsCompleted >= 21,
    category: "Nutrition",
    points: 100,
    rarity: "rare",
    progress: weeklyProgress?.mealsCompleted,
    target: 21,
  },
  {
    id: "week-streak",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    iconName: "flame-outline",
    date: weeklyProgress?.streak >= 7 ? "Completed" : "Not yet",
    completed: weeklyProgress?.streak >= 7,
    category: "Consistency",
    points: 100,
    rarity: "uncommon",
    progress: weeklyProgress?.streak,
    target: 7,
  },
  {
    id: "calorie-crusher",
    title: "Calorie Crusher",
    description: "Burn 1000+ calories in workouts",
    iconName: "flame-outline",
    date:
      DataRetrievalService.getTotalCaloriesBurned() >= 1000
        ? "Completed"
        : "Not yet",
    completed: DataRetrievalService.getTotalCaloriesBurned() >= 1000,
    category: "Fitness",
    points: 150,
    rarity: "rare",
    progress: DataRetrievalService.getTotalCaloriesBurned(),
    target: 1000,
  },
];

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
