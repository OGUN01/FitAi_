import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { 
  CompleteOnboardingData,
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  OnboardingProgressData,
  TabValidationResult,
} from '../types/onboarding';
import { supabase } from '../services/supabase';
import { PersonalInfoService, DietPreferencesService, BodyAnalysisService, WorkoutPreferencesService, AdvancedReviewService, OnboardingProgressService, OnboardingUtils } from '../services/onboardingService';
import { invalidateMetricsCache } from './useCalculatedMetrics';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingState {
  // Tab data
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
  
  // Progress tracking
  currentTab: number;
  completedTabs: Set<number>;
  tabValidationStatus: Record<number, TabValidationResult>;
  overallCompletion: number;
  
  // State flags
  isLoading: boolean;
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  
  // Error handling
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

interface OnboardingActions {
  // Tab navigation
  setCurrentTab: (tabNumber: number) => void;
  markTabCompleted: (tabNumber: number) => void;
  markTabIncomplete: (tabNumber: number) => void;
  
  // Data updates
  updatePersonalInfo: (data: Partial<PersonalInfoData>) => void;
  updateDietPreferences: (data: Partial<DietPreferencesData>) => void;
  updateBodyAnalysis: (data: Partial<BodyAnalysisData>) => void;
  updateWorkoutPreferences: (data: Partial<WorkoutPreferencesData>) => void;
  updateAdvancedReview: (data: Partial<AdvancedReviewData>) => void;
  
  // Validation
  validateTab: (tabNumber: number, currentData?: any) => TabValidationResult;
  validateAllTabs: () => Record<number, TabValidationResult>;
  
  // Persistence
  saveToDatabase: () => Promise<boolean>;
  loadFromDatabase: () => Promise<boolean>;
  saveToLocal: () => Promise<void>;
  loadFromLocal: () => Promise<void>;
  
  // Reset
  resetOnboarding: () => void;
  resetTab: (tabNumber: number) => void;
  
  // Completion
  completeOnboarding: () => Promise<boolean>;
  isOnboardingComplete: () => boolean;
  
  // Validation updates
  updateValidationStatus: () => Record<number, TabValidationResult>;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  ONBOARDING_DATA: 'onboarding_data',
  ONBOARDING_PROGRESS: 'onboarding_progress',
  PERSONAL_INFO: 'onboarding_personal_info',
  DIET_PREFERENCES: 'onboarding_diet_preferences',
  BODY_ANALYSIS: 'onboarding_body_analysis',
  WORKOUT_PREFERENCES: 'onboarding_workout_preferences',
  ADVANCED_REVIEW: 'onboarding_advanced_review',
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validatePersonalInfo = (data: PersonalInfoData | null): TabValidationResult => {
  return OnboardingUtils.validatePersonalInfo(data);
};

const validateDietPreferences = (data: DietPreferencesData | null): TabValidationResult => {
  return OnboardingUtils.validateDietPreferences(data);
};

const validateBodyAnalysis = (data: BodyAnalysisData | null): TabValidationResult => {
  return OnboardingUtils.validateBodyAnalysis(data);
};

const validateWorkoutPreferences = (data: WorkoutPreferencesData | null): TabValidationResult => {
  return OnboardingUtils.validateWorkoutPreferences(data);
};

const validateAdvancedReview = (data: AdvancedReviewData | null): TabValidationResult => {
  return OnboardingUtils.validateAdvancedReview(data);
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useOnboardingState = (): OnboardingState & OnboardingActions => {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [state, setState] = useState<OnboardingState>({
    personalInfo: null,
    dietPreferences: null,
    bodyAnalysis: null,
    workoutPreferences: null,
    advancedReview: null,
    currentTab: 1,
    completedTabs: new Set<number>(),
    tabValidationStatus: {},
    overallCompletion: 0,
    isLoading: false,
    isAutoSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    errors: {},
    warnings: {},
  });
  
  // Use a ref to track the latest state synchronously
  // CRITICAL: This ref MUST be updated inside setState callbacks, NOT in useEffect
  // useEffect runs asynchronously after render, causing race conditions when
  // completeOnboarding() is called immediately after state updates
  const stateRef = useRef(state);
  
  // Calculate overall completion percentage
  const calculateOverallCompletion = useCallback((
    personalInfo: PersonalInfoData | null,
    dietPreferences: DietPreferencesData | null,
    bodyAnalysis: BodyAnalysisData | null,
    workoutPreferences: WorkoutPreferencesData | null,
    advancedReview: AdvancedReviewData | null
  ): number => {
    const validations = [
      validatePersonalInfo(personalInfo),
      validateDietPreferences(dietPreferences),
      validateBodyAnalysis(bodyAnalysis),
      validateWorkoutPreferences(workoutPreferences),
      validateAdvancedReview(advancedReview),
    ];
    
    const totalCompletion = validations.reduce((sum, validation) => 
      sum + validation.completion_percentage, 0
    );
    
    return Math.round(totalCompletion / validations.length);
  }, []);
  
  // Update completion when data changes
  useEffect(() => {
    const completion = calculateOverallCompletion(
      state.personalInfo,
      state.dietPreferences,
      state.bodyAnalysis,
      state.workoutPreferences,
      state.advancedReview
    );

    // Use functional setState to avoid including state.overallCompletion in deps
    setState(prev => {
      if (completion !== prev.overallCompletion) {
        return { ...prev, overallCompletion: completion };
      }
      return prev; // Don't create new object if no change
    });
  }, [
    state.personalInfo,
    state.dietPreferences,
    state.bodyAnalysis,
    state.workoutPreferences,
    state.advancedReview,
    calculateOverallCompletion,
    // Removed state.overallCompletion from deps to prevent infinite loop
  ]);
  
  // Actions
  const setCurrentTab = useCallback((tabNumber: number) => {
    setState(prev => ({ ...prev, currentTab: tabNumber }));
  }, []);
  
  const markTabCompleted = useCallback((tabNumber: number) => {
    setState(prev => {
      const newCompletedTabs = new Set(prev.completedTabs);
      newCompletedTabs.add(tabNumber);
      return { ...prev, completedTabs: newCompletedTabs };
    });
  }, []);
  
  const markTabIncomplete = useCallback((tabNumber: number) => {
    setState(prev => {
      const newCompletedTabs = new Set(prev.completedTabs);
      newCompletedTabs.delete(tabNumber);
      return { ...prev, completedTabs: newCompletedTabs };
    });
  }, []);
  
  const updatePersonalInfo = useCallback((data: Partial<PersonalInfoData>) => {
    console.log('📝 [ONBOARDING] updatePersonalInfo called with data:', data);
    setState(prev => {
      console.log('📝 [ONBOARDING] Previous personalInfo:', prev.personalInfo);
      const newPersonalInfo = prev.personalInfo ? { ...prev.personalInfo, ...data } : data as PersonalInfoData;
      console.log('📝 [ONBOARDING] Merged personalInfo:', newPersonalInfo);

      // Update validation immediately with the new data
      const updatedState = {
        ...prev,
        personalInfo: newPersonalInfo,
        hasUnsavedChanges: true,
      };
      console.log('📝 [ONBOARDING] hasUnsavedChanges set to true');

      // Calculate validation with the new state
      const validationResults = {
        1: validatePersonalInfo(newPersonalInfo),
        2: validateDietPreferences(prev.dietPreferences),
        3: validateBodyAnalysis(prev.bodyAnalysis),
        4: validateWorkoutPreferences(prev.workoutPreferences),
        5: validateAdvancedReview(prev.advancedReview),
      };
      console.log('📝 [ONBOARDING] Tab 1 validation result:', validationResults[1]);

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      // Update ref synchronously so validation can read the latest data immediately
      stateRef.current = finalState;

      return finalState;
    });
  }, []);
  
  const updateDietPreferences = useCallback((data: Partial<DietPreferencesData>) => {
    console.log('📝 [ONBOARDING] updateDietPreferences called with data:', data);
    setState(prev => {
      console.log('📝 [ONBOARDING] Previous dietPreferences:', prev.dietPreferences);
      const newDietPreferences = prev.dietPreferences ? { ...prev.dietPreferences, ...data } : data as DietPreferencesData;
      console.log('📝 [ONBOARDING] Merged dietPreferences:', newDietPreferences);

      const updatedState = {
        ...prev,
        dietPreferences: newDietPreferences,
        hasUnsavedChanges: true,
      };
      console.log('📝 [ONBOARDING] hasUnsavedChanges set to true');

      // Calculate validation with the new state
      const validationResults = {
        1: validatePersonalInfo(updatedState.personalInfo),
        2: validateDietPreferences(newDietPreferences),
        3: validateBodyAnalysis(updatedState.bodyAnalysis),
        4: validateWorkoutPreferences(updatedState.workoutPreferences),
        5: validateAdvancedReview(updatedState.advancedReview),
      };
      console.log('📝 [ONBOARDING] Tab 2 validation result:', validationResults[2]);

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      // Update ref synchronously
      stateRef.current = finalState;

      return finalState;
    });
  }, []);
  
  const updateBodyAnalysis = useCallback((data: Partial<BodyAnalysisData>) => {
    console.log('📝 [ONBOARDING] updateBodyAnalysis called with data:', data);
    setState(prev => {
      console.log('📝 [ONBOARDING] Previous bodyAnalysis:', prev.bodyAnalysis);
      const newBodyAnalysis = prev.bodyAnalysis ? { ...prev.bodyAnalysis, ...data } : data as BodyAnalysisData;
      console.log('📝 [ONBOARDING] Merged bodyAnalysis:', newBodyAnalysis);

      const updatedState = {
        ...prev,
        bodyAnalysis: newBodyAnalysis,
        hasUnsavedChanges: true,
      };
      console.log('📝 [ONBOARDING] hasUnsavedChanges set to true');

      const validationResults = {
        1: validatePersonalInfo(updatedState.personalInfo),
        2: validateDietPreferences(updatedState.dietPreferences),
        3: validateBodyAnalysis(newBodyAnalysis),
        4: validateWorkoutPreferences(updatedState.workoutPreferences),
        5: validateAdvancedReview(updatedState.advancedReview),
      };
      console.log('📝 [ONBOARDING] Tab 3 validation result:', validationResults[3]);

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      stateRef.current = finalState;

      return finalState;
    });
  }, []);
  
  const updateWorkoutPreferences = useCallback((data: Partial<WorkoutPreferencesData>) => {
    console.log('📝 [ONBOARDING] updateWorkoutPreferences called with data:', data);
    setState(prev => {
      console.log('📝 [ONBOARDING] Previous workoutPreferences:', prev.workoutPreferences);
      const newWorkoutPreferences = prev.workoutPreferences ? { ...prev.workoutPreferences, ...data } : data as WorkoutPreferencesData;
      console.log('📝 [ONBOARDING] Merged workoutPreferences:', newWorkoutPreferences);

      const updatedState = {
        ...prev,
        workoutPreferences: newWorkoutPreferences,
        hasUnsavedChanges: true,
      };
      console.log('📝 [ONBOARDING] hasUnsavedChanges set to true');

      // Calculate validation with the new state
      const validationResults = {
        1: validatePersonalInfo(updatedState.personalInfo),
        2: validateDietPreferences(updatedState.dietPreferences),
        3: validateBodyAnalysis(updatedState.bodyAnalysis),
        4: validateWorkoutPreferences(newWorkoutPreferences),
        5: validateAdvancedReview(updatedState.advancedReview),
      };
      console.log('📝 [ONBOARDING] Tab 4 validation result:', validationResults[4]);

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      // Update ref synchronously
      stateRef.current = finalState;

      return finalState;
    });
  }, []);
  
  const updateAdvancedReview = useCallback((data: Partial<AdvancedReviewData>) => {
    console.log('📝 [ONBOARDING] updateAdvancedReview called with data:', data);
    setState(prev => {
      console.log('📝 [ONBOARDING] Previous advancedReview:', prev.advancedReview);
      const newAdvancedReview = prev.advancedReview ? { ...prev.advancedReview, ...data } : data as AdvancedReviewData;
      console.log('📝 [ONBOARDING] Merged advancedReview:', newAdvancedReview);

      const finalState = {
        ...prev,
        advancedReview: newAdvancedReview,
        hasUnsavedChanges: true,
      };
      
      // CRITICAL: Update ref synchronously to prevent race condition with completeOnboarding
      stateRef.current = finalState;
      console.log('📝 [ONBOARDING] advancedReview saved to stateRef, hasUnsavedChanges set to true');

      return finalState;
    });
  }, []);
  
  const validateTab = useCallback((tabNumber: number, currentData?: any): TabValidationResult => {
    console.log(`🔍 validateTab called for tab ${tabNumber}`);
    console.log(`🔍 currentData provided:`, currentData !== undefined ? 'YES' : 'NO');

    // Read from ref to get the latest state (even if setState updates are pending)
    const currentState = stateRef.current;
    let result: TabValidationResult;

    switch (tabNumber) {
      case 1:
        // Use provided currentData if available, otherwise fall back to state
        const personalInfoToValidate = currentData !== undefined ? currentData : currentState.personalInfo;
        result = validatePersonalInfo(personalInfoToValidate);
        console.log('🔍 Tab 1 validation result:', result);
        console.log('🔍 Tab 1 data being validated:', personalInfoToValidate);
        return result;
      case 2:
        const dietPrefsToValidate = currentData !== undefined ? currentData : currentState.dietPreferences;
        console.log('🔍 Tab 2 validating with data source:', currentData !== undefined ? 'CURRENT_DATA' : 'STORED_STATE');
        console.log('🔍 Tab 2 data:', dietPrefsToValidate);
        result = validateDietPreferences(dietPrefsToValidate);
        console.log('🔍 Tab 2 validation result:', result);
        return result;
      case 3:
        const bodyAnalysisToValidate = currentData !== undefined ? currentData : currentState.bodyAnalysis;
        return validateBodyAnalysis(bodyAnalysisToValidate);
      case 4:
        const workoutPrefsToValidate = currentData !== undefined ? currentData : currentState.workoutPreferences;
        console.log('🔍 Tab 4 validating with data source:', currentData !== undefined ? 'CURRENT_DATA' : 'STORED_STATE');
        console.log('🔍 Tab 4 data:', workoutPrefsToValidate);
        result = validateWorkoutPreferences(workoutPrefsToValidate);
        console.log('🔍 Tab 4 validation result:', result);
        return result;
      case 5:
        const advancedReviewToValidate = currentData !== undefined ? currentData : currentState.advancedReview;
        return validateAdvancedReview(advancedReviewToValidate);
      default:
        return { is_valid: false, errors: ['Invalid tab number'], warnings: [], completion_percentage: 0 };
    }
  }, []);
  
  const validateAllTabs = useCallback((): Record<number, TabValidationResult> => {
    console.log('🔍 [ONBOARDING] validateAllTabs called');
    // Read from ref to get the latest state
    const currentState = stateRef.current;

    const results = {
      1: validatePersonalInfo(currentState.personalInfo),
      2: validateDietPreferences(currentState.dietPreferences),
      3: validateBodyAnalysis(currentState.bodyAnalysis),
      4: validateWorkoutPreferences(currentState.workoutPreferences),
      5: validateAdvancedReview(currentState.advancedReview),
    };

    console.log('🔍 [ONBOARDING] All tabs validation results:', results);
    return results;
  }, []);
  
  const saveToDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      console.log('💾 [ONBOARDING] saveToDatabase - User not authenticated, skipping');
      return false;
    }

    console.log('💾 [ONBOARDING] saveToDatabase - Starting database save for user:', user.id);
    setState(prev => ({ ...prev, isAutoSaving: true }));

    // Use ref to get latest state values
    const currentState = stateRef.current;

    try {
      console.log('💾 [ONBOARDING] Database save started');

      // Save personal info if available
      if (currentState.personalInfo) {
        console.log('💾 [ONBOARDING] Saving PersonalInfo:', currentState.personalInfo);
        try {
          const success = await PersonalInfoService.save(user.id, currentState.personalInfo);
          if (!success) {
            throw new Error('PersonalInfoService.save returned false');
          }
          console.log('✅ [ONBOARDING] PersonalInfo saved successfully');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save personal info';
          console.error('❌ [ONBOARDING] PersonalInfo save error:', error);
          setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
          return false;
        }
      } else {
        console.log('⏭️ [ONBOARDING] Skipping PersonalInfo (null)');
      }

      // Save diet preferences if available
      if (currentState.dietPreferences) {
        console.log('💾 [ONBOARDING] Saving DietPreferences:', currentState.dietPreferences);
        try {
          const success = await DietPreferencesService.save(user.id, currentState.dietPreferences);
          if (!success) {
            throw new Error('DietPreferencesService.save returned false');
          }
          console.log('✅ [ONBOARDING] DietPreferences saved successfully');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save diet preferences';
          console.error('❌ [ONBOARDING] DietPreferences save error:', error);
          setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
          return false;
        }
      } else {
        console.log('⏭️ [ONBOARDING] Skipping DietPreferences (null)');
      }

      // Save body analysis if available
      if (currentState.bodyAnalysis) {
        console.log('💾 [ONBOARDING] Saving BodyAnalysis:', currentState.bodyAnalysis);
        try {
          const success = await BodyAnalysisService.save(user.id, currentState.bodyAnalysis);
          if (!success) {
            throw new Error('BodyAnalysisService.save returned false');
          }
          console.log('✅ [ONBOARDING] BodyAnalysis saved successfully');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save body analysis';
          console.error('❌ [ONBOARDING] BodyAnalysis save error:', error);
          setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
          return false;
        }
      } else {
        console.log('⏭️ [ONBOARDING] Skipping BodyAnalysis (null)');
      }

      // Save workout preferences if available
      if (currentState.workoutPreferences) {
        console.log('💾 [ONBOARDING] Saving WorkoutPreferences:', currentState.workoutPreferences);
        try {
          const success = await WorkoutPreferencesService.save(user.id, currentState.workoutPreferences);
          if (!success) {
            throw new Error('WorkoutPreferencesService.save returned false');
          }
          console.log('✅ [ONBOARDING] WorkoutPreferences saved successfully');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save workout preferences';
          console.error('❌ [ONBOARDING] WorkoutPreferences save error:', error);
          setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
          return false;
        }
      } else {
        console.log('⏭️ [ONBOARDING] Skipping WorkoutPreferences (null)');
      }

      // Save advanced review if available
      if (currentState.advancedReview) {
        console.log('💾 [ONBOARDING] Saving AdvancedReview:', currentState.advancedReview);
        try {
          const success = await AdvancedReviewService.save(user.id, currentState.advancedReview);
          if (!success) {
            throw new Error('AdvancedReviewService.save returned false');
          }
          console.log('✅ [ONBOARDING] AdvancedReview saved successfully');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save advanced review';
          console.error('❌ [ONBOARDING] AdvancedReview save error:', error);
          setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
          return false;
        }
      } else {
        console.log('⏭️ [ONBOARDING] Skipping AdvancedReview (null)');
      }

      // Save onboarding progress
      const progressData: OnboardingProgressData = {
        current_tab: currentState.currentTab,
        completed_tabs: Array.from(currentState.completedTabs),
        tab_validation_status: currentState.tabValidationStatus,
        total_completion_percentage: currentState.overallCompletion,
      };
      console.log('💾 [ONBOARDING] Saving OnboardingProgress:', progressData);

      try {
        const progressSuccess = await OnboardingProgressService.save(user.id, progressData);
        if (!progressSuccess) {
          throw new Error('OnboardingProgressService.save returned false');
        }
        console.log('✅ [ONBOARDING] OnboardingProgress saved successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save onboarding progress';
        console.error('❌ [ONBOARDING] OnboardingProgress save error:', error);
        setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
        return false;
      }

      const now = new Date();
      setState(prev => ({
        ...prev,
        isAutoSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: now,
        errors: { ...prev.errors, saveDatabase: '' }, // Clear error on success
      }));

      console.log('✅ [ONBOARDING] All onboarding data saved to database at', now.toISOString());
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred while saving to database';
      console.error('❌ [ONBOARDING] Critical database save error:', error);
      setState(prev => ({ ...prev, isAutoSaving: false, errors: { ...prev.errors, saveDatabase: message } }));
      return false;
    }
  }, [isAuthenticated, user]); // Removed state dependencies - using ref instead
  
  const loadFromDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      console.log('📥 [ONBOARDING] loadFromDatabase - User not authenticated, skipping');
      return false;
    }

    console.log('📥 [ONBOARDING] loadFromDatabase - Starting database load for user:', user.id);
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('📥 [ONBOARDING] Database load started');

      // Load personal info
      console.log('📥 [ONBOARDING] Loading PersonalInfo...');
      const personalInfo = await PersonalInfoService.load(user.id);
      console.log('📥 [ONBOARDING] PersonalInfo loaded:', personalInfo);

      // Load diet preferences
      console.log('📥 [ONBOARDING] Loading DietPreferences...');
      const dietPreferences = await DietPreferencesService.load(user.id);
      console.log('📥 [ONBOARDING] DietPreferences loaded:', dietPreferences);

      // Load body analysis
      console.log('📥 [ONBOARDING] Loading BodyAnalysis...');
      const bodyAnalysis = await BodyAnalysisService.load(user.id);
      console.log('📥 [ONBOARDING] BodyAnalysis loaded:', bodyAnalysis);

      // Load workout preferences
      console.log('📥 [ONBOARDING] Loading WorkoutPreferences...');
      const workoutPreferences = await WorkoutPreferencesService.load(user.id);
      console.log('📥 [ONBOARDING] WorkoutPreferences loaded:', workoutPreferences);

      // Load advanced review
      console.log('📥 [ONBOARDING] Loading AdvancedReview...');
      const advancedReview = await AdvancedReviewService.load(user.id);
      console.log('📥 [ONBOARDING] AdvancedReview loaded:', advancedReview);

      // Load onboarding progress
      console.log('📥 [ONBOARDING] Loading OnboardingProgress...');
      const progress = await OnboardingProgressService.load(user.id);
      console.log('📥 [ONBOARDING] OnboardingProgress loaded:', progress);

      setState(prev => {
        const finalState = {
          ...prev,
          personalInfo,
          dietPreferences,
          bodyAnalysis,
          workoutPreferences,
          advancedReview,
          currentTab: progress?.current_tab || 1,
          completedTabs: new Set(progress?.completed_tabs || []),
          tabValidationStatus: progress?.tab_validation_status || {},
          overallCompletion: progress?.total_completion_percentage || 0,
          isLoading: false,
          errors: { ...prev.errors, loadDatabase: '' }, // Clear error on success
        };

        console.log('📥 [ONBOARDING] Final merged state:', finalState);

        // Update ref synchronously
        stateRef.current = finalState;

        return finalState;
      });

      console.log('✅ [ONBOARDING] All onboarding data loaded from database');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load onboarding data from database';
      console.error('❌ [ONBOARDING] Database load error:', error);
      setState(prev => {
        const finalState = {
          ...prev,
          isLoading: false,
          errors: { ...prev.errors, loadDatabase: message }
        };
        stateRef.current = finalState;
        return finalState;
      });
      return false;
    }
  }, [isAuthenticated, user]);
  
  const saveToLocal = useCallback(async (): Promise<void> => {
    // Use ref to get latest state values
    const currentState = stateRef.current;

    try {
      const dataToSave = {
        personalInfo: currentState.personalInfo,
        dietPreferences: currentState.dietPreferences,
        bodyAnalysis: currentState.bodyAnalysis,
        workoutPreferences: currentState.workoutPreferences,
        advancedReview: currentState.advancedReview,
        currentTab: currentState.currentTab,
        completedTabs: Array.from(currentState.completedTabs),
        lastSavedAt: new Date().toISOString(),
      };

      // CRITICAL DEBUG: Log what's being saved
      console.log('💾 [ONBOARDING] saveToLocal - advancedReview present:', !!currentState.advancedReview);
      console.log('💾 [ONBOARDING] saveToLocal - advancedReview.daily_water_ml:', currentState.advancedReview?.daily_water_ml);
      console.log('💾 [ONBOARDING] saveToLocal - Full data:', JSON.stringify(dataToSave, null, 2).substring(0, 500));
      
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(dataToSave));
      console.log('✅ [ONBOARDING] Onboarding data saved to local storage (AsyncStorage)');

      // Clear error on success
      setState(prev => ({ ...prev, errors: { ...prev.errors, saveLocal: '' } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save to local storage';
      console.error('❌ [ONBOARDING] Local storage save error:', error);
      setState(prev => ({ ...prev, errors: { ...prev.errors, saveLocal: message } }));
    }
  }, []); // No dependencies - using ref instead
  
  const loadFromLocal = useCallback(async (): Promise<void> => {
    try {
      console.log('📥 [ONBOARDING] loadFromLocal - Loading from AsyncStorage...');
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);

      if (savedData) {
        console.log('📥 [ONBOARDING] Found saved data in AsyncStorage, parsing...');
        const parsedData = JSON.parse(savedData);
        console.log('📥 [ONBOARDING] Parsed data from AsyncStorage:', parsedData);

        setState(prev => {
          const finalState: OnboardingState = {
            ...prev,
            personalInfo: parsedData.personalInfo,
            dietPreferences: parsedData.dietPreferences,
            bodyAnalysis: parsedData.bodyAnalysis,
            workoutPreferences: parsedData.workoutPreferences,
            advancedReview: parsedData.advancedReview,
            currentTab: parsedData.currentTab || 1,
            completedTabs: new Set<number>(parsedData.completedTabs || []),
            lastSavedAt: parsedData.lastSavedAt ? new Date(parsedData.lastSavedAt) : null,
            errors: { ...prev.errors, loadLocal: '' }, // Clear error on success
          };

          console.log('📥 [ONBOARDING] State updated from AsyncStorage:', finalState);

          // Update ref synchronously
          stateRef.current = finalState;

          return finalState;
        });
        console.log('✅ [ONBOARDING] Onboarding data loaded from local storage');
      } else {
        console.log('ℹ️ [ONBOARDING] No saved data found in AsyncStorage');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load from local storage';
      console.error('❌ [ONBOARDING] Local storage load error:', error);
      setState(prev => ({ ...prev, errors: { ...prev.errors, loadLocal: message } }));
    }
  }, []);
  
  /**
   * Reset onboarding and clear all AsyncStorage data
   * Use this to recover from corrupted state (e.g., missing advancedReview)
   */
  const resetOnboarding = useCallback(async () => {
    console.log('🔄 [ONBOARDING] resetOnboarding called - clearing all data');
    
    // Clear AsyncStorage first
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
      await AsyncStorage.removeItem('onboarding_completed');
      console.log('✅ [ONBOARDING] AsyncStorage cleared');
    } catch (error) {
      console.error('❌ [ONBOARDING] Failed to clear AsyncStorage:', error);
    }
    
    const finalState = {
      personalInfo: null,
      dietPreferences: null,
      bodyAnalysis: null,
      workoutPreferences: null,
      advancedReview: null,
      currentTab: 1,
      completedTabs: new Set<number>(),
      tabValidationStatus: {},
      overallCompletion: 0,
      isLoading: false,
      isAutoSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      errors: {},
      warnings: {},
    };
    
    // Update ref synchronously
    stateRef.current = finalState;
    
    setState(finalState);
  }, []);
  
  const resetTab = useCallback((tabNumber: number) => {
    switch (tabNumber) {
      case 1:
        setState(prev => {
          const finalState = { ...prev, personalInfo: null };
          stateRef.current = finalState;
          return finalState;
        });
        break;
      case 2:
        setState(prev => {
          const finalState = { ...prev, dietPreferences: null };
          stateRef.current = finalState;
          return finalState;
        });
        break;
      case 3:
        setState(prev => {
          const finalState = { ...prev, bodyAnalysis: null };
          stateRef.current = finalState;
          return finalState;
        });
        break;
      case 4:
        setState(prev => {
          const finalState = { ...prev, workoutPreferences: null };
          stateRef.current = finalState;
          return finalState;
        });
        break;
      case 5:
        setState(prev => {
          const finalState = { ...prev, advancedReview: null };
          stateRef.current = finalState;
          return finalState;
        });
        break;
    }
    markTabIncomplete(tabNumber);
  }, [markTabIncomplete]);
  
  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎯 completeOnboarding called');
      console.log('👤 User authenticated:', isAuthenticated, 'User ID:', user?.id);

      const validationResults = validateAllTabs();
      const allValid = Object.values(validationResults).every(result => result.is_valid);

      if (!allValid) {
        console.warn('⚠️ Cannot complete onboarding - validation errors exist');
        const invalidTabs = Object.entries(validationResults)
          .filter(([_, result]) => !result.is_valid)
          .map(([tab, result]) => `Tab ${tab}: ${result.errors.join(', ')}`);
        console.warn('Invalid tabs:', invalidTabs);
        return false;
      }

      console.log('✅ All tabs validated successfully');

      // Try to save to database if authenticated
      if (isAuthenticated && user) {
        console.log('💾 Attempting to save to database...');
        try {
          const dbSuccess = await saveToDatabase();
          if (dbSuccess) {
            console.log('✅ Database save successful');
            // CRITICAL: Invalidate metrics cache so screens load fresh calculated values
            invalidateMetricsCache();
            console.log('🔄 Metrics cache invalidated - screens will load fresh data');
          } else {
            console.warn('⚠️ Database save failed, continuing with local save for guest mode');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Database save failed';
          console.error('❌ Database save error during onboarding completion:', error);
          setState(prev => ({ ...prev, warnings: { ...prev.warnings, completeOnboarding: message } }));
          // Continue anyway - local save will still work
        }
      } else {
        console.log('👤 Guest user - skipping database save');
        // Also invalidate cache for guest users after local save
        invalidateMetricsCache();
      }

      // Always save to local storage for both guest and authenticated users
      try {
        await saveToLocal();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Local save failed';
        console.error('❌ Local save error during onboarding completion:', error);
        setState(prev => ({ ...prev, warnings: { ...prev.warnings, completeOnboarding: message } }));
        // Continue anyway if we have user authenticated (database save succeeded)
      }

      // Mark onboarding as complete in state and AsyncStorage
      setState(prev => ({
        ...prev,
        completedTabs: new Set([1, 2, 3, 4, 5]),
        overallCompletion: 100,
        errors: { ...prev.errors, completeOnboarding: '' }, // Clear error on success
      }));

      try {
        await AsyncStorage.setItem('onboarding_completed', 'true');
        console.log('✅ Onboarding marked as complete in AsyncStorage');
      } catch (error) {
        console.error('❌ Failed to mark onboarding complete in AsyncStorage:', error);
        // Not critical - state is already updated
      }

      console.log('🎉 Onboarding completion successful - returning true');
      return true; // Always return true if validation passed
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
      console.error('❌ Critical error during onboarding completion:', error);
      setState(prev => ({ ...prev, errors: { ...prev.errors, completeOnboarding: message } }));
      return false;
    }
  }, [validateAllTabs, saveToDatabase, saveToLocal, isAuthenticated, user]);
  
  const isOnboardingComplete = useCallback((): boolean => {
    return state.completedTabs.size === 5 && state.overallCompletion === 100;
  }, [state.completedTabs.size, state.overallCompletion]);
  
  // Memoize saveToLocal for use in useEffect
  const saveToLocalMemo = useCallback(async (): Promise<void> => {
    await saveToLocal();
  }, [saveToLocal]);

  // Auto-save to local storage when data changes
  useEffect(() => {
    if (state.hasUnsavedChanges) {
      console.log('⏱️ [ONBOARDING] Auto-save timer started (1s debounce)');
      const timer = setTimeout(() => {
        console.log('⏱️ [ONBOARDING] Auto-save timer fired - triggering saveToLocal');
        saveToLocalMemo().catch(error => {
          console.error('[useOnboardingState] Auto-save failed:', error);
        });
      }, 1000); // Debounce auto-save

      return () => {
        console.log('⏱️ [ONBOARDING] Auto-save timer cleared');
        clearTimeout(timer);
      };
    }
  }, [state.hasUnsavedChanges, saveToLocalMemo]);
  
  // Memoize loadFromLocal for use in useEffect
  const loadFromLocalMemo = useCallback(async (): Promise<void> => {
    await loadFromLocal();
  }, [loadFromLocal]);

  // Load data on mount
  useEffect(() => {
    let mounted = true;

    console.log('🚀 [ONBOARDING] Hook mounted - loading data from local storage');
    loadFromLocalMemo().catch(error => {
      if (!mounted) return;
      console.error('[useOnboardingState] Load from local failed:', error);
    });

    return () => { mounted = false; };
  }, [loadFromLocalMemo]);
  
  // Validate tabs on demand rather than on every data change
  const updateValidationStatus = useCallback(() => {
    const validationResults = validateAllTabs();
    console.log('🔍 useOnboardingState: Validation results updated:', validationResults);
    setState(prev => ({ ...prev, tabValidationStatus: validationResults }));
    return validationResults;
  }, [validateAllTabs]);
  
  return {
    // State
    ...state,
    
    // Actions
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
    validateTab,
    validateAllTabs,
    saveToDatabase,
    loadFromDatabase,
    saveToLocal,
    loadFromLocal,
    resetOnboarding,
    resetTab,
    completeOnboarding,
    isOnboardingComplete,
    updateValidationStatus,
  };
};
