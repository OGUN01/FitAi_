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

	// Check if user already has an active subscription
	const { data: existing } = await supabase
		.from('subscriptions')
		.select('id, status, tier')
		.eq('user_id', userId)
		.in('status', ['active', 'authenticated', 'created', 'pending'])
		.limit(1);

	if (existing && existing.length > 0) {
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

	// Update subscription status to 'authenticated'
	const { data: subscription, error: updateError } = await supabase
		.from('subscriptions')
		.update({
			status: 'authenticated' satisfies SubscriptionStatus,
		})
		.eq('razorpay_subscription_id', body.razorpay_subscription_id)
		.eq('user_id', userId)
		.select('id, tier, status, razorpay_subscription_id')
		.single();

	if (updateError || !subscription) {
		throw new APIError('Subscription not found for this user', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

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
		const { data: existingEvent } = await supabase.from('webhook_events').select('id').eq('event_id', eventId).single();

		if (existingEvent) {
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
		// Unhandled event type — log for idempotency and return success
		try {
			await supabase.from('webhook_events').insert({
				event_id: eventId,
				event_type: eventType,
				payload: event,
				processed: true,
				status: 'skipped',
			});
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

	// Resolve tier from the plan ID
	const tierInfo = await resolvePlanTier(env, razorpayPlanId);

	// Build update object
	const updateData: Record<string, unknown> = {
		status: newStatus,
		razorpay_customer_id: subscriptionEntity.customer_id || undefined,
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
	try {
		const { error: updateError } = await supabase
			.from('subscriptions')
			.update(updateData)
			.eq('razorpay_subscription_id', razorpaySubscriptionId);

		if (updateError) {
			// Log error but still return 200
			try {
				await supabase.from('webhook_events').insert({
					event_id: eventId,
					event_type: eventType,
					payload: event,
					processed: false,
					status: 'error',
					error_message: updateError.message,
				});
			} catch {
				// Non-critical
			}
			return c.json({ success: false, error: 'Database update failed' }, 200);
		}
	} catch {
		return c.json({ success: false, error: 'Database operation failed' }, 200);
	}

	// Record successful event processing for idempotency
	try {
		await supabase.from('webhook_events').insert({
			event_id: eventId,
			event_type: eventType,
			payload: event,
			processed: true,
			status: 'success',
			razorpay_subscription_id: razorpaySubscriptionId,
		});
	} catch {
		// Non-critical: idempotency insert failed but subscription was updated
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

	// Query for user's current subscription with plan details
	// Look for active, pending (grace period), or authenticated subscriptions
	const { data: subscription, error: subError } = await supabase
		.from('subscriptions')
		.select('*')
		.eq('user_id', userId)
		.in('status', ['active', 'pending', 'authenticated'])
		.order('created_at', { ascending: false })
		.limit(1)
		.single<SubscriptionRow>();

	if (subError || !subscription) {
		// No active subscription — return free tier
		const { data: freePlan } = await supabase
			.from('subscription_plans')
			.select('*')
			.eq('tier', 'free')
			.eq('active', true)
			.single<SubscriptionPlanRow>();

		if (freePlan) {
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
						features: {
							ai_generations_per_day: freePlan.ai_generations_per_day,
							ai_generations_per_month: freePlan.ai_generations_per_month,
							scans_per_day: freePlan.scans_per_day,
							unlimited_scans: freePlan.unlimited_scans,
							unlimited_ai: freePlan.unlimited_ai,
							analytics: freePlan.analytics,
							coaching: freePlan.coaching,
						},
					},
				},
				200,
			);
		}

		// Fallback if even free plan doesn't exist in DB
		return c.json(
			{
				success: true,
				data: {
					...FREE_TIER_DEFAULTS,
					is_active: true,
					razorpay_subscription_id: null,
				},
			},
			200,
		);
	}

	// Fetch the plan details for the subscription's tier
	const { data: plan } = await supabase
		.from('subscription_plans')
		.select('*')
		.eq('tier', subscription.tier)
		.eq('active', true)
		.single<SubscriptionPlanRow>();

	const isActive = isAccessGrantingStatus(subscription.status);

	return c.json(
		{
			success: true,
			data: {
				tier: subscription.tier,
				name: plan?.name || subscription.tier,
				status: subscription.status,
				is_active: isActive,
				billing_cycle: subscription.billing_cycle,
				current_period_end: subscription.current_period_end,
				razorpay_subscription_id: subscription.razorpay_subscription_id,
				features: plan
					? {
							ai_generations_per_day: plan.ai_generations_per_day,
							ai_generations_per_month: plan.ai_generations_per_month,
							scans_per_day: plan.scans_per_day,
							unlimited_scans: plan.unlimited_scans,
							unlimited_ai: plan.unlimited_ai,
							analytics: plan.analytics,
							coaching: plan.coaching,
						}
					: FREE_TIER_DEFAULTS.features,
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

	// Lookup user's active subscription
	const { data: subscription, error: fetchError } = await supabase
		.from('subscriptions')
		.select('*')
		.eq('user_id', userId)
		.in('status', ['active', 'authenticated', 'pending'])
		.order('created_at', { ascending: false })
		.limit(1)
		.single<SubscriptionRow>();

	if (fetchError || !subscription) {
		throw new APIError('No active subscription found', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (subscription.tier === 'free') {
		throw new APIError('Cannot cancel a free tier subscription', 400, ErrorCode.INVALID_REQUEST);
	}

	// Call Razorpay API to cancel at end of billing cycle
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

	// Lookup user's active subscription
	const { data: subscription, error: fetchError } = await supabase
		.from('subscriptions')
		.select('*')
		.eq('user_id', userId)
		.in('status', ['active', 'authenticated'])
		.order('created_at', { ascending: false })
		.limit(1)
		.single<SubscriptionRow>();

	if (fetchError || !subscription) {
		throw new APIError('No active subscription found', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (subscription.tier === 'free') {
		throw new APIError('Cannot pause a free tier subscription', 400, ErrorCode.INVALID_REQUEST);
	}

	// Call Razorpay API to pause subscription
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

	// Lookup user's paused subscription
	const { data: subscription, error: fetchError } = await supabase
		.from('subscriptions')
		.select('*')
		.eq('user_id', userId)
		.eq('status', 'paused')
		.order('created_at', { ascending: false })
		.limit(1)
		.single<SubscriptionRow>();

	if (fetchError || !subscription) {
		throw new APIError('No paused subscription found', 404, ErrorCode.SUBSCRIPTION_NOT_FOUND);
	}

	if (subscription.tier === 'free') {
		throw new APIError('Cannot resume a free tier subscription', 400, ErrorCode.INVALID_REQUEST);
	}

	// Call Razorpay API to resume subscription
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
