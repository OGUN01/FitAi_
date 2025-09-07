// Health Data Store for managing HealthKit integration state
// Handles health metrics, sync status, and integration preferences

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthKitService, HealthKitData, HealthSyncResult } from '../services/healthKit';
import { googleFitService, GoogleFitData, GoogleFitSyncResult } from '../services/googleFit';
import { healthConnectService, HealthConnectData, HealthConnectSyncResult } from '../services/healthConnect';

export interface HealthMetrics {
  // Daily Activity
  steps: number;
  activeCalories: number;
  distance?: number; // in kilometers
  
  // Body Metrics
  weight?: number; // in kg
  bodyFatPercentage?: number;
  muscleMass?: number;
  
  // Vital Signs
  heartRate?: number; // BPM
  restingHeartRate?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  
  // Recovery & Sleep
  sleepHours?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  stressLevel?: number; // 1-10 scale
  
  // Workout Data
  recentWorkouts: Array<{
    id: string;
    type: string;
    duration: number;
    calories: number;
    date: string;
    source: 'FitAI' | 'HealthKit' | 'Manual' | 'GoogleFit';
  }>;
  
  // Timing
  lastUpdated: string;
}

export interface HealthIntegrationSettings {
  healthKitEnabled: boolean;
  healthConnectEnabled: boolean; // Health Connect integration
  autoSyncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily'; // How often to sync
  dataTypesToSync: {
    steps: boolean;
    heartRate: boolean;
    workouts: boolean;
    sleep: boolean;
    weight: boolean;
    nutrition: boolean;
  };
  exportToHealthKit: boolean; // Whether to write FitAI data to HealthKit
  backgroundSyncEnabled: boolean;
  preferredProvider: 'healthkit' | 'googlefit' | 'healthconnect'; // User's preferred health data provider
}

export interface HealthDataState {
  // Current Health Data
  metrics: HealthMetrics;
  
  // Integration Status
  isHealthKitAvailable: boolean;
  isHealthKitAuthorized: boolean;
  isHealthConnectAvailable: boolean; // Health Connect availability
  isHealthConnectAuthorized: boolean; // Health Connect authorization
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime?: string;
  syncError?: string;
  
  // Settings
  settings: HealthIntegrationSettings;
  
  // UI State
  showingHealthDashboard: boolean;
  healthTipOfDay?: string;
  
  // Actions
  initializeHealthKit: () => Promise<boolean>;
  requestHealthKitPermissions: () => Promise<boolean>;
  initializeHealthConnect: () => Promise<boolean>; // Health Connect initialization
  requestHealthConnectPermissions: () => Promise<boolean>; // Health Connect permissions
  syncHealthData: (force?: boolean) => Promise<void>;
  syncFromHealthConnect: (daysBack?: number) => Promise<HealthConnectSyncResult>; // Health Connect sync
  updateHealthMetrics: (metrics: Partial<HealthMetrics>) => void;
  updateSettings: (settings: Partial<HealthIntegrationSettings>) => void;
  exportWorkoutToHealthKit: (workout: {
    type: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
  }) => Promise<boolean>;
  exportNutritionToHealthKit: (nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water?: number;
    date: Date;
  }) => Promise<boolean>;
  
  // Advanced Health Features (Roadmap Week 1 requirements)
  getHeartRateZones: (age: number) => Promise<{
    restingHR?: number;
    maxHR: number;
    zones: Record<string, { min: number; max: number; name: string }>;
  }>;
  getSleepRecommendations: () => Promise<{
    sleepQuality: string;
    sleepDuration: number;
    workoutRecommendations: {
      intensityAdjustment: number;
      workoutType: string;
      duration: string;
      notes: string[];
    };
  }>;
  getActivityAdjustedCalories: (baseCalories: number) => Promise<{
    adjustedCalories: number;
    activityMultiplier: number;
    breakdown: Record<string, number>;
    recommendations: string[];
  }>;
  
  setShowHealthDashboard: (show: boolean) => void;
  getHealthInsights: () => string[];
  resetHealthData: () => void;
}

export const useHealthDataStore = create<HealthDataState>()(
  persist(
    (set, get) => ({
      // Initial State
      metrics: {
        steps: 0,
        activeCalories: 0,
        recentWorkouts: [],
        lastUpdated: new Date().toISOString(),
      },
      
      isHealthKitAvailable: false,
      isHealthKitAuthorized: false,
      isHealthConnectAvailable: false, // Health Connect availability
      isHealthConnectAuthorized: false, // Health Connect authorization
      syncStatus: 'idle',
      
      settings: {
        healthKitEnabled: true,
        healthConnectEnabled: true, // Enable Health Connect by default
        autoSyncEnabled: true,
        syncFrequency: 'hourly',
        dataTypesToSync: {
          steps: true,
          heartRate: true,
          workouts: true,
          sleep: true,
          weight: true,
          nutrition: false, // Default off for privacy
        },
        exportToHealthKit: true,
        backgroundSyncEnabled: true,
        preferredProvider: 'healthconnect', // Default to Health Connect for Android
      },
      
      showingHealthDashboard: false,
      
      // Actions
      initializeHealthKit: async (): Promise<boolean> => {
        try {
          console.log('🍎 Initializing HealthKit in store...');
          
          const isAvailable = await healthKitService.initialize();
          const hasPermissions = await healthKitService.hasPermissions();
          
          set({
            isHealthKitAvailable: isAvailable,
            isHealthKitAuthorized: hasPermissions,
          });
          
          // If we have permissions, perform initial sync
          if (isAvailable && hasPermissions) {
            get().syncHealthData(false);
          }
          
          return isAvailable;
        } catch (error) {
          console.error('❌ Failed to initialize HealthKit:', error);
          return false;
        }
      },
      
      requestHealthKitPermissions: async (): Promise<boolean> => {
        try {
          console.log('🔐 Requesting HealthKit permissions...');
          set({ syncStatus: 'syncing' });
          
          const granted = await healthKitService.requestPermissions();
          
          set({
            isHealthKitAuthorized: granted,
            syncStatus: granted ? 'success' : 'error',
            syncError: granted ? undefined : 'HealthKit permissions denied',
          });
          
          // If permissions granted, perform initial sync
          if (granted) {
            await get().syncHealthData(true);
          }
          
          return granted;
        } catch (error) {
          console.error('❌ Failed to request HealthKit permissions:', error);
          set({
            syncStatus: 'error',
            syncError: error instanceof Error ? error.message : 'Permission request failed',
          });
          return false;
        }
      },

      // Health Connect Actions
      initializeHealthConnect: async (): Promise<boolean> => {
        try {
          console.log('🔗 Initializing Health Connect in store...');
          
          // Check if Health Connect is available and initialize
          const isAvailable = await healthConnectService.initializeHealthConnect();
          
          if (isAvailable) {
            // Check if permissions are already granted
            const hasPermissions = await healthConnectService.hasPermissions();
            console.log(`Health Connect - Available: ${isAvailable}, Permissions: ${hasPermissions}`);
            
            // Update store state
            set((state) => ({
              isHealthConnectAvailable: isAvailable,
              isHealthConnectAuthorized: hasPermissions,
            }));
            
            return hasPermissions;
          }
          
          set({ isHealthConnectAvailable: false });
          return false;
        } catch (error) {
          console.error('❌ Failed to initialize Health Connect:', error);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      requestHealthConnectPermissions: async (): Promise<boolean> => {
        try {
          console.log('🔐 Requesting Health Connect permissions from store...');
          
          const permissionGranted = await healthConnectService.requestPermissions();
          
          // Update store state based on permission result
          set((state) => ({
            isHealthConnectAuthorized: permissionGranted,
            syncStatus: permissionGranted ? 'idle' : 'error',
          }));
          
          return permissionGranted;
        } catch (error) {
          console.error('❌ Failed to request Health Connect permissions:', error);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      syncFromHealthConnect: async (daysBack: number = 7): Promise<HealthConnectSyncResult> => {
        try {
          console.log('🔄 Syncing health data from Health Connect...');
          
          // Update sync status to loading
          set({ syncStatus: 'syncing' });
          
          // Perform health data sync
          const healthData = await healthConnectService.syncHealthData(daysBack);
          
          if (healthData.success && healthData.data) {
            // Update store state with new health data
            set((state) => ({
              metrics: {
                ...state.metrics,
                // Update each metric with new data, fallback to existing if not available
                steps: healthData.data?.steps ?? state.metrics.steps,
                heartRate: healthData.data?.heartRate ?? state.metrics.heartRate,
                activeCalories: healthData.data?.activeCalories ?? state.metrics.activeCalories,
                distance: healthData.data?.distance ? healthData.data.distance / 1000 : state.metrics.distance, // Convert to km
                weight: healthData.data?.weight ?? state.metrics.weight,
                sleepHours: healthData.data?.sleep ? 
                  healthData.data.sleep.reduce((total, sleep) => total + sleep.duration, 0) / 60 : 
                  state.metrics.sleepHours,
                lastUpdated: new Date().toISOString(),
              },
              lastSyncTime: Date.now().toString(),
              syncStatus: 'success',
            }));

            console.log('✅ Health Connect sync completed successfully');
          } else {
            set({
              syncStatus: 'error',
              syncError: healthData.error || 'Unknown Health Connect sync error',
            });
          }
          
          return healthData;
          
        } catch (error) {
          console.error('❌ Health Connect sync failed:', error);
          
          // Update store state to reflect error
          set({ syncStatus: 'error' });
          
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown sync error' 
          };
        }
      },
      
      syncHealthData: async (force: boolean = false): Promise<void> => {
        try {
          const { settings, isHealthKitAuthorized } = get();
          
          if (!settings.healthKitEnabled || !isHealthKitAuthorized) {
            console.log('⏸️ HealthKit sync disabled or not authorized');
            return;
          }
          
          // Check if sync is needed
          if (!force && !await healthKitService.shouldSync()) {
            console.log('⏰ HealthKit sync not needed yet');
            return;
          }
          
          console.log('🔄 Starting HealthKit sync...');
          set({ syncStatus: 'syncing', syncError: undefined });
          
          const syncResult: HealthSyncResult = await healthKitService.syncHealthDataFromHealthKit(7);
          
          if (syncResult.success && syncResult.data) {
            // Update metrics from HealthKit data
            const newMetrics: HealthMetrics = {
              ...get().metrics,
              steps: syncResult.data.steps || 0,
              activeCalories: syncResult.data.activeEnergy || 0,
              weight: syncResult.data.bodyWeight,
              heartRate: syncResult.data.heartRate,
              sleepHours: syncResult.data.sleepHours,
              recentWorkouts: [
                ...get().metrics.recentWorkouts,
                ...(syncResult.data.workouts?.map(workout => ({
                  id: workout.id,
                  type: workout.workoutType,
                  duration: workout.duration,
                  calories: workout.calories,
                  date: workout.startDate,
                  source: 'HealthKit' as const,
                })) || [])
              ].slice(-20), // Keep only last 20 workouts
              lastUpdated: new Date().toISOString(),
            };
            
            set({
              metrics: newMetrics,
              syncStatus: 'success',
              lastSyncTime: new Date().toISOString(),
              syncError: undefined,
            });
            
            console.log('✅ HealthKit sync completed successfully');
            
            // Generate health tip based on new data
            const insights = get().getHealthInsights();
            if (insights.length > 0) {
              set({ healthTipOfDay: insights[0] });
            }
            
          } else {
            throw new Error(syncResult.error || 'Sync failed');
          }
          
        } catch (error) {
          console.error('❌ HealthKit sync failed:', error);
          set({
            syncStatus: 'error',
            syncError: error instanceof Error ? error.message : 'Sync failed',
          });
        }
      },
      
      updateHealthMetrics: (newMetrics: Partial<HealthMetrics>): void => {
        set(state => ({
          metrics: {
            ...state.metrics,
            ...newMetrics,
            lastUpdated: new Date().toISOString(),
          },
        }));
      },
      
      updateSettings: (newSettings: Partial<HealthIntegrationSettings>): void => {
        set(state => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
        
        // If HealthKit was enabled, initialize it
        if (newSettings.healthKitEnabled === true) {
          get().initializeHealthKit();
        }
      },
      
      exportWorkoutToHealthKit: async (workout): Promise<boolean> => {
        try {
          const { settings, isHealthKitAuthorized } = get();
          
          if (!settings.exportToHealthKit || !isHealthKitAuthorized) {
            console.log('⏸️ HealthKit export disabled or not authorized');
            return false;
          }
          
          console.log(`📤 Exporting workout to HealthKit: ${workout.type}`);
          
          const success = await healthKitService.exportWorkoutToHealthKit(workout);
          
          if (success) {
            // Add to our local workout history
            const workoutEntry = {
              id: `fitai_${Date.now()}`,
              type: workout.type,
              duration: Math.round((workout.endDate.getTime() - workout.startDate.getTime()) / 60000),
              calories: workout.calories,
              date: workout.startDate.toISOString(),
              source: 'FitAI' as const,
            };
            
            get().updateHealthMetrics({
              recentWorkouts: [...get().metrics.recentWorkouts, workoutEntry].slice(-20),
            });
          }
          
          return success;
        } catch (error) {
          console.error('❌ Failed to export workout to HealthKit:', error);
          return false;
        }
      },
      
      exportNutritionToHealthKit: async (nutrition): Promise<boolean> => {
        try {
          const { settings, isHealthKitAuthorized } = get();
          
          if (!settings.exportToHealthKit || !settings.dataTypesToSync.nutrition || !isHealthKitAuthorized) {
            console.log('⏸️ HealthKit nutrition export disabled or not authorized');
            return false;
          }
          
          console.log(`📤 Exporting nutrition to HealthKit for ${nutrition.date.toDateString()}`);
          
          return await healthKitService.exportNutritionToHealthKit(nutrition);
        } catch (error) {
          console.error('❌ Failed to export nutrition to HealthKit:', error);
          return false;
        }
      },
      
      setShowHealthDashboard: (show: boolean): void => {
        set({ showingHealthDashboard: show });
      },
      
      getHealthInsights: (): string[] => {
        const { metrics } = get();
        const insights: string[] = [];
        
        // Steps insights
        if (metrics.steps > 0) {
          if (metrics.steps >= 10000) {
            insights.push("🎉 Great job! You've exceeded your daily step goal.");
          } else if (metrics.steps >= 5000) {
            insights.push(`💪 You're halfway to your step goal! ${10000 - metrics.steps} steps to go.`);
          } else {
            insights.push("🚶 Consider taking a walk to boost your daily activity.");
          }
        }
        
        // Heart rate insights
        if (metrics.heartRate) {
          if (metrics.heartRate > 100) {
            insights.push("❤️ Your heart rate suggests you've been active - great work!");
          } else if (metrics.restingHeartRate && metrics.heartRate < metrics.restingHeartRate + 20) {
            insights.push("🧘 Your heart rate indicates good recovery - perfect for your next workout.");
          }
        }
        
        // Sleep insights
        if (metrics.sleepHours) {
          if (metrics.sleepHours >= 7) {
            insights.push(`😴 Excellent sleep! ${metrics.sleepHours} hours will fuel your fitness goals.`);
          } else if (metrics.sleepHours >= 6) {
            insights.push("💤 Decent sleep, but aim for 7-8 hours for optimal recovery.");
          } else {
            insights.push("⚠️ Low sleep detected. Consider adjusting workout intensity today.");
          }
        }
        
        // Workout consistency
        if (metrics.recentWorkouts.length >= 3) {
          insights.push("🔥 Amazing consistency! Regular workouts are building your fitness foundation.");
        } else if (metrics.recentWorkouts.length === 0) {
          insights.push("🏃 Ready to start your fitness journey? Your first workout awaits!");
        }
        
        // Weight tracking
        if (metrics.weight) {
          insights.push("📊 Weight tracking active - consistency is key for accurate progress monitoring.");
        }
        
        return insights;
      },
      
      // Advanced Health Features (Roadmap Week 1 implementations)
      getHeartRateZones: async (age: number) => {
        try {
          console.log('❤️ Getting heart rate zones from HealthKit...');
          return await healthKitService.getHeartRateZones(age);
        } catch (error) {
          console.error('❌ Failed to get heart rate zones:', error);
          // Return default zones based on age
          const maxHR = 220 - age;
          return {
            maxHR,
            zones: {
              zone1: { min: Math.round(maxHR * 0.5), max: Math.round(maxHR * 0.6), name: 'Recovery' },
              zone2: { min: Math.round(maxHR * 0.6), max: Math.round(maxHR * 0.7), name: 'Aerobic Base' },
              zone3: { min: Math.round(maxHR * 0.7), max: Math.round(maxHR * 0.8), name: 'Aerobic' },
              zone4: { min: Math.round(maxHR * 0.8), max: Math.round(maxHR * 0.9), name: 'Lactate Threshold' },
              zone5: { min: Math.round(maxHR * 0.9), max: maxHR, name: 'VO2 Max' }
            }
          };
        }
      },
      
      getSleepRecommendations: async () => {
        try {
          console.log('😴 Getting sleep-based workout recommendations...');
          const recommendations = await healthKitService.getSleepBasedWorkoutRecommendations();
          return {
            sleepQuality: recommendations.sleepQuality,
            sleepDuration: recommendations.sleepDuration,
            workoutRecommendations: recommendations.recommendations
          };
        } catch (error) {
          console.error('❌ Failed to get sleep recommendations:', error);
          return {
            sleepQuality: 'fair',
            sleepDuration: 7,
            workoutRecommendations: {
              intensityAdjustment: 0,
              workoutType: 'moderate',
              duration: 'normal',
              notes: ['Sleep data unavailable - proceeding with normal workout']
            }
          };
        }
      },
      
      getActivityAdjustedCalories: async (baseCalories: number) => {
        try {
          console.log('🔥 Getting activity-adjusted calories...');
          return await healthKitService.getActivityAdjustedCalories(baseCalories);
        } catch (error) {
          console.error('❌ Failed to get activity-adjusted calories:', error);
          return {
            adjustedCalories: baseCalories,
            activityMultiplier: 1.0,
            breakdown: {
              baseCalories,
              activeEnergy: 0,
              exerciseBonus: 0,
              stepBonus: 0
            },
            recommendations: ['Error calculating activity adjustment - using base calories']
          };
        }
      },
      
      // Google Fit Integration (Android) - Week 2 Roadmap Implementation
      initializeGoogleFit: async (): Promise<boolean> => {
        try {
          console.log('🤖 Initializing Google Fit in store...');
          const isAvailable = await googleFitService.initialize();
          
          if (isAvailable) {
            const hasPermissions = await googleFitService.hasPermissions();
            console.log(`🤖 Google Fit available: ${isAvailable}, permissions: ${hasPermissions}`);
            return hasPermissions;
          }
          
          return false;
        } catch (error) {
          console.error('❌ Failed to initialize Google Fit:', error);
          return false;
        }
      },
      
      syncFromGoogleFit: async (daysBack: number = 7): Promise<GoogleFitSyncResult> => {
        try {
          console.log('🤖 Syncing data from Google Fit...');
          set({ syncStatus: 'syncing' });
          
          const result = await googleFitService.syncHealthDataFromGoogleFit(daysBack);
          
          if (result.success && result.data) {
            // Update health metrics with Google Fit data
            const currentMetrics = get().metrics;
            const updatedMetrics: HealthMetrics = {
              ...currentMetrics,
              steps: result.data.steps || currentMetrics.steps,
              activeCalories: result.data.calories || currentMetrics.activeCalories,
              distance: result.data.distance ? result.data.distance / 1000 : currentMetrics.distance, // Convert to km
              heartRate: result.data.heartRate || currentMetrics.heartRate,
              weight: result.data.weight || currentMetrics.weight,
              lastUpdated: new Date().toISOString(),
            };
            
            // Add Google Fit workouts to recent workouts
            if (result.data.workouts) {
              updatedMetrics.recentWorkouts = [
                ...result.data.workouts.map(workout => ({
                  id: workout.id,
                  type: workout.type,
                  duration: workout.duration,
                  calories: workout.calories,
                  date: workout.startDate,
                  source: 'GoogleFit' as const
                })),
                ...currentMetrics.recentWorkouts.filter(w => w.source !== 'GoogleFit').slice(0, 5)
              ].slice(0, 10);
            }
            
            set({
              metrics: updatedMetrics,
              syncStatus: 'success',
              lastSyncTime: new Date().toISOString(),
              syncError: undefined,
            });
            
            console.log('✅ Google Fit sync completed successfully');
          } else {
            set({
              syncStatus: 'error',
              syncError: result.error || 'Unknown Google Fit sync error',
            });
            console.error('❌ Google Fit sync failed:', result.error);
          }
          
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            syncStatus: 'error',
            syncError: errorMessage,
          });
          console.error('❌ Google Fit sync failed:', error);
          return {
            success: false,
            error: errorMessage
          };
        }
      },
      
      // Advanced Google Fit Features (Week 2 Roadmap)
      getGoogleFitHeartRateZones: async (age: number) => {
        try {
          console.log('❤️ Getting heart rate zones from Google Fit...');
          return await googleFitService.getHeartRateZones(age);
        } catch (error) {
          console.error('❌ Failed to get heart rate zones from Google Fit:', error);
          // Return default zones based on age
          const maxHR = 220 - age;
          return {
            maxHR,
            zones: {
              zone1: { min: Math.round(maxHR * 0.5), max: Math.round(maxHR * 0.6), name: 'Recovery' },
              zone2: { min: Math.round(maxHR * 0.6), max: Math.round(maxHR * 0.7), name: 'Aerobic Base' },
              zone3: { min: Math.round(maxHR * 0.7), max: Math.round(maxHR * 0.8), name: 'Aerobic' },
              zone4: { min: Math.round(maxHR * 0.8), max: Math.round(maxHR * 0.9), name: 'Lactate Threshold' },
              zone5: { min: Math.round(maxHR * 0.9), max: maxHR, name: 'VO2 Max' }
            }
          };
        }
      },
      
      getGoogleFitSleepRecommendations: async () => {
        try {
          console.log('😴 Getting sleep-based workout recommendations from Google Fit...');
          const recommendations = await googleFitService.getSleepBasedWorkoutRecommendations();
          return {
            sleepQuality: recommendations.sleepQuality,
            sleepDuration: recommendations.sleepDuration,
            workoutRecommendations: recommendations.recommendations
          };
        } catch (error) {
          console.error('❌ Failed to get sleep recommendations from Google Fit:', error);
          return {
            sleepQuality: 'fair',
            sleepDuration: 7,
            workoutRecommendations: {
              intensityAdjustment: 0,
              workoutType: 'moderate',
              duration: 'normal',
              notes: ['Sleep data unavailable - proceeding with normal workout']
            }
          };
        }
      },
      
      getGoogleFitActivityAdjustedCalories: async (baseCalories: number) => {
        try {
          console.log('🔥 Getting activity-adjusted calories from Google Fit...');
          return await googleFitService.getActivityAdjustedCalories(baseCalories);
        } catch (error) {
          console.error('❌ Failed to get activity-adjusted calories from Google Fit:', error);
          return {
            adjustedCalories: baseCalories,
            activityMultiplier: 1.0,
            breakdown: {
              baseCalories,
              activeEnergy: 0,
              exerciseBonus: 0,
              stepBonus: 0
            },
            recommendations: ['Error calculating activity adjustment - using base calories']
          };
        }
      },
      
      detectAndLogGoogleFitActivities: async () => {
        try {
          console.log('🤖 Detecting and logging activities from Google Fit...');
          return await googleFitService.detectAndLogActivities();
        } catch (error) {
          console.error('❌ Failed to detect activities from Google Fit:', error);
          return {
            detectedActivities: [],
            autoLoggedCount: 0
          };
        }
      },
      
      resetHealthData: (): void => {
        set({
          metrics: {
            steps: 0,
            activeCalories: 0,
            recentWorkouts: [],
            lastUpdated: new Date().toISOString(),
          },
          syncStatus: 'idle',
          lastSyncTime: undefined,
          syncError: undefined,
          healthTipOfDay: undefined,
        });
      },
    }),
    {
      name: 'fitai-health-data-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        metrics: state.metrics,
        settings: state.settings,
        isHealthKitAuthorized: state.isHealthKitAuthorized,
        isHealthConnectAuthorized: state.isHealthConnectAuthorized, // Persist Health Connect auth
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);