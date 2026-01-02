/**
 * SyncEngine - Unified Sync Service for FitAI
 *
 * Handles all database synchronization operations with:
 * - Offline queue with AsyncStorage persistence
 * - Retry logic with exponential backoff
 * - Auth state listener for auto-sync on login
 * - Network state listener for queue processing
 * - Proper error handling and logging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';

// ============================================================================
// TYPES
// ============================================================================

export type DataType =
  | 'personalInfo'
  | 'dietPreferences'
  | 'bodyAnalysis'
  | 'workoutPreferences'
  | 'advancedReview';

export interface SyncOperation {
  id: string;
  type: DataType;
  data: any;
  timestamp: string;
  retryCount: number;
  userId: string;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  userId: string | null;
  queueLength: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUEUE_STORAGE_KEY = '@fitai_sync_queue';
const LAST_SYNC_KEY = '@fitai_last_sync';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay for exponential backoff

// ============================================================================
// SYNC ENGINE CLASS
// ============================================================================

class SyncEngine {
  // State
  private queue: SyncOperation[] = [];
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private userId: string | null = null;
  private lastSyncAt: string | null = null;
  private lastError: string | null = null;
  private isInitialized: boolean = false;
  private authUnsubscribe: (() => void) | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the SyncEngine
   * Sets up auth listener, network listener, and loads persisted queue
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[SyncEngine] Already initialized, skipping...');
      return;
    }

    console.log('[SyncEngine] Initializing...');

    try {
      // Load persisted queue from AsyncStorage
      await this.loadQueue();

      // Load last sync timestamp
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSync) {
        this.lastSyncAt = lastSync;
      }

      // Set up auth state listener
      this.setupAuthListener();

      // Set up network state listener
      await this.setupNetworkListener();

      this.isInitialized = true;
      console.log('[SyncEngine] Initialization complete');

      // Process any pending operations if online
      if (this.isOnline && this.queue.length > 0) {
        console.log(`[SyncEngine] Found ${this.queue.length} pending operations, processing...`);
        this.processQueue();
      }
    } catch (error) {
      console.error('[SyncEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up auth state listener to auto-sync on login
   */
  private setupAuthListener(): void {
    console.log('[SyncEngine] Setting up auth state listener...');

    // Subscribe to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[SyncEngine] Auth state changed: ${event}`);

        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          console.log(`[SyncEngine] User signed in: ${userId}`);
          this.setUserId(userId);

          // Auto-sync all data on login
          if (this.isOnline) {
            console.log('[SyncEngine] Triggering auto-sync after login...');
            await this.syncAll(userId);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[SyncEngine] User signed out, clearing user ID');
          this.setUserId(null);
        }
      }
    );

    this.authUnsubscribe = () => subscription.unsubscribe();
  }

  /**
   * Set up network state listener to process queue when online
   */
  private async setupNetworkListener(): Promise<void> {
    console.log('[SyncEngine] Setting up network state listener...');

    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;
    console.log(`[SyncEngine] Initial network state: ${this.isOnline ? 'online' : 'offline'}`);

    // Subscribe to network changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;

      console.log(`[SyncEngine] Network state changed: ${this.isOnline ? 'online' : 'offline'}`);

      // Process queue when coming back online
      if (wasOffline && this.isOnline && this.queue.length > 0) {
        console.log('[SyncEngine] Back online, processing queue...');
        this.processQueue();
      }
    });
  }

  // ============================================================================
  // USER ID MANAGEMENT
  // ============================================================================

  /**
   * Set the current user ID
   */
  setUserId(userId: string | null): void {
    console.log(`[SyncEngine] Setting user ID: ${userId || 'null'}`);
    this.userId = userId;
  }

  /**
   * Get the current user ID (from state or auth store)
   */
  private getCurrentUserId(): string | null {
    if (this.userId) {
      return this.userId;
    }

    // Fallback to auth store
    const authState = useAuthStore.getState();
    return authState.user?.id || null;
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Add an operation to the queue and process if online
   */
  async queueOperation(type: DataType, data: any): Promise<void> {
    const userId = this.getCurrentUserId();

    if (!userId) {
      console.warn('[SyncEngine] Cannot queue operation: No user ID');
      return;
    }

    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      userId,
      status: 'pending',
    };

    console.log(`[SyncEngine] Queueing operation: ${type}`);

    // Add to queue
    this.queue.push(operation);

    // Persist queue
    await this.saveQueue();

    // Process immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Process all pending operations in the queue
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncEngine] Already syncing, skipping...');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Already syncing'] };
    }

    if (!this.isOnline) {
      console.log('[SyncEngine] Offline, cannot process queue');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Offline'] };
    }

    if (this.queue.length === 0) {
      console.log('[SyncEngine] Queue is empty');
      return { success: true, syncedItems: 0, failedItems: 0, errors: [] };
    }

    this.isSyncing = true;
    console.log(`[SyncEngine] Processing queue (${this.queue.length} operations)...`);

    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: [],
    };

    const completedIds: string[] = [];

    for (const operation of this.queue) {
      if (operation.status === 'processing') {
        continue; // Skip operations already being processed
      }

      operation.status = 'processing';

      try {
        await this.executeOperation(operation);
        completedIds.push(operation.id);
        result.syncedItems++;
        console.log(`[SyncEngine] Operation completed: ${operation.type}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        operation.error = errorMessage;
        operation.retryCount++;

        if (operation.retryCount >= MAX_RETRIES) {
          operation.status = 'failed';
          result.failedItems++;
          result.errors.push(`${operation.type}: ${errorMessage}`);
          completedIds.push(operation.id); // Remove from queue after max retries
          console.error(`[SyncEngine] Operation failed after ${MAX_RETRIES} retries: ${operation.type}`);
        } else {
          operation.status = 'pending';
          console.warn(`[SyncEngine] Operation failed, will retry (${operation.retryCount}/${MAX_RETRIES}): ${operation.type}`);
        }
      }
    }

    // Remove completed operations from queue
    this.queue = this.queue.filter(op => !completedIds.includes(op.id));
    await this.saveQueue();

    // Update last sync timestamp
    this.lastSyncAt = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SYNC_KEY, this.lastSyncAt);

    this.isSyncing = false;
    result.success = result.failedItems === 0;

    if (result.errors.length > 0) {
      this.lastError = result.errors.join('; ');
    } else {
      this.lastError = null;
    }

    console.log(`[SyncEngine] Queue processing complete. Synced: ${result.syncedItems}, Failed: ${result.failedItems}`);
    return result;
  }

  /**
   * Execute a single sync operation with retry logic
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    const { type, data, userId, retryCount } = operation;

    // Exponential backoff delay if retrying
    if (retryCount > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
      console.log(`[SyncEngine] Waiting ${delay}ms before retry...`);
      await this.sleep(delay);
    }

    switch (type) {
      case 'personalInfo':
        await this.syncPersonalInfo(userId, data);
        break;
      case 'dietPreferences':
        await this.syncDietPreferences(userId, data);
        break;
      case 'bodyAnalysis':
        await this.syncBodyAnalysis(userId, data);
        break;
      case 'workoutPreferences':
        await this.syncWorkoutPreferences(userId, data);
        break;
      case 'advancedReview':
        await this.syncAdvancedReview(userId, data);
        break;
      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
        console.log(`[SyncEngine] Loaded ${this.queue.length} operations from storage`);
      }
    } catch (error) {
      console.error('[SyncEngine] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[SyncEngine] Failed to save queue:', error);
    }
  }

  // ============================================================================
  // SYNC ALL DATA
  // ============================================================================

  /**
   * Sync all data types to database
   */
  async syncAll(userId: string): Promise<SyncResult> {
    console.log(`[SyncEngine] Syncing all data for user: ${userId}`);

    if (!this.isOnline) {
      console.warn('[SyncEngine] Cannot sync: offline');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Offline'] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: [],
    };

    // Process any pending queue items first
    if (this.queue.length > 0) {
      const queueResult = await this.processQueue();
      result.syncedItems += queueResult.syncedItems;
      result.failedItems += queueResult.failedItems;
      result.errors.push(...queueResult.errors);
    }

    this.isSyncing = false;
    this.lastSyncAt = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SYNC_KEY, this.lastSyncAt);

    result.success = result.failedItems === 0;
    console.log(`[SyncEngine] Sync all complete. Synced: ${result.syncedItems}, Failed: ${result.failedItems}`);

    return result;
  }

  // ============================================================================
  // INDIVIDUAL SYNC METHODS
  // ============================================================================

  /**
   * Sync personal info to profiles table
   */
  async syncPersonalInfo(userId: string, data: any): Promise<void> {
    console.log('[SyncEngine] Syncing personal info to profiles table...');

    // Build first_name and last_name first for name derivation
    const firstName = data.first_name || data.firstName || '';
    const lastName = data.last_name || data.lastName || '';

    // CRITICAL: 'name' field is required (NOT NULL) in profiles table
    // Derive from explicit name, or combine first+last, or use email prefix, or fallback to 'User'
    const derivedName = data.name ||
      `${firstName} ${lastName}`.trim() ||
      (data.email ? data.email.split('@')[0] : '') ||
      'User';

    const profileData = {
      id: userId,
      email: data.email || '',
      name: derivedName, // Required NOT NULL field
      first_name: firstName,
      last_name: lastName,
      age: data.age,
      gender: data.gender,
      country: data.country || 'US',
      state: data.state || '',
      region: data.region,
      wake_time: data.wake_time || data.wakeTime || '07:00',
      sleep_time: data.sleep_time || data.sleepTime || '23:00',
      occupation_type: data.occupation_type || data.occupationType || 'desk_job',
      // Settings and preferences
      media_preference: data.media_preference || data.mediaPreference || null,
      data_usage_mode: data.data_usage_mode || data.dataUsageMode || null,
      units: data.units || 'metric',
      notifications_enabled: data.notifications_enabled ?? data.notificationsEnabled ?? true,
      dark_mode: data.dark_mode ?? data.darkMode ?? false,
      // Climate and ethnicity detection
      detected_climate: data.detected_climate || data.detectedClimate || null,
      detected_ethnicity: data.detected_ethnicity || data.detectedEthnicity || null,
      ethnicity_confirmed: data.ethnicity_confirmed ?? data.ethnicityConfirmed ?? null,
      climate_confirmed: data.climate_confirmed ?? data.climateConfirmed ?? null,
      // Health metrics
      preferred_bmr_formula: data.preferred_bmr_formula || data.preferredBmrFormula || null,
      resting_heart_rate: data.resting_heart_rate ?? data.restingHeartRate ?? null,
      // Profile extras
      profile_picture: data.profile_picture || data.profilePicture || null,
      subscription_tier: data.subscription_tier || data.subscriptionTier || 'free',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (error) {
      console.error('[SyncEngine] Failed to sync personal info:', error.message);
      throw new Error(`Failed to sync personal info: ${error.message}`);
    }

    console.log('[SyncEngine] Personal info synced successfully');
  }

  /**
   * Sync diet preferences to diet_preferences table
   */
  async syncDietPreferences(userId: string, data: any): Promise<void> {
    console.log('[SyncEngine] Syncing diet preferences...');

    const dietPreferencesData = {
      user_id: userId,
      diet_type: data.diet_type || data.dietType,
      allergies: data.allergies || [],
      restrictions: data.restrictions || [],
      // Diet readiness toggles
      keto_ready: data.keto_ready ?? data.ketoReady ?? false,
      intermittent_fasting_ready: data.intermittent_fasting_ready ?? data.intermittentFastingReady ?? false,
      paleo_ready: data.paleo_ready ?? data.paleoReady ?? false,
      mediterranean_ready: data.mediterranean_ready ?? data.mediterraneanReady ?? false,
      low_carb_ready: data.low_carb_ready ?? data.lowCarbReady ?? false,
      high_protein_ready: data.high_protein_ready ?? data.highProteinReady ?? false,
      // Meal preferences
      breakfast_enabled: data.breakfast_enabled ?? data.breakfastEnabled ?? true,
      lunch_enabled: data.lunch_enabled ?? data.lunchEnabled ?? true,
      dinner_enabled: data.dinner_enabled ?? data.dinnerEnabled ?? true,
      snacks_enabled: data.snacks_enabled ?? data.snacksEnabled ?? false,
      // Cooking preferences
      cooking_skill_level: data.cooking_skill_level || data.cookingSkillLevel || 'beginner',
      max_prep_time_minutes: data.max_prep_time_minutes ?? data.maxPrepTimeMinutes ?? null,
      budget_level: data.budget_level || data.budgetLevel || 'medium',
      // Health habits
      drinks_enough_water: data.drinks_enough_water ?? data.drinksEnoughWater ?? false,
      limits_sugary_drinks: data.limits_sugary_drinks ?? data.limitsSugaryDrinks ?? false,
      eats_regular_meals: data.eats_regular_meals ?? data.eatsRegularMeals ?? false,
      avoids_late_night_eating: data.avoids_late_night_eating ?? data.avoidsLateNightEating ?? false,
      controls_portion_sizes: data.controls_portion_sizes ?? data.controlsPortionSizes ?? false,
      reads_nutrition_labels: data.reads_nutrition_labels ?? data.readsNutritionLabels ?? false,
      eats_processed_foods: data.eats_processed_foods ?? data.eatsProcessedFoods ?? true,
      eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies ?? data.eats5ServingsFruitsVeggies ?? false,
      limits_refined_sugar: data.limits_refined_sugar ?? data.limitsRefinedSugar ?? false,
      includes_healthy_fats: data.includes_healthy_fats ?? data.includesHealthyFats ?? false,
      drinks_alcohol: data.drinks_alcohol ?? data.drinksAlcohol ?? false,
      smokes_tobacco: data.smokes_tobacco ?? data.smokesTobacco ?? false,
      drinks_coffee: data.drinks_coffee ?? data.drinksCoffee ?? false,
      takes_supplements: data.takes_supplements ?? data.takesSupplements ?? false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('diet_preferences')
      .upsert(dietPreferencesData, { onConflict: 'user_id' });

    if (error) {
      console.error('[SyncEngine] Failed to sync diet preferences:', error.message);
      throw new Error(`Failed to sync diet preferences: ${error.message}`);
    }

    console.log('[SyncEngine] Diet preferences synced successfully');
  }

  /**
   * Sync body analysis to body_analysis table
   */
  async syncBodyAnalysis(userId: string, data: any): Promise<void> {
    console.log('[SyncEngine] Syncing body analysis...');

    const bodyAnalysisData = {
      user_id: userId,
      // Core measurements
      height_cm: data.height_cm || data.heightCm || 170,
      current_weight_kg: data.current_weight_kg || data.currentWeightKg || 70,
      target_weight_kg: data.target_weight_kg || data.targetWeightKg || 65,
      target_timeline_weeks: data.target_timeline_weeks || data.targetTimelineWeeks || null,
      // Body composition
      body_fat_percentage: data.body_fat_percentage || data.bodyFatPercentage || null,
      body_fat_source: data.body_fat_source || data.bodyFatSource || null,
      body_fat_measured_at: data.body_fat_measured_at || data.bodyFatMeasuredAt || null,
      // Body measurements
      waist_cm: data.waist_cm || data.waistCm || null,
      hip_cm: data.hip_cm || data.hipCm || null,
      chest_cm: data.chest_cm || data.chestCm || null,
      waist_hip_ratio: data.waist_hip_ratio || data.waistHipRatio || null,
      // Calculated values
      bmi: data.bmi || null,
      bmr: data.bmr || null,
      ideal_weight_min: data.ideal_weight_min || data.idealWeightMin || null,
      ideal_weight_max: data.ideal_weight_max || data.idealWeightMax || null,
      // Photos
      photos: data.photos || null,
      front_photo_url: data.front_photo_url || data.frontPhotoUrl || null,
      side_photo_url: data.side_photo_url || data.sidePhotoUrl || null,
      back_photo_url: data.back_photo_url || data.backPhotoUrl || null,
      // AI analysis
      analysis: data.analysis || null,
      ai_estimated_body_fat: data.ai_estimated_body_fat || data.aiEstimatedBodyFat || null,
      ai_body_type: data.ai_body_type || data.aiBodyType || null,
      ai_confidence_score: data.ai_confidence_score || data.aiConfidenceScore || null,
      // Medical info
      medical_conditions: data.medical_conditions || data.medicalConditions || [],
      medications: data.medications || null,
      physical_limitations: data.physical_limitations || data.physicalLimitations || null,
      // Female health
      pregnancy_status: data.pregnancy_status ?? data.pregnancyStatus ?? false,
      pregnancy_trimester: data.pregnancy_trimester || data.pregnancyTrimester || null,
      breastfeeding_status: data.breastfeeding_status ?? data.breastfeedingStatus ?? false,
      // Lifestyle
      stress_level: data.stress_level || data.stressLevel || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('body_analysis')
      .upsert(bodyAnalysisData, { onConflict: 'user_id' });

    if (error) {
      console.error('[SyncEngine] Failed to sync body analysis:', error.message);
      throw new Error(`Failed to sync body analysis: ${error.message}`);
    }

    console.log('[SyncEngine] Body analysis synced successfully');
  }

  /**
   * Sync workout preferences to workout_preferences table
   */
  async syncWorkoutPreferences(userId: string, data: any): Promise<void> {
    console.log('[SyncEngine] Syncing workout preferences...');

    const workoutPreferencesData = {
      user_id: userId,
      // Basic preferences
      location: data.location,
      equipment: data.equipment || [],
      time_preference: data.time_preference || data.timePreference,
      intensity: data.intensity,
      workout_types: data.workout_types || data.workoutTypes || [],
      // Goals and activity
      primary_goals: data.primary_goals || data.primaryGoals || [],
      activity_level: data.activity_level || data.activityLevel || 'moderate',
      // Fitness assessment
      workout_experience_years: data.workout_experience_years || data.workoutExperienceYears || 0,
      workout_frequency_per_week: data.workout_frequency_per_week || data.workoutFrequencyPerWeek || 0,
      can_do_pushups: data.can_do_pushups || data.canDoPushups || 0,
      can_run_minutes: data.can_run_minutes || data.canRunMinutes || 0,
      flexibility_level: data.flexibility_level || data.flexibilityLevel || 'fair',
      // Weight goals
      weekly_weight_loss_goal: data.weekly_weight_loss_goal ?? data.weeklyWeightLossGoal ?? null,
      // Enhanced preferences
      preferred_workout_times: data.preferred_workout_times || data.preferredWorkoutTimes || [],
      enjoys_cardio: data.enjoys_cardio ?? data.enjoysCardio ?? true,
      enjoys_strength_training: data.enjoys_strength_training ?? data.enjoysStrengthTraining ?? true,
      enjoys_group_classes: data.enjoys_group_classes ?? data.enjoysGroupClasses ?? false,
      prefers_outdoor_activities: data.prefers_outdoor_activities ?? data.prefersOutdoorActivities ?? false,
      needs_motivation: data.needs_motivation ?? data.needsMotivation ?? false,
      prefers_variety: data.prefers_variety ?? data.prefersVariety ?? true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('workout_preferences')
      .upsert(workoutPreferencesData, { onConflict: 'user_id' });

    if (error) {
      console.error('[SyncEngine] Failed to sync workout preferences:', error.message);
      throw new Error(`Failed to sync workout preferences: ${error.message}`);
    }

    console.log('[SyncEngine] Workout preferences synced successfully');
  }

  /**
   * Sync advanced review to advanced_review table
   */
  async syncAdvancedReview(userId: string, data: any): Promise<void> {
    console.log('[SyncEngine] Syncing advanced review...');

    const advancedReviewData = {
      user_id: userId,
      // Calculated metrics
      calculated_bmi: data.calculated_bmi || data.calculatedBmi || null,
      calculated_bmr: data.calculated_bmr || data.calculatedBmr || null,
      calculated_tdee: data.calculated_tdee || data.calculatedTdee || null,
      metabolic_age: data.metabolic_age || data.metabolicAge || null,
      // Daily targets
      daily_calories: data.daily_calories || data.dailyCalories || null,
      daily_protein_g: data.daily_protein_g || data.dailyProteinG || null,
      daily_carbs_g: data.daily_carbs_g || data.dailyCarbsG || null,
      daily_fat_g: data.daily_fat_g || data.dailyFatG || null,
      daily_water_ml: data.daily_water_ml || data.dailyWaterMl || null,
      daily_fiber_g: data.daily_fiber_g || data.dailyFiberG || null,
      // Weight targets
      healthy_weight_min: data.healthy_weight_min || data.healthyWeightMin || null,
      healthy_weight_max: data.healthy_weight_max || data.healthyWeightMax || null,
      weekly_weight_loss_rate: data.weekly_weight_loss_rate || data.weeklyWeightLossRate || null,
      estimated_timeline_weeks: data.estimated_timeline_weeks || data.estimatedTimelineWeeks || null,
      total_calorie_deficit: data.total_calorie_deficit || data.totalCalorieDeficit || null,
      // Body composition targets
      ideal_body_fat_min: data.ideal_body_fat_min || data.idealBodyFatMin || null,
      ideal_body_fat_max: data.ideal_body_fat_max || data.idealBodyFatMax || null,
      lean_body_mass: data.lean_body_mass || data.leanBodyMass || null,
      fat_mass: data.fat_mass || data.fatMass || null,
      // Fitness metrics
      estimated_vo2_max: data.estimated_vo2_max || data.estimatedVo2Max || null,
      vo2_max_estimate: data.vo2_max_estimate || data.vo2MaxEstimate || null,
      vo2_max_classification: data.vo2_max_classification || data.vo2MaxClassification || null,
      // Heart rate zones
      heart_rate_zones: data.heart_rate_zones || data.heartRateZones || null,
      target_hr_fat_burn_min: data.target_hr_fat_burn_min || data.targetHrFatBurnMin || null,
      target_hr_fat_burn_max: data.target_hr_fat_burn_max || data.targetHrFatBurnMax || null,
      target_hr_cardio_min: data.target_hr_cardio_min || data.targetHrCardioMin || null,
      target_hr_cardio_max: data.target_hr_cardio_max || data.targetHrCardioMax || null,
      target_hr_peak_min: data.target_hr_peak_min || data.targetHrPeakMin || null,
      target_hr_peak_max: data.target_hr_peak_max || data.targetHrPeakMax || null,
      // Workout recommendations
      recommended_workout_frequency: data.recommended_workout_frequency || data.recommendedWorkoutFrequency || null,
      recommended_cardio_minutes: data.recommended_cardio_minutes || data.recommendedCardioMinutes || null,
      recommended_strength_sessions: data.recommended_strength_sessions || data.recommendedStrengthSessions || null,
      // Health scores
      overall_health_score: data.overall_health_score || data.overallHealthScore || null,
      health_score: data.health_score || data.healthScore || null,
      health_grade: data.health_grade || data.healthGrade || null,
      diet_readiness_score: data.diet_readiness_score || data.dietReadinessScore || null,
      fitness_readiness_score: data.fitness_readiness_score || data.fitnessReadinessScore || null,
      goal_realistic_score: data.goal_realistic_score || data.goalRealisticScore || null,
      // Sleep metrics
      recommended_sleep_hours: data.recommended_sleep_hours || data.recommendedSleepHours || null,
      current_sleep_duration: data.current_sleep_duration || data.currentSleepDuration || null,
      sleep_efficiency_score: data.sleep_efficiency_score || data.sleepEfficiencyScore || null,
      // Data quality
      data_completeness_percentage: data.data_completeness_percentage || data.dataCompletenessPercentage || null,
      reliability_score: data.reliability_score || data.reliabilityScore || null,
      personalization_level: data.personalization_level || data.personalizationLevel || null,
      // Validation
      validation_status: data.validation_status || data.validationStatus || null,
      validation_errors: data.validation_errors || data.validationErrors || null,
      validation_warnings: data.validation_warnings || data.validationWarnings || null,
      // BMI details
      bmi_category: data.bmi_category || data.bmiCategory || null,
      bmi_health_risk: data.bmi_health_risk || data.bmiHealthRisk || null,
      bmi_cutoffs_used: data.bmi_cutoffs_used || data.bmiCutoffsUsed || null,
      // Advanced settings
      refeed_schedule: data.refeed_schedule || data.refeedSchedule || null,
      medical_adjustments: data.medical_adjustments || data.medicalAdjustments || null,
      // BMR formula details
      bmr_formula_used: data.bmr_formula_used || data.bmrFormulaUsed || null,
      bmr_formula_accuracy: data.bmr_formula_accuracy || data.bmrFormulaAccuracy || null,
      bmr_formula_confidence: data.bmr_formula_confidence || data.bmrFormulaConfidence || null,
      // Climate and ethnicity
      climate_used: data.climate_used || data.climateUsed || null,
      detected_climate: data.detected_climate || data.detectedClimate || null,
      climate_tdee_modifier: data.climate_tdee_modifier || data.climateTdeeModifier || null,
      climate_water_modifier: data.climate_water_modifier || data.climateWaterModifier || null,
      ethnicity_used: data.ethnicity_used || data.ethnicityUsed || null,
      detected_ethnicity: data.detected_ethnicity || data.detectedEthnicity || null,
      // Version
      calculations_version: data.calculations_version || data.calculationsVersion || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('advanced_review')
      .upsert(advancedReviewData, { onConflict: 'user_id' });

    if (error) {
      console.error('[SyncEngine] Failed to sync advanced review:', error.message);
      throw new Error(`Failed to sync advanced review: ${error.message}`);
    }

    console.log('[SyncEngine] Advanced review synced successfully');
  }

  // ============================================================================
  // LOAD FROM DATABASE
  // ============================================================================

  /**
   * Load all data from database for a user
   */
  async loadFromDatabase(userId: string): Promise<{
    personalInfo: any | null;
    dietPreferences: any | null;
    bodyAnalysis: any | null;
    workoutPreferences: any | null;
    advancedReview: any | null;
  }> {
    console.log(`[SyncEngine] Loading all data from database for user: ${userId}`);

    const result: {
      personalInfo: any | null;
      dietPreferences: any | null;
      bodyAnalysis: any | null;
      workoutPreferences: any | null;
      advancedReview: any | null;
    } = {
      personalInfo: null,
      dietPreferences: null,
      bodyAnalysis: null,
      workoutPreferences: null,
      advancedReview: null,
    };

    try {
      // Load personal info from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData && !profileError) {
        result.personalInfo = profileData;
        console.log('[SyncEngine] Loaded personal info');
      }

      // Load diet preferences
      const { data: dietData, error: dietError } = await supabase
        .from('diet_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (dietData && !dietError) {
        result.dietPreferences = dietData;
        console.log('[SyncEngine] Loaded diet preferences');
      }

      // Load body analysis
      const { data: bodyData, error: bodyError } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (bodyData && !bodyError) {
        result.bodyAnalysis = bodyData;
        console.log('[SyncEngine] Loaded body analysis');
      }

      // Load workout preferences
      const { data: workoutData, error: workoutError } = await supabase
        .from('workout_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (workoutData && !workoutError) {
        result.workoutPreferences = workoutData;
        console.log('[SyncEngine] Loaded workout preferences');
      }

      // Load advanced review
      const { data: advancedData, error: advancedError } = await supabase
        .from('advanced_review')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (advancedData && !advancedError) {
        result.advancedReview = advancedData;
        console.log('[SyncEngine] Loaded advanced review');
      }

      console.log('[SyncEngine] Database load complete');
      return result;
    } catch (error) {
      console.error('[SyncEngine] Failed to load from database:', error);
      throw error;
    }
  }

  // ============================================================================
  // STATUS
  // ============================================================================

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      userId: this.userId,
      queueLength: this.queue.length,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Cleanup listeners and resources
   */
  destroy(): void {
    console.log('[SyncEngine] Destroying...');

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.isInitialized = false;
    console.log('[SyncEngine] Destroyed');
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const syncEngine = new SyncEngine();
export { SyncEngine };
