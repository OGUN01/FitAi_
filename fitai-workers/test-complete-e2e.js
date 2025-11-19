/**
 * Complete End-to-End Test Suite
 * Tests EVERY endpoint with 100% precision
 *
 * Usage: node test-complete-e2e.js <auth-token>
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(name, passed, details = {}) {
  results.total++;
  if (passed) {
    results.passed++;
    log(`✅ ${name}`, 'green');
  } else {
    results.failed++;
    log(`❌ ${name}`, 'red');
  }
  results.tests.push({ name, passed, ...details });
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

async function testAuthEndpoints(token) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('1️⃣  AUTHENTICATION ENDPOINTS', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  // Test /auth/me
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    const passed = response.status === 200 && data.success && data.data.id;
    recordTest('GET /auth/me (authenticated)', passed, {
      status: response.status,
      userId: data.data?.id
    });

    if (passed) {
      log(`   User ID: ${data.data.id}`, 'cyan');
      log(`   Email: ${data.data.email || 'N/A'}`, 'cyan');
    }
  } catch (error) {
    recordTest('GET /auth/me (authenticated)', false, { error: error.message });
  }

  // Test /auth/status with token
  try {
    const response = await fetch(`${API_URL}/auth/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    const passed = response.status === 200 && data.success && data.data.authenticated === true;
    recordTest('GET /auth/status (with token)', passed, {
      status: response.status,
      authenticated: data.data?.authenticated
    });
  } catch (error) {
    recordTest('GET /auth/status (with token)', false, { error: error.message });
  }

  // Test /auth/status without token
  try {
    const response = await fetch(`${API_URL}/auth/status`);
    const data = await response.json();

    const passed = response.status === 200 && data.success && data.data.authenticated === false;
    recordTest('GET /auth/status (without token)', passed, {
      status: response.status,
      authenticated: data.data?.authenticated
    });
  } catch (error) {
    recordTest('GET /auth/status (without token)', false, { error: error.message });
  }
}

// ============================================================================
// WORKOUT GENERATION TESTS
// ============================================================================

async function testWorkoutGeneration(token) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('2️⃣  WORKOUT GENERATION ENDPOINT', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  const requestBody = {
    user_preferences: {
      fitness_goal: 'muscle_gain',
      experience_level: 'intermediate',
      workout_duration: 60,
      workouts_per_week: 4,
      available_equipment: ['barbell', 'dumbbell', 'bench'],
      focus_areas: ['chest', 'back', 'legs'],
    },
  };

  try {
    log('   Requesting workout generation...', 'cyan');
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    log(`   Response time: ${responseTime}ms`, 'cyan');
    log(`   Status: ${response.status}`, 'cyan');

    if (response.status === 200 && data.success) {
      const workout = data.data.workout;
      const cached = data.metadata?.cached || false;

      log(`   Cached: ${cached}`, cached ? 'yellow' : 'cyan');
      log(`   Workout ID: ${workout.id || 'N/A'}`, 'cyan');
      log(`   Exercises: ${workout.exercises?.length || 0}`, 'cyan');

      const passed = workout && workout.exercises && workout.exercises.length > 0;
      recordTest('POST /workout/generate', passed, {
        status: response.status,
        responseTime,
        cached,
        exerciseCount: workout.exercises?.length || 0,
      });

      // Return workout ID for caching test
      return { success: true, workoutId: workout.id, cached };
    } else {
      log(`   Error: ${data.error?.message || 'Unknown error'}`, 'red');
      recordTest('POST /workout/generate', false, {
        status: response.status,
        error: data.error?.message,
      });
      return { success: false };
    }
  } catch (error) {
    log(`   Exception: ${error.message}`, 'red');
    recordTest('POST /workout/generate', false, { error: error.message });
    return { success: false };
  }
}

// ============================================================================
// DIET GENERATION TESTS
// ============================================================================

async function testDietGeneration(token) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('3️⃣  DIET GENERATION ENDPOINT', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  const requestBody = {
    user_preferences: {
      dietary_preference: 'vegetarian',
      daily_calories: 2500,
      meals_per_day: 4,
      allergies: [],
      cuisine_preferences: ['indian', 'mediterranean'],
    },
  };

  try {
    log('   Requesting diet generation...', 'cyan');
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/diet/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    log(`   Response time: ${responseTime}ms`, 'cyan');
    log(`   Status: ${response.status}`, 'cyan');

    if (response.status === 200 && data.success) {
      const diet = data.data.diet;
      const cached = data.metadata?.cached || false;

      log(`   Cached: ${cached}`, cached ? 'yellow' : 'cyan');
      log(`   Diet ID: ${diet.id || 'N/A'}`, 'cyan');
      log(`   Meals: ${diet.meals?.length || 0}`, 'cyan');

      const passed = diet && diet.meals && diet.meals.length > 0;
      recordTest('POST /diet/generate', passed, {
        status: response.status,
        responseTime,
        cached,
        mealCount: diet.meals?.length || 0,
      });

      return { success: true, dietId: diet.id, cached };
    } else {
      log(`   Error: ${data.error?.message || 'Unknown error'}`, 'red');
      recordTest('POST /diet/generate', false, {
        status: response.status,
        error: data.error?.message,
      });
      return { success: false };
    }
  } catch (error) {
    log(`   Exception: ${error.message}`, 'red');
    recordTest('POST /diet/generate', false, { error: error.message });
    return { success: false };
  }
}

// ============================================================================
// AI CHAT TESTS
// ============================================================================

async function testAIChat(token) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('4️⃣  AI CHAT ENDPOINT', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  const requestBody = {
    messages: [
      { role: 'user', content: 'What are the benefits of compound exercises?' },
    ],
  };

  try {
    log('   Sending chat message...', 'cyan');
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/chat/ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    log(`   Response time: ${responseTime}ms`, 'cyan');
    log(`   Status: ${response.status}`, 'cyan');

    if (response.status === 200 && data.success) {
      const message = data.data.message;

      log(`   Response length: ${message?.length || 0} chars`, 'cyan');
      log(`   Preview: ${message?.substring(0, 80)}...`, 'cyan');

      const passed = message && message.length > 0;
      recordTest('POST /chat/ai', passed, {
        status: response.status,
        responseTime,
        responseLength: message?.length || 0,
      });

      return { success: true };
    } else {
      log(`   Error: ${data.error?.message || 'Unknown error'}`, 'red');
      recordTest('POST /chat/ai', false, {
        status: response.status,
        error: data.error?.message,
      });
      return { success: false };
    }
  } catch (error) {
    log(`   Exception: ${error.message}`, 'red');
    recordTest('POST /chat/ai', false, { error: error.message });
    return { success: false };
  }
}

// ============================================================================
// MEDIA ENDPOINT TESTS
// ============================================================================

async function testMediaEndpoints(token) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('5️⃣  MEDIA ENDPOINTS (Upload/Serve/Delete)', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  // Create a minimal test image (1x1 PNG)
  const testImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  let mediaId = null;

  // Test Upload
  try {
    log('   Testing upload...', 'cyan');
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/png',
      },
      body: testImage,
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    log(`   Response time: ${responseTime}ms`, 'cyan');
    log(`   Status: ${response.status}`, 'cyan');

    if (response.status === 200 && data.success) {
      mediaId = data.data.url.split('/').pop();
      log(`   Media ID: ${mediaId}`, 'cyan');
      log(`   URL: ${data.data.url}`, 'cyan');

      recordTest('POST /media/upload', true, {
        status: response.status,
        responseTime,
        mediaId,
      });
    } else {
      log(`   Error: ${data.error?.message || 'Unknown error'}`, 'red');
      recordTest('POST /media/upload', false, {
        status: response.status,
        error: data.error?.message,
      });
    }
  } catch (error) {
    log(`   Exception: ${error.message}`, 'red');
    recordTest('POST /media/upload', false, { error: error.message });
  }

  // Test Serve (if upload succeeded)
  if (mediaId) {
    try {
      log('   Testing serve...', 'cyan');
      const startTime = Date.now();

      const response = await fetch(`${API_URL}/media/user/${mediaId}`);
      const responseTime = Date.now() - startTime;

      log(`   Response time: ${responseTime}ms`, 'cyan');
      log(`   Status: ${response.status}`, 'cyan');
      log(`   Content-Type: ${response.headers.get('Content-Type')}`, 'cyan');

      const passed = response.status === 200;
      recordTest('GET /media/:category/:id', passed, {
        status: response.status,
        responseTime,
        contentType: response.headers.get('Content-Type'),
      });
    } catch (error) {
      log(`   Exception: ${error.message}`, 'red');
      recordTest('GET /media/:category/:id', false, { error: error.message });
    }

    // Test Delete
    try {
      log('   Testing delete...', 'cyan');
      const startTime = Date.now();

      const response = await fetch(`${API_URL}/media/user/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      log(`   Response time: ${responseTime}ms`, 'cyan');
      log(`   Status: ${response.status}`, 'cyan');

      const passed = response.status === 200 && data.success;
      recordTest('DELETE /media/:category/:id', passed, {
        status: response.status,
        responseTime,
      });
    } catch (error) {
      log(`   Exception: ${error.message}`, 'red');
      recordTest('DELETE /media/:category/:id', false, { error: error.message });
    }
  } else {
    recordTest('GET /media/:category/:id', false, { error: 'Upload failed, skipping serve test' });
    recordTest('DELETE /media/:category/:id', false, { error: 'Upload failed, skipping delete test' });
  }
}

// ============================================================================
// CACHING VERIFICATION TESTS
// ============================================================================

async function testCachingBehavior(token) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('6️⃣  KV CACHING VERIFICATION', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  const requestBody = {
    user_preferences: {
      fitness_goal: 'weight_loss',
      experience_level: 'beginner',
      workout_duration: 30,
      workouts_per_week: 3,
      available_equipment: ['bodyweight'],
      focus_areas: ['full_body'],
    },
  };

  try {
    log('   First request (should miss cache)...', 'cyan');
    const response1 = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const data1 = await response1.json();
    const cached1 = data1.metadata?.cached || false;

    log(`   First request cached: ${cached1}`, 'cyan');

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    log('   Second request (should hit cache)...', 'cyan');
    const response2 = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const data2 = await response2.json();
    const cached2 = data2.metadata?.cached || false;

    log(`   Second request cached: ${cached2}`, 'cyan');

    const passed = !cached1 && cached2;
    recordTest('KV Caching (workout)', passed, {
      firstCached: cached1,
      secondCached: cached2,
    });

    if (passed) {
      log('   ✅ Caching working: First miss, second hit', 'green');
    } else {
      log('   ⚠️  Caching behavior unexpected', 'yellow');
    }
  } catch (error) {
    log(`   Exception: ${error.message}`, 'red');
    recordTest('KV Caching (workout)', false, { error: error.message });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runCompleteE2E() {
  log('\n╔══════════════════════════════════════════════════════════════╗', 'bright');
  log('║       FitAI Workers - Complete End-to-End Test Suite        ║', 'bright');
  log('║                    100% Precision Testing                    ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'bright');

  const token = process.argv[2];

  if (!token) {
    log('❌ Missing auth token', 'red');
    log('Usage: node test-complete-e2e.js <auth-token>', 'cyan');
    log('\nGet token with: node get-auth-token.js <email> <password>', 'cyan');
    process.exit(1);
  }

  log(`API URL: ${API_URL}`, 'cyan');
  log(`Token: ${token.substring(0, 30)}...`, 'cyan');

  // Run all test suites
  await testAuthEndpoints(token);
  await testWorkoutGeneration(token);
  await testDietGeneration(token);
  await testAIChat(token);
  await testMediaEndpoints(token);
  await testCachingBehavior(token);

  // Print final summary
  log('\n╔══════════════════════════════════════════════════════════════╗', 'bright');
  log('║                       TEST SUMMARY                           ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'bright');

  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');

  if (results.failed === 0) {
    log('\n✅ ALL TESTS PASSED - System is 100% functional!', 'green');
  } else {
    log(`\n⚠️  ${results.failed} test(s) failed - Review details above`, 'yellow');
  }

  // Detailed results
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('Detailed Results:', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

  results.tests.forEach((test, i) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${i + 1}. ${status} ${test.name}`);
    if (test.status) console.log(`   Status: ${test.status}`);
    if (test.responseTime) console.log(`   Time: ${test.responseTime}ms`);
    if (test.error) console.log(`   Error: ${test.error}`);
  });

  log('\n🏁 Complete End-to-End Test Finished!\n', 'green');
}

// Run tests
runCompleteE2E().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
