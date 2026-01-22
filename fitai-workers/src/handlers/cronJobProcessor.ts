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
import { createClient } from '@supabase/supabase-js';

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

		// 2. Find oldest pending job
		const { data: pendingJobs, error: fetchError } = await supabase
			.from('meal_generation_jobs')
			.select('id, user_id, cache_key, generation_params')
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
		console.log(`[CronJobProcessor] Processing job ${job.id}`);

		// 2. Import queue consumer and process the job
		const { consumeDietJobs } = await import('./queueConsumer');

		// Create a mock message batch for the job
		const mockBatch = {
			queue: 'fitai-diet-generation-cron',
			messages: [
				{
					id: job.id,
					timestamp: new Date(),
					attempts: 1,
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
						console.log(`[CronJobProcessor] Job ${job.id} retrying with delay ${options?.delaySeconds || 0}s`);
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
 * This can be called via API endpoint for manual job processing
 * Useful for testing or forcing job processing
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

		// Find pending jobs
		const { data: pendingJobs, error: fetchError } = await supabase
			.from('meal_generation_jobs')
			.select('id, user_id, cache_key, generation_params')
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
				console.log(`[CronJobProcessor] Processing job ${job.id}`);

				const mockBatch = {
					queue: 'fitai-diet-generation-manual',
					messages: [
						{
							id: job.id,
							timestamp: new Date(),
							attempts: 1,
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
								console.log(`[CronJobProcessor] Job ${job.id} retrying`);
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
