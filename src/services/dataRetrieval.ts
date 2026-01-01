import { useFitnessStore } from '../stores/fitnessStore';
import { useNutritionStore } from '../stores/nutritionStore';
import { crudOperations } from './crudOperations';
import { WeeklyWorkoutPlan, DayWorkout, WeeklyMealPlan, DayMeal } from '../ai';

export interface TodaysData {
  workout: DayWorkout | null;
  meals: DayMeal[];
  progress: {
    workoutProgress: number;
    mealsCompleted: number;
    totalMeals: number;
    caloriesConsumed: number;
    targetCalories: number;
  };
}

export interface WeeklyProgress {
  workoutsCompleted: number;
  totalWorkouts: number;
  mealsCompleted: number;
  totalMeals: number;
  averageCalories: number;
  streak: number;
  lastWorkoutDate: string | null;
  lastMealDate: string | null;
}

export interface RecentActivity {
  id: string;
  type: 'workout' | 'meal';
  name: string;
  completedAt: string;
  calories?: number;
  duration?: number;
}

class DataRetrievalService {
  // Get today's workout and meal data
  static getTodaysData(): TodaysData {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];

    console.log('📊 getTodaysData - Today is:', todayName);

    // Get today's workout
    const todaysWorkout =
      fitnessStore.weeklyWorkoutPlan?.workouts.find((workout) => workout.dayOfWeek === todayName) ||
      null;

    // Get today's meals
    const todaysMeals =
      nutritionStore.weeklyMealPlan?.meals.filter((meal) => meal.dayOfWeek === todayName) || [];

    console.log("📊 getTodaysData - Today's meals:", {
      count: todaysMeals.length,
      meals: todaysMeals.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        totalCalories: m.totalCalories,
        dayOfWeek: m.dayOfWeek,
      })),
    });

    // Calculate progress
    const workoutProgress = todaysWorkout
      ? fitnessStore.getWorkoutProgress(todaysWorkout.id)?.progress || 0
      : 0;

    const mealsCompleted = todaysMeals.filter((meal) => {
      const progress = nutritionStore.getMealProgress(meal.id);
      console.log(`📊 Meal ${meal.name} progress:`, progress);
      return progress?.progress === 100;
    }).length;

    const caloriesConsumed = todaysMeals.reduce((total, meal) => {
      const progress = nutritionStore.getMealProgress(meal.id);
      if (progress?.progress === 100) {
        console.log(`📊 Adding calories for completed meal ${meal.name}: ${meal.totalCalories}`);
        return total + (meal.totalCalories || 0);
      }
      return total;
    }, 0);

    const targetCalories = todaysMeals.reduce(
      (total, meal) => total + (meal.totalCalories || 0),
      0
    );

    console.log('📊 getTodaysData - Final calculations:', {
      mealsCompleted,
      totalMeals: todaysMeals.length,
      caloriesConsumed,
      targetCalories,
    });

    return {
      workout: todaysWorkout,
      meals: todaysMeals,
      progress: {
        workoutProgress,
        mealsCompleted,
        totalMeals: todaysMeals.length,
        caloriesConsumed,
        targetCalories,
      },
    };
  }

  // Get weekly progress data
  static getWeeklyProgress(): WeeklyProgress {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Calculate workout progress
    const totalWorkouts = fitnessStore.weeklyWorkoutPlan?.workouts.length || 0;
    const workoutsCompleted = Object.values(fitnessStore.workoutProgress).filter(
      (progress) => progress.progress === 100
    ).length;

    // Calculate meal progress
    const totalMeals = nutritionStore.weeklyMealPlan?.meals.length || 0;
    const mealsCompleted = Object.values(nutritionStore.mealProgress).filter(
      (progress) => progress.progress === 100
    ).length;

    // Calculate average calories
    const completedMealProgresses = Object.values(nutritionStore.mealProgress).filter(
      (progress) => progress.progress === 100
    );
    const totalCalories = completedMealProgresses.reduce((total, progress) => {
      const meal = nutritionStore.weeklyMealPlan?.meals.find((m) => m.id === progress.mealId);
      return total + (meal?.totalCalories || 0);
    }, 0);
    const averageCalories =
      completedMealProgresses.length > 0
        ? Math.round(totalCalories / completedMealProgresses.length)
        : 0;

    // Calculate streak (simplified - consecutive days with completed activities)
    const streak = this.calculateStreak();

    // Get last activity dates
    const workoutDates = Object.values(fitnessStore.workoutProgress)
      .filter((p) => p.completedAt)
      .map((p) => p.completedAt!)
      .sort()
      .reverse();

    const mealDates = Object.values(nutritionStore.mealProgress)
      .filter((p) => p.completedAt)
      .map((p) => p.completedAt!)
      .sort()
      .reverse();

    return {
      workoutsCompleted,
      totalWorkouts,
      mealsCompleted,
      totalMeals,
      averageCalories,
      streak,
      lastWorkoutDate: workoutDates[0] || null,
      lastMealDate: mealDates[0] || null,
    };
  }

  // Get recent activities
  static getRecentActivities(limit: number = 10): RecentActivity[] {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    const activities: RecentActivity[] = [];

    // Add completed workouts
    Object.values(fitnessStore.workoutProgress)
      .filter((progress) => progress.progress === 100 && progress.completedAt)
      .forEach((progress) => {
        const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
          (w) => w.id === progress.workoutId
        );
        if (workout) {
          activities.push({
            id: `workout_${progress.workoutId}`,
            type: 'workout',
            name: workout.title,
            completedAt: progress.completedAt!,
            calories: workout.estimatedCalories,
            duration: workout.duration,
          });
        }
      });

    // Add completed meals
    Object.values(nutritionStore.mealProgress)
      .filter((progress) => progress.progress === 100 && progress.completedAt)
      .forEach((progress) => {
        const meal = nutritionStore.weeklyMealPlan?.meals.find((m) => m.id === progress.mealId);
        if (meal) {
          // Ensure meal name is a string and handle potential array/object issues
          let mealName = meal.name;
          if (Array.isArray(mealName)) {
            mealName = mealName.join(', ');
          } else if (typeof mealName !== 'string') {
            mealName = String(mealName || 'Unknown Meal');
          }

          activities.push({
            id: `meal_${progress.mealId}`,
            type: 'meal',
            name: mealName,
            completedAt: progress.completedAt!,
            calories: meal.totalCalories,
          });
        }
      });

    // Sort by completion date (most recent first) and limit
    return activities
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
  }

  // Calculate streak (consecutive days with at least one completed activity)
  private static calculateStreak(): number {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Get all completion dates
    const completionDates = new Set<string>();

    Object.values(fitnessStore.workoutProgress)
      .filter((p) => p.completedAt)
      .forEach((p) => {
        const date = new Date(p.completedAt!).toDateString();
        completionDates.add(date);
      });

    Object.values(nutritionStore.mealProgress)
      .filter((p) => p.completedAt)
      .forEach((p) => {
        const date = new Date(p.completedAt!).toDateString();
        completionDates.add(date);
      });

    // Convert to sorted array of dates
    const sortedDates = Array.from(completionDates)
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDates.length === 0) return 0;

    // Calculate consecutive days from today
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      date.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDifference === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // Get calories burned from completed workouts
  static getTotalCaloriesBurned(): number {
    const fitnessStore = useFitnessStore.getState();

    return Object.values(fitnessStore.workoutProgress)
      .filter((progress) => progress.progress === 100)
      .reduce((total, progress) => {
        const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
          (w) => w.id === progress.workoutId
        );
        return total + (workout?.estimatedCalories || 0);
      }, 0);
  }

  // Check if there's data to show in Home tab
  static hasDataForHome(): boolean {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    return !!(fitnessStore.weeklyWorkoutPlan || nutritionStore.weeklyMealPlan);
  }

  // Get today's workout for home tab
  static getTodaysWorkoutForHome(): {
    workout: DayWorkout | null;
    hasWorkout: boolean;
    isCompleted: boolean;
    hasWeeklyPlan: boolean;
    isRestDay: boolean;
    workoutType: string;
    dayStatus: string;
  } {
    const fitnessStore = useFitnessStore.getState();
    const todaysData = this.getTodaysData();
    const workout = todaysData.workout;

    // Check if there's a weekly plan
    const hasWeeklyPlan = !!fitnessStore.weeklyWorkoutPlan;

    // Get today's day name
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];

    // Check if today is a rest day
    const isRestDay =
      (hasWeeklyPlan && fitnessStore.weeklyWorkoutPlan?.restDays?.includes(todayName)) || false;

    // Determine workout type and day status
    let workoutType = 'none';
    let dayStatus = 'No Plan';

    if (hasWeeklyPlan) {
      if (isRestDay) {
        workoutType = 'rest';
        dayStatus = 'Rest Day';
      } else if (workout) {
        workoutType = workout.category || 'workout';
        // Capitalize first letter and make it more readable
        dayStatus = workout.category
          ? workout.category.charAt(0).toUpperCase() + workout.category.slice(1) + ' Day'
          : 'Workout Day';
      } else {
        // There's a plan but no workout for today (shouldn't happen, but handle it)
        workoutType = 'unknown';
        dayStatus = 'Scheduled Day';
      }
    } else {
      // No weekly plan exists
      workoutType = 'none';
      dayStatus = 'No Plan';
    }

    return {
      workout,
      hasWorkout: !!workout,
      isCompleted: todaysData.progress.workoutProgress === 100,
      hasWeeklyPlan,
      isRestDay,
      workoutType,
      dayStatus,
    };
  }

  // Load all data from stores
  static async loadAllData(): Promise<void> {
    try {
      const fitnessStore = useFitnessStore.getState();
      const nutritionStore = useNutritionStore.getState();

      await Promise.all([fitnessStore.loadData(), nutritionStore.loadData()]);

      console.log('📂 All data loaded from stores');
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    }
  }

  // Clear all data
  static clearAllData(): void {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    fitnessStore.clearData();
    nutritionStore.clearData();

    console.log('🗑️ All data cleared');
  }
}

export default DataRetrievalService;
