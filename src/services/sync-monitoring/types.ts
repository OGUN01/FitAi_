// Type definitions for Sync Monitoring Service

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncDuration: number;
  totalDataSynced: number;
  lastSyncPerformance: SyncPerformance;
  networkStats: NetworkStats;
  errorStats: ErrorStats;
}

export interface SyncPerformance {
  syncId: string;
  duration: number;
  throughput: number; // items per second
  networkLatency: number;
  batteryImpact: number; // percentage
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export interface NetworkStats {
  connectionType: "wifi" | "cellular" | "ethernet" | "unknown";
  signalStrength: number; // 0-100
  bandwidth: number; // Mbps
  latency: number; // ms
  dataUsage: {
    uploaded: number; // bytes
    downloaded: number; // bytes
    total: number; // bytes
  };
}

export interface ErrorStats {
  networkErrors: number;
  validationErrors: number;
  conflictErrors: number;
  permissionErrors: number;
  quotaErrors: number;
  unknownErrors: number;
  totalErrors: number;
  errorRate: number; // percentage
}

export interface ConnectionHealth {
  status: "excellent" | "good" | "fair" | "poor" | "offline";
  score: number; // 0-100
  factors: {
    latency: number;
    bandwidth: number;
    stability: number;
    signalStrength: number;
  };
  recommendations: string[];
}

export interface SyncQueueInfo {
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  operationsByType: Record<string, number>;
  operationsByPriority: Record<string, number>;
  averageWaitTime: number;
  oldestOperation: Date | null;
}
