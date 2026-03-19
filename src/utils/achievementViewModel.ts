import { Achievement, UserAchievement } from "../services/achievementEngine";

export interface AchievementViewModel {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  tier: string;
  iconName: string;
  points: number;
  completed: boolean;
  progress: number;
  target: number;
  percentComplete: number;
  unlockedAt?: string;
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  fitness: "barbell-outline",
  nutrition: "restaurant-outline",
  consistency: "flame-outline",
  social: "people-outline",
  milestone: "trophy-outline",
  streak: "flame-outline",
  challenge: "flash-outline",
  exploration: "compass-outline",
  wellness: "heart-outline",
  special: "star-outline",
};

const ACHIEVEMENT_ICON_OVERRIDES: Record<string, string> = {
  first_workout: "fitness",
  workout_warrior: "barbell-outline",
  fitness_champion: "trophy-outline",
  fitness_legend: "medal-outline",
  food_tracker: "nutrition",
  nutrition_newbie: "restaurant-outline",
  workout_streak_7: "flame",
  workout_streak_30: "bonfire-outline",
  weight_goal_achieved: "locate-outline",
};

const TIER_POINTS: Record<string, number> = {
  bronze: 25,
  silver: 50,
  gold: 100,
  platinum: 200,
  diamond: 400,
  legendary: 750,
};

const getAchievementIconName = (
  achievementId: string,
  category: string,
): string => {
  return (
    ACHIEVEMENT_ICON_OVERRIDES[achievementId] ||
    CATEGORY_ICON_MAP[category] ||
    "ribbon-outline"
  );
};

export const buildAchievementViewModels = (
  achievements: Achievement[],
  userAchievements: Map<string, UserAchievement>,
): AchievementViewModel[] => {
  return achievements
    .map((achievement) => {
      const userAchievement = userAchievements.get(achievement.id);
      const target =
        userAchievement?.maxProgress ||
        achievement.requirements[0]?.target ||
        1;
      const progress = userAchievement?.progress || 0;
      const completed = userAchievement?.isCompleted ?? false;
      const percentComplete = completed
        ? 100
        : Math.min(100, Math.round((progress / Math.max(target, 1)) * 100));

      return {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        categoryLabel: achievement.category.toUpperCase(),
        tier: achievement.tier,
        iconName: getAchievementIconName(achievement.id, achievement.category),
        points:
          typeof achievement.reward?.value === "number"
            ? achievement.reward.value
            : (TIER_POINTS[achievement.tier] ?? 25),
        completed,
        progress,
        target,
        percentComplete,
        unlockedAt: userAchievement?.unlockedAt,
      };
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? -1 : 1;
      }

      if (a.completed && b.completed) {
        const unlockedA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const unlockedB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return unlockedB - unlockedA;
      }

      if (a.percentComplete !== b.percentComplete) {
        return b.percentComplete - a.percentComplete;
      }

      if (a.points !== b.points) {
        return b.points - a.points;
      }

      return a.title.localeCompare(b.title);
    });
};
