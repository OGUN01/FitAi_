import { SyncResult } from "../syncService";
import { SyncMetrics, SyncPerformance, ErrorStats } from "./types";
import { enhancedLocalStorage } from "../localStorage";

export class MetricsManager {
  private metrics: SyncMetrics;
  private performanceHistory: SyncPerformance[] = [];
  private metricsCallbacks: ((metrics: SyncMetrics) => void)[] = [];

  constructor() {
    this.metrics = this.getInitialMetrics();
  }

  private getInitialMetrics(): SyncMetrics {
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      totalDataSynced: 0,
      lastSyncPerformance: {
        syncId: "",
        duration: 0,
        throughput: 0,
        networkLatency: 0,
        batteryImpact: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      networkStats: {
        connectionType: "unknown",
        signalStrength: 0,
        bandwidth: 0,
        latency: 0,
        dataUsage: {
          uploaded: 0,
          downloaded: 0,
          total: 0,
        },
      },
      errorStats: {
        networkErrors: 0,
        validationErrors: 0,
        conflictErrors: 0,
        permissionErrors: 0,
        quotaErrors: 0,
        unknownErrors: 0,
        totalErrors: 0,
        errorRate: 0,
      },
    };
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  getPerformanceHistory(limit = 50): SyncPerformance[] {
    return this.performanceHistory.slice(-limit);
  }

  handleSyncResult(result: SyncResult, networkLatency: number): void {
    this.metrics.totalSyncs++;

    if (result.success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
      this.updateErrorStats(result.errors);
    }

    this.metrics.averageSyncDuration =
      (this.metrics.averageSyncDuration * (this.metrics.totalSyncs - 1) +
        result.duration) /
      this.metrics.totalSyncs;

    this.metrics.totalDataSynced +=
      result.syncedItems.uploaded + result.syncedItems.downloaded;

    const performance: SyncPerformance = {
      syncId: result.syncId,
      duration: result.duration,
      throughput:
        (result.syncedItems.uploaded + result.syncedItems.downloaded) /
        (result.duration / 1000),
      networkLatency,
      batteryImpact: this.estimateBatteryImpact(result),
      memoryUsage: this.estimateMemoryUsage(result),
      cpuUsage: this.estimateCpuUsage(result),
    };

    this.metrics.lastSyncPerformance = performance;
    this.performanceHistory.push(performance);

    this.metrics.errorStats.errorRate =
      (this.metrics.failedSyncs / this.metrics.totalSyncs) * 100;

    this.notifyMetricsCallbacks(this.metrics);
  }

  updateNetworkStats(
    connectionType: "wifi" | "cellular" | "ethernet" | "unknown",
    signalStrength: number,
    bandwidth: number,
    latency: number,
  ): void {
    this.metrics.networkStats = {
      connectionType,
      signalStrength,
      bandwidth,
      latency,
      dataUsage: {
        uploaded:
          this.metrics.networkStats.dataUsage.uploaded + Math.random() * 1000,
        downloaded:
          this.metrics.networkStats.dataUsage.downloaded + Math.random() * 2000,
        total: this.metrics.networkStats.dataUsage.total + Math.random() * 3000,
      },
    };
  }

  updateSignalStrength(signalStrength: number): void {
    this.metrics.networkStats.signalStrength = signalStrength;
  }

  async resetMetrics(): Promise<void> {
    this.metrics = {
      ...this.metrics,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      totalDataSynced: 0,
      errorStats: {
        networkErrors: 0,
        validationErrors: 0,
        conflictErrors: 0,
        permissionErrors: 0,
        quotaErrors: 0,
        unknownErrors: 0,
        totalErrors: 0,
        errorRate: 0,
      },
    };

    this.performanceHistory = [];
    await this.saveMetrics();
  }

  cleanupHistory(): void {
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  onMetricsUpdate(callback: (metrics: SyncMetrics) => void): () => void {
    this.metricsCallbacks.push(callback);
    return () => {
      const index = this.metricsCallbacks.indexOf(callback);
      if (index > -1) {
        this.metricsCallbacks.splice(index, 1);
      }
    };
  }

  async loadMetrics(): Promise<void> {
    try {
      const savedMetrics =
        await enhancedLocalStorage.getData<SyncMetrics>("sync_metrics");
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...savedMetrics };
      }

      const savedPerformance = await enhancedLocalStorage.getData<
        SyncPerformance[]
      >("sync_performance_history");
      if (savedPerformance) {
        this.performanceHistory = savedPerformance;
      }
    } catch (error) {
      console.error("Failed to load metrics:", error);
    }
  }

  async saveMetrics(): Promise<void> {
    try {
      await enhancedLocalStorage.storeData("sync_metrics", this.metrics);
      await enhancedLocalStorage.storeData(
        "sync_performance_history",
        this.performanceHistory,
      );
    } catch (error) {
      console.error("Failed to save metrics:", error);
    }
  }

  private updateErrorStats(errors: any[]): void {
    errors.forEach((error) => {
      switch (error.type) {
        case "network":
          this.metrics.errorStats.networkErrors++;
          break;
        case "validation":
          this.metrics.errorStats.validationErrors++;
          break;
        case "conflict":
          this.metrics.errorStats.conflictErrors++;
          break;
        case "permission":
          this.metrics.errorStats.permissionErrors++;
          break;
        case "quota":
          this.metrics.errorStats.quotaErrors++;
          break;
        default:
          this.metrics.errorStats.unknownErrors++;
      }
      this.metrics.errorStats.totalErrors++;
    });
  }

  private estimateBatteryImpact(result: SyncResult): number {
    const baseImpact = (result.duration / 1000) * 0.1;
    const dataImpact =
      (result.syncedItems.uploaded + result.syncedItems.downloaded) * 0.001;
    return Math.min(baseImpact + dataImpact, 5);
  }

  private estimateMemoryUsage(result: SyncResult): number {
    const baseUsage = 10;
    const dataUsage =
      (result.syncedItems.uploaded + result.syncedItems.downloaded) * 0.1;
    return baseUsage + dataUsage;
  }

  private estimateCpuUsage(result: SyncResult): number {
    const baseUsage = 5;
    const complexityUsage = result.syncedItems.conflicts * 2;
    return Math.min(baseUsage + complexityUsage, 50);
  }

  private notifyMetricsCallbacks(metrics: SyncMetrics): void {
    this.metricsCallbacks.forEach((callback) => {
      try {
        callback(metrics);
      } catch (error) {
        console.error("Error in metrics callback:", error);
      }
    });
  }
}
