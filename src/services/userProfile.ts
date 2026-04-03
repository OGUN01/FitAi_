import { supabase } from "./supabase";
import {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from "../types/user";
import type { Database } from "./supabase";
import { toDb, fromDb } from "../utils/transformers/fieldNameTransformers";

type DatabaseProfile = Database["public"]["Tables"]["profiles"]["Row"];

type DatabaseFitnessGoals =
  Database["public"]["Tables"]["fitness_goals"]["Row"];

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
  private static _completeProfilePromise: Map<string, Promise<UserProfileResponse>> = new Map();

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
  async createProfile(
    profileData: CreateProfileRequest,
  ): Promise<UserProfileResponse> {
    try {
      // Transform to database format (snake_case)
      const dbData = toDb(profileData);

      const { data, error } = await supabase
        .from("profiles")
        .insert([dbData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);
      const userProfile = this.mapDatabaseProfileToUserProfile(transformedData);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create profile",
      };
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);
      const userProfile = this.mapDatabaseProfileToUserProfile(transformedData);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get profile",
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileRequest,
  ): Promise<UserProfileResponse> {
    try {
      // Transform to database format (snake_case)
      const dbUpdates = toDb(updates);

      const { data, error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);
      const userProfile = this.mapDatabaseProfileToUserProfile(transformedData);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      };
    }
  }

  /**
   * Create fitness goals for a user
   */
  async createFitnessGoals(
    goalsData: CreateFitnessGoalsRequest,
  ): Promise<FitnessGoalsResponse> {
    try {
      // Transform to database format (snake_case)
      const dbData = toDb(goalsData);

      const { data, error } = await supabase
        .from("fitness_goals")
        .insert([dbData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);
      const fitnessGoals = this.mapDatabaseGoalsToFitnessGoals(transformedData);
      return {
        success: true,
        data: fitnessGoals,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create fitness goals",
      };
    }
  }

  /**
   * Get fitness goals for a user
   */
  async getFitnessGoals(userId: string): Promise<FitnessGoalsResponse> {
    try {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data) {
        // No fitness goals found for this user
        return {
          success: false,
          error: "No fitness goals found",
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);
      const fitnessGoals = this.mapDatabaseGoalsToFitnessGoals(transformedData);
      return {
        success: true,
        data: fitnessGoals,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get fitness goals",
      };
    }
  }

  /**
   * Update fitness goals for a user
   */
  async updateFitnessGoals(
    userId: string,
    updates: UpdateFitnessGoalsRequest,
  ): Promise<FitnessGoalsResponse> {
    try {
      // Transform to database format (snake_case)
      const dbUpdates = toDb(updates);

      // Use upsert to handle update or insert
      const { data, error } = await supabase
        .from("fitness_goals")
        .upsert(
          {
            user_id: userId,
            ...dbUpdates,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);
      const fitnessGoals = this.mapDatabaseGoalsToFitnessGoals(transformedData);
      return {
        success: true,
        data: fitnessGoals,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update fitness goals",
      };
    }
  }

  /**
   * Get complete user profile with fitness goals, diet preferences, and workout preferences
   */
  async getCompleteProfile(userId: string): Promise<UserProfileResponse> {
    // Dedup: if a fetch is already in flight for this user, return the same promise
    const existing = UserProfileService._completeProfilePromise.get(userId);
    if (existing) return existing;

    const promise = (async (): Promise<UserProfileResponse> => {
      try {
        const [profileResponse, dietResponse, workoutResponse] =
          await Promise.all([
            this.getProfile(userId),
            this.getDietPreferences(userId),
            this.getWorkoutPreferences(userId),
          ]);

        if (!profileResponse.success) {
          return profileResponse;
        }

        const userProfile = profileResponse.data!;

        // Add diet preferences if available
        if (dietResponse.success && dietResponse.data) {
          userProfile.dietPreferences = dietResponse.data;
        }

        // Add workout preferences if available (SSOT for goals)
        if (workoutResponse.success && workoutResponse.data) {
          userProfile.workoutPreferences = workoutResponse.data;
          // Synthesize fitnessGoals from workout_preferences (deprecated fitness_goals table)
          const wp = workoutResponse.data as any;
          userProfile.fitnessGoals = {
            primary_goals: wp.primary_goals || wp.primaryGoals || [],
            time_commitment: wp.time_commitment || '',
            experience: wp.experience_level || wp.experienceLevel || '',
            experience_level: wp.experience_level || wp.experienceLevel || '',
          };
        }

        return {
          success: true,
          data: userProfile,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get complete profile",
        };
      } finally {
        // Clear cache after 5s to allow hits during auth flow burst, then refresh
        setTimeout(() => UserProfileService._completeProfilePromise.delete(userId), 5000);
      }
    })();

    UserProfileService._completeProfilePromise.set(userId, promise);
    return promise;
  }

  /**
   * Get diet preferences for a user
   */
  async getDietPreferences(
    userId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("diet_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST116") {
          // No data found - this is okay
          return { success: true, data: null };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);

      // Map all 27 fields from database to DietPreferences interface
      return {
        success: true,
        data: {
          // Basic diet info
          diet_type: transformedData.dietType || "non-veg",
          allergies: transformedData.allergies || [],
          restrictions: transformedData.restrictions || [],

          // Diet readiness toggles (6 specialized diets)
          keto_ready: transformedData.ketoReady || false,
          intermittent_fasting_ready:
            transformedData.intermittentFastingReady || false,
          paleo_ready: transformedData.paleoReady || false,
          mediterranean_ready: transformedData.mediterraneanReady || false,
          low_carb_ready: transformedData.lowCarbReady || false,
          high_protein_ready: transformedData.highProteinReady || false,

          // Meal preferences (at least 1 required)
          breakfast_enabled: transformedData.breakfastEnabled !== false,
          lunch_enabled: transformedData.lunchEnabled !== false,
          dinner_enabled: transformedData.dinnerEnabled !== false,
          snacks_enabled: transformedData.snacksEnabled !== false,

          // Cooking preferences
          cooking_skill_level: transformedData.cookingSkillLevel || "beginner",
          max_prep_time_minutes: transformedData.maxPrepTimeMinutes || null,
          budget_level: transformedData.budgetLevel || "medium",

          // Health habits (14 boolean fields)
          drinks_enough_water: transformedData.drinksEnoughWater || false,
          limits_sugary_drinks: transformedData.limitsSugaryDrinks || false,
          eats_regular_meals: transformedData.eatsRegularMeals || false,
          avoids_late_night_eating:
            transformedData.avoidsLateNightEating || false,
          controls_portion_sizes: transformedData.controlsPortionSizes || false,
          reads_nutrition_labels: transformedData.readsNutritionLabels || false,
          eats_processed_foods: transformedData.eatsProcessedFoods !== false,
          eats_5_servings_fruits_veggies:
            transformedData.eats5ServingsFruitsVeggies || false,
          limits_refined_sugar: transformedData.limitsRefinedSugar || false,
          includes_healthy_fats: transformedData.includesHealthyFats || false,
          drinks_alcohol: transformedData.drinksAlcohol || false,
          smokes_tobacco: transformedData.smokesTobacco || false,
          drinks_coffee: transformedData.drinksCoffee || false,
          takes_supplements: transformedData.takesSupplements || false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get diet preferences",
      };
    }
  }

  /**
   * Get workout preferences for a user
   */
  async getWorkoutPreferences(
    userId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No data found - this is okay
          return { success: true, data: null };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);

      return {
        success: true,
        data: {
          workoutTypes: transformedData.workoutTypes || [],
          equipment: transformedData.equipment || [],
          location: transformedData.location || "home",
          timePreference: transformedData.timePreference || 30,
          intensity: transformedData.intensity || "intermediate",
          activity_level: transformedData.activityLevel || "moderate",
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get workout preferences",
      };
    }
  }

  /**
   * Update workout preferences for a user
   */
  async updateWorkoutPreferences(
    userId: string,
    updates: {
      workout_types?: string[];
      equipment?: string[];
      location?: string;
      time_preference?: number;
      intensity?: string;
      activity_level?: string;
    },
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Transform to database format (snake_case)
      const dbUpdates = toDb(updates);

      // Use upsert to handle update or insert
      const { data, error } = await supabase
        .from("workout_preferences")
        .upsert(
          {
            user_id: userId,
            ...dbUpdates,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform from database format (camelCase)
      const transformedData = fromDb(data);

      return {
        success: true,
        data: {
          workoutTypes: transformedData.workoutTypes || [],
          equipment: transformedData.equipment || [],
          location: transformedData.location || "home",
          timePreference: transformedData.timePreference || 30,
          intensity: transformedData.intensity || "intermediate",
          activity_level: transformedData.activityLevel || "moderate",
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update workout preferences",
      };
    }
  }

  /**
   * Delete user profile and all associated data
   */
  async deleteProfile(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

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
        error:
          error instanceof Error ? error.message : "Failed to delete profile",
      };
    }
  }

  /**
   * Map database profile to UserProfile type
   */
  private mapDatabaseProfileToUserProfile(
    dbProfile: DatabaseProfile,
  ): UserProfile {
    // Cast to any to access fields in either camelCase (after fromDb) or snake_case
    const profile = dbProfile as any;

    // Helper to access a field in either snake_case or camelCase
    const get = (snake: string, camel: string, fallback: any = undefined) =>
      profile[snake] !== undefined ? profile[snake] : (profile[camel] !== undefined ? profile[camel] : fallback);

    const firstName = get('first_name', 'firstName', '');
    const lastName = get('last_name', 'lastName', '');
    const fullName = `${firstName} ${lastName}`.trim();

    // Log the raw database profile

    // Map to PersonalInfo interface (matches profiles table - NO activityLevel)
    const personalInfo: PersonalInfo = {
      first_name: firstName,
      last_name: lastName,
      name: fullName,
      email: profile.email || undefined,
      age: profile.age || 0,
      gender:
        (profile.gender as "male" | "female" | "other" | "prefer_not_to_say") ||
        "prefer_not_to_say",
      country: profile.country || "",
      state: profile.state || "",
      region: profile.region || undefined,
      wake_time: get('wake_time', 'wakeTime', ''),
      sleep_time: get('sleep_time', 'sleepTime', ''),
      occupation_type:
        (get('occupation_type', 'occupationType', 'desk_job') as
          | "desk_job"
          | "light_active"
          | "moderate_active"
          | "heavy_labor"
          | "very_active"),
      profile_picture: get('profile_picture', 'profilePicture', undefined),
      dark_mode: get('dark_mode', 'darkMode', false),
      units: (profile.units as "metric" | "imperial") || "metric",
      notifications_enabled: get('notifications_enabled', 'notificationsEnabled', true) !== false,
    };


    const id = profile.id || "";
    const email = profile.email || "";
    const createdAt = get('created_at', 'createdAt', '');
    const updatedAt = get('updated_at', 'updatedAt', '');
    const profilePicture = get('profile_picture', 'profilePicture', undefined);
    const units = (profile.units as "metric" | "imperial") || "metric";
    const notificationsEnabled = get('notifications_enabled', 'notificationsEnabled', true) !== false;
    const darkMode = get('dark_mode', 'darkMode', false);

    return {
      id,
      email,
      personalInfo,
      fitnessGoals: {
        primary_goals: [],
        time_commitment: "",
        experience: "",
        experience_level: "",
      },
      createdAt,
      updatedAt,
      profilePicture,
      preferences: {
        units,
        notifications: notificationsEnabled,
        darkMode,
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
  private mapDatabaseGoalsToFitnessGoals(
    dbGoals: DatabaseFitnessGoals,
  ): FitnessGoals {
    const goals = dbGoals as any;
    return {
      primary_goals: goals.primary_goals || goals.primaryGoals || [],
      time_commitment:
        goals.time_commitment ||
        goals.timeCommitment ||
        goals.preferred_workout_duration?.toString() ||
        goals.preferredWorkoutDuration?.toString() ||
        "",
      experience:
        goals.fitness_level ||
        goals.fitnessLevel ||
        goals.experience_level ||
        goals.experienceLevel ||
        "",
      experience_level:
        goals.fitness_level ||
        goals.fitnessLevel ||
        goals.experience_level ||
        goals.experienceLevel ||
        "",
    };
}
}
export const userProfileService = UserProfileService.getInstance();
export default userProfileService;
