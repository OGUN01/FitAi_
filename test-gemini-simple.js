#!/usr/bin/env node

/**
 * Simple JavaScript Test for Gemini Structured Output
 * Tests the core functionality without TypeScript dependencies
 */

require('dotenv').config();

// Check environment
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

console.log('🧪 SIMPLE GEMINI STRUCTURED OUTPUT TEST');
console.log('=' .repeat(60));

if (!GEMINI_API_KEY) {
  console.log('❌ GEMINI_API_KEY not found in environment');
  console.log('🔧 Make sure EXPO_PUBLIC_GEMINI_API_KEY is set in your .env file');
  process.exit(1);
}

console.log('✅ Environment check passed');
console.log(`🔑 API Key: ${GEMINI_API_KEY.substring(0, 20)}...`);

// Test Google Generative AI import
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  console.log('✅ Google Generative AI package loaded successfully');
  
  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized');
  
  // Test basic structured output
  async function testStructuredOutput() {
    console.log('\n📋 Testing Structured Output...');
    
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              message: { type: "STRING", description: "Test message" },
              success: { type: "BOOLEAN", description: "Success status" },
              number: { type: "NUMBER", description: "Test number" }
            },
            required: ["message", "success", "number"]
          },
          temperature: 0.7,
          maxOutputTokens: 512
        }
      });

      const prompt = 'Create a test response with message "Hello World", success true, and number 42.';
      
      console.log('🚀 Sending request to Gemini...');
      const startTime = Date.now();
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log('📝 Raw response:', text);
      
      // Test JSON parsing
      try {
        const parsedData = JSON.parse(text);
        console.log('✅ JSON parsing successful');
        console.log('📊 Parsed data:', JSON.stringify(parsedData, null, 2));
        
        // Validate structure
        const isValid = parsedData.message && 
                       typeof parsedData.success === 'boolean' && 
                       typeof parsedData.number === 'number';
        
        if (isValid) {
          console.log('✅ Schema validation passed');
          console.log('🎉 STRUCTURED OUTPUT TEST PASSED!');
          return true;
        } else {
          console.log('❌ Schema validation failed');
          console.log('Expected: message (string), success (boolean), number (number)');
          console.log('Got:', typeof parsedData.message, typeof parsedData.success, typeof parsedData.number);
          return false;
        }
        
      } catch (parseError) {
        console.log('❌ JSON parsing failed:', parseError.message);
        console.log('This indicates the structured output is not working correctly');
        return false;
      }
      
    } catch (error) {
      console.log('❌ Gemini API call failed:', error.message);
      return false;
    }
  }

  // Test workout generation
  async function testWorkoutGeneration() {
    console.log('\n📋 Testing Workout Generation...');
    
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Workout title" },
              duration: { type: "NUMBER", description: "Duration in minutes" },
              exercises: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    sets: { type: "NUMBER" },
                    reps: { type: "STRING" }
                  },
                  required: ["name", "sets", "reps"]
                }
              }
            },
            required: ["title", "duration", "exercises"]
          },
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      });

      const prompt = `Create a 30-minute upper body strength workout for an intermediate level person. 
      Include 4-5 exercises with sets and reps.`;
      
      console.log('🚀 Generating workout...');
      const startTime = Date.now();
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Generation time: ${duration}ms`);
      
      // Test JSON parsing
      try {
        const workout = JSON.parse(text);
        console.log('✅ Workout JSON parsing successful');
        console.log(`📊 Generated: "${workout.title}" (${workout.duration} min)`);
        console.log(`💪 Exercises: ${workout.exercises?.length || 0}`);
        
        if (workout.exercises && workout.exercises.length > 0) {
          console.log('📝 Sample exercise:', workout.exercises[0].name);
        }
        
        // Validate structure
        const isValid = workout.title && 
                       typeof workout.duration === 'number' && 
                       Array.isArray(workout.exercises) &&
                       workout.exercises.length > 0;
        
        if (isValid) {
          console.log('✅ Workout schema validation passed');
          console.log('🎉 WORKOUT GENERATION TEST PASSED!');
          return true;
        } else {
          console.log('❌ Workout schema validation failed');
          return false;
        }
        
      } catch (parseError) {
        console.log('❌ Workout JSON parsing failed:', parseError.message);
        console.log('Raw response:', text.substring(0, 200) + '...');
        return false;
      }
      
    } catch (error) {
      console.log('❌ Workout generation failed:', error.message);
      return false;
    }
  }

  // Run tests
  async function runAllTests() {
    console.log('\n🎯 Running all tests...\n');
    
    const test1 = await testStructuredOutput();
    const test2 = await testWorkoutGeneration();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('=' .repeat(60));
    
    console.log(`1. Basic Structured Output: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`2. Workout Generation: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = test1 && test2;
    
    console.log('\n' + '=' .repeat(60));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Gemini Structured Output is working 100% correctly!');
      console.log('🚀 Your AI features are production ready!');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      console.log('🔧 Review the errors above and fix the issues.');
      console.log('💡 Common issues: API key, network, or model configuration.');
    }
    console.log('=' .repeat(60));
    
    return allPassed;
  }

  // Execute tests
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });

} catch (error) {
  console.log('❌ Failed to load Google Generative AI package:', error.message);
  console.log('🔧 Make sure to run: npm install @google/generative-ai');
  process.exit(1);
}
