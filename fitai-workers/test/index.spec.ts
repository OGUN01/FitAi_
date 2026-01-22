import { describe, it, expect } from 'vitest';

// Direct API tests against production worker
const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

describe('Worker Health Tests', () => {
	it('responds with health check', async () => {
		const response = await fetch(`${API_URL}/health`);
		expect(response.status).toBe(200);

		const data = (await response.json()) as any;
		expect(data.status).toBe('healthy');
		expect(data.services).toBeDefined();
	});

	it('should return 404 for unknown routes', async () => {
		const response = await fetch(`${API_URL}/unknown-route-123`);
		expect(response.status).toBe(404);
	});
});
