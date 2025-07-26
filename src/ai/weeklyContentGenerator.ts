// Weekly Content Generation Service for FitAI
// Generates 1-2 weeks of personalized workouts and meals based on user experience

import { geminiService, PROMPT_TEMPLATES } from './gemini';
import { WORKOUT_SCHEMA, NUTRITION_SCHEMA } from './schemas';
import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout, Meal, AIResponse } from '../types/ai';

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyWorkoutPlan {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  workouts: Workout[];
  restDays: number[]; // Days of week (0=Sunday, 6=Saturday)
  progressionNotes: string[];
  totalEstimatedCalories: number;
  createdAt: string;
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
   * Generate weekly workout plan based on user experience level
   */
  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyWorkoutPlan>> {
    try {
      // Determine plan duration based on experience level
      const planConfig = this.getWeeklyPlanConfig(fitnessGoals.experience_level, weekNumber);
      
      console.log(`🏋️  Generating ${planConfig.name} for ${personalInfo.name}...`);
      
      const workouts: Workout[] = [];
      
      // Generate workouts for each training day
      for (let day = 0; day < planConfig.workoutDays; day++) {
        const workoutType = planConfig.workoutTypes[day % planConfig.workoutTypes.length];
        
        const workoutPrompt = this.buildWeeklyWorkoutPrompt(
          personalInfo,
          fitnessGoals,
          workoutType,
          day + 1,
          planConfig.workoutDays,
          weekNumber
        );

        const response = await geminiService.generateResponse<any>(
          workoutPrompt,
          {
            dayNumber: day + 1,
            totalDays: planConfig.workoutDays,
            weekNumber: weekNumber,
            workoutType: workoutType
          },
          WORKOUT_SCHEMA
        );

        if (response.success && response.data) {
          const workout: Workout = {
            id: this.generateWorkoutId(weekNumber, day + 1),
            title: response.data.title,
            description: response.data.description,
            category: response.data.category,
            difficulty: response.data.difficulty,
            duration: response.data.duration,
            estimatedCalories: response.data.estimatedCalories,
            exercises: response.data.exercises,
            equipment: response.data.equipment,
            targetMuscleGroups: response.data.targetMuscleGroups,
            icon: this.getWorkoutIcon(response.data.category),
            tags: [`week-${weekNumber}`, `day-${day + 1}`, workoutType],
            isPersonalized: true,
            aiGenerated: true,
            createdAt: new Date().toISOString()
          };
          
          workouts.push(workout);
        }
      }

      if (workouts.length === 0) {
        return {
          success: false,
          error: 'Failed to generate any workouts for the weekly plan'
        };
      }

      // Create weekly plan
      const weeklyPlan: WeeklyWorkoutPlan = {
        id: this.generateWeeklyPlanId(weekNumber),
        userId: 'current-user', // Will be set by calling code
        weekNumber: weekNumber,
        startDate: this.getWeekStartDate(weekNumber),
        endDate: this.getWeekEndDate(weekNumber),
        workouts: workouts,
        restDays: planConfig.restDays,
        progressionNotes: this.generateProgressionNotes(fitnessGoals.experience_level, weekNumber),
        totalEstimatedCalories: workouts.reduce((sum, w) => sum + (w.estimatedCalories || 0), 0),
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
        restDays: [2, 4, 6, 7], // Tuesday, Thursday, Saturday, Sunday
        totalWeeks: 1
      },
      intermediate: {
        name: "1.5 Week Progressive Plan", 
        workoutDays: 5,
        workoutTypes: ['strength', 'cardio', 'strength', 'hiit', 'flexibility'],
        restDays: [3, 7], // Wednesday, Sunday
        totalWeeks: 1.5
      },
      advanced: {
        name: "2 Week Intensive Plan",
        workoutDays: 6,
        workoutTypes: ['strength', 'cardio', 'strength', 'hiit', 'strength', 'flexibility'],
        restDays: [7], // Sunday only
        totalWeeks: 2
      }
    };

    return configs[experienceLevel as keyof typeof configs] || configs.intermediate;
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
      NUTRITION_SCHEMA
    );

    if (response.success && response.data && response.data.meals?.[0]) {
      const mealData = response.data.meals[0];
      return {
        id: this.generateMealId(mealType, day, weekNumber),
        name: mealData.name,
        type: mealType,
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
          NUTRITION_SCHEMA
        );

        if (response.success && response.data?.meals) {
          response.data.meals.forEach((meal: any, index: number) => {
            alternatives.push({
              id: `alt-${mealType}-${index}`,
              name: meal.name,
              type: mealType,
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
      bmr = 10 * personalInfo.weight + 6.25 * personalInfo.height - 5 * personalInfo.age + 5;
    } else {
      bmr = 10 * personalInfo.weight + 6.25 * personalInfo.height - 5 * personalInfo.age - 161;
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
        name: 'Balanced meal components',
        quantity: 1,
        unit: 'serving',
        calories: calories,
        protein: Math.round(calories * 0.25 / 4),
        carbohydrates: Math.round(calories * 0.45 / 4),
        fat: Math.round(calories * 0.30 / 9)
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

  private generateWorkoutId(weekNumber: number, dayNumber: number): string {
    return `workout_w${weekNumber}_d${dayNumber}_${Date.now()}`;
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