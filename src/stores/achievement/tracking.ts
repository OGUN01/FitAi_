import { useAchievementStore } from "./store";

export const trackAchievementActivity = {
  workoutCompleted: (userId: string, workoutData: any) => {
    const activityData = {
      totalWorkouts: (workoutData.totalWorkouts || 0) + 1,
      totalCalories: workoutData.caloriesBurned || 0,
      workoutType: workoutData.type,
      workoutDuration: workoutData.duration,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
    useAchievementStore.getState().updateCurrentStreak();
  },

  mealLogged: (userId: string, mealData: any) => {
    const activityData = {
      nutritionLogs: (mealData.totalLogs || 0) + 1,
      caloriesConsumed: mealData.calories || 0,
      macros: {
        protein: mealData.protein || 0,
        carbs: mealData.carbs || 0,
        fat: mealData.fat || 0,
      },
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
    useAchievementStore.getState().updateCurrentStreak();
  },

  waterGoalHit: (userId: string, waterData: any) => {
    const activityData = {
      waterGoalsHit: (waterData.goalsHit || 0) + 1,
      waterIntake: waterData.amount || 0,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  dailyUsage: (userId: string, usageData: any) => {
    const activityData = {
      consistentDays: usageData.consecutiveDays || 0,
      dailyGoalsHit: usageData.goalsCompleted || 0,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  socialInteraction: (userId: string, socialData: any) => {
    const activityData = {
      friendsCount: socialData.friendsCount || 0,
      kudosGiven: socialData.kudosGiven || 0,
      kudosReceived: socialData.kudosReceived || 0,
      challengesWon: socialData.challengesWon || 0,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  customActivity: (userId: string, activityData: Record<string, any>) => {
    useAchievementStore.getState().checkProgress(userId, activityData);
  },
};
