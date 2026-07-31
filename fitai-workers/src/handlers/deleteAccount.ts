/**
 * FitAI Workers - Account Deletion Handler
 *
 * DELETE /api/account — permanently wipe the authenticated user's data.
 *
 * Pipeline:
 *   1. authMiddleware has already verified the caller's JWT and set `user.id`.
 *   2. Delete the user's rows from every user-scoped public table using the
 *      Supabase SERVICE ROLE client (see getSupabaseClient). Service role is
 *      required because RLS on some tables restricts DELETE for end-users.
 *   3. Delete the profiles row (keyed by id, cascades to remaining children).
 *   4. Call auth.admin.deleteUser to remove the auth credential itself.
 *
 * Honest degradation:
 *   - If a row-level delete fails for any table, that table is recorded in
 *     `failedTables` and surfaced to the caller — the handler does not
 *     swallow errors. The auth user is still deleted so the credential is
 *     gone; orphaned rows (if any) are flagged for manual cleanup.
 *   - If auth.admin.deleteUser is unavailable in this Worker env (service
 *     role secret missing at runtime), the row wipe still completes and the
 *     response carries `authDeletionRequired: true` so the client can
 *     surface "contact support to remove the sign-in credential".
 */

import { Context } from 'hono';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import { APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { getSupabaseClient } from '../utils/supabase';

/**
 * User-data tables keyed by user_id. Sourced from supabase/migrations —
 * every public table that carries a user-owned row. Cache / dictionary
 * tables (foods, exercises, meal_cache, workout_cache, ifct_foods,
 * off_products, barcode_lookup_cache, exercise_media, diet_media,
 * subscription_plans, app_config, admin_users) are NOT user data and are
 * excluded.
 */
const USER_DATA_TABLES = [
	'diet_preferences',
	'workout_preferences',
	'body_analysis',
	'advanced_review',
	'onboarding_progress',
	'fitness_goals',
	'nutrition_goals',
	'analytics_metrics',
	'health_metrics',
	'meal_recognition_metadata',
	'user_food_contributions',
	'food_recognition_feedback',
	'recognition_accuracy_metrics',
	'meal_logs',
	'water_logs',
	'user_meal_plans',
	'weekly_meal_plans',
	'user_workout_plans',
	'weekly_workout_plans',
	'workout_sessions',
	'workouts',
	'workout_exercises',
	'exercise_sets',
	'exercise_prs',
	'workout_templates',
	'template_ratings',
	'meal_generation_jobs',
	'meals',
	'meal_foods',
	'progress_entries',
	'progress_goals',
	'user_achievements',
	'user_current_weight',
	'chat_messages',
	'device_tokens',
	'generation_history',
	'api_logs',
	'app_events',
	'subscriptions',
	'feature_usage',
] as const;

export async function handleDeleteAccount(
	c: Context<{ Bindings: Env; Variables: AuthContext }>,
): Promise<Response> {
	const user = c.get('user');
	if (!user?.id) {
		throw new APIError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
	}

	const userId = user.id;
	const supabase = getSupabaseClient(c.env);

	const failedTables: string[] = [];
	const deletedTables: string[] = [];

	// 1. Delete rows across every user-data table. Sequential to keep load
	//    predictable; each delete is scoped to user_id.
	for (const table of USER_DATA_TABLES) {
		try {
			const { error } = await supabase
				.from(table)
				.delete()
				.eq('user_id', userId);
			if (error) {
				// PGRST "relation does not exist" / "permission denied" are real
				// failures worth recording; missing rows are not.
				failedTables.push(table);
				console.error(
					`[DeleteAccount] Failed to delete from ${table} for user ${userId}:`,
					error.message ?? error,
				);
			} else {
				deletedTables.push(table);
			}
		} catch (err) {
			failedTables.push(table);
			console.error(
				`[DeleteAccount] Exception deleting from ${table}:`,
				err instanceof Error ? err.message : err,
			);
		}
	}

	// 2. Profiles row is keyed by id (= auth.uid()) and cascades to any
	//    remaining child rows that reference it via FK ON DELETE CASCADE.
	try {
		const { error: profileError } = await supabase
			.from('profiles')
			.delete()
			.eq('id', userId);
		if (profileError) {
			failedTables.push('profiles');
			console.error(
				`[DeleteAccount] Failed to delete profile for user ${userId}:`,
				profileError.message ?? profileError,
			);
		} else {
			deletedTables.push('profiles');
		}
	} catch (err) {
		failedTables.push('profiles');
		console.error(
			'[DeleteAccount] Exception deleting profile:',
			err instanceof Error ? err.message : err,
		);
	}

	// 3. Remove the auth credential itself. auth.admin requires the service
	//    role key — getSupabaseClient is constructed with it. If the admin
	//    surface is unavailable (secret misconfigured), flag for follow-up
	//    rather than pretending the credential is gone.
	let authDeletionRequired = false;
	try {
		// supabase-js v2 exposes auth.admin.deleteUser on service-role clients.
		const admin = (supabase as unknown as {
			auth?: {
				admin?: {
					deleteUser: (
						uid: string,
					) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
				};
			};
		}).auth?.admin;

		if (!admin || typeof admin.deleteUser !== 'function') {
			authDeletionRequired = true;
			console.warn(
				'[DeleteAccount] auth.admin.deleteUser not available in this env — row wipe completed, auth user requires manual removal.',
			);
		} else {
			const { error: adminError } = await admin.deleteUser(userId);
			if (adminError) {
				authDeletionRequired = true;
				console.error(
					`[DeleteAccount] auth.admin.deleteUser failed for ${userId}:`,
					adminError.message ?? adminError,
				);
			}
		}
	} catch (err) {
		authDeletionRequired = true;
		console.error(
			'[DeleteAccount] auth.admin.deleteUser threw:',
			err instanceof Error ? err.message : err,
		);
	}

	const success = failedTables.length === 0 && !authDeletionRequired;

	return c.json(
		{
			success,
			data: {
				userId,
				deletedTables: deletedTables.length,
				failedTables,
				authDeletionRequired,
				message: authDeletionRequired
					? 'User data deleted. Auth credential removal requires support follow-up.'
					: failedTables.length === 0
						? 'Account and all associated data permanently deleted.'
						: 'Account deleted, but some tables could not be wiped — see failedTables.',
			},
		},
		success ? 200 : 207, // 207 Multi-Status when partial deletion occurred
	);
}
