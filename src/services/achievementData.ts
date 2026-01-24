// Achievement Data Service for Supabase Sync
// Provides cloud persistence for user achievements to prevent data loss on app reinstall

import { supabase } from "./supabase";
import { UserAchievement } from "./achievementEngine";

export interface AchievementSyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

class AchievementDataService {
  private static instance: AchievementDataService;

  static getInstance(): AchievementDataService {
    if (!AchievementDataService.instance) {
      AchievementDataService.instance = new AchievementDataService();
    }
    return AchievementDataService.instance;
  }

  /**
   * Save a user achievement to Supabase
   */
  async saveUserAchievement(
    userId: string,
    achievement: UserAchievement,
  ): Promise<boolean> {
    try {
      if (!userId || userId.startsWith("guest") || userId === "local-user") {
        console.log("⏭️ Skipping achievement sync for guest/local user");
        return true;
      }

      const { error } = await supabase.from("user_achievements").upsert({
        id: `${userId}_${achievement.achievementId}`,
        user_id: userId,
        achievement_id: achievement.achievementId,
        progress: achievement.progress,
        max_progress: achievement.maxProgress || 1,
        is_completed: achievement.isCompleted,
        unlocked_at: achievement.unlockedAt || null,
        celebration_shown: achievement.celebrationShown,
        fit_coins_earned: achievement.fitCoinsEarned || 0,
      });

      if (error) {
        console.warn(
          "⚠️ Failed to sync achievement to Supabase:",
          error.message,
        );
        return false;
      }

      console.log(
        `✅ Achievement synced to Supabase: ${achievement.achievementId}`,
      );
      return true;
    } catch (error) {
      console.error("❌ Achievement sync error:", error);
      return false;
    }
  }

  /**
   * Batch save all user achievements to Supabase
   */
  async saveAllAchievements(
    userId: string,
    achievements: Map<string, UserAchievement>,
  ): Promise<AchievementSyncResult> {
    const result: AchievementSyncResult = {
      success: true,
      synced: 0,
      errors: [],
    };

    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      console.log("⏭️ Skipping achievement batch sync for guest/local user");
      return result;
    }

    const achievementsArray = Array.from(achievements.values());

    for (const achievement of achievementsArray) {
      const success = await this.saveUserAchievement(userId, achievement);
      if (success) {
        result.synced++;
      } else {
        result.errors.push(`Failed to sync: ${achievement.achievementId}`);
        result.success = false;
      }
    }

    console.log(
      `📊 Achievement sync complete: ${result.synced}/${achievementsArray.length} synced`,
    );
    return result;
  }

  /**
   * Load user achievements from Supabase
   */
  async loadUserAchievements(
    userId: string,
  ): Promise<Map<string, UserAchievement>> {
    const achievementsMap = new Map<string, UserAchievement>();

    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      console.log("⏭️ Skipping achievement load for guest/local user");
      return achievementsMap;
    }

    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.warn(
          "⚠️ Failed to load achievements from Supabase:",
          error.message,
        );
        return achievementsMap;
      }

      if (data && data.length > 0) {
        for (const row of data) {
          const userAchievement: UserAchievement = {
            id: row.id,
            achievementId: row.achievement_id,
            userId: row.user_id,
            progress: row.progress,
            maxProgress: row.max_progress,
            isCompleted: row.is_completed,
            unlockedAt: row.unlocked_at || "",
            celebrationShown: row.celebration_shown,
            fitCoinsEarned: row.fit_coins_earned,
          };
          achievementsMap.set(row.achievement_id, userAchievement);
        }
        console.log(`✅ Loaded ${data.length} achievements from Supabase`);
      }
    } catch (error) {
      console.error("❌ Error loading achievements from Supabase:", error);
    }

    return achievementsMap;
  }

  /**
   * Get total FitCoins earned for a user
   */
  async getTotalFitCoins(userId: string): Promise<number> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("fit_coins_earned")
        .eq("user_id", userId)
        .eq("is_completed", true);

      if (error || !data) {
        return 0;
      }

      return data.reduce((sum, row) => sum + (row.fit_coins_earned || 0), 0);
    } catch (error) {
      console.error("❌ Error getting total FitCoins:", error);
      return 0;
    }
  }

  /**
   * Get achievement statistics for a user
   */
  async getAchievementStats(userId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    totalFitCoins: number;
  }> {
    const defaultStats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      totalFitCoins: 0,
    };

    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return defaultStats;
    }

    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("is_completed, progress, fit_coins_earned")
        .eq("user_id", userId);

      if (error || !data) {
        return defaultStats;
      }

      const completed = data.filter((r) => r.is_completed).length;
      const inProgress = data.filter(
        (r) => !r.is_completed && r.progress > 0,
      ).length;
      const totalFitCoins = data
        .filter((r) => r.is_completed)
        .reduce((sum, r) => sum + (r.fit_coins_earned || 0), 0);

      return {
        total: data.length,
        completed,
        inProgress,
        totalFitCoins,
      };
    } catch (error) {
      console.error("❌ Error getting achievement stats:", error);
      return defaultStats;
    }
  }
}

export const achievementDataService = AchievementDataService.getInstance();
export default achievementDataService;
