import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HealthDataState } from "./types";
import { initialState } from "./state";
import { createHealthKitActions } from "./healthkit-actions";
import { createHealthConnectActions } from "./healthconnect-actions";
import { createGoogleFitActions } from "./googlefit-actions";
import { createAdvancedFeatures } from "./advanced-features";
import { createGeneralActions } from "./utils";

export const useHealthDataStore = create<HealthDataState>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createHealthKitActions(set, get),
      ...createHealthConnectActions(set, get),
      ...createGoogleFitActions(set, get),
      ...createAdvancedFeatures(set, get),
      ...createGeneralActions(set, get),
    }),
    {
      name: "fitai-health-data-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        metrics: state.metrics,
        settings: state.settings,
        isHealthKitAuthorized: state.isHealthKitAuthorized,
        isHealthConnectAuthorized: state.isHealthConnectAuthorized,
        lastSyncTime: state.lastSyncTime,
      }),
    },
  ),
);
