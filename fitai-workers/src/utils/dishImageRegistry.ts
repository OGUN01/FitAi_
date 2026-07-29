/**
 * Curated Dish Image Registry
 *
 * A static, hand-verified map of canonical Indian dish slugs → stable
 * Wikimedia Commons thumbnail URLs. This is Tier 1 of the meal-image
 * resolver: an O(1), zero-network, guaranteed-correct lookup for the most
 * common dishes the AI generator produces.
 *
 * Every URL here was resolved and eyeballed against the dish it represents
 * (via the English Wikipedia `pageimages` API or the Commons `imageinfo`
 * API) — never a free-text Commons search, which is how an airplane photo
 * previously snuck in for "Low-Fat Curd". The registry is intentionally
 * conservative: only dishes whose photo we have directly verified are
 * listed. Dishes not in the map fall through to the live Wikipedia /
 * Commons tiers in `mealImageResolver.ts`, and ultimately to the gradient
 * placeholder — never to a wrong photo.
 *
 * The map is keyed by the canonical dish noun produced by
 * `canonicalizeDishName()` in the resolver (lowercase, modifiers/accompani-
 * ments stripped, hyphens/spaces collapsed). Both the registry and the
 * cache share that canonical form so variants like "Low-Fat Curd with
 * Roasted Cumin", "Curd with Roasted Cumin", and "Curd" all resolve to the
 * single `curd` entry.
 *
 * Growing the registry: the resolver logs every dish that falls through to
 * the gradient placeholder. Add the high-frequency misses here after
 * verifying a photo (resolve via `en.wikipedia.org ... prop=pageimages`
 * first, then `commons.wikimedia.org ... prop=imageinfo` for the thumb URL).
 */

/** Canonical dish slug → verified Wikimedia 500px thumbnail URL. */
export const DISH_IMAGE_REGISTRY: Readonly<Record<string, string>> = {
	// --- Verified via English Wikipedia `pageimages` (article lead image) ---
	biryani:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/500px-%22Hyderabadi_Dum_Biryani%22.jpg',
	// "Curd" lead image is the curd-setting photo — topically correct (it IS
	// curd, not an airplane) and the best automated source for Indian curd.
	curd: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Curd_Setting.jpg/500px-Curd_Setting.jpg',
	dal: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/3_types_of_lentil.png/500px-3_types_of_lentil.png',
	idli: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Idli_Sambar.JPG/500px-Idli_Sambar.JPG',
	kadhi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Kadhi_Pakora.jpg/500px-Kadhi_Pakora.jpg',
	kheer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Kheer.jpg/500px-Kheer.jpg',
	khichdi:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Dall_Khichdi.jpg/500px-Dall_Khichdi.jpg',
	lassi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Salt_lassi.jpg/500px-Salt_lassi.jpg',
	naan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/500px-Annapurna_Naan.jpg',
	paneer:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Panir_Paneer_Indian_cheese_fresh.jpg/500px-Panir_Paneer_Indian_cheese_fresh.jpg',
	paratha:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Triangle_paratha_%28cropped%29.JPG/500px-Triangle_paratha_%28cropped%29.JPG',
	rajma:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Rajma_Masala_%2832081557778%29.jpg/500px-Rajma_Masala_%2832081557778%29.jpg',
	raita: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Cucumber-raita.jpg/500px-Cucumber-raita.jpg',
	roti: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/2020-05-08_19_34_28_Chapati_being_made_in_a_pan_in_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg/500px-2020-05-08_19_34_28_Chapati_being_made_in_a_pan_in_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg',
	upma: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/A_photo_of_Upma.jpg/500px-A_photo_of_Upma.jpg',

	// --- Verified via Wikipedia `prop=images` → Commons `imageinfo` thumb ---
	// (these articles have no designated pageimage, so Tier 3 would resolve
	// them live; we bake them in to skip the network for common dishes.)
	'chana masala':
		'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Chana_masala.jpg/500px-Chana_masala.jpg',
	sambar:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Pumpkin_sambar.JPG/500px-Pumpkin_sambar.JPG',
	vada: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Batata_Vada.jpg/500px-Batata_Vada.jpg',
};

/**
 * Tier 1 lookup. Returns the verified thumbnail URL for a canonical dish
 * slug, or undefined if the dish is not in the registry.
 */
export function lookupRegistry(canonical: string): string | undefined {
	if (!canonical) return undefined;
	return DISH_IMAGE_REGISTRY[canonical];
}
