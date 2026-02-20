/**
 * Integration Tests — Subscription Flows
 *
 * These tests exercise the FULL Hono middleware chain:
 *   logging → CORS → auth → rateLimit → subscriptionGate → handler
 *
 * Only external dependencies (Supabase, Razorpay) are mocked.
 * The real router, middleware ordering, and error handlers are exercised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../src/utils/types';

// ---------------------------------------------------------------------------
// Module mocks — MUST come before any import that transitively loads them
// ---------------------------------------------------------------------------

vi.mock('../../src/utils/supabase', () => ({
	getSupabaseClient: vi.fn(),
}));

vi.mock('../../src/utils/razorpay', () => ({
	razorpayFetch: vi.fn(),
	verifyPaymentSignature: vi.fn(),
	verifyWebhookSignature: vi.fn(),
}));

// Guard against mock bleed: subscriptionGate.test.ts mocks usageTracker with
// bare vi.fn() stubs. In @cloudflare/vitest-pool-workers, that module mock
// persists across files in the same pool. Re-declaring the mock here ensures
// this file owns the mock and can configure it per-test via the imports below.
vi.mock('../../src/services/usageTracker', () => ({
	checkUsageLimit: vi.fn(),
	incrementUsage: vi.fn(),
}));

import { getSupabaseClient } from '../../src/utils/supabase';
import { razorpayFetch, verifyPaymentSignature, verifyWebhookSignature } from '../../src/utils/razorpay';
import { checkUsageLimit, incrementUsage } from '../../src/services/usageTracker';
import worker from '../../src/index';

// ---------------------------------------------------------------------------
// Constants / Fixtures
// ---------------------------------------------------------------------------

const TEST_USER_ID = 'user-integ-001';
const TEST_EMAIL = 'integration@fitai.test';
const AUTH_TOKEN = 'valid-jwt-token';

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
	id: 'free',
	tier: 'free',
	name: 'Free',
	description: null,
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
	active: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv(): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test_key',
		RAZORPAY_KEY_SECRET: 'test_secret',
		RAZORPAY_WEBHOOK_SECRET: 'whsec_test',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
		RATE_LIMIT_KV: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		WORKOUT_CACHE: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
		},
		MEAL_CACHE: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
		},
	} as unknown as Env;
}

function makeCtx() {
	return {
		waitUntil: vi.fn(),
		passThroughOnException: vi.fn(),
	} as unknown as ExecutionContext;
}

/** Call worker.fetch with the full middleware chain */
async function callWorker(request: Request, env?: Env, ctx?: ExecutionContext) {
	return worker.fetch(request, env ?? makeEnv(), ctx ?? makeCtx());
}

/** Build an authenticated request to any path */
function authRequest(method: string, path: string, body?: unknown): Request {
	const init: RequestInit = {
		method,
		headers: {
			Authorization: `Bearer ${AUTH_TOKEN}`,
			'Content-Type': 'application/json',
		},
	};
	if (body) {
		init.body = JSON.stringify(body);
	}
	return new Request(`http://localhost${path}`, init);
}

/**
 * Build a fully-chainable Supabase mock where `.from(table)` returns a
 * per-table mock and the mock auto-resolves chains based on configuration.
 *
 * `tableMocks` maps table names to a function that receives a fresh chain
 * stub and returns it (after configuring `.single()` etc.).
 */
function makeSupabaseMock(tableMocks: Record<string, (chain: any) => any>): { client: any } {
	function buildChain(): any {
		const chain: any = {};
		chain.select = vi.fn().mockReturnValue(chain);
		chain.insert = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
		chain.update = vi.fn().mockReturnValue(chain);
		chain.delete = vi.fn().mockReturnValue(chain);
		chain.eq = vi.fn().mockReturnValue(chain);
		chain.in = vi.fn().mockReturnValue(chain);
		chain.lt = vi.fn().mockReturnValue(chain);
		chain.order = vi.fn().mockReturnValue(chain);
		chain.limit = vi.fn().mockReturnValue(chain);
		chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
		chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
		chain.rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
		return chain;
	}

	const client: any = {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: {
					user: {
						id: TEST_USER_ID,
						email: TEST_EMAIL,
						role: 'authenticated',
						aud: 'authenticated',
					},
				},
				error: null,
			}),
		},
		from: vi.fn().mockImplementation((table: string) => {
			const chain = buildChain();
			const configurator = tableMocks[table];
			if (configurator) {
				return configurator(chain);
			}
			return chain;
		}),
		rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
	};

	(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client);
	return { client };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	vi.resetAllMocks();
});

// ===========================================================================
// FLOW 1: Free user hits feature limit
// ===========================================================================

describe('Flow 1 — Free user hits feature limit', () => {
	it('returns 403 FEATURE_LIMIT_EXCEEDED when monthly AI limit reached', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.maybeSingle.mockResolvedValue({ data: null, error: null });
				return chain;
			},
			subscription_plans: (chain: any) => {
				chain.single.mockResolvedValue({ data: FREE_PLAN, error: null });
				return chain;
			},
			api_logs: (chain: any) => {
				chain.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
				return chain;
			},
		});

		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			current: 1,
			limit: 1,
			remaining: 0,
		});

		const req = authRequest('POST', '/workout/generate', {
			goals: ['strength'],
			fitnessLevel: 'beginner',
			equipment: ['bodyweight'],
			duration: 30,
		});

		const res = await callWorker(req);
		expect(res.status).toBe(403);

		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe('FEATURE_LIMIT_EXCEEDED');
	});

	it('includes usage data in the 403 response', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.maybeSingle.mockResolvedValue({ data: null, error: null });
				return chain;
			},
			subscription_plans: (chain: any) => {
				chain.single.mockResolvedValue({ data: FREE_PLAN, error: null });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			current: 1,
			limit: 1,
			remaining: 0,
		});

		const req = authRequest('POST', '/workout/generate', {
			goals: ['strength'],
			fitnessLevel: 'beginner',
			equipment: ['bodyweight'],
			duration: 30,
		});

		const res = await callWorker(req);
		const body = (await res.json()) as any;

		expect(body.error.data).toBeDefined();
		expect(body.error.data.current).toBe(1);
		expect(body.error.data.limit).toBe(1);
		expect(body.error.data.plan).toBe('free');
	});

	it('returns 401 when no Authorization header is provided', async () => {
		const req = new Request('http://localhost/workout/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				goals: ['strength'],
				fitnessLevel: 'beginner',
				equipment: ['bodyweight'],
				duration: 30,
			}),
		});

		const res = await callWorker(req);
		expect(res.status).toBe(401);
	});
});

// ===========================================================================
// FLOW 2: Full subscription lifecycle — create → verify → status (active)
// ===========================================================================

describe('Flow 2 — Full subscription lifecycle', () => {
	it('creates a subscription via POST /api/subscription/create', async () => {
		makeSupabaseMock({
			subscription_plans: (chain: any) => {
				chain.single.mockResolvedValue({ data: BASIC_PLAN, error: null });
				return chain;
			},
			subscriptions: (chain: any) => {
				// "existing active?" check → none
				chain.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
				// insert succeeds
				chain.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(
				JSON.stringify({
					id: 'sub_rzp_integ',
					status: 'created',
					short_url: 'https://rzp.io/integ',
					customer_id: 'cust_integ',
					current_start: 1700000000,
					current_end: 1703000000,
				}),
				{ status: 200 },
			),
		);

		const res = await callWorker(
			authRequest('POST', '/api/subscription/create', {
				plan_id: 'basic',
				billing_cycle: 'monthly',
			}),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.subscription_id).toBe('sub_rzp_integ');
		expect(body.data.key_id).toBe('rzp_test_key');
	});

	it('verifies payment via POST /api/subscription/verify', async () => {
		(verifyPaymentSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({
					data: {
						id: 'sub-db-integ',
						tier: 'basic',
						status: 'authenticated',
						razorpay_subscription_id: 'sub_rzp_integ',
					},
					error: null,
				});
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		const res = await callWorker(
			authRequest('POST', '/api/subscription/verify', {
				razorpay_payment_id: 'pay_integ_001',
				razorpay_subscription_id: 'sub_rzp_integ',
				razorpay_signature: 'valid_sig',
			}),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.verified).toBe(true);
		expect(body.data.tier).toBe('basic');
	});

	it('returns active status with basic plan features via GET /api/subscription/status', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({
					data: {
						id: 'sub-db-integ',
						user_id: TEST_USER_ID,
						tier: 'basic',
						status: 'active',
						billing_cycle: 'monthly',
						current_period_end: 1703000000,
						razorpay_subscription_id: 'sub_rzp_integ',
					},
					error: null,
				});
				return chain;
			},
			subscription_plans: (chain: any) => {
				chain.single.mockResolvedValue({ data: BASIC_PLAN, error: null });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		const res = await callWorker(authRequest('GET', '/api/subscription/status'));

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.tier).toBe('basic');
		expect(body.data.status).toBe('active');
		expect(body.data.is_active).toBe(true);
		expect(body.data.features.analytics).toBe(true);
		expect(body.data.features.ai_generations_per_month).toBe(100);
	});
});

// ===========================================================================
// FLOW 3: Cancel subscription
// ===========================================================================

describe('Flow 3 — Cancel subscription', () => {
	it('cancels active subscription at end of billing cycle', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({
					data: {
						id: 'sub-db-cancel',
						user_id: TEST_USER_ID,
						tier: 'basic',
						status: 'active',
						razorpay_subscription_id: 'sub_rzp_cancel',
						current_period_end: 1703000000,
					},
					error: null,
				});
				// update call returns via .eq chain
				chain.update.mockReturnValue({
					eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
				});
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 200 }));

		const res = await callWorker(authRequest('POST', '/api/subscription/cancel'));

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('active'); // still active until period ends
		expect(body.data.current_period_end).toBeDefined();
	});

	it('returns 404 when no active subscription exists', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		const res = await callWorker(authRequest('POST', '/api/subscription/cancel'));
		expect(res.status).toBe(404);
	});
});

// ===========================================================================
// FLOW 4: Pause and resume subscription
// ===========================================================================

describe('Flow 4 — Pause and resume subscription', () => {
	it('pauses an active subscription', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({
					data: {
						id: 'sub-db-pause',
						tier: 'basic',
						status: 'active',
						razorpay_subscription_id: 'sub_rzp_pause',
					},
					error: null,
				});
				chain.update.mockReturnValue({
					eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
				});
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 200 }));

		const res = await callWorker(authRequest('POST', '/api/subscription/pause'));
		expect(res.status).toBe(200);

		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('paused');
		expect(body.data.paused_at).toBeDefined();
	});

	it('resumes a paused subscription', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({
					data: {
						id: 'sub-db-resume',
						tier: 'basic',
						status: 'paused',
						razorpay_subscription_id: 'sub_rzp_resume',
					},
					error: null,
				});
				chain.update.mockReturnValue({
					eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
				});
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 200 }));

		const res = await callWorker(authRequest('POST', '/api/subscription/resume'));
		expect(res.status).toBe(200);

		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('active');
		expect(body.data.resumed_at).toBeDefined();
	});

	it('returns 404 when trying to resume a non-paused subscription', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		const res = await callWorker(authRequest('POST', '/api/subscription/resume'));
		expect(res.status).toBe(404);
	});
});

// ===========================================================================
// FLOW 5: Webhook idempotency
// ===========================================================================

describe('Flow 5 — Webhook idempotency', () => {
	const activationPayload = JSON.stringify({
		entity: 'event',
		account_id: 'acc_test',
		event: 'subscription.activated',
		contains: ['subscription'],
		payload: {
			subscription: {
				entity: {
					id: 'sub_rzp_wh',
					plan_id: 'plan_basic_monthly',
					customer_id: 'cust_wh',
					current_start: 1700000000,
					current_end: 1703000000,
				},
			},
		},
		created_at: 1700000000,
	});

	function webhookRequest(body: string, signature = 'valid_sig', eventId = 'evt_wh_001') {
		return new Request('http://localhost/api/webhook/razorpay', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-razorpay-signature': signature,
				'x-razorpay-event-id': eventId,
			},
			body,
		});
	}

	it('processes a valid webhook event and returns 200', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		makeSupabaseMock({
			// idempotency check — not found
			webhook_events: (chain: any) => {
				chain.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
				chain.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
				return chain;
			},
			// subscription update
			subscriptions: (chain: any) => {
				chain.eq.mockReturnThis();
				chain.update.mockReturnValue(chain);
				// The .eq after update should resolve
				chain.eq.mockReturnValue(Promise.resolve({ error: null }));
				return chain;
			},
			// resolvePlanTier — monthly match
			subscription_plans: (chain: any) => {
				chain.single
					.mockResolvedValueOnce({ data: { tier: 'basic' }, error: null }) // monthly match
					.mockResolvedValueOnce({ data: null, error: { message: 'not found' } }); // yearly not needed
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		const res = await callWorker(webhookRequest(activationPayload));
		expect(res.status).toBe(200);

		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
	});

	it('returns already-processed for duplicate event IDs', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		makeSupabaseMock({
			webhook_events: (chain: any) => {
				// idempotency check — already exists
				chain.single.mockResolvedValue({ data: { id: 'existing-evt' }, error: null });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		const res = await callWorker(webhookRequest(activationPayload, 'valid_sig', 'evt_duplicate'));
		expect(res.status).toBe(200);

		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.message).toContain('already processed');
	});

	it('does not call subscription update for duplicate events', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const { client } = makeSupabaseMock({
			webhook_events: (chain: any) => {
				chain.single.mockResolvedValue({ data: { id: 'existing-evt' }, error: null });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		await callWorker(webhookRequest(activationPayload, 'valid_sig', 'evt_dup_2'));

		// Verify that 'subscriptions' table was never accessed for update
		const fromCalls = (client.from as ReturnType<typeof vi.fn>).mock.calls;
		const subscriptionCalls = fromCalls.filter((c: any[]) => c[0] === 'subscriptions');
		expect(subscriptionCalls.length).toBe(0);
	});

	it('rejects webhook with invalid signature but still returns 200', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

		const res = await callWorker(webhookRequest(activationPayload, 'bad_sig'));
		expect(res.status).toBe(200);

		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error).toContain('Invalid');
	});
});

// ===========================================================================
// FLOW 6: Usage reset at period boundary
// ===========================================================================

describe('Flow 6 — Usage reset at period boundary', () => {
	it('allows generation when usage resets in new period', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.maybeSingle.mockResolvedValue({ data: null, error: null });
				return chain;
			},
			subscription_plans: (chain: any) => {
				chain.single.mockResolvedValue({ data: FREE_PLAN, error: null });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			current: 0,
			limit: 1,
			remaining: 1,
		});
		(incrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: true,
			newCount: 1,
		});

		const req = authRequest('POST', '/workout/generate', {
			goals: ['strength'],
			fitnessLevel: 'beginner',
			equipment: ['bodyweight'],
			duration: 30,
		});

		const res = await callWorker(req);

		expect(res.status).not.toBe(403);
	});

	it('blocks generation when usage is at limit', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.maybeSingle.mockResolvedValue({ data: null, error: null });
				return chain;
			},
			subscription_plans: (chain: any) => {
				chain.single.mockResolvedValue({ data: FREE_PLAN, error: null });
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			current: 1,
			limit: 1,
			remaining: 0,
		});

		const req = authRequest('POST', '/workout/generate', {
			goals: ['strength'],
			fitnessLevel: 'beginner',
			equipment: ['bodyweight'],
			duration: 30,
		});

		const res = await callWorker(req);
		expect(res.status).toBe(403);
	});

	it('paid user with high limits is not blocked', async () => {
		makeSupabaseMock({
			subscriptions: (chain: any) => {
				chain.maybeSingle.mockResolvedValue({
					data: {
						id: 'sub-paid',
						user_id: TEST_USER_ID,
						razorpay_subscription_id: 'sub_rzp_paid',
						razorpay_customer_id: 'cust_paid',
						razorpay_plan_id: 'plan_basic_monthly',
						tier: 'basic',
						status: 'active',
						billing_cycle: 'monthly',
						current_period_start: 1700000000,
						current_period_end: 1703000000,
						cancelled_at: null,
						paused_at: null,
						notes: {},
						created_at: '2024-01-01',
						updated_at: '2024-01-01',
						plan: BASIC_PLAN,
					},
					error: null,
				});
				return chain;
			},
			api_logs: (chain: any) => chain,
		});

		(checkUsageLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			current: 5,
			limit: 100,
			remaining: 95,
		});
		(incrementUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: true,
			newCount: 6,
		});

		const req = authRequest('POST', '/workout/generate', {
			goals: ['strength'],
			fitnessLevel: 'intermediate',
			equipment: ['dumbbells'],
			duration: 45,
		});

		const res = await callWorker(req);
		expect(res.status).not.toBe(403);
		expect(res.status).not.toBe(401);
	});
});
