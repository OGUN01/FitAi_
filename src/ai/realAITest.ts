// Real AI Test - Verify Gemini API is working with the provided key

import { geminiService } from './gemini';
import { aiService } from './index';
import { PersonalInfo, FitnessGoals } from '../types/user';

// Test user data
const testUser: PersonalInfo = {
  name: 'Alex',
  age: '28',
  gender: 'male',
  height: '175',
  weight: '70',
  activityLevel: 'moderate'
};

const testGoals: FitnessGoals = {
  primaryGoals: ['muscle_gain', 'strength'],
  timeCommitment: '45-60',
  experience: 'intermediate'
};

/**
 * Test real Gemini API connection
 */
export async function testRealAIConnection() {
  console.log('🔗 Testing Gemini 2.5 Flash Connection...');

  try {
    const result = await geminiService.testConnection();

    if (result.success) {
      console.log('✅ GEMINI 2.5 FLASH CONNECTION SUCCESSFUL!');
      console.log(`Response: ${result.data}`);
      console.log(`Model: ${result.modelVersion || 'gemini-2.5-flash'}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
      console.log(`Tokens Used: ${result.tokensUsed || 'N/A'}`);
      console.log(`Confidence: ${result.confidence || 'N/A'}%`);
      return true;
    } else {
      console.log('❌ Gemini 2.5 Flash Connection Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini 2.5 Flash Connection Error:', error);
    return false;
  }
}

/**
 * Test real AI workout generation
 */
export async function testRealWorkoutGeneration() {
  console.log('🏋️ Testing Gemini 2.5 Flash Workout Generation...');

  try {
    const result = await aiService.generateWorkout(testUser, testGoals, {
      workoutType: 'strength',
      duration: 45,
      equipment: ['dumbbells', 'bodyweight']
    });

    if (result.success && result.data) {
      console.log('✅ GEMINI 2.5 FLASH WORKOUT GENERATED!');
      console.log(`Title: ${result.data.title}`);
      console.log(`Description: ${result.data.description}`);
      console.log(`Duration: ${result.data.duration} minutes`);
      console.log(`Estimated Calories: ${result.data.estimatedCalories}`);
      console.log(`Difficulty: ${result.data.difficulty}`);
      console.log(`Exercises: ${result.data.exercises.length}`);
      console.log(`Equipment: ${result.data.equipment.join(', ')}`);
      console.log(`Target Muscles: ${result.data.targetMuscleGroups.join(', ')}`);
      console.log(`AI Generated: ${result.data.aiGenerated}`);
      console.log(`Model: ${result.modelVersion || 'gemini-2.5-flash'}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
      console.log(`Confidence: ${result.confidence}%`);
      console.log(`Tokens Used: ${result.tokensUsed || 'N/A'}`);

      // Show enhanced exercise details
      if (result.data.exercises.length > 0) {
        const firstEx = result.data.exercises[0];
        console.log(`\nEnhanced Exercise Details:`);
        console.log(`- Exercise ID: ${firstEx.exerciseId}`);
        console.log(`- Sets: ${firstEx.sets}`);
        console.log(`- Reps: ${firstEx.reps}`);
        console.log(`- Rest: ${firstEx.restTime}s`);
        console.log(`- Intensity: ${firstEx.intensity || 'N/A'}`);
        console.log(`- Tempo: ${firstEx.tempo || 'N/A'}`);
        console.log(`- RPE: ${firstEx.rpe || 'N/A'}`);
        console.log(`- Notes: ${firstEx.notes || 'N/A'}`);
      }

      // Show enhanced workout features
      if (result.data.progressionTips) {
        console.log(`\nProgression Tips: ${result.data.progressionTips.join(', ')}`);
      }
      if (result.data.safetyConsiderations) {
        console.log(`Safety Notes: ${result.data.safetyConsiderations.join(', ')}`);
      }

      return true;
    } else {
      console.log('❌ Gemini 2.5 Flash Workout Generation Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini 2.5 Flash Workout Generation Error:', error);
    return false;
  }
}

/**
 * Test real AI meal generation
 */
export async function testRealMealGeneration() {
  console.log('🍽️ Testing Real AI Meal Generation...');
  
  try {
    const result = await aiService.generateMeal(testUser, testGoals, 'breakfast', {
      calorieTarget: 500,
      dietaryRestrictions: [],
      cuisinePreference: 'healthy'
    });

    if (result.success && result.data) {
      console.log('✅ REAL AI MEAL GENERATED!');
      console.log(`Name: ${result.data.name}`);
      console.log(`Type: ${result.data.type}`);
      console.log(`Total Calories: ${result.data.totalCalories}`);
      console.log(`Protein: ${Math.round(result.data.totalMacros.protein)}g`);
      console.log(`Carbs: ${Math.round(result.data.totalMacros.carbohydrates)}g`);
      console.log(`Fat: ${Math.round(result.data.totalMacros.fat)}g`);
      console.log(`Fiber: ${Math.round(result.data.totalMacros.fiber)}g`);
      console.log(`Items: ${result.data.items.length}`);
      console.log(`Prep Time: ${result.data.prepTime} minutes`);
      console.log(`Difficulty: ${result.data.difficulty}`);
      console.log(`AI Generated: ${result.data.aiGenerated}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
      console.log(`Confidence: ${result.confidence}%`);
      
      // Show food items
      console.log(`\nFood Items:`);
      result.data.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.food.name} - ${item.quantity}${item.food.servingUnit} (${item.calories} cal)`);
      });
      
      return true;
    } else {
      console.log('❌ Real AI Meal Generation Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Real AI Meal Generation Error:', error);
    return false;
  }
}

/**
 * Test real AI motivational content
 */
export async function testRealMotivationalContent() {
  console.log('💪 Testing Real AI Motivational Content...');
  
  try {
    const result = await aiService.generateMotivationalContent(testUser, 7);

    if (result.success && result.data) {
      console.log('✅ REAL AI MOTIVATIONAL CONTENT GENERATED!');
      console.log(`Daily Tip: ${result.data.dailyTip}`);
      console.log(`Encouragement: ${result.data.encouragement}`);
      console.log(`Quote: ${result.data.quote}`);
      console.log(`Fact of the Day: ${result.data.factOfTheDay}`);
      
      if (result.data.challenge) {
        console.log(`\nChallenge: ${result.data.challenge.title}`);
        console.log(`Description: ${result.data.challenge.description}`);
        console.log(`Reward: ${result.data.challenge.reward}`);
        console.log(`Duration: ${result.data.challenge.duration} days`);
      }
      
      console.log(`Generation Time: ${result.generationTime}ms`);
      console.log(`Confidence: ${result.confidence}%`);
      
      return true;
    } else {
      console.log('❌ Real AI Motivational Content Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Real AI Motivational Content Error:', error);
    return false;
  }
}

/**
 * Run comprehensive real AI tests
 */
export async function runRealAITests() {
  console.log('🚀 STARTING REAL AI TESTS WITH GEMINI API...\n');
  
  // Check AI status
  const status = aiService.getAIStatus();
  console.log('📊 AI Status:');
  console.log(`Mode: ${status.mode}`);
  console.log(`Available: ${status.isAvailable}`);
  console.log(`Message: ${status.message}\n`);
  
  if (!status.isAvailable) {
    console.log('❌ Real AI not available. Check your API key configuration.');
    return;
  }
  
  let successCount = 0;
  const totalTests = 4;
  
  // Test 1: Connection
  if (await testRealAIConnection()) successCount++;
  console.log('');
  
  // Test 2: Workout Generation
  if (await testRealWorkoutGeneration()) successCount++;
  console.log('');
  
  // Test 3: Meal Generation
  if (await testRealMealGeneration()) successCount++;
  console.log('');
  
  // Test 4: Motivational Content
  if (await testRealMotivationalContent()) successCount++;
  console.log('');
  
  // Summary
  console.log('📊 REAL AI TEST RESULTS:');
  console.log(`✅ Successful: ${successCount}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((successCount / totalTests) * 100)}%`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ALL REAL AI TESTS PASSED! FitAI is now powered by real AI! 🤖✨');
  } else {
    console.log('\n⚠️ Some tests failed. Check your API key and internet connection.');
  }
}

// Export for use in other files
export default {
  testRealAIConnection,
  testRealWorkoutGeneration,
  testRealMealGeneration,
  testRealMotivationalContent,
  runRealAITests
};

// Uncomment to run tests immediately
// runRealAITests();
