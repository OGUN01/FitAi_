import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

interface CleanupResult {
  cacheEntriesRemoved: number;
  syncQueueEntriesRemoved: number;
  storageKeysRemoved: number;
  errors: string[];
}

interface CleanupConfig {
  maxCacheAge: number; // milliseconds
  maxSyncQueueAge: number; // milliseconds
  storageKeyPrefixes: string[];
}

const DEFAULT_CONFIG: CleanupConfig = {
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
  maxSyncQueueAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  storageKeyPrefixes: ["temp_", "cache_", "draft_"],
};

class OrphanCleanupService {
  private static instance: OrphanCleanupService;
  private config: CleanupConfig;
  private isRunning = false;

  private constructor(config: CleanupConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  static getInstance(): OrphanCleanupService {
    if (!OrphanCleanupService.instance) {
      OrphanCleanupService.instance = new OrphanCleanupService();
    }
    return OrphanCleanupService.instance;
  }

  async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      return {
        cacheEntriesRemoved: 0,
        syncQueueEntriesRemoved: 0,
        storageKeysRemoved: 0,
        errors: ["Cleanup already in progress"],
      };
    }

    this.isRunning = true;
    const result: CleanupResult = {
      cacheEntriesRemoved: 0,
      syncQueueEntriesRemoved: 0,
      storageKeysRemoved: 0,
      errors: [],
    };

    try {
      const [cacheResult, syncResult, storageResult] = await Promise.allSettled(
        [
          this.cleanupStaleCache(),
          this.cleanupSyncQueue(),
          this.cleanupOrphanedStorage(),
        ],
      );

      if (cacheResult.status === "fulfilled") {
        result.cacheEntriesRemoved = cacheResult.value;
      } else {
        result.errors.push(`Cache cleanup failed: ${cacheResult.reason}`);
      }

      if (syncResult.status === "fulfilled") {
        result.syncQueueEntriesRemoved = syncResult.value;
      } else {
        result.errors.push(`Sync queue cleanup failed: ${syncResult.reason}`);
      }

      if (storageResult.status === "fulfilled") {
        result.storageKeysRemoved = storageResult.value;
      } else {
        result.errors.push(`Storage cleanup failed: ${storageResult.reason}`);
      }
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  private async cleanupStaleCache(): Promise<number> {
    let removed = 0;
    const now = Date.now();
    const keys = await AsyncStorage.getAllKeys();

    const cacheKeys = keys.filter((key) => key.startsWith("cache_"));

    for (const key of cacheKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          const timestamp = parsed._cachedAt || parsed.cachedAt || 0;

          if (now - timestamp > this.config.maxCacheAge) {
            await AsyncStorage.removeItem(key);
            removed++;
          }
        }
      } catch {
        await AsyncStorage.removeItem(key);
        removed++;
      }
    }

    return removed;
  }

  private async cleanupSyncQueue(): Promise<number> {
    let removed = 0;

    try {
      const queueData = await AsyncStorage.getItem("sync_queue");
      if (!queueData) return 0;

      const queue = JSON.parse(queueData);
      if (!Array.isArray(queue)) return 0;

      const now = Date.now();
      const validQueue = queue.filter((item: any) => {
        const timestamp = item.timestamp || item.createdAt || 0;
        const age = now - new Date(timestamp).getTime();

        if (age > this.config.maxSyncQueueAge) {
          removed++;
          return false;
        }
        return true;
      });

      if (removed > 0) {
        await AsyncStorage.setItem("sync_queue", JSON.stringify(validQueue));
      }
    } catch (error) {
      console.error("Sync queue cleanup error:", error);
    }

    return removed;
  }

  private async cleanupOrphanedStorage(): Promise<number> {
    let removed = 0;
    const keys = await AsyncStorage.getAllKeys();
    const now = Date.now();

    for (const prefix of this.config.storageKeyPrefixes) {
      const prefixKeys = keys.filter((key) => key.startsWith(prefix));

      for (const key of prefixKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            const timestamp =
              parsed._createdAt || parsed.createdAt || parsed.timestamp || 0;

            if (
              timestamp &&
              now - new Date(timestamp).getTime() > this.config.maxCacheAge
            ) {
              await AsyncStorage.removeItem(key);
              removed++;
            }
          }
        } catch {
          // If we can't parse it, it's likely orphaned
        }
      }
    }

    return removed;
  }

  async cleanupUserData(userId: string): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter((key) => key.includes(userId));

    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
    }
  }
}

export const orphanCleanupService = OrphanCleanupService.getInstance();
export default OrphanCleanupService;
