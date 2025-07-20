// Test Script for Structured Output Implementation
// This script validates that the new structured output approach works correctly

import { geminiService, PROMPT_TEMPLATES } from './gemini';
import { 
  WORKOUT_SCHEMA, 
  NUTRITION_SCHEMA, 
  MOTIVATIONAL_CONTENT_SCHEMA,
  PROGRESS_ANALYSIS_SCHEMA,
  FOOD_ANALYSIS_SCHEMA 
} from './schemas';

// ============================================================================
// TEST DATA
// ============================================================================

const testUserProfile = {
  age: 28,
  gender: 'male',
  height: 175,
  weight: 70,
  activityLevel: 'moderate',
  experience: 'intermediate',
  primaryGoals: ['muscle gain', 'strength'],
  timeCommitment: 45,
  equipment: 'gym equipment'
};

const testNutritionProfile = {
  ...testUserProfile,
  calorieTarget: 2500,
  dietaryRestrictions: 'none',
  cuisinePreferences: 'any'
};

const testMotivationalProfile = {
  name: 'Alex',
  streak: 7,
  achievements: 'completed 5 workouts this week',
  goals: 'build muscle and increase strength',
  mood: 'motivated'
};

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test workout generation with structured output
 */
async function testWorkoutGeneration() {
  console.log('\n🏋️ Testing Workout Generation with Structured Output...');
  
  try {
    const response = await geminiService.generateResponse(
      PROMPT_TEMPLATES.WORKOUT_GENERATION,
      testUserProfile,
      WORKOUT_SCHEMA
    );

    if (response.success && response.data) {
      console.log('✅ Workout generation successful!');
      console.log('📊 Response structure:', {
        hasTitle: !!response.data.title,
        hasDescription: !!response.data.description,
        hasCategory: !!response.data.category,
        hasDifficulty: !!response.data.difficulty,
        hasDuration: !!response.data.duration,
        hasExercises: Array.isArray(response.data.exercises),
        exerciseCount: response.data.exercises?.length || 0,
        hasEquipment: Array.isArray(response.data.equipment),
        hasTargetMuscleGroups: Array.isArray(response.data.targetMuscleGroups)
      });
      console.log('🎯 Sample exercise:', response.data.exercises?.[0]);
      return true;
    } else {
      console.log('❌ Workout generation failed:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Workout generation error:', error);
    return false;
  }
}

/**
 * Test nutrition planning with structured output
 */
async function testNutritionPlanning() {
  console.log('\n🥗 Testing Nutrition Planning with Structured Output...');
  
  try {
    const response = await geminiService.generateResponse(
      PROMPT_TEMPLATES.NUTRITION_PLANNING,
      testNutritionProfile,
      NUTRITION_SCHEMA
    );

    if (response.success && response.data) {
      console.log('✅ Nutrition planning successful!');
      console.log('📊 Response structure:', {
        hasMeals: Array.isArray(response.data.meals),
        mealCount: response.data.meals?.length || 0,
        hasDailyTotals: !!response.data.dailyTotals,
        hasInsights: Array.isArray(response.data.nutritionalInsights),
        hasMealTimingTips: Array.isArray(response.data.mealTimingTips)
      });
      console.log('🍽️ Sample meal:', response.data.meals?.[0]);
      return true;
    } else {
      console.log('❌ Nutrition planning failed:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Nutrition planning error:', error);
    return false;
  }
}

/**
 * Test motivational content with structured output
 */
async function testMotivationalContent() {
  console.log('\n💪 Testing Motivational Content with Structured Output...');
  
  try {
    const response = await geminiService.generateResponse(
      PROMPT_TEMPLATES.MOTIVATIONAL_CONTENT,
      testMotivationalProfile,
      MOTIVATIONAL_CONTENT_SCHEMA
    );

    if (response.success && response.data) {
      console.log('✅ Motivational content successful!');
      console.log('📊 Response structure:', {
        hasDailyTip: !!response.data.dailyTip,
        hasEncouragement: !!response.data.encouragement,
        hasChallenge: !!response.data.challenge,
        hasQuote: !!response.data.quote,
        hasFactOfTheDay: !!response.data.factOfTheDay,
        hasPersonalizedMessage: !!response.data.personalizedMessage
      });
      console.log('🎯 Daily tip:', response.data.dailyTip);
      return true;
    } else {
      console.log('❌ Motivational content failed:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Motivational content error:', error);
    return false;
  }
}

/**
 * Test food analysis with structured output
 */
async function testFoodAnalysis() {
  console.log('\n🍎 Testing Food Analysis with Structured Output...');
  
  const foodPrompt = `Analyze this food item: "Grilled chicken breast, 150g serving"
  
  Provide detailed nutritional information including calories, macronutrients, serving details, and health benefits.`;
  
  try {
    const response = await geminiService.generateResponse(
      foodPrompt,
      {},
      FOOD_ANALYSIS_SCHEMA
    );

    if (response.success && response.data) {
      console.log('✅ Food analysis successful!');
      console.log('📊 Response structure:', {
        hasName: !!response.data.name,
        hasCategory: !!response.data.category,
        hasCalories: !!response.data.calories,
        hasMacros: !!response.data.macros,
        hasServingSize: !!response.data.servingSize,
        hasServingUnit: !!response.data.servingUnit,
        hasAllergens: Array.isArray(response.data.allergens),
        hasDietaryLabels: Array.isArray(response.data.dietaryLabels)
      });
      console.log('🥗 Food details:', {
        name: response.data.name,
        calories: response.data.calories,
        protein: response.data.macros?.protein
      });
      return true;
    } else {
      console.log('❌ Food analysis failed:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Food analysis error:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Structured Output Tests...');
  console.log('📋 Testing Google Gemini structured output implementation');
  
  if (!geminiService.isAvailable()) {
    console.log('❌ Gemini service is not available. Please check your API key.');
    return;
  }

  const results = {
    workout: await testWorkoutGeneration(),
    nutrition: await testNutritionPlanning(),
    motivation: await testMotivationalContent(),
    foodAnalysis: await testFoodAnalysis()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Workout Generation: ${results.workout ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Nutrition Planning: ${results.nutrition ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Motivational Content: ${results.motivation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Food Analysis: ${results.foodAnalysis ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! Structured output implementation is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
}

// Export for use in other files
export { runAllTests, testWorkoutGeneration, testNutritionPlanning, testMotivationalContent, testFoodAnalysis };
