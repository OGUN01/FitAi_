import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import { useOffline } from '../hooks/useOffline';
import { PersonalInfo, FitnessGoals, OnboardingData } from '../types/user';
import { api, supabase } from '../services/api';
import { dataManager } from '../services/dataManager';

/**
 * Integration utilities for connecting existing UI components with the new backend
 */

/**
 * Hook for onboarding integration
 * Provides functions to save onboarding data to the backend
 */
export const useOnboardingIntegration = () => {
  const { user: authUser, isAuthenticated, isGuestMode, guestId } = useAuth();
  const { createProfile, updateProfile, createFitnessGoals, updateFitnessGoals, updatePersonalInfo, updateFitnessGoalsLocal } = useUser();
  const { optimisticCreate } = useOffline();

  // Helper function to get user ID (authenticated user or guest)
  const getUserId = () => {
    if (isAuthenticated && authUser) {
      return authUser.id;
    }
    return guestId || 'guest';
  };

  /**
   * Save personal info from onboarding
   * Works for both guest and authenticated users
   */
  const savePersonalInfo = async (personalInfo: PersonalInfo): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUserId = getUserId();
      
      // ALWAYS save to local storage first (for both guest and authenticated users)
      dataManager.setUserId(currentUserId);
      const localSaveSuccess = await dataManager.savePersonalInfo(personalInfo);
      
      if (!localSaveSuccess) {
        console.warn('⚠️ Failed to save personal info locally');
      }

      // If user is authenticated, also try to save to remote
      if (isAuthenticated && authUser) {
        // Update local state immediately
        updatePersonalInfo(personalInfo);

        // Try to update profile first, create if it doesn't exist
        const profileData = {
          name: personalInfo.name,
          age: personalInfo.age ? parseInt(personalInfo.age) : undefined,
          gender: personalInfo.gender as 'male' | 'female' | 'other',
          height_cm: personalInfo.height ? parseInt(personalInfo.height) : undefined,
          weight_kg: personalInfo.weight ? parseFloat(personalInfo.weight) : undefined,
          activity_level: personalInfo.activityLevel as any,
        };

        // Try update first
        let response = await updateProfile(authUser.id, profileData);
        
        // If update fails (profile doesn't exist), create it
        if (!response.success) {
          const createData = {
            id: authUser.id,
            email: authUser.email,
            ...profileData,
          };
          response = await createProfile(createData);
        }
        
        if (!response.success) {
          console.warn('⚠️ Failed to save personal info to remote, but saved locally');
        }
      } else {
        console.log('📱 Guest mode: Personal info saved locally only');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving personal info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save personal info' 
      };
    }
  };

  /**
   * Save fitness goals from onboarding
   * Works for both guest and authenticated users
   */
  const saveFitnessGoals = async (fitnessGoals: FitnessGoals): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUserId = getUserId();
      
      // ALWAYS save to local storage first (for both guest and authenticated users)
      dataManager.setUserId(currentUserId);
      const localSaveSuccess = await dataManager.saveFitnessGoals(fitnessGoals);
      
      if (!localSaveSuccess) {
        console.warn('⚠️ Failed to save fitness goals locally');
      }

      // If user is authenticated, also try to save to remote
      if (isAuthenticated && authUser) {
        // Update local state immediately
        updateFitnessGoalsLocal(fitnessGoals);

        // Try to update fitness goals first, create if they don't exist
        const goalsData = {
          primary_goals: fitnessGoals.primaryGoals,
          time_commitment: fitnessGoals.timeCommitment as any,
          experience_level: fitnessGoals.experience as any,
        };

        // Try update first
        let response = await updateFitnessGoals(authUser.id, goalsData);
        
        // If update fails (goals don't exist), create them
        if (!response.success) {
          const createData = {
            user_id: authUser.id,
            ...goalsData,
          };
          response = await createFitnessGoals(createData);
        }
        
        if (!response.success) {
          console.warn('⚠️ Failed to save fitness goals to remote, but saved locally');
        }
      } else {
        console.log('📱 Guest mode: Fitness goals saved locally only');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving fitness goals:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save fitness goals' 
      };
    }
  };

  /**
   * Save diet preferences
   * Works for both guest and authenticated users
   */
  const saveDietPreferences = async (dietPreferences: NonNullable<OnboardingData['dietPreferences']>): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUserId = getUserId();
      
      // ALWAYS save to local storage first (for both guest and authenticated users)
      dataManager.setUserId(currentUserId);
      const localSaveSuccess = await dataManager.saveDietPreferences(dietPreferences);
      
      if (!localSaveSuccess) {
        console.warn('⚠️ Failed to save diet preferences locally');
      }

      // If user is authenticated, also try to save to remote
      if (isAuthenticated && authUser) {
        try {
          const { data, error } = await supabase
            .from('diet_preferences')
            .upsert({
              user_id: authUser.id,
              diet_type: dietPreferences.dietType,
              allergies: dietPreferences.allergies,
              cuisine_preferences: dietPreferences.cuisinePreferences,
              restrictions: dietPreferences.restrictions,
            });

          if (error) {
            console.warn('⚠️ Failed to save diet preferences to remote, but saved locally:', error.message);
          }
        } catch (remoteError) {
          console.warn('⚠️ Failed to save diet preferences to remote, but saved locally:', remoteError);
        }
      } else {
        console.log('📱 Guest mode: Diet preferences saved locally only');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving diet preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save diet preferences'
      };
    }
  };

  /**
   * Save workout preferences
   * Works for both guest and authenticated users
   */
  const saveWorkoutPreferences = async (workoutPreferences: NonNullable<OnboardingData['workoutPreferences']>): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUserId = getUserId();
      
      // ALWAYS save to local storage first (for both guest and authenticated users)
      dataManager.setUserId(currentUserId);
      const localSaveSuccess = await dataManager.saveWorkoutPreferences(workoutPreferences);
      
      if (!localSaveSuccess) {
        console.warn('⚠️ Failed to save workout preferences locally');
      }

      // If user is authenticated, also try to save to remote
      if (isAuthenticated && authUser) {
        try {
          const { data, error } = await supabase
            .from('workout_preferences')
            .upsert({
              user_id: authUser.id,
              location: workoutPreferences.location,
              equipment: workoutPreferences.equipment,
              time_preference: workoutPreferences.timePreference,
              intensity: workoutPreferences.intensity,
              workout_types: workoutPreferences.workoutTypes,
            });

          if (error) {
            console.warn('⚠️ Failed to save workout preferences to remote, but saved locally:', error.message);
          }
        } catch (remoteError) {
          console.warn('⚠️ Failed to save workout preferences to remote, but saved locally:', remoteError);
        }
      } else {
        console.log('📱 Guest mode: Workout preferences saved locally only');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving workout preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save workout preferences'
      };
    }
  };

  /**
   * Save body analysis
   * Works for both guest and authenticated users
   */
  const saveBodyAnalysis = async (bodyAnalysis: NonNullable<OnboardingData['bodyAnalysis']>): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUserId = getUserId();
      
      // For now, body analysis is stored locally only since it's optional
      // TODO: In future, could implement remote storage for body analysis
      console.log('📱 Body analysis saved locally only (feature is optional)');

      // If user is authenticated, also try to save to remote
      if (isAuthenticated && authUser) {
        try {
          const { data, error } = await supabase
            .from('body_analysis')
            .upsert({
              user_id: authUser.id,
              photos: bodyAnalysis.photos,
              analysis: bodyAnalysis.analysis,
            });

          if (error) {
            console.warn('⚠️ Failed to save body analysis to remote, continuing without it:', error.message);
          }
        } catch (remoteError) {
          console.warn('⚠️ Failed to save body analysis to remote, continuing without it:', remoteError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error saving body analysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save body analysis'
      };
    }
  };

  /**
   * Save complete onboarding data
   */
  const saveOnboardingData = async (onboardingData: OnboardingData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Save personal info first
      const personalInfoResult = await savePersonalInfo(onboardingData.personalInfo);
      if (!personalInfoResult.success) {
        return personalInfoResult;
      }

      // Then save fitness goals
      const fitnessGoalsResult = await saveFitnessGoals(onboardingData.fitnessGoals);
      if (!fitnessGoalsResult.success) {
        return fitnessGoalsResult;
      }

      // Save diet preferences if provided
      if (onboardingData.dietPreferences) {
        const dietResult = await saveDietPreferences(onboardingData.dietPreferences);
        if (!dietResult.success) {
          return dietResult;
        }
      }

      // Save workout preferences if provided
      if (onboardingData.workoutPreferences) {
        const workoutResult = await saveWorkoutPreferences(onboardingData.workoutPreferences);
        if (!workoutResult.success) {
          return workoutResult;
        }
      }

      // Save body analysis if provided
      if (onboardingData.bodyAnalysis && Object.keys(onboardingData.bodyAnalysis.photos).length > 0) {
        const bodyResult = await saveBodyAnalysis(onboardingData.bodyAnalysis);
        if (!bodyResult.success) {
          return bodyResult;
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save onboarding data'
      };
    }
  };

  return {
    savePersonalInfo,
    saveFitnessGoals,
    saveDietPreferences,
    saveWorkoutPreferences,
    saveBodyAnalysis,
    saveOnboardingData,
  };
};

/**
 * Hook for dashboard data integration
 * Provides functions to get dashboard data from the backend
 */
export const useDashboardIntegration = () => {
  const { user: authUser } = useAuth();
  const { profile } = useUser();
  const { isOnline } = useOffline();

  /**
   * Get user stats for dashboard
   */
  const getUserStats = () => {
    if (!profile) {
      return {
        totalWorkouts: 0,
        totalCaloriesBurned: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    return profile.stats;
  };

  /**
   * Get user preferences
   */
  const getUserPreferences = () => {
    if (!profile) {
      return {
        units: 'metric' as const,
        notifications: true,
        darkMode: true,
      };
    }

    return profile.preferences;
  };

  /**
   * Get user BMI and health metrics
   */
  const getHealthMetrics = () => {
    if (!profile?.personalInfo) {
      return null;
    }

    const { height, weight } = profile.personalInfo;
    if (!height || !weight) {
      return null;
    }

    const heightCm = parseInt(height);
    const weightKg = parseFloat(weight);
    
    if (isNaN(heightCm) || isNaN(weightKg)) {
      return null;
    }

    const bmi = api.utils.calculateBMI(weightKg, heightCm);
    const bmiCategory = api.utils.getBMICategory(bmi);

    return {
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      weight: weightKg,
      height: heightCm,
    };
  };

  /**
   * Get daily calorie needs
   */
  const getDailyCalorieNeeds = () => {
    if (!profile?.personalInfo) {
      return null;
    }

    const { height, weight, age, gender, activityLevel } = profile.personalInfo;
    if (!height || !weight || !age || !gender || !activityLevel) {
      return null;
    }

    const heightCm = parseInt(height);
    const weightKg = parseFloat(weight);
    const ageNum = parseInt(age);
    
    if (isNaN(heightCm) || isNaN(weightKg) || isNaN(ageNum)) {
      return null;
    }

    return api.utils.calculateDailyCalories(
      weightKg,
      heightCm,
      ageNum,
      gender as 'male' | 'female',
      activityLevel as any
    );
  };

  return {
    getUserStats,
    getUserPreferences,
    getHealthMetrics,
    getDailyCalorieNeeds,
    isOnline,
    isAuthenticated: !!authUser,
    profile,
  };
};

/**
 * Hook for form validation integration
 * Provides validation functions for forms
 */
export const useFormValidation = () => {
  return {
    validateEmail: api.utils.isValidEmail,
    validatePassword: api.utils.validatePassword,
    validateRequiredFields: api.utils.validateRequiredFields,
    sanitizeInput: api.utils.sanitizeInput,
  };
};

/**
 * Hook for unit conversion integration
 * Provides unit conversion functions
 */
export const useUnitConversion = () => {
  const { getUserPreferences } = useDashboardIntegration();
  const preferences = getUserPreferences();

  return {
    convertWeight: api.utils.convertWeight,
    convertHeight: api.utils.convertHeight,
    userUnits: preferences.units,
    formatWeight: (weight: number, fromUnit: 'kg' | 'lbs' = 'kg') => {
      const converted = api.utils.convertWeight(weight, fromUnit, preferences.units === 'metric' ? 'kg' : 'lbs');
      const unit = preferences.units === 'metric' ? 'kg' : 'lbs';
      return `${Math.round(converted * 10) / 10} ${unit}`;
    },
    formatHeight: (height: number, fromUnit: 'cm' | 'ft' = 'cm') => {
      const converted = api.utils.convertHeight(height, fromUnit, preferences.units === 'metric' ? 'cm' : 'ft');
      const unit = preferences.units === 'metric' ? 'cm' : 'ft';
      return `${Math.round(converted * 10) / 10} ${unit}`;
    },
  };
};

/**
 * Hook for error handling integration
 * Provides consistent error handling across the app
 */
export const useErrorHandling = () => {
  return {
    handleApiError: (error: any) => {
      if (error?.message) {
        return error.message;
      }
      if (typeof error === 'string') {
        return error;
      }
      return 'An unexpected error occurred';
    },
    
    isNetworkError: (error: any) => {
      return error?.message?.includes('network') || 
             error?.message?.includes('fetch') ||
             error?.code === 'NETWORK_ERROR';
    },
    
    isAuthError: (error: any) => {
      return error?.message?.includes('auth') ||
             error?.message?.includes('unauthorized') ||
             error?.code === 'AUTH_ERROR';
    },
  };
};

/**
 * Initialize the backend integration
 * Call this in your App.tsx or main component
 */
export const initializeBackend = async () => {
  try {
    await api.initialize();
    console.log('Backend initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize backend:', error);
  }
};

/**
 * Health check for the backend
 * Useful for debugging and monitoring
 */
export const checkBackendHealth = async () => {
  try {
    const result = await api.healthCheck();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
    };
  }
};
