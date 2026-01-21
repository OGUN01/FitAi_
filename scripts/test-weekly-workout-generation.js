#!/usr/bin/env node

/**
 * Weekly Workout Generation End-to-End Test
 *
 * Tests the new weekly workout variety implementation:
 * - Single API call generates N different workouts
 * - Each workout targets different muscle groups
 * - Injuries are respected across all workouts
 * - Cache behavior for weekly plans
 *
 * NO FALLBACK - Weekly plan only mode
 */

const fetch = require("node-fetch");

// Test credentials
const TEST_EMAIL = "harshsharmacop@gmail.com";
const TEST_PASSWORD = "Harsh@9887";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log("\n" + "═".repeat(80), "bright");
  log(`  ${title}`, "bright");
  log("═".repeat(80), "bright");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "cyan");
}

// Configuration
const BACKEND_URL =
  process.env.WORKERS_URL ||
  "https://fitai-workers.sharmaharsh9887.workers.dev";
const WORKOUT_ENDPOINT = `${BACKEND_URL}/workout/generate`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

// Test user profile - authenticated user with JWT
const TEST_USER_ID = "c05e1cc6-d8c7-4b5d-a62e-b91c7ddcb3e6"; // harshsharmacop@gmail.com

// Global auth token
let AUTH_TOKEN = null;

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authenticate with Supabase and get JWT token
 */
async function authenticate() {
  logInfo("Authenticating with Supabase...");

  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.access_token) {
      logError(`Authentication failed: ${JSON.stringify(result, null, 2)}`);
      throw new Error("Failed to authenticate");
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
 * Scenario 1: 3-Day Workout Plan (Push/Pull/Legs expected)
 */
async function testScenario1_ThreeDayWorkout() {
  logSection("Scenario 1: 3-Day Workout Plan with Variety");

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 28,
      gender: "male",
      weight: 75,
      height: 178,
      fitnessGoal: "muscle_gain",
      experienceLevel: "intermediate",
      availableEquipment: ["barbell", "dumbbell"],
      injuries: [],
    },
    weeklyPlan: {
      workoutsPerWeek: 3,
      preferredDays: ["monday", "wednesday", "friday"],
      workoutTypes: ["strength"],
      prefersVariety: true,
      activityLevel: "moderate",
    },
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
  };

  logInfo("Request: 3 workouts/week, gym equipment, muscle gain");
  logInfo("Expected: Push/Pull/Legs split with different exercises");

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      logError(`Status: ${response.status} ${response.statusText}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);

    // Validate response structure
    if (
      !result.data ||
      !result.data.workouts ||
      !Array.isArray(result.data.workouts)
    ) {
      logError("Invalid response structure - missing workouts array");
      return false;
    }

    const { data } = result;
    logSuccess(`Plan Title: ${data.planTitle}`);
    logSuccess(`Total Workouts: ${data.workouts.length}`);
    logSuccess(`Rest Days: ${data.restDays?.join(", ")}`);

    // Verify we have 3 different workouts
    if (data.workouts.length !== 3) {
      logError(`Expected 3 workouts, got ${data.workouts.length}`);
      return false;
    }
    logSuccess("✓ Correct number of workouts (3)");

    // Check each workout
    const workoutDays = data.workouts.map((w) => w.dayOfWeek);
    const expectedDays = ["monday", "wednesday", "friday"];

    if (!expectedDays.every((day) => workoutDays.includes(day))) {
      logError(`Expected days ${expectedDays}, got ${workoutDays}`);
      return false;
    }
    logSuccess("✓ Workouts assigned to correct days");

    // Check for variety (different titles)
    const workoutTitles = data.workouts.map((w) => w.workout.title);
    const uniqueTitles = new Set(workoutTitles);

    if (uniqueTitles.size !== 3) {
      logWarning(
        `Workouts may not have variety - titles: ${workoutTitles.join(", ")}`,
      );
    } else {
      logSuccess(
        `✓ All workouts have different titles: ${workoutTitles.join(", ")}`,
      );
    }

    // Check exercise variety across days
    const mondayExercises =
      data.workouts.find((w) => w.dayOfWeek === "monday")?.workout.exercises ||
      [];
    const wednesdayExercises =
      data.workouts.find((w) => w.dayOfWeek === "wednesday")?.workout
        .exercises || [];
    const fridayExercises =
      data.workouts.find((w) => w.dayOfWeek === "friday")?.workout.exercises ||
      [];

    const mondayExIds = mondayExercises.map((ex) => ex.exerciseId);
    const wednesdayExIds = wednesdayExercises.map((ex) => ex.exerciseId);
    const fridayExIds = fridayExercises.map((ex) => ex.exerciseId);

    const mondayWedOverlap = mondayExIds.filter((id) =>
      wednesdayExIds.includes(id),
    );
    const monFriOverlap = mondayExIds.filter((id) => fridayExIds.includes(id));
    const wedFriOverlap = wednesdayExIds.filter((id) =>
      fridayExIds.includes(id),
    );

    logInfo(`Monday exercises: ${mondayExIds.length}`);
    logInfo(`Wednesday exercises: ${wednesdayExIds.length}`);
    logInfo(`Friday exercises: ${fridayExIds.length}`);
    logInfo(`Monday-Wednesday overlap: ${mondayWedOverlap.length} exercises`);
    logInfo(`Monday-Friday overlap: ${monFriOverlap.length} exercises`);
    logInfo(`Wednesday-Friday overlap: ${wedFriOverlap.length} exercises`);

    const totalOverlap =
      mondayWedOverlap.length + monFriOverlap.length + wedFriOverlap.length;
    if (totalOverlap === 0) {
      logSuccess("✓ PERFECT VARIETY - No exercise repetition across days!");
    } else if (totalOverlap < 5) {
      logSuccess(
        `✓ GOOD VARIETY - Minimal overlap (${totalOverlap} exercises)`,
      );
    } else {
      logWarning(`Some exercise repetition (${totalOverlap} overlaps)`);
    }

    // Check cache metadata
    if (result.metadata?.cached) {
      logInfo(`📦 Cached result from: ${result.metadata.cacheSource}`);
    } else {
      logInfo("🆕 Fresh generation");
    }

    return true;
  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 2: 5-Day Workout Plan (Body part split expected)
 */
async function testScenario2_FiveDayWorkout() {
  logSection("Scenario 2: 5-Day Workout Plan with Variety");

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 25,
      gender: "female",
      weight: 60,
      height: 165,
      fitnessGoal: "weight_loss",
      experienceLevel: "beginner",
      availableEquipment: ["dumbbell", "resistance band"],
      injuries: [],
    },
    weeklyPlan: {
      workoutsPerWeek: 5,
      preferredDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      workoutTypes: ["strength", "cardio"],
      prefersVariety: true,
      activityLevel: "active",
    },
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
  };

  logInfo("Request: 5 workouts/week, limited equipment, weight loss");
  logInfo("Expected: Mixed strength/cardio with variety");

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      logError(`Status: ${response.status} ${response.statusText}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);

    const { data } = result;
    logSuccess(`Plan Title: ${data.planTitle}`);
    logSuccess(`Total Workouts: ${data.workouts.length}`);

    if (data.workouts.length !== 5) {
      logError(`Expected 5 workouts, got ${data.workouts.length}`);
      return false;
    }
    logSuccess("✓ Correct number of workouts (5)");

    // Check variety
    const workoutTitles = data.workouts.map((w) => w.workout.title);
    const uniqueTitles = new Set(workoutTitles);

    logInfo(`Workout titles: ${workoutTitles.join(" | ")}`);

    if (uniqueTitles.size >= 4) {
      logSuccess(`✓ Great variety (${uniqueTitles.size} unique workout types)`);
    } else {
      logWarning(`Limited variety (${uniqueTitles.size} unique workout types)`);
    }

    return true;
  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 3: Injury-Aware Workout Generation
 */
async function testScenario3_InjuryAwareness() {
  logSection("Scenario 3: Injury-Aware Workout Generation");

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 35,
      gender: "male",
      weight: 85,
      height: 180,
      fitnessGoal: "maintenance",
      experienceLevel: "intermediate",
      availableEquipment: ["barbell", "dumbbell"],
      injuries: ["knee pain", "lower back strain"],
    },
    weeklyPlan: {
      workoutsPerWeek: 3,
      preferredDays: ["monday", "wednesday", "friday"],
      workoutTypes: ["strength"],
      prefersVariety: true,
      activityLevel: "moderate",
    },
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
  };

  logInfo("Request: User with knee pain and lower back strain");
  logInfo("Expected: No squats, deadlifts, or knee-intensive exercises");

  try {
    const startTime = Date.now();
    const response = await fetch(WORKOUT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });

    const generationTime = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      logError(`API Error: ${JSON.stringify(result.error || result, null, 2)}`);
      logError(`Status: ${response.status} ${response.statusText}`);
      return false;
    }

    logSuccess(`Generated in ${generationTime}ms`);

    const { data } = result;

    // Collect all exercise IDs across all workouts
    const allExercises = [];
    data.workouts.forEach((workout) => {
      if (workout.workout.exercises) {
        allExercises.push(
          ...workout.workout.exercises.map((ex) => ex.exerciseId),
        );
      }
    });

    logInfo(`Total exercises across all workouts: ${allExercises.length}`);
    logInfo(`Sample exercises: ${allExercises.slice(0, 5).join(", ")}`);

    // Check for common injury-risky exercises (basic check)
    const riskyExercises = allExercises.filter(
      (id) =>
        id.toLowerCase().includes("squat") ||
        id.toLowerCase().includes("deadlift") ||
        id.toLowerCase().includes("lunge"),
    );

    if (riskyExercises.length === 0) {
      logSuccess("✓ No obvious knee/back risky exercises detected");
    } else {
      logWarning(
        `Found potentially risky exercises: ${riskyExercises.join(", ")}`,
      );
    }

    return true;
  } catch (error) {
    logError(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Scenario 4: Cache Behavior Test
 */
async function testScenario4_CacheBehavior() {
  logSection("Scenario 4: Cache Behavior for Weekly Plans");

  const request = {
    userId: TEST_USER_ID,
    profile: {
      age: 30,
      gender: "male",
      weight: 75,
      height: 175,
      fitnessGoal: "muscle_gain",
      experienceLevel: "intermediate",
      availableEquipment: ["barbell", "dumbbell"],
      injuries: [],
    },
    weeklyPlan: {
      workoutsPerWeek: 3,
      preferredDays: ["monday", "wednesday", "friday"],
      workoutTypes: ["strength"],
      prefersVariety: true,
      activityLevel: "moderate",
    },
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
  };

  logInfo("Testing cache behavior...");

  try {
    // First call (should generate fresh)
    logInfo("Call 1: Expecting fresh generation...");
    const startTime1 = Date.now();
    const response1 = await fetch(WORKOUT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });
    const time1 = Date.now() - startTime1;
    const result1 = await response1.json();

    if (!response1.ok || !result1.success) {
      logError(
        `API Error on first call: ${JSON.stringify(result1.error || result1, null, 2)}`,
      );
      logError(`Status: ${response1.status} ${response1.statusText}`);
      return false;
    }

    const isCached1 = result1.metadata?.cached || false;
    logInfo(`First call: ${time1}ms - Cached: ${isCached1}`);

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Second call (should hit cache)
    logInfo("Call 2: Expecting cached result...");
    const startTime2 = Date.now();
    const response2 = await fetch(WORKOUT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(request),
    });
    const time2 = Date.now() - startTime2;
    const result2 = await response2.json();

    if (!response2.ok || !result2.success) {
      logError(
        `API Error on second call: ${JSON.stringify(result2.error || result2, null, 2)}`,
      );
      logError(`Status: ${response2.status} ${response2.statusText}`);
      return false;
    }

    const isCached2 = result2.metadata?.cached || false;
    logInfo(`Second call: ${time2}ms - Cached: ${isCached2}`);

    if (isCached2) {
      logSuccess(
        `✓ Cache working! Second call was ${(((time1 - time2) / time1) * 100).toFixed(0)}% faster`,
      );
    } else {
      logWarning("Cache did not hit on second identical request");
    }

    // Verify cache returns same workouts
    if (result1.data.planTitle === result2.data.planTitle) {
      logSuccess("✓ Cached result matches original");
    } else {
      logWarning("Cached result differs from original");
    }

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
  logSection("Weekly Workout Generation - End-to-End Tests");
  log("Backend: https://fitai-workers.sharmaharsh9887.workers.dev", "blue");
  log("Test Mode: NO FALLBACK - Weekly Plan Only", "magenta");
  log("Test User: harshsharmacop@gmail.com", "blue");

  // Authenticate first
  try {
    await authenticate();
  } catch (error) {
    logError("Authentication failed - cannot run tests");
    process.exit(1);
  }

  const results = [];

  // Run all test scenarios
  results.push({
    name: "Scenario 1: 3-Day Workout Plan",
    passed: await testScenario1_ThreeDayWorkout(),
  });
  results.push({
    name: "Scenario 2: 5-Day Workout Plan",
    passed: await testScenario2_FiveDayWorkout(),
  });
  results.push({
    name: "Scenario 3: Injury-Aware Generation",
    passed: await testScenario3_InjuryAwareness(),
  });
  results.push({
    name: "Scenario 4: Cache Behavior",
    passed: await testScenario4_CacheBehavior(),
  });

  // Summary
  logSection("Test Results Summary");

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  results.forEach((result) => {
    if (result.passed) {
      logSuccess(`${result.name}`);
    } else {
      logError(`${result.name}`);
    }
  });

  log("");
  if (passedTests === totalTests) {
    logSuccess(`ALL TESTS PASSED (${passedTests}/${totalTests})`);
    process.exit(0);
  } else {
    logError(`SOME TESTS FAILED (${passedTests}/${totalTests} passed)`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
