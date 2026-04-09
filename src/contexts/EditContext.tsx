/**
 * Edit Context Provider for Profile Editing
 * Provides context-based edit mode detection and data management
 * Enables seamless reuse of onboarding screens for profile editing
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { profileValidator } from "../services/profileValidator";
import { debounce } from "../utils/performance";
import { useAuth } from "../hooks/useAuth";
import { useUserStore } from "../stores/userStore";
import { useProfileStore } from "../stores/profileStore";
import { useOnboardingIntegration } from "../utils/integration";
import { buildLegacyProfileAdapter } from "../utils/profileLegacyAdapter";
import {
  EditContextData,
  EditActions,
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  ValidationResult,
} from "../types/profileData";

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
  const { getCompleteProfile, profile: rawProfile } = useUserStore();
  const {
    savePersonalInfo,
    saveFitnessGoals,
    saveDietPreferences,
    saveWorkoutPreferences,
  } = useOnboardingIntegration();
  const { personalInfo, bodyAnalysis, workoutPreferences, dietPreferences } =
    useProfileStore();

  // State management
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSection, setEditSection] =
    useState<EditContextData["editSection"]>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [currentData, setCurrentData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const profile = useMemo(
    () => ({
      ...rawProfile,
      ...buildLegacyProfileAdapter({
        personalInfo,
        bodyAnalysis,
        workoutPreferences,
        dietPreferences,
        legacyProfile: rawProfile,
      }),
    }),
    [
      rawProfile,
      personalInfo,
      bodyAnalysis,
      workoutPreferences,
      dietPreferences,
    ],
  );

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
              const profileResponse = await getCompleteProfile(user.id);
              if (profileResponse.success && profileResponse.data) {
                profileData = profileResponse.data;
              }
            } else if (isGuestMode && profile) {
              // For guest users, use data from userStore
              profileData = profile;
            }

            // Extract section-specific data
            if (profileData) {
              switch (section) {
                case "personalInfo":
                  sectionData = profileData.personalInfo;
                  break;
                case "fitnessGoals":
                  sectionData = profileData.fitnessGoals;
                  break;
                case "dietPreferences":
                  sectionData = profileData.dietPreferences;
                  break;
                case "workoutPreferences":
                  sectionData = profileData.workoutPreferences;
                  break;
                default:
                  throw new Error(`Unknown section: ${section}`);
              }

              if (sectionData) {
                // No conversion needed - PersonalInfo matches database schema
                // height/weight are in body_analysis table (BodyMetrics), NOT in profiles table (PersonalInfo)
              }
            }
          } catch (error) {
            console.error(`Error loading ${section}:`, error);
          }
        }

        // If no data found, create default structure for editing
        if (!sectionData || Object.keys(sectionData).length === 0) {
          switch (section) {
            case "personalInfo":
              // PersonalInfo matches database schema - NO height/weight/activityLevel
              // SSOT: profileStore.personalInfo is authoritative (onboarding_data table); userStore.profile is legacy fallback
              const profilePI = useProfileStore.getState().personalInfo;
              const piName =
                `${profilePI?.first_name || ""} ${profilePI?.last_name || ""}`.trim();
              sectionData = {
                first_name:
                  profilePI?.first_name ||
                  profile?.personalInfo?.first_name ||
                  "",
                last_name:
                  profilePI?.last_name ||
                  profile?.personalInfo?.last_name ||
                  "",
                name:
                  piName ||
                  profilePI?.name ||
                  profile?.personalInfo?.name ||
                  "",
                email:
                  user?.email ||
                  profilePI?.email ||
                  profile?.personalInfo?.email ||
                  "",
                age: profilePI?.age || profile?.personalInfo?.age || 0,
                gender:
                  profilePI?.gender ||
                  profile?.personalInfo?.gender ||
                  "prefer_not_to_say",
                country:
                  profilePI?.country || profile?.personalInfo?.country || "",
                state: profilePI?.state || profile?.personalInfo?.state || "",
                region: profilePI?.region ?? profile?.personalInfo?.region,
                wake_time:
                  profilePI?.wake_time ||
                  profile?.personalInfo?.wake_time ||
                  "",
                sleep_time:
                  profilePI?.sleep_time ||
                  profile?.personalInfo?.sleep_time ||
                  "",
                occupation_type:
                  profilePI?.occupation_type ||
                  profile?.personalInfo?.occupation_type ||
                  "desk_job",
                profile_picture:
                  profilePI?.profile_picture ??
                  profile?.personalInfo?.profile_picture,
                dark_mode:
                  profilePI?.dark_mode ?? profile?.personalInfo?.dark_mode,
                units: profilePI?.units || profile?.personalInfo?.units,
                notifications_enabled:
                  profilePI?.notifications_enabled ??
                  profile?.personalInfo?.notifications_enabled,
              };
              break;
            case "fitnessGoals": {
              // SSOT: profileStore.workoutPreferences is authoritative; profile.fitnessGoals (userStore) is legacy fallback
              const profileStoreWP =
                useProfileStore.getState().workoutPreferences;
              sectionData = {
                primary_goals:
                  profileStoreWP?.primary_goals ||
                  profile?.fitnessGoals?.primary_goals ||
                  profile?.fitnessGoals?.primaryGoals ||
                  [],
                time_commitment:
                  String(profileStoreWP?.time_preference || "") ||
                  profile?.fitnessGoals?.time_commitment ||
                  profile?.fitnessGoals?.timeCommitment ||
                  "",
                experience:
                  profileStoreWP?.intensity ||
                  profile?.fitnessGoals?.experience ||
                  "",
                experience_level:
                  profileStoreWP?.intensity ||
                  profile?.fitnessGoals?.experience_level ||
                  profile?.fitnessGoals?.experience ||
                  "",
                id: `fitnessGoals_${user?.id || "guest"}_${Date.now()}`,
                version: 1,
                updatedAt: new Date().toISOString(),
                syncStatus: "pending" as const,
                source: "local" as const,
              };
              break;
            }
            case "dietPreferences": {
              // SSOT: profileStore.dietPreferences is authoritative; profile.dietPreferences (userStore) is legacy fallback
              const profileStoreDP = useProfileStore.getState().dietPreferences;
              const dp = (profileStoreDP || profile?.dietPreferences) as Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
              sectionData = {
                // Basic diet info
                diet_type: dp?.diet_type ?? dp?.dietType ?? "balanced",
                allergies: dp?.allergies || [],
                restrictions: dp?.restrictions || [],

                // Diet readiness toggles (6)
                keto_ready: dp?.keto_ready ?? false,
                intermittent_fasting_ready:
                  dp?.intermittent_fasting_ready ?? false,
                paleo_ready: dp?.paleo_ready ?? false,
                mediterranean_ready: dp?.mediterranean_ready ?? false,
                low_carb_ready: dp?.low_carb_ready ?? false,
                high_protein_ready: dp?.high_protein_ready ?? false,

                // Meal preferences (4)
                breakfast_enabled: dp?.breakfast_enabled !== false,
                lunch_enabled: dp?.lunch_enabled !== false,
                dinner_enabled: dp?.dinner_enabled !== false,
                snacks_enabled: dp?.snacks_enabled !== false,

                // Cooking preferences (3)
                cooking_skill_level:
                  dp?.cooking_skill_level || dp?.cookingSkill || "beginner",
                max_prep_time_minutes: dp?.max_prep_time_minutes || null,
                budget_level: dp?.budget_level || "medium",

                // Health habits (14)
                drinks_enough_water: dp?.drinks_enough_water ?? false,
                limits_sugary_drinks: dp?.limits_sugary_drinks ?? false,
                eats_regular_meals: dp?.eats_regular_meals ?? false,
                avoids_late_night_eating: dp?.avoids_late_night_eating ?? false,
                controls_portion_sizes: dp?.controls_portion_sizes ?? false,
                reads_nutrition_labels: dp?.reads_nutrition_labels ?? false,
                eats_processed_foods: dp?.eats_processed_foods !== false,
                eats_5_servings_fruits_veggies:
                  dp?.eats_5_servings_fruits_veggies ?? false,
                limits_refined_sugar: dp?.limits_refined_sugar ?? false,
                includes_healthy_fats: dp?.includes_healthy_fats ?? false,
                drinks_alcohol: dp?.drinks_alcohol ?? false,
                smokes_tobacco: dp?.smokes_tobacco ?? false,
                drinks_coffee: dp?.drinks_coffee ?? false,
                takes_supplements: dp?.takes_supplements ?? false,
              };
              break;
            }
            case "workoutPreferences":
              sectionData = {
                workoutTypes: profile?.workoutPreferences?.workoutTypes || [],
                equipment: profile?.workoutPreferences?.equipment || [],
                location:
                  profile?.workoutPreferences?.location || ("both" as const),
                intensity:
                  profile?.workoutPreferences?.intensity ||
                  ("beginner" as const),
                timePreference:
                  profile?.workoutPreferences?.timePreference || 30,
                primaryGoals: profile?.workoutPreferences?.primaryGoals || [],
                // SSOT: profileStore.workoutPreferences.activity_level is authoritative (onboarding_data table); activityLevel (camelCase) is always undefined
                activityLevel:
                  useProfileStore.getState().workoutPreferences
                    ?.activity_level ||
                  profile?.workoutPreferences?.activity_level ||
                  "moderate",
                id: `workoutPreferences_${user?.id || "guest"}_${Date.now()}`,
                version: 1,
                updatedAt: new Date().toISOString(),
                syncStatus: "pending" as const,
                source: "local" as const,
              };
              break;
          }
        }

        // Set up edit state

        setEditSection(section as EditContextData["editSection"]);
        setOriginalData(sectionData);
        setCurrentData(sectionData ? { ...sectionData } : {});
        setIsEditMode(true);
        setHasChanges(false);
        setValidationErrors([]);
        setShowOverlay(true);
      } catch (error) {
        console.error("Failed to start edit:", error);
        crossPlatformAlert("Error", "Failed to load data for editing");
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, isGuestMode, profile, getCompleteProfile],
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
          case "personalInfo":
            return profileValidator.validatePersonalInfo(dataToValidate);
          case "fitnessGoals":
            return profileValidator.validateFitnessGoals(dataToValidate);
          case "dietPreferences":
            return profileValidator.validateDietPreferences(dataToValidate);
          case "workoutPreferences":
            return profileValidator.validateWorkoutPreferences(dataToValidate);
          default:
            return { isValid: true, errors: [], warnings: [] };
        }
      } catch (error) {
        console.warn("Validation error:", error);
        return { isValid: true, errors: [], warnings: [] }; // Don't block on validation errors
      }
    },
    [editSection, currentData],
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
    [validateData],
  );

  const updateData = useCallback(
    (newData: any) => {
      if (!newData) return;

      // Skip if same reference (no change)
      if (newData === currentData) return;

      setCurrentData(newData);

      // Check if data has changed from original using reference equality first,
      // then shallow key comparison (avoids expensive JSON.stringify on every keystroke)
      const hasActualChanges = newData !== originalData;
      setHasChanges(hasActualChanges);

      // Only validate if we have meaningful data
      if (Object.keys(newData).length > 2) {
        // More than just id and timestamps
        debouncedValidation(newData);
      }
    },
    [originalData, currentData, debouncedValidation],
  );

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!editSection || !currentData) {
      crossPlatformAlert("Error", "No data to save");
      return false;
    }

    try {
      setIsSaving(true);

      // Quick validation - only validate required fields
      const validationResult = validateData(currentData);
      if (!validationResult.isValid && validationResult.errors.length > 0) {
        crossPlatformAlert(
          "Validation Error",
          `Please fix the following errors:\n\n• ${validationResult.errors.slice(0, 3).join("\n• ")}`,
        );
        setIsSaving(false);
        return false;
      }

      // Save using integration functions (same as onboarding)
      let saveResult: { success: boolean; error?: string } = { success: false };

      switch (editSection) {
        case "personalInfo":
          // No conversion needed - PersonalInfo already matches database schema
          // height/weight are in body_analysis table, NOT profiles table
          saveResult = await savePersonalInfo(currentData);
          break;
        case "fitnessGoals":
          saveResult = await saveFitnessGoals(currentData as FitnessGoals);
          break;
        case "dietPreferences":
          // Transform DietPreferences to match OnboardingData type
          const simplifiedDietPrefs = {
            dietType: (currentData as DietPreferences).diet_type,
            allergies: (currentData as DietPreferences).allergies || [],
            cuisinePreferences: [], // Not in database schema
            restrictions: (currentData as DietPreferences).restrictions || [],
          };
          saveResult = await saveDietPreferences(simplifiedDietPrefs);
          break;
        case "workoutPreferences":
          saveResult = await saveWorkoutPreferences(
            currentData as WorkoutPreferences,
          );
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

        crossPlatformAlert(
          "Success",
          "Your changes have been saved successfully!",
        );
        return true;
      } else {
        const errorMessage = saveResult.error || "Failed to save data";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      crossPlatformAlert("Error", "Failed to save changes. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editSection, currentData, onEditComplete]);

  const cancelEdit = useCallback(() => {
    if (hasChanges) {
      crossPlatformAlert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
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
        ],
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

  return (
    <EditContext.Provider value={contextValue}>{children}</EditContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useEditContext = (): EditContextType => {
  const context = useContext(EditContext);
  if (context === undefined) {
    throw new Error("useEditContext must be used within an EditProvider");
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
  const { currentData, originalData, hasChanges, updateData } =
    useEditContext();
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
