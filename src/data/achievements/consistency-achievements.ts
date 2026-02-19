// Consistency and Streak Achievements for FitAI

import { Achievement } from "../../types/ai";

// ============================================================================
// CONSISTENCY ACHIEVEMENTS
// ============================================================================

export const CONSISTENCY_ACHIEVEMENTS: Achievement[] = [
  {
    id: "workout_streak_3",
    title: "Getting Started",
    description: "Complete workouts for 3 consecutive days",
    icon: "🔥",
    category: "consistency",
    rarity: "common",
    criteria: {
      type: "streak",
      value: 3,
      timeframe: "daily",
    },
    points: 100,

    rewards: {
      badges: ["consistent"],

      features: ["workout_streak_7"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "workout_streak_7",
    title: "Week Warrior",
    description: "Complete workouts for 7 consecutive days",
    icon: "⚡",
    category: "consistency",
    rarity: "rare",
    criteria: {
      type: "streak",
      value: 7,
      timeframe: "daily",
    },
    points: 250,

    rewards: {
      badges: ["warrior"],

      features: ["workout_streak_30"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "workout_streak_30",
    title: "Monthly Master",
    description: "Complete workouts for 30 consecutive days",
    icon: "👑",
    category: "consistency",
    rarity: "epic",
    criteria: {
      type: "streak",
      value: 30,
      timeframe: "daily",
    },
    points: 1000,

    rewards: {
      badges: ["master"],

      features: ["workout_streak_100"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "workout_streak_100",
    title: "Century Champion",
    description: "Complete workouts for 100 consecutive days",
    icon: "💎",
    category: "consistency",
    rarity: "legendary",
    criteria: {
      type: "streak",
      value: 100,
      timeframe: "daily",
    },
    points: 5000,

    rewards: {
      badges: ["champion"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
];
