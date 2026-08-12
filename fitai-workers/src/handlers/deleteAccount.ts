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
 *   4. Delete the user's uploaded objects from the FITAI_MEDIA R2 bucket
 *      (profile pictures, progress photos — stored under `user/<id>.<ext>`
 *      and keyed by `customMetadata.uploadedBy`, see mediaHandler.ts).
 *   5. Call auth.admin.deleteUser to remove the auth credential itself.
 *
 * Honest degradation:
 *   - If a row-level delete fails for any table, that table is recorded in
 *     `failedTables` and surfaced to the caller — the handler does not
 *     swallow errors. The auth user is still deleted so the credential is
 *     gone; orphaned rows (if any) are flagged for manual cleanup.
 *   - If an R2 object fails to list or delete, it's recorded in
 *     `failedMediaKeys` and surfaced the same honest way as `failedTables`.
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

/**
 * Delete every object the user uploaded to the FITAI_MEDIA R2 bucket.
 * User-uploaded content (profile pictures, progress photos) is stored under
 * the `user/` prefix and keyed by `customMetadata.uploadedBy` (see
 * mediaHandler.ts's handleMediaUpload). Without this, account deletion left
 * these objects in R2 permanently with no owner record left to ever clean
 * them up. Returns the keys that failed to delete so the caller can report
 * them the same honest way `failedTables` already is.
 */
async function deleteUserMediaFromR2(
	env: Env,
	userId: string,
): Promise<{ deletedCount: number; failedKeys: string[] }> {
	const failedKeys: string[] = [];
	let deletedCount = 0;

	if (!env.FITAI_MEDIA) {
		console.warn('[DeleteAccount] FITAI_MEDIA binding not available in this env — skipping R2 media cleanup.');
		return { deletedCount, failedKeys };
	}

	try {
		let cursor: string | undefined;
		do {
			const listing = await env.FITAI_MEDIA.list({
				prefix: 'user/',
				cursor,
				include: ['customMetadata'],
			});

			const ownedKeys = listing.objects
				.filter((obj) => obj.customMetadata?.uploadedBy === userId)
				.map((obj) => obj.key);

			for (const key of ownedKeys) {
				try {
					await env.FITAI_MEDIA.delete(key);
					deletedCount++;
				} catch (err) {
					failedKeys.push(key);
					console.error(
						`[DeleteAccount] Failed to delete R2 object ${key} for user ${userId}:`,
						err instanceof Error ? err.message : err,
					);
				}
			}

			cursor = listing.truncated ? listing.cursor : undefined;
		} while (cursor);
	} catch (err) {
		console.error(
			`[DeleteAccount] Failed to list R2 media objects for user ${userId}:`,
			err instanceof Error ? err.message : err,
		);
		failedKeys.push('__list_failed__');
	}

	return { deletedCount, failedKeys };
}

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

	// 3b. Delete the user's uploaded media from R2 (profile pictures, progress
	//     photos). Independent of the row wipe above — run regardless of
	//     whether the DB deletes succeeded, since these are separate storage.
	const { deletedCount: deletedMediaCount, failedKeys: failedMediaKeys } = await deleteUserMediaFromR2(c.env, userId);

	// 4. Remove the auth credential itself. auth.admin requires the service
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

	const success = failedTables.length === 0 && failedMediaKeys.length === 0 && !authDeletionRequired;

	return c.json(
		{
			success,
			data: {
				userId,
				deletedTables: deletedTables.length,
				failedTables,
				deletedMediaCount,
				failedMediaKeys,
				authDeletionRequired,
				message: authDeletionRequired
					? 'User data deleted. Auth credential removal requires support follow-up.'
					: failedTables.length === 0 && failedMediaKeys.length === 0
						? 'Account and all associated data permanently deleted.'
						: 'Account deleted, but some data could not be wiped — see failedTables/failedMediaKeys.',
			},
		},
		success ? 200 : 207, // 207 Multi-Status when partial deletion occurred
	);
}
