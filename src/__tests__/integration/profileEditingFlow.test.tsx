/**
 * Profile Editing Integration Tests
 * End-to-end tests for the complete profile editing flow
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { EditProvider } from '../../contexts/EditContext';
import { ProfileScreen } from '../../screens/main/ProfileScreen';
import { PersonalInfoScreen } from '../../screens/onboarding/PersonalInfoScreen';

// Mock all dependencies
jest.mock('../../services/dataManager', () => ({
  dataManager: {
    setUserId: jest.fn(),
    setOnlineStatus: jest.fn(),
    savePersonalInfo: jest.fn(() => Promise.resolve(true)),
    loadPersonalInfo: jest.fn(() => Promise.resolve({
      id: 'test-1',
      name: 'John Doe',
      age: '25',
      gender: 'male',
      height: '175',
      weight: '70',
      activityLevel: 'moderate',
    })),
    saveFitnessGoals: jest.fn(() => Promise.resolve(true)),
    loadFitnessGoals: jest.fn(() => Promise.resolve(null)),
    saveDietPreferences: jest.fn(() => Promise.resolve(true)),
    loadDietPreferences: jest.fn(() => Promise.resolve(null)),
    saveWorkoutPreferences: jest.fn(() => Promise.resolve(true)),
    loadWorkoutPreferences: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('../../services/profileValidator', () => ({
  profileValidator: {
    validatePersonalInfo: jest.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    validateFitnessGoals: jest.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    validateDietPreferences: jest.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    validateWorkoutPreferences: jest.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    isGuestMode: false,
    logout: jest.fn(),
  }),
}));

jest.mock('../../hooks/useUser', () => ({
  useUser: () => ({
    profile: {
      personalInfo: { name: 'John Doe', age: '25' },
      fitnessGoals: null,
      dietPreferences: null,
      workoutPreferences: null,
    },
  }),
  useUserStats: () => ({
    totalWorkouts: 0,
    totalMeals: 0,
    currentStreak: 0,
  }),
}));

jest.mock('../../utils/integration', () => ({
  useDashboardIntegration: () => ({
    getHealthMetrics: jest.fn(),
  }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Profile Editing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // COMPLETE PROFILE EDITING FLOW
  // ============================================================================

  describe('Complete Profile Editing Flow', () => {
    it('should complete full profile editing cycle', async () => {
      const mockOnComplete = jest.fn();
      const mockOnCancel = jest.fn();

      // Render the profile editing flow
      const { getByTestId, getByText } = render(
        <EditProvider onEditComplete={mockOnComplete} onEditCancel={mockOnCancel}>
          <ProfileScreen />
        </EditProvider>
      );

      // 1. Open profile editing
      const editButton = getByTestId('edit-profile-button');
      fireEvent.press(editButton);

      // 2. Select personal info editing
      await waitFor(() => {
        const personalInfoOption = getByText('Personal Information');
        fireEvent.press(personalInfoOption);
      });

      // 3. Verify edit mode is active
      await waitFor(() => {
        expect(getByTestId('edit-overlay')).toBeTruthy();
      });

      // 4. Make changes to personal info
      const nameInput = getByTestId('name-input');
      fireEvent.changeText(nameInput, 'Jane Doe');

      const ageInput = getByTestId('age-input');
      fireEvent.changeText(ageInput, '30');

      // 5. Save changes
      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      // 6. Verify save was called
      const { dataManager } = require('../../services/dataManager');
      await waitFor(() => {
        expect(dataManager.savePersonalInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Jane Doe',
            age: '30',
          })
        );
      });

      // 7. Verify completion callback
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('should handle validation errors during editing', async () => {
      const { profileValidator } = require('../../services/profileValidator');
      profileValidator.validatePersonalInfo.mockReturnValueOnce({
        isValid: false,
        errors: ['Name is required'],
        warnings: [],
      });

      const { getByTestId, getByText } = render(
        <EditProvider>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={jest.fn()}
          />
        </EditProvider>
      );

      // Try to save with invalid data
      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      // Should show validation error
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        expect.stringContaining('Name is required')
      );
    });

    it('should handle save errors gracefully', async () => {
      const { dataManager } = require('../../services/dataManager');
      dataManager.savePersonalInfo.mockResolvedValueOnce(false);

      const { getByTestId, getByText } = render(
        <EditProvider>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={jest.fn()}
          />
        </EditProvider>
      );

      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      // Should show error alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save changes. Please try again.'
      );
    });
  });

  // ============================================================================
  // CANCEL FLOW TESTS
  // ============================================================================

  describe('Cancel Flow', () => {
    it('should cancel without changes', async () => {
      const mockOnCancel = jest.fn();

      const { getByText } = render(
        <EditProvider onEditCancel={mockOnCancel}>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={mockOnCancel}
          />
        </EditProvider>
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should prompt before canceling with unsaved changes', async () => {
      const { getByTestId, getByText } = render(
        <EditProvider>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={jest.fn()}
          />
        </EditProvider>
      );

      // Make changes
      const nameInput = getByTestId('name-input');
      fireEvent.changeText(nameInput, 'Changed Name');

      // Try to cancel
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      // Should show confirmation dialog
      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // DATA PERSISTENCE TESTS
  // ============================================================================

  describe('Data Persistence', () => {
    it('should persist data to local storage when offline', async () => {
      const { dataManager } = require('../../services/dataManager');
      dataManager.setOnlineStatus(false);

      const { getByTestId, getByText } = render(
        <EditProvider>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={jest.fn()}
          />
        </EditProvider>
      );

      // Make changes and save
      const nameInput = getByTestId('name-input');
      fireEvent.changeText(nameInput, 'Offline User');

      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      // Should still save to local storage
      expect(dataManager.savePersonalInfo).toHaveBeenCalled();
    });

    it('should sync to remote storage when online', async () => {
      const { dataManager } = require('../../services/dataManager');
      dataManager.setOnlineStatus(true);

      const { getByTestId, getByText } = render(
        <EditProvider>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={jest.fn()}
          />
        </EditProvider>
      );

      // Make changes and save
      const nameInput = getByTestId('name-input');
      fireEvent.changeText(nameInput, 'Online User');

      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      // Should save to both local and remote
      expect(dataManager.savePersonalInfo).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // MULTIPLE SECTION EDITING TESTS
  // ============================================================================

  describe('Multiple Section Editing', () => {
    it('should handle editing different profile sections', async () => {
      const { dataManager } = require('../../services/dataManager');

      // Test personal info
      const personalInfoResult = await dataManager.savePersonalInfo({
        name: 'Test User',
        age: '25',
      });
      expect(personalInfoResult).toBe(true);

      // Test fitness goals
      const fitnessGoalsResult = await dataManager.saveFitnessGoals({
        primaryGoals: ['weight_loss'],
        experience: 'beginner',
      });
      expect(fitnessGoalsResult).toBe(true);

      // Test diet preferences
      const dietPreferencesResult = await dataManager.saveDietPreferences({
        dietType: 'vegetarian',
        allergies: ['nuts'],
      });
      expect(dietPreferencesResult).toBe(true);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('should complete editing flow within performance thresholds', async () => {
      const startTime = Date.now();

      const { getByTestId, getByText } = render(
        <EditProvider>
          <PersonalInfoScreen
            isEditMode={true}
            onEditComplete={jest.fn()}
            onEditCancel={jest.fn()}
          />
        </EditProvider>
      );

      // Make changes and save
      const nameInput = getByTestId('name-input');
      fireEvent.changeText(nameInput, 'Performance Test');

      const saveButton = getByText('Save Changes');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
