/**
 * Comprehensive test for ALL workout generation scenarios
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-all-scenarios.js <auth-token>');
  process.exit(1);
}

const scenarios = [
  {
    name: 'Beginner Bodyweight Full Body',
    payload: {
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
    }
  },
  {
    name: 'Intermediate Dumbbell Upper Body',
    payload: {
      profile: {
        age: 25,
        gender: 'female',
        weight: 60,
        height: 165,
        fitnessGoal: 'weight_loss',
        experienceLevel: 'intermediate',
        availableEquipment: ['dumbbell']
      },
      workoutType: 'upper_body',
      duration: 30
    }
  },
  {
    name: 'Advanced Barbell Strength',
    payload: {
      profile: {
        age: 30,
        gender: 'male',
        weight: 85,
        height: 180,
        fitnessGoal: 'strength',
        experienceLevel: 'advanced',
        availableEquipment: ['barbell', 'dumbbell', 'cable']
      },
      workoutType: 'full_body',
      duration: 60
    }
  }
];

async function testScenario(scenario) {
  console.log('\n' + '='.repeat(60));
  console.log('Testing: ' + scenario.name);
  console.log('='.repeat(60));
  console.log('Payload:', JSON.stringify(scenario.payload, null, 2));

  try {
    const start = Date.now();
    const res = await fetch(API_URL + '/workout/generate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenario.payload),
    });
    const time = Date.now() - start;
    const data = await res.json();

    console.log('\nStatus: ' + res.status + ' | Time: ' + time + 'ms');

    if (res.status === 200 && data.success) {
      console.log('✅ SUCCESS');
      console.log('   Exercises: ' + (data.data.exercises?.length || 0));
      console.log('   Warmup: ' + (data.data.warmup?.length || 0));
      console.log('   Cooldown: ' + (data.data.cooldown?.length || 0));
      console.log('   Cached: ' + (data.metadata?.cached || false));
      console.log('   Cache Source: ' + (data.metadata?.cacheSource || 'N/A'));
      return { success: true, scenario: scenario.name };
    } else {
      console.log('❌ FAILED');
      console.log('   Error:', data.error?.code);
      console.log('   Message:', data.error?.message);
      console.log('   Details:', JSON.stringify(data.error?.details || {}, null, 2));
      return { success: false, scenario: scenario.name, error: data.error };
    }
  } catch (error) {
    console.log('❌ REQUEST ERROR:', error.message);
    return { success: false, scenario: scenario.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('🔥 COMPREHENSIVE WORKOUT GENERATION TEST');
  console.log('Testing ALL scenarios to ensure 100% working generation\n');

  const results = [];
  for (const scenario of scenarios) {
    const result = await testScenario(scenario);
    results.push(result);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('Total: ' + results.length);
  console.log('✅ Passed: ' + passed);
  console.log('❌ Failed: ' + failed);

  if (failed > 0) {
    console.log('\nFailed scenarios:');
    results.filter(r => !r.success).forEach(r => {
      console.log('  - ' + r.scenario);
    });
  }

  console.log('\n' + (failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
  console.log('Success Rate: ' + Math.round((passed / results.length) * 100) + '%\n');
}

runAllTests();
