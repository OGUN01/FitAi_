/**
 * Test script to investigate beginner workout timeout issue
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-beginner-workout.js <auth-token>');
  process.exit(1);
}

async function testBeginnerWorkout() {
  console.log('🔍 Testing Beginner Workout Configuration\n');
  console.log('Configuration:');

  const payload = {
    profile: {
      age: 22,
      gender: 'male',
      weight: 70,
      height: 170,
      fitnessGoal: 'general_fitness',
      experienceLevel: 'beginner',
      availableEquipment: ['bodyweight'],
    },
    workoutType: 'full_body',
    duration: 20,
  };

  console.log(JSON.stringify(payload, null, 2));
  console.log('\n⏱️  Sending request...\n');

  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const time = Date.now() - start;

    console.log(`Status: ${res.status}`);
    console.log(`Time: ${time}ms\n`);

    const data = await res.json();
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));

    if (res.status === 200 && data.data) {
      console.log('\n✅ SUCCESS');
      console.log(`Exercises: ${data.data.exercises?.length || 0}`);
      console.log(`Cached: ${data.metadata?.cached || false}`);
    } else {
      console.log('\n❌ FAILED');
      console.log('Error Code:', data.error?.code);
      console.log('Error Message:', data.error?.message);
      console.log('Error Details:', data.error?.details);
    }
  } catch (error) {
    console.error('\n❌ REQUEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testInvalidRequest() {
  console.log('\n\n🔍 Testing Invalid Request (Validation Error)\n');
  console.log('Payload: { invalid: "data" }\n');
  console.log('⏱️  Sending request...\n');

  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invalid: 'data' }),
    });
    const time = Date.now() - start;

    console.log(`Status: ${res.status}`);
    console.log(`Time: ${time}ms\n`);

    const data = await res.json();
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));

    if (res.status === 400) {
      console.log('\n✅ CORRECT - Returns 400 Bad Request');
    } else if (res.status === 500) {
      console.log('\n❌ INCORRECT - Returns 500 instead of 400');
      console.log('Expected: 400 Bad Request');
      console.log('Actual: 500 Internal Server Error');
    } else {
      console.log(`\n⚠️  UNEXPECTED STATUS: ${res.status}`);
    }
  } catch (error) {
    console.error('\n❌ REQUEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function runTests() {
  await testBeginnerWorkout();
  await testInvalidRequest();
  console.log('\n✅ Testing complete\n');
}

runTests();
