export { ErrorCode } from './errorCodes';
/**
 * FitAI Workers - TypeScript Type Definitions
 *
 * This file contains all TypeScript types and interfaces for the FitAI Cloudflare Workers API
 */

// ============================================================================
// CLOUDFLARE ENVIRONMENT BINDINGS
// ============================================================================

// Forward declare type for Env interface
export interface DietJobMessage {
	jobId: string;
	userId: string;
	cacheKey: string;
	params: {
		calorieTarget: number;
		mealsPerDay: number;
		daysCount: number;
		macros?: { protein: number; carbs: number; fats: number };
		dietaryRestrictions?: string[];
		excludeIngredients?: string[];
		model?: string;
		temperature?: number;
	};
	metadata: {
		createdAt: string;
		priority: number;
	};
}

/**
 * Cloudflare Worker Environment Bindings
 * Includes KV namespaces, R2 buckets, secrets, and public variables
 */
export interface Env {
	// KV Namespaces
	WORKOUT_CACHE: KVNamespace;
	MEAL_CACHE: KVNamespace;
	RATE_LIMIT_KV: KVNamespace;

	// R2 Buckets
	FITAI_MEDIA: R2Bucket;

	// Queue Bindings (optional - requires paid plan)
	DIET_GENERATION_QUEUE?: Queue<DietJobMessage>;

	// Secrets (set via wrangler secret put)
	AI_GATEWAY_API_KEY: string;
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;

	// Public Variables (from wrangler.jsonc vars)
	VERCEL_AI_GATEWAY_URL: string;
	CLOUDFLARE_AI_GATEWAY_ACCOUNT_ID: string;
	CLOUDFLARE_AI_GATEWAY_SLUG: string;
	CLOUDFLARE_AI_GATEWAY_URL: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Standard API response format
 */
export interface APIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	metadata?: {
		model?: string;
		generationTime?: number;
		cached?: boolean;
		cacheSource?: 'kv' | 'database' | 'client';
	};
}

/**
 * Workout generation request
 */
export interface WorkoutGenerationRequest {
	goals: string[];
	fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
	equipment: string[];
	duration: number;
	targetBodyParts?: string[];
	preferences?: {
		workoutStyle?: string;
		restBetweenSets?: number;
	};
}

/**
 * Diet/meal generation request
 */
export interface DietGenerationRequest {
	calories: number;
	dietType: string;
	allergies: string[];
	preferences: string[];
	mealsPerDay: number;
	restrictions?: {
		maxCarbs?: number;
		minProtein?: number;
	};
}

/**
 * AI chat request
 */
export interface ChatRequest {
	message: string;
	conversationId?: string;
	context?: {
		currentWorkout?: string;
		fitnessLevel?: string;
	};
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cached workout data structure
 */
export interface CachedWorkout {
	cache_key: string;
	workout_data: any;
	model_used: string;
	generation_time_ms: number;
	tokens_used: number;
	cost_usd: number;
	hit_count: number;
	last_accessed: string;
	created_at: string;
}

/**
 * Cached meal data structure
 */
export interface CachedMeal {
	cache_key: string;
	meal_data: any;
	model_used: string;
	generation_time_ms: number;
	tokens_used: number;
	cost_usd: number;
	hit_count: number;
	last_accessed: string;
	created_at: string;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

/**
 * Service status for health check
 */
export interface ServiceStatus {
	status: 'up' | 'down' | 'degraded';
	latency?: number;
	error?: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
	status: 'healthy' | 'unhealthy' | 'degraded';
	version: string;
	uptime: number;
	timestamp: string;
	services: {
		cloudflare_kv: ServiceStatus;
		cloudflare_r2: ServiceStatus;
		supabase: ServiceStatus;
	};
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * HTTP status codes enum
 */
export enum HTTPStatus {
	OK = 200,
	CREATED = 201,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	RATE_LIMIT_EXCEEDED = 429,
	INTERNAL_SERVER_ERROR = 500,
	SERVICE_UNAVAILABLE = 503,
}

// ============================================================================
// ASYNC JOB TYPES
// ============================================================================

/**
 * Job status values
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Job status response for GET /diet/jobs/:jobId
 */
export interface JobStatusResponse {
	/** Job identifier */
	jobId: string;

	/** Current status */
	status: JobStatus;

	/** Estimated time remaining in seconds (for pending/processing) */
	estimatedTime?: number;

	/** Progress percentage 0-100 (optional) */
	progress?: number;

	/** Completed result (only when status === 'completed') */
	result?: any;

	/** Error details (only when status === 'failed') */
	error?: {
		code: string;
		message: string;
		isRetryable: boolean;
	};

	/** Timing metadata */
	metadata: {
		createdAt: string;
		startedAt?: string;
		completedAt?: string;
		generationTimeMs?: number;
	};
}

/**
 * Job list item (for GET /diet/jobs)
 */
export interface JobListItem {
	id: string;
	status: JobStatus;
	created_at: string;
	completed_at?: string;
	generation_time_ms?: number;
}
