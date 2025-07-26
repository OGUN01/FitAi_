// Test Script for AI Services with Real Onboarding Data
// This script tests our AI services with actual user data from Supabase

const { aiService } = require('./src/ai');

// Real user data from Supabase onboarding
const realUserProfile = {
  personalInfo: {
    name: "Harsh sharma",
    age: 26,
    gender: "male", 
    height: 171, // cm
    weight: 80, // kg
    activityLevel: "moderate"
  },
  fitnessGoals: {
    primaryGoals: ["weight_loss"],
    timeCommitment: "45-60", // minutes
    experience_level: "intermediate"
  }
};

// Test workout generation with real data
async function testWorkoutGeneration() {
  console.log('\n🏋️ Testing Workout Generation with Real Onboarding Data...');
  console.log('User:', realUserProfile.personalInfo.name);
  console.log('Goals:', realUserProfile.fitnessGoals.primaryGoals.join(', '));
  console.log('Experience:', realUserProfile.fitnessGoals.experience_level);
  console.log('Time Available:', realUserProfile.fitnessGoals.timeCommitment, 'minutes');
  
  try {
    const startTime = Date.now();
    
    const response = await aiService.generateWorkout(
      realUserProfile.personalInfo,
      realUserProfile.fitnessGoals,
      {
        workoutType: 'strength', // Good for weight loss
        duration: 50, // Based on 45-60 time commitment
        equipment: ['dumbbells', 'bodyweight'] // Typical home/gym setup
      }
    );

    const endTime = Date.now();
    console.log(`⏱️ Generation Time: ${endTime - startTime}ms`);

    if (response.success && response.data) {
      console.log('✅ Workout generation successful!');
      console.log('\n📋 Generated Workout Details:');
      console.log(`Title: ${response.data.title}`);
      console.log(`Description: ${response.data.description}`);
      console.log(`Category: ${response.data.category}`);
      console.log(`Difficulty: ${response.data.difficulty}`);
      console.log(`Duration: ${response.data.duration} minutes`);
      console.log(`Estimated Calories: ${response.data.estimatedCalories}`);
      console.log(`Equipment: ${response.data.equipment?.join(', ')}`);
      console.log(`Target Muscles: ${response.data.targetMuscleGroups?.join(', ')}`);
      
      console.log('\n🎯 Exercise List:');
      response.data.exercises?.forEach((exercise, index) => {
        console.log(`${index + 1}. ${exercise.exerciseId}`);
        console.log(`   Sets: ${exercise.sets}, Reps: ${exercise.reps}`);
        console.log(`   Rest: ${exercise.restTime}s`);
        console.log(`   Notes: ${exercise.notes}`);
        console.log(`   Intensity: ${exercise.intensity}\n`);
      });

      return true;
    } else {
      console.log('❌ Workout generation failed:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Workout generation error:', error.message);
    return false;
  }
}

// Test meal generation with real data
async function testMealGeneration() {
  console.log('\n🥗 Testing Meal Generation with Real Onboarding Data...');
  console.log('Generating breakfast for weight loss goal...');
  
  try {
    const startTime = Date.now();
    
    const response = await aiService.generateMeal(
      realUserProfile.personalInfo,
      realUserProfile.fitnessGoals,
      'breakfast',
      {
        calorieTarget: 400, // Appropriate for weight loss breakfast
        dietaryRestrictions: [],
        cuisinePreference: 'healthy'
      }
    );

    const endTime = Date.now();
    console.log(`⏱️ Generation Time: ${endTime - startTime}ms`);

    if (response.success && response.data) {
      console.log('✅ Meal generation successful!');
      console.log('\n🍳 Generated Meal Details:');
      console.log(`Name: ${response.data.name}`);
      console.log(`Type: ${response.data.type}`);
      console.log(`Description: ${response.data.description}`);
      console.log(`Total Calories: ${response.data.totalCalories}`);
      console.log(`Protein: ${response.data.totalProtein}g`);
      console.log(`Carbs: ${response.data.totalCarbohydrates}g`);
      console.log(`Fat: ${response.data.totalFat}g`);
      
      console.log('\n🥘 Food Items:');
      response.data.items?.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Quantity: ${item.quantity} ${item.unit}`);
        console.log(`   Calories: ${item.calories}`);
        console.log(`   P: ${item.protein}g, C: ${item.carbohydrates}g, F: ${item.fat}g\n`);
      });

      return true;
    } else {
      console.log('❌ Meal generation failed:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Meal generation error:', error.message);
    return false;
  }
}

// Test AI status and connectivity
async function testAIStatus() {
  console.log('\n🤖 Testing AI Service Status...');
  
  const status = aiService.getAIStatus();
  console.log(`AI Available: ${status.isAvailable}`);
  console.log(`Mode: ${status.mode}`);
  console.log(`Model: ${status.modelVersion || 'N/A'}`);
  console.log(`Message: ${status.message}`);
  
  if (status.isAvailable) {
    console.log('\n📡 Testing AI Connectivity...');
    try {
      const connectionTest = await aiService.testConnection();
      if (connectionTest.success) {
        console.log('✅ AI connection successful!');
        console.log(`Response: ${connectionTest.data}`);
      } else {
        console.log('❌ AI connection failed:', connectionTest.error);
      }
    } catch (error) {
      console.log('❌ AI connection error:', error.message);
    }
  }
  
  return status.isAvailable;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 FitAI v0.1.0 - AI Services Test with Real Onboarding Data');
  console.log('================================================================');
  
  const aiAvailable = await testAIStatus();
  
  if (!aiAvailable) {
    console.log('\n⚠️ AI services not available. Please check EXPO_PUBLIC_GEMINI_API_KEY');
    console.log('Running in demo mode...');
  }

  const results = {
    workout: await testWorkoutGeneration(),
    meal: await testMealGeneration()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Workout Generation: ${results.workout ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Meal Generation: ${results.meal ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! AI services are working correctly with real data.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
}

// Run the tests
runAllTests().catch(console.error);