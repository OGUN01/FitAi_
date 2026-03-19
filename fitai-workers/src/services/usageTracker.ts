import { Env, FeatureLimitConfig } from '../utils/types';
import { getSupabaseClient } from '../utils/supabase';

export type FeatureKey = 'ai_generation' | 'barcode_scan' | 'chat_message';

export type PeriodType = 'daily' | 'monthly';

export interface UsageLimitResult {
	allowed: boolean;
	current: number;
	/** null = unlimited */
	limit: number | null;
	/** null = unlimited, never negative */
	remaining: number | null;
}

export interface IncrementResult {
	success: boolean;
	newCount: number;
	error?: string;
}

/**
 * Maps feature keys → FeatureLimitConfig field names per period.
 * unlimitedFlag takes precedence over numeric limits when true.
 */
const FEATURE_LIMIT_MAP: Record<
	FeatureKey,
	{
		daily?: keyof FeatureLimitConfig;
		monthly?: keyof FeatureLimitConfig;
		unlimitedFlag?: keyof FeatureLimitConfig;
	}
> = {
	ai_generation: {
		daily: 'ai_generations_per_day',
		monthly: 'ai_generations_per_month',
		unlimitedFlag: 'unlimited_ai',
	},
	barcode_scan: {
		daily: 'scans_per_day',
		unlimitedFlag: 'unlimited_scans',
	},
	chat_message: {},
};

/** @returns 'YYYY-MM-DD' for daily, 'YYYY-MM-01' for monthly (UTC) */
export function getPeriodStart(periodType: PeriodType): string {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');

	if (periodType === 'daily') {
		return `${year}-${month}-${day}`;
	}

	return `${year}-${month}-01`;
}

/**
 * Atomically increment usage via Postgres `increment_feature_usage` (upsert).
 * Creates a new row with count=1 if none exists for the period.
 */
export async function incrementUsage(env: Env, userId: string, featureKey: FeatureKey, periodType: PeriodType): Promise<IncrementResult> {
	const supabase = getSupabaseClient(env);
	const periodStart = getPeriodStart(periodType);

	const { data, error } = await supabase.rpc('increment_feature_usage', {
		p_user_id: userId,
		p_feature_key: featureKey,
		p_period_type: periodType,
		p_period_start: periodStart,
	});

	if (error) {
		return {
			success: false,
			newCount: 0,
			error: `Failed to increment usage: ${error.message}`,
		};
	}

	const newCount = typeof data === 'number' ? data : 0;

	return { success: true, newCount };
}

/**
 * Resolve numeric limit from plan features.
 * null = unlimited, 0 = no access, positive = concrete limit.
 * Priority: unlimitedFlag=true → null, then period-specific numeric field.
 */
function resolveLimit(featureKey: FeatureKey, periodType: PeriodType, planFeatures: FeatureLimitConfig): number | null {
	const mapping = FEATURE_LIMIT_MAP[featureKey];

	if (mapping.unlimitedFlag) {
		const flagValue = planFeatures[mapping.unlimitedFlag];
		if (flagValue === true) {
			return null;
		}
	}

	const limitKey = mapping[periodType];
	if (!limitKey) {
		return null;
	}

	const limitValue = planFeatures[limitKey];

	// null/undefined in config = unlimited (NULL in subscription_plans table)
	if (limitValue === null || limitValue === undefined) {
		return null;
	}

	return typeof limitValue === 'number' ? limitValue : null;
}

/**
 * Check if user is within usage limits for a feature.
 * Queries Postgres `get_feature_usage`, compares to plan limit.
 * Fails closed (denies on DB error).
 */
export async function checkUsageLimit(
	env: Env,
	userId: string,
	featureKey: FeatureKey,
	periodType: PeriodType,
	planFeatures: FeatureLimitConfig,
): Promise<UsageLimitResult> {
	const limit = resolveLimit(featureKey, periodType, planFeatures);

	if (limit === null) {
		return { allowed: true, current: 0, limit: null, remaining: null };
	}

	if (limit === 0) {
		return { allowed: false, current: 0, limit: 0, remaining: 0 };
	}

	const supabase = getSupabaseClient(env);
	const periodStart = getPeriodStart(periodType);

	const { data, error } = await supabase.rpc('get_feature_usage', {
		p_user_id: userId,
		p_feature_key: featureKey,
		p_period_type: periodType,
		p_period_start: periodStart,
	});

	if (error) {
		throw new Error(`Failed to fetch feature usage: ${error.message}`);
	}

	const current = typeof data === 'number' ? data : 0;
	const remaining = Math.max(0, limit - current);

	return { allowed: current < limit, current, limit, remaining };
}

/**
 * Delete expired usage records (period_start < current period).
 * Intended for Cloudflare Workers Cron Trigger.
 */
export async function resetUsage(env: Env, periodType: PeriodType): Promise<{ success: boolean; deletedCount: number; error?: string }> {
	const supabase = getSupabaseClient(env);
	const currentPeriodStart = getPeriodStart(periodType);

	const { data, error } = await supabase
		.from('feature_usage')
		.delete()
		.eq('period_type', periodType)
		.lt('period_start', currentPeriodStart)
		.select('id');

	if (error) {
		return {
			success: false,
			deletedCount: 0,
			error: `Failed to reset usage: ${error.message}`,
		};
	}

	const deletedCount = Array.isArray(data) ? data.length : 0;

	return { success: true, deletedCount };
}
