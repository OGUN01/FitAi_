// Data Transformation Service for Track B Infrastructure
// Handles conversion between local storage format and Supabase format

import {
  LocalStorageSchema,
  OnboardingData,
  WorkoutSession,
  MealLog,
  BodyMeasurement,
  UserPreferences,
  SyncStatus,
} from "../types/localData";
import { Database } from "./supabase";
import {
  deriveMealLogFiber,
  normalizeMealLogFoodItems,
} from "../utils/mealLogNutrition";

// ============================================================================
// TYPE DEFINITIONS FOR SUPABASE TABLES
// ============================================================================

type SupabaseProfile = Database["public"]["Tables"]["profiles"]["Insert"];
type SupabaseWorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Insert"];
type SupabaseMealLog = Database["public"]["Tables"]["meal_logs"]["Insert"];
type SupabaseProgressEntry =
  Database["public"]["Tables"]["progress_entries"]["Insert"];

// ============================================================================
// DATA TRANSFORMATION SERVICE
// ============================================================================

export class DataTransformationService {
  private static instance: DataTransformationService;

  private constructor() {}

  static getInstance(): DataTransformationService {
    if (!DataTransformationService.instance) {
      DataTransformationService.instance = new DataTransformationService();
    }
    return DataTransformationService.instance;
  }

  // ============================================================================
  // USER PROFILE TRANSFORMATION
  // ============================================================================

  transformOnboardingDataToProfile(
    onboardingData: OnboardingData,
    userId: string,
    email: string,
  ): SupabaseProfile {
    const { personalInfo, fitnessGoals } = onboardingData;

    return {
      id: userId,
      email: email || personalInfo.email || "",
      name:
        personalInfo.name ||
        `${personalInfo.first_name || ""} ${personalInfo.last_name || ""}`.trim(),
      age: personalInfo.age || null,
      gender: this.normalizeGender(personalInfo.gender),
      updated_at: new Date().toISOString(),
    };
  }

  transformUserPreferencesToProfile(
    preferences: UserPreferences,
    userId: string,
  ): Partial<SupabaseProfile> {
    return {
      id: userId,
      units: preferences.units,
      notifications_enabled: preferences.notifications,
      dark_mode: preferences.darkMode,
      updated_at: new Date().toISOString(),
    };
  }

  // ============================================================================
  // WORKOUT SESSION TRANSFORMATION
  // ============================================================================

  transformWorkoutSessionToSupabase(
    session: WorkoutSession,
    userId: string,
  ): SupabaseWorkoutSession {
    return {
      id: session.id,
      user_id: userId,
      workout_id: session.workoutId,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      duration: session.duration ?? null,
      total_duration_minutes: session.duration ?? null,
      calories_burned: session.caloriesBurned ?? null,
      exercises_completed: session.exercises || [],
      notes: session.notes || "",
      rating: session.rating,
      is_completed: session.isCompleted,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  transformSupabaseToWorkoutSession(supabaseSession: any): WorkoutSession {
    return {
      id: supabaseSession.id,
      workoutId: supabaseSession.workout_id,
      userId: supabaseSession.user_id,
      startedAt: supabaseSession.started_at,
      completedAt: supabaseSession.completed_at,
      duration:
        supabaseSession.total_duration_minutes ?? supabaseSession.duration,
      caloriesBurned: supabaseSession.calories_burned,
      exercises: supabaseSession.exercises_completed ?? supabaseSession.exercises ?? [],
      notes: supabaseSession.notes || "",
      rating: supabaseSession.rating || 0,
      isCompleted: supabaseSession.is_completed,
    };
  }

  // ============================================================================
  // MEAL LOG TRANSFORMATION
  // ============================================================================

  transformMealLogToSupabase(
    mealLog: MealLog,
    userId: string,
  ): SupabaseMealLog {
    return {
      id: mealLog.id,
      user_id: userId,
      meal_plan_id: mealLog.mealPlanId || null,
      meal_type: mealLog.mealType,
      from_plan: mealLog.fromPlan ?? false,
      plan_meal_id: mealLog.planMealId || null,
      portion_multiplier: mealLog.portionMultiplier ?? 1,
      meal_name: mealLog.notes || mealLog.foods?.[0]?.name || "Meal",
      food_items: mealLog.foods || [],
      total_calories: mealLog.totalCalories || 0,
      total_protein: mealLog.totalMacros?.protein || 0,
      total_carbohydrates: mealLog.totalMacros?.carbohydrates || 0,
      total_fat: mealLog.totalMacros?.fat || 0,
      logging_mode: mealLog.provenance?.mode || "manual",
      truth_level: mealLog.provenance?.truthLevel || "curated",
      confidence: mealLog.provenance?.confidence || null,
      country_context: mealLog.provenance?.countryContext || null,
      requires_review: mealLog.provenance?.requiresReview || false,
      source_metadata: {
        source: mealLog.provenance?.source || null,
        productIdentity: mealLog.provenance?.productIdentity || null,
        conflict: mealLog.provenance?.conflict || null,
      },
      notes: mealLog.notes || null,
      logged_at: mealLog.loggedAt || new Date().toISOString(),
    };
  }

  transformSupabaseToMealLog(supabaseMealLog: any): MealLog {
    const foods = normalizeMealLogFoodItems(supabaseMealLog.food_items);

    return {
      id: supabaseMealLog.id,
      mealPlanId: supabaseMealLog.meal_plan_id || undefined,
      planMealId: supabaseMealLog.plan_meal_id || undefined,
      fromPlan: supabaseMealLog.from_plan ?? false,
      portionMultiplier: supabaseMealLog.portion_multiplier ?? 1,
      mealType: supabaseMealLog.meal_type,
      foods: foods as any,
      totalCalories: supabaseMealLog.total_calories || 0,
      totalMacros: {
        protein: supabaseMealLog.total_protein || 0,
        carbohydrates: supabaseMealLog.total_carbohydrates || 0,
        fat: supabaseMealLog.total_fat || 0,
        fiber: deriveMealLogFiber(foods),
      },
      loggedAt: supabaseMealLog.logged_at || new Date().toISOString(),
      notes: supabaseMealLog.notes || "",
      provenance: {
        mode: supabaseMealLog.logging_mode || "manual",
        truthLevel: supabaseMealLog.truth_level || "curated",
        confidence: supabaseMealLog.confidence || null,
        countryContext: supabaseMealLog.country_context || null,
        requiresReview: supabaseMealLog.requires_review || false,
        source: supabaseMealLog.source_metadata?.source || null,
        productIdentity:
          supabaseMealLog.source_metadata?.productIdentity || null,
        conflict: supabaseMealLog.source_metadata?.conflict || null,
      },
      photos: [],
      syncStatus: SyncStatus.SYNCED,
      syncMetadata: {
        lastSyncedAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        syncVersion: 1,
        deviceId: "local",
      },
    };
  }

  // ============================================================================
  // PROGRESS ENTRY TRANSFORMATION
  // ============================================================================

  transformBodyMeasurementToSupabase(
    measurement: BodyMeasurement,
    userId: string,
  ): SupabaseProgressEntry {
    return {
      user_id: userId,
      entry_date: measurement.date,
      weight_kg: measurement.weight,
      body_fat_percentage: measurement.bodyFat,
      muscle_mass_kg: measurement.muscleMass,
      measurements: {
        chest: measurement.chest,
        waist: measurement.waist,
        hips: measurement.hips,
        biceps: measurement.biceps,
        thighs: measurement.thighs,
        calves: measurement.calves,
        neck: measurement.neck,
      },
      notes: measurement.notes || "",
    };
  }

  transformSupabaseToBodyMeasurement(supabaseEntry: any): BodyMeasurement {
    // Handle measurements - could be object or string
    let measurements: any = {};
    if (supabaseEntry.measurements) {
      if (typeof supabaseEntry.measurements === "string") {
        try {
          measurements = JSON.parse(supabaseEntry.measurements);
        } catch {
          measurements = {};
        }
      } else {
        measurements = supabaseEntry.measurements;
      }
    }

    return {
      id: supabaseEntry.id,
      date: supabaseEntry.entry_date,
      weight: supabaseEntry.weight_kg,
      bodyFat: supabaseEntry.body_fat_percentage,
      muscleMass: supabaseEntry.muscle_mass_kg,
      chest: measurements.chest,
      waist: measurements.waist,
      hips: measurements.hips,
      biceps: measurements.biceps,
      thighs: measurements.thighs,
      calves: measurements.calves,
      neck: measurements.neck,
      notes: supabaseEntry.notes || "",
      syncStatus: "synced",
    };
  }

  // ============================================================================
  // BATCH TRANSFORMATION
  // ============================================================================

  transformLocalDataForMigration(
    localSchema: LocalStorageSchema,
    userId: string,
    email: string,
  ): {
    profile: SupabaseProfile | null;
    workoutSessions: SupabaseWorkoutSession[];
    mealLogs: SupabaseMealLog[];
    progressEntries: SupabaseProgressEntry[];
  } {
    const result = {
      profile: null as SupabaseProfile | null,
      workoutSessions: [] as SupabaseWorkoutSession[],
      mealLogs: [] as SupabaseMealLog[],
      progressEntries: [] as SupabaseProgressEntry[],
    };

    // Transform user profile
    if (localSchema.user.onboardingData) {
      result.profile = this.transformOnboardingDataToProfile(
        localSchema.user.onboardingData,
        userId,
        email,
      );
    }

    // Transform workout sessions
    result.workoutSessions = localSchema.fitness.sessions.map((session) =>
      this.transformWorkoutSessionToSupabase(session, userId),
    );

    // Transform meal logs
    result.mealLogs = localSchema.nutrition.logs.map((log) =>
      this.transformMealLogToSupabase(log, userId),
    );

    // Transform progress entries
    result.progressEntries = localSchema.progress.measurements.map(
      (measurement) =>
        this.transformBodyMeasurementToSupabase(measurement, userId),
    );

    return result;
  }

  // ============================================================================
  // DATA VALIDATION FOR TRANSFORMATION
  // ============================================================================

  validateTransformationData(
    data: any,
    type: "profile" | "workout" | "meal" | "progress",
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (type) {
      case "profile":
        if (!data.id || !data.email || !data.name) {
          errors.push("Profile must have id, email, and name");
        }
        break;

      case "workout":
        if (!data.id || !data.user_id || !data.workout_id) {
          errors.push("Workout session must have id, user_id, and workout_id");
        }
        const hasDuration = (typeof data.duration === 'number' && data.duration > 0);
        const hasTotalDuration = (typeof data.total_duration_minutes === 'number' && data.total_duration_minutes > 0);
        if (!hasDuration && !hasTotalDuration) {
          errors.push("Workout session must have a positive duration");
        }
        break;

      case "meal":
        if (!data.id || !data.user_id || !data.logged_at) {
          errors.push("Meal log must have id, user_id, and logged_at timestamp");
        }
        if (
          !data.meal_type ||
          !["breakfast", "lunch", "dinner", "snack"].includes(data.meal_type)
        ) {
          errors.push("Meal log must have valid meal_type");
        }
        break;

      case "progress":
        if (!data.id || !data.user_id || !data.date) {
          errors.push("Progress entry must have id, user_id, and date");
        }
        if (typeof data.weight_kg !== "number" || data.weight_kg <= 0) {
          errors.push("Progress entry must have valid weight");
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private normalizeGender(gender: string): "male" | "female" | "other" | null {
    const normalized = gender.toLowerCase();
    if (["male", "female", "other"].includes(normalized)) {
      return normalized as "male" | "female" | "other";
    }
    return null;
  }

  private normalizeActivityLevel(
    level: string,
  ): "sedentary" | "light" | "moderate" | "active" | "extreme" | null {
    const normalized = level.toLowerCase();
    if (
      ["sedentary", "light", "moderate", "active", "extreme"].includes(
        normalized,
      )
    ) {
      return normalized as
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "extreme";
    }
    return null;
  }

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================

  detectConflicts(
    localData: any,
    remoteData: any,
    type: string,
  ): {
    hasConflicts: boolean;
    conflictFields: string[];
    recommendations: string[];
  } {
    const conflictFields: string[] = [];
    const recommendations: string[] = [];

    switch (type) {
      case "profile":
        if (localData.name !== remoteData.name) {
          conflictFields.push("name");
          recommendations.push("Consider which name is more current");
        }
        if (localData.weight_kg !== remoteData.weight_kg) {
          conflictFields.push("weight");
          recommendations.push("Use the more recent weight measurement");
        }
        break;

      case "workout":
        if (localData.duration !== remoteData.duration) {
          conflictFields.push("duration");
          recommendations.push(
            "Use the local duration if workout was completed offline",
          );
        }
        if (localData.rating !== remoteData.rating) {
          conflictFields.push("rating");
          recommendations.push("Use the most recent rating");
        }
        break;

      case "meal":
        if (localData.total_calories !== remoteData.total_calories) {
          conflictFields.push("calories");
          recommendations.push("Recalculate calories based on food items");
        }
        break;

      case "progress":
        if (Math.abs(localData.weight_kg - remoteData.weight_kg) > 0.1) {
          conflictFields.push("weight");
          recommendations.push(
            "Use the measurement with the more recent timestamp",
          );
        }
        break;
    }

    return {
      hasConflicts: conflictFields.length > 0,
      conflictFields,
      recommendations,
    };
  }

  // ============================================================================
  // DATA MERGING
  // ============================================================================

  mergeConflictedData(
    localData: any,
    remoteData: any,
    resolution: "local" | "remote" | "merge",
    type: string,
  ): any {
    switch (resolution) {
      case "local":
        return { ...localData, updated_at: new Date().toISOString() };

      case "remote":
        return remoteData;

      case "merge":
        return this.performIntelligentMerge(localData, remoteData, type);

      default:
        return localData;
    }
  }

  private performIntelligentMerge(
    localData: any,
    remoteData: any,
    type: string,
  ): any {
    const merged = { ...remoteData };

    switch (type) {
      case "profile":
        // Use local data for fields that are more likely to be current locally
        if (
          localData.weight_kg &&
          new Date(localData.updated_at) > new Date(remoteData.updated_at)
        ) {
          merged.weight_kg = localData.weight_kg;
        }
        if (localData.units) {
          merged.units = localData.units;
        }
        if (typeof localData.notifications_enabled === "boolean") {
          merged.notifications_enabled = localData.notifications_enabled;
        }
        break;

      case "workout":
        // Prefer local data for completed workouts
        if (localData.is_completed && !remoteData.is_completed) {
          merged.is_completed = true;
          merged.completed_at = localData.completed_at;
          merged.duration = localData.duration;
          merged.total_duration_minutes = localData.total_duration_minutes;
          merged.calories_burned = localData.calories_burned;
          merged.rating = localData.rating;
        }
        break;

      case "meal":
        // Merge food items if different
        // Handle food_items as JSONB (could be object, array, or string)
        let localFoods: unknown[] = [];
        let remoteFoods: unknown[] = [];

        if (localData.food_items) {
          if (typeof localData.food_items === "string") {
            try {
              localFoods = JSON.parse(localData.food_items);
            } catch {
              localFoods = [];
            }
          } else if (Array.isArray(localData.food_items)) {
            localFoods = localData.food_items;
          }
        }

        if (remoteData.food_items) {
          if (typeof remoteData.food_items === "string") {
            try {
              remoteFoods = JSON.parse(remoteData.food_items);
            } catch {
              remoteFoods = [];
            }
          } else if (Array.isArray(remoteData.food_items)) {
            remoteFoods = remoteData.food_items;
          }
        }

        if (localFoods.length > remoteFoods.length) {
          merged.food_items = localData.food_items;
          merged.total_calories = localData.total_calories;
          merged.total_protein = localData.total_protein;
          merged.total_carbohydrates = localData.total_carbohydrates;
          merged.total_fat = localData.total_fat;
        }
        break;

      case "progress":
        // Use the measurement with the more recent timestamp
        const localTime = new Date(localData.created_at).getTime();
        const remoteTime = new Date(remoteData.created_at).getTime();

        if (localTime > remoteTime) {
          merged.weight_kg = localData.weight_kg;
          merged.body_fat_percentage = localData.body_fat_percentage;
          merged.muscle_mass_kg = localData.muscle_mass_kg;
          merged.measurements = localData.measurements;
        }
        break;
    }

    merged.updated_at = new Date().toISOString();
    return merged;
  }
}

// Export singleton instance
export const dataTransformation = DataTransformationService.getInstance();
export default dataTransformation;
