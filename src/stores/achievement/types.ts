// Achievement Store Type Definitions
// Interfaces and types for achievement state management

import {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
} from "../../services/achievementEngine";

export interface AchievementStore {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  achievements: Achievement[];
  userAchievements: Map<string, UserAchievement>;
  unlockedToday: UserAchievement[];
  showCelebration: boolean;
  celebrationAchievement: Achievement | null;

  // User Stats
  totalFitCoinsEarned: number;
  completionRate: number;
  currentStreak: number;

  // Actions
  initialize: (userId: string) => Promise<void>;
  checkProgress: (
    userId: string,
    activityData: Record<string, any>,
  ) => Promise<void>;
  markCelebrationShown: (achievementId: string) => void;
  showAchievementCelebration: (achievement: Achievement) => void;
  hideCelebration: () => void;
  updateCurrentStreak: () => void;
  getAchievementsByCategory: (category: AchievementCategory) => Achievement[];
  getUserProgress: (userId: string) => UserAchievement[];
  getCompletedAchievements: (userId: string) => UserAchievement[];
  getAchievementStats: (userId: string) => {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    totalFitCoinsEarned: number;
    byTier: Record<AchievementTier, number>;
    byCategory: Record<AchievementCategory, number>;
  };

  // Home screen integration methods
  getRecentAchievements: (count?: number) => Array<{
    id: string;
    title: string;
    icon: string;
    category: string;
    completedAt: string;
  }>;
  getNearlyCompletedAchievements: (count?: number) => Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    progress: number;
    currentValue: number;
    targetValue: number;
  }>;
  getDailyProgress: () => {
    achievementsWorkedOn: number;
    achievementsCompleted: number;
    totalProgress: number;
  };
  getTotalBadgesEarned: () => number;
  getTopCategories: () => Array<{ category: string; count: number }>;

  // Supabase sync methods
  syncWithSupabase: (userId: string) => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;

  // Reset store (for logout)
  reset: () => void;
}

export interface RecentAchievement {
  id: string;
  title: string;
  icon: string;
  category: string;
  completedAt: string;
}

export interface NearlyCompletedAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  progress: number;
  currentValue: number;
  targetValue: number;
}

export interface DailyProgress {
  achievementsWorkedOn: number;
  achievementsCompleted: number;
  totalProgress: number;
}

export interface CategoryStats {
  category: string;
  count: number;
}

export interface AchievementStats {
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  totalFitCoinsEarned: number;
  byTier: Record<AchievementTier, number>;
  byCategory: Record<AchievementCategory, number>;
}
