# Health Connect Implementation Plan - FitAI App

## 📖 **Executive Summary**

This document outlines the complete migration from Google Fit API to Health Connect for the FitAI fitness application. This migration is **critical** and **mandatory** due to Google's deprecation of the Google Fit APIs.

---

## 🚨 **Why This Migration is Essential**

### **Critical Business Context:**

1. **Google Fit API Deprecation Timeline:**
   - ✅ **May 2024**: Google announced Google Fit API deprecation
   - ⚠️ **June 30, 2026**: Complete shutdown of Google Fit APIs
   - ❌ **Current Status**: New OAuth verifications for Fit scopes are NO LONGER processed
   - 🔄 **Migration Deadline**: Must complete before June 2026 to avoid service disruption

2. **Current Integration Issues:**
   - **Problem**: Google Fit OAuth authorization failing with "Authorization cancelled"
   - **Root Cause**: Google no longer processes new OAuth verification requests for Fit scopes
   - **Impact**: New users cannot connect health data, existing users may face issues
   - **Business Risk**: Core health tracking functionality is compromised

3. **Strategic Benefits of Health Connect:**
   - **Future-Proof**: Google's official replacement, actively developed
   - **Enhanced Privacy**: Data stored locally on device, not in cloud
   - **Better Performance**: Direct Android integration, faster data access
   - **Improved User Control**: Granular permissions, centralized health data management
   - **Broader Ecosystem**: Compatible with more health apps and devices

4. **Technical Advantages:**
   - **Modern API**: Built for Android 8.0+ with modern architecture
   - **React Native Ready**: Mature libraries available (`react-native-health-connect`)
   - **TypeScript Support**: Full type safety and better developer experience
   - **Comprehensive Data Types**: All health metrics FitAI needs (steps, heart rate, sleep, etc.)

---

## 🎯 **Project Objectives**

### **Primary Goals:**
1. **Replace deprecated Google Fit integration** with Health Connect
2. **Ensure zero service disruption** for existing users
3. **Improve health data accuracy and privacy**
4. **Future-proof the health integration architecture**
5. **Maintain feature parity** with current health tracking capabilities

### **Success Metrics:**
- ✅ Health Connect initialization success rate > 95%
- ✅ User permission grant rate > 80%
- ✅ Data sync accuracy > 99%
- ✅ Zero health data loss during migration
- ✅ Improved user satisfaction with health tracking features

---

## 🔍 **Technical Analysis**

### **Current State Assessment:**

**Existing Google Fit Integration:**
- **Service**: `src/services/googleFit.ts` - Comprehensive Google Fit wrapper
- **Store**: `src/stores/healthDataStore.ts` - Health data management
- **UI**: Health Overview section in HomeScreen with modal interface
- **Data Types**: Steps, heart rate, calories, distance, sleep, weight
- **Status**: ❌ OAuth authorization failing, deprecated API

**Health Connect Readiness:**
- **Library**: `react-native-health-connect` by matinzd - Production ready
- **Compatibility**: React Native 0.71+ ✓, Android SDK 26+ ✓, TypeScript ✓
- **Data Coverage**: 100% feature parity with current Google Fit integration
- **Maintenance**: Actively maintained, latest updates in 2024

### **Migration Complexity Assessment:**
- **Low Risk**: Well-documented migration path, mature React Native library
- **High Benefit**: Better privacy, performance, and future-proofing
- **Minimal Disruption**: Can implement alongside existing integration for gradual rollout

---

## 🏗️ **Complete Implementation Plan**

### **📋 PHASE 1: PRE-IMPLEMENTATION ANALYSIS**

#### **1.1 Current State Assessment**
**Why This Phase:**
- Ensures we understand exactly what needs to be migrated
- Prevents feature loss during transition
- Identifies integration points that need updating

**Tasks:**
- ✅ **Audit existing Google Fit integration**
  - Document current data types used (steps, heart rate, calories, etc.)
  - Map existing functions and hooks in `src/services/googleFit.ts`
  - Identify UI components that display health data
  - List all health-related screens and modals

#### **1.2 Requirements Mapping**
**Why This Phase:**
- Ensures 100% feature parity between Google Fit and Health Connect
- Identifies any missing functionality that needs custom implementation

**Data Type Mapping:**
- Steps → Steps ✓
- Heart Rate → HeartRate ✓
- Calories → ActiveCaloriesBurned ✓
- Distance → Distance ✓
- Sleep → SleepSession ✓
- Weight → Weight ✓

#### **1.3 Compatibility Check**
**Why This Phase:**
- Prevents integration issues before implementation starts
- Ensures all dependencies are compatible

**Requirements Verification:**
- React Native version ≥ 0.71 ✓ (Current: Latest)
- Android minSdkVersion ≥ 26 ✓ (Current: 26)
- Expo compatibility ✓ (Using Expo managed workflow)
- TypeScript support ✓ (Full TypeScript project)

---

### **📦 PHASE 2: DEPENDENCY MANAGEMENT**

#### **2.1 Package Installation**
**Why This Phase:**
- Installs the core Health Connect library and dependencies
- Sets up proper version compatibility

```bash
# Install Health Connect library
npm install react-native-health-connect

# Install Expo plugin (if using Expo)
npx expo install expo-health-connect

# Install additional dependencies if needed
npm install @react-native-async-storage/async-storage
```

#### **2.2 Version Compatibility**
**Why This Phase:**
- Prevents version conflicts that could cause runtime errors
- Ensures optimal performance and stability

**Version Requirements:**
- react-native-health-connect: latest stable
- React Native: 0.71+
- Android Gradle Plugin: 7.0+
- Kotlin: 1.6+

---

### **🔧 PHASE 3: NATIVE CONFIGURATION**

#### **3.1 Android Manifest Configuration**
**Why This Phase:**
- Configures Android system to recognize Health Connect integration
- Sets up proper permissions and intent filters for Health Connect access

**File: `android/app/src/main/AndroidManifest.xml`**

```xml
<!-- Health Connect Queries - Required for Health Connect app detection -->
<queries>
  <package android:name="com.google.android.apps.healthdata" />
  <intent>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
  </intent>
</queries>

<!-- Health Connect Permissions - Define what health data we need access to -->
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<uses-permission android:name="android.permission.health.READ_WEIGHT" />

<!-- Health Connect Intent Filters - Handle Health Connect permission flows -->
<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
  </intent-filter>
</activity>
```

#### **3.2 MainActivity Configuration**
**Why This Phase:**
- Integrates Health Connect permission handling into the main Android activity
- Ensures proper lifecycle management for Health Connect operations

**File: `android/app/src/main/java/com/fitai/app/MainActivity.kt`**

```kotlin
package com.fitai.app

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Set Health Connect permission delegate - Critical for permission handling
    HealthConnectPermissionDelegate.setPermissionDelegate(this)
  }

  override fun getMainComponentName(): String = "FitAI"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

#### **3.3 Gradle Configuration**
**Why This Phase:**
- Ensures proper Android SDK versions for Health Connect compatibility
- Sets up build configuration for optimal performance

**File: `android/app/build.gradle`**

```gradle
android {
    compileSdkVersion 34  // Latest Android SDK for Health Connect features
    
    defaultConfig {
        minSdkVersion 26  // Required for Health Connect (Android 8.0+)
        targetSdkVersion 34
    }
}
```

#### **3.4 Expo Configuration (if applicable)**
**Why This Phase:**
- Configures Expo managed workflow for Health Connect integration
- Sets up proper build properties for Android compilation

**File: `app.config.js`**

```javascript
export default {
  expo: {
    plugins: [
      "expo-health-connect",  // Expo plugin for Health Connect
      [
        "expo-build-properties",  // Build configuration
        {
          android: {
            minSdkVersion: 26,      // Health Connect requirement
            compileSdkVersion: 34,  // Latest features
            targetSdkVersion: 34,   // Optimal compatibility
          },
        },
      ],
    ],
  },
};
```

---

### **🏗️ PHASE 4: SERVICE LAYER IMPLEMENTATION**

#### **4.1 Health Connect Service Creation**
**Why This Phase:**
- Creates a centralized service for all Health Connect operations
- Provides consistent API for the rest of the application
- Implements proper error handling and data validation

**File: `src/services/healthConnect.ts`**

```typescript
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  openHealthConnectSettings,
  PermissionType,
  RecordType,
} from 'react-native-health-connect';

export interface HealthConnectData {
  steps?: number;
  heartRate?: number;
  activeCalories?: number;
  distance?: number;
  weight?: number;
  sleep?: SleepData[];
  lastSyncDate?: string;
}

export interface SleepData {
  startTime: string;
  endTime: string;
  duration: number;
  stages?: SleepStage[];
}

class HealthConnectService {
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
      console.log('🔗 Initializing Health Connect...');
      
      // Check if Health Connect is available on device
      const sdkStatus = await getSdkStatus();
      console.log('Health Connect SDK Status:', sdkStatus);
      
      if (sdkStatus !== 'SDK_AVAILABLE') {
        console.log('❌ Health Connect not available on this device');
        return false;
      }

      // Initialize the Health Connect client
      const isInitialized = await initialize();
      this.isInitialized = isInitialized;
      
      console.log('✅ Health Connect initialized:', isInitialized);
      return isInitialized;

    } catch (error) {
      console.error('❌ Health Connect initialization failed:', error);
      return false;
    }
  }

  /**
   * Request all required permissions from user
   * Must be called before reading health data
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initializeHealthConnect();
        if (!initialized) return false;
      }

      console.log('🔐 Requesting Health Connect permissions...');
      
      const grantedPermissions = await requestPermission(this.permissions);
      this.permissionsGranted = !!grantedPermissions;
      
      console.log('Permissions granted:', this.permissionsGranted);
      return this.permissionsGranted;

    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Sync health data from Health Connect
   * Main data retrieval function - matches Google Fit functionality
   */
  async syncHealthData(daysBack: number = 7): Promise<HealthConnectData> {
    try {
      if (!this.permissionsGranted) {
        throw new Error('Health Connect permissions not granted');
      }

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
        
        if (stepsRecords.length > 0) {
          healthData.steps = stepsRecords.reduce((total, record) => total + record.count, 0);
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
        
        if (heartRateRecords.length > 0) {
          // Get most recent heart rate reading
          const latestRecord = heartRateRecords[heartRateRecords.length - 1];
          healthData.heartRate = latestRecord.beatsPerMinute;
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
        
        if (caloriesRecords.length > 0) {
          healthData.activeCalories = caloriesRecords.reduce(
            (total, record) => total + record.energy.inKilocalories, 0
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
        
        if (distanceRecords.length > 0) {
          healthData.distance = distanceRecords.reduce(
            (total, record) => total + record.distance.inMeters, 0
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
        
        if (weightRecords.length > 0) {
          // Get most recent weight reading
          const latestRecord = weightRecords[weightRecords.length - 1];
          healthData.weight = latestRecord.weight.inKilograms;
          console.log('⚖️ Weight retrieved:', healthData.weight, 'kg');
        }
      } catch (error) {
        console.warn('⚠️ Failed to read weight:', error);
      }

      healthData.lastSyncDate = new Date().toISOString();
      console.log('✅ Health Connect sync completed successfully');
      
      return healthData;

    } catch (error) {
      console.error('❌ Health Connect sync failed:', error);
      throw error;
    }
  }

  /**
   * Open Health Connect settings for user to manage permissions
   */
  async openSettings(): Promise<void> {
    try {
      await openHealthConnectSettings();
    } catch (error) {
      console.error('❌ Failed to open Health Connect settings:', error);
    }
  }

  /**
   * Check if all required permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    return this.permissionsGranted;
  }

  /**
   * Get current initialization status
   */
  isHealthConnectInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance for consistent usage across app
export const healthConnectService = new HealthConnectService();
export default healthConnectService;
```

#### **4.2 Health Data Store Integration**
**Why This Phase:**
- Integrates Health Connect service with existing state management
- Maintains consistency with current data flow architecture
- Enables gradual migration from Google Fit to Health Connect

**File: `src/stores/healthDataStore.ts`** (Update existing store)

```typescript
// Add Health Connect imports to existing store
import { healthConnectService, HealthConnectData } from '../services/healthConnect';

// Add these methods to existing health data store:

/**
 * Initialize Health Connect integration
 * Replaces initializeGoogleFit method
 */
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
    
    return false;
  } catch (error) {
    console.error('❌ Failed to initialize Health Connect:', error);
    set({ syncStatus: 'error' });
    return false;
  }
},

/**
 * Request Health Connect permissions from user
 * New method for Health Connect permission flow
 */
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

/**
 * Sync health data from Health Connect
 * Replaces syncFromGoogleFit method
 */
syncFromHealthConnect: async (daysBack: number = 7): Promise<{ success: boolean; data?: HealthConnectData; error?: string }> => {
  try {
    console.log('🔄 Syncing health data from Health Connect...');
    
    // Update sync status to loading
    set({ syncStatus: 'syncing' });
    
    // Perform health data sync
    const healthData = await healthConnectService.syncHealthData(daysBack);
    
    // Update store state with new health data
    set((state) => ({
      metrics: {
        ...state.metrics,
        // Update each metric with new data, fallback to existing if not available
        steps: healthData.steps ?? state.metrics.steps,
        heartRate: healthData.heartRate ?? state.metrics.heartRate,
        activeCalories: healthData.activeCalories ?? state.metrics.activeCalories,
        distance: healthData.distance ?? state.metrics.distance,
        weight: healthData.weight ?? state.metrics.weight,
      },
      lastSyncTime: Date.now(),
      syncStatus: 'success',
    }));

    console.log('✅ Health Connect sync completed successfully');
    return { success: true, data: healthData };
    
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

/**
 * Open Health Connect settings
 * Utility method for user to manage permissions
 */
openHealthConnectSettings: async (): Promise<void> => {
  try {
    await healthConnectService.openSettings();
  } catch (error) {
    console.error('❌ Failed to open Health Connect settings:', error);
  }
},
```

---

### **🎨 PHASE 5: UI COMPONENT UPDATES**

#### **5.1 Update Health Settings Modal**
**Why This Phase:**
- Updates user interface to use Health Connect instead of Google Fit
- Maintains familiar user experience while improving functionality
- Provides clear feedback about Health Connect connection status

**File: `src/screens/main/HomeScreen.tsx`** (Update existing modal)

```typescript
// Update imports to include Health Connect service
import { healthConnectService } from '../../services/healthConnect';
import { Platform } from 'react-native';

// Update the Connect button onPress handler in the Health Settings Modal
<Button
  title={isHealthConnectAuthorized ? 'Reconnect' : 'Connect Health Connect'}
  onPress={async () => {
    console.log('🔗 Connecting to Health Connect...');
    
    try {
      // Step 1: Initialize Health Connect
      console.log('Step 1: Initializing Health Connect...');
      const initialized = await initializeHealthConnect();
      
      if (!initialized) {
        // Step 2: Request permissions if not initialized
        console.log('Step 2: Requesting Health Connect permissions...');
        
        // Show user what's happening
        alert('📱 Health Connect will now request permissions for:\n\n• Steps\n• Heart Rate\n• Active Calories\n• Distance\n• Weight\n• Sleep Data\n\nPlease grant these permissions to enable health tracking.');
        
        const permissionGranted = await requestHealthConnectPermissions();
        
        if (permissionGranted) {
          alert('✅ Health Connect connected successfully!\n\nYour health data will now sync automatically.');
          console.log('✅ Health Connect permissions granted');
          
          // Step 3: Perform initial data sync
          console.log('Step 3: Performing initial health data sync...');
          const syncResult = await syncFromHealthConnect(7);
          
          if (syncResult.success) {
            console.log('✅ Initial health data sync completed');
            console.log('Synced data:', syncResult.data);
          } else {
            console.warn('⚠️ Initial sync failed:', syncResult.error);
          }
        } else {
          alert('❌ Health Connect permissions were denied.\n\nTo enable health tracking:\n1. Go to Health Connect settings\n2. Grant permissions for FitAI\n3. Try connecting again');
          
          // Optionally open Health Connect settings for user
          await healthConnectService.openSettings();
        }
      } else {
        alert('✅ Health Connect is already connected!\n\nYour health data is syncing automatically.');
        console.log('✅ Health Connect already connected');
      }
    } catch (error) {
      console.error('❌ Health Connect connection error:', error);
      alert(`❌ Error connecting to Health Connect:\n\n${error.message}\n\nPlease ensure Health Connect is installed and try again.`);
    }
  }}
  variant={isHealthConnectAuthorized ? 'outline' : 'primary'}
  size="md"
/>

// Update the Sync Now button
<Button
  title="Sync Now"
  onPress={async () => {
    console.log('🔄 Manual Health Connect sync triggered');
    
    try {
      // Show loading state to user
      alert('🔄 Syncing health data...\n\nThis may take a few moments.');
      
      const result = await syncFromHealthConnect(7);
      
      if (result.success) {
        const data = result.data;
        let syncSummary = '✅ Health data synced successfully!\n\n';
        
        // Show user what data was synced
        if (data?.steps) syncSummary += `📊 Steps: ${data.steps.toLocaleString()}\n`;
        if (data?.heartRate) syncSummary += `💓 Heart Rate: ${data.heartRate} bpm\n`;
        if (data?.activeCalories) syncSummary += `🔥 Active Calories: ${Math.round(data.activeCalories)}\n`;
        if (data?.distance) syncSummary += `🏃 Distance: ${(data.distance / 1000).toFixed(2)} km\n`;
        if (data?.weight) syncSummary += `⚖️ Weight: ${data.weight.toFixed(1)} kg\n`;
        
        alert(syncSummary);
        console.log('✅ Manual Health Connect sync successful:', data);
      } else {
        alert(`❌ Failed to sync health data:\n\n${result.error}\n\nPlease check your Health Connect permissions and try again.`);
        console.error('❌ Manual sync failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Health Connect sync error:', error);
      alert(`❌ Error syncing health data:\n\n${error.message}`);
    }
  }}
  variant="outline"
  size="md"
  style={styles.syncButton}
/>
```

#### **5.2 Update Health Overview Display**
**Why This Phase:**
- Updates the main health data display to show Health Connect data
- Provides clear indication of data source for user transparency
- Maintains visual consistency with existing design

**File: `src/screens/main/HomeScreen.tsx`** (Update health metrics display)

```typescript
// Update the Health Overview section to display Health Connect data
{isHealthConnectAuthorized && healthSettings.healthConnectEnabled ? (
  <View style={styles.healthContainer}>
    {/* Steps Card - Primary fitness metric */}
    <Card style={styles.healthMetricCard} variant="outlined">
      <View style={styles.healthMetricHeader}>
        <Text style={styles.healthMetricIcon}>👣</Text>
        <View style={styles.healthMetricProgress}>
          <View style={styles.healthProgressRing}>
            <View 
              style={[
                styles.healthProgressFill,
                { 
                  transform: [{ 
                    rotate: `${Math.min((healthMetrics?.steps || 0) / 10000 * 360, 360)}deg` 
                  }] 
                }
              ]}
            />
          </View>
        </View>
      </View>
      <Text style={styles.healthMetricValue}>
        {healthMetrics?.steps?.toLocaleString() || '0'}
      </Text>
      <Text style={styles.healthMetricLabel}>Steps</Text>
      <Text style={styles.healthMetricGoal}>Goal: 10,000</Text>
      <Text style={styles.healthMetricSource}>Health Connect</Text>
    </Card>
    
    {/* Heart Rate Card - Vital health metric */}
    <Card style={styles.healthMetricCard} variant="outlined">
      <View style={styles.healthMetricHeader}>
        <Text style={styles.healthMetricIcon}>💓</Text>
        <View style={styles.healthMetricProgress}>
          <View style={styles.healthProgressRing}>
            <View 
              style={[
                styles.healthProgressFill,
                { 
                  backgroundColor: healthMetrics?.heartRate > 100 ? '#FF6B6B' : '#4ECDC4',
                  transform: [{ rotate: `${Math.min((healthMetrics?.heartRate || 0) / 200 * 360, 360)}deg` }] 
                }
              ]}
            />
          </View>
        </View>
      </View>
      <Text style={styles.healthMetricValue}>
        {healthMetrics?.heartRate || '--'}
      </Text>
      <Text style={styles.healthMetricLabel}>Heart Rate</Text>
      <Text style={styles.healthMetricSubLabel}>
        {healthMetrics?.heartRate ? (healthMetrics.heartRate > 100 ? 'Active' : 'Resting') : 'No data'}
      </Text>
      <Text style={styles.healthMetricSource}>Health Connect</Text>
    </Card>
    
    {/* Active Calories Card - Energy tracking */}
    <Card style={styles.healthMetricCard} variant="outlined">
      <View style={styles.healthMetricHeader}>
        <Text style={styles.healthMetricIcon}>🔥</Text>
        <View style={styles.healthMetricProgress}>
          <View style={styles.healthProgressRing}>
            <View 
              style={[
                styles.healthProgressFill,
                { 
                  transform: [{ 
                    rotate: `${Math.min((healthMetrics?.activeCalories || 0) / 500 * 360, 360)}deg` 
                  }] 
                }
              ]}
            />
          </View>
        </View>
      </View>
      <Text style={styles.healthMetricValue}>
        {Math.round(healthMetrics?.activeCalories || 0)}
      </Text>
      <Text style={styles.healthMetricLabel}>Active Calories</Text>
      <Text style={styles.healthMetricGoal}>Goal: 500</Text>
      <Text style={styles.healthMetricSource}>Health Connect</Text>
    </Card>
    
    {/* Distance Card - Movement tracking */}
    {healthMetrics?.distance && (
      <Card style={styles.healthMetricCard} variant="outlined">
        <View style={styles.healthMetricHeader}>
          <Text style={styles.healthMetricIcon}>🏃</Text>
        </View>
        <Text style={styles.healthMetricValue}>
          {(healthMetrics.distance / 1000).toFixed(2)}
        </Text>
        <Text style={styles.healthMetricLabel}>Distance (km)</Text>
        <Text style={styles.healthMetricSource}>Health Connect</Text>
      </Card>
    )}
    
    {/* Health Insights Card */}
    <Card style={styles.healthInsightCard} variant="outlined">
      <View style={styles.healthInsightHeader}>
        <Text style={styles.healthInsightIcon}>💡</Text>
        <Text style={styles.healthInsightTitle}>Health Insight</Text>
      </View>
      <Text style={styles.healthInsightText}>
        {healthMetrics?.steps > 8000 
          ? "Great job! You're staying active today." 
          : "Try to get more steps in today for better health."}
      </Text>
    </Card>
    
    {/* Sync Status Indicator */}
    <View style={styles.healthSyncStatus}>
      <Text style={styles.healthSyncStatusText}>
        Last synced: {healthMetrics?.lastSyncDate 
          ? new Date(healthMetrics.lastSyncDate).toLocaleTimeString() 
          : 'Never'}
      </Text>
      <Text style={styles.healthSyncSource}>via Health Connect</Text>
    </View>
  </View>
) : (
  // Health Connect setup card - shown when not connected
  <Card style={styles.healthSetupCard} variant="outlined">
    <View style={styles.healthSetupContent}>
      <Text style={styles.healthSetupIcon}>🔗</Text>
      <Text style={styles.healthSetupTitle}>Connect Health Data</Text>
      <Text style={styles.healthSetupText}>
        Connect to Health Connect to track steps, heart rate, sleep, and more for personalized workout recommendations. 
        Health Connect keeps your data private and secure on your device.
      </Text>
      <Button
        title="Connect Health Connect"
        onPress={() => setShowHealthSettingsModal(true)}
        variant="primary"
        size="sm"
        style={styles.healthSetupButton}
      />
      <Text style={styles.healthSetupNote}>
        Requires Health Connect app (available on Android 8.0+)
      </Text>
    </View>
  </Card>
)}
```

#### **5.3 Add Health Connect Status Styles**
**Why This Phase:**
- Adds visual styling for Health Connect-specific UI elements
- Ensures consistent design language with existing app theme

```typescript
// Add these styles to the existing StyleSheet in HomeScreen.tsx

healthMetricSource: {
  fontSize: ResponsiveTheme.fontSize.xs,
  color: ResponsiveTheme.colors.primary,
  fontWeight: ResponsiveTheme.fontWeight.medium,
  marginTop: ResponsiveTheme.spacing.xs,
  textAlign: 'center',
},

healthSyncStatus: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: ResponsiveTheme.spacing.md,
  paddingVertical: ResponsiveTheme.spacing.sm,
  backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  borderRadius: ResponsiveTheme.borderRadius.sm,
  marginTop: ResponsiveTheme.spacing.md,
},

healthSyncStatusText: {
  fontSize: ResponsiveTheme.fontSize.xs,
  color: ResponsiveTheme.colors.textSecondary,
},

healthSyncSource: {
  fontSize: ResponsiveTheme.fontSize.xs,
  color: ResponsiveTheme.colors.primary,
  fontWeight: ResponsiveTheme.fontWeight.medium,
},

healthSetupNote: {
  fontSize: ResponsiveTheme.fontSize.xs,
  color: ResponsiveTheme.colors.textSecondary,
  textAlign: 'center',
  marginTop: ResponsiveTheme.spacing.sm,
  fontStyle: 'italic',
},
```

---

### **🧪 PHASE 6: TESTING STRATEGY**

#### **6.1 Unit Testing**
**Why This Phase:**
- Ensures individual components work correctly in isolation
- Catches bugs early in development cycle
- Provides confidence in service layer functionality

**File: `src/services/__tests__/healthConnect.test.ts`**

```typescript
import { healthConnectService } from '../healthConnect';

describe('HealthConnectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize Health Connect successfully', async () => {
      // Mock successful initialization
      const mockGetSdkStatus = jest.fn().mockResolvedValue('SDK_AVAILABLE');
      const mockInitialize = jest.fn().mockResolvedValue(true);
      
      const result = await healthConnectService.initializeHealthConnect();
      expect(typeof result).toBe('boolean');
    });

    test('should handle initialization failure', async () => {
      // Mock initialization failure
      const mockGetSdkStatus = jest.fn().mockResolvedValue('SDK_UNAVAILABLE');
      
      const result = await healthConnectService.initializeHealthConnect();
      expect(result).toBe(false);
    });
  });

  describe('Permissions', () => {
    test('should request permissions successfully', async () => {
      // Mock successful permission request
      const mockRequestPermission = jest.fn().mockResolvedValue(true);
      
      const result = await healthConnectService.requestPermissions();
      expect(typeof result).toBe('boolean');
    });

    test('should handle permission denial', async () => {
      // Mock permission denial
      const mockRequestPermission = jest.fn().mockResolvedValue(false);
      
      const result = await healthConnectService.requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('Data Sync', () => {
    test('should sync health data successfully', async () => {
      // Mock successful permission grant
      jest.spyOn(healthConnectService, 'hasPermissions').mockResolvedValue(true);
      
      // Mock health data records
      const mockStepsData = [{ count: 5000 }, { count: 3000 }];
      const mockReadRecords = jest.fn()
        .mockResolvedValueOnce(mockStepsData)  // Steps
        .mockResolvedValueOnce([{ beatsPerMinute: 72 }])  // Heart rate
        .mockResolvedValueOnce([{ energy: { inKilocalories: 250 } }]);  // Calories
      
      const result = await healthConnectService.syncHealthData(1);
      
      expect(result).toBeDefined();
      expect(result.lastSyncDate).toBeDefined();
      expect(result.steps).toBe(8000);  // 5000 + 3000
    });

    test('should handle sync failure without permissions', async () => {
      // Mock no permissions
      jest.spyOn(healthConnectService, 'hasPermissions').mockResolvedValue(false);
      
      await expect(healthConnectService.syncHealthData(1))
        .rejects
        .toThrow('Health Connect permissions not granted');
    });
  });

  describe('Utility Methods', () => {
    test('should open Health Connect settings', async () => {
      const mockOpenSettings = jest.fn().mockResolvedValue(undefined);
      
      await expect(healthConnectService.openSettings()).resolves.not.toThrow();
    });

    test('should return correct permission status', async () => {
      const hasPermissions = await healthConnectService.hasPermissions();
      expect(typeof hasPermissions).toBe('boolean');
    });
  });
});
```

#### **6.2 Integration Testing**
**Why This Phase:**
- Tests complete user flows from UI to data storage
- Validates Health Connect integration with real Android system
- Ensures proper error handling in real-world scenarios

**Test Scenarios:**
- ✅ **Device Compatibility Testing**: Test on various Android versions (8.0+)
- ✅ **Permission Flow Testing**: Test grant/deny scenarios with real permission dialogs
- ✅ **Data Accuracy Testing**: Verify synced data matches Health Connect app
- ✅ **Error Handling Testing**: Test offline scenarios, API failures, missing Health Connect
- ✅ **Performance Testing**: Measure sync speed and memory usage
- ✅ **UI Responsiveness Testing**: Ensure app remains responsive during data sync

#### **6.3 User Acceptance Testing**
**Why This Phase:**
- Validates user experience meets expectations
- Identifies usability issues before production release
- Ensures feature parity with previous Google Fit integration

**Test Cases:**
- ✅ **First-time Connection Flow**: New user connecting Health Connect
- ✅ **Data Display Accuracy**: Health metrics shown correctly in UI
- ✅ **Permission Management**: User can grant/revoke permissions easily
- ✅ **Sync Performance**: Data syncs within acceptable time limits
- ✅ **Error Recovery**: User can recover from connection failures
- ✅ **Settings Access**: User can access Health Connect settings when needed

---

### **📱 PHASE 7: DEPLOYMENT PREPARATION**

#### **7.1 Google Play Store Declaration**
**Why This Phase:**
- Required for apps accessing sensitive health data through Health Connect
- Ensures compliance with Google Play Store policies
- Prevents app rejection or removal from Play Store

**Requirements:**
- ✅ **Health Connect Declaration Form**: Submit to Google Play Console
- ✅ **Data Usage Policy**: Document how health data is used and stored
- ✅ **Privacy Policy Update**: Include Health Connect data handling
- ✅ **Permissions Justification**: Explain why each health permission is needed

**Timeline:**
- Form submission to approval: Up to 7 days
- Whitelist propagation: Additional 5-7 business days
- **Total**: Plan for 2 weeks before app release

#### **7.2 Build Configuration**
**Why This Phase:**
- Ensures proper compilation with Health Connect dependencies
- Validates app works correctly in production environment

```bash
# Development build for testing
npx eas build --platform android --profile development --local

# Production build for Play Store
npx eas build --platform android --profile production
```

#### **7.3 Rollout Strategy**
**Why This Phase:**
- Minimizes risk of widespread issues
- Allows for monitoring and quick rollback if needed
- Provides data on Health Connect adoption rates

**Phased Rollout Plan:**
- ✅ **Internal Testing**: Team and beta testers (Week 1)
- ✅ **Limited Release**: 10% of users (Week 2)
- ✅ **Expanded Release**: 50% of users (Week 3)
- ✅ **Full Release**: 100% of users (Week 4)

**Monitoring Metrics:**
- Health Connect initialization success rate
- Permission grant rate
- Data sync success rate
- User satisfaction scores
- App crash rate

---

### **🔄 PHASE 8: MIGRATION & CLEANUP**

#### **8.1 Google Fit Deprecation**
**Why This Phase:**
- Removes deprecated code that will stop working in 2026
- Reduces app size and complexity
- Eliminates maintenance burden of deprecated API

**Migration Steps:**
- ✅ **Feature Flag Implementation**: Control Google Fit vs Health Connect usage
- ✅ **Gradual Deprecation**: Phase out Google Fit over 3 months
- ✅ **User Communication**: Notify users about Health Connect migration
- ✅ **Data Continuity**: Ensure seamless transition without data loss
- ✅ **Code Cleanup**: Remove Google Fit dependencies and unused code

#### **8.2 Monitoring & Analytics**
**Why This Phase:**
- Tracks success of Health Connect implementation
- Identifies areas for improvement
- Provides data for future health feature development

**Key Metrics to Track:**
- ✅ **Adoption Rate**: Percentage of users connecting Health Connect
- ✅ **Data Quality**: Accuracy and completeness of synced health data
- ✅ **User Engagement**: Usage of health features after migration
- ✅ **Error Rates**: Frequency and types of Health Connect errors
- ✅ **Performance**: Impact on app startup and sync times

---

### **📊 SUCCESS CRITERIA & KPIs**

#### **Technical Success Metrics:**
- ✅ **Health Connect Initialization**: Success rate > 95%
- ✅ **Permission Grant Rate**: > 80% of users grant permissions
- ✅ **Data Sync Success**: > 90% successful syncs
- ✅ **App Stability**: Crash rate < 0.1%
- ✅ **Performance**: Sync completion < 5 seconds
- ✅ **Data Accuracy**: 99%+ accuracy vs Health Connect app

#### **User Experience Metrics:**
- ✅ **User Satisfaction**: Rating > 4.5/5 for health features
- ✅ **Feature Usage**: Health overview engagement maintained or improved
- ✅ **Support Tickets**: < 5% increase in health-related support requests
- ✅ **User Retention**: No decrease in DAU/MAU from health feature users

#### **Business Impact Metrics:**
- ✅ **Feature Parity**: 100% of Google Fit features replicated
- ✅ **Zero Downtime**: No service interruption during migration
- ✅ **Future-Proofing**: Ready for 2026 Google Fit shutdown
- ✅ **Competitive Advantage**: Enhanced privacy and performance vs competitors

---

### **⏱️ IMPLEMENTATION TIMELINE**

| Phase | Duration | Dependencies | Deliverables |
|-------|----------|--------------|--------------|
| **Phase 1-2**: Analysis & Dependencies | 2 days | None | Requirements doc, packages installed |
| **Phase 3**: Native Configuration | 1 day | Phase 2 complete | Android/Expo configuration |
| **Phase 4**: Service Implementation | 4 days | Phase 3 complete | Health Connect service, store integration |
| **Phase 5**: UI Updates | 3 days | Phase 4 complete | Updated UI components, modal |
| **Phase 6**: Testing | 3 days | Phase 5 complete | Test suite, validation results |
| **Phase 7**: Deployment Prep | 2 days | Phase 6 complete | Play Store submission, builds |
| **Phase 8**: Migration & Cleanup | 2 days | Phase 7 complete | Google Fit removal, monitoring |

**Total Estimated Timeline: 17 days (3.5 weeks)**

---

### **🚨 RISK MITIGATION**

#### **High-Priority Risks:**
1. **Health Connect Unavailability**: Some devices may not have Health Connect
   - **Mitigation**: Graceful fallback, clear user messaging, manual data entry option

2. **Permission Denial**: Users may deny health permissions
   - **Mitigation**: Clear permission rationale, settings deep-link, optional health features

3. **Data Migration Issues**: Potential data loss during transition
   - **Mitigation**: Backup existing data, gradual rollout, rollback capability

4. **Performance Impact**: Health Connect sync affecting app performance
   - **Mitigation**: Background sync, progress indicators, timeout handling

#### **Medium-Priority Risks:**
1. **Google Play Approval Delay**: Health Connect declaration taking longer than expected
   - **Mitigation**: Submit early, prepare alternative timeline

2. **Library Updates**: React Native Health Connect library breaking changes
   - **Mitigation**: Pin specific versions, thorough testing, update monitoring

---

### **📚 DOCUMENTATION & MAINTENANCE**

#### **Technical Documentation:**
- ✅ **API Documentation**: Health Connect service methods and usage
- ✅ **Integration Guide**: Step-by-step implementation instructions
- ✅ **Troubleshooting Guide**: Common issues and solutions
- ✅ **Testing Procedures**: Validation and testing protocols

#### **User Documentation:**
- ✅ **User Guide**: How to connect and use Health Connect features
- ✅ **FAQ**: Common user questions and answers
- ✅ **Privacy Guide**: How health data is handled and protected
- ✅ **Support Resources**: Where to get help with health features

#### **Maintenance Plan:**
- ✅ **Regular Updates**: Monitor Health Connect library updates
- ✅ **Performance Monitoring**: Track health feature performance metrics
- ✅ **User Feedback**: Collect and act on user feedback
- ✅ **Security Updates**: Keep health data handling secure and compliant

---

## 📋 **CONCLUSION**

This Health Connect implementation plan provides a comprehensive, step-by-step approach to migrating from the deprecated Google Fit API to Google's modern Health Connect platform. The migration is **essential** for:

1. **Avoiding Service Disruption**: Google Fit APIs will stop working in 2026
2. **Improving User Experience**: Better privacy, performance, and data control
3. **Future-Proofing**: Aligning with Google's health data strategy
4. **Maintaining Competitive Advantage**: Modern health integration capabilities

The plan ensures **zero data loss**, **minimal user disruption**, and **improved functionality** while meeting all technical, business, and regulatory requirements.

**Next Steps**: Begin implementation immediately to ensure completion well before the 2026 deadline and to start benefiting from Health Connect's improved capabilities.

---

*This document serves as the single source of truth for the Health Connect implementation project and should be referenced throughout the development process.*
