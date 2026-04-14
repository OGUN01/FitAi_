/**
 * aiProvider.ts — Centralised AI model provider factory
 *
 * Strategy (in priority order):
 *  1. Vercel AI Gateway  — when AI_GATEWAY_API_KEY is set (vck_ or v1_ token)
 *  2. @ai-sdk/google via Cloudflare AI Gateway — when GEMINI_API_KEY is set
 *     Routes through CLOUDFLARE_AI_GATEWAY_URL for caching + observability.
 *  3. @ai-sdk/google direct — bare Gemini API (final fallback)
 *
 * All three produce the same LanguageModel interface consumed by generateObject /
 * generateText / streamText — callers don't need to know which path was chosen.
 */

import { createGateway } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { Env } from './types';

/**
 * Map Vercel AI Gateway model IDs  (e.g. "google/gemini-2.5-flash")
 * to bare Google model IDs         (e.g. "gemini-2.5-flash")
 * when falling back to @ai-sdk/google.
 */
function toGoogleModelId(modelId: string): string {
	// "google/gemini-2.5-flash" → "gemini-2.5-flash"
	if (modelId.startsWith('google/')) return modelId.slice('google/'.length);
	// Already bare (e.g. "gemini-2.0-flash-exp")
	return modelId;
}

/**
 * Returns a LanguageModel instance for the given model ID.
 * Automatically selects the best available provider based on env secrets.
 */
export function createAIProvider(env: Env, modelId?: string) {
	const model = modelId || 'google/gemini-2.5-flash';

	// ── Path 1: Vercel AI Gateway ────────────────────────────────────────────
	if (env.AI_GATEWAY_API_KEY) {
		try {
			const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
			console.log(`[AIProvider] Using Vercel AI Gateway → model=${model}`);
			return gateway(model);
		} catch (err) {
			console.warn('[AIProvider] Vercel AI Gateway init failed, falling back to Google:', err);
		}
	}

	// ── Path 2: @ai-sdk/google via Cloudflare AI Gateway ───────────────────
	const googleModelId = toGoogleModelId(model);

	if (env.GEMINI_API_KEY && env.CLOUDFLARE_AI_GATEWAY_URL) {
		// Cloudflare AI Gateway URL pattern for Google:
		// https://gateway.ai.cloudflare.com/v1/<account>/<slug>/google-ai-studio
		const cfGoogleBaseUrl = `${env.CLOUDFLARE_AI_GATEWAY_URL}/google-ai-studio/v1`;
		const google = createGoogleGenerativeAI({
			apiKey: env.GEMINI_API_KEY,
			baseURL: cfGoogleBaseUrl,
		});
		console.log(`[AIProvider] Using @ai-sdk/google via Cloudflare AI Gateway → model=${googleModelId}`);
		return google(googleModelId);
	}

	// ── Path 3: @ai-sdk/google direct (final fallback) ─────────────────────
	if (env.GEMINI_API_KEY) {
		const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
		console.log(`[AIProvider] Using @ai-sdk/google direct → model=${googleModelId}`);
		return google(googleModelId);
	}

	// Nothing configured — throw early so the error is clear
	throw new Error(
		'[AIProvider] No AI provider configured. Set AI_GATEWAY_API_KEY (Vercel) or GEMINI_API_KEY (Google).',
	);
}
