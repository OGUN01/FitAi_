// Nutrition-related Achievements for FitAI

import { Achievement } from "../../types/ai";

// ============================================================================
// NUTRITION ACHIEVEMENTS
// ============================================================================

export const NUTRITION_ACHIEVEMENTS: Achievement[] = [
  {
    id: "nutrition_tracker",
    title: "Nutrition Tracker",
    description: "Log your meals for 7 consecutive days",
    icon: "📊",
    category: "nutrition",
    rarity: "common",
    criteria: {
      type: "streak",
      value: 7,
      timeframe: "daily",
    },
    points: 200,

    rewards: {
      badges: ["tracker"],

      features: ["nutrition_master"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "nutrition_master",
    title: "Nutrition Master",
    description: "Log your meals for 30 consecutive days",
    icon: "🥗",
    category: "nutrition",
    rarity: "rare",
    criteria: {
      type: "streak",
      value: 30,
      timeframe: "daily",
    },
    points: 600,

    rewards: {
      badges: ["nutrition_master"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "calorie_goal_week",
    title: "Calorie Conscious",
    description: "Meet your daily calorie goal for 7 days",
    icon: "🎯",
    category: "nutrition",
    rarity: "common",
    criteria: {
      type: "total",
      value: 7,
      timeframe: "weekly",
    },
    points: 300,

    rewards: {
      badges: ["conscious"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "protein_goal_week",
    title: "Protein Power",
    description: "Meet your daily protein goal for 7 days",
    icon: "🥩",
    category: "nutrition",
    rarity: "rare",
    criteria: {
      type: "total",
      value: 7,
      timeframe: "weekly",
    },
    points: 400,

    rewards: {
      badges: ["protein_power"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
];
