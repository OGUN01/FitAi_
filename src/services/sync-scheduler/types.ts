// Intelligent Sync Scheduler Types
// Type definitions for smart sync scheduling

import { ConnectionHealth } from "../syncMonitoring";

// ============================================================================
// CONFIGURATION TYPES
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
  priority: "low" | "normal" | "high";
  conditions: {
    requireWifi: boolean;
    requireCharging: boolean;
    maxBatteryDrain: number; // percentage per hour
  };
}

// ============================================================================
// DEVICE CONDITION TYPES
// ============================================================================

export interface DeviceConditions {
  batteryLevel: number; // percentage
  isCharging: boolean;
  networkType: "wifi" | "cellular" | "ethernet" | "unknown";
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
  thermalState: "normal" | "fair" | "serious" | "critical";
}

// ============================================================================
// DECISION TYPES
// ============================================================================

export interface SyncDecision {
  shouldSync: boolean;
  reason: string;
  confidence: number; // 0-100
  suggestedDelay: number; // milliseconds
  conditions: {
    battery: "good" | "acceptable" | "poor";
    network: "good" | "acceptable" | "poor";
    activity: "good" | "acceptable" | "poor";
    performance: "good" | "acceptable" | "poor";
  };
  recommendations: string[];
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

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
// CALLBACK TYPES
// ============================================================================

export type SyncDecisionCallback = (decision: SyncDecision) => void;
export type ConditionsUpdateCallback = (conditions: DeviceConditions) => void;
