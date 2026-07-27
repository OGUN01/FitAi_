/**
 * Meal Image Resolver — Wikimedia Commons + KV cache
 *
 * Resolves a dish name to a real food photograph URL using the Wikimedia
 * Commons API (free, no API key, CC-licensed images). Results are cached in
 * the MEAL_CACHE KV namespace so each unique dish name is resolved exactly
 * once — subsequent lookups (from any user) are a ~10ms KV read.
 *
 * Production design:
 * - Called server-side during meal-plan generation (generateFreshDiet), never
 *   from the phone. The app reads meal.imageUrl from Supabase — zero runtime
 *   third-party calls from the user's device.
 * - Wikimedia allows 200 req/min with a compliant User-Agent. Because every
 *   dish is cached after first resolution, effective Wikimedia traffic drops
 *   to near zero in steady state.
 * - Failures (network, no match, parse error) are non-fatal: imageUrl stays
 *   undefined and the client renders the gradient placeholder.
 *
 * @see https://www.mediawiki.org/wiki/API:Etiquette
 * @see https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits
 */

import type { Env } from './types';
import type { Meal } from './validation';

/** Wikimedia Commons API search endpoint */
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

/** KV cache key prefix — namespaces dish names from other meal-cache keys */
const KV_KEY_PREFIX = 'mealimg:';

/** Cache for 60 days (Wikimedia images are stable; dish names rarely repeat differently) */
const KV_CACHE_TTL = 60 * 24 * 60 * 60; // seconds

/** Compliant User-Agent per Wikimedia etiquette policy */
const USER_AGENT = 'FitAI/1.0 (production; contact@fitai.app)';

/**
 * Resolve a single dish name to an image URL.
 * Returns undefined on any failure (non-fatal — caller keeps the meal as-is).
 */
export async function resolveMealImage(
	dishName: string,
	env: Env,
): Promise<string | undefined> {
	if (!dishName || !dishName.trim()) return undefined;

	// Normalize the dish name for the cache key (lowercase, trimmed, collapse spaces)
	const normalized = dishName.trim().toLowerCase().replace(/\s+/g, ' ');
	const cacheKey = `${KV_KEY_PREFIX}${normalized}`;

	// 1. Check KV cache first (~10ms)
	try {
		const cached = await env.MEAL_CACHE.get(cacheKey);
		if (cached !== null) {
			// Empty string = previously searched with no result (negative cache).
			// Return undefined so caller shows the gradient fallback, but we
			// don't hit Wikimedia again for this name.
			return cached || undefined;
		}
	} catch (kvReadError) {
		console.warn('[MealImageResolver] KV read failed for', normalized, '— proceeding to live lookup:', kvReadError);
	}

	// 2. Live Wikimedia Commons search — try the full name, then progressively
	//    shorter base forms (strip "with X", drop trailing word) so compound
	//    dish names like "Soy Chunk Masala with Roti" can still match the
	//    primary dish photo Wikimedia indexes.
	const candidates = deriveSearchCandidates(dishName);
	let imageUrl: string | undefined;
	for (const candidate of candidates) {
		imageUrl = await searchWikimediaCommons(candidate);
		if (imageUrl) break;
	}

	// 3. Cache the result (including negative cache for misses)
	try {
		await env.MEAL_CACHE.put(cacheKey, imageUrl ?? '', {
			expirationTtl: KV_CACHE_TTL,
		});
	} catch (kvWriteError) {
		console.warn('[MealImageResolver] KV write failed for', normalized, '— non-fatal, lookup result not cached:', kvWriteError);
	}

	return imageUrl;
}

/**
 * Derive progressively shorter base-form search candidates from a compound dish
 * name, so Wikimedia Commons (which indexes by the primary dish) can still
 * match. e.g. "Soy Chunk Masala with Roti" → ["Soy Chunk Masala with Roti",
 * "Soy Chunk Masala", "Soy Chunk"]. Tried in order; first hit wins.
 */
function deriveSearchCandidates(dishName: string): string[] {
	const base = dishName.trim();
	if (!base) return [];
	const candidates = [base];
	// Strip " with X" / " and X" / " & X" / " in X" suffixes.
	const stripped = base
	.replace(/\s+(with|and|&|in|on)\s+.*$/i, '')
	.trim();
	if (stripped && stripped !== base) candidates.push(stripped);
	// Drop the last word once more (e.g. "Rajma Curry" → "Rajma").
	const words = stripped.split(/\s+/);
	if (words.length > 1) {
		const shorter = words.slice(0, -1).join(' ');
		if (shorter && !candidates.includes(shorter)) candidates.push(shorter);
	}
	return candidates;
}

/**
 * Query Wikimedia Commons for a dish photo.
 * Uses the generator=search API with imageinfo to get a thumbnail URL.
 */
async function searchWikimediaCommons(
	dishName: string,
): Promise<string | undefined> {
	const params = new URLSearchParams({
		action: 'query',
		generator: 'search',
		// filetype:bitmap restricts to raster photos (JPG/PNG/WEBP/GIF), excluding
		// PDF/DJVU document scans, SVGs, audio, and video that pollute plain search.
		// haswbstatement filters out non-file/redirect noise in the File namespace.
		gsrsearch: `filetype:bitmap ${dishName}`,
		gsrnamespace: '6', // File: namespace (images only)
		gsrlimit: '8', // Fetch more candidates — first VALID photo wins
		prop: 'imageinfo',
		iiprop: 'url|mimetype',
		iiurlwidth: '500', // Request a 500px thumbnail (good for cards)
		format: 'json',
		formatversion: '2',
	});

	try {
		const response = await fetch(`${WIKIMEDIA_API}?${params.toString()}`, {
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'application/json',
			},
			// Cloudflare Workers fetch has a default timeout; Wikimedia is usually <3s
		});

		if (!response.ok) {
			console.warn(
				`[MealImageResolver] Wikimedia returned ${response.status} for "${dishName}"`,
			);
			return undefined;
		}

		const data = (await response.json()) as any;
		const pages = data?.query?.pages;

		if (!pages || !Array.isArray(pages) || pages.length === 0) {
			return undefined;
		}

		// Find the first page with a valid photograph.
		// Wikimedia's imageinfo with iiurlwidth returns thumburl but often omits
		// mimetype, so we filter by URL extension instead (always present).
		for (const page of pages) {
			const imageInfo = page?.imageinfo?.[0];
			if (!imageInfo) continue;

			// Prefer the thumburl (sized thumbnail) — it's the 500px version we requested
			const thumbUrl = imageInfo.thumburl;
			if (thumbUrl && isPhotoUrl(thumbUrl)) {
				return thumbUrl;
			}

			// Fall back to the full-resolution URL if no thumbnail
			const fullUrl = imageInfo.url;
			if (fullUrl && isPhotoUrl(fullUrl)) {
				return fullUrl;
			}
		}

		return undefined;
	} catch (error) {
		console.warn(
			`[MealImageResolver] Failed to resolve image for "${dishName}":`,
			error,
		);
		return undefined;
	}
}

/**
 * Only accept actual photograph URLs (exclude SVG, PDF, audio, video, etc.).
 *
 * Wikimedia renders the first page of PDF/DJVU uploads as a JPG thumbnail, so a
 * PDF page-thumb URL ENDS in `.jpg` (e.g. `...foo.pdf/page1-500px-foo.pdf.jpg`).
 * The earlier check only inspected the trailing extension and so accepted these
 * PDF page-thumbs as photos — cards then rendered a document scan, not food.
 * Reject any URL whose path contains a non-photo source format regardless of the
 * trailing thumb extension.
 */
function isPhotoUrl(url: string): boolean {
	if (!url) return false;
	const lower = url.toLowerCase();
	// Reject non-photo SOURCE formats anywhere in the path (covers PDF/DJVU/etc.
	// page-thumbs that Wikimedia renders with a .jpg suffix).
	if (/\.(svg|pdf|djvu|ogg|mp3|mp4|webm|ogv|oga|tif|tiff|gif)(\/|\?|$)/.test(lower))
		return false;
	if (lower.includes('.pdf/') || lower.includes('.djvu/')) return false;
	// Accept common photo formats
	if (/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)) return true;
	// Default: reject (avoid GIFs/no-extension oddities; safer to miss than show junk)
	return false;
}

/**
 * Enrich an array of meals with imageUrl fields.
 * Resolves all meals in parallel (Promise.allSettled) so one slow/failed
 * lookup doesn't block the others. Mutates meals in place and returns them.
 *
 * Used by generateFreshDiet after AI generation + portion adjustment.
 */
export async function resolveMealImages(meals: Meal[], env: Env): Promise<Meal[]> {
	if (!meals || meals.length === 0) return meals;

	console.log(`[MealImageResolver] Resolving images for ${meals.length} meals...`);
	const startTime = Date.now();

	// Deduplicate by dish name — don't resolve the same name twice in one batch
	const uniqueNames = [...new Set(meals.map((m) => m.name).filter(Boolean))];
	const resolutionMap = new Map<string, string | undefined>();

	await Promise.allSettled(
		uniqueNames.map(async (name) => {
			const url = await resolveMealImage(name, env);
			resolutionMap.set(name, url);
		}),
	);

	// Apply resolved URLs to meals
	let resolvedCount = 0;
	for (const meal of meals) {
		const url = resolutionMap.get(meal.name);
		if (url) {
			meal.imageUrl = url;
			resolvedCount++;
		}
	}

	const elapsed = Date.now() - startTime;
	console.log(
		`[MealImageResolver] Resolved ${resolvedCount}/${meals.length} meal images in ${elapsed}ms`,
	);

	return meals;
}
