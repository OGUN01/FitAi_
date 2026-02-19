import { realTimeSyncService, SyncStatus, SyncResult } from "../syncService";
import {
  SyncMetrics,
  SyncPerformance,
  ConnectionHealth,
  SyncQueueInfo,
} from "./types";
import { MetricsManager } from "./metrics";
import { HealthMonitor } from "./health";

export class SyncMonitoringService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsManager: MetricsManager;
  private healthMonitor: HealthMonitor;

  constructor() {
    this.metricsManager = new MetricsManager();
    this.healthMonitor = new HealthMonitor();
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      await this.metricsManager.loadMetrics();
      await this.healthMonitor.loadHistory();

      realTimeSyncService.onStatusChange(this.handleStatusChange.bind(this));
      realTimeSyncService.onSyncResult(this.handleSyncResult.bind(this));

      this.monitoringInterval = setInterval(() => {
        this.updateNetworkStats();
        this.updateConnectionHealth();
        this.cleanupHistory();
      }, 10000);

      this.isMonitoring = true;
      console.log("Sync monitoring started");
    } catch (error) {
      console.error("Failed to start sync monitoring:", error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.metricsManager.saveMetrics();
    await this.healthMonitor.saveHistory();
    this.isMonitoring = false;
    console.log("Sync monitoring stopped");
  }

  getMetrics(): SyncMetrics {
    return this.metricsManager.getMetrics();
  }

  getConnectionHealth(): ConnectionHealth {
    const metrics = this.metricsManager.getMetrics();
    return this.healthMonitor.getConnectionHealth(metrics.networkStats);
  }

  getSyncQueueInfo(): SyncQueueInfo {
    const syncStatus = realTimeSyncService.getSyncStatus();

    return {
      totalOperations: syncStatus.queuedOperations,
      pendingOperations: syncStatus.pendingChanges,
      failedOperations: 0,
      operationsByType: {
        create: 0,
        update: 0,
        delete: 0,
      },
      operationsByPriority: {
        low: 0,
        normal: 0,
        high: 0,
        critical: 0,
      },
      averageWaitTime: 0,
      oldestOperation: null,
    };
  }

  getPerformanceHistory(limit = 50): SyncPerformance[] {
    return this.metricsManager.getPerformanceHistory(limit);
  }

  getConnectionHistory(limit = 50): ConnectionHealth[] {
    return this.healthMonitor.getConnectionHistory(limit);
  }

  async resetMetrics(): Promise<void> {
    await this.metricsManager.resetMetrics();
    this.healthMonitor.resetHistory();
  }

  onMetricsUpdate(callback: (metrics: SyncMetrics) => void): () => void {
    return this.metricsManager.onMetricsUpdate(callback);
  }

  onHealthUpdate(callback: (health: ConnectionHealth) => void): () => void {
    return this.healthMonitor.onHealthUpdate(callback);
  }

  private handleStatusChange(status: SyncStatus): void {
    const signalStrength = this.healthMonitor.getSignalStrength(
      status.connectionQuality,
    );
    this.metricsManager.updateSignalStrength(signalStrength);
  }

  private handleSyncResult(result: SyncResult): void {
    const metrics = this.metricsManager.getMetrics();
    this.metricsManager.handleSyncResult(result, metrics.networkStats.latency);
  }

  private updateNetworkStats(): void {
    this.metricsManager.updateNetworkStats(
      "wifi",
      80 + Math.random() * 20,
      50 + Math.random() * 50,
      20 + Math.random() * 30,
    );
  }

  private updateConnectionHealth(): void {
    this.getConnectionHealth();
  }

  private cleanupHistory(): void {
    this.metricsManager.cleanupHistory();
    this.healthMonitor.cleanupHistory();
  }
}

export const syncMonitoringService = new SyncMonitoringService();
export default syncMonitoringService;
