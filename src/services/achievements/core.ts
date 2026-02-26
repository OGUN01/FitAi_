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
        this.emit("achievementUnlocked", achievement, userAchievement);
      } else if (progress > userAchievement.progress) {
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
