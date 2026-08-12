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

// FIX: de-duplicate concurrent cache-miss requests behind a single in-flight
// promise. Without this, every request that lands in the same cache-miss
// window (e.g. several uptime-monitor pings arriving right as the 30s TTL
// expires) independently re-runs the KV put/get/delete, R2 list, and a real
// Supabase query before the first one finishes and repopulates the cache.
let inFlightHealthCheck: Promise<HealthCheckResponse> | null = null;

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
 * Run the live KV/R2/Supabase checks and populate the cache.
 * Factored out so concurrent cache-miss callers can share one in-flight
 * promise instead of each re-running the underlying service checks.
 */
async function runHealthChecks(env: Env): Promise<HealthCheckResponse> {
  const [kvStatus, r2Status, supabaseStatus] = await Promise.all([
    checkKVHealth(env),
    checkR2Health(env),
    checkSupabaseHealth(env),
  ]);

  // Determine overall health status.
  // Critical services (KV, Supabase) must be up. R2 is non-critical: media storage
  // is optional, so R2 being down degrades but does not fail the health check.
  const criticalServices = [kvStatus, supabaseStatus];
  const anyCriticalDown = criticalServices.some((s) => s.status === 'down');
  const anyCriticalDegraded = criticalServices.some((s) => s.status === 'degraded');
  const r2Unhealthy = r2Status.status !== 'up';

  const overallStatus = anyCriticalDown
    ? 'unhealthy'
    : anyCriticalDegraded || r2Unhealthy
      ? 'degraded'
      : 'healthy';

  const response: HealthCheckResponse = {
    status: overallStatus,
    version: '2.0.0',
    uptime: Math.floor((Date.now() - WORKER_START_TIME) / 1000),
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

  return response;
}

/**
 * Health check endpoint handler
 */
export async function handleHealthCheck(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;
  const now = Date.now();

  let result: HealthCheckResponse;

  if (healthCheckCache && (now - healthCheckCache.timestamp) < HEALTH_CACHE_TTL) {
    // Cache hit — reuse the last computed status.
    result = healthCheckCache.result;
  } else if (inFlightHealthCheck) {
    // Another request already triggered a fresh check for this cache-miss
    // window — await the same promise instead of re-running the checks.
    result = await inFlightHealthCheck;
  } else {
    inFlightHealthCheck = runHealthChecks(env).finally(() => {
      inFlightHealthCheck = null;
    });
    result = await inFlightHealthCheck;
  }

  // Stamp uptime/timestamp fresh for this specific request/response.
  const response = {
    ...result,
    uptime: Math.floor((Date.now() - WORKER_START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  };

  // Return appropriate HTTP status code
  const httpStatus = response.status === 'healthy' ? 200 : response.status === 'degraded' ? 200 : 503;

  return c.json(response, httpStatus);
}
