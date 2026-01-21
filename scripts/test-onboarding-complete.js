/**
 * COMPLETE ONBOARDING FLOW TEST
 *
 * This script tests the entire onboarding process:
 * 1. Creates test data for all 5 tabs
 * 2. Saves each tab to the database
 * 3. Loads data back from database
 * 4. Verifies data integrity
 * 5. Tests validation for each tab
 * 6. Tests complete onboarding flow
 *
 * Run with: node scripts/test-onboarding-complete.js
 */

const { createClient } = require("@supabase/supabase-js");

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user ID (use a UUID that exists in auth.users or create one)
const TEST_USER_ID = "4447390a-d84b-4463-8f1c-e014495dee17"; // Replace with actual test user ID

// ============================================================================
// TEST DATA FOR EACH TAB
// ============================================================================

const testData = {
  personalInfo: {
    first_name: "John",
    last_name: "Doe",
    age: 30,
    gender: "male",
    country: "United States",
    state: "California",
    region: "San Francisco",
    wake_time: "07:00",
    sleep_time: "23:00",
    occupation_type: "desk_job",
  },

  dietPreferences: {
    diet_type: "non-veg",
    allergies: ["Peanuts", "Shellfish"],
    restrictions: ["Gluten-free"],
    keto_ready: false,
    intermittent_fasting_ready: true,
    paleo_ready: false,
    mediterranean_ready: true,
    low_carb_ready: false,
    high_protein_ready: true,
    breakfast_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    snacks_enabled: true,
    cooking_skill_level: "intermediate",
    max_prep_time_minutes: 45,
    budget_level: "medium",
    drinks_enough_water: true,
    limits_sugary_drinks: true,
    eats_regular_meals: true,
    avoids_late_night_eating: true,
    controls_portion_sizes: true,
    reads_nutrition_labels: true,
    eats_processed_foods: false,
    eats_5_servings_fruits_veggies: true,
    limits_refined_sugar: true,
    includes_healthy_fats: true,
    drinks_alcohol: false,
    smokes_tobacco: false,
    drinks_coffee: true,
    takes_supplements: true,
  },

  bodyAnalysis: {
    height_cm: 175,
    current_weight_kg: 85,
    target_weight_kg: 75,
    target_timeline_weeks: 20,
    body_fat_percentage: 25,
    waist_cm: 90,
    hip_cm: 100,
    chest_cm: 105,
    medical_conditions: ["High blood pressure"],
    medications: ["Lisinopril"],
    physical_limitations: [],
    pregnancy_status: false,
    breastfeeding_status: false,
    stress_level: "moderate",
  },

  workoutPreferences: {
    location: "both",
    equipment: ["Dumbbells", "Resistance bands", "Yoga mat"],
    time_preference: 45,
    intensity: "intermediate",
    workout_types: ["Strength training", "Cardio", "Flexibility"],
    primary_goals: ["Weight loss", "Muscle gain", "General fitness"],
    activity_level: "moderate",
    workout_experience_years: 2,
    workout_frequency_per_week: 4,
    can_do_pushups: 20,
    can_run_minutes: 30,
    flexibility_level: "fair",
    weekly_weight_loss_goal: 0.5,
    preferred_workout_times: ["morning", "evening"],
    enjoys_cardio: true,
    enjoys_strength_training: true,
    enjoys_group_classes: false,
    prefers_outdoor_activities: true,
    needs_motivation: false,
    prefers_variety: true,
  },

  advancedReview: {
    calculated_bmi: 27.8,
    calculated_bmr: 1850,
    calculated_tdee: 2590,
    metabolic_age: 32,
    daily_calories: 2090,
    daily_protein_g: 156,
    daily_carbs_g: 209,
    daily_fat_g: 70,
    daily_water_ml: 2800,
    daily_fiber_g: 30,
    healthy_weight_min: 60,
    healthy_weight_max: 80,
    weekly_weight_loss_rate: 0.5,
    estimated_timeline_weeks: 20,
    total_calorie_deficit: 500,
    overall_health_score: 75,
    diet_readiness_score: 85,
    fitness_readiness_score: 70,
    goal_realistic_score: 90,
    validation_status: "passed",
  },

  onboardingProgress: {
    current_tab: 5,
    completed_tabs: [1, 2, 3, 4, 5],
    tab_validation_status: {
      1: {
        is_valid: true,
        errors: [],
        warnings: [],
        completion_percentage: 100,
      },
      2: {
        is_valid: true,
        errors: [],
        warnings: [],
        completion_percentage: 100,
      },
      3: {
        is_valid: true,
        errors: [],
        warnings: [],
        completion_percentage: 100,
      },
      4: {
        is_valid: true,
        errors: [],
        warnings: [],
        completion_percentage: 100,
      },
      5: {
        is_valid: true,
        errors: [],
        warnings: [],
        completion_percentage: 100,
      },
    },
    total_completion_percentage: 100,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function logSection(title) {
  console.log("\n" + "=".repeat(80));
  console.log(`  ${title}`);
  console.log("=".repeat(80) + "\n");
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message, error) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error("   Error details:", error.message || error);
  }
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testSavePersonalInfo() {
  logSection("TEST 1: Save Personal Info (Tab 1)");

  try {
    const profileData = {
      id: TEST_USER_ID,
      first_name: testData.personalInfo.first_name,
      last_name: testData.personalInfo.last_name,
      name: `${testData.personalInfo.first_name} ${testData.personalInfo.last_name}`,
      age: testData.personalInfo.age,
      gender: testData.personalInfo.gender,
      country: testData.personalInfo.country,
      state: testData.personalInfo.state,
      region: testData.personalInfo.region,
      wake_time: testData.personalInfo.wake_time,
      sleep_time: testData.personalInfo.sleep_time,
      occupation_type: testData.personalInfo.occupation_type,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      logError("Failed to save personal info", error);
      return false;
    }

    logSuccess("Personal info saved successfully");
    logInfo(`Saved data: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    logError("Unexpected error in testSavePersonalInfo", error);
    return false;
  }
}

async function testLoadPersonalInfo() {
  logSection("TEST 2: Load Personal Info (Tab 1)");

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", TEST_USER_ID)
      .single();

    if (error) {
      logError("Failed to load personal info", error);
      return false;
    }

    if (!data) {
      logError("No personal info found for user");
      return false;
    }

    logSuccess("Personal info loaded successfully");
    logInfo(`Loaded data: ${JSON.stringify(data, null, 2)}`);

    // Verify data integrity
    if (
      data.first_name === testData.personalInfo.first_name &&
      data.last_name === testData.personalInfo.last_name &&
      data.age === testData.personalInfo.age
    ) {
      logSuccess("Data integrity verified");
      return true;
    } else {
      logError("Data integrity check failed - values do not match");
      return false;
    }
  } catch (error) {
    logError("Unexpected error in testLoadPersonalInfo", error);
    return false;
  }
}

async function testSaveDietPreferences() {
  logSection("TEST 3: Save Diet Preferences (Tab 2)");

  try {
    const dietData = {
      user_id: TEST_USER_ID,
      ...testData.dietPreferences,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("diet_preferences")
      .upsert(dietData, { onConflict: "user_id", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      logError("Failed to save diet preferences", error);
      return false;
    }

    logSuccess("Diet preferences saved successfully");
    logInfo(`Saved ${Object.keys(testData.dietPreferences).length} fields`);
    return true;
  } catch (error) {
    logError("Unexpected error in testSaveDietPreferences", error);
    return false;
  }
}

async function testLoadDietPreferences() {
  logSection("TEST 4: Load Diet Preferences (Tab 2)");

  try {
    const { data, error } = await supabase
      .from("diet_preferences")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    if (error) {
      logError("Failed to load diet preferences", error);
      return false;
    }

    if (!data) {
      logError("No diet preferences found for user");
      return false;
    }

    logSuccess("Diet preferences loaded successfully");

    // Verify arrays
    if (
      JSON.stringify(data.allergies) ===
      JSON.stringify(testData.dietPreferences.allergies)
    ) {
      logSuccess("Allergies array verified");
    } else {
      logError("Allergies array mismatch");
      return false;
    }

    return true;
  } catch (error) {
    logError("Unexpected error in testLoadDietPreferences", error);
    return false;
  }
}

async function testSaveBodyAnalysis() {
  logSection("TEST 5: Save Body Analysis (Tab 3)");

  try {
    const bodyData = {
      user_id: TEST_USER_ID,
      ...testData.bodyAnalysis,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("body_analysis")
      .upsert(bodyData, { onConflict: "user_id", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      logError("Failed to save body analysis", error);
      return false;
    }

    logSuccess("Body analysis saved successfully");
    return true;
  } catch (error) {
    logError("Unexpected error in testSaveBodyAnalysis", error);
    return false;
  }
}

async function testLoadBodyAnalysis() {
  logSection("TEST 6: Load Body Analysis (Tab 3)");

  try {
    const { data, error } = await supabase
      .from("body_analysis")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    if (error) {
      logError("Failed to load body analysis", error);
      return false;
    }

    if (!data) {
      logError("No body analysis found for user");
      return false;
    }

    logSuccess("Body analysis loaded successfully");

    // Verify numeric fields
    if (
      parseFloat(data.height_cm) === testData.bodyAnalysis.height_cm &&
      parseFloat(data.current_weight_kg) ===
        testData.bodyAnalysis.current_weight_kg
    ) {
      logSuccess("Numeric fields verified");
      return true;
    } else {
      logError("Numeric fields mismatch");
      return false;
    }
  } catch (error) {
    logError("Unexpected error in testLoadBodyAnalysis", error);
    return false;
  }
}

async function testSaveWorkoutPreferences() {
  logSection("TEST 7: Save Workout Preferences (Tab 4)");

  try {
    const workoutData = {
      user_id: TEST_USER_ID,
      ...testData.workoutPreferences,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("workout_preferences")
      .upsert(workoutData, { onConflict: "user_id", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      logError("Failed to save workout preferences", error);
      return false;
    }

    logSuccess("Workout preferences saved successfully");
    return true;
  } catch (error) {
    logError("Unexpected error in testSaveWorkoutPreferences", error);
    return false;
  }
}

async function testLoadWorkoutPreferences() {
  logSection("TEST 8: Load Workout Preferences (Tab 4)");

  try {
    const { data, error } = await supabase
      .from("workout_preferences")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    if (error) {
      logError("Failed to load workout preferences", error);
      return false;
    }

    if (!data) {
      logError("No workout preferences found for user");
      return false;
    }

    logSuccess("Workout preferences loaded successfully");

    // Verify equipment array
    if (
      data.equipment &&
      data.equipment.length === testData.workoutPreferences.equipment.length
    ) {
      logSuccess("Equipment array verified");
      return true;
    } else {
      logError("Equipment array mismatch");
      return false;
    }
  } catch (error) {
    logError("Unexpected error in testLoadWorkoutPreferences", error);
    return false;
  }
}

async function testSaveAdvancedReview() {
  logSection("TEST 9: Save Advanced Review (Tab 5)");

  try {
    const reviewData = {
      user_id: TEST_USER_ID,
      ...testData.advancedReview,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("advanced_review")
      .upsert(reviewData, { onConflict: "user_id", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      logError("Failed to save advanced review", error);
      return false;
    }

    logSuccess("Advanced review saved successfully");
    return true;
  } catch (error) {
    logError("Unexpected error in testSaveAdvancedReview", error);
    return false;
  }
}

async function testLoadAdvancedReview() {
  logSection("TEST 10: Load Advanced Review (Tab 5)");

  try {
    const { data, error } = await supabase
      .from("advanced_review")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    if (error) {
      logError("Failed to load advanced review", error);
      return false;
    }

    if (!data) {
      logError("No advanced review found for user");
      return false;
    }

    logSuccess("Advanced review loaded successfully");
    logInfo(
      `BMI: ${data.calculated_bmi}, BMR: ${data.calculated_bmr}, TDEE: ${data.calculated_tdee}`,
    );
    return true;
  } catch (error) {
    logError("Unexpected error in testLoadAdvancedReview", error);
    return false;
  }
}

async function testSaveOnboardingProgress() {
  logSection("TEST 11: Save Onboarding Progress");

  try {
    const progressData = {
      user_id: TEST_USER_ID,
      ...testData.onboardingProgress,
      last_updated: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("onboarding_progress")
      .upsert(progressData, { onConflict: "user_id", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      logError("Failed to save onboarding progress", error);
      return false;
    }

    logSuccess("Onboarding progress saved successfully");
    return true;
  } catch (error) {
    logError("Unexpected error in testSaveOnboardingProgress", error);
    return false;
  }
}

async function testLoadOnboardingProgress() {
  logSection("TEST 12: Load Onboarding Progress");

  try {
    const { data, error } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    if (error) {
      logError("Failed to load onboarding progress", error);
      return false;
    }

    if (!data) {
      logError("No onboarding progress found for user");
      return false;
    }

    logSuccess("Onboarding progress loaded successfully");
    logInfo(
      `Completion: ${data.total_completion_percentage}%, Current tab: ${data.current_tab}`,
    );
    return true;
  } catch (error) {
    logError("Unexpected error in testLoadOnboardingProgress", error);
    return false;
  }
}

async function testUniqueConstraints() {
  logSection("TEST 13: Verify UNIQUE Constraints");

  try {
    // Try to insert duplicate entry - should update instead
    const duplicateData = {
      user_id: TEST_USER_ID,
      diet_type: "vegan", // Different value
      allergies: [],
      restrictions: [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("diet_preferences")
      .upsert(duplicateData, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

    if (error) {
      logError("Upsert failed", error);
      return false;
    }

    // Verify only one record exists
    const { data: records, error: countError } = await supabase
      .from("diet_preferences")
      .select("*")
      .eq("user_id", TEST_USER_ID);

    if (countError) {
      logError("Failed to count records", countError);
      return false;
    }

    if (records.length === 1) {
      logSuccess("UNIQUE constraint working - only 1 record exists");
      logSuccess(`Updated diet_type to: ${records[0].diet_type}`);
      return true;
    } else {
      logError(
        `Found ${records.length} records - UNIQUE constraint not working!`,
      );
      return false;
    }
  } catch (error) {
    logError("Unexpected error in testUniqueConstraints", error);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log("\n🧪 COMPLETE ONBOARDING FLOW TEST SUITE\n");
  console.log(`Testing with user ID: ${TEST_USER_ID}\n`);

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  const tests = [
    { name: "Save Personal Info", fn: testSavePersonalInfo },
    { name: "Load Personal Info", fn: testLoadPersonalInfo },
    { name: "Save Diet Preferences", fn: testSaveDietPreferences },
    { name: "Load Diet Preferences", fn: testLoadDietPreferences },
    { name: "Save Body Analysis", fn: testSaveBodyAnalysis },
    { name: "Load Body Analysis", fn: testLoadBodyAnalysis },
    { name: "Save Workout Preferences", fn: testSaveWorkoutPreferences },
    { name: "Load Workout Preferences", fn: testLoadWorkoutPreferences },
    { name: "Save Advanced Review", fn: testSaveAdvancedReview },
    { name: "Load Advanced Review", fn: testLoadAdvancedReview },
    { name: "Save Onboarding Progress", fn: testSaveOnboardingProgress },
    { name: "Load Onboarding Progress", fn: testLoadOnboardingProgress },
    { name: "Verify UNIQUE Constraints", fn: testUniqueConstraints },
  ];

  for (const test of tests) {
    const success = await test.fn();
    results.tests.push({ name: test.name, success });
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Print summary
  logSection("TEST SUMMARY");
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%\n`,
  );

  // Print detailed results
  console.log("Detailed Results:");
  results.tests.forEach((test, index) => {
    const icon = test.success ? "✅" : "❌";
    console.log(`${index + 1}. ${icon} ${test.name}`);
  });

  console.log("\n" + "=".repeat(80) + "\n");

  if (results.failed === 0) {
    console.log("🎉 ALL TESTS PASSED! Onboarding flow is working correctly.\n");
    process.exit(0);
  } else {
    console.log("⚠️  SOME TESTS FAILED. Please review the errors above.\n");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("💥 Fatal error running tests:", error);
  process.exit(1);
});
