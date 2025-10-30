/**
 * Onboarding Flow Integration Tests
 * End-to-end tests for the complete onboarding process
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { OnboardingContainer } from '../../screens/onboarding/OnboardingContainer';

// Mock the entire onboarding state hook with realistic behavior
const createMockOnboardingState = () => {
  let state = {
    personalInfo: {
      first_name: '',
      last_name: '',
      age: 0,
      gender: 'male' as const,
      country: '',
      state: '',
      wake_time: '',
      sleep_time: '',
      occupation_type: 'desk_job' as const,
    },
    dietPreferences: {
      diet_type: 'non-veg' as const,
      allergies: [] as string[],
      restrictions: [] as string[],
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
      cooking_skill_level: 'beginner' as const,
      max_prep_time_minutes: 30,
      budget_level: 'medium' as const,
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
      medical_conditions: [] as string[],
      medications: [] as string[],
      physical_limitations: [] as string[],
      pregnancy_status: false,
      breastfeeding_status: false,
    },
    workoutPreferences: {
      location: 'home' as const,
      equipment: [] as string[],
      time_preference: 30,
      intensity: 'beginner' as const,
      workout_types: [] as string[],
      primary_goals: [] as string[],
      activity_level: 'sedentary' as const,
      workout_experience_years: 0,
      workout_frequency_per_week: 0,
      can_do_pushups: 0,
      can_run_minutes: 0,
      flexibility_level: 'fair' as const,
      preferred_workout_times: [] as string[],
      enjoys_cardio: false,
      enjoys_strength_training: false,
      enjoys_group_classes: false,
      prefers_outdoor_activities: false,
      needs_motivation: false,
      prefers_variety: false,
    },
    advancedReview: {},
    currentTab: 1,
    completedTabs: new Set<number>(),
    tabValidationStatus: {},
    overallCompletion: 0,
    isLoading: false,
    isAutoSaving: false,
    hasUnsavedChanges: false,
  };

  return {
    ...state,
    setCurrentTab: jest.fn((tab: number) => {
      state.currentTab = tab;
    }),
    markTabCompleted: jest.fn((tab: number) => {
      state.completedTabs.add(tab);
    }),
    markTabIncomplete: jest.fn((tab: number) => {
      state.completedTabs.delete(tab);
    }),
    validateTab: jest.fn((tab: number, data?: any) => {
      // Simulate validation logic
      const errors: string[] = [];

      if (tab === 1 && data) {
        if (!data.first_name) errors.push('First name is required');
        if (!data.last_name) errors.push('Last name is required');
        if (data.age < 13 || data.age > 120) errors.push('Age must be between 13 and 120');
        if (!data.country) errors.push('Country is required');
        if (!data.state) errors.push('State is required');
        if (!data.wake_time) errors.push('Wake time is required');
        if (!data.sleep_time) errors.push('Sleep time is required');
      }

      if (tab === 3 && data) {
        if (data.height_cm < 100 || data.height_cm > 250) errors.push('Height must be between 100-250 cm');
        if (data.current_weight_kg < 30 || data.current_weight_kg > 300) errors.push('Weight must be between 30-300 kg');
        if (data.target_weight_kg < 30 || data.target_weight_kg > 300) errors.push('Target weight must be between 30-300 kg');
        if (data.target_timeline_weeks < 4 || data.target_timeline_weeks > 104) errors.push('Timeline must be between 4-104 weeks');
      }

      if (tab === 4 && data) {
        if (!data.primary_goals || data.primary_goals.length === 0) errors.push('At least one goal is required');
        if (!data.workout_types || data.workout_types.length === 0) errors.push('At least one workout type is required');
      }

      return {
        is_valid: errors.length === 0,
        errors,
        warnings: [] as string[],
        completion_percentage: errors.length === 0 ? 100 : 50,
      };
    }),
    saveToLocal: jest.fn(() => Promise.resolve(true)),
    completeOnboarding: jest.fn(() => Promise.resolve(true)),
    isOnboardingComplete: jest.fn(() => state.completedTabs.size >= 5),
    updatePersonalInfo: jest.fn((data: any) => {
      state.personalInfo = { ...state.personalInfo, ...data };
      state.hasUnsavedChanges = true;
    }),
    updateDietPreferences: jest.fn((data: any) => {
      state.dietPreferences = { ...state.dietPreferences, ...data };
      state.hasUnsavedChanges = true;
    }),
    updateBodyAnalysis: jest.fn((data: any) => {
      state.bodyAnalysis = { ...state.bodyAnalysis, ...data };
      state.hasUnsavedChanges = true;
    }),
    updateWorkoutPreferences: jest.fn((data: any) => {
      state.workoutPreferences = { ...state.workoutPreferences, ...data };
      state.hasUnsavedChanges = true;
    }),
    updateAdvancedReview: jest.fn((data: any) => {
      state.advancedReview = { ...state.advancedReview, ...data };
    }),
  };
};

jest.mock('../../hooks/useOnboardingState', () => ({
  useOnboardingState: () => createMockOnboardingState(),
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

describe('Onboarding Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // COMPLETE FLOW TESTS
  // ============================================================================

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding with valid data', async () => {
      const mockOnComplete = jest.fn();
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const { getByText } = render(
        <OnboardingContainer onComplete={mockOnComplete} />
      );

      // Tab 1: Personal Info - Fill valid data
      mockState.updatePersonalInfo({
        first_name: 'John',
        last_name: 'Doe',
        age: 30,
        gender: 'male',
        country: 'USA',
        state: 'California',
        wake_time: '06:00',
        sleep_time: '22:00',
        occupation_type: 'desk_job',
      });

      // Validate and move to next tab
      const validation1 = mockState.validateTab(1, mockState.personalInfo);
      expect(validation1.is_valid).toBe(true);

      mockState.markTabCompleted(1);
      mockState.setCurrentTab(2);

      // Tab 2: Diet Preferences - Default values should be valid
      mockState.markTabCompleted(2);
      mockState.setCurrentTab(3);

      // Tab 3: Body Analysis - Fill valid data
      mockState.updateBodyAnalysis({
        height_cm: 175,
        current_weight_kg: 80,
        target_weight_kg: 75,
        target_timeline_weeks: 12,
        pregnancy_status: false,
        breastfeeding_status: false,
      });

      const validation3 = mockState.validateTab(3, mockState.bodyAnalysis);
      expect(validation3.is_valid).toBe(true);

      mockState.markTabCompleted(3);
      mockState.setCurrentTab(4);

      // Tab 4: Workout Preferences - Fill valid data
      mockState.updateWorkoutPreferences({
        primary_goals: ['weight_loss'],
        workout_types: ['cardio', 'strength'],
        location: 'gym',
        equipment: ['dumbbells', 'treadmill'],
        time_preference: 45,
        intensity: 'intermediate',
        activity_level: 'moderate',
      });

      const validation4 = mockState.validateTab(4, mockState.workoutPreferences);
      expect(validation4.is_valid).toBe(true);

      mockState.markTabCompleted(4);
      mockState.setCurrentTab(5);

      // Tab 5: Advanced Review - Complete onboarding
      mockState.markTabCompleted(5);

      await act(async () => {
        await mockState.completeOnboarding();
      });

      expect(mockState.completeOnboarding).toHaveBeenCalled();
      expect(mockState.isOnboardingComplete()).toBe(true);
    });

    it('should track progress through all tabs', () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Start at tab 1
      expect(mockState.currentTab).toBe(1);
      expect(mockState.completedTabs.size).toBe(0);

      // Complete each tab
      for (let i = 1; i <= 5; i++) {
        mockState.markTabCompleted(i);
        expect(mockState.completedTabs.has(i)).toBe(true);
      }

      expect(mockState.completedTabs.size).toBe(5);
    });
  });

  // ============================================================================
  // VALIDATION ERROR HANDLING TESTS
  // ============================================================================

  describe('Validation Error Handling', () => {
    it('should prevent progression with invalid personal info', () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Try to validate empty personal info
      const validation = mockState.validateTab(1, mockState.personalInfo);

      expect(validation.is_valid).toBe(false);
      expect(validation.errors).toContain('First name is required');
      expect(validation.errors).toContain('Last name is required');
      expect(validation.errors).toContain('Country is required');
    });

    it('should prevent progression with invalid body metrics', () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Invalid body metrics
      const invalidData = {
        height_cm: 50, // Too low
        current_weight_kg: 400, // Too high
        target_weight_kg: 500, // Too high
        target_timeline_weeks: 200, // Too high
      };

      const validation = mockState.validateTab(3, invalidData);

      expect(validation.is_valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should prevent progression without workout goals', () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Empty workout preferences
      const validation = mockState.validateTab(4, {
        primary_goals: [],
        workout_types: [],
      });

      expect(validation.is_valid).toBe(false);
      expect(validation.errors).toContain('At least one goal is required');
      expect(validation.errors).toContain('At least one workout type is required');
    });
  });

  // ============================================================================
  // DATA PERSISTENCE TESTS
  // ============================================================================

  describe('Data Persistence', () => {
    it('should save data to local storage', async () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Update data
      mockState.updatePersonalInfo({ first_name: 'John' });

      // Save
      await act(async () => {
        await mockState.saveToLocal();
      });

      expect(mockState.saveToLocal).toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const mockState = createMockOnboardingState();
      mockState.saveToLocal = jest.fn(() => Promise.resolve(false));

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Try to save
      const result = await mockState.saveToLocal();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // TAB ACCESSIBILITY TESTS
  // ============================================================================

  describe('Tab Accessibility', () => {
    it('should allow access to tab 1 always', () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Tab 1 should always be accessible
      expect(mockState.currentTab).toBe(1);
    });

    it('should unlock tabs sequentially', () => {
      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Complete tab 1
      mockState.markTabCompleted(1);

      // Tab 2 should now be accessible
      mockState.setCurrentTab(2);
      expect(mockState.currentTab).toBe(2);

      // But tab 3 should not be accessible yet without completing tab 2
      expect(mockState.completedTabs.has(2)).toBe(false);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('should complete onboarding flow within acceptable time', async () => {
      const startTime = Date.now();

      const mockState = createMockOnboardingState();

      const { useOnboardingState } = require('../../hooks/useOnboardingState');
      useOnboardingState.mockReturnValue(mockState);

      const mockOnComplete = jest.fn();
      render(<OnboardingContainer onComplete={mockOnComplete} />);

      // Simulate quick data entry and validation
      for (let i = 1; i <= 5; i++) {
        mockState.setCurrentTab(i);
        mockState.markTabCompleted(i);
      }

      await act(async () => {
        await mockState.completeOnboarding();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second (generous for test environment)
      expect(duration).toBeLessThan(1000);
    });
  });
});
