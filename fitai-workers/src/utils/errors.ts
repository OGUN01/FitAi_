/**
 * FitAI Workers - Enhanced Error Handling Utilities
 *
 * Comprehensive error classes and error response formatters
 */

import { HTTPStatus, APIResponse } from './types';
import { ErrorCode, getErrorMetadata } from './errorCodes';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base API Error class with enhanced features
 */
export class APIError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: any;
  public readonly isRetryable: boolean;
  public readonly timestamp: string;

  constructor(message: string, statusCode: number, errorCode: ErrorCode, details?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    const metadata = getErrorMetadata(errorCode);
    this.isRetryable = metadata.isRetryable;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Authentication Error (401)
 */
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Missing authorization token', details?: any) {
    super(message, HTTPStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Invalid Token Error (401)
 */
export class InvalidTokenError extends APIError {
  constructor(message: string = 'Invalid authentication token', details?: any) {
    super(message, HTTPStatus.UNAUTHORIZED, ErrorCode.INVALID_TOKEN, details);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Token Expired Error (401)
 */
export class TokenExpiredError extends APIError {
  constructor(message: string = 'Authentication token has expired', details?: any) {
    super(message, HTTPStatus.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED, details);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends APIError {
  constructor(message: string = 'You do not have permission to access this resource', details?: any) {
    super(message, HTTPStatus.FORBIDDEN, ErrorCode.FORBIDDEN, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends APIError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, HTTPStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

/**
 * Invalid Parameter Error (400)
 */
export class InvalidParameterError extends APIError {
  constructor(paramName: string, message?: string, details?: any) {
    const errorMessage = message || `Invalid parameter: ${paramName}`;
    super(errorMessage, HTTPStatus.BAD_REQUEST, ErrorCode.INVALID_PARAMETER, { parameter: paramName, ...details });
    this.name = 'InvalidParameterError';
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends APIError {
  public readonly limit: number;
  public readonly resetAt: number;

  constructor(message: string, limit: number, resetAt: number) {
    super(message, HTTPStatus.RATE_LIMIT_EXCEEDED, ErrorCode.RATE_LIMIT_EXCEEDED, { limit, resetAt });
    this.name = 'RateLimitError';
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

/**
 * AI Quota Exceeded Error (429)
 */
export class AIQuotaExceededError extends APIError {
  constructor(message: string = 'AI generation quota exceeded', details?: any) {
    super(message, HTTPStatus.RATE_LIMIT_EXCEEDED, ErrorCode.AI_QUOTA_EXCEEDED, details);
    this.name = 'AIQuotaExceededError';
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, HTTPStatus.NOT_FOUND, ErrorCode.NOT_FOUND, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Resource Already Exists Error (409)
 */
export class ResourceAlreadyExistsError extends APIError {
  constructor(resource: string, details?: any) {
    super(`${resource} already exists`, 409, ErrorCode.RESOURCE_ALREADY_EXISTS, details);
    this.name = 'ResourceAlreadyExistsError';
  }
}

/**
 * File Too Large Error (413)
 */
export class FileTooLargeError extends APIError {
  constructor(maxSize: number, actualSize: number) {
    super(
      `File size (${actualSize} bytes) exceeds maximum allowed (${maxSize} bytes)`,
      413,
      ErrorCode.FILE_TOO_LARGE,
      { maxSize, actualSize }
    );
    this.name = 'FileTooLargeError';
  }
}

/**
 * Invalid File Type Error (400)
 */
export class InvalidFileTypeError extends APIError {
  constructor(allowedTypes: string[], receivedType: string) {
    super(
      `Invalid file type '${receivedType}'. Allowed types: ${allowedTypes.join(', ')}`,
      HTTPStatus.BAD_REQUEST,
      ErrorCode.INVALID_FILE_TYPE,
      { allowedTypes, receivedType }
    );
    this.name = 'InvalidFileTypeError';
  }
}

/**
 * AI Generation Failed Error (500)
 */
export class AIGenerationFailedError extends APIError {
  constructor(message: string = 'AI generation failed', details?: any) {
    super(message, HTTPStatus.INTERNAL_SERVER_ERROR, ErrorCode.AI_GENERATION_FAILED, details);
    this.name = 'AIGenerationFailedError';
  }
}

/**
 * AI Timeout Error (504)
 */
export class AITimeoutError extends APIError {
  constructor(timeoutMs: number, details?: any) {
    super(
      `AI generation timed out after ${timeoutMs}ms`,
      504,
      ErrorCode.AI_TIMEOUT,
      { timeoutMs, ...details }
    );
    this.name = 'AITimeoutError';
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends APIError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, HTTPStatus.INTERNAL_SERVER_ERROR, ErrorCode.DATABASE_ERROR, details);
    this.name = 'DatabaseError';
  }
}

/**
 * Supabase Error (500)
 */
export class SupabaseError extends APIError {
  constructor(message: string, supabaseError?: any) {
    super(message, HTTPStatus.INTERNAL_SERVER_ERROR, ErrorCode.SUPABASE_ERROR, {
      supabaseError: supabaseError?.message || supabaseError,
    });
    this.name = 'SupabaseError';
  }
}

/**
 * Cache Error (500)
 */
export class CacheError extends APIError {
  constructor(operation: 'read' | 'write', message?: string, details?: any) {
    const errorCode = operation === 'read' ? ErrorCode.CACHE_READ_FAILED : ErrorCode.CACHE_WRITE_FAILED;
    const defaultMessage = operation === 'read' ? 'Failed to read from cache' : 'Failed to write to cache';
    super(message || defaultMessage, HTTPStatus.INTERNAL_SERVER_ERROR, errorCode, details);
    this.name = 'CacheError';
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends APIError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, HTTPStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, details);
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends APIError {
  constructor(service: string = 'Service', details?: any) {
    super(`${service} temporarily unavailable`, HTTPStatus.SERVICE_UNAVAILABLE, ErrorCode.SERVICE_UNAVAILABLE, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Timeout Error (504)
 */
export class TimeoutError extends APIError {
  constructor(operation: string, timeoutMs: number, details?: any) {
    super(
      `${operation} timed out after ${timeoutMs}ms`,
      504,
      ErrorCode.TIMEOUT,
      { operation, timeoutMs, ...details }
    );
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// ERROR RESPONSE FORMATTERS
// ============================================================================

/**
 * Format error as API response
 */
export function formatErrorResponse(error: Error | APIError): APIResponse {
  // If it's our custom APIError, use its properties
  if (error instanceof APIError) {
    return {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
      },
      metadata: {
        timestamp: error.timestamp,
        isRetryable: error.isRetryable,
      },
    };
  }

  // For unknown errors, return generic internal error
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
    },
    metadata: {
      timestamp: new Date().toISOString(),
      isRetryable: true,
    },
  };
}

/**
 * Create HTTP Response from error
 */
export function createErrorResponse(error: Error | APIError): Response {
  const statusCode = error instanceof APIError ? error.statusCode : HTTPStatus.INTERNAL_SERVER_ERROR;
  const apiResponse = formatErrorResponse(error);

  // Add rate limit headers for rate limit errors
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (error instanceof RateLimitError) {
    headers['X-RateLimit-Limit'] = error.limit.toString();
    headers['X-RateLimit-Reset'] = error.resetAt.toString();
    headers['Retry-After'] = Math.ceil((error.resetAt - Date.now()) / 1000).toString();
  }

  // Add retry-after header for retryable errors
  if (error instanceof APIError && error.isRetryable) {
    if (!headers['Retry-After']) {
      headers['Retry-After'] = '60'; // Default 60 seconds
    }
  }

  return new Response(JSON.stringify(apiResponse, null, 2), {
    status: statusCode,
    headers,
  });
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, any>): void {
  const errorLog = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  };

  // Add additional metadata for APIError
  if (error instanceof APIError) {
    Object.assign(errorLog, {
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      details: error.details,
      isRetryable: error.isRetryable,
    });
  }

  console.error('[ERROR]', JSON.stringify(errorLog, null, 2));
}

/**
 * Safe error handler wrapper for async functions
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return handler().catch((error) => {
    logError(error, context);
    throw error;
  });
}

/**
 * Wrap Supabase errors into APIError
 */
export function handleSupabaseError(error: any, operation: string): never {
  if (!error) {
    throw new InternalServerError('Unknown database error');
  }

  const message = error.message || error.msg || 'Database operation failed';
  throw new SupabaseError(`${operation}: ${message}`, error);
}

/**
 * Wrap cache errors into APIError
 */
export function handleCacheError(error: any, operation: 'read' | 'write'): never {
  const message = error?.message || 'Cache operation failed';
  throw new CacheError(operation, message, { originalError: error });
}

/**
 * Wrap AI generation errors into APIError
 */
export function handleAIError(error: any, model?: string): never {
  if (error?.message?.includes('timeout') || error?.message?.includes('timed out')) {
    throw new AITimeoutError(30000, { model, originalError: error });
  }

  if (error?.message?.includes('unavailable') || error?.message?.includes('503')) {
    throw new ServiceUnavailableError('AI model', { model, originalError: error });
  }

  const message = error?.message || 'AI generation failed';
  throw new AIGenerationFailedError(message, { model, originalError: error });
}

/**
 * Create validation error from Zod error
 */
export function createValidationError(zodError: any): ValidationError {
  const errors = zodError.errors?.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
  })) || [];

  return new ValidationError('Request validation failed', { errors });
}
