/**
 * DataBridge - Unified Data Access Layer
 *
 * UPDATED: January 2026 - SOURCE OF TRUTH CONSOLIDATION
 *
 * ============================================================================
 * SINGLE SOURCE OF TRUTH (SSOT) ARCHITECTURE
 * ============================================================================
 *
 * DATA FLOW:
 *   Supabase (remote) <---> DataBridge <---> ProfileStore (SSOT) <---> UI Components
 *
 * SSOT RULES:
 * 1. ProfileStore is the SINGLE SOURCE OF TRUTH for all onboarding profile data
 * 2. DataBridge handles all data transformation and sync logic
 * 3. All database operations go through onboardingService
 *
 * DATA FORMAT:
 * - Database/Supabase: snake_case (e.g., first_name, primary_goals)
 * - ProfileStore: snake_case (matches database for consistency)
 * - Legacy components: May use camelCase (use typeTransformers for conversion)
 *
 * STORES RESPONSIBILITY:
 * - profileStore: SSOT for personalInfo, dietPreferences, bodyAnalysis,
 *                 workoutPreferences, advancedReview (onboarding data)
 *
 * @see src/stores/profileStore.ts - SSOT for onboarding data
 * @see src/utils/typeTransformers.ts - snake_case/camelCase conversion utilities
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProfileStore } from "../stores/profileStore";
import { syncEngine } from "./SyncEngine";
import { offlineService } from "./offline/OfflineService";
import { resolveCurrentWeightForUser } from "./currentWeight";
import { weightTrackingService } from "./WeightTrackingService";
// Type transformation utilities for snake_case/camelCase conversion
// Use these at API boundaries when dealing with legacy components
import { toDbFormat, normalizeToSnakeCase } from "../utils/typeTransformers";
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
} from "./onboardingService";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../types/onboarding";
import {
  PersonalInfo,
  DietPreferences,
  WorkoutPreferences,
} from "../types/profileData";

// ============================================================================
// TYPES
// ============================================================================

interface DataBridgeConfig {
  USE_NEW_SYSTEM: boolean;
  SHADOW_MODE: boolean;
}

interface ShadowModeDiscrepancy {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

interface ShadowModeReport {
  discrepancies: ShadowModeDiscrepancy[];
  oldSystemData: AllDataResult | null;
  newSystemData: AllDataResult | null;
  comparisonTimestamp: string;
  isConsistent: boolean;
}

interface AllDataResult {
  personalInfo: PersonalInfoData | PersonalInfo | null;
  dietPreferences: DietPreferencesData | DietPreferences | null;
  bodyAnalysis: BodyAnalysisData | any | null;
  workoutPreferences: WorkoutPreferencesData | WorkoutPreferences | null;
  advancedReview: AdvancedReviewData | any | null;
  source: "old_system" | "new_system" | "merged" | "local" | "database";
  failedSections?: string[];
}

interface SaveResult {
  success: boolean;
  oldSystemSuccess?: boolean;
  newSystemSuccess?: boolean;
  errors: string[];
}

interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
  oldSystemMigration?: any;
  newSystemMigration?: any;
  // NEW: Track local vs remote sync separately for 100% sync precision
  localSyncKeys?: string[];
  remoteSyncKeys?: string[];
}

// Storage keys
const ONBOARDING_DATA_KEY = "onboarding_data";
const WORKOUT_SESSIONS_KEY = "workout_sessions";
const MEAL_LOGS_KEY = "meal_logs";
const BODY_ANALYSIS_KEY = "body_analysis";
const LEGACY_BODY_MEASUREMENTS_KEY = "body_measurements";

// ============================================================================
// DATA BRIDGE CLASS - UNIFIED NEW ARCHITECTURE
// ============================================================================

class DataBridge {
  private static instance: DataBridge;
  private static loadPromise: Promise<AllDataResult> | null = null;
  private currentUserId: string | null = null;
  private isOnline: boolean = true;
  private isInitialized: boolean = false;

  // Configuration - NEW SYSTEM ONLY (old system removed)
  private config: DataBridgeConfig = {
    USE_NEW_SYSTEM: true,
    SHADOW_MODE: false,
  };

  private constructor() {}

  static getInstance(): DataBridge {
    if (!DataBridge.instance) {
      DataBridge.instance = new DataBridge();
    }
    return DataBridge.instance;
  }

  // ============================================================================
  // CONFIGURATION METHODS (kept for backward compatibility)
  // ============================================================================

  switchToNewSystem(): void {
    this.config.USE_NEW_SYSTEM = true;
  }

  switchToOldSystem(): void {
    this.config.USE_NEW_SYSTEM = false;
  }

  setShadowMode(enabled: boolean): void {
    this.config.SHADOW_MODE = enabled;
  }

  getConfig(): DataBridgeConfig {
    return { ...this.config };
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
    syncEngine.setUserId(userId);
  }

  getUserId(): string | null {
    return this.currentUserId;
  }

  isGuest(): boolean {
    return !this.currentUserId;
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const profileStore = useProfileStore.getState();
      if (
        profileStore.isHydrated ||
        profileStore.personalInfo ||
        profileStore.dietPreferences ||
        profileStore.bodyAnalysis ||
        profileStore.workoutPreferences ||
        profileStore.advancedReview
      ) {
        this.isInitialized = true;
        return;
      }

      // Load any persisted data into ProfileStore
      const data = await this.loadFromLocal();
      if (
        data.personalInfo ||
        data.dietPreferences ||
        data.bodyAnalysis ||
        data.workoutPreferences ||
        data.advancedReview
      ) {
        profileStore.hydrateFromLegacy({
          personalInfo: data.personalInfo as PersonalInfoData | null,
          dietPreferences: data.dietPreferences as DietPreferencesData | null,
          bodyAnalysis: data.bodyAnalysis as BodyAnalysisData | null,
          workoutPreferences:
            data.workoutPreferences as WorkoutPreferencesData | null,
          advancedReview: data.advancedReview as AdvancedReviewData | null,
        });
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("[DataBridge] Initialization error:", error);
      this.isInitialized = true; // Mark as initialized even on error to prevent loops
    }
  }

  // ============================================================================
  // LOAD ALL DATA
  // ============================================================================

  async loadAllData(userId?: string, options?: { forceRefresh?: boolean }): Promise<AllDataResult> {
    // Bug 2 fix: skip DB fetch entirely if the store is already hydrated (idempotency guard).
    // initialize() already has this check; loadAllData must mirror it so sequential callers
    // don't trigger a redundant Supabase round-trip and a second hydrateFromLegacy call.
    // When forceRefresh is true, bypass the cache to fetch fresh data from the server.
    const profileStoreState = useProfileStore.getState();
    if (profileStoreState.isHydrated && !options?.forceRefresh) {
      return {
        personalInfo: profileStoreState.personalInfo,
        dietPreferences: profileStoreState.dietPreferences,
        bodyAnalysis: profileStoreState.bodyAnalysis,
        workoutPreferences: profileStoreState.workoutPreferences,
        advancedReview: profileStoreState.advancedReview,
        source: "local",
      };
    }

    // AUDIT fix: deduplicate concurrent calls — if a load is already in flight,
    // wait for the same promise instead of returning stale store state.
    if (DataBridge.loadPromise) {
      return DataBridge.loadPromise;
    }

    // Start the actual load and share the promise with concurrent callers
    DataBridge.loadPromise = this._doLoadAllData(userId);
    try {
      return await DataBridge.loadPromise;
    } finally {
      DataBridge.loadPromise = null;
    }
  }

  private async _doLoadAllData(userId?: string): Promise<AllDataResult> {
    const targetUserId = userId || this.currentUserId;

    try {
      if (!targetUserId) {
        // AUDIT fix: guest users also get syncStatus updates so UI shows consistent state.
        const guestProfileStore = useProfileStore.getState();
        guestProfileStore.setSyncStatus("syncing");
        const localResult = await this.loadFromLocal();
        guestProfileStore.setSyncStatus("synced");
        return localResult;
      }
      return await this.loadFromDatabase(targetUserId);
    } catch (error) {
      console.error("[DataBridge] loadAllData error:", error);
      const profileStore = useProfileStore.getState();
      profileStore.setSyncStatus(
        "error",
        "Cloud load failed. Showing local data instead.",
      );
      const localData = await this.loadFromLocal();
      return {
        ...localData,
        source: "local",
      };
    }
  }

  private async loadFromLocal(): Promise<AllDataResult> {
    try {
      // Check ProfileStore first
      const profileStore = useProfileStore.getState();
      if (profileStore.personalInfo) {
        return {
          personalInfo: profileStore.personalInfo,
          dietPreferences: profileStore.dietPreferences,
          bodyAnalysis: profileStore.bodyAnalysis,
          workoutPreferences: profileStore.workoutPreferences,
          advancedReview: profileStore.advancedReview,
          source: "local",
        };
      }

      // Fallback to AsyncStorage (onboarding_data key)
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        return {
          personalInfo: data.personalInfo || null,
          dietPreferences: data.dietPreferences || null,
          bodyAnalysis: data.bodyAnalysis || null,
          workoutPreferences: data.workoutPreferences || null,
          advancedReview: data.advancedReview || null,
          source: "local",
        };
      }

      return {
        personalInfo: null,
        dietPreferences: null,
        bodyAnalysis: null,
        workoutPreferences: null,
        advancedReview: null,
        source: "local",
      };
    } catch (error) {
      console.error("[DataBridge] loadFromLocal error:", error);
      return {
        personalInfo: null,
        dietPreferences: null,
        bodyAnalysis: null,
        workoutPreferences: null,
        advancedReview: null,
        source: "local",
      };
    }
  }

  private async loadFromDatabase(userId: string): Promise<AllDataResult> {
    try {
      // Bug 3 fix: distinguish fetch failures from empty rows by tracking which sections threw.
      const failedSections: string[] = [];
      const [
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences,
        advancedReview,
      ] = await Promise.all([
        PersonalInfoService.load(userId).catch((e) => {
          console.error("Failed to load personalInfo:", e);
          failedSections.push("personalInfo");
          return null;
        }),
        DietPreferencesService.load(userId).catch((e) => {
          console.error("Failed to load dietPreferences:", e);
          failedSections.push("dietPreferences");
          return null;
        }),
        BodyAnalysisService.load(userId).catch((e) => {
          console.error("Failed to load bodyAnalysis:", e);
          failedSections.push("bodyAnalysis");
          return null;
        }),
        WorkoutPreferencesService.load(userId).catch((e) => {
          console.error("Failed to load workoutPreferences:", e);
          failedSections.push("workoutPreferences");
          return null;
        }),
        AdvancedReviewService.load(userId).catch((e) => {
          console.error("Failed to load advancedReview:", e);
          failedSections.push("advancedReview");
          return null;
        }),
      ]);
      const resolvedCurrentWeight = bodyAnalysis
        ? await resolveCurrentWeightForUser(userId, {
            bodyAnalysisWeight: bodyAnalysis.current_weight_kg,
          })
        : null;
      const canonicalBodyAnalysis =
        bodyAnalysis && resolvedCurrentWeight?.value != null
          ? {
              ...bodyAnalysis,
              current_weight_kg:
                resolvedCurrentWeight.value ?? bodyAnalysis.current_weight_kg,
            }
          : bodyAnalysis;
      // BUG-53 fix: removed auto-save of full body_analysis on weight mismatch.
      // Auto-saving re-persists stale null fields (bmi, bmr) and can overwrite newer server data.
      // Weight reconciliation should happen via explicit user actions only.

      // Update ProfileStore with loaded data (SSOT for onboarding data)
      // BUG-60 fix: mark as "syncing" before batch updates so SyncEngine doesn't push
      // partially-loaded state, then mark "synced" when all updates are committed.
      // AUDIT fix: collect all loaded data first, then apply in a single atomic
      // hydrateFromLegacy() call so the store is never in a partially-loaded state.
      const profileStore = useProfileStore.getState();
      profileStore.setSyncStatus("syncing");
      const batchUpdate: Parameters<typeof profileStore.hydrateFromLegacy>[0] = {};
      if (personalInfo) batchUpdate.personalInfo = personalInfo as PersonalInfoData;
      if (dietPreferences) batchUpdate.dietPreferences = dietPreferences as DietPreferencesData;
      if (canonicalBodyAnalysis) batchUpdate.bodyAnalysis = canonicalBodyAnalysis as BodyAnalysisData;
      if (workoutPreferences) batchUpdate.workoutPreferences = workoutPreferences as WorkoutPreferencesData;
      if (advancedReview) batchUpdate.advancedReview = advancedReview as AdvancedReviewData;
      // Bug 1 fix: call hydrateFromLegacy unconditionally so isHydrated is always set to true,
      // even for brand-new users where every section returns null (empty batchUpdate).
      // Downstream hooks gate on isHydrated; skipping the call causes an infinite wait loop.
      // Offline-queue guard: skip hydration if local edits are queued but not yet synced,
      // to avoid overwriting newer in-flight data with stale server values.
      // TODO: This guard is overbroad — skips ALL hydration if ANY offline action is pending,
      // even for unrelated tables (meal_logs, workout_sessions). Should filter by profile-related
      // tables only (personal_info, diet_preferences, body_analysis, workout_preferences, advanced_review).
      if (offlineService.hasPendingActions()) {
        console.error('[DataBridge] Skipping hydration: offline queue has pending actions — this may cause empty profile screens if only non-profile tables are queued');
        profileStore.setSyncStatus("synced");
      } else {
        profileStore.hydrateFromLegacy(batchUpdate);
        profileStore.setSyncStatus("synced");
      }
      if (resolvedCurrentWeight?.value != null) {
        weightTrackingService.setWeight(resolvedCurrentWeight.value);
      }

      // NOTE: profileStore is the SSOT for all onboarding/profile data

      return {
        personalInfo,
        dietPreferences,
        bodyAnalysis: canonicalBodyAnalysis,
        workoutPreferences,
        advancedReview,
        source: "database",
        ...(failedSections.length > 0 && { failedSections }),
      };
    } catch (error) {
      console.error("[DataBridge] loadFromDatabase error:", error);
      const profileStore = useProfileStore.getState();
      profileStore.setSyncStatus(
        "error",
        "Cloud load failed. Showing local data instead.",
      );
      const localData = await this.loadFromLocal();
      return {
        ...localData,
        source: "local",
      };
    }
  }

  // ============================================================================
  // INDIVIDUAL LOAD METHODS (for backward compatibility)
  // ============================================================================

  async loadPersonalInfo(
    userId?: string,
  ): Promise<PersonalInfoData | PersonalInfo | null> {
    const data = await this.loadAllData(userId);
    return data.personalInfo;
  }

  async loadDietPreferences(
    userId?: string,
  ): Promise<DietPreferencesData | DietPreferences | null> {
    const data = await this.loadAllData(userId);
    return data.dietPreferences;
  }

  async loadBodyAnalysis(userId?: string): Promise<BodyAnalysisData | null> {
    const data = await this.loadAllData(userId);
    return data.bodyAnalysis;
  }

  async loadWorkoutPreferences(
    userId?: string,
  ): Promise<WorkoutPreferencesData | WorkoutPreferences | null> {
    const data = await this.loadAllData(userId);
    return data.workoutPreferences;
  }

  async loadAdvancedReview(
    userId?: string,
  ): Promise<AdvancedReviewData | null> {
    const data = await this.loadAllData(userId);
    return data.advancedReview;
  }

  // Alias for backward compatibility (fitnessGoals maps to workoutPreferences)
  async loadFitnessGoals(
    userId?: string,
  ): Promise<WorkoutPreferencesData | WorkoutPreferences | null> {
    return this.loadWorkoutPreferences(userId);
  }

  async saveFitnessGoals(
    data: WorkoutPreferencesData | WorkoutPreferences,
    userId?: string,
  ): Promise<SaveResult> {
    return this.saveWorkoutPreferences(data, userId);
  }

  // ============================================================================
  // SAVE METHODS
  // ============================================================================

  async savePersonalInfo(
    data: PersonalInfoData | PersonalInfo,
    userId?: string,
  ): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;

    const result: SaveResult = {
      success: true,
      errors: [],
      newSystemSuccess: true,
    };

    try {
      // Update ProfileStore (LOCAL SYNC - SSOT for onboarding data)
      const profileStore = useProfileStore.getState();
      profileStore.updatePersonalInfo(data as PersonalInfoData);

      // Save to database if authenticated (REMOTE SYNC)
      if (targetUserId) {
        try {
          const dbSuccess = await PersonalInfoService.save(
            targetUserId,
            data as PersonalInfoData,
          );
          result.newSystemSuccess = dbSuccess;
          if (!dbSuccess) {
            console.warn(
              "[DataBridge] personalInfo DB save failed - queueing for retry",
            );
            // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
            syncEngine.queueOperation("personalInfo", data);
          }
        } catch (dbError) {
          console.error("[DataBridge] personalInfo DB error:", dbError);
          result.newSystemSuccess = false;
          // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
          syncEngine.queueOperation("personalInfo", data);
        }
      } else {
        await this.saveToLocal("personalInfo", data);
      }

      // LOCAL sync always succeeds - don't fail just because remote failed
      result.success = true;
      return result;
    } catch (error) {
      console.error("[DataBridge] savePersonalInfo error:", error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveDietPreferences(
    data: DietPreferencesData | DietPreferences,
    userId?: string,
  ): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;

    const result: SaveResult = {
      success: true,
      errors: [],
      newSystemSuccess: true,
    };

    try {
      // Update ProfileStore (LOCAL SYNC - always succeeds)
      const profileStore = useProfileStore.getState();
      profileStore.updateDietPreferences(data as DietPreferencesData);

      // Save to database if authenticated (REMOTE SYNC)
      if (targetUserId) {
        try {
          const dbSuccess = await DietPreferencesService.save(
            targetUserId,
            data as DietPreferencesData,
          );
          result.newSystemSuccess = dbSuccess;
          if (!dbSuccess) {
            console.warn(
              "[DataBridge] dietPreferences DB save failed - queueing for retry",
            );
            // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
            syncEngine.queueOperation("dietPreferences", data);
          }
        } catch (dbError) {
          console.error("[DataBridge] dietPreferences DB error:", dbError);
          result.newSystemSuccess = false;
          // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
          syncEngine.queueOperation("dietPreferences", data);
        }
      } else {
        await this.saveToLocal("dietPreferences", data);
      }

      // LOCAL sync always succeeds - don't fail just because remote failed
      result.success = true;
      return result;
    } catch (error) {
      console.error("[DataBridge] saveDietPreferences error:", error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveBodyAnalysis(
    data: BodyAnalysisData,
    userId?: string,
  ): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;

    const result: SaveResult = {
      success: true,
      errors: [],
      newSystemSuccess: true,
    };

    try {
      // Update ProfileStore (LOCAL SYNC - always succeeds)
      const profileStore = useProfileStore.getState();
      profileStore.updateBodyAnalysis(data);

      // Save to database if authenticated (REMOTE SYNC)
      if (targetUserId) {
        try {
          const dbSuccess = await BodyAnalysisService.save(targetUserId, data);
          result.newSystemSuccess = dbSuccess;
          if (!dbSuccess) {
            console.warn(
              "[DataBridge] bodyAnalysis DB save failed - queueing for retry",
            );
            // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
            syncEngine.queueOperation("bodyAnalysis", data);
          }
        } catch (dbError) {
          console.error("[DataBridge] bodyAnalysis DB error:", dbError);
          result.newSystemSuccess = false;
          // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
          syncEngine.queueOperation("bodyAnalysis", data);
        }
      } else {
        await this.saveToLocal("bodyAnalysis", data);
      }

      // LOCAL sync always succeeds - don't fail just because remote failed
      result.success = true;
      return result;
    } catch (error) {
      console.error("[DataBridge] saveBodyAnalysis error:", error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveWorkoutPreferences(
    data: WorkoutPreferencesData | WorkoutPreferences,
    userId?: string,
  ): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;

    const result: SaveResult = {
      success: true,
      errors: [],
      newSystemSuccess: true,
    };

    try {
      // Update ProfileStore (LOCAL SYNC - always succeeds)
      const profileStore = useProfileStore.getState();
      profileStore.updateWorkoutPreferences(data as WorkoutPreferencesData);

      // Save to database if authenticated (REMOTE SYNC)
      if (targetUserId) {
        try {
          const dbSuccess = await WorkoutPreferencesService.save(
            targetUserId,
            data as WorkoutPreferencesData,
          );
          result.newSystemSuccess = dbSuccess;
          if (!dbSuccess) {
            console.warn(
              "[DataBridge] workoutPreferences DB save failed - queueing for retry",
            );
            // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
            syncEngine.queueOperation("workoutPreferences", data);
          }
        } catch (dbError) {
          console.error("[DataBridge] workoutPreferences DB error:", dbError);
          result.newSystemSuccess = false;
          // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
          syncEngine.queueOperation("workoutPreferences", data);
        }
      } else {
        await this.saveToLocal("workoutPreferences", data);
      }

      // LOCAL sync always succeeds - don't fail just because remote failed
      result.success = true;
      return result;
    } catch (error) {
      console.error("[DataBridge] saveWorkoutPreferences error:", error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveAdvancedReview(
    data: AdvancedReviewData,
    userId?: string,
  ): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;

    const result: SaveResult = {
      success: true,
      errors: [],
      newSystemSuccess: true,
    };

    try {
      // Update ProfileStore (LOCAL SYNC - always succeeds)
      const profileStore = useProfileStore.getState();
      profileStore.updateAdvancedReview(data);

      // Save to database if authenticated (REMOTE SYNC)
      if (targetUserId) {
        try {
          const dbSuccess = await AdvancedReviewService.save(
            targetUserId,
            data,
          );
          result.newSystemSuccess = dbSuccess;
          if (!dbSuccess) {
            console.warn(
              "[DataBridge] advancedReview DB save failed - queueing for retry",
            );
            // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
            syncEngine.queueOperation("advancedReview", data);
          }
        } catch (dbError) {
          console.error("[DataBridge] advancedReview DB error:", dbError);
          result.newSystemSuccess = false;
          // TODO: syncMutex.withLock() should wrap queue operations to prevent double-sync
          syncEngine.queueOperation("advancedReview", data);
        }
      } else {
        await this.saveToLocal("advancedReview", data);
      }

      // LOCAL sync always succeeds - don't fail just because remote failed
      result.success = true;
      return result;
    } catch (error) {
      console.error("[DataBridge] saveAdvancedReview error:", error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  // ============================================================================
  // MIGRATION METHODS
  // ============================================================================

  /**
   * Transform old onboarding format to new database format
   * Handles nested structures like bodyAnalysis.measurements
   */
  private transformBodyAnalysisForDB(data: any): BodyAnalysisData {
    // Check if data is in old format (nested measurements)
    if (data.measurements) {
      const transformed: any = {
        height_cm: data.measurements.height || data.measurements.height_cm,
        current_weight_kg:
          data.measurements.weight || data.measurements.current_weight_kg,
        target_weight_kg:
          data.measurements.targetWeight ||
          data.measurements.target_weight_kg ||
          data.measurements.weight,
        target_timeline_weeks:
          data.measurements.targetTimeline ||
          data.measurements.target_timeline_weeks ||
          12,
        body_fat_percentage:
          data.measurements.bodyFat || data.measurements.body_fat_percentage,
        waist_cm: data.measurements.waist || data.measurements.waist_cm,
        hip_cm: data.measurements.hips || data.measurements.hip_cm,
        chest_cm: data.measurements.chest || data.measurements.chest_cm,
        medical_conditions:
          data.medicalConditions || data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations:
          data.physicalLimitations || data.physical_limitations || [],
        pregnancy_status:
          data.pregnancyStatus || data.pregnancy_status || false,
        breastfeeding_status:
          data.breastfeedingStatus || data.breastfeeding_status || false,
        stress_level: data.stressLevel || data.stress_level || null,
      };

      // Handle photos
      if (data.photos) {
        transformed.front_photo_url = data.photos.front || null;
        transformed.side_photo_url = data.photos.side || null;
        transformed.back_photo_url = data.photos.back || null;
      }

      // Handle AI analysis
      if (data.aiAnalysis) {
        transformed.ai_estimated_body_fat =
          data.aiAnalysis.estimatedBodyFat || null;
        transformed.ai_body_type = data.aiAnalysis.bodyType || null;
        transformed.ai_confidence_score = data.aiAnalysis.confidence || null;
      }

      return transformed as BodyAnalysisData;
    }

    // Data is already in correct format
    return data as BodyAnalysisData;
  }

  /**
   * Transform old workoutPreferences format to new database format
   */
  private transformWorkoutPreferencesForDB(data: any): WorkoutPreferencesData {
    // Map old field names to new ones
    const transformed: any = {
      location: data.location,
      equipment: data.equipment || [],
      time_preference: data.time_preference ?? data.timePreference ?? (() => {
        // Legacy fallback: parse numeric minutes from timeCommitment string (e.g. "30-45" -> 45)
        const tc = data.timeCommitment || data.time_commitment;
        if (!tc) return 30;
        if (typeof tc === 'number') return tc;
        if (tc === '60+') return 60;
        const rangeMatch = String(tc).match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) return parseInt(rangeMatch[2], 10);
        const single = String(tc).match(/(\d+)/);
        if (single) return parseInt(single[1], 10);
        return 30;
      })(),
      intensity:
        data.experience_level ||
        data.experienceLevel ||
        data.intensity ||
        "beginner",
      workout_types: data.workoutTypes || data.workout_types || [],
      primary_goals: data.primary_goals || data.primaryGoals || [],
      activity_level: data.activityLevel || data.activity_level || null,
      workout_experience_years:
        data.experienceYears || data.workout_experience_years || 0,
      workout_frequency_per_week:
        data.workoutsPerWeek || data.workout_frequency_per_week || 3,
      can_do_pushups: data.canDoPushups || data.can_do_pushups || 0,
      can_run_minutes: data.canRunMinutes || data.can_run_minutes || 0,
      flexibility_level:
        data.flexibilityLevel || data.flexibility_level || "fair",
      weekly_weight_loss_goal:
        data.weeklyWeightLossGoal || data.weekly_weight_loss_goal || null,
      preferred_workout_times:
        data.preferredWorkoutTimes || data.preferred_workout_times || [],
    };

    return transformed as WorkoutPreferencesData;
  }

  async migrateGuestToUser(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedKeys: [],
      errors: [],
      localSyncKeys: [],
      remoteSyncKeys: [],
    };

    try {
      // Step 1: Load all local guest data
      const localData = await this.loadFromLocal();
      const foundKeys = Object.keys(localData).filter(
        (k) => localData[k as keyof AllDataResult] && k !== "source",
      );

      if (foundKeys.length === 0) {
        return result;
      }

      // Step 2: Set the user ID
      this.setUserId(userId);

      // Helper function to migrate a data type
      const migrateDataType = async (
        key: string,
        data: any,
        saveFn: (data: any, userId: string) => Promise<SaveResult>,
        transform?: (data: any) => any,
      ) => {
        const dataToSave = transform ? transform(data) : data;
        const saveResult = await saveFn.call(this, dataToSave, userId);

        // ALWAYS add to migratedKeys if local sync worked (ProfileStore updated)
        // Local sync is considered successful if the method didn't throw
        result.migratedKeys.push(key);
        result.localSyncKeys!.push(key);

        // Track remote sync separately
        if (saveResult.newSystemSuccess === true) {
          result.remoteSyncKeys!.push(key);
        } else {
          console.warn(
            `[MIGRATION] ⚠️ ${key} REMOTE sync pending - will retry automatically`,
          );
          // Don't add to errors - it's queued for retry, not a failure
        }
      };

      // Step 3: Migrate personalInfo
      if (localData.personalInfo) {
        await migrateDataType(
          "personalInfo",
          localData.personalInfo,
          this.savePersonalInfo,
        );
      }

      // Step 4: Migrate dietPreferences
      if (localData.dietPreferences) {
        await migrateDataType(
          "dietPreferences",
          localData.dietPreferences,
          this.saveDietPreferences,
        );
      }

      // Step 5: Migrate bodyAnalysis
      if (localData.bodyAnalysis) {
        await migrateDataType(
          "bodyAnalysis",
          localData.bodyAnalysis,
          this.saveBodyAnalysis,
          this.transformBodyAnalysisForDB.bind(this),
        );
      }

      // Step 6: Migrate workoutPreferences
      if (localData.workoutPreferences) {
        await migrateDataType(
          "workoutPreferences",
          localData.workoutPreferences,
          this.saveWorkoutPreferences,
          this.transformWorkoutPreferencesForDB.bind(this),
        );
      }

      // Step 7: Migrate advancedReview
      if (localData.advancedReview) {
        await migrateDataType(
          "advancedReview",
          localData.advancedReview,
          this.saveAdvancedReview,
        );
      }

      // Only clear guest data if ALL remote syncs succeeded
      const allRemoteSynced =
        result.remoteSyncKeys!.length === result.localSyncKeys!.length;
      if (allRemoteSynced) {
        await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
      } else {
      }

      // Migration is successful if local sync worked (data available in app)
      // Remote sync failures are handled by retry mechanism
      result.success = result.localSyncKeys!.length > 0;

      return result;
    } catch (error) {
      console.error("[MIGRATION] Critical error:", error);
      return {
        success: false,
        migratedKeys: result.migratedKeys,
        errors: [`Critical error: ${error}`],
        localSyncKeys: result.localSyncKeys,
        remoteSyncKeys: result.remoteSyncKeys,
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async hasLocalData(): Promise<boolean> {
    try {
      // Check ProfileStore
      const profileStore = useProfileStore.getState();
      if (profileStore.personalInfo || profileStore.dietPreferences) {
        return true;
      }

      // Check AsyncStorage
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        return !!(
          data.personalInfo ||
          data.dietPreferences ||
          data.bodyAnalysis
        );
      }

      return false;
    } catch (error) {
      console.error("[DataBridge] hasLocalData error:", error);
      return false;
    }
  }

  async getShadowModeReport(): Promise<ShadowModeReport> {
    // Shadow mode no longer available - return empty report
    return {
      discrepancies: [],
      oldSystemData: null,
      newSystemData: await this.loadAllData(),
      comparisonTimestamp: new Date().toISOString(),
      isConsistent: true,
    };
  }

  async clearLocalData(): Promise<void> {
    try {
      this.currentUserId = null;

      // Clear ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.reset();

      // Clear sync/offline state that can leak across shared devices
      await syncEngine.resetForLogout().catch((error) => {
        console.error(
          "[DataBridge] Failed to reset sync engine during clearLocalData:",
          error,
        );
      });

      // Clear AsyncStorage
      const keysToRemove = [
        ONBOARDING_DATA_KEY,
        WORKOUT_SESSIONS_KEY,
        MEAL_LOGS_KEY,
        BODY_ANALYSIS_KEY,
        LEGACY_BODY_MEASUREMENTS_KEY,
        "auth_session",
        "onboarding_completed",
        "profileEditIntent",
      ];

      try {
        const allKeys = await AsyncStorage.getAllKeys();
        for (const key of allKeys) {
          if (
            key.startsWith("onboarding_") ||
            key.startsWith("onboarding_partial_")
          ) {
            keysToRemove.push(key);
          }
        }
      } catch (error) {
        console.error(
          "[DataBridge] Failed to enumerate AsyncStorage keys during clearLocalData:",
          error,
        );
      }

      await Promise.all(
        Array.from(new Set(keysToRemove)).map((key) =>
          AsyncStorage.removeItem(key).catch((error) => {
            console.error(
              `[DataBridge] Failed to remove AsyncStorage key "${key}":`,
              error,
            );
          }),
        ),
      );
    } catch (error) {
      console.error("[DataBridge] clearLocalData error:", error);
    }
  }

  // Alias for backward compatibility
  async hasGuestDataForMigration(): Promise<boolean> {
    return this.hasLocalData();
  }

  // Alias for backward compatibility
  async migrateGuestDataToUser(userId: string): Promise<MigrationResult> {
    return this.migrateGuestToUser(userId);
  }

  // ============================================================================
  // ONBOARDING DATA METHODS (backward compatibility)
  // ============================================================================

  async storeOnboardingData(data: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        ONBOARDING_DATA_KEY,
        JSON.stringify({
          ...data,
          lastUpdatedAt: new Date().toISOString(),
        }),
      );

      // Also update ProfileStore
      const profileStore = useProfileStore.getState();
      if (data.personalInfo) profileStore.updatePersonalInfo(data.personalInfo);
      if (data.dietPreferences)
        profileStore.updateDietPreferences(data.dietPreferences);
      if (data.bodyAnalysis) profileStore.updateBodyAnalysis(data.bodyAnalysis);
      if (data.workoutPreferences)
        profileStore.updateWorkoutPreferences(data.workoutPreferences);
      if (data.advancedReview)
        profileStore.updateAdvancedReview(data.advancedReview);

      return true;
    } catch (error) {
      console.error("[DataBridge] storeOnboardingData error:", error);
      return false;
    }
  }

  async getOnboardingData(): Promise<any | null> {
    try {
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      return dataStr ? JSON.parse(dataStr) : null;
    } catch (error) {
      console.error("[DataBridge] getOnboardingData error:", error);
      return null;
    }
  }

  // ============================================================================
  // WORKOUT SESSIONS (backward compatibility)
  // ============================================================================

  async storeWorkoutSession(session: any): Promise<boolean> {
    try {
      const existingStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const id = session.id || Date.now().toString();
      const existingIndex = existing.findIndex((s: any) => s.id === id);
      const existingSession =
        existingIndex >= 0 ? existing[existingIndex] : null;
      const next = existing.filter((s: any) => s.id !== id);
      next.unshift({
        ...existingSession,
        ...session,
        id,
        createdAt:
          existingSession?.createdAt ||
          session.createdAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(
        WORKOUT_SESSIONS_KEY,
        JSON.stringify(next.slice(0, 100)),
      ); // Keep last 100
      return true;
    } catch (error) {
      console.error("[DataBridge] storeWorkoutSession error:", error);
      return false;
    }
  }

  async getWorkoutSessions(limit: number = 10): Promise<any[]> {
    try {
      const dataStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
      const sessions = dataStr ? JSON.parse(dataStr) : [];
      return sessions.slice(0, limit);
    } catch (error) {
      console.error("[DataBridge] getWorkoutSessions error:", error);
      return [];
    }
  }

  async updateWorkoutSession(
    sessionId: string,
    updates: any,
  ): Promise<boolean> {
    try {
      const dataStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
      const sessions = dataStr ? JSON.parse(dataStr) : [];
      const index = sessions.findIndex((s: any) => s.id === sessionId);
      if (index !== -1) {
        sessions[index] = {
          ...sessions[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          WORKOUT_SESSIONS_KEY,
          JSON.stringify(sessions),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("[DataBridge] updateWorkoutSession error:", error);
      return false;
    }
  }

  // ============================================================================
  // MEAL LOGS (backward compatibility)
  // ============================================================================

  async storeMealLog(mealLog: any): Promise<boolean> {
    try {
      const existingStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const id = mealLog.id || Date.now().toString();
      const existingIndex = existing.findIndex((log: any) => log.id === id);
      const existingLog = existingIndex >= 0 ? existing[existingIndex] : null;
      const next = existing.filter((log: any) => log.id !== id);
      next.unshift({
        ...existingLog,
        ...mealLog,
        id,
        createdAt:
          existingLog?.createdAt ||
          mealLog.createdAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(
        MEAL_LOGS_KEY,
        JSON.stringify(next.slice(0, 500)),
      );
      return true;
    } catch (error) {
      console.error("[DataBridge] storeMealLog error:", error);
      return false;
    }
  }

  async updateMealLog(logId: string, updates: any): Promise<boolean> {
    try {
      const existingStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const existingIndex = existing.findIndex((log: any) => log.id === logId);
      if (existingIndex === -1) {
        return false;
      }

      const existingLog = existing[existingIndex];
      const next = existing.filter((log: any) => log.id !== logId);
      next.unshift({
        ...existingLog,
        ...updates,
        id: logId,
        createdAt:
          existingLog.createdAt ||
          existingLog.loggedAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await AsyncStorage.setItem(
        MEAL_LOGS_KEY,
        JSON.stringify(next.slice(0, 500)),
      );
      return true;
    } catch (error) {
      console.error("[DataBridge] updateMealLog error:", error);
      return false;
    }
  }

  async getMealLogs(date?: string, limit: number = 50): Promise<any[]> {
    try {
      const dataStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
      let logs = dataStr ? JSON.parse(dataStr) : [];
      if (date) {
        logs = logs.filter(
          (log: any) =>
            log.date === date ||
            log.loggedAt?.startsWith(date) ||
            log.logged_at?.startsWith(date) ||
            log.createdAt?.startsWith(date),
        );
      }
      return logs.slice(0, limit);
    } catch (error) {
      console.error("[DataBridge] getMealLogs error:", error);
      return [];
    }
  }

  // ============================================================================
  // BODY MEASUREMENTS (backward compatibility)
  // ============================================================================

  async storeBodyMeasurement(measurement: any): Promise<boolean> {
    try {
      const legacyStr = await AsyncStorage.getItem(
        LEGACY_BODY_MEASUREMENTS_KEY,
      );
      const existingStr = await AsyncStorage.getItem(BODY_ANALYSIS_KEY);
      const existing = existingStr
        ? JSON.parse(existingStr)
        : legacyStr
          ? JSON.parse(legacyStr)
          : [];
      if (legacyStr && !existingStr) {
        await AsyncStorage.removeItem(LEGACY_BODY_MEASUREMENTS_KEY);
      }
      existing.unshift({
        ...measurement,
        id: measurement.id || Date.now().toString(),
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(
        BODY_ANALYSIS_KEY,
        JSON.stringify(existing.slice(0, 100)),
      );
      return true;
    } catch (error) {
      console.error("[DataBridge] storeBodyMeasurement error:", error);
      return false;
    }
  }

  async getBodyMeasurements(limit: number = 10): Promise<any[]> {
    try {
      const dataStr = await AsyncStorage.getItem(BODY_ANALYSIS_KEY);
      if (!dataStr) {
        const legacyStr = await AsyncStorage.getItem(
          LEGACY_BODY_MEASUREMENTS_KEY,
        );
        if (legacyStr) {
          await AsyncStorage.setItem(BODY_ANALYSIS_KEY, legacyStr);
          await AsyncStorage.removeItem(LEGACY_BODY_MEASUREMENTS_KEY);
          const measurements = JSON.parse(legacyStr);
          return measurements.slice(0, limit);
        }
        return [];
      }
      const measurements = JSON.parse(dataStr);
      return measurements.slice(0, limit);
    } catch (error) {
      console.error("[DataBridge] getBodyMeasurements error:", error);
      return [];
    }
  }

  // ============================================================================
  // EXPORT/IMPORT DATA (backward compatibility)
  // ============================================================================

  async exportAllData(): Promise<any> {
    try {
      const allData = await this.loadAllData();
      const workoutSessions = await this.getWorkoutSessions(100);
      const mealLogs = await this.getMealLogs(undefined, 500);
      const bodyMeasurements = await this.getBodyMeasurements(100);

      return {
        user: {
          personalInfo: allData.personalInfo,
          dietPreferences: allData.dietPreferences,
          workoutPreferences: allData.workoutPreferences,
        },
        fitness: {
          bodyAnalysis: allData.bodyAnalysis,
          workoutSessions,
        },
        nutrition: {
          mealLogs,
        },
        progress: {
          bodyMeasurements,
          advancedReview: allData.advancedReview,
        },
        exportedAt: new Date().toISOString(),
        version: "2.0",
      };
    } catch (error) {
      console.error("[DataBridge] exportAllData error:", error);
      return null;
    }
  }

  async getDataStatistics(): Promise<any> {
    try {
      const workoutSessions = await this.getWorkoutSessions(100);
      const mealLogs = await this.getMealLogs(undefined, 500);
      const bodyMeasurements = await this.getBodyMeasurements(100);

      return {
        workoutSessionsCount: workoutSessions.length,
        mealLogsCount: mealLogs.length,
        bodyMeasurementsCount: bodyMeasurements.length,
        hasPersonalInfo: !!(await this.loadPersonalInfo()),
        hasDietPreferences: !!(await this.loadDietPreferences()),
        hasWorkoutPreferences: !!(await this.loadWorkoutPreferences()),
      };
    } catch (error) {
      console.error("[DataBridge] getDataStatistics error:", error);
      return {};
    }
  }

  // ============================================================================
  // IMPORT DATA (backward compatibility)
  // ============================================================================

  async importData(data: any): Promise<boolean> {
    try {
      if (data.user) {
        if (data.user.personalInfo)
          await this.savePersonalInfo(data.user.personalInfo);
        if (data.user.dietPreferences)
          await this.saveDietPreferences(data.user.dietPreferences);
        if (data.user.workoutPreferences)
          await this.saveWorkoutPreferences(data.user.workoutPreferences);
      }
      if (data.fitness?.bodyAnalysis)
        await this.saveBodyAnalysis(data.fitness.bodyAnalysis);
      if (data.progress?.advancedReview)
        await this.saveAdvancedReview(data.progress.advancedReview);
      return true;
    } catch (error) {
      console.error("[DataBridge] importData error:", error);
      return false;
    }
  }

  async importAllData(data: any): Promise<boolean> {
    return this.importData(data);
  }

  async importUserData(data: any): Promise<boolean> {
    try {
      if (data.personalInfo) await this.savePersonalInfo(data.personalInfo);
      if (data.dietPreferences)
        await this.saveDietPreferences(data.dietPreferences);
      if (data.workoutPreferences)
        await this.saveWorkoutPreferences(data.workoutPreferences);
      return true;
    } catch (error) {
      console.error("[DataBridge] importUserData error:", error);
      return false;
    }
  }

  async importFitnessData(data: any): Promise<boolean> {
    try {
      if (data.bodyAnalysis) await this.saveBodyAnalysis(data.bodyAnalysis);
      if (data.workoutSessions) {
        for (const session of data.workoutSessions) {
          await this.storeWorkoutSession(session);
        }
      }
      return true;
    } catch (error) {
      console.error("[DataBridge] importFitnessData error:", error);
      return false;
    }
  }

  async importNutritionData(data: any): Promise<boolean> {
    try {
      if (data.mealLogs) {
        for (const log of data.mealLogs) {
          await this.storeMealLog(log);
        }
      }
      return true;
    } catch (error) {
      console.error("[DataBridge] importNutritionData error:", error);
      return false;
    }
  }

  async importProgressData(data: any): Promise<boolean> {
    try {
      if (data.bodyMeasurements) {
        for (const measurement of data.bodyMeasurements) {
          await this.storeBodyMeasurement(measurement);
        }
      }
      if (data.advancedReview)
        await this.saveAdvancedReview(data.advancedReview);
      return true;
    } catch (error) {
      console.error("[DataBridge] importProgressData error:", error);
      return false;
    }
  }

  // ============================================================================
  // USER PREFERENCES (backward compatibility)
  // ============================================================================

  async updateUserPreferences(preferences: any): Promise<boolean> {
    try {
      // Store in ProfileStore and local
      const profileStore = useProfileStore.getState();
      const current = profileStore.personalInfo || {};
      const updated = { ...current, ...preferences };
      profileStore.updatePersonalInfo(updated as PersonalInfoData);
      await this.saveToLocal("userPreferences", preferences);
      return true;
    } catch (error) {
      console.error("[DataBridge] updateUserPreferences error:", error);
      return false;
    }
  }

  async getUserPreferences(): Promise<any | null> {
    try {
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        return data.userPreferences || null;
      }
      return null;
    } catch (error) {
      console.error("[DataBridge] getUserPreferences error:", error);
      return null;
    }
  }

  // ============================================================================
  // STORAGE UTILITIES (backward compatibility)
  // ============================================================================

  async clearAllData(): Promise<void> {
    return this.clearLocalData();
  }

  async getStorageInfo(): Promise<any> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stats = await this.getDataStatistics();
      return {
        totalKeys: keys.length,
        ...stats,
      };
    } catch (error) {
      console.error("[DataBridge] getStorageInfo error:", error);
      return { totalKeys: 0 };
    }
  }

  async isQuotaExceeded(): Promise<boolean> {
    // AsyncStorage doesn't have a quota limit in the same way
    return false;
  }

  // ============================================================================
  // TEST/DEBUG UTILITIES (backward compatibility)
  // ============================================================================

  async testLocalStorageMethods(): Promise<{
    success: boolean;
    results: any[];
  }> {
    const results: any[] = [];
    try {
      // Test save
      const testData = { test: true, timestamp: Date.now() };
      await this.saveToLocal("testData", testData);
      results.push({ method: "saveToLocal", success: true });

      // Test load
      const loaded = await this.getOnboardingData();
      results.push({ method: "getOnboardingData", success: !!loaded });

      // Test hasLocalData
      const hasData = await this.hasLocalData();
      results.push({ method: "hasLocalData", success: true, hasData });

      return { success: true, results };
    } catch (error) {
      results.push({ method: "error", success: false, error: String(error) });
      return { success: false, results };
    }
  }

  async testMigrationDetection(): Promise<{
    hasData: boolean;
    dataTypes: string[];
  }> {
    const dataTypes: string[] = [];
    const data = await this.loadAllData();
    if (data.personalInfo) dataTypes.push("personalInfo");
    if (data.dietPreferences) dataTypes.push("dietPreferences");
    if (data.bodyAnalysis) dataTypes.push("bodyAnalysis");
    if (data.workoutPreferences) dataTypes.push("workoutPreferences");
    if (data.advancedReview) dataTypes.push("advancedReview");
    return { hasData: dataTypes.length > 0, dataTypes };
  }

  async createSampleProfileData(): Promise<boolean> {
    try {
      const samplePersonalInfo = {
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        age: 25,
        gender: "male" as const,
        country: "US",
        state: "CA",
      };
      await this.savePersonalInfo(samplePersonalInfo as unknown as PersonalInfo);
      return true;
    } catch (error) {
      console.error("[DataBridge] createSampleProfileData error:", error);
      return false;
    }
  }

  async getProfileDataSummary(): Promise<any> {
    const data = await this.loadAllData();
    return {
      hasPersonalInfo: !!data.personalInfo,
      hasDietPreferences: !!data.dietPreferences,
      hasBodyAnalysis: !!data.bodyAnalysis,
      hasWorkoutPreferences: !!data.workoutPreferences,
      hasAdvancedReview: !!data.advancedReview,
      source: data.source,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async saveToLocal(field: string, data: any): Promise<void> {
    try {
      const existingDataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};

      const updatedData = {
        ...existingData,
        [field]: data,
        lastUpdatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        ONBOARDING_DATA_KEY,
        JSON.stringify(updatedData),
      );
    } catch (error) {
      console.error(`[DataBridge] Failed to save ${field} to local:`, error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const dataBridge = DataBridge.getInstance();
export default dataBridge;
export { DataBridge };
export type {
  DataBridgeConfig,
  ShadowModeReport,
  AllDataResult,
  SaveResult,
  MigrationResult,
  ShadowModeDiscrepancy,
};
