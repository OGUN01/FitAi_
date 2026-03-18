/**
 * useAppConfig — reads public app_config rows (features, app, maintenance)
 * from Supabase. The RLS policy only allows authenticated users to read
 * rows in these three categories, so no secrets are exposed.
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
  featureAiChat: true,
  featureFoodContributions: true,
  featureAnalytics: true,
};

interface UseAppConfigResult {
  config: AppConfig;
  loading: boolean;
  error: string | null;
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
          maintenanceMode: Boolean(m['maintenance_mode'] ?? false),
          maintenanceMessage: String(m['maintenance_message'] ?? 'Back soon!'),
          minAppVersion: String(m['min_app_version'] ?? '1.0.0'),
          forceUpdateVersion: String(m['force_update_version'] ?? '0.0.0'),
          featureAiChat: Boolean(m['feature_ai_chat'] ?? true),
          featureFoodContributions: Boolean(m['feature_food_contributions'] ?? true),
          featureAnalytics: Boolean(m['feature_analytics'] ?? true),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load app config');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();
    return () => { cancelled = true; };
  }, []);

  return { config, loading, error };
}
