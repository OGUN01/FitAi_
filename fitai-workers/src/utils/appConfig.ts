/**
 * FitAI Workers - Dynamic App Config
 *
 * Reads AI/app configuration from the app_config Supabase table.
 * Results are cached in RATE_LIMIT_KV for 5 minutes to avoid
 * a DB round-trip on every AI generation request.
 */

import { Env } from './types';
import { getSupabaseClient } from './supabase';

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

const AI_CONFIG_CACHE_KEY = 'app_config:ai';
const AI_CONFIG_TTL_SECONDS = 300; // 5 minutes

/**
 * Get AI configuration from app_config table (cached in KV).
 *
 * Falls back to hard-coded defaults if the table is unreachable or
 * the keys are missing, so generation always works even before the
 * migration is applied.
 */
export async function getAIConfig(env: Env): Promise<AIConfig> {
  // Try KV cache first
  try {
    const cached = await env.RATE_LIMIT_KV.get<AIConfig>(AI_CONFIG_CACHE_KEY, 'json');
    if (cached) return cached;
  } catch {
    // KV unavailable — fall through to DB
  }

  // Fetch from Supabase
  try {
    const supabase = getSupabaseClient(env);
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['ai_model', 'ai_temperature', 'ai_max_tokens']);

    if (!error && data) {
      const m: Record<string, unknown> = {};
      for (const row of data) m[row.key] = row.value;

      const config: AIConfig = {
        model: (m['ai_model'] as string) ?? 'google/gemini-2.0-flash-exp',
        temperature: Number(m['ai_temperature'] ?? 0.7),
        maxTokens: Number(m['ai_max_tokens'] ?? 8192),
      };

      // Cache the result
      try {
        await env.RATE_LIMIT_KV.put(
          AI_CONFIG_CACHE_KEY,
          JSON.stringify(config),
          { expirationTtl: AI_CONFIG_TTL_SECONDS },
        );
      } catch {
        // Ignore KV write errors
      }

      return config;
    }
  } catch {
    // DB unavailable — return defaults below
  }

  // Hard-coded defaults
  return {
    model: 'google/gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 8192,
  };
}

/**
 * Invalidate the cached AI config so the next request re-reads from DB.
 * Called by the admin config handler after a config update.
 */
export async function invalidateAIConfigCache(env: Env): Promise<void> {
  try {
    await env.RATE_LIMIT_KV.delete(AI_CONFIG_CACHE_KEY);
  } catch {
    // Ignore
  }
}
