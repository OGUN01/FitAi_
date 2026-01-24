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
          email: string;
          name: string;
          age: number | null;
          gender: "male" | "female" | "other" | null;
          height_cm: number | null;
          weight_kg: number | null;
          activity_level:
            | "sedentary"
            | "light"
            | "moderate"
            | "active"
            | "extreme"
            | null;
          profile_picture: string | null;
          units: "metric" | "imperial";
          notifications_enabled: boolean;
          dark_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          age?: number | null;
          gender?: "male" | "female" | "other" | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          activity_level?:
            | "sedentary"
            | "light"
            | "moderate"
            | "active"
            | "extreme"
            | null;
          profile_picture?: string | null;
          units?: "metric" | "imperial";
          notifications_enabled?: boolean;
          dark_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          age?: number | null;
          gender?: "male" | "female" | "other" | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          activity_level?:
            | "sedentary"
            | "light"
            | "moderate"
            | "active"
            | "extreme"
            | null;
          profile_picture?: string | null;
          units?: "metric" | "imperial";
          notifications_enabled?: boolean;
          dark_mode?: boolean;
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
          started_at: string;
          completed_at: string | null;
          duration_minutes: number;
          calories_burned: number;
          exercises_data: string;
          notes: string | null;
          rating: number | null;
          is_completed: boolean;
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
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          meal_name: string;
          food_items: object; // JSONB
          total_calories: number;
          total_protein: number;
          total_carbohydrates: number;
          total_fat: number;
          notes: string | null;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          meal_name: string;
          food_items?: object;
          total_calories?: number;
          total_protein?: number;
          total_carbohydrates?: number;
          total_fat?: number;
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
    };
  };
}
