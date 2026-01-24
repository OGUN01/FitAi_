// Achievement Engine for FitAI
// Comprehensive gamification system with 130+ badges and intelligent progression
//
// ACHIEVEMENT BREAKDOWN:
// • FITNESS: 23 badges (workouts, strength, cardio, flexibility, calorie burning)
// • NUTRITION: 19 badges (meal logging, water, macros, healthy choices, cooking)
// • CONSISTENCY: 14 badges (daily usage, habits, perfect weeks, comebacks)
// • SOCIAL: 12 badges (friends, kudos, challenges, leaderboards, mentoring)
// • MILESTONE: 15 badges (time-based, workout counts, distance, weight goals)
// • STREAK: 10 badges (workout, nutrition, water, sleep, perfect streaks)
// • CHALLENGE: 8 badges (completion, speed, endurance, team/solo challenges)
// • EXPLORATION: 8 badges (features, workouts, cuisines, exercises, recipes)
// • WELLNESS: 12 badges (sleep, stress, recovery, heart health, balance)
// • SPECIAL: 10 badges (secret achievements, time-based, weather, perfectionist)
//
// TOTAL: 131 UNIQUE ACHIEVEMENTS across 6 tiers (Bronze → Legendary)

import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "../utils/EventEmitter";

export interface Achievement {
  id: string;
  category: AchievementCategory;
  tier: AchievementTier;
  title: string;
  description: string;
  icon: string;
  color: string;
  requirements: AchievementRequirement[];
  reward: AchievementReward;
  isSecret?: boolean;
  prerequisiteIds?: string[];
  metadata?: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  userId: string;
  unlockedAt: string;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  celebrationShown: boolean;
  fitCoinsEarned?: number; // FitCoins earned from this achievement
}

export type AchievementCategory =
  | "fitness"
  | "nutrition"
  | "consistency"
  | "social"
  | "milestone"
  | "streak"
  | "challenge"
  | "exploration"
  | "wellness"
  | "special";

export type AchievementTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "legendary";

export interface AchievementRequirement {
  type:
    | "workout_count"
    | "workout_streak"
    | "calories_burned"
    | "weight_goal"
    | "nutrition_log"
    | "water_intake"
    | "sleep_hours"
    | "steps"
    | "friend_count"
    | "challenge_wins"
    | "consistency_days"
    | "custom";
  target: number;
  timeframe?: "daily" | "weekly" | "monthly" | "all_time";
  metadata?: Record<string, any>;
}

export interface AchievementReward {
  type: "fitcoins" | "title" | "badge" | "premium_trial" | "avatar" | "theme";
  value: number | string;
  description: string;
}

class AchievementEngine extends EventEmitter {
  private readonly STORAGE_KEY = "fitai_achievements";
  private readonly USER_ACHIEVEMENTS_KEY = "fitai_user_achievements";
  private achievements: Achievement[] = [];
  private userAchievements: Map<string, UserAchievement> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.initializeAchievements();
  }

  /**
   * Public initialize method for external access
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAchievements();
      await this.loadUserAchievements();
    }
  }

  /**
   * Initialize the comprehensive achievement system
   */
  private async initializeAchievements(): Promise<void> {
    console.log("🏆 Initializing FitAI Achievement Engine with 100+ badges...");

    this.achievements = [
      // === FITNESS ACHIEVEMENTS ===
      ...this.createFitnessAchievements(),

      // === NUTRITION ACHIEVEMENTS ===
      ...this.createNutritionAchievements(),

      // === CONSISTENCY ACHIEVEMENTS ===
      ...this.createConsistencyAchievements(),

      // === SOCIAL ACHIEVEMENTS ===
      ...this.createSocialAchievements(),

      // === MILESTONE ACHIEVEMENTS ===
      ...this.createMilestoneAchievements(),

      // === STREAK ACHIEVEMENTS ===
      ...this.createStreakAchievements(),

      // === CHALLENGE ACHIEVEMENTS ===
      ...this.createChallengeAchievements(),

      // === EXPLORATION ACHIEVEMENTS ===
      ...this.createExplorationAchievements(),

      // === WELLNESS ACHIEVEMENTS ===
      ...this.createWellnessAchievements(),

      // === SPECIAL & SECRET ACHIEVEMENTS ===
      ...this.createSpecialAchievements(),
    ];

    // Load user progress
    await this.loadUserAchievements();

    this.isInitialized = true;
    console.log(
      `✅ Achievement Engine initialized with ${this.achievements.length} achievements!`,
    );
  }

  /**
   * FITNESS ACHIEVEMENTS (25 badges)
   */
  private createFitnessAchievements(): Achievement[] {
    return [
      // First Steps
      {
        id: "first_workout",
        category: "fitness",
        tier: "bronze",
        title: "First Steps",
        description: "Complete your first workout with FitAI",
        icon: "🏃",
        color: "#CD7F32",
        requirements: [{ type: "workout_count", target: 1 }],
        reward: { type: "fitcoins", value: 50, description: "50 FitCoins" },
      },
      {
        id: "workout_warrior",
        category: "fitness",
        tier: "silver",
        title: "Workout Warrior",
        description: "Complete 10 workouts",
        icon: "💪",
        color: "#C0C0C0",
        requirements: [{ type: "workout_count", target: 10 }],
        reward: {
          type: "fitcoins",
          value: 100,
          description: "100 FitCoins + Warrior Title",
        },
      },
      {
        id: "fitness_champion",
        category: "fitness",
        tier: "gold",
        title: "Fitness Champion",
        description: "Complete 50 workouts",
        icon: "🏆",
        color: "#FFD700",
        requirements: [{ type: "workout_count", target: 50 }],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Champion Title",
        },
      },
      {
        id: "fitness_legend",
        category: "fitness",
        tier: "platinum",
        title: "Fitness Legend",
        description: "Complete 100 workouts",
        icon: "👑",
        color: "#E5E4E2",
        requirements: [{ type: "workout_count", target: 100 }],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Legend Title",
        },
      },

      // Calorie Burners
      {
        id: "calorie_crusher",
        category: "fitness",
        tier: "bronze",
        title: "Calorie Crusher",
        description: "Burn 1,000 calories total",
        icon: "🔥",
        color: "#CD7F32",
        requirements: [{ type: "calories_burned", target: 1000 }],
        reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
      },
      {
        id: "inferno_master",
        category: "fitness",
        tier: "gold",
        title: "Inferno Master",
        description: "Burn 10,000 calories total",
        icon: "🔥🔥",
        color: "#FFD700",
        requirements: [{ type: "calories_burned", target: 10000 }],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Fire Avatar",
        },
      },
      {
        id: "calorie_volcano",
        category: "fitness",
        tier: "diamond",
        title: "Calorie Volcano",
        description: "Burn 50,000 calories total",
        icon: "🌋",
        color: "#B9F2FF",
        requirements: [{ type: "calories_burned", target: 50000 }],
        reward: {
          type: "premium_trial",
          value: 7,
          description: "7-day Premium Trial",
        },
      },

      // Strength Training
      {
        id: "iron_apprentice",
        category: "fitness",
        tier: "bronze",
        title: "Iron Apprentice",
        description: "Complete 5 strength workouts",
        icon: "🏋️",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 5, metadata: { workout_type: "strength" } },
        ],
        reward: { type: "fitcoins", value: 60, description: "60 FitCoins" },
      },
      {
        id: "strength_titan",
        category: "fitness",
        tier: "platinum",
        title: "Strength Titan",
        description: "Complete 50 strength workouts",
        icon: "🦾",
        color: "#E5E4E2",
        requirements: [
          {
            type: "custom",
            target: 50,
            metadata: { workout_type: "strength" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Titan Theme",
        },
      },

      // Cardio
      {
        id: "cardio_rookie",
        category: "fitness",
        tier: "bronze",
        title: "Cardio Rookie",
        description: "Complete 5 cardio workouts",
        icon: "🏃‍♂️",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 5, metadata: { workout_type: "cardio" } },
        ],
        reward: { type: "fitcoins", value: 60, description: "60 FitCoins" },
      },
      {
        id: "endurance_beast",
        category: "fitness",
        tier: "gold",
        title: "Endurance Beast",
        description: "Complete 30 cardio workouts",
        icon: "🦸",
        color: "#FFD700",
        requirements: [
          { type: "custom", target: 30, metadata: { workout_type: "cardio" } },
        ],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Beast Avatar",
        },
      },

      // Flexibility
      {
        id: "flexibility_seeker",
        category: "fitness",
        tier: "bronze",
        title: "Flexibility Seeker",
        description: "Complete 5 flexibility workouts",
        icon: "🤸",
        color: "#CD7F32",
        requirements: [
          {
            type: "custom",
            target: 5,
            metadata: { workout_type: "flexibility" },
          },
        ],
        reward: { type: "fitcoins", value: 60, description: "60 FitCoins" },
      },
      {
        id: "yoga_master",
        category: "fitness",
        tier: "gold",
        title: "Yoga Master",
        description: "Complete 25 yoga/flexibility workouts",
        icon: "🧘‍♀️",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 25,
            metadata: { workout_type: "flexibility" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Zen Theme",
        },
      },

      // HIIT
      {
        id: "hiit_novice",
        category: "fitness",
        tier: "silver",
        title: "HIIT Novice",
        description: "Complete 5 HIIT workouts",
        icon: "⚡",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 5, metadata: { workout_type: "hiit" } },
        ],
        reward: { type: "fitcoins", value: 80, description: "80 FitCoins" },
      },
      {
        id: "hiit_destroyer",
        category: "fitness",
        tier: "platinum",
        title: "HIIT Destroyer",
        description: "Complete 30 HIIT workouts",
        icon: "⚡⚡",
        color: "#E5E4E2",
        requirements: [
          { type: "custom", target: 30, metadata: { workout_type: "hiit" } },
        ],
        reward: {
          type: "fitcoins",
          value: 350,
          description: "350 FitCoins + Lightning Avatar",
        },
      },

      // Special Fitness
      {
        id: "early_bird",
        category: "fitness",
        tier: "silver",
        title: "Early Bird",
        description: "Complete 10 workouts before 8 AM",
        icon: "🌅",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 10,
            metadata: { time_range: "before_8am" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 120,
          description: "120 FitCoins + Morning Theme",
        },
      },
      {
        id: "weekend_warrior",
        category: "fitness",
        tier: "bronze",
        title: "Weekend Warrior",
        description: "Complete 10 weekend workouts",
        icon: "🎯",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 10, metadata: { day_type: "weekend" } },
        ],
        reward: { type: "fitcoins", value: 90, description: "90 FitCoins" },
      },

      // Time-based
      {
        id: "quick_session",
        category: "fitness",
        tier: "bronze",
        title: "Quick Session",
        description: "Complete 15 workouts under 20 minutes",
        icon: "⏱️",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 15, metadata: { duration: "under_20min" } },
        ],
        reward: { type: "fitcoins", value: 70, description: "70 FitCoins" },
      },
      {
        id: "endurance_marathon",
        category: "fitness",
        tier: "gold",
        title: "Endurance Marathon",
        description: "Complete 10 workouts over 60 minutes",
        icon: "🏃‍♂️💨",
        color: "#FFD700",
        requirements: [
          { type: "custom", target: 10, metadata: { duration: "over_60min" } },
        ],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Marathon Badge",
        },
      },

      // Equipment-based
      {
        id: "bodyweight_master",
        category: "fitness",
        tier: "silver",
        title: "Bodyweight Master",
        description: "Complete 20 bodyweight workouts",
        icon: "🤾",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 20, metadata: { equipment: "bodyweight" } },
        ],
        reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
      },
      {
        id: "gym_beast",
        category: "fitness",
        tier: "gold",
        title: "Gym Beast",
        description: "Complete 25 gym workouts",
        icon: "🏋️‍♀️",
        color: "#FFD700",
        requirements: [
          { type: "custom", target: 25, metadata: { equipment: "full_gym" } },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Gym Theme",
        },
      },

      // Perfect Workout
      {
        id: "perfectionist",
        category: "fitness",
        tier: "platinum",
        title: "Perfectionist",
        description: "Complete 5 perfect workouts (100% completion)",
        icon: "💯",
        color: "#E5E4E2",
        requirements: [
          { type: "custom", target: 5, metadata: { completion: "100%" } },
        ],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Perfect Badge",
        },
      },

      // Variety
      {
        id: "workout_explorer",
        category: "fitness",
        tier: "silver",
        title: "Workout Explorer",
        description: "Try all 5 workout types",
        icon: "🗺️",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 5, metadata: { variety: "all_types" } },
        ],
        reward: {
          type: "fitcoins",
          value: 180,
          description: "180 FitCoins + Explorer Title",
        },
      },
    ];
  }

  /**
   * NUTRITION ACHIEVEMENTS (20 badges)
   */
  private createNutritionAchievements(): Achievement[] {
    return [
      // Logging
      {
        id: "nutrition_newbie",
        category: "nutrition",
        tier: "bronze",
        title: "Nutrition Newbie",
        description: "Log your first meal",
        icon: "🍎",
        color: "#CD7F32",
        requirements: [{ type: "nutrition_log", target: 1 }],
        reward: { type: "fitcoins", value: 25, description: "25 FitCoins" },
      },
      {
        id: "food_tracker",
        category: "nutrition",
        tier: "silver",
        title: "Food Tracker",
        description: "Log meals for 7 consecutive days",
        icon: "📝",
        color: "#C0C0C0",
        requirements: [
          { type: "nutrition_log", target: 7, timeframe: "daily" },
        ],
        reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
      },
      {
        id: "nutrition_master",
        category: "nutrition",
        tier: "gold",
        title: "Nutrition Master",
        description: "Log meals for 30 days",
        icon: "🏆🍽️",
        color: "#FFD700",
        requirements: [
          { type: "nutrition_log", target: 30, timeframe: "daily" },
        ],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Master Chef Title",
        },
      },

      // Water Intake
      {
        id: "hydration_hero",
        category: "nutrition",
        tier: "bronze",
        title: "Hydration Hero",
        description: "Reach daily water goal 5 times",
        icon: "💧",
        color: "#CD7F32",
        requirements: [{ type: "water_intake", target: 5 }],
        reward: { type: "fitcoins", value: 60, description: "60 FitCoins" },
      },
      {
        id: "aqua_champion",
        category: "nutrition",
        tier: "gold",
        title: "Aqua Champion",
        description: "Reach daily water goal 30 times",
        icon: "🌊",
        color: "#FFD700",
        requirements: [{ type: "water_intake", target: 30 }],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Ocean Theme",
        },
      },

      // Macro Goals
      {
        id: "protein_power",
        category: "nutrition",
        tier: "silver",
        title: "Protein Power",
        description: "Hit protein goal 10 times",
        icon: "🥩",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 10, metadata: { macro: "protein" } },
        ],
        reward: { type: "fitcoins", value: 120, description: "120 FitCoins" },
      },
      {
        id: "carb_crusher",
        category: "nutrition",
        tier: "silver",
        title: "Carb Crusher",
        description: "Hit carb goal 10 times",
        icon: "🍞",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 10, metadata: { macro: "carbs" } },
        ],
        reward: { type: "fitcoins", value: 120, description: "120 FitCoins" },
      },
      {
        id: "fat_fighter",
        category: "nutrition",
        tier: "silver",
        title: "Fat Fighter",
        description: "Hit healthy fat goal 10 times",
        icon: "🥑",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 10, metadata: { macro: "fat" } },
        ],
        reward: { type: "fitcoins", value: 120, description: "120 FitCoins" },
      },
      {
        id: "macro_master",
        category: "nutrition",
        tier: "platinum",
        title: "Macro Master",
        description: "Hit all macro goals in one day, 15 times",
        icon: "📊",
        color: "#E5E4E2",
        requirements: [
          { type: "custom", target: 15, metadata: { macro: "all_three" } },
        ],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Nutrition Expert Title",
        },
      },

      // Healthy Choices
      {
        id: "veggie_lover",
        category: "nutrition",
        tier: "bronze",
        title: "Veggie Lover",
        description: "Log 50 servings of vegetables",
        icon: "🥬",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 50, metadata: { food_type: "vegetables" } },
        ],
        reward: { type: "fitcoins", value: 80, description: "80 FitCoins" },
      },
      {
        id: "fruit_fanatic",
        category: "nutrition",
        tier: "bronze",
        title: "Fruit Fanatic",
        description: "Log 30 servings of fruit",
        icon: "🍓",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 30, metadata: { food_type: "fruits" } },
        ],
        reward: { type: "fitcoins", value: 70, description: "70 FitCoins" },
      },
      {
        id: "whole_grain_warrior",
        category: "nutrition",
        tier: "silver",
        title: "Whole Grain Warrior",
        description: "Log 25 servings of whole grains",
        icon: "🌾",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 25,
            metadata: { food_type: "whole_grains" },
          },
        ],
        reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
      },

      // Special Diets
      {
        id: "plant_based_pro",
        category: "nutrition",
        tier: "gold",
        title: "Plant-Based Pro",
        description: "Log 30 plant-based meals",
        icon: "🌱",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 30,
            metadata: { diet_type: "plant_based" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Green Theme",
        },
      },
      {
        id: "keto_king",
        category: "nutrition",
        tier: "gold",
        title: "Keto King",
        description: "Log 20 keto-friendly meals",
        icon: "🥓",
        color: "#FFD700",
        requirements: [
          { type: "custom", target: 20, metadata: { diet_type: "keto" } },
        ],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Keto Crown",
        },
      },

      // Meal Prep
      {
        id: "meal_prep_rookie",
        category: "nutrition",
        tier: "bronze",
        title: "Meal Prep Rookie",
        description: "Prep meals in advance 5 times",
        icon: "🍱",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 5, metadata: { meal_type: "prepped" } },
        ],
        reward: { type: "fitcoins", value: 75, description: "75 FitCoins" },
      },
      {
        id: "prep_master",
        category: "nutrition",
        tier: "platinum",
        title: "Prep Master",
        description: "Prep meals in advance 50 times",
        icon: "👨‍🍳",
        color: "#E5E4E2",
        requirements: [
          { type: "custom", target: 50, metadata: { meal_type: "prepped" } },
        ],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Chef Title",
        },
      },

      // Cooking
      {
        id: "home_chef",
        category: "nutrition",
        tier: "silver",
        title: "Home Chef",
        description: "Cook 25 meals at home",
        icon: "🍳",
        color: "#C0C0C0",
        requirements: [
          { type: "custom", target: 25, metadata: { meal_source: "homemade" } },
        ],
        reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
      },

      // Mindful Eating
      {
        id: "mindful_eater",
        category: "nutrition",
        tier: "gold",
        title: "Mindful Eater",
        description: "Complete 20 mindful eating sessions",
        icon: "🧘‍♂️🍽️",
        color: "#FFD700",
        requirements: [
          { type: "custom", target: 20, metadata: { eating_style: "mindful" } },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Mindfulness Badge",
        },
      },

      // Calorie Control
      {
        id: "calorie_counter",
        category: "nutrition",
        tier: "silver",
        title: "Calorie Counter",
        description: "Stay within calorie goals for 10 days",
        icon: "🔢",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 10,
            metadata: { goal_type: "calorie_within_range" },
          },
        ],
        reward: { type: "fitcoins", value: 140, description: "140 FitCoins" },
      },
    ];
  }

  /**
   * CONSISTENCY ACHIEVEMENTS (15 badges)
   */
  private createConsistencyAchievements(): Achievement[] {
    return [
      {
        id: "consistent_starter",
        category: "consistency",
        tier: "bronze",
        title: "Consistent Starter",
        description: "Use FitAI for 7 consecutive days",
        icon: "📅",
        color: "#CD7F32",
        requirements: [{ type: "consistency_days", target: 7 }],
        reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
      },
      {
        id: "habit_builder",
        category: "consistency",
        tier: "silver",
        title: "Habit Builder",
        description: "Use FitAI for 30 consecutive days",
        icon: "🏗️",
        color: "#C0C0C0",
        requirements: [{ type: "consistency_days", target: 30 }],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Builder Title",
        },
      },
      {
        id: "dedication_master",
        category: "consistency",
        tier: "gold",
        title: "Dedication Master",
        description: "Use FitAI for 100 consecutive days",
        icon: "💎",
        color: "#FFD700",
        requirements: [{ type: "consistency_days", target: 100 }],
        reward: {
          type: "premium_trial",
          value: 30,
          description: "30-day Premium Trial",
        },
      },
      {
        id: "lifestyle_champion",
        category: "consistency",
        tier: "legendary",
        title: "Lifestyle Champion",
        description: "Use FitAI for 365 consecutive days",
        icon: "🏆👑",
        color: "#FF6B6B",
        requirements: [{ type: "consistency_days", target: 365 }],
        reward: {
          type: "title",
          value: "Lifetime Champion",
          description: "Exclusive Lifetime Champion Title + 1000 FitCoins",
        },
      },

      // Weekly Consistency
      {
        id: "weekly_warrior",
        category: "consistency",
        tier: "bronze",
        title: "Weekly Warrior",
        description: "Complete all weekly goals for 4 weeks",
        icon: "🗓️",
        color: "#CD7F32",
        requirements: [
          {
            type: "custom",
            target: 4,
            metadata: { goal_type: "weekly_complete" },
          },
        ],
        reward: { type: "fitcoins", value: 200, description: "200 FitCoins" },
      },
      {
        id: "monthly_master",
        category: "consistency",
        tier: "gold",
        title: "Monthly Master",
        description: "Complete all monthly goals for 3 months",
        icon: "🗓️✨",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 3,
            metadata: { goal_type: "monthly_complete" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Master Title",
        },
      },

      // Activity Consistency
      {
        id: "workout_rhythm",
        category: "consistency",
        tier: "silver",
        title: "Workout Rhythm",
        description: "Work out 3+ times per week for 8 weeks",
        icon: "🎵",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 8,
            metadata: { activity: "workout_3x_week" },
          },
        ],
        reward: { type: "fitcoins", value: 250, description: "250 FitCoins" },
      },
      {
        id: "nutrition_rhythm",
        category: "consistency",
        tier: "silver",
        title: "Nutrition Rhythm",
        description: "Log meals daily for 4 weeks straight",
        icon: "🍽️🎵",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 28,
            metadata: { activity: "daily_nutrition_log" },
          },
        ],
        reward: { type: "fitcoins", value: 220, description: "220 FitCoins" },
      },

      // Time-based Consistency
      {
        id: "morning_person",
        category: "consistency",
        tier: "bronze",
        title: "Morning Person",
        description: "Check in before 9 AM for 14 days",
        icon: "🌅",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 14, metadata: { time: "morning_checkin" } },
        ],
        reward: {
          type: "fitcoins",
          value: 120,
          description: "120 FitCoins + Early Bird Theme",
        },
      },
      {
        id: "night_owl",
        category: "consistency",
        tier: "bronze",
        title: "Night Owl",
        description: "Log evening progress for 14 days",
        icon: "🦉",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 14, metadata: { time: "evening_checkin" } },
        ],
        reward: {
          type: "fitcoins",
          value: 120,
          description: "120 FitCoins + Night Theme",
        },
      },

      // Recovery Consistency
      {
        id: "rest_master",
        category: "consistency",
        tier: "silver",
        title: "Rest Master",
        description: "Take scheduled rest days for 4 weeks",
        icon: "😴",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 4,
            metadata: { activity: "rest_days_taken" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 180,
          description: "180 FitCoins + Rest Guru Title",
        },
      },

      // Goal Consistency
      {
        id: "goal_getter",
        category: "consistency",
        tier: "gold",
        title: "Goal Getter",
        description: "Hit daily goals 50 times",
        icon: "🎯",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 50,
            metadata: { achievement: "daily_goals" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 350,
          description: "350 FitCoins + Target Master Title",
        },
      },

      // Perfect Weeks
      {
        id: "perfect_week",
        category: "consistency",
        tier: "gold",
        title: "Perfect Week",
        description: "Complete a perfect week (all goals met)",
        icon: "⭐",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 1,
            metadata: { achievement: "perfect_week" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Perfect Star",
        },
      },

      // Comeback
      {
        id: "comeback_king",
        category: "consistency",
        tier: "silver",
        title: "Comeback King",
        description: "Return after a break and maintain 14-day streak",
        icon: "🔄",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 1,
            metadata: { achievement: "comeback_streak" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Resilience Badge",
        },
      },
    ];
  }

  // Continue with remaining achievement categories...
  /**
   * SOCIAL ACHIEVEMENTS (12 badges)
   */
  private createSocialAchievements(): Achievement[] {
    return [
      {
        id: "social_butterfly",
        category: "social",
        tier: "bronze",
        title: "Social Butterfly",
        description: "Add your first friend",
        icon: "👥",
        color: "#CD7F32",
        requirements: [{ type: "friend_count", target: 1 }],
        reward: { type: "fitcoins", value: 50, description: "50 FitCoins" },
      },
      {
        id: "squad_leader",
        category: "social",
        tier: "silver",
        title: "Squad Leader",
        description: "Have 10 fitness friends",
        icon: "👥💪",
        color: "#C0C0C0",
        requirements: [{ type: "friend_count", target: 10 }],
        reward: {
          type: "fitcoins",
          value: 150,
          description: "150 FitCoins + Leader Badge",
        },
      },
      {
        id: "community_champion",
        category: "social",
        tier: "gold",
        title: "Community Champion",
        description: "Have 25 fitness friends",
        icon: "🏆👥",
        color: "#FFD700",
        requirements: [{ type: "friend_count", target: 25 }],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Champion Title",
        },
      },
      {
        id: "motivator",
        category: "social",
        tier: "bronze",
        title: "Motivator",
        description: "Give 10 workout kudos",
        icon: "👍",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 10, metadata: { activity: "kudos_given" } },
        ],
        reward: { type: "fitcoins", value: 60, description: "60 FitCoins" },
      },
      {
        id: "encourager",
        category: "social",
        tier: "silver",
        title: "Encourager",
        description: "Leave 25 motivational comments",
        icon: "💬",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 25,
            metadata: { activity: "comments_posted" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 125,
          description: "125 FitCoins + Encourager Badge",
        },
      },
      {
        id: "inspiration",
        category: "social",
        tier: "gold",
        title: "Inspiration",
        description: "Receive 50 workout kudos",
        icon: "✨",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 50,
            metadata: { activity: "kudos_received" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Inspiration Title",
        },
      },
      {
        id: "challenge_creator",
        category: "social",
        tier: "silver",
        title: "Challenge Creator",
        description: "Create 5 friend challenges",
        icon: "🎯",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 5,
            metadata: { activity: "challenges_created" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 150,
          description: "150 FitCoins + Creator Badge",
        },
      },
      {
        id: "workout_buddy",
        category: "social",
        tier: "bronze",
        title: "Workout Buddy",
        description: "Complete 5 workouts with friends",
        icon: "🤝💪",
        color: "#CD7F32",
        requirements: [
          {
            type: "custom",
            target: 5,
            metadata: { activity: "friend_workouts" },
          },
        ],
        reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
      },
      {
        id: "team_player",
        category: "social",
        tier: "gold",
        title: "Team Player",
        description: "Join 3 group challenges",
        icon: "⚽",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 3,
            metadata: { activity: "group_challenges" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Team Title",
        },
      },
      {
        id: "leaderboard_star",
        category: "social",
        tier: "platinum",
        title: "Leaderboard Star",
        description: "Reach #1 on weekly leaderboard",
        icon: "⭐👑",
        color: "#E5E4E2",
        requirements: [
          {
            type: "custom",
            target: 1,
            metadata: { activity: "leaderboard_first" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Star Title",
        },
      },
      {
        id: "mentor",
        category: "social",
        tier: "gold",
        title: "Mentor",
        description: "Help 10 new users with their fitness journey",
        icon: "🎓",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 10,
            metadata: { activity: "mentored_users" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Mentor Title",
        },
      },
      {
        id: "viral_star",
        category: "social",
        tier: "legendary",
        title: "Viral Star",
        description: "Get 100 likes on a workout post",
        icon: "🔥📱",
        color: "#FF6B6B",
        requirements: [
          { type: "custom", target: 100, metadata: { activity: "post_likes" } },
        ],
        reward: {
          type: "title",
          value: "Viral Sensation",
          description: "Exclusive Viral Star Title + 750 FitCoins",
        },
      },
    ];
  }

  /**
   * MILESTONE ACHIEVEMENTS (15 badges)
   */
  private createMilestoneAchievements(): Achievement[] {
    return [
      {
        id: "first_week",
        category: "milestone",
        tier: "bronze",
        title: "First Week",
        description: "Complete your first week on FitAI",
        icon: "📅",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 7, metadata: { milestone: "days_active" } },
        ],
        reward: {
          type: "fitcoins",
          value: 100,
          description: "100 FitCoins + Welcome Badge",
        },
      },
      {
        id: "first_month",
        category: "milestone",
        tier: "silver",
        title: "First Month",
        description: "Complete your first month on FitAI",
        icon: "🗓️",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 30,
            metadata: { milestone: "days_active" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Monthly Member Badge",
        },
      },
      {
        id: "veteran",
        category: "milestone",
        tier: "gold",
        title: "Veteran",
        description: "Complete 6 months on FitAI",
        icon: "🏅",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 180,
            metadata: { milestone: "days_active" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Veteran Title",
        },
      },
      {
        id: "anniversary",
        category: "milestone",
        tier: "platinum",
        title: "Anniversary",
        description: "Complete your first year on FitAI",
        icon: "🎂",
        color: "#E5E4E2",
        requirements: [
          {
            type: "custom",
            target: 365,
            metadata: { milestone: "days_active" },
          },
        ],
        reward: {
          type: "premium_trial",
          value: 60,
          description: "60-day Premium Trial + Anniversary Badge",
        },
      },
      {
        id: "hundred_workouts",
        category: "milestone",
        tier: "gold",
        title: "Century Club",
        description: "Complete 100 workouts",
        icon: "💯",
        color: "#FFD700",
        requirements: [{ type: "workout_count", target: 100 }],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Century Title",
        },
      },
      {
        id: "thousand_calories",
        category: "milestone",
        tier: "silver",
        title: "Calorie Crusher",
        description: "Burn 1,000 calories in total",
        icon: "🔥",
        color: "#C0C0C0",
        requirements: [{ type: "calories_burned", target: 1000 }],
        reward: { type: "fitcoins", value: 150, description: "150 FitCoins" },
      },
      {
        id: "ten_thousand_calories",
        category: "milestone",
        tier: "platinum",
        title: "Inferno Master",
        description: "Burn 10,000 calories in total",
        icon: "🌋",
        color: "#E5E4E2",
        requirements: [{ type: "calories_burned", target: 10000 }],
        reward: {
          type: "fitcoins",
          value: 600,
          description: "600 FitCoins + Inferno Title",
        },
      },
      {
        id: "weight_goal_achieved",
        category: "milestone",
        tier: "legendary",
        title: "Goal Crusher",
        description: "Achieve your weight goal",
        icon: "🎯✨",
        color: "#FF6B6B",
        requirements: [{ type: "weight_goal", target: 1 }],
        reward: {
          type: "title",
          value: "Goal Crusher",
          description: "Exclusive Goal Crusher Title + 1000 FitCoins",
        },
      },
      {
        id: "half_marathon_distance",
        category: "milestone",
        tier: "gold",
        title: "Half Marathon Hero",
        description: "Walk/Run a total of 21.1km",
        icon: "🏃‍♂️",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 21100,
            metadata: { milestone: "total_distance_meters" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 350,
          description: "350 FitCoins + Runner Badge",
        },
      },
      {
        id: "marathon_distance",
        category: "milestone",
        tier: "legendary",
        title: "Marathon Legend",
        description: "Walk/Run a total of 42.2km",
        icon: "🏃‍♂️👑",
        color: "#FF6B6B",
        requirements: [
          {
            type: "custom",
            target: 42200,
            metadata: { milestone: "total_distance_meters" },
          },
        ],
        reward: {
          type: "title",
          value: "Marathon Legend",
          description: "Exclusive Marathon Legend Title + 800 FitCoins",
        },
      },
      {
        id: "strength_milestone",
        category: "milestone",
        tier: "platinum",
        title: "Strength Milestone",
        description: "Complete 50 strength training workouts",
        icon: "💪",
        color: "#E5E4E2",
        requirements: [
          {
            type: "custom",
            target: 50,
            metadata: { workout_type: "strength" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Strength Title",
        },
      },
      {
        id: "cardio_milestone",
        category: "milestone",
        tier: "platinum",
        title: "Cardio Milestone",
        description: "Complete 50 cardio workouts",
        icon: "❤️",
        color: "#E5E4E2",
        requirements: [
          { type: "custom", target: 50, metadata: { workout_type: "cardio" } },
        ],
        reward: {
          type: "fitcoins",
          value: 400,
          description: "400 FitCoins + Cardio Title",
        },
      },
      {
        id: "flexibility_milestone",
        category: "milestone",
        tier: "gold",
        title: "Flexibility Milestone",
        description: "Complete 25 flexibility/yoga sessions",
        icon: "🧘‍♀️",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 25,
            metadata: { workout_type: "flexibility" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Zen Badge",
        },
      },
      {
        id: "nutrition_milestone",
        category: "milestone",
        tier: "gold",
        title: "Nutrition Milestone",
        description: "Log 200 meals",
        icon: "🍽️",
        color: "#FFD700",
        requirements: [{ type: "nutrition_log", target: 200 }],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Nutrition Badge",
        },
      },
      {
        id: "progress_photo_milestone",
        category: "milestone",
        tier: "silver",
        title: "Progress Tracker",
        description: "Upload 10 progress photos",
        icon: "📸",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 10,
            metadata: { milestone: "progress_photos" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 120,
          description: "120 FitCoins + Tracker Badge",
        },
      },
    ];
  }

  /**
   * STREAK ACHIEVEMENTS (10 badges)
   */
  private createStreakAchievements(): Achievement[] {
    return [
      {
        id: "workout_streak_7",
        category: "streak",
        tier: "bronze",
        title: "Week Warrior",
        description: "7-day workout streak",
        icon: "🔥",
        color: "#CD7F32",
        requirements: [{ type: "workout_streak", target: 7 }],
        reward: {
          type: "fitcoins",
          value: 150,
          description: "150 FitCoins + Streak Badge",
        },
      },
      {
        id: "workout_streak_14",
        category: "streak",
        tier: "silver",
        title: "Fortnight Fighter",
        description: "14-day workout streak",
        icon: "🔥🔥",
        color: "#C0C0C0",
        requirements: [{ type: "workout_streak", target: 14 }],
        reward: {
          type: "fitcoins",
          value: 250,
          description: "250 FitCoins + Fighter Title",
        },
      },
      {
        id: "workout_streak_30",
        category: "streak",
        tier: "gold",
        title: "Monthly Machine",
        description: "30-day workout streak",
        icon: "🔥🔥🔥",
        color: "#FFD700",
        requirements: [{ type: "workout_streak", target: 30 }],
        reward: {
          type: "fitcoins",
          value: 500,
          description: "500 FitCoins + Machine Title",
        },
      },
      {
        id: "workout_streak_100",
        category: "streak",
        tier: "legendary",
        title: "Unstoppable Force",
        description: "100-day workout streak",
        icon: "⚡🔥",
        color: "#FF6B6B",
        requirements: [{ type: "workout_streak", target: 100 }],
        reward: {
          type: "title",
          value: "Unstoppable Force",
          description: "Exclusive Legendary Title + 1200 FitCoins",
        },
      },
      {
        id: "nutrition_streak_14",
        category: "streak",
        tier: "silver",
        title: "Nutrition Navigator",
        description: "14-day nutrition logging streak",
        icon: "🥗",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 14,
            metadata: { streak_type: "nutrition_log" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 180,
          description: "180 FitCoins + Navigator Badge",
        },
      },
      {
        id: "water_streak_21",
        category: "streak",
        tier: "gold",
        title: "Hydration Hero",
        description: "21-day water goal streak",
        icon: "💧",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 21,
            metadata: { streak_type: "water_goal" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 300,
          description: "300 FitCoins + Hero Badge",
        },
      },
      {
        id: "sleep_streak_14",
        category: "streak",
        tier: "silver",
        title: "Sleep Scholar",
        description: "14-day sleep goal streak",
        icon: "😴",
        color: "#C0C0C0",
        requirements: [
          {
            type: "custom",
            target: 14,
            metadata: { streak_type: "sleep_goal" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 200,
          description: "200 FitCoins + Scholar Badge",
        },
      },
      {
        id: "step_streak_7",
        category: "streak",
        tier: "bronze",
        title: "Step Master",
        description: "7-day step goal streak",
        icon: "👣",
        color: "#CD7F32",
        requirements: [
          { type: "custom", target: 7, metadata: { streak_type: "step_goal" } },
        ],
        reward: { type: "fitcoins", value: 100, description: "100 FitCoins" },
      },
      {
        id: "perfect_week_streak",
        category: "streak",
        tier: "platinum",
        title: "Perfect Streak",
        description: "3 consecutive perfect weeks",
        icon: "⭐",
        color: "#E5E4E2",
        requirements: [
          {
            type: "custom",
            target: 3,
            metadata: { streak_type: "perfect_week" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 600,
          description: "600 FitCoins + Perfect Title",
        },
      },
      {
        id: "comeback_streak",
        category: "streak",
        tier: "gold",
        title: "Phoenix Rising",
        description: "Start a 10-day streak after breaking a long streak",
        icon: "🔥🔄",
        color: "#FFD700",
        requirements: [
          {
            type: "custom",
            target: 1,
            metadata: { streak_type: "comeback_10" },
          },
        ],
        reward: {
          type: "fitcoins",
          value: 350,
          description: "350 FitCoins + Phoenix Badge",
        },
      },
    ];
  }

  /**
   * CHALLENGE ACHIEVEMENTS (8 badges)
   */
  private createChallengeAchievements(): Achievement[] {
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
          {
            type: "custom",
            target: 1,
            metadata: { challenge_type: "ultimate" },
          },
        ],
        reward: {
          type: "title",
          value: "Ultimate Challenger",
          description: "Exclusive Ultimate Title + 1000 FitCoins",
        },
      },
    ];
  }

  /**
   * EXPLORATION ACHIEVEMENTS (8 badges)
   */
  private createExplorationAchievements(): Achievement[] {
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
          {
            type: "custom",
            target: 25,
            metadata: { exploration: "ai_recipes" },
          },
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

  /**
   * WELLNESS ACHIEVEMENTS (12 badges)
   */
  private createWellnessAchievements(): Achievement[] {
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
          {
            type: "custom",
            target: 15,
            metadata: { exercise_type: "posture" },
          },
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
          {
            type: "custom",
            target: 30,
            metadata: { exercise_type: "mobility" },
          },
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

  /**
   * SPECIAL/SECRET ACHIEVEMENTS (10 badges)
   */
  private createSpecialAchievements(): Achievement[] {
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
          {
            type: "custom",
            target: 10,
            metadata: { activity: "complete_day" },
          },
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

  /**
   * Load user achievement progress from storage
   */
  private async loadUserAchievements(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.USER_ACHIEVEMENTS_KEY);
      if (stored) {
        const achievements = JSON.parse(stored);
        this.userAchievements = new Map(achievements);
      }
    } catch (error) {
      console.error("❌ Error loading user achievements:", error);
    }
  }

  /**
   * Save user achievement progress to storage
   */
  private async saveUserAchievements(): Promise<void> {
    try {
      const achievements: [string, UserAchievement][] = [];
      this.userAchievements.forEach((value, key) => {
        achievements.push([key, value]);
      });
      await AsyncStorage.setItem(
        this.USER_ACHIEVEMENTS_KEY,
        JSON.stringify(achievements),
      );
    } catch (error) {
      console.error("❌ Error saving user achievements:", error);
    }
  }

  /**
   * Check and update achievement progress
   */
  async checkAchievements(
    userId: string,
    activityData: Record<string, any>,
  ): Promise<UserAchievement[]> {
    if (!this.isInitialized) {
      console.warn("⚠️ Achievement engine not initialized");
      return [];
    }

    const newlyUnlocked: UserAchievement[] = [];

    for (const achievement of this.achievements) {
      const userAchievement = this.getUserAchievement(userId, achievement.id);

      if (userAchievement.isCompleted) continue;

      const progress = this.calculateProgress(achievement, activityData);
      const maxProgress = this.getMaxProgress(achievement);

      if (progress >= maxProgress && !userAchievement.isCompleted) {
        // Achievement unlocked!
        userAchievement.progress = maxProgress;
        userAchievement.isCompleted = true;
        userAchievement.unlockedAt = new Date().toISOString();

        this.userAchievements.set(
          `${userId}-${achievement.id}`,
          userAchievement,
        );
        newlyUnlocked.push(userAchievement);

        // Emit achievement unlocked event
        this.emit("achievementUnlocked", achievement, userAchievement);

        console.log(
          `🏆 Achievement unlocked: ${achievement.title} for user ${userId}`,
        );
      } else if (progress > userAchievement.progress) {
        // Progress updated
        userAchievement.progress = progress;
        this.userAchievements.set(
          `${userId}-${achievement.id}`,
          userAchievement,
        );
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.saveUserAchievements();
    }

    return newlyUnlocked;
  }

  /**
   * Get user's achievement progress
   */
  private getUserAchievement(
    userId: string,
    achievementId: string,
  ): UserAchievement {
    const key = `${userId}-${achievementId}`;
    const existing = this.userAchievements.get(key);

    if (existing) return existing;

    const newUserAchievement: UserAchievement = {
      id: key,
      achievementId,
      userId,
      unlockedAt: "",
      progress: 0,
      maxProgress: this.getMaxProgress(
        this.achievements.find((a) => a.id === achievementId)!,
      ),
      isCompleted: false,
      celebrationShown: false,
    };

    this.userAchievements.set(key, newUserAchievement);
    return newUserAchievement;
  }

  /**
   * Calculate achievement progress based on activity data
   */
  private calculateProgress(
    achievement: Achievement,
    activityData: Record<string, any>,
  ): number {
    // Implementation depends on achievement requirements
    const requirement = achievement.requirements[0]; // Simplified for now

    switch (requirement.type) {
      case "workout_count":
        return activityData.totalWorkouts || 0;
      case "calories_burned":
        return activityData.totalCalories || 0;
      case "nutrition_log":
        return activityData.nutritionLogs || 0;
      case "water_intake":
        return activityData.waterGoalsHit || 0;
      case "consistency_days":
        return activityData.consistentDays || 0;
      default:
        return 0;
    }
  }

  /**
   * Get maximum progress needed for achievement
   */
  private getMaxProgress(achievement: Achievement): number {
    return achievement.requirements[0]?.target || 1;
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return this.achievements;
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.achievements.filter((a) => a.category === category);
  }

  /**
   * Get user's completed achievements
   */
  getUserCompletedAchievements(userId: string): UserAchievement[] {
    return Array.from(this.userAchievements.values()).filter(
      (ua) => ua.userId === userId && ua.isCompleted,
    );
  }

  /**
   * Get user's achievement progress
   */
  getUserAchievementProgress(userId: string): Map<string, UserAchievement> {
    const userProgress = new Map<string, UserAchievement>();

    this.userAchievements.forEach((achievement, key) => {
      if (achievement.userId === userId) {
        userProgress.set(achievement.achievementId, achievement);
      }
    });

    return userProgress;
  }

  /**
   * Get achievement statistics for user
   */
  getUserAchievementStats(userId: string): {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    totalFitCoinsEarned: number;
    byTier: Record<AchievementTier, number>;
    byCategory: Record<AchievementCategory, number>;
  } {
    const userAchievements = this.getUserCompletedAchievements(userId);
    const total = this.achievements.length;
    const completed = userAchievements.length;
    const inProgress = total - completed;

    const byTier: Record<AchievementTier, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      legendary: 0,
    };

    const byCategory: Record<AchievementCategory, number> = {
      fitness: 0,
      nutrition: 0,
      consistency: 0,
      social: 0,
      milestone: 0,
      streak: 0,
      challenge: 0,
      exploration: 0,
      wellness: 0,
      special: 0,
    };

    let totalFitCoinsEarned = 0;

    userAchievements.forEach((ua) => {
      const achievement = this.achievements.find(
        (a) => a.id === ua.achievementId,
      );
      if (achievement) {
        byTier[achievement.tier]++;
        byCategory[achievement.category]++;

        if (achievement.reward.type === "fitcoins") {
          totalFitCoinsEarned += achievement.reward.value as number;
        }
      }
    });

    return {
      total,
      completed,
      inProgress,
      completionRate: Math.round((completed / total) * 100),
      totalFitCoinsEarned,
      byTier,
      byCategory,
    };
  }
}

export const achievementEngine = new AchievementEngine();
export default achievementEngine;
