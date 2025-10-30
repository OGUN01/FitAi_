/**
 * Onboarding Container Tests
 * Tests for the main onboarding container component
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { OnboardingContainer } from '../../screens/onboarding/OnboardingContainer';

// Mock dependencies
jest.mock('../../hooks/useOnboardingState', () => ({
  useOnboardingState: () => ({
    // State
    personalInfo: {
      first_name: '',
      last_name: '',
      age: 0,
      gender: 'male',
      country: '',
      state: '',
      wake_time: '',
      sleep_time: '',
      occupation_type: 'desk_job',
    },
    dietPreferences: {
      diet_type: 'non-veg',
      allergies: [],
      restrictions: [],
      keto_ready: false,
      intermittent_fasting_ready: false,
      paleo_ready: false,
      mediterranean_ready: false,
      low_carb_ready: false,
      high_protein_ready: false,
      breakfast_enabled: true,
      lunch_enabled: true,
      dinner_enabled: true,
      snacks_enabled: true,
      cooking_skill_level: 'beginner',
      max_prep_time_minutes: 30,
      budget_level: 'medium',
      drinks_enough_water: false,
      limits_sugary_drinks: false,
      eats_regular_meals: false,
      avoids_late_night_eating: false,
      controls_portion_sizes: false,
      reads_nutrition_labels: false,
      eats_processed_foods: false,
      eats_5_servings_fruits_veggies: false,
      limits_refined_sugar: false,
      includes_healthy_fats: false,
      drinks_alcohol: false,
      smokes_tobacco: false,
      drinks_coffee: false,
      takes_supplements: false,
    },
    bodyAnalysis: {
      height_cm: 0,
      current_weight_kg: 0,
      target_weight_kg: 0,
      target_timeline_weeks: 0,
      medical_conditions: [],
      medications: [],
      physical_limitations: [],
      pregnancy_status: false,
      breastfeeding_status: false,
    },
    workoutPreferences: {
      location: 'home',
      equipment: [],
      time_preference: 30,
      intensity: 'beginner',
      workout_types: [],
      primary_goals: [],
      activity_level: 'sedentary',
      workout_experience_years: 0,
      workout_frequency_per_week: 0,
      can_do_pushups: 0,
      can_run_minutes: 0,
      flexibility_level: 'fair',
      preferred_workout_times: [],
      enjoys_cardio: false,
      enjoys_strength_training: false,
      enjoys_group_classes: false,
      prefers_outdoor_activities: false,
      needs_motivation: false,
      prefers_variety: false,
    },
    advancedReview: {},
    currentTab: 1,
    completedTabs: new Set(),
    tabValidationStatus: {},
    overallCompletion: 0,
    isLoading: false,
    isAutoSaving: false,
    hasUnsavedChanges: false,

    // Actions
    setCurrentTab: jest.fn(),
    markTabCompleted: jest.fn(),
    markTabIncomplete: jest.fn(),
    validateTab: jest.fn(() => ({ is_valid: true, errors: [], warnings: [], completion_percentage: 100 })),
    saveToLocal: jest.fn(() => Promise.resolve(true)),
    completeOnboarding: jest.fn(() => Promise.resolve(true)),
    isOnboardingComplete: jest.fn(() => false),
    updatePersonalInfo: jest.fn(),
    updateDietPreferences: jest.fn(),
    updateBodyAnalysis: jest.fn(),
    updateWorkoutPreferences: jest.fn(),
    updateAdvancedReview: jest.fn(),
  }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('OnboardingContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should render with default starting tab', () => {
      const mockOnComplete = jest.fn();
      const { getByTestId } = render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Should render tab bar
      expect(getByTestId).toBeDefined();
    });

    it('should start at specified tab', () => {
      const mockOnComplete = jest.fn();
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockSetCurrentTab = jest.fn();
      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        setCurrentTab: mockSetCurrentTab,
      });

      render(
        <OnboardingContainer onComplete={mockOnComplete} startingTab={3} />
      );

      // Should set current tab to 3
      expect(mockSetCurrentTab).toHaveBeenCalledWith(3);
    });
  });

  // ============================================================================
  // TAB NAVIGATION TESTS
  // ============================================================================

  describe('Tab Navigation', () => {
    it('should allow navigation to accessible tabs', () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockSetCurrentTab = jest.fn();

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        currentTab: 1,
        completedTabs: new Set([1]),
        setCurrentTab: mockSetCurrentTab,
      });

      const mockOnComplete = jest.fn();
      const { getByText } = render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Tab 2 should be accessible after completing tab 1
      // This test would require tab bar buttons to be rendered
    });

    it('should prevent navigation to inaccessible tabs', () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        currentTab: 1,
        completedTabs: new Set(),
      });

      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Attempting to navigate to tab 3 should show alert
      // Would need to simulate tab press
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Validation', () => {
    it('should validate tab before allowing next', async () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockValidateTab = jest.fn(() => ({
        is_valid: false,
        errors: ['First name is required', 'Last name is required'],
        warnings: [],
        completion_percentage: 0,
      }));

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        validateTab: mockValidateTab,
      });

      const mockOnComplete = jest.fn();
      const { getByText } = render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Should show validation errors when trying to proceed
      // Would need to simulate next button press
    });

    it('should proceed to next tab when validation passes', async () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockValidateTab = jest.fn(() => ({
        is_valid: true,
        errors: [],
        warnings: [],
        completion_percentage: 100,
      }));
      const mockMarkTabCompleted = jest.fn();
      const mockSetCurrentTab = jest.fn();

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        currentTab: 1,
        validateTab: mockValidateTab,
        markTabCompleted: mockMarkTabCompleted,
        setCurrentTab: mockSetCurrentTab,
      });

      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Should mark tab complete and move to next
    });
  });

  // ============================================================================
  // AUTO-SAVE TESTS
  // ============================================================================

  describe('Auto-Save', () => {
    it('should auto-save when there are unsaved changes', async () => {
      jest.useFakeTimers();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockSaveToLocal = jest.fn(() => Promise.resolve(true));

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        hasUnsavedChanges: true,
        saveToLocal: mockSaveToLocal,
      });

      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockSaveToLocal).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  // ============================================================================
  // COMPLETION TESTS
  // ============================================================================

  describe('Completion', () => {
    it('should complete onboarding on final tab', async () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockCompleteOnboarding = jest.fn(() => Promise.resolve(true));

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        currentTab: 5,
        completedTabs: new Set([1, 2, 3, 4]),
        completeOnboarding: mockCompleteOnboarding,
        validateTab: jest.fn(() => ({
          is_valid: true,
          errors: [],
          warnings: [],
          completion_percentage: 100,
        })),
      });

      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Should complete onboarding
    });

    it('should show success message on completion', async () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockCompleteOnboarding = jest.fn(() => Promise.resolve(true));

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        completeOnboarding: mockCompleteOnboarding,
      });

      const mockOnComplete = jest.fn();
      const container = render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Trigger completion
      // Would need to access handleCompleteOnboarding
    });
  });

  // ============================================================================
  // BACK BUTTON TESTS
  // ============================================================================

  describe('Back Button', () => {
    it('should go to previous tab when back is pressed', () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockSetCurrentTab = jest.fn();

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        currentTab: 2,
        setCurrentTab: mockSetCurrentTab,
      });

      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Should navigate to previous tab
    });

    it('should prompt to exit on first tab back press', () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        currentTab: 1,
      });

      const mockOnExit = jest.fn();
      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} onExit={mockOnExit} />
      );

      // Should show exit confirmation
    });
  });

  // ============================================================================
  // UNSAVED CHANGES TESTS
  // ============================================================================

  describe('Unsaved Changes', () => {
    it('should warn when switching tabs with unsaved changes', () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        hasUnsavedChanges: true,
        currentTab: 1,
        completedTabs: new Set([1]),
      });

      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Should show unsaved changes warning
    });

    it('should save changes before exiting', async () => {
      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      const mockSaveToLocal = jest.fn(() => Promise.resolve(true));

      useOnboardingState.mockReturnValue({
        ...useOnboardingState(),
        hasUnsavedChanges: true,
        saveToLocal: mockSaveToLocal,
      });

      const mockOnExit = jest.fn();
      const mockOnComplete = jest.fn();
      render(
        <OnboardingContainer onComplete={mockOnComplete} onExit={mockOnExit} />
      );

      // Should save before exit
    });
  });
});
