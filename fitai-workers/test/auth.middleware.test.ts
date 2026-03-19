import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../src/utils/types';

vi.mock('../src/utils/supabase', () => ({
	getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../src/utils/supabase';
import { APIError } from '../src/utils/errors';
import { authMiddleware, requireRole } from '../src/middleware/auth';

function makeEnv(): Env {
	return {
		RAZORPAY_KEY_ID: 'rzp_test',
		RAZORPAY_KEY_SECRET: 'secret',
		RAZORPAY_WEBHOOK_SECRET: 'whsec',
		SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'test-key',
	} as Env;
}

function buildApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.onError((err, c) => {
		if (err instanceof APIError) {
			return c.json({ success: false, error: { code: err.errorCode, message: err.message } }, err.statusCode as any);
		}

		return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
	});
	app.get('/admin', authMiddleware as any, requireRole('admin') as any, (c) => {
		const user = c.get('user');
		return c.json({ success: true, data: { userId: user.id } });
	});
	return app;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('requireRole admin verification', () => {
	it('allows access when the user still exists in admin_users', async () => {
		(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: {
						user: {
							id: 'user-123',
							email: 'admin@test.com',
							role: 'authenticated',
							app_metadata: { role: 'admin' },
							aud: 'authenticated',
						},
					},
					error: null,
				}),
			},
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-row' }, error: null }),
					}),
				}),
			}),
		} as any);

		const app = buildApp();
		const res = await app.fetch(
			new Request('http://localhost/admin', {
				headers: { Authorization: 'Bearer valid-token' },
			}),
			makeEnv(),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.userId).toBe('user-123');
	});

	it('blocks access when the admin row has been revoked even if the token still says admin', async () => {
		(getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: {
						user: {
							id: 'user-123',
							email: 'admin@test.com',
							role: 'authenticated',
							app_metadata: { role: 'admin' },
							aud: 'authenticated',
						},
					},
					error: null,
				}),
			},
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
					}),
				}),
			}),
		} as any);

		const app = buildApp();
		const res = await app.fetch(
			new Request('http://localhost/admin', {
				headers: { Authorization: 'Bearer stale-admin-token' },
			}),
			makeEnv(),
		);

		expect(res.status).toBe(403);
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.message).toBe('Insufficient permissions');
	});
});
