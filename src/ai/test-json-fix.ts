// Test script to verify Google Gemini structured output JSON parsing
// This tests the exact implementation pattern required by CLAUDE.md

import { geminiService } from './gemini';

// Ultra-minimal schema to test JSON parsing
const TEST_SCHEMA = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      description: "Whether the test was successful"
    },
    message: {
      type: "string", 
      description: "Test message"
    },
    count: {
      type: "number",
      description: "Test number"
    }
  },
  required: ["success", "message", "count"]
};

export const testGoogleStructuredOutput = async () => {
  console.log('🧪 Testing Google Gemini structured output with minimal schema...');
  
  try {
    const response = await geminiService.generateResponse<any>(
      'Create a simple test response. Set success to true, message to "Google structured output working", and count to 123.',
      {},
      TEST_SCHEMA,
      1, // Single attempt
      {
        temperature: 0.1, // Very low temperature for consistent output
        maxOutputTokens: 200 // Very small response
      }
    );

    if (response.success) {
      console.log('✅ Structured output test PASSED');
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
      
      // Validate the response structure
      const data = response.data;
      if (typeof data.success === 'boolean' && 
          typeof data.message === 'string' && 
          typeof data.count === 'number') {
        console.log('✅ Schema validation PASSED');
        return true;
      } else {
        console.log('❌ Schema validation FAILED');
        console.log('- success type:', typeof data.success);
        console.log('- message type:', typeof data.message);
        console.log('- count type:', typeof data.count);
        return false;
      }
    } else {
      console.log('❌ Structured output test FAILED');
      console.log('Error:', response.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test threw exception:', error);
    return false;
  }
};

// Test with a slightly more complex schema (similar to workout structure)
const WORKOUT_TEST_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    exercises: {
      type: "array",
      items: {
        type: "object", 
        properties: {
          name: {
            type: "string"
          },
          sets: {
            type: "number"
          },
          reps: {
            type: "number"
          }
        },
        required: ["name", "sets", "reps"]
      }
    }
  },
  required: ["title", "exercises"]
};

export const testWorkoutStructure = async () => {
  console.log('🏋️ Testing workout-like structure...');
  
  try {
    const response = await geminiService.generateResponse<any>(
      'Create a simple workout with title "Test Workout" and 2 exercises: Push-ups (3 sets, 10 reps) and Squats (3 sets, 15 reps).',
      {},
      WORKOUT_TEST_SCHEMA,
      1,
      {
        temperature: 0.1,
        maxOutputTokens: 500
      }
    );

    if (response.success) {
      console.log('✅ Workout structure test PASSED');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      // Validate structure
      const data = response.data;
      if (data.title && Array.isArray(data.exercises) && data.exercises.length > 0) {
        console.log('✅ Workout validation PASSED');
        return true;
      } else {
        console.log('❌ Workout validation FAILED');
        return false;
      }
    } else {
      console.log('❌ Workout structure test FAILED');
      console.log('Error:', response.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Workout test threw exception:', error);
    return false;
  }
};

// Run both tests
export const runAllTests = async () => {
  console.log('🚀 Running Google Gemini structured output tests...\n');
  
  const test1 = await testGoogleStructuredOutput();
  console.log('');
  const test2 = await testWorkoutStructure();
  
  console.log('\n📋 Test Summary:');
  console.log(`- Simple schema: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Workout schema: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Google structured output is working correctly.');
    console.log('The issue might be with the specific workout schema complexity.');
  } else {
    console.log('\n🚨 Some tests failed. There may be an issue with the API setup.');
  }
};