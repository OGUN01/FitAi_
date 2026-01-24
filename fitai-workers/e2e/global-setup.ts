/**
 * Global setup for Playwright API tests
 * Handles authentication token generation for authenticated endpoints
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
	console.log('🔧 Setting up API tests...');

	// Get base URL from config
	const baseURL = config.projects[0]?.use?.baseURL || 'https://fitai-workers.sharmaharsh9887.workers.dev';

	// Verify API is reachable
	try {
		const response = await fetch(`${baseURL}/health`);
		if (response.ok) {
			console.log('✅ API is reachable');
		} else {
			console.warn('⚠️ API returned non-OK status:', response.status);
		}
	} catch (error) {
		console.error('❌ Failed to reach API:', error);
	}

	console.log('🚀 Global setup complete');
}

export default globalSetup;
