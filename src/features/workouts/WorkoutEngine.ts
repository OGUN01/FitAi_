// Workout Engine - Integrates AI generation with exercise database

// Note: workoutGenerator is deprecated. Use Cloudflare Workers backend instead.
// Import removed to prevent errors. AI generation is now handled by fitaiWorkersClient.
import {
  EXERCISES,
  getExerciseById,
  getExercisesByEquipment,
  getExercisesByMuscleGroup,
} from '../../data/exercises';
import {
  Workout,
  WorkoutPlan,
  Exercise,
  WorkoutSet,
  AIResponse,
} from '../../types/ai';
import { PersonalInfo, FitnessGoals } from '../../types/user';

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
      workoutType?: 'strength' | 'cardio' | 'flexibility' | 'hiit';
      duration?: number;
      equipment?: string[];
      targetMuscleGroups?: string[];
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<AIResponse<Workout>> {
    // DEPRECATED: workoutGenerator removed. Use fitaiWorkersClient instead.
    return {
      success: false,
      error: 'workoutGenerator is deprecated. Please use fitaiWorkersClient for AI workout generation.',
    };
  }

  /**
   * Generate a quick workout for immediate use
   */
  async generateQuickWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    timeAvailable: number
  ): Promise<AIResponse<Workout>> {
    const preferences = {
      duration: timeAvailable,
      equipment: ['bodyweight'],
      workoutType: timeAvailable <= 20 ? ('hiit' as const) : ('strength' as const),
      difficulty: fitnessGoals.experience as 'beginner' | 'intermediate' | 'advanced',
    };

    return this.generateSmartWorkout(personalInfo, fitnessGoals, preferences);
  }

  /**
   * Create a workout from selected exercises
   */
  createCustomWorkout(
    exerciseIds: string[],
    workoutName: string,
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals
  ): Workout {
    const exercises = exerciseIds.map((id) => getExerciseById(id)).filter(Boolean) as Exercise[];

    if (exercises.length === 0) {
      throw new Error('No valid exercises found');
    }

    // Calculate workout duration and calories
    const totalDuration = exercises.reduce((sum, ex) => {
      const sets = ex.sets ?? 3;
      const reps = typeof ex.reps === 'number' ? ex.reps : parseInt(ex.reps ?? '10', 10);
      const exerciseTime = ex.duration ?? sets * reps * 3; // Estimate 3 seconds per rep
      const restTime = ex.restTime ?? 60;
      return sum + exerciseTime + restTime;
    }, 0);

    const totalCalories = exercises.reduce((sum, ex) => sum + (ex.calories || 5), 0);

    // Determine workout category based on exercises
    const categories = exercises.map((ex) => this.categorizeExercise(ex));
    const primaryCategory = this.getMostCommonCategory(categories);

    // Create workout sets
    const workoutSets: WorkoutSet[] = exercises.map((exercise) => ({
      exerciseId: exercise.id,
      sets: exercise.sets ?? this.getDefaultSets(exercise, fitnessGoals.experience),
      reps: exercise.reps ?? this.getDefaultReps(exercise, fitnessGoals.experience),
      restTime: exercise.restTime ?? this.getDefaultRestTime(exercise),
      weight: undefined, // User will set this
    }));

    return {
      id: this.generateWorkoutId(),
      title: workoutName,
      description: `Custom ${primaryCategory} workout with ${exercises.length} exercises`,
      category: primaryCategory,
      difficulty: this.calculateWorkoutDifficulty(exercises, fitnessGoals.experience),
      duration: Math.round(totalDuration / 60), // Convert to minutes
      estimatedCalories: totalCalories,
      exercises: workoutSets,
      equipment: this.getUniqueEquipment(exercises),
      targetMuscleGroups: this.getUniqueMuscleGroups(exercises),
      icon: this.getWorkoutIcon(primaryCategory),
      tags: ['custom', primaryCategory],
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
    equipment: string[] = ['bodyweight'],
    count: number = 10
  ): Exercise[] {
    let availableExercises = getExercisesByEquipment(equipment);

    // Filter by difficulty based on experience
    const experienceLevel = fitnessGoals.experience;
    if (experienceLevel === 'beginner') {
      availableExercises = availableExercises.filter(
        (ex) => ex.difficulty === 'beginner' || ex.difficulty === 'intermediate'
      );
    }

    // Filter by goals
    const primaryGoals = fitnessGoals.primary_goals || fitnessGoals.primaryGoals || [];
    if (primaryGoals.includes('strength')) {
      availableExercises = availableExercises.filter((ex) =>
        ex.muscleGroups.some((mg) =>
          ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes'].includes(mg)
        )
      );
    }

    if (primaryGoals.includes('weight_loss')) {
      availableExercises = availableExercises.filter((ex) => ex.calories && ex.calories > 5);
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
    equipment: string[] = ['bodyweight']
  ): Exercise[] {
    let exercises = getExercisesByMuscleGroup(muscleGroup);

    // Filter by available equipment
    exercises = exercises.filter((ex) => ex.equipment.some((eq) => equipment.includes(eq)));

    // Filter by experience level
    const experienceLevel = fitnessGoals.experience;
    if (experienceLevel === 'beginner') {
      exercises = exercises.filter((ex) => ex.difficulty !== 'advanced');
    } else if (experienceLevel === 'intermediate') {
      exercises = exercises.filter((ex) => ex.difficulty !== 'beginner');
    }

    return exercises;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async enhanceWorkoutWithExerciseData(
    aiWorkout: Workout,
    equipment: string[],
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<Workout> {
    const enhancedExercises: WorkoutSet[] = [];

    for (const workoutSet of aiWorkout.exercises) {
      // Try to find matching exercise in our database
      let exercise: Exercise | undefined = getExerciseById(workoutSet.exerciseId) ?? undefined;

      if (!exercise) {
        // If not found, find a similar exercise based on the ID/name
        const similar = this.findSimilarExercise(workoutSet.exerciseId, equipment, difficulty);
        exercise = similar ?? undefined;
      }

      if (exercise) {
        enhancedExercises.push({
          ...workoutSet,
          exerciseId: exercise.id,
          sets: workoutSet.sets ?? exercise.sets ?? this.getDefaultSets(exercise, difficulty),
          reps: workoutSet.reps ?? exercise.reps ?? this.getDefaultReps(exercise, difficulty),
          restTime: workoutSet.restTime ?? exercise.restTime ?? this.getDefaultRestTime(exercise),
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
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Exercise | null {
    // Extract keywords from the exercise ID
    const keywords = exerciseId.toLowerCase().split('_');

    // Find exercises that match keywords and constraints
    const candidates = EXERCISES.filter((exercise) => {
      const matchesEquipment = exercise.equipment.some((eq) => equipment.includes(eq));
      const matchesDifficulty =
        exercise.difficulty === difficulty ||
        (difficulty === 'beginner' && exercise.difficulty === 'intermediate') ||
        (difficulty === 'advanced' && exercise.difficulty === 'intermediate');
      const matchesKeywords = keywords.some(
        (keyword) =>
          exercise.name.toLowerCase().includes(keyword) ||
          exercise.muscleGroups.some((mg) => mg.toLowerCase().includes(keyword))
      );

      return matchesEquipment && matchesDifficulty && matchesKeywords;
    });

    return candidates.length > 0 ? candidates[0] : null;
  }

  private categorizeExercise(exercise: Exercise): 'strength' | 'cardio' | 'flexibility' | 'hiit' {
    if (exercise.muscleGroups.includes('cardiovascular')) return 'cardio';
    if (
      exercise.name.toLowerCase().includes('stretch') ||
      exercise.name.toLowerCase().includes('pose')
    )
      return 'flexibility';
    if (exercise.calories && exercise.calories > 10) return 'hiit';
    return 'strength';
  }

  private getMostCommonCategory(
    categories: string[]
  ): 'strength' | 'cardio' | 'flexibility' | 'hiit' {
    const counts = categories.reduce(
      (acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const mostCommon = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return mostCommon[0] as 'strength' | 'cardio' | 'flexibility' | 'hiit';
  }

  private calculateWorkoutDifficulty(
    exercises: Exercise[],
    userExperience: string
  ): 'beginner' | 'intermediate' | 'advanced' {
    const difficulties = exercises.map((ex) => ex.difficulty);
    const avgDifficulty =
      difficulties.reduce((sum, diff) => {
        const score = diff === 'beginner' ? 1 : diff === 'intermediate' ? 2 : 3;
        return sum + score;
      }, 0) / difficulties.length;

    if (avgDifficulty <= 1.5) return 'beginner';
    if (avgDifficulty <= 2.5) return 'intermediate';
    return 'advanced';
  }

  private getDefaultSets(exercise: Exercise, experience: string): number {
    if (exercise.sets) return exercise.sets;

    const baseSets = experience === 'beginner' ? 2 : experience === 'intermediate' ? 3 : 4;
    return exercise.muscleGroups.includes('core') ? baseSets + 1 : baseSets;
  }

  private getDefaultReps(exercise: Exercise, experience: string): string {
    if (exercise.reps) return typeof exercise.reps === 'string' ? exercise.reps : exercise.reps.toString();

    if (exercise.duration) return `${exercise.duration}s`;

    const baseReps =
      experience === 'beginner' ? '8-10' : experience === 'intermediate' ? '10-12' : '12-15';
    return baseReps;
  }

  private getDefaultRestTime(exercise: Exercise): number {
    if (exercise.restTime) return exercise.restTime;

    if (exercise.muscleGroups.includes('cardiovascular')) return 30;
    if (exercise.difficulty === 'advanced') return 90;
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
      strength: '💪',
      cardio: '🏃',
      flexibility: '🧘',
      hiit: '🔥',
    };
    return icons[category] || '🏋️';
  }

  private generateWorkoutId(): string {
    return `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const workoutEngine = new WorkoutEngineService();

export default workoutEngine;
