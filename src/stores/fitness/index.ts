import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FitnessState } from "./types";
import { initialFitnessState } from "./state";
import { createPlanActions } from "./planActions";
import { createProgressActions } from "./progressActions";
import { createSessionActions } from "./sessionActions";
import { createDataActions } from "./dataActions";
import { createRealtimeActions } from "./realtimeActions";
import { createSelectors } from "./selectors";

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set, get) => ({
      ...initialFitnessState,
      ...createPlanActions(set, get),
      ...createProgressActions(set, get),
      ...createSessionActions(set, get),
      ...createDataActions(set, get),
      ...createRealtimeActions(set, get),
      ...createSelectors(get),
    }),
    {
      name: "fitness-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weeklyWorkoutPlan: state.weeklyWorkoutPlan,
        workoutProgress: state.workoutProgress,
      }),
    },
  ),
);

export * from "./types";
export default useFitnessStore;
