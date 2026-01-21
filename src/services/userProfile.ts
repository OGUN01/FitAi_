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
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No fitness goals found
          return {
            success: false,
            error: "No fitness goals found",
          };
        }
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
    try {
      const [profileResponse, goalsResponse, dietResponse, workoutResponse] =
        await Promise.all([
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
        error:
          error instanceof Error
            ? error.message
            : "Failed to get complete profile",
      };
    }
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
    // Cast to any to access new fields that might not be in generated types yet
    const profile = dbProfile as any;

    // Log the raw database profile
    console.log("🔍 userProfile.ts: Raw database profile:", {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      age: profile.age,
      gender: profile.gender,
      country: profile.country,
      state: profile.state,
    });

    // Compute full name from first_name + last_name
    const fullName =
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

    // Map to PersonalInfo interface (matches profiles table - NO activityLevel)
    const personalInfo: PersonalInfo = {
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      name: fullName,
      email: profile.email || undefined,
      age: profile.age || 0,
      gender:
        (profile.gender as "male" | "female" | "other" | "prefer_not_to_say") ||
        "prefer_not_to_say",
      country: profile.country || "",
      state: profile.state || "",
      region: profile.region || undefined,
      wake_time: profile.wake_time || "",
      sleep_time: profile.sleep_time || "",
      occupation_type:
        (profile.occupation_type as
          | "desk_job"
          | "light_active"
          | "moderate_active"
          | "heavy_labor"
          | "very_active") || "desk_job",
      profile_picture: profile.profile_picture || undefined,
      dark_mode: profile.dark_mode || false,
      units: (profile.units as "metric" | "imperial") || "metric",
      notifications_enabled: profile.notifications_enabled !== false,
    };

    console.log(
      "✅ userProfile.ts: Mapped PersonalInfo (NO activityLevel):",
      personalInfo,
    );

    return {
      id: dbProfile.id,
      email: dbProfile.email || "",
      personalInfo,
      fitnessGoals: {
        primary_goals: [],
        time_commitment: "",
        experience: "",
        experience_level: "",
      },
      createdAt: dbProfile.created_at || "",
      updatedAt: dbProfile.updated_at || "",
      profilePicture: dbProfile.profile_picture || undefined,
      preferences: {
        units: (dbProfile.units as "metric" | "imperial") || "metric",
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
  private mapDatabaseGoalsToFitnessGoals(
    dbGoals: DatabaseFitnessGoals,
  ): FitnessGoals {
    return {
      primary_goals: dbGoals.primary_goals,
      time_commitment:
        (dbGoals as any).time_commitment ||
        dbGoals.preferred_workout_duration?.toString() ||
        "",
      experience: dbGoals.fitness_level || "",
      experience_level: dbGoals.fitness_level || "",
    };
  }
}

export const userProfileService = UserProfileService.getInstance();
export default userProfileService;
