// Achievement System Database for FitAI - Barrel Export

import { WORKOUT_ACHIEVEMENTS } from "./workout-achievements";
import { CONSISTENCY_ACHIEVEMENTS } from "./consistency-achievements";
import { NUTRITION_ACHIEVEMENTS } from "./nutrition-achievements";
import { MILESTONE_ACHIEVEMENTS } from "./milestone-achievements";

export const ACHIEVEMENTS = [
  ...WORKOUT_ACHIEVEMENTS,
  ...CONSISTENCY_ACHIEVEMENTS,
  ...NUTRITION_ACHIEVEMENTS,
  ...MILESTONE_ACHIEVEMENTS,
];

export { ACHIEVEMENT_CATEGORIES } from "./categories";
export {
  getAchievementsByCategory,
  getAchievementsByDifficulty,
  getUnlockedAchievements,
  getAvailableAchievements,
  getAchievementById,
  calculateTotalPoints,
  getNextAchievements,
  checkAchievementCriteria,
  updateAchievementProgress,
} from "./utils";

export default ACHIEVEMENTS;
