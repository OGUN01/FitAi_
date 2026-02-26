import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeAsyncStorage } from "../../utils/safeAsyncStorage";
import { UserStoreState } from "./types";
import { initialState } from "./state";
import { createProfileActions } from "./actions/profile";
import { createFitnessGoalsActions } from "./actions/fitnessGoals";
import { createUtilityActions } from "./actions/helpers";

export const useUserStore = create<UserStoreState>()(
  persist(
    (...args) => ({
      ...initialState,
      ...createProfileActions(...args),
      ...createFitnessGoalsActions(...args),
      ...createUtilityActions(...args),
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        isProfileComplete: state.isProfileComplete,
      }),
    },
  ),
);

export default useUserStore;
export * from "./types";
