/**
 * FitAI - Vegan Diet Prompt
 * 
 * STRICTEST diet type - NO animal products whatsoever.
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
 * Build vegan diet prompt with 100% first-try accuracy
 * 
 * Structure:
 * 1. FORBIDDEN FOODS at TOP (most important)
 * 2. ALLOWED FOODS with examples
 * 3. User context and location
 * 4. Nutrition targets
 * 5. Final reminder
 */
export function buildVeganPrompt(p: DietPlaceholders): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
🚫🚫🚫 CRITICAL: THIS IS A **VEGAN** MEAL PLAN 🚫🚫🚫
═══════════════════════════════════════════════════════════════════════════════

YOU MUST GENERATE A 100% PLANT-BASED MEAL PLAN.
ZERO ANIMAL PRODUCTS ARE ALLOWED. NOT EVEN ONE.

════════════════════════════════════════════════════════════════════════════════
❌ ABSOLUTE FORBIDDEN FOODS - DO NOT INCLUDE ANY OF THESE:
════════════════════════════════════════════════════════════════════════════════

❌ ALL MEAT (land animals):
   chicken, beef, pork, lamb, mutton, goat, turkey, duck, bacon, ham, 
   sausage, salami, hot dog, burger patty, meatball, liver, kidney,
   any meat from any animal

❌ ALL FISH & SEAFOOD:
   fish (any type), salmon, tuna, cod, tilapia, sardine, mackerel,
   shrimp, prawn, crab, lobster, oyster, clam, mussel, squid, octopus,
   any creature from water

❌ ALL DAIRY PRODUCTS:
   milk (cow, goat, buffalo), cheese (all types), yogurt, curd, lassi,
   butter, ghee, cream, whey protein, casein, paneer, cottage cheese,
   ice cream (dairy), kheer, raita, buttermilk

❌ ALL EGGS:
   eggs (any bird), egg whites, egg yolks, omelette, scrambled eggs,
   boiled eggs, fried eggs, mayonnaise (egg-based), albumin,
   any product containing eggs

❌ HONEY & BEE PRODUCTS:
   honey, royal jelly, bee pollen, beeswax

❌ HIDDEN ANIMAL INGREDIENTS:
   gelatin, lard, tallow, bone broth, fish sauce, oyster sauce,
   Worcestershire sauce, some wines/beers, carmine (red dye),
   some refined sugars (bone char filtered)

════════════════════════════════════════════════════════════════════════════════
✅ ALLOWED VEGAN FOODS - USE THESE:
════════════════════════════════════════════════════════════════════════════════

✅ HIGH-PROTEIN LEGUMES (essential for protein):
   lentils (all types: red, green, black, brown), chickpeas, 
   black beans, kidney beans, pinto beans, navy beans, 
   split peas, mung beans, black-eyed peas

✅ SOY PRODUCTS (excellent protein source):
   tofu (firm, extra-firm, silken), tempeh, edamame,
   soy chunks/granules (TVP), soy milk, soy yogurt

✅ WHOLE GRAINS:
   quinoa (complete protein), oats, brown rice, wild rice,
   buckwheat, amaranth, millet, barley, farro, bulgur

✅ NUTS & SEEDS (protein + healthy fats):
   almonds, cashews, walnuts, peanuts, pistachios,
   chia seeds, flax seeds, hemp seeds, pumpkin seeds,
   sunflower seeds, sesame seeds

✅ PLANT MILKS (dairy alternatives):
   soy milk, almond milk, oat milk, coconut milk, rice milk,
   cashew milk, hemp milk

✅ PLANT YOGURTS (dairy alternatives):
   coconut yogurt, soy yogurt, almond yogurt, cashew yogurt,
   oat yogurt (all unsweetened preferred)

✅ NUT/SEED BUTTERS:
   peanut butter, almond butter, cashew butter, tahini,
   sunflower seed butter

✅ ALL VEGETABLES:
   leafy greens (spinach, kale, etc.), broccoli, cauliflower,
   all vegetables are allowed

✅ ALL FRUITS:
   all fruits are allowed

✅ PLANT-BASED PROTEIN POWDERS:
   pea protein, soy protein, rice protein, hemp protein

════════════════════════════════════════════════════════════════════════════════
🌍 GENERATE FOR: ${p.CUISINE} CUISINE
📍 LOCATION: ${p.STATE}, ${p.COUNTRY}
════════════════════════════════════════════════════════════════════════════════

Create authentic ${p.CUISINE} VEGAN dishes using:
- Traditional ${p.CUISINE} cooking styles and spices
- Locally available vegan ingredients in ${p.STATE}
- Regional flavors and preparation methods from ${p.COUNTRY}
- Plant-based alternatives to traditional dishes

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
- Protein: ${p.PROTEIN}g ⚠️ USE ONLY VEGAN PROTEIN SOURCES
  (legumes, tofu, tempeh, seitan, quinoa, nuts, seeds)
- Carbohydrates: ${p.CARBS}g
- Fats: ${p.FATS}g
- Fiber: ${p.FIBER}g minimum
- Water: ${p.WATER_LITERS}L daily

VEGAN PROTEIN TIP: Combine legumes with grains for complete protein.
Examples: rice + beans, hummus + pita, lentils + quinoa

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
⚠️⚠️⚠️ FINAL VERIFICATION - READ THIS BEFORE GENERATING ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════════════════════

FOR EVERY SINGLE FOOD ITEM, ASK YOURSELF:
"Does this food come from an animal or contain animal products?"

→ If YES: DO NOT INCLUDE IT. Find a plant-based alternative.
→ If NO: You may include it.

THIS IS A VEGAN MEAL PLAN. ZERO TOLERANCE FOR ANIMAL PRODUCTS.
═══════════════════════════════════════════════════════════════════════════════
`;
}

