import { CalculatedMetrics } from "./types";

interface MetricsCache {
  metrics: CalculatedMetrics | null;
  timestamp: number;
  userId: string | null;
}

let metricsCache: MetricsCache = {
  metrics: null,
  timestamp: 0,
  userId: null,
};

const CACHE_DURATION_MS = 5 * 60 * 1000;

export function getCachedMetrics(userId: string): CalculatedMetrics | null {
  const now = Date.now();
  if (
    metricsCache.userId === userId &&
    metricsCache.metrics &&
    now - metricsCache.timestamp < CACHE_DURATION_MS
  ) {
    return metricsCache.metrics;
  }
  return null;
}

export function setCachedMetrics(
  userId: string,
  metrics: CalculatedMetrics,
): void {
  metricsCache = {
    metrics,
    timestamp: Date.now(),
    userId,
  };
}

export function invalidateMetricsCache(): void {
  console.log("📊 [useCalculatedMetrics] Global cache invalidation");
  metricsCache = {
    metrics: null,
    timestamp: 0,
    userId: null,
  };
}

export function clearMetricsCache(): void {
  console.log("📊 [useCalculatedMetrics] Clearing cache");
  metricsCache = {
    metrics: null,
    timestamp: 0,
    userId: null,
  };
}
