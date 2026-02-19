// Milestone Achievements for FitAI

import { Achievement } from "../../types/ai";

// ============================================================================
// MILESTONE ACHIEVEMENTS
// ============================================================================

export const MILESTONE_ACHIEVEMENTS: Achievement[] = [
  {
    id: "weight_loss_5kg",
    title: "First 5kg",
    description: "Lose your first 5kg",
    icon: "📉",
    category: "milestone",
    rarity: "rare",
    criteria: {
      type: "personal_best",
      value: 5,
    },
    points: 500,

    rewards: {
      badges: ["weight_loss"],

      features: ["weight_loss_10kg"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "weight_loss_10kg",
    title: "Double Digits",
    description: "Lose 10kg total",
    icon: "🎉",
    category: "milestone",
    rarity: "epic",
    criteria: {
      type: "personal_best",
      value: 10,
    },
    points: 1000,

    rewards: {
      badges: ["double_digits"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "muscle_gain_2kg",
    title: "Muscle Builder",
    description: "Gain 2kg of muscle mass",
    icon: "💪",
    category: "milestone",
    rarity: "rare",
    criteria: {
      type: "personal_best",
      value: 2,
    },
    points: 600,

    rewards: {
      badges: ["muscle_builder"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
];
