/**
 * FitAI Workers - Caching Utilities
 *
 * 3-Tier caching system: Client → Cloudflare KV → Supabase Database
 * Provides 60-70% cache hit rate for AI-generated content
 */

import { Env, CachedWorkout, CachedMeal } from './types';
import { getSupabaseClient } from './supabase';

/**
 * Cache types
 */
export type CacheType = 'workout' | 'meal';

/**
 * Cache result with source information
 */
export interface CacheResult<T = any> {
  data: T | null;
  hit: boolean;
  source?: 'kv' | 'database' | 'fresh';
  cacheKey?: string;
}

/**
 * Cache write metadata
 */
export interface CacheMetadata {
  modelUsed: string;
  generationTimeMs: number;
  tokensUsed?: number;
  costUsd?: number;
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * Generate deterministic cache key from request parameters
 * Same parameters = Same key = Cache hit
 */
export function generateCacheKey(type: CacheType, params: Record<string, any>): string {
  // Sort keys alphabetically for consistency
  const sortedKeys = Object.keys(params).sort();

  // Build deterministic string
  const paramString = sortedKeys
    .map((key) => {
      const value = params[key];
      // Handle arrays by sorting and joining
      if (Array.isArray(value)) {
        return `${key}=${value.sort().join(',')}`;
      }
      // Handle objects by JSON stringifying
      if (typeof value === 'object' && value !== null) {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${value}`;
    })
    .join('&');

  // Create hash key
  const cacheKey = `${type}:${paramString}`;

  // Return as base64 to handle special characters
  return btoa(cacheKey);
}

// ============================================================================
// KV CACHE OPERATIONS
// ============================================================================

/**
 * Get cached data from Cloudflare KV (Tier 1)
 * Fast: ~50ms access time
 */
export async function getFromKV<T = any>(
  kv: KVNamespace,
  cacheKey: string
): Promise<CacheResult<T>> {
  try {
    const cached = await kv.get(cacheKey, 'json');

    if (cached) {
      return {
        data: cached as T,
        hit: true,
        source: 'kv',
        cacheKey,
      };
    }

    return {
      data: null,
      hit: false,
    };
  } catch (error) {
    console.error('[KV Cache Error]', error);
    return {
      data: null,
      hit: false,
    };
  }
}

/**
 * Store data in Cloudflare KV (Tier 1)
 * TTL: 7 days for frequently accessed content
 */
export async function saveToKV(
  kv: KVNamespace,
  cacheKey: string,
  data: any,
  ttlSeconds: number = 604800 // 7 days default
): Promise<void> {
  try {
    await kv.put(cacheKey, JSON.stringify(data), {
      expirationTtl: ttlSeconds,
    });
  } catch (error) {
    console.error('[KV Cache Write Error]', error);
    // Don't throw - caching failure shouldn't break the request
  }
}

// ============================================================================
// DATABASE CACHE OPERATIONS
// ============================================================================

/**
 * Get cached data from Supabase (Tier 2)
 * Slower: ~200-500ms access time
 * But permanent storage with analytics
 */
export async function getFromDatabase(
  env: Env,
  type: CacheType,
  cacheKey: string
): Promise<CacheResult> {
  try {
    const supabase = getSupabaseClient(env);

    const tableName = type === 'workout' ? 'workout_cache' : 'meal_cache';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) {
      return {
        data: null,
        hit: false,
      };
    }

    // Increment hit count (fire and forget - don't wait)
    Promise.resolve(
      supabase.rpc('increment_cache_hit', {
        p_cache_key: cacheKey,
        p_table_name: tableName,
      })
    ).catch((err: Error) => {
      console.error('[Hit Count Error]', err);
    });

    // Extract the actual data
    const cachedData = type === 'workout'
      ? (data as CachedWorkout).workout_data
      : (data as CachedMeal).meal_data;

    return {
      data: cachedData,
      hit: true,
      source: 'database',
      cacheKey,
    };
  } catch (error) {
    console.error('[Database Cache Error]', error);
    return {
      data: null,
      hit: false,
    };
  }
}

/**
 * Store data in Supabase database (Tier 2)
 * Permanent storage + analytics
 */
export async function saveToDatabase(
  env: Env,
  type: CacheType,
  cacheKey: string,
  data: any,
  metadata: CacheMetadata
): Promise<void> {
  try {
    const supabase = getSupabaseClient(env);

    const tableName = type === 'workout' ? 'workout_cache' : 'meal_cache';

    const cacheEntry = {
      cache_key: cacheKey,
      [type === 'workout' ? 'workout_data' : 'meal_data']: data,
      model_used: metadata.modelUsed,
      generation_time_ms: metadata.generationTimeMs,
      tokens_used: metadata.tokensUsed,
      cost_usd: metadata.costUsd,
      hit_count: 0,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
    };

    const { error } = await supabase.from(tableName).upsert(cacheEntry, {
      onConflict: 'cache_key',
    });

    if (error) {
      console.error('[Database Cache Write Error]', error);
    }
  } catch (error) {
    console.error('[Database Cache Error]', error);
    // Don't throw - caching failure shouldn't break the request
  }
}

// ============================================================================
// 3-TIER CACHE ORCHESTRATION
// ============================================================================

/**
 * Get data from cache with automatic tier fallback
 * 1. Try KV (fast)
 * 2. Try Database (slower but permanent)
 * 3. Return null (cache miss)
 */
export async function getCachedData(
  env: Env,
  type: CacheType,
  params: Record<string, any>
): Promise<CacheResult> {
  const cacheKey = generateCacheKey(type, params);

  // Tier 1: Try KV first
  const kv = type === 'workout' ? env.WORKOUT_CACHE : env.MEAL_CACHE;
  const kvResult = await getFromKV(kv, cacheKey);

  if (kvResult.hit) {
    return kvResult;
  }

  // Tier 2: Try database
  const dbResult = await getFromDatabase(env, type, cacheKey);

  if (dbResult.hit) {
    // Backfill KV cache for next time
    await saveToKV(kv, cacheKey, dbResult.data);
    return dbResult;
  }

  // Cache miss - caller needs to generate fresh data
  return {
    data: null,
    hit: false,
    source: 'fresh',
    cacheKey,
  };
}

/**
 * Save data to all cache tiers
 * 1. Save to KV (fast access)
 * 2. Save to Database (permanent + analytics)
 */
export async function saveCachedData(
  env: Env,
  type: CacheType,
  cacheKey: string,
  data: any,
  metadata: CacheMetadata
): Promise<void> {
  const kv = type === 'workout' ? env.WORKOUT_CACHE : env.MEAL_CACHE;

  // Save to both tiers in parallel
  await Promise.all([
    saveToKV(kv, cacheKey, data),
    saveToDatabase(env, type, cacheKey, data, metadata),
  ]);
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate cache entry from all tiers
 * Use when data needs to be regenerated
 */
export async function invalidateCache(
  env: Env,
  type: CacheType,
  cacheKey: string
): Promise<void> {
  try {
    const kv = type === 'workout' ? env.WORKOUT_CACHE : env.MEAL_CACHE;

    // Delete from KV
    await kv.delete(cacheKey);

    // Delete from database
    const supabase = getSupabaseClient(env);
    const tableName = type === 'workout' ? 'workout_cache' : 'meal_cache';

    await supabase.from(tableName).delete().eq('cache_key', cacheKey);

    console.log(`[Cache Invalidated] ${type}:${cacheKey}`);
  } catch (error) {
    console.error('[Cache Invalidation Error]', error);
  }
}
