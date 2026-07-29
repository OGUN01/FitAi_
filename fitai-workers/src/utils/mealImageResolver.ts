/**
 * Meal Image Resolver — 4-tier cascade (registry → Wikipedia → Commons → gradient)
 *
 * Resolves a dish name to a real food photograph URL. The resolver runs
 * server-side during meal-plan generation (`generateFreshDiet`); the app
 * reads `meal.imageUrl` from Supabase — zero runtime third-party calls from
 * the user's device. Failures (no match, network, parse error) are
 * non-fatal: `imageUrl` stays undefined and the client renders the gradient
 * placeholder. A wrong photo is NEVER preferable to no photo.
 *
 * ## Why a cascade (not free-text search)
 *
 * The previous design queried the Wikimedia Commons free-text search for
 * the dish name. Commons is sparse for Indian dishes and matches on
 * generic tokens, so "Low-Fat Curd with Roasted Cumin" → "Low Fat" matched
 * `Fat_Albert_low_level_pass.jpg` — an airplane. Free-text search cannot
 * deliver "all dishes, correct images." The cascade below fixes that by
 * asking higher-precision sources first:
 *
 *   Tier 1 — Curated registry (`dishImageRegistry.ts`): O(1), verified URLs
 *            for the most common dishes. Guaranteed correct, zero network.
 *   Tier 2 — English Wikipedia `pageimages`: the article's curated lead
 *            image (en.wikipedia.org, not Commons). High precision.
 *   Tier 3 — Wikipedia `prop=images` → Commons `imageinfo`: for articles
 *            that exist but have no designated pageimage (Dosa, Sambar, …).
 *            Takes the first real photo on the article.
 *   Tier 4 — Wikimedia Commons `generator=search` with a relevance gate:
 *            last resort for compound/regional names with no Wikipedia
 *            article. The gate requires a real food token in the query AND
 *            in each result's title, so generic matches are skipped.
 *
 * All tiers hotlink stable `500px-` Wikimedia upload URLs (CC-licensed,
 * hotlink-friendly). Results are cached in the `MEAL_CACHE` KV namespace
 * at the CANONICAL dish key, so "Low-Fat Curd with Roasted Cumin",
 * "Curd with Roasted Cumin", and "Curd" share one resolution.
 *
 * @see https://www.mediawiki.org/wiki/API:Etiquette
 */

import { lookupRegistry } from './dishImageRegistry';
import type { Env } from './types';
import type { Meal } from './validation';

/** English Wikipedia API (article lead images — higher precision than Commons). */
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
/** Wikimedia Commons API (file/imageinfo + last-resort search). */
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

/** KV cache key prefix — namespaced under the canonical dish form. */
const KV_KEY_PREFIX = 'mealimg:canon:';

/** Cache for 60 days (Wikimedia images are stable; dish names rarely repeat differently). */
const KV_CACHE_TTL = 60 * 24 * 60 * 60; // seconds

/** Compliant User-Agent per Wikimedia etiquette policy */
const USER_AGENT = 'FitAI/1.0 (production; contact@fitai.app)';

/**
 * Modifiers/adjectives that are NOT food identifiers. Used by the Tier 4
 * relevance gate to (a) skip a query that contains only modifiers, and
 * (b) require a result title to mention at least one real food token.
 * Deliberately a broad culinary set here — it only affects Tier 4 matching,
 * never canonicalization (see `canonicalizeDishName` for that).
 */
const STOPWORDS = new Set([
	'low', 'high', 'free', 'light', 'heavy', 'plain', 'mixed', 'special',
	'fat', 'roasted', 'boiled', 'steamed', 'fresh', 'raw', 'hot', 'cold',
	'grilled', 'baked', 'fried', 'spiced', 'masala', 'dry', 'soft', 'hard',
	'with', 'and', 'in', 'on', 'of', 'the', 'a',
]);

/** Extract the food-identifier tokens from a candidate string (lowercase). */
function contentTokens(candidate: string): string[] {
	return candidate
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Reduce a raw generated dish name to its canonical dish noun — the form
 * used for both the registry lookup and the KV cache key. Variants of the
 * same dish collapse to one key so they share a resolution.
 *
 *   "Low-Fat Curd with Roasted Cumin" → "curd"
 *   "Curd with Roasted Cumin"          → "curd"
 *   "Moong Dal Khichdi with Curd"      → "moong dal khichdi"
 *   "Soy Chunk Masala with Roti"       → "soy chunk masala"
 *   "Masala Dosa"                      → "masala dosa"
 *   "Rajma Curry"                      → "rajma curry"
 *
 * Only two kinds of tokens are stripped, both conservatively:
 *   1. Trailing accompaniment: " with X" / " and X" / " & X" / " in X" /
 *      " on X" — the side/accompaniment, not the dish.
 *   2. A leading dietary modifier compound: "Low-Fat", "High-Protein",
 *      "Sugar-Free", "Fat-Free", "Low-Cal", "Low-Sugar", "High-Fiber".
 *
 * We deliberately do NOT drop the last word (the bug that produced
 * "Low Fat" from "Low Fat Curd" and matched an airplane), and we do NOT
 * strip culinary-prep words like "masala"/"curry"/"dal" — those are part
 * of the dish name and help Wikipedia/registry match.
 */
export function canonicalizeDishName(raw: string): string {
	let s = raw.trim().toLowerCase();
	if (!s) return '';
	// Hyphens → spaces so "low-fat" is one token boundary.
	s = s.replace(/[-]+/g, ' ');
	// Strip trailing accompaniment: " with X", " and X", " & X", " in X", " on X".
	s = s.replace(/\s+(with|and|&|in|on)\s+.*$/i, '').trim();
	// Strip a leading dietary-modifier compound (low-fat, high-protein, …).
	s = s.replace(
		/^(low\s*fat|high\s*protein|sugar\s*free|fat\s*free|low\s*cal|low\s*sugar|high\s*fiber|low\s*carb|high\s*cal)\s+/i,
		'',
	);
	// Collapse whitespace.
	s = s.replace(/\s+/g, ' ').trim();
	return s;
}

/**
 * Resolve a single dish name to an image URL via the 4-tier cascade.
 * Returns undefined on any failure (non-fatal — caller keeps the meal as-is
 * and the client renders the gradient placeholder).
 */
export async function resolveMealImage(
	dishName: string,
	env: Env,
): Promise<string | undefined> {
	if (!dishName || !dishName.trim()) return undefined;

	const canonical = canonicalizeDishName(dishName);
	if (!canonical) return undefined;

	const cacheKey = `${KV_KEY_PREFIX}${canonical}`;

	// 0. KV cache — read first (~10ms). Empty string = negative cache (miss).
	try {
		const cached = await env.MEAL_CACHE.get(cacheKey);
		if (cached !== null) {
			return cached || undefined;
		}
	} catch (kvReadError) {
		console.warn('[MealImageResolver] KV read failed for', canonical, '— proceeding to live lookup:', kvReadError);
	}

	// Run the cascade. Each tier returns undefined on miss → next tier.
	let imageUrl: string | undefined;
	try {
		imageUrl =
			lookupRegistry(canonical) ??
			(await resolveViaWikipediaPageImage(canonical)) ??
			(await resolveViaWikipediaArticleImage(canonical)) ??
			(await resolveViaCommonsSearch(canonical));
	} catch (lookupError) {
		console.warn(`[MealImageResolver] Cascade failed for "${dishName}" (canonical "${canonical}"):`, lookupError);
		imageUrl = undefined;
	}

	// Telemetry: log dishes that fell all the way through to the gradient
	// placeholder, so the curated registry can grow from real misses.
	if (!imageUrl) {
		console.log(`[MealImageResolver] No image (gradient fallback): raw="${dishName}" canonical="${canonical}"`);
	}

	// Cache the result (including negative cache for misses).
	try {
		await env.MEAL_CACHE.put(cacheKey, imageUrl ?? '', {
			expirationTtl: KV_CACHE_TTL,
		});
	} catch (kvWriteError) {
		console.warn('[MealImageResolver] KV write failed for', canonical, '— non-fatal, lookup result not cached:', kvWriteError);
	}

	return imageUrl;
}

/**
 * Tier 2 — English Wikipedia `pageimages`: the article's curated lead image.
 * High precision because Wikipedia lead images are human-curated to
 * depict the subject. e.g. "Khichdi" → Dall_Khichdi.jpg.
 */
async function resolveViaWikipediaPageImage(
	canonical: string,
): Promise<string | undefined> {
	const params = new URLSearchParams({
		action: 'query',
		prop: 'pageimages',
		pithumbsize: '500',
		pilicense: 'any',
		format: 'json',
		formatversion: '2',
		titles: canonical,
	});
	const data = await fetchJson(`${WIKIPEDIA_API}?${params.toString()}`);
	const pages = data?.query?.pages;
	if (!Array.isArray(pages)) return undefined;
	for (const page of pages) {
		// "missing" pages still appear with missing:""; skip them.
		if (page?.missing) continue;
		const thumb: string | undefined = page?.thumbnail?.source;
		if (thumb && isPhotoUrl(thumb)) return thumb;
	}
	return undefined;
}

/**
 * Tier 3 — Wikipedia `prop=images` → Commons `imageinfo` thumb.
 * For articles that exist but have no designated pageimage (Dosa, Sambar,
 * Poha, …), list the File: pages on the article and take the first real
 * photograph, resolved to a 500px thumbnail via Commons imageinfo.
 */
async function resolveViaWikipediaArticleImage(
	canonical: string,
): Promise<string | undefined> {
	// 3a. List the article's File: pages.
	const listParams = new URLSearchParams({
		action: 'query',
		prop: 'images',
		imlimit: '20',
		format: 'json',
		formatversion: '2',
		titles: canonical,
	});
	const listData = await fetchJson(`${WIKIPEDIA_API}?${listParams.toString()}`);
	const pages = listData?.query?.pages;
	if (!Array.isArray(pages)) return undefined;
	const articlePage = pages.find((p) => !p?.missing);
	const imageTitles: string[] | undefined = articlePage?.images?.map(
		(img: { ns?: number; title: string }) => img.title,
	);
	if (!imageTitles || imageTitles.length === 0) return undefined;

	// 3b. Resolve the first photo File: to a thumb URL via Commons imageinfo.
	// Skip obvious non-photo File: titles up front to avoid a wasted call.
	const photoTitles = imageTitles.filter(
		(t) => !/\.(svg|pdf|djvu|ogg|mp3|mp4|webm|ogv|oga|tif|tiff)$/i.test(t) && !/logo|icon|flag|edit-clear|commons-/i.test(t),
	);
	if (photoTitles.length === 0) return undefined;

	const iiParams = new URLSearchParams({
		action: 'query',
		prop: 'imageinfo',
		iiprop: 'url',
		iiurlwidth: '500',
		format: 'json',
		formatversion: '2',
		titles: photoTitles.slice(0, 6).join('|'),
	});
	const iiData = await fetchJson(`${WIKIMEDIA_API}?${iiParams.toString()}`);
	const iiPages = iiData?.query?.pages;
	if (!Array.isArray(iiPages)) return undefined;
	for (const page of iiPages) {
		if (page?.missing) continue;
		const info = page?.imageinfo?.[0];
		const thumb: string | undefined = info?.thumburl ?? info?.url;
		if (thumb && isPhotoUrl(thumb)) return thumb;
	}
	return undefined;
}

/**
 * Tier 4 — Wikimedia Commons `generator=search` with a relevance gate.
 * Last resort for compound/regional names with no Wikipedia article.
 * The gate requires the query to have a real food token, and each result's
 * title to mention at least one of the dish's content tokens — so a generic
 * query like "low fat" (only modifiers) is skipped entirely, and a result
 * titled "Bhalla Papri Chaat…" for a "curd" query is rejected.
 */
async function resolveViaCommonsSearch(
	canonical: string,
): Promise<string | undefined> {
	const tokens = contentTokens(canonical);
	if (tokens.length === 0) return undefined;

	const params = new URLSearchParams({
		action: 'query',
		generator: 'search',
		// filetype:bitmap restricts to raster photos (JPG/PNG/WEBP), excluding
		// PDF/DJVU scans, SVGs, audio, and video that pollute plain search.
		gsrsearch: `filetype:bitmap ${canonical}`,
		gsrnamespace: '6', // File: namespace (images only)
		gsrlimit: '8',
		prop: 'imageinfo',
		iiprop: 'url|mimetype',
		iiurlwidth: '500',
		format: 'json',
		formatversion: '2',
	});

	const data = await fetchJson(`${WIKIMEDIA_API}?${params.toString()}`);
	const pages = data?.query?.pages;
	if (!Array.isArray(pages) || pages.length === 0) return undefined;

	// Relevance: a result's title must mention at least one content token of
	// the dish. The title is the File: page name ("File:Bhalla_Papri…jpg"),
	// so normalize separators before matching.
	const titleWords = (title: string): Set<string> =>
		new Set(
			title
				.toLowerCase()
				.replace(/[_\-./]+/g, ' ')
				.split(/\s+/)
				.filter((w) => w.length > 1 && !STOPWORDS.has(w)),
		);

	for (const page of pages) {
		const info = page?.imageinfo?.[0];
		if (!info) continue;

		const pageTitle: string | undefined = page.title;
		if (pageTitle) {
			const resultTokens = titleWords(pageTitle);
			const hasRelevance = tokens.some((t) => resultTokens.has(t));
			if (!hasRelevance) continue;
		}

		const thumbUrl = info.thumburl;
		if (thumbUrl && isPhotoUrl(thumbUrl)) return thumbUrl;
		const fullUrl = info.url;
		if (fullUrl && isPhotoUrl(fullUrl)) return fullUrl;
	}
	return undefined;
}

/** Shared JSON fetch with a compliant User-Agent and error handling. */
async function fetchJson(url: string): Promise<any> {
	try {
		const response = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
		});
		if (!response.ok) {
			console.warn(`[MealImageResolver] API returned ${response.status} for ${url}`);
			return undefined;
		}
		return await response.json();
	} catch (error) {
		console.warn(`[MealImageResolver] Fetch failed for ${url}:`, error);
		return undefined;
	}
}

/**
 * Only accept actual photograph URLs (exclude SVG, PDF, audio, video, etc.).
 *
 * Wikimedia renders the first page of PDF/DJVU uploads as a JPG thumbnail, so
 * a PDF page-thumb URL ENDS in `.jpg` (e.g. `…foo.pdf/page1-500px-foo.pdf.jpg`).
 * The trailing-extension check alone accepted these as photos; cards then
 * rendered a document scan. Reject any URL whose path contains a non-photo
 * source format regardless of the trailing thumb extension.
 */
function isPhotoUrl(url: string): boolean {
	if (!url) return false;
	const lower = url.toLowerCase();
	if (/\.(svg|pdf|djvu|ogg|mp3|mp4|webm|ogv|oga|tif|tiff|gif)(\/|\?|$)/.test(lower))
		return false;
	if (lower.includes('.pdf/') || lower.includes('.djvu/')) return false;
	if (/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)) return true;
	return false; // safer to miss than show junk
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

	// Deduplicate by dish name — don't resolve the same name twice in one batch.
	const uniqueNames = [...new Set(meals.map((m) => m.name).filter(Boolean))];
	const resolutionMap = new Map<string, string | undefined>();

	await Promise.allSettled(
		uniqueNames.map(async (name) => {
			const url = await resolveMealImage(name, env);
			resolutionMap.set(name, url);
		}),
	);

	// Apply resolved URLs to meals.
	let resolvedCount = 0;
	for (const meal of meals) {
		const url = resolutionMap.get(meal.name);
		if (url) {
			meal.imageUrl = url;
			resolvedCount++;
		} else {
			// Ensure no stale URL lingers from a previous generation.
			meal.imageUrl = undefined;
		}
	}

	const elapsed = Date.now() - startTime;
	console.log(
		`[MealImageResolver] Resolved ${resolvedCount}/${meals.length} meal images in ${elapsed}ms`,
	);

	return meals;
}
