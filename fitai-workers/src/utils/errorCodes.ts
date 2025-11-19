/**
 * FitAI Workers - Comprehensive Error Code Definitions
 *
 * This file contains all error codes, their descriptions, and recommended HTTP status codes
 */

export enum ErrorCode {
  // ============================================================================
  // AUTHENTICATION ERRORS (401, 403)
  // ============================================================================
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',

  // ============================================================================
  // VALIDATION ERRORS (400)
  // ============================================================================
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_PARAMETER = 'INVALID_PARAMETER',

  // ============================================================================
  // RATE LIMITING ERRORS (429)
  // ============================================================================
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',

  // ============================================================================
  // AI GENERATION ERRORS (500, 503)
  // ============================================================================
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',

  // ============================================================================
  // CACHE ERRORS (500)
  // ============================================================================
  CACHE_READ_FAILED = 'CACHE_READ_FAILED',
  CACHE_WRITE_FAILED = 'CACHE_WRITE_FAILED',

  // ============================================================================
  // DATABASE ERRORS (500, 503)
  // ============================================================================
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',

  // ============================================================================
  // MEDIA ERRORS (400, 404, 413, 500)
  // ============================================================================
  MEDIA_NOT_FOUND = 'MEDIA_NOT_FOUND',
  MEDIA_FETCH_FAILED = 'MEDIA_FETCH_FAILED',
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  MEDIA_DELETE_FAILED = 'MEDIA_DELETE_FAILED',

  // ============================================================================
  // RESOURCE ERRORS (404, 409)
  // ============================================================================
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // ============================================================================
  // INTERNAL ERRORS (500, 503, 504)
  // ============================================================================
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Error code metadata
 */
export interface ErrorCodeMetadata {
  code: ErrorCode;
  defaultMessage: string;
  httpStatus: number;
  isRetryable: boolean;
  category: 'authentication' | 'validation' | 'rate_limit' | 'ai' | 'cache' | 'database' | 'media' | 'resource' | 'internal';
}

/**
 * Comprehensive error code definitions with metadata
 */
export const ERROR_DEFINITIONS: Record<ErrorCode, ErrorCodeMetadata> = {
  // Authentication
  [ErrorCode.UNAUTHORIZED]: {
    code: ErrorCode.UNAUTHORIZED,
    defaultMessage: 'Missing authorization token',
    httpStatus: 401,
    isRetryable: false,
    category: 'authentication',
  },
  [ErrorCode.INVALID_TOKEN]: {
    code: ErrorCode.INVALID_TOKEN,
    defaultMessage: 'Invalid authentication token',
    httpStatus: 401,
    isRetryable: false,
    category: 'authentication',
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    code: ErrorCode.TOKEN_EXPIRED,
    defaultMessage: 'Authentication token has expired',
    httpStatus: 401,
    isRetryable: false,
    category: 'authentication',
  },
  [ErrorCode.FORBIDDEN]: {
    code: ErrorCode.FORBIDDEN,
    defaultMessage: 'You do not have permission to access this resource',
    httpStatus: 403,
    isRetryable: false,
    category: 'authentication',
  },

  // Validation
  [ErrorCode.VALIDATION_ERROR]: {
    code: ErrorCode.VALIDATION_ERROR,
    defaultMessage: 'Request validation failed',
    httpStatus: 400,
    isRetryable: false,
    category: 'validation',
  },
  [ErrorCode.INVALID_REQUEST]: {
    code: ErrorCode.INVALID_REQUEST,
    defaultMessage: 'Invalid request format',
    httpStatus: 400,
    isRetryable: false,
    category: 'validation',
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    code: ErrorCode.MISSING_REQUIRED_FIELD,
    defaultMessage: 'Missing required field in request',
    httpStatus: 400,
    isRetryable: false,
    category: 'validation',
  },
  [ErrorCode.INVALID_PARAMETER]: {
    code: ErrorCode.INVALID_PARAMETER,
    defaultMessage: 'Invalid parameter value',
    httpStatus: 400,
    isRetryable: false,
    category: 'validation',
  },

  // Rate limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    defaultMessage: 'Rate limit exceeded',
    httpStatus: 429,
    isRetryable: true,
    category: 'rate_limit',
  },
  [ErrorCode.AI_QUOTA_EXCEEDED]: {
    code: ErrorCode.AI_QUOTA_EXCEEDED,
    defaultMessage: 'AI generation quota exceeded',
    httpStatus: 429,
    isRetryable: true,
    category: 'rate_limit',
  },

  // AI Generation
  [ErrorCode.AI_GENERATION_FAILED]: {
    code: ErrorCode.AI_GENERATION_FAILED,
    defaultMessage: 'AI generation failed',
    httpStatus: 500,
    isRetryable: true,
    category: 'ai',
  },
  [ErrorCode.MODEL_UNAVAILABLE]: {
    code: ErrorCode.MODEL_UNAVAILABLE,
    defaultMessage: 'AI model temporarily unavailable',
    httpStatus: 503,
    isRetryable: true,
    category: 'ai',
  },
  [ErrorCode.AI_TIMEOUT]: {
    code: ErrorCode.AI_TIMEOUT,
    defaultMessage: 'AI generation timed out',
    httpStatus: 504,
    isRetryable: true,
    category: 'ai',
  },
  [ErrorCode.AI_INVALID_RESPONSE]: {
    code: ErrorCode.AI_INVALID_RESPONSE,
    defaultMessage: 'AI returned invalid response format',
    httpStatus: 500,
    isRetryable: true,
    category: 'ai',
  },

  // Cache
  [ErrorCode.CACHE_READ_FAILED]: {
    code: ErrorCode.CACHE_READ_FAILED,
    defaultMessage: 'Failed to read from cache',
    httpStatus: 500,
    isRetryable: true,
    category: 'cache',
  },
  [ErrorCode.CACHE_WRITE_FAILED]: {
    code: ErrorCode.CACHE_WRITE_FAILED,
    defaultMessage: 'Failed to write to cache',
    httpStatus: 500,
    isRetryable: true,
    category: 'cache',
  },

  // Database
  [ErrorCode.DATABASE_ERROR]: {
    code: ErrorCode.DATABASE_ERROR,
    defaultMessage: 'Database operation failed',
    httpStatus: 500,
    isRetryable: true,
    category: 'database',
  },
  [ErrorCode.DATABASE_CONNECTION_FAILED]: {
    code: ErrorCode.DATABASE_CONNECTION_FAILED,
    defaultMessage: 'Failed to connect to database',
    httpStatus: 503,
    isRetryable: true,
    category: 'database',
  },
  [ErrorCode.SUPABASE_ERROR]: {
    code: ErrorCode.SUPABASE_ERROR,
    defaultMessage: 'Supabase operation failed',
    httpStatus: 500,
    isRetryable: true,
    category: 'database',
  },
  [ErrorCode.QUERY_FAILED]: {
    code: ErrorCode.QUERY_FAILED,
    defaultMessage: 'Database query failed',
    httpStatus: 500,
    isRetryable: true,
    category: 'database',
  },

  // Media
  [ErrorCode.MEDIA_NOT_FOUND]: {
    code: ErrorCode.MEDIA_NOT_FOUND,
    defaultMessage: 'Media file not found',
    httpStatus: 404,
    isRetryable: false,
    category: 'media',
  },
  [ErrorCode.MEDIA_FETCH_FAILED]: {
    code: ErrorCode.MEDIA_FETCH_FAILED,
    defaultMessage: 'Failed to fetch media file',
    httpStatus: 500,
    isRetryable: true,
    category: 'media',
  },
  [ErrorCode.MEDIA_UPLOAD_FAILED]: {
    code: ErrorCode.MEDIA_UPLOAD_FAILED,
    defaultMessage: 'Failed to upload media file',
    httpStatus: 500,
    isRetryable: true,
    category: 'media',
  },
  [ErrorCode.FILE_TOO_LARGE]: {
    code: ErrorCode.FILE_TOO_LARGE,
    defaultMessage: 'File size exceeds maximum allowed',
    httpStatus: 413,
    isRetryable: false,
    category: 'media',
  },
  [ErrorCode.INVALID_FILE_TYPE]: {
    code: ErrorCode.INVALID_FILE_TYPE,
    defaultMessage: 'Invalid file type',
    httpStatus: 400,
    isRetryable: false,
    category: 'media',
  },
  [ErrorCode.MEDIA_DELETE_FAILED]: {
    code: ErrorCode.MEDIA_DELETE_FAILED,
    defaultMessage: 'Failed to delete media file',
    httpStatus: 500,
    isRetryable: true,
    category: 'media',
  },

  // Resources
  [ErrorCode.NOT_FOUND]: {
    code: ErrorCode.NOT_FOUND,
    defaultMessage: 'Resource not found',
    httpStatus: 404,
    isRetryable: false,
    category: 'resource',
  },
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: {
    code: ErrorCode.RESOURCE_ALREADY_EXISTS,
    defaultMessage: 'Resource already exists',
    httpStatus: 409,
    isRetryable: false,
    category: 'resource',
  },

  // Internal
  [ErrorCode.INTERNAL_ERROR]: {
    code: ErrorCode.INTERNAL_ERROR,
    defaultMessage: 'Internal server error',
    httpStatus: 500,
    isRetryable: true,
    category: 'internal',
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    code: ErrorCode.SERVICE_UNAVAILABLE,
    defaultMessage: 'Service temporarily unavailable',
    httpStatus: 503,
    isRetryable: true,
    category: 'internal',
  },
  [ErrorCode.TIMEOUT]: {
    code: ErrorCode.TIMEOUT,
    defaultMessage: 'Request timeout',
    httpStatus: 504,
    isRetryable: true,
    category: 'internal',
  },
};

/**
 * Get error metadata by code
 */
export function getErrorMetadata(code: ErrorCode): ErrorCodeMetadata {
  return ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS[ErrorCode.INTERNAL_ERROR];
}
