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
import { invalidateAIConfigCache } from '../utils/appConfig';

type AdminCtx = Context<{ Bindings: Env; Variables: AuthContext }>;

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/admin/dashboard
 * Returns aggregate stats for the admin overview page.
 */
export async function handleAdminDashboard(c: AdminCtx): Promise<Response> {
  const supabase = getSupabaseClient(c.env);

  const [
    { count: totalUsers },
    { data: subsByTier },
    { data: aiCallsToday },
    { data: maintenanceRow },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('tier')
      .eq('status', 'active'),
    supabase
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle(),
  ]);

  // Aggregate active subs by tier
  const tierCounts: Record<string, number> = { free: 0, basic: 0, pro: 0 };
  for (const row of subsByTier ?? []) {
    tierCounts[row.tier] = (tierCounts[row.tier] ?? 0) + 1;
  }

  // Revenue MTD (sum of subscription plan prices for active subs this month)
  const { data: revData } = await supabase
    .from('subscriptions')
    .select('tier, billing_cycle, created_at')
    .eq('status', 'active')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('tier, price_monthly, price_yearly');

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
      maintenanceMode: maintenanceRow?.value === true,
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

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);

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
  const body = await c.req.json<{ key: string; value: unknown }>();

  if (!body.key) {
    return c.json({ success: false, error: { message: 'key is required' } }, 400);
  }

  const supabase = getSupabaseClient(c.env);
  // Use UPDATE (not upsert) — keys must already exist; this avoids the category check constraint
  const { error } = await supabase
    .from('app_config')
    .update({ value: body.value, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('key', body.key);

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);

  // Invalidate KV cache if an AI key changed
  if (body.key.startsWith('ai_')) {
    await invalidateAIConfigCache(c.env);
  }

  return c.json({ success: true });
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

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
  return c.json({ success: true, data });
}

/**
 * PATCH /api/admin/plans/:tier
 * Update pricing / limits for a subscription tier.
 * Blocked fields: id, tier, razorpay_plan_id_monthly, razorpay_plan_id_yearly
 */
export async function handleUpdatePlan(c: AdminCtx): Promise<Response> {
  const tier = c.req.param('tier');
  const body = await c.req.json<Record<string, unknown>>();

  // Safety: never allow changing immutable fields
  const BLOCKED = new Set(['id', 'tier', 'razorpay_plan_id_monthly', 'razorpay_plan_id_yearly', 'created_at']);
  for (const k of Object.keys(body)) {
    if (BLOCKED.has(k)) {
      return c.json({ success: false, error: { message: `Field '${k}' cannot be updated` } }, 400);
    }
  }

  const supabase = getSupabaseClient(c.env);
  const { data, error } = await supabase
    .from('subscription_plans')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('tier', tier)
    .select()
    .single();

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
  return c.json({ success: true, data });
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/users?page=1&limit=20&search=email
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

  if (authError) return c.json({ success: false, error: { message: authError.message } }, 500);

  let users: unknown[] = authData?.users ?? [];

  // Filter by search term (email)
  if (search) {
    const q = search.toLowerCase();
    users = users.filter((u: any) => u.email?.toLowerCase().includes(q));
  }

  // Enrich with active subscription
  const userIds = (users as any[]).map((u: any) => u.id);
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, tier, status')
    .in('user_id', userIds)
    .eq('status', 'active');

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

  const [
    { data: authUser, error: authError },
    { data: profile },
    { data: subs },
    { data: usage },
  ] = await Promise.all([
    (supabase.auth.admin as any).getUserById(userId),
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase
      .from('feature_usage')
      .select('feature_key, period_type, usage_count, period_start')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(30),
  ]);

  if (authError) return c.json({ success: false, error: { message: authError.message } }, 404);

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
  const body = await c.req.json<{ tier: string; billing_cycle?: string; note?: string }>();

  if (!['free', 'basic', 'pro'].includes(body.tier)) {
    return c.json({ success: false, error: { message: 'Invalid tier' } }, 400);
  }

  const supabase = getSupabaseClient(c.env);

  // Get the plan id for the tier
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('razorpay_plan_id_monthly')
    .eq('tier', body.tier)
    .single();

  // Deactivate any existing active subscription first to avoid unique constraint violation
  await supabase
    .from('subscriptions')
    .update({ status: 'completed' })
    .eq('user_id', userId)
    .eq('status', 'active');

  const now = Math.floor(Date.now() / 1000);
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
      current_period_end: now + 30 * 86400, // 30 days
      notes: { admin_override: true, overridden_by: user.id, note: body.note ?? '' },
    })
    .select()
    .single();

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
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
    const { data } = await supabase
      .from('subscriptions')
      .select('created_at, tier, billing_cycle')
      .eq('status', 'active')
      .gte('created_at', since)
      .order('created_at');

    return c.json({ success: true, data: data ?? [] });
  }

  if (metric === 'dau') {
    // Daily active users: count distinct user_id in api_logs per day
    const { data } = await supabase
      .from('api_logs')
      .select('user_id, created_at')
      .gte('created_at', since)
      .order('created_at');

    return c.json({ success: true, data: data ?? [] });
  }

  // Default: ai_calls — feature_usage rows for ai_generation
  const { data } = await supabase
    .from('feature_usage')
    .select('period_start, usage_count, period_type')
    .eq('feature_key', 'ai_generation')
    .eq('period_type', 'daily')
    .gte('period_start', since.substring(0, 10))
    .order('period_start');

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

  const [
    { count: workoutCount },
    { count: mealCount },
    { data: workoutHits },
    { data: mealHits },
  ] = await Promise.all([
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
  const body = await c.req.json<{ type: 'workout' | 'meal' | 'all' }>();
  const supabase = getSupabaseClient(c.env);

  const cleared: string[] = [];

  if (body.type === 'workout' || body.type === 'all') {
    const { error } = await supabase.from('workout_cache').delete().neq('cache_key', '__never__');
    if (error) return c.json({ success: false, error: { message: error.message } }, 500);
    cleared.push('workout');
  }

  if (body.type === 'meal' || body.type === 'all') {
    const { error } = await supabase.from('meal_cache').delete().neq('cache_key', '__never__');
    if (error) return c.json({ success: false, error: { message: error.message } }, 500);
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

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
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

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
  return c.json({ success: true });
}

/**
 * POST /api/admin/contributions/:id/reject
 * Body: { reason?: string }
 */
export async function handleRejectContribution(c: AdminCtx): Promise<Response> {
  const id = c.req.param('id');
  const body = await c.req.json<{ reason?: string }>().catch(() => ({}));
  const supabase = getSupabaseClient(c.env);

  const { error } = await supabase
    .from('user_food_contributions')
    .update({ is_approved: false, rejection_reason: body.reason ?? '' })
    .eq('id', id);

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
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
  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
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
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, user_id, email, display_name, created_at')
    .order('created_at');

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
  return c.json({ success: true, data: data ?? [] });
}

/**
 * POST /api/admin/admins
 * Body: { email: string, display_name?: string }
 */
export async function handleCreateAdmin(c: AdminCtx): Promise<Response> {
  const requestingUser = c.get('user');
  const body = await c.req.json<{ email: string; display_name?: string }>();

  if (!body.email) {
    return c.json({ success: false, error: { message: 'email is required' } }, 400);
  }

  const supabase = getSupabaseClient(c.env);

  // Look up the user by email in auth.users via admin API
  const { data: found, error: lookupError } = await (supabase.auth.admin as any).listUsers();
  if (lookupError) return c.json({ success: false, error: { message: lookupError.message } }, 500);

  const targetUser = (found?.users ?? []).find((u: any) => u.email === body.email);
  if (!targetUser) {
    return c.json({ success: false, error: { message: 'No user found with that email' } }, 404);
  }

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      user_id: targetUser.id,
      email: body.email,
      display_name: body.display_name ?? null,
      created_by: requestingUser.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ success: false, error: { message: 'User is already an admin' } }, 409);
    }
    return c.json({ success: false, error: { message: error.message } }, 500);
  }

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
    return c.json({ success: false, error: { message: 'Cannot remove your own admin access' } }, 400);
  }

  const supabase = getSupabaseClient(c.env);
  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('user_id', targetUserId);

  if (error) return c.json({ success: false, error: { message: error.message } }, 500);
  return c.json({ success: true });
}
