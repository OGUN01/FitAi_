import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/utils/types';
import { APIError } from '../src/utils/errors';

vi.mock('../src/utils/supabase', () => ({
	getSupabaseClient: vi.fn(),
}));

vi.mock('../src/utils/razorpay', () => ({
	razorpayFetch: vi.fn(),
	verifyPaymentSignature: vi.fn(),
	verifyWebhookSignature: vi.fn(),
}));

import { getSupabaseClient } from '../src/utils/supabase';
import { razorpayFetch, verifyWebhookSignature } from '../src/utils/razorpay';
import {
	handleCreateSubscription,
	handleGetSubscriptionStatus,
	handleWebhook,
} from '../src/handlers/subscription';

const NOT_FOUND = { code: 'PGRST116', message: 'no rows found' };

const BASIC_PLAN = {
	id: 'basic',
	tier: 'basic',
	name: 'Basic',
	description: null,
	price_monthly: 199,
	price_yearly: 1999,
	razorpay_plan_id_monthly: 'plan_basic_monthly',
	razorpay_plan_id_yearly: 'plan_basic_yearly',
	ai_generations_per_day: 10,
	ai_generations_per_month: 100,
	scans_per_day: 50,
	unlimited_scans: false,
	unlimited_ai: false,
	analytics: true,
	coaching: false,
	active: true,
};

const FREE_PLAN = {
	...BASIC_PLAN,
	id: 'free',
	tier: 'free',
	name: 'Free',
	price_monthly: null,
	price_yearly: null,
	razorpay_plan_id_monthly: null,
	razorpay_plan_id_yearly: null,
	ai_generations_per_day: 3,
	ai_generations_per_month: 1,
	scans_per_day: 5,
	unlimited_scans: false,
	unlimited_ai: false,
	analytics: false,
	coaching: false,
};

const PAUSED_SUBSCRIPTION = {
	id: 'sub_row_1',
	user_id: 'user-123',
	razorpay_subscription_id: 'sub_razorpay_123',
	razorpay_customer_id: 'cust_123',
	razorpay_plan_id: 'plan_basic_monthly',
	tier: 'basic',
	status: 'paused',
	billing_cycle: 'monthly',
	current_period_start: 1700000000,
	current_period_end: 1702592000,
	cancelled_at: null,
	paused_at: 1701000000,
	notes: {
		last_webhook_event_at: 1700500000,
	},
	created_at: '2026-03-01T10:00:00.000Z',
	updated_at: '2026-03-02T10:00:00.000Z',
};

function makeEnv(): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test_key',
		RAZORPAY_KEY_SECRET: 'test_secret',
		RAZORPAY_WEBHOOK_SECRET: 'whsec_test',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-key',
	} as Env;
}

function addErrorHandler(app: Hono<any>) {
	app.onError((err, c) => {
		if (err instanceof APIError) {
			return c.json({ success: false, error: { code: err.errorCode, message: err.message } }, err.statusCode as any);
		}

		return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
	});

	return app;
}

function buildAuthApp(handler: any) {
	const app = new Hono<{ Bindings: Env; Variables: { user: { id: string; email: string } } }>();
	addErrorHandler(app);

	app.use('*', async (c, next) => {
		c.set('user', { id: 'user-123', email: 'user@test.com' });
		await next();
	});

	app.all('/test', handler as any);
	return app;
}

function buildRawApp(handler: any) {
	const app = new Hono<{ Bindings: Env }>();
	addErrorHandler(app);
	app.all('/test', handler as any);
	return app;
}

type TableHandler = (chain: any) => { data: any; error: any };

function makeSupabaseMock(selectHandlers: Record<string, TableHandler> = {}) {
	const chains: Record<string, any> = {};

	function buildChain(table: string) {
		const chain: any = {
			_table: table,
			_filters: [] as Array<{ type: 'eq' | 'in'; column: string; value: unknown }>,
			select: vi.fn(() => chain),
			eq: vi.fn((column: string, value: unknown) => {
				chain._filters.push({ type: 'eq', column, value });
				return chain;
			}),
			in: vi.fn((column: string, value: unknown) => {
				chain._filters.push({ type: 'in', column, value });
				return chain;
			}),
			order: vi.fn(() => chain),
			limit: vi.fn(() => chain),
			single: vi.fn(async () => selectHandlers[table]?.(chain) ?? { data: null, error: NOT_FOUND }),
			maybeSingle: vi.fn(async () => selectHandlers[table]?.(chain) ?? { data: null, error: NOT_FOUND }),
			insert: vi.fn(async (payload: unknown) => ({ data: payload, error: null })),
			update: vi.fn((payload: unknown) => {
				chain._writePayload = payload;
				chain.data = null;
				chain.error = null;
				return chain;
			}),
		};

		chains[table] = chain;
		return chain;
	}

	const client = {
		from: vi.fn((table: string) => chains[table] ?? buildChain(table)),
	};

	(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client);
	return { client, chains };
}

function eqValue(chain: any, column: string) {
	return chain._filters.find((filter: any) => filter.type === 'eq' && filter.column === column)?.value;
}

function inValue(chain: any, column: string) {
	return chain._filters.find((filter: any) => filter.type === 'in' && filter.column === column)?.value;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('subscription regressions', () => {
	it('uses webhook_events.id for webhook idempotency and short-circuits already processed events', async () => {
		const { chains } = makeSupabaseMock({
			webhook_events: (chain) => {
				if (eqValue(chain, 'id') === 'evt_123') {
					return { data: { id: 'evt_123' }, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
			subscription_plans: () => ({ data: BASIC_PLAN, error: null }),
			subscriptions: () => ({ data: PAUSED_SUBSCRIPTION, error: null }),
		});

		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const app = buildRawApp(handleWebhook);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-razorpay-signature': 'sig',
					'x-razorpay-event-id': 'evt_123',
				},
				body: JSON.stringify({
					event: 'subscription.activated',
					created_at: 1700000100,
					payload: {
						subscription: {
							entity: {
								id: 'sub_razorpay_123',
								plan_id: 'plan_basic_monthly',
								customer_id: 'cust_123',
								current_start: 1700000000,
								current_end: 1702592000,
							},
						},
					},
				}),
			}),
			makeEnv(),
		);

		const body = (await res.json()) as any;
		expect(res.status).toBe(200);
		expect(body.message).toBe('Event already processed');
		expect(chains.webhook_events.eq).toHaveBeenCalledWith('id', 'evt_123');
		expect(chains.webhook_events.eq.mock.calls.some(([column]: any[]) => column === 'event_id')).toBe(false);
		expect(chains.subscriptions?.update).toBeUndefined();
	});

	it('ignores stale webhook events when a newer event is already recorded', async () => {
		const { chains } = makeSupabaseMock({
			webhook_events: (chain) => {
				if (eqValue(chain, 'id') === 'evt_456') {
					return { data: null, error: NOT_FOUND };
				}

				return { data: null, error: NOT_FOUND };
			},
			subscription_plans: (chain) => {
				const tier = eqValue(chain, 'tier');
				const monthlyPlan = eqValue(chain, 'razorpay_plan_id_monthly');
				const yearlyPlan = eqValue(chain, 'razorpay_plan_id_yearly');
				const isActive = eqValue(chain, 'active');

				if (tier === 'free' && isActive === true) {
					return { data: FREE_PLAN, error: null };
				}

				if ((monthlyPlan === 'plan_basic_monthly' || yearlyPlan === 'plan_basic_yearly') && isActive === true) {
					return { data: BASIC_PLAN, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
			subscriptions: (chain) => {
				if (eqValue(chain, 'razorpay_subscription_id') === 'sub_razorpay_123') {
					return { data: PAUSED_SUBSCRIPTION, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
		});

		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const app = buildRawApp(handleWebhook);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-razorpay-signature': 'sig',
					'x-razorpay-event-id': 'evt_456',
				},
				body: JSON.stringify({
					event: 'subscription.charged',
					created_at: 1700000200,
					payload: {
						subscription: {
							entity: {
								id: 'sub_razorpay_123',
								plan_id: 'plan_basic_monthly',
								customer_id: 'cust_123',
								current_start: 1700000000,
								current_end: 1702592000,
							},
						},
					},
				}),
			}),
			makeEnv(),
		);

		const body = (await res.json()) as any;
		expect(res.status).toBe(200);
		expect(body.message).toBe('Stale webhook ignored');
		expect(chains.subscriptions.update).not.toHaveBeenCalled();
		expect(chains.webhook_events.insert).toHaveBeenCalled();
	});

	it('returns paused subscription state instead of falling back to free tier', async () => {
		const { chains } = makeSupabaseMock({
			subscriptions: (chain) => {
				const statuses = (inValue(chain, 'status') as string[] | undefined) ?? [];
				if (eqValue(chain, 'user_id') === 'user-123' && statuses.includes('paused')) {
					return { data: PAUSED_SUBSCRIPTION, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
			subscription_plans: (chain) => {
				const tier = eqValue(chain, 'tier');
				const monthlyPlan = eqValue(chain, 'razorpay_plan_id_monthly');
				const yearlyPlan = eqValue(chain, 'razorpay_plan_id_yearly');
				const isActive = eqValue(chain, 'active');

				if (tier === 'free' && isActive === true) {
					return { data: FREE_PLAN, error: null };
				}

				if ((monthlyPlan === 'plan_basic_monthly' || yearlyPlan === 'plan_basic_yearly' || tier === 'basic') && isActive === true) {
					return { data: BASIC_PLAN, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
		});

		const app = buildAuthApp(handleGetSubscriptionStatus);
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		const body = (await res.json()) as any;
		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('paused');
		expect(body.data.is_active).toBe(false);
		expect(body.data.features.analytics).toBe(true);
		expect(chains.subscriptions.in).toHaveBeenCalledWith('status', expect.arrayContaining(['paused']));
	});

	it('rejects duplicate subscription creation when the user already has an existing subscription', async () => {
		makeSupabaseMock({
			subscription_plans: (chain) => {
				const planId = eqValue(chain, 'id');
				const isActive = eqValue(chain, 'active');

				if (planId === 'basic' && isActive === true) {
					return { data: BASIC_PLAN, error: null };
				}

				if (eqValue(chain, 'tier') === 'free' && isActive === true) {
					return { data: FREE_PLAN, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
			subscriptions: (chain) => {
				if (eqValue(chain, 'user_id') === 'user-123') {
					return { data: PAUSED_SUBSCRIPTION, error: null };
				}

				return { data: null, error: NOT_FOUND };
			},
		});

		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					plan_id: 'basic',
					billing_cycle: 'monthly',
				}),
			}),
			makeEnv(),
		);

		const body = (await res.json()) as any;
		expect(res.status).toBe(409);
		expect(body.success).toBe(false);
		expect(body.error.code).toBe('RESOURCE_ALREADY_EXISTS');
		expect(razorpayFetch).not.toHaveBeenCalled();
	});
});
