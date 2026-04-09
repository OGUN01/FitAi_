// Achievement Categories for FitAI

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
// ACHIEVEMENT CATEGORIES
// ============================================================================

export const ACHIEVEMENT_CATEGORIES = {
  WORKOUT: {
    id: "workout",
    name: "Workout Achievements",
    description: "Achievements for completing workouts and exercises",
    icon: "🏋️",
    achievements: ALL_ACHIEVEMENTS.filter((a) => a.category === "workout"),
  },
  NUTRITION: {
    id: "nutrition",
    name: "Nutrition Achievements",
    description: "Achievements for healthy eating and nutrition tracking",
    icon: "🥗",
    achievements: ALL_ACHIEVEMENTS.filter((a) => a.category === "nutrition"),
  },
  CONSISTENCY: {
    id: "consistency",
    name: "Consistency Achievements",
    description: "Achievements for maintaining regular habits",
    icon: "🔥",
    achievements: ALL_ACHIEVEMENTS.filter((a) => a.category === "consistency"),
  },
  MILESTONE: {
    id: "milestone",
    name: "Milestone Achievements",
    description: "Achievements for reaching important goals",
    icon: "🎯",
    achievements: ALL_ACHIEVEMENTS.filter((a) => a.category === "milestone"),
  },
};
