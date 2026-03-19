/**
 * FitAI Workers - Authentication Middleware
 *
 * JWT validation middleware using Supabase Auth
 */

import { Context, Next } from 'hono';
import { Env } from '../utils/types';
import { APIError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { getSupabaseClient } from '../utils/supabase';

/**
 * User information extracted from JWT
 */
export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  appRole?: string;
  aud?: string;
  exp?: number;
}

/**
 * Extended context with authenticated user
 */
export interface AuthContext {
  user: AuthUser;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

function isNotFoundError(error: { code?: string; message?: string } | null | undefined): boolean {
  return Boolean(error && (error.code === 'PGRST116' || /not found|no rows/i.test(error.message || '')));
}

/**
 * Verify JWT token using Supabase
 */
async function verifyToken(token: string, env: Env): Promise<AuthUser> {
  try {
    // Get Supabase singleton client
    const supabase = getSupabaseClient(env);

    // Verify the JWT token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError('Invalid or expired token', {
        reason: error?.message || 'User not found',
      });
    }

    // Return user information
    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      appRole: data.user.app_metadata?.role,
      aud: data.user.aud,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Token verification failed', {
      reason: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Authentication middleware - Requires valid JWT token
 *
 * Usage:
 * ```
 * app.post('/protected', authMiddleware, async (c) => {
 *   const user = c.get('user');
 *   return c.json({ userId: user.id });
 * });
 * ```
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AuthContext }>,
  next: Next
): Promise<Response | void> {
  // Extract token from Authorization header
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    throw new UnauthorizedError('Missing authorization token', {
      hint: 'Include Authorization header with Bearer token',
    });
  }

  // Verify token and get user info
  const user = await verifyToken(token, c.env);

  // Attach user to context
  c.set('user', user);

  // Continue to next handler
  await next();
}

/**
 * Optional authentication middleware - Allows requests without token
 * but attaches user info if token is provided
 *
 * Usage:
 * ```
 * app.get('/public', optionalAuthMiddleware, async (c) => {
 *   const user = c.get('user'); // May be undefined
 *   if (user) {
 *     return c.json({ message: `Hello ${user.email}` });
 *   }
 *   return c.json({ message: 'Hello guest' });
 * });
 * ```
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
  next: Next
): Promise<Response | void> {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization');
    const token = extractToken(authHeader);

    if (token) {
      // Verify token and get user info
      const user = await verifyToken(token, c.env);
      c.set('user', user);
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    // Continue without user context
  }

  // Continue to next handler
  await next();
}

/**
 * Role-based access control middleware
 *
 * Usage:
 * ```
 * app.post('/admin', authMiddleware, requireRole('admin'), async (c) => {
 *   return c.json({ message: 'Admin only' });
 * });
 * ```
 */
export function requireRole(...allowedRoles: string[]) {
  return async (
    c: Context<{ Bindings: Env; Variables: AuthContext }>,
    next: Next
  ): Promise<Response | void> => {
    const user = c.get('user');

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (allowedRoles.includes('admin')) {
      const supabase = getSupabaseClient(c.env);
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && !isNotFoundError(error)) {
        throw new APIError('Failed to verify admin permissions', 500, ErrorCode.DATABASE_ERROR, {
          detail: error.message,
        });
      }

      if (data) {
        await next();
        return;
      }
    }

    const fallbackRoles = allowedRoles.filter((role) => role !== 'admin');
    const effectiveRole = user.appRole || user.role;
    if (!effectiveRole || !fallbackRoles.includes(effectiveRole)) {
      throw new ForbiddenError('Insufficient permissions', {
        required: allowedRoles,
        actual: effectiveRole,
      });
    }

    await next();
  };
}
