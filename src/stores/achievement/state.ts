import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserAchievement } from "../../services/achievementEngine";

export const achievementStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(name);
    if (!value) return null;

    const parsed = JSON.parse(value);
    if (parsed.state?.userAchievementsArray) {
      parsed.state.userAchievements = new Map(
        parsed.state.userAchievementsArray,
      );
      delete parsed.state.userAchievementsArray;
    }
    return JSON.stringify(parsed);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const parsed = JSON.parse(value);
    if (parsed.state?.userAchievements instanceof Map) {
      parsed.state.userAchievementsArray = Array.from(
        parsed.state.userAchievements.entries(),
      );
      delete parsed.state.userAchievements;
    }
    await AsyncStorage.setItem(name, JSON.stringify(parsed));
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

export const initialState = {
  isLoading: false,
  isInitialized: false,
  achievements: [],
  userAchievements: new Map<string, UserAchievement>(),
  unlockedToday: [],
  showCelebration: false,
  celebrationAchievement: null,
  totalFitCoinsEarned: 0,
  completionRate: 0,
  currentStreak: 0,
};

export let achievementListenerAttached = false;

export const setAchievementListenerAttached = (value: boolean) => {
  achievementListenerAttached = value;
};
