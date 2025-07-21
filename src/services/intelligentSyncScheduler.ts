// Intelligent Sync Scheduler for Track B Infrastructure
// Provides smart sync scheduling based on network conditions, battery level, and user activity

import { realTimeSyncService } from './syncService';
import { syncMonitoringService, ConnectionHealth } from './syncMonitoring';
import { enhancedLocalStorage } from './localStorage';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SchedulingConfig {
  enableIntelligentScheduling: boolean;
  respectBatteryLevel: boolean;
  respectNetworkConditions: boolean;
  respectUserActivity: boolean;
  minBatteryLevel: number; // percentage
  minConnectionScore: number; // 0-100
  userActivityThreshold: number; // minutes of inactivity
  priorityOverrides: {
    critical: boolean; // Always sync critical operations
    highPriority: boolean; // Sync high priority with relaxed conditions
  };
  scheduleWindows: ScheduleWindow[];
}

export interface ScheduleWindow {
  name: string;
  startHour: number; // 0-23
  endHour: number; // 0-23
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  priority: 'low' | 'normal' | 'high';
  conditions: {
    requireWifi: boolean;
    requireCharging: boolean;
    maxBatteryDrain: number; // percentage per hour
  };
}

export interface DeviceConditions {
  batteryLevel: number; // percentage
  isCharging: boolean;
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  connectionHealth: ConnectionHealth;
  userActivity: UserActivity;
  devicePerformance: DevicePerformance;
}

export interface UserActivity {
  isActive: boolean;
  lastActivityTime: Date;
  inactivityDuration: number; // minutes
  currentScreen: string;
  appInForeground: boolean;
}

export interface DevicePerformance {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  storageAvailable: number; // MB
  thermalState: 'normal' | 'fair' | 'serious' | 'critical';
}

export interface SyncDecision {
  shouldSync: boolean;
  reason: string;
  confidence: number; // 0-100
  suggestedDelay: number; // milliseconds
  conditions: {
    battery: 'good' | 'acceptable' | 'poor';
    network: 'good' | 'acceptable' | 'poor';
    activity: 'good' | 'acceptable' | 'poor';
    performance: 'good' | 'acceptable' | 'poor';
  };
  recommendations: string[];
}

export interface SchedulingStats {
  totalDecisions: number;
  syncApproved: number;
  syncDelayed: number;
  syncDenied: number;
  averageDelay: number;
  conditionBreakdown: {
    batteryBlocks: number;
    networkBlocks: number;
    activityBlocks: number;
    performanceBlocks: number;
  };
}

// ============================================================================
// INTELLIGENT SYNC SCHEDULER
// ============================================================================

export class IntelligentSyncScheduler {
  private config: SchedulingConfig;
  private stats: SchedulingStats;
  private isActive = false;
  private schedulingTimer: NodeJS.Timeout | null = null;
  private decisionCallbacks: ((decision: SyncDecision) => void)[] = [];
  private conditionsCallbacks: ((conditions: DeviceConditions) => void)[] = [];

  constructor(config?: Partial<SchedulingConfig>) {
    this.config = {
      enableIntelligentScheduling: true,
      respectBatteryLevel: true,
      respectNetworkConditions: true,
      respectUserActivity: true,
      minBatteryLevel: 20,
      minConnectionScore: 50,
      userActivityThreshold: 5, // 5 minutes of inactivity
      priorityOverrides: {
        critical: true,
        highPriority: false,
      },
      scheduleWindows: [
        {
          name: 'Night Sync',
          startHour: 2,
          endHour: 6,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          priority: 'high',
          conditions: {
            requireWifi: true,
            requireCharging: true,
            maxBatteryDrain: 5,
          },
        },
        {
          name: 'Lunch Break',
          startHour: 12,
          endHour: 14,
          daysOfWeek: [1, 2, 3, 4, 5],
          priority: 'normal',
          conditions: {
            requireWifi: false,
            requireCharging: false,
            maxBatteryDrain: 10,
          },
        },
      ],
      ...config,
    };

    this.stats = {
      totalDecisions: 0,
      syncApproved: 0,
      syncDelayed: 0,
      syncDenied: 0,
      averageDelay: 0,
      conditionBreakdown: {
        batteryBlocks: 0,
        networkBlocks: 0,
        activityBlocks: 0,
        performanceBlocks: 0,
      },
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start intelligent scheduling
   */
  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      await this.loadStats();
      
      // Start monitoring device conditions
      this.schedulingTimer = setInterval(() => {
        this.evaluateConditions();
      }, 30000); // Every 30 seconds

      this.isActive = true;
      console.log('Intelligent sync scheduler started');
    } catch (error) {
      console.error('Failed to start sync scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop intelligent scheduling
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;

    if (this.schedulingTimer) {
      clearInterval(this.schedulingTimer);
      this.schedulingTimer = null;
    }

    await this.saveStats();
    this.isActive = false;
    console.log('Intelligent sync scheduler stopped');
  }

  /**
   * Make sync decision based on current conditions
   */
  async makeSyncDecision(priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): Promise<SyncDecision> {
    const conditions = await this.getCurrentConditions();
    const decision = this.evaluateSyncDecision(conditions, priority);
    
    this.updateStats(decision);
    this.notifyDecisionCallbacks(decision);
    
    return decision;
  }

  /**
   * Get current device conditions
   */
  async getCurrentConditions(): Promise<DeviceConditions> {
    const batteryLevel = await this.getBatteryLevel();
    const isCharging = await this.getChargingStatus();
    const networkType = await this.getNetworkType();
    const connectionHealth = syncMonitoringService.getConnectionHealth();
    const userActivity = await this.getUserActivity();
    const devicePerformance = await this.getDevicePerformance();

    const conditions: DeviceConditions = {
      batteryLevel,
      isCharging,
      networkType,
      connectionHealth,
      userActivity,
      devicePerformance,
    };

    this.notifyConditionsCallbacks(conditions);
    return conditions;
  }

  /**
   * Get optimal sync window
   */
  getOptimalSyncWindow(): ScheduleWindow | null {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const activeWindows = this.config.scheduleWindows.filter(window => {
      const isInTimeRange = currentHour >= window.startHour && currentHour < window.endHour;
      const isInDayRange = window.daysOfWeek.includes(currentDay);
      return isInTimeRange && isInDayRange;
    });

    // Return highest priority window
    return activeWindows.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })[0] || null;
  }

  /**
   * Update scheduling configuration
   */
  updateConfig(newConfig: Partial<SchedulingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get scheduling statistics
   */
  getStats(): SchedulingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  async resetStats(): Promise<void> {
    this.stats = {
      totalDecisions: 0,
      syncApproved: 0,
      syncDelayed: 0,
      syncDenied: 0,
      averageDelay: 0,
      conditionBreakdown: {
        batteryBlocks: 0,
        networkBlocks: 0,
        activityBlocks: 0,
        performanceBlocks: 0,
      },
    };
    await this.saveStats();
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to sync decisions
   */
  onSyncDecision(callback: (decision: SyncDecision) => void): () => void {
    this.decisionCallbacks.push(callback);
    return () => {
      const index = this.decisionCallbacks.indexOf(callback);
      if (index > -1) {
        this.decisionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to condition updates
   */
  onConditionsUpdate(callback: (conditions: DeviceConditions) => void): () => void {
    this.conditionsCallbacks.push(callback);
    return () => {
      const index = this.conditionsCallbacks.indexOf(callback);
      if (index > -1) {
        this.conditionsCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async evaluateConditions(): Promise<void> {
    if (!this.config.enableIntelligentScheduling) return;

    const conditions = await this.getCurrentConditions();
    const decision = await this.makeSyncDecision();

    // If conditions are optimal and there are pending operations, suggest sync
    if (decision.shouldSync && decision.confidence > 80) {
      const syncStatus = realTimeSyncService.getSyncStatus();
      if (syncStatus.queuedOperations > 0 && !syncStatus.isSyncing) {
        // Trigger sync automatically for optimal conditions
        realTimeSyncService.startSync().catch(console.error);
      }
    }
  }

  private evaluateSyncDecision(conditions: DeviceConditions, priority: string): SyncDecision {
    const decision: SyncDecision = {
      shouldSync: true,
      reason: '',
      confidence: 100,
      suggestedDelay: 0,
      conditions: {
        battery: 'good',
        network: 'good',
        activity: 'good',
        performance: 'good',
      },
      recommendations: [],
    };

    const reasons: string[] = [];
    let confidence = 100;

    // Check priority overrides
    if (priority === 'critical' && this.config.priorityOverrides.critical) {
      decision.reason = 'Critical priority override';
      return decision;
    }

    // Evaluate battery conditions
    if (this.config.respectBatteryLevel) {
      if (conditions.batteryLevel < this.config.minBatteryLevel && !conditions.isCharging) {
        decision.shouldSync = false;
        decision.conditions.battery = 'poor';
        reasons.push(`Battery level too low (${conditions.batteryLevel}%)`);
        confidence -= 30;
        this.stats.conditionBreakdown.batteryBlocks++;
      } else if (conditions.batteryLevel < this.config.minBatteryLevel * 1.5) {
        decision.conditions.battery = 'acceptable';
        confidence -= 10;
        decision.recommendations.push('Consider charging device for optimal sync performance');
      }
    }

    // Evaluate network conditions
    if (this.config.respectNetworkConditions) {
      if (conditions.connectionHealth.score < this.config.minConnectionScore) {
        decision.shouldSync = false;
        decision.conditions.network = 'poor';
        reasons.push(`Network quality too poor (${conditions.connectionHealth.score}/100)`);
        confidence -= 25;
        this.stats.conditionBreakdown.networkBlocks++;
      } else if (conditions.connectionHealth.score < this.config.minConnectionScore * 1.2) {
        decision.conditions.network = 'acceptable';
        confidence -= 10;
        decision.recommendations.push('Network quality is marginal, sync may be slower');
      }
    }

    // Evaluate user activity
    if (this.config.respectUserActivity) {
      if (conditions.userActivity.isActive && conditions.userActivity.appInForeground) {
        decision.conditions.activity = 'poor';
        confidence -= 15;
        decision.suggestedDelay = 60000; // 1 minute
        decision.recommendations.push('User is active, consider delaying sync');
      } else if (conditions.userActivity.inactivityDuration < this.config.userActivityThreshold) {
        decision.conditions.activity = 'acceptable';
        confidence -= 5;
      }
    }

    // Evaluate device performance
    if (conditions.devicePerformance.cpuUsage > 80 || conditions.devicePerformance.memoryUsage > 90) {
      decision.conditions.performance = 'poor';
      confidence -= 20;
      decision.suggestedDelay = 120000; // 2 minutes
      decision.recommendations.push('Device under high load, consider delaying sync');
      this.stats.conditionBreakdown.performanceBlocks++;
    } else if (conditions.devicePerformance.cpuUsage > 60 || conditions.devicePerformance.memoryUsage > 70) {
      decision.conditions.performance = 'acceptable';
      confidence -= 5;
    }

    // Check schedule windows
    const optimalWindow = this.getOptimalSyncWindow();
    if (optimalWindow) {
      confidence += 10;
      decision.recommendations.push(`Currently in optimal sync window: ${optimalWindow.name}`);
    }

    // Finalize decision
    decision.confidence = Math.max(0, confidence);
    decision.reason = decision.shouldSync 
      ? `Sync approved with ${decision.confidence}% confidence`
      : reasons.join(', ');

    if (!decision.shouldSync) {
      decision.suggestedDelay = Math.max(decision.suggestedDelay, 300000); // At least 5 minutes
    }

    return decision;
  }

  private updateStats(decision: SyncDecision): void {
    this.stats.totalDecisions++;
    
    if (decision.shouldSync) {
      this.stats.syncApproved++;
    } else if (decision.suggestedDelay > 0) {
      this.stats.syncDelayed++;
      this.stats.averageDelay = 
        (this.stats.averageDelay * (this.stats.syncDelayed - 1) + decision.suggestedDelay) / 
        this.stats.syncDelayed;
    } else {
      this.stats.syncDenied++;
    }
  }

  private notifyDecisionCallbacks(decision: SyncDecision): void {
    this.decisionCallbacks.forEach(callback => {
      try {
        callback(decision);
      } catch (error) {
        console.error('Error in decision callback:', error);
      }
    });
  }

  private notifyConditionsCallbacks(conditions: DeviceConditions): void {
    this.conditionsCallbacks.forEach(callback => {
      try {
        callback(conditions);
      } catch (error) {
        console.error('Error in conditions callback:', error);
      }
    });
  }

  // Device condition getters (simulated for now)
  private async getBatteryLevel(): Promise<number> {
    // In real implementation, use Expo Battery API
    return 75 + Math.random() * 25; // Simulate 75-100%
  }

  private async getChargingStatus(): Promise<boolean> {
    // In real implementation, use Expo Battery API
    return Math.random() > 0.7; // 30% chance of charging
  }

  private async getNetworkType(): Promise<DeviceConditions['networkType']> {
    // In real implementation, use Expo Network API
    return Math.random() > 0.5 ? 'wifi' : 'cellular';
  }

  private async getUserActivity(): Promise<UserActivity> {
    // In real implementation, use app state and user interaction tracking
    const isActive = Math.random() > 0.6;
    const lastActivityTime = new Date(Date.now() - Math.random() * 600000); // Last 10 minutes
    const inactivityDuration = (Date.now() - lastActivityTime.getTime()) / 60000; // minutes

    return {
      isActive,
      lastActivityTime,
      inactivityDuration,
      currentScreen: 'HomeScreen',
      appInForeground: isActive,
    };
  }

  private async getDevicePerformance(): Promise<DevicePerformance> {
    // In real implementation, use device performance APIs
    return {
      cpuUsage: 20 + Math.random() * 40, // 20-60%
      memoryUsage: 30 + Math.random() * 40, // 30-70%
      storageAvailable: 1000 + Math.random() * 5000, // 1-6GB
      thermalState: 'normal',
    };
  }

  private async loadStats(): Promise<void> {
    try {
      const savedStats = await enhancedLocalStorage.getData<SchedulingStats>('sync_scheduling_stats');
      if (savedStats) {
        this.stats = savedStats;
      }
    } catch (error) {
      console.error('Failed to load scheduling stats:', error);
    }
  }

  private async saveStats(): Promise<void> {
    try {
      await enhancedLocalStorage.storeData('sync_scheduling_stats', this.stats);
    } catch (error) {
      console.error('Failed to save scheduling stats:', error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const intelligentSyncScheduler = new IntelligentSyncScheduler();
export default intelligentSyncScheduler;
