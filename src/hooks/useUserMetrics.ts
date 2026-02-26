/**
 * USE USER METRICS HOOK
 *
 * React hook for loading and accessing user's calculated health metrics
 * in main app screens.
 *
 * Usage:
 * ```typescript
 * const { metrics, quickMetrics, isLoading, error, refresh } = useUserMetrics();
 *
 * // Access daily calorie target
 * const dailyCalories = quickMetrics?.daily_calories;
 *
 * // Access macro targets
 * const protein = quickMetrics?.daily_protein_g;
 * const carbs = quickMetrics?.daily_carbs_g;
 * const fat = quickMetrics?.daily_fat_g;
 *
 * // Access water target
 * const waterTarget = quickMetrics?.daily_water_ml;
 * ```
 */

import { useState, useEffect } from 'react';
import { userMetricsService, UserMetrics, QuickMetrics } from '../services/userMetricsService';
import { useAuthStore } from '../stores/authStore';

export interface UseUserMetricsResult {
  // Full metrics object
  metrics: UserMetrics | null;

  // Quick access to commonly used metrics
  quickMetrics: QuickMetrics | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: Error | null;

  // Has completed onboarding
  hasCompletedOnboarding: boolean;

  // Has calculated metrics
  hasCalculatedMetrics: boolean;

  // Refresh function
  refresh: (forceRefresh?: boolean) => Promise<void>;
}

/**
 * Hook to load and access user metrics
 *
 * @param autoLoad - Automatically load metrics on mount (default: true)
 * @returns User metrics and loading state
 */
export function useUserMetrics(autoLoad: boolean = true): UseUserMetricsResult {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [quickMetrics, setQuickMetrics] = useState<QuickMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Get current user ID from auth store
  const { user } = useAuthStore();
  const userId = user?.id;

  /**
   * Load user metrics from database
   */
  const loadMetrics = async (forceRefresh: boolean = false) => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      const loadedMetrics = await userMetricsService.loadUserMetrics(userId, forceRefresh);
      setMetrics(loadedMetrics);

      // Extract quick metrics for convenience
      const quick = userMetricsService.getQuickMetrics(loadedMetrics);
      setQuickMetrics(quick);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load user metrics');
      console.error('❌ [USE-USER-METRICS] Error loading metrics:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh metrics
   */
  const refresh = async (forceRefresh: boolean = true) => {
    await loadMetrics(forceRefresh);
  };

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && userId) {
      loadMetrics(false);
    }
  }, [userId, autoLoad]);

  return {
    metrics,
    quickMetrics,
    isLoading,
    error,
    hasCompletedOnboarding: metrics?.hasCompletedOnboarding ?? false,
    hasCalculatedMetrics: metrics?.hasCalculatedMetrics ?? false,
    refresh,
  };
}

/**
 * Hook to get diet generation parameters
 * Returns null if user hasn't completed onboarding
 */
export function useDietGenerationParams() {
  const { metrics } = useUserMetrics();

  if (!metrics) return null;

  return userMetricsService.getDietGenerationParams(metrics);
}

/**
 * Hook to get workout generation parameters
 * Returns null if user hasn't completed onboarding
 */
export function useWorkoutGenerationParams() {
  const { metrics } = useUserMetrics();

  if (!metrics) return null;

  return userMetricsService.getWorkoutGenerationParams(metrics);
}
