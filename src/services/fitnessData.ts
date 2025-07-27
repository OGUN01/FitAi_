import { supabase } from './supabase';
import { AuthUser } from '../types/user';

// Types for fitness data
export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  equipment: string[];
  instructions: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  calories_per_minute: number;
  image_url?: string;
  video_url?: string;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  type: string;
  duration_minutes?: number;
  calories_burned?: number;
  notes?: string;
  completed_at?: string;
  created_at: string;
  exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  rest_seconds?: number;
  order_index: number;
  exercise?: Exercise;
}

export interface UserWorkoutPreferences {
  id: string;
  user_id: string;
  location: 'home' | 'gym' | 'both';
  equipment: string[];
  time_preference: number;
  intensity: 'beginner' | 'intermediate' | 'advanced';
  workout_types: string[];
  created_at: string;
  updated_at: string;
}

export interface FitnessGoals {
  id: string;
  user_id: string;
  primary_goals: string[];
  time_commitment: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;
}

export interface FitnessDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class FitnessDataService {
  private static instance: FitnessDataService;

  private constructor() {}

  static getInstance(): FitnessDataService {
    if (!FitnessDataService.instance) {
      FitnessDataService.instance = new FitnessDataService();
    }
    return FitnessDataService.instance;
  }

  /**
   * Get all available exercises
   */
  async getExercises(filters?: {
    category?: string;
    difficulty?: string;
    equipment?: string[];
    search?: string;
  }): Promise<FitnessDataResponse<Exercise[]>> {
    try {
      let query = supabase
        .from('exercises')
        .select('*')
        .order('name');

      // Apply filters
      if (filters?.category && filters.category !== 'all') {
        query = query.ilike('category', `%${filters.category}%`);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty_level', filters.difficulty);
      }

      if (filters?.equipment && filters.equipment.length > 0) {
        query = query.overlaps('equipment', filters.equipment);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching exercises:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error in getExercises:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exercises',
      };
    }
  }

  /**
   * Get user's workout history
   */
  async getUserWorkouts(userId: string, limit?: number): Promise<FitnessDataResponse<Workout[]>> {
    try {
      let query = supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercises (*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user workouts:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform the data to match our interface
      const workouts = data?.map(workout => ({
        ...workout,
        exercises: workout.workout_exercises?.map((we: any) => ({
          ...we,
          exercise: we.exercises,
        })) || [],
      })) || [];

      return {
        success: true,
        data: workouts,
      };
    } catch (error) {
      console.error('Error in getUserWorkouts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user workouts',
      };
    }
  }

  /**
   * Get user's workout preferences
   */
  async getUserWorkoutPreferences(userId: string): Promise<FitnessDataResponse<UserWorkoutPreferences>> {
    try {
      const { data, error } = await supabase
        .from('workout_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching workout preferences:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Error in getUserWorkoutPreferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workout preferences',
      };
    }
  }

  /**
   * Get user's fitness goals
   */
  async getUserFitnessGoals(userId: string): Promise<FitnessDataResponse<FitnessGoals>> {
    try {
      const { data, error } = await supabase
        .from('fitness_goals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching fitness goals:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Error in getUserFitnessGoals:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch fitness goals',
      };
    }
  }

  /**
   * Create a new workout
   */
  async createWorkout(workoutData: {
    user_id: string;
    name: string;
    type: string;
    duration_minutes?: number;
    calories_burned?: number;
    notes?: string;
  }): Promise<FitnessDataResponse<Workout>> {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (error) {
        console.error('Error creating workout:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Error in createWorkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workout',
      };
    }
  }

  /**
   * Complete a workout
   */
  async completeWorkout(workoutId: string, completionData: {
    duration_minutes?: number;
    calories_burned?: number;
    notes?: string;
  }): Promise<FitnessDataResponse<Workout>> {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .update({
          ...completionData,
          completed_at: new Date().toISOString(),
        })
        .eq('id', workoutId)
        .select()
        .single();

      if (error) {
        console.error('Error completing workout:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Error in completeWorkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete workout',
      };
    }
  }

  /**
   * Add exercises to a workout
   */
  async addExercisesToWorkout(workoutId: string, exercises: {
    exercise_id: string;
    sets?: number;
    reps?: number;
    weight_kg?: number;
    duration_seconds?: number;
    rest_seconds?: number;
    order_index: number;
  }[]): Promise<FitnessDataResponse<WorkoutExercise[]>> {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert(exercises.map(ex => ({ ...ex, workout_id: workoutId })))
        .select(`
          *,
          exercises (*)
        `);

      if (error) {
        console.error('Error adding exercises to workout:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data?.map(we => ({
          ...we,
          exercise: we.exercises,
        })) || [],
      };
    } catch (error) {
      console.error('Error in addExercisesToWorkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add exercises to workout',
      };
    }
  }

  /**
   * Get workout statistics for a user
   */
  async getWorkoutStats(userId: string, timeRange?: 'week' | 'month' | 'year'): Promise<FitnessDataResponse<{
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    averageDuration: number;
    workoutsByType: Record<string, number>;
  }>> {
    try {
      let query = supabase
        .from('workouts')
        .select('type, duration_minutes, calories_burned, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null);

      // Apply time range filter
      if (timeRange) {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }

        query = query.gte('completed_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching workout stats:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Calculate statistics
      const workouts = data || [];
      const totalWorkouts = workouts.length;
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
      const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
      const averageDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

      const workoutsByType = workouts.reduce((acc, w) => {
        acc[w.type] = (acc[w.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: {
          totalWorkouts,
          totalDuration,
          totalCalories,
          averageDuration,
          workoutsByType,
        },
      };
    } catch (error) {
      console.error('Error in getWorkoutStats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workout stats',
      };
    }
  }

  /**
   * Start a workout session (create workout with exercises)
   */
  async startWorkoutSession(userId: string, workoutData: {
    name: string;
    type: string;
    exercises: {
      exercise_id: string;
      sets?: number;
      reps?: number;
      weight_kg?: number;
      duration_seconds?: number;
      rest_seconds?: number;
    }[];
  }): Promise<FitnessDataResponse<Workout>> {
    try {
      // First create the workout
      const workoutResponse = await this.createWorkout({
        user_id: userId,
        name: workoutData.name,
        type: workoutData.type,
      });

      if (!workoutResponse.success || !workoutResponse.data) {
        return workoutResponse;
      }

      // For now, just return the workout without exercises
      // TODO: Implement exercise creation and linking when exercise database is populated
      console.log('Workout created successfully. Exercise linking skipped for now.');

      return {
        success: true,
        data: {
          ...workoutResponse.data,
          exercises: [], // Empty for now
        },
      };
    } catch (error) {
      console.error('Error in startWorkoutSession:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start workout session',
      };
    }
  }

  /**
   * Get recommended exercises based on user preferences
   */
  async getRecommendedExercises(userId: string, workoutType?: string, limit: number = 5): Promise<FitnessDataResponse<Exercise[]>> {
    try {
      // Get user preferences
      const preferencesResponse = await this.getUserWorkoutPreferences(userId);
      const goalsResponse = await this.getUserFitnessGoals(userId);

      let query = supabase
        .from('exercises')
        .select('*')
        .limit(limit);

      // Filter by workout type if specified
      if (workoutType) {
        query = query.ilike('category', `%${workoutType}%`);
      }

      // Filter by user's experience level
      if (goalsResponse.success && goalsResponse.data?.experience_level) {
        query = query.eq('difficulty_level', goalsResponse.data.experience_level);
      }

      // Filter by available equipment
      if (preferencesResponse.success && preferencesResponse.data?.equipment) {
        query = query.overlaps('equipment', preferencesResponse.data.equipment);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error('Error fetching recommended exercises:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error in getRecommendedExercises:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommended exercises',
      };
    }
  }
}

export const fitnessDataService = FitnessDataService.getInstance();
