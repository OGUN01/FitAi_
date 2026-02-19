/**
 * Type definitions for Edit Context
 * Contains all interfaces and types used across edit functionality
 */

import { ReactNode } from "react";
import {
  EditContextData,
  EditActions,
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  ValidationResult,
} from "../../types/profileData";

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface EditContextType extends EditContextData, EditActions {
  // Additional context methods
  isLoading: boolean;
  isSaving: boolean;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
}

export interface EditProviderProps {
  children: ReactNode;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

// Re-export types from profileData for convenience
export type {
  EditContextData,
  EditActions,
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  ValidationResult,
};
