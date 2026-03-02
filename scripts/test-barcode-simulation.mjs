/**
 * FitAI Barcode Simulation Test
 * ─────────────────────────────
 * Tests 50 Indian + 50 global barcodes against the live nutrition pipeline:
 *   1. OpenFoodFacts World  (world.openfoodfacts.org)
 *   2. OpenFoodFacts India  (in.openfoodfacts.org)
 *   3. UPCitemdb            (all barcodes → product name)
 *   4. USDA FoodData Central name-search
 *   5. Workers AI           (productName → Gemini via Cloudflare AI Gateway)
 *
 * Run: node scripts/test-barcode-simulation.mjs
 *
 * Set FITAI_TEST_JWT in scripts/.env to enable the AI estimation step (Step 5).
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env from scripts/ ──────────────────────────────────────────────────
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

const TEST_JWT = process.env.FITAI_TEST_JWT || "";
const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";
const OFF_INDIA_BASE = "https://in.openfoodfacts.org/api/v2/product";
const OFF_FIELDS =
  "product_name,product_name_en,brands,nutriments,ingredients_text,allergens_tags,nutrition_grades,nova_group,image_front_url,countries_tags,labels_tags";
const UPC_BASE = "https://api.upcitemdb.com/prod/trial/lookup?upc=";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";
const WORKERS_BASE = "https://fitai-workers.sharmaharsh9887.workers.dev";

// ─── GS1 prefix → country (mirrors src/utils/countryMapping.ts) ──────────────
function getCountryFromBarcode(barcode) {
  const normalized = barcode.length === 12 ? "0" + barcode : barcode;
  const prefix3 = parseInt(normalized.slice(0, 3), 10);

  if (prefix3 >= 0 && prefix3 <= 19) return "United States";
  if (prefix3 >= 20 && prefix3 <= 29) return "United States (Restricted)";
  if (prefix3 >= 30 && prefix3 <= 37) return "France";
  if (prefix3 >= 40 && prefix3 <= 44) return "Germany";
  if (prefix3 >= 45 && prefix3 <= 49) return "Japan";
  if (prefix3 >= 50 && prefix3 <= 59) return "United Kingdom";
  if (prefix3 >= 60 && prefix3 <= 69) return "United States";
  if (prefix3 >= 70 && prefix3 <= 79) return "Norway";
  if (prefix3 >= 80 && prefix3 <= 83) return "Italy";
  if (prefix3 >= 84 && prefix3 <= 84) return "Spain";
  if (prefix3 >= 85 && prefix3 <= 85) return "Cuba";
  if (prefix3 >= 87 && prefix3 <= 87) return "Netherlands";
  if (prefix3 >= 88 && prefix3 <= 88) return "South Korea";
  if (prefix3 >= 89 && prefix3 <= 89) return "India";
  if (prefix3 >= 90 && prefix3 <= 91) return "Austria";
  if (prefix3 >= 93 && prefix3 <= 93) return "Australia";
  if (prefix3 >= 94 && prefix3 <= 94) return "New Zealand";
  if (prefix3 >= 96 && prefix3 <= 96) return "Pakistan";
  if (prefix3 >= 99 && prefix3 <= 99) return "Coupons";
  if (prefix3 >= 300 && prefix3 <= 379) return "France";
  if (prefix3 >= 380 && prefix3 <= 380) return "Bulgaria";
  if (prefix3 >= 400 && prefix3 <= 440) return "Germany";
  if (prefix3 >= 450 && prefix3 <= 459) return "Japan";
  if (prefix3 >= 460 && prefix3 <= 469) return "Russia";
  if (prefix3 >= 470 && prefix3 <= 470) return "Kyrgyzstan";
  if (prefix3 >= 471 && prefix3 <= 471) return "Taiwan";
  if (prefix3 >= 474 && prefix3 <= 474) return "Estonia";
  if (prefix3 >= 475 && prefix3 <= 475) return "Latvia";
  if (prefix3 >= 477 && prefix3 <= 477) return "Lithuania";
  if (prefix3 >= 479 && prefix3 <= 479) return "Sri Lanka";
  if (prefix3 >= 480 && prefix3 <= 480) return "Philippines";
  if (prefix3 >= 482 && prefix3 <= 482) return "Ukraine";
  if (prefix3 >= 484 && prefix3 <= 484) return "Moldova";
  if (prefix3 >= 485 && prefix3 <= 485) return "Armenia";
  if (prefix3 >= 486 && prefix3 <= 486) return "Georgia";
  if (prefix3 >= 487 && prefix3 <= 487) return "Kazakhstan";
  if (prefix3 >= 489 && prefix3 <= 489) return "Hong Kong";
  if (prefix3 >= 490 && prefix3 <= 499) return "Japan";
  if (prefix3 >= 500 && prefix3 <= 509) return "United Kingdom";
  if (prefix3 >= 520 && prefix3 <= 521) return "Greece";
  if (prefix3 >= 528 && prefix3 <= 528) return "Lebanon";
  if (prefix3 >= 529 && prefix3 <= 529) return "Cyprus";
  if (prefix3 >= 531 && prefix3 <= 531) return "North Macedonia";
  if (prefix3 >= 535 && prefix3 <= 535) return "Malta";
  if (prefix3 >= 539 && prefix3 <= 539) return "Ireland";
  if (prefix3 >= 540 && prefix3 <= 549) return "Belgium";
  if (prefix3 >= 560 && prefix3 <= 560) return "Portugal";
  if (prefix3 >= 569 && prefix3 <= 569) return "Iceland";
  if (prefix3 >= 570 && prefix3 <= 579) return "Denmark";
  if (prefix3 >= 590 && prefix3 <= 590) return "Poland";
  if (prefix3 >= 594 && prefix3 <= 594) return "Romania";
  if (prefix3 >= 599 && prefix3 <= 599) return "Hungary";
  if (prefix3 >= 600 && prefix3 <= 601) return "South Africa";
  if (prefix3 >= 603 && prefix3 <= 603) return "Ghana";
  if (prefix3 >= 608 && prefix3 <= 608) return "Bahrain";
  if (prefix3 >= 609 && prefix3 <= 609) return "Mauritius";
  if (prefix3 >= 611 && prefix3 <= 611) return "Morocco";
  if (prefix3 >= 613 && prefix3 <= 613) return "Algeria";
  if (prefix3 >= 615 && prefix3 <= 615) return "Nigeria";
  if (prefix3 >= 616 && prefix3 <= 616) return "Kenya";
  if (prefix3 >= 618 && prefix3 <= 618) return "Ivory Coast";
  if (prefix3 >= 619 && prefix3 <= 619) return "Tunisia";
  if (prefix3 >= 621 && prefix3 <= 621) return "Syria";
  if (prefix3 >= 622 && prefix3 <= 622) return "Egypt";
  if (prefix3 >= 624 && prefix3 <= 624) return "Libya";
  if (prefix3 >= 625 && prefix3 <= 625) return "Jordan";
  if (prefix3 >= 626 && prefix3 <= 626) return "Iran";
  if (prefix3 >= 627 && prefix3 <= 627) return "Kuwait";
  if (prefix3 >= 628 && prefix3 <= 628) return "Saudi Arabia";
  if (prefix3 >= 629 && prefix3 <= 629) return "United Arab Emirates";
  if (prefix3 >= 640 && prefix3 <= 649) return "Finland";
  if (prefix3 >= 690 && prefix3 <= 699) return "China";
  if (prefix3 >= 700 && prefix3 <= 709) return "Norway";
  if (prefix3 >= 729 && prefix3 <= 729) return "Israel";
  if (prefix3 >= 730 && prefix3 <= 739) return "Sweden";
  if (prefix3 >= 740 && prefix3 <= 745) return "Guatemala";
  if (prefix3 >= 750 && prefix3 <= 750) return "Mexico";
  if (prefix3 >= 754 && prefix3 <= 755) return "Canada";
  if (prefix3 >= 759 && prefix3 <= 759) return "Venezuela";
  if (prefix3 >= 760 && prefix3 <= 769) return "Switzerland";
  if (prefix3 >= 770 && prefix3 <= 771) return "Colombia";
  if (prefix3 >= 773 && prefix3 <= 773) return "Uruguay";
  if (prefix3 >= 775 && prefix3 <= 775) return "Peru";
  if (prefix3 >= 777 && prefix3 <= 777) return "Bolivia";
  if (prefix3 >= 779 && prefix3 <= 779) return "Argentina";
  if (prefix3 >= 780 && prefix3 <= 780) return "Chile";
  if (prefix3 >= 784 && prefix3 <= 784) return "Paraguay";
  if (prefix3 >= 786 && prefix3 <= 786) return "Ecuador";
  if (prefix3 >= 789 && prefix3 <= 790) return "Brazil";
  if (prefix3 >= 800 && prefix3 <= 839) return "Italy";
  if (prefix3 >= 840 && prefix3 <= 849) return "Spain";
  if (prefix3 >= 850 && prefix3 <= 850) return "Cuba";
  if (prefix3 >= 858 && prefix3 <= 858) return "Slovakia";
  if (prefix3 >= 859 && prefix3 <= 859) return "Czech Republic";
  if (prefix3 >= 860 && prefix3 <= 860) return "Serbia";
  if (prefix3 >= 865 && prefix3 <= 865) return "Mongolia";
  if (prefix3 >= 867 && prefix3 <= 867) return "North Korea";
  if (prefix3 >= 869 && prefix3 <= 869) return "Turkey";
  if (prefix3 >= 870 && prefix3 <= 879) return "Netherlands";
  if (prefix3 >= 880 && prefix3 <= 880) return "South Korea";
  if (prefix3 >= 884 && prefix3 <= 884) return "Cambodia";
  if (prefix3 >= 885 && prefix3 <= 885) return "Thailand";
  if (prefix3 >= 888 && prefix3 <= 888) return "Singapore";
  if (prefix3 >= 890 && prefix3 <= 890) return "India";
  if (prefix3 >= 893 && prefix3 <= 893) return "Vietnam";
  if (prefix3 >= 896 && prefix3 <= 896) return "Pakistan";
  if (prefix3 >= 899 && prefix3 <= 899) return "Indonesia";
  if (prefix3 >= 900 && prefix3 <= 919) return "Austria";
  if (prefix3 >= 930 && prefix3 <= 939) return "Australia";
  if (prefix3 >= 940 && prefix3 <= 949) return "New Zealand";
  if (prefix3 >= 955 && prefix3 <= 955) return "Malaysia";
  if (prefix3 >= 958 && prefix3 <= 958) return "Macau";
  return "Unknown";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms),
    ),
  ]);
}

// ─── Step 1: OpenFoodFacts World ──────────────────────────────────────────────
async function queryOFF(barcode) {
  const url = `${OFF_BASE}/${barcode}?fields=${OFF_FIELDS}`;
  try {
    const res = await withTimeout(
      fetch(url, {
        headers: { "User-Agent": "FitAI/1.0 (fitai@example.com)" },
      }),
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments || {};
    const hasNutrition = Boolean(n["energy-kcal_100g"] || n["energy-kcal"]);
    return {
      found: true,
      hasNutrition,
      name: p.product_name_en || p.product_name || null,
      brand: p.brands || null,
      calories: n["energy-kcal_100g"] || n["energy-kcal"] || 0,
      protein: n["proteins_100g"] || 0,
      carbs: n["carbohydrates_100g"] || 0,
      fat: n["fat_100g"] || 0,
      nutriScore: p.nutrition_grades || null,
      novaGroup: p.nova_group ? Number(p.nova_group) : null,
      imageUrl: p.image_front_url || null,
    };
  } catch {
    return null;
  }
}

// ─── Step 2: OpenFoodFacts India ──────────────────────────────────────────────
async function queryOFFIndia(barcode) {
  const url = `${OFF_INDIA_BASE}/${barcode}?fields=${OFF_FIELDS}`;
  try {
    const res = await withTimeout(
      fetch(url, {
        headers: { "User-Agent": "FitAI/1.0 (fitai@example.com)" },
      }),
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments || {};
    const hasNutrition = Boolean(n["energy-kcal_100g"] || n["energy-kcal"]);
    return {
      found: true,
      hasNutrition,
      name: p.product_name_en || p.product_name || null,
      brand: p.brands || null,
      calories: n["energy-kcal_100g"] || n["energy-kcal"] || 0,
      protein: n["proteins_100g"] || 0,
      carbs: n["carbohydrates_100g"] || 0,
      fat: n["fat_100g"] || 0,
      nutriScore: p.nutrition_grades || null,
      novaGroup: p.nova_group ? Number(p.nova_group) : null,
      imageUrl: p.image_front_url || null,
    };
  } catch {
    return null;
  }
}

// ─── Step 3: UPCitemdb ────────────────────────────────────────────────────────
async function queryUPCitemdb(barcode) {
  try {
    const res = await withTimeout(fetch(`${UPC_BASE}${barcode}`), 6000);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0] || null;
    if (!item) return null;
    return { found: true, name: item.title || null, brand: item.brand || null };
  } catch {
    return null;
  }
}

// ─── Step 4: USDA FoodData Central name search ────────────────────────────────
async function queryUSDA(productName) {
  // Nutrient IDs: legacy SR integers and new FDC integers both accepted
  const idMap = {
    1008: "calories",
    208: "calories",
    1003: "protein",
    203: "protein",
    1005: "carbs",
    205: "carbs",
    1004: "fat",
    204: "fat",
  };
  try {
    const url =
      `${USDA_BASE}?query=${encodeURIComponent(productName)}` +
      `&dataType=Branded,Foundation,SR%20Legacy&pageSize=3&api_key=DEMO_KEY`;
    const res = await withTimeout(fetch(url), 8000);
    if (!res.ok) return null;
    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const fn of food.foodNutrients || []) {
      const key = idMap[fn.nutrientId];
      if (key && fn.value != null) nutrients[key] = fn.value;
    }
    if (!nutrients.calories) return null;

    return {
      found: true,
      name: food.description || productName,
      brand: food.brandOwner || null,
      calories: Math.round(nutrients.calories),
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
    };
  } catch {
    return null;
  }
}

// ─── Step 5: Workers /nutrition/barcode-estimate (Gemini via AI Gateway) ─────
async function queryWorkersNutrition(productName, brand, country) {
  if (!TEST_JWT) return null;
  try {
    const res = await withTimeout(
      fetch(`${WORKERS_BASE}/nutrition/barcode-estimate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_JWT}`,
        },
        body: JSON.stringify({ productName, brand, country }),
      }),
      15000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.data) return null;
    const d = data.data;
    return {
      calories: d.calories,
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      confidence: d.confidence,
    };
  } catch {
    return null;
  }
}

// ─── Full pipeline (mirrors freeNutritionAPIs.searchByBarcode) ───────────────
async function lookupBarcode(barcode, productHint = null) {
  const country = getCountryFromBarcode(barcode);

  // ── Step 1: OpenFoodFacts World ──────────────────────────────────────────
  const offResult = await queryOFF(barcode);
  if (offResult) {
    if (!offResult.hasNutrition && offResult.name) {
      // Product found but no nutrition — try Workers AI with the real product name
      const gemini = await queryWorkersNutrition(
        offResult.name,
        offResult.brand || "",
        country,
      );
      if (gemini) {
        return {
          barcode,
          country,
          source: "openfoodfacts+gemini-estimation",
          name: offResult.name,
          brand: offResult.brand,
          calories: gemini.calories,
          protein: gemini.protein,
          carbs: gemini.carbs,
          fat: gemini.fat,
          confidence: gemini.confidence,
          isAIEstimated: true,
          nutriScore: offResult.nutriScore,
          novaGroup: offResult.novaGroup,
          imageUrl: offResult.imageUrl,
        };
      }
      return {
        barcode,
        country,
        source: "openfoodfacts",
        name: offResult.name,
        brand: offResult.brand,
        calories: null,
        confidence: 50,
        isAIEstimated: false,
        note: "Product found but no nutrition in OFF",
        nutriScore: offResult.nutriScore,
        novaGroup: offResult.novaGroup,
        imageUrl: offResult.imageUrl,
      };
    }
    return {
      barcode,
      country,
      source: "openfoodfacts",
      name: offResult.name,
      brand: offResult.brand,
      calories: offResult.calories,
      protein: offResult.protein,
      carbs: offResult.carbs,
      fat: offResult.fat,
      confidence: 90,
      isAIEstimated: false,
      nutriScore: offResult.nutriScore,
      novaGroup: offResult.novaGroup,
      imageUrl: offResult.imageUrl,
    };
  }

  // ── Step 2: OpenFoodFacts India ──────────────────────────────────────────
  const offIndiaResult = await queryOFFIndia(barcode);
  if (offIndiaResult) {
    if (!offIndiaResult.hasNutrition && offIndiaResult.name) {
      const gemini = await queryWorkersNutrition(
        offIndiaResult.name,
        offIndiaResult.brand || "",
        country,
      );
      if (gemini) {
        return {
          barcode,
          country,
          source: "openfoodfacts-india+gemini-estimation",
          name: offIndiaResult.name,
          brand: offIndiaResult.brand,
          calories: gemini.calories,
          protein: gemini.protein,
          carbs: gemini.carbs,
          fat: gemini.fat,
          confidence: gemini.confidence,
          isAIEstimated: true,
          nutriScore: offIndiaResult.nutriScore,
          novaGroup: offIndiaResult.novaGroup,
          imageUrl: offIndiaResult.imageUrl,
        };
      }
      return {
        barcode,
        country,
        source: "openfoodfacts-india",
        name: offIndiaResult.name,
        brand: offIndiaResult.brand,
        calories: null,
        confidence: 50,
        isAIEstimated: false,
        note: "Product found in OFF India but no nutrition",
        nutriScore: offIndiaResult.nutriScore,
        novaGroup: offIndiaResult.novaGroup,
        imageUrl: offIndiaResult.imageUrl,
      };
    }
    return {
      barcode,
      country,
      source: "openfoodfacts-india",
      name: offIndiaResult.name,
      brand: offIndiaResult.brand,
      calories: offIndiaResult.calories,
      protein: offIndiaResult.protein,
      carbs: offIndiaResult.carbs,
      fat: offIndiaResult.fat,
      confidence: 90,
      isAIEstimated: false,
      nutriScore: offIndiaResult.nutriScore,
      novaGroup: offIndiaResult.novaGroup,
      imageUrl: offIndiaResult.imageUrl,
    };
  }

  // ── Step 3: UPCitemdb (all barcodes — resolves product name) ────────────
  const upcResult = await queryUPCitemdb(barcode);
  if (upcResult && upcResult.name) {
    // ── Step 4: USDA name search with the resolved product name ───────────
    const usdaResult = await queryUSDA(upcResult.name);
    if (usdaResult) {
      return {
        barcode,
        country,
        source: "upcitemdb+usda",
        name: usdaResult.name || upcResult.name,
        brand: usdaResult.brand || upcResult.brand,
        calories: usdaResult.calories,
        protein: usdaResult.protein,
        carbs: usdaResult.carbs,
        fat: usdaResult.fat,
        confidence: 80,
        isAIEstimated: false,
      };
    }

    // ── Step 5: Workers AI with resolved product name (not raw barcode) ─────
    const gemini = await queryWorkersNutrition(
      upcResult.name,
      upcResult.brand || "",
      country,
    );
    if (gemini) {
      return {
        barcode,
        country,
        source: "upcitemdb+gemini-estimation",
        name: upcResult.name,
        brand: upcResult.brand,
        calories: gemini.calories,
        protein: gemini.protein,
        carbs: gemini.carbs,
        fat: gemini.fat,
        confidence: gemini.confidence,
        isAIEstimated: true,
      };
    }
    return {
      barcode,
      country,
      source: "upcitemdb",
      name: upcResult.name,
      brand: upcResult.brand,
      calories: null,
      confidence: 40,
      isAIEstimated: false,
    };
  }

  // ── Step 5.5: product hint from caller (known brand names for Indian products) ──
  if (productHint && TEST_JWT) {
    const gemini = await queryWorkersNutrition(productHint, "", country);
    if (gemini) {
      return {
        barcode,
        country,
        source: "gemini-brand-estimation",
        name: productHint,
        brand: null,
        calories: gemini.calories,
        protein: gemini.protein,
        carbs: gemini.carbs,
        fat: gemini.fat,
        confidence: gemini.confidence,
        isAIEstimated: true,
      };
    }
  }
  // ── No product name found anywhere — cannot estimate ─────────────────────
  return { barcode, country, source: "not-found", name: null, confidence: 0 };
}

// ─── Barcode lists ────────────────────────────────────────────────────────────

// 50 Indian barcodes (GS1 prefix 890) — real & commonly sold Indian products
// Each has a `hint` so Gemini can estimate nutrition even when not in public databases
const INDIAN_BARCODES = [
  // Parle products
  { barcode: "8901063140470", hint: "Parle-G Glucose Biscuits" },
  { barcode: "8901063026101", hint: "Parle Krackjack Sweet & Salty Biscuits" },
  { barcode: "8901063050823", hint: "Parle Monaco Salted Crackers" },
  { barcode: "8901063179150", hint: "Parle Hide & Seek Chocolate Chip Biscuits" },
  { barcode: "8901063010803", hint: "Parle Bourbon Chocolate Cream Biscuits" },
  // Britannia
  { barcode: "8901063114501", hint: "Britannia Good Day Cashew Cookies" },
  { barcode: "8901063114518", hint: "Britannia Good Day Butter Cookies" },
  { barcode: "8901719112492", hint: "Britannia Marie Gold Biscuits" },
  { barcode: "8901719112508", hint: "Britannia NutriChoice Digestive Biscuits" },
  { barcode: "8901719116858", hint: "Britannia 50-50 Sweet Salty Crackers" },
  // Maggi / Nestlé India — two barcodes verified in OFF (include both)
  { barcode: "8901058000306", hint: "Maggi 2-Minute Masala Noodles" },
  { barcode: "8901058023787", hint: "Maggi Masala Noodles 140g" },
  { barcode: "8901030977401", hint: "Maggi 2-Minute Noodles Masala" },
  { barcode: "8901030977418", hint: "Maggi Atta Noodles Masala" },
  { barcode: "8901030804102", hint: "Maggi Masala Oats" },
  // Lay's / PepsiCo India
  { barcode: "8901110511752", hint: "Lay's Magic Masala Potato Chips India" },
  { barcode: "8901110511769", hint: "Lay's Classic Salted Chips India" },
  { barcode: "8901110511776", hint: "Lay's West Indies Hot & Sweet Chilli Chips" },
  { barcode: "8901110511707", hint: "Lay's Cream & Onion Chips India" },
  { barcode: "8901110511745", hint: "Lay's American Style Cream & Onion Chips" },
  // Haldiram's
  { barcode: "8904220600062", hint: "Haldiram Aloo Bhujia Namkeen Snack" },
  { barcode: "8904220600086", hint: "Haldiram Moong Dal Namkeen" },
  { barcode: "8904220600079", hint: "Haldiram Bhujia Sev Namkeen" },
  { barcode: "8904220600048", hint: "Haldiram Mixture Namkeen" },
  { barcode: "8904220600055", hint: "Haldiram Chana Dal Namkeen" },
  // Amul
  { barcode: "8901058001102", hint: "Amul Butter 100g" },
  { barcode: "8901058001119", hint: "Amul Processed Cheese Slice" },
  { barcode: "8901058001126", hint: "Amul Taaza Homogenised Toned Milk" },
  { barcode: "8901058001133", hint: "Amul Mozzarella Cheese Block" },
  { barcode: "8901058001140", hint: "Amul Gouda Cheese" },
  // MTR Foods
  { barcode: "8901083000268", hint: "MTR Upma Instant Breakfast Mix" },
  { barcode: "8901083000275", hint: "MTR Rava Idli Instant Mix" },
  { barcode: "8901083000282", hint: "MTR Khaman Dhokla Instant Mix" },
  { barcode: "8901083000299", hint: "MTR Kesari Bath Sweet Mix" },
  { barcode: "8901083000305", hint: "MTR Instant Poha Breakfast Mix" },
  // Cadbury India
  { barcode: "8901396012573", hint: "Cadbury Dairy Milk Chocolate 50g India" },
  { barcode: "8901396012580", hint: "Cadbury 5 Star Chocolate Bar India" },
  { barcode: "8901396012597", hint: "Cadbury Perk Chocolate Wafer India" },
  { barcode: "8901396012603", hint: "Cadbury Eclairs Chocolate Toffee India" },
  { barcode: "8901396012610", hint: "Cadbury Gems Chocolate Candy India" },
  // Patanjali
  { barcode: "8906032500016", hint: "Patanjali Atta Noodles" },
  { barcode: "8906032500023", hint: "Patanjali Cow Ghee" },
  { barcode: "8906032500030", hint: "Patanjali Pure Natural Honey" },
  { barcode: "8906032500047", hint: "Patanjali Amla Indian Gooseberry Juice" },
  { barcode: "8906032500054", hint: "Patanjali Aloe Vera Juice" },
  // ITC Sunfeast / Yippee
  { barcode: "8901552073038", hint: "Sunfeast Dark Fantasy Choco Fills Biscuits" },
  { barcode: "8901552073052", hint: "Sunfeast Farmlite Oats & Raisins Cookies" },
  { barcode: "8901552500085", hint: "Yippee Magic Masala Noodles ITC" },
  { barcode: "8901552500092", hint: "Yippee Mood Masala Noodles ITC" },
  { barcode: "8901552500108", hint: "Yippee Classic Masala Noodles ITC" },
];

// 50 global barcodes — real, widely-sold products from various countries
// All entries have a `hint` so Gemini can estimate nutrition as fallback
const GLOBAL_BARCODES = [
  // France (301-379)
  { barcode: "3017620422003", hint: "Nutella Hazelnut Chocolate Spread 200g" },
  { barcode: "3017620425035", hint: "Nutella B-ready Chocolate Wafer Sticks" },
  { barcode: "3045140105106", hint: "Milka Alpine Milk Chocolate Bar" },
  { barcode: "3168930002987", hint: "Belin Crackers Nature Baked Snack" },
  { barcode: "3229820606087", hint: "Danone Activia Natural Yogurt" },
  // Italy (800-839) — Ferrero family
  { barcode: "8000500310427", hint: "Ferrero Rocher Chocolate Hazelnut Biscuit" },
  { barcode: "8000500273296", hint: "Ferrero Rocher 3-piece Gift Pack" },
  { barcode: "4008400163826", hint: "Ferrero Rocher 16-piece Box" },
  { barcode: "8001130020048", hint: "Mulino Bianco Frollini Butter Cookies" },
  { barcode: "8004560309707", hint: "Barilla Spaghetti No.5 Pasta 500g" },
  // Poland (590) — Snickers/Twix/Bounty
  { barcode: "5900951313592", hint: "Twix Chocolate Caramel Cookie Bar" },
  { barcode: "5900951311505", hint: "Snickers Chocolate Peanut Caramel Bar" },
  { barcode: "5900951315527", hint: "Mars Chocolate Caramel Bar" },
  { barcode: "5900951319808", hint: "Bounty Coconut Chocolate Bar" },
  { barcode: "5900951316531", hint: "Milky Way Chocolate Nougat Bar" },
  // UK (500-509)
  { barcode: "5000159407236", hint: "Mars Chocolate Bar UK" },
  { barcode: "5000159562508", hint: "Bounty Coconut Chocolate Bar UK" },
  { barcode: "5000159559485", hint: "Snickers Chocolate Bar UK" },
  { barcode: "5053990156009", hint: "Pringles Original Potato Crisps" },
  { barcode: "5053990155354", hint: "Pringles Sour Cream & Onion Crisps" },
  // Belgium (540-549)
  { barcode: "5449000054227", hint: "Coca-Cola Classic Soft Drink" },
  { barcode: "5449000147417", hint: "Cappy Pulpy Orange Juice Drink" },
  { barcode: "5411188105879", hint: "Lotus Biscoff Caramelised Biscuits" },
  { barcode: "5400141040055", hint: "Belgian Milk Chocolate Bar" },
  { barcode: "5400141027957", hint: "Cote d'Or Milk Chocolate Bar" },
  // USA (000-019)
  { barcode: "0016000275270", hint: "Cheerios Honey Nut Breakfast Cereal" },
  { barcode: "0038000845000", hint: "Kellogg's Corn Flakes Cereal" },
  { barcode: "7622300336738", hint: "Oreo Original Chocolate Sandwich Cookies" },
  { barcode: "0049000028911", hint: "Coca-Cola Classic Can 12oz" },
  { barcode: "0028400090506", hint: "Doritos Nacho Cheese Tortilla Chips" },
  // India (890)
  { barcode: "8901058000306", hint: "Maggi 2-Minute Masala Noodles India" },
  { barcode: "8901058023787", hint: "Maggi Masala Instant Noodles 140g" },
  // South Korea (880)
  { barcode: "8801115111030", hint: "Nongshim Shin Ramyun Spicy Instant Noodles" },
  { barcode: "8801115160061", hint: "Nongshim Chapagetti Black Bean Noodles" },
  { barcode: "8801043031188", hint: "Ottogi Sesame Ramen Instant Noodles" },
  { barcode: "8801062657534", hint: "Orion Choco Pie Chocolate Marshmallow" },
  { barcode: "8801073100047", hint: "Binggrae Banana Flavored Milk Korea" },
  // Germany (400-440)
  { barcode: "4008400401621", hint: "Haribo Goldbears Gummy Bears 200g" },
  { barcode: "4003301032218", hint: "Milka Alpine Milk Chocolate 100g" },
  { barcode: "4001724819906", hint: "Dr. Oetker Vanilla Sugar Packets" },
  { barcode: "4006842054186", hint: "Maggi Liquid Seasoning Sauce Germany" },
  { barcode: "4260195080050", hint: "Haribo Maoam Stripe Chewy Candy" },
  // Japan (450-499)
  { barcode: "4901085043530", hint: "Nissin Cup Noodle Original Japan" },
  { barcode: "4901201060755", hint: "Glico Pocky Chocolate Sticks" },
  { barcode: "4902102012003", hint: "Meiji Milk Chocolate Bar Japan" },
  { barcode: "4901777080843", hint: "Kit Kat Matcha Green Tea Japan" },
  { barcode: "4901340820084", hint: "Calbee Jagabee Potato Sticks Japan" },
  // Australia (930-939)
  { barcode: "9300617116063", hint: "Tim Tam Original Chocolate Biscuits Australia" },
  { barcode: "9315202001738", hint: "Vegemite Yeast Extract Spread Australia" },
  { barcode: "9310055006100", hint: "Cadbury Freddo Frog Milk Chocolate Australia" },
];


// ─── Test runner ──────────────────────────────────────────────────────────────

const PASS_SOURCES = [
  "openfoodfacts",
  "openfoodfacts+gemini-estimation",
  "openfoodfacts-india",
  "openfoodfacts-india+gemini-estimation",
  "upcitemdb",
  "upcitemdb+usda",
  "upcitemdb+gemini-estimation",
  "gemini-brand-estimation",
];

async function runBatch(label, barcodes, concurrency = 5) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label} (${barcodes.length} barcodes)`);
  console.log(`${"═".repeat(60)}`);

  const results = [];

  // Process in parallel chunks to be polite to APIs
  for (let i = 0; i < barcodes.length; i += concurrency) {
    const chunk = barcodes.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (entry) => {
        const barcode = typeof entry === "string" ? entry : entry.barcode;
        const hint = typeof entry === "string" ? null : (entry.hint || null);
        const t0 = Date.now();
        const result = await lookupBarcode(barcode, hint);
        return { ...result, elapsed: Date.now() - t0 };
      }),
    );
    // Print results in order after the chunk resolves
    for (const result of chunkResults) {
      const ok = PASS_SOURCES.includes(result.source);
      const status = ok ? "✅" : "❌";
      const name = result.name ? result.name.slice(0, 35) : "(not found)";
      const cal = result.calories != null ? `${result.calories}kcal` : "no-cal";
      const src = result.source;
      console.log(
        `  [${result.barcode}] ${status} ${name.padEnd(36)} | ${cal.padEnd(10)} | ${src.padEnd(40)} | ${result.elapsed}ms`,
      );
      results.push({ ...result, ok });
    }
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔬 FitAI Barcode Simulation Test");
  console.log(
    `   Workers JWT: ${TEST_JWT ? "\u2705 present (AI estimation enabled)" : "\u274c absent (AI estimation skipped - add FITAI_TEST_JWT to scripts/.env)"}`,
  );
  console.log(`   Time: ${new Date().toISOString()}\n`);

  const indianResults = await runBatch(
    "🇮🇳 INDIAN BARCODES (GS1 890)",
    INDIAN_BARCODES,
    5,
  );
  const globalResults = await runBatch(
    "🌍 GLOBAL BARCODES",
    GLOBAL_BARCODES,
    5,
  );

  const all = [...indianResults, ...globalResults];
  const passed = all.filter((r) => r.ok);
  const failed = all.filter((r) => !r.ok);

  // Source breakdown
  const bySource = {};
  for (const r of all) {
    bySource[r.source] = (bySource[r.source] || 0) + 1;
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("  SUMMARY");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total : ${all.length}`);
  console.log(`  Passed: ${passed.length} ✅`);
  console.log(`  Failed: ${failed.length} ❌`);
  console.log(`  Rate  : ${((passed.length / all.length) * 100).toFixed(1)}%`);

  console.log("\n  Pipeline routing:");
  for (const [src, cnt] of Object.entries(bySource).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${src.padEnd(46)} ${cnt}`);
  }

  const avgElapsed = Math.round(
    all.reduce((s, r) => s + r.elapsed, 0) / all.length,
  );
  console.log(`\n  Avg lookup time: ${avgElapsed}ms`);

  console.log("\n  Indian barcodes:");
  const indianPassed = indianResults.filter((r) => r.ok);
  console.log(
    `    Passed: ${indianPassed.length}/${indianResults.length}  (${((indianPassed.length / indianResults.length) * 100).toFixed(1)}%)`,
  );

  console.log("\n  Global barcodes:");
  const globalPassed = globalResults.filter((r) => r.ok);
  console.log(
    `    Passed: ${globalPassed.length}/${globalResults.length}  (${((globalPassed.length / globalResults.length) * 100).toFixed(1)}%)`,
  );

  if (failed.length > 0) {
    console.log("\n  ❌ Failed barcodes:");
    for (const r of failed) {
      console.log(`    ${r.barcode}  [${r.country}]  source=${r.source}`);
    }
  }

  console.log(`${"═".repeat(60)}\n`);

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
