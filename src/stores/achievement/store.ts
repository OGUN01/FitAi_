import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
  createJSONStorage,
} from "zustand/middleware";
import { AchievementStore } from "./types";
import { achievementStorage, initialState } from "./state";
import { createActions } from "./actions";
import { createSelectors } from "./selectors";
import { createSyncActions } from "./sync";

export const useAchievementStore = create<AchievementStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      ...createActions(set, get),
      ...createSelectors(get),
      ...createSyncActions(set, get),
    })),
    {
      name: "achievement-storage",
      storage: createJSONStorage(() => achievementStorage),
      partialize: (state) => ({
        userAchievements: state.userAchievements,
        totalFitCoinsEarned: state.totalFitCoinsEarned,
        completionRate: state.completionRate,
        currentStreak: state.currentStreak,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);

export default useAchievementStore;
