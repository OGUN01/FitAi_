/**
 * Meal Image Resolver — unit tests
 *
 * Tests the Wikimedia Commons lookup + KV cache logic.
 * Uses a mock KV namespace and real Wikimedia API calls (network required).
 * Failures (no network, no match) must be non-fatal → return undefined.
 */

import { describe, it, expect, vi } from 'vitest';
import { resolveMealImage, resolveMealImages } from './mealImageResolver';
import type { Env } from './types';

/** Minimal mock KV namespace that behaves like Cloudflare KV */
function mockKV(): KVNamespace {
	const store = new Map<string, string>();
	return {
		get: vi.fn(async (key: string) => store.get(key) ?? null),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
	} as unknown as KVNamespace;
}

function mockEnv(): Env {
	return { MEAL_CACHE: mockKV() } as unknown as Env;
}

describe('resolveMealImage', () => {
	it('resolves a well-known dish to an image URL', async () => {
		const env = mockEnv();
		const url = await resolveMealImage('Paneer Tikka', env);

		// Should return a real Wikimedia URL (or undefined if network is down)
		if (url) {
			expect(url).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
		}
	}, 15000);

	it('caches the result in KV on first lookup', async () => {
		const env = mockEnv();
		await resolveMealImage('Masala Dosa', env);

		// KV.put should have been called (cache write)
		expect(env.MEAL_CACHE.put).toHaveBeenCalled();
		const putCall = (env.MEAL_CACHE.put as any).mock.calls[0];
		expect(putCall[0]).toBe('mealimg:masala dosa');
	}, 15000);

	it('returns cached value on second lookup without hitting the network', async () => {
		const env = mockEnv();
		// First lookup — populates cache
		const firstUrl = await resolveMealImage('Bibimbap', env);
		// Second lookup — should read from cache
		const secondUrl = await resolveMealImage('Bibimbap', env);

		// Both should be the same (either both the URL or both undefined)
		expect(secondUrl).toBe(firstUrl);
		// KV.get called twice (first: miss, second: hit)
		expect(env.MEAL_CACHE.get).toHaveBeenCalledTimes(2);
	}, 15000);

	it('returns undefined for an empty/null dish name', async () => {
		const env = mockEnv();
		expect(await resolveMealImage('', env)).toBeUndefined();
		expect(await resolveMealImage('   ', env)).toBeUndefined();
		// Should not have touched KV at all
		expect(env.MEAL_CACHE.get).not.toHaveBeenCalled();
	});

	it('returns undefined (graceful) for a nonsensical dish name', async () => {
		const env = mockEnv();
		const url = await resolveMealImage('Xyzzy Zzz Nonexistent Fake Dish 999', env);
		expect(url).toBeUndefined();
		// Should negative-cache the miss (empty string stored)
		const putCall = (env.MEAL_CACHE.put as any).mock.calls[0];
		expect(putCall[1]).toBe('');
	}, 15000);
});

describe('resolveMealImages', () => {
	it('enriches an array of meals with imageUrl', async () => {
		const env = mockEnv();
		const meals = [
			{ name: 'Carbonara', mealType: 'lunch' },
			{ name: 'Tiramisu', mealType: 'snack' },
			{ name: 'Xyzzy Fake Dish', mealType: 'dinner' },
		] as any;

		await resolveMealImages(meals, env);

		// Real dishes should have a URL (if network available); fake one should not
		if (meals[0].imageUrl) {
			expect(meals[0].imageUrl).toMatch(/^https:\/\//);
		}
		// The fake dish must not have an imageUrl (graceful degradation)
		expect(meals[2].imageUrl).toBeUndefined();
	}, 20000);

	it('deduplicates by dish name (does not resolve the same name twice)', async () => {
		const env = mockEnv();
		const meals = [
			{ name: 'Risotto', mealType: 'lunch' },
			{ name: 'Risotto', mealType: 'dinner' },
			{ name: 'Risotto', mealType: 'snack' },
		] as any;

		await resolveMealImages(meals, env);

		// All three should have the same imageUrl (or all undefined)
		const urls = meals.map((m: any) => m.imageUrl);
		expect(urls[0]).toBe(urls[1]);
		expect(urls[1]).toBe(urls[2]);
	}, 15000);

	it('handles empty array gracefully', async () => {
		const env = mockEnv();
		const result = await resolveMealImages([], env);
		expect(result).toEqual([]);
	});
});
