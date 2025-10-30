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
  // This ensures validation always reads the most current data, even if setState is pending
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
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
    
    if (completion !== state.overallCompletion) {
      setState(prev => ({ ...prev, overallCompletion: completion }));
    }
  }, [
    state.personalInfo,
    state.dietPreferences,
    state.bodyAnalysis,
    state.workoutPreferences,
    state.advancedReview,
    calculateOverallCompletion,
    state.overallCompletion,
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
    setState(prev => {
      const newPersonalInfo = prev.personalInfo ? { ...prev.personalInfo, ...data } : data as PersonalInfoData;
      
      // Update validation immediately with the new data
      const updatedState = {
        ...prev,
        personalInfo: newPersonalInfo,
        hasUnsavedChanges: true,
      };
      
      // Calculate validation with the new state
      const validationResults = {
        1: validatePersonalInfo(newPersonalInfo),
        2: validateDietPreferences(prev.dietPreferences),
        3: validateBodyAnalysis(prev.bodyAnalysis),
        4: validateWorkoutPreferences(prev.workoutPreferences),
        5: validateAdvancedReview(prev.advancedReview),
      };
      
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
    setState(prev => {
      const finalState = {
        ...prev,
        dietPreferences: prev.dietPreferences ? { ...prev.dietPreferences, ...data } : data as DietPreferencesData,
        hasUnsavedChanges: true,
      };
      
      // Update ref synchronously
      stateRef.current = finalState;
      
      return finalState;
    });
  }, []);
  
  const updateBodyAnalysis = useCallback((data: Partial<BodyAnalysisData>) => {
    setState(prev => {
      const newBodyAnalysis = prev.bodyAnalysis ? { ...prev.bodyAnalysis, ...data } : data as BodyAnalysisData;

      const updatedState = {
        ...prev,
        bodyAnalysis: newBodyAnalysis,
        hasUnsavedChanges: true,
      };

      const validationResults = {
        1: validatePersonalInfo(updatedState.personalInfo),
        2: validateDietPreferences(updatedState.dietPreferences),
        3: validateBodyAnalysis(newBodyAnalysis),
        4: validateWorkoutPreferences(updatedState.workoutPreferences),
        5: validateAdvancedReview(updatedState.advancedReview),
      };

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      stateRef.current = finalState;

      return finalState;
    });
  }, []);
  
  const updateWorkoutPreferences = useCallback((data: Partial<WorkoutPreferencesData>) => {
    setState(prev => {
      const finalState = {
        ...prev,
        workoutPreferences: prev.workoutPreferences ? { ...prev.workoutPreferences, ...data } : data as WorkoutPreferencesData,
        hasUnsavedChanges: true,
      };
      
      // Update ref synchronously
      stateRef.current = finalState;
      
      return finalState;
    });
  }, []);
  
  const updateAdvancedReview = useCallback((data: Partial<AdvancedReviewData>) => {
    setState(prev => {
      const finalState = {
        ...prev,
        advancedReview: prev.advancedReview ? { ...prev.advancedReview, ...data } : data as AdvancedReviewData,
        hasUnsavedChanges: true,
      };
      
      // Update ref synchronously
      stateRef.current = finalState;
      
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
    // Read from ref to get the latest state
    const currentState = stateRef.current;
    
    return {
      1: validatePersonalInfo(currentState.personalInfo),
      2: validateDietPreferences(currentState.dietPreferences),
      3: validateBodyAnalysis(currentState.bodyAnalysis),
      4: validateWorkoutPreferences(currentState.workoutPreferences),
      5: validateAdvancedReview(currentState.advancedReview),
    };
  }, []);
  
  const saveToDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    setState(prev => ({ ...prev, isAutoSaving: true }));
    
    try {
      console.log('🔄 Saving onboarding data to database...');
      
      // Save personal info if available
      if (state.personalInfo) {
        const success = await PersonalInfoService.save(user.id, state.personalInfo);
        if (!success) {
          console.error('❌ Failed to save personal info');
          setState(prev => ({ ...prev, isAutoSaving: false }));
          return false;
        }
      }
      
      // Save diet preferences if available
      if (state.dietPreferences) {
        const success = await DietPreferencesService.save(user.id, state.dietPreferences);
        if (!success) {
          console.error('❌ Failed to save diet preferences');
          setState(prev => ({ ...prev, isAutoSaving: false }));
          return false;
        }
      }
      
      // Save body analysis if available
      if (state.bodyAnalysis) {
        const success = await BodyAnalysisService.save(user.id, state.bodyAnalysis);
        if (!success) {
          console.error('❌ Failed to save body analysis');
          setState(prev => ({ ...prev, isAutoSaving: false }));
          return false;
        }
      }
      
      // Save workout preferences if available
      if (state.workoutPreferences) {
        const success = await WorkoutPreferencesService.save(user.id, state.workoutPreferences);
        if (!success) {
          console.error('❌ Failed to save workout preferences');
          setState(prev => ({ ...prev, isAutoSaving: false }));
          return false;
        }
      }
      
      // Save advanced review if available
      if (state.advancedReview) {
        const success = await AdvancedReviewService.save(user.id, state.advancedReview);
        if (!success) {
          console.error('❌ Failed to save advanced review');
          setState(prev => ({ ...prev, isAutoSaving: false }));
          return false;
        }
      }
      
      // Save onboarding progress
      const progressData: OnboardingProgressData = {
        current_tab: state.currentTab,
        completed_tabs: Array.from(state.completedTabs),
        tab_validation_status: state.tabValidationStatus,
        total_completion_percentage: state.overallCompletion,
      };
      
      const progressSuccess = await OnboardingProgressService.save(user.id, progressData);
      if (!progressSuccess) {
        console.error('❌ Failed to save onboarding progress');
        setState(prev => ({ ...prev, isAutoSaving: false }));
        return false;
      }
      
      setState(prev => ({
        ...prev,
        isAutoSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: new Date(),
      }));
      
      console.log('✅ All onboarding data saved to database');
      return true;
    } catch (error) {
      console.error('❌ Failed to save to database:', error);
      setState(prev => ({ ...prev, isAutoSaving: false }));
      return false;
    }
  }, [isAuthenticated, user, state.personalInfo, state.currentTab, state.completedTabs, state.tabValidationStatus, state.overallCompletion]);
  
  const loadFromDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('🔄 Loading onboarding data from database...');
      
      // Load personal info
      const personalInfo = await PersonalInfoService.load(user.id);
      
      // Load diet preferences
      const dietPreferences = await DietPreferencesService.load(user.id);
      
      // Load body analysis
      const bodyAnalysis = await BodyAnalysisService.load(user.id);
      
      // Load workout preferences
      const workoutPreferences = await WorkoutPreferencesService.load(user.id);
      
      // Load advanced review
      const advancedReview = await AdvancedReviewService.load(user.id);
      
      // Load onboarding progress
      const progress = await OnboardingProgressService.load(user.id);
      
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
        };
        
        // Update ref synchronously
        stateRef.current = finalState;
        
        return finalState;
      });
      
      console.log('✅ Onboarding data loaded from database');
      return true;
    } catch (error) {
      console.error('❌ Failed to load from database:', error);
      setState(prev => {
        const finalState = { ...prev, isLoading: false };
        stateRef.current = finalState;
        return finalState;
      });
      return false;
    }
  }, [isAuthenticated, user]);
  
  const saveToLocal = useCallback(async (): Promise<void> => {
    try {
      const dataToSave = {
        personalInfo: state.personalInfo,
        dietPreferences: state.dietPreferences,
        bodyAnalysis: state.bodyAnalysis,
        workoutPreferences: state.workoutPreferences,
        advancedReview: state.advancedReview,
        currentTab: state.currentTab,
        completedTabs: Array.from(state.completedTabs),
        lastSavedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(dataToSave));
      console.log('💾 Onboarding data saved to local storage');
    } catch (error) {
      console.error('❌ Failed to save to local storage:', error);
    }
  }, [state]);
  
  const loadFromLocal = useCallback(async (): Promise<void> => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
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
          };
          
          // Update ref synchronously
          stateRef.current = finalState;
          
          return finalState;
        });
        console.log('📱 Onboarding data loaded from local storage');
      }
    } catch (error) {
      console.error('❌ Failed to load from local storage:', error);
    }
  }, []);
  
  const resetOnboarding = useCallback(() => {
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
      const dbSuccess = await saveToDatabase();
      if (dbSuccess) {
        console.log('✅ Database save successful');
      } else {
        console.warn('⚠️ Database save failed, continuing with local save for guest mode');
      }
    } else {
      console.log('👤 Guest user - skipping database save');
    }

    // Always save to local storage for both guest and authenticated users
    await saveToLocal();

    // Mark onboarding as complete in state and AsyncStorage
    setState(prev => ({
      ...prev,
      completedTabs: new Set([1, 2, 3, 4, 5]),
      overallCompletion: 100,
    }));

    await AsyncStorage.setItem('onboarding_completed', 'true');
    console.log('✅ Onboarding marked as complete in AsyncStorage');
    console.log('🎉 Onboarding completion successful - returning true');

    return true; // Always return true if validation passed
  }, [validateAllTabs, saveToDatabase, saveToLocal, isAuthenticated, user]);
  
  const isOnboardingComplete = useCallback((): boolean => {
    return state.completedTabs.size === 5 && state.overallCompletion === 100;
  }, [state.completedTabs.size, state.overallCompletion]);
  
  // Auto-save to local storage when data changes
  useEffect(() => {
    if (state.hasUnsavedChanges) {
      const timer = setTimeout(() => {
        saveToLocal();
      }, 1000); // Debounce auto-save
      
      return () => clearTimeout(timer);
    }
  }, [state.hasUnsavedChanges, saveToLocal]);
  
  // Load data on mount
  useEffect(() => {
    loadFromLocal();
  }, [loadFromLocal]);
  
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
