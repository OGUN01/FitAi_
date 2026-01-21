/**
 * SyncCoordinator - Central Synchronization Coordinator
 *
 * Manages synchronization between local state (Zustand) and remote database (Supabase)
 * with timestamp-based conflict resolution and cache invalidation.
 *
 * Architecture:
 * - Single source of truth: Database
 * - Local cache: Zustand stores
 * - Sync strategy: Database-first writes, cache invalidation on reads
 * - Conflict resolution: Last-write-wins with timestamp comparison
 */

import { supabase } from "../supabase";
import { offlineService } from "../offline";
import {
  keysToSnakeCase,
  keysToCamelCase,
} from "../../utils/transformers/fieldNameTransformers";

export interface SyncMetadata {
  lastSyncedAt?: string;
  lastModifiedAt: string;
  syncVersion: number;
  deviceId: string;
}

export interface SyncableEntity {
  id: string;
  userId?: string;
  syncMetadata?: SyncMetadata;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: ConflictRecord[];
  errors: string[];
}

export interface ConflictRecord {
  entityId: string;
  localTimestamp: string;
  remoteTimestamp: string;
  resolution: "local" | "remote" | "merged";
  resolvedAt: string;
}

export interface CacheInvalidationStrategy {
  invalidateOnWrite: boolean;
  invalidateOnRead: boolean;
  ttl: number; // Time to live in milliseconds
}

class SyncCoordinator {
  private static instance: SyncCoordinator;
  private syncInProgress: Map<string, boolean> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  // Default cache strategy
  private defaultCacheStrategy: CacheInvalidationStrategy = {
    invalidateOnWrite: true,
    invalidateOnRead: false,
    ttl: 5 * 60 * 1000, // 5 minutes
  };

  private constructor() {}

  static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  /**
   * Sync a single entity to database (database-first write)
   *
   * Flow:
   * 1. Write to database FIRST
   * 2. On success, update local cache
   * 3. On failure, queue for offline sync
   *
   * @param table - Database table name
   * @param entity - Entity to sync
   * @param updateCache - Callback to update local cache
   * @returns Success status
   */
  async syncToDatabase<T extends SyncableEntity>(
    table: string,
    entity: T,
    updateCache: (entity: T) => void,
  ): Promise<{ success: boolean; error?: string }> {
    const syncKey = `${table}_${entity.id}`;

    // Prevent concurrent syncs of same entity
    if (this.syncInProgress.get(syncKey)) {
      return { success: false, error: "Sync already in progress" };
    }

    this.syncInProgress.set(syncKey, true);

    try {
      // Add sync metadata
      const entityWithMetadata: T = {
        ...entity,
        syncMetadata: {
          ...entity.syncMetadata,
          lastModifiedAt: new Date().toISOString(),
          syncVersion: (entity.syncMetadata?.syncVersion || 0) + 1,
          deviceId: entity.syncMetadata?.deviceId || "default-device",
        },
      };

      // Transform to snake_case for database
      const dbEntity = keysToSnakeCase(entityWithMetadata);

      // Step 1: Write to database FIRST
      const { data, error } = await supabase
        .from(table)
        .upsert(dbEntity, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        console.error(`❌ Database write failed for ${table}:`, error);

        // Step 3: Queue for offline sync if network error
        if (this.isNetworkError(error)) {
          await offlineService.queueAction({
            type: "UPDATE",
            table,
            data: dbEntity,
            userId: entity.userId || "guest",
            maxRetries: 3,
          });
          console.log(`📥 Queued ${table} update for offline sync`);
        }

        return { success: false, error: error.message };
      }

      // Step 2: Update local cache on success
      const camelCasedData = keysToCamelCase(data) as T;
      updateCache(camelCasedData);

      // Invalidate cache timestamp
      this.invalidateCache(syncKey);

      console.log(`✅ Synced ${table} to database successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Sync failed for ${table}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * Sync from database to local cache (database-first read)
   *
   * Flow:
   * 1. Check cache validity
   * 2. If stale, fetch from database
   * 3. Resolve conflicts if local changes exist
   * 4. Update cache with resolved data
   *
   * @param table - Database table name
   * @param entityId - Entity ID to fetch
   * @param getLocalEntity - Function to get local entity
   * @param updateCache - Callback to update local cache
   * @returns Entity data or null
   */
  async syncFromDatabase<T extends SyncableEntity>(
    table: string,
    entityId: string,
    getLocalEntity: () => T | null,
    updateCache: (entity: T) => void,
    strategy: Partial<CacheInvalidationStrategy> = {},
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const cacheStrategy = { ...this.defaultCacheStrategy, ...strategy };
    const cacheKey = `${table}_${entityId}`;

    // Step 1: Check cache validity
    if (
      !cacheStrategy.invalidateOnRead &&
      this.isCacheValid(cacheKey, cacheStrategy.ttl)
    ) {
      const localEntity = getLocalEntity();
      if (localEntity) {
        console.log(`📦 Using cached ${table} data`);
        return { success: true, data: localEntity };
      }
    }

    try {
      // Step 2: Fetch from database
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", entityId)
        .single();

      if (error) {
        console.error(`❌ Database read failed for ${table}:`, error);

        // Fallback to local cache on network error
        if (this.isNetworkError(error)) {
          const localEntity = getLocalEntity();
          if (localEntity) {
            console.log(`📦 Using local cache due to network error`);
            return { success: true, data: localEntity };
          }
        }

        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: "Entity not found" };
      }

      // Transform from snake_case
      const camelCasedData = keysToCamelCase(data) as T;

      // Step 3: Check for conflicts
      const localEntity = getLocalEntity();
      if (localEntity && localEntity.syncMetadata) {
        const resolvedEntity = this.resolveConflict(
          localEntity,
          camelCasedData,
        );

        // Step 4: Update cache with resolved data
        updateCache(resolvedEntity);
        this.updateCacheTimestamp(cacheKey);

        return { success: true, data: resolvedEntity };
      }

      // No conflict - just update cache
      updateCache(camelCasedData);
      this.updateCacheTimestamp(cacheKey);

      console.log(`✅ Synced ${table} from database successfully`);
      return { success: true, data: camelCasedData };
    } catch (error) {
      console.error(`❌ Sync from database failed for ${table}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Resolve conflicts between local and remote entities
   * Strategy: Last-write-wins based on lastModifiedAt timestamp
   */
  private resolveConflict<T extends SyncableEntity>(
    localEntity: T,
    remoteEntity: T,
  ): T {
    const localTimestamp = localEntity.syncMetadata?.lastModifiedAt;
    const remoteTimestamp = remoteEntity.syncMetadata?.lastModifiedAt;

    if (!localTimestamp || !remoteTimestamp) {
      // If no timestamps, prefer remote (database is source of truth)
      console.log("⚠️ Missing timestamps, using remote entity");
      return remoteEntity;
    }

    const localDate = new Date(localTimestamp);
    const remoteDate = new Date(remoteTimestamp);

    if (localDate > remoteDate) {
      console.log("🔄 Local entity is newer, keeping local");
      return localEntity;
    } else if (remoteDate > localDate) {
      console.log("🔄 Remote entity is newer, using remote");
      return remoteEntity;
    } else {
      // Timestamps are equal - prefer remote for consistency
      console.log("🔄 Timestamps equal, using remote entity");
      return remoteEntity;
    }
  }

  /**
   * Batch sync multiple entities
   */
  async batchSyncToDatabase<T extends SyncableEntity>(
    table: string,
    entities: T[],
    updateCache: (entities: T[]) => void,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflicts: [],
      errors: [],
    };

    for (const entity of entities) {
      const syncResult = await this.syncToDatabase(table, entity, (synced) => {
        // Individual cache updates will be batched
      });

      if (syncResult.success) {
        result.syncedCount++;
      } else {
        result.failedCount++;
        result.errors.push(`${entity.id}: ${syncResult.error}`);
      }
    }

    // Batch update cache at the end
    if (result.syncedCount > 0) {
      updateCache(entities);
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Cache management
   */
  private isCacheValid(cacheKey: string, ttl: number): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;

    return Date.now() - timestamp < ttl;
  }

  private updateCacheTimestamp(cacheKey: string): void {
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  private invalidateCache(cacheKey: string): void {
    this.cacheTimestamps.delete(cacheKey);
  }

  /**
   * Clear all cache timestamps
   */
  clearAllCaches(): void {
    this.cacheTimestamps.clear();
    console.log("🧹 All caches cleared");
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    const networkErrorCodes = [
      "PGRST301",
      "PGRST302",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ];
    return (
      networkErrorCodes.some((code) => error.message?.includes(code)) ||
      error.message?.toLowerCase().includes("network")
    );
  }

  /**
   * Get sync status for debugging
   */
  getSyncStatus(): {
    activeSyncs: string[];
    cacheSize: number;
    oldestCache: string | null;
  } {
    const activeSyncs: string[] = [];
    for (const [key, inProgress] of this.syncInProgress.entries()) {
      if (inProgress) activeSyncs.push(key);
    }

    let oldestCache: string | null = null;
    let oldestTimestamp = Infinity;
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestCache = key;
      }
    }

    return {
      activeSyncs,
      cacheSize: this.cacheTimestamps.size,
      oldestCache,
    };
  }
}

export const syncCoordinator = SyncCoordinator.getInstance();
export default syncCoordinator;
