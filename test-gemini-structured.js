// Test Gemini Structured Output Fix
// This tests if Gemini returns proper JSON instead of descriptive text

console.log('🧪 Testing Gemini Structured Output Fix...');

// Mock the necessary environment
process.env.EXPO_PUBLIC_GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'test-key';

// Import the Gemini service
const { geminiService } = require('./src/ai/gemini.ts');

// Test data
const testPersonalInfo = {
  name: 'Test User',
  age: 26,
  gender: 'male',
  height: 171,
  weight: 80,
  activityLevel: 'moderate'
};

const testFitnessGoals = {
  experience_level: 'intermediate',
  primaryGoals: ['weight_loss'],
  timeCommitment: '45-60 minutes'
};

// Simple workout schema for testing
const TEST_WORKOUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    category: { type: 'string' },
    duration: { type: 'number' },
    description: { type: 'string' }
  },
  required: ['title', 'category', 'duration', 'description']
};

async function testStructuredOutput() {
  try {
    console.log('🔧 Testing structured output configuration...');
    
    if (!geminiService.isAvailable()) {
      console.log('⚠️ Gemini API not available - testing configuration only');
      return;
    }

    const prompt = `Create a simple workout for a ${testPersonalInfo.age} year old ${testPersonalInfo.gender}.
    
    Requirements:
    - Title: descriptive workout name
    - Category: one of strength, cardio, flexibility, hiit
    - Duration: number of minutes
    - Description: brief description
    
    Return only JSON format.`;

    console.log('🚀 Making structured output request...');
    
    const response = await geminiService.generateResponse(
      prompt,
      {},
      TEST_WORKOUT_SCHEMA
    );

    console.log('📊 Response received:');
    console.log('Success:', response.success);
    console.log('Error:', response.error);
    
    if (response.success) {
      console.log('✅ Structured output working correctly!');
      console.log('Data type:', typeof response.data);
      console.log('Data:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ Structured output failed:', response.error);
    }

  } catch (error) {
    console.error('🚨 Test failed:', error.message);
  }
}

// Run the test
testStructuredOutput();