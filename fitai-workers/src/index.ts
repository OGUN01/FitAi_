/**
 * FitAI Workers - Main Entry Point
 *
 * Cloudflare Workers API Gateway for FitAI
 * Built with Hono v4.10.5 - https://hono.dev/
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { Env, DietJobMessage } from './utils/types';
import { createErrorResponse, logError, APIError } from './utils/errors';
import { handleHealthCheck } from './handlers/health';
import { handleWorkoutGeneration } from './handlers/workoutGeneration';
import { handleDietGeneration } from './handlers/dietGeneration';
import { handleChat, handleGetConversationHistory, handleGetConversations } from './handlers/chatHandler';
import { handleExerciseSearch } from './handlers/exerciseSearch';
import { handleMediaServe, handleMediaUpload, handleMediaDelete } from './handlers/mediaHandler';
import { handleAnalytics } from './handlers/analytics';
import { handleFoodRecognition } from './handlers/foodRecognition';
import { handleNutritionEstimate } from './handlers/nutritionEstimate';
import { handleNutritionLabelScan } from './handlers/nutritionLabelScan';
import { handleHealthSync, handleHealthLatest, handleWorkoutSession } from './handlers/healthSync';
import {
	handleCreateSubscription,
	handleVerifyPayment,
	handleWebhook,
	handleGetSubscriptionStatus,
	handleCancelSubscription,
	handlePauseSubscription,
	handleResumeSubscription,
} from './handlers/subscription';
import { authMiddleware, optionalAuthMiddleware, requireRole, AuthContext } from './middleware/auth';
import {
	handleAdminDashboard,
	handleAdminSession,
	handleGetConfig,
	handleSetConfig,
	handleGetPlans,
	handleUpdatePlan,
	handleListUsers,
	handleGetUser,
	handleOverrideSubscription,
	handleAdminAnalytics,
	handleCacheStats,
	handleClearCache,
	handleListContributions,
	handleApproveContribution,
	handleRejectContribution,
	handleWebhookLogs,
	handleListAdmins,
	handleCreateAdmin,
	handleRemoveAdmin,
} from './handlers/admin';
import { rateLimitMiddleware, RATE_LIMITS } from './middleware/rateLimit';
import { loggingMiddleware } from './middleware/logging';
import { subscriptionGateMiddleware } from './middleware/subscriptionGate';
import { getPublicAppConfig } from './utils/appConfig';

// ============================================================================
// INITIALIZE HONO APP
// ============================================================================

const app = new Hono<{ Bindings: Env }>();

function isLocalDevOrigin(origin: string | null | undefined): origin is string {
	if (!origin) return false;
	try {
		const url = new URL(origin);
		return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname);
	} catch {
		return false;
	}
}

function requireFeatureFlag(flag: 'featureAiChat' | 'featureAnalytics') {
	return async (c: any, next: any) => {
		const config = await getPublicAppConfig(c.env);
		if (!config[flag]) {
			return c.json(
				{
					success: false,
					error: {
						code: 'FEATURE_DISABLED',
						message: 'This feature is currently disabled by the administrator.',
					},
				},
				503,
			);
		}

		await next();
	};
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Request logging (console)
app.use('*', logger());

// Request/Response logging (Supabase)
app.use('*', loggingMiddleware);

// CORS configuration
// Default to '*' for development, can be restricted in production via ALLOWED_ORIGINS env var
// Example: ALLOWED_ORIGINS="https://fitai.app,https://www.fitai.app,http://localhost:8081"
app.use('*', async (c, next) => {
	const env = c.env;
	const origin = c.req.header('Origin');
	const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) || ['*'];

	// Determine if request origin is allowed
	// IMPORTANT: Access-Control-Allow-Credentials:true requires a specific origin (not *)
	// So we always echo back the request origin when one is present.
	let allowOrigin: string;
	if (allowedOrigins.includes('*')) {
		// Open — echo back the request origin, or fallback to * if no origin header
		allowOrigin = origin || '*';
	} else if (isLocalDevOrigin(origin)) {
		allowOrigin = origin;
	} else if (origin && allowedOrigins.includes(origin)) {
		allowOrigin = origin;
	} else {
		// Origin not in explicit allowlist — use first entry (browser will reject)
		allowOrigin = allowedOrigins[0];
	}

	// Set CORS headers
	c.header('Access-Control-Allow-Origin', allowOrigin);
	c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	c.header('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
	c.header('Access-Control-Max-Age', '86400');
	// Only set Allow-Credentials when we have a specific origin (credentials + * is invalid per CORS spec)
	if (allowOrigin !== '*') {
		c.header('Access-Control-Allow-Credentials', 'true');
	}

	// Handle preflight — build Response manually so CORS headers are included
	// (new Response(null,{status:204}) bypasses c.header() and strips them)
	if (c.req.method === 'OPTIONS') {
		const preflightHeaders: Record<string, string> = {
			'Access-Control-Allow-Origin': allowOrigin,
			'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400',
		};
		if (allowOrigin !== '*') {
			preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
		}
		return new Response(null, { status: 204, headers: preflightHeaders });
	}

	await next();
});

// Helper — add CORS headers to any Response so browsers don't block error responses
function addCorsHeaders(c: Parameters<Parameters<typeof app.onError>[0]>[1], response: Response): Response {
	const origin = c.req.header('Origin');
	const env = c.env as { ALLOWED_ORIGINS?: string };
	const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || ['*'];

	let allowOrigin: string;
	if (allowedOrigins.includes('*')) {
		allowOrigin = origin || '*';
	} else if (isLocalDevOrigin(origin)) {
		allowOrigin = origin;
	} else if (origin && allowedOrigins.includes(origin)) {
		allowOrigin = origin;
	} else {
		allowOrigin = allowedOrigins[0];
	}

	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', allowOrigin);
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (allowOrigin !== '*') {
		headers.set('Access-Control-Allow-Credentials', 'true');
	}
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Global error handling middleware
app.onError((err, c) => {
	logError(err, {
		method: c.req.method,
		path: c.req.path,
		url: c.req.url,
	});

	const errorResponse = createErrorResponse(err);
	return addCorsHeaders(c, errorResponse);
});

// 404 handler
app.notFound((c) => {
	const response = c.json(
		{
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: `Route ${c.req.method} ${c.req.path} not found`,
			},
		},
		404,
	);
	return addCorsHeaders(c, response);

});

// ============================================================================
// ROUTES
// ============================================================================

// Root route
app.get('/', (c) => {
	return c.json({
		success: true,
		data: {
			message: 'FitAI Workers API v2.0',
			status: 'online',
			timestamp: new Date().toISOString(),
		},
	});
});

// API version info
app.get('/api', (c) => {
	return c.json({
		success: true,
		data: {
			version: '2.0.0',
			name: 'FitAI Workers API',
			description: 'Centralized AI generation gateway',
			endpoints: {
				health: '/health',
				workout: '/workout/generate',
				diet: '/diet/generate',
				food: '/food/recognize',
				chat: '/chat/ai',
				exercises: '/exercises/search',
				media: '/media/*',
			},
		},
	});
});

// Health check endpoint
app.get('/health', handleHealthCheck);

// Analytics endpoint (protected - requires authentication)
app.get('/api/analytics/usage', authMiddleware, requireFeatureFlag('featureAnalytics'), rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleAnalytics);

// ============================================================================
// AUTHENTICATION TEST ENDPOINTS
// ============================================================================

// Protected endpoint - requires authentication + rate limit
app.get('/auth/me', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), (c) => {
	const user = c.get('user');
	return c.json({
		success: true,
		data: {
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
			message: 'Authenticated successfully',
		},
	});
});

// Optional auth endpoint - works with or without token + guest rate limit
app.get('/auth/status', optionalAuthMiddleware, rateLimitMiddleware(RATE_LIMITS.GUEST), (c) => {
	const user = c.get('user');

	if (user) {
		return c.json({
			success: true,
			data: {
				authenticated: true,
				userId: user.id,
				email: user.email,
			},
		});
	}

	return c.json({
		success: true,
		data: {
			authenticated: false,
			message: 'No authentication provided',
		},
	});
});

// ============================================================================
// RATE LIMIT TEST ENDPOINT
// ============================================================================

// Test endpoint to verify rate limiting (guest rate limit: 100/hour)
app.get('/test/rate-limit', rateLimitMiddleware(RATE_LIMITS.GUEST), (c) => {
	return c.json({
		success: true,
		data: {
			message: 'Rate limit check passed',
			rateLimit: {
				limit: c.res.headers.get('x-ratelimit-limit'),
				remaining: c.res.headers.get('x-ratelimit-remaining'),
				reset: c.res.headers.get('x-ratelimit-reset'),
			},
		},
	});
});
// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /workout/generate - Generate personalized workout plan
 * - Requires authentication
 * - Rate limit: 50 requests per hour
 * - Uses AI to generate custom workouts with 100% GIF coverage
 */
app.post(
	'/workout/generate',
	authMiddleware,
	rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
	subscriptionGateMiddleware('ai_generation'),
	handleWorkoutGeneration,
);

/**
 * POST /diet/generate - Generate personalized diet/meal plan
 * - Requires authentication
 * - Rate limit: 50 requests per hour
 * - Uses AI to generate balanced meal plans with nutritional accuracy
 */
app.post(
	'/diet/generate',
	authMiddleware,
	rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
	subscriptionGateMiddleware('ai_generation'),
	handleDietGeneration,
);

/**
 * GET /diet/jobs/:jobId - Check status of async diet generation job
 * - Requires authentication
 * - Rate limit: 2000 requests per hour (allows frequent polling)
 * - Returns job status, progress, and result when completed
 */
app.get('/diet/jobs/:jobId', authMiddleware, rateLimitMiddleware(RATE_LIMITS.JOB_STATUS), async (c) => {
	const { getJobStatus } = await import('./services/jobService');
	const jobId = c.req.param('jobId');
	const user = c.get('user');
	const userId = user.id;

	try {
		const jobStatus = await getJobStatus(c.env, jobId, userId);

		return c.json({
			success: true,
			data: jobStatus,
		});
	} catch (error: any) {
		return c.json(
			{
				success: false,
				error: {
					code: error.code || 'JOB_NOT_FOUND',
					message: error.message || 'Job not found',
				},
			},
			error.statusCode || 404,
		);
	}
});

/**
 * GET /diet/jobs - List recent diet generation jobs for the authenticated user
 * - Requires authentication
 * - Rate limit: 2000 requests per hour
 * - Returns last 20 jobs with their status
 */
app.get('/diet/jobs', authMiddleware, rateLimitMiddleware(RATE_LIMITS.JOB_STATUS), async (c) => {
	const { listUserJobs } = await import('./services/jobService');
	const user = c.get('user');
	const userId = user.id;

	try {
		const jobs = await listUserJobs(c.env, userId);

		return c.json({
			success: true,
			data: { jobs },
		});
	} catch (error: any) {
		return c.json(
			{
				success: false,
				error: {
					code: error.code || 'INTERNAL_ERROR',
					message: error.message || 'Failed to list jobs',
				},
			},
			error.statusCode || 500,
		);
	}
});

/**
 * POST /food/recognize - Recognize food from image using Gemini Vision
 * - Requires authentication
 * - Rate limit: 50 requests per hour
 * - Accepts base64 image, returns recognized foods with nutrition
 * - Supports Indian and international cuisines
 */
app.post(
	'/food/recognize',
	authMiddleware,
	rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
	subscriptionGateMiddleware('barcode_scan'),
	handleFoodRecognition,
);

/**
 * POST /food/label-scan - Extract nutrition data from a packaged food label photo
 * - Requires authentication
 * - Rate limit: 50 requests per hour (AI_GENERATION tier)
 * - Accepts base64 image of nutrition facts table, returns structured nutrition data
 * - Uses Gemini Vision to read values verbatim from the label — no estimation
 */
app.post(
	'/food/label-scan',
	authMiddleware,
	rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
	subscriptionGateMiddleware('barcode_scan'),
	handleNutritionLabelScan,
);

/**
 * POST /nutrition/barcode-estimate - Estimate nutrition for a named product via AI
 * - Requires authentication
 * - Rate limit: 50 requests per hour (AI_GENERATION tier)
 * - Accepts productName, brand, country — NEVER a raw barcode number
 * - Returns macros per 100g estimated by Gemini via AI Gateway
 */
app.post(
	'/nutrition/barcode-estimate',
	authMiddleware,
	rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
	subscriptionGateMiddleware('barcode_scan'),
	handleNutritionEstimate,
);

/**
 * POST /chat/ai - AI conversational fitness coaching
 * - Requires authentication
 * - Rate limit: 50 requests per hour
 * - Supports streaming (SSE) and non-streaming responses
 * - Context-aware based on user's workouts and diet
 */
app.post(
	'/chat/ai',
	authMiddleware,
	requireFeatureFlag('featureAiChat'),
	rateLimitMiddleware(RATE_LIMITS.AI_GENERATION),
	subscriptionGateMiddleware('ai_generation'),
	handleChat,
);

/**
 * GET /chat/conversations - Get user's conversation list
 * - Requires authentication
 * - Returns recent conversations with metadata
 */
app.get('/chat/conversations', authMiddleware, requireFeatureFlag('featureAiChat'), rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleGetConversations);

/**
 * GET /chat/history/:conversationId - Get conversation message history
 * - Requires authentication
 * - Returns all messages in chronological order
 */
app.get('/chat/history/:conversationId', authMiddleware, requireFeatureFlag('featureAiChat'), rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleGetConversationHistory);

/**
 * GET /exercises/search - Search and filter exercise database
 * - Requires authentication
 * - Rate limit: 1000 requests per hour (authenticated users)
 * - Supports full-text search, equipment/muscle/body part filters
 * - Pagination with limit/offset
 * - Returns exercises with 100% GIF coverage
 */
app.get('/exercises/search', optionalAuthMiddleware, rateLimitMiddleware(RATE_LIMITS.GUEST), handleExerciseSearch);

/**
 * GET /media/:category/:id - Serve media file from R2 bucket
 * - Public endpoint (no authentication required)
 * - Rate limit: 1000 requests per hour
 * - Categories: exercise, diet, user
 * - Returns: image/gif with proper caching headers
 * - Cache: 1 year for exercises, 1 day for diet, 1 hour for user
 */
app.get('/media/:category/:id', rateLimitMiddleware(RATE_LIMITS.GUEST), handleMediaServe);

/**
 * POST /media/upload - Upload media file to R2 bucket
 * - Requires authentication
 * - Rate limit: 50 requests per hour
 * - Max file size: 10MB
 * - Supported: images (jpg, png, gif, webp)
 * - Returns: URL to uploaded media
 */
app.post('/media/upload', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), handleMediaUpload);

/**
 * DELETE /media/:category/:id - Delete media file from R2 bucket
 * - Requires authentication
 * - Rate limit: 50 requests per hour
 * - Users can only delete their own uploads
 */
app.delete('/media/:category/:id', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AI_GENERATION), handleMediaDelete);

/**
 * POST /api/health/sync - Sync health data from wearables
 * - Requires authentication
 * - Rate limit: 100 requests per minute
 * - Accepts health metrics (steps, calories, heart_rate, etc.)
 * - Idempotent upserts with data_source tracking
 */
app.post('/api/health/sync', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleHealthSync);

/**
 * GET /api/health/latest - Retrieve latest health metrics
 * - Requires authentication
 * - Rate limit: 100 requests per minute
 * - Query params: days (1-365, default: 7)
 * - Returns health logs for specified date range
 */
app.get('/api/health/latest', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleHealthLatest);

/**
 * POST /api/health/workout - Save workout session
 * - Requires authentication
 * - Rate limit: 100 requests per minute
 * - Accepts workout details (type, duration, intensity, etc.)
 * - Stores in workout_sessions table
 */
app.post('/api/health/workout', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleWorkoutSession);

// ============================================================================
// SUBSCRIPTION & PAYMENT ROUTES
// ============================================================================

app.post('/api/subscription/create', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleCreateSubscription);

app.post('/api/subscription/verify', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleVerifyPayment);

app.post('/api/webhook/razorpay', handleWebhook);

app.get('/api/subscription/status', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleGetSubscriptionStatus);

app.post('/api/subscription/cancel', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleCancelSubscription);

app.post('/api/subscription/pause', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handlePauseSubscription);

app.post('/api/subscription/resume', authMiddleware, rateLimitMiddleware(RATE_LIMITS.AUTHENTICATED), handleResumeSubscription);

// ============================================================================
// ADMIN ROUTES — requireRole('admin') guard
// ============================================================================

const adminMW = [authMiddleware, requireRole('admin')] as const;

app.get('/api/admin/dashboard',                   ...adminMW, handleAdminDashboard);
app.get('/api/admin/session',                     ...adminMW, handleAdminSession);
app.get('/api/admin/config',                      ...adminMW, handleGetConfig);
app.post('/api/admin/config',                     ...adminMW, handleSetConfig);
app.get('/api/admin/plans',                       ...adminMW, handleGetPlans);
app.patch('/api/admin/plans/:tier',               ...adminMW, handleUpdatePlan);
app.get('/api/admin/users',                       ...adminMW, handleListUsers);
app.get('/api/admin/users/:userId',               ...adminMW, handleGetUser);
app.post('/api/admin/users/:userId/subscription', ...adminMW, handleOverrideSubscription);
app.get('/api/admin/analytics',                   ...adminMW, handleAdminAnalytics);
app.get('/api/admin/cache/stats',                 ...adminMW, handleCacheStats);
app.post('/api/admin/cache/clear',                ...adminMW, handleClearCache);
app.get('/api/admin/contributions',               ...adminMW, handleListContributions);
app.post('/api/admin/contributions/:id/approve',  ...adminMW, handleApproveContribution);
app.post('/api/admin/contributions/:id/reject',   ...adminMW, handleRejectContribution);
app.get('/api/admin/webhooks',                    ...adminMW, handleWebhookLogs);
app.get('/api/admin/admins',                      ...adminMW, handleListAdmins);
app.post('/api/admin/admins',                     ...adminMW, handleCreateAdmin);
app.delete('/api/admin/admins/:userId',           ...adminMW, handleRemoveAdmin);

// ============================================================================
// EXPORT WORKER
// ============================================================================

export default {
	fetch: app.fetch,
	async queue(batch: MessageBatch<DietJobMessage>, env: Env): Promise<void> {
		const { consumeDietJobs } = await import('./handlers/queueConsumer');
		await consumeDietJobs(batch, env);
	},
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const { processPendingJobs } = await import('./handlers/cronJobProcessor');
		ctx.waitUntil(processPendingJobs(env));
	},
};
