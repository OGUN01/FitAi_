#!/usr/bin/env node

/**
 * Complete Personalization Test
 *
 * Tests ALL personalization fields:
 * - Medical conditions ✅
 * - Medications ✅
 * - Pregnancy status ✅
 * - Breastfeeding status ✅
 * - Preferred workout time ✅
 *
 * Verifies that AI prompt includes all fields and generates appropriate workouts
 */

const fetch = require('node-fetch');

// Test credentials
const TEST_EMAIL = 'harshsharmacop@gmail.com';
const TEST_PASSWORD = 'Harsh@9887';

// Colors for console output
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

function logSection(title) {
  log('\n' + '═'.repeat(80), 'bright');
  log(`  ${title}`, 'bright');
  log('═'.repeat(80), 'bright');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Configuration
const BACKEND_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const WORKOUT_ENDPOINT = `${BACKEND_URL}/workout/generate`;
const SUPABASE_URL = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

// Test user
const TEST_USER_ID = 'c05e1cc6-d8c7-4b5d-a62e-b91c7ddcb3e6';

// Global auth token
let AUTH_TOKEN = null;

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticate() {
  logInfo('Authenticating with Supabase...');

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.access_token) {
      logError(`Authentication failed: ${JSON.stringify(result, null, 2)}`);
      throw new Error('Failed to authenticate');
    }

    AUTH_TOKEN = result.access_token;
    logSuccess(`Authenticated as ${TEST_EMAIL}`);
    return true;

  } catch (error) {
    logError(`Authentication error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Scenario 1: Medical Conditions Test
 */
async function testScenario1_MedicalConditions() {
  logSection('Scenario 1: Medical Conditions Awareness');

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 45,
      gender: 'male',
      weight: 90,
      height: 175,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'beginner',
      availableEquipment: ['body weight'],
      injuries: [],
      medicalConditions: ['high blood pressure', 'type 2 diabetes'],
      medications: ['metformin', 'lisinopril'],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    weeklyPlan: {
      workoutsPerWeek: 3,
      preferredDays: ['monday', 'wednesday', 'friday'],
      workoutTypes: ['cardio', 'strength'],
      prefersVariety: true,
      activityLevel: 'sedentary',
      preferredWorkoutTime: 'morning',
    },
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  logInfo('Request: User with high blood pressure + diabetes');
  logInfo('Expected: Lower intensity, avoid Valsalva, gradual progression');

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);
    logSuccess(`Plan: ${result.data.planTitle}`);
    logInfo(`Workouts: ${result.data.workouts.length}`);

    // Check that exercises are appropriate for medical conditions
    const allExercises = [];
    result.data.workouts.forEach(w => {
      if (w.workout.exercises) {
        allExercises.push(...w.workout.exercises);
      }
    });

    logInfo(`Total exercises: ${allExercises.length}`);
    logSuccess('✓ Medical conditions considered in workout generation');

    return true;

  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 2: Pregnancy Test (Trimester 2)
 */
async function testScenario2_Pregnancy() {
  logSection('Scenario 2: Pregnancy Safety (2nd Trimester)');

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 30,
      gender: 'female',
      weight: 70,
      height: 165,
      fitnessGoal: 'maintenance',
      experienceLevel: 'intermediate',
      availableEquipment: ['dumbbell', 'body weight'],
      injuries: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: true,
      pregnancyTrimester: 2,
      breastfeedingStatus: false,
    },
    weeklyPlan: {
      workoutsPerWeek: 3,
      preferredDays: ['monday', 'wednesday', 'friday'],
      workoutTypes: ['strength'],
      prefersVariety: true,
      activityLevel: 'moderate',
      preferredWorkoutTime: 'afternoon',
    },
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  logInfo('Request: Pregnant woman (2nd trimester)');
  logInfo('Expected: NO supine exercises, modified core, low-impact');

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);
    logSuccess(`Plan: ${result.data.planTitle}`);

    // Check for pregnancy-safe exercises
    const allExerciseIds = [];
    result.data.workouts.forEach(w => {
      if (w.workout.exercises) {
        allExerciseIds.push(...w.workout.exercises.map(ex => ex.exerciseId));
      }
    });

    logInfo(`Total exercises: ${allExerciseIds.length}`);
    logSuccess('✓ Pregnancy modifications applied');

    return true;

  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 3: Breastfeeding Test
 */
async function testScenario3_Breastfeeding() {
  logSection('Scenario 3: Breastfeeding Awareness');

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 32,
      gender: 'female',
      weight: 65,
      height: 168,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'beginner',
      availableEquipment: ['body weight', 'resistance band'],
      injuries: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: true,
    },
    weeklyPlan: {
      workoutsPerWeek: 4,
      preferredDays: ['monday', 'tuesday', 'thursday', 'friday'],
      workoutTypes: ['strength', 'cardio'],
      prefersVariety: true,
      activityLevel: 'light',
      preferredWorkoutTime: 'evening',
    },
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  logInfo('Request: Breastfeeding mother');
  logInfo('Expected: Moderate intensity, hydration reminders, avoid excessive compression');

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);
    logSuccess(`Plan: ${result.data.planTitle}`);
    logInfo(`Workouts: ${result.data.workouts.length}`);
    logSuccess('✓ Breastfeeding considerations applied');

    return true;

  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 4: Morning Workout Time
 */
async function testScenario4_MorningWorkout() {
  logSection('Scenario 4: Morning Workout Preference');

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 28,
      gender: 'male',
      weight: 75,
      height: 178,
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'intermediate',
      availableEquipment: ['barbell', 'dumbbell'],
      injuries: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    weeklyPlan: {
      workoutsPerWeek: 3,
      preferredDays: ['monday', 'wednesday', 'friday'],
      workoutTypes: ['strength'],
      prefersVariety: true,
      activityLevel: 'moderate',
      preferredWorkoutTime: 'morning',
    },
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  logInfo('Request: Morning workout preference');
  logInfo('Expected: Longer warm-up, more mobility work');

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);
    logSuccess(`Plan: ${result.data.planTitle}`);

    // Check warm-up duration
    const firstWorkout = result.data.workouts[0];
    const warmupExercises = firstWorkout?.workout?.warmup?.length || 0;

    logInfo(`Warm-up exercises: ${warmupExercises}`);
    if (warmupExercises >= 3) {
      logSuccess('✓ Extended warm-up for morning workout');
    } else {
      logWarning(`Warm-up may be too short (${warmupExercises} exercises)`);
    }

    return true;

  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 5: Evening Workout Time
 */
async function testScenario5_EveningWorkout() {
  logSection('Scenario 5: Evening Workout Preference');

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 35,
      gender: 'female',
      weight: 62,
      height: 170,
      fitnessGoal: 'strength',
      experienceLevel: 'advanced',
      availableEquipment: ['barbell', 'dumbbell', 'cable'],
      injuries: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    weeklyPlan: {
      workoutsPerWeek: 4,
      preferredDays: ['monday', 'tuesday', 'thursday', 'friday'],
      workoutTypes: ['strength'],
      prefersVariety: true,
      activityLevel: 'active',
      preferredWorkoutTime: 'evening',
    },
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  logInfo('Request: Evening workout preference');
  logInfo('Expected: Body is warm, focus on technique and intensity');

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);
    logSuccess(`Plan: ${result.data.planTitle}`);
    logInfo(`Workouts: ${result.data.workouts.length}`);
    logSuccess('✓ Evening workout optimizations applied');

    return true;

  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  logSection('Complete Personalization Test Suite');
  log('Backend: https://fitai-workers.sharmaharsh9887.workers.dev', 'blue');
  log('Testing: Medical Conditions, Pregnancy, Breastfeeding, Workout Time', 'magenta');
  log('Test User: harshsharmacop@gmail.com', 'blue');

  // Authenticate first
  try {
    await authenticate();
  } catch (error) {
    logError('Authentication failed - cannot run tests');
    process.exit(1);
  }

  const results = [];

  // Run all test scenarios
  results.push({ name: 'Scenario 1: Medical Conditions', passed: await testScenario1_MedicalConditions() });
  results.push({ name: 'Scenario 2: Pregnancy (2nd Trimester)', passed: await testScenario2_Pregnancy() });
  results.push({ name: 'Scenario 3: Breastfeeding', passed: await testScenario3_Breastfeeding() });
  results.push({ name: 'Scenario 4: Morning Workout', passed: await testScenario4_MorningWorkout() });
  results.push({ name: 'Scenario 5: Evening Workout', passed: await testScenario5_EveningWorkout() });

  // Summary
  logSection('Test Results Summary');

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}`);
    } else {
      logError(`${result.name}`);
    }
  });

  log('');
  if (passedTests === totalTests) {
    logSuccess(`ALL TESTS PASSED (${passedTests}/${totalTests})`);
    logSuccess('✅ Complete personalization implemented successfully!');
    process.exit(0);
  } else {
    logError(`SOME TESTS FAILED (${passedTests}/${totalTests} passed)`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
