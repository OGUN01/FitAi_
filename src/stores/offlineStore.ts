import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService, SyncResult, OfflineAction } from '../services/offline';
import { dataManager } from '../services/dataManager';
import {
  OnboardingData,
  WorkoutSession,
  MealLog,
  BodyMeasurement,
  LocalStorageSchema,
  ValidationResult,
} from '../types/localData';

interface OfflineState {
  // State
  isOnline: boolean;
  syncInProgress: boolean;
  queueLength: number;
  lastSyncAttempt: number | null;
  lastSyncResult: SyncResult | null;
  autoSyncEnabled: boolean;
  isInitialized: boolean;
  dataStats: {
    totalWorkoutSessions: number;
    totalMealLogs: number;
    totalMeasurements: number;
    pendingSyncItems: number;
    storageUsed: number;
    lastUpdated: string | null;
  };

  // Enhanced Actions
  initialize: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  clearOfflineData: () => Promise<void>;
  setAutoSync: (enabled: boolean) => void;
  updateNetworkStatus: (isOnline: boolean) => void;
  updateSyncStatus: () => void;

  // Data Management Actions
  storeOnboardingData: (data: OnboardingData) => Promise<void>;
  getOnboardingData: () => Promise<OnboardingData | null>;
  storeWorkoutSession: (session: WorkoutSession) => Promise<void>;
  getWorkoutSessions: (limit?: number) => Promise<WorkoutSession[]>;
  storeMealLog: (mealLog: MealLog) => Promise<void>;
  getMealLogs: (date?: string, limit?: number) => Promise<MealLog[]>;
  storeBodyMeasurement: (measurement: BodyMeasurement) => Promise<void>;
  getBodyMeasurements: (limit?: number) => Promise<BodyMeasurement[]>;
  updateDataStats: () => Promise<void>;
  validateLocalData: () => Promise<ValidationResult>;
  exportLocalData: () => Promise<LocalStorageSchema | null>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: true,
      syncInProgress: false,
      queueLength: 0,
      lastSyncAttempt: null,
      lastSyncResult: null,
      autoSyncEnabled: true,
      isInitialized: false,
      dataStats: {
        totalWorkoutSessions: 0,
        totalMealLogs: 0,
        totalMeasurements: 0,
        pendingSyncItems: 0,
        storageUsed: 0,
        lastUpdated: null,
      },

      // Actions
      initialize: async () => {
        try {
          // Initialize data manager first
          await dataManager.initialize();

          // Set up network listener
          const removeListener = offlineService.addNetworkListener((isOnline) => {
            get().updateNetworkStatus(isOnline);
          });

          // Update initial status
          get().updateSyncStatus();

          // Update data statistics
          await get().updateDataStats();

          set({ isInitialized: true });
          console.log('Enhanced offline store initialized successfully');
        } catch (error) {
          console.error('Failed to initialize enhanced offline store:', error);
          throw error;
        }
      },

      syncNow: async (): Promise<SyncResult> => {
        set({ syncInProgress: true });

        try {
          const result = await offlineService.forcSync();

          set({
            syncInProgress: false,
            lastSyncResult: result,
            lastSyncAttempt: Date.now(),
          });

          // Update queue length after sync
          get().updateSyncStatus();

          return result;
        } catch (error) {
          const errorResult: SyncResult = {
            success: false,
            syncedActions: 0,
            failedActions: 0,
            errors: [error instanceof Error ? error.message : 'Sync failed'],
          };

          set({
            syncInProgress: false,
            lastSyncResult: errorResult,
            lastSyncAttempt: Date.now(),
          });

          return errorResult;
        }
      },

      clearOfflineData: async () => {
        try {
          await offlineService.clearOfflineData();

          set({
            queueLength: 0,
            lastSyncResult: null,
            lastSyncAttempt: null,
          });
        } catch (error) {
          console.warn('Failed to clear offline data:', error);
        }
      },

      setAutoSync: (enabled: boolean) => {
        set({ autoSyncEnabled: enabled });
      },

      updateNetworkStatus: (isOnline: boolean) => {
        const wasOnline = get().isOnline;
        set({ isOnline });

        // Auto-sync when coming back online (if enabled)
        if (!wasOnline && isOnline && get().autoSyncEnabled) {
          get().syncNow();
        }
      },

      updateSyncStatus: () => {
        const status = offlineService.getSyncStatus();
        set({
          isOnline: status.isOnline,
          syncInProgress: status.syncInProgress,
          queueLength: status.queueLength,
          lastSyncAttempt: status.lastSyncAttempt,
        });
      },

      // Data Management Actions
      storeOnboardingData: async (data: OnboardingData) => {
        try {
          await dataManager.storeOnboardingData(data);
          await get().updateDataStats();
        } catch (error) {
          console.error('Failed to store onboarding data:', error);
          throw error;
        }
      },

      getOnboardingData: async () => {
        try {
          return await dataManager.getOnboardingData();
        } catch (error) {
          console.error('Failed to get onboarding data:', error);
          return null;
        }
      },

      storeWorkoutSession: async (session: WorkoutSession) => {
        try {
          await dataManager.storeWorkoutSession(session);
          await get().updateDataStats();
        } catch (error) {
          console.error('Failed to store workout session:', error);
          throw error;
        }
      },

      getWorkoutSessions: async (limit?: number) => {
        try {
          return await dataManager.getWorkoutSessions(limit);
        } catch (error) {
          console.error('Failed to get workout sessions:', error);
          return [];
        }
      },
      storeMealLog: async (mealLog: MealLog) => {
        try {
          await dataManager.storeMealLog(mealLog);
          await get().updateDataStats();
        } catch (error) {
          console.error('Failed to store meal log:', error);
          throw error;
        }
      },

      getMealLogs: async (date?: string, limit?: number) => {
        try {
          return await dataManager.getMealLogs(date, limit);
        } catch (error) {
          console.error('Failed to get meal logs:', error);
          return [];
        }
      },

      storeBodyMeasurement: async (measurement: BodyMeasurement) => {
        try {
          await dataManager.storeBodyMeasurement(measurement);
          await get().updateDataStats();
        } catch (error) {
          console.error('Failed to store body measurement:', error);
          throw error;
        }
      },

      getBodyMeasurements: async (limit?: number) => {
        try {
          return await dataManager.getBodyMeasurements(limit);
        } catch (error) {
          console.error('Failed to get body measurements:', error);
          return [];
        }
      },

      updateDataStats: async () => {
        try {
          const stats = await dataManager.getDataStatistics();
          set({ dataStats: stats });
        } catch (error) {
          console.error('Failed to update data stats:', error);
        }
      },

      validateLocalData: async () => {
        try {
          const schema = await dataManager.exportAllData();
          if (!schema) {
            return {
              isValid: false,
              errors: [
                {
                  field: 'schema',
                  message: 'No local data found',
                  code: 'NO_DATA',
                  severity: 'error' as const,
                },
              ],
              warnings: [],
            };
          }

          // Import validation service dynamically to avoid circular imports
          const { validationService } = await import('../utils/validation');
          return validationService.validateLocalStorageSchema(schema);
        } catch (error) {
          console.error('Failed to validate local data:', error);
          return {
            isValid: false,
            errors: [
              {
                field: 'validation',
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                severity: 'error' as const,
              },
            ],
            warnings: [],
          };
        }
      },

      exportLocalData: async () => {
        try {
          return await dataManager.exportAllData();
        } catch (error) {
          console.error('Failed to export local data:', error);
          return null;
        }
      },
    }),
    {
      name: 'enhanced-offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        autoSyncEnabled: state.autoSyncEnabled,
        lastSyncResult: state.lastSyncResult,
        dataStats: state.dataStats,
      }),
    }
  )
);

export default useOfflineStore;
