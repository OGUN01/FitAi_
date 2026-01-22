/**
 * Test Setup Helper
 *
 * Provides authentication and common test utilities for E2E tests.
 * Gets a real JWT token from Supabase for authenticated endpoint testing.
 */

// Test user credentials (from environment or defaults for local testing)
const TEST_EMAIL = process.env.TEST_EMAIL || 'sharmaharsh9887@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Harsh@9887';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const SUPABASE_ANON_KEY =
	process.env.SUPABASE_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

export const API_URL = process.env.API_URL || 'https://fitai-workers.sharmaharsh9887.workers.dev';
export const TEST_USER_ID = '892ae2fe-0d89-446d-a52d-a364f6ee8c8e';

// Cache the token to avoid multiple auth calls
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get a valid auth token from Supabase
 * Caches the token and refreshes when expired
 */
export async function getAuthToken(): Promise<string> {
	// Return cached token if still valid (with 5 min buffer)
	if (cachedToken && Date.now() < tokenExpiry - 300000) {
		return cachedToken;
	}

	try {
		const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
			method: 'POST',
			headers: {
				apikey: SUPABASE_ANON_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				email: TEST_EMAIL,
				password: TEST_PASSWORD,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Auth failed: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as {
			access_token: string;
			expires_at: number;
		};

		cachedToken = data.access_token;
		tokenExpiry = data.expires_at * 1000; // Convert to milliseconds

		return cachedToken;
	} catch (error) {
		console.error('Failed to get auth token:', error);
		// Return a placeholder that will cause 401 - better than crashing
		return 'auth-failed-placeholder';
	}
}

/**
 * Check if we can authenticate (for conditional test skipping)
 */
export async function canAuthenticate(): Promise<boolean> {
	try {
		const token = await getAuthToken();
		return token !== 'auth-failed-placeholder';
	} catch {
		return false;
	}
}

/**
 * Make an authenticated request to the API
 */
export async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
	const token = await getAuthToken();

	return fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...options.headers,
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Wait for a job to complete (polling helper)
 */
export async function waitForJobCompletion(
	jobId: string,
	maxWaitMs: number = 180000,
	pollIntervalMs: number = 3000,
): Promise<{ status: string; result?: any; error?: string }> {
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitMs) {
		const response = await authenticatedFetch(`/diet/jobs/${jobId}`);
		const data = (await response.json()) as any;

		if (data.data?.status === 'completed') {
			return { status: 'completed', result: data.data.result };
		}

		if (data.data?.status === 'failed') {
			return { status: 'failed', error: data.data.error };
		}

		// Wait before next poll
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}

	return { status: 'timeout' };
}
