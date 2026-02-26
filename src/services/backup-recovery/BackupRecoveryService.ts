import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BackupConfig,
  BackupStatus,
  BackupResult,
  BackupMetadata,
  RecoveryOptions,
  RecoveryResult,
} from "./types";
import {
  createBackup,
  updateAvailableBackups,
  cleanupOldBackups,
} from "./backup-operations";
import { recoverFromBackup } from "./recovery-operations";
import { deleteBackup } from "./storage";

export class BackupRecoveryService {
  private config: BackupConfig;
  private status: BackupStatus;
  private backupTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private statusCallbacks: ((status: BackupStatus) => void)[] = [];
  private resultCallbacks: ((result: BackupResult) => void)[] = [];
  private appStateSubscription: { remove: () => void } | null = null;

  constructor(config?: Partial<BackupConfig>) {
    this.config = {
      enableAutoBackup: true,
      backupIntervalMs: 3600000,
      maxLocalBackups: 10,
      maxCloudBackups: 30,
      enableCloudBackup: true,
      enableIncrementalBackup: true,
      compressionEnabled: true,
      encryptionEnabled: true,
      backupRetentionDays: 30,
      ...config,
    };

    this.status = {
      isBackingUp: false,
      lastBackupTime: null,
      lastBackupResult: null,
      nextBackupTime: null,
      availableBackups: [],
      totalBackupSize: 0,
      backupHealth: "good",
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadBackupStatus();
      await this.refreshAvailableBackups();

      if (this.config.enableAutoBackup) {
        this.startAutoBackup();
      }

      await cleanupOldBackups(
        this.config,
        this.status.availableBackups,
        (backupId) => this.deleteBackup(backupId),
      );

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize backup service:", error);
      throw error;
    }
  }

  async createBackup(
    type: "full" | "incremental" = "full",
    description = "",
  ): Promise<BackupResult> {
    if (this.status.isBackingUp) {
      throw new Error("Backup is already in progress");
    }

    const result = await createBackup(
      type,
      description,
      this.config,
      (updates) => this.updateStatus(updates),
    );

    await this.refreshAvailableBackups();
    this.notifyResultCallbacks(result);

    return result;
  }

  async recoverFromBackup(options: RecoveryOptions): Promise<RecoveryResult> {
    return await recoverFromBackup(
      options,
      this.config.enableCloudBackup,
      (type, description) => this.createBackup(type, description),
    );
  }

  async listBackups(location?: "local" | "cloud"): Promise<BackupMetadata[]> {
    await this.refreshAvailableBackups();

    if (location) {
      return this.status.availableBackups.filter(
        (backup) => backup.location === location || backup.location === "both",
      );
    }

    return this.status.availableBackups;
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      await deleteBackup(backupId, this.config.enableCloudBackup);
      await this.refreshAvailableBackups();
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      throw error;
    }
  }

  getStatus(): BackupStatus {
    return { ...this.status };
  }

  updateConfig(newConfig: Partial<BackupConfig>): void {
    const needsTimerRestart =
      newConfig.backupIntervalMs !== undefined &&
      newConfig.backupIntervalMs !== this.config.backupIntervalMs &&
      this.config.enableAutoBackup;

    this.config = { ...this.config, ...newConfig };

    if (newConfig.enableAutoBackup !== undefined) {
      if (newConfig.enableAutoBackup) {
        this.startAutoBackup();
      } else {
        this.stopAutoBackup();
      }
    } else if (needsTimerRestart) {
      this.startAutoBackup();
    }
  }

  async stop(): Promise<void> {
    this.stopAutoBackup();
    await this.saveBackupStatus();
    this.isInitialized = false;
  }

  onStatusChange(callback: (status: BackupStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  onBackupResult(callback: (result: BackupResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  destroy(): void {
    this.stopAutoBackup();
  }

  private startAutoBackup(): void {
    this.stopAutoBackup();

    this.backupTimer = setInterval(async () => {
      try {
        const type = this.config.enableIncrementalBackup
          ? "incremental"
          : "full";
        await this.createBackup(type, "Automatic backup");
      } catch (error) {
        console.error("Auto backup failed:", error);
      }
    }, this.config.backupIntervalMs);

    this.updateStatus({
      nextBackupTime: new Date(Date.now() + this.config.backupIntervalMs),
    });
  }

  private stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  private async refreshAvailableBackups(): Promise<void> {
    const updates = await updateAvailableBackups(this.config);
    this.updateStatus(updates);
  }

  private updateStatus(updates: Partial<BackupStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatusCallbacks(this.status);
  }

  private notifyStatusCallbacks(status: BackupStatus): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("Error in status callback:", error);
      }
    });
  }

  private notifyResultCallbacks(result: BackupResult): void {
    this.resultCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Error in result callback:", error);
      }
    });
  }

  private async loadBackupStatus(): Promise<void> {
    try {
      const statusJson = await AsyncStorage.getItem("@fitai_backup_status");
      if (statusJson) {
        const savedStatus = JSON.parse(statusJson);
        this.status = {
          ...this.status,
          lastBackupTime: savedStatus.lastBackupTime
            ? new Date(savedStatus.lastBackupTime)
            : null,
          lastBackupResult: savedStatus.lastBackupResult,
        };
      }
    } catch (error) {
      console.error("Failed to load backup status:", error);
    }
  }

  private async saveBackupStatus(): Promise<void> {
    try {
      const statusToSave = {
        lastBackupTime: this.status.lastBackupTime?.toISOString(),
        lastBackupResult: this.status.lastBackupResult,
      };
      await AsyncStorage.setItem(
        "@fitai_backup_status",
        JSON.stringify(statusToSave),
      );
    } catch (error) {
      console.error("Failed to save backup status:", error);
    }
  }
}
