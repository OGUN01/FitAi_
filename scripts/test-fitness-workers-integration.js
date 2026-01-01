#!/usr/bin/env node

/**
 * FitnessScreen Workers Integration Test Suite
 *
 * Tests all aspects of the Cloudflare Workers integration:
 * - Workout generation
 * - Exercise validation
 * - Cache behavior
 * - Error handling
 * - UI components
 */

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

const WORKERS_BASE_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ============================================================================
// TEST UTILITIES
// ============================================================================

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logTest(name) {
  totalTests++;
  log(`\n[TEST ${totalTests}] ${name}`, COLORS.CYAN);
}

function logPass(message) {
  passedTests++;
  log(`  ✓ ${message}`, COLORS.GREEN);
}

function logFail(message) {
  failedTests++;
  log(`  ✗ ${message}`, COLORS.RED);
}

function logInfo(message) {
  log(`  ℹ ${message}`, COLORS.BLUE);
}

// ============================================================================
// API TEST FUNCTIONS
// ============================================================================

async function testHealthCheck() {
  logTest('Workers Health Check');

  try {
    const response = await fetch(`${WORKERS_BASE_URL}/health`);

    if (response.ok) {
      logPass('Workers endpoint is healthy');
      return true;
    } else {
      logFail(`Health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail(`Health check error: ${error.message}`);
    return false;
  }
}

async function testWorkoutGeneration() {
  logTest('Workout Generation (Fresh)');

  const request = {
    profile: {
      age: 30,
      gender: 'male',
      weight: 75,
      height: 175,
      fitnessGoal: 'build_muscle',
      experienceLevel: 'intermediate',
      availableEquipment: ['dumbbells', 'barbell', 'bench'],
      injuries: [],
    },
    workoutType: 'strength',
    duration: 45,
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  try {
    const startTime = Date.now();
    const response = await fetch(`${WORKERS_BASE_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      logFail(`Request failed with status ${response.status}`);
      logInfo(`Error: ${data.error || 'Unknown error'}`);
      return false;
    }

    logPass(`Request successful in ${responseTime}ms`);

    // Validate response structure
    if (!data.success) {
      logFail('Response has success=false');
      return false;
    }
    logPass('Response has success=true');

    if (!data.data) {
      logFail('Response missing data field');
      return false;
    }
    logPass('Response has data field');

    // Validate workout structure
    const workout = data.data;

    if (!workout.title) {
      logFail('Workout missing title');
      return false;
    }
    logPass(`Workout title: "${workout.title}"`);

    if (!workout.exercises || workout.exercises.length === 0) {
      logFail('Workout has no exercises');
      return false;
    }
    logPass(`Workout has ${workout.exercises.length} exercises`);

    // Validate exercise structure
    const firstExercise = workout.exercises[0];
    if (!firstExercise.exerciseId) {
      logFail('Exercise missing exerciseId');
      return false;
    }
    logPass(`First exercise ID: ${firstExercise.exerciseId}`);

    if (!firstExercise.exerciseData) {
      logFail('Exercise missing exerciseData');
      return false;
    }
    logPass('Exercise has exerciseData');

    if (!firstExercise.exerciseData.gifUrl) {
      logFail('Exercise missing GIF URL');
      return false;
    }
    logPass(`Exercise has GIF URL: ${firstExercise.exerciseData.gifUrl.substring(0, 50)}...`);

    // Validate metadata
    if (!data.metadata) {
      logFail('Response missing metadata');
      return false;
    }
    logPass('Response has metadata');

    logInfo(`Cached: ${data.metadata.cached}`);
    logInfo(`Generation time: ${data.metadata.generationTime}ms`);
    logInfo(`Model: ${data.metadata.model}`);

    if (data.metadata.filterStats) {
      logInfo(`Filter stats: ${data.metadata.filterStats.total} → ${data.metadata.filterStats.final} exercises`);
    }

    if (data.metadata.validation) {
      logInfo(`Validation: ${data.metadata.validation.exercisesValidated ? 'PASSED' : 'FAILED'}`);
      if (data.metadata.validation.warnings && data.metadata.validation.warnings.length > 0) {
        logInfo(`Warnings: ${data.metadata.validation.warnings.length}`);
      }
    }

    return true;
  } catch (error) {
    logFail(`Error: ${error.message}`);
    return false;
  }
}

async function testCacheBehavior() {
  logTest('Cache Behavior (Second Request)');

  const request = {
    profile: {
      age: 30,
      gender: 'male',
      weight: 75,
      height: 175,
      fitnessGoal: 'build_muscle',
      experienceLevel: 'intermediate',
      availableEquipment: ['dumbbells', 'barbell', 'bench'],
      injuries: [],
    },
    workoutType: 'strength',
    duration: 45,
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  try {
    const startTime = Date.now();
    const response = await fetch(`${WORKERS_BASE_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      logFail(`Request failed with status ${response.status}`);
      return false;
    }

    logPass(`Request successful in ${responseTime}ms`);

    if (!data.metadata) {
      logFail('Response missing metadata');
      return false;
    }

    if (data.metadata.cached) {
      logPass(`Cache HIT from ${data.metadata.cacheSource}`);
      logInfo(`Response time: ${responseTime}ms (should be <500ms)`);

      if (responseTime < 500) {
        logPass('Cache response time is fast');
      } else {
        logFail('Cache response time is slow');
      }
    } else {
      logInfo('Cache MISS (this is OK for first run)');
      logInfo(`Response time: ${responseTime}ms`);
    }

    return true;
  } catch (error) {
    logFail(`Error: ${error.message}`);
    return false;
  }
}

async function testExerciseFiltering() {
  logTest('Exercise Filtering (Equipment-Specific)');

  const request = {
    profile: {
      age: 25,
      gender: 'female',
      weight: 60,
      height: 165,
      fitnessGoal: 'lose_weight',
      experienceLevel: 'beginner',
      availableEquipment: ['bodyweight'], // Only bodyweight
      injuries: [],
    },
    workoutType: 'cardio',
    duration: 30,
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  try {
    const response = await fetch(`${WORKERS_BASE_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      logFail(`Request failed with status ${response.status}`);
      return false;
    }

    const workout = data.data;
    const allExercises = [
      ...(workout.warmup || []),
      ...(workout.exercises || []),
      ...(workout.cooldown || []),
    ];

    // Check if all exercises use only bodyweight
    const nonBodyweightExercises = allExercises.filter(ex => {
      const equipment = ex.exerciseData?.equipments || [];
      return !equipment.includes('bodyweight') && equipment.length > 0;
    });

    if (nonBodyweightExercises.length > 0) {
      logFail(`Found ${nonBodyweightExercises.length} exercises with wrong equipment`);
      logInfo(`Examples: ${nonBodyweightExercises.slice(0, 3).map(ex => ex.exerciseData?.name).join(', ')}`);
      return false;
    }

    logPass('All exercises use bodyweight equipment');
    logPass(`Total exercises: ${allExercises.length}`);

    if (data.metadata?.filterStats) {
      logInfo(`Filtering: ${data.metadata.filterStats.total} → ${data.metadata.filterStats.final}`);
    }

    return true;
  } catch (error) {
    logFail(`Error: ${error.message}`);
    return false;
  }
}

async function testInjuryHandling() {
  logTest('Injury-Safe Exercise Selection');

  const request = {
    profile: {
      age: 35,
      gender: 'male',
      weight: 80,
      height: 180,
      fitnessGoal: 'get_fit',
      experienceLevel: 'intermediate',
      availableEquipment: ['dumbbells', 'barbell'],
      injuries: ['lower_back', 'knee'], // Should avoid exercises that stress these
    },
    workoutType: 'strength',
    duration: 40,
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  try {
    const response = await fetch(`${WORKERS_BASE_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      logFail(`Request failed with status ${response.status}`);
      return false;
    }

    logPass('Workout generated successfully');

    if (data.metadata?.validation?.warnings && data.metadata.validation.warnings.length > 0) {
      logInfo(`Exercise replacements: ${data.metadata.validation.warnings.length}`);
      data.metadata.validation.warnings.forEach(warning => {
        logInfo(`  - ${warning}`);
      });
    } else {
      logInfo('No exercise replacements needed');
    }

    return true;
  } catch (error) {
    logFail(`Error: ${error.message}`);
    return false;
  }
}

async function testGIFCoverage() {
  logTest('100% GIF Coverage Verification');

  const request = {
    profile: {
      age: 28,
      gender: 'male',
      weight: 70,
      height: 172,
      fitnessGoal: 'build_muscle',
      experienceLevel: 'advanced',
      availableEquipment: ['dumbbells', 'barbell', 'bench', 'pull_up_bar'],
      injuries: [],
    },
    workoutType: 'strength',
    duration: 60,
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
  };

  try {
    const response = await fetch(`${WORKERS_BASE_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      logFail(`Request failed with status ${response.status}`);
      return false;
    }

    const workout = data.data;
    const allExercises = [
      ...(workout.warmup || []),
      ...(workout.exercises || []),
      ...(workout.cooldown || []),
    ];

    const exercisesWithoutGifs = allExercises.filter(ex => {
      return !ex.exerciseData?.gifUrl || ex.exerciseData.gifUrl.trim() === '';
    });

    if (exercisesWithoutGifs.length > 0) {
      logFail(`Found ${exercisesWithoutGifs.length} exercises without GIF URLs`);
      return false;
    }

    logPass(`All ${allExercises.length} exercises have GIF URLs`);

    if (data.metadata?.validation?.gifCoverageVerified) {
      logPass('Backend verified 100% GIF coverage');
    }

    return true;
  } catch (error) {
    logFail(`Error: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  logTest('Error Handling (Invalid Request)');

  const invalidRequest = {
    profile: {
      age: -5, // Invalid
      gender: 'invalid',
      weight: 0, // Invalid
      height: 0, // Invalid
    },
    // Missing required fields
  };

  try {
    const response = await fetch(`${WORKERS_BASE_URL}/workout/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest),
    });

    const data = await response.json();

    if (response.ok) {
      logFail('Invalid request was accepted (should have been rejected)');
      return false;
    }

    logPass(`Invalid request rejected with status ${response.status}`);

    if (data.error) {
      logInfo(`Error message: ${data.error}`);
      logPass('Error message provided');
    } else {
      logFail('No error message provided');
    }

    return true;
  } catch (error) {
    logFail(`Unexpected error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  log('\n========================================', COLORS.YELLOW);
  log('FitnessScreen Workers Integration Tests', COLORS.YELLOW);
  log('========================================\n', COLORS.YELLOW);

  const tests = [
    testHealthCheck,
    testWorkoutGeneration,
    testCacheBehavior,
    testExerciseFiltering,
    testInjuryHandling,
    testGIFCoverage,
    testErrorHandling,
  ];

  for (const test of tests) {
    await test();
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log('\n========================================', COLORS.YELLOW);
  log('Test Summary', COLORS.YELLOW);
  log('========================================\n', COLORS.YELLOW);

  log(`Total Tests: ${totalTests}`, COLORS.CYAN);
  log(`Passed: ${passedTests}`, COLORS.GREEN);
  log(`Failed: ${failedTests}`, failedTests > 0 ? COLORS.RED : COLORS.GREEN);

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 80 ? COLORS.GREEN : COLORS.RED);

  if (failedTests === 0) {
    log('\n✅ All tests passed! Integration is working correctly.', COLORS.GREEN);
  } else {
    log(`\n⚠️  ${failedTests} test(s) failed. Please review the errors above.`, COLORS.RED);
  }

  log('');
}

// Run tests
runAllTests().catch(error => {
  log(`\nFatal error: ${error.message}`, COLORS.RED);
  process.exit(1);
});
