/**
 * FitAI Workers - Job Service
 *
 * Manages meal generation job lifecycle with hybrid storage:
 * - KV: Fast status reads (< 5ms)
 * - Supabase: Persistence & history
 */

import { Env, DietJobMessage, JobStatusResponse, JobStatus } from '../utils/types';
import { getSupabaseClient } from '../utils/supabase';
import { APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

// KV key pattern for job status
const JOB_KV_PREFIX = 'job:';
const JOB_KV_TTL = 3600; // 1 hour

// ============================================================================
// CREATE JOB
// ============================================================================

/**
 * Create a new job record in DB and KV
 * Returns existing job ID if one is already in progress
 */
export async function createJob(
	env: Env,
	userId: string,
	cacheKey: string,
	params: DietJobMessage['params'],
): Promise<{ jobId: string; isExisting: boolean }> {
	const supabase = getSupabaseClient(env);

	// Check for existing active job for this user
	const { data: existing } = await supabase
		.from('meal_generation_jobs')
		.select('id, status, cache_key')
		.eq('user_id', userId)
		.in('status', ['pending', 'processing'])
		.single();

	if (existing) {
		console.log(`[JobService] Found existing job ${existing.id} for user ${userId}`);
		return { jobId: existing.id, isExisting: true };
	}

	// Create new job in database
	const { data, error } = await supabase
		.from('meal_generation_jobs')
		.insert({
			user_id: userId,
			cache_key: cacheKey,
			generation_params: params,
			status: 'pending',
			priority: 0,
			max_retries: 1,
		})
		.select('id')
		.single();

	if (error) {
		console.error('[JobService] Failed to create job:', error);
		throw new APIError('Failed to create job', 500, ErrorCode.DATABASE_ERROR, { error: error.message });
	}

	const jobId = data.id;

	// Store initial status in KV for fast reads
	await env.MEAL_CACHE.put(
		`${JOB_KV_PREFIX}${jobId}`,
		JSON.stringify({
			jobId,
			userId,
			status: 'pending',
			createdAt: new Date().toISOString(),
		}),
		{ expirationTtl: JOB_KV_TTL },
	);

	console.log(`[JobService] Created job ${jobId} for user ${userId}`);
	return { jobId, isExisting: false };
}

// ============================================================================
// GET JOB STATUS
// ============================================================================

/**
 * Get job status (KV first, then DB fallback)
 */
export async function getJobStatus(env: Env, jobId: string, userId: string): Promise<JobStatusResponse> {
	// Try KV first (fast path)
	const kvData = await env.MEAL_CACHE.get(`${JOB_KV_PREFIX}${jobId}`);

	if (kvData) {
		const cached = JSON.parse(kvData);

		// Verify user owns this job
		if (cached.userId !== userId) {
			throw new APIError('Job not found', 404, ErrorCode.JOB_NOT_FOUND);
		}

		// If completed/failed, fetch full result from DB
		if (cached.status === 'completed' || cached.status === 'failed') {
			return getJobFromDatabase(env, jobId, userId);
		}

		// Return cached status for pending/processing
		return {
			jobId,
			status: cached.status,
			estimatedTime: estimateTimeRemaining(cached.status, cached.createdAt, cached.startedAt),
			metadata: {
				createdAt: cached.createdAt,
				startedAt: cached.startedAt,
			},
		};
	}

	// Fallback to database
	return getJobFromDatabase(env, jobId, userId);
}

/**
 * Get full job details from database
 */
async function getJobFromDatabase(env: Env, jobId: string, userId: string): Promise<JobStatusResponse> {
	const supabase = getSupabaseClient(env);

	const { data, error } = await supabase.from('meal_generation_jobs').select('*').eq('id', jobId).eq('user_id', userId).single();

	if (error || !data) {
		throw new APIError('Job not found', 404, ErrorCode.JOB_NOT_FOUND);
	}

	return {
		jobId: data.id,
		status: data.status as JobStatus,
		estimatedTime: estimateTimeRemaining(data.status, data.created_at, data.started_at),
		result: data.result_data,
		error: data.error_message
			? {
					code: data.error_code || 'UNKNOWN_ERROR',
					message: data.error_message,
					isRetryable: data.retry_count < data.max_retries,
				}
			: undefined,
		metadata: {
			createdAt: data.created_at,
			startedAt: data.started_at,
			completedAt: data.completed_at,
			generationTimeMs: data.generation_time_ms,
		},
	};
}

// ============================================================================
// UPDATE JOB STATUS
// ============================================================================

/**
 * Update job status in both DB and KV
 */
export async function updateJobStatus(
	env: Env,
	jobId: string,
	status: JobStatus,
	updates: Partial<{
		started_at: string;
		completed_at: string;
		result_data: any;
		error_code: string;
		error_message: string;
		error_details: any;
		generation_time_ms: number;
		ai_model: string;
		retry_count: number;
	}> = {},
): Promise<void> {
	const supabase = getSupabaseClient(env);

	// Update database
	const { error } = await supabase
		.from('meal_generation_jobs')
		.update({ status, ...updates })
		.eq('id', jobId);

	if (error) {
		console.error(`[JobService] Failed to update job ${jobId}:`, error);
	}

	// Update KV cache
	const kvKey = `${JOB_KV_PREFIX}${jobId}`;
	const existingData = await env.MEAL_CACHE.get(kvKey);

	if (existingData) {
		const cached = JSON.parse(existingData);
		await env.MEAL_CACHE.put(
			kvKey,
			JSON.stringify({
				...cached,
				status,
				startedAt: updates.started_at || cached.startedAt,
				completedAt: updates.completed_at,
			}),
			{ expirationTtl: JOB_KV_TTL },
		);
	}

	console.log(`[JobService] Updated job ${jobId} to status: ${status}`);
}

// ============================================================================
// LIST USER JOBS
// ============================================================================

/**
 * List recent jobs for a user
 */
export async function listUserJobs(env: Env, userId: string, limit: number = 20): Promise<{ jobs: any[] }> {
	const supabase = getSupabaseClient(env);

	const { data, error } = await supabase
		.from('meal_generation_jobs')
		.select('id, status, created_at, completed_at, generation_time_ms')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		console.error('[JobService] Failed to list jobs:', error);
		throw new APIError('Failed to list jobs', 500, ErrorCode.DATABASE_ERROR);
	}

	return { jobs: data || [] };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate time remaining based on status and timestamps
 */
function estimateTimeRemaining(status: string, createdAt: string, startedAt?: string): number {
	if (status === 'completed' || status === 'failed') return 0;

	const now = Date.now();
	const avgGenerationTime = 60000; // 60 seconds average

	if (status === 'pending') {
		const waitTime = now - new Date(createdAt).getTime();
		// Estimate: avg time minus how long we've been waiting
		return Math.max(5, Math.floor((avgGenerationTime - waitTime) / 1000));
	}

	if (status === 'processing' && startedAt) {
		const processingTime = now - new Date(startedAt).getTime();
		// Estimate: remaining processing time
		return Math.max(5, Math.floor((avgGenerationTime - processingTime) / 1000));
	}

	return 60; // Default estimate
}
