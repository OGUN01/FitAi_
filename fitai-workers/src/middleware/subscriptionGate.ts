import type { Context, Next } from 'hono';
import type { Env, FeatureLimitConfig, SubscriptionStatus, SubscriptionTier } from '../utils/types';
import type { AuthContext } from './auth';
import { ErrorCode } from '../utils/errorCodes';
import { getSupabaseClient } from '../utils/supabase';
import { checkUsageLimit, incrementUsage } from '../services/usageTracker';
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
				}
			}
		} catch {
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
			planRow = null;
			planFeatures = FALLBACK_FREE_FEATURES;
		}

		let limitCheck: UsageLimitResult;

		try {
			limitCheck = await checkUsageLimit(c.env, userId, featureKey, periodType, planFeatures!);
		} catch {
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

		// Increment usage before the handler runs to avoid race conditions where
		// the response is returned before the increment completes.
		try {
			await incrementUsage(c.env, userId, featureKey, periodType);
		} catch {
			console.error(`[SubscriptionGate] Failed to increment usage for ${featureKey}`);
		}

		await next();
	};
}
