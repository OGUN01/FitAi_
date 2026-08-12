/**
 * FitAI Workers - Rate Limiting Middleware
 *
 * Rate limiting using Cloudflare KV with a fixed-window counter algorithm
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
	/** For AI generation endpoints - 50 requests per hour */
	AI_GENERATION: {
		maxRequests: 50,
		windowSeconds: 3600,
		keyPrefix: 'ratelimit:ai',
	},
	/** For job status polling - 2000 requests per hour */
	JOB_STATUS: {
		maxRequests: 2000,
		windowSeconds: 3600,
		keyPrefix: 'ratelimit:job',
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

	// Fall back to IP address for guests. Only `cf-connecting-ip` is trustworthy
	// here — it is set by the Cloudflare edge itself and cannot be forwarded or
	// spoofed by the client. `x-real-ip` / `x-forwarded-for` are arbitrary
	// request headers any caller can set, so trusting them would let a client
	// mint a fresh identifier per request (bypassing the GUEST cap entirely) or
	// impersonate another IP to pollute/exhaust that IP's shared bucket.
	// Cloudflare Workers always populate `cf-connecting-ip` in production; if it
	// is ever absent, bucket all such requests under one fixed, unspoofable key
	// rather than trusting client-supplied headers — this collapses every
	// no-CF-IP request into a single shared (and effectively much tighter)
	// bucket instead of granting each one its own limit.
	const ip = c.req.header('cf-connecting-ip');
	return ip || 'no-cf-ip';
}

/**
 * Check and update rate limit using KV
 *
 * Fixed-window counter: stores just `{ count, windowStart }` per key rather
 * than a full array of request timestamps, so payload size is O(1) instead
 * of O(maxRequests) — important for the high-volume AUTHENTICATED (1000/hr)
 * and JOB_STATUS (2000/hr) tiers, which previously read+wrote an array of up
 * to ~2000 numbers on every single request.
 *
 * KNOWN LIMITATIONS (approximate abuse protection, not a hard cap):
 *
 * 1. Non-atomic read-modify-write: Cloudflare KV has no compare-and-swap, so
 *    concurrent requests from the same identifier within the same tick can
 *    all `kv.get()` the same count, each independently decide "under limit",
 *    and each `kv.put()` back `count + 1` — losing the other concurrent
 *    increments (lost update). A burst can therefore exceed maxRequests.
 * 2. KV is only eventually consistent across Cloudflare's edge colocations
 *    (writes can take up to 60s to propagate globally), so a client hitting
 *    different PoPs during a burst can see stale (lower) counts at each
 *    location — an additive source of under-counting on top of (1), not just
 *    same-tick collisions.
 *
 * These are accepted per-tier tradeoffs rather than "unfixed" bugs:
 *  - GUEST / AUTHENTICATED / JOB_STATUS: general-purpose buckets where a
 *    per-request atomic primitive (a Durable Object per rate-limit key is
 *    Cloudflare's recommended fix) would require new infrastructure/wiring
 *    for every route using this middleware. At this volume, KV as an
 *    approximate cap is an acceptable tradeoff — treat it as abuse
 *    protection, not a precise quota.
 *  - AI_GENERATION: every route gated by this tier also runs
 *    subscriptionGate.ts's checkUsageLimit()/incrementUsage(), which enforce
 *    the per-user quota via a Postgres RPC (increment_feature_usage)
 *    immediately after this check. The RPC's own increment step is atomic,
 *    but the composite check-then-increment gate is not — as subscriptionGate.ts's
 *    own comment notes, two concurrent requests inside the ~ms select+upsert
 *    window can still both pass. That is a much narrower race window than
 *    this KV limiter's (same-tick lost-update plus up-to-60s eventual
 *    consistency), not the absence of one. For those routes, this KV check is
 *    intentionally just a cheap, imprecise pre-filter (fast-fails obvious
 *    abuse before touching Supabase) — the downstream Postgres-backed check
 *    is the tighter, but still not perfectly exact, cap.
 */
async function checkRateLimit(kv: KVNamespace, identifier: string, config: RateLimitConfig): Promise<RateLimitInfo> {
	const now = Math.floor(Date.now() / 1000); // Current time in seconds
	const key = `${config.keyPrefix}:${identifier}`;

	// Get existing rate limit data from KV
	const existingData = await kv.get<{
		count: number;
		windowStart: number;
	}>(key, 'json');

	let windowStart = now;
	let count = 0;

	if (existingData && now - existingData.windowStart < config.windowSeconds) {
		// Still inside the existing fixed window — keep its start and count.
		windowStart = existingData.windowStart;
		count = existingData.count;
	}

	// Check if limit exceeded
	if (count >= config.maxRequests) {
		const resetTime = windowStart + config.windowSeconds;
		throw new RateLimitError('Rate limit exceeded', config.maxRequests, resetTime);
	}

	// Record current request
	count += 1;

	// Store updated data in KV (expires after window duration)
	await kv.put(
		key,
		JSON.stringify({
			count,
			windowStart,
		}),
		{
			expirationTtl: config.windowSeconds + 60, // Add 60s buffer
		},
	);

	const resetTime = windowStart + config.windowSeconds;

	return {
		limit: config.maxRequests,
		remaining: Math.max(0, config.maxRequests - count),
		reset: resetTime,
		currentCount: count,
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
	return async (c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>, next: Next): Promise<Response | void> => {
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
