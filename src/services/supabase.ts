import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase configuration with safe environment variable access
// Use fallbacks to prevent bundle evaluation errors when process.env is undefined
const getEnvVar = (key: string, fallback: string) => {
  try {
    return (
      (typeof process !== "undefined" && process.env && process.env[key]) ||
      fallback
    );
  } catch (error) {
    console.warn(`Environment variable ${key} not available, using fallback`);
    return fallback;
  }
};

const supabaseUrl = getEnvVar(
  "EXPO_PUBLIC_SUPABASE_URL",
  "https://mqfrwtmkokivoxgukgsz.supabase.co",
);
const supabaseAnonKey = getEnvVar(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08",
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Missing Supabase environment variables - using development fallbacks",
  );
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (will be generated from schema)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          name: string;
          email: string;
          age: number | null;
          gender: "male" | "female" | "other" | null;
          occupation_type: string | null;
          country: string | null;
          region: string | null;
          state: string | null;
          profile_picture: string | null;
          units: "metric" | "imperial";
          notifications_enabled: boolean;
          dark_mode: boolean;
          subscription_tier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          first_name?: string | null;
          last_name?: string | null;
          age?: number | null;
          gender?: "male" | "female" | "other" | null;
          occupation_type?: string | null;
          country?: string | null;
          region?: string | null;
          state?: string | null;
          profile_picture?: string | null;
          units?: "metric" | "imperial";
          notifications_enabled?: boolean;
          dark_mode?: boolean;
          subscription_tier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          first_name?: string | null;
          last_name?: string | null;
          age?: number | null;
          gender?: "male" | "female" | "other" | null;
          occupation_type?: string | null;
          country?: string | null;
          region?: string | null;
          state?: string | null;
          profile_picture?: string | null;
          units?: "metric" | "imperial";
          notifications_enabled?: boolean;
          dark_mode?: boolean;
          subscription_tier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      fitness_goals: {
        Row: {
          id: string;
          user_id: string;
          primary_goals: string[];
          target_weight_kg: number | null;
          weekly_workout_days: number;
          preferred_workout_duration: number;
          fitness_level: "beginner" | "intermediate" | "advanced";
          equipment_access: string[];
          workout_preferences: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          primary_goals?: string[];
          target_weight_kg?: number | null;
          weekly_workout_days?: number;
          preferred_workout_duration?: number;
          fitness_level?: "beginner" | "intermediate" | "advanced";
          equipment_access?: string[];
          workout_preferences?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          primary_goals?: string[];
          target_weight_kg?: number | null;
          weekly_workout_days?: number;
          preferred_workout_duration?: number;
          fitness_level?: "beginner" | "intermediate" | "advanced";
          equipment_access?: string[];
          workout_preferences?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string;
          workout_plan_id: string | null;
          workout_name: string | null;
          workout_type: string | null;
          duration: number | null;
          total_duration_minutes: number | null;
          calories_burned: number | null;
          exercises: object | null; // JSONB
          exercises_completed: object | null; // JSONB
          is_completed: boolean;
          is_extra: boolean | null;
          rating: number | null;
          enjoyment_rating: number | null;
          notes: string | null;
          started_at: string;
          completed_at: string | null;
          cache_id: string | null;
          generation_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["workout_sessions"]["Row"]
        > & {
          id: string;
          user_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["workout_sessions"]["Row"]
        >;
      };
      meal_logs: {
        Row: {
          id: string;
          user_id: string;
          meal_plan_id: string | null;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          from_plan: boolean;
          plan_meal_id: string | null;
          portion_multiplier: number | null;
          meal_name: string;
          food_items: object; // JSONB
          total_calories: number;
          total_protein: number;
          total_carbohydrates: number;
          total_fat: number;
          logging_mode: "barcode" | "label" | "meal_photo" | "manual" | null;
          truth_level: "authoritative" | "curated" | "estimated" | null;
          confidence: number | null;
          country_context: string | null;
          requires_review: boolean;
          source_metadata: object; // JSONB
          notes: string | null;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_plan_id?: string | null;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          from_plan?: boolean;
          plan_meal_id?: string | null;
          portion_multiplier?: number | null;
          meal_name: string;
          food_items?: object;
          total_calories?: number;
          total_protein?: number;
          total_carbohydrates?: number;
          total_fat?: number;
          logging_mode?: "barcode" | "label" | "meal_photo" | "manual" | null;
          truth_level?: "authoritative" | "curated" | "estimated" | null;
          confidence?: number | null;
          country_context?: string | null;
          requires_review?: boolean;
          source_metadata?: object;
          notes?: string | null;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_logs"]["Insert"]>;
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "breakfast" | "lunch" | "dinner" | "snack" | null;
          consumed_at: string;
          total_calories: number | null;
          total_protein: number | null;
          total_carbs: number | null;
          total_fat: number | null;
          notes: string | null;
          description: string | null;
          prep_time: number | null;
          cooking_time: number | null;
          cooking_instructions: Array<{
            step: number;
            instruction: string;
            timeRequired?: number;
          }> | null;
          main_ingredients: string[] | null;
          difficulty: "easy" | "medium" | "hard" | null;
          tags: string[] | null;
          day_of_week: string | null;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null;
          estimated_calories: number | null;
          is_personalized: boolean | null;
          ai_generated: boolean | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meals"]["Row"]> & {
          id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["meals"]["Row"]>;
      };
      progress_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          weight_kg: number | null;
          body_fat_percentage: number | null;
          muscle_mass_kg: number | null;
          measurements: object | null; // JSONB
          progress_photos: string[] | null;
          notes: string | null;
          recorded_at: string; // Timestamp when the entry was recorded (for analytics)
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_date?: string;
          weight_kg?: number | null;
          body_fat_percentage?: number | null;
          muscle_mass_kg?: number | null;
          measurements?: object | null;
          progress_photos?: string[] | null;
          notes?: string | null;
          recorded_at?: string; // Timestamp when the entry was recorded (for analytics)
        };
        Update: Partial<
          Database["public"]["Tables"]["progress_entries"]["Insert"]
        >;
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          amount_ml: number;
          logged_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          amount_ml: number;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["water_logs"]["Insert"]>;
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          progress: number;
          max_progress: number;
          is_completed: boolean;
          unlocked_at: string | null;
          celebration_shown: boolean;
          fit_coins_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          progress?: number;
          max_progress?: number;
          is_completed?: boolean;
          unlocked_at?: string | null;
          celebration_shown?: boolean;
          fit_coins_earned?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_achievements"]["Insert"]
        >;
      };
      analytics_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_date: string;
          weight_kg: number | null;
          calories_consumed: number | null;
          calories_burned: number | null;
          workouts_completed: number;
          meals_logged: number;
          water_intake_ml: number;
          steps: number | null;
          sleep_hours: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          metric_date: string;
          weight_kg?: number | null;
          calories_consumed?: number | null;
          calories_burned?: number | null;
          workouts_completed?: number;
          meals_logged?: number;
          water_intake_ml?: number;
          steps?: number | null;
          sleep_hours?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["analytics_metrics"]["Insert"]
        >;
      };
    };
  };
}
