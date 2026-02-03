export type {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
  AchievementRequirement,
  AchievementReward,
} from "./types";

export { achievementEngine, default } from "./core";

export {
  createFitnessAchievements,
  createNutritionAchievements,
} from "./fitnessBadges";
export {
  createConsistencyAchievements,
  createSocialAchievements,
} from "./consistencyBadges";
export {
  createMilestoneAchievements,
  createStreakAchievements,
} from "./milestoneBadges";
export {
  createChallengeAchievements,
  createExplorationAchievements,
  createWellnessAchievements,
  createSpecialAchievements,
} from "./specialBadges";
