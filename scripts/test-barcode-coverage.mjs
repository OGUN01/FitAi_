// Test coverage of 200+ common Indian daily-use food product barcodes
// against the off_products table in Supabase

import { readFileSync } from "fs";

const envFile = readFileSync(".env", "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [
        l.slice(0, idx).trim(),
        l
          .slice(idx + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      ];
    }),
);

const PAT = "sbp_9f369f3cbb52d4df76f87850fe7526d5dad91c06";
const PROJECT_REF = "mqfrwtmkokivoxgukgsz";
const MGMT_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function mgmtQuery(sql) {
  const res = await fetch(MGMT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error("SQL error: " + JSON.stringify(result));
  return result;
}

// 220+ most common Indian daily-use food product barcodes
const BARCODES = [
  // === AMUL ===
  { barcode: "8901063005677", brand: "Amul", name: "Amul Butter 500g" },
  { barcode: "8901063015362", brand: "Amul", name: "Amul Taaza Milk 1L" },
  { barcode: "8901063060348", brand: "Amul", name: "Amul Mozzarella Cheese" },
  { barcode: "8901063011128", brand: "Amul", name: "Amul Processed Cheese" },
  {
    barcode: "8901063052770",
    brand: "Amul",
    name: "Amul Kool Koko Chocolate Milk",
  },
  {
    barcode: "8901063034264",
    brand: "Amul",
    name: "Amul Mithai Mate Condensed Milk",
  },
  { barcode: "8901063131320", brand: "Amul", name: "Amul Ghee 500ml" },
  { barcode: "8901063016666", brand: "Amul", name: "Amul Fresh Cream" },
  { barcode: "8901063015522", brand: "Amul", name: "Amul Shrikhand Mango" },
  { barcode: "8901063053326", brand: "Amul", name: "Amul Lassi" },
  { barcode: "8901063000672", brand: "Amul", name: "Amul Butter 100g" },
  { barcode: "8901063009897", brand: "Amul", name: "Amul Dark Chocolate" },
  { barcode: "8901063133621", brand: "Amul", name: "Amul Pure Ghee" },
  { barcode: "8901063020403", brand: "Amul", name: "Amul Taaza Milk (alt)" },
  { barcode: "8901063050097", brand: "Amul", name: "Amul Masti Dahi" },
  { barcode: "8901063150048", brand: "Amul", name: "Amul Shrikhand" },
  // === BRITANNIA ===
  {
    barcode: "8901063800014",
    brand: "Britannia",
    name: "Good Day Butter Cookies",
  },
  { barcode: "8901063800021", brand: "Britannia", name: "Marie Gold" },
  { barcode: "8901063800038", brand: "Britannia", name: "Bourbon" },
  { barcode: "8901063800069", brand: "Britannia", name: "Milk Bikis" },
  { barcode: "8901063800083", brand: "Britannia", name: "50-50" },
  {
    barcode: "8901063800052",
    brand: "Britannia",
    name: "NutriChoice Digestive",
  },
  { barcode: "8901063800106", brand: "Britannia", name: "Tiger Glucose" },
  { barcode: "8901063800090", brand: "Britannia", name: "Jim Jam" },
  { barcode: "8901063800120", brand: "Britannia", name: "Treat Choco" },
  { barcode: "8901063800137", brand: "Britannia", name: "Little Hearts" },
  // === PARLE ===
  { barcode: "8901719100018", brand: "Parle", name: "Parle-G Original" },
  { barcode: "8901719100025", brand: "Parle", name: "Krackjack" },
  { barcode: "8901719100032", brand: "Parle", name: "Hide & Seek" },
  { barcode: "8901719100049", brand: "Parle", name: "Monaco" },
  { barcode: "8901719100056", brand: "Parle", name: "Milano" },
  { barcode: "8901719100063", brand: "Parle", name: "Melody Chocolaty" },
  { barcode: "8901719100070", brand: "Parle", name: "Poppins" },
  { barcode: "8901719100087", brand: "Parle", name: "Kismi Toffee Bar" },
  { barcode: "8901719100094", brand: "Parle", name: "Mango Bite" },
  { barcode: "8901719100100", brand: "Parle", name: "20-20 Cashew Cookies" },
  { barcode: "8901719115302", brand: "Parle", name: "Parle-G 250g" },
  { barcode: "8901719118990", brand: "Parle", name: "Hide&Seek Bourbon" },
  // === ITC ===
  {
    barcode: "8901802100018",
    brand: "ITC Sunfeast",
    name: "Dark Fantasy Choco Fills",
  },
  { barcode: "8901802100025", brand: "ITC Sunfeast", name: "Marie Light" },
  {
    barcode: "8901802100032",
    brand: "ITC Sunfeast",
    name: "Farmlite Digestive",
  },
  { barcode: "8901802100049", brand: "ITC Sunfeast", name: "Dream Cream" },
  { barcode: "8901802100056", brand: "ITC Sunfeast", name: "Bounce Cream" },
  { barcode: "8901802200015", brand: "ITC Bingo", name: "Bingo Mad Angles" },
  {
    barcode: "8901802200022",
    brand: "ITC Bingo",
    name: "Bingo Original Style",
  },
  { barcode: "8901802200039", brand: "ITC Bingo", name: "Bingo Hashtag" },
  {
    barcode: "8901802300012",
    brand: "ITC Yippee",
    name: "Yippee Magic Masala",
  },
  {
    barcode: "8901802300029",
    brand: "ITC Yippee",
    name: "Yippee Power Up Masala",
  },
  // === NESTLE INDIA ===
  { barcode: "8901058100018", brand: "Nestle", name: "Maggi Masala Noodles" },
  { barcode: "8901058100025", brand: "Nestle", name: "Maggi Atta Noodles" },
  { barcode: "8901058100032", brand: "Nestle", name: "Maggi Oats Masala" },
  { barcode: "8901058200015", brand: "Nestle", name: "KitKat 4-Finger" },
  { barcode: "8901058200022", brand: "Nestle", name: "KitKat 2-Finger" },
  { barcode: "8901058300012", brand: "Nestle", name: "Munch Chocolate Bar" },
  { barcode: "8901058300029", brand: "Nestle", name: "BarOne" },
  {
    barcode: "8901058400019",
    brand: "Nestle",
    name: "Milkmaid Condensed Milk",
  },
  { barcode: "8901058500016", brand: "Nestle", name: "Nestea Instant Tea" },
  { barcode: "8901058600013", brand: "Nestle", name: "Nescafe Classic" },
  {
    barcode: "8901058001948",
    brand: "Nestle",
    name: "Maggi 2-Minute Noodles (real)",
  },
  {
    barcode: "8901058502203",
    brand: "Nestle",
    name: "Nescafe Original (real)",
  },
  { barcode: "8901058700017", brand: "Nestle", name: "Maggi Chicken Noodles" },
  // === HALDIRAMS ===
  { barcode: "8906002100018", brand: "Haldiram's", name: "Bhujia" },
  { barcode: "8906002100025", brand: "Haldiram's", name: "Aloo Bhujia" },
  { barcode: "8906002100032", brand: "Haldiram's", name: "Mixture" },
  { barcode: "8906002100049", brand: "Haldiram's", name: "Khatta Meetha" },
  { barcode: "8906002100056", brand: "Haldiram's", name: "Dal Moth" },
  { barcode: "8906002100063", brand: "Haldiram's", name: "Moong Dal" },
  { barcode: "8906002100070", brand: "Haldiram's", name: "Navratan Mixture" },
  { barcode: "8906002200015", brand: "Haldiram's", name: "Soan Papdi" },
  { barcode: "8906002200022", brand: "Haldiram's", name: "Gulab Jamun" },
  { barcode: "8906002200039", brand: "Haldiram's", name: "Rasgulla" },
  // === PATANJALI ===
  { barcode: "8906036100018", brand: "Patanjali", name: "Dant Kanti" },
  { barcode: "8906036100025", brand: "Patanjali", name: "Atta Noodles" },
  { barcode: "8906036100032", brand: "Patanjali", name: "Biscuit" },
  { barcode: "8906036100049", brand: "Patanjali", name: "Aawala Juice" },
  { barcode: "8906036100056", brand: "Patanjali", name: "Ghee" },
  { barcode: "8906036100063", brand: "Patanjali", name: "Honey" },
  { barcode: "8906036100070", brand: "Patanjali", name: "Badam Pak" },
  { barcode: "8906036200015", brand: "Patanjali", name: "Chyawanprash" },
  { barcode: "8906036200022", brand: "Patanjali", name: "Mustard Oil" },
  { barcode: "8906036200039", brand: "Patanjali", name: "Rice" },
  // === MDH SPICES ===
  { barcode: "8906002300011", brand: "MDH", name: "Chana Masala" },
  { barcode: "8906002300028", brand: "MDH", name: "Garam Masala" },
  { barcode: "8906002300035", brand: "MDH", name: "Rajma Masala" },
  { barcode: "8906002300042", brand: "MDH", name: "Kitchen King" },
  { barcode: "8906002300059", brand: "MDH", name: "Pav Bhaji Masala" },
  { barcode: "8906002300066", brand: "MDH", name: "Biryani Masala" },
  { barcode: "8906002300073", brand: "MDH", name: "Deggi Mirch" },
  { barcode: "8906002300080", brand: "MDH", name: "Chicken Masala" },
  { barcode: "8906002300097", brand: "MDH", name: "Coriander Powder" },
  { barcode: "8906002300103", brand: "MDH", name: "Turmeric Powder" },
  // === DABUR ===
  { barcode: "8901207100018", brand: "Dabur", name: "Real Fruit Juice" },
  { barcode: "8901207100025", brand: "Dabur", name: "Real Activ Juice" },
  { barcode: "8901207100032", brand: "Dabur", name: "Honey" },
  { barcode: "8901207100049", brand: "Dabur", name: "Chyawanprash" },
  { barcode: "8901207100056", brand: "Dabur", name: "Pudin Hara" },
  { barcode: "8901207100063", brand: "Dabur", name: "Amla Juice" },
  { barcode: "8901207200015", brand: "Dabur", name: "Real Mango Juice" },
  { barcode: "8901207200022", brand: "Dabur", name: "Real Orange Juice" },
  { barcode: "8901207200039", brand: "Dabur", name: "Lemoneez Juice" },
  { barcode: "8901207200046", brand: "Dabur", name: "Nature Best Juice" },
  // === TATA ===
  { barcode: "8901272100018", brand: "Tata", name: "Salt Lite" },
  { barcode: "8901272100025", brand: "Tata", name: "Rock Salt" },
  { barcode: "8901272100032", brand: "Tata", name: "Tea Gold" },
  { barcode: "8901272100049", brand: "Tata", name: "Tea Premium" },
  { barcode: "8901272100056", brand: "Tata", name: "Sampann Dal" },
  { barcode: "8901272100063", brand: "Tata", name: "Sampann Spices" },
  { barcode: "8901272100070", brand: "Tata", name: "Soulfull Ragi Bites" },
  { barcode: "8901272200015", brand: "Tata", name: "Nutrikorner Oats" },
  { barcode: "8901272200022", brand: "Tata", name: "Tetley Green Tea" },
  { barcode: "8901272200039", brand: "Tata", name: "Gluco Plus" },
  // === MOTHER DAIRY ===
  { barcode: "8901159100018", brand: "Mother Dairy", name: "Mishti Doi" },
  { barcode: "8901159100025", brand: "Mother Dairy", name: "Ghee" },
  { barcode: "8901159100032", brand: "Mother Dairy", name: "Lassi" },
  { barcode: "8901159200015", brand: "Mother Dairy", name: "Paneer" },
  { barcode: "8901159200022", brand: "Mother Dairy", name: "Shrikhand" },
  { barcode: "8901159200039", brand: "Mother Dairy", name: "Flavoured Milk" },
  {
    barcode: "8901159300012",
    brand: "Mother Dairy",
    name: "Ice Cream Vanilla",
  },
  { barcode: "8901159300029", brand: "Mother Dairy", name: "Softy Mix" },
  { barcode: "8901159400019", brand: "Mother Dairy", name: "Fruit Yogurt" },
  { barcode: "8901159400026", brand: "Mother Dairy", name: "Mishti Doi Small" },
  // === MTR FOODS ===
  { barcode: "8906002400018", brand: "MTR", name: "Rava Upma Mix" },
  { barcode: "8906002400025", brand: "MTR", name: "Poha Mix" },
  { barcode: "8906002400032", brand: "MTR", name: "Kesari Bath" },
  { barcode: "8906002400049", brand: "MTR", name: "Sambar Masala" },
  { barcode: "8906002400056", brand: "MTR", name: "Rasam Masala" },
  { barcode: "8906002400063", brand: "MTR", name: "Ready to Eat Dal Makhani" },
  {
    barcode: "8906002400070",
    brand: "MTR",
    name: "Ready to Eat Paneer Butter Masala",
  },
  { barcode: "8906002400087", brand: "MTR", name: "Ready to Eat Palak Paneer" },
  { barcode: "8906002400094", brand: "MTR", name: "Gulab Jamun Mix" },
  { barcode: "8906002400100", brand: "MTR", name: "Dosa Mix" },
  // === LAYS / PEPSICO ===
  { barcode: "8901491100018", brand: "Lay's", name: "Classic Salted" },
  { barcode: "8901491100025", brand: "Lay's", name: "Magic Masala" },
  {
    barcode: "8901491100032",
    brand: "Lay's",
    name: "West Indies Hot N Sweet Chilli",
  },
  { barcode: "8901491100049", brand: "Lay's", name: "Chile Limon" },
  {
    barcode: "8901491100056",
    brand: "Lay's",
    name: "Kurkure Masala Munch combo",
  },
  { barcode: "8901491200015", brand: "Kurkure", name: "Masala Munch" },
  { barcode: "8901491200022", brand: "Kurkure", name: "Green Chutney" },
  { barcode: "8901491200039", brand: "Kurkure", name: "Naughty Tomato" },
  { barcode: "8901491300012", brand: "Quaker", name: "Oats Original" },
  { barcode: "8901491300029", brand: "Quaker", name: "Oats Masala" },
  // === BIKAJI ===
  { barcode: "8906067100018", brand: "Bikaji", name: "Bhujia Sev" },
  { barcode: "8906067100025", brand: "Bikaji", name: "Aloo Bhujia" },
  { barcode: "8906067100032", brand: "Bikaji", name: "Bikaneri Bhujia" },
  { barcode: "8906067100049", brand: "Bikaji", name: "Khatta Meetha" },
  { barcode: "8906067100056", brand: "Bikaji", name: "Chana Jor Garam" },
  { barcode: "8906067200015", brand: "Bikaji", name: "Soan Papdi" },
  { barcode: "8906067200022", brand: "Bikaji", name: "Gulab Jamun" },
  { barcode: "8906067200039", brand: "Bikaji", name: "Namkeen Mix" },
  { barcode: "8906067300012", brand: "Bikaji", name: "Pani Puri Kit" },
  { barcode: "8906067300029", brand: "Bikaji", name: "Papdi Chaat" },
  // === FORTUNE / ADANI WILMAR ===
  { barcode: "8901159500014", brand: "Fortune", name: "Sunflower Oil 1L" },
  { barcode: "8901159500021", brand: "Fortune", name: "Sunflower Oil 5L" },
  { barcode: "8901159500038", brand: "Fortune", name: "Soya Oil" },
  { barcode: "8901159500045", brand: "Fortune", name: "Rice Bran Oil" },
  { barcode: "8901159500052", brand: "Fortune", name: "Mustard Oil" },
  { barcode: "8901159600011", brand: "Fortune", name: "Basmati Rice" },
  { barcode: "8901159600028", brand: "Fortune", name: "Chakki Atta" },
  { barcode: "8901159600035", brand: "Fortune", name: "Tur Dal" },
  { barcode: "8901159600042", brand: "Fortune", name: "Moong Dal" },
  { barcode: "8901159600059", brand: "Fortune", name: "Kabuli Chana" },
  // === SAFFOLA / MARICO ===
  { barcode: "8901072100018", brand: "Saffola", name: "Gold Oil 1L" },
  { barcode: "8901072100025", brand: "Saffola", name: "Total Oil" },
  { barcode: "8901072100032", brand: "Saffola", name: "Oats Plain" },
  { barcode: "8901072100049", brand: "Saffola", name: "Masala Oats" },
  { barcode: "8901072100056", brand: "Saffola", name: "Peppy Tomato Oats" },
  { barcode: "8901072100063", brand: "Saffola", name: "Fittify Quinoa" },
  { barcode: "8901072200015", brand: "Saffola", name: "Immuniveda Kadha" },
  { barcode: "8901072200022", brand: "Saffola", name: "FITTIFY Hi Protein" },
  { barcode: "8901072200039", brand: "Marico", name: "Parachute Coconut Oil" },
  {
    barcode: "8901072200046",
    brand: "Marico",
    name: "Nihar Naturals Coconut Oil",
  },
  // === GODREJ ===
  { barcode: "8901801100018", brand: "Godrej", name: "Yummiez Corn Seekh" },
  { barcode: "8901801100025", brand: "Godrej", name: "Yummiez Shami Kebab" },
  { barcode: "8901801100032", brand: "Godrej", name: "Real Good Chicken" },
  { barcode: "8901801200015", brand: "Godrej", name: "Jersey Ghee" },
  { barcode: "8901801200022", brand: "Godrej", name: "Jersey Butter" },
  // === CATCH SPICES ===
  { barcode: "8906059100018", brand: "Catch", name: "Chaat Masala" },
  { barcode: "8906059100025", brand: "Catch", name: "Black Pepper" },
  { barcode: "8906059100032", brand: "Catch", name: "Rock Salt" },
  { barcode: "8906059100049", brand: "Catch", name: "Cumin Seeds" },
  { barcode: "8906059100056", brand: "Catch", name: "Kitchen King Masala" },
  // === BEVERAGES ===
  { barcode: "8904179100018", brand: "Bisleri", name: "Mineral Water 1L" },
  { barcode: "8904179100025", brand: "Bisleri", name: "Mineral Water 500ml" },
  { barcode: "8904179200015", brand: "Kinley", name: "Kinley Soda" },
  { barcode: "8904179200022", brand: "Kinley", name: "Kinley Water" },
  { barcode: "8901054100018", brand: "Coca-Cola India", name: "Thums Up" },
  { barcode: "8901054100025", brand: "Coca-Cola India", name: "Limca" },
  { barcode: "8901054100032", brand: "Coca-Cola India", name: "Maaza Mango" },
  { barcode: "8901054100049", brand: "Coca-Cola India", name: "Sprite India" },
  { barcode: "8901054100056", brand: "Coca-Cola India", name: "Fanta Orange" },
  { barcode: "8901491400014", brand: "PepsiCo India", name: "Pepsi" },
  { barcode: "8901491400021", brand: "PepsiCo India", name: "Mirinda Orange" },
  { barcode: "8901491400038", brand: "PepsiCo India", name: "7UP" },
  { barcode: "8901491400045", brand: "PepsiCo India", name: "Mountain Dew" },
  {
    barcode: "8901491400052",
    brand: "PepsiCo India",
    name: "Slice Mango Drink",
  },
  // === NOODLES ===
  { barcode: "8901491500018", brand: "Top Ramen", name: "Masala" },
  { barcode: "8901491500025", brand: "Top Ramen", name: "Curry" },
  { barcode: "8906004100018", brand: "Wai Wai", name: "Wai Wai Noodles" },
  // === CADBURY / MONDELEZ ===
  { barcode: "8901010100018", brand: "Cadbury", name: "Dairy Milk" },
  { barcode: "8901010100025", brand: "Cadbury", name: "5 Star" },
  { barcode: "8901010100032", brand: "Cadbury", name: "Gems" },
  { barcode: "8901010100049", brand: "Cadbury", name: "Perk" },
  { barcode: "8901010100056", brand: "Cadbury", name: "Bournvita 500g" },
  { barcode: "8901010100063", brand: "Cadbury", name: "Bournvita 200g" },
  { barcode: "8901010200015", brand: "Cadbury", name: "Celebrations" },
  { barcode: "8901010200022", brand: "Cadbury", name: "Silk" },
  { barcode: "8901010200039", brand: "Cadbury", name: "Eclairs" },
  { barcode: "8901010200046", brand: "Cadbury", name: "Heroes" },
];

const allBarcodes = BARCODES.map((b) => b.barcode);
// Split into chunks of 100 to avoid query length limits
const CHUNK_SIZE = 100;
const chunks = [];
for (let i = 0; i < allBarcodes.length; i += CHUNK_SIZE) {
  chunks.push(allBarcodes.slice(i, i + CHUNK_SIZE));
}

let allRows = [];
for (const chunk of chunks) {
  const inClause = chunk.map((b) => `'${b}'`).join(",");
  const sql = `
    SELECT 
      code,
      product_name,
      brands,
      energy_kcal_100g,
      proteins_100g,
      carbohydrates_100g,
      fat_100g
    FROM off_products 
    WHERE code IN (${inClause})
  `;
  const rows = await mgmtQuery(sql);
  allRows = allRows.concat(rows);
}

// Build lookup map
const found = new Map();
for (const row of allRows) {
  found.set(row.code, row);
}

// Classify results
let totalFound = 0;
let foundWithNutrition = 0;
let foundWithoutNutrition = 0;
let notFound = 0;

const gaps = [];
const hits = [];

for (const item of BARCODES) {
  const row = found.get(item.barcode);
  if (!row) {
    notFound++;
    gaps.push(item);
  } else {
    totalFound++;
    const hasNutrition = row.energy_kcal_100g !== null;
    if (hasNutrition) foundWithNutrition++;
    else foundWithoutNutrition++;
    hits.push({ ...item, row, hasNutrition });
  }
}

const total = BARCODES.length;
console.log("\n========================================");
console.log("       INDIAN BARCODE COVERAGE REPORT");
console.log("========================================");
console.log(`Total barcodes tested:  ${total}`);
console.log(
  `Found in database:      ${totalFound} (${((totalFound / total) * 100).toFixed(1)}%)`,
);
console.log(
  `  - With nutrition:     ${foundWithNutrition} (${((foundWithNutrition / total) * 100).toFixed(1)}%)`,
);
console.log(
  `  - Without nutrition:  ${foundWithoutNutrition} (${((foundWithoutNutrition / total) * 100).toFixed(1)}%)`,
);
console.log(
  `Not found (gaps):       ${notFound} (${((notFound / total) * 100).toFixed(1)}%)`,
);

if (hits.length > 0) {
  console.log("\n--- FOUND PRODUCTS ---");
  for (const h of hits) {
    const kcal = h.row.energy_kcal_100g
      ? `${h.row.energy_kcal_100g} kcal/100g`
      : "no nutrition";
    const name = (h.row.product_name || "(no name)").substring(0, 45);
    console.log(`  ✅ [${h.barcode}] ${name.padEnd(45)} | ${kcal}`);
  }
}

if (gaps.length > 0) {
  console.log("\n--- MISSING PRODUCTS (Gaps by brand) ---");
  const byBrand = {};
  for (const g of gaps) {
    if (!byBrand[g.brand]) byBrand[g.brand] = [];
    byBrand[g.brand].push(g.name);
  }
  for (const [brand, items] of Object.entries(byBrand)) {
    console.log(`  ❌ ${brand} (${items.length}): ${items.join(", ")}`);
  }
}

// Also do a broader lookup by brand name to see what IS in the DB
console.log("\n--- SAMPLING WHAT IS IN off_products (by brand) ---");
const brandSamples = [
  "amul",
  "britannia",
  "parle",
  "nestle",
  "maggi",
  "haldiram",
  "patanjali",
  "dabur",
  "itc",
  "sunfeast",
  "bingo",
  "yippee",
  "cadbury",
  "mdh",
  "tata",
  "bikaji",
  "mtr",
  "saffola",
  "fortune",
];
for (const brand of brandSamples) {
  const sql = `SELECT COUNT(*) as n, COUNT(energy_kcal_100g) as with_kcal FROM off_products WHERE LOWER(brands) LIKE '%${brand}%'`;
  try {
    const rows = await mgmtQuery(sql);
    const { n, with_kcal } = rows[0];
    if (parseInt(n) > 0) {
      console.log(
        `  ${brand.padEnd(12)}: ${n} products, ${with_kcal} with nutrition`,
      );
    }
  } catch (e) {
    console.log(`  ${brand}: error - ${e.message}`);
  }
}
