// Health Connect Integration Service for FitAI
// Provides comprehensive health data synchronization for Android devices (8.0+)
// Replaces deprecated Google Fit API with modern Health Connect platform

import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  openHealthConnectSettings,
  Permission,
  RecordType,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

// Type alias for permissions
type PermissionType = Permission;
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HealthConnectData {
  steps?: number;
  heartRate?: number;
  activeCalories?: number;
  distance?: number; // in meters
  weight?: number; // in kg
  sleep?: SleepData[];
  lastSyncDate?: string;
  // Advanced metrics for future features
  activeMinutes?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  oxygenSaturation?: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface SleepData {
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  stages?: SleepStage[];
}

export interface SleepStage {
  stage: 'awake' | 'light' | 'deep' | 'rem';
  startTime: string;
  endTime: string;
  duration: number;
}

export interface HealthConnectSyncResult {
  success: boolean;
  data?: HealthConnectData;
  error?: string;
  syncTime?: number;
}

class HealthConnectService {
  private readonly STORAGE_KEY = 'fitai_healthconnect_data';
  private readonly SYNC_INTERVAL_KEY = 'fitai_healthconnect_last_sync';
  private isInitialized = false;
  private permissionsGranted = false;

  // Required permissions for FitAI - matches current Google Fit integration
  private readonly permissions: PermissionType[] = [
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'Weight' },
    { accessType: 'read', recordType: 'SleepSession' },
  ];

  /**
   * Initialize Health Connect client
   * Critical first step - must be called before any other operations
   */
  async initializeHealthConnect(): Promise<boolean> {
    try {
      console.log('🔗 DEBUG: Starting Health Connect initialization...');
      console.log('🔗 DEBUG: Platform check - OS:', Platform.OS);
      
      // Health Connect is only available on Android 8.0+
      if (Platform.OS !== 'android') {
        console.log('📱 DEBUG: Health Connect only available on Android devices');
        return false;
      }
      
      console.log('🔗 DEBUG: Calling getSdkStatus()...');
      // Check if Health Connect is available on device
      const sdkStatus = await getSdkStatus();
      console.log('🔗 DEBUG: Health Connect SDK Status:', sdkStatus);
      console.log('🔗 DEBUG: Expected status for success:', SdkAvailabilityStatus.SDK_AVAILABLE);
      
      // Check for different SDK availability statuses
      if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        console.log('❌ Health Connect SDK is unavailable on this device');
        console.log('💡 Health Connect requires Android 8.0+ and the Health Connect app to be installed');
        return false;
      }

      if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        console.log('⚠️ Health Connect provider update required');
        console.log('💡 Please update the Health Connect app from Google Play Store');
        // Optionally open Health Connect settings for user to update
        await openHealthConnectSettings();
        return false;
      }

      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE && sdkStatus !== 'SDK_AVAILABLE') {
        console.log('❌ Health Connect not available - Unknown status:', sdkStatus);
        return false;
      }

      console.log('🔗 DEBUG: Calling initialize() function...');
      // Initialize the Health Connect client
      const isInitialized = await initialize();
      this.isInitialized = isInitialized;
      
      console.log('✅ DEBUG: Health Connect initialized result:', isInitialized);
      console.log('🔗 DEBUG: Setting internal state isInitialized to:', isInitialized);
      
      // Cache initialization status
      console.log('🔗 DEBUG: Caching initialization status...');
      await AsyncStorage.setItem('fitai_healthconnect_initialized', isInitialized.toString());
      console.log('🔗 DEBUG: Cached initialization status successfully');
      
      return isInitialized;

    } catch (error) {
      console.error('❌ Health Connect initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Request all required permissions from user
   * Must be called before reading health data
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 DEBUG: Starting permission request...');
      console.log('🔐 DEBUG: Current isInitialized state:', this.isInitialized);
      
      if (!this.isInitialized) {
        console.log('🔐 DEBUG: Not initialized, calling initializeHealthConnect...');
        const initialized = await this.initializeHealthConnect();
        console.log('🔐 DEBUG: Initialization result:', initialized);
        if (!initialized) {
          console.log('🔐 DEBUG: Initialization failed, returning false');
          return false;
        }
      }

      console.log('🔐 DEBUG: Requesting Health Connect permissions...');
      console.log('🔐 DEBUG: Required permissions:', this.permissions.map(p => `${p.accessType} ${p.recordType}`).join(', '));
      console.log('🔐 DEBUG: Total permissions count:', this.permissions.length);
      
      console.log('🔐 DEBUG: Calling requestPermission() with permissions array...');
      const grantedPermissions = await requestPermission(this.permissions);
      console.log('🔐 DEBUG: requestPermission() returned:', grantedPermissions);
      
      this.permissionsGranted = !!grantedPermissions;
      
      console.log('🔐 DEBUG: Final permissions granted result:', this.permissionsGranted);
      
      // Cache permission status
      await AsyncStorage.setItem(
        'fitai_healthconnect_permissions', 
        this.permissionsGranted ? 'granted' : 'denied'
      );
      
      return this.permissionsGranted;

    } catch (error) {
      console.error('❌ Permission request failed:', error);
      this.permissionsGranted = false;
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return false;
      
      // Always check actual permission status with Health Connect
      // Don't rely solely on cached status as permissions can be revoked externally
      try {
        // Try to perform a simple permission check by checking SDK status
        const sdkStatus = await getSdkStatus();
        if (sdkStatus !== 'SDK_AVAILABLE') {
          this.permissionsGranted = false;
          return false;
        }
        
        // Check cached permission status as backup
        const cachedPermissions = await AsyncStorage.getItem('fitai_healthconnect_permissions');
        
        if (cachedPermissions === 'granted') {
          this.permissionsGranted = true;
          return true;
        }
        
        // If no cached status, permissions likely not granted yet
        this.permissionsGranted = false;
        return false;
      } catch (sdkError) {
        console.warn('⚠️ SDK check failed, falling back to cache:', sdkError);
        
        // Fallback to cached status if SDK check fails
        const cachedPermissions = await AsyncStorage.getItem('fitai_healthconnect_permissions');
        const hasCache = cachedPermissions === 'granted';
        this.permissionsGranted = hasCache;
        return hasCache;
      }
    } catch (error) {
      console.error('❌ Error checking Health Connect permissions:', error);
      this.permissionsGranted = false;
      return false;
    }
  }

  /**
   * Sync health data from Health Connect
   * Main data retrieval function - matches Google Fit functionality
   */
  async syncHealthData(daysBack: number = 7): Promise<HealthConnectSyncResult> {
    const startTime = Date.now();
    
    try {
      if (!this.permissionsGranted) {
        console.warn('🔐 Health Connect permissions not granted, checking...');
        const hasPerms = await this.hasPermissions();
        if (!hasPerms) {
          return {
            success: false,
            error: 'Health Connect permissions not granted. Please enable in settings.',
          };
        }
      }

      console.log(`📥 Syncing Health Connect data from last ${daysBack} days...`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const healthData: HealthConnectData = {};

      // Read Steps - Core fitness metric
      try {
        const stepsRecords = await readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (stepsRecords && 'records' in stepsRecords && stepsRecords.records.length > 0) {
          healthData.steps = stepsRecords.records.reduce((total: number, record: any) => total + (record.count || 0), 0);
          console.log('📊 Steps retrieved:', healthData.steps);
        }
      } catch (error) {
        console.warn('⚠️ Failed to read steps:', error);
      }

      // Read Heart Rate - Vital health metric
      try {
        const heartRateRecords = await readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (heartRateRecords && 'records' in heartRateRecords && heartRateRecords.records.length > 0) {
          // Get most recent heart rate reading
          const latestRecord = heartRateRecords.records[heartRateRecords.records.length - 1];
          healthData.heartRate = (latestRecord as any).beatsPerMinute;
          console.log('💓 Heart rate retrieved:', healthData.heartRate);
        }
      } catch (error) {
        console.warn('⚠️ Failed to read heart rate:', error);
      }

      // Read Active Calories - Energy expenditure tracking
      try {
        const caloriesRecords = await readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (caloriesRecords && 'records' in caloriesRecords && caloriesRecords.records.length > 0) {
          healthData.activeCalories = caloriesRecords.records.reduce(
            (total: number, record: any) => total + (record.energy?.inKilocalories || 0), 0
          );
          console.log('🔥 Active calories retrieved:', healthData.activeCalories);
        }
      } catch (error) {
        console.warn('⚠️ Failed to read active calories:', error);
      }

      // Read Distance - Movement tracking
      try {
        const distanceRecords = await readRecords('Distance', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (distanceRecords && 'records' in distanceRecords && distanceRecords.records.length > 0) {
          healthData.distance = distanceRecords.records.reduce(
            (total: number, record: any) => total + (record.distance?.inMeters || 0), 0
          );
          console.log('🏃 Distance retrieved:', healthData.distance, 'meters');
        }
      } catch (error) {
        console.warn('⚠️ Failed to read distance:', error);
      }

      // Read Weight - Body composition tracking
      try {
        const weightRecords = await readRecords('Weight', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (weightRecords && 'records' in weightRecords && weightRecords.records.length > 0) {
          // Get most recent weight reading
          const latestRecord = weightRecords.records[weightRecords.records.length - 1];
          healthData.weight = (latestRecord as any).weight?.inKilograms;
          console.log('⚖️ Weight retrieved:', healthData.weight, 'kg');
        }
      } catch (error) {
        console.warn('⚠️ Failed to read weight:', error);
      }

      // Read Sleep Data - Recovery tracking
      try {
        const sleepRecords = await readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });

        if (sleepRecords && 'records' in sleepRecords && sleepRecords.records.length > 0) {
          healthData.sleep = sleepRecords.records.map((sleep: any, index: number) => ({
            startTime: sleep.startTime,
            endTime: sleep.endTime,
            duration: Math.round((new Date(sleep.endTime).getTime() - new Date(sleep.startTime).getTime()) / 60000),
          }));

          console.log('😴 Sleep sessions retrieved:', healthData.sleep?.length || 0);
        }
      } catch (error) {
        console.warn('⚠️ Failed to read sleep data:', error);
      }

      healthData.lastSyncDate = endDate.toISOString();

      // Cache the health data
      await this.cacheHealthData(healthData);

      const syncTime = Date.now() - startTime;
      console.log(`✅ Health Connect sync completed in ${syncTime}ms`);

      return {
        success: true,
        data: healthData,
        syncTime,
      };

    } catch (error) {
      console.error('❌ Health Connect sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Health Connect sync error',
        syncTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Open Health Connect settings for user to manage permissions
   */
  async openSettings(): Promise<void> {
    try {
      console.log('⚙️ Opening Health Connect settings...');
      await openHealthConnectSettings();
    } catch (error) {
      console.error('❌ Failed to open Health Connect settings:', error);
    }
  }

  /**
   * Get cached health data for offline access
   */
  async getCachedHealthData(): Promise<HealthConnectData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('❌ Error reading cached Health Connect data:', error);
      return null;
    }
  }

  /**
   * Cache health data locally
   */
  private async cacheHealthData(data: HealthConnectData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(this.SYNC_INTERVAL_KEY, Date.now().toString());
    } catch (error) {
      console.error('❌ Error caching Health Connect data:', error);
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
      console.error('❌ Error getting last Health Connect sync time:', error);
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
    sleepHours?: number;
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

      // Calculate total sleep hours from sleep data
      let sleepHours: number | undefined;
      if (cachedData?.sleep && cachedData.sleep.length > 0) {
        const totalSleepMinutes = cachedData.sleep.reduce((total, sleep) => total + sleep.duration, 0);
        sleepHours = totalSleepMinutes / 60;
      }

      return {
        dailySteps: cachedData?.steps || 0,
        dailyCalories: cachedData?.activeCalories || 0,
        dailyDistance: Math.round((cachedData?.distance || 0) / 1000 * 10) / 10, // Convert to km
        lastWeight: cachedData?.weight,
        heartRate: cachedData?.heartRate,
        sleepHours,
        syncStatus,
      };
    } catch (error) {
      console.error('❌ Error getting Health Connect health summary:', error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        dailyDistance: 0,
        syncStatus: 'never_synced',
      };
    }
  }

  /**
   * Clear all cached health data
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEY, 
        this.SYNC_INTERVAL_KEY,
        'fitai_healthconnect_permissions',
        'fitai_healthconnect_initialized'
      ]);
      console.log('✅ Health Connect cache cleared');
    } catch (error) {
      console.error('❌ Error clearing Health Connect cache:', error);
    }
  }

  /**
   * Disconnect from Health Connect
   */
  async disconnect(): Promise<boolean> {
    try {
      console.log('🔌 Disconnecting from Health Connect...');
      
      // Clear cached data and permissions
      await this.clearCache();
      
      this.permissionsGranted = false;
      this.isInitialized = false;
      
      console.log('✅ Successfully disconnected from Health Connect');
      return true;
    } catch (error) {
      console.error('❌ Failed to disconnect from Health Connect:', error);
      return false;
    }
  }

  /**
   * Get current initialization status
   */
  isHealthConnectInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check Health Connect availability on device
   */
  async isHealthConnectAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      const sdkStatus = await getSdkStatus();
      return sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE || sdkStatus === 'SDK_AVAILABLE';
    } catch (error) {
      console.error('❌ Error checking Health Connect availability:', error);
      return false;
    }
  }

  /**
   * Run a single background sync operation
   * Returns true if new data was synced, false otherwise
   */
  async runBackgroundSyncOnce(): Promise<boolean> {
    try {
      console.log('🔄 Running background Health Connect sync...');

      // Check if sync is needed
      const shouldSync = await this.shouldSync(1); // Check if 1+ hours since last sync
      if (!shouldSync) {
        console.log('⏭️ Skipping sync - recent sync exists');
        return false;
      }

      // Perform sync
      const result = await this.syncHealthData(1); // Sync last 1 day
      if (result.success && result.data) {
        console.log('✅ Background sync completed successfully');
        return true;
      }

      console.log('⚠️ Background sync completed with no new data');
      return false;
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      return false;
    }
  }
}

// Export singleton instance for consistent usage across app
export const healthConnectService = new HealthConnectService();
export default healthConnectService;