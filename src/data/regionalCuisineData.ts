/**
 * Regional Cuisine Classification Data — Multi-Country Support
 *
 * Provides cuisine data for multiple countries/regions. Each country entry includes:
 *   - cuisineNames: Regional cuisine labels
 *   - commonIngredients: Staple ingredients for that cuisine
 *   - typicalMeals: Representative dishes with nutrition estimates and vegetarian tagging
 *
 * The original Indian regional data (north/south/east/west/northeast) is preserved
 * below as REGIONAL_CUISINE_DATA for backward compatibility.
 *
 * For the detailed India-specific food database (728 items with full nutrition),
 * see src/data/indianFoodDatabase.ts — that file is India-only.
 */

// ============================================================================
// MULTI-COUNTRY CUISINE TYPES
// ============================================================================

/** A single food/meal item with vegetarian tagging and basic nutrition */
export interface CuisineFoodItem {
  name: string;
  /** Whether this item is vegetarian (no meat/fish) */
  isVegetarian: boolean;
  category: "main" | "side" | "snack" | "beverage" | "dessert";
  /** Approximate calories per typical serving */
  caloriesPerServing: number;
  /** Approximate protein in grams per typical serving */
  proteinPerServing: number;
  /** Approximate carbs in grams per typical serving */
  carbsPerServing: number;
  /** Approximate fat in grams per typical serving */
  fatPerServing: number;
}

/** Cuisine data for a single country/region */
export interface CountryCuisineData {
  /** Display name for this country/region */
  displayName: string;
  /** Regional cuisine style names */
  cuisineNames: string[];
  /** Commonly used ingredients across this cuisine */
  commonIngredients: string[];
  /** Representative meals with nutrition and vegetarian tagging */
  typicalMeals: CuisineFoodItem[];
  /** Brief description of the cuisine style */
  flavorProfile: string;
}

// ============================================================================
// MULTI-COUNTRY CUISINE DATABASE
// ============================================================================

export const COUNTRY_CUISINE_DATA: Record<string, CountryCuisineData> = {
  // ── INDIA ─────────────────────────────────────────────────────────────────
  india: {
    displayName: "India",
    cuisineNames: [
      "North Indian",
      "South Indian",
      "East Indian",
      "West Indian",
      "Mughlai",
      "Chettinad",
    ],
    commonIngredients: [
      "rice",
      "wheat",
      "lentils",
      "ghee",
      "turmeric",
      "cumin",
      "coriander",
      "garam masala",
      "mustard seeds",
      "curry leaves",
      "coconut",
      "chili",
      "ginger",
      "garlic",
      "yogurt",
      "paneer",
      "chickpeas",
    ],
    typicalMeals: [
      {
        name: "Butter Chicken",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 490,
        proteinPerServing: 30,
        carbsPerServing: 14,
        fatPerServing: 34,
      },
      {
        name: "Dal Makhani",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 350,
        proteinPerServing: 15,
        carbsPerServing: 42,
        fatPerServing: 12,
      },
      {
        name: "Paneer Tikka",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 320,
        proteinPerServing: 18,
        carbsPerServing: 10,
        fatPerServing: 22,
      },
      {
        name: "Biryani (Chicken)",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 450,
        proteinPerServing: 22,
        carbsPerServing: 55,
        fatPerServing: 14,
      },
      {
        name: "Chole Bhature",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 520,
        proteinPerServing: 14,
        carbsPerServing: 62,
        fatPerServing: 24,
      },
      {
        name: "Masala Dosa",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 370,
        proteinPerServing: 8,
        carbsPerServing: 50,
        fatPerServing: 15,
      },
      {
        name: "Idli Sambar",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 250,
        proteinPerServing: 10,
        carbsPerServing: 44,
        fatPerServing: 3,
      },
      {
        name: "Tandoori Chicken",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 260,
        proteinPerServing: 32,
        carbsPerServing: 6,
        fatPerServing: 12,
      },
      {
        name: "Rajma Chawal",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 400,
        proteinPerServing: 16,
        carbsPerServing: 65,
        fatPerServing: 8,
      },
      {
        name: "Lassi",
        isVegetarian: true,
        category: "beverage",
        caloriesPerServing: 180,
        proteinPerServing: 6,
        carbsPerServing: 28,
        fatPerServing: 5,
      },
    ],
    flavorProfile:
      "Aromatic, spice-forward, rich gravies, diverse regional styles from creamy North to tangy South",
  },

  // ── USA ───────────────────────────────────────────────────────────────────
  usa: {
    displayName: "United States",
    cuisineNames: [
      "American",
      "Southern",
      "Tex-Mex",
      "New England",
      "Californian",
      "BBQ",
    ],
    commonIngredients: [
      "beef",
      "chicken",
      "corn",
      "potatoes",
      "cheese",
      "lettuce",
      "tomatoes",
      "bread",
      "eggs",
      "butter",
      "cream",
      "bacon",
      "beans",
      "avocado",
      "olive oil",
      "garlic",
      "onions",
    ],
    typicalMeals: [
      {
        name: "Grilled Chicken Breast",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 280,
        proteinPerServing: 42,
        carbsPerServing: 0,
        fatPerServing: 12,
      },
      {
        name: "Classic Cheeseburger",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 550,
        proteinPerServing: 30,
        carbsPerServing: 40,
        fatPerServing: 30,
      },
      {
        name: "Mac & Cheese",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 420,
        proteinPerServing: 16,
        carbsPerServing: 48,
        fatPerServing: 18,
      },
      {
        name: "Caesar Salad",
        isVegetarian: true,
        category: "side",
        caloriesPerServing: 220,
        proteinPerServing: 8,
        carbsPerServing: 12,
        fatPerServing: 16,
      },
      {
        name: "Smoothie Bowl (Mixed Berry)",
        isVegetarian: true,
        category: "snack",
        caloriesPerServing: 310,
        proteinPerServing: 10,
        carbsPerServing: 52,
        fatPerServing: 8,
      },
      {
        name: "BBQ Pulled Pork",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 480,
        proteinPerServing: 34,
        carbsPerServing: 28,
        fatPerServing: 24,
      },
      {
        name: "Turkey Club Sandwich",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 440,
        proteinPerServing: 28,
        carbsPerServing: 36,
        fatPerServing: 20,
      },
      {
        name: "Veggie Burrito Bowl",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 380,
        proteinPerServing: 14,
        carbsPerServing: 56,
        fatPerServing: 12,
      },
      {
        name: "Grilled Salmon Fillet",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 350,
        proteinPerServing: 38,
        carbsPerServing: 0,
        fatPerServing: 20,
      },
      {
        name: "Protein Pancakes",
        isVegetarian: true,
        category: "snack",
        caloriesPerServing: 290,
        proteinPerServing: 22,
        carbsPerServing: 34,
        fatPerServing: 8,
      },
    ],
    flavorProfile:
      "Hearty, smoky, comfort-food oriented, diverse regional BBQ and Tex-Mex influences",
  },

  // ── UK ────────────────────────────────────────────────────────────────────
  uk: {
    displayName: "United Kingdom",
    cuisineNames: ["British", "English", "Scottish", "Welsh", "Irish-British"],
    commonIngredients: [
      "potatoes",
      "beef",
      "lamb",
      "peas",
      "carrots",
      "onions",
      "butter",
      "flour",
      "milk",
      "cheese",
      "eggs",
      "parsley",
      "mustard",
      "gravy",
      "oats",
      "leeks",
      "turnips",
    ],
    typicalMeals: [
      {
        name: "Fish and Chips",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 580,
        proteinPerServing: 28,
        carbsPerServing: 56,
        fatPerServing: 26,
      },
      {
        name: "Shepherd's Pie",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 420,
        proteinPerServing: 24,
        carbsPerServing: 38,
        fatPerServing: 18,
      },
      {
        name: "Bangers and Mash",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 510,
        proteinPerServing: 20,
        carbsPerServing: 42,
        fatPerServing: 28,
      },
      {
        name: "Full English Breakfast",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 680,
        proteinPerServing: 32,
        carbsPerServing: 44,
        fatPerServing: 40,
      },
      {
        name: "Scones with Clotted Cream",
        isVegetarian: true,
        category: "snack",
        caloriesPerServing: 340,
        proteinPerServing: 5,
        carbsPerServing: 42,
        fatPerServing: 17,
      },
      {
        name: "Jacket Potato with Beans",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 380,
        proteinPerServing: 14,
        carbsPerServing: 64,
        fatPerServing: 6,
      },
      {
        name: "Vegetable Pasty",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 360,
        proteinPerServing: 8,
        carbsPerServing: 40,
        fatPerServing: 18,
      },
      {
        name: "Roast Chicken Dinner",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 520,
        proteinPerServing: 38,
        carbsPerServing: 34,
        fatPerServing: 24,
      },
    ],
    flavorProfile:
      "Hearty, savory, gravy-rich, roast-centric with strong pub food tradition",
  },

  // ── MEDITERRANEAN ─────────────────────────────────────────────────────────
  mediterranean: {
    displayName: "Mediterranean",
    cuisineNames: [
      "Greek",
      "Lebanese",
      "Turkish",
      "Moroccan",
      "Italian-Mediterranean",
    ],
    commonIngredients: [
      "olive oil",
      "tomatoes",
      "cucumber",
      "chickpeas",
      "lemon",
      "garlic",
      "tahini",
      "feta cheese",
      "oregano",
      "mint",
      "parsley",
      "bulgur",
      "eggplant",
      "yogurt",
      "pita bread",
      "olives",
      "pine nuts",
    ],
    typicalMeals: [
      {
        name: "Hummus with Pita",
        isVegetarian: true,
        category: "snack",
        caloriesPerServing: 280,
        proteinPerServing: 10,
        carbsPerServing: 36,
        fatPerServing: 12,
      },
      {
        name: "Falafel Wrap",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 420,
        proteinPerServing: 14,
        carbsPerServing: 50,
        fatPerServing: 18,
      },
      {
        name: "Greek Salad",
        isVegetarian: true,
        category: "side",
        caloriesPerServing: 180,
        proteinPerServing: 6,
        carbsPerServing: 10,
        fatPerServing: 14,
      },
      {
        name: "Grilled Fish (Sea Bass)",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 300,
        proteinPerServing: 36,
        carbsPerServing: 2,
        fatPerServing: 16,
      },
      {
        name: "Tabbouleh",
        isVegetarian: true,
        category: "side",
        caloriesPerServing: 160,
        proteinPerServing: 4,
        carbsPerServing: 22,
        fatPerServing: 8,
      },
      {
        name: "Shakshuka",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 280,
        proteinPerServing: 14,
        carbsPerServing: 18,
        fatPerServing: 16,
      },
      {
        name: "Grilled Chicken Souvlaki",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 350,
        proteinPerServing: 34,
        carbsPerServing: 20,
        fatPerServing: 14,
      },
      {
        name: "Stuffed Grape Leaves (Dolma)",
        isVegetarian: true,
        category: "side",
        caloriesPerServing: 200,
        proteinPerServing: 4,
        carbsPerServing: 28,
        fatPerServing: 8,
      },
      {
        name: "Lentil Soup",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 220,
        proteinPerServing: 12,
        carbsPerServing: 34,
        fatPerServing: 4,
      },
    ],
    flavorProfile:
      "Fresh, herbaceous, olive-oil-forward, citrus-bright, healthy and balanced",
  },

  // ── EAST ASIAN ────────────────────────────────────────────────────────────
  east_asian: {
    displayName: "East Asian",
    cuisineNames: ["Japanese", "Chinese", "Korean", "Thai", "Vietnamese"],
    commonIngredients: [
      "rice",
      "soy sauce",
      "tofu",
      "noodles",
      "ginger",
      "garlic",
      "sesame oil",
      "scallions",
      "miso",
      "seaweed",
      "fish sauce",
      "chili paste",
      "bok choy",
      "mushrooms",
      "rice vinegar",
      "lemongrass",
      "coconut milk",
    ],
    typicalMeals: [
      {
        name: "Sushi Roll (Salmon)",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 320,
        proteinPerServing: 18,
        carbsPerServing: 42,
        fatPerServing: 8,
      },
      {
        name: "Ramen (Tonkotsu)",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 520,
        proteinPerServing: 24,
        carbsPerServing: 58,
        fatPerServing: 20,
      },
      {
        name: "Vegetable Stir-Fry with Tofu",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 280,
        proteinPerServing: 16,
        carbsPerServing: 28,
        fatPerServing: 12,
      },
      {
        name: "Dim Sum (Steamed Veggie Dumplings)",
        isVegetarian: true,
        category: "snack",
        caloriesPerServing: 240,
        proteinPerServing: 8,
        carbsPerServing: 34,
        fatPerServing: 8,
      },
      {
        name: "Bibimbap",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 480,
        proteinPerServing: 22,
        carbsPerServing: 62,
        fatPerServing: 14,
      },
      {
        name: "Miso Soup",
        isVegetarian: true,
        category: "side",
        caloriesPerServing: 60,
        proteinPerServing: 4,
        carbsPerServing: 6,
        fatPerServing: 2,
      },
      {
        name: "Pad Thai",
        isVegetarian: false,
        category: "main",
        caloriesPerServing: 460,
        proteinPerServing: 20,
        carbsPerServing: 54,
        fatPerServing: 18,
      },
      {
        name: "Edamame",
        isVegetarian: true,
        category: "snack",
        caloriesPerServing: 120,
        proteinPerServing: 12,
        carbsPerServing: 8,
        fatPerServing: 5,
      },
      {
        name: "Vegetable Fried Rice",
        isVegetarian: true,
        category: "main",
        caloriesPerServing: 340,
        proteinPerServing: 8,
        carbsPerServing: 52,
        fatPerServing: 12,
      },
    ],
    flavorProfile:
      "Umami-rich, balanced sweet-salty-sour, wok-seared, fermented flavors, clean and fresh",
  },
};

// ============================================================================
// GLOBAL / DEFAULT FALLBACK DATA
// ============================================================================

/** Universal fallback cuisine data for countries without a specific entry */
const GLOBAL_FALLBACK_CUISINE: CountryCuisineData = {
  displayName: "Global",
  cuisineNames: ["International", "Global Fusion"],
  commonIngredients: [
    "rice",
    "chicken",
    "eggs",
    "potatoes",
    "tomatoes",
    "onions",
    "garlic",
    "olive oil",
    "bread",
    "cheese",
    "lentils",
    "beans",
    "yogurt",
    "butter",
    "salt",
    "pepper",
  ],
  typicalMeals: [
    {
      name: "Grilled Chicken with Rice",
      isVegetarian: false,
      category: "main",
      caloriesPerServing: 400,
      proteinPerServing: 36,
      carbsPerServing: 42,
      fatPerServing: 10,
    },
    {
      name: "Vegetable Soup",
      isVegetarian: true,
      category: "main",
      caloriesPerServing: 180,
      proteinPerServing: 6,
      carbsPerServing: 28,
      fatPerServing: 4,
    },
    {
      name: "Pasta with Tomato Sauce",
      isVegetarian: true,
      category: "main",
      caloriesPerServing: 380,
      proteinPerServing: 12,
      carbsPerServing: 62,
      fatPerServing: 8,
    },
    {
      name: "Scrambled Eggs on Toast",
      isVegetarian: true,
      category: "main",
      caloriesPerServing: 310,
      proteinPerServing: 18,
      carbsPerServing: 26,
      fatPerServing: 16,
    },
    {
      name: "Mixed Green Salad",
      isVegetarian: true,
      category: "side",
      caloriesPerServing: 120,
      proteinPerServing: 4,
      carbsPerServing: 10,
      fatPerServing: 8,
    },
    {
      name: "Grilled Fish with Vegetables",
      isVegetarian: false,
      category: "main",
      caloriesPerServing: 320,
      proteinPerServing: 34,
      carbsPerServing: 12,
      fatPerServing: 14,
    },
    {
      name: "Fruit Smoothie",
      isVegetarian: true,
      category: "beverage",
      caloriesPerServing: 200,
      proteinPerServing: 6,
      carbsPerServing: 40,
      fatPerServing: 2,
    },
    {
      name: "Oatmeal with Banana",
      isVegetarian: true,
      category: "snack",
      caloriesPerServing: 260,
      proteinPerServing: 8,
      carbsPerServing: 48,
      fatPerServing: 5,
    },
  ],
  flavorProfile:
    "Balanced, accessible, comfort-oriented, universally familiar flavors",
};

// ============================================================================
// COUNTRY ALIAS MAP — maps common names/codes → canonical key
// ============================================================================

const COUNTRY_ALIAS_MAP: Record<string, string> = {
  // India
  india: "india",
  in: "india",
  ind: "india",
  bharat: "india",

  // USA
  usa: "usa",
  us: "usa",
  "united states": "usa",
  "united states of america": "usa",
  america: "usa",

  // UK
  uk: "uk",
  gb: "uk",
  "united kingdom": "uk",
  "great britain": "uk",
  england: "uk",
  britain: "uk",

  // Mediterranean (region, not a single country — matched loosely)
  mediterranean: "mediterranean",
  greece: "mediterranean",
  lebanon: "mediterranean",
  turkey: "mediterranean",
  morocco: "mediterranean",
  israel: "mediterranean",
  "middle east": "mediterranean",

  // East Asian
  east_asian: "east_asian",
  "east asian": "east_asian",
  japan: "east_asian",
  china: "east_asian",
  korea: "east_asian",
  "south korea": "east_asian",
  thailand: "east_asian",
  vietnam: "east_asian",
  "east asia": "east_asian",
};

// ============================================================================
// LOOKUP FUNCTION
// ============================================================================

/**
 * Get cuisine data for a given country or region.
 *
 * - Case-insensitive matching
 * - Handles common aliases (e.g. "US", "USA", "United States" all → usa)
 * - Falls back to a global/default entry for unrecognized countries
 *
 * @param country - Country name, code, or region (e.g. "India", "US", "Japan")
 * @returns Matched CountryCuisineData or the global fallback
 */
export function getCuisineDataForCountry(country: string): CountryCuisineData {
  const normalized = country.trim().toLowerCase();

  // 1. Direct key match
  if (COUNTRY_CUISINE_DATA[normalized]) {
    return COUNTRY_CUISINE_DATA[normalized];
  }

  // 2. Alias match
  const aliasKey = COUNTRY_ALIAS_MAP[normalized];
  if (aliasKey && COUNTRY_CUISINE_DATA[aliasKey]) {
    return COUNTRY_CUISINE_DATA[aliasKey];
  }

  // 3. Fallback
  return GLOBAL_FALLBACK_CUISINE;
}

/**
 * Get all available country keys in the cuisine database.
 */
export function getAvailableCuisineCountries(): string[] {
  return Object.keys(COUNTRY_CUISINE_DATA);
}

/**
 * Get only vegetarian meals for a country.
 */
export function getVegetarianMeals(country: string): CuisineFoodItem[] {
  const data = getCuisineDataForCountry(country);
  return data.typicalMeals.filter((meal) => meal.isVegetarian);
}

// ============================================================================
// ORIGINAL INDIAN REGIONAL DATA (preserved exactly as-is for backward compat)
// ============================================================================

/**
 * Indian regional cuisine classification — sub-regions within India.
 * This is the ORIGINAL data from before multi-country expansion.
 * Consumers that need India-specific regional breakdowns should use this.
 */
export const REGIONAL_CUISINE_DATA = {
  north: {
    states: [
      "punjab",
      "haryana",
      "delhi",
      "uttar pradesh",
      "rajasthan",
      "himachal pradesh",
    ],
    characteristics: {
      primaryFats: ["ghee", "butter", "cream"],
      commonSpices: [
        "garam masala",
        "cardamom",
        "cinnamon",
        "cumin",
        "coriander",
      ],
      cookingMethods: ["tandoori", "dum", "tawa", "curry"],
      grains: ["wheat", "basmati rice"],
      proteins: ["paneer", "chicken", "mutton", "dal"],
      specialIngredients: ["saffron", "cashews", "almonds", "cream"],
      calorieModifier: 1.15, // Generally higher calories due to ghee/cream
      fatModifier: 1.25,
    },
    signature_dishes: [
      "butter chicken",
      "dal makhani",
      "biryani",
      "naan",
      "tandoori chicken",
      "rajma",
      "chole",
      "paratha",
      "kulcha",
      "sarson ka saag",
    ],
    flavor_profile: "rich, creamy, aromatic, mild to medium spice",
  },

  south: {
    states: [
      "tamil nadu",
      "kerala",
      "karnataka",
      "andhra pradesh",
      "telangana",
    ],
    characteristics: {
      primaryFats: ["coconut oil", "sesame oil", "ghee"],
      commonSpices: [
        "curry leaves",
        "mustard seeds",
        "fenugreek",
        "tamarind",
        "coriander",
      ],
      cookingMethods: ["steaming", "tempering", "fermenting", "coconut-based"],
      grains: ["rice", "ragi", "semolina"],
      proteins: ["fish", "prawns", "lentils", "coconut"],
      specialIngredients: ["coconut", "tamarind", "curry leaves", "kokum"],
      calorieModifier: 1.05, // Moderate calories, coconut-based
      fatModifier: 1.1,
    },
    signature_dishes: [
      "dosa",
      "idli",
      "sambar",
      "rasam",
      "fish curry",
      "vada",
      "uttapam",
      "coconut chutney",
      "avial",
      "pongal",
      "chettinad chicken",
    ],
    flavor_profile: "tangy, coconutty, fermented, hot to medium spice",
  },

  east: {
    states: ["west bengal", "odisha", "jharkhand", "bihar", "assam"],
    characteristics: {
      primaryFats: ["mustard oil", "ghee"],
      commonSpices: [
        "panch phoron",
        "mustard seeds",
        "nigella seeds",
        "turmeric",
      ],
      cookingMethods: ["steaming", "light curry", "fish preparation"],
      grains: ["rice", "wheat"],
      proteins: ["fish", "prawns", "mutton", "paneer"],
      specialIngredients: [
        "mustard oil",
        "poppy seeds",
        "hilsa fish",
        "jaggery",
      ],
      calorieModifier: 1.0, // Baseline calories
      fatModifier: 1.0,
    },
    signature_dishes: [
      "fish curry",
      "prawn malai curry",
      "mishti doi",
      "rosogolla",
      "kathi roll",
      "aloo posto",
      "shukto",
      "chingri machher jhol",
    ],
    flavor_profile: "subtle, sweet, fish-forward, mild spice",
  },

  west: {
    states: ["gujarat", "maharashtra", "rajasthan", "goa"],
    characteristics: {
      primaryFats: ["groundnut oil", "coconut oil", "ghee"],
      commonSpices: ["jaggery", "tamarind", "mustard seeds", "sesame seeds"],
      cookingMethods: ["steaming", "dry roasting", "fermenting"],
      grains: ["bajra", "jowar", "rice", "wheat"],
      proteins: ["legumes", "fish", "chicken", "paneer"],
      specialIngredients: ["jaggery", "kokum", "peanuts", "sesame"],
      calorieModifier: 1.08, // Moderate to high due to fried items
      fatModifier: 1.15,
    },
    signature_dishes: [
      "dhokla",
      "thepla",
      "pav bhaji",
      "vada pav",
      "undhiyu",
      "fish curry",
      "puran poli",
      "misal pav",
      "bhel puri",
    ],
    flavor_profile: "sweet-savory, tangy, street food style, medium spice",
  },

  northeast: {
    states: [
      "assam",
      "manipur",
      "nagaland",
      "mizoram",
      "arunachal pradesh",
      "tripura",
      "meghalaya",
      "sikkim",
    ],
    characteristics: {
      primaryFats: ["mustard oil", "sesame oil"],
      commonSpices: ["ginger", "garlic", "green chili", "turmeric"],
      cookingMethods: ["steaming", "boiling", "fermenting", "smoking"],
      grains: ["rice", "millet"],
      proteins: ["fish", "pork", "chicken", "bamboo shoots"],
      specialIngredients: ["bamboo shoots", "fermented fish", "bhut jolokia"],
      calorieModifier: 0.95, // Generally lighter preparations
      fatModifier: 0.9,
    },
    signature_dishes: [
      "fish tenga",
      "bamboo shoot curry",
      "thukpa",
      "momos",
      "pitha",
      "khar",
      "masor tenga",
    ],
    flavor_profile: "simple, fermented, extremely spicy, unique ingredients",
  },
};

// Regional spice level defaults
export const REGIONAL_SPICE_LEVELS = {
  north: "medium",
  south: "hot",
  east: "mild",
  west: "medium",
  northeast: "extra_hot",
} as const;

// Regional cooking method preferences
export const REGIONAL_COOKING_METHODS = {
  north: ["tandoori", "dum", "curry", "fried"],
  south: ["steamed", "tempering", "curry", "fermented"],
  east: ["curry", "steamed", "fried", "boiled"],
  west: ["steamed", "fried", "dry roasted", "curry"],
  northeast: ["steamed", "boiled", "smoked", "fermented"],
} as const;

// Helper functions
export const getRegionalCharacteristics = (
  region: keyof typeof REGIONAL_CUISINE_DATA,
) => {
  return (
    REGIONAL_CUISINE_DATA[region]?.characteristics ||
    REGIONAL_CUISINE_DATA.north.characteristics
  );
};

export const isRegionalDish = (
  dishName: string,
  region: keyof typeof REGIONAL_CUISINE_DATA,
): boolean => {
  const regionData = REGIONAL_CUISINE_DATA[region];
  if (!regionData) return false;

  const lowerDishName = dishName.toLowerCase();
  return regionData.signature_dishes.some(
    (dish) =>
      lowerDishName.includes(dish.toLowerCase()) ||
      dish.toLowerCase().includes(lowerDishName),
  );
};

export const detectRegionFromDish = (
  dishName: string,
): keyof typeof REGIONAL_CUISINE_DATA | null => {
  const lowerDishName = dishName.toLowerCase();

  for (const [region, data] of Object.entries(REGIONAL_CUISINE_DATA)) {
    if (
      data.signature_dishes.some(
        (dish) =>
          lowerDishName.includes(dish.toLowerCase()) ||
          dish.toLowerCase().includes(lowerDishName),
      )
    ) {
      return region as keyof typeof REGIONAL_CUISINE_DATA;
    }
  }

  return null;
};

export const getCalorieModifier = (
  region: keyof typeof REGIONAL_CUISINE_DATA,
): number => {
  return REGIONAL_CUISINE_DATA[region]?.characteristics.calorieModifier || 1.0;
};

export const getFatModifier = (
  region: keyof typeof REGIONAL_CUISINE_DATA,
): number => {
  return REGIONAL_CUISINE_DATA[region]?.characteristics.fatModifier || 1.0;
};

export default REGIONAL_CUISINE_DATA;
