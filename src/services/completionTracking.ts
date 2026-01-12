import { useFitnessStore } from '../stores/fitnessStore';
import { useNutritionStore } from '../stores/nutritionStore';
import { DayWorkout, DayMeal } from '../ai';
import crudOperations from './crudOperations';
import { MealLog, SyncStatus } from '../types/localData';
import { supabase } from './supabase';
import { nutritionRefreshService } from './nutritionRefreshService';
import { fitnessRefreshService } from './fitnessRefreshService';

export interface CompletionEvent {
  id: string;
  type: 'workout' | 'meal';
  itemId: string;
  completedAt: string;
  progress: number;
  data: any;
}

class CompletionTrackingService {
  private listeners: ((event: CompletionEvent) => void)[] = [];

  // Subscribe to completion events
  subscribe(listener: (event: CompletionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Emit completion event
  private emit(event: CompletionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  // Complete a workout
  async completeWorkout(workoutId: string, sessionData?: any, userId?: string): Promise<boolean> {
    try {
      const fitnessStore = useFitnessStore.getState();

      // Update workout progress to 100%
      fitnessStore.completeWorkout(workoutId, sessionData?.sessionId);

      // Get workout details for the event
      const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find((w) => w.id === workoutId);

      if (workout) {
        // Sync workout completion to Supabase (like we do for meals)
        if (userId) {
          try {
            const supabaseResult = await supabase.from('workout_sessions').insert({
              user_id: userId,
              workout_id: workoutId,
              workout_name: workout.title,
              workout_type: workout.category || 'general',
              duration_minutes: workout.duration || sessionData?.duration || null,
              calories_burned: workout.estimatedCalories || sessionData?.stats?.caloriesBurned || null,
              exercises_completed: sessionData?.exercisesCompleted || workout.exercises?.length || 0,
              started_at: sessionData?.startedAt || new Date().toISOString(),
              completed_at: new Date().toISOString(),
              notes: sessionData?.notes || `Weekly workout plan: ${workout.title}`,
            });

            if (supabaseResult.error) {
              console.error(`⚠️ Supabase workout_sessions insert error:`, supabaseResult.error);
            } else {
              console.log(
                `✅ Supabase workout_sessions synced for: ${workout.title} (${workout.estimatedCalories} cal, ${workout.duration} min)`
              );
              
              // CRITICAL: Trigger refresh so fitness hooks refetch data
              // This ensures UI updates immediately after workout completion
              try {
                await fitnessRefreshService.refreshAfterWorkoutCompleted({
                  workoutId,
                  workoutName: workout.title,
                  duration: workout.duration,
                  caloriesBurned: workout.estimatedCalories,
                });
                console.log('🔄 Fitness refresh triggered after workout completion');
              } catch (refreshError) {
                console.warn('⚠️ Failed to trigger fitness refresh:', refreshError);
              }
            }
          } catch (supabaseError) {
            console.error(`❌ Failed to sync workout to Supabase:`, supabaseError);
            // Continue - local storage succeeded
          }
        } else {
          console.log('⚠️ No userId provided, skipping Supabase sync for workout');
        }

        const event: CompletionEvent = {
          id: `workout_completion_${workoutId}_${Date.now()}`,
          type: 'workout',
          itemId: workoutId,
          completedAt: new Date().toISOString(),
          progress: 100,
          data: {
            workout,
            sessionData,
            calories: workout.estimatedCalories,
            duration: workout.duration,
          },
        };

        this.emit(event);
        console.log(`✅ Workout completed: ${workout.title}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to complete workout:', error);
      return false;
    }
  }

  // Complete a meal
  async completeMeal(mealId: string, logData?: any, userId?: string): Promise<boolean> {
    try {
      const nutritionStore = useNutritionStore.getState();

      console.log(`🍽️ Completing meal: ${mealId}`);

      // Update meal progress to 100%
      nutritionStore.completeMeal(mealId, logData?.logId);

      // Get meal details for the event
      const meal = nutritionStore.weeklyMealPlan?.meals.find((m) => m.id === mealId);

      console.log(`🍽️ Found meal for completion:`, {
        found: !!meal,
        mealName: meal?.name,
        mealCalories: meal?.totalCalories,
        mealType: meal?.type,
        dayOfWeek: meal?.dayOfWeek,
      });

      if (meal) {
        // Create actual meal log in database for calorie tracking
        try {
          console.log(`🍽️ Creating meal log for completed meal: ${meal.name}`);

          // Use provided userId - NO FALLBACK to fake user IDs
          const currentUserId = userId;

          if (currentUserId) {
            // Create meal log directly using CRUD operations
            const mealLog: MealLog = {
              id: `weekly_meal_log_${mealId}_${Date.now()}`,
              mealType: meal.type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
              foods: [],
              totalCalories: meal.totalCalories || 0,
              totalMacros: {
                protein: meal.totalMacros?.protein ?? 0,
                carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                fat: meal.totalMacros?.fat ?? 0,
                fiber: meal.totalMacros?.fiber ?? 0,
                sugar: meal.totalMacros?.sugar ?? 0,
                sodium: meal.totalMacros?.sodium ?? 0,
              },
              loggedAt: new Date().toISOString(),
              notes: `Weekly meal plan: ${meal.name}`,
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: 'local',
              },
            };

            // Store the meal log locally
            await crudOperations.createMealLog(mealLog);
            console.log(
              `✅ Local meal log created for: ${meal.name} (${meal.totalCalories} calories)`
            );
            
            // CRITICAL: Also insert into Supabase meal_logs table for stats sync
            // This ensures loadDailyNutrition can read the data from Supabase
            try {
              const supabaseResult = await supabase.from('meal_logs').insert({
                user_id: currentUserId,
                meal_type: meal.type,
                meal_name: meal.name,
                food_items: meal.items || [],
                total_calories: meal.totalCalories || 0,
                total_protein: meal.totalMacros?.protein ?? 0,
                total_carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                total_fat: meal.totalMacros?.fat ?? 0,
                logged_at: new Date().toISOString(),
              });
              
              if (supabaseResult.error) {
                console.error(`⚠️ Supabase meal_logs insert error:`, supabaseResult.error);
              } else {
                console.log(
                  `✅ Supabase meal_logs synced for: ${meal.name} (${meal.totalCalories} cal, P:${meal.totalMacros?.protein}g, C:${meal.totalMacros?.carbohydrates}g, F:${meal.totalMacros?.fat}g)`
                );
                
                // CRITICAL: Trigger refresh so useNutritionData hook refetches dailyNutrition
                // This ensures the calorie ring updates immediately after meal completion
                try {
                  await nutritionRefreshService.triggerRefresh();
                  console.log('🔄 Nutrition refresh triggered after meal completion');
                } catch (refreshError) {
                  console.warn('⚠️ Failed to trigger nutrition refresh:', refreshError);
                }
              }
            } catch (supabaseError) {
              console.error(`❌ Failed to sync to Supabase meal_logs:`, supabaseError);
              // Continue - local storage succeeded
            }
          } else {
            console.warn(`⚠️ No user ID available, skipping meal log creation`);
            // Continue with completion even if no user
          }
        } catch (mealLogError) {
          console.error(`❌ Error creating meal log:`, mealLogError);
          // Continue with completion even if logging fails
        }

        const event: CompletionEvent = {
          id: `meal_completion_${mealId}_${Date.now()}`,
          type: 'meal',
          itemId: mealId,
          completedAt: new Date().toISOString(),
          progress: 100,
          data: {
            meal,
            logData,
            calories: meal.totalCalories,
            ingredients: meal.items?.length || 0,
          },
        };

        this.emit(event);
        console.log(`✅ Meal completed: ${meal.name} (${meal.totalCalories} calories)`);

        // Verify the meal progress was saved
        const savedProgress = nutritionStore.getMealProgress(mealId);
        console.log(`🍽️ Saved meal progress:`, savedProgress);

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to complete meal:', error);
      return false;
    }
  }

  // Update workout progress
  async updateWorkoutProgress(
    workoutId: string,
    progress: number,
    exerciseData?: any,
    userId?: string
  ): Promise<boolean> {
    try {
      const fitnessStore = useFitnessStore.getState();
      fitnessStore.updateWorkoutProgress(workoutId, progress);

      // Emit progress event
      const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find((w) => w.id === workoutId);
      if (workout) {
        const event: CompletionEvent = {
          id: `workout_progress_${workoutId}_${Date.now()}`,
          type: 'workout',
          itemId: workoutId,
          completedAt: new Date().toISOString(),
          progress,
          data: {
            workout,
            exerciseData,
            partialCalories: Math.round((workout.estimatedCalories || 0) * (progress / 100)),
          },
        };

        this.emit(event);

        // Auto-complete if progress reaches 100%
        if (progress >= 100) {
          return this.completeWorkout(workoutId, exerciseData, userId);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to update workout progress:', error);
      return false;
    }
  }

  // Update meal progress
  async updateMealProgress(
    mealId: string,
    progress: number,
    ingredientData?: any
  ): Promise<boolean> {
    try {
      const nutritionStore = useNutritionStore.getState();
      nutritionStore.updateMealProgress(mealId, progress);

      // Emit progress event
      const meal = nutritionStore.weeklyMealPlan?.meals.find((m) => m.id === mealId);
      if (meal) {
        const event: CompletionEvent = {
          id: `meal_progress_${mealId}_${Date.now()}`,
          type: 'meal',
          itemId: mealId,
          completedAt: new Date().toISOString(),
          progress,
          data: {
            meal,
            ingredientData,
            partialCalories: Math.round((meal.totalCalories || 0) * (progress / 100)),
          },
        };

        this.emit(event);

        // Auto-complete if progress reaches 100%
        if (progress >= 100) {
          // Note: userId should be passed from caller - don't use fake ID
          return this.completeMeal(mealId, ingredientData, undefined);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to update meal progress:', error);
      return false;
    }
  }

  // Get completion stats
  getCompletionStats(): {
    workouts: {
      completed: number;
      total: number;
      completionRate: number;
    };
    meals: {
      completed: number;
      total: number;
      completionRate: number;
    };
    totalCaloriesBurned: number;
    totalCaloriesConsumed: number;
  } {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Calculate workout stats
    const totalWorkouts = fitnessStore.weeklyWorkoutPlan?.workouts.length || 0;
    const completedWorkouts = Object.values(fitnessStore.workoutProgress).filter(
      (p) => p.progress === 100
    ).length;

    // Calculate meal stats
    const totalMeals = nutritionStore.weeklyMealPlan?.meals.length || 0;
    const completedMeals = Object.values(nutritionStore.mealProgress).filter(
      (p) => p.progress === 100
    ).length;

    // Calculate calories
    const caloriesBurned = Object.values(fitnessStore.workoutProgress)
      .filter((p) => p.progress === 100)
      .reduce((total, progress) => {
        const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
          (w) => w.id === progress.workoutId
        );
        return total + (workout?.estimatedCalories || 0);
      }, 0);

    const caloriesConsumed = Object.values(nutritionStore.mealProgress)
      .filter((p) => p.progress === 100)
      .reduce((total, progress) => {
        const meal = nutritionStore.weeklyMealPlan?.meals.find((m) => m.id === progress.mealId);
        return total + (meal?.totalCalories || 0);
      }, 0);

    return {
      workouts: {
        completed: completedWorkouts,
        total: totalWorkouts,
        completionRate:
          totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
      },
      meals: {
        completed: completedMeals,
        total: totalMeals,
        completionRate: totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0,
      },
      totalCaloriesBurned: caloriesBurned,
      totalCaloriesConsumed: caloriesConsumed,
    };
  }

  // Get today's completion status
  getTodaysCompletions(): {
    workout: { completed: boolean; progress: number } | null;
    meals: { completed: number; total: number; progress: number };
  } {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];

    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Today's workout
    const todaysWorkout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
      (w) => w.dayOfWeek === todayName
    );
    const workoutProgress = todaysWorkout
      ? fitnessStore.getWorkoutProgress(todaysWorkout.id)
      : null;

    // Today's meals
    const todaysMeals =
      nutritionStore.weeklyMealPlan?.meals.filter((m) => m.dayOfWeek === todayName) || [];
    const completedMeals = todaysMeals.filter((meal) => {
      const progress = nutritionStore.getMealProgress(meal.id);
      return progress?.progress === 100;
    }).length;

    return {
      workout: todaysWorkout
        ? {
            completed: workoutProgress?.progress === 100,
            progress: workoutProgress?.progress || 0,
          }
        : null,
      meals: {
        completed: completedMeals,
        total: todaysMeals.length,
        progress:
          todaysMeals.length > 0 ? Math.round((completedMeals / todaysMeals.length) * 100) : 0,
      },
    };
  }

  // Mark all today's items as completed (for testing)
  async completeAllToday(): Promise<void> {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];

    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Complete today's workout
    const todaysWorkout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
      (w) => w.dayOfWeek === todayName
    );
    if (todaysWorkout) {
      await this.completeWorkout(todaysWorkout.id);
    }

    // Complete today's meals
    // Note: This is a test function - userId should be provided by caller in production
    const todaysMeals =
      nutritionStore.weeklyMealPlan?.meals.filter((m) => m.dayOfWeek === todayName) || [];
    for (const meal of todaysMeals) {
      await this.completeMeal(meal.id, undefined, undefined);
    }
  }
}

export const completionTrackingService = new CompletionTrackingService();
export default completionTrackingService;
