import { Achievement } from "./types";

export function createChallengeAchievements(): Achievement[] {
  return [
    {
      id: "challenge_rookie",
      category: "challenge",
      tier: "bronze",
      title: "Challenge Rookie",
      description: "Complete your first challenge",
      icon: "🎯",
      color: "#CD7F32",
      requirements: [{ type: "challenge_wins", target: 1 }],
      reward: {
        type: "fitcoins",
        value: 100,
        description: "100 FitCoins + Rookie Badge",
      },
    },
    {
      id: "challenge_veteran",
      category: "challenge",
      tier: "silver",
      title: "Challenge Veteran",
      description: "Complete 10 challenges",
      icon: "🎯🏅",
      color: "#C0C0C0",
      requirements: [{ type: "challenge_wins", target: 10 }],
      reward: {
        type: "fitcoins",
        value: 250,
        description: "250 FitCoins + Veteran Title",
      },
    },
    {
      id: "challenge_champion",
      category: "challenge",
      tier: "gold",
      title: "Challenge Champion",
      description: "Complete 25 challenges",
      icon: "🏆",
      color: "#FFD700",
      requirements: [{ type: "challenge_wins", target: 25 }],
      reward: {
        type: "fitcoins",
        value: 500,
        description: "500 FitCoins + Champion Title",
      },
    },
    {
      id: "speed_demon",
      category: "challenge",
      tier: "gold",
      title: "Speed Demon",
      description: "Complete a challenge in record time",
      icon: "⚡",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 1,
          metadata: { challenge_type: "record_time" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 300,
        description: "300 FitCoins + Speed Badge",
      },
    },
    {
      id: "endurance_master",
      category: "challenge",
      tier: "platinum",
      title: "Endurance Master",
      description: "Complete a 30-day challenge",
      icon: "🏃‍♂️💪",
      color: "#E5E4E2",
      requirements: [
        { type: "custom", target: 1, metadata: { challenge_type: "30_day" } },
      ],
      reward: {
        type: "fitcoins",
        value: 750,
        description: "750 FitCoins + Master Title",
      },
    },
    {
      id: "team_challenger",
      category: "challenge",
      tier: "silver",
      title: "Team Challenger",
      description: "Complete 5 team challenges",
      icon: "🤝",
      color: "#C0C0C0",
      requirements: [
        { type: "custom", target: 5, metadata: { challenge_type: "team" } },
      ],
      reward: {
        type: "fitcoins",
        value: 200,
        description: "200 FitCoins + Team Badge",
      },
    },
    {
      id: "solo_warrior",
      category: "challenge",
      tier: "gold",
      title: "Solo Warrior",
      description: "Complete 15 solo challenges",
      icon: "🥺",
      color: "#FFD700",
      requirements: [
        { type: "custom", target: 15, metadata: { challenge_type: "solo" } },
      ],
      reward: {
        type: "fitcoins",
        value: 400,
        description: "400 FitCoins + Warrior Title",
      },
    },
    {
      id: "ultimate_challenger",
      category: "challenge",
      tier: "legendary",
      title: "Ultimate Challenger",
      description: "Complete 50 challenges with 90%+ success rate",
      icon: "👑🎯",
      color: "#FF6B6B",
      requirements: [
        { type: "custom", target: 1, metadata: { challenge_type: "ultimate" } },
      ],
      reward: {
        type: "title",
        value: "Ultimate Challenger",
        description: "Exclusive Ultimate Title + 1000 FitCoins",
      },
    },
  ];
}

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

export function createSpecialAchievements(): Achievement[] {
  return [
    {
      id: "night_owl_fitness",
      category: "special",
      tier: "silver",
      title: "Night Owl",
      description: "Complete 15 workouts after 10 PM",
      icon: "🦉",
      color: "#C0C0C0",
      isSecret: true,
      requirements: [
        { type: "custom", target: 15, metadata: { time: "after_10pm" } },
      ],
      reward: {
        type: "fitcoins",
        value: 250,
        description: "250 FitCoins + Night Theme",
      },
    },
    {
      id: "birthday_workout",
      category: "special",
      tier: "legendary",
      title: "Birthday Beast",
      description: "Work out on your birthday",
      icon: "🎂💪",
      color: "#FF6B6B",
      isSecret: true,
      requirements: [
        { type: "custom", target: 1, metadata: { date: "birthday" } },
      ],
      reward: {
        type: "title",
        value: "Birthday Beast",
        description: "Exclusive Birthday Title + 500 FitCoins",
      },
    },
    {
      id: "holiday_dedication",
      category: "special",
      tier: "platinum",
      title: "Holiday Hero",
      description: "Work out on 5 major holidays",
      icon: "🎉🏋️‍♂️",
      color: "#E5E4E2",
      isSecret: true,
      requirements: [
        { type: "custom", target: 5, metadata: { date: "holidays" } },
      ],
      reward: {
        type: "fitcoins",
        value: 600,
        description: "600 FitCoins + Hero Title",
      },
    },
    {
      id: "weather_warrior",
      category: "special",
      tier: "gold",
      title: "Weather Warrior",
      description: "Work out in 10 different weather conditions",
      icon: "⛈️💪",
      color: "#FFD700",
      isSecret: true,
      requirements: [
        {
          type: "custom",
          target: 10,
          metadata: { condition: "weather_types" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 300,
        description: "300 FitCoins + Weather Badge",
      },
    },
    {
      id: "multitasker",
      category: "special",
      tier: "silver",
      title: "Multitasker",
      description:
        "Complete workout, log meals, and track water in one day, 10 times",
      icon: "🔄",
      color: "#C0C0C0",
      requirements: [
        { type: "custom", target: 10, metadata: { activity: "complete_day" } },
      ],
      reward: {
        type: "fitcoins",
        value: 200,
        description: "200 FitCoins + Efficiency Badge",
      },
    },
    {
      id: "minimalist",
      category: "special",
      tier: "gold",
      title: "Minimalist",
      description: "Complete 25 bodyweight-only workouts",
      icon: "🧮",
      color: "#FFD700",
      isSecret: true,
      requirements: [
        { type: "custom", target: 25, metadata: { equipment: "none" } },
      ],
      reward: {
        type: "fitcoins",
        value: 300,
        description: "300 FitCoins + Minimalist Title",
      },
    },
    {
      id: "gear_guru",
      category: "special",
      tier: "platinum",
      title: "Gear Guru",
      description: "Use 15 different types of fitness equipment",
      icon: "🏋️‍♂️🔧",
      color: "#E5E4E2",
      isSecret: true,
      requirements: [
        { type: "custom", target: 15, metadata: { equipment: "types" } },
      ],
      reward: {
        type: "fitcoins",
        value: 500,
        description: "500 FitCoins + Guru Title",
      },
    },
    {
      id: "time_traveler",
      category: "special",
      tier: "legendary",
      title: "Time Traveler",
      description: "Work out in 5 different time zones",
      icon: "🌍⏰",
      color: "#FF6B6B",
      isSecret: true,
      requirements: [
        { type: "custom", target: 5, metadata: { location: "time_zones" } },
      ],
      reward: {
        type: "title",
        value: "Time Traveler",
        description: "Exclusive Traveler Title + 750 FitCoins",
      },
    },
  ];
}
