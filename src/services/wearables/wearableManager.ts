// Unified Wearables Manager for FitAI
// Provides cross-platform health data synchronization across all major platforms

import { Platform } from 'react-native';
import { healthKitService, HealthKitData } from '../healthKit';
import { googleFitService, GoogleFitData } from '../googleFit';

export interface UnifiedHealthData {
  steps: number;
  calories: number;
  distance: number; // in km
  heartRate?: number;
  weight?: number;
  sleepHours?: number;
  workouts: Array<{
    id: string;
    type: string;
    name: string;
    duration: number;
    calories: number;
    date: string;
    source: string;
  }>;
  lastSyncDate: string;
  platform: 'ios' | 'android' | 'web';
}

export interface UnifiedHeartRateZones {
  restingHR?: number;
  maxHR: number;
  zones: {
    zone1: { min: number; max: number; name: string }; // Recovery
    zone2: { min: number; max: number; name: string }; // Aerobic Base
    zone3: { min: number; max: number; name: string }; // Aerobic
    zone4: { min: number; max: number; name: string }; // Lactate Threshold
    zone5: { min: number; max: number; name: string }; // VO2 Max
  };
}

export interface UnifiedSleepRecommendations {
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent';
  sleepDuration: number;
  recommendations: {
    intensityAdjustment: number; // -2 to +2 scale
    workoutType: 'recovery' | 'light' | 'moderate' | 'intense';
    duration: 'shorter' | 'normal' | 'longer';
    notes: string[];
  };
}

export interface UnifiedActivityAdjustedCalories {
  adjustedCalories: number;
  activityMultiplier: number;
  breakdown: {
    baseCalories: number;
    activeEnergy: number;
    exerciseBonus: number;
    stepBonus: number;
  };
  recommendations: string[];
}

export interface UnifiedDetectedActivities {
  detectedActivities: Array<{
    type: string;
    confidence: number;
    duration: number;
    startTime: string;
    endTime: string;
  }>;
  autoLoggedCount: number;
}

export interface WearableIntegrationStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  platform: 'ios' | 'android' | 'web';
  serviceName: string;
  supportedFeatures: string[];
  lastSync?: string;
}

export interface WearableExportData {
  type: string;
  name: string;
  startDate: Date;
  endDate: Date;
  calories: number;
  distance?: number;
}

export interface NutritionExportData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water?: number;
  date: Date;
}

class WearableManager {
  private currentPlatform: 'ios' | 'android' | 'web';

  constructor() {
    this.currentPlatform = Platform.OS === 'ios' ? 'ios' : 
                          Platform.OS === 'android' ? 'android' : 'web';
  }

  /**
   * Initialize the appropriate wearable service based on platform
   */
  async initialize(): Promise<boolean> {
    try {
      console.log(`🚀 Initializing wearable manager for ${this.currentPlatform}...`);

      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.initialize();
        
        case 'android':
          return await googleFitService.initialize();
        
        case 'web':
          console.log('💻 Web platform detected - wearables not supported');
          return false;
        
        default:
          console.warn('⚠️ Unknown platform - wearables not supported');
          return false;
      }
    } catch (error) {
      console.error('❌ Wearable manager initialization failed:', error);
      return false;
    }
  }

  /**
   * Request permissions for the current platform's wearable service
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log(`🔐 Requesting wearable permissions for ${this.currentPlatform}...`);

      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.requestPermissions();
        
        case 'android':
          return await googleFitService.requestPermissions();
        
        default:
          console.warn('⚠️ Platform does not support wearable permissions');
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to request wearable permissions:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted for current platform
   */
  async hasPermissions(): Promise<boolean> {
    try {
      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.hasPermissions();
        
        case 'android':
          return await googleFitService.hasPermissions();
        
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Error checking wearable permissions:', error);
      return false;
    }
  }

  /**
   * Sync health data from the current platform's wearable service
   */
  async syncHealthData(daysBack: number = 7): Promise<{
    success: boolean;
    data?: UnifiedHealthData;
    error?: string;
  }> {
    try {
      console.log(`🔄 Syncing health data from ${this.currentPlatform} wearables...`);

      let platformData: HealthKitData | GoogleFitData | null = null;

      switch (this.currentPlatform) {
        case 'ios': {
          const result = await healthKitService.syncHealthDataFromHealthKit(daysBack);
          if (result.success && result.data) {
            platformData = result.data;
          } else {
            return { success: false, error: result.error };
          }
          break;
        }
        
        case 'android': {
          const result = await googleFitService.syncHealthDataFromGoogleFit(daysBack);
          if (result.success && result.data) {
            platformData = result.data;
          } else {
            return { success: false, error: result.error };
          }
          break;
        }
        
        default:
          return { success: false, error: 'Platform not supported' };
      }

      if (!platformData) {
        return { success: false, error: 'No data received from wearable service' };
      }

      // Convert platform-specific data to unified format
      const unifiedData = this.convertToUnifiedFormat(platformData);

      return { success: true, data: unifiedData };

    } catch (error) {
      console.error('❌ Health data sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Export workout data to the current platform's wearable service
   */
  async exportWorkout(workout: WearableExportData): Promise<boolean> {
    try {
      console.log(`📤 Exporting workout to ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.exportWorkoutToHealthKit(workout);
        
        case 'android':
          return await googleFitService.exportWorkoutToGoogleFit(workout);
        
        default:
          console.warn('⚠️ Workout export not supported on this platform');
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to export workout:', error);
      return false;
    }
  }

  /**
   * Export nutrition data to the current platform's wearable service
   */
  async exportNutrition(nutrition: NutritionExportData): Promise<boolean> {
    try {
      console.log(`📤 Exporting nutrition to ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.exportNutritionToHealthKit(nutrition);
        
        case 'android':
          return await googleFitService.exportNutritionToGoogleFit(nutrition);
        
        default:
          console.warn('⚠️ Nutrition export not supported on this platform');
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to export nutrition:', error);
      return false;
    }
  }

  /**
   * Export body weight to the current platform's wearable service
   */
  async exportBodyWeight(weight: number, date: Date = new Date()): Promise<boolean> {
    try {
      console.log(`📤 Exporting body weight to ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.exportBodyWeightToHealthKit(weight, date);
        
        case 'android':
          return await googleFitService.exportBodyWeightToGoogleFit(weight, date);
        
        default:
          console.warn('⚠️ Body weight export not supported on this platform');
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to export body weight:', error);
      return false;
    }
  }

  /**
   * Get integration status for current platform
   */
  async getIntegrationStatus(): Promise<WearableIntegrationStatus> {
    try {
      const isAvailable = await this.isWearableServiceAvailable();
      const isAuthorized = await this.hasPermissions();
      
      let serviceName: string;
      let supportedFeatures: string[];
      let lastSync: string | undefined;

      switch (this.currentPlatform) {
        case 'ios':
          serviceName = 'Apple HealthKit';
          supportedFeatures = [
            'Steps', 'Heart Rate', 'Workouts', 'Sleep', 'Weight', 
            'Body Composition', 'Nutrition', 'Active Energy'
          ];
          const healthKitLastSync = await healthKitService.getLastSyncTime();
          lastSync = healthKitLastSync?.toISOString();
          break;
        
        case 'android':
          serviceName = 'Google Fit';
          supportedFeatures = [
            'Steps', 'Heart Rate', 'Workouts', 'Sleep', 'Weight', 
            'Distance', 'Calories', 'Activities'
          ];
          const googleFitLastSync = await googleFitService.getLastSyncTime();
          lastSync = googleFitLastSync?.toISOString();
          break;
        
        default:
          serviceName = 'Not Supported';
          supportedFeatures = [];
          break;
      }

      return {
        isAvailable,
        isAuthorized,
        platform: this.currentPlatform,
        serviceName,
        supportedFeatures,
        lastSync,
      };
    } catch (error) {
      console.error('❌ Error getting integration status:', error);
      return {
        isAvailable: false,
        isAuthorized: false,
        platform: this.currentPlatform,
        serviceName: 'Error',
        supportedFeatures: [],
      };
    }
  }

  /**
   * Get health summary from current platform
   */
  async getHealthSummary(): Promise<any> {
    try {
      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.getHealthSummary();
        
        case 'android':
          return await googleFitService.getHealthSummary();
        
        default:
          return {
            dailySteps: 0,
            dailyCalories: 0,
            recentWorkouts: 0,
            syncStatus: 'never_synced',
          };
      }
    } catch (error) {
      console.error('❌ Error getting health summary:', error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        recentWorkouts: 0,
        syncStatus: 'never_synced',
      };
    }
  }

  /**
   * Clear all cached wearable data
   */
  async clearCache(): Promise<void> {
    try {
      console.log(`🧹 Clearing ${this.currentPlatform} wearable cache...`);

      switch (this.currentPlatform) {
        case 'ios':
          await healthKitService.clearCache();
          break;
        
        case 'android':
          await googleFitService.clearCache();
          break;
        
        default:
          console.log('💻 No cache to clear on this platform');
          break;
      }

      console.log('✅ Wearable cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing wearable cache:', error);
    }
  }

  /**
   * Check if wearable service is available on current platform
   */
  private async isWearableServiceAvailable(): Promise<boolean> {
    try {
      switch (this.currentPlatform) {
        case 'ios':
          return await healthKitService.initialize();
        
        case 'android':
          return await googleFitService.initialize();
        
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Error checking wearable service availability:', error);
      return false;
    }
  }

  /**
   * Convert platform-specific data to unified format
   */
  private convertToUnifiedFormat(platformData: HealthKitData | GoogleFitData): UnifiedHealthData {
    // Handle HealthKit data (iOS)
    if ('sleepHours' in platformData) {
      const healthKitData = platformData as HealthKitData;

      return {
        steps: healthKitData.steps || 0,
        calories: healthKitData.activeEnergy || 0,
        distance: healthKitData.distance || 0,
        heartRate: healthKitData.heartRate,
        weight: healthKitData.bodyWeight,
        sleepHours: healthKitData.sleepHours,
        workouts: healthKitData.workouts?.map(workout => ({
          id: workout.id,
          type: workout.activityType,
          name: workout.activityType,
          duration: workout.duration,
          calories: workout.energyBurned,
          date: workout.startDate.toISOString(),
          source: 'HealthKit',
        })) || [],
        lastSyncDate: new Date().toISOString(),
        platform: 'ios',
      };
    }
    
    // Handle Google Fit data (Android)
    const googleFitData = platformData as GoogleFitData;
    
    return {
      steps: googleFitData.steps || 0,
      calories: googleFitData.calories || 0,
      distance: googleFitData.distance ? Math.round(googleFitData.distance / 1000 * 10) / 10 : 0, // Convert meters to km
      heartRate: googleFitData.heartRate,
      weight: googleFitData.weight,
      sleepHours: googleFitData.sleepData?.length ? 
        googleFitData.sleepData.reduce((sum, sleep) => sum + sleep.duration, 0) / 60 : undefined,
      workouts: googleFitData.workouts?.map(workout => ({
        id: workout.id,
        type: workout.type,
        name: workout.name,
        duration: workout.duration,
        calories: workout.calories,
        date: workout.startDate,
        source: 'Google Fit',
      })) || [],
      lastSyncDate: googleFitData.lastSyncDate || new Date().toISOString(),
      platform: 'android',
    };
  }

  /**
   * Get heart rate zones from current platform's wearable service
   */
  async getHeartRateZones(age: number): Promise<UnifiedHeartRateZones | null> {
    try {
      console.log(`💓 Getting heart rate zones from ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios': {
          const zones = await healthKitService.getHeartRateZones(age);
          return zones;
        }
        
        case 'android': {
          const zones = await googleFitService.getHeartRateZones(age);
          return zones;
        }
        
        default:
          console.warn('⚠️ Heart rate zones not supported on this platform');
          return null;
      }
    } catch (error) {
      console.error('❌ Failed to get heart rate zones:', error);
      return null;
    }
  }

  /**
   * Get sleep-based workout recommendations from current platform's wearable service
   */
  async getSleepBasedWorkoutRecommendations(): Promise<UnifiedSleepRecommendations | null> {
    try {
      console.log(`😴 Getting sleep recommendations from ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios': {
          const recommendations = await healthKitService.getSleepBasedWorkoutRecommendations();
          return recommendations;
        }
        
        case 'android': {
          const recommendations = await googleFitService.getSleepBasedWorkoutRecommendations();
          return recommendations;
        }
        
        default:
          console.warn('⚠️ Sleep recommendations not supported on this platform');
          return null;
      }
    } catch (error) {
      console.error('❌ Failed to get sleep recommendations:', error);
      return null;
    }
  }

  /**
   * Get activity-adjusted calories from current platform's wearable service
   */
  async getActivityAdjustedCalories(baseCalories: number): Promise<UnifiedActivityAdjustedCalories | null> {
    try {
      console.log(`🔥 Getting activity-adjusted calories from ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios': {
          const calories = await healthKitService.getActivityAdjustedCalories(baseCalories);
          return calories;
        }
        
        case 'android': {
          const calories = await googleFitService.getActivityAdjustedCalories(baseCalories);
          return calories;
        }
        
        default:
          console.warn('⚠️ Activity-adjusted calories not supported on this platform');
          return null;
      }
    } catch (error) {
      console.error('❌ Failed to get activity-adjusted calories:', error);
      return null;
    }
  }

  /**
   * Detect and log activities from current platform's wearable service
   */
  async detectAndLogActivities(): Promise<UnifiedDetectedActivities | null> {
    try {
      console.log(`🎯 Detecting activities from ${this.currentPlatform} wearables...`);

      switch (this.currentPlatform) {
        case 'ios': {
          const activities = await healthKitService.detectAndLogActivities();
          return activities;
        }
        
        case 'android': {
          const activities = await googleFitService.detectAndLogActivities();
          return activities;
        }
        
        default:
          console.warn('⚠️ Activity detection not supported on this platform');
          return null;
      }
    } catch (error) {
      console.error('❌ Failed to detect activities:', error);
      return null;
    }
  }

  /**
   * Get comprehensive wearable insights combining all advanced features
   */
  async getWearableInsights(age: number, baseCalories: number): Promise<{
    heartRateZones?: UnifiedHeartRateZones;
    sleepRecommendations?: UnifiedSleepRecommendations;
    adjustedCalories?: UnifiedActivityAdjustedCalories;
    recentActivities?: UnifiedDetectedActivities;
    platform: string;
    timestamp: string;
  }> {
    try {
      console.log(`🧠 Getting comprehensive wearable insights from ${this.currentPlatform}...`);

      const [heartRateZones, sleepRecommendations, adjustedCalories, recentActivities] = await Promise.all([
        this.getHeartRateZones(age),
        this.getSleepBasedWorkoutRecommendations(),
        this.getActivityAdjustedCalories(baseCalories),
        this.detectAndLogActivities(),
      ]);

      return {
        heartRateZones: heartRateZones || undefined,
        sleepRecommendations: sleepRecommendations || undefined,
        adjustedCalories: adjustedCalories || undefined,
        recentActivities: recentActivities || undefined,
        platform: this.currentPlatform,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to get wearable insights:', error);
      return {
        platform: this.currentPlatform,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get current platform information
   */
  getPlatformInfo(): {
    platform: 'ios' | 'android' | 'web';
    serviceName: string;
    isSupported: boolean;
  } {
    return {
      platform: this.currentPlatform,
      serviceName: this.currentPlatform === 'ios' ? 'Apple HealthKit' : 
                   this.currentPlatform === 'android' ? 'Google Fit' : 
                   'Not Supported',
      isSupported: this.currentPlatform !== 'web',
    };
  }
}

export const wearableManager = new WearableManager();
export default wearableManager;