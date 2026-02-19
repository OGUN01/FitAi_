import { migrationManager } from "../migrationManager";
import { realTimeSyncService } from "../syncService";
import { syncMonitoringService } from "../syncMonitoring";
import { intelligentSyncScheduler } from "../intelligentSyncScheduler";
import { backupRecoveryService } from "../backupRecoveryService";
import { IntegrationStatus, ServiceType, ServiceStatus } from "./types";

export class ServiceManager {
  private updateStatusCallback?: (updates: Partial<IntegrationStatus>) => void;
  private updateServiceStatusCallback?: (
    service: ServiceType,
    status: ServiceStatus,
  ) => void;
  private logCallback?: (message: string, ...args: any[]) => void;

  setCallbacks(
    updateStatus: (updates: Partial<IntegrationStatus>) => void,
    updateServiceStatus: (service: ServiceType, status: ServiceStatus) => void,
    log: (message: string, ...args: any[]) => void,
  ): void {
    this.updateStatusCallback = updateStatus;
    this.updateServiceStatusCallback = updateServiceStatus;
    this.logCallback = log;
  }

  async initialize(): Promise<void> {
    try {
      await migrationManager.checkMigrationStatus();
      this.updateServiceStatus("migration", "active");
      this.log("All Track B services initialized");
    } catch (error) {
      this.log("Failed to initialize services:", error);
      throw error;
    }
  }

  async startSyncServices(): Promise<void> {
    try {
      this.log("Starting sync services...");

      await realTimeSyncService.initialize();
      this.updateServiceStatus("sync", "active");

      await syncMonitoringService.startMonitoring();
      this.updateServiceStatus("monitoring", "active");

      await intelligentSyncScheduler.start();
      this.updateServiceStatus("scheduler", "active");

      this.updateStatus({ syncActive: true });

      this.log("Sync services started successfully");
    } catch (error) {
      this.log("Failed to start sync services:", error);
      this.updateServiceStatus("sync", "error");
      throw error;
    }
  }

  async startBackupServices(): Promise<void> {
    try {
      this.log("Starting backup services...");

      await backupRecoveryService.initialize();
      this.updateServiceStatus("backup", "active");
      this.updateStatus({ backupActive: true });

      await backupRecoveryService.createBackup(
        "full",
        "Initial backup after authentication",
      );

      this.log("Backup services started successfully");
    } catch (error) {
      this.log("Failed to start backup services:", error);
      this.updateServiceStatus("backup", "error");
      throw error;
    }
  }

  async stopAllServices(): Promise<void> {
    await realTimeSyncService.stop();
    await syncMonitoringService.stopMonitoring();
    await intelligentSyncScheduler.stop();
    await backupRecoveryService.stop();

    this.updateStatus({
      syncActive: false,
      backupActive: false,
      services: {
        migration: "inactive",
        sync: "inactive",
        backup: "inactive",
        monitoring: "inactive",
        scheduler: "inactive",
      },
    });
  }

  async getServiceHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    try {
      health.migration = {
        status: "active",
        lastMigration: migrationManager.getCurrentResult(),
      };

      health.sync = {
        status: "active",
        syncStatus: realTimeSyncService.getSyncStatus(),
        metrics: syncMonitoringService.getMetrics(),
      };

      health.backup = {
        status: "active",
        backupStatus: backupRecoveryService.getStatus(),
      };

      health.scheduler = {
        status: "active",
        stats: intelligentSyncScheduler.getStats(),
      };
    } catch (error) {
      this.log("Failed to get service health:", error);
    }

    return health;
  }

  private updateStatus(updates: Partial<IntegrationStatus>): void {
    this.updateStatusCallback?.(updates);
  }

  private updateServiceStatus(
    service: ServiceType,
    status: ServiceStatus,
  ): void {
    this.updateServiceStatusCallback?.(service, status);
  }

  private log(message: string, ...args: any[]): void {
    this.logCallback?.(message, ...args);
  }
}
