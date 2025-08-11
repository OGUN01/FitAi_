// AI-Powered Workout Generation Service for FitAI
// Enhanced with constrained exercise generation for 100% visual coverage

import { geminiService, PROMPT_TEMPLATES, formatUserProfileForAI } from './gemini';
import { WORKOUT_SCHEMA } from './schemas';
import {
  OPTIMIZED_SYSTEM_PROMPT,
  validateAndFixExerciseNames,
} from './constrainedWorkoutGeneration';
import { exerciseValidator } from './exerciseValidationService';
import { Workout, WorkoutPlan, AIResponse, Exercise, WorkoutSet } from '../types/ai';
import { PersonalInfo, FitnessGoals } from '../types/user';

// ============================================================================
// WORKOUT GENERATION SERVICE
// ============================================================================

class WorkoutGeneratorService {
  /**
   * Generate a personalized workout based on user profile and preferences
   */
  async generatePersonalizedWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      workoutType?: 'strength' | 'cardio' | 'flexibility' | 'hiit';
      duration?: number;
      equipment?: string[];
      targetMuscleGroups?: string[];
    }
  ): Promise<AIResponse<Workout>> {
    try {
      const userProfile = formatUserProfileForAI(personalInfo, fitnessGoals);

      // Determine equipment based on preferences or default to bodyweight
      const equipment = preferences?.equipment || ['bodyweight'];

      // Set duration based on time commitment or preference
      const duration =
        preferences?.duration || this.parseDurationFromCommitment(fitnessGoals.timeCommitment);

      const variables = {
        ...userProfile,
        equipment: equipment.join(', '),
        workoutType: preferences?.workoutType || 'strength',
        duration,
        targetMuscleGroups: preferences?.targetMuscleGroups?.join(', ') || 'full body',
      };

      const response = await geminiService.generateResponse<any>(
        PROMPT_TEMPLATES.WORKOUT_GENERATION,
        variables,
        WORKOUT_SCHEMA,
        3, // maxRetries
        {
          maxOutputTokens: 8192,
          temperature: 0.7,
        }
      );

      if (!response.success || !response.data) {
        return response as AIResponse<Workout>;
      }

      // Transform AI response to our Workout type
      const workout: Workout = {
        id: this.generateWorkoutId(),
        title: response.data.title,
        description: response.data.description,
        category: response.data.category,
        difficulty: response.data.difficulty,
        duration: response.data.duration,
        estimatedCalories: response.data.estimatedCalories,
        exercises: response.data.exercises.map((ex: any) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          restTime: ex.restTime,
          notes: ex.notes,
        })),
        equipment: response.data.equipment,
        targetMuscleGroups: response.data.targetMuscleGroups,
        icon: this.getWorkoutIcon(response.data.category),
        tags: response.data.tags || [],
        isPersonalized: true,
        aiGenerated: true,
        createdAt: new Date().toISOString(),
      };

      // 🔍 Enhanced validation with comprehensive safety layers
      const validationResult = exerciseValidator.validateWorkout(workout);
      const validatedWorkout = validationResult.fixedWorkout;

      // Log validation for debugging
      if (!validationResult.isValid) {
        console.log('🔧 Workout auto-corrections applied:', validationResult.issues);
      }

      return {
        success: true,
        data: validatedWorkout, // ✅ Return validated workout with 100% visual coverage
        confidence: response.confidence,
        generationTime: response.generationTime,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: `Workout generation failed: ${error}`,
      };
    }
  }

  /**
   * Generate multiple workouts for a weekly plan
   */
  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    daysPerWeek: number = 3
  ): Promise<AIResponse<WorkoutPlan>> {
    try {
      const workouts: Workout[] = [];
      const workoutTypes = this.getWorkoutTypesForGoals(fitnessGoals.primaryGoals);

      for (let i = 0; i < daysPerWeek; i++) {
        const workoutType = workoutTypes[i % workoutTypes.length];
        const workoutResponse = await this.generatePersonalizedWorkout(personalInfo, fitnessGoals, {
          workoutType,
        });

        if (workoutResponse.success && workoutResponse.data) {
          workouts.push(workoutResponse.data);
        }
      }

      if (workouts.length === 0) {
        return {
          success: false,
          error: 'Failed to generate any workouts for the plan',
        };
      }

      const plan: WorkoutPlan = {
        id: this.generatePlanId(),
        title: `${personalInfo.name}'s Weekly Workout Plan`,
        description: `Personalized ${daysPerWeek}-day workout plan targeting ${fitnessGoals.primaryGoals.join(', ')}`,
        duration: 7, // 1 week
        workouts,
        restDays: this.calculateRestDays(daysPerWeek),
        progression: this.generateProgressionPlan(),
        goals: fitnessGoals.primaryGoals,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      return {
        success: false,
        error: `Workout plan generation failed: ${error}`,
      };
    }
  }

  /**
   * Generate a quick workout for immediate use
   */
  async generateQuickWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    timeAvailable: number // in minutes
  ): Promise<AIResponse<Workout>> {
    const preferences = {
      duration: timeAvailable,
      equipment: ['bodyweight'], // Quick workouts use bodyweight
      workoutType: timeAvailable <= 15 ? ('hiit' as const) : ('strength' as const),
    };

    return this.generatePersonalizedWorkout(personalInfo, fitnessGoals, preferences);
  }

  /**
   * Adapt existing workout based on user feedback
   */
  async adaptWorkout(
    originalWorkout: Workout,
    feedback: {
      difficulty?: 'too_easy' | 'too_hard' | 'just_right';
      duration?: 'too_short' | 'too_long' | 'perfect';
      enjoyment?: 'loved_it' | 'liked_it' | 'neutral' | 'disliked_it';
      specificFeedback?: string;
    },
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals
  ): Promise<AIResponse<Workout>> {
    try {
      const adaptationPrompt = this.buildAdaptationPrompt(originalWorkout, feedback);
      const userProfile = formatUserProfileForAI(personalInfo, fitnessGoals);

      const variables = {
        ...userProfile,
        originalWorkout: JSON.stringify(originalWorkout),
        feedback: JSON.stringify(feedback),
        adaptationInstructions: adaptationPrompt,
      };

      const customPrompt = `
${PROMPT_TEMPLATES.WORKOUT_GENERATION}

ADAPTATION CONTEXT:
Original Workout: {originalWorkout}
User Feedback: {feedback}
Adaptation Instructions: {adaptationInstructions}

Please modify the original workout based on the user feedback while maintaining the same general structure and goals.
`;

      const response = await geminiService.generateResponse<any>(
        customPrompt,
        variables,
        WORKOUT_SCHEMA,
        3, // maxRetries
        {
          maxOutputTokens: 8192,
          temperature: 0.7,
        }
      );

      if (!response.success || !response.data) {
        return response as AIResponse<Workout>;
      }

      // Create adapted workout
      const adaptedWorkout: Workout = {
        ...originalWorkout,
        id: this.generateWorkoutId(),
        title: response.data.title || `${originalWorkout.title} (Adapted)`,
        description: response.data.description || originalWorkout.description,
        difficulty: response.data.difficulty || originalWorkout.difficulty,
        duration: response.data.duration || originalWorkout.duration,
        estimatedCalories: response.data.estimatedCalories || originalWorkout.estimatedCalories,
        exercises: response.data.exercises || originalWorkout.exercises,
        createdAt: new Date().toISOString(),
      };

      // 🔍 Enhanced validation for adapted workout
      const adaptedValidationResult = exerciseValidator.validateWorkout(adaptedWorkout);
      const validatedAdaptedWorkout = adaptedValidationResult.fixedWorkout;

      // Log validation for debugging
      if (!adaptedValidationResult.isValid) {
        console.log('🔧 Adapted workout auto-corrections applied:', adaptedValidationResult.issues);
      }

      return {
        success: true,
        data: validatedAdaptedWorkout, // ✅ Return validated adapted workout
        confidence: response.confidence,
        generationTime: response.generationTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Workout adaptation failed: ${error}`,
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateWorkoutId(): string {
    return `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseDurationFromCommitment(timeCommitment: string): number {
    const durations: Record<string, number> = {
      '15-30': 25,
      '30-45': 40,
      '45-60': 50,
      '60+': 60,
    };
    return durations[timeCommitment] || 40;
  }

  private getWorkoutIcon(category: string): string {
    const icons: Record<string, string> = {
      strength: '💪',
      cardio: '🏃',
      flexibility: '🧘',
      hiit: '🔥',
      yoga: '🧘‍♀️',
      pilates: '🤸',
    };
    return icons[category] || '🏋️';
  }

  private getWorkoutTypesForGoals(
    goals: string[]
  ): ('strength' | 'cardio' | 'flexibility' | 'hiit')[] {
    const typeMap: Record<string, ('strength' | 'cardio' | 'flexibility' | 'hiit')[]> = {
      weight_loss: ['hiit', 'cardio', 'strength'],
      muscle_gain: ['strength', 'strength', 'cardio'],
      strength: ['strength', 'strength', 'flexibility'],
      endurance: ['cardio', 'hiit', 'strength'],
      flexibility: ['flexibility', 'strength', 'cardio'],
      general_fitness: ['strength', 'cardio', 'flexibility'],
    };

    const types: ('strength' | 'cardio' | 'flexibility' | 'hiit')[] = [];
    goals.forEach((goal) => {
      if (typeMap[goal]) {
        types.push(...typeMap[goal]);
      }
    });

    return types.length > 0 ? types : ['strength', 'cardio', 'flexibility'];
  }

  private calculateRestDays(workoutDays: number): number[] {
    const totalDays = 7;
    const restDays: number[] = [];

    if (workoutDays >= 6) return [7]; // Only Sunday rest
    if (workoutDays >= 4) return [4, 7]; // Wednesday and Sunday rest
    if (workoutDays >= 3) return [3, 5, 7]; // Tuesday, Thursday, Sunday rest

    // For 1-2 workout days, alternate with rest
    for (let i = 1; i <= totalDays; i++) {
      if (i % 2 === 0 || i > workoutDays * 2) {
        restDays.push(i);
      }
    }

    return restDays;
  }

  private generateProgressionPlan() {
    return [
      {
        week: 1,
        adjustments: ['Focus on form and technique', 'Complete all sets and reps'],
      },
      {
        week: 2,
        adjustments: ['Increase weight by 5-10%', 'Reduce rest time by 10 seconds'],
      },
      {
        week: 3,
        adjustments: ['Add extra set to compound exercises', 'Increase intensity'],
      },
      {
        week: 4,
        adjustments: ['Deload week - reduce weight by 20%', 'Focus on recovery'],
      },
    ];
  }

  private buildAdaptationPrompt(workout: Workout, feedback: any): string {
    let instructions = 'Adapt the workout based on the following feedback:\n';

    if (feedback.difficulty === 'too_easy') {
      instructions += '- Increase difficulty by adding more sets, reps, or advanced variations\n';
    } else if (feedback.difficulty === 'too_hard') {
      instructions += '- Decrease difficulty by reducing sets, reps, or using easier variations\n';
    }

    if (feedback.duration === 'too_long') {
      instructions += '- Reduce workout duration by removing or combining exercises\n';
    } else if (feedback.duration === 'too_short') {
      instructions += '- Extend workout duration by adding exercises or sets\n';
    }

    if (feedback.enjoyment === 'disliked_it') {
      instructions += '- Replace exercises with more enjoyable alternatives\n';
    }

    if (feedback.specificFeedback) {
      instructions += `- Address specific feedback: ${feedback.specificFeedback}\n`;
    }

    return instructions;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const workoutGenerator = new WorkoutGeneratorService();

export default workoutGenerator;
