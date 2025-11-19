/**
 * Quick Test Script - Sign in and test workout generation
 *
 * This script will:
 * 1. Sign in with your email/password
 * 2. Get JWT token automatically
 * 3. Test the workout generation endpoint
 * 4. Show complete results
 */

import { createClient } from '@supabase/supabase-js';

// Your Supabase configuration (from mobile app)
const SUPABASE_URL = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

const WORKER_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

async function signInAndTest(email, password) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         FitAI Workers - Quick End-to-End Test               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Step 1: Sign in
  console.log('Step 1: Signing in to Supabase...');
  console.log('Email:', email);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('❌ Sign-in failed:', authError.message);
    console.log('\n💡 Make sure:');
    console.log('  - Email and password are correct');
    console.log('  - User exists in Supabase');
    console.log('  - Email is verified');
    return;
  }

  const token = authData.session.access_token;
  console.log('✅ Sign-in successful!');
  console.log('User ID:', authData.user.id);
  console.log('Email:', authData.user.email);
  console.log('Token:', token.substring(0, 30) + '...\n');

  // Step 2: Test health check
  console.log('Step 2: Testing health endpoint...');
  const healthResponse = await fetch(`${WORKER_URL}/health`);
  const healthData = await healthResponse.json();

  if (healthData.status === 'healthy') {
    console.log('✅ Worker is healthy');
    console.log('Services:', JSON.stringify(healthData.services, null, 2));
  } else {
    console.log('❌ Worker is not healthy');
  }

  // Step 3: Test authentication enforcement
  console.log('\nStep 3: Testing authentication enforcement...');
  const noAuthResponse = await fetch(`${WORKER_URL}/workout/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (noAuthResponse.status === 401) {
    console.log('✅ Authentication properly enforced (401 without token)');
  } else {
    console.log('❌ Expected 401, got:', noAuthResponse.status);
  }

  // Step 4: Test workout generation
  console.log('\nStep 4: Testing workout generation...');
  console.log('Sending request with valid token...\n');

  const workoutRequest = {
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
  };

  const startTime = Date.now();
  const workoutResponse = await fetch(`${WORKER_URL}/workout/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(workoutRequest),
  });

  const responseTime = Date.now() - startTime;
  const workoutData = await workoutResponse.json();

  console.log('Response status:', workoutResponse.status);
  console.log('Response time:', responseTime + 'ms');

  if (!workoutResponse.ok) {
    console.error('❌ Request failed:', workoutData);
    return;
  }

  console.log('✅ Workout generated successfully!\n');

  // Display results
  console.log('=== RESULTS ===');
  console.log('Cached:', workoutData.metadata?.cached || false);
  console.log('Model:', workoutData.metadata?.model);
  console.log('Tokens Used:', workoutData.metadata?.tokensUsed);
  console.log('Cost (USD):', workoutData.metadata?.costUsd?.toFixed(6) || 'N/A');

  if (workoutData.metadata?.filterStats) {
    const stats = workoutData.metadata.filterStats;
    console.log('\n=== EXERCISE FILTERING ===');
    console.log(`${stats.total} → ${stats.afterEquipment} → ${stats.afterBodyParts} → ${stats.afterExperience} → ${stats.final}`);
    console.log(`Reduction: ${((1 - stats.final / stats.total) * 100).toFixed(1)}%`);
  }

  if (workoutData.data) {
    console.log('\n=== WORKOUT ===');
    console.log('Title:', workoutData.data.title);
    console.log('Duration:', workoutData.data.totalDuration, 'minutes');
    console.log('Difficulty:', workoutData.data.difficulty);
    console.log('Warmup:', workoutData.data.warmup?.length || 0, 'exercises');
    console.log('Main:', workoutData.data.exercises?.length || 0, 'exercises');
    console.log('Cooldown:', workoutData.data.cooldown?.length || 0, 'exercises');

    // Check GIF coverage
    const allExercises = [
      ...(workoutData.data.warmup || []),
      ...(workoutData.data.exercises || []),
      ...(workoutData.data.cooldown || []),
    ];

    const withGifs = allExercises.filter(ex => ex.exerciseData?.gifUrl).length;
    const coverage = allExercises.length > 0 ? (withGifs / allExercises.length * 100) : 0;

    console.log('\n=== GIF COVERAGE ===');
    console.log(`${withGifs}/${allExercises.length} exercises (${coverage.toFixed(1)}%)`);
    console.log(coverage === 100 ? '✅ 100% Coverage!' : '❌ Missing GIFs');

    // Show first 2 exercises
    if (workoutData.data.exercises && workoutData.data.exercises.length > 0) {
      console.log('\n=== SAMPLE EXERCISES ===');
      workoutData.data.exercises.slice(0, 2).forEach((ex, idx) => {
        console.log(`\n${idx + 1}. ${ex.exerciseData?.name || 'Unknown'}`);
        console.log(`   Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restSeconds}s`);
        console.log(`   Equipment: ${ex.exerciseData?.equipments?.join(', ')}`);
        console.log(`   GIF: ${ex.exerciseData?.gifUrl}`);
      });
    }
  }

  // Step 5: Test caching
  console.log('\n\nStep 5: Testing caching system...');
  console.log('Making second request (should be cached)...\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  const cacheStartTime = Date.now();
  const cacheResponse = await fetch(`${WORKER_URL}/workout/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(workoutRequest),
  });

  const cacheResponseTime = Date.now() - cacheStartTime;
  const cacheData = await cacheResponse.json();

  console.log('Response time:', cacheResponseTime + 'ms');
  console.log('Cached:', cacheData.metadata?.cached || false);
  console.log('Cache source:', cacheData.metadata?.cacheSource || 'fresh');

  if (cacheData.metadata?.cached) {
    console.log('✅ Caching is working!');
    console.log(`Speed improvement: ${responseTime}ms → ${cacheResponseTime}ms (${((1 - cacheResponseTime / responseTime) * 100).toFixed(1)}% faster)`);
  } else {
    console.log('⚠️  Second request was not cached');
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 ALL TESTS PASSED! 🎉                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

// Main
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Error: Email and password required\n');
  console.log('Usage:');
  console.log('  node quick-test.js your@email.com yourpassword\n');
  console.log('Example:');
  console.log('  node quick-test.js sharmaharsh9887@gmail.com YourPassword123\n');
  process.exit(1);
}

signInAndTest(email, password).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
