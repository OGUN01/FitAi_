// Achievement Catalog — THE single source of truth for all FitAI achievement definitions.
//
// IMPORTANT: achievement.icon is rendered as <Text> by AchievementCard /
// AchievementDetailModal / AchievementCelebration. It must be an EMOJI, not an
// Ionicons glyph name (matching the existing UI contract).
//
// achievement.requirements is an array of AchievementRequirement. The engine
// evaluates EACH requirement against the activityData field that matches its
// `type` (see TYPE_TO_FIELD map in achievementEngine.ts). An achievement unlocks
// only when ALL requirements are met.
//
// Thresholds are real, sensible milestones — no fake data, no hardcoded user IDs.

import type { Achievement } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  // ──────────────────────────────────────────────────────────────────────
  // FITNESS — workout count, variety, time-of-day, intensity
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "first-workout",
    title: "First Steps",
    description: "Complete your very first workout. Every journey starts here.",
    category: "fitness",
    tier: "bronze",
    icon: "👟",
    color: "#CD7F32",
    requirements: [{ type: "workout_count", target: 1, timeframe: "all_time" }],
    reward: {
      type: "fitcoins",
      value: 50,
      description: "50 FitCoins for taking the first step",
    },
  },
  {
    id: "workout-10",
    title: "Getting Started",
    description: "Complete 10 workouts. The habit is forming.",
    category: "fitness",
    tier: "bronze",
    icon: "🔥",
    color: "#CD7F32",
    requirements: [{ type: "workout_count", target: 10, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
  },
  {
    id: "workout-50",
    title: "Half Centurion",
    description: "Complete 50 workouts. You're in the top tier of consistency.",
    category: "fitness",
    tier: "silver",
    icon: "💪",
    color: "#C0C0C0",
    requirements: [{ type: "workout_count", target: 50, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 500, description: "500 FitCoins" },
  },
  {
    id: "workout-100",
    title: "Centurion",
    description: "Complete 100 workouts. A true FitAI legend.",
    category: "fitness",
    tier: "gold",
    icon: "🏆",
    color: "#FFD700",
    requirements: [{ type: "workout_count", target: 100, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 1000, description: "1000 FitCoins" },
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Complete a workout before 8 AM. Seize the morning.",
    category: "fitness",
    tier: "bronze",
    icon: "🌅",
    color: "#CD7F32",
    requirements: [
      { type: "custom", target: 1, metadata: { field: "workoutsBefore8am" } },
    ],
    reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
  },
  {
    id: "dawn-raider",
    title: "Dawn Raider",
    description: "Complete a workout before 6 AM. True dedication.",
    category: "fitness",
    tier: "silver",
    icon: "☄️",
    color: "#C0C0C0",
    requirements: [
      { type: "custom", target: 1, metadata: { field: "workoutsBefore6am" } },
    ],
    reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Complete a workout after 10 PM. No excuses, no off-hours.",
    category: "fitness",
    tier: "bronze",
    icon: "🦉",
    color: "#CD7F32",
    requirements: [
      { type: "custom", target: 1, metadata: { field: "workoutsAfter10pm" } },
    ],
    reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
  },
  {
    id: "weekend-warrior",
    title: "Weekend Warrior",
    description: "Complete 5 workouts on weekends. When others rest, you grind.",
    category: "fitness",
    tier: "silver",
    icon: "⚔️",
    color: "#C0C0C0",
    requirements: [
      { type: "custom", target: 5, metadata: { field: "weekendWorkouts" } },
    ],
    reward: { type: "fitcoins", value: 200, description: "200 FitCoins" },
  },
  {
    id: "workout-explorer",
    title: "Workout Explorer",
    description: "Try 3 different workout types. Variety builds balanced fitness.",
    category: "exploration",
    tier: "bronze",
    icon: "🧭",
    color: "#CD7F32",
    requirements: [
      { type: "custom", target: 3, metadata: { field: "uniqueWorkoutTypes" } },
    ],
    reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
  },
  {
    id: "endurance-builder",
    title: "Endurance Builder",
    description: "Complete 10 workouts longer than 60 minutes. Go the distance.",
    category: "fitness",
    tier: "silver",
    icon: "⏱️",
    color: "#C0C0C0",
    requirements: [
      { type: "custom", target: 10, metadata: { field: "longWorkouts" } },
    ],
    reward: { type: "fitcoins", value: 250, description: "250 FitCoins" },
  },
  {
    id: "calorie-crusher",
    title: "Calorie Crusher",
    description: "Burn 5,000 total calories across all workouts.",
    category: "fitness",
    tier: "silver",
    icon: "⚡",
    color: "#C0C0C0",
    requirements: [
      { type: "calories_burned", target: 5000, timeframe: "all_time" },
    ],
    reward: { type: "fitcoins", value: 300, description: "300 FitCoins" },
  },
  {
    id: "calorie-inferno",
    title: "Calorie Inferno",
    description: "Burn 25,000 total calories. You are a furnace.",
    category: "fitness",
    tier: "gold",
    icon: "🌋",
    color: "#FFD700",
    requirements: [
      { type: "calories_burned", target: 25000, timeframe: "all_time" },
    ],
    reward: { type: "fitcoins", value: 750, description: "750 FitCoins" },
  },

  // ──────────────────────────────────────────────────────────────────────
  // STREAKS — login + workout consistency
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "streak-3",
    title: "Three's A Habit",
    description: "Maintain a 3-day workout streak. Momentum is building.",
    category: "streak",
    tier: "bronze",
    icon: "🔥",
    color: "#CD7F32",
    requirements: [{ type: "consistency_days", target: 3, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Maintain a 7-day workout streak. A full week of wins.",
    category: "streak",
    tier: "silver",
    icon: "📅",
    color: "#C0C0C0",
    requirements: [{ type: "consistency_days", target: 7, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 200, description: "200 FitCoins" },
  },
  {
    id: "streak-14",
    title: "Fortnight Force",
    description: "Maintain a 14-day workout streak. Two weeks unbroken.",
    category: "streak",
    tier: "gold",
    icon: "🗓️",
    color: "#FFD700",
    requirements: [{ type: "consistency_days", target: 14, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 400, description: "400 FitCoins" },
  },
  {
    id: "streak-30",
    title: "Unbreakable",
    description: "Maintain a 30-day workout streak. Discipline personified.",
    category: "streak",
    tier: "platinum",
    icon: "💎",
    color: "#E5E4E2",
    requirements: [{ type: "consistency_days", target: 30, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 1000, description: "1000 FitCoins" },
  },
  {
    id: "streak-60",
    title: "Iron Will",
    description: "Maintain a 60-day workout streak. Few reach this.",
    category: "streak",
    tier: "diamond",
    icon: "💠",
    color: "#B9F2FF",
    requirements: [{ type: "consistency_days", target: 60, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 2000, description: "2000 FitCoins" },
  },
  {
    id: "streak-90",
    title: "Eternal Flame",
    description: "Maintain a 90-day workout streak. Legendary status.",
    category: "streak",
    tier: "legendary",
    icon: "🌟",
    color: "#FF5555",
    requirements: [{ type: "consistency_days", target: 90, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 5000, description: "5000 FitCoins" },
  },

  // ──────────────────────────────────────────────────────────────────────
  // NUTRITION — meal logging, water, diet plans
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "first-meal-log",
    title: "First Bite",
    description: "Log your first meal. Awareness starts with one entry.",
    category: "nutrition",
    tier: "bronze",
    icon: "🍽️",
    color: "#CD7F32",
    requirements: [{ type: "nutrition_log", target: 1, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 50, description: "50 FitCoins" },
  },
  {
    id: "meal-logger-7",
    title: "Meal Tracker",
    description: "Log 7 meals. Tracking is becoming second nature.",
    category: "nutrition",
    tier: "silver",
    icon: "🥗",
    color: "#C0C0C0",
    requirements: [{ type: "nutrition_log", target: 7, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
  },
  {
    id: "meal-logger-30",
    title: "Nutritionist",
    description: "Log 30 meals. You know exactly what fuels you.",
    category: "nutrition",
    tier: "gold",
    icon: "📊",
    color: "#FFD700",
    requirements: [{ type: "nutrition_log", target: 30, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 400, description: "400 FitCoins" },
  },
  {
    id: "hydration-hero",
    title: "Hydration Hero",
    description: "Hit your water intake goal. Your body thanks you.",
    category: "nutrition",
    tier: "bronze",
    icon: "💧",
    color: "#CD7F32",
    requirements: [{ type: "water_intake", target: 1, timeframe: "daily" }],
    reward: { type: "fitcoins", value: 50, description: "50 FitCoins" },
  },
  {
    id: "hydration-week",
    title: "Water Week",
    description: "Hit your water goal 7 times. Stay flowing.",
    category: "nutrition",
    tier: "silver",
    icon: "🌊",
    color: "#C0C0C0",
    requirements: [{ type: "water_intake", target: 7, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 200, description: "200 FitCoins" },
  },

  // ──────────────────────────────────────────────────────────────────────
  // WELLNESS — steps, sleep, wearables
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "step-goal-first",
    title: "Step By Step",
    description: "Log 10,000 steps in a single day. A classic benchmark.",
    category: "wellness",
    tier: "bronze",
    icon: "👣",
    color: "#CD7F32",
    requirements: [{ type: "steps", target: 10000, timeframe: "daily" }],
    reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
  },
  {
    id: "sleep-well",
    title: "Rest & Recover",
    description: "Log 7+ hours of sleep in a night. Recovery is training too.",
    category: "wellness",
    tier: "bronze",
    icon: "😴",
    color: "#CD7F32",
    requirements: [{ type: "sleep_hours", target: 7, timeframe: "daily" }],
    reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
  },

  // ──────────────────────────────────────────────────────────────────────
  // MILESTONE — weight, goals, onboarding
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "weight-first-log",
    title: "On The Scale",
    description: "Log your weight for the first time. Baseline established.",
    category: "milestone",
    tier: "bronze",
    icon: "⚖️",
    color: "#CD7F32",
    requirements: [
      { type: "custom", target: 1, metadata: { field: "weightLogged" } },
    ],
    reward: { type: "fitcoins", value: 50, description: "50 FitCoins" },
  },
  {
    id: "weight-goal-hit",
    title: "Goal Crusher",
    description: "Reach your target weight. You set the goal, you met it.",
    category: "milestone",
    tier: "gold",
    icon: "🎯",
    color: "#FFD700",
    requirements: [{ type: "weight_goal", target: 1, timeframe: "all_time" }],
    reward: { type: "fitcoins", value: 500, description: "500 FitCoins" },
  },
  {
    id: "active-week",
    title: "Active All Week",
    description: "Be active (workout or meal logged) on 7 distinct days.",
    category: "consistency",
    tier: "silver",
    icon: "📆",
    color: "#C0C0C0",
    requirements: [
      { type: "custom", target: 7, metadata: { field: "activeDays" } },
    ],
    reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
  },

  // ──────────────────────────────────────────────────────────────────────
  // CONSISTENCY — daily engagement
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "perfect-workout",
    title: "Flawless Form",
    description: "Complete a perfect workout. Quality over quantity.",
    category: "fitness",
    tier: "bronze",
    icon: "✨",
    color: "#CD7F32",
    requirements: [
      { type: "custom", target: 1, metadata: { field: "perfectWorkouts" } },
    ],
    reward: { type: "fitcoins", value: 50, description: "50 FitCoins" },
  },
  {
    id: "calorie-burner-500",
    title: "Energy Burner",
    description: "Burn 500 calories in a single workout. Push your limits.",
    category: "fitness",
    tier: "bronze",
    icon: "🔋",
    color: "#CD7F32",
    requirements: [
      {
        type: "custom",
        target: 500,
        metadata: { field: "singleWorkoutCalories" },
      },
    ],
    reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
  },

  // ──────────────────────────────────────────────────────────────────────
  // CHALLENGE — compound goals (require multiple things)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "balanced-week",
    title: "Balanced Week",
    description: "In one week: 3 workouts, log 3 meals, hit water goal once.",
    category: "challenge",
    tier: "silver",
    icon: "⚖️",
    color: "#C0C0C0",
    requirements: [
      { type: "workout_count", target: 3, timeframe: "weekly" },
      { type: "nutrition_log", target: 3, timeframe: "weekly" },
      { type: "water_intake", target: 1, timeframe: "weekly" },
    ],
    reward: { type: "fitcoins", value: 300, description: "300 FitCoins" },
  },
];

// Quick lookup helpers (kept here so the catalog is the single enumeration point).
export const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
