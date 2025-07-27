// Weekly Content Generation Service for FitAI
// Generates 1-2 weeks of personalized workouts and meals based on user experience

import { geminiService, PROMPT_TEMPLATES } from './gemini';
import { WORKOUT_SCHEMA, NUTRITION_SCHEMA } from './schemas';
import { WEEKLY_PLAN_SCHEMA, DAILY_WORKOUT_SCHEMA } from './schemas/workoutSchema';
import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout, Meal, AIResponse, MealType } from '../types/ai';

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyWorkoutPlan {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  workouts: DayWorkout[]; // Enhanced with day assignments
  restDays: string[]; // Days of week as strings ('monday', 'tuesday', etc.)
  progressionNotes: string[];
  totalEstimatedCalories: number;
  planTitle: string;
  planDescription: string;
  experienceLevel: string;
  weeklyGoals: string[];
  createdAt: string;
}

export interface DayWorkout extends Workout {
  dayOfWeek: string; // 'monday', 'tuesday', etc.
  subCategory: string;
  intensityLevel: string;
  warmUp: ExerciseInstruction[];
  coolDown: ExerciseInstruction[];
  progressionNotes: string[];
  safetyConsiderations: string[];
  expectedBenefits: string[];
}

export interface ExerciseInstruction {
  name: string;
  duration?: number;
  instructions: string;
}

export interface WeeklyMealPlan {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  dailyMeals: {
    [day: string]: { // 'monday', 'tuesday', etc.
      breakfast: Meal;
      lunch: Meal;
      dinner: Meal;
      snacks: Meal[];
    };
  };
  weeklyMacroTargets: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  };
  alternativeMeals: Meal[]; // For swapping
  createdAt: string;
}

// ============================================================================
// WEEKLY CONTENT GENERATOR SERVICE
// ============================================================================

class WeeklyContentGeneratorService {

  /**
   * Generate weekly workout plan with structured day assignments
   */
  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyWorkoutPlan>> {
    try {
      // Determine plan configuration based on experience level
      const planConfig = this.getWeeklyPlanConfig(fitnessGoals.experience_level, weekNumber);
      
      console.log(`🏋️ Generating ${planConfig.name} for ${personalInfo.name}...`);
      
      // Build comprehensive weekly plan prompt
      const weeklyPlanPrompt = this.buildWeeklyPlanPrompt(
        personalInfo,
        fitnessGoals,
        planConfig,
        weekNumber
      );

      // Generate complete weekly plan using new structured schema
      const response = await geminiService.generateResponse<any>(
        weeklyPlanPrompt,
        {
          weekNumber: weekNumber,
          experienceLevel: fitnessGoals.experience_level,
          planConfig: planConfig
        },
        WEEKLY_PLAN_SCHEMA,
        3, // maxRetries
        {
          maxOutputTokens: 8192, // Increased for comprehensive weekly plans
          temperature: 0.7
        }
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to generate weekly workout plan'
        };
      }

      // Transform AI response to our WeeklyWorkoutPlan format
      const aiPlan = response.data;

      const dayWorkouts: DayWorkout[] = aiPlan.workouts.map((workout: any) => ({
        id: this.generateWorkoutId(weekNumber, workout.dayOfWeek),
        title: workout.title,
        description: workout.description,
        category: workout.category,
        subCategory: workout.subCategory || workout.category,
        difficulty: workout.difficulty || 'intermediate',
        duration: workout.duration,
        estimatedCalories: workout.estimatedCalories,
        intensityLevel: workout.intensityLevel || 'moderate',
        exercises: workout.exercises.map((exercise: any) => ({
          exerciseId: exercise.name.toLowerCase().replace(/\s+/g, '_'),
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight || 0,
          restTime: exercise.restTime,
          notes: exercise.instructions ? exercise.instructions.join(' ') : '',
          intensity: exercise.weight || 0
        })),
        warmUp: workout.warmUp || [],
        coolDown: workout.coolDown || [],
        equipment: workout.equipment,
        targetMuscleGroups: workout.targetMuscleGroups,
        dayOfWeek: workout.dayOfWeek,
        progressionNotes: workout.progressionNotes || [],
        safetyConsiderations: workout.safetyConsiderations || [],
        expectedBenefits: workout.expectedBenefits || [],
        icon: this.getWorkoutIcon(workout.category),
        tags: [`week-${weekNumber}`, workout.dayOfWeek, workout.category],
        isPersonalized: true,
        aiGenerated: true,
        createdAt: new Date().toISOString()
      }));

      // Create enhanced weekly plan
      const weeklyPlan: WeeklyWorkoutPlan = {
        id: this.generateWeeklyPlanId(weekNumber),
        userId: 'current-user', // Will be set by calling code
        weekNumber: weekNumber,
        startDate: this.getWeekStartDate(weekNumber),
        endDate: this.getWeekEndDate(weekNumber),
        workouts: dayWorkouts,
        restDays: aiPlan.restDays || planConfig.restDays,
        progressionNotes: aiPlan.weeklyProgression?.nextWeekAdjustments || [],
        totalEstimatedCalories: aiPlan.estimatedWeeklyCalories || 0,
        planTitle: aiPlan.planTitle,
        planDescription: aiPlan.planDescription,
        experienceLevel: aiPlan.experienceLevel,
        weeklyGoals: aiPlan.weeklyGoals || [],
        createdAt: new Date().toISOString()
      };



      return {
        success: true,
        data: weeklyPlan,
        confidence: 95,
        generationTime: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: `Weekly workout plan generation failed: ${error}`
      };
    }
  }

  /**
   * Generate weekly meal plan with macro tracking
   */
  async generateWeeklyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyMealPlan>> {
    try {
      console.log(`🥗 Generating weekly meal plan for ${personalInfo.name}...`);
      
      const macroTargets = this.calculateMacroTargets(personalInfo, fitnessGoals);
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dailyMeals: WeeklyMealPlan['dailyMeals'] = {};

      // Generate meals for each day of the week
      for (const day of daysOfWeek) {
        console.log(`  Generating meals for ${day}...`);
        
        // Generate breakfast
        const breakfast = await this.generateMealForDay(
          personalInfo, fitnessGoals, 'breakfast', day, macroTargets, weekNumber
        );
        
        // Generate lunch  
        const lunch = await this.generateMealForDay(
          personalInfo, fitnessGoals, 'lunch', day, macroTargets, weekNumber
        );
        
        // Generate dinner
        const dinner = await this.generateMealForDay(
          personalInfo, fitnessGoals, 'dinner', day, macroTargets, weekNumber
        );

        // Generate snacks
        const snack = await this.generateMealForDay(
          personalInfo, fitnessGoals, 'snack', day, macroTargets, weekNumber
        );

        dailyMeals[day] = {
          breakfast: breakfast,
          lunch: lunch,
          dinner: dinner,
          snacks: [snack]
        };
      }

      // Generate alternative meals for swapping
      const alternativeMeals = await this.generateAlternativeMeals(
        personalInfo, fitnessGoals, macroTargets
      );

      const weeklyPlan: WeeklyMealPlan = {
        id: this.generateWeeklyMealPlanId(weekNumber),
        userId: 'current-user', // Will be set by calling code
        weekNumber: weekNumber,
        startDate: this.getWeekStartDate(weekNumber),
        endDate: this.getWeekEndDate(weekNumber),
        dailyMeals: dailyMeals,
        weeklyMacroTargets: macroTargets,
        alternativeMeals: alternativeMeals,
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        data: weeklyPlan,
        confidence: 90,
        generationTime: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: `Weekly meal plan generation failed: ${error}`
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getWeeklyPlanConfig(experienceLevel: string, weekNumber: number) {
    const configs = {
      beginner: {
        name: "1 Week Starter Plan",
        workoutDays: 3,
        workoutTypes: ['strength', 'cardio', 'flexibility'],
        restDays: ['tuesday', 'thursday', 'saturday', 'sunday'],
        assignedDays: ['monday', 'wednesday', 'friday'],
        totalWeeks: 1
      },
      intermediate: {
        name: "1.5 Week Progressive Plan", 
        workoutDays: 5,
        workoutTypes: ['strength', 'cardio', 'strength', 'hiit', 'flexibility'],
        restDays: ['wednesday', 'sunday'],
        assignedDays: ['monday', 'tuesday', 'thursday', 'friday', 'saturday'],
        totalWeeks: 1.5
      },
      advanced: {
        name: "2 Week Intensive Plan",
        workoutDays: 6,
        workoutTypes: ['strength', 'cardio', 'strength', 'hiit', 'strength', 'flexibility'],
        restDays: ['sunday'],
        assignedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        totalWeeks: 2
      }
    };

    return configs[experienceLevel as keyof typeof configs] || configs.intermediate;
  }

  private buildWeeklyPlanPrompt(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    planConfig: any,
    weekNumber: number
  ): string {
    return `${PROMPT_TEMPLATES.WORKOUT_GENERATION}

WEEKLY PLAN GENERATION REQUEST:
Create a comprehensive ${planConfig.totalWeeks}-week workout plan for a ${fitnessGoals.experience_level} user.

USER PROFILE:
- Name: ${personalInfo.name}
- Age: ${personalInfo.age} years
- Gender: ${personalInfo.gender}
- Height: ${personalInfo.height}cm, Weight: ${personalInfo.weight}kg
- Activity Level: ${personalInfo.activityLevel}
- Experience Level: ${fitnessGoals.experience_level}

FITNESS GOALS:
- Primary Goals: ${fitnessGoals.primaryGoals.join(', ')}
- Time Available: ${fitnessGoals.timeCommitment} minutes per session
- Workout Frequency: ${planConfig.workoutDays} workouts per week

PLAN STRUCTURE REQUIREMENTS:
- Workout Days: ${planConfig.assignedDays.join(', ')}
- Rest Days: ${planConfig.restDays.join(', ')}
- Workout Types: ${planConfig.workoutTypes.join(', ')}
- Progressive difficulty appropriate for Week ${weekNumber}

SPECIFIC REQUIREMENTS FOR EACH WORKOUT:
1. Assign each workout to a specific day of the week
2. Include detailed exercise instructions and form cues
3. Provide proper warm-up and cool-down routines
4. Add safety considerations and modifications
5. Include progression notes for future weeks
6. Ensure workouts complement each other throughout the week

WORKOUT SCHEDULING STRATEGY:
- Monday: Start strong with primary focus workout
- Tuesday-Saturday: Distribute workouts based on recovery needs
- Sunday: Rest day for all experience levels
- Avoid back-to-back high-intensity days
- Balance muscle groups throughout the week

Create a complete weekly plan with structured day assignments that progressively builds throughout the week.`;
  }

  private buildWeeklyWorkoutPrompt(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    workoutType: string,
    dayNumber: number,
    totalDays: number,
    weekNumber: number
  ): string {
    return `${PROMPT_TEMPLATES.WORKOUT_GENERATION}

WEEKLY PLAN CONTEXT:
- This is Day ${dayNumber} of ${totalDays} in Week ${weekNumber}
- Workout Type: ${workoutType}
- User Experience: ${fitnessGoals.experience_level}
- Primary Goals: ${fitnessGoals.primaryGoals.join(', ')}
- Progressive Plan: Each workout should build on previous days

SPECIFIC REQUIREMENTS:
- Create a ${workoutType} workout appropriate for day ${dayNumber}
- Ensure progression from previous workouts in the week
- Match user's ${fitnessGoals.experience_level} experience level
- Focus on ${fitnessGoals.primaryGoals.join(' and ')} goals
- Include proper warm-up and cool-down
- Provide clear progression notes for next week

PERSONALIZATION DATA:
- Age: ${personalInfo.age} years
- Gender: ${personalInfo.gender}
- Height: ${personalInfo.height}cm, Weight: ${personalInfo.weight}kg
- Activity Level: ${personalInfo.activityLevel}
- Time Available: ${fitnessGoals.timeCommitment} minutes`;
  }

  private async generateMealForDay(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: string,
    day: string,
    macroTargets: any,
    weekNumber: number
  ): Promise<Meal> {
    // Calculate meal-specific calorie target
    const mealCalories = this.getMealCalorieTarget(mealType, macroTargets.dailyCalories);
    
    const mealPrompt = `${PROMPT_TEMPLATES.NUTRITION_PLANNING}

MEAL CONTEXT:
- Meal Type: ${mealType}
- Day: ${day}
- Week: ${weekNumber}
- Target Calories: ${mealCalories}
- Daily Protein Target: ${macroTargets.dailyProtein}g
- User Goals: ${fitnessGoals.primaryGoals.join(', ')}

Create a single ${mealType} meal that fits the calorie target and supports the user's goals.`;

    const response = await geminiService.generateResponse<any>(
      mealPrompt,
      {},
      NUTRITION_SCHEMA,
      3, // maxRetries
      {
        maxOutputTokens: 6144, // Increased for detailed meal plans
        temperature: 0.7
      }
    );

    if (response.success && response.data && response.data.meals?.[0]) {
      const mealData = response.data.meals[0];
      return {
        id: this.generateMealId(mealType, day, weekNumber),
        name: mealData.name,
        type: mealType as MealType,
        description: mealData.description,
        items: mealData.items,
        totalCalories: mealData.totalCalories,
        totalProtein: mealData.totalProtein,
        totalCarbohydrates: mealData.totalCarbohydrates,
        totalFat: mealData.totalFat,
        preparationTime: 15, // Default
        difficulty: 'easy', // Default
        tags: [`week-${weekNumber}`, day, mealType],
        aiGenerated: true,
        createdAt: new Date().toISOString()
      };
    }

    // Fallback meal if generation fails
    return this.createFallbackMeal(mealType, mealCalories);
  }

  private async generateAlternativeMeals(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    macroTargets: any
  ): Promise<Meal[]> {
    const alternatives: Meal[] = [];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    for (const mealType of mealTypes) {
      const calories = this.getMealCalorieTarget(mealType, macroTargets.dailyCalories);
      
      try {
        const response = await geminiService.generateResponse<any>(
          `${PROMPT_TEMPLATES.NUTRITION_PLANNING}
          
          Create 2 alternative ${mealType} options with ${calories} calories each for meal swapping.`,
          {},
          NUTRITION_SCHEMA,
          3, // maxRetries
          {
            maxOutputTokens: 4096, // Adequate for alternative meals
            temperature: 0.8 // Slightly higher for variety
          }
        );

        if (response.success && response.data?.meals) {
          response.data.meals.forEach((meal: any, index: number) => {
            alternatives.push({
              id: `alt-${mealType}-${index}`,
              name: meal.name,
              type: mealType as MealType,
              description: meal.description,
              items: meal.items,
              totalCalories: meal.totalCalories,
              totalProtein: meal.totalProtein,
              totalCarbohydrates: meal.totalCarbohydrates,
              totalFat: meal.totalFat,
              preparationTime: 15,
              difficulty: 'easy',
              tags: ['alternative', mealType],
              aiGenerated: true,
              createdAt: new Date().toISOString()
            });
          });
        }
      } catch (error) {
        console.warn(`Failed to generate alternatives for ${mealType}:`, error);
      }
    }

    return alternatives;
  }

  private calculateMacroTargets(personalInfo: PersonalInfo, fitnessGoals: FitnessGoals) {
    // Basic calorie calculation (Mifflin-St Jeor)
    let bmr: number;
    if (personalInfo.gender.toLowerCase() === 'male') {
      bmr = 10 * Number(personalInfo.weight) + 6.25 * Number(personalInfo.height) - 5 * Number(personalInfo.age) + 5;
    } else {
      bmr = 10 * Number(personalInfo.weight) + 6.25 * Number(personalInfo.height) - 5 * Number(personalInfo.age) - 161;
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      extreme: 1.9
    };
    
    const tdee = bmr * (activityMultipliers[personalInfo.activityLevel as keyof typeof activityMultipliers] || 1.55);
    
    // Adjust based on goals
    let dailyCalories = tdee;
    if (fitnessGoals.primaryGoals.includes('weight_loss')) {
      dailyCalories = tdee * 0.85; // 15% deficit
    } else if (fitnessGoals.primaryGoals.includes('muscle_gain')) {
      dailyCalories = tdee * 1.1; // 10% surplus
    }

    // Macro split (protein: 25%, carbs: 45%, fat: 30%)
    const dailyProtein = Math.round((dailyCalories * 0.25) / 4); // 4 cal per gram
    const dailyCarbs = Math.round((dailyCalories * 0.45) / 4);
    const dailyFat = Math.round((dailyCalories * 0.30) / 9); // 9 cal per gram

    return {
      dailyCalories: Math.round(dailyCalories),
      dailyProtein,
      dailyCarbs,
      dailyFat
    };
  }

  private getMealCalorieTarget(mealType: string, dailyCalories: number): number {
    const mealSplits = {
      breakfast: 0.25, // 25%
      lunch: 0.35,     // 35%
      dinner: 0.30,    // 30%
      snack: 0.10      // 10%
    };
    
    return Math.round(dailyCalories * (mealSplits[mealType as keyof typeof mealSplits] || 0.25));
  }

  private createFallbackMeal(mealType: string, calories: number): Meal {
    return {
      id: `fallback-${mealType}`,
      name: `Simple ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
      type: mealType,
      description: `A nutritious ${mealType} option`,
      items: [{
        foodId: `fallback-food-${mealType}`,
        food: {
          id: `fallback-food-${mealType}`,
          name: 'Balanced meal components',
          category: 'mixed',
          nutrition: {
            calories: calories,
            macros: {
              protein: Math.round(calories * 0.25 / 4),
              carbohydrates: Math.round(calories * 0.45 / 4),
              fat: Math.round(calories * 0.30 / 9),
              fiber: 5
            },
            servingSize: 100,
            servingUnit: 'g'
          },
          allergens: [],
          dietaryLabels: [],
          verified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        calories: calories,
        macros: {
          protein: Math.round(calories * 0.25 / 4),
          carbohydrates: Math.round(calories * 0.45 / 4),
          fat: Math.round(calories * 0.30 / 9),
          fiber: 5
        }
      }],
      totalCalories: calories,
      totalProtein: Math.round(calories * 0.25 / 4),
      totalCarbohydrates: Math.round(calories * 0.45 / 4),
      totalFat: Math.round(calories * 0.30 / 9),
      preparationTime: 10,
      difficulty: 'easy',
      tags: ['fallback'],
      aiGenerated: false,
      createdAt: new Date().toISOString()
    };
  }

  private generateProgressionNotes(experienceLevel: string, weekNumber: number): string[] {
    const baseNotes = [
      'Focus on proper form and technique',
      'Listen to your body and rest when needed',
      'Stay consistent with the schedule'
    ];

    if (experienceLevel === 'beginner') {
      return [
        ...baseNotes,
        'Start with lighter weights and master the movements',
        'Gradually increase intensity as you feel stronger'
      ];
    } else if (experienceLevel === 'intermediate') {
      return [
        ...baseNotes,
        'Increase weight by 5-10% when you can complete all sets easily',
        'Focus on mind-muscle connection'
      ];
    } else {
      return [
        ...baseNotes,
        'Push your limits while maintaining form',
        'Consider advanced techniques like drop sets or supersets'
      ];
    }
  }

  private generateWorkoutId(weekNumber: number, dayIdentifier: string | number): string {
    const dayId = typeof dayIdentifier === 'string' ? dayIdentifier : `d${dayIdentifier}`;
    return `workout_w${weekNumber}_${dayId}_${Date.now()}`;
  }

  private generateMealId(mealType: string, day: string, weekNumber: number): string {
    return `meal_${mealType}_${day}_w${weekNumber}_${Date.now()}`;
  }

  private generateWeeklyPlanId(weekNumber: number): string {
    return `weekly_plan_w${weekNumber}_${Date.now()}`;
  }

  private generateWeeklyMealPlanId(weekNumber: number): string {
    return `weekly_meals_w${weekNumber}_${Date.now()}`;
  }

  private getWeekStartDate(weekNumber: number): string {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + (weekNumber - 1) * 7);
    return startDate.toISOString().split('T')[0];
  }

  private getWeekEndDate(weekNumber: number): string {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + (weekNumber - 1) * 7 + 6);
    return endDate.toISOString().split('T')[0];
  }

  private getWorkoutIcon(category: string): string {
    const icons: Record<string, string> = {
      strength: '💪',
      cardio: '🏃',
      flexibility: '🧘',
      hiit: '🔥',
      hybrid: '⚡'
    };
    return icons[category] || '🏋️';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const weeklyContentGenerator = new WeeklyContentGeneratorService();

export default weeklyContentGenerator;