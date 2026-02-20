import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyPaymentSignature, verifyWebhookSignature, razorpayFetch } from '../src/utils/razorpay';
import type { Env } from '../src/utils/types';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const buf = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function makeEnv(overrides: Partial<Env> = {}): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test_key123',
		RAZORPAY_KEY_SECRET: 'test_secret_456',
		RAZORPAY_WEBHOOK_SECRET: 'whsec_test_789',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-key',
		...overrides,
	} as Env;
}

describe('verifyPaymentSignature', () => {
	it('returns true for a valid signature', async () => {
		const paymentId = 'pay_abc123';
		const subscriptionId = 'sub_xyz789';
		const secret = 'my_secret';
		const sig = await hmacSha256Hex(secret, `${paymentId}|${subscriptionId}`);

		const result = await verifyPaymentSignature(paymentId, subscriptionId, sig, secret);
		expect(result).toBe(true);
	});

	it('returns false for a tampered signature', async () => {
		const result = await verifyPaymentSignature('pay_abc123', 'sub_xyz789', 'deadbeef0000', 'my_secret');
		expect(result).toBe(false);
	});

	it('returns false when secret differs', async () => {
		const paymentId = 'pay_abc123';
		const subscriptionId = 'sub_xyz789';
		const sig = await hmacSha256Hex('secret_A', `${paymentId}|${subscriptionId}`);

		const result = await verifyPaymentSignature(paymentId, subscriptionId, sig, 'secret_B');
		expect(result).toBe(false);
	});
});

describe('verifyWebhookSignature', () => {
	it('returns true for a valid webhook signature', async () => {
		const body = '{"event":"subscription.activated"}';
		const secret = 'whsec_test';
		const sig = await hmacSha256Hex(secret, body);

		const result = await verifyWebhookSignature(body, sig, secret);
		expect(result).toBe(true);
	});

	it('returns false for an invalid webhook signature', async () => {
		const result = await verifyWebhookSignature('{"event":"x"}', 'badsig', 'whsec_test');
		expect(result).toBe(false);
	});
});

describe('razorpayFetch', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('sends correct Basic auth header and GET request', async () => {
		const mockResponse = new Response(JSON.stringify({ id: 'sub_123' }), { status: 200 });
		const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
		globalThis.fetch = fetchSpy;

		const env = makeEnv();
		const resp = await razorpayFetch(env, '/subscriptions/sub_123');

		expect(fetchSpy).toHaveBeenCalledOnce();
		const [url, options] = fetchSpy.mock.calls[0];
		expect(url).toBe('https://api.razorpay.com/v1/subscriptions/sub_123');
		expect(options.method).toBe('GET');

		const expectedAuth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
		expect(options.headers.Authorization).toBe(`Basic ${expectedAuth}`);
		expect(options.body).toBeUndefined();

		globalThis.fetch = originalFetch;
	});

	it('sends JSON body for POST requests', async () => {
		const mockResponse = new Response('{}', { status: 200 });
		const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
		globalThis.fetch = fetchSpy;

		const env = makeEnv();
		const body = { plan_id: 'plan_xyz' };
		await razorpayFetch(env, '/subscriptions', 'POST', body);

		const [, options] = fetchSpy.mock.calls[0];
		expect(options.method).toBe('POST');
		expect(options.body).toBe(JSON.stringify(body));
		expect(options.headers['Content-Type']).toBe('application/json');

		globalThis.fetch = originalFetch;
	});

	it('does not include body for GET even when body is provided', async () => {
		const mockResponse = new Response('{}', { status: 200 });
		const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
		globalThis.fetch = fetchSpy;

		const env = makeEnv();
		await razorpayFetch(env, '/subscriptions', 'GET', { foo: 'bar' });

		const [, options] = fetchSpy.mock.calls[0];
		expect(options.body).toBeUndefined();

		globalThis.fetch = originalFetch;
	});

	it('forwards non-200 responses from Razorpay', async () => {
		const errorBody = JSON.stringify({ error: { description: 'Bad request' } });
		const mockResponse = new Response(errorBody, { status: 400 });
		const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
		globalThis.fetch = fetchSpy;

		const env = makeEnv();
		const resp = await razorpayFetch(env, '/subscriptions', 'POST', {});

		expect(resp.status).toBe(400);
		const data = await resp.json();
		expect((data as any).error.description).toBe('Bad request');

		globalThis.fetch = originalFetch;
	});

	it('handles 500 responses from Razorpay', async () => {
		const mockResponse = new Response('Internal Server Error', { status: 500 });
		const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
		globalThis.fetch = fetchSpy;

		const env = makeEnv();
		const resp = await razorpayFetch(env, '/subscriptions/sub_123/cancel', 'POST');

		expect(resp.status).toBe(500);

		globalThis.fetch = originalFetch;
	});
});
