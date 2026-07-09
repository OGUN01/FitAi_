// Achievement Data Service for Supabase Sync
// Provides cloud persistence for user achievements to prevent data loss on app reinstall

import { supabase } from "./supabase";
import { UserAchievement, achievementEngine } from "./achievementEngine";

export interface AchievementSyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

/**
 * Result of loading user achievements from Supabase.
 * P2-10: distinguishes a load FAILURE (`ok:false`) from a successful load that
 * returned zero rows (`ok:true`, empty Map). Previously both returned an empty
 * Map, so the store's `size > 0` merge gate treated a network error identically
 * to "user has no achievements yet" — a silent failure (CLAUDE.md #5).
 */
export interface AchievementLoadResult {
  ok: boolean;
  achievements: Map<string, UserAchievement>;
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
        return false; // Guest mode: no sync
      }

      const definition = achievementEngine
        .getAllAchievements()
        .find((a) => a.id === achievement.achievementId);

      const { error } = await supabase.from("user_achievements").upsert(
        {
          user_id: userId,
          achievement_id: achievement.achievementId,
          title: definition?.title || achievement.achievementId,
          progress: achievement.progress,
          max_progress: achievement.maxProgress || 1,
          is_completed: achievement.isCompleted,
          unlocked_at: achievement.unlockedAt || null,
          celebration_shown: achievement.celebrationShown,
          fit_coins_earned: achievement.fitCoinsEarned || 0,
        },
        { onConflict: "user_id,achievement_id" },
      );

      if (error) {
        console.error("❌ Achievement upsert error:", error);
        return false;
      }

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
      return { ...result, success: false }; // Guest mode: no sync
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

    return result;
  }

  /**
   * Load user achievements from Supabase.
   *
   * P2-10: returns `{ok, achievements}` so callers can distinguish a load
   * FAILURE (`ok:false`) from a successful load that returned zero rows
   * (`ok:true`, empty Map). Previously both returned an empty Map, so the
   * store's `size > 0` merge gate treated a network error identically to
   * "user has no achievements yet" — a silent failure (CLAUDE.md #5).
   *
   * Guest users (`guest*` / `local-user`) are short-circuited with
   * `ok:true` + empty Map: they legitimately have no cloud rows, and we do
   * not want to surface an error for them.
   */
  async loadUserAchievements(
    userId: string,
  ): Promise<AchievementLoadResult> {
    const achievementsMap = new Map<string, UserAchievement>();

    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return { ok: true, achievements: achievementsMap };
    }

    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Error loading achievements from Supabase:", error);
        return { ok: false, achievements: achievementsMap };
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
      }
      return { ok: true, achievements: achievementsMap };
    } catch (error) {
      console.error("❌ Error loading achievements from Supabase:", error);
      return { ok: false, achievements: achievementsMap };
    }
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

      if (error) {
        console.error("❌ Error getting total FitCoins:", error);
        return 0;
      }
      if (!data) {
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

      if (error) {
        console.error("❌ Error getting achievement stats:", error);
        return defaultStats;
      }
      if (!data) {
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
