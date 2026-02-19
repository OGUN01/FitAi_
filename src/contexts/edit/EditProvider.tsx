import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Alert } from "react-native";
import { debounce } from "../../utils/performance";
import { useAuth } from "../../hooks/useAuth";
import { useUserStore } from "../../stores/userStore";
import { useOnboardingIntegration } from "../../utils/integration";
import { validateEditData } from "./validation";
import { loadSectionData, createDefaultSectionData } from "./data-loaders";
import {
  EditContextType,
  EditProviderProps,
  EditContextData,
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
} from "./types";

const EditContext = createContext<EditContextType | undefined>(undefined);

export const EditProvider: React.FC<EditProviderProps> = ({
  children,
  onEditComplete,
  onEditCancel,
}) => {
  const { user, isGuestMode } = useAuth();
  const { getCompleteProfile, profile, setProfile } = useUserStore();
  const {
    savePersonalInfo,
    saveFitnessGoals,
    saveDietPreferences,
    saveWorkoutPreferences,
  } = useOnboardingIntegration();

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

  const validateData = useCallback(
    (data?: any) => {
      const dataToValidate = data || currentData;
      return validateEditData(editSection, dataToValidate);
    },
    [editSection, currentData],
  );

  const debouncedValidation = useMemo(
    () =>
      debounce((data: any) => {
        if (data && Object.keys(data).length > 0) {
          const validationResult = validateData(data);
          setValidationErrors(validationResult.errors);
        }
      }, 1000),
    [validateData],
  );

  const startEdit = useCallback(
    async (section: string, data?: any) => {
      try {
        setIsLoading(true);

        let sectionData = data;

        if (!sectionData) {
          try {
            sectionData = await loadSectionData({
              section,
              user,
              isGuestMode,
              profile,
              getCompleteProfile,
            });
          } catch (error) {
            console.error(`Error loading ${section}:`, error);
          }
        }

        if (!sectionData || Object.keys(sectionData).length === 0) {
          sectionData = createDefaultSectionData(section, user, profile);
        }

        console.log(
          `📝 EditContext: Setting up edit mode for ${section} with data:`,
          {
            hasData: !!sectionData,
            dataKeys: sectionData ? Object.keys(sectionData) : [],
            sectionData: sectionData,
          },
        );

        setEditSection(section as EditContextData["editSection"]);
        setOriginalData(sectionData);
        setCurrentData(sectionData ? { ...sectionData } : {});
        setIsEditMode(true);
        setHasChanges(false);
        setValidationErrors([]);
        setShowOverlay(true);

        console.log("✅ EditContext: Edit mode setup complete");
      } catch (error) {
        console.error("Failed to start edit:", error);
        Alert.alert("Error", "Failed to load data for editing");
      } finally {
        setIsLoading(false);
      }
    },
    [user, isGuestMode, profile, getCompleteProfile],
  );

  const updateData = useCallback(
    (newData: any) => {
      if (!newData) return;

      const dataChanged =
        JSON.stringify(newData) !== JSON.stringify(currentData);
      if (!dataChanged) return;

      setCurrentData(newData);

      const hasActualChanges =
        JSON.stringify(newData) !== JSON.stringify(originalData);
      setHasChanges(hasActualChanges);

      if (Object.keys(newData).length > 2) {
        debouncedValidation(newData);
      }
    },
    [originalData, currentData, debouncedValidation],
  );

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!editSection || !currentData) {
      Alert.alert("Error", "No data to save");
      return false;
    }

    try {
      setIsSaving(true);

      const validationResult = validateData(currentData);
      if (!validationResult.isValid && validationResult.errors.length > 0) {
        Alert.alert(
          "Validation Error",
          `Please fix the following errors:\n\n• ${validationResult.errors.slice(0, 3).join("\n• ")}`,
        );
        setIsSaving(false);
        return false;
      }

      let saveResult: { success: boolean; error?: string } = { success: false };

      switch (editSection) {
        case "personalInfo":
          console.log(
            "✅ EditContext: Saving PersonalInfo (matches database schema):",
            currentData,
          );
          saveResult = await savePersonalInfo(currentData);
          break;
        case "fitnessGoals":
          saveResult = await saveFitnessGoals(currentData as FitnessGoals);
          break;
        case "dietPreferences":
          const simplifiedDietPrefs = {
            dietType: (currentData as DietPreferences).diet_type,
            allergies: (currentData as DietPreferences).allergies || [],
            cuisinePreferences: [],
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
        if (isGuestMode && profile) {
          const updatedProfile = { ...profile };
          switch (editSection) {
            case "personalInfo":
              updatedProfile.personalInfo = currentData as PersonalInfo;
              break;
            case "fitnessGoals":
              updatedProfile.fitnessGoals = currentData as FitnessGoals;
              break;
            case "dietPreferences":
              updatedProfile.dietPreferences = currentData as DietPreferences;
              break;
            case "workoutPreferences":
              updatedProfile.workoutPreferences =
                currentData as WorkoutPreferences;
              break;
          }
          updatedProfile.updatedAt = new Date().toISOString();
          setProfile(updatedProfile);
          console.log(
            `✅ EditContext: Updated ${editSection} in profile for guest user`,
          );
        }

        setIsEditMode(false);
        setEditSection(null);
        setOriginalData(null);
        setCurrentData(null);
        setHasChanges(false);
        setValidationErrors([]);
        setShowOverlay(false);

        onEditComplete?.();

        Alert.alert("Success", "Your changes have been saved successfully!");
        return true;
      } else {
        const errorMessage = saveResult.error || "Failed to save data";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    editSection,
    currentData,
    validateData,
    isGuestMode,
    profile,
    setProfile,
    onEditComplete,
    savePersonalInfo,
    saveFitnessGoals,
    saveDietPreferences,
    saveWorkoutPreferences,
  ]);

  const cancelEdit = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setIsEditMode(false);
              setEditSection(null);
              setOriginalData(null);
              setCurrentData(null);
              setHasChanges(false);
              setValidationErrors([]);
              setShowOverlay(false);

              onEditCancel?.();
            },
          },
        ],
      );
    } else {
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

  const contextValue: EditContextType = {
    isEditMode,
    editSection,
    originalData,
    currentData,
    hasChanges,
    validationErrors,
    startEdit,
    updateData,
    saveChanges,
    cancelEdit,
    validateData,
    isLoading,
    isSaving,
    showOverlay,
    setShowOverlay,
  };

  return (
    <EditContext.Provider value={contextValue}>{children}</EditContext.Provider>
  );
};

export function useEditContext(): EditContextType {
  const context = useContext(EditContext);
  if (context === undefined) {
    throw new Error("useEditContext must be used within an EditProvider");
  }
  return context;
}
