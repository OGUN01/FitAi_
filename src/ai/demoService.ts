// Demo AI Service - Provides mock AI responses for testing without API key

import { 
  Workout, 
  Meal, 
  DailyMealPlan, 
  AIResponse, 
  ProgressAnalysis,
  MotivationalContent 
} from '../types/ai';
import { PersonalInfo, FitnessGoals } from '../types/user';

// ============================================================================
// DEMO AI SERVICE
// ============================================================================

class DemoAIService {

  /**
   * Generate a demo workout based on user profile
   */
  async generateDemoWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      workoutType?: 'strength' | 'cardio' | 'flexibility' | 'hiit';
      duration?: number;
      equipment?: string[];
    }
  ): Promise<AIResponse<Workout>> {
    // Simulate API delay
    await this.delay(1500);

    const workoutType = preferences?.workoutType || 'strength';
    const duration = preferences?.duration || this.parseDurationFromCommitment(fitnessGoals.timeCommitment);
    
    const demoWorkouts = {
      strength: {
        title: `${personalInfo.name}'s Strength Builder`,
        description: 'A personalized strength training workout focusing on major muscle groups',
        category: 'strength' as const,
        difficulty: fitnessGoals.experience as 'beginner' | 'intermediate' | 'advanced',
        duration,
        estimatedCalories: Math.round(duration * 8),
        exercises: [
          {
            exerciseId: 'push_up',
            sets: fitnessGoals.experience === 'beginner' ? 2 : 3,
            reps: fitnessGoals.experience === 'beginner' ? '8-10' : '10-15',
            restTime: 60,
            notes: 'Focus on proper form'
          },
          {
            exerciseId: 'squat',
            sets: 3,
            reps: fitnessGoals.experience === 'beginner' ? '10-12' : '15-20',
            restTime: 60,
            notes: 'Keep chest up and core engaged'
          },
          {
            exerciseId: 'plank',
            sets: 3,
            reps: fitnessGoals.experience === 'beginner' ? '30s' : '45s',
            restTime: 45,
            notes: 'Maintain straight line from head to heels'
          }
        ],
        equipment: preferences?.equipment || ['bodyweight'],
        targetMuscleGroups: ['chest', 'legs', 'core'],
        icon: '💪',
        tags: ['strength', 'full-body', 'beginner-friendly']
      },
      cardio: {
        title: `${personalInfo.name}'s Cardio Blast`,
        description: 'High-energy cardio workout to boost your heart rate and burn calories',
        category: 'cardio' as const,
        difficulty: fitnessGoals.experience as 'beginner' | 'intermediate' | 'advanced',
        duration,
        estimatedCalories: Math.round(duration * 12),
        exercises: [
          {
            exerciseId: 'jumping_jacks',
            sets: 3,
            reps: '60s',
            restTime: 30,
            notes: 'Keep a steady rhythm'
          },
          {
            exerciseId: 'high_knees',
            sets: 3,
            reps: '45s',
            restTime: 30,
            notes: 'Drive knees up high'
          },
          {
            exerciseId: 'mountain_climbers',
            sets: 3,
            reps: '30s',
            restTime: 45,
            notes: 'Maintain plank position'
          }
        ],
        equipment: ['bodyweight'],
        targetMuscleGroups: ['cardiovascular', 'legs', 'core'],
        icon: '🏃',
        tags: ['cardio', 'hiit', 'fat-burning']
      },
      flexibility: {
        title: `${personalInfo.name}'s Flexibility Flow`,
        description: 'Gentle stretching routine to improve flexibility and mobility',
        category: 'flexibility' as const,
        difficulty: 'beginner' as const,
        duration,
        estimatedCalories: Math.round(duration * 3),
        exercises: [
          {
            exerciseId: 'downward_dog',
            sets: 1,
            reps: '60s',
            restTime: 15,
            notes: 'Breathe deeply and relax'
          },
          {
            exerciseId: 'child_pose',
            sets: 1,
            reps: '45s',
            restTime: 0,
            notes: 'Focus on relaxation'
          }
        ],
        equipment: ['bodyweight'],
        targetMuscleGroups: ['back', 'shoulders', 'hips'],
        icon: '🧘',
        tags: ['flexibility', 'relaxation', 'mobility']
      },
      hiit: {
        title: `${personalInfo.name}'s HIIT Challenge`,
        description: 'High-intensity interval training for maximum calorie burn',
        category: 'hiit' as const,
        difficulty: 'intermediate' as const,
        duration,
        estimatedCalories: Math.round(duration * 15),
        exercises: [
          {
            exerciseId: 'burpee',
            sets: 4,
            reps: '30s',
            restTime: 30,
            notes: 'Go at your own pace'
          },
          {
            exerciseId: 'mountain_climbers',
            sets: 4,
            reps: '45s',
            restTime: 15,
            notes: 'Keep core tight'
          }
        ],
        equipment: ['bodyweight'],
        targetMuscleGroups: ['full_body', 'cardiovascular'],
        icon: '🔥',
        tags: ['hiit', 'intense', 'full-body']
      }
    };

    const selectedWorkout = demoWorkouts[workoutType];

    const workout: Workout = {
      id: this.generateId('workout'),
      ...selectedWorkout,
      isPersonalized: true,
      aiGenerated: true,
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      data: workout,
      confidence: 85,
      generationTime: 1500
    };
  }

  /**
   * Generate a demo meal plan
   */
  async generateDemoMeal(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): Promise<AIResponse<Meal>> {
    await this.delay(1200);

    const demoMeals = {
      breakfast: {
        name: 'Protein-Packed Breakfast',
        items: [
          {
            foodId: 'oats',
            food: {
              id: 'oats',
              name: 'Rolled Oats',
              category: 'grains',
              calories: 389,
              macros: { protein: 16.9, carbohydrates: 66, fat: 6.9, fiber: 10.6 },
              servingSize: 100,
              servingUnit: 'g',
              allergens: ['gluten'],
              dietaryLabels: ['whole-grain', 'high-fiber'],
              verified: true
            },
            quantity: 50,
            calories: 195,
            macros: { protein: 8.5, carbohydrates: 33, fat: 3.5, fiber: 5.3 }
          },
          {
            foodId: 'blueberries',
            food: {
              id: 'blueberries',
              name: 'Fresh Blueberries',
              category: 'fruits',
              calories: 57,
              macros: { protein: 0.7, carbohydrates: 14, fat: 0.3, fiber: 2.4 },
              servingSize: 100,
              servingUnit: 'g',
              allergens: [],
              dietaryLabels: ['antioxidants', 'superfood'],
              verified: true
            },
            quantity: 80,
            calories: 46,
            macros: { protein: 0.6, carbohydrates: 11.2, fat: 0.2, fiber: 1.9 }
          }
        ],
        totalCalories: 241,
        totalMacros: { protein: 9.1, carbohydrates: 44.2, fat: 3.7, fiber: 7.2 },
        prepTime: 5,
        difficulty: 'easy' as const,
        tags: ['healthy', 'quick', 'high-fiber']
      },
      lunch: {
        name: 'Balanced Power Bowl',
        items: [
          {
            foodId: 'chicken_breast',
            food: {
              id: 'chicken_breast',
              name: 'Grilled Chicken Breast',
              category: 'protein',
              calories: 165,
              macros: { protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0 },
              servingSize: 100,
              servingUnit: 'g',
              allergens: [],
              dietaryLabels: ['high-protein', 'low-carb'],
              verified: true
            },
            quantity: 120,
            calories: 198,
            macros: { protein: 37.2, carbohydrates: 0, fat: 4.3, fiber: 0 }
          },
          {
            foodId: 'quinoa',
            food: {
              id: 'quinoa',
              name: 'Cooked Quinoa',
              category: 'grains',
              calories: 120,
              macros: { protein: 4.4, carbohydrates: 22, fat: 1.9, fiber: 2.8 },
              servingSize: 100,
              servingUnit: 'g',
              allergens: [],
              dietaryLabels: ['complete-protein', 'gluten-free'],
              verified: true
            },
            quantity: 100,
            calories: 120,
            macros: { protein: 4.4, carbohydrates: 22, fat: 1.9, fiber: 2.8 }
          }
        ],
        totalCalories: 318,
        totalMacros: { protein: 41.6, carbohydrates: 22, fat: 6.2, fiber: 2.8 },
        prepTime: 15,
        difficulty: 'medium' as const,
        tags: ['balanced', 'high-protein', 'filling']
      },
      dinner: {
        name: 'Nutritious Evening Meal',
        items: [
          {
            foodId: 'salmon',
            food: {
              id: 'salmon',
              name: 'Baked Salmon',
              category: 'protein',
              calories: 208,
              macros: { protein: 25, carbohydrates: 0, fat: 12, fiber: 0 },
              servingSize: 100,
              servingUnit: 'g',
              allergens: ['fish'],
              dietaryLabels: ['omega-3', 'high-protein'],
              verified: true
            },
            quantity: 150,
            calories: 312,
            macros: { protein: 37.5, carbohydrates: 0, fat: 18, fiber: 0 }
          }
        ],
        totalCalories: 312,
        totalMacros: { protein: 37.5, carbohydrates: 0, fat: 18, fiber: 0 },
        prepTime: 20,
        difficulty: 'medium' as const,
        tags: ['omega-3', 'heart-healthy', 'protein-rich']
      },
      snack: {
        name: 'Healthy Snack',
        items: [
          {
            foodId: 'apple',
            food: {
              id: 'apple',
              name: 'Medium Apple',
              category: 'fruits',
              calories: 52,
              macros: { protein: 0.3, carbohydrates: 14, fat: 0.2, fiber: 2.4 },
              servingSize: 100,
              servingUnit: 'g',
              allergens: [],
              dietaryLabels: ['low-calorie', 'high-fiber'],
              verified: true
            },
            quantity: 150,
            calories: 78,
            macros: { protein: 0.5, carbohydrates: 21, fat: 0.3, fiber: 3.6 }
          }
        ],
        totalCalories: 78,
        totalMacros: { protein: 0.5, carbohydrates: 21, fat: 0.3, fiber: 3.6 },
        prepTime: 1,
        difficulty: 'easy' as const,
        tags: ['quick', 'natural', 'low-calorie']
      }
    };

    const selectedMeal = demoMeals[mealType];

    const meal: Meal = {
      id: this.generateId('meal'),
      type: mealType,
      ...selectedMeal,
      isPersonalized: true,
      aiGenerated: true,
      scheduledTime: this.getDefaultMealTime(mealType)
    };

    return {
      success: true,
      data: meal,
      confidence: 90,
      generationTime: 1200
    };
  }

  /**
   * Generate demo motivational content
   */
  async generateDemoMotivation(
    personalInfo: PersonalInfo,
    currentStreak: number = 0
  ): Promise<AIResponse<MotivationalContent>> {
    await this.delay(800);

    const motivationalContent: MotivationalContent = {
      dailyTip: "Remember to stay hydrated! Aim for 8 glasses of water throughout the day to support your fitness goals.",
      encouragement: `Great job, ${personalInfo.name}! Every workout brings you closer to your goals. Keep up the amazing work!`,
      challenge: {
        title: "7-Day Consistency Challenge",
        description: "Complete a workout every day for the next 7 days",
        reward: "Unlock the 'Week Warrior' achievement and earn 250 points",
        duration: 7
      },
      quote: "The only bad workout is the one that didn't happen.",
      factOfTheDay: "Did you know? Regular exercise can boost your mood by releasing endorphins, often called 'feel-good' hormones!"
    };

    return {
      success: true,
      data: motivationalContent,
      confidence: 95,
      generationTime: 800
    };
  }

  /**
   * Check if real AI is available
   */
  isRealAIAvailable(): boolean {
    return !!process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(prefix: string): string {
    return `${prefix}_demo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private parseDurationFromCommitment(timeCommitment: string): number {
    const durations: Record<string, number> = {
      '15-30': 25,
      '30-45': 40,
      '45-60': 50,
      '60+': 60
    };
    return durations[timeCommitment] || 40;
  }

  private getDefaultMealTime(mealType: string): string {
    const times = {
      breakfast: '08:00',
      lunch: '12:30',
      dinner: '19:00',
      snack: '15:00'
    };
    
    const today = new Date();
    const timeString = times[mealType as keyof typeof times] || '12:00';
    return `${today.toISOString().split('T')[0]}T${timeString}:00.000Z`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const demoAIService = new DemoAIService();

export default demoAIService;
