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
import { generateWeeklyExercisePlan, validateMuscleBalance, rebalanceMuscleBalance } from '../utils/exerciseSelection';
import {
	assignWorkoutParameters,
	generateCoachingTips,
	generateProgressionNotes,
	generateWarmup,
	generateCooldown,
	estimateCalories,
	type StructuredWorkout,
	type WorkoutExercise,
} from '../utils/workoutStructure';
import { shouldExcludeExercise, findSubstitute } from '../utils/injurySubstitutions';

// Note: We handle filtering manually since we already have safety-filtered exercises

// ============================================================================
// LIMITATION VOCABULARY NORMALIZATION
// ============================================================================

/**
 * SUBSTITUTION_RULES (injurySubstitutions.ts) uses an underscored vocabulary
 * ('knee_pain', 'lower_back_pain', 'shoulder_pain', 'wrist_pain', 'elbow_pain',
 * 'hip_pain', 'neck_pain') that does NOT match the app's actual onboarding
 * values from PHYSICAL_LIMITATIONS_OPTIONS ('back-pain', 'knee-problems',
 * 'shoulder-issues', 'neck-problems', 'wrist-problems', etc — hyphenated and
 * differently worded). Without this mapping, shouldExcludeExercise/
 * findSubstitute never match any real onboarding value and Step 3b never
 * fires for any real user.
 */
const LIMITATION_ALIASES: Record<string, string> = {
	'back-pain': 'lower_back_pain',
	'back_pain': 'lower_back_pain',
	'knee-problems': 'knee_pain',
	'knee_problems': 'knee_pain',
	'shoulder-issues': 'shoulder_pain',
	'shoulder_issues': 'shoulder_pain',
	'neck-problems': 'neck_pain',
	'neck_problems': 'neck_pain',
	'wrist-problems': 'wrist_pain',
	'wrist_problems': 'wrist_pain',
	'hip-pain': 'hip_pain',
	'hip-groin': 'hip_pain',
	'elbow-pain': 'elbow_pain',
};

function canonicalizeLimitation(raw: string): string {
	const key = raw.trim().toLowerCase();
	return LIMITATION_ALIASES[key] ?? key.replace(/-/g, '_');
}

/**
 * FIX I: Per-day minimum-exercise fallback. selectExercisesForDay() has no
 * guard for a day whose targeted body parts/muscles have zero surviving
 * candidates after safety filtering (e.g. a dedicated "Legs" day for a user
 * with a knee injury, since the coarse knee_problems rule excludes ALL
 * "upper legs"/"lower legs"/"legs" bodyParts wholesale). The aggregate
 * Step 4 pool-size guard (`exercises.length < 20`) doesn't catch this — a
 * 300-exercise upper-body-heavy pool clears it easily while one specific day
 * still ships with `exercises: []`. Used when a day resolves to 0 exercises
 * after selection so we never ship a workout with only warmup/cooldown.
 */
const GENTLE_DAY_FALLBACK_EXERCISES: WorkoutExercise[] = [
	{
		exerciseId: 'gentle_003',
		name: 'Seated Mobility Work',
		sets: 2,
		reps: '10',
		restSeconds: 30,
		notes: 'Arm circles, neck rolls, ankle rotations — gentle range-of-motion work',
	},
	{
		exerciseId: 'gentle_001',
		name: 'Walking (Light Pace)',
		sets: 1,
		reps: '15-20 minutes',
		restSeconds: 0,
		notes: 'Maintain a comfortable pace, stop if any discomfort',
	},
	{
		exerciseId: 'gentle_002',
		name: 'Gentle Full-Body Stretching',
		sets: 1,
		reps: '10 minutes',
		restSeconds: 0,
		notes: 'Hold each stretch 20-30 seconds, never force',
	},
];

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate rule-based workout plan
 * Returns same schema as LLM-based generation for backward compatibility
 */
export async function generateRuleBasedWorkout(request: WorkoutGenerationRequest): Promise<WorkoutResponse> {
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
		stress_level: request.profile.stressLevel,
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

	// FIX E: Pre-compute a lowercase Set so both sides of the comparison are
	// normalised and the lookup is O(1) rather than O(n) per exercise.
	const availableEquipmentLC = new Set(request.profile.availableEquipment.map((e) => e.toLowerCase()));
	exercises = exercises.filter((ex) =>
		ex.equipments.some((eq) => availableEquipmentLC.has(eq.toLowerCase())),
	);

	// Filter by excluded exercises
	if (request.excludeExercises && request.excludeExercises.length > 0) {
		const excludeSet = new Set(request.excludeExercises);
		exercises = exercises.filter((ex) => !excludeSet.has(ex.exerciseId));
	}

	console.log(`[Rule-Based] Step 3: Equipment/experience filter ${safetyResult.safeExercises.length} → ${exercises.length} exercises`);

	// ============================================================================
	// STEP 3b: INJURY SUBSTITUTION
	// Add injury-safe substitutes back into the pool so no muscle group is left
	// untrainable. The safety filter removed injury-contraindicated exercises;
	// here we ensure a safe equivalent is available for every excluded exercise.
	// ============================================================================

	// FIX H: Canonicalize onboarding's hyphenated limitation values to the
	// underscored vocabulary SUBSTITUTION_RULES expects (see LIMITATION_ALIASES
	// above) — otherwise shouldExcludeExercise/findSubstitute never match.
	const userLimitations = [
		...(request.profile.injuries ?? []),
		...(request.profile.restrictions ?? []),
	].map((s) => canonicalizeLimitation(s));

	if (userLimitations.length > 0) {
		const exerciseIdsInPool = new Set(exercises.map((e) => e.exerciseId));
		const substitutesAdded: string[] = [];

		// FIX F: Build a Set of all safety-excluded IDs (and why they were
		// excluded) so we can guard against circular substitution while still
		// allowing curated, injury-specific substitutes through.
		const excludedReasonsById = new Map<string, string[]>();
		for (const excluded of safetyResult.excludedExercises) {
			const id = excluded.exercise?.exerciseId;
			if (typeof id === 'string') {
				excludedReasonsById.set(id, excluded.reasons ?? []);
			}
		}
		const safetyExcludedIds = new Set(excludedReasonsById.keys());

		// A substitute that was ALSO excluded by the safety filter is only a
		// problem if it was excluded for a reason unrelated to this specific
		// injury's coarse body-part category (e.g. pregnancy, a medical
		// condition, or a different injury). safetyFilter.ts's per-injury
		// bodyPart exclusion is intentionally coarse (e.g. "knee_problems"
		// excludes ALL "upper legs"/"lower legs" exercises), which is exactly
		// why SUBSTITUTION_RULES exists as a curated, more specific safe list —
		// so a "Targets <bodyPart> (injured area)" exclusion reason alone must
		// NOT block a curated substitute, or Step 3b can never add anything
		// back for the injury it's designed to serve.
		const isBlockedForUnrelatedReason = (candidateId: string): boolean => {
			const reasons = excludedReasonsById.get(candidateId);
			if (!reasons || reasons.length === 0) return false;
			return reasons.some((r) => !/: Targets .+\(injured area\)$/.test(r));
		};

		// FIX G: shouldExcludeExercise/findSubstitute match SUBSTITUTION_RULES'
		// excludePatterns/substituteWith (underscored slugs like 'leg_curl',
		// 'romanian_deadlift') against whatever id string they're given. The
		// real exercise database (exercisedb.dev) uses opaque random
		// exerciseId hashes ('VPPtusI') that never contain these patterns —
		// only the exercise NAME does ('lever lying leg curl'). Slugify the
		// name (spaces → underscores) for matching, and search the
		// equipment-filtered FULL exercise database (not the already
		// safety-filtered `exercises` pool) so a genuinely new substitute is
		// reachable — searching within `exercises` made the
		// `!exerciseIdsInPool.has(sub)` guard below permanently false, since
		// anything found there was, by construction, already present.
		const nameSlug = (name: string) => name.toLowerCase().trim().replace(/[\s-]+/g, '_');

		const equipmentFilteredFull = db.exercises.filter((ex) =>
			ex.equipments.some((eq) => availableEquipmentLC.has(eq.toLowerCase())),
		);
		const slugToExercise = new Map<string, (typeof equipmentFilteredFull)[number]>();
		for (const ex of equipmentFilteredFull) {
			const slug = nameSlug(ex.name);
			if (!slugToExercise.has(slug)) slugToExercise.set(slug, ex);
		}
		const equipmentFilteredSlugs = Array.from(slugToExercise.keys());

		for (const excluded of safetyResult.excludedExercises) {
			const excludedExercise = excluded.exercise;
			const excludedId = excludedExercise?.exerciseId;
			if (typeof excludedId !== 'string' || !excludedExercise) continue;

			const excludedSlug = nameSlug(excludedExercise.name);
			if (!shouldExcludeExercise(excludedSlug, userLimitations)) continue;

			const subSlug = findSubstitute(excludedSlug, userLimitations, equipmentFilteredSlugs);
			if (!subSlug) continue;

			const subExercise = slugToExercise.get(subSlug);
			if (!subExercise) continue;
			const sub = subExercise.exerciseId;

			if (safetyExcludedIds.has(sub) && isBlockedForUnrelatedReason(sub)) {
				console.warn(`[Rule-Based] Step 3b: Substitute "${subExercise.name}" for "${excludedExercise.name}" is contraindicated for an unrelated reason — skipping`);
				continue;
			}

			if (!exerciseIdsInPool.has(sub)) {
				exercises.push(subExercise);
				exerciseIdsInPool.add(sub);
				substitutesAdded.push(`${excludedExercise.name} → ${subExercise.name}`);
			}
		}

		if (substitutesAdded.length > 0) {
			console.log(`[Rule-Based] Step 3b: Added ${substitutesAdded.length} injury substitutes`, substitutesAdded);
		}
	}

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

	// BUG-FIX: Client sends workoutsPerWeek, prefersVariety, activityLevel inside
	// request.weeklyPlan, but selectOptimalSplit reads them from profile.
	// Zod defaults profile.workoutsPerWeek to 4 when not sent — so every user was
	// getting Upper/Lower 4x regardless of their actual preference.
	// Merge weeklyPlan fields into profile so the scoring engine sees real values.
	const enrichedProfile = {
		...request.profile,
		workoutsPerWeek: request.weeklyPlan?.workoutsPerWeek ?? request.profile.workoutsPerWeek,
		prefersVariety: request.weeklyPlan?.prefersVariety ?? request.profile.prefersVariety,
		activityLevel: request.weeklyPlan?.activityLevel ?? request.profile.activityLevel,
	};

	const splitResult = selectOptimalSplit(enrichedProfile);
	const selectedSplit = splitResult.selectedSplit;

	console.log(`[Rule-Based] Step 5: Selected split "${selectedSplit.name}" (score: ${splitResult.score})`);

	// ============================================================================
	// STEP 6: GENERATE WEEKLY EXERCISE PLAN
	// ============================================================================

	const weekNumber = request.weekNumber ?? 1;
	const regenerationSeed = request.regenerationSeed ?? 0;
	const weeklyPlan = generateWeeklyExercisePlan(exercises, selectedSplit, enrichedProfile, weekNumber, regenerationSeed);

	console.log(`[Rule-Based] Step 6: Generated ${weeklyPlan.workouts.length} workouts, ${weeklyPlan.totalExercisesPerWeek} total exercises`);

	// Validate muscle balance, then FIX any deficit by injecting exercises for
	// under-hit major groups (pectorals/lats/quads/hamstrings/delts to >=2x/week).
	// Previously this only warned — a 4-day plan could ship with chest 0x.
	const balanceWarnings = validateMuscleBalance(weeklyPlan);
	if (balanceWarnings.length > 0) {
		console.warn('[Rule-Based] Muscle balance warnings before rebalance:', balanceWarnings);
		const residualWarnings = rebalanceMuscleBalance(weeklyPlan, exercises);
		if (residualWarnings.length > 0) {
			console.warn('[Rule-Based] Muscle balance warnings after rebalance:', residualWarnings);
			allWarnings.push(...residualWarnings);
		}
	}

	// ============================================================================
	// STEP 7: ASSIGN WORKOUT STRUCTURE (SETS/REPS/REST)
	// ============================================================================

	const structuredWorkouts: StructuredWorkout[] = weeklyPlan.workouts.map((workoutDay) => {
		// FIX I: per-day 0-exercise guard — see GENTLE_DAY_FALLBACK_EXERCISES
		// comment above. This can happen even though the aggregate Step 4
		// pool-size check passed, because that check only looks at the total
		// pool, not each day's specific targeted body parts/muscles.
		if (workoutDay.exercises.length === 0) {
			console.warn(
				`[Rule-Based] Step 7: "${workoutDay.dayName}" (${workoutDay.workoutType}) resolved to 0 exercises after selection — substituting gentle-movement block`,
			);
			allWarnings.push(
				`Your ${workoutDay.workoutType} day had no exercises available given your current safety constraints, so we substituted a gentle mobility & movement block for that day. Consider consulting a physical therapist for a tailored program.`,
			);

			return {
				title: `Gentle Movement - ${selectedSplit.name}`,
				description: `⚠️ SAFETY NOTICE: Your usual ${workoutDay.workoutType} exercises were all excluded by your current safety constraints. This day focuses on gentle, low-risk movement instead.`,
				totalDuration: enrichedProfile.workoutDuration,
				difficulty: enrichedProfile.experienceLevel,
				estimatedCalories: 100,
				warmup: generateWarmup(workoutDay.workoutType, 5),
				exercises: GENTLE_DAY_FALLBACK_EXERCISES.map((ex) => ({ ...ex })),
				cooldown: generateCooldown(workoutDay.workoutType, 5),
				coachingTips: [
					'⚠️ Exercises for this day were substituted due to your current safety profile',
					'👨‍⚕️ Consider consulting a physical therapist for a tailored program covering this muscle group',
					'🛑 Stop immediately if you experience any pain or discomfort',
				],
				progressionNotes:
					'Focus on comfort and consistency for this day. Revisit with your healthcare provider as your condition improves.',
			};
		}

		// Assign parameters to exercises — pass weekNumber so mesocycle progressive
		// overload (week-over-week sets/reps/rest scaling) is actually applied.
		const exercises = assignWorkoutParameters(workoutDay, enrichedProfile, safetyProfile, weekNumber);

		// Generate warmup
		const warmup = generateWarmup(workoutDay.workoutType, 5);

		// Generate cooldown
		const cooldown = generateCooldown(workoutDay.workoutType, 5);

		// Generate coaching tips
		const coachingTips = generateCoachingTips(enrichedProfile, workoutDay.workoutType, safetyProfile);

		// Generate progression notes
		const progressionNotes = generateProgressionNotes(enrichedProfile, weekNumber);

		// Estimate calories for the strength component only.
		// Cardio boost calories are added separately in Step 7b.
		const estimatedCalories = estimateCalories(
			exercises.length,
			enrichedProfile.workoutDuration,
			enrichedProfile.experienceLevel,
			enrichedProfile.weight,
			enrichedProfile.fitnessGoal,
			enrichedProfile.tdee, // TDEE from advanced_review — used for precision calorie estimates
		);

		// Strength session duration only; cardio minutes added in Step 7b
		const totalDuration = enrichedProfile.workoutDuration;

		// Generate title and description
		const title = `${workoutDay.workoutType} - ${selectedSplit.name}`;
		const description = generateWorkoutDescription(
			workoutDay.workoutType,
			selectedSplit.description,
			enrichedProfile.fitnessGoal,
			allWarnings,
		);

		return {
			title,
			description,
			totalDuration,
			difficulty: enrichedProfile.experienceLevel,
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
	// STEP 7b: APPEND CARDIO BOOST BLOCK (when user selected boost pace card)
	//
	// Scenarios:
	//   boost option selected  → boostExtraCardioMinutes > 0 → add explicit cardio
	//   aggressive / recommended / conservative pace → 0 → no cardio block added
	//
	// Equipment priority: stationary bike > treadmill/leverage > any bodyweight cardio
	// Rotation: different exercise per day for variety (matches prefers_variety preference)
	// ============================================================================

	const boostMinutes = request.boostExtraCardioMinutes ?? 0;

	if (boostMinutes > 0) {
		// Build cardio pool: bodyParts='cardio' OR target='cardiovascular system'
		const cardioPool = exercises.filter((ex) => {
			const bodyPartsLower = ex.bodyParts.map((b) => b.toLowerCase());
			const musclesLower = ex.targetMuscles.map((m) => m.toLowerCase());
			return (
				bodyPartsLower.includes('cardio') ||
				musclesLower.includes('cardiovascular system')
			);
		});

		// Sort pool: machine-based first (stationary bike, then leverage machine), then bodyweight
		const machinePriority = (ex: typeof cardioPool[0]) => {
			const eq = ex.equipments.map((e) => e.toLowerCase());
			if (eq.includes('stationary bike')) return 0;
			if (eq.includes('leverage machine')) return 1;
			return 2; // bodyweight cardio
		};
		const sortedCardioPool = [...cardioPool].sort((a, b) => machinePriority(a) - machinePriority(b));

		// Exclude 'walking on incline treadmill' (needs treadmill equipment — prefer bike for fat-burn)
		// and ensure we have enough variety for rotation
		const rotationPool = sortedCardioPool.length > 0 ? sortedCardioPool : cardioPool;

		if (rotationPool.length > 0) {
			const cardioMinutesMain = Math.round(boostMinutes * 0.85); // e.g. 25 min main
			const cardioMinutesCooldown = boostMinutes - cardioMinutesMain;  // e.g. 5 min cooldown

			// Calorie rate: ~7 kcal/min for moderate steady-state, weight-scaled
			const cardioCaloriesPerSession = Math.round(boostMinutes * 7 * ((enrichedProfile.weight ?? 75) / 75));

			structuredWorkouts.forEach((workout, dayIndex) => {
				// Rotate through pool per day — day 0 gets pool[0], day 1 gets pool[1], etc.
				const primaryCardio = rotationPool[dayIndex % rotationPool.length];
				// Cooldown always uses the same exercise (lower intensity variant)
				const cooldownCardio = rotationPool[(dayIndex + 1) % rotationPool.length];

				const cardioExercise: import('../utils/workoutStructure').WorkoutExercise = {
					exerciseId: primaryCardio.exerciseId,
					name: primaryCardio.name,
					sets: 1,
					reps: `${cardioMinutesMain} minutes`,
					restSeconds: 0,
					notes: `🔥 Cardio boost (${boostMinutes}-min fat-burn block). Maintain a steady moderate pace — keep heart rate in fat-burn zone (60–70% max HR). This block creates the extra calorie deficit needed to hit your weight-loss target.`,
				};

				workout.exercises.push(cardioExercise);

				if (cardioMinutesCooldown > 0) {
					const cooldownExercise: import('../utils/workoutStructure').WorkoutExercise = {
						exerciseId: cooldownCardio.exerciseId,
						name: `${cooldownCardio.name} — Easy Cooldown`,
						sets: 1,
						reps: `${cardioMinutesCooldown} minutes`,
						restSeconds: 0,
						notes: 'Drop intensity to easy pace. Gradually bring heart rate down before your cooldown stretch.',
					};
					workout.exercises.push(cooldownExercise);
				}

				// Extend duration + calories for the cardio block
				workout.totalDuration += boostMinutes;
				workout.estimatedCalories += cardioCaloriesPerSession;
			});

			console.log(`[Rule-Based] Step 7b: Appended ${boostMinutes}-min rotating cardio boost to all ${structuredWorkouts.length} workouts (pool size: ${rotationPool.length})`);
		} else {
			console.warn('[Rule-Based] Step 7b: boostExtraCardioMinutes > 0 but no cardio exercises found in filtered pool — check equipment list');
		}
	}


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
		// Prefer the user's explicit day choices from onboarding
		// (workout_preferences.preferred_workout_days → weeklyPlan.preferredDays,
		// sent monday-first), then split suggestion, then index-based fallback.
		// This is what makes generated plans LAND on the days the user picked.
		const preferredDays = request.weeklyPlan?.preferredDays || [];
		const suggestedDay = preferredDays[index] || selectedSplit.workoutDays[index]?.suggestedDayOfWeek || dayOfWeekMap[index % 7];

		return {
			dayOfWeek: suggestedDay as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
			workout,
		};
	});

	const totalEstimatedCalories = structuredWorkouts.reduce((sum, w) => sum + w.estimatedCalories, 0);

	// Compute rest days from the actual workout days used (preferred or split-suggested)
	const allDays: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	const usedDays = new Set(workouts.map(w => w.dayOfWeek));
	const computedRestDays = allDays.filter(d => !usedDays.has(d));

	const response: WorkoutResponse = {
		id: `rule-based-${Date.now()}-${request.userId || 'guest'}`,
		planTitle: `${selectedSplit.name} - Week ${weekNumber}`,
		planDescription: generatePlanDescription(selectedSplit, enrichedProfile, allWarnings, boostMinutes, request.weeklyPlan?.preferredDays),
		workouts,
		restDays: computedRestDays,
		totalEstimatedCalories,
	};

	// ============================================================================
	// STEP 9: ENRICH WITH FIXED GIF URLS
	// ============================================================================

	// Enrich all exercises with fixed GIF URLs
	for (const workout of response.workouts) {
		workout.workout.exercises = workout.workout.exercises.map((ex) => {
			// Find original exercise to get GIF URL
			const originalExercise = exercises.find((e) => e.exerciseId === ex.exerciseId);
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
function generateWorkoutDescription(workoutType: string, splitDescription: string, fitnessGoal: string, warnings: string[]): string {
	let description = `${workoutType} workout focused on ${fitnessGoal.replace('_', ' ')}. `;
	description += splitDescription;

	if (warnings.length > 0) {
		description += '\n\n⚠️ SAFETY NOTES:\n';
		warnings.slice(0, 3).forEach((w) => {
			description += `• ${w}\n`;
		});
	}

	return description;
}

/**
 * Generate plan-level description
 */
function generatePlanDescription(split: any, profile: any, warnings: string[], boostExtraCardioMinutes: number, preferredDays?: string[]): string {
	let description = `${split.name}: ${split.description}\n\n`;

	description += `🎯 Goal: ${profile.fitnessGoal.replace('_', ' ')}\n`;
	description += `📊 Experience: ${profile.experienceLevel}\n`;

	const baseMinutes = profile.workoutDuration;
	const totalMinutes = baseMinutes + boostExtraCardioMinutes;
	if (boostExtraCardioMinutes > 0) {
		description += `⏱️ Duration: ${totalMinutes} minutes per session (${baseMinutes} min strength + ${boostExtraCardioMinutes} min cardio boost)\n`;
	} else {
		description += `⏱️ Duration: ${baseMinutes} minutes per session\n`;
	}

	description += `📅 Frequency: ${profile.workoutsPerWeek}x per week\n`;
	// Surface the user's chosen training days (onboarding day-of-week chips) so
	// the plan text matches the dayOfWeek assignment above.
	if (preferredDays && preferredDays.length > 0) {
		description += `📆 Training days: ${preferredDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n`;
	}

	if (warnings.length > 0) {
		description += `\n⚠️ SAFETY WARNINGS (${warnings.length}):\n`;
		warnings.slice(0, 5).forEach((w) => {
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
export function generateGentleMovementFallback(
	request: WorkoutGenerationRequest,
	warnings: string[],
	requiresMedicalClearance: boolean,
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
		progressionNotes:
			'Focus on consistency and comfort. Gradually increase duration as your condition improves. Work with your healthcare provider to expand your exercise options safely.',
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
