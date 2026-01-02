/**
 * FitAI - Pescatarian Diet Prompt
 * 
 * No meat, but ALLOWS fish, seafood, dairy, and eggs.
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
  getPersonalizedSuggestions
} from './types';

/**
 * Build pescatarian diet prompt
 * 
 * Key differences:
 * - Fish and seafood ARE ALLOWED (main protein source)
 * - Dairy and eggs ARE ALLOWED
 * - NO meat from land animals
 */
export function buildPescatarianPrompt(p: DietPlaceholders): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
🐟 THIS IS A **PESCATARIAN** MEAL PLAN 🐟
═══════════════════════════════════════════════════════════════════════════════

PESCATARIAN = No meat from land animals.
FISH, SEAFOOD, DAIRY, and EGGS ARE ALL ALLOWED.

════════════════════════════════════════════════════════════════════════════════
❌ FORBIDDEN FOODS - DO NOT INCLUDE:
════════════════════════════════════════════════════════════════════════════════

❌ ALL MEAT FROM LAND ANIMALS:
   chicken, beef, pork, lamb, mutton, goat, turkey, duck, bacon, ham,
   sausage, salami, hot dog, burger patty (meat), meatball, liver,
   venison, rabbit, any meat from animals that live on land

════════════════════════════════════════════════════════════════════════════════
✅ ALLOWED FOODS FOR PESCATARIAN DIET:
════════════════════════════════════════════════════════════════════════════════

✅ ALL FISH (excellent protein + omega-3):
   salmon, tuna, cod, tilapia, sardine, mackerel, trout,
   sea bass, halibut, snapper, sole, haddock, catfish,
   any fish from fresh or salt water

✅ ALL SEAFOOD/SHELLFISH:
   shrimp, prawn, crab, lobster, oyster, clam, mussel,
   scallop, squid, octopus, calamari

✅ DAIRY PRODUCTS:
   milk, cheese, yogurt, butter, ghee, cream,
   paneer, cottage cheese, whey protein

✅ EGGS:
   eggs (any style), omelette, scrambled eggs, boiled eggs

✅ LEGUMES & PULSES:
   lentils, chickpeas, beans, split peas, mung beans

✅ SOY PRODUCTS:
   tofu, tempeh, edamame, soy milk

✅ WHOLE GRAINS:
   rice, wheat, oats, quinoa, barley, millet

✅ NUTS & SEEDS:
   all nuts and seeds are allowed

✅ ALL VEGETABLES & FRUITS:
   all vegetables and fruits are allowed

════════════════════════════════════════════════════════════════════════════════
🌍 GENERATE FOR: ${p.CUISINE} CUISINE
📍 LOCATION: ${p.STATE}, ${p.COUNTRY}
════════════════════════════════════════════════════════════════════════════════

Create authentic ${p.CUISINE} PESCATARIAN dishes using:
- Traditional ${p.CUISINE} seafood preparations
- Locally available fish and seafood in ${p.STATE}
- Regional flavors from ${p.COUNTRY}
- Fish as the primary animal protein source

${p.ALLERGIES.length > 0 ? `
════════════════════════════════════════════════════════════════════════════════
⚠️ ALLERGIES - MUST AVOID:
════════════════════════════════════════════════════════════════════════════════
${formatAllergies(p.ALLERGIES)}
` : ''}

${getMedicalInstructions(p.MEDICAL_CONDITIONS)}

════════════════════════════════════════════════════════════════════════════════
📊 NUTRITION TARGETS:
════════════════════════════════════════════════════════════════════════════════
- Daily Calories: ${p.CALORIES} kcal (±50 kcal acceptable)
- Protein: ${p.PROTEIN}g (prioritize fish, then eggs, dairy, legumes)
- Carbohydrates: ${p.CARBS}g
- Fats: ${p.FATS}g
- Fiber: ${p.FIBER}g minimum
- Water: ${p.WATER_LITERS}L daily

PESCATARIAN PROTEIN SOURCES:
- Salmon: ~25g protein per 100g (+ omega-3)
- Tuna: ~30g protein per 100g
- Shrimp: ~24g protein per 100g
- Eggs: ~6g protein per egg
- Greek yogurt: ~10g protein per 100g

OMEGA-3 TIP: Include fatty fish (salmon, mackerel, sardines) 2-3x per week.

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
Generate a complete daily meal plan with:
1. Each meal with name, description, and cooking method
2. All food items with exact portions (grams/cups)
3. Accurate nutrition data (calories, protein, carbs, fat) per item
4. Meal totals and daily totals
5. Preparation time and cooking instructions
6. Tips and substitution suggestions

═══════════════════════════════════════════════════════════════════════════════
⚠️ FINAL REMINDER: PESCATARIAN = NO LAND ANIMAL MEAT
═══════════════════════════════════════════════════════════════════════════════

For every food item, verify:
- ✅ Fish? → ALLOWED
- ✅ Seafood (shrimp, crab, etc.)? → ALLOWED
- ✅ Dairy? → ALLOWED
- ✅ Eggs? → ALLOWED
- ❌ Chicken? → NOT ALLOWED
- ❌ Beef/Pork/Lamb? → NOT ALLOWED
- ❌ Any land animal meat? → NOT ALLOWED

═══════════════════════════════════════════════════════════════════════════════
`;
}

