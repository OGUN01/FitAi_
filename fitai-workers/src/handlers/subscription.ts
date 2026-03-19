/**
 * FitAI Workers - Subscription Handler
 *
 * Razorpay subscription lifecycle endpoints:
 * - POST /api/subscription/create - Create new Razorpay subscription
 * - POST /api/subscription/verify - Verify payment signature after checkout
 * - POST /api/webhook/razorpay - Process Razorpay webhook events
 * - GET /api/subscription/status - Get current subscription status
 */

import { Context } from 'hono';
import { Env, SubscriptionTier, SubscriptionStatus, RazorpaySubscription, RazorpayWebhookEvent } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import { ErrorCode } from '../utils/errorCodes';
import { APIError } from '../utils/errors';
import { getSupabaseClient } from '../utils/supabase';
import { razorpayFetch, verifyPaymentSignature, verifyWebhookSignature } from '../utils/razorpay';

// ============================================================================
// TYPES
// ============================================================================

interface CreateSubscriptionBody {
	plan_id: string;
	billing_cycle: 'monthly' | 'yearly';
}

interface VerifyPaymentBody {
	razorpay_payment_id: string;
	razorpay_subscription_id: string;
	razorpay_signature: string;
}

interface SubscriptionPlanRow {
	id: string;
	tier: SubscriptionTier;
	name: string;
	description: string | null;
	price_monthly: number | null;
	price_yearly: number | null;
	razorpay_plan_id_monthly: string | null;
	razorpay_plan_id_yearly: string | null;
	ai_generations_per_day: number | null;
	ai_generations_per_month: number | null;
	scans_per_day: number | null;
	unlimited_scans: boolean;
	unlimited_ai: boolean;
	analytics: boolean;
	coaching: boolean;
	active: boolean;
}

interface SubscriptionRow {
	id: string;
	user_id: string;
	razorpay_subscription_id: string;
	razorpay_customer_id: string | null;
	razorpay_plan_id: string;
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	billing_cycle: string | null;
	current_period_start: number | null;
	current_period_end: number | null;
	cancelled_at: number | null;
	paused_at: number | null;
	notes: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

function getCurrentPeriodStart(periodType: 'daily' | 'monthly'): string {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	return periodType === 'daily' ? `${year}-${month}-${day}` : `${year}-${month}-01`;
}

async function getUsageCount(
	supabase: ReturnType<typeof getSupabaseClient>,
	userId: string,
	featureKey: 'ai_generation' | 'barcode_scan',
	periodType: 'daily' | 'monthly',
): Promise<number | null> {
	try {
		const rpc = (supabase as { rpc?: (...args: unknown[]) => Promise<{ data: unknown; error: unknown }> }).rpc;
		if (typeof rpc !== 'function') {
			return null;
		}

		const { data, error } = await rpc('get_feature_usage', {
			p_user_id: userId,
			p_feature_key: featureKey,
			p_period_type: periodType,
			p_period_start: getCurrentPeriodStart(periodType),
		});

		if (error) {
			console.warn('[Subscription] Failed to read feature usage:', error);
			return null;
		}

		return typeof data === 'number' ? data : 0;
	} catch (error) {
		console.warn('[Subscription] Usage RPC unavailable during status read:', error);
		return null;
	}
}

async function buildUsageSummary(
	supabase: ReturnType<typeof getSupabaseClient>,
	userId: string,
	features: {
		ai_generations_per_day: number | null;
		ai_generations_per_month: number | null;
		scans_per_day: number | null;
		unlimited_scans: boolean;
		unlimited_ai: boolean;
	},
) {
	const [aiDailyCurrent, aiMonthlyCurrent, scanDailyCurrent] = await Promise.all([
		getUsageCount(supabase, userId, 'ai_generation', 'daily'),
		getUsageCount(supabase, userId, 'ai_generation', 'monthly'),
		getUsageCount(supabase, userId, 'barcode_scan', 'daily'),
	]);

	if (
		aiDailyCurrent === null ||
		aiMonthlyCurrent === null ||
		scanDailyCurrent === null
	) {
		return null;
	}

	return {
		ai_generation: {
			daily: {
				current: aiDailyCurrent,
				limit: features.unlimited_ai ? null : features.ai_generations_per_day,
				remaining:
					features.unlimited_ai || features.ai_generations_per_day == null
						? null
						: Math.max(0, features.ai_generations_per_day - aiDailyCurrent),
			},
			monthly: {
				current: aiMonthlyCurrent,
				limit: features.unlimited_ai ? null : features.ai_generations_per_month,
				remaining:
					features.unlimited_ai || features.ai_generations_per_month == null
						? null
						: Math.max(0, features.ai_generations_per_month - aiMonthlyCurrent),
			},
		},
		barcode_scan: {
			daily: {
				current: scanDailyCurrent,
				limit: features.unlimited_scans ? null : features.scans_per_day,
				remaining:
					features.unlimited_scans || features.scans_per_day == null
						? null
						: Math.max(0, features.scans_per_day - scanDailyCurrent),
			},
		},
	};
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve a Razorpay plan ID to the tier and billing_cycle by checking subscription_plans table.
 */
async function resolvePlanTier(
	env: Env,
	razorpayPlanId: string,
): Promise<{ tier: SubscriptionTier; billing_cycle: 'monthly' | 'yearly' } | null> {
	const supabase = getSupabaseClient(env);

	// Check monthly plan IDs
	const { data: monthlyMatch } = await supabase
		.from('subscription_plans')
		.select('tier')
		.eq('razorpay_plan_id_monthly', razorpayPlanId)
		.eq('active', true)
		.single();

	if (monthlyMatch) {
		return { tier: monthlyMatch.tier as SubscriptionTier, billing_cycle: 'monthly' };
	}

	// Check yearly plan IDs
	const { data: yearlyMatch } = await supabase
		.from('subscription_plans')
		.select('tier')
		.eq('razorpay_plan_id_yearly', razorpayPlanId)
		.eq('active', true)
		.single();

	if (yearlyMatch) {
		return { tier: yearlyMatch.tier as SubscriptionTier, billing_cycle: 'yearly' };
	}

	return null;
}

/**
 * Determine which statuses grant access (active or grace period).
 */
function isAccessGrantingStatus(status: SubscriptionStatus): boolean {
	// 'pending' treated as active (grace period for payment processing)
	return status === 'active' || status === 'pending' || status === 'authenticated';
}

function isNotFoundError(error: { code?: string; message?: string } | null | undefined): boolean {
	return Boolean(error && (error.code === 'PGRST116' || /not found/i.test(error.message || '')));
}

function getSubscriptionNotes(subscription: SubscriptionRow | null | undefined): Record<string, unknown> {
	const notes = subscription?.notes;
	return notes && typeof notes === 'object' ? notes : {};
}

function getLastWebhookEventAt(subscription: SubscriptionRow | null | undefined): number {
	const notes = getSubscriptionNotes(subscription);
	const value = notes.last_webhook_event_at;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return 0;
}

function normalizeSingleResult<T>(data: T | T[] | null | undefined): T | null {
	if (Array.isArray(data)) {
		return data[0] ?? null;
	}
	return data ?? null;
}

async function readSingleRow<T>(limitedQuery: any): Promise<T | null> {
	const runners: Array<() => Promise<{ data?: T | T[] | null; error?: { code?: string; message?: string } | null }>> = [];

	if (typeof limitedQuery?.single === 'function') {
		runners.push(() => limitedQuery.single<T>());
	}

	if (typeof limitedQuery?.maybeSingle === 'function') {
		runners.push(() => limitedQuery.maybeSingle<T>());
	}

	if (runners.length === 0) {
		const result = await limitedQuery;
		return normalizeSingleResult(result?.data ?? result);
	}

	let lastNotFound: { code?: string; message?: string } | null = null;

	for (const run of runners) {
		const result = await run();
		if (result?.error) {
			if (isNotFoundError(result.error)) {
				lastNotFound = result.error;
				continue;
			}
			throw result.error;
		}

		const row = normalizeSingleResult(result?.data);
		if (row) {
			return row;
		}
	}

	if (lastNotFound) {
		return null;
	}

	return null;
}

async function fetchLatestSubscriptionForUser(
	supabase: ReturnType<typeof getSupabaseClient>,
	userId: string,
	statuses?: readonly SubscriptionStatus[],
): Promise<SubscriptionRow | null> {
	let query = supabase
		.from('subscriptions')
		.select('*')
		.eq('user_id', userId);

	if (statuses && statuses.length > 0) {
		query = query.in('status', statuses as SubscriptionStatus[]);
	}

	const limitedQuery = query.order('updated_at', { ascending: false }).limit(1) as any;
	return readSingleRow<SubscriptionRow>(limitedQuery);
}

async function fetchLatestSubscriptionByRazorpayId(
	supabase: ReturnType<typeof getSupabaseClient>,
	razorpaySubscriptionId: string,
): Promise<SubscriptionRow | null> {
	const limitedQuery = supabase
		.from('subscriptions')
		.select('*')
		.eq('razorpay_subscription_id', razorpaySubscriptionId)
		.order('updated_at', { ascending: false })
		.limit(1) as any;
	return readSingleRow<SubscriptionRow>(limitedQuery);
}

async function fetchFreePlan(supabase: ReturnType<typeof getSupabaseClient>): Promise<SubscriptionPlanRow> {
	const { data, error } = await supabase
		.from('subscription_plans')
		.select('*')
		.eq('tier', 'free')
		.eq('active', true)
		.single<SubscriptionPlanRow>();

	if (error || !data) {
		throw new APIError('Free tier plan is not configured', 500, ErrorCode.DATABASE_ERROR, {
			detail: error?.message ?? 'free plan missing',
		});
	}

	return data;
}

async function webhookEventAlreadyProcessed(
	supabase: ReturnType<typeof getSupabaseClient>,
	eventId: string,
): Promise<boolean> {
	const { data, error } = await supabase
		.from('webhook_events')
		.select('id')
		.eq('id', eventId)
		.limit(1)
		.single();

	if (error) {
		if (isNotFoundError(error)) {
			return false;
		}
		throw error;
	}

	return Boolean(data);
}

async function recordWebhookEvent(
	supabase: ReturnType<typeof getSupabaseClient>,
	eventId: string,
	eventType: string,
	payload: RazorpayWebhookEvent & {
		_event_id: string;
		_event_result?: 'processed' | 'skipped';
		_event_reason?: string;
	},
): Promise<void> {
	await supabase.from('webhook_events').insert({
		id: eventId,
		event_type: eventType,
		payload,
	});
}

function buildWebhookPayload(
	eventId: string,
	event: RazorpayWebhookEvent,
	result: 'processed' | 'skipped',
	reason?: string,
) {
	return {
		...event,
		_event_id: eventId,
		_event_result: result,
		...(reason ? { _event_reason: reason } : {}),
	};
}

function mergeNotes(
	subscription: SubscriptionRow | null,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	return {
		...getSubscriptionNotes(subscription),
		...patch,
	};
}

// ============================================================================
// 1. CREATE SUBSCRIPTION
// ============================================================================

/**
 * POST /api/subscription/create
 *
 * Creates a Razorpay subscription for the authenticated user.
 * Looks up the Razorpay plan ID from the subscription_plans table,
 * creates the subscription via Razorpay API, and saves the record to Supabase.
 *
 * Returns the subscription_id and key_id for the frontend Razorpay checkout.
 */
export async function handleCreateSubscription(c: Context<{ Bindings: Env; Variables: AuthContext }>): Promise<Response> {
	const env = c.env;
	const user = c.get('user');
	const userId = user.id;

	// Parse and validate request body
	let body: CreateSubscriptionBody;
	try {
		body = await c.req.json<CreateSubscriptionBody>();
	} catch {
		throw new APIError('Invalid JSON request body', 400, ErrorCode.INVALID_REQUEST);
	}

	if (!body.plan_id || !body.billing_cycle) {
		throw new APIError('Missing required fields: plan_id and billing_cycle', 400, ErrorCode.MISSING_REQUIRED_FIELD);
	}

	if (body.billing_cycle !== 'monthly' && body.billing_cycle !== 'yearly') {
		throw new APIError('billing_cycle must be "monthly" or "yearly"', 400, ErrorCode.INVALID_PARAMETER);
	}

	const supabase = getSupabaseClient(env);

	// Lookup plan in subscription_plans table to get Razorpay plan ID
	const { data: plan, error: planError } = await supabase
		.from('subscription_plans')
		.select('*')
		.eq('id', body.plan_id)
		.eq('active', true)
		.single<SubscriptionPlanRow>();

	if (planError || !plan) {
		throw new APIError('Subscription plan not found', 404, ErrorCode.NOT_FOUND);
	}

	if (plan.tier === 'free') {
		throw new APIError('Cannot create a paid subscription for the free tier', 400, ErrorCode.INVALID_REQUEST);
	}

	// Determine the Razorpay plan ID based on billing cycle
	const razorpayPlanId = body.billing_cycle === 'yearly' ? plan.razorpay_plan_id_yearly : plan.razorpay_plan_id_monthly;

	if (!razorpayPlanId) {
		throw new APIError(`Plan does not support ${body.billing_cycle} billing`, 400, ErrorCode.INVALID_PARAMETER);
	}

	// Check if user already has any non-terminal subscription record
	const existingSubscription = await fetchLatestSubscriptionForUser(supabase, userId, [
		'created',
		'authenticated',
		'active',
		'pending',
		'halted',
		'paused',
	]);

	if (existingSubscription?.id) {
		throw new APIError('User already has an active or pending subscription', 409, ErrorCode.RESOURCE_ALREADY_EXISTS);
	}

	// Create subscription via Razorpay API
	const razorpayResponse = await razorpayFetch(env, '/subscriptions', 'POST', {
		plan_id: razorpayPlanId,
		total_count: body.billing_cycle === 'yearly' ? 5 : 60, // Max billing cycles
		notes: {
			user_id: userId,
			tier: plan.tier,
			billing_cycle: body.billing_cycle,
		},
	});

	if (!razorpayResponse.ok) {
		const errorBody = await razorpayResponse.text();
		throw new APIError('Failed to create Razorpay subscription', 502, ErrorCode.INTERNAL_ERROR, { razorpayError: errorBody });
	}

	const razorpaySubscription: RazorpaySubscription = await razorpayResponse.json();

	// Save subscription record to Supabase
	const { error: insertError } = await supabase.from('subscriptions').insert({
		user_id: userId,
		razorpay_subscription_id: razorpaySubscription.id,
		razorpay_customer_id: razorpaySubscription.customer_id || null,
		razorpay_plan_id: razorpayPlanId,
		tier: plan.tier,
		status: 'created' satisfies SubscriptionStatus,
		billing_cycle: body.billing_cycle,
		current_period_start: razorpaySubscription.current_start || null,
		current_period_end: razorpaySubscription.current_end || null,
		notes: {
			plan_name: plan.name,
			created_via: 'api',
		},
	});

	if (insertError) {
		try {
			await razorpayFetch(env, `/subscriptions/${razorpaySubscription.id}/cancel`, 'POST', {
				cancel_at_cycle_end: false,
			});
		} catch {
			// Best-effort remote cleanup only.
		}

		if ((insertError as { code?: string }).code === '23505') {
			throw new APIError('User already has an active or pending subscription', 409, ErrorCode.RESOURCE_ALREADY_EXISTS);
		}

		throw new APIError('Failed to save subscription record', 500, ErrorCode.DATABASE_ERROR, { detail: insertError.message });
	}

	return c.json(
		{
			success: true,
			data: {
				subscription_id: razorpaySubscription.id,
				key_id: env.RAZORPAY_KEY_ID,
				short_url: razorpaySubscription.short_url,
				status: razorpaySubscription.status,
			},
		},
		200,
	);
}

// ============================================================================
// 2. VERIFY PAYMENT
// ============================================================================

/**
 * POST /api/subscription/verify
 *
 * Verifies the Razorpay payment signature after the user completes checkout.
 * Uses HMAC-SHA256 verification via Web Crypto API.
 * Updates the subscription status to 'authenticated' upon success.
 */
export async function handleVerifyPayment(c: Context<{ Bindings: Env; Variables: AuthContext }>): Promise<Response> {
	const env = c.env;
	const user = c.get('user');
	const userId = user.id;

	// Parse and validate request body
	let body: VerifyPaymentBody;
	try {
		body = await c.req.json<VerifyPaymentBody>();
	} catch {
		throw new APIError('Invalid JSON request body', 400, ErrorCode.INVALID_REQUEST);
	}

	if (!body.razorpay_payment_id || !body.razorpay_subscription_id || !body.razorpay_signature) {
		throw new APIError(
			'Missing required fields: razorpay_payment_id, razorpay_subscription_id, razorpay_signature',
			400,
			ErrorCode.MISSING_REQUIRED_FIELD,
		);
	}

	// Verify payment signature using Web Crypto API
	const isValid = await verifyPaymentSignature(
		body.razorpay_payment_id,
		body.razorpay_subscription_id,
		body.razorpay_signature,
		env.RAZORPAY_KEY_SECRET,
	);

	if (!isValid) {
		throw new APIError('Payment signature verification failed', 400, ErrorCode.PAYMENT_VERIFICATION_FAILED);
	}

	const supabase = getSupabaseClient(env);

	const subscription = await fetchLatestSubscriptionByRazorpayId(supabase, body.razorpay_subscription_id);

	if (!subscription?.id) {
		throw new APIError('Subscription not found for this user', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (!['created', 'pending', 'authenticated'].includes(subscription.status)) {
		throw new APIError('Subscription is not in a verifiable state', 409, ErrorCode.SUBSCRIPTION_INACTIVE);
	}

	const verifiedPaymentId = getSubscriptionNotes(subscription).verified_payment_id;
	if (subscription.status === 'authenticated' && typeof verifiedPaymentId === 'string') {
		if (verifiedPaymentId === body.razorpay_payment_id) {
			return c.json(
				{
					success: true,
					data: {
						subscription_id: subscription.razorpay_subscription_id,
						tier: subscription.tier,
						status: subscription.status,
						payment_id: body.razorpay_payment_id,
						verified: true,
					},
				},
				200,
			);
		}

		throw new APIError('Subscription already verified with a different payment', 409, ErrorCode.RESOURCE_ALREADY_EXISTS);
	}

	const { error: updateError } = await supabase
		.from('subscriptions')
		.update({
			status: 'authenticated' satisfies SubscriptionStatus,
			notes: mergeNotes(subscription, {
				verified_payment_id: body.razorpay_payment_id,
				verified_at: new Date().toISOString(),
			}),
		})
		.eq('id', subscription.id);

	if (updateError) {
		throw new APIError('Failed to verify subscription payment', 500, ErrorCode.DATABASE_ERROR, { detail: updateError.message });
	}

	return c.json(
		{
			success: true,
			data: {
				subscription_id: subscription.razorpay_subscription_id,
				tier: subscription.tier,
				status: 'authenticated',
				payment_id: body.razorpay_payment_id,
				verified: true,
			},
		},
		200,
	);
}

// ============================================================================
// 3. WEBHOOK
// ============================================================================

/**
 * Map Razorpay webhook event names to subscription status values.
 */
const WEBHOOK_EVENT_STATUS_MAP: Record<string, SubscriptionStatus> = {
	'subscription.activated': 'active',
	'subscription.charged': 'active',
	'subscription.pending': 'pending',
	'subscription.halted': 'halted',
	'subscription.paused': 'paused',
	'subscription.resumed': 'active',
	'subscription.cancelled': 'cancelled',
};

const ALL_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
	'created',
	'authenticated',
	'active',
	'pending',
	'halted',
	'paused',
	'cancelled',
	'completed',
];

/**
 * POST /api/webhook/razorpay
 *
 * Processes incoming Razorpay webhook events.
 * - NO auth middleware (uses signature verification instead)
 * - ALWAYS returns 200 (prevents Razorpay retry storms on internal errors)
 * - Uses x-razorpay-event-id for idempotency via webhook_events table
 * - Handles 7 subscription lifecycle events
 */
export async function handleWebhook(c: Context<{ Bindings: Env }>): Promise<Response> {
	const env = c.env;

	// Get raw body for signature verification (MUST NOT re-serialize)
	let rawBody: string;
	try {
		rawBody = await c.req.text();
	} catch {
		// Always return 200 to prevent Razorpay retry storms
		return c.json({ success: false, error: 'Failed to read request body' }, 200);
	}

	// Verify webhook signature
	const signature = c.req.header('x-razorpay-signature') || '';
	if (!signature) {
		return c.json({ success: false, error: 'Missing webhook signature' }, 200);
	}

	let isValidSignature: boolean;
	try {
		isValidSignature = await verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
	} catch {
		return c.json({ success: false, error: 'Signature verification error' }, 200);
	}

	if (!isValidSignature) {
		// Log invalid signature attempt but still return 200
		return c.json({ success: false, error: 'Invalid webhook signature' }, 200);
	}

	// Parse the event payload
	let event: RazorpayWebhookEvent;
	try {
		event = JSON.parse(rawBody) as RazorpayWebhookEvent;
	} catch {
		return c.json({ success: false, error: 'Invalid JSON payload' }, 200);
	}

	// Check idempotency: extract event ID from header
	const eventId = c.req.header('x-razorpay-event-id') || '';
	if (!eventId) {
		return c.json({ success: false, error: 'Missing event ID' }, 200);
	}

	const supabase = getSupabaseClient(env);

	// Deduplication: check if we've already processed this event
	try {
		if (await webhookEventAlreadyProcessed(supabase, eventId)) {
			// Already processed, return success
			return c.json({ success: true, message: 'Event already processed' }, 200);
		}
	} catch {
		// Table might not exist yet or query failed; continue processing
	}

	// Determine the new status from event type
	const eventType = event.event;
	const newStatus = WEBHOOK_EVENT_STATUS_MAP[eventType];

	if (!newStatus) {
		// Unhandled event type â€” log for idempotency and return success
		try {
			await recordWebhookEvent(supabase, eventId, eventType, buildWebhookPayload(eventId, event, 'skipped', 'unhandled_event'));
		} catch {
			// Non-critical: idempotency insert failed
		}
		return c.json({ success: true, message: 'Event type not handled' }, 200);
	}

	// Extract subscription data from payload
	const subscriptionEntity = event.payload.subscription?.entity;
	if (!subscriptionEntity) {
		return c.json({ success: false, error: 'No subscription entity in payload' }, 200);
	}

	const razorpaySubscriptionId = subscriptionEntity.id;
	const razorpayPlanId = subscriptionEntity.plan_id;

	let existingSubscription: SubscriptionRow | null;
	try {
		existingSubscription = await fetchLatestSubscriptionByRazorpayId(supabase, razorpaySubscriptionId);
	} catch {
		try {
			await recordWebhookEvent(
				supabase,
				eventId,
				event.event,
				buildWebhookPayload(eventId, event, 'skipped', 'subscription_lookup_failed'),
			);
		} catch {
			// Best effort only; the webhook must still be acknowledged.
		}
		return c.json({ success: true, message: 'Webhook received but subscription lookup failed' }, 200);
	}

	if (!existingSubscription?.id) {
		try {
			await recordWebhookEvent(supabase, eventId, event.event, buildWebhookPayload(eventId, event, 'skipped', 'missing_subscription'));
		} catch {
			// Best effort only; we still acknowledge the webhook to avoid retry storms.
		}
		return c.json({ success: true, message: 'Webhook received but no matching subscription record exists' }, 200);
	}

	if (getLastWebhookEventAt(existingSubscription) > event.created_at) {
		try {
			await recordWebhookEvent(
				supabase,
				eventId,
				eventType,
				buildWebhookPayload(eventId, event, 'skipped', 'stale_event'),
			);
		} catch {
			// Non-critical: stale event logging failed
		}
		return c.json({ success: true, message: 'Stale webhook ignored' }, 200);
	}

	// Resolve tier from the plan ID
	const tierInfo = await resolvePlanTier(env, razorpayPlanId);

	// Build update object
	const updateData: Record<string, unknown> = {
		status: newStatus,
		razorpay_customer_id: subscriptionEntity.customer_id || null,
		notes: mergeNotes(existingSubscription, {
			last_webhook_event_at: event.created_at,
			last_webhook_event_type: eventType,
			last_webhook_event_id: eventId,
		}),
	};

	// Update period timestamps for activation/charge events
	if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
		updateData.current_period_start = subscriptionEntity.current_start;
		updateData.current_period_end = subscriptionEntity.current_end;
	}

	// Update tier if we resolved it
	if (tierInfo) {
		updateData.tier = tierInfo.tier;
		updateData.billing_cycle = tierInfo.billing_cycle;
	}

	// Handle specific event metadata
	if (eventType === 'subscription.cancelled') {
		updateData.cancelled_at = subscriptionEntity.ended_at || Math.floor(Date.now() / 1000);
	}

	if (eventType === 'subscription.paused') {
		updateData.paused_at = Math.floor(Date.now() / 1000);
	}

	if (eventType === 'subscription.resumed') {
		updateData.paused_at = null;
	}

	// Update the subscription record in Supabase
	const { error: updateError } = await supabase
		.from('subscriptions')
		.update(updateData)
		.eq('id', existingSubscription.id);

	if (updateError) {
		return c.json({ success: false, error: 'Database update failed' }, 500);
	}

	// Record successful event processing for idempotency
	try {
		await recordWebhookEvent(supabase, eventId, eventType, buildWebhookPayload(eventId, event, 'processed'));
	} catch {
		return c.json({ success: false, error: 'Failed to record webhook event' }, 500);
	}

	return c.json({ success: true, message: 'Webhook processed' }, 200);
}

// ============================================================================
// 4. GET SUBSCRIPTION STATUS
// ============================================================================

/**
 * Free tier defaults when user has no active subscription.
 */
const FREE_TIER_DEFAULTS = {
	tier: 'free' as SubscriptionTier,
	name: 'Free',
	status: 'active' as SubscriptionStatus,
	billing_cycle: null,
	current_period_end: null,
	features: {
		ai_generations_per_day: null as number | null,
		ai_generations_per_month: 1,
		scans_per_day: 10,
		unlimited_scans: false,
		unlimited_ai: false,
		analytics: false,
		coaching: false,
	},
};

/**
 * GET /api/subscription/status
 *
 * Returns the authenticated user's current subscription status,
 * including plan details, feature limits, and period end date.
 * Returns free tier defaults if no active subscription exists.
 */
export async function handleGetSubscriptionStatus(c: Context<{ Bindings: Env; Variables: AuthContext }>): Promise<Response> {
	const env = c.env;
	const user = c.get('user');
	const userId = user.id;

	const supabase = getSupabaseClient(env);

	let subscription: SubscriptionRow | null;
	try {
		subscription = await fetchLatestSubscriptionForUser(supabase, userId, ALL_SUBSCRIPTION_STATUSES);
	} catch (error) {
		console.error('[Subscription] Error querying subscription status:', error);
		throw new APIError('Failed to load subscription status', 500, ErrorCode.DATABASE_ERROR);
	}

	if (!subscription?.id) {
		const { data: freePlan, error: freePlanError } = await supabase
			.from('subscription_plans')
			.select('*')
			.eq('tier', 'free')
			.eq('active', true)
			.single<SubscriptionPlanRow>();

		if (freePlanError && !isNotFoundError(freePlanError)) {
			console.error('[Subscription] Error querying free plan:', freePlanError);
			throw new APIError('Failed to load free plan', 500, ErrorCode.DATABASE_ERROR);
		}

		if (freePlan) {
			const features = {
				ai_generations_per_day: freePlan.ai_generations_per_day,
				ai_generations_per_month: freePlan.ai_generations_per_month,
				scans_per_day: freePlan.scans_per_day,
				unlimited_scans: freePlan.unlimited_scans,
				unlimited_ai: freePlan.unlimited_ai,
				analytics: freePlan.analytics,
				coaching: freePlan.coaching,
			};
			const usage = await buildUsageSummary(supabase, userId, features);
			return c.json(
				{
					success: true,
					data: {
						tier: 'free' as SubscriptionTier,
						name: freePlan.name,
						status: 'active' as SubscriptionStatus,
						is_active: true,
						billing_cycle: null,
						current_period_end: null,
						razorpay_subscription_id: null,
						features,
						...(usage ? { usage } : {}),
					},
				},
				200,
			);
		}

		const usage = await buildUsageSummary(supabase, userId, FREE_TIER_DEFAULTS.features);
		return c.json(
			{
				success: true,
				data: {
					...FREE_TIER_DEFAULTS,
					is_active: true,
					razorpay_subscription_id: null,
					...(usage ? { usage } : {}),
				},
			},
			200,
		);
	}

	const { data: plan, error: planError } = await supabase
		.from('subscription_plans')
		.select('*')
		.eq('tier', subscription.tier)
		.eq('active', true)
		.single<SubscriptionPlanRow>();

	if (planError || !plan) {
		console.error('[Subscription] Error querying subscription plan:', planError ?? new Error('Plan row missing'));
		throw new APIError('Failed to load subscription plan', 500, ErrorCode.DATABASE_ERROR);
	}

	const isActive = isAccessGrantingStatus(subscription.status);
	const features = {
		ai_generations_per_day: plan.ai_generations_per_day,
		ai_generations_per_month: plan.ai_generations_per_month,
		scans_per_day: plan.scans_per_day,
		unlimited_scans: plan.unlimited_scans,
		unlimited_ai: plan.unlimited_ai,
		analytics: plan.analytics,
		coaching: plan.coaching,
	};
	const usage = await buildUsageSummary(supabase, userId, features);

	return c.json(
		{
			success: true,
			data: {
				tier: subscription.tier,
				name: plan.name,
				status: subscription.status,
				is_active: isActive,
				billing_cycle: subscription.billing_cycle,
				current_period_end: subscription.current_period_end,
				razorpay_subscription_id: subscription.razorpay_subscription_id,
				features,
				...(usage ? { usage } : {}),
			},
		},
		200,
	);
}
// ============================================================================
// 5. CANCEL SUBSCRIPTION
// ============================================================================

/**
 * POST /api/subscription/cancel
 *
 * Cancels the user's active Razorpay subscription at the end of the current
 * billing cycle. The user retains access until the period ends, at which point
 * the `subscription.cancelled` webhook will update the status.
 *
 * Uses `cancel_at_cycle_end: true` to avoid immediate cancellation.
 */
export async function handleCancelSubscription(c: Context<{ Bindings: Env; Variables: AuthContext }>): Promise<Response> {
	const env = c.env;
	const user = c.get('user');
	const userId = user.id;

	const supabase = getSupabaseClient(env);

	const subscription = await fetchLatestSubscriptionForUser(supabase, userId, ['active', 'authenticated', 'pending']);

	if (!subscription?.id) {
		throw new APIError('No active subscription found', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (subscription.tier === 'free') {
		throw new APIError('Cannot cancel a free tier subscription', 400, ErrorCode.INVALID_REQUEST);
	}

	const razorpayResponse = await razorpayFetch(env, `/subscriptions/${subscription.razorpay_subscription_id}/cancel`, 'POST', {
		cancel_at_cycle_end: true,
	});

	if (!razorpayResponse.ok) {
		const errorBody = await razorpayResponse.text();
		throw new APIError('Failed to cancel subscription with Razorpay', 502, ErrorCode.INTERNAL_ERROR, {
			razorpayError: errorBody,
		});
	}

	const { error: updateError } = await supabase
		.from('subscriptions')
		.update({
			cancelled_at: Math.floor(Date.now() / 1000),
		})
		.eq('id', subscription.id);

	if (updateError) {
		throw new APIError('Failed to update subscription record', 500, ErrorCode.DATABASE_ERROR, {
			detail: updateError.message,
		});
	}

	const periodEndDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

	return c.json(
		{
			success: true,
			data: {
				message: periodEndDate
					? `Your subscription will remain active until ${new Date(subscription.current_period_end! * 1000).toLocaleDateString()}`
					: 'Your subscription has been scheduled for cancellation',
				current_period_end: periodEndDate,
				status: 'active',
			},
		},
		200,
	);
}
// ============================================================================
// 6. PAUSE SUBSCRIPTION
// ============================================================================

/**
 * POST /api/subscription/pause
 *
 * Pauses the user's active Razorpay subscription. Only active paid
 * subscriptions can be paused. Free tier users get a 400 error.
 *
 * Uses `pause_initiated_by: 'customer'` so the customer retains control
 * over resuming (important for UPI subscriptions).
 */
export async function handlePauseSubscription(c: Context<{ Bindings: Env; Variables: AuthContext }>): Promise<Response> {
	const env = c.env;
	const user = c.get('user');
	const userId = user.id;

	const supabase = getSupabaseClient(env);

	const subscription = await fetchLatestSubscriptionForUser(supabase, userId, ['active', 'authenticated']);

	if (!subscription?.id) {
		throw new APIError('No active subscription found', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (subscription.tier === 'free') {
		throw new APIError('Cannot pause a free tier subscription', 400, ErrorCode.INVALID_REQUEST);
	}

	const razorpayResponse = await razorpayFetch(env, `/subscriptions/${subscription.razorpay_subscription_id}/pause`, 'POST', {
		pause_initiated_by: 'customer',
	});

	if (!razorpayResponse.ok) {
		const errorBody = await razorpayResponse.text();
		throw new APIError('Failed to pause subscription with Razorpay', 502, ErrorCode.INTERNAL_ERROR, {
			razorpayError: errorBody,
		});
	}

	const { error: updateError } = await supabase
		.from('subscriptions')
		.update({
			status: 'paused' satisfies SubscriptionStatus,
			paused_at: Math.floor(Date.now() / 1000),
		})
		.eq('id', subscription.id);

	if (updateError) {
		throw new APIError('Failed to update subscription record', 500, ErrorCode.DATABASE_ERROR, {
			detail: updateError.message,
		});
	}

	return c.json(
		{
			success: true,
			data: {
				message: 'Your subscription has been paused. You can resume it at any time.',
				status: 'paused',
				paused_at: new Date().toISOString(),
			},
		},
		200,
	);
}
// ============================================================================
// 7. RESUME SUBSCRIPTION
// ============================================================================

/**
 * POST /api/subscription/resume
 *
 * Resumes a paused Razorpay subscription. Only paused subscriptions can be
 * resumed. Uses `resume_at: 'now'` for immediate resumption.
 *
 * Note: UPI subscriptions paused by the customer can only be resumed by the
 * customer (which this endpoint supports since it's customer-initiated).
 */
export async function handleResumeSubscription(c: Context<{ Bindings: Env; Variables: AuthContext }>): Promise<Response> {
	const env = c.env;
	const user = c.get('user');
	const userId = user.id;

	const supabase = getSupabaseClient(env);

	const subscription = await fetchLatestSubscriptionForUser(supabase, userId, ['paused']);

	if (!subscription?.id) {
		throw new APIError('No paused subscription found', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (subscription.tier === 'free') {
		throw new APIError('Cannot resume a free tier subscription', 400, ErrorCode.INVALID_REQUEST);
	}

	const razorpayResponse = await razorpayFetch(env, `/subscriptions/${subscription.razorpay_subscription_id}/resume`, 'POST', {
		resume_at: 'now',
	});

	if (!razorpayResponse.ok) {
		const errorBody = await razorpayResponse.text();
		throw new APIError('Failed to resume subscription with Razorpay', 502, ErrorCode.INTERNAL_ERROR, {
			razorpayError: errorBody,
		});
	}

	const { error: updateError } = await supabase
		.from('subscriptions')
		.update({
			status: 'active' satisfies SubscriptionStatus,
			paused_at: null,
		})
		.eq('id', subscription.id);

	if (updateError) {
		throw new APIError('Failed to update subscription record', 500, ErrorCode.DATABASE_ERROR, {
			detail: updateError.message,
		});
	}

	return c.json(
		{
			success: true,
			data: {
				message: 'Your subscription has been resumed successfully.',
				status: 'active',
				resumed_at: new Date().toISOString(),
			},
		},
		200,
	);
}
