/**
 * FitAI Workers - Analytics Handler
 *
 * Provides real-time analytics and usage metrics:
 * - Request counts and cache hit rates
 * - Model usage distribution
 * - Cost tracking and optimization insights
 * - Performance metrics (latency percentiles)
 */

import { Context } from 'hono';
import { Env } from '../utils/types';
import { getSupabaseClient } from '../utils/supabase';
import { APIError } from '../utils/errors';

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsResponse {
  success: boolean;
  data: {
    summary: {
      totalRequests: number;
      cacheHits: number;
      cacheHitRate: number;
      totalCost: number;
      totalTokens: number;
      avgCostPerRequest: number;
    };
    performance: {
      avgGenerationTimeMs: number;
      p95GenerationTimeMs: number;
      p99GenerationTimeMs: number;
    };
    models: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
    }>;
    timeRange: {
      start: string;
      end: string;
      hours: number;
    };
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * GET /analytics/usage - Get real-time usage analytics
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168 = 7 days)
 */
export async function handleAnalytics(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  try {
    // Get time range from query params
    const hoursParam = c.req.query('hours');
    const hours = Math.min(
      Math.max(parseInt(hoursParam || '24', 10), 1),
      168 // Max 7 days
    );

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    console.log(`[Analytics] Fetching analytics for last ${hours} hours`);

    // Get Supabase client
    const supabase = getSupabaseClient(c.env);

    // Query workout cache stats
    const { data: workoutStats, error: workoutError } = await supabase.rpc(
      'get_workout_analytics',
      {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }
    );

    // If RPC doesn't exist, fall back to direct query
    let workoutData: any;
    if (workoutError) {
      console.log('[Analytics] Using direct query for workout stats');
      const { data, error } = await supabase
        .from('workout_cache')
        .select('model_used, tokens_used, cost_usd, generation_time_ms, hit_count')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      if (error) throw error;
      workoutData = data;
    } else {
      workoutData = workoutStats;
    }

    // Query meal cache stats
    const { data: mealData, error: mealError } = await supabase
      .from('meal_cache')
      .select('model_used, tokens_used, cost_usd, generation_time_ms, hit_count')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (mealError) {
      throw new APIError(
        'Failed to fetch meal analytics',
        500,
        'ANALYTICS_FETCH_FAILED' as any,
        { error: mealError }
      );
    }

    // Combine and aggregate data
    const allData = [...(workoutData || []), ...(mealData || [])];

    // Calculate summary metrics
    const totalRequests = allData.length;
    const cacheHits = allData.reduce((sum, row) => sum + (row.hit_count || 0), 0);
    const totalTokens = allData.reduce((sum, row) => sum + (row.tokens_used || 0), 0);
    const totalCost = allData.reduce((sum, row) => sum + parseFloat(row.cost_usd || '0'), 0);

    // Calculate performance metrics
    const generationTimes = allData
      .map((row) => row.generation_time_ms)
      .filter((t) => t != null)
      .sort((a, b) => a - b);

    const avgGenerationTimeMs = generationTimes.length > 0
      ? Math.round(generationTimes.reduce((sum, t) => sum + t, 0) / generationTimes.length)
      : 0;

    const p95Index = Math.floor(generationTimes.length * 0.95);
    const p99Index = Math.floor(generationTimes.length * 0.99);

    const p95GenerationTimeMs = generationTimes[p95Index] || 0;
    const p99GenerationTimeMs = generationTimes[p99Index] || 0;

    // Calculate model usage
    const modelStats: Record<string, { requests: number; tokens: number; cost: number }> = {};

    allData.forEach((row) => {
      const model = row.model_used || 'unknown';
      if (!modelStats[model]) {
        modelStats[model] = { requests: 0, tokens: 0, cost: 0 };
      }
      modelStats[model].requests++;
      modelStats[model].tokens += row.tokens_used || 0;
      modelStats[model].cost += parseFloat(row.cost_usd || '0');
    });

    // Build response
    const response: AnalyticsResponse = {
      success: true,
      data: {
        summary: {
          totalRequests,
          cacheHits,
          cacheHitRate: totalRequests > 0
            ? Math.round((cacheHits / totalRequests) * 100 * 100) / 100
            : 0,
          totalCost: Math.round(totalCost * 10000) / 10000,
          totalTokens,
          avgCostPerRequest: totalRequests > 0
            ? Math.round((totalCost / totalRequests) * 10000) / 10000
            : 0,
        },
        performance: {
          avgGenerationTimeMs,
          p95GenerationTimeMs,
          p99GenerationTimeMs,
        },
        models: modelStats,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          hours,
        },
      },
    };

    console.log('[Analytics] Analytics generated successfully:', {
      totalRequests,
      cacheHitRate: response.data.summary.cacheHitRate,
      totalCost: response.data.summary.totalCost,
    });

    return c.json(response, 200);
  } catch (error) {
    console.error('[Analytics] Error:', error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to generate analytics',
      500,
      'ANALYTICS_GENERATION_FAILED' as any,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
