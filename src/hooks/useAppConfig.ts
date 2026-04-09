/**
 * useAppConfig — reads public app_config rows (features, app, maintenance)
 * from Supabase. The RLS policy allows public reads for the safe categories
 * below, so no secrets are exposed and guest users can still respect config.
 *
 * Used in App.tsx to:
 *  - Show a maintenance banner and block usage when maintenance_mode = true
 *  - Show a force-update prompt when app version < force_update_version
 *  - Gate feature flags at runtime without a redeploy
 */

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export interface AppConfig {
  // maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
  // app version
  minAppVersion: string;
  forceUpdateVersion: string;
  // feature flags
  featureAiChat: boolean;
  featureFoodContributions: boolean;
  featureAnalytics: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'Back soon!',
  minAppVersion: '1.0.0',
  forceUpdateVersion: '0.0.0',
  featureAiChat: false,
  featureFoodContributions: false,
  featureAnalytics: false,
};

interface UseAppConfigResult {
  config: AppConfig;
  loading: boolean;
  error: string | null;
}

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
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export function useAppConfig(): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const { data, error: dbError } = await supabase
          .from('app_config')
          .select('key, value')
          .in('category', ['features', 'app', 'maintenance']);

        if (dbError) throw dbError;
        if (!data || cancelled) return;

        const m: Record<string, unknown> = {};
        for (const row of data) m[row.key] = row.value;

        setConfig({
          maintenanceMode: parseBooleanValue(m['maintenance_mode'], false),
          maintenanceMessage: parseStringValue(m['maintenance_message'], 'Back soon!'),
          minAppVersion: parseStringValue(m['min_app_version'], '1.0.0'),
          forceUpdateVersion: parseStringValue(m['force_update_version'], '0.0.0'),
          featureAiChat: parseBooleanValue(m['feature_ai_chat'], false),
          featureFoodContributions: parseBooleanValue(m['feature_food_contributions'], false),
          featureAnalytics: parseBooleanValue(m['feature_analytics'], false),
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load app config');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();

    const realtime = typeof supabase.channel === 'function'
      ? supabase
          .channel('public:app_config')
          .on(
            'postgres_changes' as const,
            { event: '*', schema: 'public', table: 'app_config' },
            () => {
              void fetchConfig();
            },
          )
          .subscribe()
      : null;

    return () => {
      cancelled = true;
      if (realtime && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(realtime);
      }
    };
  }, []);

  return { config, loading, error };
}
