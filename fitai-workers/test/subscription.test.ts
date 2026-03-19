import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../src/utils/types';
import { ErrorCode } from '../src/utils/errorCodes';
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
import { razorpayFetch, verifyPaymentSignature, verifyWebhookSignature } from '../src/utils/razorpay';
import {
	handleCreateSubscription,
	handleVerifyPayment,
	handleWebhook,
	handleGetSubscriptionStatus,
	handleCancelSubscription,
	handlePauseSubscription,
	handleResumeSubscription,
} from '../src/handlers/subscription';

function makeEnv(): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test_key',
		RAZORPAY_KEY_SECRET: 'test_secret',
		RAZORPAY_WEBHOOK_SECRET: 'whsec_test',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-key',
	} as Env;
}

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
	ai_generations_per_month: 10,
	scans_per_day: 5,
	unlimited_scans: false,
	unlimited_ai: false,
	analytics: false,
	coaching: false,
};

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
		c.set('user', { id: 'user-123', email: 'test@test.com' });
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

function makeSupabaseMock() {
	const mock: any = {};

	mock._singleResult = { data: null, error: null };
	mock._selectResult = { data: null, error: null };
	mock._insertResult = { data: null, error: null };
	mock._updateResult = { data: null, error: null };

	mock.single = vi.fn(function (this: any) {
		return Promise.resolve(this._singleResult || mock._singleResult);
	});
	mock.maybeSingle = vi.fn(function (this: any) {
		return Promise.resolve(this._singleResult || mock._singleResult);
	});
	mock.limit = vi.fn().mockReturnThis();
	mock.order = vi.fn().mockReturnThis();
	mock.in = vi.fn().mockReturnThis();
	mock.eq = vi.fn().mockReturnThis();
	mock.select = vi.fn().mockReturnThis();
	mock.insert = vi.fn(function (this: any) {
		return Promise.resolve(this._insertResult || mock._insertResult);
	});
	mock.update = vi.fn().mockReturnThis();

	const fromFn = vi.fn().mockReturnValue(mock);
	const client = { from: fromFn, _chain: mock };

	(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client as any);
	return { client, chain: mock };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('handleCreateSubscription', () => {
	it('creates subscription for valid plan', async () => {
		const { chain } = makeSupabaseMock();

		let callCount = 0;
		chain.single.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve({ data: BASIC_PLAN, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});
		chain.limit.mockReturnValue({ ...chain, then: undefined });
		chain.select.mockImplementation((...args: any[]) => {
			chain.eq.mockReturnThis();
			chain.in.mockReturnThis();
			chain.order.mockReturnThis();
			chain.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
			return chain;
		});

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(
				JSON.stringify({
					id: 'sub_rzp_123',
					status: 'created',
					short_url: 'https://rzp.io/test',
					customer_id: 'cust_1',
					current_start: 1700000000,
					current_end: 1703000000,
				}),
				{ status: 200 },
			),
		);

		chain.insert.mockReturnValue(Promise.resolve({ error: null }));

		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan_id: 'basic', billing_cycle: 'monthly' }),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.subscription_id).toBe('sub_rzp_123');
		expect(body.data.key_id).toBe('rzp_test_key');
	});

	it('rejects invalid billing_cycle', async () => {
		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan_id: 'basic', billing_cycle: 'weekly' }),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(400);
	});

	it('rejects missing fields', async () => {
		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(400);
	});

	it('rejects free tier plan', async () => {
		const { chain } = makeSupabaseMock();
		chain.single.mockResolvedValue({ data: FREE_PLAN, error: null });

		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan_id: 'free', billing_cycle: 'monthly' }),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(400);
	});

	it('returns 502 when Razorpay API fails', async () => {
		const { chain } = makeSupabaseMock();

		let callCount = 0;
		chain.single.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve({ data: BASIC_PLAN, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});
		chain.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(JSON.stringify({ error: { description: 'Internal error' } }), { status: 500 }),
		);

		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan_id: 'basic', billing_cycle: 'monthly' }),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(502);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
	});

	it('returns 409 when user already has an active subscription', async () => {
		const { chain } = makeSupabaseMock();

		let callCount = 0;
		chain.single.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve({ data: BASIC_PLAN, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});
		chain.limit.mockReturnValue(Promise.resolve({ data: [{ id: 'sub-existing', status: 'active', tier: 'basic' }], error: null }));

		const app = buildAuthApp(handleCreateSubscription);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan_id: 'basic', billing_cycle: 'monthly' }),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(409);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe(ErrorCode.RESOURCE_ALREADY_EXISTS);
	});
});

describe('handleVerifyPayment', () => {
	it('verifies valid payment signature and updates status', async () => {
		(verifyPaymentSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const { chain } = makeSupabaseMock();
		chain.maybeSingle.mockResolvedValue({
			data: {
				id: 'sub-db-1',
				user_id: 'user-123',
				tier: 'basic',
				status: 'authenticated',
				razorpay_subscription_id: 'sub_rzp_123',
			},
			error: null,
		});

		const app = buildAuthApp(handleVerifyPayment);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					razorpay_payment_id: 'pay_abc',
					razorpay_subscription_id: 'sub_rzp_123',
					razorpay_signature: 'valid_sig',
				}),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.verified).toBe(true);
		expect(body.data.tier).toBe('basic');
	});

	it('rejects invalid signature', async () => {
		(verifyPaymentSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

		const app = buildAuthApp(handleVerifyPayment);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					razorpay_payment_id: 'pay_abc',
					razorpay_subscription_id: 'sub_rzp_123',
					razorpay_signature: 'bad_sig',
				}),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(400);
	});

	it('rejects missing required fields', async () => {
		const app = buildAuthApp(handleVerifyPayment);
		const res = await app.fetch(
			new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ razorpay_payment_id: 'pay_abc' }),
			}),
			makeEnv(),
		);

		expect(res.status).toBe(400);
	});
});

describe('handleWebhook', () => {
	function makeWebhookRequest(body: string, signature = 'valid_sig', eventId = 'evt_123') {
		return new Request('http://localhost/test', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-razorpay-signature': signature,
				'x-razorpay-event-id': eventId,
			},
			body,
		});
	}

	const activationPayload = JSON.stringify({
		entity: 'event',
		account_id: 'acc_test',
		event: 'subscription.activated',
		contains: ['subscription'],
		payload: {
			subscription: {
				entity: {
					id: 'sub_rzp_123',
					plan_id: 'plan_basic_monthly',
					customer_id: 'cust_1',
					current_start: 1700000000,
					current_end: 1703000000,
				},
			},
		},
		created_at: 1700000000,
	});

	it('processes valid webhook and returns 200', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const existingSubscription = {
			id: 'sub-db-1',
			user_id: 'user-123',
			tier: 'basic',
			status: 'created',
			razorpay_subscription_id: 'sub_rzp_123',
			notes: {},
		};

		(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			from: vi.fn((table: string) => {
				if (table === 'webhook_events') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
								}),
							}),
						}),
						insert: vi.fn().mockResolvedValue({ error: null }),
					};
				}
				if (table === 'subscriptions') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										maybeSingle: vi.fn().mockResolvedValue({ data: existingSubscription, error: null }),
									}),
								}),
							}),
						}),
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ error: null }),
						}),
					};
				}
				if (table === 'subscription_plans') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({ data: BASIC_PLAN, error: null }),
								}),
							}),
						}),
					};
				}
				return {};
			}),
		} as any);

		const app = buildRawApp(handleWebhook);
		const res = await app.fetch(makeWebhookRequest(activationPayload), makeEnv());

		expect(res.status).toBe(200);
	});

	it('returns 200 with error for invalid signature', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

		const app = buildRawApp(handleWebhook);
		const res = await app.fetch(makeWebhookRequest('{}', 'bad_sig'), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error).toContain('Invalid');
	});

	it('returns 200 for missing signature', async () => {
		const app = buildRawApp(handleWebhook);
		const req = new Request('http://localhost/test', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-razorpay-event-id': 'evt_123',
			},
			body: activationPayload,
		});
		const res = await app.fetch(req, makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
	});

	it('processes subscription.charged event and updates period', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const chargedPayload = JSON.stringify({
			entity: 'event',
			account_id: 'acc_test',
			event: 'subscription.charged',
			contains: ['subscription', 'payment'],
			payload: {
				subscription: {
					entity: {
						id: 'sub_rzp_123',
						plan_id: 'plan_basic_monthly',
						customer_id: 'cust_1',
						current_start: 1703000000,
						current_end: 1706000000,
					},
				},
			},
			created_at: 1703000000,
		});

		const existingSubscription = {
			id: 'sub-db-1',
			user_id: 'user-123',
			tier: 'basic',
			status: 'active',
			razorpay_subscription_id: 'sub_rzp_123',
			current_period_end: 1703000000,
			notes: {},
		};

		(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			from: vi.fn((table: string) => {
				if (table === 'webhook_events') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
								}),
							}),
						}),
						insert: vi.fn().mockResolvedValue({ error: null }),
					};
				}
				if (table === 'subscriptions') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										maybeSingle: vi.fn().mockResolvedValue({ data: existingSubscription, error: null }),
									}),
								}),
							}),
						}),
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ error: null }),
						}),
					};
				}
				if (table === 'subscription_plans') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({ data: BASIC_PLAN, error: null }),
								}),
							}),
						}),
					};
				}
				return {};
			}),
		} as any);

		const app = buildRawApp(handleWebhook);
		const res = await app.fetch(makeWebhookRequest(chargedPayload, 'valid_sig', 'evt_charged_1'), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
	});

	it('handles idempotent reprocessing (already processed event)', async () => {
		(verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const { chain } = makeSupabaseMock();
		chain.single.mockResolvedValue({ data: { id: 'existing-event' }, error: null });

		const app = buildRawApp(handleWebhook);
		const res = await app.fetch(makeWebhookRequest(activationPayload), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.message).toContain('already processed');
	});
});

describe('handleGetSubscriptionStatus', () => {
	it('returns free tier for user with no active subscription', async () => {
		const { chain, client } = makeSupabaseMock();

		let fromCallCount = 0;
		(client.from as any).mockImplementation((table: string) => {
			fromCallCount++;
			if (table === 'subscriptions') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
									}),
								}),
							}),
						}),
					}),
				};
			}
			if (table === 'subscription_plans') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: FREE_PLAN, error: null }),
							}),
						}),
					}),
				};
			}
			return chain;
		});

		const app = buildAuthApp(handleGetSubscriptionStatus);
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.tier).toBe('free');
		expect(body.data.is_active).toBe(true);
	});

	it('returns active subscription details for paying user', async () => {
		const { chain, client } = makeSupabaseMock();

		(client.from as any).mockImplementation((table: string) => {
			if (table === 'subscriptions') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							in: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: {
												id: 'sub-1',
												user_id: 'user-123',
												tier: 'basic',
												status: 'active',
												billing_cycle: 'monthly',
												current_period_end: 1703000000,
												razorpay_subscription_id: 'sub_rzp_123',
											},
											error: null,
										}),
									}),
								}),
							}),
						}),
					}),
				};
			}
			if (table === 'subscription_plans') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: BASIC_PLAN, error: null }),
							}),
						}),
					}),
				};
			}
			return chain;
		});

		const app = buildAuthApp(handleGetSubscriptionStatus);
		const res = await app.fetch(new Request('http://localhost/test'), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.tier).toBe('basic');
		expect(body.data.status).toBe('active');
		expect(body.data.is_active).toBe(true);
		expect(body.data.features.analytics).toBe(true);
	});
});

describe('handleCancelSubscription', () => {
	it('cancels active subscription', async () => {
		const { client } = makeSupabaseMock();

		(client.from as any).mockImplementation((table: string) => {
			return {
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: {
											id: 'sub-db-1',
											user_id: 'user-123',
											tier: 'basic',
											status: 'active',
											razorpay_subscription_id: 'sub_rzp_123',
											current_period_end: 1703000000,
										},
										error: null,
									}),
								}),
							}),
						}),
					}),
				}),
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
				}),
			};
		});

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 200 }));

		const app = buildAuthApp(handleCancelSubscription);
		const res = await app.fetch(new Request('http://localhost/test', { method: 'POST' }), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('active');
	});

	it('returns 404 when no active subscription found', async () => {
		const { client } = makeSupabaseMock();

		(client.from as any).mockImplementation(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
							}),
						}),
					}),
				}),
			}),
		}));

		const app = buildAuthApp(handleCancelSubscription);
		const res = await app.fetch(new Request('http://localhost/test', { method: 'POST' }), makeEnv());

		expect(res.status).toBe(404);
	});

	it('returns 400 when trying to cancel free tier subscription', async () => {
		const { client } = makeSupabaseMock();

		(client.from as any).mockImplementation(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: {
										id: 'sub-db-1',
										user_id: 'user-123',
										tier: 'free',
										status: 'active',
										razorpay_subscription_id: 'sub_rzp_free',
										current_period_end: null,
									},
									error: null,
								}),
							}),
						}),
					}),
				}),
			}),
		}));

		const app = buildAuthApp(handleCancelSubscription);
		const res = await app.fetch(new Request('http://localhost/test', { method: 'POST' }), makeEnv());

		expect(res.status).toBe(400);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe(ErrorCode.INVALID_REQUEST);
	});
});

describe('handlePauseSubscription', () => {
	it('pauses an active subscription', async () => {
		const { client } = makeSupabaseMock();

		(client.from as any).mockImplementation(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: {
										id: 'sub-db-1',
										tier: 'basic',
										status: 'active',
										razorpay_subscription_id: 'sub_rzp_123',
									},
									error: null,
								}),
							}),
						}),
					}),
				}),
			}),
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
			}),
		}));

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 200 }));

		const app = buildAuthApp(handlePauseSubscription);
		const res = await app.fetch(new Request('http://localhost/test', { method: 'POST' }), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('paused');
	});
});

describe('handleResumeSubscription', () => {
	it('resumes a paused subscription', async () => {
		const { client } = makeSupabaseMock();

		(client.from as any).mockImplementation(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								maybeSingle: vi.fn().mockResolvedValue({
									data: {
										id: 'sub-db-1',
										tier: 'basic',
										status: 'paused',
										razorpay_subscription_id: 'sub_rzp_123',
									},
									error: null,
								}),
							}),
						}),
					}),
				}),
			}),
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
			}),
		}));

		(razorpayFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 200 }));

		const app = buildAuthApp(handleResumeSubscription);
		const res = await app.fetch(new Request('http://localhost/test', { method: 'POST' }), makeEnv());

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('active');
	});

	it('returns 404 when no paused subscription found', async () => {
		const { client } = makeSupabaseMock();

		(client.from as any).mockImplementation(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
							}),
						}),
					}),
				}),
			}),
		}));

		const app = buildAuthApp(handleResumeSubscription);
		const res = await app.fetch(new Request('http://localhost/test', { method: 'POST' }), makeEnv());

		expect(res.status).toBe(404);
	});
});
