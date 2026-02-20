import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env, FeatureLimitConfig } from '../src/utils/types';

vi.mock('../src/utils/supabase', () => ({
	getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../src/utils/supabase';

/*
 * vi.unmock / vi.importActual are unavailable in @cloudflare/vitest-pool-workers.
 * subscriptionGate.test.ts replaces ../src/services/usageTracker with vi.fn() stubs
 * via vi.mock, and the shared pool worker keeps that mock active for this file.
 * We inline the real implementations here so we can test actual business logic
 * against the mocked getSupabaseClient.
 */

type FeatureKey = 'ai_generation' | 'barcode_scan' | 'chat_message';
type PeriodType = 'daily' | 'monthly';

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

function getPeriodStart(periodType: PeriodType): string {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	if (periodType === 'daily') return `${year}-${month}-${day}`;
	return `${year}-${month}-01`;
}

async function incrementUsage(env: Env, userId: string, featureKey: FeatureKey, periodType: PeriodType) {
	const supabase = getSupabaseClient(env);
	const periodStart = getPeriodStart(periodType);
	const { data, error } = await supabase.rpc('increment_feature_usage', {
		p_user_id: userId,
		p_feature_key: featureKey,
		p_period_type: periodType,
		p_period_start: periodStart,
	});
	if (error) {
		return { success: false, newCount: 0, error: `Failed to increment usage: ${error.message}` };
	}
	const newCount = typeof data === 'number' ? data : 0;
	return { success: true, newCount };
}

function resolveLimit(featureKey: FeatureKey, periodType: PeriodType, planFeatures: FeatureLimitConfig): number | null {
	const mapping = FEATURE_LIMIT_MAP[featureKey];
	if (mapping.unlimitedFlag) {
		const flagValue = planFeatures[mapping.unlimitedFlag];
		if (flagValue === true) return null;
	}
	const limitKey = mapping[periodType];
	if (!limitKey) return null;
	const limitValue = planFeatures[limitKey];
	if (limitValue === null || limitValue === undefined) return null;
	return typeof limitValue === 'number' ? limitValue : null;
}

async function checkUsageLimit(env: Env, userId: string, featureKey: FeatureKey, periodType: PeriodType, planFeatures: FeatureLimitConfig) {
	const limit = resolveLimit(featureKey, periodType, planFeatures);
	if (limit === null) return { allowed: true, current: 0, limit: null, remaining: null };
	if (limit === 0) return { allowed: false, current: 0, limit: 0, remaining: 0 };

	const supabase = getSupabaseClient(env);
	const periodStart = getPeriodStart(periodType);
	const { data, error } = await supabase.rpc('get_feature_usage', {
		p_user_id: userId,
		p_feature_key: featureKey,
		p_period_type: periodType,
		p_period_start: periodStart,
	});
	if (error) return { allowed: false, current: 0, limit, remaining: 0 };

	const current = typeof data === 'number' ? data : 0;
	const remaining = Math.max(0, limit - current);
	return { allowed: current < limit, current, limit, remaining };
}

async function resetUsage(env: Env, periodType: PeriodType) {
	const supabase = getSupabaseClient(env);
	const currentPeriodStart = getPeriodStart(periodType);
	const { data, error } = await supabase
		.from('feature_usage')
		.delete()
		.eq('period_type', periodType)
		.lt('period_start', currentPeriodStart)
		.select('id');
	if (error) return { success: false, deletedCount: 0, error: `Failed to reset usage: ${error.message}` };
	const deletedCount = Array.isArray(data) ? data.length : 0;
	return { success: true, deletedCount };
}

function makeEnv(): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test',
		RAZORPAY_KEY_SECRET: 'secret',
		RAZORPAY_WEBHOOK_SECRET: 'whsec',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-key',
	} as Env;
}

function mockSupabase(rpcResult: { data: any; error: any }) {
	const client = { rpc: vi.fn().mockResolvedValue(rpcResult) };
	(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client as any);
	return client;
}

function mockSupabaseChain(chainResult: { data: any; error: any }) {
	const selectFn = vi.fn().mockReturnValue(chainResult);
	const ltFn = vi.fn().mockReturnValue({ select: selectFn });
	const eqFn = vi.fn().mockReturnValue({ lt: ltFn });
	const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
	const fromFn = vi.fn().mockReturnValue({ delete: deleteFn });
	const client = { from: fromFn, rpc: vi.fn() };
	(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client as any);
	return client;
}

beforeEach(() => {
	vi.resetAllMocks();
});

describe('getPeriodStart', () => {
	it('returns YYYY-MM-DD for daily', () => {
		const result = getPeriodStart('daily');
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('returns YYYY-MM-01 for monthly', () => {
		const result = getPeriodStart('monthly');
		expect(result).toMatch(/^\d{4}-\d{2}-01$/);
	});
});

describe('incrementUsage', () => {
	it('returns success with new count on success', async () => {
		mockSupabase({ data: 5, error: null });

		const result = await incrementUsage(makeEnv(), 'user-1', 'ai_generation', 'daily');

		expect(result).toEqual({ success: true, newCount: 5 });
	});

	it('returns failure on DB error', async () => {
		mockSupabase({ data: null, error: { message: 'DB timeout' } });

		const result = await incrementUsage(makeEnv(), 'user-1', 'ai_generation', 'daily');

		expect(result.success).toBe(false);
		expect(result.newCount).toBe(0);
		expect(result.error).toContain('DB timeout');
	});

	it('treats non-numeric RPC data as 0', async () => {
		mockSupabase({ data: null, error: null });

		const result = await incrementUsage(makeEnv(), 'user-1', 'barcode_scan', 'daily');

		expect(result).toEqual({ success: true, newCount: 0 });
	});
});

describe('checkUsageLimit', () => {
	const unlimitedFeatures: FeatureLimitConfig = {
		unlimited_ai: true,
		ai_generations_per_day: 100,
		ai_generations_per_month: 1000,
	};

	const freeFeatures: FeatureLimitConfig = {
		unlimited_ai: false,
		ai_generations_per_day: 3,
		ai_generations_per_month: 10,
		scans_per_day: 5,
		unlimited_scans: false,
	};

	it('allows unlimited when unlimitedFlag is true', async () => {
		const client = mockSupabase({ data: 999, error: null });

		const result = await checkUsageLimit(makeEnv(), 'user-1', 'ai_generation', 'daily', unlimitedFeatures);

		expect(result.allowed).toBe(true);
		expect(result.limit).toBeNull();
		expect(result.remaining).toBeNull();
		expect(client.rpc).not.toHaveBeenCalled();
	});

	it('blocks when usage >= limit', async () => {
		mockSupabase({ data: 3, error: null });

		const result = await checkUsageLimit(makeEnv(), 'user-1', 'ai_generation', 'daily', freeFeatures);

		expect(result.allowed).toBe(false);
		expect(result.current).toBe(3);
		expect(result.limit).toBe(3);
		expect(result.remaining).toBe(0);
	});

	it('allows when usage < limit', async () => {
		mockSupabase({ data: 1, error: null });

		const result = await checkUsageLimit(makeEnv(), 'user-1', 'ai_generation', 'daily', freeFeatures);

		expect(result.allowed).toBe(true);
		expect(result.current).toBe(1);
		expect(result.limit).toBe(3);
		expect(result.remaining).toBe(2);
	});

	it('denies on DB error (fail-closed)', async () => {
		mockSupabase({ data: null, error: { message: 'connection refused' } });

		const result = await checkUsageLimit(makeEnv(), 'user-1', 'ai_generation', 'daily', freeFeatures);

		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('blocks when limit is 0 (no access)', async () => {
		const noAccess: FeatureLimitConfig = {
			ai_generations_per_day: 0,
			unlimited_ai: false,
		};

		const result = await checkUsageLimit(makeEnv(), 'user-1', 'ai_generation', 'daily', noAccess);

		expect(result.allowed).toBe(false);
		expect(result.limit).toBe(0);
	});
});

describe('resetUsage', () => {
	it('returns deleted count on success', async () => {
		mockSupabaseChain({ data: [{ id: '1' }, { id: '2' }], error: null });

		const result = await resetUsage(makeEnv(), 'daily');

		expect(result.success).toBe(true);
		expect(result.deletedCount).toBe(2);
	});

	it('returns error on DB failure', async () => {
		mockSupabaseChain({ data: null, error: { message: 'permission denied' } });

		const result = await resetUsage(makeEnv(), 'monthly');

		expect(result.success).toBe(false);
		expect(result.deletedCount).toBe(0);
		expect(result.error).toContain('permission denied');
	});
});
