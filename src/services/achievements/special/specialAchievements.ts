import { Achievement } from "../types";

export function createSpecialAchievements(): Achievement[] {
  return [
    {
      id: "early_bird",
      category: "special",
      tier: "gold",
      title: "Early Bird",
      description: "Complete 20 workouts before 6 AM",
      icon: "🌅",
      color: "#FFD700",
      isSecret: true,
      requirements: [
        { type: "custom", target: 20, metadata: { time: "before_6am" } },
      ],
      reward: {
        type: "fitcoins",
        value: 400,
        description: "400 FitCoins + Early Bird Title",
      },
    },
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
    {
      id: "perfectionist",
      category: "special",
      tier: "legendary",
      title: "The Perfectionist",
      description: "Achieve 100% completion rate on all goals for 30 days",
      icon: "🏆✨",
      color: "#FF6B6B",
      isSecret: true,
      requirements: [
        {
          type: "custom",
          target: 30,
          metadata: { achievement: "perfect_completion" },
        },
      ],
      reward: {
        type: "title",
        value: "The Perfectionist",
        description: "Ultimate Perfectionist Title + 1500 FitCoins",
      },
    },
  ];
}
