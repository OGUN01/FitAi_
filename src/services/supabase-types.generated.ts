export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          title: string
          type: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          title: string
          type: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          title?: string
          type?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      advanced_review: {
        Row: {
          bmi_category: string | null
          bmi_cutoffs_used: Json | null
          bmi_health_risk: string | null
          bmr_formula_accuracy: string | null
          bmr_formula_confidence: number | null
          bmr_formula_used: string | null
          calculated_bmi: number | null
          calculated_bmr: number | null
          calculated_tdee: number | null
          calculations_version: string | null
          climate_tdee_modifier: number | null
          climate_used: string | null
          climate_water_modifier: number | null
          created_at: string | null
          current_sleep_duration: number | null
          daily_calories: number | null
          daily_carbs_g: number | null
          daily_fat_g: number | null
          daily_fiber_g: number | null
          daily_protein_g: number | null
          daily_water_ml: number | null
          data_completeness_percentage: number | null
          detected_climate: string | null
          detected_ethnicity: string | null
          diet_readiness_score: number | null
          estimated_timeline_weeks: number | null
          estimated_vo2_max: number | null
          ethnicity_used: string | null
          fat_mass: number | null
          fitness_readiness_score: number | null
          goal_realistic_score: number | null
          health_grade: string | null
          health_score: number | null
          healthy_weight_max: number | null
          healthy_weight_min: number | null
          heart_rate_zones: Json | null
          id: string
          ideal_body_fat_max: number | null
          ideal_body_fat_min: number | null
          lean_body_mass: number | null
          medical_adjustments: string[] | null
          metabolic_age: number | null
          overall_health_score: number | null
          personalization_level: number | null
          recommended_cardio_minutes: number | null
          recommended_sleep_hours: number | null
          recommended_strength_sessions: number | null
          recommended_workout_frequency: number | null
          refeed_schedule: Json | null
          reliability_score: number | null
          sleep_efficiency_score: number | null
          target_hr_cardio_max: number | null
          target_hr_cardio_min: number | null
          target_hr_fat_burn_max: number | null
          target_hr_fat_burn_min: number | null
          target_hr_peak_max: number | null
          target_hr_peak_min: number | null
          total_calorie_deficit: number | null
          updated_at: string | null
          user_id: string | null
          validation_errors: Json | null
          validation_status: string | null
          validation_warnings: Json | null
          vo2_max_classification: string | null
          vo2_max_estimate: number | null
          was_rate_capped: boolean | null
          weekly_weight_loss_rate: number | null
        }
        Insert: {
          bmi_category?: string | null
          bmi_cutoffs_used?: Json | null
          bmi_health_risk?: string | null
          bmr_formula_accuracy?: string | null
          bmr_formula_confidence?: number | null
          bmr_formula_used?: string | null
          calculated_bmi?: number | null
          calculated_bmr?: number | null
          calculated_tdee?: number | null
          calculations_version?: string | null
          climate_tdee_modifier?: number | null
          climate_used?: string | null
          climate_water_modifier?: number | null
          created_at?: string | null
          current_sleep_duration?: number | null
          daily_calories?: number | null
          daily_carbs_g?: number | null
          daily_fat_g?: number | null
          daily_fiber_g?: number | null
          daily_protein_g?: number | null
          daily_water_ml?: number | null
          data_completeness_percentage?: number | null
          detected_climate?: string | null
          detected_ethnicity?: string | null
          diet_readiness_score?: number | null
          estimated_timeline_weeks?: number | null
          estimated_vo2_max?: number | null
          ethnicity_used?: string | null
          fat_mass?: number | null
          fitness_readiness_score?: number | null
          goal_realistic_score?: number | null
          health_grade?: string | null
          health_score?: number | null
          healthy_weight_max?: number | null
          healthy_weight_min?: number | null
          heart_rate_zones?: Json | null
          id?: string
          ideal_body_fat_max?: number | null
          ideal_body_fat_min?: number | null
          lean_body_mass?: number | null
          medical_adjustments?: string[] | null
          metabolic_age?: number | null
          overall_health_score?: number | null
          personalization_level?: number | null
          recommended_cardio_minutes?: number | null
          recommended_sleep_hours?: number | null
          recommended_strength_sessions?: number | null
          recommended_workout_frequency?: number | null
          refeed_schedule?: Json | null
          reliability_score?: number | null
          sleep_efficiency_score?: number | null
          target_hr_cardio_max?: number | null
          target_hr_cardio_min?: number | null
          target_hr_fat_burn_max?: number | null
          target_hr_fat_burn_min?: number | null
          target_hr_peak_max?: number | null
          target_hr_peak_min?: number | null
          total_calorie_deficit?: number | null
          updated_at?: string | null
          user_id?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          validation_warnings?: Json | null
          vo2_max_classification?: string | null
          vo2_max_estimate?: number | null
          was_rate_capped?: boolean | null
          weekly_weight_loss_rate?: number | null
        }
        Update: {
          bmi_category?: string | null
          bmi_cutoffs_used?: Json | null
          bmi_health_risk?: string | null
          bmr_formula_accuracy?: string | null
          bmr_formula_confidence?: number | null
          bmr_formula_used?: string | null
          calculated_bmi?: number | null
          calculated_bmr?: number | null
          calculated_tdee?: number | null
          calculations_version?: string | null
          climate_tdee_modifier?: number | null
          climate_used?: string | null
          climate_water_modifier?: number | null
          created_at?: string | null
          current_sleep_duration?: number | null
          daily_calories?: number | null
          daily_carbs_g?: number | null
          daily_fat_g?: number | null
          daily_fiber_g?: number | null
          daily_protein_g?: number | null
          daily_water_ml?: number | null
          data_completeness_percentage?: number | null
          detected_climate?: string | null
          detected_ethnicity?: string | null
          diet_readiness_score?: number | null
          estimated_timeline_weeks?: number | null
          estimated_vo2_max?: number | null
          ethnicity_used?: string | null
          fat_mass?: number | null
          fitness_readiness_score?: number | null
          goal_realistic_score?: number | null
          health_grade?: string | null
          health_score?: number | null
          healthy_weight_max?: number | null
          healthy_weight_min?: number | null
          heart_rate_zones?: Json | null
          id?: string
          ideal_body_fat_max?: number | null
          ideal_body_fat_min?: number | null
          lean_body_mass?: number | null
          medical_adjustments?: string[] | null
          metabolic_age?: number | null
          overall_health_score?: number | null
          personalization_level?: number | null
          recommended_cardio_minutes?: number | null
          recommended_sleep_hours?: number | null
          recommended_strength_sessions?: number | null
          recommended_workout_frequency?: number | null
          refeed_schedule?: Json | null
          reliability_score?: number | null
          sleep_efficiency_score?: number | null
          target_hr_cardio_max?: number | null
          target_hr_cardio_min?: number | null
          target_hr_fat_burn_max?: number | null
          target_hr_fat_burn_min?: number | null
          target_hr_peak_max?: number | null
          target_hr_peak_min?: number | null
          total_calorie_deficit?: number | null
          updated_at?: string | null
          user_id?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          validation_warnings?: Json | null
          vo2_max_classification?: string | null
          vo2_max_estimate?: number | null
          was_rate_capped?: boolean | null
          weekly_weight_loss_rate?: number | null
        }
        Relationships: []
      }
      analytics_metrics: {
        Row: {
          calories_burned: number | null
          calories_consumed: number | null
          created_at: string | null
          id: string
          meals_logged: number
          metric_date: string
          sleep_hours: number | null
          steps: number | null
          updated_at: string | null
          user_id: string
          water_intake_ml: number
          weight_kg: number | null
          workouts_completed: number
        }
        Insert: {
          calories_burned?: number | null
          calories_consumed?: number | null
          created_at?: string | null
          id: string
          meals_logged?: number
          metric_date: string
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string | null
          user_id: string
          water_intake_ml?: number
          weight_kg?: number | null
          workouts_completed?: number
        }
        Update: {
          calories_burned?: number | null
          calories_consumed?: number | null
          created_at?: string | null
          id?: string
          meals_logged?: number
          metric_date?: string
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string | null
          user_id?: string
          water_intake_ml?: number
          weight_kg?: number | null
          workouts_completed?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_summary: {
        Row: {
          avg_cost_per_request_usd: number | null
          avg_generation_time_ms: number | null
          cache_hit_rate: number | null
          cached_requests: number
          created_at: string
          id: string
          model_usage: Json
          p95_generation_time_ms: number | null
          p99_generation_time_ms: number | null
          period_end: string
          period_start: string
          period_type: string
          total_cost_usd: number
          total_requests: number
          total_tokens_used: number
        }
        Insert: {
          avg_cost_per_request_usd?: number | null
          avg_generation_time_ms?: number | null
          cache_hit_rate?: number | null
          cached_requests?: number
          created_at?: string
          id?: string
          model_usage?: Json
          p95_generation_time_ms?: number | null
          p99_generation_time_ms?: number | null
          period_end: string
          period_start: string
          period_type: string
          total_cost_usd?: number
          total_requests?: number
          total_tokens_used?: number
        }
        Update: {
          avg_cost_per_request_usd?: number | null
          avg_generation_time_ms?: number | null
          cache_hit_rate?: number | null
          cached_requests?: number
          created_at?: string
          id?: string
          model_usage?: Json
          p95_generation_time_ms?: number | null
          p99_generation_time_ms?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          total_cost_usd?: number
          total_requests?: number
          total_tokens_used?: number
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          cache_hit: boolean | null
          cache_source: string | null
          created_at: string | null
          credits_used: number | null
          endpoint: string
          error_code: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          model_used: string | null
          request_id: string | null
          response_time_ms: number | null
          status_code: number | null
          tokens_used: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          cache_source?: string | null
          created_at?: string | null
          credits_used?: number | null
          endpoint: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          model_used?: string | null
          request_id?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          tokens_used?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          cache_source?: string | null
          created_at?: string | null
          credits_used?: number | null
          endpoint?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          model_used?: string | null
          request_id?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          tokens_used?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          category: string
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      app_events: {
        Row: {
          device_info: Json | null
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          occurred_at: string | null
          screen: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          device_info?: Json | null
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          occurred_at?: string | null
          screen?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          device_info?: Json | null
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          occurred_at?: string | null
          screen?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      barcode_lookup_cache: {
        Row: {
          barcode: string
          brand: string | null
          cached_at: string | null
          carbohydrates_100g: number | null
          confidence: number | null
          energy_kcal_100g: number | null
          expires_at: string | null
          fat_100g: number | null
          fiber_100g: number | null
          hit_count: number | null
          image_url: string | null
          is_ai_estimated: boolean | null
          nova_group: number | null
          nutriscore_grade: string | null
          product_name: string | null
          proteins_100g: number | null
          sodium_100g: number | null
          source: string | null
          sugars_100g: number | null
        }
        Insert: {
          barcode: string
          brand?: string | null
          cached_at?: string | null
          carbohydrates_100g?: number | null
          confidence?: number | null
          energy_kcal_100g?: number | null
          expires_at?: string | null
          fat_100g?: number | null
          fiber_100g?: number | null
          hit_count?: number | null
          image_url?: string | null
          is_ai_estimated?: boolean | null
          nova_group?: number | null
          nutriscore_grade?: string | null
          product_name?: string | null
          proteins_100g?: number | null
          sodium_100g?: number | null
          source?: string | null
          sugars_100g?: number | null
        }
        Update: {
          barcode?: string
          brand?: string | null
          cached_at?: string | null
          carbohydrates_100g?: number | null
          confidence?: number | null
          energy_kcal_100g?: number | null
          expires_at?: string | null
          fat_100g?: number | null
          fiber_100g?: number | null
          hit_count?: number | null
          image_url?: string | null
          is_ai_estimated?: boolean | null
          nova_group?: number | null
          nutriscore_grade?: string | null
          product_name?: string | null
          proteins_100g?: number | null
          sodium_100g?: number | null
          source?: string | null
          sugars_100g?: number | null
        }
        Relationships: []
      }
      body_analysis: {
        Row: {
          ai_body_type: string | null
          ai_confidence_score: number | null
          ai_estimated_body_fat: number | null
          analysis: Json | null
          back_photo_url: string | null
          bmi: number | null
          bmr: number | null
          body_fat_measured_at: string | null
          body_fat_percentage: number | null
          body_fat_source: string | null
          breastfeeding_status: boolean
          chest_cm: number | null
          created_at: string
          current_weight_kg: number
          front_photo_url: string | null
          height_cm: number
          hip_cm: number | null
          id: string
          ideal_weight_max: number | null
          ideal_weight_min: number | null
          medical_conditions: string[]
          medications: string[] | null
          photos: Json | null
          physical_limitations: string[] | null
          pregnancy_status: boolean
          pregnancy_trimester: number | null
          side_photo_url: string | null
          stress_level: string | null
          target_timeline_weeks: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          waist_hip_ratio: number | null
        }
        Insert: {
          ai_body_type?: string | null
          ai_confidence_score?: number | null
          ai_estimated_body_fat?: number | null
          analysis?: Json | null
          back_photo_url?: string | null
          bmi?: number | null
          bmr?: number | null
          body_fat_measured_at?: string | null
          body_fat_percentage?: number | null
          body_fat_source?: string | null
          breastfeeding_status?: boolean
          chest_cm?: number | null
          created_at?: string
          current_weight_kg: number
          front_photo_url?: string | null
          height_cm: number
          hip_cm?: number | null
          id?: string
          ideal_weight_max?: number | null
          ideal_weight_min?: number | null
          medical_conditions?: string[]
          medications?: string[] | null
          photos?: Json | null
          physical_limitations?: string[] | null
          pregnancy_status?: boolean
          pregnancy_trimester?: number | null
          side_photo_url?: string | null
          stress_level?: string | null
          target_timeline_weeks?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          waist_hip_ratio?: number | null
        }
        Update: {
          ai_body_type?: string | null
          ai_confidence_score?: number | null
          ai_estimated_body_fat?: number | null
          analysis?: Json | null
          back_photo_url?: string | null
          bmi?: number | null
          bmr?: number | null
          body_fat_measured_at?: string | null
          body_fat_percentage?: number | null
          body_fat_source?: string | null
          breastfeeding_status?: boolean
          chest_cm?: number | null
          created_at?: string
          current_weight_kg?: number
          front_photo_url?: string | null
          height_cm?: number
          hip_cm?: number | null
          id?: string
          ideal_weight_max?: number | null
          ideal_weight_min?: number | null
          medical_conditions?: string[]
          medications?: string[] | null
          photos?: Json | null
          physical_limitations?: string[] | null
          pregnancy_status?: boolean
          pregnancy_trimester?: number | null
          side_photo_url?: string | null
          stress_level?: string | null
          target_timeline_weeks?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          waist_hip_ratio?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          conversation_title: string | null
          cost_usd: number | null
          created_at: string
          generation_time_ms: number | null
          id: string
          message_index: number
          model_used: string | null
          role: string
          tags: string[] | null
          tokens_used: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          conversation_title?: string | null
          cost_usd?: number | null
          created_at?: string
          generation_time_ms?: number | null
          id?: string
          message_index: number
          model_used?: string | null
          role: string
          tags?: string[] | null
          tokens_used?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          conversation_title?: string | null
          cost_usd?: number | null
          created_at?: string
          generation_time_ms?: number | null
          id?: string
          message_index?: number
          model_used?: string | null
          role?: string
          tags?: string[] | null
          tokens_used?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_health_logs: {
        Row: {
          active_calories: number | null
          avg_heart_rate: number | null
          calories_goal: number | null
          created_at: string | null
          data_source: string | null
          id: string
          log_date: string
          max_heart_rate: number | null
          resting_heart_rate: number | null
          sleep_end_time: string | null
          sleep_hours: number | null
          sleep_quality: string | null
          sleep_start_time: string | null
          steps: number | null
          steps_goal: number | null
          updated_at: string | null
          user_id: string
          water_goal_ml: number | null
          water_intake_ml: number | null
        }
        Insert: {
          active_calories?: number | null
          avg_heart_rate?: number | null
          calories_goal?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          log_date: string
          max_heart_rate?: number | null
          resting_heart_rate?: number | null
          sleep_end_time?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          sleep_start_time?: string | null
          steps?: number | null
          steps_goal?: number | null
          updated_at?: string | null
          user_id: string
          water_goal_ml?: number | null
          water_intake_ml?: number | null
        }
        Update: {
          active_calories?: number | null
          avg_heart_rate?: number | null
          calories_goal?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          log_date?: string
          max_heart_rate?: number | null
          resting_heart_rate?: number | null
          sleep_end_time?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          sleep_start_time?: string | null
          steps?: number | null
          steps_goal?: number | null
          updated_at?: string | null
          user_id?: string
          water_goal_ml?: number | null
          water_intake_ml?: number | null
        }
        Relationships: []
      }
      diet_media: {
        Row: {
          created_at: string | null
          cuisine_type: string | null
          food_id: string | null
          food_name: string
          id: string
          image_url: string | null
          meal_type: string[] | null
          recipe_url: string | null
          source: string | null
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          cuisine_type?: string | null
          food_id?: string | null
          food_name: string
          id?: string
          image_url?: string | null
          meal_type?: string[] | null
          recipe_url?: string | null
          source?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          cuisine_type?: string | null
          food_id?: string | null
          food_name?: string
          id?: string
          image_url?: string | null
          meal_type?: string[] | null
          recipe_url?: string | null
          source?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      diet_preferences: {
        Row: {
          allergies: string[]
          avoids_late_night_eating: boolean | null
          breakfast_enabled: boolean | null
          budget_level: string | null
          controls_portion_sizes: boolean | null
          cooking_skill_level: string | null
          created_at: string
          cuisine_preferences: string[] | null
          diet_type: string
          dinner_enabled: boolean | null
          drinks_alcohol: boolean | null
          drinks_coffee: boolean | null
          drinks_enough_water: boolean | null
          eats_5_servings_fruits_veggies: boolean | null
          eats_processed_foods: boolean | null
          eats_regular_meals: boolean | null
          high_protein_ready: boolean | null
          id: string
          includes_healthy_fats: boolean | null
          intermittent_fasting_ready: boolean | null
          keto_ready: boolean | null
          limits_refined_sugar: boolean | null
          limits_sugary_drinks: boolean | null
          low_carb_ready: boolean | null
          lunch_enabled: boolean | null
          max_prep_time_minutes: number | null
          mediterranean_ready: boolean | null
          paleo_ready: boolean | null
          reads_nutrition_labels: boolean | null
          restrictions: string[]
          smokes_tobacco: boolean | null
          snacks_count: number | null
          snacks_enabled: boolean | null
          takes_supplements: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies: string[]
          avoids_late_night_eating?: boolean | null
          breakfast_enabled?: boolean | null
          budget_level?: string | null
          controls_portion_sizes?: boolean | null
          cooking_skill_level?: string | null
          created_at?: string
          cuisine_preferences?: string[] | null
          diet_type: string
          dinner_enabled?: boolean | null
          drinks_alcohol?: boolean | null
          drinks_coffee?: boolean | null
          drinks_enough_water?: boolean | null
          eats_5_servings_fruits_veggies?: boolean | null
          eats_processed_foods?: boolean | null
          eats_regular_meals?: boolean | null
          high_protein_ready?: boolean | null
          id?: string
          includes_healthy_fats?: boolean | null
          intermittent_fasting_ready?: boolean | null
          keto_ready?: boolean | null
          limits_refined_sugar?: boolean | null
          limits_sugary_drinks?: boolean | null
          low_carb_ready?: boolean | null
          lunch_enabled?: boolean | null
          max_prep_time_minutes?: number | null
          mediterranean_ready?: boolean | null
          paleo_ready?: boolean | null
          reads_nutrition_labels?: boolean | null
          restrictions: string[]
          smokes_tobacco?: boolean | null
          snacks_count?: number | null
          snacks_enabled?: boolean | null
          takes_supplements?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          avoids_late_night_eating?: boolean | null
          breakfast_enabled?: boolean | null
          budget_level?: string | null
          controls_portion_sizes?: boolean | null
          cooking_skill_level?: string | null
          created_at?: string
          cuisine_preferences?: string[] | null
          diet_type?: string
          dinner_enabled?: boolean | null
          drinks_alcohol?: boolean | null
          drinks_coffee?: boolean | null
          drinks_enough_water?: boolean | null
          eats_5_servings_fruits_veggies?: boolean | null
          eats_processed_foods?: boolean | null
          eats_regular_meals?: boolean | null
          high_protein_ready?: boolean | null
          id?: string
          includes_healthy_fats?: boolean | null
          intermittent_fasting_ready?: boolean | null
          keto_ready?: boolean | null
          limits_refined_sugar?: boolean | null
          limits_sugary_drinks?: boolean | null
          low_carb_ready?: boolean | null
          lunch_enabled?: boolean | null
          max_prep_time_minutes?: number | null
          mediterranean_ready?: boolean | null
          paleo_ready?: boolean | null
          reads_nutrition_labels?: boolean | null
          restrictions?: string[]
          smokes_tobacco?: boolean | null
          snacks_count?: number | null
          snacks_enabled?: boolean | null
          takes_supplements?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_media: {
        Row: {
          animation_url: string | null
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string | null
          exercise_name: string
          file_size_kb: number | null
          fps: number | null
          human_video_url: string | null
          id: string
          source: string | null
          source_url: string | null
          thumbnail_url: string | null
          updated_at: string | null
          video_quality: string | null
        }
        Insert: {
          animation_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name: string
          file_size_kb?: number | null
          fps?: number | null
          human_video_url?: string | null
          id?: string
          source?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_quality?: string | null
        }
        Update: {
          animation_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name?: string
          file_size_kb?: number | null
          fps?: number | null
          human_video_url?: string | null
          id?: string
          source?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_quality?: string | null
        }
        Relationships: []
      }
      exercise_prs: {
        Row: {
          achieved_at: string
          created_at: string
          exercise_id: string
          exercise_name: string | null
          id: string
          pr_type: string
          reps: number | null
          session_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          exercise_id: string
          exercise_name?: string | null
          id?: string
          pr_type: string
          reps?: number | null
          session_id?: string | null
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          created_at?: string
          exercise_id?: string
          exercise_name?: string | null
          id?: string
          pr_type?: string
          reps?: number | null
          session_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_prs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          exercise_name: string | null
          id: string
          is_calibration: boolean
          is_completed: boolean
          reps: number | null
          rpe: number | null
          session_id: string
          set_number: number
          set_type: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          exercise_name?: string | null
          id?: string
          is_calibration?: boolean
          is_completed?: boolean
          reps?: number | null
          rpe?: number | null
          session_id: string
          set_number: number
          set_type?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          exercise_name?: string | null
          id?: string
          is_calibration?: boolean
          is_completed?: boolean
          reps?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          set_type?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          calories_per_minute: number | null
          category: string
          created_at: string | null
          difficulty_level: string | null
          equipment: string[] | null
          id: string
          image_url: string | null
          instructions: string[] | null
          muscle_groups: string[]
          name: string
          video_url: string | null
        }
        Insert: {
          calories_per_minute?: number | null
          category: string
          created_at?: string | null
          difficulty_level?: string | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          muscle_groups: string[]
          name: string
          video_url?: string | null
        }
        Update: {
          calories_per_minute?: number | null
          category?: string
          created_at?: string | null
          difficulty_level?: string | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          instructions?: string[] | null
          muscle_groups?: string[]
          name?: string
          video_url?: string | null
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string | null
          feature_key: string
          id: string
          period_start: string
          period_type: string
          updated_at: string | null
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          id?: string
          period_start: string
          period_type: string
          updated_at?: string | null
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          id?: string
          period_start?: string
          period_type?: string
          updated_at?: string | null
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          created_at: string | null
          experience_level: string | null
          id: string
          primary_goals: string[]
          time_commitment: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          experience_level?: string | null
          id?: string
          primary_goals: string[]
          time_commitment?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          experience_level?: string | null
          id?: string
          primary_goals?: string[]
          time_commitment?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_recognition_feedback: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          image_url: string | null
          recognition_method: string | null
          recognized_food: string | null
          user_correction: string | null
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          recognition_method?: string | null
          recognized_food?: string | null
          user_correction?: string | null
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          recognition_method?: string | null
          recognized_food?: string | null
          user_correction?: string | null
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "food_recognition_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_per_100g: number
          carbs_per_100g: number
          category: string | null
          created_at: string | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          name: string
          protein_per_100g: number
          sodium_per_100g: number | null
          sugar_per_100g: number | null
          verified: boolean | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g: number
          carbs_per_100g: number
          category?: string | null
          created_at?: string | null
          fat_per_100g: number
          fiber_per_100g?: number | null
          id?: string
          name: string
          protein_per_100g: number
          sodium_per_100g?: number | null
          sugar_per_100g?: number | null
          verified?: boolean | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          name?: string
          protein_per_100g?: number
          sodium_per_100g?: number | null
          sugar_per_100g?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      generation_history: {
        Row: {
          cache_key: string | null
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string | null
          generation_time_ms: number | null
          generation_type: string
          id: string
          input_params: Json
          model_used: string
          output_data: Json
          prompt_tokens: number | null
          total_tokens: number | null
          user_feedback: string | null
          user_id: string | null
          user_rating: number | null
          was_cached: boolean | null
        }
        Insert: {
          cache_key?: string | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          generation_time_ms?: number | null
          generation_type: string
          id?: string
          input_params: Json
          model_used: string
          output_data: Json
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
          was_cached?: boolean | null
        }
        Update: {
          cache_key?: string | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          generation_time_ms?: number | null
          generation_type?: string
          id?: string
          input_params?: Json
          model_used?: string
          output_data?: Json
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
          was_cached?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ifct_foods: {
        Row: {
          beta_carotene_mcg_100g: number | null
          calcium_mg_100g: number | null
          carbohydrate_100g: number | null
          edible_portion: number | null
          energy_kcal_100g: number | null
          fat_100g: number | null
          fiber_100g: number | null
          food_code: string
          food_group: string | null
          imported_at: string | null
          iron_mg_100g: number | null
          local_names: string | null
          moisture_100g: number | null
          name: string
          preparation_method: string | null
          protein_100g: number | null
          region: string | null
          scientific_name: string | null
          sodium_mg_100g: number | null
          subgroup: string | null
          sugar_100g: number | null
          vitamin_c_mg_100g: number | null
        }
        Insert: {
          beta_carotene_mcg_100g?: number | null
          calcium_mg_100g?: number | null
          carbohydrate_100g?: number | null
          edible_portion?: number | null
          energy_kcal_100g?: number | null
          fat_100g?: number | null
          fiber_100g?: number | null
          food_code: string
          food_group?: string | null
          imported_at?: string | null
          iron_mg_100g?: number | null
          local_names?: string | null
          moisture_100g?: number | null
          name: string
          preparation_method?: string | null
          protein_100g?: number | null
          region?: string | null
          scientific_name?: string | null
          sodium_mg_100g?: number | null
          subgroup?: string | null
          sugar_100g?: number | null
          vitamin_c_mg_100g?: number | null
        }
        Update: {
          beta_carotene_mcg_100g?: number | null
          calcium_mg_100g?: number | null
          carbohydrate_100g?: number | null
          edible_portion?: number | null
          energy_kcal_100g?: number | null
          fat_100g?: number | null
          fiber_100g?: number | null
          food_code?: string
          food_group?: string | null
          imported_at?: string | null
          iron_mg_100g?: number | null
          local_names?: string | null
          moisture_100g?: number | null
          name?: string
          preparation_method?: string | null
          protein_100g?: number | null
          region?: string | null
          scientific_name?: string | null
          sodium_mg_100g?: number | null
          subgroup?: string | null
          sugar_100g?: number | null
          vitamin_c_mg_100g?: number | null
        }
        Relationships: []
      }
      meal_cache: {
        Row: {
          cache_key: string
          cost_usd: number | null
          created_at: string | null
          expires_at: string | null
          generation_time_ms: number | null
          hit_count: number | null
          id: string
          last_accessed: string | null
          meal_data: Json
          model_used: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cache_key: string
          cost_usd?: number | null
          created_at?: string | null
          expires_at?: string | null
          generation_time_ms?: number | null
          hit_count?: number | null
          id?: string
          last_accessed?: string | null
          meal_data: Json
          model_used?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cache_key?: string
          cost_usd?: number | null
          created_at?: string | null
          expires_at?: string | null
          generation_time_ms?: number | null
          hit_count?: number | null
          id?: string
          last_accessed?: string | null
          meal_data?: Json
          model_used?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_foods: {
        Row: {
          calories: number
          carbs: number
          fat: number
          food_id: string | null
          id: string
          meal_id: string | null
          protein: number
          quantity_grams: number
        }
        Insert: {
          calories: number
          carbs: number
          fat: number
          food_id?: string | null
          id?: string
          meal_id?: string | null
          protein: number
          quantity_grams: number
        }
        Update: {
          calories?: number
          carbs?: number
          fat?: number
          food_id?: string | null
          id?: string
          meal_id?: string | null
          protein?: number
          quantity_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_foods_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_foods_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_generation_jobs: {
        Row: {
          ai_model: string | null
          cache_key: string
          completed_at: string | null
          created_at: string | null
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          expires_at: string | null
          generation_params: Json
          generation_time_ms: number | null
          id: string
          max_retries: number | null
          priority: number | null
          result_data: Json | null
          retry_count: number | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          cache_key: string
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          expires_at?: string | null
          generation_params: Json
          generation_time_ms?: number | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          result_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          cache_key?: string
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          expires_at?: string | null
          generation_params?: Json
          generation_time_ms?: number | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          result_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_generation_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          confidence: number | null
          country_context: string | null
          created_at: string | null
          food_items: Json
          from_plan: boolean | null
          id: string
          logged_at: string | null
          logging_mode: string | null
          meal_name: string
          meal_plan_id: string | null
          meal_type: string
          notes: string | null
          plan_meal_id: string | null
          portion_multiplier: number | null
          requires_review: boolean
          source_metadata: Json
          total_calories: number
          total_carbohydrates: number
          total_fat: number
          total_protein: number
          truth_level: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          country_context?: string | null
          created_at?: string | null
          food_items: Json
          from_plan?: boolean | null
          id?: string
          logged_at?: string | null
          logging_mode?: string | null
          meal_name: string
          meal_plan_id?: string | null
          meal_type: string
          notes?: string | null
          plan_meal_id?: string | null
          portion_multiplier?: number | null
          requires_review?: boolean
          source_metadata?: Json
          total_calories: number
          total_carbohydrates: number
          total_fat: number
          total_protein: number
          truth_level?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          country_context?: string | null
          created_at?: string | null
          food_items?: Json
          from_plan?: boolean | null
          id?: string
          logged_at?: string | null
          logging_mode?: string | null
          meal_name?: string
          meal_plan_id?: string | null
          meal_type?: string
          notes?: string | null
          plan_meal_id?: string | null
          portion_multiplier?: number | null
          requires_review?: boolean
          source_metadata?: Json
          total_calories?: number
          total_carbohydrates?: number
          total_fat?: number
          total_protein?: number
          truth_level?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meal_recognition_metadata: {
        Row: {
          created_at: string | null
          id: string
          meal_id: string | null
          meal_log_id: string | null
          model_version: string | null
          original_image_url: string | null
          processed_image_url: string | null
          processing_time_ms: number | null
          recognition_result: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meal_id?: string | null
          meal_log_id?: string | null
          model_version?: string | null
          original_image_url?: string | null
          processed_image_url?: string | null
          processing_time_ms?: number | null
          recognition_result?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meal_id?: string | null
          meal_log_id?: string | null
          model_version?: string | null
          original_image_url?: string | null
          processed_image_url?: string | null
          processing_time_ms?: number | null
          recognition_result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_recognition_metadata_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_recognition_metadata_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_recognition_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          ai_generated: boolean | null
          cache_id: string | null
          consumed_at: string
          cooking_instructions: Json | null
          cooking_time: number | null
          created_at: string | null
          day_of_week: string | null
          description: string | null
          difficulty: string | null
          estimated_calories: number | null
          generation_id: string | null
          id: string
          is_personalized: boolean | null
          main_ingredients: string[] | null
          meal_type: string | null
          name: string
          notes: string | null
          prep_time: number | null
          tags: string[] | null
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          cache_id?: string | null
          consumed_at: string
          cooking_instructions?: Json | null
          cooking_time?: number | null
          created_at?: string | null
          day_of_week?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_calories?: number | null
          generation_id?: string | null
          id?: string
          is_personalized?: boolean | null
          main_ingredients?: string[] | null
          meal_type?: string | null
          name: string
          notes?: string | null
          prep_time?: number | null
          tags?: string[] | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          cache_id?: string | null
          consumed_at?: string
          cooking_instructions?: Json | null
          cooking_time?: number | null
          created_at?: string | null
          day_of_week?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_calories?: number | null
          generation_id?: string | null
          id?: string
          is_personalized?: boolean | null
          main_ingredients?: string[] | null
          meal_type?: string | null
          name?: string
          notes?: string | null
          prep_time?: number | null
          tags?: string[] | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_cache_id_fkey"
            columns: ["cache_id"]
            isOneToOne: false
            referencedRelation: "meal_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_goals: {
        Row: {
          carb_grams: number
          created_at: string | null
          daily_calories: number
          fat_grams: number
          id: string
          protein_grams: number
          sugar_grams: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          carb_grams: number
          created_at?: string | null
          daily_calories: number
          fat_grams: number
          id?: string
          protein_grams: number
          sugar_grams?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          carb_grams?: number
          created_at?: string | null
          daily_calories?: number
          fat_grams?: number
          id?: string
          protein_grams?: number
          sugar_grams?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      off_products: {
        Row: {
          allergens_tags: string | null
          brands: string | null
          carbohydrates_100g: number | null
          categories: string | null
          code: string
          countries_tags: string | null
          energy_kcal_100g: number | null
          fat_100g: number | null
          fiber_100g: number | null
          has_nutrition: boolean | null
          image_small_url: string | null
          image_url: string | null
          imported_at: string | null
          ingredients_text: string | null
          last_modified_t: number | null
          nova_group: number | null
          nutriscore_grade: string | null
          off_source: string | null
          product_name: string | null
          product_name_en: string | null
          proteins_100g: number | null
          quantity: string | null
          saturated_fat_100g: number | null
          sodium_100g: number | null
          sugars_100g: number | null
        }
        Insert: {
          allergens_tags?: string | null
          brands?: string | null
          carbohydrates_100g?: number | null
          categories?: string | null
          code: string
          countries_tags?: string | null
          energy_kcal_100g?: number | null
          fat_100g?: number | null
          fiber_100g?: number | null
          has_nutrition?: boolean | null
          image_small_url?: string | null
          image_url?: string | null
          imported_at?: string | null
          ingredients_text?: string | null
          last_modified_t?: number | null
          nova_group?: number | null
          nutriscore_grade?: string | null
          off_source?: string | null
          product_name?: string | null
          product_name_en?: string | null
          proteins_100g?: number | null
          quantity?: string | null
          saturated_fat_100g?: number | null
          sodium_100g?: number | null
          sugars_100g?: number | null
        }
        Update: {
          allergens_tags?: string | null
          brands?: string | null
          carbohydrates_100g?: number | null
          categories?: string | null
          code?: string
          countries_tags?: string | null
          energy_kcal_100g?: number | null
          fat_100g?: number | null
          fiber_100g?: number | null
          has_nutrition?: boolean | null
          image_small_url?: string | null
          image_url?: string | null
          imported_at?: string | null
          ingredients_text?: string | null
          last_modified_t?: number | null
          nova_group?: number | null
          nutriscore_grade?: string | null
          off_source?: string | null
          product_name?: string | null
          product_name_en?: string | null
          proteins_100g?: number | null
          quantity?: string | null
          saturated_fat_100g?: number | null
          sodium_100g?: number | null
          sugars_100g?: number | null
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_tabs: number[] | null
          current_tab: number | null
          id: string
          last_updated: string | null
          started_at: string | null
          tab_validation_status: Json | null
          total_completion_percentage: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_tabs?: number[] | null
          current_tab?: number | null
          id?: string
          last_updated?: string | null
          started_at?: string | null
          tab_validation_status?: Json | null
          total_completion_percentage?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_tabs?: number[] | null
          current_tab?: number | null
          id?: string
          last_updated?: string | null
          started_at?: string | null
          tab_validation_status?: Json | null
          total_completion_percentage?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_plan_source: string
          age: number
          climate_confirmed: boolean | null
          country: string | null
          created_at: string
          dark_mode: boolean | null
          data_usage_mode: string | null
          detected_climate: string | null
          detected_ethnicity: string | null
          email: string
          ethnicity_confirmed: boolean | null
          first_name: string
          gender: string
          id: string
          last_name: string
          media_preference: string | null
          name: string
          notification_preferences: Json | null
          notifications_enabled: boolean | null
          occupation_type: string | null
          preferred_bmr_formula: string | null
          profile_picture: string | null
          region: string | null
          resting_heart_rate: number | null
          sleep_time: string | null
          state: string | null
          subscription_tier: string | null
          units: string | null
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          active_plan_source?: string
          age: number
          climate_confirmed?: boolean | null
          country?: string | null
          created_at?: string
          dark_mode?: boolean | null
          data_usage_mode?: string | null
          detected_climate?: string | null
          detected_ethnicity?: string | null
          email: string
          ethnicity_confirmed?: boolean | null
          first_name: string
          gender: string
          id: string
          last_name: string
          media_preference?: string | null
          name: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean | null
          occupation_type?: string | null
          preferred_bmr_formula?: string | null
          profile_picture?: string | null
          region?: string | null
          resting_heart_rate?: number | null
          sleep_time?: string | null
          state?: string | null
          subscription_tier?: string | null
          units?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          active_plan_source?: string
          age?: number
          climate_confirmed?: boolean | null
          country?: string | null
          created_at?: string
          dark_mode?: boolean | null
          data_usage_mode?: string | null
          detected_climate?: string | null
          detected_ethnicity?: string | null
          email?: string
          ethnicity_confirmed?: boolean | null
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          media_preference?: string | null
          name?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean | null
          occupation_type?: string | null
          preferred_bmr_formula?: string | null
          profile_picture?: string | null
          region?: string | null
          resting_heart_rate?: number | null
          sleep_time?: string | null
          state?: string | null
          subscription_tier?: string | null
          units?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          body_fat_percentage: number | null
          created_at: string | null
          entry_date: string
          id: string
          measurements: Json | null
          muscle_mass_kg: number | null
          notes: string | null
          progress_photos: string[] | null
          updated_at: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string | null
          entry_date: string
          id?: string
          measurements?: Json | null
          muscle_mass_kg?: number | null
          notes?: string | null
          progress_photos?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string | null
          entry_date?: string
          id?: string
          measurements?: Json | null
          muscle_mass_kg?: number | null
          notes?: string | null
          progress_photos?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_goals: {
        Row: {
          created_at: string | null
          daily_calorie_goal: number | null
          daily_protein_goal: number | null
          id: string
          target_body_fat_percentage: number | null
          target_date: string | null
          target_measurements: Json | null
          target_muscle_mass_kg: number | null
          target_weight_kg: number | null
          updated_at: string | null
          user_id: string | null
          weekly_workout_goal: number | null
        }
        Insert: {
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_protein_goal?: number | null
          id?: string
          target_body_fat_percentage?: number | null
          target_date?: string | null
          target_measurements?: Json | null
          target_muscle_mass_kg?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string | null
          weekly_workout_goal?: number | null
        }
        Update: {
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_protein_goal?: number | null
          id?: string
          target_body_fat_percentage?: number | null
          target_date?: string | null
          target_measurements?: Json | null
          target_muscle_mass_kg?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string | null
          weekly_workout_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_accuracy_metrics: {
        Row: {
          average_confidence: number | null
          correct_recognitions: number | null
          corrected_recognitions: number | null
          created_at: string | null
          id: string
          metric_date: string | null
          total_recognitions: number | null
        }
        Insert: {
          average_confidence?: number | null
          correct_recognitions?: number | null
          corrected_recognitions?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          total_recognitions?: number | null
        }
        Update: {
          average_confidence?: number | null
          correct_recognitions?: number | null
          corrected_recognitions?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          total_recognitions?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          ai_generations_per_day: number | null
          ai_generations_per_month: number | null
          analytics: boolean | null
          coaching: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price_monthly: number | null
          price_yearly: number | null
          razorpay_plan_id_monthly: string | null
          razorpay_plan_id_yearly: string | null
          scans_per_day: number | null
          tier: string
          unlimited_ai: boolean | null
          unlimited_scans: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          ai_generations_per_day?: number | null
          ai_generations_per_month?: number | null
          analytics?: boolean | null
          coaching?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          razorpay_plan_id_monthly?: string | null
          razorpay_plan_id_yearly?: string | null
          scans_per_day?: number | null
          tier: string
          unlimited_ai?: boolean | null
          unlimited_scans?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          ai_generations_per_day?: number | null
          ai_generations_per_month?: number | null
          analytics?: boolean | null
          coaching?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          razorpay_plan_id_monthly?: string | null
          razorpay_plan_id_yearly?: string | null
          scans_per_day?: number | null
          tier?: string
          unlimited_ai?: boolean | null
          unlimited_scans?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancelled_at: number | null
          created_at: string | null
          current_period_end: number | null
          current_period_start: number | null
          id: string
          notes: Json | null
          paused_at: number | null
          razorpay_customer_id: string | null
          razorpay_plan_id: string
          razorpay_subscription_id: string
          status: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          cancelled_at?: number | null
          created_at?: string | null
          current_period_end?: number | null
          current_period_start?: number | null
          id?: string
          notes?: Json | null
          paused_at?: number | null
          razorpay_customer_id?: string | null
          razorpay_plan_id: string
          razorpay_subscription_id: string
          status: string
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          cancelled_at?: number | null
          created_at?: string | null
          current_period_end?: number | null
          current_period_start?: number | null
          id?: string
          notes?: Json | null
          paused_at?: number | null
          razorpay_customer_id?: string | null
          razorpay_plan_id?: string
          razorpay_subscription_id?: string
          status?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          achievement_type: string | null
          celebration_shown: boolean
          created_at: string | null
          current_value: number | null
          description: string | null
          fit_coins_earned: number
          icon: string | null
          id: string
          is_completed: boolean | null
          max_progress: number
          progress: number | null
          target_value: number | null
          title: string
          unlocked_at: string | null
          updated_at: string | null
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          achievement_id: string
          achievement_type?: string | null
          celebration_shown?: boolean
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          fit_coins_earned?: number
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          max_progress?: number
          progress?: number | null
          target_value?: number | null
          title: string
          unlocked_at?: string | null
          updated_at?: string | null
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          achievement_id?: string
          achievement_type?: string | null
          celebration_shown?: boolean
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          fit_coins_earned?: number
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          max_progress?: number
          progress?: number | null
          target_value?: number | null
          title?: string
          unlocked_at?: string | null
          updated_at?: string | null
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_current_weight: {
        Row: {
          created_at: string
          entry_date: string
          recorded_at: string
          source: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          entry_date: string
          recorded_at?: string
          source?: string
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          recorded_at?: string
          source?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_current_weight_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_food_contributions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          barcode: string | null
          brand: string | null
          carbohydrates_100g: number | null
          contribution_type: string
          created_at: string | null
          energy_kcal_100g: number | null
          fat_100g: number | null
          fiber_100g: number | null
          id: string
          is_approved: boolean | null
          label_image_url: string | null
          notes: string | null
          product_name: string
          proteins_100g: number | null
          quantity_description: string | null
          reference_code: string | null
          rejection_reason: string | null
          saturated_fat_100g: number | null
          sodium_100g: number | null
          sugars_100g: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          brand?: string | null
          carbohydrates_100g?: number | null
          contribution_type?: string
          created_at?: string | null
          energy_kcal_100g?: number | null
          fat_100g?: number | null
          fiber_100g?: number | null
          id?: string
          is_approved?: boolean | null
          label_image_url?: string | null
          notes?: string | null
          product_name: string
          proteins_100g?: number | null
          quantity_description?: string | null
          reference_code?: string | null
          rejection_reason?: string | null
          saturated_fat_100g?: number | null
          sodium_100g?: number | null
          sugars_100g?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          brand?: string | null
          carbohydrates_100g?: number | null
          contribution_type?: string
          created_at?: string | null
          energy_kcal_100g?: number | null
          fat_100g?: number | null
          fiber_100g?: number | null
          id?: string
          is_approved?: boolean | null
          label_image_url?: string | null
          notes?: string | null
          product_name?: string
          proteins_100g?: number | null
          quantity_description?: string | null
          reference_code?: string | null
          rejection_reason?: string | null
          saturated_fat_100g?: number | null
          sodium_100g?: number | null
          sugars_100g?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_food_contributions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          streak_start_date: string | null
          streak_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_start_date?: string | null
          streak_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_start_date?: string | null
          streak_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string
          date: string
          id: string
          logged_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          date?: string
          id?: string
          logged_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          date?: string
          id?: string
          logged_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string
          razorpay_subscription_id: string | null
          status: string | null
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed?: boolean
          processed_at?: string
          razorpay_subscription_id?: string | null
          status?: string | null
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string
          razorpay_subscription_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      weekly_meal_plans: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          plan_data: Json
          plan_description: string | null
          plan_title: string
          total_calories: number | null
          total_meals: number
          updated_at: string | null
          user_id: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          plan_data: Json
          plan_description?: string | null
          plan_title: string
          total_calories?: number | null
          total_meals?: number
          updated_at?: string | null
          user_id?: string | null
          week_number?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          plan_data?: Json
          plan_description?: string | null
          plan_title?: string
          total_calories?: number | null
          total_meals?: number
          updated_at?: string | null
          user_id?: string | null
          week_number?: number
        }
        Relationships: []
      }
      weekly_workout_plans: {
        Row: {
          created_at: string | null
          duration_range: string | null
          id: string
          is_active: boolean
          plan_data: Json
          plan_description: string | null
          plan_source: string
          plan_title: string
          total_workouts: number
          updated_at: string | null
          user_id: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          duration_range?: string | null
          id?: string
          is_active?: boolean
          plan_data: Json
          plan_description?: string | null
          plan_source?: string
          plan_title: string
          total_workouts?: number
          updated_at?: string | null
          user_id?: string | null
          week_number?: number
        }
        Update: {
          created_at?: string | null
          duration_range?: string | null
          id?: string
          is_active?: boolean
          plan_data?: Json
          plan_description?: string | null
          plan_source?: string
          plan_title?: string
          total_workouts?: number
          updated_at?: string | null
          user_id?: string | null
          week_number?: number
        }
        Relationships: []
      }
      workout_cache: {
        Row: {
          cache_key: string
          cost_usd: number | null
          created_at: string | null
          expires_at: string | null
          generation_time_ms: number | null
          hit_count: number | null
          id: string
          last_accessed: string | null
          model_used: string | null
          tokens_used: number | null
          user_id: string | null
          workout_data: Json
        }
        Insert: {
          cache_key: string
          cost_usd?: number | null
          created_at?: string | null
          expires_at?: string | null
          generation_time_ms?: number | null
          hit_count?: number | null
          id?: string
          last_accessed?: string | null
          model_used?: string | null
          tokens_used?: number | null
          user_id?: string | null
          workout_data: Json
        }
        Update: {
          cache_key?: string
          cost_usd?: number | null
          created_at?: string | null
          expires_at?: string | null
          generation_time_ms?: number | null
          hit_count?: number | null
          id?: string
          last_accessed?: string | null
          model_used?: string | null
          tokens_used?: number | null
          user_id?: string | null
          workout_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workout_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          order_index: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          weight_kg: number | null
          workout_id: string | null
        }
        Insert: {
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          order_index: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          weight_kg?: number | null
          workout_id?: string | null
        }
        Update: {
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          weight_kg?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_preferences: {
        Row: {
          activity_level: string | null
          can_do_pushups: number | null
          can_run_minutes: number | null
          created_at: string
          enjoys_cardio: boolean | null
          enjoys_group_classes: boolean | null
          enjoys_strength_training: boolean | null
          equipment: string[]
          flexibility_level: string | null
          id: string
          intensity: string
          location: string
          needs_motivation: boolean | null
          preferred_workout_times: string[] | null
          prefers_outdoor_activities: boolean | null
          prefers_variety: boolean | null
          primary_goals: string[]
          time_preference: number | null
          training_years: number | null
          updated_at: string
          user_id: string
          weekly_weight_loss_goal: number | null
          workout_experience_years: number | null
          workout_frequency_per_week: number | null
          workout_types: string[] | null
        }
        Insert: {
          activity_level?: string | null
          can_do_pushups?: number | null
          can_run_minutes?: number | null
          created_at?: string
          enjoys_cardio?: boolean | null
          enjoys_group_classes?: boolean | null
          enjoys_strength_training?: boolean | null
          equipment: string[]
          flexibility_level?: string | null
          id?: string
          intensity: string
          location: string
          needs_motivation?: boolean | null
          preferred_workout_times?: string[] | null
          prefers_outdoor_activities?: boolean | null
          prefers_variety?: boolean | null
          primary_goals: string[]
          time_preference?: number | null
          training_years?: number | null
          updated_at?: string
          user_id: string
          weekly_weight_loss_goal?: number | null
          workout_experience_years?: number | null
          workout_frequency_per_week?: number | null
          workout_types?: string[] | null
        }
        Update: {
          activity_level?: string | null
          can_do_pushups?: number | null
          can_run_minutes?: number | null
          created_at?: string
          enjoys_cardio?: boolean | null
          enjoys_group_classes?: boolean | null
          enjoys_strength_training?: boolean | null
          equipment?: string[]
          flexibility_level?: string | null
          id?: string
          intensity?: string
          location?: string
          needs_motivation?: boolean | null
          preferred_workout_times?: string[] | null
          prefers_outdoor_activities?: boolean | null
          prefers_variety?: boolean | null
          primary_goals?: string[]
          time_preference?: number | null
          training_years?: number | null
          updated_at?: string
          user_id?: string
          weekly_weight_loss_goal?: number | null
          workout_experience_years?: number | null
          workout_frequency_per_week?: number | null
          workout_types?: string[] | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          cache_id: string | null
          calories_burned: number | null
          completed_at: string | null
          created_at: string | null
          duration: number | null
          enjoyment_rating: number | null
          exercises: Json
          exercises_completed: Json | null
          generation_id: string | null
          id: string
          is_completed: boolean
          is_extra: boolean | null
          notes: string | null
          plan_slot_key: string | null
          planned_day_key: string | null
          rating: number | null
          started_at: string
          total_duration_minutes: number | null
          updated_at: string | null
          user_id: string | null
          workout_id: string | null
          workout_name: string | null
          workout_plan_id: string | null
          workout_type: string | null
        }
        Insert: {
          cache_id?: string | null
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          enjoyment_rating?: number | null
          exercises?: Json
          exercises_completed?: Json | null
          generation_id?: string | null
          id?: string
          is_completed?: boolean
          is_extra?: boolean | null
          notes?: string | null
          plan_slot_key?: string | null
          planned_day_key?: string | null
          rating?: number | null
          started_at?: string
          total_duration_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
          workout_id?: string | null
          workout_name?: string | null
          workout_plan_id?: string | null
          workout_type?: string | null
        }
        Update: {
          cache_id?: string | null
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          enjoyment_rating?: number | null
          exercises?: Json
          exercises_completed?: Json | null
          generation_id?: string | null
          id?: string
          is_completed?: boolean
          is_extra?: boolean | null
          notes?: string | null
          plan_slot_key?: string | null
          planned_day_key?: string | null
          rating?: number | null
          started_at?: string
          total_duration_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
          workout_id?: string | null
          workout_name?: string | null
          workout_plan_id?: string | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_cache_id_fkey"
            columns: ["cache_id"]
            isOneToOne: false
            referencedRelation: "workout_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_history"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          exercises: Json
          id: string
          is_public: boolean
          last_used_at: string | null
          name: string
          target_muscle_groups: string[] | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_public?: boolean
          last_used_at?: string | null
          name: string
          target_muscle_groups?: string[] | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_public?: boolean
          last_used_at?: string | null
          name?: string
          target_muscle_groups?: string[] | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          name: string
          notes: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          notes?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          notes?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cache_statistics: {
        Row: {
          avg_hits_per_entry: number | null
          cache_type: string | null
          expired_entries: number | null
          total_entries: number | null
          total_hits: number | null
          total_size: string | null
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          conversation_id: string | null
          last_message_at: string | null
          message_count: number | null
          started_at: string | null
          title: string | null
          total_cost: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_barcode_lookup: {
        Row: {
          barcode: string | null
          brand: string | null
          carbohydrates_100g: number | null
          confidence: number | null
          energy_kcal_100g: number | null
          fat_100g: number | null
          fiber_100g: number | null
          image_url: string | null
          nova_group: number | null
          nutriscore_grade: string | null
          product_name: string | null
          proteins_100g: number | null
          sodium_100g: number | null
          source: string | null
          sugars_100g: number | null
          tier: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_barcode_cache: { Args: never; Returns: number }
      cleanup_expired_cache: {
        Args: never
        Returns: {
          deleted_meals: number
          deleted_workouts: number
          freed_space_mb: number
        }[]
      }
      cleanup_expired_meal_jobs: { Args: never; Returns: undefined }
      cleanup_old_cache: { Args: never; Returns: undefined }
      cleanup_old_conversations: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      get_active_subscription: {
        Args: { p_user_id: string }
        Returns: {
          current_period_end: number
          razorpay_subscription_id: string
          status: string
          subscription_id: string
          tier: string
        }[]
      }
      get_cache_stats: {
        Args: never
        Returns: {
          avg_hits_per_entry: number
          newest_entry: string
          oldest_entry: string
          table_name: string
          total_entries: number
          total_hits: number
        }[]
      }
      get_conversation_context: {
        Args: {
          p_conversation_id: string
          p_max_messages?: number
          p_max_tokens?: number
        }
        Returns: {
          content: string
          created_at: string
          id: string
          message_index: number
          role: string
          tokens_used: number
        }[]
      }
      get_feature_usage: {
        Args: {
          p_feature_key: string
          p_period_start: string
          p_period_type: string
          p_user_id: string
        }
        Returns: number
      }
      get_generation_costs: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_cost_usd: number
          generation_type: string
          model_used: string
          total_cost_usd: number
          total_generations: number
          total_tokens: number
        }[]
      }
      get_latest_manual_weight_kg: {
        Args: { p_user_id: string }
        Returns: number
      }
      increment_cache_hit: {
        Args: { p_cache_key: string; p_table: string }
        Returns: undefined
      }
      increment_feature_usage: {
        Args: {
          p_feature_key: string
          p_period_start: string
          p_period_type: string
          p_user_id: string
        }
        Returns: number
      }
      increment_template_usage_count: {
        Args: { owner_user_id: string; template_id: string }
        Returns: undefined
      }
      lookup_barcode: {
        Args: { p_barcode: string }
        Returns: {
          barcode: string
          brand: string
          carbohydrates_100g: number
          confidence: number
          energy_kcal_100g: number
          fat_100g: number
          fiber_100g: number
          image_url: string
          nova_group: number
          nutriscore_grade: string
          product_name: string
          proteins_100g: number
          sodium_100g: number
          source: string
          sugars_100g: number
          tier: number
        }[]
      }
      recompute_user_current_weight: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      upsert_barcode_cache: {
        Args: {
          p_barcode: string
          p_brand: string
          p_carbohydrates_100g: number
          p_confidence: number
          p_energy_kcal_100g: number
          p_fat_100g: number
          p_fiber_100g: number
          p_image_url: string
          p_is_ai_estimated?: boolean
          p_nova_group: number
          p_nutriscore_grade: string
          p_product_name: string
          p_proteins_100g: number
          p_sodium_100g: number
          p_source: string
          p_sugars_100g: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
