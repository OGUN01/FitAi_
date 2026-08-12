/**
 * FitAI Workers - Admin Handler
 *
 * All admin API endpoints — protected by authMiddleware + requireRole('admin').
 * Routes are registered in index.ts under /api/admin/*.
 */

import { Context } from 'hono';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import { getSupabaseClient } from '../utils/supabase';
import { invalidateAIConfigCache, invalidatePublicAppConfigCache } from '../utils/appConfig';
import { ErrorCode } from '../utils/errorCodes';
import { APIError, NotFoundError, ValidationError, ResourceAlreadyExistsError, handleSupabaseError } from '../utils/errors';
import {
	validateRequest,
	SetConfigRequestSchema,
	ClearCacheRequestSchema,
	OverrideSubscriptionRequestSchema,
	CreateAdminRequestSchema,
} from '../utils/validation';
import { processJobsManually } from './cronJobProcessor';

type AdminCtx = Context<{ Bindings: Env; Variables: AuthContext }>;

const VALID_PLAN_TIERS = new Set(['free', 'basic', 'pro']);

/**
 * Best-effort write to admin_audit_log so sensitive admin mutations (plan
 * pricing/entitlements, subscription overrides, admin grants/removals) are
 * attributable and reconstructable after the fact. A failed audit write is
 * logged but never blocks the underlying admin action — the action already
 * succeeded by the time this is called.
 */
async function writeAuditLog(
	c: AdminCtx,
	entry: {
		action: string;
		targetType: string;
		targetId?: string | null;
		before?: unknown;
		after?: unknown;
	},
): Promise<void> {
	const supabase = getSupabaseClient(c.env);
	const actor = c.get('user');

	const { error } = await supabase.from('admin_audit_log').insert({
		actor_id: actor.id,
		actor_email: actor.email ?? null,
		action: entry.action,
		target_type: entry.targetType,
		target_id: entry.targetId ?? null,
		before_data: entry.before ?? null,
		after_data: entry.after ?? null,
	});

	if (error) {
		console.error(`[Admin] Failed to write audit log entry for action '${entry.action}':`, error);
	}
}

const EDITABLE_PLAN_FIELDS = new Set([
	'name',
	'description',
	'price_monthly',
	'price_yearly',
	'ai_generations_per_day',
	'ai_generations_per_month',
	'scans_per_day',
	'unlimited_scans',
	'unlimited_ai',
	'analytics',
	'coaching',
	'active',
]);

const BOOLEAN_PLAN_FIELDS = new Set(['unlimited_scans', 'unlimited_ai', 'analytics', 'coaching', 'active']);
const NULLABLE_NUMBER_PLAN_FIELDS = new Set([
	'price_monthly',
	'price_yearly',
	'ai_generations_per_day',
	'ai_generations_per_month',
	'scans_per_day',
]);
const STRING_PLAN_FIELDS = new Set(['name', 'description']);

function parseBooleanLike(value: unknown, field: string): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
		if (['false', '0', 'no', 'off'].includes(normalized)) return false;
	}
	throw new APIError(`Field '${field}' must be true or false`, 400, ErrorCode.INVALID_PARAMETER);
}

function parseNullableNumber(value: unknown, field: string): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new APIError(`Field '${field}' must be a finite number`, 400, ErrorCode.INVALID_PARAMETER);
		}
		return value;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		if (!Number.isFinite(parsed)) {
			throw new APIError(`Field '${field}' must be a valid number`, 400, ErrorCode.INVALID_PARAMETER);
		}
		return parsed;
	}
	throw new APIError(`Field '${field}' must be a valid number`, 400, ErrorCode.INVALID_PARAMETER);
}

function parseStringValue(value: unknown, field: string, allowNull = false): string | null {
	if (value === null || value === undefined) {
		if (allowNull) return null;
		throw new APIError(`Field '${field}' is required`, 400, ErrorCode.MISSING_REQUIRED_FIELD);
	}
	const text = String(value).trim();
	if (!text && !allowNull) {
		throw new APIError(`Field '${field}' cannot be empty`, 400, ErrorCode.INVALID_PARAMETER);
	}
	return allowNull && !text ? null : text;
}

function parseConfigBoolean(value: unknown, fallback = false): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
		if (['false', '0', 'no', 'off'].includes(normalized)) return false;
	}
	return fallback;
}

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/admin/dashboard
 * Returns aggregate stats for the admin overview page.
 */
export async function handleAdminDashboard(c: AdminCtx): Promise<Response> {
	const supabase = getSupabaseClient(c.env);

	const [usersResult, subsResult, aiCallsResult, maintenanceResult, pendingJobsResult, oldestPendingJobResult] = await Promise.all([
		supabase.from('profiles').select('id', { count: 'exact', head: true }),
		supabase.from('subscriptions').select('tier').eq('status', 'active'),
		supabase
			.from('api_logs')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
		supabase.from('app_config').select('value').eq('key', 'maintenance_mode').maybeSingle(),
		// Backlog visibility: a growing free-tier cron queue (capped at ~1
		// job/min) is otherwise invisible until users complain.
		supabase.from('meal_generation_jobs').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
		supabase.from('meal_generation_jobs').select('created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(1),
	]);

	if (usersResult.error) {
		console.error('[Admin Dashboard] Failed to fetch total users:', usersResult.error);
		handleSupabaseError(usersResult.error, 'Failed to fetch total users');
	}
	if (subsResult.error) {
		console.error('[Admin Dashboard] Failed to fetch active subscriptions:', subsResult.error);
		handleSupabaseError(subsResult.error, 'Failed to fetch active subscriptions');
	}
	if (aiCallsResult.error) {
		console.error('[Admin Dashboard] Failed to fetch AI calls today:', aiCallsResult.error);
		handleSupabaseError(aiCallsResult.error, 'Failed to fetch AI calls today');
	}
	if (maintenanceResult.error) {
		console.error('[Admin Dashboard] Failed to fetch maintenance mode:', maintenanceResult.error);
		handleSupabaseError(maintenanceResult.error, 'Failed to fetch maintenance mode');
	}
	if (pendingJobsResult.error) {
		console.error('[Admin Dashboard] Failed to fetch pending job backlog:', pendingJobsResult.error);
		handleSupabaseError(pendingJobsResult.error, 'Failed to fetch pending job backlog');
	}
	if (oldestPendingJobResult.error) {
		console.error('[Admin Dashboard] Failed to fetch oldest pending job:', oldestPendingJobResult.error);
		handleSupabaseError(oldestPendingJobResult.error, 'Failed to fetch oldest pending job');
	}

	const { count: totalUsers } = usersResult;
	const { data: subsByTier } = subsResult;
	const { data: aiCallsToday } = aiCallsResult;
	const { data: maintenanceRow } = maintenanceResult;
	const { count: pendingJobCount } = pendingJobsResult;
	const oldestPendingJobCreatedAt = oldestPendingJobResult.data?.[0]?.created_at ?? null;
	const oldestPendingJobAgeSeconds = oldestPendingJobCreatedAt
		? Math.max(0, Math.floor((Date.now() - new Date(oldestPendingJobCreatedAt).getTime()) / 1000))
		: 0;

	// Aggregate active subs by tier
	const tierCounts: Record<string, number> = { free: 0, basic: 0, pro: 0 };
	for (const row of subsByTier ?? []) {
		tierCounts[row.tier] = (tierCounts[row.tier] ?? 0) + 1;
	}

	// Revenue MTD (sum of subscription plan prices for active subs this month)
	const { data: revData, error: revError } = await supabase
		.from('subscriptions')
		.select('tier, billing_cycle, created_at')
		.eq('status', 'active')
		.gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

	if (revError) {
		console.error('[Admin Dashboard] Failed to fetch revenue data:', revError);
		handleSupabaseError(revError, 'Failed to fetch revenue data');
	}

	const { data: plans, error: plansError } = await supabase
		.from('subscription_plans')
		.select('tier, price_monthly, price_yearly');

	if (plansError) {
		console.error('[Admin Dashboard] Failed to fetch subscription plans:', plansError);
		handleSupabaseError(plansError, 'Failed to fetch subscription plans');
	}

	const priceMap: Record<string, { monthly: number; yearly: number }> = {};
	for (const p of plans ?? []) {
		priceMap[p.tier] = { monthly: p.price_monthly ?? 0, yearly: p.price_yearly ?? 0 };
	}

	let revenuePaisa = 0;
	for (const sub of revData ?? []) {
		const p = priceMap[sub.tier];
		if (p) revenuePaisa += sub.billing_cycle === 'yearly' ? p.yearly : p.monthly;
	}

	return c.json({
		success: true,
		data: {
			totalUsers: totalUsers ?? 0,
			activeSubscriptions: tierCounts,
			aiCallsToday: (aiCallsToday as unknown as number) ?? 0,
			revenueInrPaisa: revenuePaisa,
			maintenanceMode: parseConfigBoolean(maintenanceRow?.value, false),
			jobsBacklog: {
				pendingOrProcessing: pendingJobCount ?? 0,
				oldestPendingAgeSeconds: oldestPendingJobAgeSeconds,
			},
		},
	});
}

// ============================================================================
// CONFIG
// ============================================================================

/**
 * GET /api/admin/config
 * Returns all app_config rows grouped by category.
 */
export async function handleGetConfig(c: AdminCtx): Promise<Response> {
	const supabase = getSupabaseClient(c.env);
	const { data, error } = await supabase
		.from('app_config')
		.select('key, value, description, category, updated_at')
		.order('category')
		.order('key');

	if (error) handleSupabaseError(error, 'Failed to fetch app config');

	// Group by category
	const grouped: Record<string, unknown[]> = {};
	for (const row of data ?? []) {
		if (!grouped[row.category]) grouped[row.category] = [];
		grouped[row.category].push(row);
	}

	return c.json({ success: true, data: grouped });
}

/**
 * POST /api/admin/config
 * Upsert a config key. Body: { key: string, value: unknown }
 */
export async function handleSetConfig(c: AdminCtx): Promise<Response> {
	const user = c.get('user');
	const rawBody = await c.req.json();
	const body = validateRequest(SetConfigRequestSchema, rawBody);

	const supabase = getSupabaseClient(c.env);
	// Use UPDATE (not upsert) — keys must already exist; this avoids the category check constraint
	const { data, error } = await supabase
		.from('app_config')
		.update({ value: body.value, updated_by: user.id, updated_at: new Date().toISOString() })
		.eq('key', body.key)
		.select('key');

	if (error) handleSupabaseError(error, 'Failed to update app config');
	if (!data || data.length === 0) {
		throw new NotFoundError(`Config key '${body.key}'`);
	}

	// Invalidate KV cache if an AI key changed
	if (body.key.startsWith('ai_')) {
		await invalidateAIConfigCache(c.env);
	}

	if (
		body.key.startsWith('feature_') ||
		body.key.startsWith('maintenance_') ||
		body.key === 'min_app_version' ||
		body.key === 'force_update_version'
	) {
		await invalidatePublicAppConfigCache(c.env);
	}

	return c.json({ success: true });
}

/**
 * GET /api/admin/session
 * Lightweight session validation endpoint for the admin web UI.
 * Access is protected by authMiddleware + requireRole('admin').
 */
export async function handleAdminSession(c: AdminCtx): Promise<Response> {
	const user = c.get('user');

	return c.json({
		success: true,
		data: {
			id: user.id,
			email: user.email ?? null,
		},
	});
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

/**
 * GET /api/admin/plans
 */
export async function handleGetPlans(c: AdminCtx): Promise<Response> {
	const supabase = getSupabaseClient(c.env);
	const { data, error } = await supabase
		.from('subscription_plans')
		.select('*')
		.order('price_monthly', { ascending: true, nullsFirst: true });

	if (error) handleSupabaseError(error, 'Failed to fetch subscription plans');
	return c.json({ success: true, data });
}

/**
 * PATCH /api/admin/plans/:tier
 * Update pricing / limits for a subscription tier.
 * Blocked fields: id, tier, razorpay_plan_id_monthly, razorpay_plan_id_yearly
 */
export async function handleUpdatePlan(c: AdminCtx): Promise<Response> {
	const tier = c.req.param('tier');
	const user = c.get('user');

	// Validate the route param up front — without this, an invalid tier falls
	// through to `.eq('tier', tier).single()` below, which Postgres resolves
	// as zero rows and handleSupabaseError turns into a generic 500 instead
	// of a clear 404.
	if (!VALID_PLAN_TIERS.has(tier)) {
		throw new NotFoundError(`Subscription plan tier '${tier}'`);
	}

	const body = await c.req.json<Record<string, unknown>>();

	// Safety: never allow changing immutable fields
	const BLOCKED = new Set(['id', 'tier', 'razorpay_plan_id_monthly', 'razorpay_plan_id_yearly', 'created_at']);
	for (const k of Object.keys(body)) {
		if (BLOCKED.has(k)) {
			throw new ValidationError(`Field '${k}' cannot be updated`);
		}
		if (!EDITABLE_PLAN_FIELDS.has(k)) {
			throw new ValidationError(`Field '${k}' cannot be updated`);
		}
	}

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id };
	for (const [key, value] of Object.entries(body)) {
		if (BOOLEAN_PLAN_FIELDS.has(key)) {
			updates[key] = parseBooleanLike(value, key);
			continue;
		}

		if (NULLABLE_NUMBER_PLAN_FIELDS.has(key)) {
			updates[key] = parseNullableNumber(value, key);
			continue;
		}

		if (STRING_PLAN_FIELDS.has(key)) {
			updates[key] = parseStringValue(value, key, key === 'description');
			continue;
		}
	}

	const supabase = getSupabaseClient(c.env);

	// Capture pre-update state for the audit log — this is the single most
	// money-sensitive read/write pair in the file (unlimited_ai, prices for
	// an entire tier), so the "before" snapshot matters, not just "after".
	const { data: beforeRow } = await supabase.from('subscription_plans').select('*').eq('tier', tier).maybeSingle();

	const { data, error } = await supabase
		.from('subscription_plans')
		.update(updates)
		.eq('tier', tier)
		.select()
		.single();

	if (error) handleSupabaseError(error, 'Failed to update subscription plan');

	await writeAuditLog(c, {
		action: 'update_plan',
		targetType: 'subscription_plans',
		targetId: tier,
		before: beforeRow ?? null,
		after: data,
	});

	return c.json({ success: true, data });
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/users?page=1&limit=20&search=email
 *
 * KNOWN LIMITATION: `search` only filters the users already returned by the
 * current `page`/`limit` of Supabase's `auth.admin.listUsers()` — that API has
 * no server-side email filter, so a real user sitting on page 2+ of the full
 * user list will not be found when searching from page 1. A correct fix needs
 * a searchable index over user email (e.g. querying `profiles.email` first to
 * resolve matching user_ids, then paginating that filtered set) rather than
 * paginating the raw auth.admin listing — that's a bigger restructuring than
 * this pass covers, so this is left documented rather than silently wrong.
 */
export async function handleListUsers(c: AdminCtx): Promise<Response> {
	const page = Math.max(1, Number(c.req.query('page') ?? 1));
	const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20)));
	const search = c.req.query('search') ?? '';

	const supabase = getSupabaseClient(c.env);

	// Use admin API to list users (service role required)
	const { data: authData, error: authError } = await (supabase.auth.admin as any).listUsers({
		page,
		perPage: limit,
	});

	if (authError) handleSupabaseError(authError, 'Failed to list users');

	let users: unknown[] = authData?.users ?? [];

	// Filter by search term (email) — scoped to the current page only, see
	// the KNOWN LIMITATION note above.
	if (search) {
		const q = search.toLowerCase();
		users = users.filter((u: any) => u.email?.toLowerCase().includes(q));
	}

	// Enrich with active subscription
	const userIds = (users as any[]).map((u: any) => u.id);
	const { data: subs } = await supabase.from('subscriptions').select('user_id, tier, status').in('user_id', userIds).eq('status', 'active');

	const subMap: Record<string, string> = {};
	for (const s of subs ?? []) subMap[s.user_id] = s.tier;

	const enriched = (users as any[]).map((u: any) => ({
		id: u.id,
		email: u.email,
		created_at: u.created_at,
		last_sign_in_at: u.last_sign_in_at,
		confirmed: !!u.confirmed_at,
		tier: subMap[u.id] ?? 'free',
	}));

	return c.json({
		success: true,
		data: {
			users: enriched,
			total: authData?.total ?? enriched.length,
			page,
			limit,
		},
	});
}

/**
 * GET /api/admin/users/:userId
 */
export async function handleGetUser(c: AdminCtx): Promise<Response> {
	const userId = c.req.param('userId');
	const supabase = getSupabaseClient(c.env);

	const [{ data: authUser, error: authError }, { data: profile }, { data: subs }, { data: usage }] = await Promise.all([
		(supabase.auth.admin as any).getUserById(userId),
		supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
		supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
		supabase
			.from('feature_usage')
			.select('feature_key, period_type, usage_count, period_start')
			.eq('user_id', userId)
			.order('period_start', { ascending: false })
			.limit(30),
	]);

	if (authError) throw new NotFoundError('User');

	return c.json({
		success: true,
		data: {
			user: {
				id: authUser.user.id,
				email: authUser.user.email,
				created_at: authUser.user.created_at,
				last_sign_in_at: authUser.user.last_sign_in_at,
				app_metadata: authUser.user.app_metadata,
			},
			profile,
			subscriptions: subs ?? [],
			usageHistory: usage ?? [],
		},
	});
}

/**
 * POST /api/admin/users/:userId/subscription
 * Manual override: grant a tier to a user.
 * Body: { tier: 'free'|'basic'|'pro', billing_cycle?: 'monthly'|'yearly', note?: string }
 */
export async function handleOverrideSubscription(c: AdminCtx): Promise<Response> {
	const userId = c.req.param('userId');
	const user = c.get('user');
	const rawBody = await c.req.json();
	const body = validateRequest(OverrideSubscriptionRequestSchema, rawBody);

	// OverrideSubscriptionRequestSchema leaves `note` optional (it's shared
	// shape, not endpoint-specific validation) — but granting a paid tier
	// while bypassing Razorpay is the single most money-sensitive admin
	// action in this file, so it must always carry a recorded justification.
	if (!body.note || !body.note.trim()) {
		throw new ValidationError("Field 'note' is required and must explain the reason for this subscription override");
	}

	const supabase = getSupabaseClient(c.env);

	// Get the plan id for the tier
	const { data: plan } = await supabase.from('subscription_plans').select('razorpay_plan_id_monthly').eq('tier', body.tier).single();

	// Deactivate any existing active subscription first to avoid unique constraint violation
	await supabase.from('subscriptions').update({ status: 'completed' }).eq('user_id', userId).eq('status', 'active');

	const now = Math.floor(Date.now() / 1000);
	const cycleSeconds = body.billing_cycle === 'yearly' ? 365 * 86400 : 30 * 86400;
	const { data, error } = await supabase
		.from('subscriptions')
		.insert({
			user_id: userId,
			razorpay_subscription_id: `admin_override_${Date.now()}`,
			razorpay_plan_id: plan?.razorpay_plan_id_monthly ?? `admin_${body.tier}`,
			tier: body.tier,
			status: 'active',
			billing_cycle: body.billing_cycle ?? 'monthly',
			current_period_start: now,
			current_period_end: now + cycleSeconds,
			notes: { admin_override: true, overridden_by: user.id, note: body.note ?? '' },
		})
		.select()
		.single();

	if (error) handleSupabaseError(error, 'Failed to override subscription');

	await writeAuditLog(c, {
		action: 'override_subscription',
		targetType: 'subscriptions',
		targetId: userId,
		after: data,
	});

	return c.json({ success: true, data }, 201);
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /api/admin/analytics?days=30&metric=ai_calls
 */
export async function handleAdminAnalytics(c: AdminCtx): Promise<Response> {
	const days = Math.min(90, Math.max(1, Number(c.req.query('days') ?? 30)));
	const metric = c.req.query('metric') ?? 'ai_calls';
	const since = new Date(Date.now() - days * 86400_000).toISOString();
	const supabase = getSupabaseClient(c.env);

	if (metric === 'revenue') {
		const { data, error } = await supabase
			.from('subscriptions')
			.select('created_at, tier, billing_cycle')
			.eq('status', 'active')
			.gte('created_at', since)
			.order('created_at');

		if (error) {
			console.error('[Admin Analytics] Failed to fetch revenue metric:', error);
			handleSupabaseError(error, 'Failed to fetch revenue metric');
		}
		return c.json({ success: true, data: data ?? [] });
	}

	if (metric === 'dau') {
		// Daily active users: count distinct user_id in api_logs per day
		const { data, error } = await supabase
			.from('api_logs')
			.select('user_id, created_at')
			.gte('created_at', since)
			.order('created_at');

		if (error) {
			console.error('[Admin Analytics] Failed to fetch dau metric:', error);
			handleSupabaseError(error, 'Failed to fetch dau metric');
		}
		return c.json({ success: true, data: data ?? [] });
	}

	// Default: ai_calls — feature_usage rows for ai_generation
	const { data, error } = await supabase
		.from('feature_usage')
		.select('period_start, usage_count, period_type')
		.eq('feature_key', 'ai_generation')
		.eq('period_type', 'daily')
		.gte('period_start', since.substring(0, 10))
		.order('period_start');

	if (error) {
		console.error('[Admin Analytics] Failed to fetch ai_calls metric:', error);
		handleSupabaseError(error, 'Failed to fetch ai_calls metric');
	}
	return c.json({ success: true, data: data ?? [] });
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/cache/stats
 */
export async function handleCacheStats(c: AdminCtx): Promise<Response> {
	const supabase = getSupabaseClient(c.env);

	const [{ count: workoutCount }, { count: mealCount }, { data: workoutHits }, { data: mealHits }] = await Promise.all([
		supabase.from('workout_cache').select('*', { count: 'exact', head: true }),
		supabase.from('meal_cache').select('*', { count: 'exact', head: true }),
		supabase.from('workout_cache').select('hit_count').order('hit_count', { ascending: false }).limit(1),
		supabase.from('meal_cache').select('hit_count').order('hit_count', { ascending: false }).limit(1),
	]);

	return c.json({
		success: true,
		data: {
			workout: {
				rows: workoutCount ?? 0,
				topHitCount: workoutHits?.[0]?.hit_count ?? 0,
			},
			meal: {
				rows: mealCount ?? 0,
				topHitCount: mealHits?.[0]?.hit_count ?? 0,
			},
		},
	});
}

/**
 * POST /api/admin/cache/clear
 * Body: { type: 'workout' | 'meal' | 'all' }
 */
export async function handleClearCache(c: AdminCtx): Promise<Response> {
	const rawBody = await c.req.json();
	const body = validateRequest(ClearCacheRequestSchema, rawBody);
	const supabase = getSupabaseClient(c.env);

	const cleared: string[] = [];

	if (body.type === 'workout' || body.type === 'all') {
		const { error } = await supabase.from('workout_cache').delete().neq('cache_key', '__never__');
		if (error) handleSupabaseError(error, 'Failed to clear workout cache');
		cleared.push('workout');
	}

	if (body.type === 'meal' || body.type === 'all') {
		const { error } = await supabase.from('meal_cache').delete().neq('cache_key', '__never__');
		if (error) handleSupabaseError(error, 'Failed to clear meal cache');
		cleared.push('meal');
	}

	return c.json({ success: true, data: { cleared } });
}

// ============================================================================
// FOOD CONTRIBUTIONS
// ============================================================================

/**
 * GET /api/admin/contributions?status=pending&page=1
 */
export async function handleListContributions(c: AdminCtx): Promise<Response> {
	const status = c.req.query('status') ?? 'pending';
	const page = Math.max(1, Number(c.req.query('page') ?? 1));
	const limit = 20;

	const supabase = getSupabaseClient(c.env);

	let query = supabase
		.from('user_food_contributions')
		.select('*, profiles!user_id(email)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range((page - 1) * limit, page * limit - 1);

	if (status === 'pending') query = query.is('is_approved', null);
	else if (status === 'approved') query = query.eq('is_approved', true);
	else if (status === 'rejected') query = query.eq('is_approved', false);

	const { data, error, count } = await query;

	if (error) handleSupabaseError(error, 'Failed to fetch food contributions');
	return c.json({ success: true, data: data ?? [], total: count ?? 0, page });
}

/**
 * POST /api/admin/contributions/:id/approve
 */
export async function handleApproveContribution(c: AdminCtx): Promise<Response> {
	const id = c.req.param('id');
	const user = c.get('user');
	const supabase = getSupabaseClient(c.env);

	const { error } = await supabase
		.from('user_food_contributions')
		.update({ is_approved: true, approved_by: user.id, approved_at: new Date().toISOString() })
		.eq('id', id);

	if (error) handleSupabaseError(error, 'Failed to approve contribution');
	return c.json({ success: true });
}

/**
 * POST /api/admin/contributions/:id/reject
 * Body: { reason?: string }
 */
export async function handleRejectContribution(c: AdminCtx): Promise<Response> {
	const id = c.req.param('id');
	const user = c.get('user');
	const body = await c.req.json<{ reason?: string }>().catch((): { reason?: string } => ({}));
	const supabase = getSupabaseClient(c.env);

	const { error } = await supabase
		.from('user_food_contributions')
		.update({
			is_approved: false,
			rejection_reason: body.reason ?? '',
			rejected_by: user.id,
			rejected_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) handleSupabaseError(error, 'Failed to reject contribution');
	return c.json({ success: true });
}

// ============================================================================
// WEBHOOK LOGS
// ============================================================================

/**
 * GET /api/admin/webhooks?event_type=subscription.activated&page=1
 */
export async function handleWebhookLogs(c: AdminCtx): Promise<Response> {
	const eventType = c.req.query('event_type');
	const page = Math.max(1, Number(c.req.query('page') ?? 1));
	const limit = 50;
	const supabase = getSupabaseClient(c.env);

	let query = supabase
		.from('webhook_events')
		.select('id, event_type, payload, processed_at', { count: 'exact' })
		.order('processed_at', { ascending: false })
		.range((page - 1) * limit, page * limit - 1);

	if (eventType) query = query.eq('event_type', eventType);

	const { data, error, count } = await query;
	if (error) handleSupabaseError(error, 'Failed to fetch webhook logs');
	return c.json({ success: true, data: data ?? [], total: count ?? 0, page });
}

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/admins
 */
export async function handleListAdmins(c: AdminCtx): Promise<Response> {
	const supabase = getSupabaseClient(c.env);
	const { data, error } = await supabase.from('admin_users').select('id, user_id, email, display_name, created_at').order('created_at');

	if (error) handleSupabaseError(error, 'Failed to list admins');
	return c.json({ success: true, data: data ?? [] });
}

/**
 * POST /api/admin/admins
 * Body: { email: string, display_name?: string }
 */
export async function handleCreateAdmin(c: AdminCtx): Promise<Response> {
	const requestingUser = c.get('user');
	const rawBody = await c.req.json();
	const body = validateRequest(CreateAdminRequestSchema, rawBody);

	const supabase = getSupabaseClient(c.env);

	// Resolve the target user id. Prefer an exact-match lookup against
	// profiles.email (UNIQUE + indexed) — this is the fix flagged by the
	// KNOWN LIMITATION note on handleListUsers above, applied here because
	// this is the more security-sensitive of the two endpoints: unlike
	// listUsers()'s default first page (~50 users), a match here is exact
	// regardless of how many users exist. Not every auth user has a profiles
	// row yet (created during onboarding, not at signup), so fall back to
	// paging through listUsers() — instead of only checking page 1 — when
	// the profiles lookup misses.
	let targetUserId: string | null = null;

	const { data: profileMatch, error: profileError } = await supabase.from('profiles').select('id').eq('email', body.email).maybeSingle();

	if (profileError) {
		console.error('[Admin] Failed to look up user by profile email:', profileError);
	}

	if (profileMatch) {
		targetUserId = profileMatch.id;
	} else {
		const perPage = 1000;
		for (let page = 1; page <= 20 && !targetUserId; page++) {
			const { data: found, error: lookupError } = await (supabase.auth.admin as any).listUsers({ page, perPage });
			if (lookupError) handleSupabaseError(lookupError, 'Failed to look up user');

			const pageUsers: any[] = found?.users ?? [];
			const match = pageUsers.find((u: any) => u.email === body.email);
			if (match) {
				targetUserId = match.id;
				break;
			}
			if (pageUsers.length < perPage) break; // reached the last page
		}
	}

	if (!targetUserId) {
		throw new NotFoundError('User with that email');
	}

	const { data, error } = await supabase
		.from('admin_users')
		.insert({
			user_id: targetUserId,
			email: body.email,
			display_name: body.display_name ?? null,
			created_by: requestingUser.id,
		})
		.select()
		.single();

	if (error) {
		if (error.code === '23505') {
			throw new ResourceAlreadyExistsError('Admin user');
		}
		console.error('[Admin] Failed to create admin:', error);
		handleSupabaseError(error, 'Failed to create admin');
	}

	await writeAuditLog(c, {
		action: 'create_admin',
		targetType: 'admin_users',
		targetId: targetUserId,
		after: data,
	});

	return c.json({ success: true, data }, 201);
}

/**
 * DELETE /api/admin/admins/:userId
 * Safety: cannot remove yourself.
 */
export async function handleRemoveAdmin(c: AdminCtx): Promise<Response> {
	const requestingUser = c.get('user');
	const targetUserId = c.req.param('userId');

	if (requestingUser.id === targetUserId) {
		throw new ValidationError('Cannot remove your own admin access');
	}

	const supabase = getSupabaseClient(c.env);

	// admin_users has no soft-delete/history columns, so the row itself is
	// permanently gone after the DELETE below — capture it first so who held
	// admin access (and who revoked it) stays reconstructable via the audit
	// log even though the row is hard-deleted.
	const { data: beforeRow } = await supabase.from('admin_users').select('*').eq('user_id', targetUserId).maybeSingle();

	const { error } = await supabase.from('admin_users').delete().eq('user_id', targetUserId);

	if (error) handleSupabaseError(error, 'Failed to remove admin');

	await writeAuditLog(c, {
		action: 'remove_admin',
		targetType: 'admin_users',
		targetId: targetUserId,
		before: beforeRow ?? null,
	});

	return c.json({ success: true });
}

// ============================================================================
// DIET GENERATION JOBS (meal_generation_jobs)
// ============================================================================

const VALID_JOB_STATUSES = new Set(['pending', 'processing', 'completed', 'failed', 'cancelled']);

/**
 * GET /api/admin/jobs?status=failed&page=1
 *
 * Failed jobs were previously only visible via a direct DB query — the only
 * trace of a permanently-failed diet generation was a console.error line,
 * which is ephemeral on Cloudflare Workers unless a log drain is separately
 * configured. This surfaces the persisted meal_generation_jobs rows
 * (including error_code/error_message) so failures are visible in the admin
 * UI instead.
 */
export async function handleListJobs(c: AdminCtx): Promise<Response> {
	const status = c.req.query('status');
	const page = Math.max(1, Number(c.req.query('page') ?? 1));
	const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20)));

	if (status && !VALID_JOB_STATUSES.has(status)) {
		throw new ValidationError(`Invalid status '${status}'`);
	}

	const supabase = getSupabaseClient(c.env);

	let query = supabase
		.from('meal_generation_jobs')
		.select('id, user_id, status, error_code, error_message, retry_count, max_retries, created_at, started_at, completed_at, generation_time_ms', {
			count: 'exact',
		})
		.order('created_at', { ascending: false })
		.range((page - 1) * limit, page * limit - 1);

	if (status) query = query.eq('status', status);

	const { data, error, count } = await query;
	if (error) handleSupabaseError(error, 'Failed to fetch diet generation jobs');

	return c.json({ success: true, data: data ?? [], total: count ?? 0, page });
}

/**
 * POST /api/admin/jobs/process-now
 * Body: { limit?: number }
 *
 * Forces the pending backlog through immediately instead of waiting on the
 * next 1-minute cron tick — useful when the free-plan cron fallback (capped
 * at ~1 job/min) has built up a backlog. Wraps the already-implemented
 * processJobsManually() from cronJobProcessor.ts, which previously had no
 * route pointing at it.
 */
export async function handleProcessJobsNow(c: AdminCtx): Promise<Response> {
	const rawBody = await c.req.json().catch(() => ({}));
	const limitInput = (rawBody as { limit?: unknown })?.limit;
	const limit = typeof limitInput === 'number' && Number.isFinite(limitInput) ? Math.min(50, Math.max(1, Math.floor(limitInput))) : 5;

	const result = await processJobsManually(c.env, limit);

	await writeAuditLog(c, {
		action: 'process_jobs_now',
		targetType: 'meal_generation_jobs',
		after: result,
	});

	return c.json({ success: true, data: result });
}
