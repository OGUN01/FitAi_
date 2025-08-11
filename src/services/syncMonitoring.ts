// Sync Status Monitoring Service for Track B Infrastructure
// Provides comprehensive monitoring of sync operations, connection status, and performance metrics

import { realTimeSyncService, SyncStatus, SyncResult } from './syncService';
import { enhancedLocalStorage } from './localStorage';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
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
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
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

// ============================================================================
// SYNC MONITORING SERVICE
// ============================================================================

export class SyncMonitoringService {
  private metrics: SyncMetrics;
  private performanceHistory: SyncPerformance[] = [];
  private connectionHistory: ConnectionHealth[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsCallbacks: ((metrics: SyncMetrics) => void)[] = [];
  private healthCallbacks: ((health: ConnectionHealth) => void)[] = [];

  constructor() {
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      totalDataSynced: 0,
      lastSyncPerformance: {
        syncId: '',
        duration: 0,
        throughput: 0,
        networkLatency: 0,
        batteryImpact: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      networkStats: {
        connectionType: 'unknown',
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

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start monitoring sync operations
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Load historical metrics
      await this.loadMetrics();

      // Subscribe to sync service events
      realTimeSyncService.onStatusChange(this.handleStatusChange.bind(this));
      realTimeSyncService.onSyncResult(this.handleSyncResult.bind(this));

      // Start periodic monitoring
      this.monitoringInterval = setInterval(() => {
        this.updateNetworkStats();
        this.updateConnectionHealth();
        this.cleanupHistory();
      }, 10000); // Every 10 seconds

      this.isMonitoring = true;
      console.log('Sync monitoring started');
    } catch (error) {
      console.error('Failed to start sync monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.saveMetrics();
    this.isMonitoring = false;
    console.log('Sync monitoring stopped');
  }

  /**
   * Get current sync metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection health assessment
   */
  getConnectionHealth(): ConnectionHealth {
    const latency = this.metrics.networkStats.latency;
    const bandwidth = this.metrics.networkStats.bandwidth;
    const signalStrength = this.metrics.networkStats.signalStrength;

    // Calculate stability based on recent connection history
    const recentHistory = this.connectionHistory.slice(-10);
    const stability =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, h) => sum + h.score, 0) / recentHistory.length
        : 50;

    const factors = {
      latency: this.scoreLatency(latency),
      bandwidth: this.scoreBandwidth(bandwidth),
      stability,
      signalStrength,
    };

    const score =
      (factors.latency + factors.bandwidth + factors.stability + factors.signalStrength) / 4;
    const status = this.getHealthStatus(score);
    const recommendations = this.generateRecommendations(factors);

    const health: ConnectionHealth = {
      status,
      score,
      factors,
      recommendations,
    };

    // Store in history
    this.connectionHistory.push(health);
    this.notifyHealthCallbacks(health);

    return health;
  }

  /**
   * Get sync queue information
   */
  getSyncQueueInfo(): SyncQueueInfo {
    const syncStatus = realTimeSyncService.getSyncStatus();

    // This would be implemented with actual queue data
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

  /**
   * Get performance history
   */
  getPerformanceHistory(limit = 50): SyncPerformance[] {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Get connection history
   */
  getConnectionHistory(limit = 50): ConnectionHealth[] {
    return this.connectionHistory.slice(-limit);
  }

  /**
   * Reset metrics
   */
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
    this.connectionHistory = [];
    await this.saveMetrics();
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: (metrics: SyncMetrics) => void): () => void {
    this.metricsCallbacks.push(callback);
    return () => {
      const index = this.metricsCallbacks.indexOf(callback);
      if (index > -1) {
        this.metricsCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to connection health updates
   */
  onHealthUpdate(callback: (health: ConnectionHealth) => void): () => void {
    this.healthCallbacks.push(callback);
    return () => {
      const index = this.healthCallbacks.indexOf(callback);
      if (index > -1) {
        this.healthCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private handleStatusChange(status: SyncStatus): void {
    // Update network stats based on status
    this.metrics.networkStats.signalStrength = this.getSignalStrength(status.connectionQuality);
  }

  private handleSyncResult(result: SyncResult): void {
    // Update metrics based on sync result
    this.metrics.totalSyncs++;

    if (result.success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
      this.updateErrorStats(result.errors);
    }

    // Update average duration
    this.metrics.averageSyncDuration =
      (this.metrics.averageSyncDuration * (this.metrics.totalSyncs - 1) + result.duration) /
      this.metrics.totalSyncs;

    // Update data synced
    this.metrics.totalDataSynced += result.syncedItems.uploaded + result.syncedItems.downloaded;

    // Create performance record
    const performance: SyncPerformance = {
      syncId: result.syncId,
      duration: result.duration,
      throughput:
        (result.syncedItems.uploaded + result.syncedItems.downloaded) / (result.duration / 1000),
      networkLatency: this.metrics.networkStats.latency,
      batteryImpact: this.estimateBatteryImpact(result),
      memoryUsage: this.estimateMemoryUsage(result),
      cpuUsage: this.estimateCpuUsage(result),
    };

    this.metrics.lastSyncPerformance = performance;
    this.performanceHistory.push(performance);

    // Update error rate
    this.metrics.errorStats.errorRate = (this.metrics.failedSyncs / this.metrics.totalSyncs) * 100;

    this.notifyMetricsCallbacks(this.metrics);
  }

  private updateErrorStats(errors: any[]): void {
    errors.forEach((error) => {
      switch (error.type) {
        case 'network':
          this.metrics.errorStats.networkErrors++;
          break;
        case 'validation':
          this.metrics.errorStats.validationErrors++;
          break;
        case 'conflict':
          this.metrics.errorStats.conflictErrors++;
          break;
        case 'permission':
          this.metrics.errorStats.permissionErrors++;
          break;
        case 'quota':
          this.metrics.errorStats.quotaErrors++;
          break;
        default:
          this.metrics.errorStats.unknownErrors++;
      }
      this.metrics.errorStats.totalErrors++;
    });
  }

  private updateNetworkStats(): void {
    // Simulate network stats update
    // In real implementation, this would use actual network monitoring APIs
    this.metrics.networkStats = {
      connectionType: 'wifi',
      signalStrength: 80 + Math.random() * 20,
      bandwidth: 50 + Math.random() * 50,
      latency: 20 + Math.random() * 30,
      dataUsage: {
        uploaded: this.metrics.networkStats.dataUsage.uploaded + Math.random() * 1000,
        downloaded: this.metrics.networkStats.dataUsage.downloaded + Math.random() * 2000,
        total: this.metrics.networkStats.dataUsage.total + Math.random() * 3000,
      },
    };
  }

  private updateConnectionHealth(): void {
    this.getConnectionHealth(); // This will update and store the health
  }

  private cleanupHistory(): void {
    // Keep only last 100 performance records
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }

    // Keep only last 100 connection health records
    if (this.connectionHistory.length > 100) {
      this.connectionHistory = this.connectionHistory.slice(-100);
    }
  }

  private scoreLatency(latency: number): number {
    if (latency < 50) return 100;
    if (latency < 100) return 80;
    if (latency < 200) return 60;
    if (latency < 500) return 40;
    return 20;
  }

  private scoreBandwidth(bandwidth: number): number {
    if (bandwidth > 50) return 100;
    if (bandwidth > 25) return 80;
    if (bandwidth > 10) return 60;
    if (bandwidth > 5) return 40;
    return 20;
  }

  private getHealthStatus(score: number): ConnectionHealth['status'] {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'offline';
  }

  private generateRecommendations(factors: ConnectionHealth['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.latency < 50) {
      recommendations.push('High latency detected. Consider switching to a faster network.');
    }

    if (factors.bandwidth < 50) {
      recommendations.push('Low bandwidth detected. Sync may be slower than usual.');
    }

    if (factors.stability < 70) {
      recommendations.push('Unstable connection detected. Consider enabling background sync.');
    }

    if (factors.signalStrength < 50) {
      recommendations.push('Weak signal strength. Move closer to your router or cell tower.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Connection is optimal for syncing.');
    }

    return recommendations;
  }

  private getSignalStrength(quality: string): number {
    switch (quality) {
      case 'excellent':
        return 100;
      case 'good':
        return 80;
      case 'poor':
        return 40;
      case 'offline':
        return 0;
      default:
        return 60;
    }
  }

  private estimateBatteryImpact(result: SyncResult): number {
    // Estimate battery impact based on sync duration and data transferred
    const baseImpact = (result.duration / 1000) * 0.1; // 0.1% per second
    const dataImpact = (result.syncedItems.uploaded + result.syncedItems.downloaded) * 0.001; // 0.001% per item
    return Math.min(baseImpact + dataImpact, 5); // Cap at 5%
  }

  private estimateMemoryUsage(result: SyncResult): number {
    // Estimate memory usage based on data transferred
    const baseUsage = 10; // 10MB base
    const dataUsage = (result.syncedItems.uploaded + result.syncedItems.downloaded) * 0.1; // 0.1MB per item
    return baseUsage + dataUsage;
  }

  private estimateCpuUsage(result: SyncResult): number {
    // Estimate CPU usage based on sync complexity
    const baseUsage = 5; // 5% base
    const complexityUsage = result.syncedItems.conflicts * 2; // 2% per conflict
    return Math.min(baseUsage + complexityUsage, 50); // Cap at 50%
  }

  private notifyMetricsCallbacks(metrics: SyncMetrics): void {
    this.metricsCallbacks.forEach((callback) => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    });
  }

  private notifyHealthCallbacks(health: ConnectionHealth): void {
    this.healthCallbacks.forEach((callback) => {
      try {
        callback(health);
      } catch (error) {
        console.error('Error in health callback:', error);
      }
    });
  }

  private async loadMetrics(): Promise<void> {
    try {
      const savedMetrics = await enhancedLocalStorage.getData<SyncMetrics>('sync_metrics');
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...savedMetrics };
      }

      const savedPerformance = await enhancedLocalStorage.getData<SyncPerformance[]>(
        'sync_performance_history'
      );
      if (savedPerformance) {
        this.performanceHistory = savedPerformance;
      }

      const savedHealth = await enhancedLocalStorage.getData<ConnectionHealth[]>(
        'connection_health_history'
      );
      if (savedHealth) {
        this.connectionHistory = savedHealth;
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await enhancedLocalStorage.storeData('sync_metrics', this.metrics);
      await enhancedLocalStorage.storeData('sync_performance_history', this.performanceHistory);
      await enhancedLocalStorage.storeData('connection_health_history', this.connectionHistory);
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const syncMonitoringService = new SyncMonitoringService();
export default syncMonitoringService;
