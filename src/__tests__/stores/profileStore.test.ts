/**
 * Profile Store Tests
 * Comprehensive test suite for the unified ProfileStore
 */

import {
  useProfileStore,
  selectIsProfileComplete,
  selectProfileCompleteness,
  selectSyncInfo,
  selectPersonalInfo,
  selectDietPreferences,
  selectBodyAnalysis,
  selectWorkoutPreferences,
  selectAdvancedReview,
  getProfileStoreState,
  type ProfileState,
  type SyncStatus,
} from '../../stores/profileStore';

import type {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from '../../types/onboarding';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockPersonalInfo: PersonalInfoData = {
  first_name: 'John',
  last_name: 'Doe',
  age: 30,
  gender: 'male',
  country: 'USA',
  state: 'California',
  wake_time: '07:00',
  sleep_time: '23:00',
  occupation_type: 'desk_job',
};

const mockDietPreferences: DietPreferencesData = {
  diet_type: 'non-veg',
  allergies: ['peanuts'],
  restrictions: ['gluten-free'],
  keto_ready: false,
  intermittent_fasting_ready: true,
  paleo_ready: false,
  mediterranean_ready: true,
  low_carb_ready: false,
  high_protein_ready: true,
  breakfast_enabled: true,
  lunch_enabled: true,
  dinner_enabled: true,
  snacks_enabled: true,
  cooking_skill_level: 'intermediate',
  max_prep_time_minutes: 30,
  budget_level: 'medium',
  drinks_enough_water: true,
  limits_sugary_drinks: true,
  eats_regular_meals: true,
  avoids_late_night_eating: false,
  controls_portion_sizes: true,
  reads_nutrition_labels: true,
  eats_processed_foods: false,
  eats_5_servings_fruits_veggies: true,
  limits_refined_sugar: true,
  includes_healthy_fats: true,
  drinks_alcohol: false,
  smokes_tobacco: false,
  drinks_coffee: true,
  takes_supplements: true,
};

const mockBodyAnalysis: BodyAnalysisData = {
  height_cm: 180,
  current_weight_kg: 80,
  target_weight_kg: 75,
  target_timeline_weeks: 12,
  body_fat_percentage: 20,
  medical_conditions: [],
  medications: [],
  physical_limitations: [],
  pregnancy_status: false,
  breastfeeding_status: false,
};

const mockWorkoutPreferences: WorkoutPreferencesData = {
  location: 'gym',
  equipment: ['dumbbells', 'barbell'],
  time_preference: 60,
  intensity: 'intermediate',
  workout_types: ['strength', 'cardio'],
  primary_goals: ['muscle_gain', 'fat_loss'],
  activity_level: 'moderate',
  workout_experience_years: 3,
  workout_frequency_per_week: 4,
  can_do_pushups: 30,
  can_run_minutes: 30,
  flexibility_level: 'fair',
  preferred_workout_times: ['morning'],
  enjoys_cardio: true,
  enjoys_strength_training: true,
  enjoys_group_classes: false,
  prefers_outdoor_activities: true,
  needs_motivation: false,
  prefers_variety: true,
};

const mockAdvancedReview: AdvancedReviewData = {
  calculated_bmi: 24.7,
  calculated_bmr: 1800,
  calculated_tdee: 2500,
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 70,
  overall_health_score: 85,
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: Partial<ProfileState> = {
  personalInfo: null,
  dietPreferences: null,
  bodyAnalysis: null,
  workoutPreferences: null,
  advancedReview: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  syncError: null,
  isHydrated: false,
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('ProfileStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useProfileStore.getState().reset();
    jest.clearAllMocks();
  });

  // ============================================================================
  // INITIAL STATE TESTS
  // ============================================================================

  describe('Initial State', () => {
    it('should have correct initial state with all null values and syncStatus idle', () => {
      const state = useProfileStore.getState();

      expect(state.personalInfo).toBeNull();
      expect(state.dietPreferences).toBeNull();
      expect(state.bodyAnalysis).toBeNull();
      expect(state.workoutPreferences).toBeNull();
      expect(state.advancedReview).toBeNull();
      expect(state.syncStatus).toBe('idle');
      expect(state.lastSyncedAt).toBeNull();
      expect(state.syncError).toBeNull();
    });

    it('should have all required actions defined', () => {
      const state = useProfileStore.getState();

      expect(typeof state.updatePersonalInfo).toBe('function');
      expect(typeof state.updateDietPreferences).toBe('function');
      expect(typeof state.updateBodyAnalysis).toBe('function');
      expect(typeof state.updateWorkoutPreferences).toBe('function');
      expect(typeof state.updateAdvancedReview).toBe('function');
      expect(typeof state.setSyncStatus).toBe('function');
      expect(typeof state.hydrateFromLegacy).toBe('function');
      expect(typeof state.reset).toBe('function');
    });
  });

  // ============================================================================
  // UPDATE PERSONAL INFO TESTS
  // ============================================================================

  describe('updatePersonalInfo', () => {
    it('should set personal info data and mark sync status as pending', () => {
      const { updatePersonalInfo } = useProfileStore.getState();

      updatePersonalInfo(mockPersonalInfo);

      const state = useProfileStore.getState();
      expect(state.personalInfo).toEqual(mockPersonalInfo);
      expect(state.syncStatus).toBe('pending');
    });

    it('should merge partial updates with existing data', () => {
      const { updatePersonalInfo } = useProfileStore.getState();

      // First update with full data
      updatePersonalInfo(mockPersonalInfo);

      // Partial update
      updatePersonalInfo({ first_name: 'Jane', age: 25 });

      const state = useProfileStore.getState();
      expect(state.personalInfo?.first_name).toBe('Jane');
      expect(state.personalInfo?.age).toBe(25);
      expect(state.personalInfo?.last_name).toBe('Doe'); // Original value preserved
      expect(state.personalInfo?.gender).toBe('male'); // Original value preserved
    });

    it('should set data even when starting from null state', () => {
      const { updatePersonalInfo } = useProfileStore.getState();

      updatePersonalInfo({ first_name: 'Test' } as Partial<PersonalInfoData>);

      const state = useProfileStore.getState();
      expect(state.personalInfo?.first_name).toBe('Test');
    });
  });

  // ============================================================================
  // UPDATE DIET PREFERENCES TESTS
  // ============================================================================

  describe('updateDietPreferences', () => {
    it('should set diet preferences data and mark sync status as pending', () => {
      const { updateDietPreferences } = useProfileStore.getState();

      updateDietPreferences(mockDietPreferences);

      const state = useProfileStore.getState();
      expect(state.dietPreferences).toEqual(mockDietPreferences);
      expect(state.syncStatus).toBe('pending');
    });

    it('should merge partial updates with existing data', () => {
      const { updateDietPreferences } = useProfileStore.getState();

      // First update with full data
      updateDietPreferences(mockDietPreferences);

      // Partial update
      updateDietPreferences({ diet_type: 'vegetarian', keto_ready: true });

      const state = useProfileStore.getState();
      expect(state.dietPreferences?.diet_type).toBe('vegetarian');
      expect(state.dietPreferences?.keto_ready).toBe(true);
      expect(state.dietPreferences?.allergies).toEqual(['peanuts']); // Preserved
    });
  });

  // ============================================================================
  // UPDATE BODY ANALYSIS TESTS
  // ============================================================================

  describe('updateBodyAnalysis', () => {
    it('should set body analysis data and mark sync status as pending', () => {
      const { updateBodyAnalysis } = useProfileStore.getState();

      updateBodyAnalysis(mockBodyAnalysis);

      const state = useProfileStore.getState();
      expect(state.bodyAnalysis).toEqual(mockBodyAnalysis);
      expect(state.syncStatus).toBe('pending');
    });

    it('should merge partial updates with existing data', () => {
      const { updateBodyAnalysis } = useProfileStore.getState();

      // First update with full data
      updateBodyAnalysis(mockBodyAnalysis);

      // Partial update
      updateBodyAnalysis({ current_weight_kg: 78, body_fat_percentage: 18 });

      const state = useProfileStore.getState();
      expect(state.bodyAnalysis?.current_weight_kg).toBe(78);
      expect(state.bodyAnalysis?.body_fat_percentage).toBe(18);
      expect(state.bodyAnalysis?.height_cm).toBe(180); // Preserved
    });
  });

  // ============================================================================
  // UPDATE WORKOUT PREFERENCES TESTS
  // ============================================================================

  describe('updateWorkoutPreferences', () => {
    it('should set workout preferences data and mark sync status as pending', () => {
      const { updateWorkoutPreferences } = useProfileStore.getState();

      updateWorkoutPreferences(mockWorkoutPreferences);

      const state = useProfileStore.getState();
      expect(state.workoutPreferences).toEqual(mockWorkoutPreferences);
      expect(state.syncStatus).toBe('pending');
    });

    it('should merge partial updates with existing data', () => {
      const { updateWorkoutPreferences } = useProfileStore.getState();

      // First update with full data
      updateWorkoutPreferences(mockWorkoutPreferences);

      // Partial update
      updateWorkoutPreferences({ location: 'home', intensity: 'advanced' });

      const state = useProfileStore.getState();
      expect(state.workoutPreferences?.location).toBe('home');
      expect(state.workoutPreferences?.intensity).toBe('advanced');
      expect(state.workoutPreferences?.equipment).toEqual(['dumbbells', 'barbell']); // Preserved
    });
  });

  // ============================================================================
  // UPDATE ADVANCED REVIEW TESTS
  // ============================================================================

  describe('updateAdvancedReview', () => {
    it('should set advanced review data and mark sync status as pending', () => {
      const { updateAdvancedReview } = useProfileStore.getState();

      updateAdvancedReview(mockAdvancedReview);

      const state = useProfileStore.getState();
      expect(state.advancedReview).toEqual(mockAdvancedReview);
      expect(state.syncStatus).toBe('pending');
    });

    it('should merge partial updates with existing data', () => {
      const { updateAdvancedReview } = useProfileStore.getState();

      // First update with full data
      updateAdvancedReview(mockAdvancedReview);

      // Partial update
      updateAdvancedReview({ overall_health_score: 90, daily_calories: 2200 });

      const state = useProfileStore.getState();
      expect(state.advancedReview?.overall_health_score).toBe(90);
      expect(state.advancedReview?.daily_calories).toBe(2200);
      expect(state.advancedReview?.calculated_bmi).toBe(24.7); // Preserved
    });
  });

  // ============================================================================
  // SET SYNC STATUS TESTS
  // ============================================================================

  describe('setSyncStatus', () => {
    it('should correctly update sync status', () => {
      const { setSyncStatus } = useProfileStore.getState();

      const statuses: SyncStatus[] = ['idle', 'syncing', 'synced', 'error', 'pending'];

      statuses.forEach((status) => {
        setSyncStatus(status);
        expect(useProfileStore.getState().syncStatus).toBe(status);
      });
    });

    it('should set error message when provided', () => {
      const { setSyncStatus } = useProfileStore.getState();
      const errorMessage = 'Network connection failed';

      setSyncStatus('error', errorMessage);

      const state = useProfileStore.getState();
      expect(state.syncStatus).toBe('error');
      expect(state.syncError).toBe(errorMessage);
    });

    it('should clear error when setting status without error', () => {
      const { setSyncStatus } = useProfileStore.getState();

      // First set an error
      setSyncStatus('error', 'Some error');
      expect(useProfileStore.getState().syncError).toBe('Some error');

      // Then set a new status without error
      setSyncStatus('syncing');

      const state = useProfileStore.getState();
      expect(state.syncStatus).toBe('syncing');
      expect(state.syncError).toBeNull();
    });

    it('should update lastSyncedAt when status is synced', () => {
      const { setSyncStatus } = useProfileStore.getState();

      // Initially null
      expect(useProfileStore.getState().lastSyncedAt).toBeNull();

      // Set to synced
      const beforeSync = new Date().toISOString();
      setSyncStatus('synced');
      const afterSync = new Date().toISOString();

      const state = useProfileStore.getState();
      expect(state.lastSyncedAt).not.toBeNull();

      // Verify the timestamp is reasonable (between before and after)
      const syncedAt = new Date(state.lastSyncedAt!).getTime();
      expect(syncedAt).toBeGreaterThanOrEqual(new Date(beforeSync).getTime());
      expect(syncedAt).toBeLessThanOrEqual(new Date(afterSync).getTime());
    });

    it('should not update lastSyncedAt when status is not synced', () => {
      const { setSyncStatus } = useProfileStore.getState();

      // First sync to set a value
      setSyncStatus('synced');
      const firstSyncTime = useProfileStore.getState().lastSyncedAt;

      // Wait a tiny bit to ensure time difference
      const statuses: SyncStatus[] = ['idle', 'syncing', 'error', 'pending'];
      statuses.forEach((status) => {
        setSyncStatus(status);
        expect(useProfileStore.getState().lastSyncedAt).toBe(firstSyncTime);
      });
    });
  });

  // ============================================================================
  // HYDRATE FROM LEGACY TESTS
  // ============================================================================

  describe('hydrateFromLegacy', () => {
    it('should correctly merge legacy data into store', () => {
      const { hydrateFromLegacy } = useProfileStore.getState();

      const legacyData: Partial<ProfileState> = {
        personalInfo: mockPersonalInfo,
        dietPreferences: mockDietPreferences,
        bodyAnalysis: mockBodyAnalysis,
      };

      hydrateFromLegacy(legacyData);

      const state = useProfileStore.getState();
      expect(state.personalInfo).toEqual(mockPersonalInfo);
      expect(state.dietPreferences).toEqual(mockDietPreferences);
      expect(state.bodyAnalysis).toEqual(mockBodyAnalysis);
      expect(state.isHydrated).toBe(true);
      expect(state.syncStatus).toBe('pending');
    });

    it('should preserve existing data when legacy data is partial', () => {
      const { updatePersonalInfo, hydrateFromLegacy } = useProfileStore.getState();

      // Set initial data
      updatePersonalInfo(mockPersonalInfo);

      // Hydrate with only some sections
      hydrateFromLegacy({
        dietPreferences: mockDietPreferences,
      });

      const state = useProfileStore.getState();
      expect(state.personalInfo).toEqual(mockPersonalInfo); // Preserved
      expect(state.dietPreferences).toEqual(mockDietPreferences); // Added
    });

    it('should override existing data when legacy data is provided', () => {
      const { updatePersonalInfo, hydrateFromLegacy } = useProfileStore.getState();

      // Set initial data
      updatePersonalInfo(mockPersonalInfo);

      // Override with new legacy data
      const newPersonalInfo = { ...mockPersonalInfo, first_name: 'Legacy' };
      hydrateFromLegacy({
        personalInfo: newPersonalInfo,
      });

      const state = useProfileStore.getState();
      expect(state.personalInfo?.first_name).toBe('Legacy');
    });

    it('should set isHydrated to true after hydration', () => {
      const { hydrateFromLegacy } = useProfileStore.getState();

      expect(useProfileStore.getState().isHydrated).toBe(false);

      hydrateFromLegacy({});

      expect(useProfileStore.getState().isHydrated).toBe(true);
    });
  });

  // ============================================================================
  // RESET TESTS
  // ============================================================================

  describe('reset', () => {
    it('should clear all data back to initial state', () => {
      const {
        updatePersonalInfo,
        updateDietPreferences,
        updateBodyAnalysis,
        updateWorkoutPreferences,
        updateAdvancedReview,
        setSyncStatus,
        reset,
      } = useProfileStore.getState();

      // Populate all data
      updatePersonalInfo(mockPersonalInfo);
      updateDietPreferences(mockDietPreferences);
      updateBodyAnalysis(mockBodyAnalysis);
      updateWorkoutPreferences(mockWorkoutPreferences);
      updateAdvancedReview(mockAdvancedReview);
      setSyncStatus('synced');

      // Verify data is set
      let state = useProfileStore.getState();
      expect(state.personalInfo).not.toBeNull();
      expect(state.syncStatus).toBe('synced');
      expect(state.lastSyncedAt).not.toBeNull();

      // Reset
      reset();

      // Verify all cleared
      state = useProfileStore.getState();
      expect(state.personalInfo).toBeNull();
      expect(state.dietPreferences).toBeNull();
      expect(state.bodyAnalysis).toBeNull();
      expect(state.workoutPreferences).toBeNull();
      expect(state.advancedReview).toBeNull();
      expect(state.syncStatus).toBe('idle');
      expect(state.lastSyncedAt).toBeNull();
      expect(state.syncError).toBeNull();
      expect(state.isHydrated).toBe(false);
    });
  });

  // ============================================================================
  // SELECTOR TESTS
  // ============================================================================

  describe('Selectors', () => {
    describe('selectIsProfileComplete', () => {
      it('should return false when no sections have data', () => {
        const state = useProfileStore.getState();
        expect(selectIsProfileComplete(state)).toBe(false);
      });

      it('should return false when only some sections have data', () => {
        const { updatePersonalInfo, updateDietPreferences, updateBodyAnalysis } =
          useProfileStore.getState();

        updatePersonalInfo(mockPersonalInfo);
        updateDietPreferences(mockDietPreferences);
        updateBodyAnalysis(mockBodyAnalysis);

        const state = useProfileStore.getState();
        expect(selectIsProfileComplete(state)).toBe(false);
      });

      it('should return true when all 5 sections have data', () => {
        const {
          updatePersonalInfo,
          updateDietPreferences,
          updateBodyAnalysis,
          updateWorkoutPreferences,
          updateAdvancedReview,
        } = useProfileStore.getState();

        updatePersonalInfo(mockPersonalInfo);
        updateDietPreferences(mockDietPreferences);
        updateBodyAnalysis(mockBodyAnalysis);
        updateWorkoutPreferences(mockWorkoutPreferences);
        updateAdvancedReview(mockAdvancedReview);

        const state = useProfileStore.getState();
        expect(selectIsProfileComplete(state)).toBe(true);
      });
    });

    describe('selectProfileCompleteness', () => {
      it('should return 0 when no sections have data', () => {
        const state = useProfileStore.getState();
        expect(selectProfileCompleteness(state)).toBe(0);
      });

      it('should return 20 when 1 section has data', () => {
        const { updatePersonalInfo } = useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);

        const state = useProfileStore.getState();
        expect(selectProfileCompleteness(state)).toBe(20);
      });

      it('should return 40 when 2 sections have data', () => {
        const { updatePersonalInfo, updateDietPreferences } = useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);
        updateDietPreferences(mockDietPreferences);

        const state = useProfileStore.getState();
        expect(selectProfileCompleteness(state)).toBe(40);
      });

      it('should return 60 when 3 sections have data', () => {
        const { updatePersonalInfo, updateDietPreferences, updateBodyAnalysis } =
          useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);
        updateDietPreferences(mockDietPreferences);
        updateBodyAnalysis(mockBodyAnalysis);

        const state = useProfileStore.getState();
        expect(selectProfileCompleteness(state)).toBe(60);
      });

      it('should return 80 when 4 sections have data', () => {
        const {
          updatePersonalInfo,
          updateDietPreferences,
          updateBodyAnalysis,
          updateWorkoutPreferences,
        } = useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);
        updateDietPreferences(mockDietPreferences);
        updateBodyAnalysis(mockBodyAnalysis);
        updateWorkoutPreferences(mockWorkoutPreferences);

        const state = useProfileStore.getState();
        expect(selectProfileCompleteness(state)).toBe(80);
      });

      it('should return 100 when all 5 sections have data', () => {
        const {
          updatePersonalInfo,
          updateDietPreferences,
          updateBodyAnalysis,
          updateWorkoutPreferences,
          updateAdvancedReview,
        } = useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);
        updateDietPreferences(mockDietPreferences);
        updateBodyAnalysis(mockBodyAnalysis);
        updateWorkoutPreferences(mockWorkoutPreferences);
        updateAdvancedReview(mockAdvancedReview);

        const state = useProfileStore.getState();
        expect(selectProfileCompleteness(state)).toBe(100);
      });
    });

    describe('selectSyncInfo', () => {
      it('should return correct sync info', () => {
        const { setSyncStatus } = useProfileStore.getState();
        setSyncStatus('syncing');

        const state = useProfileStore.getState();
        const syncInfo = selectSyncInfo(state);

        expect(syncInfo.syncStatus).toBe('syncing');
        expect(syncInfo.lastSyncedAt).toBeNull();
        expect(syncInfo.syncError).toBeNull();
      });

      it('should include error when set', () => {
        const { setSyncStatus } = useProfileStore.getState();
        setSyncStatus('error', 'Test error message');

        const state = useProfileStore.getState();
        const syncInfo = selectSyncInfo(state);

        expect(syncInfo.syncStatus).toBe('error');
        expect(syncInfo.syncError).toBe('Test error message');
      });
    });

    describe('Individual section selectors', () => {
      it('selectPersonalInfo should return personalInfo', () => {
        const { updatePersonalInfo } = useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);

        const state = useProfileStore.getState();
        expect(selectPersonalInfo(state)).toEqual(mockPersonalInfo);
      });

      it('selectDietPreferences should return dietPreferences', () => {
        const { updateDietPreferences } = useProfileStore.getState();
        updateDietPreferences(mockDietPreferences);

        const state = useProfileStore.getState();
        expect(selectDietPreferences(state)).toEqual(mockDietPreferences);
      });

      it('selectBodyAnalysis should return bodyAnalysis', () => {
        const { updateBodyAnalysis } = useProfileStore.getState();
        updateBodyAnalysis(mockBodyAnalysis);

        const state = useProfileStore.getState();
        expect(selectBodyAnalysis(state)).toEqual(mockBodyAnalysis);
      });

      it('selectWorkoutPreferences should return workoutPreferences', () => {
        const { updateWorkoutPreferences } = useProfileStore.getState();
        updateWorkoutPreferences(mockWorkoutPreferences);

        const state = useProfileStore.getState();
        expect(selectWorkoutPreferences(state)).toEqual(mockWorkoutPreferences);
      });

      it('selectAdvancedReview should return advancedReview', () => {
        const { updateAdvancedReview } = useProfileStore.getState();
        updateAdvancedReview(mockAdvancedReview);

        const state = useProfileStore.getState();
        expect(selectAdvancedReview(state)).toEqual(mockAdvancedReview);
      });
    });
  });

  // ============================================================================
  // HELPER FUNCTION TESTS
  // ============================================================================

  describe('Helper Functions', () => {
    describe('getProfileStoreState', () => {
      it('should return current state', () => {
        const { updatePersonalInfo } = useProfileStore.getState();
        updatePersonalInfo(mockPersonalInfo);

        const state = getProfileStoreState();
        expect(state.personalInfo).toEqual(mockPersonalInfo);
      });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty object updates without errors', () => {
      const { updatePersonalInfo } = useProfileStore.getState();

      expect(() => updatePersonalInfo({})).not.toThrow();
    });

    it('should handle multiple rapid updates', () => {
      const { updatePersonalInfo } = useProfileStore.getState();

      for (let i = 0; i < 100; i++) {
        updatePersonalInfo({ first_name: `Name${i}` } as Partial<PersonalInfoData>);
      }

      const state = useProfileStore.getState();
      expect(state.personalInfo?.first_name).toBe('Name99');
    });

    it('should maintain data integrity after multiple operations', () => {
      const {
        updatePersonalInfo,
        updateDietPreferences,
        setSyncStatus,
        reset,
        hydrateFromLegacy,
      } = useProfileStore.getState();

      // Sequence of operations
      updatePersonalInfo(mockPersonalInfo);
      setSyncStatus('syncing');
      updateDietPreferences(mockDietPreferences);
      setSyncStatus('synced');
      reset();
      hydrateFromLegacy({ personalInfo: mockPersonalInfo });

      const state = useProfileStore.getState();
      expect(state.personalInfo).toEqual(mockPersonalInfo);
      expect(state.dietPreferences).toBeNull();
      expect(state.isHydrated).toBe(true);
      expect(state.syncStatus).toBe('pending');
    });
  });
});
