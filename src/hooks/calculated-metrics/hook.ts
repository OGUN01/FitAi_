import { logger } from '../../utils/logger';
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../useAuth";
import { CalculatedMetrics, UseCalculatedMetricsReturn } from "./types";
import { getCachedMetrics, setCachedMetrics, clearMetricsCache } from "./cache";
import { loadFromDatabase, loadFromAsyncStorage } from "./loaders";

export const useCalculatedMetrics = (): UseCalculatedMetricsReturn => {
  const { user, isAuthenticated, isGuestMode } = useAuth();

  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCalculatedMetrics, setHasCalculatedMetrics] = useState(false);

  const refreshMetrics = useCallback(async () => {
    const userId = user?.id || "guest";

    const cachedMetrics = getCachedMetrics(userId);
    if (cachedMetrics) {
      setMetrics(cachedMetrics);
      setHasCalculatedMetrics(true);
      setHasCompletedOnboarding(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let loadedMetrics: CalculatedMetrics | null = null;

      if (isAuthenticated && user?.id) {
        loadedMetrics = await loadFromDatabase(user.id);
      } else if (isGuestMode) {
        loadedMetrics = await loadFromAsyncStorage();
      }

      if (loadedMetrics) {
        setCachedMetrics(userId, loadedMetrics);
        setMetrics(loadedMetrics);
        setHasCalculatedMetrics(true);
        setHasCompletedOnboarding(true);
      } else {
        setMetrics(null);
        setHasCalculatedMetrics(false);
        setHasCompletedOnboarding(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load metrics";
      logger.error('[useCalculatedMetrics] Load error', { error: message });
      setError(message);
      setMetrics(null);
      setHasCalculatedMetrics(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated, isGuestMode]);

  const clearCache = useCallback(() => {
    clearMetricsCache();
    setMetrics(null);
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const getWaterGoalLiters = useCallback((): number | null => {
    if (!metrics?.dailyWaterML) return null;
    return Math.round((metrics.dailyWaterML / 1000) * 10) / 10;
  }, [metrics?.dailyWaterML]);

  const getCalorieTarget = useCallback((): number | null => {
    return metrics?.dailyCalories ?? null;
  }, [metrics?.dailyCalories]);

  const getMacroTargets = useCallback(
    () => ({
      protein: metrics?.dailyProteinG ?? null,
      carbs: metrics?.dailyCarbsG ?? null,
      fat: metrics?.dailyFatG ?? null,
    }),
    [metrics?.dailyProteinG, metrics?.dailyCarbsG, metrics?.dailyFatG],
  );

  return {
    metrics,
    dailyCalories: metrics?.dailyCalories ?? null,
    isLoading,
    error,
    hasCompletedOnboarding,
    hasCalculatedMetrics,
    refreshMetrics,
    clearCache,
    getWaterGoalLiters,
    getCalorieTarget,
    getMacroTargets,
  };
};
