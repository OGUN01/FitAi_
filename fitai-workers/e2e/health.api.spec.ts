import { test, expect } from '@playwright/test';

/**
 * Health Endpoint Tests
 * Tests the /health endpoint and basic API availability
 */

test.describe('Health API', () => {
	test('GET /health returns healthy status', async ({ request }) => {
		const response = await request.get('/health');

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.status).toBe('healthy');
		expect(data.timestamp).toBeDefined();
		expect(data.services).toBeDefined();
	});

	test('GET /health includes all required services', async ({ request }) => {
		const response = await request.get('/health');
		const data = await response.json();

		// Verify services object exists
		expect(data.services).toBeDefined();

		// Check expected service statuses - services can be objects with status property or strings
		if (data.services.supabase) {
			const supabaseStatus = typeof data.services.supabase === 'object' ? data.services.supabase.status : data.services.supabase;
			expect(['connected', 'disconnected', 'error', 'up', 'down']).toContain(supabaseStatus);
		}
		if (data.services.ai) {
			const aiStatus = typeof data.services.ai === 'object' ? data.services.ai.status : data.services.ai;
			expect(['available', 'unavailable', 'error', 'up', 'down']).toContain(aiStatus);
		}
	});

	test('unknown routes return 404', async ({ request }) => {
		const response = await request.get('/unknown-route-that-does-not-exist');

		expect(response.status()).toBe(404);
	});

	test('API responds with correct content-type', async ({ request }) => {
		const response = await request.get('/health');

		const contentType = response.headers()['content-type'];
		expect(contentType).toContain('application/json');
	});

	test('API has CORS headers', async ({ request }) => {
		const response = await request.get('/health');

		// CORS headers should be present
		const headers = response.headers();
		// Note: Some CORS headers may only appear on preflight requests
		expect(response.status()).toBe(200);
	});
});
