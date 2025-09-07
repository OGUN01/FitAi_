// Apple HealthKit Integration Service for FitAI
// Provides comprehensive bidirectional health data synchronization

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific imports - expo-health-kit is iOS only
let HealthKitModule: any = null;

if (Platform.OS === 'ios') {
  try {
    HealthKitModule = require('expo-health-kit');
  } catch (error) {
    console.log('HealthKit not available on this platform');
  }
}

// Create safe wrappers for HealthKit functions
const HealthKitPermissions = HealthKitModule?.HealthKitPermissions;
const isHealthKitSupported = HealthKitModule?.isHealthKitSupported || (() => false);
const requestPermissions = HealthKitModule?.requestPermissions || (() => Promise.resolve(false));
const getWorkouts = HealthKitModule?.getWorkouts || (() => Promise.resolve([]));
const getSteps = HealthKitModule?.getSteps || (() => Promise.resolve(0));
const getHeartRateData = HealthKitModule?.getHeartRateData || (() => Promise.resolve([]));
const getSleepData = HealthKitModule?.getSleepData || (() => Promise.resolve([]));
const getBodyMass = HealthKitModule?.getBodyMass || (() => Promise.resolve(null));
const getActiveEnergyBurned = HealthKitModule?.getActiveEnergyBurned || (() => Promise.resolve(0));
const saveWorkout = HealthKitModule?.saveWorkout || (() => Promise.resolve(false));
const saveSteps = HealthKitModule?.saveSteps || (() => Promise.resolve(false));
const saveBodyMass = HealthKitModule?.saveBodyMass || (() => Promise.resolve(false));

export interface HealthKitData {
  steps?: number;
  activeEnergy?: number;
  heartRate?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  sleepHours?: number;
  sleepQuality?: 'deep' | 'rem' | 'light' | 'awake';
  bodyWeight?: number;
  workouts?: HealthKitWorkout[];
  distance?: number;
  flightsClimbed?: number;
  standHours?: number;
  exerciseMinutes?: number;
}

export interface HealthKitWorkout {
  id: string;
  activityType: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  energyBurned: number;
  distance?: number;
  heartRate?: number;
  source: string;
}

export interface HealthKitPermissionsStatus {
  granted: boolean;
  permissions?: {
    read: string[];
    write: string[];
  };
}

export interface HealthSyncResult {
  success: boolean;
  data?: HealthKitData;
  error?: string;
  lastSyncTime?: Date;
}

class HealthKitService {
  private static instance: HealthKitService;
  private isInitialized = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;

  private constructor() {}

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      if (!Platform.OS || Platform.OS !== 'ios') {
        console.log('🍎 HealthKit is only available on iOS');
        return false;
      }

      if (!HealthKitModule) {
        console.log('🍎 HealthKit module not available');
        return false;
      }

      const supported = await isHealthKitSupported();
      if (!supported) {
        console.log('🍎 HealthKit is not supported on this device');
        return false;
      }

      this.isInitialized = true;
      console.log('🍎 HealthKit initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize HealthKit:', error);
      return false;
    }
  }

  async requestAuthorization(): Promise<HealthKitPermissionsStatus> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (Platform.OS !== 'ios' || !HealthKitModule) {
        return { granted: false };
      }

      const permissions = {
        permissions: {
          read: [
            HealthKitPermissions?.StepCount,
            HealthKitPermissions?.ActiveEnergyBurned,
            HealthKitPermissions?.HeartRate,
            HealthKitPermissions?.RestingHeartRate,
            HealthKitPermissions?.HeartRateVariability,
            HealthKitPermissions?.SleepAnalysis,
            HealthKitPermissions?.BodyMass,
            HealthKitPermissions?.Workout,
            HealthKitPermissions?.DistanceWalkingRunning,
            HealthKitPermissions?.FlightsClimbed,
            HealthKitPermissions?.AppleStandTime,
            HealthKitPermissions?.AppleExerciseTime,
          ].filter(Boolean),
          write: [
            HealthKitPermissions?.StepCount,
            HealthKitPermissions?.ActiveEnergyBurned,
            HealthKitPermissions?.BodyMass,
            HealthKitPermissions?.Workout,
          ].filter(Boolean),
        },
      };

      const granted = await requestPermissions(permissions);
      
      if (granted) {
        await AsyncStorage.setItem('healthkit_authorized', 'true');
        await AsyncStorage.setItem('healthkit_auth_date', new Date().toISOString());
      }

      return { 
        granted, 
        permissions: permissions.permissions 
      };
    } catch (error) {
      console.error('Failed to request HealthKit authorization:', error);
      return { granted: false };
    }
  }

  async fetchHealthData(startDate?: Date, endDate?: Date): Promise<HealthKitData> {
    try {
      if (!this.isInitialized || Platform.OS !== 'ios' || !HealthKitModule) {
        return {};
      }

      const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
      const end = endDate || new Date();

      const options = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      // Fetch all health metrics in parallel
      const [
        steps,
        activeEnergy,
        heartRateData,
        sleepData,
        bodyMass,
        workouts,
      ] = await Promise.all([
        getSteps(options),
        getActiveEnergyBurned(options),
        getHeartRateData(options),
        getSleepData(options),
        getBodyMass({ unit: 'kg' }),
        getWorkouts(options),
      ]);

      // Process heart rate data
      let heartRate, restingHeartRate, heartRateVariability;
      if (heartRateData && heartRateData.length > 0) {
        const hrValues = heartRateData.map((hr: any) => hr.value);
        heartRate = Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length);
        restingHeartRate = Math.min(...hrValues);
        
        // Calculate HRV (simplified)
        if (hrValues.length > 1) {
          const diffs = hrValues.slice(1).map((val: number, i: number) => Math.abs(val - hrValues[i]));
          heartRateVariability = Math.round(diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length);
        }
      }

      // Process sleep data
      let sleepHours, sleepQuality;
      if (sleepData && sleepData.length > 0) {
        const totalSleepMinutes = sleepData.reduce((total: number, sleep: any) => {
          const duration = (new Date(sleep.endDate).getTime() - new Date(sleep.startDate).getTime()) / 60000;
          return total + duration;
        }, 0);
        sleepHours = totalSleepMinutes / 60;

        // Determine sleep quality based on duration and consistency
        if (sleepHours >= 7 && sleepHours <= 9) {
          sleepQuality = 'deep';
        } else if (sleepHours >= 6) {
          sleepQuality = 'rem';
        } else if (sleepHours >= 5) {
          sleepQuality = 'light';
        } else {
          sleepQuality = 'awake';
        }
      }

      // Process workouts
      const processedWorkouts = workouts?.map((workout: any) => ({
        id: workout.uuid || `workout_${Date.now()}_${Math.random()}`,
        activityType: workout.activityType,
        startDate: new Date(workout.startDate),
        endDate: new Date(workout.endDate),
        duration: workout.duration,
        energyBurned: workout.totalEnergyBurned,
        distance: workout.totalDistance,
        heartRate: workout.averageHeartRate,
        source: workout.sourceRevision?.source || 'HealthKit',
      }));

      this.lastSyncTime = new Date();
      await AsyncStorage.setItem('healthkit_last_sync', this.lastSyncTime.toISOString());

      return {
        steps: steps || 0,
        activeEnergy: activeEnergy || 0,
        heartRate,
        restingHeartRate,
        heartRateVariability,
        sleepHours,
        sleepQuality: sleepQuality as any,
        bodyWeight: bodyMass?.value,
        workouts: processedWorkouts,
      };
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      return {};
    }
  }

  async saveWorkoutToHealthKit(workout: {
    type: string;
    duration: number; // minutes
    calories: number;
    distance?: number; // km
    heartRate?: number;
  }): Promise<boolean> {
    try {
      if (!this.isInitialized || Platform.OS !== 'ios' || !HealthKitModule) {
        return false;
      }

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + workout.duration * 60000);

      const workoutData = {
        type: this.mapWorkoutType(workout.type),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        energyBurned: workout.calories,
        distance: workout.distance ? workout.distance * 1000 : undefined, // Convert to meters
      };

      const success = await saveWorkout(workoutData);
      
      if (success) {
        console.log('🍎 Workout saved to HealthKit successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save workout to HealthKit:', error);
      return false;
    }
  }

  async saveStepsToHealthKit(steps: number, date?: Date): Promise<boolean> {
    try {
      if (!this.isInitialized || Platform.OS !== 'ios' || !HealthKitModule) {
        return false;
      }

      const stepData = {
        value: steps,
        startDate: (date || new Date()).toISOString(),
        endDate: (date || new Date()).toISOString(),
      };

      const success = await saveSteps(stepData);
      
      if (success) {
        console.log('🍎 Steps saved to HealthKit successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save steps to HealthKit:', error);
      return false;
    }
  }

  async saveWeightToHealthKit(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    try {
      if (!this.isInitialized || Platform.OS !== 'ios' || !HealthKitModule) {
        return false;
      }

      const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

      const weightData = {
        value: weightInKg,
        unit: 'kg',
        date: new Date().toISOString(),
      };

      const success = await saveBodyMass(weightData);
      
      if (success) {
        console.log('🍎 Weight saved to HealthKit successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save weight to HealthKit:', error);
      return false;
    }
  }

  startAutoSync(intervalMinutes: number = 15): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (Platform.OS !== 'ios' || !HealthKitModule) {
      console.log('🍎 HealthKit auto-sync not available on this platform');
      return;
    }

    this.syncInterval = setInterval(async () => {
      console.log('🍎 Running HealthKit auto-sync...');
      await this.fetchHealthData();
    }, intervalMinutes * 60 * 1000);

    console.log(`🍎 HealthKit auto-sync started (every ${intervalMinutes} minutes)`);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🍎 HealthKit auto-sync stopped');
    }
  }

  private mapWorkoutType(type: string): string {
    // Map FitAI workout types to HealthKit activity types
    const mapping: Record<string, string> = {
      'strength': 'TraditionalStrengthTraining',
      'cardio': 'Running',
      'yoga': 'Yoga',
      'pilates': 'Pilates',
      'hiit': 'HighIntensityIntervalTraining',
      'cycling': 'Cycling',
      'swimming': 'Swimming',
      'walking': 'Walking',
      'running': 'Running',
      'boxing': 'Boxing',
      'dance': 'Dance',
      'crossfit': 'CrossTraining',
      'stretching': 'Flexibility',
    };

    return mapping[type.toLowerCase()] || 'Other';
  }

  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios' || !HealthKitModule) {
        return false;
      }
      
      const authorized = await AsyncStorage.getItem('healthkit_authorized');
      return authorized === 'true';
    } catch (error) {
      console.error('Failed to check HealthKit permissions:', error);
      return false;
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const syncTime = await AsyncStorage.getItem('healthkit_last_sync');
      return syncTime ? new Date(syncTime) : null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }

  isAvailable(): boolean {
    return Platform.OS === 'ios' && this.isInitialized && !!HealthKitModule;
  }
}

const healthKitService = HealthKitService.getInstance();

export { healthKitService };
export default healthKitService;