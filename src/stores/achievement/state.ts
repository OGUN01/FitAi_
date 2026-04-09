import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";
import { UserAchievement } from "../../services/achievementEngine";

export const achievementStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (!value) return null;

      try {
        const parsed = JSON.parse(value);
        if (parsed.state?.userAchievementsArray) {
          parsed.state.userAchievements = new Map(
            parsed.state.userAchievementsArray,
          );
          delete parsed.state.userAchievementsArray;
        }
        return JSON.stringify(parsed);
      } catch {
        console.warn(`⚠️ [achievementStorage] Corrupt data for key "${name}", clearing`);
        await AsyncStorage.removeItem(name);
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to read "${name}":`, e);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.userAchievements instanceof Map) {
        parsed.state.userAchievementsArray = Array.from(
          parsed.state.userAchievements.entries(),
        );
        delete parsed.state.userAchievements;
      }
      await AsyncStorage.setItem(name, JSON.stringify(parsed));
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to write "${name}":`, e);
      try {
        await AsyncStorage.setItem(name, typeof value === 'string' ? value : JSON.stringify(value));
      } catch {
        // Silently fail
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to remove "${name}":`, e);
    }
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
