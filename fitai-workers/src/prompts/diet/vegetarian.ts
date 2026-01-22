/**
 * FitAI - Vegetarian Diet Prompt
 *
 * No meat or fish, but ALLOWS dairy and eggs.
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
 * Build vegetarian diet prompt
 *
 * Key differences from vegan:
 * - Dairy is ALLOWED (milk, cheese, yogurt, paneer, ghee)
 * - Eggs are ALLOWED
 * - Still NO meat or fish
 */
export function buildVegetarianPrompt(p: DietPlaceholders): string {
	return `
═══════════════════════════════════════════════════════════════════════════════
🥗 THIS IS A **VEGETARIAN** MEAL PLAN 🥗
═══════════════════════════════════════════════════════════════════════════════

VEGETARIAN = No meat, no fish, no seafood.
DAIRY and EGGS ARE ALLOWED.

════════════════════════════════════════════════════════════════════════════════
❌ FORBIDDEN FOODS - DO NOT INCLUDE:
════════════════════════════════════════════════════════════════════════════════

❌ ALL MEAT (land animals):
   chicken, beef, pork, lamb, mutton, goat, turkey, duck, bacon, ham,
   sausage, salami, hot dog, burger patty (meat), meatball, liver,
   any meat from any animal

❌ ALL FISH & SEAFOOD:
   fish (any type), salmon, tuna, cod, tilapia, sardine, mackerel,
   shrimp, prawn, crab, lobster, oyster, clam, mussel, squid, octopus,
   any creature from water

❌ HIDDEN MEAT INGREDIENTS:
   gelatin (from animal bones), lard, tallow, bone broth,
   fish sauce, oyster sauce, Worcestershire sauce (contains anchovies),
   animal rennet in cheese (use vegetarian cheese)

════════════════════════════════════════════════════════════════════════════════
✅ ALLOWED FOODS FOR VEGETARIAN DIET:
════════════════════════════════════════════════════════════════════════════════

✅ DAIRY PRODUCTS (excellent protein source):
   milk, cheese (all types), yogurt, curd, lassi,
   butter, ghee, cream, paneer, cottage cheese,
   whey protein, buttermilk, kheer

✅ EGGS (high-quality protein):
   eggs (any style), omelette, scrambled eggs, boiled eggs,
   egg whites, frittata, egg curry

✅ LEGUMES & PULSES:
   lentils (all types), chickpeas, beans (all types),
   split peas, mung beans, black-eyed peas

✅ SOY PRODUCTS:
   tofu, tempeh, edamame, soy milk, soy chunks

✅ WHOLE GRAINS:
   rice, wheat, oats, quinoa, barley, millet, buckwheat

✅ NUTS & SEEDS:
   all nuts and seeds are allowed

✅ ALL VEGETABLES:
   all vegetables are allowed

✅ ALL FRUITS:
   all fruits are allowed

════════════════════════════════════════════════════════════════════════════════
🌍 GENERATE FOR: ${p.CUISINE} CUISINE
📍 LOCATION: ${p.STATE}, ${p.COUNTRY}
════════════════════════════════════════════════════════════════════════════════

Create authentic ${p.CUISINE} VEGETARIAN dishes using:
- Traditional ${p.CUISINE} cooking styles and spices
- Locally available vegetarian ingredients in ${p.STATE}
- Regional flavors from ${p.COUNTRY}
- Dairy and eggs for protein where appropriate

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
📊 NUTRITION TARGETS:
════════════════════════════════════════════════════════════════════════════════
- Daily Calories: ${p.CALORIES} kcal (±50 kcal acceptable)
- Protein: ${p.PROTEIN}g (use dairy, eggs, legumes, paneer)
- Carbohydrates: ${p.CARBS}g
- Fats: ${p.FATS}g
- Fiber: ${p.FIBER}g minimum
- Water: ${p.WATER_LITERS}L daily

VEGETARIAN PROTEIN SOURCES:
- Eggs: ~6g protein per egg
- Paneer: ~18g protein per 100g
- Greek yogurt: ~10g protein per 100g
- Lentils: ~9g protein per 100g (cooked)
- Chickpeas: ~8g protein per 100g (cooked)

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
Generate a complete ${p.DAYS_COUNT === 1 ? 'daily' : `${p.DAYS_COUNT}-day`} meal plan with:
1. Each meal with name, description, and cooking method
2. All food items with exact portions (grams/cups)
3. Accurate nutrition data (calories, protein, carbs, fat) per item
4. Meal totals and daily totals
5. Preparation time and cooking instructions
6. Tips and substitution suggestions

═══════════════════════════════════════════════════════════════════════════════
⚠️ FINAL REMINDER: VEGETARIAN = NO MEAT, NO FISH
═══════════════════════════════════════════════════════════════════════════════

For every food item, verify:
- ✅ Dairy? → ALLOWED
- ✅ Eggs? → ALLOWED
- ❌ Meat (chicken, beef, pork, etc.)? → NOT ALLOWED
- ❌ Fish/Seafood? → NOT ALLOWED

═══════════════════════════════════════════════════════════════════════════════
`;
}
