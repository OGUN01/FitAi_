import { supabase } from './supabase';
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  OnboardingProgressData,
  TabValidationResult,
  ProfilesRow,
  DietPreferencesRow,
  BodyAnalysisRow,
  WorkoutPreferencesRow,
  AdvancedReviewRow,
  OnboardingProgressRow,
} from '../types/onboarding';

// ============================================================================
// PERSONAL INFO SERVICE
// ============================================================================

export class PersonalInfoService {
  static async save(userId: string, data: PersonalInfoData): Promise<boolean> {
    try {
      console.log('💾 [DB-SERVICE] PersonalInfoService.save - Starting save for user:', userId);
      console.log('💾 [DB-SERVICE] Input data:', data);

      // CRITICAL: Get user email from auth session - required NOT NULL field in profiles table
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || '';
      
      if (!userEmail) {
        console.warn('⚠️ [DB-SERVICE] PersonalInfoService: No email found in auth session');
      }

      // Ensure NOT NULL fields have fallback values
      const firstName = data.first_name || '';
      const lastName = data.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'User';

      const profileData: Partial<ProfilesRow> = {
        id: userId,
        email: userEmail, // Required NOT NULL field
        first_name: firstName,
        last_name: lastName,
        name: fullName, // Computed full name with fallback
        age: data.age || 25, // NOT NULL - default to 25 if missing
        gender: data.gender || 'prefer_not_to_say', // NOT NULL - safe default
        country: data.country,
        state: data.state,
        region: data.region || null,
        wake_time: data.wake_time,
        sleep_time: data.sleep_time,
        occupation_type: data.occupation_type,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 [DB-SERVICE] Transformed profileData for upsert:', profileData);

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [DB-SERVICE] PersonalInfoService: Database error:', error);
        return false;
      }

      console.log('✅ [DB-SERVICE] PersonalInfoService: Personal info saved successfully to database');
      return true;
    } catch (error) {
      console.error('❌ [DB-SERVICE] PersonalInfoService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<PersonalInfoData | null> {
    try {
      console.log('📥 [DB-SERVICE] PersonalInfoService.load - Loading for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [DB-SERVICE] PersonalInfoService: Database error:', error);
        return null;
      }

      if (!data) {
        console.log('📭 [DB-SERVICE] PersonalInfoService: No personal info found in database');
        return null;
      }

      console.log('📥 [DB-SERVICE] Raw data from database:', data);

      // VALIDATION: CRITICAL FIELDS - no fallbacks allowed
      if (!data.age || data.age === 0) {
        throw new Error('Age is required for accurate health calculations');
      }
      if (!data.gender || data.gender === '') {
        throw new Error('Gender is required for accurate BMR and health calculations');
      }

      const personalInfo: PersonalInfoData = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        name: data.name || '', // ✅ FIXED: Load the name field from database
        age: data.age, // NO FALLBACK - validation above ensures it exists
        gender: data.gender, // NO FALLBACK - validation above ensures it exists
        country: data.country || '',
        state: data.state || '',
        region: data.region === null ? undefined : data.region,
        wake_time: data.wake_time || '07:00',
        sleep_time: data.sleep_time || '23:00',
        occupation_type: data.occupation_type || 'desk_job',
      };

      console.log('✅ [DB-SERVICE] PersonalInfoService: Transformed PersonalInfoData:', personalInfo);
      return personalInfo;
    } catch (error) {
      console.error('❌ [DB-SERVICE] PersonalInfoService: Unexpected error:', error);
      return null;
    }
  }
  
  static async delete(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ PersonalInfoService: Deleting personal info for user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('❌ PersonalInfoService: Database error:', error);
        return false;
      }
      
      console.log('✅ PersonalInfoService: Personal info deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ PersonalInfoService: Unexpected error:', error);
      return false;
    }
  }
}

// ============================================================================
// DIET PREFERENCES SERVICE
// ============================================================================

export class DietPreferencesService {
  static async save(userId: string, data: DietPreferencesData): Promise<boolean> {
    try {
      console.log('💾 [DB-SERVICE] DietPreferencesService.save - Starting save for user:', userId);
      console.log('💾 [DB-SERVICE] Input data:', data);

      const dietData: Partial<DietPreferencesRow> = {
        user_id: userId,
        diet_type: data.diet_type || 'omnivore', // NOT NULL - default to omnivore
        allergies: data.allergies || [], // NOT NULL - default to empty array
        restrictions: data.restrictions || [], // NOT NULL - default to empty array
        
        // Diet readiness toggles
        keto_ready: data.keto_ready,
        intermittent_fasting_ready: data.intermittent_fasting_ready,
        paleo_ready: data.paleo_ready,
        mediterranean_ready: data.mediterranean_ready,
        low_carb_ready: data.low_carb_ready,
        high_protein_ready: data.high_protein_ready,
        
        // Meal preferences
        breakfast_enabled: data.breakfast_enabled,
        lunch_enabled: data.lunch_enabled,
        dinner_enabled: data.dinner_enabled,
        snacks_enabled: data.snacks_enabled,
        
        // Cooking preferences
        cooking_skill_level: data.cooking_skill_level,
        max_prep_time_minutes: data.max_prep_time_minutes,
        budget_level: data.budget_level,

        // Health habits (14 fields)
        drinks_enough_water: data.drinks_enough_water,
        limits_sugary_drinks: data.limits_sugary_drinks,
        eats_regular_meals: data.eats_regular_meals,
        avoids_late_night_eating: data.avoids_late_night_eating,
        controls_portion_sizes: data.controls_portion_sizes,
        reads_nutrition_labels: data.reads_nutrition_labels,
        eats_processed_foods: data.eats_processed_foods,
        eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies,
        limits_refined_sugar: data.limits_refined_sugar,
        includes_healthy_fats: data.includes_healthy_fats,
        drinks_alcohol: data.drinks_alcohol,
        smokes_tobacco: data.smokes_tobacco,
        drinks_coffee: data.drinks_coffee,
        takes_supplements: data.takes_supplements,
        
        updated_at: new Date().toISOString(),
      };

      console.log('💾 [DB-SERVICE] Transformed dietData for upsert:', dietData);

      const { error } = await supabase
        .from('diet_preferences')
        .upsert(dietData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [DB-SERVICE] DietPreferencesService: Database error:', error);
        return false;
      }

      console.log('✅ [DB-SERVICE] DietPreferencesService: Diet preferences saved successfully to database');
      return true;
    } catch (error) {
      console.error('❌ [DB-SERVICE] DietPreferencesService: Unexpected error:', error);
      return false;
    }
  }

  static async load(userId: string): Promise<DietPreferencesData | null> {
    try {
      console.log('📥 [DB-SERVICE] DietPreferencesService.load - Loading for user:', userId);

      const { data, error } = await supabase
        .from('diet_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [DB-SERVICE] DietPreferencesService: Database error:', error);
        return null;
      }

      if (!data) {
        console.log('📭 [DB-SERVICE] DietPreferencesService: No diet preferences found in database');
        return null;
      }

      console.log('📥 [DB-SERVICE] Raw data from database:', data);
      
      const dietPreferences: DietPreferencesData = {
        diet_type: data.diet_type || 'non-veg',
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],
        
        // Diet readiness
        keto_ready: data.keto_ready || false,
        intermittent_fasting_ready: data.intermittent_fasting_ready || false,
        paleo_ready: data.paleo_ready || false,
        mediterranean_ready: data.mediterranean_ready || false,
        low_carb_ready: data.low_carb_ready || false,
        high_protein_ready: data.high_protein_ready || false,
        
        // Meal preferences
        breakfast_enabled: data.breakfast_enabled ?? true,
        lunch_enabled: data.lunch_enabled ?? true,
        dinner_enabled: data.dinner_enabled ?? true,
        snacks_enabled: data.snacks_enabled ?? true,
        
        // Cooking preferences
        cooking_skill_level: data.cooking_skill_level || 'beginner',
        max_prep_time_minutes: data.max_prep_time_minutes || 30,
        budget_level: data.budget_level || 'medium',

        // Health habits
        drinks_enough_water: data.drinks_enough_water || false,
        limits_sugary_drinks: data.limits_sugary_drinks || false,
        eats_regular_meals: data.eats_regular_meals || false,
        avoids_late_night_eating: data.avoids_late_night_eating || false,
        controls_portion_sizes: data.controls_portion_sizes || false,
        reads_nutrition_labels: data.reads_nutrition_labels || false,
        eats_processed_foods: data.eats_processed_foods ?? true,
        eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies || false,
        limits_refined_sugar: data.limits_refined_sugar || false,
        includes_healthy_fats: data.includes_healthy_fats || false,
        drinks_alcohol: data.drinks_alcohol || false,
        smokes_tobacco: data.smokes_tobacco || false,
        drinks_coffee: data.drinks_coffee || false,
        takes_supplements: data.takes_supplements || false,
      };

      console.log('✅ [DB-SERVICE] DietPreferencesService: Transformed DietPreferencesData:', dietPreferences);
      return dietPreferences;
    } catch (error) {
      console.error('❌ DietPreferencesService: Unexpected error:', error);
      return null;
    }
  }
}

// ============================================================================
// BODY ANALYSIS SERVICE
// ============================================================================

export class BodyAnalysisService {
  static async save(userId: string, data: BodyAnalysisData): Promise<boolean> {
    try {
      console.log('💾 [DB-SERVICE] BodyAnalysisService.save - Starting save for user:', userId);
      console.log('💾 [DB-SERVICE] Input data:', data);

      const bodyData: Partial<BodyAnalysisRow> = {
        user_id: userId,
        
        // Basic measurements
        height_cm: data.height_cm,
        current_weight_kg: data.current_weight_kg,
        target_weight_kg: data.target_weight_kg,
        target_timeline_weeks: data.target_timeline_weeks,
        
        // Body composition
        body_fat_percentage: data.body_fat_percentage || null,
        waist_cm: data.waist_cm || null,
        hip_cm: data.hip_cm || null,
        chest_cm: data.chest_cm || null,
        
        // Photos
        front_photo_url: data.front_photo_url || null,
        side_photo_url: data.side_photo_url || null,
        back_photo_url: data.back_photo_url || null,
        
        // AI analysis
        ai_estimated_body_fat: data.ai_estimated_body_fat || null,
        ai_body_type: data.ai_body_type || null,
        ai_confidence_score: data.ai_confidence_score || null,
        
        // Medical information
        medical_conditions: data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations: data.physical_limitations || [],
        
        // Pregnancy/Breastfeeding
        pregnancy_status: data.pregnancy_status || false,
        pregnancy_trimester: data.pregnancy_trimester || null,
        breastfeeding_status: data.breastfeeding_status || false,
        
        // Stress Level
        stress_level: data.stress_level || null,
        
        // Calculated values
        bmi: data.bmi || null,
        bmr: data.bmr || null,
        ideal_weight_min: data.ideal_weight_min || null,
        ideal_weight_max: data.ideal_weight_max || null,
        waist_hip_ratio: data.waist_hip_ratio || null,

        updated_at: new Date().toISOString(),
      };

      console.log('💾 [DB-SERVICE] Transformed bodyData for upsert:', bodyData);

      const { error } = await supabase
        .from('body_analysis')
        .upsert(bodyData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [DB-SERVICE] BodyAnalysisService: Database error:', error);
        return false;
      }

      console.log('✅ [DB-SERVICE] BodyAnalysisService: Body analysis saved successfully to database');
      return true;
    } catch (error) {
      console.error('❌ [DB-SERVICE] BodyAnalysisService: Unexpected error:', error);
      return false;
    }
  }

  static async load(userId: string): Promise<BodyAnalysisData | null> {
    try {
      console.log('📥 [DB-SERVICE] BodyAnalysisService.load - Loading for user:', userId);

      const { data, error } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [DB-SERVICE] BodyAnalysisService: Database error:', error);
        return null;
      }

      if (!data) {
        console.log('📭 [DB-SERVICE] BodyAnalysisService: No body analysis found in database');
        return null;
      }

      console.log('📥 [DB-SERVICE] Raw data from database:', data);

      // VALIDATION: CRITICAL FIELDS - no fallbacks for weight/height
      if (!data.height_cm || data.height_cm === 0) {
        throw new Error('Height is required for BMI and health calculations');
      }
      if (!data.current_weight_kg || data.current_weight_kg === 0) {
        throw new Error('Current weight is required for BMI, BMR, and TDEE calculations');
      }

      const bodyAnalysis: BodyAnalysisData = {
        height_cm: data.height_cm, // NO FALLBACK - validation above ensures it exists
        current_weight_kg: data.current_weight_kg, // NO FALLBACK - validation above ensures it exists
        target_weight_kg: data.target_weight_kg || undefined,
        target_timeline_weeks: data.target_timeline_weeks || undefined,
        
        body_fat_percentage: data.body_fat_percentage || undefined,
        waist_cm: data.waist_cm || undefined,
        hip_cm: data.hip_cm || undefined,
        chest_cm: data.chest_cm || undefined,
        
        front_photo_url: data.front_photo_url || undefined,
        side_photo_url: data.side_photo_url || undefined,
        back_photo_url: data.back_photo_url || undefined,
        
        ai_estimated_body_fat: data.ai_estimated_body_fat || undefined,
        ai_body_type: data.ai_body_type || undefined,
        ai_confidence_score: data.ai_confidence_score || undefined,
        
        medical_conditions: data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations: data.physical_limitations || [],
        
        pregnancy_status: data.pregnancy_status || false,
        pregnancy_trimester: data.pregnancy_trimester || undefined,
        breastfeeding_status: data.breastfeeding_status || false,
        
        stress_level: data.stress_level || undefined,
        
        bmi: data.bmi || undefined,
        bmr: data.bmr || undefined,
        ideal_weight_min: data.ideal_weight_min || undefined,
        ideal_weight_max: data.ideal_weight_max || undefined,
        waist_hip_ratio: data.waist_hip_ratio || undefined,
      };

      console.log('✅ [DB-SERVICE] BodyAnalysisService: Transformed BodyAnalysisData:', bodyAnalysis);
      return bodyAnalysis;
    } catch (error) {
      console.error('❌ BodyAnalysisService: Unexpected error:', error);
      return null;
    }
  }
}

// ============================================================================
// WORKOUT PREFERENCES SERVICE
// ============================================================================

export class WorkoutPreferencesService {
  static async save(userId: string, data: WorkoutPreferencesData): Promise<boolean> {
    try {
      console.log('💾 [DB-SERVICE] WorkoutPreferencesService.save - Starting save for user:', userId);
      console.log('💾 [DB-SERVICE] Input data:', data);

      const workoutData: Partial<WorkoutPreferencesRow> = {
        user_id: userId,
        location: data.location || 'home', // NOT NULL - default to home
        equipment: data.equipment || ['bodyweight'], // NOT NULL - default to bodyweight
        time_preference: data.time_preference,
        intensity: data.intensity || 'moderate', // NOT NULL - default to moderate
        workout_types: data.workout_types,
        primary_goals: data.primary_goals || ['general-fitness'], // NOT NULL - default goal
        activity_level: data.activity_level,
        workout_experience_years: data.workout_experience_years,
        workout_frequency_per_week: data.workout_frequency_per_week,
        can_do_pushups: data.can_do_pushups,
        can_run_minutes: data.can_run_minutes,
        flexibility_level: data.flexibility_level,
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || null,
        preferred_workout_times: data.preferred_workout_times,
        enjoys_cardio: data.enjoys_cardio,
        enjoys_strength_training: data.enjoys_strength_training,
        enjoys_group_classes: data.enjoys_group_classes,
        prefers_outdoor_activities: data.prefers_outdoor_activities,
        needs_motivation: data.needs_motivation,
        prefers_variety: data.prefers_variety,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 [DB-SERVICE] Transformed workoutData for upsert:', workoutData);

      const { error } = await supabase
        .from('workout_preferences')
        .upsert(workoutData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [DB-SERVICE] WorkoutPreferencesService: Database error:', error);
        return false;
      }

      console.log('✅ [DB-SERVICE] WorkoutPreferencesService: Workout preferences saved successfully to database');
      return true;
    } catch (error) {
      console.error('❌ [DB-SERVICE] WorkoutPreferencesService: Unexpected error:', error);
      return false;
    }
  }

  static async load(userId: string): Promise<WorkoutPreferencesData | null> {
    try {
      console.log('📥 [DB-SERVICE] WorkoutPreferencesService.load - Loading for user:', userId);

      const { data, error } = await supabase
        .from('workout_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [DB-SERVICE] WorkoutPreferencesService: Database error:', error);
        return null;
      }

      if (!data) {
        console.log('📭 [DB-SERVICE] WorkoutPreferencesService: No workout preferences found in database');
        return null;
      }

      console.log('📥 [DB-SERVICE] Raw data from database:', data);
      
      const workoutPreferences: WorkoutPreferencesData = {
        location: data.location || 'both',
        equipment: data.equipment || [],
        time_preference: data.time_preference || 30,
        intensity: data.intensity || 'beginner',
        workout_types: data.workout_types || [],
        primary_goals: data.primary_goals || [],
        activity_level: data.activity_level || 'sedentary',
        workout_experience_years: data.workout_experience_years || 0,
        workout_frequency_per_week: data.workout_frequency_per_week || 0,
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || 'fair',
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      };

      console.log('✅ [DB-SERVICE] WorkoutPreferencesService: Transformed WorkoutPreferencesData:', workoutPreferences);
      return workoutPreferences;
    } catch (error) {
      console.error('❌ WorkoutPreferencesService: Unexpected error:', error);
      return null;
    }
  }
}

// ============================================================================
// ADVANCED REVIEW SERVICE
// ============================================================================

export class AdvancedReviewService {
  /**
   * Calculate and save advanced review using Universal Health System
   * This method integrates the HealthCalculatorFacade
   */
  static async calculateAndSave(
    userId: string,
    personalInfo: PersonalInfoData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
    dietPreferences: DietPreferencesData
  ): Promise<AdvancedReviewData | null> {
    try {
      console.log('💾 [DB-SERVICE] AdvancedReviewService.calculateAndSave - Starting for user:', userId);

      // Import facade dynamically to avoid circular dependencies
      const { HealthCalculatorFacade } = await import('../utils/healthCalculations/HealthCalculatorFacade');

      // Build user profile from onboarding data
      const userProfile = {
        age: personalInfo.age,
        gender: personalInfo.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say',
        weight: bodyAnalysis.current_weight_kg,
        height: bodyAnalysis.height_cm,
        bodyFat: bodyAnalysis.body_fat_percentage,
        country: personalInfo.country || 'IN',
        state: personalInfo.state,
        fitnessLevel: workoutPreferences.intensity as 'beginner' | 'intermediate' | 'advanced' | 'elite',
        trainingYears: workoutPreferences.workout_experience_years,
        activityLevel: workoutPreferences.activity_level,
        dietType: dietPreferences.diet_type,
        goal: workoutPreferences.primary_goals?.[0] || 'maintenance',
        restingHR: bodyAnalysis.body_fat_percentage ? undefined : undefined, // TODO: Add resting HR to body analysis
      };

      console.log('💾 [DB-SERVICE] Calculating metrics with HealthCalculatorFacade...');
      const metrics = HealthCalculatorFacade.calculateAllMetrics(userProfile);

      // Map facade results to AdvancedReviewData
      const advancedReviewData: AdvancedReviewData = {
        // Core metabolic calculations
        calculated_bmi: metrics.bmi,
        calculated_bmr: metrics.bmr,
        calculated_tdee: metrics.tdee,

        // BMI classification
        bmi_category: metrics.bmiClassification.category,
        bmi_health_risk: metrics.bmiClassification.healthRisk,

        // Daily nutritional needs
        daily_calories: Math.round(metrics.dailyCalories),
        daily_protein_g: Math.round(metrics.protein),
        daily_carbs_g: Math.round(metrics.carbs),
        daily_fat_g: Math.round(metrics.fat),
        daily_water_ml: Math.round(metrics.waterIntakeML),

        // Auto-detection context
        detected_climate: metrics.climate,
        detected_ethnicity: metrics.ethnicity,
        bmr_formula_used: metrics.bmrFormula,
        bmr_formula_accuracy: metrics.bmrAccuracy,
        bmr_formula_confidence: metrics.bmrConfidence,

        // Advanced metrics (if available)
        heart_rate_zones: metrics.heartRateZones ? JSON.parse(JSON.stringify(metrics.heartRateZones)) : undefined,
        vo2_max_estimate: metrics.vo2max?.vo2max,
        vo2_max_classification: metrics.vo2max?.classification,
        health_score: metrics.healthScore?.totalScore,
        health_grade: metrics.healthScore?.grade,

        // Calculation metadata
        calculations_version: '4.0.0',
      };

      // Save to database
      const saved = await this.save(userId, advancedReviewData);
      if (!saved) {
        console.error('❌ [DB-SERVICE] Failed to save calculated metrics');
        return null;
      }

      console.log('✅ [DB-SERVICE] AdvancedReviewService: Metrics calculated and saved successfully');
      return advancedReviewData;
    } catch (error) {
      console.error('❌ [DB-SERVICE] AdvancedReviewService.calculateAndSave error:', error);
      return null;
    }
  }

  static async save(userId: string, data: AdvancedReviewData): Promise<boolean> {
    try {
      console.log('💾 [DB-SERVICE] AdvancedReviewService.save - Starting save for user:', userId);
      console.log('💾 [DB-SERVICE] Input data:', data);

      const reviewData: Partial<AdvancedReviewRow> = {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 [DB-SERVICE] Transformed reviewData for upsert:', reviewData);

      const { error } = await supabase
        .from('advanced_review')
        .upsert(reviewData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [DB-SERVICE] AdvancedReviewService: Database error:', error);
        return false;
      }

      console.log('✅ [DB-SERVICE] AdvancedReviewService: Advanced review saved successfully to database');
      return true;
    } catch (error) {
      console.error('❌ [DB-SERVICE] AdvancedReviewService: Unexpected error:', error);
      return false;
    }
  }

  static async load(userId: string): Promise<AdvancedReviewData | null> {
    try {
      console.log('📥 [DB-SERVICE] AdvancedReviewService.load - Loading for user:', userId);

      const { data, error } = await supabase
        .from('advanced_review')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [DB-SERVICE] AdvancedReviewService: Database error:', error);
        return null;
      }

      if (!data) {
        console.log('📭 [DB-SERVICE] AdvancedReviewService: No advanced review found in database');
        return null;
      }

      console.log('📥 [DB-SERVICE] Raw data from database:', data);
      console.log('✅ [DB-SERVICE] AdvancedReviewService: Advanced review loaded successfully');
      return data as AdvancedReviewData;
    } catch (error) {
      console.error('❌ AdvancedReviewService: Unexpected error:', error);
      return null;
    }
  }
}

// ============================================================================
// ONBOARDING PROGRESS SERVICE
// ============================================================================

export class OnboardingProgressService {
  static async save(userId: string, progress: OnboardingProgressData): Promise<boolean> {
    try {
      console.log('💾 [DB-SERVICE] OnboardingProgressService.save - Starting save for user:', userId);
      console.log('💾 [DB-SERVICE] Input progress data:', progress);

      const progressData: Partial<OnboardingProgressRow> = {
        user_id: userId,
        current_tab: progress.current_tab,
        completed_tabs: progress.completed_tabs,
        tab_validation_status: progress.tab_validation_status,
        total_completion_percentage: progress.total_completion_percentage,
        last_updated: new Date().toISOString(),
      };

      console.log('💾 [DB-SERVICE] Transformed progressData for upsert:', progressData);

      const { error } = await supabase
        .from('onboarding_progress')
        .upsert(progressData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [DB-SERVICE] OnboardingProgressService: Database error:', error);
        return false;
      }

      console.log('✅ [DB-SERVICE] OnboardingProgressService: Progress saved successfully to database');
      return true;
    } catch (error) {
      console.error('❌ [DB-SERVICE] OnboardingProgressService: Unexpected error:', error);
      return false;
    }
  }

  static async load(userId: string): Promise<OnboardingProgressData | null> {
    try {
      console.log('📥 [DB-SERVICE] OnboardingProgressService.load - Loading for user:', userId);

      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [DB-SERVICE] OnboardingProgressService: Database error:', error);
        return null;
      }

      if (!data) {
        console.log('📭 [DB-SERVICE] OnboardingProgressService: No progress found, creating initial progress record');
        // Create initial progress record
        const initialProgress: OnboardingProgressData = {
          current_tab: 1,
          completed_tabs: [],
          tab_validation_status: {},
          total_completion_percentage: 0,
        };

        console.log('📥 [DB-SERVICE] Creating initial progress:', initialProgress);
        await this.save(userId, initialProgress);
        return initialProgress;
      }

      console.log('📥 [DB-SERVICE] Raw data from database:', data);

      const progress: OnboardingProgressData = {
        current_tab: data.current_tab || 1,
        completed_tabs: data.completed_tabs || [],
        tab_validation_status: data.tab_validation_status || {},
        total_completion_percentage: data.total_completion_percentage || 0,
        started_at: data.started_at,
        completed_at: data.completed_at,
        last_updated: data.last_updated,
      };

      console.log('✅ [DB-SERVICE] OnboardingProgressService: Transformed progress data:', progress);
      return progress;
    } catch (error) {
      console.error('❌ OnboardingProgressService: Unexpected error:', error);
      return null;
    }
  }
  
  static async markComplete(userId: string): Promise<boolean> {
    try {
      console.log('🎉 OnboardingProgressService: Marking onboarding complete for user:', userId);
      
      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          completed_at: new Date().toISOString(),
          total_completion_percentage: 100,
          completed_tabs: [1, 2, 3, 4, 5],
          last_updated: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ OnboardingProgressService: Database error:', error);
        return false;
      }
      
      console.log('✅ OnboardingProgressService: Onboarding marked complete');
      return true;
    } catch (error) {
      console.error('❌ OnboardingProgressService: Unexpected error:', error);
      return false;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export class OnboardingUtils {
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    
    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60; // Handle overnight sleep
    
    return duration / 60; // Return hours as decimal
  }
  
  static formatSleepDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }
  
  static isHealthySleepDuration(hours: number): boolean {
    return hours >= 7 && hours <= 9;
  }
  
  static validatePersonalInfo(data: PersonalInfoData | null): TabValidationResult {
    console.log('🔍 [VALIDATION] validatePersonalInfo called with data:', data ? 'Data provided' : 'NULL data');
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      console.log('❌ [VALIDATION] PersonalInfo validation failed: data is null');
      return {
        is_valid: false,
        errors: [
          'First name is required',
          'Last name is required',
          'Valid age (13-120) is required',
          'Gender selection is required',
          'Country is required',
          'State is required',
          'Occupation type is required'
        ],
        warnings: [],
        completion_percentage: 0
      };
    }

    console.log('🔍 [VALIDATION] PersonalInfo key fields:', {
      first_name: data.first_name,
      last_name: data.last_name,
      age: data.age,
      gender: data.gender,
      country: data.country,
      state: data.state,
      occupation_type: data.occupation_type,
      wake_time: data.wake_time,
      sleep_time: data.sleep_time
    });

    // Required field validation
    if (!data.first_name?.trim()) errors.push('First name is required');
    if (!data.last_name?.trim()) errors.push('Last name is required');
    if (!data.age || data.age < 13 || data.age > 120) errors.push('Valid age (13-120) is required');
    if (!data.gender) errors.push('Gender selection is required');
    if (!data.country?.trim()) errors.push('Country is required');
    if (!data.state?.trim()) errors.push('State is required');
    if (!data.occupation_type) errors.push('Occupation type is required');
    if (!data.wake_time) errors.push('Wake time is required');
    if (!data.sleep_time) errors.push('Sleep time is required');

    // Sleep duration warnings
    if (data.wake_time && data.sleep_time) {
      const sleepHours = this.calculateSleepDuration(data.wake_time, data.sleep_time);
      console.log('🔍 [VALIDATION] Sleep duration:', sleepHours, 'hours');
      if (sleepHours < 6) warnings.push('Consider getting more sleep (7-9 hours recommended)');
      if (sleepHours > 10) warnings.push('Very long sleep duration detected');
    }

    // Calculate completion percentage
    const requiredFields = ['first_name', 'last_name', 'age', 'gender', 'country', 'state', 'occupation_type', 'wake_time', 'sleep_time'];
    const completedFields = requiredFields.filter(field => {
      const value = data[field as keyof PersonalInfoData];
      return value !== null && value !== undefined && value !== '' && value !== 0;
    }).length;

    const completionPercentage = Math.round((completedFields / requiredFields.length) * 100);
    console.log('🔍 [VALIDATION] PersonalInfo completion:', completionPercentage, '% (', completedFields, '/', requiredFields.length, 'fields)');

    const result = {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };

    console.log('🔍 [VALIDATION] PersonalInfo result:', result.is_valid ? '✅ VALID' : '❌ INVALID', '- Errors:', errors.length, 'Warnings:', warnings.length);

    return result;
  }
  
  static validateDietPreferences(data: DietPreferencesData | null): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Add debug logging
    console.log('🔍 validateDietPreferences called with data:', data ? 'Data provided' : 'NULL data');

    if (!data) {
      console.log('❌ Validation failed: data is null or undefined');
      return { is_valid: false, errors: ['Diet preferences data is missing'], warnings: [], completion_percentage: 0 };
    }

    // Log key fields for debugging
    console.log('🔍 Diet data fields:', {
      diet_type: data.diet_type,
      breakfast_enabled: data.breakfast_enabled,
      lunch_enabled: data.lunch_enabled,
      dinner_enabled: data.dinner_enabled,
      snacks_enabled: data.snacks_enabled
    });

    // Required fields
    if (!data.diet_type) errors.push('Diet type selection is required');
    
    // Meal preferences validation
    const enabledMeals = [
      data.breakfast_enabled,
      data.lunch_enabled,
      data.dinner_enabled,
      data.snacks_enabled
    ].filter(Boolean).length;
    
    if (enabledMeals === 0) {
      errors.push('At least one meal type must be enabled');
    }
    
    // Health habit warnings
    if (!data.breakfast_enabled) {
      warnings.push('Skipping breakfast may affect metabolism');
    }
    if (data.smokes_tobacco) {
      warnings.push('Smoking can significantly impact fitness goals');
    }
    if (data.drinks_alcohol && !data.limits_refined_sugar) {
      warnings.push('Consider limiting alcohol and sugar for better results');
    }
    if (!data.drinks_enough_water) {
      warnings.push('Proper hydration (3-4L daily) is crucial for fitness');
    }
    if (data.eats_processed_foods && !data.eats_5_servings_fruits_veggies) {
      warnings.push('Consider reducing processed foods and increasing fruits/vegetables');
    }
    
    // Calculate completion percentage
    const requiredFields = ['diet_type'];
    const optionalFields = [
      'allergies', 'restrictions', 'cooking_skill_level', 'max_prep_time_minutes', 'budget_level',
      // Diet readiness (6 fields)
      'keto_ready', 'intermittent_fasting_ready', 'paleo_ready', 'mediterranean_ready', 'low_carb_ready', 'high_protein_ready',
      // Meal preferences (4 fields)
      'breakfast_enabled', 'lunch_enabled', 'dinner_enabled', 'snacks_enabled',
      // Health habits (14 fields)
      'drinks_enough_water', 'limits_sugary_drinks', 'eats_regular_meals', 'avoids_late_night_eating',
      'controls_portion_sizes', 'reads_nutrition_labels', 'eats_processed_foods', 'eats_5_servings_fruits_veggies',
      'limits_refined_sugar', 'includes_healthy_fats', 'drinks_alcohol', 'smokes_tobacco',
      'drinks_coffee', 'takes_supplements'
    ];
    
    // Required fields (70% weight)
    const completedRequired = requiredFields.filter(field => {
      const value = data[field as keyof DietPreferencesData];
      return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
    }).length;
    
    // Optional fields (30% weight)
    const completedOptional = optionalFields.filter(field => {
      const value = data[field as keyof DietPreferencesData];
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    const completionPercentage = Math.round(
      ((completedRequired / requiredFields.length) * 70) + 
      ((completedOptional / optionalFields.length) * 30)
    );
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
  }
  
  static validateBodyAnalysis(data: BodyAnalysisData | null): TabValidationResult {
    console.log('🔍 [VALIDATION] validateBodyAnalysis called with data:', data ? 'Data provided' : 'NULL data');
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      console.log('⚠️ [VALIDATION] BodyAnalysis data is null - allowing skip');
      warnings.push('Body analysis skipped - continuing with default recommendations');
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    console.log('🔍 [VALIDATION] BodyAnalysis key fields:', {
      height_cm: data.height_cm,
      current_weight_kg: data.current_weight_kg,
      target_weight_kg: data.target_weight_kg,
      target_timeline_weeks: data.target_timeline_weeks,
      bmi: data.bmi,
      bmr: data.bmr
    });

    // Minimum required: height and current weight (to calculate BMI)
    const hasMinimumData = (data.height_cm && data.height_cm > 0) || (data.current_weight_kg && data.current_weight_kg > 0);

    if (!hasMinimumData) {
      console.log('⚠️ [VALIDATION] No minimum data (height or weight) - allowing skip');
      warnings.push('Body analysis skipped - continuing with default recommendations');
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    // Validate height if provided
    if (data.height_cm && (data.height_cm < 100 || data.height_cm > 250)) {
      errors.push('Valid height must be between 100-250 cm');
    }
    
    // Validate current weight if provided
    if (data.current_weight_kg && (data.current_weight_kg < 30 || data.current_weight_kg > 300)) {
      errors.push('Valid current weight must be between 30-300 kg');
    }
    
    // Target weight and timeline are optional - only validate if provided
    if (data.target_weight_kg && (data.target_weight_kg < 30 || data.target_weight_kg > 300)) {
      warnings.push('Target weight should be between 30-300 kg for accurate recommendations');
    }
    
    if (data.target_timeline_weeks && (data.target_timeline_weeks < 4 || data.target_timeline_weeks > 104)) {
      warnings.push('Timeline should be between 4-104 weeks for realistic goals');
    }

    // Warnings for realistic goals
    if (data.current_weight_kg && data.target_weight_kg && data.target_timeline_weeks) {
      const weightDifference = Math.abs(data.current_weight_kg - data.target_weight_kg);
      const weeklyRate = weightDifference / data.target_timeline_weeks;

      if (weeklyRate > 1) {
        warnings.push('Target weight loss rate may be too aggressive (>1kg/week)');
      }
      if (weeklyRate > 0 && weeklyRate < 0.25) {
        warnings.push('Very slow weight change rate - consider adjusting timeline');
      }
    }

    // BMI warnings
    if (data.height_cm && data.current_weight_kg) {
      const bmi = data.current_weight_kg / Math.pow(data.height_cm / 100, 2);
      if (bmi < 18.5) warnings.push('Current BMI indicates underweight');
      if (bmi > 30) warnings.push('Current BMI indicates obesity - consult healthcare provider');
    }

    // Medical condition warnings
    if (data.medical_conditions && data.medical_conditions.length > 0) {
      warnings.push('Please consult healthcare provider before starting new fitness program');
    }

    // Calculate completion percentage
    const basicFields: (keyof BodyAnalysisData)[] = ['height_cm', 'current_weight_kg'];
    const completedBasic = basicFields.filter(field => {
      const value = data[field];
      return value !== null && value !== undefined && value !== 0;
    }).length;

    const goalFields: (keyof BodyAnalysisData)[] = ['target_weight_kg', 'target_timeline_weeks'];
    const completedGoals = goalFields.filter(field => {
      const value = data[field];
      return value !== null && value !== undefined && value !== 0;
    }).length;

    const optionalFields: (keyof BodyAnalysisData)[] = ['body_fat_percentage', 'waist_cm', 'hip_cm', 'chest_cm', 'front_photo_url', 'medical_conditions'];
    const completedOptional = optionalFields.filter(field => {
      const value = data[field];
      return Array.isArray(value) ? value.length > 0 : (value !== null && value !== undefined && value !== 0);
    }).length;

    // Basic fields: 40%, Goal fields: 30%, Optional: 30%
    const completionPercentage = Math.round(
      ((completedBasic / basicFields.length) * 40) +
      ((completedGoals / goalFields.length) * 30) +
      ((completedOptional / optionalFields.length) * 30)
    );

    console.log('🔍 [VALIDATION] BodyAnalysis completion:', completionPercentage, '% - Basic:', completedBasic, '/', basicFields.length, 'Goals:', completedGoals, '/', goalFields.length, 'Optional:', completedOptional, '/', optionalFields.length);

    const result = {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };

    console.log('🔍 [VALIDATION] BodyAnalysis result:', result.is_valid ? '✅ VALID' : '❌ INVALID', '- Errors:', errors.length, 'Warnings:', warnings.length);

    return result;
  }
  
  static validateWorkoutPreferences(data: WorkoutPreferencesData | null): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Add debug logging
    console.log('🔍 validateWorkoutPreferences called with data:', data ? 'Data provided' : 'NULL data');

    if (!data) {
      console.log('❌ Validation failed: data is null or undefined');
      return { is_valid: false, errors: ['Workout preferences data is missing'], warnings: [], completion_percentage: 0 };
    }

    // Log key fields for debugging
    console.log('🔍 Workout data fields:', {
      location: data.location,
      intensity: data.intensity,
      activity_level: data.activity_level,
      primary_goals: data.primary_goals,
    });

    // Required fields
    if (!data.location) errors.push('Workout location is required');
    if (!data.intensity) errors.push('Intensity level is required');
    if (!data.activity_level) errors.push('Activity level is required');
    // workout_types is now auto-generated, no longer required
    if (!data.primary_goals || data.primary_goals.length === 0) {
      errors.push('At least one fitness goal is required');
    }
    
    // Warnings
    if (data.workout_frequency_per_week === 0) {
      warnings.push('Consider exercising at least 1-2 times per week');
    }
    if (data.workout_frequency_per_week && data.workout_frequency_per_week > 6) {
      warnings.push('High workout frequency - ensure adequate rest days');
    }
    if (data.time_preference && data.time_preference < 15) {
      warnings.push('Very short workout duration - consider 30+ minutes for better results');
    }
    
    const requiredFields = ['location', 'intensity', 'activity_level', 'primary_goals'];
    const completedRequired = requiredFields.filter(field => {
      const value = data[field as keyof WorkoutPreferencesData];
      return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
    }).length;
    
    const optionalFields = [
      'equipment', 'time_preference', 'workout_experience_years', 'workout_frequency_per_week',
      'can_do_pushups', 'can_run_minutes', 'flexibility_level', 'preferred_workout_times',
      'enjoys_cardio', 'enjoys_strength_training', 'enjoys_group_classes', 'prefers_outdoor_activities',
      'needs_motivation', 'prefers_variety'
    ];
    const completedOptional = optionalFields.filter(field => {
      const value = data[field as keyof WorkoutPreferencesData];
      return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
    }).length;
    
    const completionPercentage = Math.round(
      ((completedRequired / requiredFields.length) * 70) + 
      ((completedOptional / optionalFields.length) * 30)
    );
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
  }
  
  static validateAdvancedReview(data: AdvancedReviewData | null): TabValidationResult {
    // Advanced review is mostly calculated data, so validation is minimal
    const hasCalculations = !!(data?.calculated_bmi || data?.calculated_bmr || data?.calculated_tdee);
    
    return {
      is_valid: true, // Advanced review doesn't have strict validation requirements
      errors: [],
      warnings: hasCalculations ? [] : ['Calculations pending - will be performed automatically'],
      completion_percentage: hasCalculations ? 100 : 0,
    };
  }
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

// Note: All services are already exported with their class declarations above
// No need for duplicate export statements
