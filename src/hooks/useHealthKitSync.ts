// React Hook for HealthKit Integration
// Provides convenient access to HealthKit functionality with automatic sync management

import { useEffect, useState, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useHealthDataStore } from '../stores/healthDataStore';
import { healthKitService } from '../services/healthKit';

export interface UseHealthKitSyncOptions {
  // Auto-initialize on hook mount
  autoInitialize?: boolean;
  
  // Sync frequency in minutes (default: 60)
  syncIntervalMinutes?: number;
  
  // Enable background sync when app becomes active
  syncOnAppForeground?: boolean;
  
  // Enable real-time sync for specific data types
  realTimeSync?: {
    steps?: boolean;
    heartRate?: boolean;
    workouts?: boolean;
  };
}

export interface UseHealthKitSyncReturn {
  // Status
  isAvailable: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;
  lastSyncTime?: string;
  
  // Health Data (from store)
  healthMetrics: any;
  settings: any;
  
  // Actions
  initialize: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  syncNow: (force?: boolean) => Promise<void>;
  exportWorkout: (workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
  }) => Promise<boolean>;
  exportNutrition: (nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water?: number;
    date?: Date;
  }) => Promise<boolean>;
  
  // Utility
  getHealthSummary: () => Promise<any>;
  getHealthInsights: () => string[];
  updateSettings: (settings: any) => void;
}

export const useHealthKitSync = (options: UseHealthKitSyncOptions = {}): UseHealthKitSyncReturn => {
  const {
    autoInitialize = true,
    syncIntervalMinutes = 60,
    syncOnAppForeground = true,
  } = options;

  // State from Zustand store
  const {
    metrics: healthMetrics,
    settings,
    isHealthKitAvailable,
    isHealthKitAuthorized,
    syncStatus,
    syncError,
    lastSyncTime,
    initializeHealthKit,
    requestHealthKitPermissions,
    syncHealthData,
    updateSettings,
    exportWorkoutToHealthKit,
    exportNutritionToHealthKit,
    getHealthInsights,
  } = useHealthDataStore();

  // Local loading state for initialization
  const [isLoading, setIsLoading] = useState(false);

  // Initialize HealthKit on mount
  useEffect(() => {
    if (autoInitialize && Platform.OS === 'ios') {
      const init = async () => {
        setIsLoading(true);
        try {
          await initializeHealthKit();
        } catch (error) {
          console.error('❌ Failed to auto-initialize HealthKit:', error);
        } finally {
          setIsLoading(false);
        }
      };
      init();
    }
  }, [autoInitialize, initializeHealthKit]);

  // Background sync on app foreground
  useEffect(() => {
    if (!syncOnAppForeground || !isHealthKitAuthorized) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, checking HealthKit sync...');
        
        // Sync if enough time has passed
        const checkAndSync = async () => {
          try {
            // Check if enough time has passed since last sync
            const hoursInterval = syncIntervalMinutes / 60;
            if (lastSyncTime) {
              const lastSync = new Date(lastSyncTime).getTime();
              const now = Date.now();
              const hoursSinceLastSync = (now - lastSync) / (1000 * 60 * 60);

              if (hoursSinceLastSync >= hoursInterval) {
                console.log('🔄 Performing background HealthKit sync...');
                await syncHealthData(false);
              }
            } else {
              // No previous sync, sync now
              console.log('🔄 Performing initial background HealthKit sync...');
              await syncHealthData(false);
            }
          } catch (error) {
            console.error('❌ Background sync failed:', error);
          }
        };
        
        checkAndSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isHealthKitAuthorized, syncIntervalMinutes, syncOnAppForeground, syncHealthData]);

  // Automatic periodic sync
  useEffect(() => {
    if (!settings.autoSyncEnabled || !isHealthKitAuthorized) return;

    const intervalMs = syncIntervalMinutes * 60 * 1000;

    const periodicSync = async () => {
      try {
        console.log('⏰ Performing periodic HealthKit sync...');
        await syncHealthData(false);
      } catch (error) {
        console.error('❌ Periodic sync failed:', error);
      }
    };

    const intervalId = setInterval(periodicSync, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [settings.autoSyncEnabled, isHealthKitAuthorized, syncIntervalMinutes, syncHealthData]);

  // Action handlers
  const initialize = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await initializeHealthKit();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [initializeHealthKit]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await requestHealthKitPermissions();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [requestHealthKitPermissions]);

  const syncNow = useCallback(async (force: boolean = false): Promise<void> => {
    await syncHealthData(force);
  }, [syncHealthData]);

  const exportWorkout = useCallback(async (workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
  }): Promise<boolean> => {
    return await exportWorkoutToHealthKit(workout);
  }, [exportWorkoutToHealthKit]);

  const exportNutrition = useCallback(async (nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water?: number;
    date?: Date;
  }): Promise<boolean> => {
    return await exportNutritionToHealthKit({
      ...nutrition,
      date: nutrition.date || new Date(),
    });
  }, [exportNutritionToHealthKit]);

  const getHealthSummary = useCallback(async () => {
    // Get current health data summary from store
    return {
      steps: healthMetrics.steps || 0,
      activeCalories: healthMetrics.activeCalories || 0,
      weight: healthMetrics.weight || 0,
      sleepHours: healthMetrics.sleepHours || 0,
      heartRate: healthMetrics.heartRate || 0,
    };
  }, [healthMetrics]);

  return {
    // Status
    isAvailable: isHealthKitAvailable,
    isAuthorized: isHealthKitAuthorized,
    isLoading,
    syncStatus,
    error: syncError,
    lastSyncTime,
    
    // Data
    healthMetrics,
    settings,
    
    // Actions
    initialize,
    requestPermissions,
    syncNow,
    exportWorkout,
    exportNutrition,
    
    // Utility
    getHealthSummary,
    getHealthInsights,
    updateSettings,
  };
};

// Specialized hooks for specific use cases

/**
 * Hook for workout screen integration
 */
export const useHealthKitWorkout = () => {
  const healthKit = useHealthKitSync({ syncOnAppForeground: false });
  
  const startWorkoutTracking = useCallback(async (workoutType: string) => {
    // Could implement workout session tracking here
    console.log(`🏃 Starting HealthKit workout tracking: ${workoutType}`);
  }, []);
  
  const finishWorkoutTracking = useCallback(async (workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
  }) => {
    console.log('🏁 Finishing workout, exporting to HealthKit...');
    return await healthKit.exportWorkout(workout);
  }, [healthKit]);
  
  return {
    ...healthKit,
    startWorkoutTracking,
    finishWorkoutTracking,
  };
};

/**
 * Hook for nutrition screen integration
 */
export const useHealthKitNutrition = () => {
  const healthKit = useHealthKitSync({ syncOnAppForeground: false });
  
  const logDailyNutrition = useCallback(async (nutritionData: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water?: number;
  }) => {
    if (healthKit.settings.dataTypesToSync.nutrition) {
      console.log('🍎 Exporting daily nutrition to HealthKit...');
      return await healthKit.exportNutrition({
        ...nutritionData,
        date: new Date(),
      });
    }
    return false;
  }, [healthKit]);
  
  return {
    ...healthKit,
    logDailyNutrition,
  };
};

/**
 * Hook for dashboard/home screen integration
 */
export const useHealthKitDashboard = () => {
  const healthKit = useHealthKitSync({
    syncIntervalMinutes: 30, // More frequent sync for dashboard
    syncOnAppForeground: true,
  });
  
  const [dashboardData, setDashboardData] = useState({
    todaySteps: 0,
    todayCalories: 0,
    weeklyWorkouts: 0,
    lastWeight: 0,
    sleepScore: 0,
  });
  
  useEffect(() => {
    const updateDashboardData = () => {
      const { metrics } = healthKit.healthMetrics;
      
      // Calculate weekly workouts
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weeklyWorkouts = (healthKit.healthMetrics.recentWorkouts || []).filter(
        (workout: any) => new Date(workout.date) >= oneWeekAgo
      ).length;
      
      // VALIDATION: No fallback for weight - null means no data available
      const lastWeight = healthKit.healthMetrics.weight;
      if (!lastWeight || lastWeight === 0) {
        console.warn('[useHealthKitDashboard] Weight data missing from HealthKit');
      }

      setDashboardData({
        todaySteps: healthKit.healthMetrics.steps,
        todayCalories: healthKit.healthMetrics.activeCalories,
        weeklyWorkouts,
        lastWeight: lastWeight || null, // null = show "no data" UI instead of 0
        sleepScore: healthKit.healthMetrics.sleepHours ?
          Math.round((healthKit.healthMetrics.sleepHours / 8) * 100) : 0,
      });
    };
    
    updateDashboardData();
  }, [healthKit.healthMetrics]);
  
  return {
    ...healthKit,
    dashboardData,
    insights: healthKit.getHealthInsights(),
  };
};

export default useHealthKitSync;