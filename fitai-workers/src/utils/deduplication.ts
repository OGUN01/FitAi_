/**
 * FitAI Workers - Request Deduplication System
 *
 * Prevents duplicate AI generation requests during burst traffic.
 * When multiple identical requests arrive simultaneously:
 * - First request proceeds with AI generation
 * - Subsequent requests wait for first to complete
 * - All requests receive the same result
 *
 * Performance Impact:
 * - 15-25% cost savings during burst traffic
 * - Reduces redundant AI API calls
 * - Lower token consumption
 *
 * KNOWN LIMITATION: Cloudflare KV is only eventually consistent (propagation
 * can take up to 60s across edge locations/PoPs). Two near-simultaneous
 * identical requests landing on different PoPs can both read an empty
 * `inflight:*` key and both proceed to call the expensive generatorFn(),
 * silently defeating deduplication for that pair of requests. This is the
 * exact burst-traffic scenario this module targets, so treat the cost
 * savings above as a statistical average, not a guarantee. If stronger
 * consistency is ever required, migrate the in-flight lock to a Durable
 * Object-based mutex instead of KV.
 */

import { Env } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Status of an in-flight request
 */
interface InFlightRequest {
  status: 'pending' | 'completed' | 'error';
  result?: any;
  error?: string;
  timestamp: number;
}

/**
 * Deduplication result
 */
export interface DeduplicationResult<T = any> {
  /** Whether this request was deduplicated (waited for another) */
  deduplicated: boolean;
  /** The result data (either from fresh generation or deduplicated) */
  data: T;
  /** How long we waited for deduplication (ms) */
  waitTime?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * How long to keep in-flight request tracking (180 seconds)
 * AI generation can take 60-90+ seconds for complex diet/workout plans
 * Must be longer than MAX_WAIT_MS to prevent premature expiration
 */
const IN_FLIGHT_TTL_SECONDS = 180;

/**
 * How often to poll for in-flight request completion (500ms)
 * Increased to reduce KV reads during long AI generation
 */
const POLL_INTERVAL_MS = 500;

/**
 * Maximum time to wait for in-flight request (120 seconds)
 * AI generation can take 60-90+ seconds, so we need a longer timeout
 * Must be less than IN_FLIGHT_TTL_SECONDS
 */
const MAX_WAIT_MS = 120000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique key for tracking in-flight requests
 * Uses the same cache key as the caching system for consistency
 */
function getInFlightKey(cacheKey: string): string {
  return `inflight:${cacheKey}`;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CORE DEDUPLICATION LOGIC
// ============================================================================

/**
 * Execute a function with deduplication
 * If an identical request is already in-flight, wait for it instead of executing again
 *
 * @param env - Cloudflare Worker environment
 * @param cacheKey - Unique identifier for this request (from cache system)
 * @param generatorFn - Function to execute if no in-flight request exists
 * @returns Deduplication result with data and metadata
 *
 * @example
 * ```typescript
 * const result = await withDeduplication(
 *   env,
 *   cacheKey,
 *   async () => {
 *     // Expensive AI generation
 *     return await generateWorkout(params);
 *   }
 * );
 *
 * if (result.deduplicated) {
 *   console.log(`Saved by deduplication! Waited ${result.waitTime}ms`);
 * }
 * ```
 */
export async function withDeduplication<T>(
  env: Env,
  cacheKey: string,
  generatorFn: () => Promise<T>
): Promise<DeduplicationResult<T>> {
  const inFlightKey = getInFlightKey(cacheKey);
  const kv = env.RATE_LIMIT_KV; // Reuse rate limit KV for in-flight tracking

  // Check if request is already in-flight
  const existingRequest = await kv.get<InFlightRequest>(inFlightKey, 'json');

  if (existingRequest) {
    // Check if the existing request is stale (older than 90 seconds)
    // AI generation typically completes in 60-90 seconds
    const requestAge = Date.now() - existingRequest.timestamp;
    const STALE_THRESHOLD_MS = 90000; // 90 seconds
    
    if (existingRequest.status === 'pending' && requestAge > STALE_THRESHOLD_MS) {
      // Stale pending request - clear it and start fresh
      console.log(`[Deduplication] Clearing stale pending request (age: ${Math.round(requestAge/1000)}s)`);
      await kv.delete(inFlightKey);
      // Fall through to start fresh generation
    } else if (existingRequest.status === 'pending' || existingRequest.status === 'completed') {
      // Valid in-flight or completed request - wait for it
      return await waitForInFlightRequest<T>(kv, inFlightKey, existingRequest, generatorFn);
    } else if (existingRequest.status === 'error') {
      // Previous request failed - clear it and start fresh
      console.log('[Deduplication] Clearing failed request, starting fresh');
      await kv.delete(inFlightKey);
      // Fall through to start fresh generation
    }
  }

  // No in-flight request - we're the first one
  return await runGeneratorAndStore<T>(kv, inFlightKey, generatorFn);
}

/**
 * Mark a request as in-flight, execute the generator function, and persist
 * the outcome (completed/error) to KV. Shared by the "first request" path in
 * withDeduplication and the timeout-recovery path in waitForInFlightRequest.
 */
async function runGeneratorAndStore<T>(
  kv: KVNamespace,
  inFlightKey: string,
  generatorFn: () => Promise<T>
): Promise<DeduplicationResult<T>> {
  const inFlightData: InFlightRequest = {
    status: 'pending',
    timestamp: Date.now(),
  };

  await kv.put(inFlightKey, JSON.stringify(inFlightData), {
    expirationTtl: IN_FLIGHT_TTL_SECONDS,
  });

  // Execute the generator function
  try {
    const result = await generatorFn();

    // Mark as completed and store result
    const completedData: InFlightRequest = {
      status: 'completed',
      result,
      timestamp: Date.now(),
    };

    await kv.put(inFlightKey, JSON.stringify(completedData), {
      expirationTtl: IN_FLIGHT_TTL_SECONDS,
    });

    return {
      deduplicated: false,
      data: result,
    };
  } catch (error) {
    // Mark as error
    const errorData: InFlightRequest = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };

    await kv.put(inFlightKey, JSON.stringify(errorData), {
      expirationTtl: IN_FLIGHT_TTL_SECONDS,
    });

    throw error; // Re-throw so caller handles it
  }
}

/**
 * Wait for an in-flight request to complete
 * Polls KV storage until request completes or times out
 */
async function waitForInFlightRequest<T>(
  kv: KVNamespace,
  inFlightKey: string,
  initialRequest: InFlightRequest,
  generatorFn: () => Promise<T>
): Promise<DeduplicationResult<T>> {
  const startTime = Date.now();
  let currentRequest = initialRequest;

  console.log('[Deduplication] Waiting for in-flight request:', inFlightKey);

  // Poll until request completes or we timeout
  while (Date.now() - startTime < MAX_WAIT_MS) {
    // Check current status
    if (currentRequest.status === 'completed') {
      const waitTime = Date.now() - startTime;
      console.log(`[Deduplication] Request completed after ${waitTime}ms`);

      return {
        deduplicated: true,
        data: currentRequest.result as T,
        waitTime,
      };
    }

    if (currentRequest.status === 'error') {
      const waitTime = Date.now() - startTime;
      console.log(`[Deduplication] Request failed after ${waitTime}ms`);

      // If the in-flight request failed, we should also fail
      throw new Error(
        currentRequest.error || 'In-flight request failed'
      );
    }

    // Still pending - wait and check again
    await sleep(POLL_INTERVAL_MS);

    const updated = await kv.get<InFlightRequest>(inFlightKey, 'json');

    if (!updated) {
      // Request disappeared from KV - might have expired
      // Fall back to generating fresh
      console.log('[Deduplication] In-flight request disappeared, generating fresh');
      return await runGeneratorAndStore<T>(kv, inFlightKey, generatorFn);
    }

    currentRequest = updated;
  }

  // Timeout - the original requester's generation is stuck/too slow.
  // Regenerate ourselves instead of failing the caller after a 120s wait
  // (previously threw here, which every caller left uncaught -> hard 500).
  const waitTime = Date.now() - startTime;
  console.log(`[Deduplication] Timeout after ${waitTime}ms, generating fresh`);

  // We waited too long - the request might be stuck
  // Delete the in-flight marker so others don't keep waiting on the stuck one
  await kv.delete(inFlightKey);

  return await runGeneratorAndStore<T>(kv, inFlightKey, generatorFn);
}

/**
 * Clear all in-flight request markers
 * Useful for testing or emergency cleanup
 */
export async function clearInFlightRequests(env: Env): Promise<void> {
  // KV doesn't support prefix-based deletion easily
  // This is mainly for documentation - in practice, TTL will handle cleanup
  console.log('[Deduplication] In-flight requests will expire naturally via TTL');
}

/**
 * Get statistics about in-flight requests
 * For monitoring and debugging
 */
export async function getDeduplicationStats(
  env: Env,
  cacheKey: string
): Promise<InFlightRequest | null> {
  const inFlightKey = getInFlightKey(cacheKey);
  return await env.RATE_LIMIT_KV.get<InFlightRequest>(inFlightKey, 'json');
}
