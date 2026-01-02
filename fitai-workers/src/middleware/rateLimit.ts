/**
 * FitAI Workers - Rate Limiting Middleware
 *
 * Rate limiting using Cloudflare KV with sliding window algorithm
 */

import { Context, Next } from 'hono';
import { Env } from '../utils/types';
import { RateLimitError } from '../utils/errors';
import { AuthContext } from './auth';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional: Custom key prefix for KV storage */
  keyPrefix?: string;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  /** For authenticated users - 1000 requests per hour */
  AUTHENTICATED: {
    maxRequests: 1000,
    windowSeconds: 3600,
    keyPrefix: 'ratelimit:user',
  },
  /** For guest/unauthenticated users - 100 requests per hour per IP */
  GUEST: {
    maxRequests: 100,
    windowSeconds: 3600,
    keyPrefix: 'ratelimit:ip',
  },
  /** For AI generation endpoints - 500 requests per hour (increased for testing) */
  AI_GENERATION: {
    maxRequests: 500,
    windowSeconds: 3600,
    keyPrefix: 'ratelimit:ai',
  },
} as const;

/**
 * Rate limit information
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  currentCount: number;
}

/**
 * Get client identifier (user ID or IP address)
 */
function getClientIdentifier(c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>): string {
  // Prefer authenticated user ID
  const user = c.get('user');
  if (user?.id) {
    return user.id;
  }

  // Fall back to IP address for guests
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Check and update rate limit using KV
 */
async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const windowStart = now - config.windowSeconds;
  const key = `${config.keyPrefix}:${identifier}`;

  // Get existing rate limit data from KV
  const existingData = await kv.get<{
    requests: number[];
    lastReset: number;
  }>(key, 'json');

  let requests: number[] = [];
  let lastReset = windowStart;

  if (existingData) {
    // Filter out requests outside the current window
    requests = existingData.requests.filter((timestamp) => timestamp > windowStart);
    lastReset = existingData.lastReset;
  }

  // Calculate current count and remaining
  const currentCount = requests.length;
  const remaining = Math.max(0, config.maxRequests - currentCount - 1);

  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    // Find the oldest request timestamp to calculate reset time
    const oldestRequest = requests[0] || now;
    const resetTime = oldestRequest + config.windowSeconds;

    throw new RateLimitError(
      'Rate limit exceeded',
      config.maxRequests,
      resetTime
    );
  }

  // Add current request timestamp
  requests.push(now);

  // Store updated data in KV (expires after window duration)
  await kv.put(
    key,
    JSON.stringify({
      requests,
      lastReset,
    }),
    {
      expirationTtl: config.windowSeconds + 60, // Add 60s buffer
    }
  );

  // Calculate reset time (end of current window)
  const resetTime = now + config.windowSeconds;

  return {
    limit: config.maxRequests,
    remaining,
    reset: resetTime,
    currentCount: currentCount + 1, // Include current request
  };
}

/**
 * Rate limit middleware factory
 *
 * Usage:
 * ```
 * // For authenticated endpoints
 * app.post('/workout/generate',
 *   authMiddleware,
 *   rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
 *   handler
 * );
 *
 * // For public endpoints
 * app.get('/exercises/search',
 *   optionalAuthMiddleware,
 *   rateLimitMiddleware(RATE_LIMITS.GUEST),
 *   handler
 * );
 * ```
 */
export function rateLimitMiddleware(config: RateLimitConfig = RATE_LIMITS.GUEST) {
  return async (
    c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
    next: Next
  ): Promise<Response | void> => {
    const identifier = getClientIdentifier(c);

    // Check rate limit
    const rateLimitInfo = await checkRateLimit(c.env.RATE_LIMIT_KV, identifier, config);

    // Add rate limit headers to response
    c.header('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    c.header('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    c.header('X-RateLimit-Reset', rateLimitInfo.reset.toString());

    // Continue to next handler
    await next();
  };
}

/**
 * Helper: Get current rate limit status without incrementing
 * Useful for /status endpoints
 */
export async function getRateLimitStatus(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;
  const key = `${config.keyPrefix}:${identifier}`;

  const existingData = await kv.get<{
    requests: number[];
    lastReset: number;
  }>(key, 'json');

  if (!existingData) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: now + config.windowSeconds,
      currentCount: 0,
    };
  }

  const requests = existingData.requests.filter((timestamp) => timestamp > windowStart);
  const currentCount = requests.length;
  const remaining = Math.max(0, config.maxRequests - currentCount);
  const resetTime = now + config.windowSeconds;

  return {
    limit: config.maxRequests,
    remaining,
    reset: resetTime,
    currentCount,
  };
}
