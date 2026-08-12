/**
 * FitAI Workers - Workout Builder AI: Route Registration Coverage
 *
 * Regression test for a critical audit finding: all 6 workoutBuilderAi.ts
 * handlers (handleSuggestDay, handleValidatePlan, handleEditNaturalLanguage,
 * handleGenerateFullWeek, handleApplyProgression, handleDeload) were fully
 * implemented but never registered as routes in index.ts, so the app's
 * fitaiWorkersClient.ts (suggestDay/validateWorkoutPlan/
 * editWorkoutNaturalLanguage/generateFullWeek/applyProgression/
 * deloadWorkoutPlan) was 404ing on every call.
 *
 * This exercises the real worker via SELF.fetch (vitest-pool-workers), so an
 * unregistered route is caught by Hono's actual 404 behavior rather than by
 * re-implementing route matching. A negative control (a path that is
 * deliberately never registered) proves the assertion actually distinguishes
 * "registered" from "not registered".
 */

/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

// Every /workout/* path fitaiWorkersClient.ts's workout builder methods
// (suggestDay, validateWorkoutPlan, editWorkoutNaturalLanguage,
// generateFullWeek, applyProgression, deloadWorkoutPlan) POST to.
const WORKOUT_BUILDER_AI_PATHS = [
	'/workout/suggest-day',
	'/workout/validate',
	'/workout/edit-natural-language',
	'/workout/generate-full-week',
	'/workout/apply-progression',
	'/workout/deload',
];

describe('workoutBuilderAi routes are registered in index.ts', () => {
	it.each(WORKOUT_BUILDER_AI_PATHS)('POST %s resolves to a registered route (not a Hono 404)', async (path) => {
		const res = await SELF.fetch(`https://example.com${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{}',
		});

		// An unregistered Hono route always 404s before any handler/middleware
		// runs. A registered route will reject this empty body with 401
		// (no auth) or 400 (failed validateRequest) — anything but 404 proves
		// the route exists.
		expect(res.status, `${path} returned 404 — route not registered in index.ts`).not.toBe(404);
	});

	it('negative control: a genuinely unregistered path still 404s', async () => {
		const res = await SELF.fetch('https://example.com/workout/this-route-does-not-exist', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{}',
		});
		expect(res.status).toBe(404);
	});
});
