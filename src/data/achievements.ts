// Achievement System Database for FitAI

import { Achievement } from '../types/ai';

// ============================================================================
// ACHIEVEMENTS DATABASE
// ============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // WORKOUT ACHIEVEMENTS
  {
    id: 'first_workout',
    title: 'First Steps',
    description: 'Complete your first workout',
    icon: '🎯',
    category: 'workout',
    rarity: 'common',
    criteria: {
      type: 'total',
      value: 1,
    },
    points: 50,

    rewards: {

      badges: ['starter'],

      features: ['workout_streak_3'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'workout_streak_3',
    title: 'Getting Started',
    description: 'Complete workouts for 3 consecutive days',
    icon: '🔥',
    category: 'consistency',
    rarity: 'common',
    criteria: {
      type: 'streak',
      value: 3,
      timeframe: 'daily',
    },
    points: 100,

    rewards: {

      badges: ['consistent'],

      features: ['workout_streak_7'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'workout_streak_7',
    title: 'Week Warrior',
    description: 'Complete workouts for 7 consecutive days',
    icon: '⚡',
    category: 'consistency',
    rarity: 'rare',
    criteria: {
      type: 'streak',
      value: 7,
      timeframe: 'daily',
    },
    points: 250,

    rewards: {

      badges: ['warrior'],

      features: ['workout_streak_30'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'workout_streak_30',
    title: 'Monthly Master',
    description: 'Complete workouts for 30 consecutive days',
    icon: '👑',
    category: 'consistency',
    rarity: 'epic',
    criteria: {
      type: 'streak',
      value: 30,
      timeframe: 'daily',
    },
    points: 1000,

    rewards: {

      badges: ['master'],

      features: ['workout_streak_100'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'workout_streak_100',
    title: 'Century Champion',
    description: 'Complete workouts for 100 consecutive days',
    icon: '💎',
    category: 'consistency',
    rarity: 'legendary',
    criteria: {
      type: 'streak',
      value: 100,
      timeframe: 'daily',
    },
    points: 5000,

    rewards: {

      badges: ['champion'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },

  // STRENGTH ACHIEVEMENTS
  {
    id: 'strength_beginner',
    title: 'Getting Stronger',
    description: 'Complete 10 strength training workouts',
    icon: '💪',
    category: 'workout',
    rarity: 'common',
    criteria: {
      type: 'total',
      value: 10,
    },
    points: 200,

    rewards: {

      badges: ['strong'],

      features: ['strength_intermediate'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'strength_intermediate',
    title: 'Strength Builder',
    description: 'Complete 50 strength training workouts',
    icon: '🏋️',
    category: 'workout',
    rarity: 'rare',
    criteria: {
      type: 'total',
      value: 50,
    },
    points: 500,

    rewards: {

      badges: ['builder'],

      features: ['strength_advanced'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'strength_advanced',
    title: 'Iron Warrior',
    description: 'Complete 100 strength training workouts',
    icon: '⚔️',
    category: 'workout',
    rarity: 'epic',
    criteria: {
      type: 'total',
      value: 100,
    },
    points: 1000,

    rewards: {

      badges: ['iron_warrior'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },

  // CARDIO ACHIEVEMENTS
  {
    id: 'cardio_starter',
    title: 'Heart Pumper',
    description: 'Complete 5 cardio workouts',
    icon: '❤️',
    category: 'workout',
    rarity: 'common',
    criteria: {
      type: 'total',
      value: 5,
    },
    points: 150,

    rewards: {

      badges: ['cardio'],

      features: ['cardio_enthusiast'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'cardio_enthusiast',
    title: 'Cardio Enthusiast',
    description: 'Complete 25 cardio workouts',
    icon: '🏃',
    category: 'workout',
    rarity: 'rare',
    criteria: {
      type: 'total',
      value: 25,
    },
    points: 400,

    rewards: {

      badges: ['enthusiast'],

      features: ['cardio_machine'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'cardio_machine',
    title: 'Cardio Machine',
    description: 'Complete 75 cardio workouts',
    icon: '🚀',
    category: 'workout',
    rarity: 'epic',
    criteria: {
      type: 'total',
      value: 75,
    },
    points: 800,

    rewards: {

      badges: ['machine'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },

  // NUTRITION ACHIEVEMENTS
  {
    id: 'nutrition_tracker',
    title: 'Nutrition Tracker',
    description: 'Log your meals for 7 consecutive days',
    icon: '📊',
    category: 'nutrition',
    rarity: 'common',
    criteria: {
      type: 'streak',
      value: 7,
      timeframe: 'daily',
    },
    points: 200,

    rewards: {

      badges: ['tracker'],

      features: ['nutrition_master'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'nutrition_master',
    title: 'Nutrition Master',
    description: 'Log your meals for 30 consecutive days',
    icon: '🥗',
    category: 'nutrition',
    rarity: 'rare',
    criteria: {
      type: 'streak',
      value: 30,
      timeframe: 'daily',
    },
    points: 600,

    rewards: {

      badges: ['nutrition_master'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'calorie_goal_week',
    title: 'Calorie Conscious',
    description: 'Meet your daily calorie goal for 7 days',
    icon: '🎯',
    category: 'nutrition',
    rarity: 'common',
    criteria: {
      type: 'total',
      value: 7,
      timeframe: 'weekly',
    },
    points: 300,

    rewards: {

      badges: ['conscious'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'protein_goal_week',
    title: 'Protein Power',
    description: 'Meet your daily protein goal for 7 days',
    icon: '🥩',
    category: 'nutrition',
    rarity: 'rare',
    criteria: {
      type: 'total',
      value: 7,
      timeframe: 'weekly',
    },
    points: 400,

    rewards: {

      badges: ['protein_power'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },

  // MILESTONE ACHIEVEMENTS
  {
    id: 'weight_loss_5kg',
    title: 'First 5kg',
    description: 'Lose your first 5kg',
    icon: '📉',
    category: 'milestone',
    rarity: 'rare',
    criteria: {
      type: 'personal_best',
      value: 5,
    },
    points: 500,

    rewards: {

      badges: ['weight_loss'],

      features: ['weight_loss_10kg'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'weight_loss_10kg',
    title: 'Double Digits',
    description: 'Lose 10kg total',
    icon: '🎉',
    category: 'milestone',
    rarity: 'epic',
    criteria: {
      type: 'personal_best',
      value: 10,
    },
    points: 1000,

    rewards: {

      badges: ['double_digits'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'muscle_gain_2kg',
    title: 'Muscle Builder',
    description: 'Gain 2kg of muscle mass',
    icon: '💪',
    category: 'milestone',
    rarity: 'rare',
    criteria: {
      type: 'personal_best',
      value: 2,
    },
    points: 600,

    rewards: {

      badges: ['muscle_builder'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },

  // SPECIAL ACHIEVEMENTS
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete 10 workouts before 8 AM',
    icon: '🌅',
    category: 'workout',
    rarity: 'common',
    criteria: {
      type: 'total',
      value: 10,
    },
    points: 300,

    rewards: {

      badges: ['early_bird'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete 10 workouts after 8 PM',
    icon: '🦉',
    category: 'workout',
    rarity: 'common',
    criteria: {
      type: 'total',
      value: 10,
    },
    points: 300,

    rewards: {

      badges: ['night_owl'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Complete workouts on 10 weekends',
    icon: '🏖️',
    category: 'workout',
    rarity: 'rare',
    criteria: {
      type: 'total',
      value: 10,
    },
    points: 400,

    rewards: {

      badges: ['weekend_warrior'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
  {
    id: 'variety_seeker',
    title: 'Variety Seeker',
    description: 'Try 20 different types of exercises',
    icon: '🎭',
    category: 'workout',
    rarity: 'epic',
    criteria: {
      type: 'total',
      value: 20,
    },
    points: 700,

    rewards: {

      badges: ['variety_seeker'],

    },

    // unlockedAt: undefined,
    progress: {

      current: 0,

      target: 0,

      unit: 'count',

    },

  },
];

// ============================================================================
// ACHIEVEMENT CATEGORIES
// ============================================================================

export const ACHIEVEMENT_CATEGORIES = {
  WORKOUT: {
    id: 'workout',
    name: 'Workout Achievements',
    description: 'Achievements for completing workouts and exercises',
    icon: '🏋️',
    achievements: ACHIEVEMENTS.filter((a) => a.category === 'workout'),
  },
  NUTRITION: {
    id: 'nutrition',
    name: 'Nutrition Achievements',
    description: 'Achievements for healthy eating and nutrition tracking',
    icon: '🥗',
    achievements: ACHIEVEMENTS.filter((a) => a.category === 'nutrition'),
  },
  CONSISTENCY: {
    id: 'consistency',
    name: 'Consistency Achievements',
    description: 'Achievements for maintaining regular habits',
    icon: '🔥',
    achievements: ACHIEVEMENTS.filter((a) => a.category === 'consistency'),
  },
  MILESTONE: {
    id: 'milestone',
    name: 'Milestone Achievements',
    description: 'Achievements for reaching important goals',
    icon: '🎯',
    achievements: ACHIEVEMENTS.filter((a) => a.category === 'milestone'),
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get achievements by category
 */
export const getAchievementsByCategory = (category: string): Achievement[] => {
  return ACHIEVEMENTS.filter((achievement) => achievement.category === category);
};

/**
 * Get achievements by difficulty
 */
export const getAchievementsByDifficulty = (difficulty: string): Achievement[] => {
  return ACHIEVEMENTS.filter((achievement) => achievement.rarity === difficulty);
};

/**
 * Get unlocked achievements
 */
export const getUnlockedAchievements = (): Achievement[] => {
  return ACHIEVEMENTS.filter((achievement) => achievement.unlockedAt);
};

/**
 * Get available achievements (not unlocked but criteria can be met)
 */
export const getAvailableAchievements = (): Achievement[] => {
  return ACHIEVEMENTS.filter((achievement) => !achievement.unlockedAt);
};

/**
 * Get achievement by ID
 */
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
};

/**
 * Calculate total points earned
 */
export const calculateTotalPoints = (): number => {
  return ACHIEVEMENTS.filter((achievement) => achievement.unlockedAt).reduce(
    (total, achievement) => total + (achievement.points || 0),
    0
  );
};

/**
 * Get next achievements to unlock
 */
export const getNextAchievements = (limit: number = 5): Achievement[] => {
  return ACHIEVEMENTS.filter((achievement) => !achievement.unlockedAt)
    .sort((a, b) => (a.progress?.current || 0) - (b.progress?.current || 0))
    .slice(0, limit);
};

/**
 * Check if achievement criteria is met
 */
export const checkAchievementCriteria = (
  achievement: Achievement,
  userStats: Record<string, number>
): boolean => {
  const statValue = userStats[achievement.criteria.type] || 0;
  return statValue >= achievement.criteria.value;
};

/**
 * Update achievement progress
 */
export const updateAchievementProgress = (
  achievementId: string,
  userStats: Record<string, number>
): Achievement | null => {
  const achievement = getAchievementById(achievementId);
  if (!achievement || achievement.unlockedAt) return null;

  const statValue = userStats[achievement.criteria.type] || 0;
  const progress = Math.min(100, (statValue / achievement.criteria.value) * 100);

  achievement.progress = {
    current: progress,
    target: 100,
    unit: '%',
  };

  if (progress >= 100) {
    achievement.unlockedAt = new Date().toISOString();
  }

  return achievement;
};

export default ACHIEVEMENTS;
