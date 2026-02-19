import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  TabValidationResult,
} from "../../types/onboarding";

// ============================================================================
// STATE TYPES
// ============================================================================

export interface OnboardingState {
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

export interface OnboardingActions {
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

export type OnboardingStateWithActions = OnboardingState & OnboardingActions;
