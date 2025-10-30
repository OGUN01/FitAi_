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
      console.log('💾 PersonalInfoService: Saving personal info for user:', userId);
      
      const profileData: Partial<ProfilesRow> = {
        id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        name: `${data.first_name} ${data.last_name}`.trim(), // Computed full name
        age: data.age,
        gender: data.gender,
        country: data.country,
        state: data.state,
        region: data.region || null,
        wake_time: data.wake_time,
        sleep_time: data.sleep_time,
        occupation_type: data.occupation_type,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ PersonalInfoService: Database error:', error);
        return false;
      }
      
      console.log('✅ PersonalInfoService: Personal info saved successfully');
      return true;
    } catch (error) {
      console.error('❌ PersonalInfoService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<PersonalInfoData | null> {
    try {
      console.log('📖 PersonalInfoService: Loading personal info for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ PersonalInfoService: Database error:', error);
        return null;
      }
      
      if (!data) {
        console.log('📭 PersonalInfoService: No personal info found');
        return null;
      }
      
      const personalInfo: PersonalInfoData = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        age: data.age || 0,
        gender: data.gender || 'male',
        country: data.country || '',
        state: data.state || '',
        region: data.region === null ? undefined : data.region,
        wake_time: data.wake_time || '07:00',
        sleep_time: data.sleep_time || '23:00',
        occupation_type: data.occupation_type || 'desk_job',
      };
      
      console.log('✅ PersonalInfoService: Personal info loaded successfully');
      return personalInfo;
    } catch (error) {
      console.error('❌ PersonalInfoService: Unexpected error:', error);
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
      console.log('💾 DietPreferencesService: Saving diet preferences for user:', userId);
      
      const dietData: Partial<DietPreferencesRow> = {
        user_id: userId,
        diet_type: data.diet_type,
        allergies: data.allergies,
        restrictions: data.restrictions,
        
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
      
      const { error } = await supabase
        .from('diet_preferences')
        .upsert(dietData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ DietPreferencesService: Database error:', error);
        return false;
      }
      
      console.log('✅ DietPreferencesService: Diet preferences saved successfully');
      return true;
    } catch (error) {
      console.error('❌ DietPreferencesService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<DietPreferencesData | null> {
    try {
      console.log('📖 DietPreferencesService: Loading diet preferences for user:', userId);
      
      const { data, error } = await supabase
        .from('diet_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ DietPreferencesService: Database error:', error);
        return null;
      }
      
      if (!data) {
        console.log('📭 DietPreferencesService: No diet preferences found');
        return null;
      }
      
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
      
      console.log('✅ DietPreferencesService: Diet preferences loaded successfully');
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
      console.log('💾 BodyAnalysisService: Saving body analysis for user:', userId);
      
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
      
      const { error } = await supabase
        .from('body_analysis')
        .upsert(bodyData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ BodyAnalysisService: Database error:', error);
        return false;
      }
      
      console.log('✅ BodyAnalysisService: Body analysis saved successfully');
      return true;
    } catch (error) {
      console.error('❌ BodyAnalysisService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<BodyAnalysisData | null> {
    try {
      console.log('📖 BodyAnalysisService: Loading body analysis for user:', userId);
      
      const { data, error } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ BodyAnalysisService: Database error:', error);
        return null;
      }
      
      if (!data) {
        console.log('📭 BodyAnalysisService: No body analysis found');
        return null;
      }
      
      const bodyAnalysis: BodyAnalysisData = {
        height_cm: data.height_cm || 0,
        current_weight_kg: data.current_weight_kg || 0,
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
      
      console.log('✅ BodyAnalysisService: Body analysis loaded successfully');
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
      console.log('💾 WorkoutPreferencesService: Saving workout preferences for user:', userId);
      
      const workoutData: Partial<WorkoutPreferencesRow> = {
        user_id: userId,
        location: data.location,
        equipment: data.equipment,
        time_preference: data.time_preference,
        intensity: data.intensity,
        workout_types: data.workout_types,
        primary_goals: data.primary_goals,
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
      
      const { error } = await supabase
        .from('workout_preferences')
        .upsert(workoutData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ WorkoutPreferencesService: Database error:', error);
        return false;
      }
      
      console.log('✅ WorkoutPreferencesService: Workout preferences saved successfully');
      return true;
    } catch (error) {
      console.error('❌ WorkoutPreferencesService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<WorkoutPreferencesData | null> {
    try {
      console.log('📖 WorkoutPreferencesService: Loading workout preferences for user:', userId);
      
      const { data, error } = await supabase
        .from('workout_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ WorkoutPreferencesService: Database error:', error);
        return null;
      }
      
      if (!data) {
        console.log('📭 WorkoutPreferencesService: No workout preferences found');
        return null;
      }
      
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
      
      console.log('✅ WorkoutPreferencesService: Workout preferences loaded successfully');
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
  static async save(userId: string, data: AdvancedReviewData): Promise<boolean> {
    try {
      console.log('💾 AdvancedReviewService: Saving advanced review for user:', userId);
      
      const reviewData: Partial<AdvancedReviewRow> = {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('advanced_review')
        .upsert(reviewData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ AdvancedReviewService: Database error:', error);
        return false;
      }
      
      console.log('✅ AdvancedReviewService: Advanced review saved successfully');
      return true;
    } catch (error) {
      console.error('❌ AdvancedReviewService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<AdvancedReviewData | null> {
    try {
      console.log('📖 AdvancedReviewService: Loading advanced review for user:', userId);
      
      const { data, error } = await supabase
        .from('advanced_review')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ AdvancedReviewService: Database error:', error);
        return null;
      }
      
      if (!data) {
        console.log('📭 AdvancedReviewService: No advanced review found');
        return null;
      }
      
      console.log('✅ AdvancedReviewService: Advanced review loaded successfully');
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
      console.log('💾 OnboardingProgressService: Saving progress for user:', userId);
      
      const progressData: Partial<OnboardingProgressRow> = {
        user_id: userId,
        current_tab: progress.current_tab,
        completed_tabs: progress.completed_tabs,
        tab_validation_status: progress.tab_validation_status,
        total_completion_percentage: progress.total_completion_percentage,
        last_updated: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('onboarding_progress')
        .upsert(progressData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ OnboardingProgressService: Database error:', error);
        return false;
      }
      
      console.log('✅ OnboardingProgressService: Progress saved successfully');
      return true;
    } catch (error) {
      console.error('❌ OnboardingProgressService: Unexpected error:', error);
      return false;
    }
  }
  
  static async load(userId: string): Promise<OnboardingProgressData | null> {
    try {
      console.log('📖 OnboardingProgressService: Loading progress for user:', userId);
      
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ OnboardingProgressService: Database error:', error);
        return null;
      }
      
      if (!data) {
        console.log('📭 OnboardingProgressService: No progress found, creating new');
        // Create initial progress record
        const initialProgress: OnboardingProgressData = {
          current_tab: 1,
          completed_tabs: [],
          tab_validation_status: {},
          total_completion_percentage: 0,
        };
        
        await this.save(userId, initialProgress);
        return initialProgress;
      }
      
      const progress: OnboardingProgressData = {
        current_tab: data.current_tab || 1,
        completed_tabs: data.completed_tabs || [],
        tab_validation_status: data.tab_validation_status || {},
        total_completion_percentage: data.total_completion_percentage || 0,
        started_at: data.started_at,
        completed_at: data.completed_at,
        last_updated: data.last_updated,
      };
      
      console.log('✅ OnboardingProgressService: Progress loaded successfully');
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
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!data) {
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
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
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
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      warnings.push('Body analysis skipped - continuing with default recommendations');
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    // Minimum required: height and current weight (to calculate BMI)
    const hasMinimumData = (data.height_cm && data.height_cm > 0) || (data.current_weight_kg && data.current_weight_kg > 0);

    if (!hasMinimumData) {
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

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
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
