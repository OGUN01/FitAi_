import { storeLogger } from '../../utils/logger';
import { achievementDataService } from "../../services/achievementData";
import { UserAchievement } from "../../services/achievementEngine";

export const createSyncActions = (set: any, get: any) => ({
  syncWithSupabase: async (userId: string) => {
    try {
      const state = get();

      const result = await achievementDataService.saveAllAchievements(
        userId,
        state.userAchievements,
      );

      if (result.success) {
      } else {
      }
    } catch (error) {
      storeLogger.error('Failed to sync achievements to Supabase', { error: String(error) });
    }
  },

  loadFromSupabase: async (userId: string) => {
    try {

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

      }
    } catch (error) {
      storeLogger.error('Failed to load achievements from Supabase', { error: String(error) });
    }
  },
});
