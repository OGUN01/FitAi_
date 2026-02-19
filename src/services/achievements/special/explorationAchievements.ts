import { Achievement } from "../types";

export function createExplorationAchievements(): Achievement[] {
  return [
    {
      id: "feature_explorer",
      category: "exploration",
      tier: "bronze",
      title: "Feature Explorer",
      description: "Use 5 different features in FitAI",
      icon: "🗺️",
      color: "#CD7F32",
      requirements: [
        {
          type: "custom",
          target: 5,
          metadata: { exploration: "features_used" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 75,
        description: "75 FitCoins + Explorer Badge",
      },
    },
    {
      id: "workout_adventurer",
      category: "exploration",
      tier: "silver",
      title: "Workout Adventurer",
      description: "Try 10 different workout types",
      icon: "🏋️‍♂️🌎",
      color: "#C0C0C0",
      requirements: [
        {
          type: "custom",
          target: 10,
          metadata: { exploration: "workout_types" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 150,
        description: "150 FitCoins + Adventurer Badge",
      },
    },
    {
      id: "cuisine_explorer",
      category: "exploration",
      tier: "gold",
      title: "Cuisine Explorer",
      description: "Log foods from 15 different cuisines",
      icon: "🌍🍽️",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 15,
          metadata: { exploration: "cuisine_types" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 250,
        description: "250 FitCoins + Explorer Title",
      },
    },
    {
      id: "exercise_pioneer",
      category: "exploration",
      tier: "platinum",
      title: "Exercise Pioneer",
      description: "Complete 50 unique exercises",
      icon: "🚀💪",
      color: "#E5E4E2",
      requirements: [
        {
          type: "custom",
          target: 50,
          metadata: { exploration: "unique_exercises" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 400,
        description: "400 FitCoins + Pioneer Title",
      },
    },
    {
      id: "recipe_discoverer",
      category: "exploration",
      tier: "silver",
      title: "Recipe Discoverer",
      description: "Try 25 AI-generated recipes",
      icon: "📜🍳",
      color: "#C0C0C0",
      requirements: [
        { type: "custom", target: 25, metadata: { exploration: "ai_recipes" } },
      ],
      reward: {
        type: "fitcoins",
        value: 180,
        description: "180 FitCoins + Discoverer Badge",
      },
    },
    {
      id: "settings_tweaker",
      category: "exploration",
      tier: "bronze",
      title: "Settings Tweaker",
      description: "Customize 10 app settings",
      icon: "⚙️",
      color: "#CD7F32",
      requirements: [
        {
          type: "custom",
          target: 10,
          metadata: { exploration: "settings_changed" },
        },
      ],
      reward: { type: "fitcoins", value: 60, description: "60 FitCoins" },
    },
    {
      id: "data_detective",
      category: "exploration",
      tier: "gold",
      title: "Data Detective",
      description: "View all analytics and progress charts",
      icon: "🔍📈",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 1,
          metadata: { exploration: "all_analytics" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 200,
        description: "200 FitCoins + Detective Badge",
      },
    },
    {
      id: "beta_tester",
      category: "exploration",
      tier: "legendary",
      title: "Beta Tester",
      description: "Test and provide feedback on new features",
      icon: "🧪",
      color: "#FF6B6B",
      isSecret: true,
      requirements: [
        {
          type: "custom",
          target: 1,
          metadata: { exploration: "beta_features" },
        },
      ],
      reward: {
        type: "title",
        value: "Beta Legend",
        description: "Exclusive Beta Tester Title + 500 FitCoins",
      },
    },
  ];
}
