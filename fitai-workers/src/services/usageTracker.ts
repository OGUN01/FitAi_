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

/**
 * @param timezone Optional IANA timezone (e.g. "Asia/Kolkata"), sent by the
 * client as the `x-client-timezone` header. When present, the period
 * boundary is computed in the USER'S local calendar date instead of UTC —
 * BUG FIX (found via live testing): daily/monthly usage-limit resets used
 * to always use UTC, so a real user's "daily" AI-generation/food-scan quota
 * reset at UTC midnight, not their own local midnight (e.g. 5:30am in
 * India, 4pm Pacific) — confusing, though never a correctness/security bug
 * since this only affects WHEN a user's own quota resets, not who can
 * access what. Falls back to UTC when the timezone is missing or invalid
 * (older app builds, non-browser callers, or a malformed header) — never
 * throws on bad client input.
 * @returns 'YYYY-MM-DD' for daily, 'YYYY-MM-01' for monthly
 */
export function getPeriodStart(periodType: PeriodType, timezone?: string): string {
	const now = new Date();

	let year: number;
	let month: string;
	let day: string;

	if (timezone) {
		try {
			// 'en-CA' formats as YYYY-MM-DD directly — no manual field reordering.
			const parts = new Intl.DateTimeFormat('en-CA', {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			}).formatToParts(now);
			const get = (type: string) => parts.find((p) => p.type === type)?.value;
			const y = get('year');
			const m = get('month');
			const d = get('day');
			if (!y || !m || !d) throw new Error('Intl.DateTimeFormat returned incomplete parts');
			year = Number(y);
			month = m;
			day = d;
		} catch {
			// Invalid/unsupported IANA timezone string — fall back to UTC below
			// rather than failing the request over a malformed client header.
			year = now.getUTCFullYear();
			month = String(now.getUTCMonth() + 1).padStart(2, '0');
			day = String(now.getUTCDate()).padStart(2, '0');
		}
	} else {
		year = now.getUTCFullYear();
		month = String(now.getUTCMonth() + 1).padStart(2, '0');
		day = String(now.getUTCDate()).padStart(2, '0');
	}

	if (periodType === 'daily') {
		return `${year}-${month}-${day}`;
	}

	return `${year}-${month}-01`;
}

/**
 * Atomically increment usage via Postgres `increment_feature_usage` (upsert).
 * Creates a new row with count=1 if none exists for the period.
 */
export async function incrementUsage(env: Env, userId: string, featureKey: FeatureKey, periodType: PeriodType, timezone?: string): Promise<IncrementResult> {
	const supabase = getSupabaseClient(env);
	const periodStart = getPeriodStart(periodType, timezone);

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
 * Best-effort compensating decrement for a usage credit that was reserved via
 * `incrementUsage()` before the handler ran, then needs to be refunded because
 * the handler failed (threw or returned a non-2xx response).
 *
 * There is no atomic `decrement_feature_usage` RPC (would require a new
 * migration, out of scope here), so this does a read-then-conditional-write:
 * it re-reads the current `usage_count` and only writes `count - 1` if the
 * row is still at the value it just read (`.eq('usage_count', row.usage_count)`
 * as an optimistic-concurrency guard). If another request incremented the
 * same row in between, the conditional update matches zero rows and this
 * silently skips the refund rather than clobbering the concurrent write —
 * the user loses at most the one credit that was already reserved for the
 * failed request, which is the same outcome as before this compensation
 * existed, so this can never make quota accounting worse, only better.
 */
export async function decrementUsage(env: Env, userId: string, featureKey: FeatureKey, periodType: PeriodType, timezone?: string): Promise<{ success: boolean; error?: string }> {
	const supabase = getSupabaseClient(env);
	// Must match the SAME timezone used by the incrementUsage() call being
	// compensated, or this looks up the wrong period_start row and silently
	// no-ops the refund (falls into the "nothing to refund" branch below).
	const periodStart = getPeriodStart(periodType, timezone);

	const { data: row, error: selectError } = await supabase
		.from('feature_usage')
		.select('id, usage_count')
		.eq('user_id', userId)
		.eq('feature_key', featureKey)
		.eq('period_type', periodType)
		.eq('period_start', periodStart)
		.maybeSingle();

	if (selectError) {
		return { success: false, error: `Failed to read usage for compensating decrement: ${selectError.message}` };
	}

	if (!row || typeof row.usage_count !== 'number' || row.usage_count <= 0) {
		// Nothing to refund (row missing or already at zero).
		return { success: true };
	}

	const { data: updated, error: updateError } = await supabase
		.from('feature_usage')
		.update({ usage_count: row.usage_count - 1 })
		.eq('id', row.id)
		.eq('usage_count', row.usage_count)
		.select('id');

	if (updateError) {
		return { success: false, error: `Failed to write compensating decrement: ${updateError.message}` };
	}

	if (!updated || updated.length === 0) {
		// Row changed concurrently between the read and the write — skip
		// rather than risk decrementing a value we no longer know is correct.
		return { success: true };
	}

	return { success: true };
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
	timezone?: string,
): Promise<UsageLimitResult> {
	const limit = resolveLimit(featureKey, periodType, planFeatures);

	if (limit === null) {
		return { allowed: true, current: 0, limit: null, remaining: null };
	}

	if (limit === 0) {
		return { allowed: false, current: 0, limit: 0, remaining: 0 };
	}

	const supabase = getSupabaseClient(env);
	const periodStart = getPeriodStart(periodType, timezone);

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
 *
 * This is a global batch job with no per-user context, so it can't compute
 * each row's OWN timezone-local "current period" the way `checkUsageLimit`/
 * `incrementUsage` now do. Rows are written with THEIR OWNER'S local
 * period_start, which can already be "yesterday" (UTC) for a user in a
 * timezone far behind UTC while it's still "today" (UTC) here — comparing
 * directly against UTC's current period start would delete that user's
 * still-current row early, silently resetting their quota mid-period. Use a
 * 1-day-earlier cutoff for 'daily' (safely covers the ~26-hour spread across
 * every real-world UTC offset, UTC+14 to UTC-12) so a row is only ever
 * deleted once it's expired in EVERY timezone, not just UTC's.
 */
export async function resetUsage(env: Env, periodType: PeriodType): Promise<{ success: boolean; deletedCount: number; error?: string }> {
	const supabase = getSupabaseClient(env);
	const currentPeriodStart =
		periodType === 'daily' ? getPeriodStart('daily', 'Etc/GMT+12') : getPeriodStart('monthly', 'Etc/GMT+12');

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
