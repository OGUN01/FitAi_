// Achievement Utility Functions for FitAI

import { Achievement } from "../../types/ai";
import { WORKOUT_ACHIEVEMENTS } from "./workout-achievements";
import { CONSISTENCY_ACHIEVEMENTS } from "./consistency-achievements";
import { NUTRITION_ACHIEVEMENTS } from "./nutrition-achievements";
import { MILESTONE_ACHIEVEMENTS } from "./milestone-achievements";

const ALL_ACHIEVEMENTS = [
  ...WORKOUT_ACHIEVEMENTS,
  ...CONSISTENCY_ACHIEVEMENTS,
  ...NUTRITION_ACHIEVEMENTS,
  ...MILESTONE_ACHIEVEMENTS,
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getAchievementsByCategory = (category: string): Achievement[] => {
  return ALL_ACHIEVEMENTS.filter(
    (achievement) => achievement.category === category,
  );
};

export const getAchievementsByDifficulty = (
  difficulty: string,
): Achievement[] => {
  return ALL_ACHIEVEMENTS.filter(
    (achievement) => achievement.rarity === difficulty,
  );
};

export const getUnlockedAchievements = (): Achievement[] => {
  return ALL_ACHIEVEMENTS.filter((achievement) => achievement.unlockedAt);
};

export const getAvailableAchievements = (): Achievement[] => {
  return ALL_ACHIEVEMENTS.filter((achievement) => !achievement.unlockedAt);
};

export const getAchievementById = (id: string): Achievement | undefined => {
  return ALL_ACHIEVEMENTS.find((achievement) => achievement.id === id);
};

export const calculateTotalPoints = (): number => {
  return ALL_ACHIEVEMENTS.filter(
    (achievement) => achievement.unlockedAt,
  ).reduce((total, achievement) => total + (achievement.points || 0), 0);
};

export const getNextAchievements = (limit: number = 5): Achievement[] => {
  return ALL_ACHIEVEMENTS.filter((achievement) => !achievement.unlockedAt)
    .sort((a, b) => (a.progress?.current || 0) - (b.progress?.current || 0))
    .slice(0, limit);
};

export const checkAchievementCriteria = (
  achievement: Achievement,
  userStats: Record<string, number>,
): boolean => {
  const statValue = userStats[achievement.criteria.type] || 0;
  return statValue >= achievement.criteria.value;
};

export const updateAchievementProgress = (
  achievementId: string,
  userStats: Record<string, number>,
): Achievement | null => {
  const achievement = getAchievementById(achievementId);
  if (!achievement || achievement.unlockedAt) return null;

  const statValue = userStats[achievement.criteria.type] || 0;
  const progress = Math.min(
    100,
    (statValue / achievement.criteria.value) * 100,
  );

  achievement.progress = {
    current: progress,
    target: 100,
    unit: "%",
  };

  if (progress >= 100) {
    achievement.unlockedAt = new Date().toISOString();
  }

  return achievement;
};
