// Achievement Engine — re-exports types and provides a minimal engine stub
// The full badge-creation modules were removed as dead code.
// Types are preserved in ./achievements/types.ts for consumers.

export type {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
  AchievementRequirement,
  AchievementReward,
} from "./achievements/types";

import type {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
} from "./achievements/types";

class AchievementEngine {
  private achievements: Achievement[] = [];
  private userAchievements: Map<string, UserAchievement> = new Map();

  // Stub event emitter methods (original extended EventEmitter)
  on(_event: string, _listener: (...args: any[]) => void): void {}
  removeAllListeners(_event?: string): void {}

  async initialize(): Promise<void> {
    // No-op: badge modules removed
  }

  async checkAchievements(
    _userId: string,
    _activityData: Record<string, any>,
  ): Promise<UserAchievement[]> {
    return [];
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
    this.userAchievements.forEach((achievement) => {
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

    const byTier: Record<AchievementTier, number> = {
      bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0, legendary: 0,
    };

    const byCategory: Record<AchievementCategory, number> = {
      fitness: 0, nutrition: 0, consistency: 0, social: 0, milestone: 0,
      streak: 0, challenge: 0, exploration: 0, wellness: 0, special: 0,
    };

    return {
      total,
      completed,
      inProgress: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalFitCoinsEarned: 0,
      byTier,
      byCategory,
    };
  }
}

export const achievementEngine = new AchievementEngine();
export default achievementEngine;
