/**
 * Test ONLY beginner bodyweight workout to debug validation issue
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-beginner-only.js <auth-token>');
  process.exit(1);
}

async function testBeginnerWorkout() {
  const payload = {
    profile: {
      age: 22,
      gender: 'male',
      weight: 70,
      height: 170,
      fitnessGoal: 'maintenance',
      experienceLevel: 'beginner',
      availableEquipment: ['body weight']
    },
    workoutType: 'full_body',
    duration: 20
  };

  console.log('🔍 Testing Beginner Bodyweight Full Body Workout');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('\nSending request...\n');

  try {
    const start = Date.now();
    const res = await fetch(API_URL + '/workout/generate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const time = Date.now() - start;
    const data = await res.json();

    console.log('Status:', res.status);
    console.log('Time:', time + 'ms');
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));

    if (res.status === 200 && data.success) {
      console.log('\n✅ SUCCESS');
    } else {
      console.log('\n❌ FAILED');
      console.log('Error Code:', data.error?.code);
      console.log('Error Message:', data.error?.message);
      console.log('Error Details:', JSON.stringify(data.error?.details, null, 2));
    }
  } catch (error) {
    console.log('\n❌ REQUEST ERROR:', error.message);
  }
}

testBeginnerWorkout();
