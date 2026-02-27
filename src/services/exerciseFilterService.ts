/**
 * Exercise Filter Service
 *
 * Filters the complete exercise database based on user profile
 * to provide personalized exercise recommendations with 100% GIF coverage.
 */

import exerciseDatabase from "../data/exerciseDatabase.min.json";
import { PersonalInfo, FitnessGoals } from "../types/user";

export interface FilteredExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface FilterCriteria {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  targetAreas: string[];
  availableEquipment: string[];
  fitnessGoals: string[];
}

class ExerciseFilterService {
  private exercises: FilteredExercise[];

  constructor() {
    // Load and process exercises with difficulty categorization
    this.exercises = this.categorizeExercises();

    if (__DEV__) {
      // Debug: Check if specific exercise IDs exist (dev only)
      const testIds = ["75Bgtjy", "cuC7529", "50BETrz"];
      testIds.forEach((id) => {
        const found = this.exercises.find((ex) => ex.exerciseId === id);
      });
    }
  }

  /**
   * Categorize exercises by difficulty based on equipment and complexity
   */
  private categorizeExercises(): FilteredExercise[] {
    return exerciseDatabase.exercises.map((exercise) => {
      // Determine difficulty based on equipment and movement patterns
      let difficulty: "beginner" | "intermediate" | "advanced" = "intermediate";

      const equipment = exercise.equipments[0] || "body weight";
      const exerciseName = exercise.name.toLowerCase();

      // Beginner: Body weight and simple movements
      if (
        equipment === "body weight" &&
        !exerciseName.includes("advanced") &&
        !exerciseName.includes("weighted") &&
        !exerciseName.includes("one arm") &&
        !exerciseName.includes("single") &&
        !exerciseName.includes("pistol")
      ) {
        difficulty = "beginner";
      }

      // Advanced: Complex equipment or advanced variations
      else if (
        equipment.includes("barbell") ||
        equipment.includes("olympic") ||
        exerciseName.includes("advanced") ||
        exerciseName.includes("weighted") ||
        exerciseName.includes("pistol") ||
        exerciseName.includes("muscle up") ||
        exerciseName.includes("handstand")
      ) {
        difficulty = "advanced";
      }

      return {
        ...exercise,
        difficulty,
      };
    });
  }

  /**
   * Filter exercises based on user profile
   */
  filterExercises(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
  ): FilteredExercise[] {
    const criteria: FilterCriteria = this.buildFilterCriteria(
      personalInfo,
      fitnessGoals,
    );

    return this.exercises.filter((exercise) => {
      // 1. Experience level filter
      const levelMatch = this.matchExperienceLevel(
        exercise.difficulty,
        criteria.experienceLevel,
      );

      // 2. Equipment filter
      const equipmentMatch = this.matchEquipment(
        exercise.equipments,
        criteria.availableEquipment,
      );

      // 3. Target areas filter
      const targetMatch = this.matchTargetAreas(
        exercise.bodyParts,
        exercise.targetMuscles,
        criteria.targetAreas,
      );

      // 4. Fitness goals filter
      const goalMatch = this.matchFitnessGoals(exercise, criteria.fitnessGoals);

      return levelMatch && equipmentMatch && targetMatch && goalMatch;
    });
  }

  /**
   * Build filter criteria from user profile
   */
  private buildFilterCriteria(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
  ): FilterCriteria {
    // Map equipment availability
    const availableEquipment: string[] = ["body weight"]; // Always include bodyweight

    if (fitnessGoals.preferred_equipment?.includes("dumbbells")) {
      availableEquipment.push("dumbbell");
    }
    if (fitnessGoals.preferred_equipment?.includes("resistance_bands")) {
      availableEquipment.push("band", "resistance band");
    }
    if (fitnessGoals.preferred_equipment?.includes("gym_equipment")) {
      availableEquipment.push(
        "barbell",
        "cable",
        "machine",
        "smith machine",
        "leverage machine",
      );
    }

    // Map target areas
    const targetAreas: string[] = [];
    if (fitnessGoals.target_areas?.includes("full_body")) {
      targetAreas.push(
        "back",
        "chest",
        "shoulders",
        "arms",
        "legs",
        "core",
        "cardio",
      );
    } else {
      if (fitnessGoals.target_areas?.includes("upper_body")) {
        targetAreas.push(
          "back",
          "chest",
          "shoulders",
          "upper arms",
          "lower arms",
        );
      }
      if (fitnessGoals.target_areas?.includes("lower_body")) {
        targetAreas.push("upper legs", "lower legs", "glutes");
      }
      if (fitnessGoals.target_areas?.includes("core")) {
        targetAreas.push("waist", "abs");
      }
    }

    const level = (
      fitnessGoals.experience_level ||
      fitnessGoals.experience ||
      ""
    ).toLowerCase();
    const experienceLevel: "beginner" | "intermediate" | "advanced" =
      level === "beginner" || level === "intermediate" || level === "advanced"
        ? (level as any)
        : "beginner";

    return {
      experienceLevel,
      targetAreas,
      availableEquipment,
      fitnessGoals: fitnessGoals.primaryGoals || [],
    };
  }

  /**
   * Match exercise difficulty with user experience level
   */
  private matchExperienceLevel(
    exerciseDifficulty: string,
    userLevel: string,
  ): boolean {
    const levelHierarchy: Record<
      "beginner" | "intermediate" | "advanced",
      number
    > = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };

    const exerciseLevel =
      levelHierarchy[
        exerciseDifficulty as "beginner" | "intermediate" | "advanced"
      ] ?? 2;
    const userLevelNum =
      levelHierarchy[userLevel as "beginner" | "intermediate" | "advanced"] ??
      1;

    // Allow exercises at or below user's level
    return exerciseLevel <= userLevelNum;
  }

  /**
   * Match exercise equipment with available equipment
   */
  private matchEquipment(
    exerciseEquipment: string[],
    availableEquipment: string[],
  ): boolean {
    return exerciseEquipment.some((eq) =>
      availableEquipment.some(
        (available) =>
          available.toLowerCase().includes(eq.toLowerCase()) ||
          eq.toLowerCase().includes(available.toLowerCase()),
      ),
    );
  }

  /**
   * Match exercise target areas with user's target areas
   */
  private matchTargetAreas(
    bodyParts: string[],
    targetMuscles: string[],
    userTargetAreas: string[],
  ): boolean {
    // If no specific targets, match all
    if (userTargetAreas.length === 0) return true;

    const allTargets = [...bodyParts, ...targetMuscles];

    return allTargets.some((target) =>
      userTargetAreas.some(
        (userTarget) =>
          target.toLowerCase().includes(userTarget.toLowerCase()) ||
          userTarget.toLowerCase().includes(target.toLowerCase()),
      ),
    );
  }

  /**
   * Match exercise with fitness goals
   */
  private matchFitnessGoals(
    exercise: FilteredExercise,
    goals: string[],
  ): boolean {
    // If no specific goals, match all
    if (!goals || goals.length === 0) return true;

    // Map goals to exercise characteristics
    for (const goal of goals) {
      switch (goal) {
        case "weight_loss":
          // Prefer cardio and full-body exercises
          if (
            exercise.bodyParts.includes("cardio") ||
            exercise.targetMuscles.includes("cardiovascular system")
          ) {
            return true;
          }
          break;

        case "muscle_gain":
          // Prefer strength exercises with equipment
          if (
            !exercise.bodyParts.includes("cardio") &&
            exercise.equipments.some((eq) => eq !== "body weight")
          ) {
            return true;
          }
          break;

        case "endurance":
          // Prefer cardio and bodyweight exercises
          if (
            exercise.bodyParts.includes("cardio") ||
            exercise.equipments.includes("body weight")
          ) {
            return true;
          }
          break;

        case "flexibility":
          // Prefer stretching and mobility exercises
          if (
            exercise.name.toLowerCase().includes("stretch") ||
            exercise.name.toLowerCase().includes("mobility")
          ) {
            return true;
          }
          break;
      }
    }

    // Default: match if it's a relevant exercise
    return true;
  }

  /**
   * Get a subset of exercises for a specific workout type
   */
  getExercisesByType(
    filteredExercises: FilteredExercise[],
    type: "warmup" | "main" | "cooldown",
    count: number = 10,
  ): FilteredExercise[] {
    let typeFiltered: FilteredExercise[];

    switch (type) {
      case "warmup":
        // Light cardio and dynamic movements
        typeFiltered = filteredExercises.filter(
          (ex) =>
            ex.bodyParts.includes("cardio") ||
            ex.name.toLowerCase().includes("jump") ||
            ex.name.toLowerCase().includes("warm") ||
            (ex.difficulty === "beginner" &&
              ex.equipments.includes("body weight")),
        );
        break;

      case "cooldown":
        // Stretching and light movements
        typeFiltered = filteredExercises.filter(
          (ex) =>
            ex.name.toLowerCase().includes("stretch") ||
            ex.name.toLowerCase().includes("cool") ||
            ex.name.toLowerCase().includes("mobility"),
        );
        break;

      default:
        // Main workout exercises
        typeFiltered = filteredExercises;
    }

    // Return requested count, with fallback to main exercises if needed
    if (typeFiltered.length < count) {
      return [
        ...typeFiltered,
        ...filteredExercises.slice(0, count - typeFiltered.length),
      ];
    }

    return typeFiltered.slice(0, count);
  }

  /**
   * Get exercise by ID for direct lookup
   */
  getExerciseById(exerciseId: string): FilteredExercise | null {
    if (!exerciseId) {
      if (__DEV__) {
      }
      return null;
    }

    const exercise = this.exercises.find((ex) => ex.exerciseId === exerciseId);

    if (!exercise && __DEV__) {
    }

    return exercise || null;
  }

  /**
   * Get exercise by name with fuzzy matching fallback.
   * Tries exact match first, then case-insensitive, then partial match.
   */
  getExerciseByName(name: string): FilteredExercise | null {
    if (!name) return null;

    const normalizedName = name.trim().toLowerCase();

    // 1. Exact case-insensitive match
    const exact = this.exercises.find(
      (ex) => ex.name.toLowerCase() === normalizedName,
    );
    if (exact) return exact;

    // 2. Normalize underscores/hyphens to spaces and try again
    const spacedName = normalizedName.replace(/[_-]/g, ' ');
    const spacedMatch = this.exercises.find(
      (ex) => ex.name.toLowerCase() === spacedName,
    );
    if (spacedMatch) return spacedMatch;

    // 3. Contains match — exercise name contains the search term or vice versa
    const containsMatch = this.exercises.find((ex) => {
      const exName = ex.name.toLowerCase();
      return exName.includes(spacedName) || spacedName.includes(exName);
    });
    if (containsMatch) return containsMatch;

    // 4. Word-overlap scoring — pick the exercise with the most matching words
    const searchWords = spacedName.split(/\s+/).filter((w) => w.length > 2);
    if (searchWords.length === 0) return null;

    let bestMatch: FilteredExercise | null = null;
    let bestScore = 0;

    for (const ex of this.exercises) {
      const exWords = ex.name.toLowerCase().split(/\s+/);
      let score = 0;
      for (const sw of searchWords) {
        if (exWords.some((ew) => ew.includes(sw) || sw.includes(ew))) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = ex;
      }
    }

    // Require at least 1 word match to avoid random results
    return bestScore >= 1 ? bestMatch : null;
  }

  /**
   * Get all exercise IDs for validation
   */
  getAllExerciseIds(): string[] {
    return this.exercises.map((ex) => ex.exerciseId);
  }
}

// Export singleton instance
export const exerciseFilterService = new ExerciseFilterService();
