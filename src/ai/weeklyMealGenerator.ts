import { geminiService } from './gemini';
import { WEEKLY_MEAL_PLAN_SCHEMA } from './schemas';
import { PersonalInfo, FitnessGoals, DietPreferences } from '../types/user';
import { AIResponse } from '../types/ai';

// Types for meal generation
export interface MealItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  category: 'protein' | 'carbs' | 'vegetables' | 'fruits' | 'fats' | 'dairy' | 'grains';
  preparationTime: number; // in minutes
  instructions?: string;
}

export interface DayMeal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description: string;
  items: MealItem[];
  totalCalories: number;
  totalMacros: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  preparationTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  dayOfWeek: string;
  isPersonalized: boolean;
  aiGenerated: boolean;
  createdAt: string;
}

export interface WeeklyMealPlan {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  meals: DayMeal[];
  totalEstimatedCalories: number;
  planTitle: string;
  planDescription: string;
  dietaryRestrictions: string[];
  weeklyGoals: string[];
  createdAt: string;
}

export interface MealGenerationResponse {
  success: boolean;
  data?: WeeklyMealPlan;
  error?: string;
}

class WeeklyMealContentGenerator {
  constructor() {
    // No initialization needed - using geminiService
  }

  async generateWeeklyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    dietPreferences: DietPreferences
  ): Promise<MealGenerationResponse> {
    try {
      console.log('🍽️ Generating complete 7-day meal plan with structured output...');
      
      // Add timeout wrapper
      const timeoutPromise = new Promise<MealGenerationResponse>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Meal generation timeout after 60 seconds'));
        }, 60000); // 60 second timeout
      });

      const generationPromise = this.performMealGeneration(personalInfo, fitnessGoals, dietPreferences);
      
      // Race between generation and timeout
      return await Promise.race([generationPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Error generating weekly meal plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate meal plan',
      };
    }
  }

  private async performMealGeneration(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    dietPreferences: DietPreferences
  ): Promise<MealGenerationResponse> {
    const calorieTarget = this.calculateDailyCalories(personalInfo, fitnessGoals);
    const macroTargets = this.calculateMacroTargets(calorieTarget, fitnessGoals);

    const prompt = this.buildMealGenerationPrompt(personalInfo, fitnessGoals, dietPreferences);

    // Use structured response with reduced complexity
    const aiResponse: AIResponse<any> = await geminiService.generateResponse(
        prompt,
        {
          name: personalInfo.name,
          age: personalInfo.age,
          gender: personalInfo.gender,
          weight: personalInfo.weight,
          height: personalInfo.height,
          activityLevel: personalInfo.activityLevel,
          primaryGoals: fitnessGoals.primaryGoals.join(', '),
          experience: fitnessGoals.experience,
          timeCommitment: fitnessGoals.timeCommitment,
          dietType: dietPreferences.dietType,
          allergies: dietPreferences.allergies?.join(', ') || 'None',
          dislikes: dietPreferences.dislikes?.join(', ') || 'None',
          cookingSkill: dietPreferences.cookingSkill,
          mealPrepTime: dietPreferences.mealPrepTime,
          calorieTarget: calorieTarget,
          proteinTarget: macroTargets.protein,
          carbTarget: macroTargets.carbs,
          fatTarget: macroTargets.fat
        },
        WEEKLY_MEAL_PLAN_SCHEMA,
        2, // Reduced retries
        {
          maxOutputTokens: 16384, // Reduced token limit for faster generation
          temperature: 0.7
        }
      );

      if (!aiResponse.success || !aiResponse.data) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to generate weekly meal plan'
        };
      }

      const aiPlan = aiResponse.data;

      // Transform AI response to our WeeklyMealPlan format
      const weeklyPlan: WeeklyMealPlan = {
        id: `weekly_meal_plan_w1_${Date.now()}`,
        userId: 'current-user',
        weekNumber: 1,
        startDate: this.getWeekStartDate(),
        endDate: this.getWeekEndDate(),
        meals: aiPlan.meals.map((meal: any, index: number) => ({
          id: `meal_w1_${meal.dayOfWeek}_${meal.type}_${Date.now() + index}`,
          type: meal.type,
          name: meal.name,
          description: meal.description,
          items: meal.items.map((item: any, itemIndex: number) => ({
            id: `item_${Date.now()}_${itemIndex}`,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calories,
            macros: item.macros,
            category: item.category,
            preparationTime: item.preparationTime || 5,
            instructions: item.instructions || '',
          })),
          totalCalories: meal.totalCalories,
          totalMacros: meal.totalMacros,
          preparationTime: meal.preparationTime,
          difficulty: meal.difficulty,
          tags: meal.tags || [],
          dayOfWeek: meal.dayOfWeek,
          isPersonalized: true,
          aiGenerated: true,
          createdAt: new Date().toISOString(),
        })),
        totalEstimatedCalories: aiPlan.totalEstimatedCalories || 0,
        planTitle: aiPlan.planTitle,
        planDescription: aiPlan.planDescription,
        dietaryRestrictions: aiPlan.dietaryRestrictions || [],
        weeklyGoals: aiPlan.weeklyGoals || [],
        createdAt: new Date().toISOString(),
      };

      console.log('✅ Weekly meal plan generated successfully with structured output');
      console.log(`🔍 Generated plan details:`, {
        title: weeklyPlan.planTitle,
        totalMeals: weeklyPlan.meals.length,
        mealsByDay: weeklyPlan.meals.reduce((acc, meal) => {
          acc[meal.dayOfWeek] = (acc[meal.dayOfWeek] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalCalories: weeklyPlan.totalEstimatedCalories
      });
      
      return {
        success: true,
        data: weeklyPlan,
      };
  }

  private buildMealGenerationPrompt(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    dietPreferences: DietPreferences
  ): string {
    return `
You are a professional nutritionist and meal planning expert. Create a comprehensive 7-day meal plan based on the following user profile:

**User Profile:**
- Name: {name}
- Age: {age}
- Gender: {gender}
- Weight: {weight}kg
- Height: {height}cm
- Activity Level: {activityLevel}

**Fitness Goals:**
- Primary Goals: {primaryGoals}
- Experience Level: {experience}
- Time Commitment: {timeCommitment}

**Diet Preferences:**
- Diet Type: {dietType}
- Allergies: {allergies}
- Dislikes: {dislikes}
- Cooking Skill: {cookingSkill}
- Meal Prep Time: {mealPrepTime}

**Daily Targets:**
- Calories: {calorieTarget}
- Protein: {proteinTarget}g
- Carbohydrates: {carbTarget}g
- Fat: {fatTarget}g
- Fiber: 25-35g

**Requirements:**
1. Create meals for 7 days (Monday through Sunday) - complete weekly meal plan
2. Include breakfast, lunch, and dinner for each day (21 total meals)
3. Ensure meals align with diet preferences and restrictions
4. Balance macronutrients according to fitness goals
5. Consider preparation time and cooking skill level
6. Include essential nutritional information (simplified)
7. Each meal should be practical and realistic
8. Focus on variety across the full week

**Important Notes:**
- Use the structured response format defined in the schema
- Keep meal descriptions concise but informative
- Make meals practical and achievable based on cooking skill level
- Ensure balanced nutrition across the full 7 days
- Prioritize quick generation over excessive detail

Generate a complete 7-day meal plan with breakfast, lunch, and dinner for each day (21 total meals).
`;
  }

  private calculateDailyCalories(personalInfo: PersonalInfo, fitnessGoals: FitnessGoals): number {
    // Basic BMR calculation using Mifflin-St Jeor Equation
    const weight = parseFloat(personalInfo.weight);
    const height = parseFloat(personalInfo.height);
    const age = parseInt(personalInfo.age);

    let bmr: number;
    if (personalInfo.gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity level multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * (activityMultipliers[personalInfo.activityLevel as keyof typeof activityMultipliers] || 1.55);

    // Adjust based on goals
    if (fitnessGoals.primaryGoals.includes('Weight Loss')) {
      return Math.round(tdee - 500); // 500 calorie deficit
    } else if (fitnessGoals.primaryGoals.includes('Muscle Building')) {
      return Math.round(tdee + 300); // 300 calorie surplus
    }

    return Math.round(tdee);
  }

  private calculateMacroTargets(calories: number, fitnessGoals: FitnessGoals) {
    // Macro distribution based on goals
    let proteinRatio = 0.25;
    let carbRatio = 0.45;
    let fatRatio = 0.30;

    if (fitnessGoals.primaryGoals.includes('Muscle Building')) {
      proteinRatio = 0.30;
      carbRatio = 0.40;
      fatRatio = 0.30;
    } else if (fitnessGoals.primaryGoals.includes('Weight Loss')) {
      proteinRatio = 0.30;
      carbRatio = 0.35;
      fatRatio = 0.35;
    }

    return {
      protein: Math.round((calories * proteinRatio) / 4),
      carbs: Math.round((calories * carbRatio) / 4),
      fat: Math.round((calories * fatRatio) / 9),
    };
  }

  private getWeekStartDate(): string {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday.toISOString().split('T')[0];
  }

  private getWeekEndDate(): string {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + 7);
    return sunday.toISOString().split('T')[0];
  }
}

export const weeklyMealContentGenerator = new WeeklyMealContentGenerator();
