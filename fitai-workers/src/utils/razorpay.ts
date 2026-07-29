import type { Env } from './types';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function timingSafeEqual(a: string, b: string): boolean {
	const encoder = new TextEncoder();
	const bufA = encoder.encode(a);
	const bufB = encoder.encode(b);
	const maxLen = Math.max(bufA.length, bufB.length);
	let diff = bufA.length === bufB.length ? 0 : 1;
	for (let i = 0; i < maxLen; i++) {
		const x = i < bufA.length ? bufA[i] : 0;
		const y = i < bufB.length ? bufB[i] : 0;
		diff |= x ^ y;
	}
	return diff === 0;
}

export async function verifyPaymentSignature(
	paymentId: string,
	subscriptionId: string,
	signature: string,
	keySecret: string,
): Promise<boolean> {
	if (!keySecret) {
		return false;
	}

	const message = `${paymentId}|${subscriptionId}`;
	const computedSignature = await hmacSha256Hex(keySecret, message);

	return timingSafeEqual(computedSignature, signature.toLowerCase());
}

export async function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string, webhookTimestamp?: string): Promise<boolean> {
	if (!webhookSecret) {
		console.error('[Razorpay] RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook');
		return false;
	}

	if (webhookTimestamp) {
		const ts = parseInt(webhookTimestamp, 10);
		if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
			return false;
		}
	} else {
		console.warn('[Razorpay] X-Razorpay-Webhook-Timestamp header missing; rejecting webhook');
		return false;
	}

	const computedSignature = await hmacSha256Hex(webhookSecret, rawBody);

	return timingSafeEqual(computedSignature, signature.toLowerCase());
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
