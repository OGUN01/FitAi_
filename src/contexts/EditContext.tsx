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
  const { user, isGuestMode } = useAuth();
  const { getCompleteProfile, profile } = useUserStore();
  const { savePersonalInfo, saveFitnessGoals, saveDietPreferences, saveWorkoutPreferences } =
    useOnboardingIntegration();
  const { setProfile } = useUserStore();

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

  const startEdit = useCallback(
    async (section: string, data?: any) => {
      try {
        setIsLoading(true);

        let sectionData = data;

        // Load existing data if not provided
        if (!sectionData) {
          try {
            let profileData = null;

            if (user?.id && !isGuestMode) {
              // For authenticated users, load from backend
              console.log(`🔄 EditContext: Loading ${section} data for authenticated user`);
              const profileResponse = await getCompleteProfile(user.id);
              if (profileResponse.success && profileResponse.data) {
                profileData = profileResponse.data;
              }
            } else if (isGuestMode && profile) {
              // For guest users, use data from userStore
              console.log(`🔄 EditContext: Loading ${section} data for guest user`);
              profileData = profile;
            }

            // Extract section-specific data
            if (profileData) {
              switch (section) {
                case 'personalInfo':
                  sectionData = profileData.personalInfo;
                  break;
                case 'fitnessGoals':
                  sectionData = profileData.fitnessGoals;
                  break;
                case 'dietPreferences':
                  sectionData = profileData.dietPreferences;
                  break;
                case 'workoutPreferences':
                  sectionData = profileData.workoutPreferences;
                  break;
                default:
                  throw new Error(`Unknown section: ${section}`);
              }
              
              if (sectionData) {
                console.log(`✅ EditContext: Found existing ${section} data:`, sectionData);

                // Special handling for personalInfo: Convert NEW fields to OLD format for display
                if (section === 'personalInfo' && sectionData) {
                  const personalData = sectionData as any;

                  console.log('🔍 EditContext: Raw personalInfo data before conversion:', personalData);

                  // Convert first_name/last_name → name
                  if (!personalData.name && (personalData.first_name || personalData.last_name)) {
                    const firstName = personalData.first_name || '';
                    const lastName = personalData.last_name || '';
                    personalData.name = `${firstName} ${lastName}`.trim();
                    console.log('📝 EditContext: Computed name from first_name/last_name:', personalData.name);
                    delete personalData.first_name;
                    delete personalData.last_name;
                  }

                  // Convert height_cm (number) → height (string)
                  if (personalData.height_cm !== undefined && personalData.height_cm !== null) {
                    personalData.height = String(personalData.height_cm);
                    console.log(`📝 EditContext: Converted height_cm ${personalData.height_cm} → height "${personalData.height}"`);
                    delete personalData.height_cm;
                  }

                  // Convert current_weight_kg (number) → weight (string)
                  if (personalData.current_weight_kg !== undefined && personalData.current_weight_kg !== null) {
                    personalData.weight = String(personalData.current_weight_kg);
                    console.log(`📝 EditContext: Converted current_weight_kg ${personalData.current_weight_kg} → weight "${personalData.weight}"`);
                    delete personalData.current_weight_kg;
                  }

                  // Convert age (number) → age (string) if needed
                  if (typeof personalData.age === 'number') {
                    personalData.age = String(personalData.age);
                    console.log(`📝 EditContext: Converted age number → age string "${personalData.age}"`);
                  }

                  console.log('✅ EditContext: Converted personalInfo data:', personalData);
                  sectionData = personalData;
                }
              }
            }
          } catch (error) {
            console.error(`Error loading ${section}:`, error);
          }
        }

        // If no data found, create default structure for editing
        if (!sectionData || Object.keys(sectionData).length === 0) {
          console.log(`📝 EditContext: No existing ${section} data found, creating default structure`);
          
          switch (section) {
            case 'personalInfo':
              sectionData = {
                name: user?.name || profile?.personalInfo?.name || '',
                email: user?.email || profile?.personalInfo?.email || '',
                age: profile?.personalInfo?.age || '',
                gender: profile?.personalInfo?.gender || '',
                height: profile?.personalInfo?.height || '',
                weight: profile?.personalInfo?.weight || '',
                activityLevel: profile?.personalInfo?.activityLevel || '',
                id: `personalInfo_${user?.id || 'guest'}_${Date.now()}`,
                version: 1,
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending' as const,
                source: 'local' as const,
              };
              break;
            case 'fitnessGoals':
              sectionData = {
                primaryGoals: profile?.fitnessGoals?.primaryGoals || [],
                experience: profile?.fitnessGoals?.experience || '',
                timeCommitment: profile?.fitnessGoals?.timeCommitment || '',
                id: `fitnessGoals_${user?.id || 'guest'}_${Date.now()}`,
                version: 1,
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending' as const,
                source: 'local' as const,
              };
              break;
            case 'dietPreferences':
              sectionData = {
                dietType: profile?.dietPreferences?.dietType || 'non-veg' as const,
                allergies: profile?.dietPreferences?.allergies || [],
                cuisinePreferences: profile?.dietPreferences?.cuisinePreferences || [],
                restrictions: profile?.dietPreferences?.restrictions || [],
                cookingSkill: profile?.dietPreferences?.cookingSkill || 'beginner',
                mealPrepTime: profile?.dietPreferences?.mealPrepTime || 30,
                dislikes: profile?.dietPreferences?.dislikes || [],
                id: `dietPreferences_${user?.id || 'guest'}_${Date.now()}`,
                version: 1,
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending' as const,
                source: 'local' as const,
              };
              break;
            case 'workoutPreferences':
              sectionData = {
                workoutTypes: profile?.workoutPreferences?.workoutTypes || [],
                equipment: profile?.workoutPreferences?.equipment || [],
                location: profile?.workoutPreferences?.location || 'both' as const,
                intensity: profile?.workoutPreferences?.intensity || 'beginner' as const,
                timePreference: profile?.workoutPreferences?.timePreference || 30,
                workoutType: profile?.workoutPreferences?.workoutType || 'strength' as const,
                timeSlots: profile?.workoutPreferences?.timeSlots || [],
                duration: profile?.workoutPreferences?.duration || 30,
                frequency: profile?.workoutPreferences?.frequency || 3,
                restDays: profile?.workoutPreferences?.restDays || [],
                trainingStyle: profile?.workoutPreferences?.trainingStyle || 'balanced' as const,
                goals: profile?.workoutPreferences?.goals || [],
                injuries: profile?.workoutPreferences?.injuries || [],
                experience: profile?.workoutPreferences?.experience || 'beginner' as const,
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
        console.log(`📝 EditContext: Setting up edit mode for ${section} with data:`, {
          hasData: !!sectionData,
          dataKeys: sectionData ? Object.keys(sectionData) : [],
          sectionData: sectionData
        });

        setEditSection(section as EditContextData['editSection']);
        setOriginalData(sectionData);
        setCurrentData(sectionData ? { ...sectionData } : {});
        setIsEditMode(true);
        setHasChanges(false);
        setValidationErrors([]);
        setShowOverlay(true);

        console.log('✅ EditContext: Edit mode setup complete');
      } catch (error) {
        console.error('Failed to start edit:', error);
        Alert.alert('Error', 'Failed to load data for editing');
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, isGuestMode, profile, getCompleteProfile]
  );

  // Validation function - moved before debouncedValidation to fix hoisting issue
  const validateData = useCallback(
    (data?: any): ValidationResult => {
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
    },
    [editSection, currentData]
  );

  // Debounced validation to improve performance (increased delay)
  const debouncedValidation = useMemo(
    () =>
      debounce((data: any) => {
        if (data && Object.keys(data).length > 0) {
          const validationResult = validateData(data);
          setValidationErrors(validationResult.errors);
        }
      }, 1000), // Increased from 300ms to 1000ms
    [validateData]
  );

  const updateData = useCallback(
    (newData: any) => {
      if (!newData) return;

      // Only update if data actually changed
      const dataChanged = JSON.stringify(newData) !== JSON.stringify(currentData);
      if (!dataChanged) return;

      setCurrentData(newData);

      // Check if data has changed from original
      const hasActualChanges = JSON.stringify(newData) !== JSON.stringify(originalData);
      setHasChanges(hasActualChanges);

      // Only validate if we have meaningful data
      if (Object.keys(newData).length > 2) {
        // More than just id and timestamps
        debouncedValidation(newData);
      }
    },
    [originalData, currentData, debouncedValidation]
  );

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
          // Convert OLD format back to NEW format before saving
          const personalInfoToSave = { ...currentData } as any;

          console.log('🔄 EditContext: Converting personalInfo OLD → NEW for saving:', personalInfoToSave);

          // Convert name → first_name/last_name
          if (personalInfoToSave.name) {
            const nameParts = personalInfoToSave.name.trim().split(' ');
            personalInfoToSave.first_name = nameParts[0] || '';
            personalInfoToSave.last_name = nameParts.slice(1).join(' ') || '';
            console.log(`📝 EditContext: Split name "${personalInfoToSave.name}" → first_name: "${personalInfoToSave.first_name}", last_name: "${personalInfoToSave.last_name}"`);
          }

          // Convert height (string) → height_cm (number)
          if (personalInfoToSave.height) {
            const heightNum = parseFloat(personalInfoToSave.height);
            if (!isNaN(heightNum)) {
              personalInfoToSave.height_cm = heightNum;
              console.log(`📝 EditContext: Converted height "${personalInfoToSave.height}" → height_cm ${heightNum}`);
            }
          }

          // Convert weight (string) → current_weight_kg (number)
          if (personalInfoToSave.weight) {
            const weightNum = parseFloat(personalInfoToSave.weight);
            if (!isNaN(weightNum)) {
              personalInfoToSave.current_weight_kg = weightNum;
              console.log(`📝 EditContext: Converted weight "${personalInfoToSave.weight}" → current_weight_kg ${weightNum}`);
            }
          }

          // Convert age (string) → age (number) if needed
          if (typeof personalInfoToSave.age === 'string') {
            const ageNum = parseInt(personalInfoToSave.age);
            if (!isNaN(ageNum)) {
              personalInfoToSave.age = ageNum;
              console.log(`📝 EditContext: Converted age "${personalInfoToSave.age}" → age number ${ageNum}`);
            }
          }

          console.log('✅ EditContext: Final personalInfo to save:', personalInfoToSave);
          saveResult = await savePersonalInfo(personalInfoToSave as PersonalInfo);
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
        // For guest users, update the profile in userStore to reflect changes immediately
        if (isGuestMode && profile) {
          const updatedProfile = { ...profile };
          switch (editSection) {
            case 'personalInfo':
              updatedProfile.personalInfo = currentData as PersonalInfo;
              break;
            case 'fitnessGoals':
              updatedProfile.fitnessGoals = currentData as FitnessGoals;
              break;
            case 'dietPreferences':
              updatedProfile.dietPreferences = currentData as DietPreferences;
              break;
            case 'workoutPreferences':
              updatedProfile.workoutPreferences = currentData as WorkoutPreferences;
              break;
          }
          updatedProfile.updatedAt = new Date().toISOString();
          setProfile(updatedProfile);
          console.log(`✅ EditContext: Updated ${editSection} in profile for guest user`);
        }

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

  return <EditContext.Provider value={contextValue}>{children}</EditContext.Provider>;
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
