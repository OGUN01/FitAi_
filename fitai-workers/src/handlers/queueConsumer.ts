/**
 * FitAI Workers - Queue Consumer Handler
 *
 * Processes diet generation jobs from the DIET_GENERATION_QUEUE.
 * Runs in background with up to 5 minutes execution time.
 */

import { Env, DietJobMessage } from '../utils/types';
import { updateJobStatus } from '../services/jobService';
import { loadUserMetrics, loadUserProfile, loadUserPreferences } from '../services/userMetricsService';
import { buildDietPrompt } from '../prompts/diet';
import { DietResponseSchema } from '../utils/validation';
import { adjustForProteinTarget } from '../utils/portionAdjustment';
import { saveCachedData, CacheMetadata } from '../utils/cache';
import { generateObject } from 'ai';
import { createGateway } from 'ai';

// ============================================================================
// AI PROVIDER (copied from dietGeneration.ts)
// ============================================================================

function createAIProvider(env: Env, modelId: string) {
	// Create gateway instance with explicit API key for Cloudflare Workers
	const gatewayInstance = createGateway({
		apiKey: env.AI_GATEWAY_API_KEY,
	});

	// Return model from gateway - use gemini-2.5-flash which is confirmed working
	const model = modelId || 'google/gemini-2.5-flash';
	return gatewayInstance(model);
}

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

			// 2. Load user data from database
			const [metrics, profile, preferences] = await Promise.all([
				loadUserMetrics(env, userId),
				loadUserProfile(env, userId),
				loadUserPreferences(env, userId),
			]);

			console.log(`[QueueConsumer] Loaded user data for ${userId}:`, {
				calories: metrics.daily_calories,
				protein: metrics.daily_protein_g,
				dietType: preferences.diet?.diet_type,
			});

			// 3. Build AI prompt
			const prompt = buildDietPrompt(metrics, profile, preferences.diet, params.daysCount || 1);

			// 4. Generate with AI (the slow part - 30-120s)
			const model = createAIProvider(env, params.model || 'google/gemini-2.5-flash');

			console.log(`[QueueConsumer] Calling AI model: ${params.model || 'google/gemini-2.5-flash'}`);
			const aiStartTime = Date.now();

			const result = await generateObject({
				model,
				schema: DietResponseSchema,
				prompt,
				temperature: params.temperature || 0.7,
			});

			const aiGenerationTime = Date.now() - aiStartTime;
			console.log(`[QueueConsumer] AI generation completed in ${aiGenerationTime}ms`);

			// 5. Validate response
			if (!result.object || !result.object.meals || result.object.meals.length === 0) {
				throw new Error('AI returned empty or invalid response');
			}

			// 6. Adjust portions to match targets
			const adjustedDiet = adjustForProteinTarget(result.object, metrics.daily_calories, metrics.daily_protein_g);

			// 7. Prepare final result
			const finalResult = {
				...adjustedDiet,
				generatedAt: new Date().toISOString(),
				metadata: {
					model: params.model || 'google/gemini-2.5-flash',
					aiGenerationTime,
					tokensUsed: result.usage?.totalTokens,
					validationPassed: true,
				},
			};

			// 8. Save to cache (KV + DB)
			const cacheMetadata: CacheMetadata = {
				modelUsed: params.model || 'google/gemini-2.5-flash',
				generationTimeMs: aiGenerationTime,
				tokensUsed: result.usage?.totalTokens,
			};

			await saveCachedData(env, 'meal', cacheKey, finalResult, cacheMetadata, userId);

			// 9. Update job as completed
			const totalTime = Date.now() - startTime;
			await updateJobStatus(env, jobId, 'completed', {
				completed_at: new Date().toISOString(),
				result_data: finalResult,
				generation_time_ms: totalTime,
				ai_model: params.model || 'google/gemini-2.5-flash',
			});

			console.log(`[QueueConsumer] Job ${jobId} completed successfully in ${totalTime}ms`);

			// 10. Acknowledge message (success)
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
