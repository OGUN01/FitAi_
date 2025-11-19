/**
 * Comprehensive FitAI Workers API Test Suite
 * Tests all endpoints with various configurations
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-comprehensive.js <auth-token>');
  process.exit(1);
}

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, details = {}) {
  const emoji = status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} ${name}`);
  if (details.time) console.log(`   Time: ${details.time}ms`);
  if (details.message) console.log(`   ${details.message}`);
  if (details.error) console.log(`   Error: ${details.error}`);

  results.tests.push({ name, status, ...details });
  if (status === 'PASS') results.passed++;
  else results.failed++;
}

// ============================================================================
// TEST 1: HEALTH CHECK
// ============================================================================
async function testHealthCheck() {
  console.log('\n📋 TEST 1: Health Check Endpoint\n');

  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/health`);
    const time = Date.now() - start;
    const data = await res.json();

    if (res.status === 200 && data.status === 'healthy') {
      logTest('Health Check', 'PASS', {
        time,
        message: `All services: ${Object.keys(data.services).filter(k => data.services[k].status === 'up').length} up`
      });
    } else {
      logTest('Health Check', 'FAIL', {
        time,
        error: `Status: ${data.status}, Services: ${JSON.stringify(data.services)}`
      });
    }
  } catch (error) {
    logTest('Health Check', 'FAIL', { error: error.message });
  }
}

// ============================================================================
// TEST 2: EXERCISE SEARCH
// ============================================================================
async function testExerciseSearch() {
  console.log('\n📋 TEST 2: Exercise Search Endpoint\n');

  // Test 2.1: Search by body part
  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/exercise/search?bodyPart=chest&limit=5`);
    const time = Date.now() - start;
    const data = await res.json();

    if (res.status === 200 && data.data && data.data.length > 0) {
      logTest('Exercise Search (by body part)', 'PASS', {
        time,
        message: `Found ${data.data.length} chest exercises`
      });
    } else {
      logTest('Exercise Search (by body part)', 'FAIL', {
        time,
        error: `No results or error: ${JSON.stringify(data)}`
      });
    }
  } catch (error) {
    logTest('Exercise Search (by body part)', 'FAIL', { error: error.message });
  }

  // Test 2.2: Search by equipment
  try {
    const start = Date.now();
    const res = await fetch(`${API_URL}/exercise/search?equipment=dumbbell&limit=5`);
    const time = Date.now() - start;
    const data = await res.json();

    if (res.status === 200 && data.data && data.data.length > 0) {
      logTest('Exercise Search (by equipment)', 'PASS', {
        time,
        message: `Found ${data.data.length} dumbbell exercises`
      });
    } else {
      logTest('Exercise Search (by equipment)', 'FAIL', {
        time,
        error: `No results or error: ${JSON.stringify(data)}`
      });
    }
  } catch (error) {
    logTest('Exercise Search (by equipment)', 'FAIL', { error: error.message });
  }
}

// ============================================================================
// TEST 3: WORKOUT GENERATION VARIATIONS
// ============================================================================
async function testWorkoutVariations() {
  console.log('\n📋 TEST 3: Workout Generation Variations\n');

  const variations = [
    {
      name: 'Beginner Full Body',
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
    },
    {
      name: 'Advanced Upper Body',
      profile: {
        age: 30,
        gender: 'male',
        weight: 85,
        height: 180,
        fitnessGoal: 'muscle_gain',
        experienceLevel: 'advanced',
        availableEquipment: ['barbell', 'dumbbell'],
      },
      workoutType: 'upper_body',
      duration: 60,
    },
  ];

  for (const variation of variations) {
    try {
      const start = Date.now();
      const res = await fetch(`${API_URL}/workout/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variation),
      });
      const time = Date.now() - start;
      const data = await res.json();

      if (res.status === 200 && data.data && data.data.exercises) {
        logTest(`Workout: ${variation.name}`, 'PASS', {
          time,
          message: `${data.data.exercises.length} exercises, cached: ${data.metadata?.cached || false}`
        });
      } else {
        logTest(`Workout: ${variation.name}`, 'FAIL', {
          time,
          error: data.error?.message || 'No exercises returned'
        });
      }
    } catch (error) {
      logTest(`Workout: ${variation.name}`, 'FAIL', { error: error.message });
    }
  }
}

// ============================================================================
// TEST 4: DIET GENERATION VARIATIONS
// ============================================================================
async function testDietVariations() {
  console.log('\n📋 TEST 4: Diet Generation Variations\n');

  const variations = [
    {
      name: '1500 cal Low Carb',
      calorieTarget: 1500,
      mealsPerDay: 3,
      macros: { protein: 40, carbs: 20, fats: 40 },
    },
    {
      name: '3000 cal High Protein',
      calorieTarget: 3000,
      mealsPerDay: 5,
      macros: { protein: 40, carbs: 40, fats: 20 },
    },
  ];

  for (const variation of variations) {
    try {
      const start = Date.now();
      const res = await fetch(`${API_URL}/diet/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variation),
      });
      const time = Date.now() - start;
      const data = await res.json();

      if (res.status === 200 && data.data && data.data.meals) {
        logTest(`Diet: ${variation.name}`, 'PASS', {
          time,
          message: `${data.data.meals.length} meals, ${data.data.totalCalories} kcal, cached: ${data.metadata?.cached || false}`
        });
      } else {
        logTest(`Diet: ${variation.name}`, 'FAIL', {
          time,
          error: data.error?.message || 'No meals returned'
        });
      }
    } catch (error) {
      logTest(`Diet: ${variation.name}`, 'FAIL', { error: error.message });
    }
  }
}

// ============================================================================
// TEST 5: ERROR HANDLING
// ============================================================================
async function testErrorHandling() {
  console.log('\n📋 TEST 5: Error Handling\n');

  // Test 5.1: Invalid auth token
  try {
    const res = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile: { age: 25, gender: 'male', weight: 75, height: 175, fitnessGoal: 'muscle_gain', experienceLevel: 'intermediate', availableEquipment: ['dumbbell'] },
        workoutType: 'upper_body',
        duration: 30,
      }),
    });

    if (res.status === 401) {
      logTest('Invalid Auth Token', 'PASS', { message: '401 Unauthorized as expected' });
    } else {
      logTest('Invalid Auth Token', 'FAIL', { error: `Expected 401, got ${res.status}` });
    }
  } catch (error) {
    logTest('Invalid Auth Token', 'FAIL', { error: error.message });
  }

  // Test 5.2: Invalid workout request (missing required fields)
  try {
    const res = await fetch(`${API_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invalid: 'data' }),
    });

    if (res.status === 400) {
      logTest('Invalid Request (missing fields)', 'PASS', { message: '400 Bad Request as expected' });
    } else {
      logTest('Invalid Request (missing fields)', 'FAIL', { error: `Expected 400, got ${res.status}` });
    }
  } catch (error) {
    logTest('Invalid Request (missing fields)', 'FAIL', { error: error.message });
  }
}

// ============================================================================
// TEST 6: MEDIA ENDPOINTS
// ============================================================================
async function testMediaEndpoints() {
  console.log('\n📋 TEST 6: Media Endpoints\n');

  let uploadedUrl = null;
  let uploadedCategory = null;
  let uploadedFilename = null;

  // Test 6.1: Upload
  try {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', blob, 'test.png');
    formData.append('category', 'user');

    const start = Date.now();
    const res = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: formData,
    });
    const time = Date.now() - start;
    const data = await res.json();

    if (res.status === 201 && data.data) {
      uploadedUrl = data.data.url;
      uploadedCategory = data.data.category;
      uploadedFilename = data.data.filename;
      logTest('Media Upload', 'PASS', {
        time,
        message: `Uploaded ${data.data.size} bytes`
      });
    } else {
      logTest('Media Upload', 'FAIL', { time, error: data.error?.message });
    }
  } catch (error) {
    logTest('Media Upload', 'FAIL', { error: error.message });
  }

  // Test 6.2: Serve
  if (uploadedUrl) {
    try {
      const start = Date.now();
      const res = await fetch(`${API_URL}${uploadedUrl}`);
      const time = Date.now() - start;

      if (res.status === 200) {
        const blob = await res.blob();
        logTest('Media Serve', 'PASS', {
          time,
          message: `Served ${blob.size} bytes`
        });
      } else {
        logTest('Media Serve', 'FAIL', { time, error: `Status ${res.status}` });
      }
    } catch (error) {
      logTest('Media Serve', 'FAIL', { error: error.message });
    }
  }

  // Test 6.3: Delete
  if (uploadedCategory && uploadedFilename) {
    try {
      const start = Date.now();
      const res = await fetch(`${API_URL}/media/${uploadedCategory}/${uploadedFilename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${TOKEN}` },
      });
      const time = Date.now() - start;
      const data = await res.json();

      if (res.status === 200) {
        logTest('Media Delete', 'PASS', { time, message: data.message });
      } else {
        logTest('Media Delete', 'FAIL', { time, error: data.error?.message });
      }
    } catch (error) {
      logTest('Media Delete', 'FAIL', { error: error.message });
    }
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  console.log('🚀 FitAI Workers Comprehensive Test Suite\n');
  console.log('═══════════════════════════════════════════\n');

  await testHealthCheck();
  // await testExerciseSearch(); // Not implemented yet
  await testWorkoutVariations();
  await testDietVariations();
  await testErrorHandling();
  await testMediaEndpoints();

  console.log('\n═══════════════════════════════════════════\n');
  console.log('📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error || 'Unknown error'}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests();
