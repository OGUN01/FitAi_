/**
 * FitAI Workers - Rule-Based Workout Generation Handler
 *
 * MAIN ORCHESTRATOR: Ties together all rule-based modules
 *
 * Flow:
 * 1. Load exercise database (1500 exercises)
 * 2. Apply safety filter (injuries, medical, pregnancy, etc.)
 * 3. Apply equipment/experience filter (reuse existing)
 * 4. Select optimal workout split (scoring algorithm)
 * 5. Generate weekly exercise plan (classification, distribution, rotation)
 * 6. Assign workout structure (sets, reps, rest, tempo)
 * 7. Generate warmup/cooldown
 * 8. Generate coaching tips
 * 9. Return WeeklyWorkoutPlan (identical schema to LLM)
 *
 * PERFORMANCE TARGET: <100ms total generation time
 * COST: $0 (no API calls)
 * DETERMINISM: 100% (same inputs = same outputs)
 */

import type { WorkoutGenerationRequest, WorkoutResponse } from '../utils/validation';
import { loadExerciseDatabase, enrichExercises } from '../utils/exerciseDatabase';
import { applySafetyFilter, type UserSafetyProfile } from '../utils/safetyFilter';
import { selectOptimalSplit } from '../utils/workoutSplits';
import { generateWeeklyExercisePlan, validateMuscleBalance } from '../utils/exerciseSelection';
import {
  assignWorkoutParameters,
  generateCoachingTips,
  generateProgressionNotes,
  generateWarmup,
  generateCooldown,
  estimateCalories,
  type StructuredWorkout,
} from '../utils/workoutStructure';

// Note: We handle filtering manually since we already have safety-filtered exercises

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate rule-based workout plan
 * Returns same schema as LLM-based generation for backward compatibility
 */
export async function generateRuleBasedWorkout(
  request: WorkoutGenerationRequest
): Promise<WorkoutResponse> {

  const startTime = Date.now();

  console.log('[Rule-Based Generation] Starting generation', {
    userId: request.userId,
    frequency: request.profile.workoutsPerWeek,
    goal: request.profile.fitnessGoal,
    experience: request.profile.experienceLevel,
  });

  // ============================================================================
  // STEP 1: LOAD EXERCISE DATABASE
  // ============================================================================

  const db = await loadExerciseDatabase();
  let exercises = db.exercises;

  console.log(`[Rule-Based] Step 1: Loaded ${exercises.length} exercises`);

  // ============================================================================
  // STEP 2: APPLY SAFETY FILTER (NEW)
  // ============================================================================

  const safetyProfile: UserSafetyProfile = {
    injuries: request.profile.injuries,
    physical_limitations: request.profile.restrictions,
    medical_conditions: request.profile.medicalConditions,
    medications: request.profile.medications,
    pregnancy_status: request.profile.pregnancyStatus,
    pregnancy_trimester: request.profile.pregnancyTrimester,
    breastfeeding_status: request.profile.breastfeedingStatus,
    age: request.profile.age,
    stress_level: undefined, // TODO: Add to UserProfile schema
  };

  const safetyResult = applySafetyFilter(exercises, safetyProfile);

  exercises = safetyResult.safeExercises;

  console.log(`[Rule-Based] Step 2: Safety filter ${db.exercises.length} → ${exercises.length} exercises`, {
    excluded: safetyResult.excludedExercises.length,
    warnings: safetyResult.warnings.length,
    requiresClearance: safetyResult.requiresMedicalClearance,
  });

  // Add all safety warnings to response
  const allWarnings = [...safetyResult.warnings];

  // ============================================================================
  // STEP 3: APPLY EQUIPMENT & EXPERIENCE FILTER (REUSE EXISTING)
  // ============================================================================

  // Note: filterExercisesForWorkout expects WorkoutGenerationRequest
  // We already have filtered exercises from safety filter, so we'll do simple filtering here

  // Filter by available equipment
  exercises = exercises.filter(ex =>
    ex.equipments.some(eq =>
      request.profile.availableEquipment.map(e => e.toLowerCase()).includes(eq.toLowerCase())
    )
  );

  // Filter by excluded exercises
  if (request.excludeExercises && request.excludeExercises.length > 0) {
    const excludeSet = new Set(request.excludeExercises);
    exercises = exercises.filter(ex => !excludeSet.has(ex.exerciseId));
  }

  console.log(`[Rule-Based] Step 3: Equipment/experience filter ${safetyResult.safeExercises.length} → ${exercises.length} exercises`);

  // ============================================================================
  // STEP 4: CHECK MINIMUM EXERCISES
  // ============================================================================

  if (exercises.length < 20) {
    console.error('[Rule-Based] CRITICAL: Too few exercises after filtering', {
      remaining: exercises.length,
      originalCount: db.exercises.length,
    });

    // Return gentle movement plan fallback
    return generateGentleMovementFallback(request, allWarnings, safetyResult.requiresMedicalClearance);
  }

  // ============================================================================
  // STEP 5: SELECT OPTIMAL WORKOUT SPLIT
  // ============================================================================

  const splitResult = selectOptimalSplit(request.profile);
  const selectedSplit = splitResult.selectedSplit;

  console.log(`[Rule-Based] Step 5: Selected split "${selectedSplit.name}" (score: ${splitResult.score})`);

  // ============================================================================
  // STEP 6: GENERATE WEEKLY EXERCISE PLAN
  // ============================================================================

  const weekNumber = 1; // TODO: Get from user's current week in mesocycle
  const weeklyPlan = generateWeeklyExercisePlan(
    exercises,
    selectedSplit,
    request.profile,
    weekNumber
  );

  console.log(`[Rule-Based] Step 6: Generated ${weeklyPlan.workouts.length} workouts, ${weeklyPlan.totalExercisesPerWeek} total exercises`);

  // Validate muscle balance
  const balanceWarnings = validateMuscleBalance(weeklyPlan);
  if (balanceWarnings.length > 0) {
    console.warn('[Rule-Based] Muscle balance warnings:', balanceWarnings);
    allWarnings.push(...balanceWarnings);
  }

  // ============================================================================
  // STEP 7: ASSIGN WORKOUT STRUCTURE (SETS/REPS/REST)
  // ============================================================================

  const structuredWorkouts: StructuredWorkout[] = weeklyPlan.workouts.map((workoutDay) => {

    // Assign parameters to exercises
    const exercises = assignWorkoutParameters(workoutDay, request.profile, safetyProfile);

    // Generate warmup
    const warmup = generateWarmup(workoutDay.workoutType, 5);

    // Generate cooldown
    const cooldown = generateCooldown(workoutDay.workoutType, 5);

    // Generate coaching tips
    const coachingTips = generateCoachingTips(request.profile, workoutDay.workoutType, safetyProfile);

    // Generate progression notes
    const progressionNotes = generateProgressionNotes(request.profile, weekNumber);

    // Estimate calories
    const estimatedCalories = estimateCalories(
      exercises.length,
      request.profile.workoutDuration || 45,
      request.profile.experienceLevel,
      request.profile.weight,
      request.profile.fitnessGoal
    );

    // Calculate total duration
    const totalDuration = request.profile.workoutDuration || 45;

    // Generate title and description
    const title = `${workoutDay.workoutType} - ${selectedSplit.name}`;
    const description = generateWorkoutDescription(
      workoutDay.workoutType,
      selectedSplit.description,
      request.profile.fitnessGoal,
      allWarnings
    );

    return {
      title,
      description,
      totalDuration,
      difficulty: request.profile.experienceLevel,
      estimatedCalories,
      warmup,
      exercises,
      cooldown,
      coachingTips,
      progressionNotes,
    };
  });

  console.log(`[Rule-Based] Step 7: Structured ${structuredWorkouts.length} workouts with sets/reps/rest`);

  // ============================================================================
  // STEP 8: FORMAT AS WEEKLY WORKOUT PLAN (SAME SCHEMA AS LLM)
  // ============================================================================

  const dayOfWeekMap: Record<number, string> = {
    0: 'monday',
    1: 'tuesday',
    2: 'wednesday',
    3: 'thursday',
    4: 'friday',
    5: 'saturday',
    6: 'sunday',
  };

  const workouts = structuredWorkouts.map((workout, index) => {
    const suggestedDay = selectedSplit.workoutDays[index]?.suggestedDayOfWeek || dayOfWeekMap[index % 7];

    return {
      dayOfWeek: suggestedDay as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
      workout,
    };
  });

  const totalEstimatedCalories = structuredWorkouts.reduce((sum, w) => sum + w.estimatedCalories, 0);

  const response: WorkoutResponse = {
    id: `rule-based-${Date.now()}-${request.userId || 'guest'}`,
    planTitle: `${selectedSplit.name} - Week ${weekNumber}`,
    planDescription: generatePlanDescription(selectedSplit, request.profile, allWarnings),
    workouts,
    restDays: selectedSplit.restDays,
    totalEstimatedCalories,
  };

  // ============================================================================
  // STEP 9: ENRICH WITH FIXED GIF URLS
  // ============================================================================

  // Enrich all exercises with fixed GIF URLs
  for (const workout of response.workouts) {
    workout.workout.exercises = workout.workout.exercises.map(ex => {
      // Find original exercise to get GIF URL
      const originalExercise = exercises.find(e => e.exerciseId === ex.exerciseId);
      if (originalExercise) {
        return {
          ...ex,
          gifUrl: originalExercise.gifUrl,
        };
      }
      return ex;
    });
  }

  // ============================================================================
  // PERFORMANCE LOGGING
  // ============================================================================

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('[Rule-Based] ✅ Generation complete', {
    durationMs: duration,
    workouts: response.workouts.length,
    totalExercises: structuredWorkouts.reduce((sum, w) => sum + w.exercises.length, 0),
    warnings: allWarnings.length,
    targetMs: 100,
    performance: duration < 100 ? '✓ EXCELLENT' : duration < 200 ? '✓ GOOD' : '⚠️ SLOW',
  });

  return response;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate workout description
 */
function generateWorkoutDescription(
  workoutType: string,
  splitDescription: string,
  fitnessGoal: string,
  warnings: string[]
): string {

  let description = `${workoutType} workout focused on ${fitnessGoal.replace('_', ' ')}. `;
  description += splitDescription;

  if (warnings.length > 0) {
    description += '\n\n⚠️ SAFETY NOTES:\n';
    warnings.slice(0, 3).forEach(w => {
      description += `• ${w}\n`;
    });
  }

  return description;
}

/**
 * Generate plan-level description
 */
function generatePlanDescription(
  split: any,
  profile: any,
  warnings: string[]
): string {

  let description = `${split.name}: ${split.description}\n\n`;

  description += `🎯 Goal: ${profile.fitnessGoal.replace('_', ' ')}\n`;
  description += `📊 Experience: ${profile.experienceLevel}\n`;
  description += `⏱️ Duration: ${profile.workoutDuration || 45} minutes per session\n`;
  description += `📅 Frequency: ${profile.workoutsPerWeek}x per week\n`;

  if (warnings.length > 0) {
    description += `\n⚠️ SAFETY WARNINGS (${warnings.length}):\n`;
    warnings.slice(0, 5).forEach(w => {
      description += `• ${w}\n`;
    });

    if (warnings.length > 5) {
      description += `• ... and ${warnings.length - 5} more safety considerations\n`;
    }
  }

  description += `\n🤖 Generated with rule-based algorithm (deterministic, <100ms, $0 cost)`;

  return description;
}

/**
 * Generate gentle movement fallback plan for extreme constraints
 */
function generateGentleMovementFallback(
  request: WorkoutGenerationRequest,
  warnings: string[],
  requiresMedicalClearance: boolean
): WorkoutResponse {

  console.warn('[Rule-Based] Generating gentle movement fallback plan');

  const gentleWorkout: StructuredWorkout = {
    title: 'Gentle Movement & Mobility',
    description: `⚠️ SAFETY NOTICE: Very few exercises match your current safety profile. This plan focuses on gentle, low-risk movements suitable for your constraints.\n\n${warnings.slice(0, 3).join('\n')}`,
    totalDuration: 30,
    difficulty: 'beginner',
    estimatedCalories: 100,
    exercises: [
      {
        exerciseId: 'gentle_001',
        name: 'Walking (Light Pace)',
        sets: 1,
        reps: '15-20 minutes',
        restSeconds: 0,
        notes: 'Maintain comfortable pace, stop if any discomfort',
      },
      {
        exerciseId: 'gentle_002',
        name: 'Gentle Full-Body Stretching',
        sets: 1,
        reps: '10 minutes',
        restSeconds: 0,
        notes: 'Hold each stretch 20-30 seconds, never force',
      },
      {
        exerciseId: 'gentle_003',
        name: 'Seated Mobility Work',
        sets: 2,
        reps: '10',
        restSeconds: 30,
        notes: 'Arm circles, neck rolls, ankle rotations',
      },
      {
        exerciseId: 'gentle_004',
        name: 'Diaphragmatic Breathing Exercises',
        sets: 3,
        reps: '5 minutes',
        restSeconds: 60,
        notes: 'Slow, deep breaths - improves relaxation',
      },
    ],
    coachingTips: [
      '⚠️ This plan is highly limited due to multiple safety constraints',
      '👨‍⚕️ Please consult your healthcare provider before starting',
      '🛑 Stop immediately if you experience any pain or discomfort',
      '💧 Stay well-hydrated',
      requiresMedicalClearance
        ? '🏥 MEDICAL CLEARANCE REQUIRED before exercising'
        : '📞 Consider consulting a certified fitness professional',
    ],
    progressionNotes: 'Focus on consistency and comfort. Gradually increase duration as your condition improves. Work with your healthcare provider to expand your exercise options safely.',
  };

  return {
    id: `gentle-fallback-${Date.now()}`,
    planTitle: 'Gentle Movement Plan (Safety-Limited)',
    planDescription: `This plan is designed for your specific safety constraints. For a comprehensive personalized program, please consult your healthcare provider, a certified prenatal fitness specialist, or a physical therapist.\n\n⚠️ CONSTRAINTS:\n${warnings.slice(0, 5).join('\n')}`,
    workouts: [
      { dayOfWeek: 'monday', workout: gentleWorkout },
      { dayOfWeek: 'thursday', workout: gentleWorkout },
    ],
    restDays: ['tuesday', 'wednesday', 'friday', 'saturday', 'sunday'],
    totalEstimatedCalories: 200,
  };
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Wrapper with performance monitoring
 */
export async function generateRuleBasedWorkoutWithMetrics(
  request: WorkoutGenerationRequest
): Promise<{ response: WorkoutResponse; metrics: any }> {

  // Note: Cloudflare Workers don't have process.memoryUsage()
  // Use performance.now() for timing only
  const startTime = performance.now();

  const response = await generateRuleBasedWorkout(request);

  const endTime = performance.now();

  const metrics = {
    durationMs: Math.round(endTime - startTime),
    workoutsGenerated: response.workouts.length,
    totalExercises: response.workouts.reduce((sum, w) => sum + w.workout.exercises.length, 0),
    timestamp: new Date().toISOString(),
  };

  return { response, metrics };
}
