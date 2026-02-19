import { achievementDataService } from "../../services/achievementData";
import { UserAchievement } from "../../services/achievementEngine";

export const createSyncActions = (set: any, get: any) => ({
  syncWithSupabase: async (userId: string) => {
    try {
      const state = get();
      console.log("☁️ Syncing achievements to Supabase...");

      const result = await achievementDataService.saveAllAchievements(
        userId,
        state.userAchievements,
      );

      if (result.success) {
        console.log(`✅ Synced ${result.synced} achievements to Supabase`);
      } else {
        console.warn(
          `⚠️ Achievement sync had errors: ${result.errors.join(", ")}`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to sync achievements to Supabase:", error);
    }
  },

  loadFromSupabase: async (userId: string) => {
    try {
      console.log("☁️ Loading achievements from Supabase...");

      const cloudAchievements =
        await achievementDataService.loadUserAchievements(userId);

      if (cloudAchievements.size > 0) {
        const state = get();

        const mergedAchievements = new Map<string, UserAchievement>(
          state.userAchievements,
        );

        cloudAchievements.forEach((cloudAchievement, key) => {
          const localAchievement = mergedAchievements.get(key);

          if (
            !localAchievement ||
            cloudAchievement.isCompleted ||
            cloudAchievement.progress > (localAchievement.progress || 0)
          ) {
            mergedAchievements.set(key, cloudAchievement);
          }
        });

        const completed = Array.from(mergedAchievements.values()).filter(
          (a) => a.isCompleted,
        );
        const totalFitCoins = completed.reduce(
          (sum, a) => sum + (a.fitCoinsEarned || 0),
          0,
        );
        const completionRate =
          mergedAchievements.size > 0
            ? (completed.length / mergedAchievements.size) * 100
            : 0;

        set({
          userAchievements: mergedAchievements,
          totalFitCoinsEarned: totalFitCoins,
          completionRate,
        });

        console.log(
          `✅ Loaded and merged ${cloudAchievements.size} achievements from Supabase`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to load achievements from Supabase:", error);
    }
  },
});
