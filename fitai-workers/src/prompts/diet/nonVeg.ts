/**
 * FitAI - Non-Vegetarian / Omnivore Diet Prompt
 *
 * ALL foods allowed - meat, fish, dairy, eggs, plants.
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
 * Build non-vegetarian (omnivore) diet prompt
 *
 * Key features:
 * - All food groups allowed
 * - Emphasize lean protein sources
 * - Balanced nutrition
 */
export function buildNonVegPrompt(p: DietPlaceholders): string {
	return `
═══════════════════════════════════════════════════════════════════════════════
🍗 THIS IS A **NON-VEGETARIAN / OMNIVORE** MEAL PLAN 🍗
═══════════════════════════════════════════════════════════════════════════════

ALL FOOD GROUPS ARE ALLOWED.
Focus on lean proteins, whole grains, and plenty of vegetables.

════════════════════════════════════════════════════════════════════════════════
✅ ALL ALLOWED FOODS:
════════════════════════════════════════════════════════════════════════════════

✅ LEAN MEATS (prioritize these for protein):
   chicken breast, turkey breast, lean beef, lean pork,
   lamb (lean cuts), duck, game meats
   
✅ FISH & SEAFOOD (excellent protein + omega-3):
   salmon, tuna, cod, tilapia, sardine, mackerel,
   shrimp, prawn, crab, lobster, all seafood

✅ EGGS (versatile, high-quality protein):
   eggs (any style), egg whites

✅ DAIRY PRODUCTS:
   milk, cheese, yogurt, butter, ghee, cream,
   paneer, cottage cheese, whey protein

✅ LEGUMES & PULSES:
   lentils, chickpeas, beans, split peas

✅ WHOLE GRAINS:
   rice, wheat, oats, quinoa, barley, millet

✅ NUTS & SEEDS:
   all nuts and seeds

✅ ALL VEGETABLES & FRUITS:
   all vegetables and fruits

════════════════════════════════════════════════════════════════════════════════
💡 PROTEIN PRIORITIZATION (for optimal nutrition):
════════════════════════════════════════════════════════════════════════════════

TIER 1 - LEAN PROTEINS (best choices):
- Chicken breast (skinless): ~31g protein/100g, low fat
- Turkey breast: ~29g protein/100g, very lean
- Fish (white): ~20-25g protein/100g, low fat
- Egg whites: pure protein, zero fat

TIER 2 - MODERATE FAT PROTEINS:
- Salmon: ~25g protein/100g, healthy omega-3 fats
- Whole eggs: ~6g protein each, balanced macros
- Lean beef (90% lean): ~26g protein/100g
- Greek yogurt: ~10g protein/100g

TIER 3 - HIGHER FAT (use in moderation):
- Chicken thighs (with skin)
- Fatty cuts of beef/pork
- Full-fat cheese

════════════════════════════════════════════════════════════════════════════════
🌍 GENERATE FOR: ${p.CUISINE} CUISINE
📍 LOCATION: ${p.STATE}, ${p.COUNTRY}
${p.CUISINE_PREFERENCES ? `🍽️ USER'S PREFERRED CUISINES: ${p.CUISINE_PREFERENCES}` : ''}
════════════════════════════════════════════════════════════════════════════════

${p.CUISINE_PREFERENCES ? `The user has specifically requested these cuisine styles: ${p.CUISINE_PREFERENCES}.
Prioritize their preferred cuisines over the auto-detected regional cuisine (${p.CUISINE}).
Blend their preferences naturally — e.g. if they prefer Mediterranean but live in India, use Mediterranean-inspired dishes with locally available ingredients.

` : ''}Create authentic ${p.CUISINE} dishes using:
- Traditional ${p.CUISINE} meat and seafood preparations
- Locally available proteins in ${p.STATE}
- Regional spices and cooking styles from ${p.COUNTRY}
- Balance of animal and plant-based foods

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
- Protein: ${p.PROTEIN}g (lean meats, fish, eggs, dairy)
- Carbohydrates: ${p.CARBS}g
- Fats: ${p.FATS}g
- Fiber: ${p.FIBER}g minimum
- Water: ${p.WATER_LITERS}L daily

PROTEIN DISTRIBUTION:
- Breakfast: 25-30% of daily protein
- Lunch: 30-35% of daily protein
- Dinner: 30-35% of daily protein
- Snacks: 10-15% of daily protein

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

🍗 CHICKEN / TURKEY / LEAN MEAT:
   - Max 150g cooked per meal (NOT 200g or 250g)
   - 100–150g is a standard serving

🐟 FISH / SEAFOOD:
   - Max 150g per meal
   - 100–120g is standard

🥚 EGGS / EGG WHITES:
   - Whole eggs: max 3 per meal
   - Egg whites only: max 6 per meal (NOT 8, 10, or 12)

🧀 PANEER / COTTAGE CHEESE:
   - Max 150g per meal

🫙 GREEK YOGURT / CURD:
   - Max 200g per meal (NOT 300g or 400g)

🍚 RICE / ROTI:
   - Rice: max 1 cup cooked per meal
   - Roti: max 2 medium per meal

🌰 NUTS:
   - Max 20–30g per meal

💪 WHEY PROTEIN:
   - Max 1 scoop per meal

RULE: If you need more protein, ADD a second lean source — do NOT
increase a single ingredient beyond its limit.

════════════════════════════════════════════════════════════════════════════════
🫒 HEALTHY FATS — MANDATORY (target: ${p.FATS}g/day):
════════════════════════════════════════════════════════════════════════════════
Fat target is ${p.FATS}g/day. You MUST include healthy fat sources daily:
- Use 1 tsp ghee or olive oil in cooking (lunch or dinner) — adds ~5g fat
- Include nuts (almonds/walnuts 20g) OR avocado in at least 1 meal/day
- Use whole eggs (not just egg whites) in at least 1 meal to hit fat target
- Salmon/fatty fish counts — include 1–2 times per week
- DO NOT use only zero-fat foods — the user needs ${p.FATS}g fat per day

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

════════════════════════════════════════════════════════════════════════════════
💡 HEALTHY EATING TIPS:
════════════════════════════════════════════════════════════════════════════════
- Choose lean cuts of meat when possible
- Include fish 2-3 times per week for omega-3
- Balance animal protein with plenty of vegetables
- Use healthy cooking methods: grilling, baking, steaming, air frying
- Limit processed meats (bacon, sausage, hot dogs)

═══════════════════════════════════════════════════════════════════════════════
`;
}
