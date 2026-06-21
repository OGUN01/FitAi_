/**
 * FitAI - Vegetarian Diet Prompt
 *
 * No meat or fish. Dairy ALWAYS allowed.
 * Eggs: ALLOWED globally, but FORBIDDEN for Indian users (lacto-vegetarian context).
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
 * - Dairy is ALWAYS ALLOWED (milk, cheese, yogurt, paneer, ghee)
 * - Eggs: ALLOWED globally, but FORBIDDEN for Indian users (lacto-vegetarian)
 * - Still NO meat or fish
 */
export function buildVegetarianPrompt(p: DietPlaceholders): string {
	const isIndian = p.COUNTRY.toLowerCase() === 'india' || p.COUNTRY_CODE?.toUpperCase() === 'IN';

	return `
═══════════════════════════════════════════════════════════════════════════════
🥗 THIS IS A **VEGETARIAN** MEAL PLAN 🥗
═══════════════════════════════════════════════════════════════════════════════

VEGETARIAN = No meat, no fish, no seafood.
DAIRY IS ALLOWED.
${isIndian ? 'EGGS ARE ❌ FORBIDDEN (Indian vegetarian = lacto-vegetarian, NO eggs).' : 'EGGS ARE ALLOWED.'}

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

${isIndian ? `❌ EGGS (Indian lacto-vegetarian — NO EGGS ALLOWED):
   eggs (any style), omelette, scrambled eggs, boiled eggs,
   egg whites, egg yolk, frittata, egg curry, albumin
   ⚠️ In India, "vegetarian" means NO EGGS. Do NOT use any egg product.
   For protein, use paneer, dal, legumes, yogurt, whey protein instead.

` : ''}════════════════════════════════════════════════════════════════════════════════
✅ ALLOWED FOODS FOR VEGETARIAN DIET:
════════════════════════════════════════════════════════════════════════════════

✅ DAIRY PRODUCTS (excellent protein source):
   milk, cheese (all types), yogurt, curd, lassi,
   butter, ghee, cream, paneer, cottage cheese,
   whey protein, buttermilk, kheer

${isIndian ? '' : `✅ EGGS (high-quality protein):
   eggs (any style), omelette, scrambled eggs, boiled eggs,
   egg whites, frittata, egg curry

`}

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
${p.CUISINE_PREFERENCES ? `🍽️ USER'S PREFERRED CUISINES: ${p.CUISINE_PREFERENCES}` : ''}
════════════════════════════════════════════════════════════════════════════════

${p.CUISINE_PREFERENCES ? `The user has specifically requested these cuisine styles: ${p.CUISINE_PREFERENCES}.
Prioritize their preferred cuisines over the auto-detected regional cuisine (${p.CUISINE}).
Blend their preferences naturally — e.g. if they prefer Mediterranean but live in India, use Mediterranean-inspired dishes with locally available ingredients.

` : ''}Create authentic ${p.CUISINE} VEGETARIAN dishes using:
- Traditional ${p.CUISINE} cooking styles and spices
- Locally available vegetarian ingredients in ${p.STATE}
- Regional flavors from ${p.COUNTRY}
- ${isIndian ? 'Dairy (paneer, yogurt, milk, ghee) and legumes for protein — NO eggs' : 'Dairy and eggs for protein where appropriate'}

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
- Protein: ${p.PROTEIN}g (use ${isIndian ? 'dairy, legumes, paneer, whey protein' : 'dairy, eggs, legumes, paneer'})
- Carbohydrates: ${p.CARBS}g
- Fats: ${p.FATS}g
- Fiber: ${p.FIBER}g minimum
- Water: ${p.WATER_LITERS}L daily

VEGETARIAN PROTEIN SOURCES:
${isIndian ? '' : '- Eggs: ~6g protein per egg\n'}
- Paneer: ~18g protein per 100g
- Greek yogurt / Curd: ~10g protein per 100g
- Whey protein: ~24g protein per scoop
- Lentils: ~9g protein per 100g (cooked)
- Chickpeas: ~8g protein per 100g (cooked)
- Soy chunks: ~52g protein per 100g (dry)

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
⚖️ REALISTIC PORTION LIMITS — STRICTLY ENFORCE PER MEAL:
════════════════════════════════════════════════════════════════════════════════
These are MAXIMUM quantities a real person can eat in ONE sitting.
DO NOT exceed these limits even to hit protein targets. Use MORE FOODS instead.

${isIndian ? '🥚 EGGS: ❌ FORBIDDEN — Do NOT use any egg in this Indian vegetarian plan.' : `🥚 EGGS / EGG WHITES:
   - Whole eggs: max 3 per meal
   - Egg whites only: max 6 per meal (NOT 8, 10, or 12)
   - 4–6 egg whites = realistic breakfast/snack portion`}

🧀 PANEER:
   - Max 150g per meal (NOT 200g or 250g)
   - 100g is a standard serving

🫙 GREEK YOGURT / CURD:
   - Max 200g per meal (NOT 300g or 400g)
   - 150–200g is a standard bowl

🫘 LENTILS / DAL (cooked):
   - Max 1 cup (200g) per meal

🫘 SOY CHUNKS / GRANULES (dry weight):
   - Max 60g dry per meal (expands 3x when cooked = 180g)
   - NOT 100g dry (that becomes 300g cooked — too much)

🍚 RICE / ROTI:
   - Rice: max 1 cup cooked (180g) per meal
   - Roti: max 2 medium rotis per meal

🌰 NUTS:
   - Max 20–30g (a small handful) per meal

💪 WHEY PROTEIN:
   - Max 1 scoop per meal (NOT 1.5 scoops)
   - Use 1 scoop = 25–30g powder = ~120 kcal

🥦 VEGETABLES (non-starchy):
   - 1–2 cups per meal is appropriate

RULE: If you need more protein, ADD a second protein source (e.g., whey + dal),
do NOT increase ${isIndian ? 'paneer beyond 150g or yogurt beyond 200g' : 'egg whites beyond 6 or paneer beyond 150g'}.

════════════════════════════════════════════════════════════════════════════════
🫒 HEALTHY FATS — MANDATORY (target: ${p.FATS}g/day):
════════════════════════════════════════════════════════════════════════════════
Fat target is ${p.FATS}g/day. You MUST include healthy fat sources daily:
- Use 1 tsp ghee or olive oil in cooking (at least lunch or dinner) — adds ~5g fat
- Include nuts (almonds/walnuts 20g) OR seeds (flaxseed 1 tbsp) in 1 meal/day
${isIndian ? '- Use paneer (not egg-based dishes) in at least 1 meal per week for fat' : '- Use whole eggs (not just egg whites) in at least 1 meal per week'}
- Full-fat paneer (not always low-fat) is acceptable in moderation
- DO NOT use only zero-fat foods — the user needs ${p.FATS}g fat daily

════════════════════════════════════════════════════════════════════════════════
📋 OUTPUT REQUIREMENTS:
════════════════════════════════════════════════════════════════════════════════
Generate a complete ${p.DAYS_COUNT === 1 ? 'daily' : `${p.DAYS_COUNT}-day`} meal plan with:
1. Each meal with name, description, and cooking method
2. All food items with exact portions (grams/cups) — within the limits above
3. Accurate nutrition data (calories, protein, carbs, fat, fiber) per item
4. Meal totals and daily totals
5. Preparation time and cooking instructions
6. Tips and substitution suggestions

═══════════════════════════════════════════════════════════════════════════════
⚠️ FINAL REMINDER: VEGETARIAN = NO MEAT, NO FISH${isIndian ? ', NO EGGS' : ''}
═══════════════════════════════════════════════════════════════════════════════

For every food item, verify:
- ✅ Dairy? → ALLOWED
- ${isIndian ? '❌ Eggs? → NOT ALLOWED (Indian lacto-vegetarian)' : '✅ Eggs? → ALLOWED'}
- ❌ Meat (chicken, beef, pork, etc.)? → NOT ALLOWED
- ❌ Fish/Seafood? → NOT ALLOWED

═══════════════════════════════════════════════════════════════════════════════
`;
}
