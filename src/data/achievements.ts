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
    difficulty: 'bronze',
    criteria: {
      type: 'workouts_completed',
      value: 1
    },
    reward: {
      points: 50,
      badge: 'starter',
      unlocks: ['workout_streak_3']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'workout_streak_3',
    title: 'Getting Started',
    description: 'Complete workouts for 3 consecutive days',
    icon: '🔥',
    category: 'consistency',
    difficulty: 'bronze',
    criteria: {
      type: 'workout_streak',
      value: 3,
      timeframe: 'days'
    },
    reward: {
      points: 100,
      badge: 'consistent',
      unlocks: ['workout_streak_7']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'workout_streak_7',
    title: 'Week Warrior',
    description: 'Complete workouts for 7 consecutive days',
    icon: '⚡',
    category: 'consistency',
    difficulty: 'silver',
    criteria: {
      type: 'workout_streak',
      value: 7,
      timeframe: 'days'
    },
    reward: {
      points: 250,
      badge: 'warrior',
      unlocks: ['workout_streak_30']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'workout_streak_30',
    title: 'Monthly Master',
    description: 'Complete workouts for 30 consecutive days',
    icon: '👑',
    category: 'consistency',
    difficulty: 'gold',
    criteria: {
      type: 'workout_streak',
      value: 30,
      timeframe: 'days'
    },
    reward: {
      points: 1000,
      badge: 'master',
      unlocks: ['workout_streak_100']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'workout_streak_100',
    title: 'Century Champion',
    description: 'Complete workouts for 100 consecutive days',
    icon: '💎',
    category: 'consistency',
    difficulty: 'platinum',
    criteria: {
      type: 'workout_streak',
      value: 100,
      timeframe: 'days'
    },
    reward: {
      points: 5000,
      badge: 'champion'
    },
    isUnlocked: false,
    progress: 0
  },

  // STRENGTH ACHIEVEMENTS
  {
    id: 'strength_beginner',
    title: 'Getting Stronger',
    description: 'Complete 10 strength training workouts',
    icon: '💪',
    category: 'workout',
    difficulty: 'bronze',
    criteria: {
      type: 'strength_workouts',
      value: 10
    },
    reward: {
      points: 200,
      badge: 'strong',
      unlocks: ['strength_intermediate']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'strength_intermediate',
    title: 'Strength Builder',
    description: 'Complete 50 strength training workouts',
    icon: '🏋️',
    category: 'workout',
    difficulty: 'silver',
    criteria: {
      type: 'strength_workouts',
      value: 50
    },
    reward: {
      points: 500,
      badge: 'builder',
      unlocks: ['strength_advanced']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'strength_advanced',
    title: 'Iron Warrior',
    description: 'Complete 100 strength training workouts',
    icon: '⚔️',
    category: 'workout',
    difficulty: 'gold',
    criteria: {
      type: 'strength_workouts',
      value: 100
    },
    reward: {
      points: 1000,
      badge: 'iron_warrior'
    },
    isUnlocked: false,
    progress: 0
  },

  // CARDIO ACHIEVEMENTS
  {
    id: 'cardio_starter',
    title: 'Heart Pumper',
    description: 'Complete 5 cardio workouts',
    icon: '❤️',
    category: 'workout',
    difficulty: 'bronze',
    criteria: {
      type: 'cardio_workouts',
      value: 5
    },
    reward: {
      points: 150,
      badge: 'cardio',
      unlocks: ['cardio_enthusiast']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'cardio_enthusiast',
    title: 'Cardio Enthusiast',
    description: 'Complete 25 cardio workouts',
    icon: '🏃',
    category: 'workout',
    difficulty: 'silver',
    criteria: {
      type: 'cardio_workouts',
      value: 25
    },
    reward: {
      points: 400,
      badge: 'enthusiast',
      unlocks: ['cardio_machine']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'cardio_machine',
    title: 'Cardio Machine',
    description: 'Complete 75 cardio workouts',
    icon: '🚀',
    category: 'workout',
    difficulty: 'gold',
    criteria: {
      type: 'cardio_workouts',
      value: 75
    },
    reward: {
      points: 800,
      badge: 'machine'
    },
    isUnlocked: false,
    progress: 0
  },

  // NUTRITION ACHIEVEMENTS
  {
    id: 'nutrition_tracker',
    title: 'Nutrition Tracker',
    description: 'Log your meals for 7 consecutive days',
    icon: '📊',
    category: 'nutrition',
    difficulty: 'bronze',
    criteria: {
      type: 'nutrition_streak',
      value: 7,
      timeframe: 'days'
    },
    reward: {
      points: 200,
      badge: 'tracker',
      unlocks: ['nutrition_master']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'nutrition_master',
    title: 'Nutrition Master',
    description: 'Log your meals for 30 consecutive days',
    icon: '🥗',
    category: 'nutrition',
    difficulty: 'silver',
    criteria: {
      type: 'nutrition_streak',
      value: 30,
      timeframe: 'days'
    },
    reward: {
      points: 600,
      badge: 'nutrition_master'
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'calorie_goal_week',
    title: 'Calorie Conscious',
    description: 'Meet your daily calorie goal for 7 days',
    icon: '🎯',
    category: 'nutrition',
    difficulty: 'bronze',
    criteria: {
      type: 'calorie_goals_met',
      value: 7,
      timeframe: 'week'
    },
    reward: {
      points: 300,
      badge: 'conscious'
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'protein_goal_week',
    title: 'Protein Power',
    description: 'Meet your daily protein goal for 7 days',
    icon: '🥩',
    category: 'nutrition',
    difficulty: 'silver',
    criteria: {
      type: 'protein_goals_met',
      value: 7,
      timeframe: 'week'
    },
    reward: {
      points: 400,
      badge: 'protein_power'
    },
    isUnlocked: false,
    progress: 0
  },

  // MILESTONE ACHIEVEMENTS
  {
    id: 'weight_loss_5kg',
    title: 'First 5kg',
    description: 'Lose your first 5kg',
    icon: '📉',
    category: 'milestone',
    difficulty: 'silver',
    criteria: {
      type: 'weight_lost',
      value: 5
    },
    reward: {
      points: 500,
      badge: 'weight_loss',
      unlocks: ['weight_loss_10kg']
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'weight_loss_10kg',
    title: 'Double Digits',
    description: 'Lose 10kg total',
    icon: '🎉',
    category: 'milestone',
    difficulty: 'gold',
    criteria: {
      type: 'weight_lost',
      value: 10
    },
    reward: {
      points: 1000,
      badge: 'double_digits'
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'muscle_gain_2kg',
    title: 'Muscle Builder',
    description: 'Gain 2kg of muscle mass',
    icon: '💪',
    category: 'milestone',
    difficulty: 'silver',
    criteria: {
      type: 'muscle_gained',
      value: 2
    },
    reward: {
      points: 600,
      badge: 'muscle_builder'
    },
    isUnlocked: false,
    progress: 0
  },

  // SPECIAL ACHIEVEMENTS
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete 10 workouts before 8 AM',
    icon: '🌅',
    category: 'workout',
    difficulty: 'bronze',
    criteria: {
      type: 'early_workouts',
      value: 10
    },
    reward: {
      points: 300,
      badge: 'early_bird'
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete 10 workouts after 8 PM',
    icon: '🦉',
    category: 'workout',
    difficulty: 'bronze',
    criteria: {
      type: 'late_workouts',
      value: 10
    },
    reward: {
      points: 300,
      badge: 'night_owl'
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Complete workouts on 10 weekends',
    icon: '🏖️',
    category: 'workout',
    difficulty: 'silver',
    criteria: {
      type: 'weekend_workouts',
      value: 10
    },
    reward: {
      points: 400,
      badge: 'weekend_warrior'
    },
    isUnlocked: false,
    progress: 0
  },
  {
    id: 'variety_seeker',
    title: 'Variety Seeker',
    description: 'Try 20 different types of exercises',
    icon: '🎭',
    category: 'workout',
    difficulty: 'gold',
    criteria: {
      type: 'unique_exercises',
      value: 20
    },
    reward: {
      points: 700,
      badge: 'variety_seeker'
    },
    isUnlocked: false,
    progress: 0
  }
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
    achievements: ACHIEVEMENTS.filter(a => a.category === 'workout')
  },
  NUTRITION: {
    id: 'nutrition',
    name: 'Nutrition Achievements',
    description: 'Achievements for healthy eating and nutrition tracking',
    icon: '🥗',
    achievements: ACHIEVEMENTS.filter(a => a.category === 'nutrition')
  },
  CONSISTENCY: {
    id: 'consistency',
    name: 'Consistency Achievements',
    description: 'Achievements for maintaining regular habits',
    icon: '🔥',
    achievements: ACHIEVEMENTS.filter(a => a.category === 'consistency')
  },
  MILESTONE: {
    id: 'milestone',
    name: 'Milestone Achievements',
    description: 'Achievements for reaching important goals',
    icon: '🎯',
    achievements: ACHIEVEMENTS.filter(a => a.category === 'milestone')
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get achievements by category
 */
export const getAchievementsByCategory = (category: string): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement => achievement.category === category);
};

/**
 * Get achievements by difficulty
 */
export const getAchievementsByDifficulty = (difficulty: string): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement => achievement.difficulty === difficulty);
};

/**
 * Get unlocked achievements
 */
export const getUnlockedAchievements = (): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement => achievement.isUnlocked);
};

/**
 * Get available achievements (not unlocked but criteria can be met)
 */
export const getAvailableAchievements = (): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement => !achievement.isUnlocked);
};

/**
 * Get achievement by ID
 */
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(achievement => achievement.id === id);
};

/**
 * Calculate total points earned
 */
export const calculateTotalPoints = (): number => {
  return ACHIEVEMENTS
    .filter(achievement => achievement.isUnlocked)
    .reduce((total, achievement) => total + (achievement.reward?.points || 0), 0);
};

/**
 * Get next achievements to unlock
 */
export const getNextAchievements = (limit: number = 5): Achievement[] => {
  return ACHIEVEMENTS
    .filter(achievement => !achievement.isUnlocked)
    .sort((a, b) => (a.progress || 0) - (b.progress || 0))
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
  if (!achievement || achievement.isUnlocked) return null;

  const statValue = userStats[achievement.criteria.type] || 0;
  const progress = Math.min(100, (statValue / achievement.criteria.value) * 100);
  
  achievement.progress = progress;
  
  if (progress >= 100) {
    achievement.isUnlocked = true;
    achievement.unlockedAt = new Date().toISOString();
  }
  
  return achievement;
};

export default ACHIEVEMENTS;
