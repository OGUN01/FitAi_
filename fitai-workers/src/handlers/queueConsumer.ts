/**
 * FitAI Workers - Queue Consumer Handler
 *
 * Processes diet generation jobs from the DIET_GENERATION_QUEUE.
 * Runs in background with up to 5 minutes execution time.
 */

import { Env, DietJobMessage } from '../utils/types';
import { updateJobStatus } from '../services/jobService';
import { generateFreshDiet } from './dietGeneration';
import { saveCachedData, CacheMetadata } from '../utils/cache';

// ============================================================================
// QUEUE CONSUMER
// ============================================================================

/**
 * Process diet generation jobs from the queue
 *
 * @param batch - MessageBatch from Cloudflare Queue
 * @param env - Worker environment bindings
 */
export async function consumeDietJobs(batch: MessageBatch<DietJobMessage>, env: Env): Promise<void> {
	// Process each message (max_batch_size=1, so typically just one)
	for (const message of batch.messages) {
		const { jobId, userId, cacheKey, params, metadata } = message.body;
		const startTime = Date.now();

		console.log(`[QueueConsumer] Processing job ${jobId} (attempt ${message.attempts})`);

		try {
			// 1. Update status to processing
			await updateJobStatus(env, jobId, 'processing', {
				started_at: new Date().toISOString(),
			});

			// 2. Reuse the main generation pipeline so async jobs and sync requests
			// share the same overrides, validation, prompt context, and adjustments.
			const { diet: adjustedDiet, metadata: generationMetadata } = await generateFreshDiet(
				params as any,
				env,
				userId,
			);

			const aiGenerationTime = generationMetadata.aiGenerationTime;

			// 3. Prepare final result
			const finalResult = {
				...adjustedDiet,
				generatedAt: new Date().toISOString(),
				metadata: {
					...generationMetadata,
				},
			};

			// 4. Save to cache (KV + DB)
			const cacheMetadata: CacheMetadata = {
				modelUsed: params.model || 'google/gemini-2.5-flash',
				generationTimeMs: aiGenerationTime,
				tokensUsed: generationMetadata.tokensUsed,
			};

			await saveCachedData(env, 'meal', cacheKey, finalResult, cacheMetadata, userId);

			// 5. Update job as completed
			const totalTime = Date.now() - startTime;
			await updateJobStatus(env, jobId, 'completed', {
				completed_at: new Date().toISOString(),
				result_data: finalResult,
				generation_time_ms: totalTime,
				ai_model: params.model || 'google/gemini-2.5-flash',
			});

			console.log(`[QueueConsumer] Job ${jobId} completed successfully in ${totalTime}ms`);

			// 6. Acknowledge message (success)
			message.ack();
		} catch (error: any) {
			const totalTime = Date.now() - startTime;
			console.error(`[QueueConsumer] Job ${jobId} failed:`, error);

			// Update job with error details
			await updateJobStatus(env, jobId, 'failed', {
				completed_at: new Date().toISOString(),
				error_code: error.code || 'AI_GENERATION_FAILED',
				error_message: error.message || 'Unknown error during generation',
				error_details: { stack: error.stack },
				generation_time_ms: totalTime,
				retry_count: message.attempts,
			});

			// Retry if not at max attempts
			if (message.attempts < 2) {
				console.log(`[QueueConsumer] Retrying job ${jobId} (attempt ${message.attempts + 1})`);
				message.retry({ delaySeconds: 10 });
			} else {
				console.log(`[QueueConsumer] Job ${jobId} failed permanently after ${message.attempts} attempts`);
				message.ack(); // Give up
			}
		}
	}
}
