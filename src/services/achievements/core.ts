import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "../../utils/EventEmitter";
import {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
} from "./types";
import {
  createFitnessAchievements,
  createNutritionAchievements,
} from "./fitnessBadges";
import {
  createConsistencyAchievements,
  createSocialAchievements,
} from "./consistencyBadges";
import {
  createMilestoneAchievements,
  createStreakAchievements,
} from "./milestoneBadges";
import {
  createChallengeAchievements,
  createExplorationAchievements,
  createWellnessAchievements,
  createSpecialAchievements,
} from "./specialBadges";

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

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAchievements();
      await this.loadUserAchievements();
    }
  }

  private async initializeAchievements(): Promise<void> {
    this.achievements = [
      ...createFitnessAchievements(),
      ...createNutritionAchievements(),
      ...createConsistencyAchievements(),
      // DISABLED: Social achievement badges disabled until social features are implemented
      // Investigation (2026-02-06): 12 social badges exist but are unreachable (no friend system, leaderboards, kudos, challenges)
      // To re-enable: Uncomment line below + implement social UI features
      // See: .sisyphus/notepads/ui-backend-gap-fixes/decisions.md
      // ...createSocialAchievements(),
      ...createMilestoneAchievements(),
      ...createStreakAchievements(),
      ...createChallengeAchievements(),
      ...createExplorationAchievements(),
      ...createWellnessAchievements(),
      ...createSpecialAchievements(),
    ];

    await this.loadUserAchievements();
    this.isInitialized = true;
  }

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

  async checkAchievements(
    userId: string,
    activityData: Record<string, any>,
  ): Promise<UserAchievement[]> {
    if (!this.isInitialized) {
      return [];
    }

    const newlyUnlocked: UserAchievement[] = [];
    let didUpdateProgress = false;

    for (const achievement of this.achievements) {
      const userAchievement = this.getUserAchievement(userId, achievement.id);
      if (userAchievement.isCompleted) continue;

      const progress = this.calculateProgress(achievement, activityData);
      const maxProgress = this.getMaxProgress(achievement);

      if (progress >= maxProgress && !userAchievement.isCompleted) {
        userAchievement.progress = maxProgress;
        userAchievement.isCompleted = true;
        userAchievement.unlockedAt = new Date().toISOString();
        this.userAchievements.set(
          `${userId}-${achievement.id}`,
          userAchievement,
        );
        newlyUnlocked.push(userAchievement);
        didUpdateProgress = true;
        this.emit("achievementUnlocked", achievement, userAchievement);
      } else if (progress > userAchievement.progress) {
        userAchievement.progress = progress;
        this.userAchievements.set(
          `${userId}-${achievement.id}`,
          userAchievement,
        );
        didUpdateProgress = true;
      }
    }

    if (didUpdateProgress) {
      await this.saveUserAchievements();
    }

    return newlyUnlocked;
  }

  private getUserAchievement(
    userId: string,
    achievementId: string,
  ): UserAchievement {
    const key = `${userId}-${achievementId}`;
    const existing = this.userAchievements.get(key);
    if (existing) return existing;

    const found = this.achievements.find((a) => a.id === achievementId);

    const newUserAchievement: UserAchievement = {
      id: key,
      achievementId,
      userId,
      unlockedAt: "",
      progress: 0,
      maxProgress: found ? this.getMaxProgress(found) : 1,
      isCompleted: false,
      celebrationShown: false,
    };

    this.userAchievements.set(key, newUserAchievement);
    return newUserAchievement;
  }

  private calculateProgress(
    achievement: Achievement,
    activityData: Record<string, any>,
  ): number {
    const requirement = achievement.requirements?.[0];
    if (!requirement) return 0;

    const metadata = requirement.metadata || {};

    switch (requirement.type) {
      case "workout_count":
        return activityData.totalWorkouts || 0;
      case "workout_streak":
        return (
          activityData.workoutStreak ||
          activityData.currentStreak ||
          activityData.consistentDays ||
          0
        );
      case "calories_burned":
        return activityData.totalCalories || 0;
      case "weight_goal":
        return activityData.weightGoalAchieved ? 1 : 0;
      case "nutrition_log":
        return activityData.nutritionLogs || 0;
      case "water_intake":
        return activityData.waterGoalsHit || 0;
      case "sleep_hours":
        return (
          activityData.sleepGoalDays ||
          activityData.sleepHoursQualifiedDays ||
          activityData.sleepHours ||
          0
        );
      case "steps":
        return (
          activityData.stepGoalDays ||
          activityData.stepsQualifiedDays ||
          activityData.steps ||
          0
        );
      case "friend_count":
        return activityData.friendsCount || 0;
      case "challenge_wins":
        return activityData.challengesWon || 0;
      case "consistency_days":
        return activityData.consistentDays || 0;
      case "custom":
        if (metadata.workout_type) {
          return activityData.workoutTypeCounts?.[metadata.workout_type] || 0;
        }
        if (metadata.time_range === "before_8am") {
          return activityData.workoutsBefore8am || 0;
        }
        if (metadata.time === "before_6am") {
          return activityData.workoutsBefore6am || 0;
        }
        if (metadata.time === "after_10pm") {
          return activityData.workoutsAfter10pm || 0;
        }
        if (metadata.day_type === "weekend") {
          return activityData.weekendWorkouts || 0;
        }
        if (metadata.duration === "under_20min") {
          return activityData.quickWorkouts || 0;
        }
        if (metadata.duration === "over_60min") {
          return activityData.longWorkouts || 0;
        }
        if (metadata.completion === "100%") {
          return activityData.perfectWorkouts || 0;
        }
        if (metadata.variety === "all_types") {
          return activityData.uniqueWorkoutTypes || 0;
        }
        if (metadata.milestone === "days_active") {
          return activityData.activeDays || 0;
        }
        if (metadata.streak_type) {
          return activityData.streaks?.[metadata.streak_type] || 0;
        }
        if (metadata.equipment) {
          return activityData.equipmentCounts?.[metadata.equipment] || 0;
        }
        if (metadata.challenge_type) {
          return (
            activityData.challengeTypeCounts?.[metadata.challenge_type] || 0
          );
        }
        if (metadata.exploration) {
          return activityData.explorationCounts?.[metadata.exploration] || 0;
        }
        if (metadata.activity) {
          return activityData.activityCounts?.[metadata.activity] || 0;
        }
        if (metadata.exercise_type) {
          return activityData.exerciseTypeCounts?.[metadata.exercise_type] || 0;
        }
        if (metadata.food_type) {
          return activityData.foodTypeCounts?.[metadata.food_type] || 0;
        }
        if (metadata.diet_type) {
          return activityData.dietTypeCounts?.[metadata.diet_type] || 0;
        }
        if (metadata.meal_type) {
          return activityData.mealTypeCounts?.[metadata.meal_type] || 0;
        }
        if (metadata.meal_source) {
          return activityData.mealSourceCounts?.[metadata.meal_source] || 0;
        }
        if (metadata.eating_style) {
          return activityData.eatingStyleCounts?.[metadata.eating_style] || 0;
        }
        if (metadata.macro) {
          return activityData.macroCounts?.[metadata.macro] || 0;
        }
        if (metadata.date) {
          return activityData.dateCounts?.[metadata.date] || 0;
        }
        if (metadata.location) {
          return activityData.locationCounts?.[metadata.location] || 0;
        }
        return 0;
      default:
        return 0;
    }
  }

  private getMaxProgress(achievement: Achievement): number {
    return achievement.requirements[0]?.target || 1;
  }

  getAllAchievements(): Achievement[] {
    return this.achievements;
  }

  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.achievements.filter((a) => a.category === category);
  }

  getUserCompletedAchievements(userId: string): UserAchievement[] {
    return Array.from(this.userAchievements.values()).filter(
      (ua) => ua.userId === userId && ua.isCompleted,
    );
  }

  getUserAchievementProgress(userId: string): Map<string, UserAchievement> {
    const userProgress = new Map<string, UserAchievement>();
    this.userAchievements.forEach((achievement, key) => {
      if (achievement.userId === userId) {
        userProgress.set(achievement.achievementId, achievement);
      }
    });
    return userProgress;
  }

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
