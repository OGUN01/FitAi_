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

      return {
        success: true,
        data: {
          dietType: data.diet_type,
          allergies: data.allergies || [],
          cuisinePreferences: data.cuisine_preferences || [],
          restrictions: data.restrictions || [],
          // Optional fields with defaults
          cookingSkill: 'intermediate',
          mealPrepTime: 'moderate',
          dislikes: []
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
    const personalInfo: PersonalInfo = {
      name: dbProfile.name,
      age: dbProfile.age?.toString() || '',
      gender: dbProfile.gender || '',
      height: dbProfile.height_cm?.toString() || '',
      weight: dbProfile.weight_kg?.toString() || '',
      activityLevel: dbProfile.activity_level || '',
    };

    return {
      id: dbProfile.id,
      email: dbProfile.email,
      personalInfo,
      fitnessGoals: {
        primaryGoals: [],
        timeCommitment: '',
        experience: '',
        experience_level: '',
      },
      createdAt: dbProfile.created_at,
      updatedAt: dbProfile.updated_at,
      profilePicture: dbProfile.profile_picture || undefined,
      preferences: {
        units: dbProfile.units,
        notifications: dbProfile.notifications_enabled,
        darkMode: dbProfile.dark_mode,
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
      primaryGoals: dbGoals.primary_goals,
      timeCommitment: dbGoals.time_commitment || '',
      experience: dbGoals.experience_level || '',
      experience_level: dbGoals.experience_level || '',
    };
  }
}

export const userProfileService = UserProfileService.getInstance();
export default userProfileService;
