/**
 * FitAI Workers - Cron Job Processor
 *
 * FREE PLAN FALLBACK: Processes pending diet generation jobs via scheduled cron
 * Runs every 1 minute to check for pending jobs and process them
 *
 * This is a fallback for the queue-based system when Cloudflare Queues are unavailable.
 * When you upgrade to paid plan, queues will take over automatically.
 */

import { Env } from '../utils/types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// A job orphaned in 'processing' (Worker hit the CPU/wall-clock limit mid
// AI-call, threw before queueConsumer's own try/catch ran, or the isolate
// was evicted) is never reclaimed by anything else — queueConsumer.ts only
// writes 'processing' -> 'completed'/'failed'; nothing sweeps a row that
// never got that follow-up write. Left alone, createJob()'s dedup check
// (`status IN ('pending','processing')`) keeps returning that same dead
// job's id forever, permanently blocking the user from generating a new
// plan. 5 minutes matches queueConsumer's documented "up to 5 minutes
// execution time" budget.
const STALE_PROCESSING_MS = 5 * 60 * 1000;

/**
 * Reclaim jobs orphaned in status='processing'.
 *
 * A job whose retry_count is already >= max_retries is terminated as
 * 'failed' (so createJob()'s dedup no longer matches it and the user is
 * unblocked). Otherwise it's reset to 'pending' with retry_count bumped, so
 * a job that keeps timing out still terminates instead of looping forever.
 */
async function reclaimStaleProcessingJobs(supabase: SupabaseClient): Promise<void> {
	const { data: processingJobs, error: fetchError } = await supabase
		.from('meal_generation_jobs')
		.select('id, retry_count, max_retries, started_at, created_at')
		.eq('status', 'processing')
		.limit(50);

	if (fetchError) {
		console.error('[CronJobProcessor] Error fetching processing jobs for staleness sweep:', fetchError);
		return;
	}

	const staleJobs = (processingJobs ?? []).filter((job) => {
		// started_at is set by queueConsumer once it actually begins work; use
		// created_at as a fallback for the narrow window between claiming a
		// job (status='processing') and started_at being written.
		const reference = job.started_at ?? job.created_at;
		if (!reference) return false;
		return Date.now() - new Date(reference).getTime() > STALE_PROCESSING_MS;
	});

	if (staleJobs.length === 0) return;

	for (const job of staleJobs) {
		const retryCount = job.retry_count ?? 0;
		const maxRetries = job.max_retries ?? 1;

		if (retryCount >= maxRetries) {
			console.error(`[CronJobProcessor] Job ${job.id} orphaned in 'processing' and exhausted retries (${retryCount}/${maxRetries}) — marking failed`);
			const { error } = await supabase
				.from('meal_generation_jobs')
				.update({
					status: 'failed',
					error_code: 'JOB_TIMEOUT',
					error_message: `Job orphaned in 'processing' for over ${STALE_PROCESSING_MS / 60000} minutes and exceeded max retries`,
					completed_at: new Date().toISOString(),
				})
				.eq('id', job.id)
				.eq('status', 'processing'); // guard against a concurrent invocation finishing it first

			if (error) console.error(`[CronJobProcessor] Failed to mark stale job ${job.id} as failed:`, error);
		} else {
			console.log(`[CronJobProcessor] Job ${job.id} orphaned in 'processing' — reclaiming to pending (retry ${retryCount + 1}/${maxRetries})`);
			const { error } = await supabase
				.from('meal_generation_jobs')
				.update({ status: 'pending', retry_count: retryCount + 1 })
				.eq('id', job.id)
				.eq('status', 'processing');

			if (error) console.error(`[CronJobProcessor] Failed to reclaim stale job ${job.id}:`, error);
		}
	}
}

/**
 * Process pending diet generation jobs (cron fallback)
 *
 * Called by Cloudflare Cron Trigger every 1 minute
 * Finds oldest pending job and processes it
 *
 * @param env - Worker environment bindings
 */
export async function processPendingJobs(env: Env): Promise<void> {
	const startTime = Date.now();
	console.log('[CronJobProcessor] Starting scheduled job processing');

	try {
		// 1. Create Supabase client
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

		// 1b. Reclaim any job orphaned in 'processing' by a prior invocation
		// before looking for pending work — otherwise those users stay
		// permanently blocked (see reclaimStaleProcessingJobs doc comment).
		await reclaimStaleProcessingJobs(supabase);

		// 2. Find oldest pending job (include retry_count so attempts reflects reality)
		const { data: pendingJobs, error: fetchError } = await supabase
			.from('meal_generation_jobs')
			.select('id, user_id, cache_key, generation_params, retry_count')
			.eq('status', 'pending')
			.order('created_at', { ascending: true })
			.limit(1);

		if (fetchError) {
			console.error('[CronJobProcessor] Error fetching pending jobs:', fetchError);
			return;
		}

		if (!pendingJobs || pendingJobs.length === 0) {
			console.log('[CronJobProcessor] No pending jobs found');
			return;
		}

		const job = pendingJobs[0];

		// 2b. Atomically claim the job before processing. The Cron Trigger fires
		// every 1 minute; if a diet-generation AI call from the previous tick is
		// still in flight past that minute, the next tick's SELECT above can see
		// the same still-'pending' row before the prior invocation's status write
		// lands, which would send the same job to the (paid) AI provider twice.
		// This UPDATE ... WHERE status='pending' only succeeds for whichever
		// invocation gets there first — Postgres row-level locking makes the
		// claim atomic, unlike a plain SELECT-then-UPDATE.
		const { data: claimed, error: claimError } = await supabase
			.from('meal_generation_jobs')
			.update({ status: 'processing' })
			.eq('id', job.id)
			.eq('status', 'pending')
			.select('id');

		if (claimError) {
			console.error(`[CronJobProcessor] Failed to claim job ${job.id}:`, claimError);
			return;
		}

		if (!claimed || claimed.length === 0) {
			console.log(`[CronJobProcessor] Job ${job.id} already claimed by another invocation — skipping`);
			return;
		}

		console.log(`[CronJobProcessor] Processing job ${job.id}`);

		// 2. Import queue consumer and process the job
		const { consumeDietJobs } = await import('./queueConsumer');

		// attempts is 1-based: first try = 1, first retry = 2, etc.
		// consumeDietJobs retries only when attempts < 2, so a job that has
		// already been retried once (retry_count=1 → attempts=2) will be acked
		// (left as 'failed') instead of looping forever.
		const attempts = (job.retry_count ?? 0) + 1;

		// Create a mock message batch for the job
		const mockBatch = {
			queue: 'fitai-diet-generation-cron',
			messages: [
				{
					id: job.id,
					timestamp: new Date(),
					attempts,
					body: {
						jobId: job.id,
						userId: job.user_id,
						cacheKey: job.cache_key,
						params: job.generation_params,
						metadata: {
							createdAt: new Date().toISOString(),
							priority: 0,
						},
					},
					ack: async () => {
						console.log(`[CronJobProcessor] Job ${job.id} acknowledged`);
					},
					retry: async (options?: { delaySeconds?: number }) => {
						// The queue consumer already marked the job 'failed' + set
						// retry_count. Reset it to 'pending' so the next cron tick
						// reprocesses it — otherwise a transient AI error strands the
						// job in 'failed' forever (free-plan has no real queue retry).
						console.log(`[CronJobProcessor] Job ${job.id} retrying with delay ${options?.delaySeconds || 0}s — resetting to pending`);
						try {
							await supabase
								.from('meal_generation_jobs')
								.update({ status: 'pending' })
								.eq('id', job.id);
						} catch (resetErr) {
							console.error(`[CronJobProcessor] Failed to reset job ${job.id} to pending:`, resetErr);
						}
					},
				},
			],
			ackAll: async () => {
				console.log('[CronJobProcessor] All messages acknowledged');
			},
			retryAll: async (options?: { delaySeconds?: number }) => {
				console.log(`[CronJobProcessor] All messages retrying with delay ${options?.delaySeconds || 0}s`);
			},
		};

		// @ts-ignore - Mock batch compatible with MessageBatch interface
		await consumeDietJobs(mockBatch, env);

		const duration = Date.now() - startTime;
		console.log(`[CronJobProcessor] Completed in ${duration}ms`);
	} catch (error) {
		console.error('[CronJobProcessor] Error processing jobs:', error);
	}
}

/**
 * Manually trigger job processing (admin endpoint)
 *
 * Wired to POST /api/admin/jobs/process-now (see admin.ts handleProcessJobsNow)
 * so an operator can force a pending backlog through outside the 1-minute
 * cron tick. Useful for testing or forcing job processing.
 *
 * @param env - Worker environment bindings
 * @param limit - Maximum number of jobs to process (default: 5)
 */
export async function processJobsManually(env: Env, limit: number = 5): Promise<{ processed: number; errors: number }> {
	console.log(`[CronJobProcessor] Manual processing - limit ${limit}`);

	let processed = 0;
	let errors = 0;

	try {
		// Create Supabase client
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

		// Reclaim any job orphaned in 'processing' before looking for pending
		// work — see reclaimStaleProcessingJobs doc comment.
		await reclaimStaleProcessingJobs(supabase);

		// Find pending jobs (include retry_count so attempts reflects reality)
		const { data: pendingJobs, error: fetchError } = await supabase
			.from('meal_generation_jobs')
			.select('id, user_id, cache_key, generation_params, retry_count')
			.eq('status', 'pending')
			.order('created_at', { ascending: true })
			.limit(limit);

		if (fetchError) {
			console.error('[CronJobProcessor] Error fetching pending jobs:', fetchError);
			throw fetchError;
		}

		if (!pendingJobs || pendingJobs.length === 0) {
			console.log('[CronJobProcessor] No pending jobs found');
			return { processed: 0, errors: 0 };
		}

		console.log(`[CronJobProcessor] Found ${pendingJobs.length} pending jobs`);

		// Import consumer
		const { consumeDietJobs } = await import('./queueConsumer');

		// Process each job
		for (const job of pendingJobs) {
			try {
				// Atomically claim the job before processing — see the matching
				// comment in processPendingJobs() for why a plain status check
				// here isn't enough to prevent a job being processed twice.
				const { data: claimed, error: claimError } = await supabase
					.from('meal_generation_jobs')
					.update({ status: 'processing' })
					.eq('id', job.id)
					.eq('status', 'pending')
					.select('id');

				if (claimError) {
					console.error(`[CronJobProcessor] Failed to claim job ${job.id}:`, claimError);
					errors++;
					continue;
				}

				if (!claimed || claimed.length === 0) {
					console.log(`[CronJobProcessor] Job ${job.id} already claimed by another invocation — skipping`);
					continue;
				}

				console.log(`[CronJobProcessor] Processing job ${job.id}`);

				const attempts = (job.retry_count ?? 0) + 1;

				const mockBatch = {
					queue: 'fitai-diet-generation-manual',
					messages: [
						{
							id: job.id,
							timestamp: new Date(),
							attempts,
							body: {
								jobId: job.id,
								userId: job.user_id,
								cacheKey: job.cache_key,
								params: job.generation_params,
								metadata: {
									createdAt: new Date().toISOString(),
									priority: 0,
								},
							},
							ack: async () => {
								console.log(`[CronJobProcessor] Job ${job.id} acknowledged`);
							},
							retry: async (options?: { delaySeconds?: number }) => {
								// Reset to pending so the next cron tick reprocesses it.
								console.log(`[CronJobProcessor] Job ${job.id} retrying — resetting to pending`);
								try {
									await supabase
										.from('meal_generation_jobs')
										.update({ status: 'pending' })
										.eq('id', job.id);
								} catch (resetErr) {
									console.error(`[CronJobProcessor] Failed to reset job ${job.id} to pending:`, resetErr);
								}
							},
						},
					],
					ackAll: async () => {},
					retryAll: async () => {},
				};

				// @ts-ignore
				await consumeDietJobs(mockBatch, env);
				processed++;
			} catch (error) {
				console.error(`[CronJobProcessor] Error processing job ${job.id}:`, error);
				errors++;
			}
		}

		console.log(`[CronJobProcessor] Manual processing complete - processed: ${processed}, errors: ${errors}`);
		return { processed, errors };
	} catch (error) {
		console.error('[CronJobProcessor] Fatal error in manual processing:', error);
		return { processed, errors: errors + 1 };
	}
}
