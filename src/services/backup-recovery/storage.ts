import AsyncStorage from "@react-native-async-storage/async-storage";
import { enhancedLocalStorage } from "../localStorage";
import { supabase } from "../supabase";
import { BackupData, BackupMetadata } from "./types";
import { encryptData, decryptData } from "./encryption";
import { compressData, decompressData } from "./compression";
import { calculateChecksum } from "./utils";

export async function storeBackup(
  backupData: BackupData,
  enableCloudBackup: boolean,
): Promise<void> {
  const backupKey = `backup_${backupData.metadata.id}`;

  await enhancedLocalStorage.storeData(backupKey, backupData);

  if (enableCloudBackup) {
    await storeCloudBackup(backupData);
  }
}

export async function loadBackup(
  backupId: string,
  enableCloudBackup: boolean,
): Promise<BackupData | null> {
  try {
    const backupKey = `backup_${backupId}`;
    const backup = await enhancedLocalStorage.getData<BackupData>(backupKey);

    if (backup) {
      return await processLoadedBackup(backup);
    }

    if (enableCloudBackup) {
      return await loadCloudBackup(backupId);
    }

    return null;
  } catch (error) {
    console.error(`Failed to load backup ${backupId}:`, error);
    return null;
  }
}

export async function deleteBackup(
  backupId: string,
  enableCloudBackup: boolean,
): Promise<void> {
  await enhancedLocalStorage.removeData(`backup_${backupId}`);

  if (enableCloudBackup) {
    await deleteCloudBackup(backupId);
  }
}

export async function getLocalBackups(): Promise<BackupMetadata[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const backupKeys = allKeys.filter((key) => key.startsWith("backup_"));

    const metadataList: BackupMetadata[] = [];

    for (const key of backupKeys) {
      try {
        const data = await enhancedLocalStorage.getData<BackupData>(key);
        if (data?.metadata) {
          metadataList.push({
            ...data.metadata,
            location: "local",
            createdAt: new Date(data.metadata.createdAt),
          });
        }
      } catch {
        continue;
      }
    }

    return metadataList;
  } catch (error) {
    console.error("Failed to get local backups:", error);
    return [];
  }
}

export async function getCloudBackups(): Promise<BackupMetadata[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { data: files, error } = await supabase.storage
      .from("user-backups")
      .list(`backups/${user.id}`, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error || !files) {
      console.error("Failed to list cloud backups:", error);
      return [];
    }

    const metadataList: BackupMetadata[] = files
      .filter((file) => file.name.endsWith(".json"))
      .map((file) => ({
        id: file.name.replace(".json", ""),
        type: "full" as const,
        location: "cloud" as const,
        createdAt: new Date(file.created_at || Date.now()),
        size: file.metadata?.size || 0,
        checksum: "",
        version: "1.0",
        deviceId: "",
        userId: user.id,
        description: `Cloud backup from ${new Date(file.created_at || Date.now()).toLocaleDateString()}`,
        dataTypes: [],
        isEncrypted: true,
        isCompressed: true,
      }));

    return metadataList;
  } catch (error) {
    console.error("Failed to get cloud backups:", error);
    return [];
  }
}

async function storeCloudBackup(backupData: BackupData): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const serializedData = JSON.stringify(backupData);
    const blob = new Blob([serializedData], { type: "application/json" });

    const filePath = `backups/${user.id}/${backupData.metadata.id}.json`;
    const { error } = await supabase.storage
      .from("user-backups")
      .upload(filePath, blob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      console.error("Failed to upload backup to cloud:", error);
    } else {
    }
  } catch (error) {
    console.error("Cloud backup storage error:", error);
  }
}

async function loadCloudBackup(backupId: string): Promise<BackupData | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const filePath = `backups/${user.id}/${backupId}.json`;
    const { data, error } = await supabase.storage
      .from("user-backups")
      .download(filePath);

    if (error || !data) {
      console.error("Failed to download backup from cloud:", error);
      return null;
    }

    const text = await data.text();
    const backupData = JSON.parse(text) as BackupData;

    return await processLoadedBackup(backupData);
  } catch (error) {
    console.error("Cloud backup load error:", error);
    return null;
  }
}

async function deleteCloudBackup(backupId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const filePath = `backups/${user.id}/${backupId}.json`;
    const { error } = await supabase.storage
      .from("user-backups")
      .remove([filePath]);

    if (error) {
      console.error("Failed to delete cloud backup:", error);
    }
  } catch (error) {
    console.error("Cloud backup deletion error:", error);
  }
}

async function processLoadedBackup(backup: BackupData): Promise<BackupData> {
  try {
    let dataStr = JSON.stringify(backup.data);

    if (backup.metadata.isEncrypted) {
      dataStr = await decryptData(dataStr);
    }

    if (backup.metadata.isCompressed) {
      dataStr = await decompressData(dataStr);
    }

    const calculatedChecksum = await calculateChecksum(dataStr);
    if (
      backup.metadata.checksum &&
      calculatedChecksum !== backup.metadata.checksum
    ) {
    }

    return {
      ...backup,
      data: JSON.parse(dataStr),
    };
  } catch (error) {
    console.error("Failed to process loaded backup:", error);
    return backup;
  }
}
