/**
 * FitAI - Ketogenic (Keto) Diet Prompt
 *
 * Very low carb, high fat, moderate protein.
 * Goal: Put body into ketosis for fat burning.
 * Global template with dynamic placeholders.
 */

import {
	DietPlaceholders,
	formatAllergies,
	getMedicalInstructions,
	formatCookingMethods,
	getCookingSkillInstructions,
	getPrepTimeInstructions,
	getBudgetInstructions,
	getPersonalizedSuggestions,
} from './types';

/**
 * Build keto diet prompt
 *
 * Key requirements:
 * - Carbs: <50g per day (ideally <20g net carbs)
 * - Fat: 70-80% of calories
 * - Protein: Moderate (20-25% of calories)
 */
export function buildKetoPrompt(p: DietPlaceholders): string {
	// Calculate keto-specific macros
	const ketoCarbLimit = Math.min(p.CARBS, 50); // Cap at 50g
	const ketoFatPercent = 70;
	const ketoProteinPercent = 25;

	return `
═══════════════════════════════════════════════════════════════════════════════
🚫🚫🚫 CRITICAL: THIS IS A **KETOGENIC (KETO)** MEAL PLAN 🚫🚫🚫
═══════════════════════════════════════════════════════════════════════════════

⚠️⚠️⚠️ KETO = EXTREMELY LOW CARB ⚠️⚠️⚠️
You MUST keep total daily carbs under ${ketoCarbLimit}g.
This means NO high-carb foods AT ALL.

════════════════════════════════════════════════════════════════════════════════
🚫🚫🚫 ABSOLUTE FORBIDDEN FOODS - NEVER INCLUDE THESE 🚫🚫🚫
════════════════════════════════════════════════════════════════════════════════

🚫 RICE - DO NOT INCLUDE ANY TYPE:
   NO white rice, NO brown rice, NO basmati rice, NO jasmine rice,
   NO rice bowls, NO fried rice, NO rice dishes of any kind
   RICE IS 100% FORBIDDEN ON KETO

🚫 POTATO - DO NOT INCLUDE:
   NO potato, NO sweet potato, NO yam, NO french fries, NO mashed potato,
   NO baked potato, NO potato chips, NO hash browns
   POTATO IS 100% FORBIDDEN ON KETO

🚫 BREAD & GRAINS - DO NOT INCLUDE:
   NO bread, NO wheat, NO pasta, NO noodles, NO roti, NO naan,
   NO cereal, NO oats, NO corn, NO tortillas, NO crackers
   ALL GRAINS ARE 100% FORBIDDEN ON KETO

🚫 BEANS & LEGUMES - DO NOT INCLUDE:
   NO beans, NO lentils, NO chickpeas, NO black beans, NO kidney beans,
   NO dal (lentils), NO chana, NO rajma
   LEGUMES ARE 100% FORBIDDEN ON KETO

🚫 SUGAR & SWEETS - DO NOT INCLUDE:
   NO sugar, NO honey, NO maple syrup, NO candy, NO desserts

🚫 HIGH-CARB FRUITS - DO NOT INCLUDE:
   NO banana, NO mango, NO grapes, NO pineapple, NO apple, NO orange

════════════════════════════════════════════════════════════════════════════════
✅ KETO-FRIENDLY FOODS:
════════════════════════════════════════════════════════════════════════════════

✅ HEALTHY FATS (primary calorie source):
   avocado, olive oil, coconut oil, MCT oil, butter, ghee,
   heavy cream, cream cheese, full-fat cheese,
   nuts (macadamia, pecans, walnuts), nut butters

✅ PROTEINS (moderate portions):
   fatty fish (salmon, mackerel, sardines),
   chicken (with skin), beef, pork, lamb,
   eggs (whole), bacon, sausage (no sugar added)

✅ LOW-CARB VEGETABLES (eat freely):
   leafy greens (spinach, kale, lettuce, arugula),
   broccoli, cauliflower, zucchini, cucumber,
   asparagus, celery, mushrooms, bell peppers,
   cabbage, Brussels sprouts, green beans

✅ LOW-CARB FRUITS (in moderation):
   berries (strawberries, blueberries, raspberries),
   avocado (technically a fruit), olives, coconut

✅ KETO DAIRY:
   heavy cream, butter, ghee, full-fat cheese,
   cream cheese, sour cream, full-fat Greek yogurt (plain)

✅ KETO SNACKS:
   cheese, nuts (macadamia, pecans), pork rinds,
   hard-boiled eggs, avocado, olives, dark chocolate (85%+)

════════════════════════════════════════════════════════════════════════════════
🌍 GENERATE FOR: ${p.CUISINE} CUISINE
📍 LOCATION: ${p.STATE}, ${p.COUNTRY}
${p.CUISINE_PREFERENCES ? `🍽️ USER'S PREFERRED CUISINES: ${p.CUISINE_PREFERENCES}` : ''}
═════════════════════════���══════════════════════════════════════════════════════

${p.CUISINE_PREFERENCES ? `The user has specifically requested these cuisine styles: ${p.CUISINE_PREFERENCES}.
Prioritize their preferred cuisines over the auto-detected regional cuisine (${p.CUISINE}).
Blend their preferences naturally — e.g. if they prefer Mediterranean but live in India, use Mediterranean-inspired dishes with locally available ingredients.

` : ''}Create authentic ${p.CUISINE} KETO dishes using:
- Traditional ${p.CUISINE} flavors adapted for keto
- Keto-friendly ingredients available in ${p.STATE}
- Low-carb alternatives to traditional high-carb dishes
- Regional spices (most are zero-carb!)

KETO ADAPTATIONS:
- Replace rice with cauliflower rice
- Replace wheat roti/naan with cheese or almond flour wraps
- Replace potatoes with cauliflower or radish
- Use heavy cream instead of milk
- Add extra fat through ghee, butter, coconut oil

${
	p.ALLERGIES.length > 0
		? `
════════════════════════════════════════════════════════════════════════════════
⚠️ ALLERGIES - MUST AVOID:
════════════════════════════════════════════════════════════════════════════════
${formatAllergies(p.ALLERGIES)}
`
		: ''
}

${getMedicalInstructions(p.MEDICAL_CONDITIONS)}

════════════════════════════════════════════════════════════════════════════════
📊 KETO NUTRITION TARGETS:
════════════════════════════════════════════════════════════════════════════════
- Daily Calories: ${p.CALORIES} kcal
- Carbohydrates: MAXIMUM ${ketoCarbLimit}g (STRICT - count net carbs!)
- Fat: ~${Math.round((p.CALORIES * 0.7) / 9)}g (${ketoFatPercent}% of calories)
- Protein: ~${p.PROTEIN}g (moderate, not excessive)
- Fiber: ${p.FIBER}g minimum (from low-carb vegetables)
- Water: ${p.WATER_LITERS}L daily (keto increases water needs)

⚠️ CARB COUNTING IS CRITICAL:
- Track NET carbs = Total carbs - Fiber
- Stay under ${ketoCarbLimit}g net carbs to maintain ketosis
- Most calories should come from fat, NOT protein

════════════════════════════════════════════════════════════════════════════════
👤 USER CONTEXT:
════════════════════════════════════════════════════════════════════════════════
- Age: ${p.AGE} years
- Gender: ${p.GENDER}
- Fitness Goal: ${p.FITNESS_GOAL}
- BMI: ${p.BMI} (${p.BMI_CATEGORY})
- Occupation: ${p.OCCUPATION}
- Preferred Cooking: ${formatCookingMethods(p.COOKING_METHODS)}
- Meals to Generate: ${p.MEALS_ENABLED.join(', ')}
${p.MEAL_EXCLUSION_INSTRUCTIONS}
════════════════════════════════════════════════════════════════════════════════
🍳 COOKING REQUIREMENTS (based on user's onboarding data):
════════════════════════════════════════════════════════════════════════════════
${getCookingSkillInstructions(p.COOKING_SKILL)}

${getPrepTimeInstructions(p.MAX_PREP_TIME)}

${getBudgetInstructions(p.BUDGET_LEVEL)}
${getPersonalizedSuggestions(p)}

════════════════════════════════════════════════════════════════════════════════
📋 OUTPUT REQUIREMENTS:
════════════════════════════════════════════════════════════════════════════════
Generate a complete ${p.DAYS_COUNT === 1 ? 'daily' : `${p.DAYS_COUNT}-day`} keto meal plan with:
1. Each meal with name, description, and cooking method
2. All food items with exact portions (grams/cups)
3. Accurate nutrition data including NET CARBS per item
4. Meal totals showing total carbs and net carbs
5. Daily totals MUST be under ${ketoCarbLimit}g net carbs
6. High fat content in each meal

═══════════════════════════════════════════════════════════════════════════════
⚠️ FINAL KETO VERIFICATION:
═══════════════════════════════════════════════════════════════════════════════

Before including ANY food, check:
1. Is it high in carbs? → If >5g net carbs per serving, LIMIT or EXCLUDE
2. Is it a grain or starch? → DO NOT INCLUDE
3. Is it a sweet fruit? → DO NOT INCLUDE
4. Is it a legume? → DO NOT INCLUDE (except small amounts of edamame)

DAILY TOTAL MUST BE:
✅ Under ${ketoCarbLimit}g net carbs
✅ High in healthy fats
✅ Moderate in protein

═══════════════════════════════════════════════════════════════════════════════
`;
}
