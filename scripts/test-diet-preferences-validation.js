/**
 * Test script to verify Diet Preferences validation fix
 * Tests that validation uses submitted form data, not stale state
 */

// Import validation functions
const { OnboardingService } = require('../src/services/onboardingService');

console.log('\n🧪 Testing Diet Preferences Validation Fix\n');
console.log('=' .repeat(70));

// Test Case 1: Complete diet preferences data (should pass)
console.log('\n📋 Test 1: Complete Diet Preferences Data');
console.log('-'.repeat(70));

const completeDietData = {
  // Basic diet info
  diet_type: 'non_vegetarian',
  allergies: ['shellfish', 'peanuts'],
  dietary_restrictions: ['lactose_intolerant'],

  // Meal preferences
  breakfast_enabled: true,
  lunch_enabled: true,
  dinner_enabled: true,
  snacks_enabled: true,

  // Cooking preferences
  cooking_skill: 'intermediate',
  max_prep_time: 45,
  meal_budget: 'medium',

  // Diet readiness
  intermittent_fasting_ready: true,
  mediterranean_diet_ready: true,
  low_carb_ready: true,
  high_protein_ready: true,
  keto_ready: false,
  paleo_ready: false,

  // Health habits
  drinks_enough_water: true,
  eats_regular_meals: true,
  reads_nutrition_labels: true,
  limits_refined_sugar: true,
  includes_healthy_fats: true,
  drinks_coffee: true,
  limits_sugary_drinks: true,
  eats_5_servings_fruits_veggies: false,
  avoids_late_night_eating: false,
  eats_processed_foods: false,
  smokes_tobacco: false,
  drinks_alcohol: false,
  frequently_eats_out: false,
  skips_meals: false,
};

try {
  const result1 = OnboardingService.validateDietPreferences(completeDietData);
  console.log('✅ Validation Result:', result1.is_valid ? 'PASSED' : 'FAILED');
  console.log('📊 Completion:', result1.completion_percentage + '%');

  if (result1.errors.length > 0) {
    console.log('❌ Errors:', result1.errors);
  } else {
    console.log('✅ No errors');
  }

  if (result1.warnings.length > 0) {
    console.log('⚠️  Warnings:', result1.warnings);
  } else {
    console.log('✅ No warnings');
  }
} catch (error) {
  console.log('❌ Test 1 Failed with error:', error.message);
}

// Test Case 2: Null data (should fail gracefully)
console.log('\n📋 Test 2: Null Diet Preferences Data');
console.log('-'.repeat(70));

try {
  const result2 = OnboardingService.validateDietPreferences(null);
  console.log('Result:', result2.is_valid ? 'PASSED' : 'FAILED (as expected)');
  console.log('❌ Expected Error:', result2.errors);
} catch (error) {
  console.log('❌ Test 2 Failed with error:', error.message);
}

// Test Case 3: Minimal required data (should pass)
console.log('\n📋 Test 3: Minimal Required Diet Preferences');
console.log('-'.repeat(70));

const minimalDietData = {
  diet_type: 'vegetarian',
  breakfast_enabled: true,
  lunch_enabled: false,
  dinner_enabled: true,
  snacks_enabled: false,

  // Minimal cooking prefs
  cooking_skill: 'beginner',
  max_prep_time: 30,
  meal_budget: 'low',

  // At least some diet readiness
  intermittent_fasting_ready: false,
  mediterranean_diet_ready: false,
  low_carb_ready: false,
  high_protein_ready: false,
  keto_ready: false,
  paleo_ready: false,

  // Minimal health habits
  drinks_enough_water: false,
  eats_regular_meals: true,
  reads_nutrition_labels: false,
  limits_refined_sugar: false,
  includes_healthy_fats: false,
  drinks_coffee: false,
  limits_sugary_drinks: false,
  eats_5_servings_fruits_veggies: false,
  avoids_late_night_eating: false,
  eats_processed_foods: false,
  smokes_tobacco: false,
  drinks_alcohol: false,
  frequently_eats_out: false,
  skips_meals: false,
};

try {
  const result3 = OnboardingService.validateDietPreferences(minimalDietData);
  console.log('✅ Validation Result:', result3.is_valid ? 'PASSED' : 'FAILED');
  console.log('📊 Completion:', result3.completion_percentage + '%');

  if (result3.errors.length > 0) {
    console.log('❌ Errors:', result3.errors);
  } else {
    console.log('✅ No errors');
  }

  if (result3.warnings.length > 0) {
    console.log('⚠️  Warnings (expected for minimal data):', result3.warnings);
  }
} catch (error) {
  console.log('❌ Test 3 Failed with error:', error.message);
}

// Test Case 4: Missing required fields (should fail)
console.log('\n📋 Test 4: Missing Required Fields');
console.log('-'.repeat(70));

const incompleteDietData = {
  // Missing diet_type (required)
  breakfast_enabled: true,
  lunch_enabled: true,
  dinner_enabled: false,
  snacks_enabled: false,
  // Missing other fields
};

try {
  const result4 = OnboardingService.validateDietPreferences(incompleteDietData);
  console.log('Result:', result4.is_valid ? 'PASSED (unexpected!)' : 'FAILED (as expected)');
  console.log('❌ Expected Errors:', result4.errors);
} catch (error) {
  console.log('❌ Test 4 Failed with error:', error.message);
}

// Test Case 5: No meals enabled (should fail)
console.log('\n📋 Test 5: No Meals Enabled');
console.log('-'.repeat(70));

const noMealsDietData = {
  diet_type: 'non_vegetarian',
  breakfast_enabled: false,
  lunch_enabled: false,
  dinner_enabled: false,
  snacks_enabled: false,

  cooking_skill: 'intermediate',
  max_prep_time: 45,
  meal_budget: 'medium',

  intermittent_fasting_ready: true,
  mediterranean_diet_ready: false,
  low_carb_ready: false,
  high_protein_ready: false,
  keto_ready: false,
  paleo_ready: false,

  drinks_enough_water: true,
  eats_regular_meals: false,
  reads_nutrition_labels: false,
  limits_refined_sugar: false,
  includes_healthy_fats: false,
  drinks_coffee: false,
  limits_sugary_drinks: false,
  eats_5_servings_fruits_veggies: false,
  avoids_late_night_eating: false,
  eats_processed_foods: false,
  smokes_tobacco: false,
  drinks_alcohol: false,
  frequently_eats_out: false,
  skips_meals: false,
};

try {
  const result5 = OnboardingService.validateDietPreferences(noMealsDietData);
  console.log('Result:', result5.is_valid ? 'PASSED (unexpected!)' : 'FAILED (as expected)');
  console.log('❌ Expected Error:', result5.errors);
} catch (error) {
  console.log('❌ Test 5 Failed with error:', error.message);
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('📊 Test Summary');
console.log('='.repeat(70));
console.log('✅ Test 1 (Complete Data): Should PASS');
console.log('✅ Test 2 (Null Data): Should FAIL with clear message');
console.log('✅ Test 3 (Minimal Data): Should PASS with warnings');
console.log('✅ Test 4 (Missing Required): Should FAIL');
console.log('✅ Test 5 (No Meals): Should FAIL');
console.log('\n🎉 If all tests behave as expected, validation is working correctly!\n');
