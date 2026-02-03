export interface Achievement {
  id: string;
  category: AchievementCategory;
  tier: AchievementTier;
  title: string;
  description: string;
  icon: string;
  color: string;
  requirements: AchievementRequirement[];
  reward: AchievementReward;
  isSecret?: boolean;
  prerequisiteIds?: string[];
  metadata?: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  userId: string;
  unlockedAt: string;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  celebrationShown: boolean;
  fitCoinsEarned?: number;
}

export type AchievementCategory =
  | "fitness"
  | "nutrition"
  | "consistency"
  | "social"
  | "milestone"
  | "streak"
  | "challenge"
  | "exploration"
  | "wellness"
  | "special";

export type AchievementTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "legendary";

export interface AchievementRequirement {
  type:
    | "workout_count"
    | "workout_streak"
    | "calories_burned"
    | "weight_goal"
    | "nutrition_log"
    | "water_intake"
    | "sleep_hours"
    | "steps"
    | "friend_count"
    | "challenge_wins"
    | "consistency_days"
    | "custom";
  target: number;
  timeframe?: "daily" | "weekly" | "monthly" | "all_time";
  metadata?: Record<string, any>;
}

export interface AchievementReward {
  type: "fitcoins" | "title" | "badge" | "premium_trial" | "avatar" | "theme";
  value: number | string;
  description: string;
}
