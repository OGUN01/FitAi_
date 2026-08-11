/**
 * Test Setup Helper
 *
 * Provides authentication and common test utilities for opt-in live/E2E
 * smoke tests. Gets a real JWT token from Supabase for authenticated
 * endpoint testing.
 *
 * SECURITY: This file MUST NOT hardcode credentials, API URLs, or keys as
 * fallback defaults. All required values are read lazily (only when a live
 * test actually runs) and throw immediately if missing — they never fall
 * back to a real account or production deployment. Consuming test files
 * must guard themselves with `describe.skipIf(!canRunLiveTests())` so the
 * default `npm test` run skips these tests cleanly instead of throwing when
 * the live-test environment isn't configured. Point TEST_* / API_URL /
 * SUPABASE_* at a local/staging Miniflare instance or a dedicated test
 * Supabase project — never production.
 */

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`[testSetup] Missing required environment variable '${name}'. ` +
				'Live/E2E tests must supply TEST_EMAIL, TEST_PASSWORD, API_URL, SUPABASE_URL, ' +
				'SUPABASE_ANON_KEY, and TEST_USER_ID via env/CI secrets — pointed at a local/staging ' +
				'environment or a dedicated test Supabase project. Production credentials must never ' +
				'be hardcoded here. Guard tests with canRunLiveTests() to skip cleanly when unset.',
		);
	}
	return value;
}

/**
 * Whether the live-test environment is fully configured. Test files should
 * gate their top-level `describe` block with
 * `describe.skipIf(!canRunLiveTests())(...)` so they skip (rather than
 * throw and fail the whole suite) when these env vars aren't set — e.g. in
 * a normal local/CI `npm test` run that isn't targeting a live deployment.
 */
export function canRunLiveTests(): boolean {
	return Boolean(
		process.env.TEST_EMAIL &&
			process.env.TEST_PASSWORD &&
			process.env.SUPABASE_URL &&
			process.env.SUPABASE_ANON_KEY &&
			process.env.API_URL &&
			process.env.TEST_USER_ID,
	);
}

/** Base URL of the API under test. Resolved lazily — see requireEnv(). */
export function getApiUrl(): string {
	return requireEnv('API_URL');
}

/** The Supabase user id the live tests authenticate as. Resolved lazily. */
export function getTestUserId(): string {
	return requireEnv('TEST_USER_ID');
}

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

	const supabaseUrl = requireEnv('SUPABASE_URL');
	const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
	const testEmail = requireEnv('TEST_EMAIL');
	const testPassword = requireEnv('TEST_PASSWORD');

	const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: {
			apikey: supabaseAnonKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			email: testEmail,
			password: testPassword,
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
}

/**
 * Check if we can authenticate (for conditional test skipping)
 */
export async function canAuthenticate(): Promise<boolean> {
	if (!canRunLiveTests()) return false;
	try {
		await getAuthToken();
		return true;
	} catch {
		return false;
	}
}

/**
 * Make an authenticated request to the API
 */
export async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
	const token = await getAuthToken();
	const apiUrl = getApiUrl();

	return fetch(`${apiUrl}${path}`, {
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
