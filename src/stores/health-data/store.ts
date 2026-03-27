import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDebouncedStorage } from "../../utils/safeAsyncStorage";
import type { HealthDataState } from "./types";
import { initialState, initialMetrics } from "./state";
import { createHealthKitActions } from "./healthkit-actions";
import { createHealthConnectActions } from "./healthconnect-actions";
import { createGoogleFitActions } from "./googlefit-actions";
import { createAdvancedFeatures } from "./advanced-features";
import { createGeneralActions } from "./utils";
import { getLocalDateString } from "../../utils/weekUtils";

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
      storage: createDebouncedStorage(),
      partialize: (state) => ({
        metrics: state.metrics,
        settings: state.settings,
        isHealthKitAuthorized: state.isHealthKitAuthorized,
        isHealthConnectAuthorized: state.isHealthConnectAuthorized,
        lastSyncTime: state.lastSyncTime,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!state || error) return;
        // Reset daily metrics (steps, activeCalories) if lastSyncTime is from a previous day.
        // Prevents yesterday's step count from showing as today's before HealthKit syncs.
        const lastSync = state.lastSyncTime;
        if (lastSync && getLocalDateString(lastSync) !== getLocalDateString()) {
          state.metrics = { ...initialMetrics };
        }
      },
    },
  ),
);
