import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
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
