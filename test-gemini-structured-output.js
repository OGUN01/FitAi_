#!/usr/bin/env node

/**
 * Comprehensive Test Script for Gemini Structured Output
 * Tests the complete workout generation pipeline with official structured output
 */

const { geminiService } = require('./src/ai/gemini.ts');
const { WEEKLY_PLAN_SCHEMA, DAILY_WORKOUT_SCHEMA } = require('./src/ai/schemas/workoutSchema.ts');
const { weeklyContentGenerator } = require('./src/ai/weeklyContentGenerator.ts');

// Test data matching our app's user profile structure
const TEST_PERSONAL_INFO = {
  name: 'Test User',
  age: '28',
  gender: 'male',
  height: '175',
  weight: '75',
  activityLevel: 'moderate'
};

const TEST_FITNESS_GOALS = {
  primaryGoals: ['muscle_gain', 'strength'],
  timeCommitment: '45-60',
  experience: 'intermediate',
  experience_level: 'intermediate' // For backward compatibility
};

async function testGeminiStructuredOutput() {
  console.log('🧪 COMPREHENSIVE GEMINI STRUCTURED OUTPUT TEST');
  console.log('=' .repeat(60));
  
  let allTestsPassed = true;
  const testResults = [];

  // Test 1: Basic Gemini Service Availability
  console.log('\n📋 Test 1: Gemini Service Availability');
  try {
    const isAvailable = geminiService.isAvailable();
    console.log(`✅ Gemini Service Available: ${isAvailable}`);
    testResults.push({ test: 'Service Availability', passed: isAvailable });
    if (!isAvailable) {
      console.log('❌ Cannot proceed - Gemini service not available');
      return false;
    }
  } catch (error) {
    console.log('❌ Service availability check failed:', error.message);
    testResults.push({ test: 'Service Availability', passed: false, error: error.message });
    return false;
  }

  // Test 2: Simple Structured Output Test
  console.log('\n📋 Test 2: Simple Structured Output');
  try {
    const simpleSchema = {
      type: "OBJECT",
      properties: {
        message: { type: "STRING", description: "A simple test message" },
        number: { type: "NUMBER", description: "A test number" },
        success: { type: "BOOLEAN", description: "Test success status" }
      },
      required: ["message", "number", "success"]
    };

    const response = await geminiService.generateResponse(
      'Create a simple test response with message "Hello World", number 42, and success true.',
      {},
      simpleSchema,
      1, // Single attempt for speed
      { maxOutputTokens: 512 }
    );

    if (response.success && response.data) {
      console.log('✅ Simple structured output generated successfully');
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
      console.log(`🕒 Generation time: ${response.generationTime}ms`);
      console.log(`🔢 Tokens used: ${response.tokensUsed}`);
      
      // Validate structure
      const isValid = response.data.message && 
                     typeof response.data.number === 'number' && 
                     typeof response.data.success === 'boolean';
      
      testResults.push({ test: 'Simple Structured Output', passed: isValid });
      if (!isValid) {
        console.log('❌ Structure validation failed');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ Simple structured output failed:', response.error);
      testResults.push({ test: 'Simple Structured Output', passed: false, error: response.error });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Simple structured output test failed:', error.message);
    testResults.push({ test: 'Simple Structured Output', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // Test 3: Daily Workout Schema Test
  console.log('\n📋 Test 3: Daily Workout Schema');
  try {
    const response = await geminiService.generateResponse(
      `Create a single workout for Monday targeting upper body strength training.
      User: ${TEST_PERSONAL_INFO.age} year old ${TEST_PERSONAL_INFO.gender}, ${TEST_PERSONAL_INFO.height}cm, ${TEST_PERSONAL_INFO.weight}kg
      Experience: ${TEST_FITNESS_GOALS.experience}
      Goals: ${TEST_FITNESS_GOALS.primaryGoals.join(', ')}
      Time: ${TEST_FITNESS_GOALS.timeCommitment} minutes`,
      {},
      DAILY_WORKOUT_SCHEMA,
      1,
      { maxOutputTokens: 4096 }
    );

    if (response.success && response.data) {
      console.log('✅ Daily workout generated successfully');
      console.log(`📊 Workout: ${response.data.title}`);
      console.log(`🗓️ Day: ${response.data.dayOfWeek}`);
      console.log(`⏱️ Duration: ${response.data.duration} minutes`);
      console.log(`🔥 Calories: ${response.data.estimatedCalories}`);
      console.log(`💪 Exercises: ${response.data.exercises?.length || 0}`);
      console.log(`🕒 Generation time: ${response.generationTime}ms`);
      
      // Validate structure
      const isValid = response.data.dayOfWeek &&
                     response.data.title &&
                     response.data.exercises &&
                     Array.isArray(response.data.exercises) &&
                     response.data.exercises.length > 0;
      
      testResults.push({ test: 'Daily Workout Schema', passed: isValid });
      if (!isValid) {
        console.log('❌ Daily workout structure validation failed');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ Daily workout generation failed:', response.error);
      testResults.push({ test: 'Daily Workout Schema', passed: false, error: response.error });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Daily workout test failed:', error.message);
    testResults.push({ test: 'Daily Workout Schema', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // Test 4: Weekly Plan Schema Test (Most Complex)
  console.log('\n📋 Test 4: Weekly Plan Schema (Complex)');
  try {
    const response = await geminiService.generateResponse(
      `Create a complete weekly workout plan for an intermediate fitness enthusiast.
      User Profile:
      - Age: ${TEST_PERSONAL_INFO.age}, Gender: ${TEST_PERSONAL_INFO.gender}
      - Height: ${TEST_PERSONAL_INFO.height}cm, Weight: ${TEST_PERSONAL_INFO.weight}kg
      - Activity Level: ${TEST_PERSONAL_INFO.activityLevel}
      - Experience: ${TEST_FITNESS_GOALS.experience}
      - Goals: ${TEST_FITNESS_GOALS.primaryGoals.join(' and ')}
      - Time per workout: ${TEST_FITNESS_GOALS.timeCommitment} minutes
      
      Create 4-5 workouts spread across the week with rest days.`,
      {},
      WEEKLY_PLAN_SCHEMA,
      1,
      { maxOutputTokens: 8192 }
    );

    if (response.success && response.data) {
      console.log('✅ Weekly plan generated successfully');
      console.log(`📊 Plan: ${response.data.planTitle}`);
      console.log(`📈 Experience Level: ${response.data.experienceLevel}`);
      console.log(`🗓️ Duration: ${response.data.totalDuration}`);
      console.log(`💪 Workouts: ${response.data.workouts?.length || 0}`);
      console.log(`😴 Rest Days: ${response.data.restDays?.length || 0}`);
      console.log(`🔥 Weekly Calories: ${response.data.estimatedWeeklyCalories}`);
      console.log(`🕒 Generation time: ${response.generationTime}ms`);
      console.log(`🔢 Tokens used: ${response.tokensUsed}`);
      
      // Detailed validation
      const hasValidWorkouts = response.data.workouts && 
                              Array.isArray(response.data.workouts) && 
                              response.data.workouts.length > 0;
      
      const hasValidDays = hasValidWorkouts && 
                          response.data.workouts.every(w => 
                            w.dayOfWeek && 
                            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(w.dayOfWeek)
                          );
      
      const hasValidExercises = hasValidWorkouts &&
                               response.data.workouts.every(w => 
                                 w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0
                               );
      
      const isValid = hasValidWorkouts && hasValidDays && hasValidExercises;
      
      if (isValid) {
        console.log('✅ Weekly plan structure validation passed');
        
        // Log sample workout details
        const sampleWorkout = response.data.workouts[0];
        console.log(`\n📝 Sample Workout (${sampleWorkout.dayOfWeek}):`);
        console.log(`   Title: ${sampleWorkout.title}`);
        console.log(`   Category: ${sampleWorkout.category}`);
        console.log(`   Duration: ${sampleWorkout.duration} minutes`);
        console.log(`   Exercises: ${sampleWorkout.exercises.length}`);
        
        if (sampleWorkout.exercises.length > 0) {
          const sampleExercise = sampleWorkout.exercises[0];
          console.log(`   First Exercise: ${sampleExercise.name} (${sampleExercise.sets} sets x ${sampleExercise.reps} reps)`);
        }
      } else {
        console.log('❌ Weekly plan structure validation failed');
        console.log('   Valid workouts:', hasValidWorkouts);
        console.log('   Valid days:', hasValidDays);
        console.log('   Valid exercises:', hasValidExercises);
        allTestsPassed = false;
      }
      
      testResults.push({ test: 'Weekly Plan Schema', passed: isValid });
    } else {
      console.log('❌ Weekly plan generation failed:', response.error);
      testResults.push({ test: 'Weekly Plan Schema', passed: false, error: response.error });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Weekly plan test failed:', error.message);
    testResults.push({ test: 'Weekly Plan Schema', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // Test 5: Real Weekly Content Generator (End-to-End)
  console.log('\n📋 Test 5: Real Weekly Content Generator (End-to-End)');
  try {
    const response = await weeklyContentGenerator.generateWeeklyWorkoutPlan(
      TEST_PERSONAL_INFO,
      TEST_FITNESS_GOALS,
      1 // Week 1
    );

    if (response.success && response.data) {
      console.log('✅ End-to-end weekly generation successful');
      console.log(`📊 Plan ID: ${response.data.id}`);
      console.log(`🗓️ Week: ${response.data.weekNumber}`);
      console.log(`📈 Plan: ${response.data.planTitle}`);
      console.log(`💪 Workouts: ${response.data.workouts?.length || 0}`);
      console.log(`🕒 Generation time: ${response.generationTime}ms`);
      
      // Validate our app's expected structure
      const isValid = response.data.id &&
                     response.data.weekNumber === 1 &&
                     response.data.workouts &&
                     Array.isArray(response.data.workouts) &&
                     response.data.workouts.length > 0 &&
                     response.data.workouts.every(w => w.dayOfWeek && w.exercises);
      
      testResults.push({ test: 'End-to-End Generation', passed: isValid });
      if (!isValid) {
        console.log('❌ End-to-end structure validation failed');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ End-to-end generation failed:', response.error);
      testResults.push({ test: 'End-to-End Generation', passed: false, error: response.error });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ End-to-end test failed:', error.message);
    testResults.push({ test: 'End-to-End Generation', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // Final Results Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  testResults.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.test}: ${status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  
  console.log('\n' + '=' .repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Gemini Structured Output is 100% Working!');
    console.log(`✅ ${passedTests}/${totalTests} tests successful`);
    console.log('🚀 The weekly workout generation pipeline is production ready!');
  } else {
    console.log('❌ SOME TESTS FAILED! Issues detected in structured output.');
    console.log(`⚠️  ${passedTests}/${totalTests} tests successful`);
    console.log('🔧 Review the failed tests above for debugging.');
  }
  console.log('=' .repeat(60));
  
  return allTestsPassed;
}

// Run the test
if (require.main === module) {
  testGeminiStructuredOutput()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test script crashed:', error);
      process.exit(1);
    });
}

module.exports = { testGeminiStructuredOutput };