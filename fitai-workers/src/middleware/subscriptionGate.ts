import type { Context, Next } from 'hono';
import type { Env, FeatureLimitConfig, SubscriptionStatus, SubscriptionTier } from '../utils/types';
import type { AuthContext } from './auth';
import { ErrorCode } from '../utils/errorCodes';
import { getSupabaseClient } from '../utils/supabase';
import { checkUsageLimit, incrementUsage, decrementUsage } from '../services/usageTracker';
import type { FeatureKey, PeriodType, UsageLimitResult } from '../services/usageTracker';

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

interface SubscriptionWithPlan {
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
	plan: SubscriptionPlanRow;
}

export interface SubscriptionContext {
	plan: SubscriptionPlanRow | null;
	features: FeatureLimitConfig;
	usage: UsageLimitResult;
}

// Grace period: 'active', 'authenticated', 'pending' all grant access
const ACCESS_GRANTING_STATUSES: readonly SubscriptionStatus[] = ['active', 'authenticated', 'pending'];
// Last-resort fallback only — used when the 'free' row is somehow missing
// from subscription_plans entirely (DB error or misconfiguration). Every
// free-tier user hits this path (handleCreateSubscription never inserts a
// subscriptions row for the free tier), so the normal case must read the
// live plan row below instead of this constant, or admin edits to the free
// plan's limits (via PATCH /api/admin/plans/free) would silently never take
// effect here despite being reflected in /api/subscription/status.
const FALLBACK_FREE_FEATURES: FeatureLimitConfig = {
	ai_generations_per_day: undefined,
	ai_generations_per_month: 1,
	scans_per_day: 10,
	unlimited_scans: false,
	unlimited_ai: false,
	analytics: false,
	coaching: false,
};

function extractFeatures(plan: SubscriptionPlanRow): FeatureLimitConfig {
	return {
		ai_generations_per_day: plan.ai_generations_per_day ?? undefined,
		ai_generations_per_month: plan.ai_generations_per_month ?? undefined,
		scans_per_day: plan.scans_per_day ?? undefined,
		unlimited_scans: plan.unlimited_scans,
		unlimited_ai: plan.unlimited_ai,
		analytics: plan.analytics,
		coaching: plan.coaching,
	};
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/**
 * @param featureKey - The feature being accessed (e.g. 'ai_generation', 'barcode_scan')
 * @param periodType - The period for usage tracking (default: 'monthly')
 */
export function subscriptionGateMiddleware(featureKey: FeatureKey, periodType: PeriodType = 'monthly') {
	return async (
		c: Context<{ Bindings: Env; Variables: AuthContext & { subscription: SubscriptionContext } }>,
		next: Next,
	): Promise<Response | void> => {
		const user = c.get('user');
		const userId = user.id;
		const supabase = getSupabaseClient(c.env);

		let subscription: SubscriptionWithPlan | null = null;
		let planFeatures: FeatureLimitConfig;
		let planRow: SubscriptionPlanRow | null = null;

		try {
			// Query subscription and plan separately (no FK relationship between the tables)
			const { data: subData, error: subError } = await supabase
				.from('subscriptions')
				.select('*')
				.eq('user_id', userId)
				.in('status', ACCESS_GRANTING_STATUSES as unknown as string[])
				.order('updated_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (subError) {
				console.error('[SubscriptionGate] Subscription query error:', subError);
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.INTERNAL_ERROR,
							message: 'Failed to verify subscription status',
						},
					},
					500,
				);
			}

			if (subData) {
				// Look up the plan by tier
				const { data: planData, error: planError } = await supabase
					.from('subscription_plans')
					.select('*')
					.eq('tier', subData.tier)
					.eq('active', true)
					.maybeSingle();

				if (planError) {
					console.error('[SubscriptionGate] Plan query error:', planError);
					return c.json(
						{
							success: false,
							error: {
								code: ErrorCode.INTERNAL_ERROR,
								message: 'Failed to verify subscription status',
							},
						},
						500,
					);
				}

				if (planData) {
					planRow = planData as SubscriptionPlanRow;
					subscription = { ...subData, plan: planRow } as unknown as SubscriptionWithPlan;
					planFeatures = extractFeatures(planRow);
				} else {
					console.error('[SubscriptionGate] Active subscription but plan row missing for tier:', subData.tier);
				}
			}
		} catch (gateError) {
			console.error('[SubscriptionGate] Subscription lookup threw:', gateError);
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL_ERROR,
						message: 'Failed to verify subscription status',
					},
				},
				500,
			);
		}

		if (!subscription) {
			// No access-granting subscription row — the normal case for every
			// free-tier user. Read the live 'free' plan row (same lookup pattern
			// as the paid-tier path above) so admin-edited free-tier limits are
			// actually enforced here, not just reflected in /subscription/status.
			try {
				const { data: freePlanData, error: freePlanError } = await supabase
					.from('subscription_plans')
					.select('*')
					.eq('tier', 'free')
					.eq('active', true)
					.maybeSingle();

				if (freePlanError) {
					console.error('[SubscriptionGate] Free plan query error, using hardcoded fallback:', freePlanError);
					planRow = null;
					planFeatures = FALLBACK_FREE_FEATURES;
				} else if (freePlanData) {
					planRow = freePlanData as SubscriptionPlanRow;
					planFeatures = extractFeatures(planRow);
				} else {
					console.error('[SubscriptionGate] No active free plan row found, using hardcoded fallback');
					planRow = null;
					planFeatures = FALLBACK_FREE_FEATURES;
				}
			} catch (freePlanError) {
				console.error('[SubscriptionGate] Free plan lookup threw, using hardcoded fallback:', freePlanError);
				planRow = null;
				planFeatures = FALLBACK_FREE_FEATURES;
			}
		}

		let limitCheck: UsageLimitResult;

		try {
			limitCheck = await checkUsageLimit(c.env, userId, featureKey, periodType, planFeatures!);
		} catch (usageError) {
			console.error('[SubscriptionGate] Usage limit check threw:', usageError);
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.INTERNAL_ERROR,
						message: 'Failed to check usage limits',
					},
				},
				500,
			);
		}

		if (!limitCheck.allowed) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.FEATURE_LIMIT_EXCEEDED,
						message: `Feature limit exceeded: ${limitCheck.current}/${limitCheck.limit} used`,
						data: {
							current: limitCheck.current,
							limit: limitCheck.limit,
							plan: planRow?.id ?? 'free',
						},
					},
				},
				403,
			);
		}

		c.set('subscription', {
			plan: planRow,
			features: planFeatures!,
			usage: limitCheck,
		});

		// Reserve the usage credit before the handler runs (matches the
		// pre-existing behavior) so the check-then-act window between
		// checkUsageLimit() and the increment stays as short as it always
		// was — just the latency of two sequential Supabase calls — instead
		// of spanning the whole handler (which can be many seconds for an AI
		// generation). incrementUsage() is a non-atomic upsert RPC that never
		// re-checks the limit, so a wide window here would let concurrent
		// requests all pass the limit check before any of them incremented,
		// letting a user exceed their daily/monthly quota. That race still
		// exists in principle at the size it was before this change (two
		// concurrent requests inside the ~ms select+upsert window can both
		// pass), same as it was prior to any of these edits — it is not
		// newly introduced or widened here.
		//
		// If the handler then fails (throws, or returns a non-2xx response),
		// the reserved credit is refunded via a best-effort compensating
		// decrement so a failed AI generation/scan doesn't permanently burn
		// the user's quota. The compensation is a read-then-conditional-write
		// (see decrementUsage in usageTracker.ts) rather than a single atomic
		// RPC — that would require a new Postgres function/migration, out of
		// scope for this change — so under rare concurrent-request timing it
		// can skip a refund it "should" have made, but it can never double-
		// refund or clobber a concurrent write. Worst case is identical to
		// pre-compensation behavior (credit stays spent); it never makes
		// accounting worse.
		let reservedCredit = false;
		try {
			const incrementResult = await incrementUsage(c.env, userId, featureKey, periodType);
			reservedCredit = incrementResult.success;
			if (!incrementResult.success) {
				console.error(`[SubscriptionGate] Failed to reserve usage for ${featureKey}:`, incrementResult.error);
			}
		} catch (incrementError) {
			console.error(`[SubscriptionGate] Failed to reserve usage for ${featureKey}:`, incrementError);
		}

		// next() is wrapped in try/catch rather than left as a bare `await
		// next()` because every gated AI-generation/scan handler in this
		// codebase signals failure by throwing an APIError, not by returning
		// a 4xx/5xx Response directly (see dietGeneration.ts's catch-all
		// re-throw, and the throw sites in workoutGeneration.ts and
		// foodRecognition.ts). A bare `await next()` would let that throw
		// propagate straight past the refund logic below to the global
		// app.onError handler in index.ts, silently skipping the refund for
		// the codebase's actual failure pattern. Catching here lets the
		// refund run for both failure shapes (thrown exception and returned
		// error status), then rethrows the original error unchanged so
		// app.onError still produces exactly the response it always did.
		let handlerThrew = false;
		let thrownError: unknown;
		try {
			await next();
		} catch (err) {
			handlerThrew = true;
			thrownError = err;
		}

		const handlerFailed = handlerThrew || (typeof c.res?.status === 'number' && c.res.status >= 400);
		if (handlerFailed && reservedCredit) {
			try {
				const decrementResult = await decrementUsage(c.env, userId, featureKey, periodType);
				if (!decrementResult.success) {
					console.error(`[SubscriptionGate] Failed to refund usage for ${featureKey}:`, decrementResult.error);
				}
			} catch (decrementError) {
				console.error(`[SubscriptionGate] Failed to refund usage for ${featureKey}:`, decrementError);
			}
		}

		if (handlerThrew) {
			throw thrownError;
		}
	};
}
