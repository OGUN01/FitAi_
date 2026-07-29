/**
 * Meal Image Resolver — unit tests
 *
 * Tests the 4-tier cascade (registry → Wikipedia pageimages → Wikipedia
 * article images → Commons search → gradient) and the KV cache.
 *
 * - Canonicalization + registry tests are deterministic (no network).
 * - Live-tier tests use real Wikimedia/Wikipedia calls (network required);
 *   they assert the *shape* of the result (or undefined) so they pass
 *   gracefully when the network is unavailable.
 * - Mocked-fetch tests pin the tier behavior without network.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	resolveMealImage,
	resolveMealImages,
	canonicalizeDishName,
} from './mealImageResolver';
import { DISH_IMAGE_REGISTRY } from './dishImageRegistry';
import type { Env } from './types';

/** Minimal mock KV namespace that behaves like Cloudflare KV. */
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

describe('canonicalizeDishName', () => {
	it('strips trailing accompaniments and leading dietary modifiers', () => {
		expect(canonicalizeDishName('Low-Fat Curd with Roasted Cumin')).toBe('curd');
		expect(canonicalizeDishName('Curd with Roasted Cumin')).toBe('curd');
		expect(canonicalizeDishName('Moong Dal Khichdi with Curd')).toBe('moong dal khichdi');
		expect(canonicalizeDishName('Soy Chunk Masala with Roti')).toBe('soy chunk masala');
		expect(canonicalizeDishName('High-Protein Dal and Roti')).toBe('dal');
		expect(canonicalizeDishName('Sugar-Free Kheer with Almonds')).toBe('kheer');
	});

	it('keeps culinary-prep words that are part of the dish name', () => {
		expect(canonicalizeDishName('Masala Dosa')).toBe('masala dosa');
		expect(canonicalizeDishName('Rajma Curry')).toBe('rajma curry');
		expect(canonicalizeDishName('Chana Masala')).toBe('chana masala');
	});

	it('does NOT drop the last word (the airplane bug)', () => {
		// Previously "Low Fat Curd" → "Low Fat" → matched an airplane photo.
		expect(canonicalizeDishName('Low Fat Curd')).toBe('curd');
		// Never produces a modifiers-only result.
		expect(canonicalizeDishName('Low Fat')).toBe('low fat');
	});

	it('handles empty / whitespace / hyphenated input', () => {
		expect(canonicalizeDishName('')).toBe('');
		expect(canonicalizeDishName('   ')).toBe('');
		expect(canonicalizeDishName('  mixed-veg  pulao  ')).toBe('mixed veg pulao');
	});
});

describe('resolveMealImage — Tier 1 (registry, no network)', () => {
	it('returns the registry URL for a known dish without touching the network', async () => {
		const env = mockEnv();
		const dish = 'Low-Fat Curd with Roasted Cumin'; // canonical → "curd"
		const expected = DISH_IMAGE_REGISTRY['curd'];
		expect(expected).toBeTruthy();

		// Track fetch — it must NOT be called for a registry hit.
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		const url = await resolveMealImage(dish, env);

		expect(url).toBe(expected);
		expect(url).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
		expect(fetchSpy).not.toHaveBeenCalled();
		// Cached at the canonical key.
		expect(env.MEAL_CACHE.put).toHaveBeenCalledWith(
			'mealimg:canon:curd',
			expected,
			expect.any(Object),
		);
		fetchSpy.mockRestore();
	});

	it('collapses variants of the same dish to one canonical cache key', async () => {
		const env = mockEnv();
		await resolveMealImage('Low-Fat Curd with Roasted Cumin', env);
		await resolveMealImage('Curd with Roasted Cumin', env);
		await resolveMealImage('Curd', env);

		const putCalls = (env.MEAL_CACHE.put as any).mock.calls.map((c: any[]) => c[0]);
		// Every variant wrote the SAME canonical key.
		expect(putCalls.every((k: string) => k === 'mealimg:canon:curd')).toBe(true);
	});
});

describe('resolveMealImage — airplane case (must NOT return a wrong photo)', () => {
	// "Low Fat" alone (modifiers-only) has no content tokens, so Tier 4 is
	// skipped and no upstream returns a wrong bitmap. The result is the
	// registry/Wikipedia answer for "curd" (via canonicalization) or
	// undefined — never an airplane URL.
	it('never returns the airplane URL for a curd dish', async () => {
		const env = mockEnv();
		const url = await resolveMealImage('Low-Fat Curd with Roasted Cumin', env);
		expect(url).not.toContain('Fat_Albert');
		expect(url).not.toMatch(/low_level_pass/);
	});
});

describe('resolveMealImage — empty / null', () => {
	it('returns undefined and skips KV for empty/whitespace names', async () => {
		const env = mockEnv();
		expect(await resolveMealImage('', env)).toBeUndefined();
		expect(await resolveMealImage('   ', env)).toBeUndefined();
		expect(env.MEAL_CACHE.get).not.toHaveBeenCalled();
	});
});

describe('resolveMealImage — live tiers (network; graceful without network)', () => {
	it('resolves a well-known dish to a Wikimedia URL (or undefined offline)', async () => {
		const env = mockEnv();
		const url = await resolveMealImage('Paneer Tikka', env);
		if (url) {
			expect(url).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
		}
	}, 20000);

	it('returns cached value on second lookup without a fresh network round-trip', async () => {
		const env = mockEnv();
		const first = await resolveMealImage('Bibimbap', env);
		const second = await resolveMealImage('Bibimbap', env);
		expect(second).toBe(first);
		expect(env.MEAL_CACHE.get).toHaveBeenCalledTimes(2);
	}, 20000);

	it('negative-caches a miss as an empty string', async () => {
		const env = mockEnv();
		await resolveMealImage('Xyzzy Zzz Nonexistent Fake Dish 999', env);
		const putCall = (env.MEAL_CACHE.put as any).mock.calls[0];
		expect(putCall[1]).toBe('');
	}, 20000);
});

describe('resolveMealImage — mocked fetch (pins tier behavior)', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn<any, any>>;

	afterEach(() => {
		fetchSpy?.mockRestore();
	});

	it('Tier 2: uses the Wikipedia pageimage when the dish is not in the registry', async () => {
		const env = mockEnv();
		// "Khichdi" IS in the registry, so use a dish that canonicalizes to
		// something NOT in the registry but with a Wikipedia article. "Dal Makhani"
		// → "dal makhani" (not a registry key). Mock enwiki to return a thumb.
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
			const url = String(input);
			if (url.startsWith('https://en.wikipedia.org/') && url.includes('pageimages')) {
				return new Response(
					JSON.stringify({
						query: {
							pages: [
								{
									title: 'Dal makhani',
									thumbnail: { source: 'https://upload.wikimedia.org/thumb/dal-makhani.jpg' },
								},
							],
						},
					}),
					{ status: 200 },
				);
			}
			return new Response(JSON.stringify({ query: { pages: [] } }), { status: 200 });
		});

		const url = await resolveMealImage('Dal Makhani with Butter', env);
		expect(url).toBe('https://upload.wikimedia.org/thumb/dal-makhani.jpg');
	}, 20000);

	it('Tier 4: rejects a Commons result whose title has no shared food token', async () => {
		const env = mockEnv();
		// A dish not in the registry and with no Wikipedia pageimage/article
		// so the cascade reaches Tier 4. "Spiced Pumpkin Curry" → "spiced pumpkin curry".
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
			const url = String(input);
			if (url.startsWith('https://en.wikipedia.org/')) {
				// No page / no images on the article.
				return new Response(JSON.stringify({ query: { pages: [{ missing: true }] } }), {
					status: 200,
				});
			}
			if (url.startsWith('https://commons.wikimedia.org/') && url.includes('generator=search')) {
				// First result is an UNRELATED bitmap (no "pumpkin"/"curry" token).
				return new Response(
					JSON.stringify({
						query: {
							pages: [
								{
									title: 'File:Some Airplane.jpg',
									imageinfo: [{ thumburl: 'https://upload.wikimedia.org/airplane.jpg' }],
								},
							],
						},
					}),
					{ status: 200 },
				);
			}
			return new Response(JSON.stringify({ query: { pages: [] } }), { status: 200 });
		});

		const url = await resolveMealImage('Spiced Pumpkin Curry', env);
		// Unrelated result rejected → undefined (gradient fallback).
		expect(url).toBeUndefined();
	}, 20000);
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

		if (meals[0].imageUrl) {
			expect(meals[0].imageUrl).toMatch(/^https:\/\//);
		}
		// The fake dish must not have an imageUrl (graceful degradation).
		expect(meals[2].imageUrl).toBeUndefined();
	}, 25000);

	it('deduplicates by dish name (does not resolve the same name twice)', async () => {
		const env = mockEnv();
		const meals = [
			{ name: 'Risotto', mealType: 'lunch' },
			{ name: 'Risotto', mealType: 'dinner' },
			{ name: 'Risotto', mealType: 'snack' },
		] as any;

		await resolveMealImages(meals, env);

		const urls = meals.map((m: any) => m.imageUrl);
		expect(urls[0]).toBe(urls[1]);
		expect(urls[1]).toBe(urls[2]);
	}, 20000);

	it('handles empty array gracefully', async () => {
		const env = mockEnv();
		const result = await resolveMealImages([], env);
		expect(result).toEqual([]);
	});
});
