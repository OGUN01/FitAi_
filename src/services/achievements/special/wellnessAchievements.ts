import { Achievement } from "../types";

export function createWellnessAchievements(): Achievement[] {
  return [
    {
      id: "sleep_champion",
      category: "wellness",
      tier: "silver",
      title: "Sleep Champion",
      description: "Get 8+ hours of sleep for 14 nights",
      icon: "😴",
      color: "#C0C0C0",
      requirements: [
        { type: "sleep_hours", target: 14, metadata: { min_hours: 8 } },
      ],
      reward: {
        type: "fitcoins",
        value: 200,
        description: "200 FitCoins + Champion Badge",
      },
    },
    {
      id: "stress_buster",
      category: "wellness",
      tier: "gold",
      title: "Stress Buster",
      description: "Complete 20 meditation/relaxation sessions",
      icon: "🧘‍♀️",
      color: "#FFD700",
      requirements: [
        { type: "custom", target: 20, metadata: { activity: "meditation" } },
      ],
      reward: {
        type: "fitcoins",
        value: 300,
        description: "300 FitCoins + Zen Theme",
      },
    },
    {
      id: "recovery_master",
      category: "wellness",
      tier: "platinum",
      title: "Recovery Master",
      description: "Take proper rest days and recovery sessions",
      icon: "🛌",
      color: "#E5E4E2",
      requirements: [
        {
          type: "custom",
          target: 15,
          metadata: { activity: "recovery_sessions" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 400,
        description: "400 FitCoins + Master Title",
      },
    },
    {
      id: "hydration_hero",
      category: "wellness",
      tier: "bronze",
      title: "Daily Hydrator",
      description: "Meet water goals for 21 days",
      icon: "💧",
      color: "#CD7F32",
      requirements: [{ type: "water_intake", target: 21 }],
      reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
    },
    {
      id: "step_counter",
      category: "wellness",
      tier: "silver",
      title: "Step Counter",
      description: "Hit 10,000+ steps for 30 days",
      icon: "👣",
      color: "#C0C0C0",
      requirements: [
        { type: "steps", target: 30, metadata: { daily_min: 10000 } },
      ],
      reward: {
        type: "fitcoins",
        value: 250,
        description: "250 FitCoins + Counter Badge",
      },
    },
    {
      id: "heart_health",
      category: "wellness",
      tier: "gold",
      title: "Heart Health Hero",
      description: "Monitor heart rate during 25 workouts",
      icon: "❤️",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 25,
          metadata: { activity: "heart_rate_monitored" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 300,
        description: "300 FitCoins + Hero Badge",
      },
    },
    {
      id: "balance_seeker",
      category: "wellness",
      tier: "gold",
      title: "Balance Seeker",
      description:
        "Complete equal amounts of cardio, strength, and flexibility",
      icon: "⚖️",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 1,
          metadata: { activity: "balanced_workouts" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 350,
        description: "350 FitCoins + Balance Title",
      },
    },
    {
      id: "posture_perfectionist",
      category: "wellness",
      tier: "silver",
      title: "Posture Perfectionist",
      description: "Complete 15 posture improvement exercises",
      icon: "🧘‍♂️",
      color: "#C0C0C0",
      requirements: [
        { type: "custom", target: 15, metadata: { exercise_type: "posture" } },
      ],
      reward: {
        type: "fitcoins",
        value: 180,
        description: "180 FitCoins + Posture Badge",
      },
    },
    {
      id: "mobility_master",
      category: "wellness",
      tier: "platinum",
      title: "Mobility Master",
      description: "Complete 30 mobility and stretching sessions",
      icon: "🤸‍♀️",
      color: "#E5E4E2",
      requirements: [
        { type: "custom", target: 30, metadata: { exercise_type: "mobility" } },
      ],
      reward: {
        type: "fitcoins",
        value: 400,
        description: "400 FitCoins + Master Title",
      },
    },
    {
      id: "breath_master",
      category: "wellness",
      tier: "gold",
      title: "Breath Master",
      description: "Complete 25 breathing exercises",
      icon: "🌬️",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 25,
          metadata: { exercise_type: "breathing" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 250,
        description: "250 FitCoins + Breath Title",
      },
    },
    {
      id: "energy_optimizer",
      category: "wellness",
      tier: "platinum",
      title: "Energy Optimizer",
      description: "Maintain consistent energy levels through tracking",
      icon: "⚡📈",
      color: "#E5E4E2",
      requirements: [
        {
          type: "custom",
          target: 30,
          metadata: { activity: "energy_tracking" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 500,
        description: "500 FitCoins + Optimizer Title",
      },
    },
    {
      id: "holistic_health",
      category: "wellness",
      tier: "legendary",
      title: "Holistic Health Master",
      description:
        "Excellence in fitness, nutrition, sleep, and mental wellness",
      icon: "🌈💪",
      color: "#FF6B6B",
      requirements: [
        {
          type: "custom",
          target: 1,
          metadata: { activity: "holistic_excellence" },
        },
      ],
      reward: {
        type: "title",
        value: "Wellness Guru",
        description: "Exclusive Wellness Guru Title + 1000 FitCoins",
      },
    },
  ];
}
