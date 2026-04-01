import type { Env } from './types';

export async function verifyPaymentSignature(
	paymentId: string,
	subscriptionId: string,
	signature: string,
	keySecret: string,
): Promise<boolean> {
	const message = `${paymentId}|${subscriptionId}`;
	const encoder = new TextEncoder();

	const key = await crypto.subtle.importKey('raw', encoder.encode(keySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

	const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));

	const computedSignature = Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return computedSignature === signature;
}

export async function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string, webhookTimestamp?: string): Promise<boolean> {
	if (webhookTimestamp) {
		const ts = parseInt(webhookTimestamp, 10);
		if (!isNaN(ts) && Math.abs(Date.now() / 1000 - ts) > 300) {
			return false;
		}
	} else {
		console.warn('[Razorpay] X-Razorpay-Webhook-Timestamp header missing; skipping replay protection');
	}

	const encoder = new TextEncoder();

	const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

	const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));

	const computedSignature = Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return computedSignature === signature;
}

export async function razorpayFetch(env: Env, path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: any): Promise<Response> {
	const url = `https://api.razorpay.com/v1${path}`;

	const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

	const headers: HeadersInit = {
		Authorization: `Basic ${auth}`,
		'Content-Type': 'application/json',
	};

	const options: RequestInit = {
		method,
		headers,
	};

	if (body && (method === 'POST' || method === 'PATCH')) {
		options.body = JSON.stringify(body);
	}

	return fetch(url, options);
}
