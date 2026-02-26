import { dataBridge } from "../DataBridge";
import {
  BackupConfig,
  BackupData,
  BackupMetadata,
  BackupResult,
  BackupStatus,
} from "./types";
import {
  generateBackupId,
  getDeviceId,
  getDataTypes,
  getIncrementalChanges,
  calculateChecksum,
  generateErrorId,
  calculateNextBackupTime,
} from "./utils";
import { encryptData } from "./encryption";
import { compressData } from "./compression";
import { storeBackup, getLocalBackups, getCloudBackups } from "./storage";

export async function createBackup(
  type: "full" | "incremental",
  description: string,
  config: BackupConfig,
  updateStatusCallback: (updates: Partial<BackupStatus>) => void,
): Promise<BackupResult> {
  const backupId = generateBackupId();
  const startTime = new Date();

  try {
    updateStatusCallback({ isBackingUp: true });

    const data = await dataBridge.exportAllData();
    if (!data) {
      throw new Error("No data available for backup");
    }

    const metadata: BackupMetadata = {
      id: backupId,
      type,
      location: config.enableCloudBackup ? "both" : "local",
      createdAt: startTime,
      size: 0,
      checksum: "",
      version: data.version,
      deviceId: await getDeviceId(),
      userId: data.user?.profile?.id || "unknown",
      description:
        description || `${type} backup created on ${startTime.toISOString()}`,
      dataTypes: getDataTypes(data),
      isEncrypted: config.encryptionEnabled,
      isCompressed: config.compressionEnabled,
    };

    const backupData: BackupData = {
      metadata,
      data,
      incrementalChanges:
        type === "incremental" ? await getIncrementalChanges() : undefined,
    };

    const processedBackup = await processBackupData(backupData, config);
    await storeBackup(processedBackup, config.enableCloudBackup);

    const endTime = new Date();
    const result: BackupResult = {
      success: true,
      backupId,
      type,
      location: metadata.location,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      size: processedBackup.metadata.size,
      errors: [],
      warnings: [],
    };

    updateStatusCallback({
      isBackingUp: false,
      lastBackupTime: endTime,
      lastBackupResult: result,
      nextBackupTime: calculateNextBackupTime(config.backupIntervalMs),
    });

    return result;
  } catch (error) {
    const endTime = new Date();
    const result: BackupResult = {
      success: false,
      backupId,
      type,
      location: "local",
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      size: 0,
      errors: [
        {
          id: generateErrorId(),
          type: "unknown",
          message: error instanceof Error ? error.message : String(error),
          details: error,
          timestamp: new Date(),
          retryable: true,
        },
      ],
      warnings: [],
    };

    updateStatusCallback({
      isBackingUp: false,
      lastBackupResult: result,
      nextBackupTime: calculateNextBackupTime(config.backupIntervalMs),
    });

    throw error;
  }
}

export async function updateAvailableBackups(config: BackupConfig): Promise<{
  availableBackups: BackupMetadata[];
  totalBackupSize: number;
  backupHealth: BackupStatus["backupHealth"];
}> {
  try {
    const localBackups = await getLocalBackups();
    const cloudBackups = config.enableCloudBackup
      ? await getCloudBackups()
      : [];

    const allBackups = [...localBackups, ...cloudBackups];
    const uniqueBackups = allBackups.reduce((acc, backup) => {
      const existing = acc.find((b) => b.id === backup.id);
      if (!existing) {
        acc.push(backup);
      } else if (
        backup.location === "both" ||
        (existing.location !== "both" && backup.location !== existing.location)
      ) {
        existing.location = "both";
      }
      return acc;
    }, [] as BackupMetadata[]);

    uniqueBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalSize = uniqueBackups.reduce(
      (sum, backup) => sum + backup.size,
      0,
    );
    const health = assessBackupHealth(uniqueBackups);

    return {
      availableBackups: uniqueBackups,
      totalBackupSize: totalSize,
      backupHealth: health,
    };
  } catch (error) {
    console.error("Failed to update available backups:", error);
    return {
      availableBackups: [],
      totalBackupSize: 0,
      backupHealth: "critical",
    };
  }
}

export async function cleanupOldBackups(
  config: BackupConfig,
  currentBackups: BackupMetadata[],
  deleteBackupFn: (backupId: string) => Promise<void>,
): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.backupRetentionDays);

    const sortedBackups = currentBackups.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const backupsToDelete = sortedBackups.slice(config.maxLocalBackups);
    const oldBackups = sortedBackups.filter((b) => b.createdAt < cutoffDate);

    const uniqueIds = new Set<string>();
    const deleteList: BackupMetadata[] = [];
    for (const backup of [...backupsToDelete, ...oldBackups]) {
      if (!uniqueIds.has(backup.id)) {
        uniqueIds.add(backup.id);
        deleteList.push(backup);
      }
    }

    for (const backup of deleteList) {
      try {
        await deleteBackupFn(backup.id);
      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Backup cleanup failed:", error);
  }
}

async function processBackupData(
  backupData: BackupData,
  config: BackupConfig,
): Promise<BackupData> {
  let processedData = JSON.stringify(backupData.data);

  if (config.compressionEnabled) {
    processedData = await compressData(processedData);
  }

  if (config.encryptionEnabled) {
    processedData = await encryptData(processedData);
  }

  backupData.metadata.size = processedData.length * 2;
  backupData.metadata.checksum = await calculateChecksum(processedData);

  return backupData;
}

function assessBackupHealth(
  backups: BackupMetadata[],
): BackupStatus["backupHealth"] {
  if (backups.length === 0) return "critical";

  const now = new Date();
  const latestBackup = backups[0];
  const daysSinceLastBackup =
    (now.getTime() - latestBackup.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastBackup > 7) return "critical";
  if (daysSinceLastBackup > 3) return "warning";
  if (daysSinceLastBackup > 1) return "good";
  return "excellent";
}
