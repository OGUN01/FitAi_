/**
 * Edit Context Provider for Profile Editing
 * Provides context-based edit mode detection and data management
 * Enables seamless reuse of onboarding screens for profile editing
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { Alert } from 'react-native';
import { profileValidator } from '../services/profileValidator';
import { debounce } from '../utils/performance';
import { useAuth } from '../hooks/useAuth';
import { useUserStore } from '../stores/userStore';
import { useOnboardingIntegration } from '../utils/integration';
import {
  EditContextData,
  EditActions,
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  ValidationResult,
} from '../types/profileData';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface EditContextType extends EditContextData, EditActions {
  // Additional context methods
  isLoading: boolean;
  isSaving: boolean;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
}

interface EditProviderProps {
  children: ReactNode;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const EditContext = createContext<EditContextType | undefined>(undefined);

// ============================================================================
// EDIT PROVIDER COMPONENT
// ============================================================================

export const EditProvider: React.FC<EditProviderProps> = ({
  children,
  onEditComplete,
  onEditCancel,
}) => {
  // Get current user for dataManager initialization
  const { user } = useAuth();
  const { getCompleteProfile } = useUserStore();
  const { savePersonalInfo, saveFitnessGoals, saveDietPreferences, saveWorkoutPreferences } = useOnboardingIntegration();

  // State management
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSection, setEditSection] = useState<EditContextData['editSection']>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [currentData, setCurrentData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // ============================================================================
  // EDIT ACTIONS
  // ============================================================================

  const startEdit = useCallback(async (section: string, data?: any) => {
    try {
      setIsLoading(true);


      let sectionData = data;

      // Load existing data if not provided
      if (!sectionData && user?.id) {
        try {
          const profileResponse = await getCompleteProfile(user.id);
          
          if (profileResponse.success && profileResponse.data) {
            const profile = profileResponse.data;

            switch (section) {
              case 'personalInfo':
                sectionData = profile.personalInfo;
                break;
              case 'fitnessGoals':
                sectionData = profile.fitnessGoals;
                break;
              case 'dietPreferences':
                sectionData = profile.dietPreferences;
                break;
              case 'workoutPreferences':
                sectionData = profile.workoutPreferences;
                break;
              default:
                throw new Error(`Unknown section: ${section}`);
            }
          }
        } catch (error) {
          console.error(`Error loading ${section}:`, error);
        }
      }

      // If no data found, create default structure for editing
      if (!sectionData || Object.keys(sectionData).length === 0) {
        switch (section) {
          case 'personalInfo':
            sectionData = {
              name: user?.name || '',
              email: user?.email || '',
              age: '',
              gender: '',
              height: '',
              weight: '',
              activityLevel: '',
              id: `personalInfo_${user?.id || 'guest'}_${Date.now()}`,
              version: 1,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending' as const,
              source: 'local' as const,
            };
            break;
          case 'fitnessGoals':
            sectionData = {
              primaryGoals: [],
              experience: '',
              timeCommitment: '',
              id: `fitnessGoals_${user?.id || 'guest'}_${Date.now()}`,
              version: 1,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending' as const,
              source: 'local' as const,
            };
            break;
          case 'dietPreferences':
            sectionData = {
              dietType: 'non-veg' as const,
              allergies: [],
              cuisinePreferences: [],
              restrictions: [],
              id: `dietPreferences_${user?.id || 'guest'}_${Date.now()}`,
              version: 1,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending' as const,
              source: 'local' as const,
            };
            break;
          case 'workoutPreferences':
            sectionData = {
              workoutTypes: [],
              equipment: [],
              location: 'both' as const,
              intensity: 'beginner' as const,
              timePreference: 30,
              id: `workoutPreferences_${user?.id || 'guest'}_${Date.now()}`,
              version: 1,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending' as const,
              source: 'local' as const,
            };
            break;
        }
      }

      // Set up edit state
      setEditSection(section as EditContextData['editSection']);
      setOriginalData(sectionData);
      setCurrentData(sectionData ? { ...sectionData } : {});
      setIsEditMode(true);
      setHasChanges(false);
      setValidationErrors([]);
      setShowOverlay(true);
    } catch (error) {
      console.error('Failed to start edit:', error);
      Alert.alert('Error', 'Failed to load data for editing');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Debounced validation to improve performance (increased delay)
  const debouncedValidation = useMemo(
    () => debounce((data: any) => {
      if (data && Object.keys(data).length > 0) {
        const validationResult = validateData(data);
        setValidationErrors(validationResult.errors);
      }
    }, 1000), // Increased from 300ms to 1000ms
    [validateData]
  );

  const updateData = useCallback((newData: any) => {
    if (!newData) return;
    
    // Only update if data actually changed
    const dataChanged = JSON.stringify(newData) !== JSON.stringify(currentData);
    if (!dataChanged) return;

    setCurrentData(newData);

    // Check if data has changed from original
    const hasActualChanges = JSON.stringify(newData) !== JSON.stringify(originalData);
    setHasChanges(hasActualChanges);

    // Only validate if we have meaningful data
    if (Object.keys(newData).length > 2) { // More than just id and timestamps
      debouncedValidation(newData);
    }
  }, [originalData, currentData, debouncedValidation]);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!editSection || !currentData) {
      Alert.alert('Error', 'No data to save');
      return false;
    }

    try {
      setIsSaving(true);

      // Quick validation - only validate required fields
      const validationResult = validateData(currentData);
      if (!validationResult.isValid && validationResult.errors.length > 0) {
        Alert.alert(
          'Validation Error',
          `Please fix the following errors:\n\n• ${validationResult.errors.slice(0, 3).join('\n• ')}`
        );
        setIsSaving(false);
        return false;
      }

      // Save using integration functions (same as onboarding)
      let saveResult: { success: boolean; error?: string } = { success: false };
      
      switch (editSection) {
        case 'personalInfo':
          saveResult = await savePersonalInfo(currentData as PersonalInfo);
          break;
        case 'fitnessGoals':
          saveResult = await saveFitnessGoals(currentData as FitnessGoals);
          break;
        case 'dietPreferences':
          saveResult = await saveDietPreferences(currentData as DietPreferences);
          break;
        case 'workoutPreferences':
          saveResult = await saveWorkoutPreferences(currentData as WorkoutPreferences);
          break;
        default:
          throw new Error(`Unknown section: ${editSection}`);
      }

      const saveSuccess = saveResult.success;

      if (saveSuccess) {
        
        // Reset edit state
        setIsEditMode(false);
        setEditSection(null);
        setOriginalData(null);
        setCurrentData(null);
        setHasChanges(false);
        setValidationErrors([]);
        setShowOverlay(false);

        // Trigger completion callback
        onEditComplete?.();

        Alert.alert('Success', 'Your changes have been saved successfully!');
        return true;
      } else {
        const errorMessage = saveResult.error || 'Failed to save data';
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Failed to save changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editSection, currentData, onEditComplete]);

  const cancelEdit = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              // Reset edit state
              setIsEditMode(false);
              setEditSection(null);
              setOriginalData(null);
              setCurrentData(null);
              setHasChanges(false);
              setValidationErrors([]);
              setShowOverlay(false);

              // Trigger cancel callback
              onEditCancel?.();
            },
          },
        ]
      );
    } else {
      // No changes, safe to cancel
      setIsEditMode(false);
      setEditSection(null);
      setOriginalData(null);
      setCurrentData(null);
      setHasChanges(false);
      setValidationErrors([]);
      setShowOverlay(false);

      onEditCancel?.();
    }
  }, [hasChanges, onEditCancel]);

  const validateData = useCallback((data?: any): ValidationResult => {
    if (!editSection) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const dataToValidate = data || currentData;
    if (!dataToValidate || Object.keys(dataToValidate).length === 0) {
      return { isValid: true, errors: [], warnings: [] }; // Allow empty data during editing
    }

    try {
      switch (editSection) {
        case 'personalInfo':
          return profileValidator.validatePersonalInfo(dataToValidate);
        case 'fitnessGoals':
          return profileValidator.validateFitnessGoals(dataToValidate);
        case 'dietPreferences':
          return profileValidator.validateDietPreferences(dataToValidate);
        case 'workoutPreferences':
          return profileValidator.validateWorkoutPreferences(dataToValidate);
        default:
          return { isValid: true, errors: [], warnings: [] };
      }
    } catch (error) {
      console.warn('Validation error:', error);
      return { isValid: true, errors: [], warnings: [] }; // Don't block on validation errors
    }
  }, [editSection, currentData]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: EditContextType = {
    // Edit context data
    isEditMode,
    editSection,
    originalData,
    currentData,
    hasChanges,
    validationErrors,

    // Edit actions
    startEdit,
    updateData,
    saveChanges,
    cancelEdit,
    validateData,

    // Additional state
    isLoading,
    isSaving,
    showOverlay,
    setShowOverlay,
  };

  return (
    <EditContext.Provider value={contextValue}>
      {children}
    </EditContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useEditContext = (): EditContextType => {
  const context = useContext(EditContext);
  if (context === undefined) {
    throw new Error('useEditContext must be used within an EditProvider');
  }
  return context;
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export const useEditMode = () => {
  const { isEditMode, editSection } = useEditContext();
  return { isEditMode, editSection };
};

export const useEditData = () => {
  const { currentData, originalData, hasChanges, updateData } = useEditContext();
  return { currentData, originalData, hasChanges, updateData };
};

export const useEditActions = () => {
  const { startEdit, saveChanges, cancelEdit, validateData } = useEditContext();
  return { startEdit, saveChanges, cancelEdit, validateData };
};

export const useEditValidation = () => {
  const { validationErrors, validateData } = useEditContext();
  return { validationErrors, validateData };
};

export const useEditStatus = () => {
  const { isLoading, isSaving, showOverlay, setShowOverlay } = useEditContext();
  return { isLoading, isSaving, showOverlay, setShowOverlay };
};
