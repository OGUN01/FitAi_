import { supabase } from './supabase';
import {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from '../types/user';
import type { Database } from './supabase';

type DatabaseProfile = Database['public']['Tables']['profiles']['Row'];

type DatabaseFitnessGoals = Database['public']['Tables']['fitness_goals']['Row'];

export interface UserProfileResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}

export interface FitnessGoalsResponse {
  success: boolean;
  data?: FitnessGoals;
  error?: string;
}

class UserProfileService {
  private static instance: UserProfileService;

  private constructor() {}

  static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  /**
   * Create a new user profile
   */
  async createProfile(profileData: CreateProfileRequest): Promise<UserProfileResponse> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const userProfile = this.mapDatabaseProfileToUserProfile(data);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create profile',
      };
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const userProfile = this.mapDatabaseProfileToUserProfile(data);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfileResponse> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const userProfile = this.mapDatabaseProfileToUserProfile(data);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      };
    }
  }

  /**
   * Create fitness goals for a user
   */
  async createFitnessGoals(goalsData: CreateFitnessGoalsRequest): Promise<FitnessGoalsResponse> {
    try {
      const { data, error } = await supabase
        .from('fitness_goals')
        .insert([goalsData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const fitnessGoals = this.mapDatabaseGoalsToFitnessGoals(data);
      return {
        success: true,
        data: fitnessGoals,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create fitness goals',
      };
    }
  }

  /**
   * Get fitness goals for a user
   */
  async getFitnessGoals(userId: string): Promise<FitnessGoalsResponse> {
    try {
      const { data, error } = await supabase
        .from('fitness_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No fitness goals found
          return {
            success: false,
            error: 'No fitness goals found',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      const fitnessGoals = this.mapDatabaseGoalsToFitnessGoals(data);
      return {
        success: true,
        data: fitnessGoals,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get fitness goals',
      };
    }
  }

  /**
   * Update fitness goals for a user
   */
  async updateFitnessGoals(
    userId: string,
    updates: UpdateFitnessGoalsRequest
  ): Promise<FitnessGoalsResponse> {
    try {
      // Use upsert to handle update or insert
      const { data, error } = await supabase
        .from('fitness_goals')
        .upsert(
          {
            user_id: userId,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const fitnessGoals = this.mapDatabaseGoalsToFitnessGoals(data);
      return {
        success: true,
        data: fitnessGoals,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update fitness goals',
      };
    }
  }

  /**
   * Get complete user profile with fitness goals, diet preferences, and workout preferences
   */
  async getCompleteProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const [profileResponse, goalsResponse, dietResponse, workoutResponse] = await Promise.all([
        this.getProfile(userId),
        this.getFitnessGoals(userId),
        this.getDietPreferences(userId),
        this.getWorkoutPreferences(userId),
      ]);

      if (!profileResponse.success) {
        return profileResponse;
      }

      const userProfile = profileResponse.data!;

      // Add fitness goals if available
      if (goalsResponse.success && goalsResponse.data) {
        userProfile.fitnessGoals = goalsResponse.data;
      }

      // Add diet preferences if available
      if (dietResponse.success && dietResponse.data) {
        userProfile.dietPreferences = dietResponse.data;
      }

      // Add workout preferences if available
      if (workoutResponse.success && workoutResponse.data) {
        userProfile.workoutPreferences = workoutResponse.data;
      }

      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get complete profile',
      };
    }
  }

  /**
   * Get diet preferences for a user
   */
  async getDietPreferences(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('diet_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - this is okay
          return { success: true, data: null };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      // Map all 27 fields from database to DietPreferences interface
      return {
        success: true,
        data: {
          // Basic diet info
          diet_type: data.diet_type || 'non-veg',
          allergies: data.allergies || [],
          restrictions: data.restrictions || [],

          // Diet readiness toggles (6 specialized diets)
          keto_ready: data.keto_ready || false,
          intermittent_fasting_ready: data.intermittent_fasting_ready || false,
          paleo_ready: data.paleo_ready || false,
          mediterranean_ready: data.mediterranean_ready || false,
          low_carb_ready: data.low_carb_ready || false,
          high_protein_ready: data.high_protein_ready || false,

          // Meal preferences (at least 1 required)
          breakfast_enabled: data.breakfast_enabled !== false,
          lunch_enabled: data.lunch_enabled !== false,
          dinner_enabled: data.dinner_enabled !== false,
          snacks_enabled: data.snacks_enabled !== false,

          // Cooking preferences
          cooking_skill_level: data.cooking_skill_level || 'beginner',
          max_prep_time_minutes: data.max_prep_time_minutes || null,
          budget_level: data.budget_level || 'medium',

          // Health habits (14 boolean fields)
          drinks_enough_water: data.drinks_enough_water || false,
          limits_sugary_drinks: data.limits_sugary_drinks || false,
          eats_regular_meals: data.eats_regular_meals || false,
          avoids_late_night_eating: data.avoids_late_night_eating || false,
          controls_portion_sizes: data.controls_portion_sizes || false,
          reads_nutrition_labels: data.reads_nutrition_labels || false,
          eats_processed_foods: data.eats_processed_foods !== false,
          eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies || false,
          limits_refined_sugar: data.limits_refined_sugar || false,
          includes_healthy_fats: data.includes_healthy_fats || false,
          drinks_alcohol: data.drinks_alcohol || false,
          smokes_tobacco: data.smokes_tobacco || false,
          drinks_coffee: data.drinks_coffee || false,
          takes_supplements: data.takes_supplements || false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get diet preferences',
      };
    }
  }

  /**
   * Get workout preferences for a user
   */
  async getWorkoutPreferences(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('workout_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - this is okay
          return { success: true, data: null };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: {
          workoutTypes: data.workout_types || [],
          equipment: data.equipment || [],
          location: data.location || 'home',
          timePreference: data.time_preference || 30,
          intensity: data.intensity || 'intermediate',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workout preferences',
      };
    }
  }

  /**
   * Delete user profile and all associated data
   */
  async deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete profile',
      };
    }
  }

  /**
   * Map database profile to UserProfile type
   */
  private mapDatabaseProfileToUserProfile(dbProfile: DatabaseProfile): UserProfile {
    // Cast to any to access new fields that might not be in generated types yet
    const profile = dbProfile as any;

    // Log the raw database profile
    console.log('🔍 userProfile.ts: Raw database profile:', {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      age: profile.age,
      gender: profile.gender,
      country: profile.country,
      state: profile.state,
    });

    // Compute full name from first_name + last_name
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    // Map to PersonalInfo interface (matches profiles table - NO activityLevel)
    const personalInfo: PersonalInfo = {
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      name: fullName,
      email: profile.email || undefined,
      age: profile.age || 0,
      gender: (profile.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') || 'prefer_not_to_say',
      country: profile.country || '',
      state: profile.state || '',
      region: profile.region || undefined,
      wake_time: profile.wake_time || '',
      sleep_time: profile.sleep_time || '',
      occupation_type: (profile.occupation_type as 'desk_job' | 'light_active' | 'moderate_active' | 'heavy_labor' | 'very_active') || 'desk_job',
      profile_picture: profile.profile_picture || undefined,
      dark_mode: profile.dark_mode || false,
      units: (profile.units as 'metric' | 'imperial') || 'metric',
      notifications_enabled: profile.notifications_enabled !== false,
    };

    console.log('✅ userProfile.ts: Mapped PersonalInfo (NO activityLevel):', personalInfo);

    return {
      id: dbProfile.id,
      email: dbProfile.email || '',
      personalInfo,
      fitnessGoals: {
        primary_goals: [],
        time_commitment: '',
        experience: '',
        experience_level: '',
      },
      createdAt: dbProfile.created_at || '',
      updatedAt: dbProfile.updated_at || '',
      profilePicture: dbProfile.profile_picture || undefined,
      preferences: {
        units: (dbProfile.units as 'metric' | 'imperial') || 'metric',
        notifications: dbProfile.notifications_enabled !== false,
        darkMode: dbProfile.dark_mode || false,
      },
      stats: {
        totalWorkouts: 0,
        totalCaloriesBurned: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    };
  }

  /**
   * Map database fitness goals to FitnessGoals type
   */
  private mapDatabaseGoalsToFitnessGoals(dbGoals: DatabaseFitnessGoals): FitnessGoals {
    return {
      primary_goals: dbGoals.primary_goals,
      time_commitment: (dbGoals as any).time_commitment || dbGoals.preferred_workout_duration?.toString() || '',
      experience: dbGoals.fitness_level || '',
      experience_level: dbGoals.fitness_level || '',
    };
  }
}

export const userProfileService = UserProfileService.getInstance();
export default userProfileService;
