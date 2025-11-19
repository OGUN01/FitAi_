/**
 * FitAI Workers - Request/Response Logging Middleware
 *
 * Logs all API requests to Supabase api_logs table:
 * - Request details (method, path, headers, body)
 * - Response details (status, time, size)
 * - User information (if authenticated)
 * - Error tracking
 */

import { Context, Next } from 'hono';
import { Env } from '../utils/types';
import { AuthContext } from './auth';
import { getSupabaseClient } from '../utils/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface ApiLog {
  // Request info
  user_id: string | null;
  endpoint: string;
  method: string;

  // Response info
  status_code: number | null;
  response_time_ms: number | null;

  // Cache info (if applicable)
  cache_hit?: boolean;
  cache_source?: string | null;

  // AI info (if applicable)
  model_used?: string | null;
  tokens_used?: number | null;
  credits_used?: number | null;

  // Error info
  error_message: string | null;
  error_code: string | null;

  // Metadata
  user_agent: string | null;
  ip_address: string | null;
  request_id?: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get client IP address from request
 */
function getClientIP(c: Context): string | null {
  // Cloudflare Workers provides CF-Connecting-IP header
  return c.req.header('CF-Connecting-IP') ||
         c.req.header('X-Forwarded-For') ||
         c.req.header('X-Real-IP') ||
         null;
}

/**
 * Check if path should be logged
 * Skip health checks and static assets
 */
function shouldLog(path: string): boolean {
  const skipPaths = [
    '/health',
    '/favicon.ico',
  ];

  return !skipPaths.some(skip => path === skip);
}

/**
 * Log request to Supabase
 */
async function logToSupabase(env: Env, logData: ApiLog): Promise<void> {
  try {
    const supabase = getSupabaseClient(env);

    const { error } = await supabase
      .from('api_logs')
      .insert([logData]);

    if (error) {
      console.error('[Logging] Failed to insert log:', error);
    }
  } catch (error) {
    console.error('[Logging] Error:', error);
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Request/Response logging middleware
 * Logs all API requests to Supabase
 */
export async function loggingMiddleware(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
  next: Next
) {
  const startTime = Date.now();

  // Get request details
  const method = c.req.method;
  const path = c.req.path;

  // Skip logging for certain paths
  if (!shouldLog(path)) {
    return next();
  }

  const userAgent = c.req.header('User-Agent') || null;
  const ipAddress = getClientIP(c);
  const user = c.get('user');
  const requestId = crypto.randomUUID();

  // Execute request
  let statusCode: number | null = 200;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  try {
    await next();

    // Get response details
    statusCode = c.res.status;

  } catch (error) {
    // Log error details
    statusCode = 500;

    if (error && typeof error === 'object' && 'code' in error) {
      errorCode = (error as any).code;
    }

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw error; // Re-throw to let error handler deal with it

  } finally {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Create log entry
    const logData: ApiLog = {
      user_id: user?.id || null,
      endpoint: path,
      method,
      status_code: statusCode,
      response_time_ms: responseTime,
      error_code: errorCode,
      error_message: errorMessage,
      user_agent: userAgent,
      ip_address: ipAddress,
      request_id: requestId,
    };

    // Log to Supabase (fire and forget - don't block response)
    // Use waitUntil to ensure the log completes even after response is sent
    c.executionCtx.waitUntil(
      logToSupabase(c.env, logData).catch(err => {
        console.error('[Logging] Failed to log to Supabase:', err);
      })
    );

    // Also log to console for debugging
    console.log('[API Log]', {
      method,
      path,
      status: statusCode,
      time: responseTime + 'ms',
      user: user?.id || 'anonymous',
      ip: ipAddress,
    });
  }
}

/**
 * Log custom event (for specific tracking needs)
 */
export async function logCustomEvent(
  env: Env,
  userId: string | null,
  eventType: string,
  metadata?: Record<string, any>
): Promise<void> {
  const logData: ApiLog = {
    user_id: userId,
    endpoint: `/${eventType}`,
    method: 'EVENT',
    status_code: 200,
    response_time_ms: 0,
    error_code: null,
    error_message: null,
    user_agent: null,
    ip_address: null,
    request_id: crypto.randomUUID(),
  };

  await logToSupabase(env, logData);
}
