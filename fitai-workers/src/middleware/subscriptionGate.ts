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
			const { data, error } = await supabase
				.from('subscriptions')
				.select(
					`
					*,
					plan:subscription_plans!inner(*)
				`,
				)
				.eq('user_id', userId)
				.in('status', ACCESS_GRANTING_STATUSES as unknown as string[])
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (error) {
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

			if (data) {
				subscription = data as unknown as SubscriptionWithPlan;
				planRow = subscription.plan;
				planFeatures = extractFeatures(planRow);
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
			try {
				const { data: freePlan, error: freeError } = await supabase.from('subscription_plans').select('*').eq('id', 'free').single();

				if (freeError || !freePlan) {
					return c.json(
						{
							success: false,
							error: {
								code: ErrorCode.INTERNAL_ERROR,
								message: 'Failed to resolve subscription plan',
							},
						},
						500,
					);
				}

				planRow = freePlan as SubscriptionPlanRow;
				planFeatures = extractFeatures(planRow);
			} catch {
				return c.json(
					{
						success: false,
						error: {
							code: ErrorCode.INTERNAL_ERROR,
							message: 'Failed to resolve subscription plan',
						},
					},
					500,
				);
			}
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

		// Increment usage BEFORE proceeding — failure is non-critical
		try {
			await incrementUsage(c.env, userId, featureKey, periodType);
		} catch {
			// Allow request even if increment fails (telemetry, not enforcement)
		}

		c.set('subscription', {
			plan: planRow,
			features: planFeatures!,
			usage: limitCheck,
		});

		await next();
	};
}
