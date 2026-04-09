import * as crypto from "expo-crypto";
import { supabase } from "./supabase";
import { crudOperations } from "./crudOperations";
import { dataBridge } from "./DataBridge";
import { AuthUser } from "../types/user";
import { BodyMeasurement } from "../types/localData";
import { analyticsDataService } from "./analyticsData";
import { FALLBACK_DAILY_CALORIES } from "../constants/diet";
import { getLocalDateString } from "../utils/weekUtils";

// Types for progress data
export interface ProgressEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    bicep?: number;
    thigh?: number;
    neck?: number;
  };
  progress_photos?: string[];
  notes?: string;
  recorded_at?: string;
  created_at: string;
}

export interface ProgressBodyAnalysis {
  id: string;
  user_id: string;
  photos: {
    front?: string;
    side?: string;
    back?: string;
  };
  analysis: {
    body_type?: string;
    estimated_body_fat?: number;
    muscle_definition?: string;
    posture_notes?: string;
    recommendations?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ProgressStats {
  totalEntries: number;
  weightChange: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  };
  bodyFatChange: {
    current: number;
    previous: number;
    change: number;
  };
  muscleChange: {
    current: number;
    previous: number;
    change: number;
  };
  measurementChanges: {
    [key: string]: {
      current: number;
      previous: number;
      change: number;
    };
  };
  timeRange: number; // days
  // Additional properties used in ProgressScreen
  totalWorkouts?: number;
  totalDuration?: number; // in minutes
  totalCalories?: number;
  currentStreak?: number;
}

export interface ProgressGoals {
  id: string;
  user_id: string;
  target_weight_kg?: number;
  target_body_fat_percentage?: number;
  target_muscle_mass_kg?: number;
  target_measurements?: {
    [key: string]: number;
  };
  target_date?: string;
  weekly_workout_goal?: number;
  daily_calorie_goal?: number;
  daily_protein_goal?: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ProgressDataService {
  private static instance: ProgressDataService;

  private constructor() {}

  static getInstance(): ProgressDataService {
    if (!ProgressDataService.instance) {
      ProgressDataService.instance = new ProgressDataService();
    }
    return ProgressDataService.instance;
  }

  /**
   * Initialize the service with Track B integration
   */
  async initialize(): Promise<void> {
    try {
      await crudOperations.initialize();
    } catch (error) {
      console.error("Failed to initialize Progress Data Service:", error);
      throw error;
    }
  }

  /**
   * Get user's progress entries using Track B's data layer
   */
  async getUserProgressEntries(
    userId: string,
    limit?: number,
  ): Promise<ProgressDataResponse<ProgressEntry[]>> {
    try {
      // First try to get from Track B's local storage
      const localMeasurements =
        await crudOperations.readBodyMeasurements(limit);

      if (localMeasurements.length > 0) {
        // Convert Track B's BodyMeasurement format to our ProgressEntry format
        const allEntries = localMeasurements.map((measurement) =>
          this.convertBodyMeasurementToProgressEntry(measurement),
        );

        // Track B uses unshift (newest first) and has no per-day deduplication,
        // while Supabase upserts with onConflict="user_id,entry_date" (one per day).
        // Without dedup, logging twice on the same day leaves [89.9, 89.7] in Track B.
        // fetchWeightHistory sorts ascending by date → same-date stable order stays
        // [89.9, 89.7] → last element = 89.7 (stale). Fix: keep only the most recent
        // entry per day (Track B is newest-first, so first occurrence = most recent).
        const seen = new Set<string>();
        const entries = allEntries.filter((e) => {
          if (seen.has(e.entry_date)) return false;
          seen.add(e.entry_date);
          return true;
        });

        return {
          success: true,
          data: entries,
        };
      }

      // Fallback to direct Supabase query
      let query = supabase
        .from("progress_entries")
        .select("*")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching progress entries:", error);
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
      console.error("Error in getUserProgressEntries:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch progress entries",
      };
    }
  }

  /**
   * Create a new progress entry using Track B's data layer
   */
  async createProgressEntry(
    userId: string,
    entryData: {
      weight_kg: number;
      body_fat_percentage?: number;
      muscle_mass_kg?: number;
      measurements?: {
        chest?: number;
        waist?: number;
        hips?: number;
        bicep?: number;
        thigh?: number;
        neck?: number;
      };
      progress_photos?: string[];
      notes?: string;
    },
  ): Promise<ProgressDataResponse<ProgressEntry>> {
    try {
      const now = new Date();
      const entryDate = getLocalDateString(now);

      // Create body measurement for Track B
      const bodyMeasurement: BodyMeasurement = {
        id: `progress_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`,
        date: entryDate,
        weight: entryData.weight_kg,
        bodyFat: entryData.body_fat_percentage,
        muscleMass: entryData.muscle_mass_kg,
        photos: entryData.progress_photos || [],
        notes: entryData.notes,
        syncStatus: "pending",
      };

      // Store using Track B's CRUD operations
      await crudOperations.createBodyMeasurement(bodyMeasurement);

      // Upsert to Supabase — handles logging weight multiple times on the same day
      const { data, error } = await supabase
        .from("progress_entries")
        .upsert(
          {
            user_id: userId,
            entry_date: entryDate,
            weight_kg: entryData.weight_kg,
            body_fat_percentage: entryData.body_fat_percentage,
            muscle_mass_kg: entryData.muscle_mass_kg,
            measurements: entryData.measurements || {},
            progress_photos: entryData.progress_photos || [],
            notes: entryData.notes,
          },
          { onConflict: "user_id,entry_date" },
        )
        .select()
        .single();

      if (error) {
        console.error("Error creating progress entry:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Save weight to analytics_metrics for Monthly Summary tracking
      try {
        await analyticsDataService.updateTodaysMetrics(userId, {
          weightKg: entryData.weight_kg,
        });
      } catch (analyticsError) {
        console.error(
          "Failed to update analytics metrics after progress entry:",
          analyticsError,
        );
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in createProgressEntry:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create progress entry",
      };
    }
  }

  /**
   * Get user's body analysis
   */
  async getUserBodyAnalysis(
    userId: string,
  ): Promise<ProgressDataResponse<ProgressBodyAnalysis>> {
    try {
      const { data, error } = await supabase
        .from("body_analysis")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching body analysis:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in getUserBodyAnalysis:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch body analysis",
      };
    }
  }

  /**
   * Calculate progress statistics
   */
  async getProgressStats(
    userId: string,
    timeRange: number = 30,
  ): Promise<ProgressDataResponse<ProgressStats>> {
    try {
      const entriesResponse = await this.getUserProgressEntries(userId, 2);

      if (
        !entriesResponse.success ||
        !entriesResponse.data ||
        entriesResponse.data.length === 0
      ) {
        return {
          success: false,
          error: "No progress entries found",
        };
      }

      const entries = entriesResponse.data;
      const latest = entries[0];
      // If only one entry exists, compare against itself (change = 0)
      const previous = entries.length >= 2 ? entries[1] : entries[0];

      // Calculate weight change — round to 2 dp to avoid IEEE 754 artifacts
      // e.g. 89.9 - 89.7 = 0.20000000000000284 without rounding
      const rawWeightChange = latest.weight_kg - previous.weight_kg;
      const weightChange = {
        current: latest.weight_kg,
        previous: previous.weight_kg,
        change: Math.round(rawWeightChange * 100) / 100,
        changePercentage:
          previous.weight_kg > 0
            ? Math.round((rawWeightChange / previous.weight_kg) * 10000) / 100
            : 0,
      };

      // Calculate body fat change
      const bodyFatChange = {
        current: latest.body_fat_percentage || 0,
        previous: previous.body_fat_percentage || 0,
        change:
          (latest.body_fat_percentage || 0) -
          (previous.body_fat_percentage || 0),
      };

      // Calculate muscle mass change
      const muscleChange = {
        current: latest.muscle_mass_kg || 0,
        previous: previous.muscle_mass_kg || 0,
        change: (latest.muscle_mass_kg || 0) - (previous.muscle_mass_kg || 0),
      };

      // Calculate measurement changes
      const measurementChanges: {
        [K in "chest" | "waist" | "hips" | "bicep" | "thigh" | "neck"]?: {
          current: number;
          previous: number;
          change: number;
        };
      } = {};
      const measurementKeys = [
        "chest",
        "waist",
        "hips",
        "bicep",
        "thigh",
        "neck",
      ] as const;

      measurementKeys.forEach((key) => {
        const current = latest.measurements?.[key] || 0;
        const prev = previous.measurements?.[key] || 0;
        measurementChanges[key] = {
          current,
          previous: prev,
          change: current - prev,
        };
      });

      const stats: ProgressStats = {
        totalEntries: entries.length,
        weightChange,
        bodyFatChange,
        muscleChange,
        measurementChanges,
        timeRange,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Error in getProgressStats:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate progress statistics",
      };
    }
  }

  /**
   * Get user's progress goals
   */
  async getProgressGoals(
    userId: string,
  ): Promise<ProgressDataResponse<ProgressGoals>> {
    try {
      const { data, error } = await supabase
        .from("progress_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No goals found - return empty goals structure
          return {
            success: true,
            data: this.getDefaultGoals(userId),
          };
        }
        console.error("Error fetching progress goals:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in getProgressGoals:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch progress goals",
      };
    }
  }

  /**
   * Create or update progress goals
   */
  async updateProgressGoals(
    userId: string,
    goals: {
      target_weight_kg?: number;
      target_body_fat_percentage?: number;
      target_muscle_mass_kg?: number;
      target_measurements?: { [key: string]: number };
      target_date?: string;
      weekly_workout_goal?: number;
      daily_calorie_goal?: number;
      daily_protein_goal?: number;
    },
  ): Promise<ProgressDataResponse<ProgressGoals>> {
    try {
      const { data, error } = await supabase
        .from("progress_goals")
        .upsert(
          {
            user_id: userId,
            ...goals,
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
        console.error("Error updating progress goals:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in updateProgressGoals:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update progress goals",
      };
    }
  }

  /**
   * Get default goals structure when no goals exist
   */
  private getDefaultGoals(userId: string): ProgressGoals {
    return {
      id: "default",
      user_id: userId,
      target_weight_kg: undefined,
      target_body_fat_percentage: undefined,
      target_muscle_mass_kg: undefined,
      target_measurements: {},
      target_date: undefined,
      weekly_workout_goal: 3,
      daily_calorie_goal: FALLBACK_DAILY_CALORIES,
      daily_protein_goal: 150,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Convert Track B's BodyMeasurement to our ProgressEntry format
   */
  private convertBodyMeasurementToProgressEntry(
    measurement: BodyMeasurement,
  ): ProgressEntry {
    return {
      id: measurement.id,
      user_id: "local-user",
      entry_date: measurement.date,
      weight_kg: measurement.weight ?? 0,
      body_fat_percentage: measurement.bodyFat,
      muscle_mass_kg: measurement.muscleMass,
      measurements: {
        chest: measurement.chest,
        waist: measurement.waist,
        hips: measurement.hips,
        bicep: measurement.biceps,
        thigh: measurement.thighs,
        neck: measurement.neck,
      },
      progress_photos: measurement.photos || [],
      notes: measurement.notes,
      recorded_at: measurement.date, // kept for legacy consumers; column is optional
      created_at: measurement.date,
    };
  }
}

export const progressDataService = ProgressDataService.getInstance();
