import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  SyncStatus,
  SyncResult,
  SyncOperation,
  DeltaSyncInfo,
} from "./types";
import { SYNC_STATUS_KEY, SYNC_QUEUE_KEY, DELTA_SYNC_KEY } from "./constants";

export async function loadSyncStatus(
  currentStatus: SyncStatus,
): Promise<Partial<SyncStatus>> {
  try {
    const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        lastSyncTime: parsed.lastSyncTime
          ? new Date(parsed.lastSyncTime)
          : null,
        lastSyncResult: parsed.lastSyncResult
          ? {
              ...parsed.lastSyncResult,
              startTime: new Date(parsed.lastSyncResult.startTime),
              endTime: new Date(parsed.lastSyncResult.endTime),
              nextSyncTime: new Date(parsed.lastSyncResult.nextSyncTime),
            }
          : null,
        nextSyncTime: parsed.nextSyncTime
          ? new Date(parsed.nextSyncTime)
          : null,
      };
    }
  } catch (error) {
    console.error("Failed to load sync status:", error);
  }
  return {};
}

export async function saveSyncStatus(status: SyncStatus): Promise<void> {
  try {
    const toStore = {
      lastSyncTime: status.lastSyncTime?.toISOString() || null,
      lastSyncResult: status.lastSyncResult
        ? {
            ...status.lastSyncResult,
            startTime: status.lastSyncResult.startTime.toISOString(),
            endTime: status.lastSyncResult.endTime.toISOString(),
            nextSyncTime: status.lastSyncResult.nextSyncTime.toISOString(),
          }
        : null,
      nextSyncTime: status.nextSyncTime?.toISOString() || null,
    };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(toStore));
    console.log("✅ Saved sync status to storage");
  } catch (error) {
    console.error("Failed to save sync status:", error);
  }
}

export async function loadSyncQueue(): Promise<SyncOperation[]> {
  try {
    const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const queue = parsed.map((op: any) => ({
        ...op,
        timestamp: new Date(op.timestamp),
      }));
      console.log(`✅ Loaded ${queue.length} queued operations`);
      return queue;
    }
  } catch (error) {
    console.error("Failed to load sync queue:", error);
  }
  return [];
}

export async function saveSyncQueue(queue: SyncOperation[]): Promise<void> {
  try {
    const toStore = queue.map((op) => ({
      ...op,
      timestamp: op.timestamp.toISOString(),
    }));
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error("Failed to save sync queue:", error);
  }
}

export async function loadDeltaSyncInfo(): Promise<DeltaSyncInfo> {
  try {
    const stored = await AsyncStorage.getItem(DELTA_SYNC_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        lastSyncTimestamp: new Date(parsed.lastSyncTimestamp),
        syncVersion: parsed.syncVersion || 1,
        checksums: parsed.checksums || {},
      };
    }
  } catch (error) {
    console.error("Failed to load delta sync info:", error);
  }

  return {
    lastSyncTimestamp: new Date(0),
    syncVersion: 1,
    checksums: {},
  };
}

export async function saveDeltaSyncInfo(
  deltaInfo: DeltaSyncInfo,
): Promise<void> {
  try {
    const toStore = {
      lastSyncTimestamp: new Date().toISOString(),
      syncVersion: deltaInfo.syncVersion + 1,
      checksums: deltaInfo.checksums,
    };
    await AsyncStorage.setItem(DELTA_SYNC_KEY, JSON.stringify(toStore));
    console.log("✅ Updated delta sync info");
  } catch (error) {
    console.error("Failed to update delta sync info:", error);
  }
}
