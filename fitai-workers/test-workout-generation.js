/**
 * Test Script for Workout Generation Endpoint
 *
 * This script tests the complete end-to-end flow:
 * 1. Authentication
 * 2. Rate limiting
 * 3. Exercise filtering
 * 4. AI generation
 * 5. Caching
 * 6. Response enrichment
 */

const WORKER_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

// Test data
const testRequest = {
  profile: {
    age: 25,
    weight: 70,
    height: 175,
    gender: 'male',
    fitnessGoal: 'muscle_gain',
    experienceLevel: 'intermediate',
    availableEquipment: ['dumbbell', 'barbell', 'body weight'],
    workoutDuration: 45,
    workoutsPerWeek: 4,
  },
  workoutType: 'push',
  duration: 45,
  focusMuscles: ['pecs', 'delts', 'triceps'],
  model: 'google:gemini-2.0-flash-001',
  temperature: 0.7,
};

async function testWorkoutGeneration(token) {
  console.log('\n=== Testing Workout Generation Endpoint ===\n');

  try {
    console.log('1. Sending request to:', `${WORKER_URL}/workout/generate`);
    console.log('2. Request body:', JSON.stringify(testRequest, null, 2));

    const startTime = Date.now();
    const response = await fetch(`${WORKER_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(testRequest),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`\n3. Response received in ${responseTime}ms`);
    console.log('4. Status:', response.status, response.statusText);

    // Check rate limit headers
    console.log('\n=== Rate Limit Headers ===');
    console.log('X-RateLimit-Limit:', response.headers.get('x-ratelimit-limit'));
    console.log('X-RateLimit-Remaining:', response.headers.get('x-ratelimit-remaining'));
    console.log('X-RateLimit-Reset:', response.headers.get('x-ratelimit-reset'));

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Request failed:', data);
      return { success: false, error: data };
    }

    console.log('\n✅ Request successful!');

    // Analyze response
    console.log('\n=== Response Analysis ===');
    console.log('Success:', data.success);
    console.log('Cached:', data.metadata?.cached);
    console.log('Cache Source:', data.metadata?.cacheSource || 'fresh');
    console.log('Model:', data.metadata?.model);
    console.log('Generation Time:', data.metadata?.generationTime + 'ms');
    console.log('AI Generation Time:', data.metadata?.aiGenerationTime + 'ms');
    console.log('Tokens Used:', data.metadata?.tokensUsed);
    console.log('Cost (USD):', data.metadata?.costUsd?.toFixed(6) || 'N/A');

    // Filter stats
    if (data.metadata?.filterStats) {
      console.log('\n=== Exercise Filtering Stats ===');
      console.log('Total Exercises:', data.metadata.filterStats.total);
      console.log('After Equipment Filter:', data.metadata.filterStats.afterEquipment);
      console.log('After Body Parts Filter:', data.metadata.filterStats.afterBodyParts);
      console.log('After Experience Filter:', data.metadata.filterStats.afterExperience);
      console.log('Final Selection:', data.metadata.filterStats.final);
      console.log('Reduction:',
        `${data.metadata.filterStats.total} → ${data.metadata.filterStats.final} ` +
        `(${(100 - (data.metadata.filterStats.final / data.metadata.filterStats.total * 100)).toFixed(1)}% reduction)`
      );
    }

    // Workout details
    if (data.data) {
      console.log('\n=== Workout Details ===');
      console.log('Title:', data.data.title);
      console.log('Description:', data.data.description);
      console.log('Total Duration:', data.data.totalDuration + ' minutes');
      console.log('Difficulty:', data.data.difficulty);
      console.log('Estimated Calories:', data.data.estimatedCalories || 'N/A');

      console.log('\nWarmup Exercises:', data.data.warmup?.length || 0);
      console.log('Main Exercises:', data.data.exercises?.length || 0);
      console.log('Cooldown Exercises:', data.data.cooldown?.length || 0);

      // Show first 3 exercises with GIF URLs
      if (data.data.exercises && data.data.exercises.length > 0) {
        console.log('\n=== Sample Exercises (first 3) ===');
        data.data.exercises.slice(0, 3).forEach((ex, idx) => {
          console.log(`\n${idx + 1}. Exercise ID: ${ex.exerciseId}`);
          console.log(`   Sets: ${ex.sets}, Reps: ${ex.reps}, Rest: ${ex.restSeconds}s`);
          if (ex.exerciseData) {
            console.log(`   Name: ${ex.exerciseData.name}`);
            console.log(`   Equipment: ${ex.exerciseData.equipments?.join(', ')}`);
            console.log(`   Body Parts: ${ex.exerciseData.bodyParts?.join(', ')}`);
            console.log(`   GIF URL: ${ex.exerciseData.gifUrl}`);
            console.log(`   GIF Fixed: ${ex.exerciseData.gifUrl.includes('static.exercisedb.dev') ? '✅' : '❌'}`);
          }
        });
      }

      // Verify GIF coverage
      const allExercises = [
        ...(data.data.warmup || []),
        ...(data.data.exercises || []),
        ...(data.data.cooldown || []),
      ];

      const exercisesWithGifs = allExercises.filter(ex => ex.exerciseData?.gifUrl).length;
      const gifCoverage = allExercises.length > 0
        ? (exercisesWithGifs / allExercises.length * 100).toFixed(1)
        : 0;

      console.log('\n=== GIF Coverage ===');
      console.log(`Total exercises: ${allExercises.length}`);
      console.log(`Exercises with GIFs: ${exercisesWithGifs}`);
      console.log(`Coverage: ${gifCoverage}%`);
      console.log(`Status: ${gifCoverage === '100.0' ? '✅ 100% Coverage!' : '❌ Missing GIFs'}`);
    }

    return { success: true, data: data };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testCaching(token) {
  console.log('\n\n=== Testing Caching System ===\n');
  console.log('Making first request (should be cache MISS)...');

  const firstResponse = await testWorkoutGeneration(token);

  if (!firstResponse.success) {
    console.error('❌ First request failed, cannot test caching');
    return;
  }

  console.log('\n\n--- Waiting 2 seconds before second request ---\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Making second request (should be cache HIT)...');
  const secondResponse = await testWorkoutGeneration(token);

  if (secondResponse.success && secondResponse.data.metadata?.cached) {
    console.log('\n✅ Caching is working! Second request was served from cache.');
    console.log('Cache source:', secondResponse.data.metadata.cacheSource);
  } else {
    console.log('\n⚠️  Caching might not be working - second request was not cached');
  }
}

async function testAuthentication() {
  console.log('\n\n=== Testing Authentication ===\n');

  // Test 1: No token
  console.log('Test 1: Request without token (should return 401)...');
  try {
    const response = await fetch(`${WORKER_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest),
    });
    const data = await response.json();

    if (response.status === 401) {
      console.log('✅ Authentication properly enforced (401 Unauthorized)');
    } else {
      console.log('❌ Expected 401, got:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Invalid token
  console.log('\nTest 2: Request with invalid token (should return 401)...');
  try {
    const response = await fetch(`${WORKER_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-12345',
      },
      body: JSON.stringify(testRequest),
    });
    const data = await response.json();

    if (response.status === 401) {
      console.log('✅ Invalid token properly rejected (401 Unauthorized)');
    } else {
      console.log('❌ Expected 401, got:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         FitAI Workers - Workout Generation Tests            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Check if token is provided
  const token = process.env.SUPABASE_JWT_TOKEN || process.argv[2];

  if (!token || token.length < 20) {
    console.error('\n❌ Error: SUPABASE_JWT_TOKEN not provided\n');
    console.log('Usage:');
    console.log('  node test-workout-generation.js YOUR_JWT_TOKEN');
    console.log('  OR');
    console.log('  SUPABASE_JWT_TOKEN=your_token node test-workout-generation.js\n');
    console.log('To get a JWT token:');
    console.log('  1. Sign in to your mobile app');
    console.log('  2. Get token from AsyncStorage/SecureStore');
    console.log('  3. Or use Supabase Dashboard > Authentication > Users > Copy Access Token\n');
    process.exit(1);
  }

  console.log('Using JWT token:', token.substring(0, 20) + '...');

  // Run all tests
  await testAuthentication();
  await testWorkoutGeneration(token);
  await testCaching(token);

  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                     Tests Complete!                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
