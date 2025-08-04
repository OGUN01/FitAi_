// Weekly Content Generation Service for FitAI
// Generates 1-2 weeks of personalized workouts and meals based on user experience

import { geminiService, PROMPT_TEMPLATES } from './gemini';
import { WORKOUT_SCHEMA, NUTRITION_SCHEMA } from './schemas';
import { WEEKLY_PLAN_SCHEMA, DAILY_WORKOUT_SCHEMA } from './schemas/workoutSchema';
import { SIMPLIFIED_WEEKLY_PLAN_SCHEMA, TEST_SIMPLE_SCHEMA } from './schemas/simplifiedWorkoutSchema';
import { generateConstrainedWorkout, OPTIMIZED_SYSTEM_PROMPT } from './constrainedWorkoutGeneration';
import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout, Meal, AIResponse, MealType } from '../types/ai';
import { exerciseFilterService } from '../services/exerciseFilterService';

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

      // 🚨 CONSTRAINT-ENFORCED GENERATION WITH VALIDATION RETRY
      let response: any;
      let validationAttempt = 0;
      const maxValidationAttempts = 3;
      
      while (validationAttempt < maxValidationAttempts) {
        validationAttempt++;
        console.log(`🎯 Generation attempt ${validationAttempt}/${maxValidationAttempts} with constraint enforcement`);
        
        // Use increasingly strict prompts on retries
        const currentPrompt = validationAttempt > 1 
          ? this.buildStrictConstraintPrompt(weeklyPlanPrompt, validationAttempt)
          : weeklyPlanPrompt;
        
        // First, let's test with a super simple schema to verify API connectivity
        console.log('🧪 Testing with simplified schema to diagnose issue...');
        
        response = await geminiService.generateResponse<any>(
          currentPrompt,
          {
            weekNumber: weekNumber,
            experienceLevel: fitnessGoals.experience_level,
            planConfig: planConfig,
            validationAttempt: validationAttempt
          },
          SIMPLIFIED_WEEKLY_PLAN_SCHEMA, // Using simplified schema temporarily
          2, // Fewer retries per attempt since we have validation retry
          {
            maxOutputTokens: 8192,
            temperature: validationAttempt > 1 ? 0.5 : 0.7, // Lower temperature for stricter generation
            systemPrompt: OPTIMIZED_SYSTEM_PROMPT
          }
        );

        if (!response.success || !response.data) {
          if (validationAttempt === maxValidationAttempts) {
            return {
              success: false,
              error: response.error || 'Failed to generate weekly workout plan after all attempts'
            };
          }
          continue; // Try again with stricter prompt
        }
        
        // Quick validation check before full processing
        const quickValidation = this.quickValidateExerciseIds(response.data);
        if (quickValidation.isValid) {
          console.log(`✅ Generation attempt ${validationAttempt} passed initial validation`);
          break; // Success!
        } else {
          console.log(`❌ Generation attempt ${validationAttempt} failed validation:`, quickValidation.errors.slice(0, 3));
          if (validationAttempt === maxValidationAttempts) {
            return {
              success: false,
              error: `All generation attempts failed validation. Last errors: ${quickValidation.errors.slice(0, 2).join(', ')}`
            };
          }
        }
      }

      // Transform AI response to our WeeklyWorkoutPlan format
      const aiPlan = response.data;

      // 🔍 Debug: Validate AI response structure
      console.log('🔍 Weekly Generator Debug - AI Plan structure:');
      console.log('  - aiPlan exists:', aiPlan ? '✅' : '❌');
      console.log('  - aiPlan type:', typeof aiPlan);
      console.log('  - aiPlan constructor:', aiPlan?.constructor?.name);
      console.log('  - aiPlan keys:', Object.keys(aiPlan || {}));
      console.log('  - aiPlan.workouts exists:', aiPlan?.workouts ? '✅' : '❌');
      console.log('  - aiPlan.workouts type:', Array.isArray(aiPlan?.workouts) ? 'Array' : typeof aiPlan?.workouts);
      console.log('  - aiPlan.workouts length:', aiPlan?.workouts?.length || 0);
      console.log('  - aiPlan preview (first 500 chars):', JSON.stringify(aiPlan, null, 1)?.substring(0, 500));
      
      // Additional validation for the expected properties
      console.log('🔍 Expected properties check:');
      console.log('  - planTitle:', aiPlan?.planTitle ? '✅' : '❌');
      console.log('  - planDescription:', aiPlan?.planDescription ? '✅' : '❌');
      console.log('  - experienceLevel:', aiPlan?.experienceLevel ? '✅' : '❌');
      console.log('  - estimatedWeeklyCalories:', aiPlan?.estimatedWeeklyCalories ? '✅' : '❌');
      
      if (!aiPlan?.workouts || !Array.isArray(aiPlan.workouts) || aiPlan.workouts.length === 0) {
        console.error('❌ Weekly Generator - Invalid workouts data:', aiPlan?.workouts);
        return {
          success: false,
          error: 'Generated plan has no valid workouts data'
        };
      }

      const dayWorkouts: DayWorkout[] = aiPlan.workouts.map((workout: any, index: number) => {
        console.log(`🔍 Processing workout ${index + 1}:`, workout?.title || 'Untitled');
        console.log(`  - Day: ${workout?.dayOfWeek}`);
        console.log(`  - Exercises: ${workout?.exercises?.length || 0}`);
        
        // Validate workout has required properties
        if (!workout.title || !workout.dayOfWeek) {
          console.error(`❌ Invalid workout ${index + 1}:`, { title: workout?.title, dayOfWeek: workout?.dayOfWeek });
        }
        
        // Validate exercises have database IDs
        if (workout.exercises?.length > 0) {
          workout.exercises.forEach((exercise: any, exIndex: number) => {
            if (!exercise.exerciseId) {
              console.error(`❌ Exercise ${exIndex + 1} missing exerciseId:`, exercise);
            } else {
              console.log(`  - Exercise ${exIndex + 1}: ${exercise.exerciseId} (${exercise.name})`);
            }
          });
        }
        
        return {
          id: this.generateWorkoutId(weekNumber, workout.dayOfWeek),
          title: workout.title,
          description: workout.description,
          category: workout.category,
          subCategory: workout.subCategory || workout.category,
          difficulty: workout.difficulty || 'intermediate',
          duration: workout.duration,
          estimatedCalories: workout.estimatedCalories,
          intensityLevel: workout.intensityLevel || 'moderate',
          exercises: workout.exercises?.map((exercise: any) => ({
            exerciseId: exercise.exerciseId || 'unknown', // Use database ID from constraint system
            name: exercise.name || 'Unknown Exercise', // Keep creative name for display
            sets: exercise.sets || 3,
            reps: exercise.reps || 10,
            weight: exercise.weight || 0,
            restTime: exercise.restTime || 60,
            notes: exercise.instructions ? exercise.instructions.join(' ') : '',
            intensity: exercise.weight || 0
          })) || [],
          warmUp: workout.warmUp || [],
          coolDown: workout.coolDown || [],
          equipment: workout.equipment || [],
          targetMuscleGroups: workout.targetMuscleGroups || [],
          dayOfWeek: workout.dayOfWeek,
          progressionNotes: workout.progressionNotes || [],
          safetyConsiderations: workout.safetyConsiderations || [],
          expectedBenefits: workout.expectedBenefits || [],
          icon: this.getWorkoutIcon(workout.category),
          tags: [`week-${weekNumber}`, workout.dayOfWeek, workout.category],
          isPersonalized: true,
          aiGenerated: true,
          createdAt: new Date().toISOString()
        };
      });

      console.log(`🔍 Weekly Generator Debug - Processed ${dayWorkouts.length} workouts`);

      // ✅ CRITICAL VALIDATION: Ensure all exercises use database IDs
      const validationErrors = this.validateExerciseIds(dayWorkouts);
      if (validationErrors.length > 0) {
        console.error('❌ EXERCISE ID VALIDATION FAILED:', validationErrors);
        return {
          success: false,
          error: `Invalid exercise IDs detected: ${validationErrors.join(', ')}. Regeneration required with proper database IDs.`
        };
      }

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
  // VALIDATION METHODS
  // ============================================================================

  private validateExerciseIds(dayWorkouts: DayWorkout[]): string[] {
    const errors: string[] = [];
    const validExerciseIds = exerciseFilterService.getAllExerciseIds();
    
    dayWorkouts.forEach((workout, workoutIndex) => {
      workout.exercises?.forEach((exercise, exerciseIndex) => {
        if (!exercise.exerciseId || exercise.exerciseId === 'unknown') {
          errors.push(`Workout ${workoutIndex + 1}, Exercise ${exerciseIndex + 1}: Missing exerciseId`);
        } else if (!validExerciseIds.includes(exercise.exerciseId)) {
          errors.push(`Workout ${workoutIndex + 1}, Exercise ${exerciseIndex + 1}: Invalid exerciseId "${exercise.exerciseId}" (not in database)`);
        }
      });
    });
    
    return errors;
  }

  private quickValidateExerciseIds(aiPlan: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validExerciseIds = exerciseFilterService.getAllExerciseIds();
    
    if (!aiPlan?.workouts || !Array.isArray(aiPlan.workouts)) {
      return { isValid: false, errors: ['No workouts in AI response'] };
    }
    
    aiPlan.workouts.forEach((workout: any, workoutIndex: number) => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach((exercise: any, exerciseIndex: number) => {
          if (!exercise.exerciseId) {
            errors.push(`W${workoutIndex + 1}E${exerciseIndex + 1}: Missing exerciseId`);
          } else if (!validExerciseIds.includes(exercise.exerciseId)) {
            errors.push(`W${workoutIndex + 1}E${exerciseIndex + 1}: Invalid ID "${exercise.exerciseId}"`);
          }
        });
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }

  private buildStrictConstraintPrompt(originalPrompt: string, attempt: number): string {
    const stricterWarnings = {
      2: `
⚠️ SECOND ATTEMPT: The previous response contained invalid exercise IDs.
You MUST use ONLY the exercise IDs provided in the lists below.
Example of CORRECT exercise IDs: VPPtusI, 8d8qJQI, JGKowMS
Example of INCORRECT exercise IDs: dynamic_elevators, mountain_climbers, push_ups
`,
      3: `
🚨 FINAL ATTEMPT: Multiple responses have failed validation.
CRITICAL REQUIREMENT: Use ONLY the exact exerciseId values from the provided exercise lists.
- Use IDs like "VPPtusI" NOT descriptive names like "dynamic_elevators"
- Copy the exact ID from the exercise list - do not modify or create new ones
- This is your last chance - the response WILL BE REJECTED if it contains invalid exercise IDs
`
    };

    return originalPrompt + (stricterWarnings[attempt as keyof typeof stricterWarnings] || '');
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
    // Get filtered exercises based on user profile
    const filteredExercises = exerciseFilterService.filterExercises(personalInfo, fitnessGoals);
    
    // Separate exercises by type
    const warmupExercises = exerciseFilterService.getExercisesByType(filteredExercises, 'warmup', 20);
    const mainExercises = filteredExercises.filter(ex => 
      !ex.name.toLowerCase().includes('warm') && 
      !ex.name.toLowerCase().includes('cool') &&
      !ex.name.toLowerCase().includes('stretch')
    );
    const cooldownExercises = exerciseFilterService.getExercisesByType(filteredExercises, 'cooldown', 15);
    
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

🚨 CRITICAL: EXERCISE SELECTION REQUIREMENTS - MANDATORY COMPLIANCE 🚨
YOU MUST ONLY USE EXERCISES FROM THE PROVIDED LISTS BELOW. NO EXCEPTIONS.
- Each exercise has a unique ID (like "VPPtusI", "8d8qJQI") that MUST be used exactly as provided
- DO NOT create new exercises, modify names, or invent exercise IDs
- DO NOT use descriptive names like "dynamic_elevators" or "mountain_climbers"
- ONLY use the exact exerciseId values provided in the lists below
- If you use ANY exercise not in these lists, the response will be REJECTED

MANDATORY: Use these EXACT exercise IDs in your response:

WARM-UP EXERCISES (use for warm-up sections):
${warmupExercises.slice(0, 15).map(ex => `- ID: ${ex.exerciseId} | Name: ${ex.name} | Equipment: ${ex.equipments.join(', ')}`).join('\n')}

MAIN EXERCISES (use for main workout):
${mainExercises.slice(0, 50).map(ex => `- ID: ${ex.exerciseId} | Name: ${ex.name} | Target: ${ex.targetMuscles.join(', ')} | Equipment: ${ex.equipments.join(', ')}`).join('\n')}

COOL-DOWN EXERCISES (use for cool-down sections):
${cooldownExercises.slice(0, 10).map(ex => `- ID: ${ex.exerciseId} | Name: ${ex.name} | Equipment: ${ex.equipments.join(', ')}`).join('\n')}

SPECIFIC REQUIREMENTS FOR EACH WORKOUT:
1. MANDATORY: Use the exact exerciseId (like "VPPtusI") in the exerciseId field
2. MANDATORY: Use the provided Name (like "inverted row bent knees") or a creative variation for the name field
3. NEVER use the exerciseId as the display name - always use proper exercise names
4. Assign each workout to a specific day of the week  
5. Include proper warm-up and cool-down routines using provided exercises
6. Add safety considerations and modifications
7. Include progression notes for future weeks

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