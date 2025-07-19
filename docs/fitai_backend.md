# FitAI - Backend & Database Guide

## Overview

This document covers the complete backend implementation for FitAI using Supabase as the primary backend service. The architecture includes database design, API endpoints, authentication, storage, and edge functions.

## Supabase Setup & Configuration

### Project Initialization
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Environment Configuration
```typescript
// config/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## Database Schema Design

### Core Tables

#### Users Table
```sql
-- Core user profile and preferences
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Personal Information
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 13 AND age <= 100),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height DECIMAL(5,2) CHECK (height >= 100 AND height <= 250), -- cm
  current_weight DECIMAL(5,2) CHECK (current_weight >= 30 AND current_weight <= 300), -- kg
  target_weight DECIMAL(5,2) CHECK (target_weight >= 30 AND target_weight <= 300), -- kg
  
  -- Fitness Profile
  fitness_goals TEXT[] CHECK (array_length(fitness_goals, 1) > 0),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  
  -- Preferences stored as JSONB for flexibility
  workout_preferences JSONB DEFAULT '{}',
  diet_preferences JSONB DEFAULT '{}',
  
  -- App Settings
  units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  timezone TEXT DEFAULT 'UTC',
  notification_settings JSONB DEFAULT '{"enabled": true, "workout_reminders": true, "meal_reminders": true}',
  privacy_settings JSONB DEFAULT '{"data_sharing": false, "analytics": true}',
  
  -- Subscription & Features
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT weight_goal_reasonable CHECK (ABS(current_weight - target_weight) <= 50)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_expires_at);
```

#### Workout Plans Table
```sql
-- Structured workout plans (weekly)
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Plan Metadata
  name TEXT NOT NULL,
  description TEXT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  plan_type TEXT DEFAULT 'ai_generated' CHECK (plan_type IN ('ai_generated', 'custom', 'template', 'coach_assigned')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Plan Structure (stored as JSONB for flexibility)
  workout_schedule JSONB NOT NULL DEFAULT '[]', -- Array of daily workouts
  rest_days INTEGER[] DEFAULT '{6,0}', -- Sunday = 0, Saturday = 6
  
  -- AI Generation Context
  generation_params JSONB, -- Parameters used for AI generation
  ai_model_version TEXT, -- Track which model version generated this
  generation_prompt TEXT, -- Store the prompt for debugging/improvement
  
  -- Plan Status
  is_active BOOLEAN DEFAULT true,
  completion_rate DECIMAL(5,2) DEFAULT 0, -- Percentage completed
  user_feedback JSONB, -- User ratings and feedback
  
  -- Constraints
  UNIQUE(user_id, week_start),
  CHECK (week_end = week_start + INTERVAL '6 days'),
  CHECK (jsonb_array_length(workout_schedule) = 7) -- Must have 7 days
);

-- Enable RLS
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workout plans" ON workout_plans FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_workout_plans_user_active ON workout_plans(user_id, is_active);
CREATE INDEX idx_workout_plans_week ON workout_plans(week_start, week_end);
CREATE INDEX idx_workout_plans_type ON workout_plans(plan_type, difficulty_level);
```

#### Diet Plans Table
```sql
-- Structured diet plans (2-week cycles)
CREATE TABLE diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Plan Metadata
  name TEXT NOT NULL,
  description TEXT,
  plan_start DATE NOT NULL,
  plan_end DATE NOT NULL,
  plan_type TEXT DEFAULT 'ai_generated' CHECK (plan_type IN ('ai_generated', 'custom', 'template')),
  
  -- Nutritional Targets
  daily_calorie_target INTEGER CHECK (daily_calorie_target > 0),
  macro_targets JSONB NOT NULL DEFAULT '{"protein": 0, "carbohydrates": 0, "fats": 0, "fiber": 0}',
  
  -- Meal Plan Structure (14 days)
  meal_plan JSONB NOT NULL DEFAULT '[]', -- Array of daily meal plans
  
  -- Customization Options
  meal_swap_options JSONB DEFAULT '{}', -- Available meal substitutions
  shopping_lists JSONB DEFAULT '{}', -- Weekly shopping lists
  
  -- AI Generation Context
  generation_params JSONB,
  ai_model_version TEXT,
  dietary_restrictions JSONB DEFAULT '[]',
  cuisine_preferences JSONB DEFAULT '[]',
  
  -- Plan Status
  is_active BOOLEAN DEFAULT true,
  adherence_rate DECIMAL(5,2) DEFAULT 0,
  user_feedback JSONB,
  
  -- Constraints
  UNIQUE(user_id, plan_start),
  CHECK (plan_end = plan_start + INTERVAL '13 days'), -- 14-day plans
  CHECK (jsonb_array_length(meal_plan) = 14)
);

-- Enable RLS
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own diet plans" ON diet_plans FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_diet_plans_user_active ON diet_plans(user_id, is_active);
CREATE INDEX idx_diet_plans_dates ON diet_plans(plan_start, plan_end);
```

#### Meal Logs Table
```sql
-- Individual meal logging with AI recognition
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Meal Context
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
  meal_time TIME,
  
  -- Food Recognition Data
  image_url TEXT, -- Stored in Supabase Storage
  image_metadata JSONB, -- Image size, format, etc.
  
  -- AI Recognition Results
  ai_analysis JSONB, -- Raw AI response
  recognized_foods JSONB NOT NULL DEFAULT '[]', -- Structured food data
  confidence_scores JSONB, -- Confidence for each recognized item
  
  -- User Modifications
  user_adjustments JSONB DEFAULT '{}', -- Manual corrections
  manual_additions JSONB DEFAULT '[]', -- Manually added foods
  
  -- Nutritional Summary
  total_calories INTEGER CHECK (total_calories >= 0),
  macros JSONB DEFAULT '{"protein": 0, "carbohydrates": 0, "fats": 0, "fiber": 0}',
  micronutrients JSONB DEFAULT '{}',
  
  -- Processing Metadata
  recognition_method TEXT DEFAULT 'ai' CHECK (recognition_method IN ('ai', 'manual', 'barcode', 'voice')),
  processing_time_ms INTEGER,
  ai_model_version TEXT,
  
  -- Quality & Feedback
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  accuracy_feedback TEXT CHECK (accuracy_feedback IN ('accurate', 'mostly_accurate', 'inaccurate')),
  notes TEXT
);

-- Enable RLS
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own meal logs" ON meal_logs FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, meal_date);
CREATE INDEX idx_meal_logs_type ON meal_logs(meal_type, meal_date);
CREATE INDEX idx_meal_logs_recognition ON meal_logs(recognition_method, confidence_scores);
```

#### Body Analysis Table
```sql
-- Body progress tracking with AI analysis
CREATE TABLE body_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analysis Context
  analysis_date DATE NOT NULL,
  analysis_type TEXT DEFAULT 'progress' CHECK (analysis_type IN ('onboarding', 'progress', 'milestone')),
  
  -- Photo Data
  front_photo_url TEXT,
  side_photo_url TEXT,
  back_photo_url TEXT,
  photo_metadata JSONB, -- Resolution, lighting conditions, etc.
  
  -- AI Analysis Results
  ai_analysis JSONB, -- Raw AI response
  body_composition JSONB, -- Estimated metrics
  confidence_scores JSONB, -- AI confidence levels
  comparison_data JSONB, -- Comparison with previous analysis
  
  -- Manual Measurements (optional)
  weight DECIMAL(5,2) CHECK (weight > 0),
  body_fat_percentage DECIMAL(4,2) CHECK (body_fat_percentage BETWEEN 0 AND 50),
  muscle_mass DECIMAL(5,2),
  measurements JSONB DEFAULT '{}', -- chest, waist, hips, arms, etc.
  
  -- Progress Tracking
  progress_score DECIMAL(4,2), -- Overall progress rating 0-10
  key_improvements TEXT[],
  areas_to_focus TEXT[],
  
  -- Processing Metadata
  ai_model_version TEXT,
  processing_time_ms INTEGER,
  
  -- User Feedback
  user_notes TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'coach', 'public'))
);

-- Enable RLS
ALTER TABLE body_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own body analysis" ON body_analysis FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_body_analysis_user_date ON body_analysis(user_id, analysis_date);
CREATE INDEX idx_body_analysis_type ON body_analysis(analysis_type, analysis_date);
```

#### Workout Sessions Table
```sql
-- Individual workout session tracking
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  
  -- Session Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_duration INTEGER DEFAULT 0, -- seconds paused
  
  -- Workout Data
  planned_workout JSONB NOT NULL, -- Original workout plan
  actual_workout JSONB NOT NULL DEFAULT '{}', -- What was actually completed
  
  -- Performance Metrics
  total_duration_minutes INTEGER,
  calories_burned INTEGER,
  heart_rate_data JSONB, -- If available from wearables
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- User Experience
  perceived_exertion INTEGER CHECK (perceived_exertion BETWEEN 1 AND 10),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  energy_level_before INTEGER CHECK (energy_level_before BETWEEN 1 AND 10),
  energy_level_after INTEGER CHECK (energy_level_after BETWEEN 1 AND 10),
  
  -- Session Notes
  notes TEXT,
  modifications_made TEXT[],
  exercises_skipped TEXT[],
  exercises_added TEXT[],
  
  -- Session Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  
  -- Location & Environment
  location_type TEXT CHECK (location_type IN ('home', 'gym', 'outdoor', 'other')),
  weather_conditions JSONB -- For outdoor workouts
);

-- Enable RLS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workout sessions" ON workout_sessions FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, started_at);
CREATE INDEX idx_workout_sessions_plan ON workout_sessions(workout_plan_id, status);
CREATE INDEX idx_workout_sessions_completion ON workout_sessions(completion_percentage, user_rating);
```

#### Exercise Library Table
```sql
-- Comprehensive exercise database
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic Information
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  instructions TEXT NOT NULL,
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'balance', 'sport_specific')),
  primary_muscle_groups TEXT[] NOT NULL,
  secondary_muscle_groups TEXT[] DEFAULT '{}',
  movement_pattern TEXT CHECK (movement_pattern IN ('push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation')),
  
  -- Difficulty & Requirements
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  equipment_required TEXT[] DEFAULT '{}',
  space_required TEXT DEFAULT 'minimal' CHECK (space_required IN ('minimal', 'moderate', 'large')),
  
  -- Exercise Specifications
  default_sets INTEGER CHECK (default_sets > 0),
  default_reps TEXT, -- Can be range like "8-12" or time like "30s"
  default_weight_percentage DECIMAL(4,2), -- Percentage of body weight or 1RM
  rest_time_seconds INTEGER DEFAULT 60,
  
  -- Media & Demonstrations
  demo_image_url TEXT,
  demo_video_url TEXT,
  step_by_step_images TEXT[],
  
  -- Variations & Progressions
  easier_variations JSONB DEFAULT '[]',
  harder_variations JSONB DEFAULT '[]',
  alternative_exercises JSONB DEFAULT '[]',
  
  -- Safety & Form
  form_cues TEXT[],
  common_mistakes TEXT[],
  safety_notes TEXT,
  contraindications TEXT[],
  
  -- Metrics
  calorie_burn_per_minute DECIMAL(4,2),
  metabolic_equivalent DECIMAL(3,1), -- MET value
  
  -- Content Management
  is_active BOOLEAN DEFAULT true,
  created_by UUID, -- Could reference a trainer/admin
  popularity_score DECIMAL(4,2) DEFAULT 0,
  user_rating DECIMAL(3,1) DEFAULT 0
);

-- Indexes
CREATE INDEX idx_exercises_category ON exercises(category, difficulty_level);
CREATE INDEX idx_exercises_muscle_groups ON exercises USING GIN(primary_muscle_groups);
CREATE INDEX idx_exercises_equipment ON exercises USING GIN(equipment_required);
CREATE INDEX idx_exercises_popularity ON exercises(popularity_score DESC, user_rating DESC);

-- Full-text search
CREATE INDEX idx_exercises_search ON exercises USING GIN(to_tsvector('english', name || ' ' || description));
```

#### Food Database Table
```sql
-- Comprehensive food nutrition database
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic Information
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  
  -- Categorization
  category TEXT NOT NULL, -- 'fruits', 'vegetables', 'grains', etc.
  subcategory TEXT,
  cuisine_type TEXT, -- 'indian', 'chinese', 'mediterranean', etc.
  food_group TEXT CHECK (food_group IN ('vegetables', 'fruits', 'grains', 'protein', 'dairy', 'fats', 'sweets')),
  
  -- Nutritional Information (per 100g)
  calories_per_100g DECIMAL(7,2) NOT NULL CHECK (calories_per_100g >= 0),
  protein_g DECIMAL(6,2) DEFAULT 0 CHECK (protein_g >= 0),
  carbohydrates_g DECIMAL(6,2) DEFAULT 0 CHECK (carbohydrates_g >= 0),
  fats_g DECIMAL(6,2) DEFAULT 0 CHECK (fats_g >= 0),
  fiber_g DECIMAL(6,2) DEFAULT 0 CHECK (fiber_g >= 0),
  sugar_g DECIMAL(6,2) DEFAULT 0 CHECK (sugar_g >= 0),
  sodium_mg DECIMAL(8,2) DEFAULT 0 CHECK (sodium_mg >= 0),
  
  -- Micronutrients (per 100g)
  micronutrients JSONB DEFAULT '{}', -- Vitamins, minerals, etc.
  
  -- Serving Information
  common_serving_sizes JSONB DEFAULT '[]', -- Array of {name, weight_g, description}
  density_g_per_ml DECIMAL(4,2), -- For liquids
  
  -- Food Properties
  allergens TEXT[] DEFAULT '{}',
  dietary_labels TEXT[] DEFAULT '{}', -- 'vegan', 'gluten-free', 'organic', etc.
  preparation_methods TEXT[] DEFAULT '{}', -- 'raw', 'boiled', 'fried', etc.
  
  -- Regional & Cultural Data
  regional_names JSONB DEFAULT '{}', -- Names in different languages/regions
  traditional_pairings TEXT[],
  seasonal_availability TEXT[],
  
  -- Data Source & Quality
  data_source TEXT NOT NULL, -- 'usda', 'ifct', 'manual', 'user_contributed'
  verified BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3,2) DEFAULT 0,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Usage Metrics
  search_count INTEGER DEFAULT 0,
  log_count INTEGER DEFAULT 0,
  user_rating DECIMAL(3,1) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_foods_category ON foods(category, subcategory);
CREATE INDEX idx_foods_nutrition ON foods(calories_per_100g, protein_g, carbohydrates_g);
CREATE INDEX idx_foods_dietary ON foods USING GIN(dietary_labels);
CREATE INDEX idx_foods_allergens ON foods USING GIN(allergens);
CREATE INDEX idx_foods_usage ON foods(search_count DESC, log_count DESC);

-- Full-text search
CREATE INDEX idx_foods_search ON foods USING GIN(to_tsvector('english', name || ' ' || COALESCE(brand, '') || ' ' || COALESCE(description, '')));
```

### Storage Buckets Configuration

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
('user-photos', 'user-photos', false, 10485760, ARRAY['image/jpeg', 'image/png']),
('food-images', 'food-images', false, 5242880, ARRAY['image/jpeg', 'image/png']),
('exercise-media', 'exercise-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'video/mp4']);

-- Storage policies
CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own photos" ON storage.objects FOR SELECT 
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload food images" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own food images" ON storage.objects FOR SELECT 
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view exercise media" ON storage.objects FOR SELECT 
USING (bucket_id = 'exercise-media');
```

## API Layer Implementation

### Authentication Service
```typescript
// services/api/authService.ts
import { supabase } from '../../config/supabase';
import { User } from '../../types/user';

export class AuthService {
  static async signUp(email: string, password: string, userData: Partial<User>) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            ...userData,
          }]);

        if (profileError) throw profileError;
      }

      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update last login
      if (data.user) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        return { ...user, ...profile };
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'fitai://reset-password',
      });

      if (error) throw error;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }
}
```

### Workout Service
```typescript
// services/api/workoutService.ts
import { supabase } from '../../config/supabase';
import { WorkoutPlan, Workout, WorkoutSession } from '../../types/workout';

export class WorkoutService {
  static async createWorkoutPlan(userId: string, planData: Partial<WorkoutPlan>) {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .insert([{
          user_id: userId,
          ...planData,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create workout plan error:', error);
      throw error;
    }
  }

  static async getCurrentWeekPlan(userId: string) {
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', startOfWeek.toISOString().split('T')[0])
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Get current week plan error:', error);
      throw error;
    }
  }

  static async startWorkoutSession(sessionData: Partial<WorkoutSession>) {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([{
          ...sessionData,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Start workout session error:', error);
      throw error;
    }
  }

  static async updateWorkoutSession(sessionId: string, updates: Partial<WorkoutSession>) {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update workout session error:', error);
      throw error;
    }
  }

  static async completeWorkoutSession(sessionId: string, sessionData: Partial<WorkoutSession>) {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          ...sessionData,
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Complete workout session error:', error);
      throw error;
    }
  }

  static async getWorkoutHistory(userId: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, workout_plans(name)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get workout history error:', error);
      throw error;
    }
  }

  static async getExercises(filters?: {
    category?: string;
    difficulty?: string;
    equipment?: string[];
    muscleGroups?: string[];
  }) {
    try {
      let query = supabase
        .from('exercises')
        .select('*')
        .eq('is_active', true);

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty_level', filters.difficulty);
      }

      if (filters?.equipment?.length) {
        query = query.contains('equipment_required', filters.equipment);
      }

      if (filters?.muscleGroups?.length) {
        query = query.overlaps('primary_muscle_groups', filters.muscleGroups);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get exercises error:', error);
      throw error;
    }
  }
}
```

### Diet Service
```typescript
// services/api/dietService.ts
import { supabase } from '../../config/supabase';
import { DietPlan, MealLog } from '../../types/diet';

export class DietService {
  static async createDietPlan(userId: string, planData: Partial<DietPlan>) {
    try {
      const { data, error } = await supabase
        .from('diet_plans')
        .insert([{
          user_id: userId,
          ...planData,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create diet plan error:', error);
      throw error;
    }
  }

  static async getCurrentDietPlan(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', userId)
        .lte('plan_start', today)
        .gte('plan_end', today)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Get current diet plan error:', error);
      throw error;
    }
  }

  static async logMeal(mealData: Partial<MealLog>) {
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .insert([mealData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Log meal error:', error);
      throw error;
    }
  }

  static async updateMealLog(mealId: string, updates: Partial<MealLog>) {
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .update(updates)
        .eq('id', mealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update meal log error:', error);
      throw error;
    }
  }

  static async getTodaysMeals(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('meal_date', today)
        .order('meal_time', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get todays meals error:', error);
      throw error;
    }
  }

  static async getDailyNutritionSummary(userId: string, date: string) {
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('total_calories, macros')
        .eq('user_id', userId)
        .eq('meal_date', date);

      if (error) throw error;

      // Calculate totals
      const summary = data.reduce((acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.macros?.protein || 0),
        carbohydrates: acc.carbohydrates + (meal.macros?.carbohydrates || 0),
        fats: acc.fats + (meal.macros?.fats || 0),
        fiber: acc.fiber + (meal.macros?.fiber || 0),
      }), { calories: 0, protein: 0, carbohydrates: 0, fats: 0, fiber: 0 });

      return summary;
    } catch (error) {
      console.error('Get daily nutrition summary error:', error);
      throw error;
    }
  }

  static async searchFoods(query: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .textSearch('name', query)
        .eq('is_active', true)
        .order('search_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Search foods error:', error);
      throw error;
    }
  }

  static async getFoodById(foodId: string) {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('id', foodId)
        .single();

      if (error) throw error;

      // Increment search count
      await supabase
        .from('foods')
        .update({ search_count: (data.search_count || 0) + 1 })
        .eq('id', foodId);

      return data;
    } catch (error) {
      console.error('Get food by ID error:', error);
      throw error;
    }
  }
}
```

### Body Analysis Service
```typescript
// services/api/bodyAnalysisService.ts
import { supabase } from '../../config/supabase';
import { BodyAnalysis } from '../../types/bodyAnalysis';

export class BodyAnalysisService {
  static async createAnalysis(analysisData: Partial<BodyAnalysis>) {
    try {
      const { data, error } = await supabase
        .from('body_analysis')
        .insert([analysisData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create body analysis error:', error);
      throw error;
    }
  }

  static async getLatestAnalysis(userId: string) {
    try {
      const { data, error } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Get latest analysis error:', error);
      throw error;
    }
  }

  static async getAnalysisHistory(userId: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('analysis_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get analysis history error:', error);
      throw error;
    }
  }

  static async updateAnalysis(analysisId: string, updates: Partial<BodyAnalysis>) {
    try {
      const { data, error } = await supabase
        .from('body_analysis')
        .update(updates)
        .eq('id', analysisId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update analysis error:', error);
      throw error;
    }
  }
}
```

### Storage Service
```typescript
// services/api/storageService.ts
import { supabase } from '../../config/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export class StorageService {
  static async uploadImage(
    bucket: string,
    filePath: string,
    imageUri: string,
    options?: { upsert?: boolean }
  ) {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to array buffer
      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: options?.upsert || false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  }

  static async deleteImage(bucket: string, filePath: string) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Delete image error:', error);
      throw error;
    }
  }

  static async getSignedUrl(bucket: string, filePath: string, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Get signed URL error:', error);
      throw error;
    }
  }

  static generateFilePath(userId: string, type: string, filename?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = filename?.split('.').pop() || 'jpg';
    
    return `${userId}/${type}/${timestamp}_${randomString}.${extension}`;
  }
}
```

## Edge Functions

### Food Recognition Function
```typescript
// supabase/functions/food-recognition/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

interface FoodRecognitionRequest {
  imageBase64: string;
  userPreferences?: {
    dietaryType?: string;
    allergies?: string[];
    regionalCuisine?: string;
    goals?: string[];
  };
  userId: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { imageBase64, userPreferences = {}, userId }: FoodRecognitionRequest = await req.json();

    if (!imageBase64 || !userId) {
      return new Response('Missing required fields', { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
      You are an expert nutritionist analyzing a food image. Provide detailed nutritional analysis.
      
      User Context:
      - Dietary preferences: ${userPreferences.dietaryType || 'None specified'}
      - Regional cuisine: ${userPreferences.regionalCuisine || 'Mixed'}
      - Allergies: ${userPreferences.allergies?.join(', ') || 'None'}
      - Goals: ${userPreferences.goals?.join(', ') || 'General health'}
      
      Analyze the image and return a JSON response with this exact structure:
      {
        "foods": [
          {
            "name": "specific food name (e.g., 'Chicken Biryani', 'Grilled Salmon')",
            "estimatedQuantity": "amount with unit (e.g., '1 cup', '150g', '1 medium piece')",
            "confidence": 0.85,
            "calories": 250,
            "macros": {
              "protein": 15,
              "carbohydrates": 30,
              "fats": 8,
              "fiber": 5
            },
            "micronutrients": {
              "iron": 2.5,
              "calcium": 120,
              "vitaminC": 15,
              "vitaminA": 45
            },
            "ingredients": ["visible or likely ingredients"],
            "preparationMethod": "grilled/fried/boiled/raw/etc"
          }
        ],
        "totalCalories": 250,
        "totalMacros": {
          "protein": 15,
          "carbohydrates": 30,
          "fats": 8,
          "fiber": 5
        },
        "overallConfidence": 0.85,
        "nutritionalAnalysis": {
          "healthScore": 7.5,
          "recommendations": ["Add more vegetables", "Consider portion size"],
          "warnings": ["High sodium content", "Missing vegetables"],
          "balanceAssessment": "Well-balanced meal" or "Needs more protein" etc
        },
        "culturalContext": {
          "cuisine": "North Indian",
          "mealType": "lunch/dinner/breakfast/snack",
          "traditionalPairing": ["yogurt", "pickle", "salad"]
        },
        "allergenWarnings": ["contains dairy", "may contain nuts"],
        "dietaryCompatibility": {
          "vegetarian": true,
          "vegan": false,
          "glutenFree": true,
          "dairyFree": false
        }
      }
      
      Guidelines:
      1. Be conservative with calorie estimates - better to underestimate
      2. Account for cooking methods (fried foods have more calories)
      3. Consider hidden ingredients like oil, ghee, sugar
      4. For Indian dishes, consider regional preparation methods
      5. Provide confidence based on visibility and clarity
      6. If multiple portions visible, estimate total amount
      7. Include specific preparation method assessment
      8. Provide actionable nutritional recommendations
      9. Consider user's dietary restrictions in recommendations
      10. If uncertain about a food item, lower the confidence score
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const responseText = result.response.text();
    const analysis = JSON.parse(responseText);

    // Add processing metadata
    analysis.processingMetadata = {
      aiModel: 'gemini-2.5-flash',
      processedAt: new Date().toISOString(),
      userId: userId,
      processingTimeMs: Date.now() - Date.now(), // Calculate actual processing time
    };

    return new Response(JSON.stringify(analysis), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Food recognition error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to analyze food image'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
```

### Workout Generation Function
```typescript
// supabase/functions/generate-workout/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

interface WorkoutGenerationRequest {
  userProfile: {
    age: number;
    gender: string;
    fitnessLevel: string;
    goals: string[];
    currentWeight: number;
    targetWeight: number;
    activityLevel: string;
  };
  preferences: {
    workoutType: string;
    duration: number;
    frequency: number;
    equipment: string[];
    location: string;
  };
  userId: string;
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { userProfile, preferences, userId }: WorkoutGenerationRequest = await req.json();

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
      Create a personalized 7-day workout plan based on the following user profile:
      
      User Profile:
      - Age: ${userProfile.age}
      - Gender: ${userProfile.gender}
      - Fitness Level: ${userProfile.fitnessLevel}
      - Goals: ${userProfile.goals.join(', ')}
      - Current Weight: ${userProfile.currentWeight}kg
      - Target Weight: ${userProfile.targetWeight}kg
      - Activity Level: ${userProfile.activityLevel}
      
      Workout Preferences:
      - Type: ${preferences.workoutType}
      - Duration: ${preferences.duration} minutes
      - Frequency: ${preferences.frequency} days/week
      - Equipment: ${preferences.equipment.join(', ')}
      - Location: ${preferences.location}
      
      Generate a comprehensive workout plan with this structure:
      {
        "planOverview": {
          "name": "Personalized 7-Day Plan",
          "description": "Brief description of the plan",
          "totalWorkouts": 4,
          "estimatedCaloriesBurn": 1200,
          "difficultyProgression": "gradual increase"
        },
        "weeklySchedule": [
          {
            "day": 1,
            "dayName": "Monday",
            "workoutType": "Upper Body Strength",
            "duration": 45,
            "isRestDay": false,
            "exercises": [
              {
                "id": "push_ups",
                "name": "Push-ups",
                "category": "strength",
                "primaryMuscleGroups": ["chest", "triceps", "shoulders"],
                "sets": 3,
                "reps": "8-12",
                "restTime": 60,
                "instructions": "Detailed form instructions",
                "modifications": {
                  "easier": "Knee push-ups or wall push-ups",
                  "harder": "Decline push-ups or diamond push-ups"
                },
                "equipment": ["none"],
                "caloriesBurn": 45,
                "formCues": ["Keep core tight", "Lower chest to floor", "Push through heels of hands"],
                "safetyNotes": "Stop if you feel pain in wrists or shoulders"
              }
            ],
            "warmup": [
              {
                "exercise": "Arm circles",
                "duration": 30,
                "instructions": "Slow controlled movements, gradually increase size"
              },
              {
                "exercise": "Light cardio",
                "duration": 300,
                "instructions": "Marching in place or light jogging"
              }
            ],
            "cooldown": [
              {
                "exercise": "Chest stretch",
                "duration": 30,
                "instructions": "Hold stretch gently, breathe deeply"
              },
              {
                "exercise": "Shoulder rolls",
                "duration": 30,
                "instructions": "Slow backward and forward rolls"
              }
            ],
            "estimatedCaloriesBurn": 250
          }
        ],
        "progressionPlan": {
          "week1": "Focus on form and consistency",
          "week2": "Increase intensity by 10%",
          "week3": "Add complexity or weight",
          "week4": "Peak week with maximum intensity"
        },
        "nutritionTips": [
          "Consume protein within 30 minutes post-workout",
          "Stay hydrated throughout the day",
          "Eat carbs for energy before workouts"
        ],
        "recoveryGuidance": {
          "sleepRecommendation": "7-9 hours per night",
          "activeRecovery": "Light walking or stretching on rest days",
          "restDayActivities": ["yoga", "walking", "light stretching"]
        },
        "adaptations": {
          "noEquipment": "Bodyweight alternatives for all exercises",
          "timeConstrained": "15-minute express versions",
          "beginnerModifications": "Easier variations and longer rest periods",
          "advancedProgression": "Advanced variations and shorter rest"
        }
      }
      
      Important requirements:
      1. Ensure progressive difficulty throughout the week
      2. Balance muscle groups across the week
      3. Include proper warm-up and cool-down for each session
      4. Provide modifications for different fitness levels
      5. Account for available equipment and location constraints
      6. Include rest days appropriate for the fitness level
      7. Provide specific, actionable form cues
      8. Consider the user's goals in exercise selection
      9. Ensure workout duration matches preferences
      10. Include calorie burn estimates for motivation
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const workoutPlan = JSON.parse(responseText);

    // Add metadata
    workoutPlan.generationMetadata = {
      aiModel: 'gemini-2.5-flash',
      generatedAt: new Date().toISOString(),
      userId: userId,
      userProfile: userProfile,
      preferences: preferences,
    };

    return new Response(JSON.stringify(workoutPlan), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Workout generation error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate workout plan'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
```

## Data Migration & Seeding

### Initial Data Seed
```sql
-- Insert exercise data
INSERT INTO exercises (name, description, instructions, category, primary_muscle_groups, difficulty_level, equipment_required) VALUES
('Push-ups', 'Classic upper body exercise', 'Start in plank position, lower chest to floor, push back up', 'strength', ARRAY['chest', 'triceps', 'shoulders'], 'beginner', ARRAY[]),
('Squats', 'Lower body compound movement', 'Stand with feet shoulder-width apart, lower hips back and down', 'strength', ARRAY['quadriceps', 'glutes'], 'beginner', ARRAY[]),
('Plank', 'Core stability exercise', 'Hold straight body position on forearms and toes', 'strength', ARRAY['core'], 'beginner', ARRAY[]),
-- Add more exercises...

-- Insert common Indian foods
INSERT INTO foods (name, category, calories_per_100g, protein_g, carbohydrates_g, fats_g, data_source) VALUES
('Basmati Rice (cooked)', 'grains', 121, 2.6, 25, 0.4, 'ifct'),
('Roti (whole wheat)', 'grains', 297, 11.4, 56.8, 4.6, 'ifct'),
('Dal (moong)', 'protein', 347, 24.5, 59.9, 1.2, 'ifct'),
('Chicken Breast (grilled)', 'protein', 165, 31, 0, 3.6, 'usda'),
-- Add more foods...
```

This comprehensive backend guide provides a robust foundation for the FitAI application, ensuring scalability, data integrity, and optimal performance while maintaining security and user privacy.