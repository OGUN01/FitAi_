// AI Integration Test File
// Run this to test AI functionality

import { aiService } from './index';
import { PersonalInfo, FitnessGoals } from '../types/user';

// Mock user data for testing
const testPersonalInfo: PersonalInfo = {
  name: 'Test User',
  age: '25',
  gender: 'male',
  height: '175',
  weight: '70',
  activityLevel: 'moderate'
};

const testFitnessGoals: FitnessGoals = {
  primaryGoals: ['strength', 'muscle_gain'],
  timeCommitment: '30-45',
  experience: 'intermediate'
};

/**
 * Test AI workout generation
 */
export async function testWorkoutGeneration() {
  console.log('🏋️ Testing Workout Generation...');
  
  try {
    const result = await aiService.generateWorkout(testPersonalInfo, testFitnessGoals, {
      workoutType: 'strength',
      duration: 40,
      equipment: ['bodyweight']
    });

    if (result.success && result.data) {
      console.log('✅ Workout Generated Successfully!');
      console.log(`Title: ${result.data.title}`);
      console.log(`Duration: ${result.data.duration} minutes`);
      console.log(`Calories: ${result.data.estimatedCalories}`);
      console.log(`Exercises: ${result.data.exercises.length}`);
      console.log(`AI Generated: ${result.data.aiGenerated}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
    } else {
      console.log('❌ Workout Generation Failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Workout Generation Error:', error);
  }
}

/**
 * Test AI meal generation
 */
export async function testMealGeneration() {
  console.log('🍽️ Testing Meal Generation...');
  
  try {
    const result = await aiService.generateMeal(testPersonalInfo, testFitnessGoals, 'breakfast');

    if (result.success && result.data) {
      console.log('✅ Meal Generated Successfully!');
      console.log(`Name: ${result.data.name}`);
      console.log(`Type: ${result.data.type}`);
      console.log(`Calories: ${result.data.totalCalories}`);
      console.log(`Protein: ${Math.round(result.data.totalMacros.protein)}g`);
      console.log(`Items: ${result.data.items.length}`);
      console.log(`AI Generated: ${result.data.aiGenerated}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
    } else {
      console.log('❌ Meal Generation Failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Meal Generation Error:', error);
  }
}

/**
 * Test AI motivational content
 */
export async function testMotivationalContent() {
  console.log('💪 Testing Motivational Content...');
  
  try {
    const result = await aiService.generateMotivationalContent(testPersonalInfo, 5);

    if (result.success && result.data) {
      console.log('✅ Motivational Content Generated Successfully!');
      console.log(`Daily Tip: ${result.data.dailyTip}`);
      console.log(`Encouragement: ${result.data.encouragement}`);
      console.log(`Challenge: ${result.data.challenge?.title}`);
      console.log(`Quote: ${result.data.quote}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
    } else {
      console.log('❌ Motivational Content Failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Motivational Content Error:', error);
  }
}

/**
 * Test AI connection
 */
export async function testAIConnection() {
  console.log('🔗 Testing AI Connection...');
  
  try {
    const result = await aiService.testConnection();
    
    if (result.success) {
      console.log('✅ AI Connection Successful!');
      console.log(`Response: ${result.data}`);
    } else {
      console.log('❌ AI Connection Failed:', result.error);
    }
  } catch (error) {
    console.log('❌ AI Connection Error:', error);
  }
}

/**
 * Get AI status
 */
export function testAIStatus() {
  console.log('📊 Testing AI Status...');
  
  const status = aiService.getAIStatus();
  console.log(`Available: ${status.isAvailable}`);
  console.log(`Mode: ${status.mode}`);
  console.log(`Message: ${status.message}`);
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Starting AI Integration Tests...\n');
  
  // Test AI status first
  testAIStatus();
  console.log('');
  
  // Test connection
  await testAIConnection();
  console.log('');
  
  // Test workout generation
  await testWorkoutGeneration();
  console.log('');
  
  // Test meal generation
  await testMealGeneration();
  console.log('');
  
  // Test motivational content
  await testMotivationalContent();
  console.log('');
  
  console.log('✅ All AI Integration Tests Completed!');
}

// Export for use in other files
export default {
  testWorkoutGeneration,
  testMealGeneration,
  testMotivationalContent,
  testAIConnection,
  testAIStatus,
  runAllTests
};

// Uncomment to run tests when this file is imported
// runAllTests();
