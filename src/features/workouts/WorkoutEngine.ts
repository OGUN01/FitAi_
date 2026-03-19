// Workout Engine - Integrates AI generation with exercise database

// Note: workoutGenerator is deprecated. Use Cloudflare Workers backend instead.
// Workout generation is now delegated to aiService which connects to Cloudflare Workers.
import * as crypto from "expo-crypto";
import {
  EXERCISES,
  getExerciseById,
  getExercisesByEquipment,
  getExercisesByMuscleGroup,
} from "../../data/exercises";
import {
  Workout,
  WorkoutPlan,
  Exercise,
  WorkoutSet,
  AIResponse,
} from "../../types/ai";
import { PersonalInfo, FitnessGoals } from "../../types/user";

// LAZY IMPORT: Avoid circular dependency with ai/index.ts
// ai/index.ts exports workoutEngine, and WorkoutEngine imports aiService from ai/index.ts
let _aiService: any = null;
const getAiService = () => {
  if (!_aiService) {
    _aiService = require("../../ai/index").aiService;
  }
  return _aiService;
};

// ============================================================================
// WORKOUT ENGINE SERVICE
// ============================================================================

class WorkoutEngineService {
  /**
   * Generate a complete workout with real exercise data
   */
  async generateSmartWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      workoutType?: "strength" | "cardio" | "flexibility" | "hiit";
      duration?: number;
      equipment?: string[];
      targetMuscleGroups?: string[];
      difficulty?: "beginner" | "intermediate" | "advanced";
    },
  ): Promise<AIResponse<Workout>> {
    try {
      // Delegate to the UnifiedAIService which connects to Cloudflare Workers
      const result = await getAiService().generateWorkout(
        personalInfo,
        fitnessGoals,
        {
          workoutType: preferences?.workoutType,
          duration: preferences?.duration,
          focusMuscles: preferences?.targetMuscleGroups,
        },
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || "Failed to generate workout from AI service",
        };
      }

      // Enhance the AI-generated workout with local exercise data
      const enhancedWorkout = await this.enhanceWorkoutWithExerciseData(
        result.data,
        preferences?.equipment || ["bodyweight"],
        preferences?.difficulty ||
          (fitnessGoals.experience as
            | "beginner"
            | "intermediate"
            | "advanced") ||
          "intermediate",
      );

      return {
        success: true,
        data: enhancedWorkout,
      };
    } catch (error) {
      console.error("❌ [WorkoutEngine] Error generating workout:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate workout",
      };
    }
  }

  /**
   * Generate a quick workout entirely from the local exercise database — no network call.
   * Sets, reps, rest times, and exercise selection are all derived from user data.
   */
  async generateQuickWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    timeAvailable: number,
  ): Promise<AIResponse<Workout>> {
    try {
      const workout = this._buildLocalQuickWorkout(
        personalInfo,
        fitnessGoals,
        timeAvailable,
      );
      return { success: true, data: workout };
    } catch (error) {
      console.error("❌ [WorkoutEngine] generateQuickWorkout failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to build workout",
      };
    }
  }

  /**
   * Builds a complete workout from the local EXERCISES database without any network request.
   * All parameters (sets, reps, rest, exercise count) are derived from the user's profile.
   */
  private _buildLocalQuickWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    timeAvailable: number,
  ): Workout {
    const experience = (fitnessGoals.experience ||
      fitnessGoals.experience_level ||
      "beginner") as "beginner" | "intermediate" | "advanced";
    const goals = fitnessGoals.primary_goals || fitnessGoals.primaryGoals || [];
    const age = personalInfo.age || 30;
    const workoutType: "hiit" | "strength" =
      timeAvailable <= 20 ? "hiit" : "strength";

    // --- Per-user training parameters ---
    const sets =
      experience === "beginner" ? 2 : experience === "intermediate" ? 3 : 4;

    // Rep ranges: muscle_gain/strength = lower reps heavier focus; weight_loss = higher reps
    const wantsHypertrophy = goals.some((g) =>
      ["muscle_gain", "strength"].includes(g),
    );
    const wantsWeightLoss = goals.some((g) =>
      ["weight_loss", "fat_loss"].includes(g),
    );
    let repRange: string;
    if (workoutType === "hiit") {
      repRange =
        experience === "beginner"
          ? "8-10"
          : experience === "intermediate"
            ? "10-15"
            : "15-20";
    } else if (wantsHypertrophy) {
      repRange =
        experience === "beginner"
          ? "8-10"
          : experience === "intermediate"
            ? "8-12"
            : "6-10";
    } else if (wantsWeightLoss) {
      repRange =
        experience === "beginner"
          ? "12-15"
          : experience === "intermediate"
            ? "15-20"
            : "20-25";
    } else {
      repRange =
        experience === "beginner"
          ? "10-12"
          : experience === "intermediate"
            ? "12-15"
            : "15-20";
    }

    // Older users and beginners need more recovery time
    const ageModifier = age > 50 ? 15 : age > 40 ? 10 : 0;
    let restTime: number;
    if (workoutType === "hiit") {
      restTime =
        (experience === "beginner"
          ? 45
          : experience === "intermediate"
            ? 30
            : 20) + ageModifier;
    } else {
      restTime =
        (experience === "beginner"
          ? 90
          : experience === "intermediate"
            ? 60
            : 45) + ageModifier;
    }

    // Exercise duration for time-based movements (planks, mountain climbers, etc.)
    const holdDuration =
      experience === "beginner" ? 20 : experience === "intermediate" ? 30 : 45;

    // --- Exercise count: fit within the available time ---
    // Time per exercise: (sets * (work_time + rest)) + transition_buffer
    const workSecondsPerSet = workoutType === "hiit" ? 30 : 40;
    const timePerExerciseSec = sets * (workSecondsPerSet + restTime) + 15;
    const warmupCooldownSec = 120; // ~2 min buffer
    const usableTime = timeAvailable * 60 - warmupCooldownSec;
    const exerciseCount = Math.max(
      4,
      Math.min(8, Math.floor(usableTime / timePerExerciseSec)),
    );

    // --- Exercise pool: bodyweight only, filtered by difficulty ---
    const difficultyPool: Array<"beginner" | "intermediate" | "advanced"> =
      experience === "beginner"
        ? ["beginner"]
        : experience === "intermediate"
          ? ["beginner", "intermediate"]
          : ["intermediate", "advanced"];

    let pool = EXERCISES.filter(
      (ex) =>
        ex.equipment.includes("bodyweight") &&
        difficultyPool.includes(ex.difficulty),
    );

    // Exclude flexibility/yoga exercises for hiit and strength quick workouts
    pool = pool.filter(
      (ex) =>
        ![
          "downward_dog",
          "child_pose",
          "sun_salutation",
          "warrior_pose",
        ].includes(ex.id),
    );

    // Goal-aware prioritisation: sort so goal-matching exercises come first
    const goalMuscleMap: Record<string, string[]> = {
      weight_loss: ["cardiovascular", "full_body"],
      fat_loss: ["cardiovascular", "full_body"],
      muscle_gain: ["chest", "back", "shoulders", "quadriceps", "glutes"],
      strength: ["chest", "back", "shoulders", "quadriceps", "core"],
      endurance: ["cardiovascular", "legs", "core"],
      general_fitness: ["full_body", "core"],
    };
    const priorityMuscles = goals.flatMap((g) => goalMuscleMap[g] || []);
    pool.sort((a, b) => {
      const aMatch = a.muscleGroups.some((mg) => priorityMuscles.includes(mg))
        ? -1
        : 0;
      const bMatch = b.muscleGroups.some((mg) => priorityMuscles.includes(mg))
        ? -1
        : 0;
      return aMatch - bMatch;
    });

    // For HIIT: prefer high-calorie / cardiovascular exercises
    if (workoutType === "hiit") {
      pool.sort((a, b) => (b.calories || 0) - (a.calories || 0));
    }

    // Deduplicate by muscle group — pick exercises that together cover the full body
    const selected: typeof pool = [];
    const coveredMuscles = new Set<string>();
    // First pass: prioritised exercises
    for (const ex of pool) {
      if (selected.length >= exerciseCount) break;
      const isNewMuscle = ex.muscleGroups.some((mg) => !coveredMuscles.has(mg));
      if (isNewMuscle) {
        selected.push(ex);
        ex.muscleGroups.forEach((mg) => coveredMuscles.add(mg));
      }
    }
    // Second pass: fill remaining slots without muscle coverage requirement
    for (const ex of pool) {
      if (selected.length >= exerciseCount) break;
      if (!selected.includes(ex)) selected.push(ex);
    }

    // --- Build WorkoutSet list ---
    const exercises: WorkoutSet[] = selected.map((ex) => {
      const isTimeBased = !!ex.duration && !ex.reps;
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        name: ex.name,
        sets,
        reps: isTimeBased ? `${holdDuration}s` : repRange,
        duration: isTimeBased ? holdDuration : undefined,
        restTime,
        rpe:
          experience === "beginner" ? 6 : experience === "intermediate" ? 7 : 8,
      };
    });

    // --- Calorie estimate (MET-based approximation) ---
    const weight = personalInfo.weight;
    if (!weight) {
      console.warn(
        "[WorkoutEngine] personalInfo.weight is missing — calorie estimate will be 0",
      );
    }
    const metValue = workoutType === "hiit" ? 10 : 6;
    const estimatedCalories = weight
      ? Math.round(metValue * weight * (timeAvailable / 60))
      : 0;

    const category = workoutType === "hiit" ? "hiit" : "strength";
    const difficultyLabel: "beginner" | "intermediate" | "advanced" =
      experience;

    const allEquipment = [...new Set(selected.flatMap((ex) => ex.equipment))];
    const allMuscles = [...new Set(selected.flatMap((ex) => ex.muscleGroups))];

    const goalLabel = wantsHypertrophy
      ? "Strength"
      : wantsWeightLoss
        ? "Fat Burn"
        : "Fitness";
    const title = `${timeAvailable}-min ${workoutType === "hiit" ? "HIIT" : goalLabel} Workout`;

    return {
      id: this.generateWorkoutId(),
      title,
      description: `A personalised ${timeAvailable}-minute ${workoutType} session based on your ${experience} level and ${goals[0] || "fitness"} goals.`,
      category,
      difficulty: difficultyLabel,
      duration: timeAvailable,
      estimatedCalories,
      exercises,
      equipment: allEquipment,
      targetMuscleGroups: allMuscles,
      icon: workoutType === "hiit" ? "🔥" : "💪",
      tags: ["quick", workoutType, experience],
      isPersonalized: true,
      aiGenerated: false,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Create a workout from selected exercises
   */
  createCustomWorkout(
    exerciseIds: string[],
    workoutName: string,
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
  ): Workout {
    const exercises = exerciseIds
      .map((id) => getExerciseById(id))
      .filter(Boolean) as Exercise[];

    if (exercises.length === 0) {
      throw new Error("No valid exercises found");
    }

    // Calculate workout duration and calories
    const totalDuration = exercises.reduce((sum, ex) => {
      const sets = ex.sets ?? 3;
      const reps =
        typeof ex.reps === "number" ? ex.reps : parseInt(ex.reps ?? "10", 10);
      const exerciseTime = ex.duration ?? sets * reps * 3; // Estimate 3 seconds per rep
      const restTime = ex.restTime ?? 60;
      return sum + exerciseTime + restTime;
    }, 0);

    const totalCalories = exercises.reduce(
      (sum, ex) => sum + (ex.calories || 5),
      0,
    );

    // Determine workout category based on exercises
    const categories = exercises.map((ex) => this.categorizeExercise(ex));
    const primaryCategory = this.getMostCommonCategory(categories);

    // Create workout sets
    const workoutSets: WorkoutSet[] = exercises.map((exercise) => ({
      exerciseId: exercise.id,
      sets:
        exercise.sets ?? this.getDefaultSets(exercise, fitnessGoals.experience),
      reps:
        exercise.reps ?? this.getDefaultReps(exercise, fitnessGoals.experience),
      restTime: exercise.restTime ?? this.getDefaultRestTime(exercise),
      weight: undefined, // User will set this
    }));

    return {
      id: this.generateWorkoutId(),
      title: workoutName,
      description: `Custom ${primaryCategory} workout with ${exercises.length} exercises`,
      category: primaryCategory,
      difficulty: this.calculateWorkoutDifficulty(
        exercises,
        fitnessGoals.experience,
      ),
      duration: Math.round(totalDuration / 60), // Convert to minutes
      estimatedCalories: totalCalories,
      exercises: workoutSets,
      equipment: this.getUniqueEquipment(exercises),
      targetMuscleGroups: this.getUniqueMuscleGroups(exercises),
      icon: this.getWorkoutIcon(primaryCategory),
      tags: ["custom", primaryCategory],
      isPersonalized: true,
      aiGenerated: false,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get recommended exercises based on user profile
   */
  getRecommendedExercises(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    equipment: string[] = ["bodyweight"],
    count: number = 10,
  ): Exercise[] {
    let availableExercises = getExercisesByEquipment(equipment);

    // Filter by difficulty based on experience
    const experienceLevel = fitnessGoals.experience;
    if (experienceLevel === "beginner") {
      availableExercises = availableExercises.filter(
        (ex) =>
          ex.difficulty === "beginner" || ex.difficulty === "intermediate",
      );
    }

    // Filter by goals
    const primaryGoals =
      fitnessGoals.primary_goals || fitnessGoals.primaryGoals || [];
    if (primaryGoals.includes("strength")) {
      availableExercises = availableExercises.filter((ex) =>
        ex.muscleGroups.some((mg) =>
          ["chest", "back", "shoulders", "arms", "legs", "glutes"].includes(mg),
        ),
      );
    }

    if (primaryGoals.includes("weight_loss")) {
      availableExercises = availableExercises.filter(
        (ex) => ex.calories && ex.calories > 5,
      );
    }

    // Shuffle and return requested count
    return availableExercises.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  /**
   * Get exercises by muscle group with user preferences
   */
  getExercisesForMuscleGroup(
    muscleGroup: string,
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    equipment: string[] = ["bodyweight"],
  ): Exercise[] {
    let exercises = getExercisesByMuscleGroup(muscleGroup);

    // Filter by available equipment
    exercises = exercises.filter((ex) =>
      ex.equipment.some((eq) => equipment.includes(eq)),
    );

    // Filter by experience level
    const experienceLevel = fitnessGoals.experience;
    if (experienceLevel === "beginner") {
      exercises = exercises.filter((ex) => ex.difficulty !== "advanced");
    } else if (experienceLevel === "intermediate") {
      exercises = exercises.filter((ex) => ex.difficulty !== "beginner");
    }

    return exercises;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async enhanceWorkoutWithExerciseData(
    aiWorkout: Workout,
    equipment: string[],
    difficulty: "beginner" | "intermediate" | "advanced",
  ): Promise<Workout> {
    const enhancedExercises: WorkoutSet[] = [];

    for (const workoutSet of aiWorkout.exercises) {
      // Try to find matching exercise in our database
      let exercise: Exercise | undefined =
        getExerciseById(workoutSet.exerciseId) ?? undefined;

      if (!exercise) {
        // If not found, find a similar exercise based on the ID/name
        const similar = this.findSimilarExercise(
          workoutSet.exerciseId,
          equipment,
          difficulty,
        );
        exercise = similar ?? undefined;
      }

      if (exercise) {
        enhancedExercises.push({
          ...workoutSet,
          exerciseId: exercise.id,
          sets:
            workoutSet.sets ??
            exercise.sets ??
            this.getDefaultSets(exercise, difficulty),
          reps:
            workoutSet.reps ??
            exercise.reps ??
            this.getDefaultReps(exercise, difficulty),
          restTime:
            workoutSet.restTime ??
            exercise.restTime ??
            this.getDefaultRestTime(exercise),
        });
      } else {
        // Keep original if no match found
        enhancedExercises.push(workoutSet);
      }
    }

    return {
      ...aiWorkout,
      exercises: enhancedExercises,
      equipment: this.getUniqueEquipmentFromSets(enhancedExercises),
      targetMuscleGroups: this.getUniqueMuscleGroupsFromSets(enhancedExercises),
    };
  }

  private findSimilarExercise(
    exerciseId: string,
    equipment: string[],
    difficulty: "beginner" | "intermediate" | "advanced",
  ): Exercise | null {
    // Extract keywords from the exercise ID
    const keywords = exerciseId.toLowerCase().split("_");

    // Find exercises that match keywords and constraints
    const candidates = EXERCISES.filter((exercise) => {
      const matchesEquipment = exercise.equipment.some((eq) =>
        equipment.includes(eq),
      );
      const matchesDifficulty =
        exercise.difficulty === difficulty ||
        (difficulty === "beginner" && exercise.difficulty === "intermediate") ||
        (difficulty === "advanced" && exercise.difficulty === "intermediate");
      const matchesKeywords = keywords.some(
        (keyword) =>
          exercise.name.toLowerCase().includes(keyword) ||
          exercise.muscleGroups.some((mg) =>
            mg.toLowerCase().includes(keyword),
          ),
      );

      return matchesEquipment && matchesDifficulty && matchesKeywords;
    });

    return candidates.length > 0 ? candidates[0] : null;
  }

  private categorizeExercise(
    exercise: Exercise,
  ): "strength" | "cardio" | "flexibility" | "hiit" {
    if (exercise.muscleGroups.includes("cardiovascular")) return "cardio";
    if (
      exercise.name.toLowerCase().includes("stretch") ||
      exercise.name.toLowerCase().includes("pose")
    )
      return "flexibility";
    if (exercise.calories && exercise.calories > 10) return "hiit";
    return "strength";
  }

  private getMostCommonCategory(
    categories: string[],
  ): "strength" | "cardio" | "flexibility" | "hiit" {
    const counts = categories.reduce(
      (acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommon = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return mostCommon[0] as "strength" | "cardio" | "flexibility" | "hiit";
  }

  private calculateWorkoutDifficulty(
    exercises: Exercise[],
    userExperience: string,
  ): "beginner" | "intermediate" | "advanced" {
    const difficulties = exercises.map((ex) => ex.difficulty);
    const avgDifficulty =
      difficulties.reduce((sum, diff) => {
        const score = diff === "beginner" ? 1 : diff === "intermediate" ? 2 : 3;
        return sum + score;
      }, 0) / difficulties.length;

    if (avgDifficulty <= 1.5) return "beginner";
    if (avgDifficulty <= 2.5) return "intermediate";
    return "advanced";
  }

  private getDefaultSets(exercise: Exercise, experience: string): number {
    if (exercise.sets) return exercise.sets;

    const baseSets =
      experience === "beginner" ? 2 : experience === "intermediate" ? 3 : 4;
    return exercise.muscleGroups.includes("core") ? baseSets + 1 : baseSets;
  }

  private getDefaultReps(exercise: Exercise, experience: string): string {
    if (exercise.reps)
      return typeof exercise.reps === "string"
        ? exercise.reps
        : exercise.reps.toString();

    if (exercise.duration) return `${exercise.duration}s`;

    const baseReps =
      experience === "beginner"
        ? "8-10"
        : experience === "intermediate"
          ? "10-12"
          : "12-15";
    return baseReps;
  }

  private getDefaultRestTime(exercise: Exercise): number {
    if (exercise.restTime) return exercise.restTime;

    if (exercise.muscleGroups.includes("cardiovascular")) return 30;
    if (exercise.difficulty === "advanced") return 90;
    return 60;
  }

  private getUniqueEquipment(exercises: Exercise[]): string[] {
    const equipment = exercises.flatMap((ex) => ex.equipment);
    return [...new Set(equipment)];
  }

  private getUniqueMuscleGroups(exercises: Exercise[]): string[] {
    const muscleGroups = exercises.flatMap((ex) => ex.muscleGroups);
    return [...new Set(muscleGroups)];
  }

  private getUniqueEquipmentFromSets(workoutSets: WorkoutSet[]): string[] {
    const equipment: string[] = [];
    workoutSets.forEach((set) => {
      const exercise = getExerciseById(set.exerciseId);
      if (exercise) {
        equipment.push(...exercise.equipment);
      }
    });
    return [...new Set(equipment)];
  }

  private getUniqueMuscleGroupsFromSets(workoutSets: WorkoutSet[]): string[] {
    const muscleGroups: string[] = [];
    workoutSets.forEach((set) => {
      const exercise = getExerciseById(set.exerciseId);
      if (exercise) {
        muscleGroups.push(...exercise.muscleGroups);
      }
    });
    return [...new Set(muscleGroups)];
  }

  private getWorkoutIcon(category: string): string {
    const icons: Record<string, string> = {
      strength: "💪",
      cardio: "🏃",
      flexibility: "🧘",
      hiit: "🔥",
    };
    return icons[category] || "🏋️";
  }

  private generateWorkoutId(): string {
    return `workout_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const workoutEngine = new WorkoutEngineService();

export default workoutEngine;
