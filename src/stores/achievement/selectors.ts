import {
  achievementEngine,
  AchievementCategory,
  UserAchievement,
} from "../../services/achievementEngine";
import {
  RecentAchievement,
  NearlyCompletedAchievement,
  DailyProgress,
  CategoryStats,
  AchievementStats,
} from "./types";

export const createSelectors = (get: any) => ({
  getAchievementsByCategory: (category: AchievementCategory) => {
    return achievementEngine.getAchievementsByCategory(category);
  },

  getUserProgress: (userId: string) => {
    const state = get();
    return Array.from(
      state.userAchievements.values() as Iterable<UserAchievement>,
    ).filter((ua) => ua.userId === userId);
  },

  getCompletedAchievements: (userId: string) => {
    return achievementEngine.getUserCompletedAchievements(userId);
  },

  getAchievementStats: (userId: string): AchievementStats => {
    return achievementEngine.getUserAchievementStats(userId);
  },

  getRecentAchievements: (count: number = 3): RecentAchievement[] => {
    const state = get();
    return Array.from(
      state.userAchievements.values() as Iterable<UserAchievement>,
    )
      .filter((ua) => ua.isCompleted)
      .sort(
        (a, b) =>
          new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime(),
      )
      .slice(0, count)
      .map((ua) => {
        const achievement = state.achievements.find(
          (a: any) => a.id === ua.achievementId,
        );
        return {
          id: ua.achievementId,
          title: achievement?.title || "Achievement",
          icon: achievement?.icon || "🏆",
          category: achievement?.category || "General",
          completedAt: ua.unlockedAt,
        };
      });
  },

  getNearlyCompletedAchievements: (
    count: number = 2,
  ): NearlyCompletedAchievement[] => {
    const state = get();
    return Array.from(
      state.userAchievements.values() as Iterable<UserAchievement>,
    )
      .filter((ua) => !ua.isCompleted && ua.progress > 0)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, count)
      .map((ua) => {
        const achievement = state.achievements.find(
          (a: any) => a.id === ua.achievementId,
        );
        return {
          id: ua.achievementId,
          title: achievement?.title || "Achievement",
          description: achievement?.description || "Complete this achievement",
          icon: achievement?.icon || "🎯",
          category: achievement?.category || "General",
          progress: Math.round(ua.progress * 100),
          currentValue: ua.progress,
          targetValue: ua.maxProgress || 1,
        };
      });
  },

  getDailyProgress: (): DailyProgress => {
    const state = get();
    const today = new Date().toDateString();

    const todayProgress = Array.from(
      state.userAchievements.values() as Iterable<UserAchievement>,
    ).filter((ua) => {
      const lastUpdate = new Date(ua.unlockedAt).toDateString();
      return lastUpdate === today;
    });

    return {
      achievementsWorkedOn: todayProgress.length,
      achievementsCompleted: todayProgress.filter((ua) => ua.isCompleted)
        .length,
      totalProgress:
        todayProgress.reduce((sum, ua) => sum + ua.progress, 0) /
        Math.max(todayProgress.length, 1),
    };
  },

  getTotalBadgesEarned: (): number => {
    const state = get();
    return Array.from(
      state.userAchievements.values() as Iterable<UserAchievement>,
    ).filter((ua) => ua.isCompleted).length;
  },

  getTopCategories: (): CategoryStats[] => {
    const state = get();
    const categoryStats: Record<string, number> = {};

    Array.from(state.userAchievements.values() as Iterable<UserAchievement>)
      .filter((ua) => ua.isCompleted)
      .forEach((ua) => {
        const achievement = state.achievements.find(
          (a: any) => a.id === ua.achievementId,
        );
        const category = achievement?.category || "General";
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      });

    return Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
  },
});
