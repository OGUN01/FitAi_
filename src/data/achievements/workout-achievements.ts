// Workout-related Achievements for FitAI

import { Achievement } from "../../types/ai";

// ============================================================================
// WORKOUT ACHIEVEMENTS
// ============================================================================

export const WORKOUT_ACHIEVEMENTS: Achievement[] = [
  // FIRST WORKOUT
  {
    id: "first_workout",
    title: "First Steps",
    description: "Complete your first workout",
    icon: "🎯",
    category: "workout",
    rarity: "common",
    criteria: {
      type: "total",
      value: 1,
    },
    points: 50,

    rewards: {
      badges: ["starter"],

      features: ["workout_streak_3"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },

  // STRENGTH ACHIEVEMENTS
  {
    id: "strength_beginner",
    title: "Getting Stronger",
    description: "Complete 10 strength training workouts",
    icon: "💪",
    category: "workout",
    rarity: "common",
    criteria: {
      type: "total",
      value: 10,
    },
    points: 200,

    rewards: {
      badges: ["strong"],

      features: ["strength_intermediate"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "strength_intermediate",
    title: "Strength Builder",
    description: "Complete 50 strength training workouts",
    icon: "🏋️",
    category: "workout",
    rarity: "rare",
    criteria: {
      type: "total",
      value: 50,
    },
    points: 500,

    rewards: {
      badges: ["builder"],

      features: ["strength_advanced"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "strength_advanced",
    title: "Iron Warrior",
    description: "Complete 100 strength training workouts",
    icon: "⚔️",
    category: "workout",
    rarity: "epic",
    criteria: {
      type: "total",
      value: 100,
    },
    points: 1000,

    rewards: {
      badges: ["iron_warrior"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },

  // CARDIO ACHIEVEMENTS
  {
    id: "cardio_starter",
    title: "Heart Pumper",
    description: "Complete 5 cardio workouts",
    icon: "❤️",
    category: "workout",
    rarity: "common",
    criteria: {
      type: "total",
      value: 5,
    },
    points: 150,

    rewards: {
      badges: ["cardio"],

      features: ["cardio_enthusiast"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "cardio_enthusiast",
    title: "Cardio Enthusiast",
    description: "Complete 25 cardio workouts",
    icon: "🏃",
    category: "workout",
    rarity: "rare",
    criteria: {
      type: "total",
      value: 25,
    },
    points: 400,

    rewards: {
      badges: ["enthusiast"],

      features: ["cardio_machine"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "cardio_machine",
    title: "Cardio Machine",
    description: "Complete 75 cardio workouts",
    icon: "🚀",
    category: "workout",
    rarity: "epic",
    criteria: {
      type: "total",
      value: 75,
    },
    points: 800,

    rewards: {
      badges: ["machine"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },

  // SPECIAL ACHIEVEMENTS
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Complete 10 workouts before 8 AM",
    icon: "🌅",
    category: "workout",
    rarity: "common",
    criteria: {
      type: "total",
      value: 10,
    },
    points: 300,

    rewards: {
      badges: ["early_bird"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "night_owl",
    title: "Night Owl",
    description: "Complete 10 workouts after 8 PM",
    icon: "🦉",
    category: "workout",
    rarity: "common",
    criteria: {
      type: "total",
      value: 10,
    },
    points: 300,

    rewards: {
      badges: ["night_owl"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "weekend_warrior",
    title: "Weekend Warrior",
    description: "Complete workouts on 10 weekends",
    icon: "🏖️",
    category: "workout",
    rarity: "rare",
    criteria: {
      type: "total",
      value: 10,
    },
    points: 400,

    rewards: {
      badges: ["weekend_warrior"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
  {
    id: "variety_seeker",
    title: "Variety Seeker",
    description: "Try 20 different types of exercises",
    icon: "🎭",
    category: "workout",
    rarity: "epic",
    criteria: {
      type: "total",
      value: 20,
    },
    points: 700,

    rewards: {
      badges: ["variety_seeker"],
    },

    // unlockedAt: undefined,
    progress: {
      current: 0,

      target: 0,

      unit: "count",
    },
  },
];
