import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration with fallbacks for development
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables - using development fallbacks');
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
          gender: 'male' | 'female' | 'other' | null;
          height_cm: number | null;
          weight_kg: number | null;
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme' | null;
          profile_picture: string | null;
          units: 'metric' | 'imperial';
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
          gender?: 'male' | 'female' | 'other' | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme' | null;
          profile_picture?: string | null;
          units?: 'metric' | 'imperial';
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
          gender?: 'male' | 'female' | 'other' | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme' | null;
          profile_picture?: string | null;
          units?: 'metric' | 'imperial';
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
          time_commitment: '15-30' | '30-45' | '45-60' | '60+' | null;
          experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          primary_goals: string[];
          time_commitment?: '15-30' | '30-45' | '45-60' | '60+' | null;
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          primary_goals?: string[];
          time_commitment?: '15-30' | '30-45' | '45-60' | '60+' | null;
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Export typed client
export type SupabaseClient = typeof supabase;
export default supabase;
