/**
 * Regression coverage for the compensating-decrement refund path added to
 * subscriptionGateMiddleware. The gated route handlers in this codebase
 * (dietGeneration.ts, workoutGeneration.ts, foodRecognition.ts) all signal
 * failure by *throwing* an APIError rather than returning a 4xx/5xx Response
 * directly, so this file specifically exercises the thrown-exception path —
 * the case that was previously unreachable because `await next()` was not
 * wrapped in try/catch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../utils/types';

vi.mock('../utils/supabase', () => ({
	getSupabaseClient: vi.fn(),
}));

vi.mock('../services/usageTracker', () => ({
	checkUsageLimit: vi.fn(),
	incrementUsage: vi.fn(),
	decrementUsage: vi.fn(),
}));

import { getSupabaseClient } from '../utils/supabase';
import { checkUsageLimit, incrementUsage, decrementUsage } from '../services/usageTracker';
import { subscriptionGateMiddleware } from './subscriptionGate';

function makeEnv(): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test',
		RAZORPAY_KEY_SECRET: 'secret',
		RAZORPAY_WEBHOOK_SECRET: 'whsec',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-key',
	} as Env;
}

const FREE_PLAN = {
	id: 'free',
	tier: 'free',
	name: 'Free',
	description: null,
	price_monthly: null,
	price_yearly: null,
	razorpay_plan_id_monthly: null,
	razorpay_plan_id_yearly: null,
	ai_generations_per_day: 3,
	ai_generations_per_month: 10,
	scans_per_day: 5,
	unlimited_scans: false,
	unlimited_ai: false,
	analytics: false,
	coaching: false,
	active: true,
};

function mockSubscriptionQuery(freePlan: any = FREE_PLAN) {
	const subscriptionChain: any = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
	};

	const freePlanChain: any = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: freePlan, error: null }),
	};

	const fromFn = vi.fn().mockImplementation((table: string) => {
		if (table === 'subscriptions') return subscriptionChain;
		if (table === 'subscription_plans') return freePlanChain;
		return {};
	});

	(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn } as any);
}

function buildAppWithThrowingHandler() {
	const app = new Hono<{ Bindings: Env; Variables: { user: { id: string; email: string } } }>();

	app.use('*', async (c, next) => {
		c.set('user', { id: 'user-123', email: 'test@test.com' });
		await next();
	});

	app.use('*', subscriptionGateMiddleware('ai_generation', 'daily') as any);

	app.get('/test', () => {
		throw new Error('handler blew up');
	});

	return app;
}

function buildAppWithSuccessHandler() {
	const app = new Hono<{ Bindings: Env; Variables: { user: { id: string; email: string } } }>();

	app.use('*', async (c, next) => {
		c.set('user', { id: 'user-123', email: 'test@test.com' });
		await next();
	});

	app.use('*', subscriptionGateMiddleware('ai_generation', 'daily') as any);

	app.get('/test', (c) => c.json({ success: true }));

	return app;
}

beforeEach(() => {
	vi.resetAllMocks();
});

describe('subscriptionGateMiddleware — refund on thrown handler error', () => {
	it('refunds the reserved credit when the downstream handler throws (not just when it returns 4xx/5xx)', async () => {
		mockSubscriptionQuery(FREE_PLAN);
		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			current: 0,
			limit: 3,
			remaining: 3,
		});
		(incrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, newCount: 1 });
		(decrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

		const app = buildAppWithThrowingHandler();
		// Hono's default (no app.onError registered) turns an uncaught throw
		// from a route handler into a 500 response — we only assert on the
		// refund side effect here, not on Hono's own error-formatting.
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		expect(res.status).toBe(500);
		expect(decrementUsage).toHaveBeenCalledTimes(1);
		expect(decrementUsage).toHaveBeenCalledWith(expect.anything(), 'user-123', 'ai_generation', 'daily');
	});

	it('does not refund when the handler succeeds', async () => {
		mockSubscriptionQuery(FREE_PLAN);
		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			current: 0,
			limit: 3,
			remaining: 3,
		});
		(incrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, newCount: 1 });
		(decrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

		const app = buildAppWithSuccessHandler();
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		expect(res.status).toBe(200);
		expect(decrementUsage).not.toHaveBeenCalled();
	});

	it('does not refund a thrown error when the credit was never actually reserved', async () => {
		mockSubscriptionQuery(FREE_PLAN);
		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			current: 0,
			limit: 3,
			remaining: 3,
		});
		// Reservation itself failed, so there is nothing to refund.
		(incrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, newCount: 0, error: 'db down' });
		(decrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

		const app = buildAppWithThrowingHandler();
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		expect(res.status).toBe(500);
		expect(decrementUsage).not.toHaveBeenCalled();
	});

	it('still propagates the original error (as a 500) even if the compensating decrement itself fails', async () => {
		mockSubscriptionQuery(FREE_PLAN);
		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			current: 0,
			limit: 3,
			remaining: 3,
		});
		(incrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, newCount: 1 });
		(decrementUsage as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('decrement RPC unreachable'));

		const app = buildAppWithThrowingHandler();
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		expect(res.status).toBe(500);
		expect(decrementUsage).toHaveBeenCalledTimes(1);
	});
});
