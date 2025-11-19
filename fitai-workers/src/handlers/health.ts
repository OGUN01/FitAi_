/**
 * FitAI Workers - Health Check Handler
 *
 * Checks the health of all services and returns status
 */

import { Context } from 'hono';
import { Env, HealthCheckResponse, ServiceStatus } from '../utils/types';
import { getSupabaseClient } from '../utils/supabase';

// Worker start time for uptime calculation
const WORKER_START_TIME = Date.now();

// Cache health check results for 30 seconds to avoid excessive service checks
let healthCheckCache: { result: HealthCheckResponse; timestamp: number } | null = null;
const HEALTH_CACHE_TTL = 30000; // 30 seconds

/**
 * Check Cloudflare KV health
 */
async function checkKVHealth(env: Env): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // Try to read/write to rate limit KV (least critical)
    const testKey = `health_check_${Date.now()}`;
    await env.RATE_LIMIT_KV.put(testKey, 'test', { expirationTtl: 60 });
    const value = await env.RATE_LIMIT_KV.get(testKey);

    if (value === 'test') {
      // Clean up test key
      await env.RATE_LIMIT_KV.delete(testKey);

      return {
        status: 'up',
        latency: Date.now() - startTime,
      };
    }

    return {
      status: 'degraded',
      latency: Date.now() - startTime,
      error: 'KV read/write mismatch',
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'KV connection failed',
    };
  }
}

/**
 * Check Cloudflare R2 health
 */
async function checkR2Health(env: Env): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // Try to list objects in R2 bucket (lightweight operation)
    const list = await env.FITAI_MEDIA.list({ limit: 1 });

    return {
      status: 'up',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'R2 connection failed',
    };
  }
}

/**
 * Check Supabase health
 */
async function checkSupabaseHealth(env: Env): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // Get Supabase singleton client
    const supabase = getSupabaseClient(env);

    // Try to execute a simple query (check if workout_cache table exists)
    const { error } = await supabase
      .from('workout_cache')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (!error) {
      return {
        status: 'up',
        latency: Date.now() - startTime,
      };
    }

    return {
      status: 'degraded',
      latency: Date.now() - startTime,
      error: error.message,
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Supabase connection failed',
    };
  }
}

/**
 * Health check endpoint handler
 */
export async function handleHealthCheck(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;
  const now = Date.now();

  // Return cached result if still valid
  if (healthCheckCache && (now - healthCheckCache.timestamp) < HEALTH_CACHE_TTL) {
    // Update uptime in cached response
    const cachedResponse = {
      ...healthCheckCache.result,
      uptime: Math.floor((now - WORKER_START_TIME) / 1000),
      timestamp: new Date().toISOString(),
    };
    return c.json(cachedResponse, cachedResponse.status === 'healthy' ? 200 : 503);
  }

  // Check all services in parallel (cache miss)
  const [kvStatus, r2Status, supabaseStatus] = await Promise.all([
    checkKVHealth(env),
    checkR2Health(env),
    checkSupabaseHealth(env),
  ]);

  // Determine overall health status
  const allServicesUp = [kvStatus, r2Status, supabaseStatus].every((s) => s.status === 'up');
  const anyServiceDown = [kvStatus, r2Status, supabaseStatus].some((s) => s.status === 'down');

  const overallStatus = allServicesUp ? 'healthy' : anyServiceDown ? 'unhealthy' : 'degraded';

  // Calculate uptime in seconds
  const uptimeSeconds = Math.floor((Date.now() - WORKER_START_TIME) / 1000);

  const response: HealthCheckResponse = {
    status: overallStatus,
    version: '2.0.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    services: {
      cloudflare_kv: kvStatus,
      cloudflare_r2: r2Status,
      supabase: supabaseStatus,
    },
  };

  // Cache the result
  healthCheckCache = {
    result: response,
    timestamp: Date.now(),
  };

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return c.json(response, httpStatus);
}
