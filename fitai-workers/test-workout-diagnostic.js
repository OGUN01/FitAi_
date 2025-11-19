/**
 * Diagnostic test for workout generation
 * Tests each step separately to identify the failure point
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-workout-diagnostic.js <auth-token>');
  process.exit(1);
}

async function testWorkoutGeneration() {
  console.log('🔍 Testing Workout Generation Endpoint...\n');

  // Test with minimal request body
  const minimalRequest = {
    profile: {
      age: 25,
      gender: 'male',
      weight: 75,
      height: 175,
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'intermediate',
      availableEquipment: ['dumbbell'],
    },
    workoutType: 'upper_body',
    duration: 30,
  };

  console.log('Request body:', JSON.stringify(minimalRequest, null, 2));
  console.log('\nSending request...\n');

  try {
    const response = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalRequest),
    });

    const status = response.status;
    const text = await response.text();

    console.log('Status:', status);
    console.log('Response:', text);

    if (status !== 200) {
      console.log('\n❌ Request failed');

      // Try to parse error
      try {
        const error = JSON.parse(text);
        console.log('\nError details:');
        console.log('  Message:', error.error?.message);
        console.log('  Code:', error.error?.code);
        console.log('  Details:', JSON.stringify(error.error?.details, null, 2));
      } catch (e) {
        console.log('\nRaw error:', text);
      }
    } else {
      console.log('\n✅ Request succeeded!');
      const data = JSON.parse(text);
      console.log('\nWorkout details:');
      console.log('  Exercises:', data.data?.exercises?.length || 0);
      console.log('  Cached:', data.metadata?.cached || false);
      console.log('  Model:', data.metadata?.model);
    }
  } catch (error) {
    console.error('\n❌ Exception:', error.message);
  }
}

testWorkoutGeneration();
