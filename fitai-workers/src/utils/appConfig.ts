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

export interface PublicAppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minAppVersion: string;
  forceUpdateVersion: string;
  featureAiChat: boolean;
  featureFoodContributions: boolean;
  featureAnalytics: boolean;
}

const AI_CONFIG_CACHE_KEY = 'app_config:ai';
const PUBLIC_CONFIG_CACHE_KEY = 'app_config:public';
const AI_CONFIG_TTL_SECONDS = 300; // 5 minutes
const PUBLIC_CONFIG_TTL_SECONDS = 300; // 5 minutes

function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function parseStringValue(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

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
 * Get public app configuration from app_config table (cached in KV).
 * These values control guest-safe feature flags and shell gating.
 */
export async function getPublicAppConfig(env: Env): Promise<PublicAppConfig> {
  try {
    const cached = await env.RATE_LIMIT_KV.get<PublicAppConfig>(PUBLIC_CONFIG_CACHE_KEY, 'json');
    if (cached) return cached;
  } catch {
    // KV unavailable — fall through to DB
  }

  try {
    const supabase = getSupabaseClient(env);
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [
        'maintenance_mode',
        'maintenance_message',
        'min_app_version',
        'force_update_version',
        'feature_ai_chat',
        'feature_food_contributions',
        'feature_analytics',
      ]);

    if (!error && data) {
      const m: Record<string, unknown> = {};
      for (const row of data) m[row.key] = row.value;

      const config: PublicAppConfig = {
        maintenanceMode: parseBooleanValue(m['maintenance_mode'], false),
        maintenanceMessage: parseStringValue(m['maintenance_message'], 'Back soon!'),
        minAppVersion: parseStringValue(m['min_app_version'], '1.0.0'),
        forceUpdateVersion: parseStringValue(m['force_update_version'], '0.0.0'),
        featureAiChat: parseBooleanValue(m['feature_ai_chat'], false),
        featureFoodContributions: parseBooleanValue(m['feature_food_contributions'], false),
        featureAnalytics: parseBooleanValue(m['feature_analytics'], false),
      };

      try {
        await env.RATE_LIMIT_KV.put(
          PUBLIC_CONFIG_CACHE_KEY,
          JSON.stringify(config),
          { expirationTtl: PUBLIC_CONFIG_TTL_SECONDS },
        );
      } catch {
        // Ignore KV write errors
      }

      return config;
    }
  } catch {
    // DB unavailable — return defaults below
  }

  return {
    maintenanceMode: false,
    maintenanceMessage: 'Back soon!',
    minAppVersion: '1.0.0',
    forceUpdateVersion: '0.0.0',
    featureAiChat: false,
    featureFoodContributions: false,
    featureAnalytics: false,
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

export async function invalidatePublicAppConfigCache(env: Env): Promise<void> {
  try {
    await env.RATE_LIMIT_KV.delete(PUBLIC_CONFIG_CACHE_KEY);
  } catch {
    // Ignore
  }
}
