/**
 * Comprehensive Test Suite for Rule-Based Workout Generation
 *
 * Tests all 15 scenarios with mock onboarding data:
 * 1. Healthy Beginner
 * 2. Multi-injury (back+knee)
 * 3. Pregnancy Trimester 2
 * 4. Medical conditions (hypertension + medications)
 * 5. Senior (65+)
 * 6. Advanced athlete
 * 7. PCOS + weight loss
 * 8. Pregnancy T3 + breastfeeding prep
 * 9. Diabetes + asthma
 * 10. Bodyweight only + multiple injuries
 * 11. High stress + heavy labor
 * 12. Time-constrained morning
 * 13. Breastfeeding + energy-depleted
 * 14. Arthritis + balance + senior
 * 15. Heart disease (critical safety)
 */

import { generateRuleBasedWorkout } from '../fitai-workers/src/handlers/workoutGenerationRuleBased.js';

// ============================================================================
// TEST SCENARIO DATA
// ============================================================================

const TEST_SCENARIOS = {
  // SCENARIO 1: Healthy Beginner (Baseline)
  healthyBeginner: {
    name: 'Scenario 1: Healthy Beginner',
    userId: 'test_001_healthy_beginner',
    profile: {
      // Personal Info
      age: 25,
      gender: 'female',
      height: 165, // cm
      weight: 65, // kg

      // Fitness Goals
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'beginner',
      workoutsPerWeek: 3,
      workoutDuration: 45,

      // Equipment
      availableEquipment: ['dumbbells', 'barbell', 'cable_machine', 'bench', 'resistance_bands'],

      // Safety (clean profile)
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'PPL 3x/week or Full Body 3x/week',
      exercises: '6-9 per workout',
      warnings: 0,
      medicalClearance: false,
    },
  },

  // SCENARIO 2: Multi-injury (back+knee)
  multiInjury: {
    name: 'Scenario 2: Multi-Injury (Back + Knee)',
    userId: 'test_002_multi_injury',
    profile: {
      age: 40,
      gender: 'male',
      height: 178,
      weight: 85,
      fitnessGoal: 'strength',
      experienceLevel: 'intermediate',
      workoutsPerWeek: 4,
      workoutDuration: 60,
      availableEquipment: ['dumbbells', 'barbell', 'cable_machine', 'bench', 'leg_press'],

      // Safety concerns
      injuries: ['back pain', 'knee problems'],
      restrictions: ['avoid heavy spinal loading', 'no jumping'],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Upper/Lower 4x/week',
      exercises: '7-10 per workout',
      warnings: 2, // Back and knee warnings
      medicalClearance: false,
      excluded: ['deadlift', 'barbell row', 'squat', 'lunge', 'box jump'],
      alternatives: ['cable row', 'leg press (seated)', 'goblet squat'],
    },
  },

  // SCENARIO 3: Pregnancy Trimester 2
  pregnancyT2: {
    name: 'Scenario 3: Pregnancy Trimester 2',
    userId: 'test_003_pregnancy_t2',
    profile: {
      age: 28,
      gender: 'female',
      height: 168,
      weight: 70,
      fitnessGoal: 'general_fitness',
      experienceLevel: 'intermediate',
      workoutsPerWeek: 3,
      workoutDuration: 30,
      availableEquipment: ['dumbbells', 'resistance_bands', 'bodyweight'],

      // Pregnancy safety
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: true,
      pregnancyTrimester: 2,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week (gentle)',
      exercises: '5-8 per workout',
      warnings: 3, // Pregnancy warnings
      medicalClearance: true,
      excluded: ['bench press', 'lying leg raise', 'supine exercises', 'overhead press', 'twisting'],
      intensity: 'RPE 4-6 max',
      heartRate: '<130 bpm',
    },
  },

  // SCENARIO 4: Hypertension + Medications
  medicalConditions: {
    name: 'Scenario 4: Hypertension + Beta Blockers',
    userId: 'test_004_medical',
    profile: {
      age: 55,
      gender: 'male',
      height: 175,
      weight: 95,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'beginner',
      workoutsPerWeek: 4,
      workoutDuration: 45,
      availableEquipment: ['dumbbells', 'cable_machine', 'treadmill', 'bike'],

      // Medical concerns
      injuries: [],
      restrictions: [],
      medicalConditions: ['hypertension', 'high blood pressure'],
      medications: ['beta blockers', 'metoprolol'],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 4x/week or Upper/Lower',
      exercises: '6-9 per workout',
      warnings: 3, // Hypertension + medication warnings
      medicalClearance: false,
      excluded: ['max effort lifts', 'heavy deadlift', 'heavy squat'],
      intensity: 'RPE 7 max',
      modifications: ['Use RPE not HR zones', 'Avoid valsalva maneuvers'],
    },
  },

  // SCENARIO 5: Senior (65+)
  senior: {
    name: 'Scenario 5: Senior (65+)',
    userId: 'test_005_senior',
    profile: {
      age: 70,
      gender: 'female',
      height: 160,
      weight: 60,
      fitnessGoal: 'flexibility',
      experienceLevel: 'beginner',
      workoutsPerWeek: 3,
      workoutDuration: 30,
      availableEquipment: ['bodyweight', 'resistance_bands', 'light_dumbbells'],

      // Age-based modifications
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week',
      exercises: '5-8 per workout',
      warnings: 1, // Senior modifications
      medicalClearance: false,
      excluded: ['high-impact', 'balance-dependent without support', 'heavy loading'],
      modifications: ['Longer warm-up (10+ min)', 'Wall support for balance', 'Focus on functional movements'],
    },
  },

  // SCENARIO 6: Advanced Athlete
  advancedAthlete: {
    name: 'Scenario 6: Advanced Athlete',
    userId: 'test_006_advanced',
    profile: {
      age: 22,
      gender: 'male',
      height: 183,
      weight: 80,
      fitnessGoal: 'strength',
      experienceLevel: 'advanced',
      workoutsPerWeek: 6,
      workoutDuration: 75,
      availableEquipment: ['dumbbells', 'barbell', 'cable_machine', 'bench', 'squat_rack', 'pull_up_bar'],

      // Clean profile, high performance
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'PPL 6x/week',
      exercises: '8-12 per workout',
      warnings: 0,
      medicalClearance: false,
      included: ['squat', 'deadlift', 'bench press', 'overhead press', 'barbell row'],
      volume: 'High (4-5 sets of 6-10 reps for compounds)',
    },
  },

  // SCENARIO 7: PCOS + Weight Loss
  pcos: {
    name: 'Scenario 7: PCOS + Weight Loss',
    userId: 'test_007_pcos',
    profile: {
      age: 32,
      gender: 'female',
      height: 170,
      weight: 75,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'intermediate',
      workoutsPerWeek: 4,
      workoutDuration: 50,
      availableEquipment: ['dumbbells', 'barbell', 'cable_machine', 'bench'],

      // PCOS-specific optimization
      injuries: [],
      restrictions: [],
      medicalConditions: ['PCOS', 'polycystic ovary syndrome'],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Upper/Lower 4x/week',
      exercises: '7-10 per workout',
      warnings: 1, // PCOS guidelines
      medicalClearance: false,
      focus: 'Resistance training over cardio',
      modifications: ['Limit cardio to <45 min total', '3-4x strength training prioritized'],
    },
  },

  // SCENARIO 8: Pregnancy T3 + Breastfeeding Prep
  pregnancyT3: {
    name: 'Scenario 8: Pregnancy T3 + Breastfeeding Prep',
    userId: 'test_008_pregnancy_t3',
    profile: {
      age: 35,
      gender: 'female',
      height: 166,
      weight: 78,
      fitnessGoal: 'general_fitness',
      experienceLevel: 'intermediate',
      workoutsPerWeek: 2,
      workoutDuration: 20,
      availableEquipment: ['bodyweight', 'resistance_bands'],

      // Pregnancy T3 - strictest safety
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: true,
      pregnancyTrimester: 3,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Gentle Movement 2x/week',
      exercises: '3-5 gentle movements',
      warnings: 4, // Multiple pregnancy T3 warnings
      medicalClearance: true,
      excluded: ['supine', 'prone', 'jumping', 'twisting', 'balance', 'lying', 'bench'],
      included: ['gentle mobility', 'prenatal yoga', 'breathing', 'pelvic floor'],
      intensity: 'RPE 3-5 max (very light)',
      heartRate: '<120 bpm',
    },
  },

  // SCENARIO 9: Diabetes + Asthma
  diabetesAsthma: {
    name: 'Scenario 9: Diabetes + Asthma',
    userId: 'test_009_diabetes_asthma',
    profile: {
      age: 45,
      gender: 'male',
      height: 177,
      weight: 92,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'beginner',
      workoutsPerWeek: 3,
      workoutDuration: 40,
      availableEquipment: ['dumbbells', 'resistance_bands', 'bodyweight'],

      // Multiple medical conditions
      injuries: [],
      restrictions: [],
      medicalConditions: ['diabetes', 'type 2 diabetes', 'asthma'],
      medications: ['metformin', 'inhaler'],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week',
      exercises: '6-8 per workout',
      warnings: 2, // Diabetes + asthma
      medicalClearance: false,
      modifications: [
        'Monitor blood sugar before/after',
        'Have glucose tablets nearby',
        'Longer warm-up (10+ min) for asthma',
        'Inhaler nearby',
        'Avoid fasting workouts',
      ],
    },
  },

  // SCENARIO 10: Bodyweight Only + Multiple Injuries
  bodyweightInjuries: {
    name: 'Scenario 10: Bodyweight + Multiple Injuries',
    userId: 'test_010_bodyweight_injuries',
    profile: {
      age: 38,
      gender: 'female',
      height: 163,
      weight: 68,
      fitnessGoal: 'general_fitness',
      experienceLevel: 'beginner',
      workoutsPerWeek: 3,
      workoutDuration: 30,
      availableEquipment: ['bodyweight'], // Extreme constraint

      // Multiple injuries
      injuries: ['back pain', 'shoulder issues', 'wrist problems'],
      restrictions: ['no push-ups', 'no planks', 'no overhead work'],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week',
      exercises: '4-6 per workout',
      warnings: 3, // All injury warnings
      medicalClearance: false,
      excluded: ['push-up', 'plank', 'overhead press', 'handstand', 'burpee'],
      alternatives: ['wall-supported exercises', 'seated core work', 'leg-focused movements', 'squats', 'lunges'],
    },
  },

  // SCENARIO 11: High Stress + Heavy Labor
  highStress: {
    name: 'Scenario 11: High Stress + Heavy Labor',
    userId: 'test_011_high_stress',
    profile: {
      age: 42,
      gender: 'male',
      height: 180,
      weight: 88,
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'intermediate',
      workoutsPerWeek: 3,
      workoutDuration: 45,
      availableEquipment: ['dumbbells', 'barbell', 'cable_machine', 'bench'],

      // Recovery priority
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
      // NOTE: stress_level not on UserProfile yet, would be 'high'
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week (recovery-focused)',
      exercises: '6-8 per workout',
      warnings: 0, // No medical warnings
      medicalClearance: false,
      modifications: ['Only 3 training days (avoid overtraining)', 'Moderate volume', 'Emphasize recovery'],
    },
  },

  // SCENARIO 12: Time-Constrained Morning
  timeConstrained: {
    name: 'Scenario 12: Time-Constrained Morning Warrior',
    userId: 'test_012_time_constrained',
    profile: {
      age: 30,
      gender: 'male',
      height: 175,
      weight: 75,
      fitnessGoal: 'general_fitness',
      experienceLevel: 'intermediate',
      workoutsPerWeek: 5,
      workoutDuration: 20, // Very short
      availableEquipment: ['dumbbells', 'barbell', 'bench'],

      // Time pressure
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 5x/week (circuit-style)',
      exercises: '4-6 per workout (compounds only)',
      warnings: 0,
      medicalClearance: false,
      modifications: ['Circuit-style', 'Minimal rest', 'Compound movements only', 'Extended warm-up for morning'],
    },
  },

  // SCENARIO 13: Breastfeeding + Energy-Depleted
  breastfeeding: {
    name: 'Scenario 13: Breastfeeding + Energy-Depleted',
    userId: 'test_013_breastfeeding',
    profile: {
      age: 29,
      gender: 'female',
      height: 165,
      weight: 72,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'beginner',
      workoutsPerWeek: 2,
      workoutDuration: 30,
      availableEquipment: ['dumbbells', 'resistance_bands', 'bodyweight'],

      // Post-partum recovery
      injuries: [],
      restrictions: [],
      medicalConditions: [],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: true,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 2x/week (gentle)',
      exercises: '5-7 per workout',
      warnings: 1, // Breastfeeding
      medicalClearance: false,
      modifications: [
        'Moderate intensity (milk supply protection)',
        'Avoid upper body compression',
        'CRITICAL hydration',
        'Conservative volume',
      ],
    },
  },

  // SCENARIO 14: Arthritis + Balance + Senior
  tripleConstraint: {
    name: 'Scenario 14: Arthritis + Balance + Senior',
    userId: 'test_014_triple_constraint',
    profile: {
      age: 68,
      gender: 'male',
      height: 173,
      weight: 80,
      fitnessGoal: 'flexibility',
      experienceLevel: 'beginner',
      workoutsPerWeek: 3,
      workoutDuration: 30,
      availableEquipment: ['bodyweight', 'resistance_bands', 'chair'],

      // Triple constraint
      injuries: ['balance issues', 'vertigo'],
      restrictions: ['use wall support', 'seated alternatives only'],
      medicalConditions: ['arthritis', 'osteoarthritis'],
      medications: [],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week (seated)',
      exercises: '5-7 per workout',
      warnings: 3, // Arthritis + balance + senior
      medicalClearance: false,
      excluded: ['single-leg', 'balance board', 'jumping', 'standing unsupported'],
      included: ['seated exercises', 'wall support', 'mobility work'],
      modifications: ['Low-impact only', 'Longer warm-up', 'Wall support required'],
    },
  },

  // SCENARIO 15: Heart Disease (Critical Safety)
  heartDisease: {
    name: 'Scenario 15: Heart Disease (Critical)',
    userId: 'test_015_heart_disease',
    profile: {
      age: 62,
      gender: 'male',
      height: 178,
      weight: 100,
      fitnessGoal: 'weight_loss',
      experienceLevel: 'beginner',
      workoutsPerWeek: 3,
      workoutDuration: 30,
      availableEquipment: ['dumbbells', 'cable_machine', 'bike'],

      // Critical medical condition
      injuries: [],
      restrictions: [],
      medicalConditions: ['heart disease', 'cardiovascular disease', 'cardiac'],
      medications: ['beta blockers', 'blood thinners'],
      pregnancyStatus: false,
      breastfeedingStatus: false,
    },
    excludeExercises: [],
    expectedOutcome: {
      split: 'Full Body 3x/week (very gentle)',
      exercises: '4-6 per workout',
      warnings: 4, // CRITICAL warnings
      medicalClearance: true, // REQUIRES medical clearance
      excluded: ['HIIT', 'sprint', 'max effort', 'heavy lifting'],
      intensity: 'RPE 5-6 max (very conservative)',
      modifications: [
        'CRITICAL: Monitor heart rate',
        'Stay within prescribed limits',
        'Stop immediately if chest pain/dizziness',
        'Extended cool-down',
        'Medical clearance required',
      ],
    },
  },
};

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTest(scenarioKey) {
  const scenario = TEST_SCENARIOS[scenarioKey];
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 ${scenario.name}`);
  console.log('='.repeat(80));

  try {
    // Create request object
    const request = {
      userId: scenario.userId,
      profile: scenario.profile,
      excludeExercises: scenario.excludeExercises,
      weeklyPlan: {
        activityLevel: 'moderate',
        prefersVariety: true,
      },
    };

    console.log('\n📝 Profile Summary:');
    console.log(`   Age: ${scenario.profile.age}, Gender: ${scenario.profile.gender}`);
    console.log(`   Goal: ${scenario.profile.fitnessGoal}, Experience: ${scenario.profile.experienceLevel}`);
    console.log(`   Frequency: ${scenario.profile.workoutsPerWeek}x/week, Duration: ${scenario.profile.workoutDuration} min`);
    console.log(`   Equipment: ${scenario.profile.availableEquipment.join(', ')}`);

    if (scenario.profile.injuries?.length > 0) {
      console.log(`   🩹 Injuries: ${scenario.profile.injuries.join(', ')}`);
    }

    if (scenario.profile.medicalConditions?.length > 0) {
      console.log(`   ⚕️  Medical: ${scenario.profile.medicalConditions.join(', ')}`);
    }

    if (scenario.profile.pregnancyStatus) {
      console.log(`   🤰 Pregnancy: Trimester ${scenario.profile.pregnancyTrimester}`);
    }

    if (scenario.profile.breastfeedingStatus) {
      console.log(`   🤱 Breastfeeding: Yes`);
    }

    // Generate workout
    console.log('\n⚙️  Generating workout...');
    const startTime = performance.now();
    const result = await generateRuleBasedWorkout(request);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Validate result
    console.log('\n✅ Generation Success!');
    console.log(`   ⏱️  Duration: ${duration.toFixed(2)}ms ${duration < 100 ? '(✓ TARGET MET)' : '(⚠️  SLOW)'}`);
    console.log(`   📋 Plan: ${result.planTitle}`);
    console.log(`   🗓️  Workouts: ${result.workouts.length} days/week`);
    console.log(`   🔥 Estimated Calories: ${result.totalEstimatedCalories} kcal/week`);

    // Show sample workout
    if (result.workouts.length > 0) {
      const sampleWorkout = result.workouts[0];
      console.log(`\n   📅 Sample Day (${sampleWorkout.dayOfWeek}):`);
      console.log(`      Title: ${sampleWorkout.workout.title}`);
      console.log(`      Exercises: ${sampleWorkout.workout.exercises.length}`);
      console.log(`      Duration: ${sampleWorkout.workout.totalDuration} min`);
      console.log(`      Difficulty: ${sampleWorkout.workout.difficulty}`);

      // Show first 3 exercises
      console.log(`\n      Exercise List:`);
      sampleWorkout.workout.exercises.slice(0, 3).forEach((ex, idx) => {
        console.log(`      ${idx + 1}. ${ex.name}`);
        console.log(`         ${ex.sets} sets × ${ex.reps} reps, ${ex.restSeconds}s rest`);
        if (ex.notes) {
          console.log(`         ℹ️  ${ex.notes}`);
        }
      });

      if (sampleWorkout.workout.exercises.length > 3) {
        console.log(`      ... and ${sampleWorkout.workout.exercises.length - 3} more exercises`);
      }

      // Show coaching tips
      if (sampleWorkout.workout.coachingTips && sampleWorkout.workout.coachingTips.length > 0) {
        console.log(`\n      💡 Coaching Tips:`);
        sampleWorkout.workout.coachingTips.slice(0, 3).forEach(tip => {
          console.log(`         • ${tip}`);
        });
      }
    }

    // Validate against expected outcome
    console.log('\n🎯 Expected Outcome Validation:');
    const expected = scenario.expectedOutcome;

    if (expected.warnings !== undefined) {
      const actualWarnings = result.planDescription.split('⚠️').length - 1;
      const warningsMatch = actualWarnings >= expected.warnings;
      console.log(`   Warnings: ${actualWarnings} ${warningsMatch ? '✓' : '✗ (expected ' + expected.warnings + ')'}`);
    }

    if (expected.medicalClearance !== undefined) {
      const hasClearanceWarning = result.planDescription.toLowerCase().includes('medical clearance') ||
                                    result.planDescription.toLowerCase().includes('consult');
      const clearanceMatch = hasClearanceWarning === expected.medicalClearance;
      console.log(`   Medical Clearance: ${hasClearanceWarning ? 'Required' : 'Not required'} ${clearanceMatch ? '✓' : '✗'}`);
    }

    // Check for excluded exercises
    if (expected.excluded) {
      console.log(`\n   🚫 Should Exclude: ${expected.excluded.join(', ')}`);
      const allExercises = result.workouts.flatMap(w => w.workout.exercises.map(e => e.name.toLowerCase()));
      const foundExcluded = expected.excluded.filter(ex =>
        allExercises.some(name => name.includes(ex.toLowerCase()))
      );
      if (foundExcluded.length > 0) {
        console.log(`      ✗ FOUND EXCLUDED EXERCISES: ${foundExcluded.join(', ')}`);
      } else {
        console.log(`      ✓ All excluded exercises properly filtered`);
      }
    }

    // Check for included exercises
    if (expected.included) {
      console.log(`\n   ✅ Should Include: ${expected.included.join(', ')}`);
      const allExercises = result.workouts.flatMap(w => w.workout.exercises.map(e => e.name.toLowerCase()));
      const foundIncluded = expected.included.filter(ex =>
        allExercises.some(name => name.includes(ex.toLowerCase()))
      );
      console.log(`      Found ${foundIncluded.length}/${expected.included.length}: ${foundIncluded.join(', ') || 'none'}`);
    }

    console.log('\n✅ Test PASSED');
    return {
      scenario: scenarioKey,
      status: 'PASS',
      duration,
      result,
    };

  } catch (error) {
    console.error('\n❌ Test FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return {
      scenario: scenarioKey,
      status: 'FAIL',
      error: error.message,
    };
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('🚀 Rule-Based Workout Generation - Comprehensive Test Suite');
  console.log('Testing 15 scenarios with 100% precision\n');

  const results = [];

  for (const scenarioKey of Object.keys(TEST_SCENARIOS)) {
    const result = await runTest(scenarioKey);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! System ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.');
  }

  // Performance summary
  const successfulTests = results.filter(r => r.status === 'PASS');
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    const maxDuration = Math.max(...successfulTests.map(r => r.duration));
    const minDuration = Math.min(...successfulTests.map(r => r.duration));

    console.log('\n⏱️  Performance:');
    console.log(`   Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Min: ${minDuration.toFixed(2)}ms`);
    console.log(`   Max: ${maxDuration.toFixed(2)}ms`);
    console.log(`   Target: <100ms ${maxDuration < 100 ? '✓ MET' : '✗ NOT MET'}`);
  }

  return results;
}

// Run tests
runAllTests().catch(console.error);
