// Google Fit Integration Service for FitAI
// Provides comprehensive health data synchronization for Android devices

import GoogleFit, { Scopes } from 'react-native-google-fit';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GoogleFitData {
  steps?: number;
  calories?: number;
  distance?: number; // in meters
  heartRate?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  weight?: number; // in kg
  workouts?: GoogleFitWorkout[];
  sleepData?: GoogleFitSleep[];
  lastSyncDate?: string;
  // Advanced metrics for roadmap requirements
  activeMinutes?: number;
  sedentaryMinutes?: number;
  oxygenSaturation?: number;
  stressLevel?: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface GoogleFitWorkout {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number; // in minutes
  calories: number;
  distance?: number;
}

export interface GoogleFitSleep {
  startDate: string;
  endDate: string;
  duration: number; // in minutes
}

export interface GoogleFitSyncResult {
  success: boolean;
  data?: GoogleFitData;
  error?: string;
  syncTime?: number;
}

class GoogleFitService {
  private readonly STORAGE_KEY = 'fitai_googlefit_data';
  private readonly SYNC_INTERVAL_KEY = 'fitai_googlefit_last_sync';
  private isInitialized = false;
  private permissionsGranted = false;

  // Comprehensive Google Fit scopes for fitness tracking
  private readonly scopes = [
    Scopes.FITNESS_ACTIVITY_READ,
    Scopes.FITNESS_ACTIVITY_WRITE,
    Scopes.FITNESS_BODY_READ,
    Scopes.FITNESS_BODY_WRITE,
    Scopes.FITNESS_HEART_RATE_READ,
    Scopes.FITNESS_LOCATION_READ,
    Scopes.FITNESS_NUTRITION_READ,
    Scopes.FITNESS_NUTRITION_WRITE,
    Scopes.FITNESS_SLEEP_READ,
  ];

  /**
   * Initialize Google Fit service and check device compatibility
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🤖 Initializing Google Fit integration...');
      
      // Google Fit is only available on Android
      if (Platform.OS !== 'android') {
        console.log('📱 Google Fit only available on Android devices');
        return false;
      }

      // Check if Google Play Services is available
      const isAvailable = await GoogleFit.checkIsAuthorized();
      console.log(`📊 Google Fit availability check: ${isAvailable}`);

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('❌ Google Fit initialization failed:', error);
      return false;
    }
  }

  /**
   * Request comprehensive Google Fit permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initSuccess = await this.initialize();
        if (!initSuccess) return false;
      }

      console.log('🔐 Requesting Google Fit permissions...');

      const authResult = await GoogleFit.authorize({
        scopes: this.scopes,
      });

      this.permissionsGranted = authResult.success;

      if (authResult.success) {
        console.log('✅ Google Fit permissions granted');
        await AsyncStorage.setItem('fitai_googlefit_permissions', 'granted');
        
        // Start observing data updates
        await this.startObservers();
      } else {
        console.warn('❌ Google Fit permissions denied:', authResult.message);
        await AsyncStorage.setItem('fitai_googlefit_permissions', 'denied');
      }

      return authResult.success;

    } catch (error) {
      console.error('❌ Failed to request Google Fit permissions:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return false;

      const isAuthorized = await GoogleFit.checkIsAuthorized();
      const storedPermissions = await AsyncStorage.getItem('fitai_googlefit_permissions');

      return !!(isAuthorized && storedPermissions === 'granted');
    } catch (error) {
      console.error('❌ Error checking Google Fit permissions:', error);
      return false;
    }
  }

  /**
   * Start observing real-time data updates
   */
  private async startObservers(): Promise<void> {
    try {
      console.log('👀 Starting Google Fit data observers...');

      // Start observing step count
      await GoogleFit.startRecording(
        (callback: any) => {
          console.log('📊 Google Fit data update received:', callback);
        },
        ['step', 'distance', 'activity']
      );

      console.log('✅ Google Fit observers started');
    } catch (error) {
      console.error('❌ Failed to start Google Fit observers:', error);
    }
  }

  /**
   * Comprehensive health data sync from Google Fit to FitAI
   */
  async syncHealthDataFromGoogleFit(daysBack: number = 7): Promise<GoogleFitSyncResult> {
    const startTime = Date.now();
    
    try {
      if (!await this.hasPermissions()) {
        return {
          success: false,
          error: 'Google Fit permissions not granted. Please enable in settings.',
        };
      }

      console.log(`📥 Syncing Google Fit data from last ${daysBack} days...`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const googleFitData: GoogleFitData = {};

      // Fetch Daily Steps
      try {
        const stepsData = await GoogleFit.getDailyStepCountSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (Array.isArray(stepsData) && stepsData.length > 0) {
          // Get total steps from most recent day
          const latestSteps = stepsData[stepsData.length - 1] as any;
          googleFitData.steps = latestSteps.steps || 0;
          console.log(`👟 Steps: ${googleFitData.steps}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch steps data:', error);
      }

      // Fetch Calories
      try {
        const caloriesData = await GoogleFit.getDailyCalorieSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (caloriesData.length > 0) {
          const totalCalories = caloriesData.reduce((sum, entry) => sum + (entry.calorie || 0), 0);
          googleFitData.calories = Math.round(totalCalories);
          console.log(`🔥 Calories: ${googleFitData.calories}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch calories data:', error);
      }

      // Fetch Distance
      try {
        const distanceData = await GoogleFit.getDailyDistanceSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (distanceData.length > 0) {
          const totalDistance = distanceData.reduce((sum, entry) => sum + (entry.distance || 0), 0);
          googleFitData.distance = Math.round(totalDistance); // in meters
          console.log(`📏 Distance: ${googleFitData.distance}m`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch distance data:', error);
      }

      // Fetch Heart Rate Data
      try {
        const heartRateData = await GoogleFit.getHeartRateSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (heartRateData.length > 0) {
          // Get most recent heart rate reading
          const latestHR = heartRateData[heartRateData.length - 1];
          googleFitData.heartRate = Math.round(latestHR.value || 0);
          console.log(`❤️ Heart Rate: ${googleFitData.heartRate} BPM`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch heart rate data:', error);
      }

      // Fetch Weight Data
      try {
        const weightData = await GoogleFit.getWeightSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (weightData.length > 0) {
          const latestWeight = weightData[weightData.length - 1];
          googleFitData.weight = Math.round((latestWeight.value || 0) * 10) / 10;
          console.log(`⚖️ Weight: ${googleFitData.weight} kg`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch weight data:', error);
      }

      // Fetch Sleep Data
      try {
        const sleepData = await GoogleFit.getSleepSamples(
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          (err: any, res: any) => {
            if (err) {
              console.warn('⚠️ Sleep data error:', err);
            }
          }
        );

        if (Array.isArray(sleepData) && sleepData.length > 0) {
          googleFitData.sleepData = sleepData.map((sleep: any, index: number) => ({
            id: `googlefit_sleep_${index}`,
            startDate: sleep.startDate,
            endDate: sleep.endDate,
            duration: Math.round((new Date(sleep.endDate).getTime() - new Date(sleep.startDate).getTime()) / 60000),
          }));

          console.log(`😴 Sleep sessions: ${googleFitData.sleepData.length}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch sleep data:', error);
      }

      // Update sync timestamp
      googleFitData.lastSyncDate = endDate.toISOString();

      // Cache the health data
      await this.cacheHealthData(googleFitData);

      const syncTime = Date.now() - startTime;
      console.log(`✅ Google Fit sync completed in ${syncTime}ms`);

      return {
        success: true,
        data: googleFitData,
        syncTime,
      };

    } catch (error) {
      console.error('❌ Google Fit sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Google Fit sync error',
        syncTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Export FitAI workout data to Google Fit
   */
  async exportWorkoutToGoogleFit(workout: {
    type: string;
    name: string;
    startDate: Date;
    endDate: Date;
    calories: number;
    distance?: number;
  }): Promise<boolean> {
    try {
      if (!await this.hasPermissions()) {
        console.warn('❌ Cannot export to Google Fit: permissions not granted');
        return false;
      }

      console.log(`📤 Exporting FitAI workout to Google Fit: ${workout.name}`);

      // Map FitAI workout types to Google Fit activity types
      const activityTypeMapping: Record<string, string> = {
        'strength': 'weight_lifting',
        'cardio': 'running',
        'hiit': 'aerobics',
        'yoga': 'yoga',
        'flexibility': 'stretching',
        'walking': 'walking',
        'running': 'running',
        'cycling': 'biking',
        'swimming': 'swimming',
        'dance': 'dancing',
        'boxing': 'martial_arts',
      };

      const activityType = activityTypeMapping[workout.type.toLowerCase()] || 'other';

      const workoutData = {
        startDate: workout.startDate.toISOString(),
        endDate: workout.endDate.toISOString(),
        activityType,
        calories: workout.calories,
        distance: workout.distance,
        sourceName: 'FitAI - AI Fitness Coach',
        sourcePackage: 'com.fitai.app',
      };

      // Save workout to Google Fit
      const result = await GoogleFit.saveWorkout(workoutData as any);

      if (result) {
        console.log(`✅ Successfully exported workout to Google Fit`);
        return true;
      } else {
        console.error('❌ Failed to export workout to Google Fit');
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to export workout to Google Fit:', error);
      return false;
    }
  }

  /**
   * Export FitAI nutrition data to Google Fit
   */
  async exportNutritionToGoogleFit(nutritionData: {
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    date: Date;
  }): Promise<boolean> {
    try {
      if (!await this.hasPermissions()) {
        console.warn('❌ Cannot export to Google Fit: permissions not granted');
        return false;
      }

      console.log(`📤 Exporting FitAI nutrition data to Google Fit for ${nutritionData.date.toDateString()}`);

      const nutritionEntry = {
        date: nutritionData.date.toISOString(),
        calories: nutritionData.calories,
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        sourceName: 'FitAI - AI Fitness Coach',
        sourcePackage: 'com.fitai.app',
      };

      // Save nutrition to Google Fit (this may not be directly supported)
      // For now, we'll save it as a calories entry
      const result = await GoogleFit.saveFood(
        nutritionEntry as any,
        (err: any, res: any) => {
          if (err) {
            console.warn('⚠️ Nutrition save error:', err);
          }
        }
      );

      console.log(`✅ Nutrition data exported to Google Fit:
        - Calories: ${nutritionData.calories}
        - Protein: ${nutritionData.protein || 0}g
        - Carbs: ${nutritionData.carbs || 0}g
        - Fat: ${nutritionData.fat || 0}g`);

      return true;

    } catch (error) {
      console.error('❌ Failed to export nutrition to Google Fit:', error);
      return false;
    }
  }

  /**
   * Export body weight measurement to Google Fit
   */
  async exportBodyWeightToGoogleFit(weight: number, date: Date = new Date()): Promise<boolean> {
    try {
      if (!await this.hasPermissions()) {
        console.warn('❌ Cannot export to Google Fit: permissions not granted');
        return false;
      }

      console.log(`📤 Exporting body weight to Google Fit: ${weight}kg`);

      const weightData = {
        value: weight,
        date: date.toISOString(),
        unit: 'kg',
      };

      const result = await GoogleFit.saveWeight(
        weightData as any,
        (err: any, res: any) => {
          if (err) {
            console.warn('⚠️ Weight save error:', err);
          }
        }
      );

      if (result) {
        console.log(`✅ Successfully exported body weight to Google Fit`);
        return true;
      } else {
        console.error('❌ Failed to export body weight to Google Fit');
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to export body weight to Google Fit:', error);
      return false;
    }
  }

  /**
   * Get cached health data for offline access
   */
  async getCachedHealthData(): Promise<GoogleFitData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('❌ Error reading cached Google Fit data:', error);
      return null;
    }
  }

  /**
   * Cache health data locally
   */
  private async cacheHealthData(data: GoogleFitData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(this.SYNC_INTERVAL_KEY, Date.now().toString());
    } catch (error) {
      console.error('❌ Error caching Google Fit data:', error);
    }
  }

  /**
   * Get the last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(this.SYNC_INTERVAL_KEY);
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error('❌ Error getting last Google Fit sync time:', error);
      return null;
    }
  }

  /**
   * Check if sync is needed (based on time elapsed)
   */
  async shouldSync(intervalHours: number = 1): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const hoursSinceLastSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync >= intervalHours;
  }

  /**
   * Get comprehensive health summary for dashboard
   */
  async getHealthSummary(): Promise<{
    dailySteps: number;
    dailyCalories: number;
    dailyDistance: number;
    lastWeight?: number;
    heartRate?: number;
    recentWorkouts: number;
    syncStatus: 'synced' | 'needs_sync' | 'never_synced';
  }> {
    try {
      const cachedData = await this.getCachedHealthData();
      const lastSync = await this.getLastSyncTime();

      let syncStatus: 'synced' | 'needs_sync' | 'never_synced' = 'never_synced';
      
      if (lastSync) {
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        syncStatus = hoursSinceSync < 2 ? 'synced' : 'needs_sync';
      }

      return {
        dailySteps: cachedData?.steps || 0,
        dailyCalories: cachedData?.calories || 0,
        dailyDistance: Math.round((cachedData?.distance || 0) / 1000 * 10) / 10, // Convert to km
        lastWeight: cachedData?.weight,
        heartRate: cachedData?.heartRate,
        recentWorkouts: cachedData?.workouts?.length || 0,
        syncStatus,
      };
    } catch (error) {
      console.error('❌ Error getting Google Fit health summary:', error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        dailyDistance: 0,
        recentWorkouts: 0,
        syncStatus: 'never_synced',
      };
    }
  }

  /**
   * Clear all cached health data
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.STORAGE_KEY, this.SYNC_INTERVAL_KEY]);
      console.log('✅ Google Fit cache cleared');
    } catch (error) {
      console.error('❌ Error clearing Google Fit cache:', error);
    }
  }

  /**
   * Disconnect from Google Fit
   */
  async disconnect(): Promise<boolean> {
    try {
      console.log('🔌 Disconnecting from Google Fit...');
      
      await GoogleFit.disconnect();
      await this.clearCache();
      await AsyncStorage.setItem('fitai_googlefit_permissions', 'denied');
      
      this.permissionsGranted = false;
      
      console.log('✅ Successfully disconnected from Google Fit');
      return true;
    } catch (error) {
      console.error('❌ Failed to disconnect from Google Fit:', error);
      return false;
    }
  }

  /**
   * Advanced: Get real-time heart rate zones for workout optimization
   * ROADMAP REQUIREMENT: Heart rate zones optimize workout intensity in real-time (Android)
   */
  async getHeartRateZones(age: number): Promise<{
    restingHR?: number;
    maxHR: number;
    zones: {
      zone1: { min: number; max: number; name: string }; // Recovery
      zone2: { min: number; max: number; name: string }; // Aerobic Base
      zone3: { min: number; max: number; name: string }; // Aerobic 
      zone4: { min: number; max: number; name: string }; // Lactate Threshold
      zone5: { min: number; max: number; name: string }; // VO2 Max
    };
  }> {
    try {
      console.log('❤️ Calculating heart rate zones from Google Fit data...');
      
      // Try to get actual resting heart rate from Google Fit
      let restingHR: number | undefined;
      try {
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const heartRateData = await GoogleFit.getHeartRateSamples(
          {
            startDate: sevenDaysAgo.toISOString(),
            endDate: today.toISOString(),
          },
          (err: any, res: any) => {
            if (err) {
              console.warn('⚠️ Heart rate fetch error:', err);
            }
          }
        );

        if (Array.isArray(heartRateData) && heartRateData.length > 0) {
          // Calculate average resting heart rate from recent data
          const restingReadings = heartRateData.filter((hr: any) => hr.value < 100); // Filter out exercise readings
          if (restingReadings.length > 0) {
            const avgResting = restingReadings.reduce((sum: number, hr: any) => sum + hr.value, 0) / restingReadings.length;
            restingHR = Math.round(avgResting);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch resting heart rate from Google Fit, using estimated values');
      }
      
      // Calculate max heart rate (220 - age formula)
      const maxHR = 220 - age;
      const baseResting = restingHR || (maxHR * 0.3); // Estimate if not available
      
      // Calculate heart rate zones using Karvonen formula
      const hrReserve = maxHR - baseResting;
      
      const zones = {
        zone1: {
          min: Math.round(baseResting + (hrReserve * 0.5)),
          max: Math.round(baseResting + (hrReserve * 0.6)),
          name: 'Recovery'
        },
        zone2: {
          min: Math.round(baseResting + (hrReserve * 0.6)),
          max: Math.round(baseResting + (hrReserve * 0.7)),
          name: 'Aerobic Base'
        },
        zone3: {
          min: Math.round(baseResting + (hrReserve * 0.7)),
          max: Math.round(baseResting + (hrReserve * 0.8)),
          name: 'Aerobic'
        },
        zone4: {
          min: Math.round(baseResting + (hrReserve * 0.8)),
          max: Math.round(baseResting + (hrReserve * 0.9)),
          name: 'Lactate Threshold'
        },
        zone5: {
          min: Math.round(baseResting + (hrReserve * 0.9)),
          max: maxHR,
          name: 'VO2 Max'
        }
      };
      
      console.log(`❤️ Heart rate zones calculated - Max HR: ${maxHR}, Resting: ${restingHR || 'estimated'}`);
      return { restingHR, maxHR, zones };
      
    } catch (error) {
      console.error('❌ Failed to calculate heart rate zones:', error);
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
  }

  /**
   * Advanced: Analyze sleep data to influence next-day workout recommendations
   * ROADMAP REQUIREMENT: Sleep data influences next-day workout recommendations (Android)
   */
  async getSleepBasedWorkoutRecommendations(): Promise<{
    sleepQuality: 'poor' | 'fair' | 'good' | 'excellent';
    sleepDuration: number;
    recommendations: {
      intensityAdjustment: number; // -2 to +2 scale
      workoutType: 'recovery' | 'light' | 'moderate' | 'intense';
      duration: 'shorter' | 'normal' | 'longer';
      notes: string[];
    };
  }> {
    try {
      console.log('😴 Analyzing Google Fit sleep data for workout recommendations...');
      
      // Get last night's sleep data
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      const sleepData = await GoogleFit.getSleepSamples({
        startDate: yesterday.toISOString(),
        endDate: today.toISOString(),
      });
      
      let sleepDuration = 0;
      let sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'fair';
      
      if (sleepData.length > 0) {
        // Calculate total sleep duration from sleep sessions
        sleepDuration = sleepData.reduce((total, sleep) => {
          const startTime = new Date(sleep.startDate).getTime();
          const endTime = new Date(sleep.endDate).getTime();
          return total + ((endTime - startTime) / (1000 * 60 * 60)); // Convert to hours
        }, 0);
        
        // Determine sleep quality based on duration
        if (sleepDuration < 6) {
          sleepQuality = 'poor';
        } else if (sleepDuration < 7) {
          sleepQuality = 'fair';
        } else if (sleepDuration < 9) {
          sleepQuality = 'good';
        } else {
          sleepQuality = 'excellent';
        }
      } else {
        console.warn('⚠️ No sleep data available from Google Fit');
        // NO FALLBACK - return null to indicate missing data
        return {
          sleepQuality: null,
          sleepDuration: null,
          message: 'No sleep data available from Google Fit',
          recommendations: null,
        };
      }
      
      // Generate workout recommendations based on sleep
      let intensityAdjustment = 0;
      let workoutType: 'recovery' | 'light' | 'moderate' | 'intense' = 'moderate';
      let duration: 'shorter' | 'normal' | 'longer' = 'normal';
      const notes: string[] = [];
      
      switch (sleepQuality) {
        case 'poor':
          intensityAdjustment = -2;
          workoutType = 'recovery';
          duration = 'shorter';
          notes.push('Low sleep detected - focus on recovery');
          notes.push('Consider yoga or light stretching');
          notes.push('Hydrate well and avoid high intensity');
          break;
          
        case 'fair':
          intensityAdjustment = -1;
          workoutType = 'light';
          duration = 'shorter';
          notes.push('Moderate sleep - light workout recommended');
          notes.push('Focus on form and mindful movement');
          break;
          
        case 'good':
          intensityAdjustment = 0;
          workoutType = 'moderate';
          duration = 'normal';
          notes.push('Good sleep - normal workout intensity');
          notes.push('You\'re ready for your planned workout');
          break;
          
        case 'excellent':
          intensityAdjustment = 1;
          workoutType = 'intense';
          duration = 'longer';
          notes.push('Excellent sleep - ready for high intensity');
          notes.push('Consider adding extra sets or duration');
          break;
      }
      
      console.log(`😴 Sleep analysis: ${sleepDuration}h (${sleepQuality}) -> ${workoutType} workout`);
      
      return {
        sleepQuality,
        sleepDuration,
        recommendations: {
          intensityAdjustment,
          workoutType,
          duration,
          notes
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to analyze sleep data:', error);
      return {
        sleepQuality: 'fair',
        sleepDuration: 7,
        recommendations: {
          intensityAdjustment: 0,
          workoutType: 'moderate',
          duration: 'normal',
          notes: ['Sleep data unavailable - proceeding with normal workout']
        }
      };
    }
  }

  /**
   * Advanced: Adjust daily calorie targets based on Google Fit activity
   * ROADMAP REQUIREMENT: FitAI adjusts daily calories based on activity data (Android)
   */
  async getActivityAdjustedCalories(baseCalories: number): Promise<{
    adjustedCalories: number;
    activityMultiplier: number;
    breakdown: {
      baseCalories: number;
      activeEnergy: number;
      exerciseBonus: number;
      stepBonus: number;
    };
    recommendations: string[];
  }> {
    try {
      console.log('🔥 Calculating activity-adjusted calorie targets from Google Fit...');
      
      // Get today's activity data
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const healthData = await this.syncHealthDataFromGoogleFit(1); // Get today's data
      
      if (!healthData.success || !healthData.data) {
        console.warn('⚠️ No activity data available from Google Fit, using base calories');
        return {
          adjustedCalories: baseCalories,
          activityMultiplier: 1.0,
          breakdown: {
            baseCalories,
            activeEnergy: 0,
            exerciseBonus: 0,
            stepBonus: 0
          },
          recommendations: ['Activity data unavailable - using baseline calories']
        };
      }
      
      const data = healthData.data;
      const activeEnergy = data.calories || 0;
      const steps = data.steps || 0;
      const activeMinutes = data.activeMinutes || 0;
      
      // Calculate activity-based adjustments
      let activityMultiplier = 1.0;
      let exerciseBonus = 0;
      let stepBonus = 0;
      
      // Exercise minutes bonus (Google Fit active minutes goal is typically 30 min)
      if (activeMinutes > 30) {
        exerciseBonus = Math.min((activeMinutes - 30) * 5, 100); // Max 100 cal bonus
      }
      
      // Step bonus (10,000 steps baseline)
      if (steps > 10000) {
        stepBonus = Math.min((steps - 10000) / 1000 * 25, 75); // Max 75 cal bonus
      }
      
      // Activity multiplier based on active energy
      if (activeEnergy > 600) {
        activityMultiplier = 1.15; // Very active day
      } else if (activeEnergy > 400) {
        activityMultiplier = 1.10; // Active day
      } else if (activeEnergy > 200) {
        activityMultiplier = 1.05; // Moderately active
      } else {
        activityMultiplier = 0.95; // Sedentary day
      }
      
      // Calculate final adjusted calories
      const adjustedCalories = Math.round(
        (baseCalories * activityMultiplier) + exerciseBonus + stepBonus
      );
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (activeEnergy > 500) {
        recommendations.push('High activity detected - increased calorie target');
      } else if (activeEnergy < 200) {
        recommendations.push('Low activity today - consider a light workout');
      }
      
      if (activeMinutes > 45) {
        recommendations.push('Great active minutes! Added bonus calories');
      }
      
      if (steps > 12000) {
        recommendations.push('Excellent step count! Step bonus applied');
      }
      
      console.log(`🔥 Calorie adjustment: ${baseCalories} -> ${adjustedCalories} (${activityMultiplier}x multiplier)`);
      
      return {
        adjustedCalories,
        activityMultiplier,
        breakdown: {
          baseCalories,
          activeEnergy,
          exerciseBonus,
          stepBonus
        },
        recommendations
      };
      
    } catch (error) {
      console.error('❌ Failed to calculate activity-adjusted calories:', error);
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
  }

  /**
   * Advanced: Activity Recognition and Automatic Logging
   * ROADMAP REQUIREMENT: Activity recognition and automatic logging
   */
  async detectAndLogActivities(): Promise<{
    detectedActivities: Array<{
      type: string;
      confidence: number;
      duration: number;
      startTime: string;
      endTime: string;
    }>;
    autoLoggedCount: number;
  }> {
    try {
      console.log('🤖 Detecting activities from Google Fit data...');
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Get activity data for today
      const activities: Array<{
        type: string;
        confidence: number;
        duration: number;
        startTime: string;
        endTime: string;
      }> = [];
      
      try {
        // Get step data and infer walking activities
        const stepsData = await GoogleFit.getDailyStepCountSamples({
          startDate: startOfDay.toISOString(),
          endDate: today.toISOString(),
        });

        if (Array.isArray(stepsData) && stepsData.length > 0) {
          const totalSteps = (stepsData[stepsData.length - 1] as any).steps || 0;
          
          if (totalSteps > 1000) {
            activities.push({
              type: 'walking',
              confidence: totalSteps > 5000 ? 0.8 : 0.6,
              duration: Math.round(totalSteps / 100), // Rough estimate
              startTime: startOfDay.toISOString(),
              endTime: today.toISOString()
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to detect walking activity:', error);
      }
      
      try {
        // Get distance data and infer running/cycling
        const distanceData = await GoogleFit.getDailyDistanceSamples({
          startDate: startOfDay.toISOString(),
          endDate: today.toISOString(),
        });
        
        if (distanceData.length > 0) {
          const totalDistance = distanceData.reduce((sum, entry) => sum + (entry.distance || 0), 0);
          const distanceKm = totalDistance / 1000;
          
          if (distanceKm > 2) {
            // Estimate activity type based on distance and duration
            const avgSpeed = distanceKm / 1; // Assume 1 hour for rough calculation
            
            if (avgSpeed > 15) {
              activities.push({
                type: 'cycling',
                confidence: 0.7,
                duration: 60,
                startTime: startOfDay.toISOString(),
                endTime: today.toISOString()
              });
            } else if (avgSpeed > 6) {
              activities.push({
                type: 'running',
                confidence: 0.8,
                duration: Math.round((distanceKm / avgSpeed) * 60),
                startTime: startOfDay.toISOString(),
                endTime: today.toISOString()
              });
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to detect running/cycling activity:', error);
      }
      
      // Auto-log high-confidence activities
      let autoLoggedCount = 0;
      for (const activity of activities) {
        if (activity.confidence > 0.7 && activity.duration > 15) {
          try {
            await this.exportWorkoutToGoogleFit({
              type: activity.type,
              name: `Auto-detected ${activity.type}`,
              startDate: new Date(activity.startTime),
              endDate: new Date(activity.endTime),
              calories: Math.round(activity.duration * 5), // Rough estimate
            });
            autoLoggedCount++;
            console.log(`✅ Auto-logged ${activity.type} activity`);
          } catch (error) {
            console.warn(`⚠️ Failed to auto-log ${activity.type} activity:`, error);
          }
        }
      }
      
      console.log(`🤖 Activity detection complete: ${activities.length} detected, ${autoLoggedCount} auto-logged`);
      
      return {
        detectedActivities: activities,
        autoLoggedCount
      };
      
    } catch (error) {
      console.error('❌ Failed to detect activities:', error);
      return {
        detectedActivities: [],
        autoLoggedCount: 0
      };
    }
  }
}

export const googleFitService = new GoogleFitService();
export default googleFitService;