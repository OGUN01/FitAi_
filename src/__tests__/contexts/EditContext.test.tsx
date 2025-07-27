/**
 * Edit Context Tests
 * Comprehensive test suite for profile editing context
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { EditProvider, useEditContext } from '../../contexts/EditContext';
import { PersonalInfo } from '../../types/profileData';

// Mock dependencies
jest.mock('../../services/dataManager', () => ({
  dataManager: {
    savePersonalInfo: jest.fn(() => Promise.resolve(true)),
    loadPersonalInfo: jest.fn(() => Promise.resolve(null)),
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

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Test component that uses EditContext
const TestComponent: React.FC = () => {
  const {
    isEditMode,
    editSection,
    currentData,
    hasChanges,
    startEdit,
    updateData,
    saveChanges,
    cancelEdit,
    isLoading,
    isSaving,
  } = useEditContext();

  return (
    <>
      <div testID="edit-mode">{isEditMode.toString()}</div>
      <div testID="edit-section">{editSection || 'none'}</div>
      <div testID="has-changes">{hasChanges.toString()}</div>
      <div testID="is-loading">{isLoading.toString()}</div>
      <div testID="is-saving">{isSaving.toString()}</div>
      <div testID="current-data">{JSON.stringify(currentData)}</div>
      
      <button
        testID="start-edit-btn"
        onPress={() => startEdit('personalInfo', { name: 'Test User' })}
      />
      <button
        testID="update-data-btn"
        onPress={() => updateData({ name: 'Updated User', age: '25' })}
      />
      <button
        testID="save-changes-btn"
        onPress={() => saveChanges()}
      />
      <button
        testID="cancel-edit-btn"
        onPress={() => cancelEdit()}
      />
    </>
  );
};

describe('EditContext', () => {
  const mockOnEditComplete = jest.fn();
  const mockOnEditCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = () => {
    return render(
      <EditProvider
        onEditComplete={mockOnEditComplete}
        onEditCancel={mockOnEditCancel}
      >
        <TestComponent />
      </EditProvider>
    );
  };

  // ============================================================================
  // INITIAL STATE TESTS
  // ============================================================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { getByTestId } = renderWithProvider();

      expect(getByTestId('edit-mode')).toHaveTextContent('false');
      expect(getByTestId('edit-section')).toHaveTextContent('none');
      expect(getByTestId('has-changes')).toHaveTextContent('false');
      expect(getByTestId('is-loading')).toHaveTextContent('false');
      expect(getByTestId('is-saving')).toHaveTextContent('false');
      expect(getByTestId('current-data')).toHaveTextContent('null');
    });
  });

  // ============================================================================
  // START EDIT TESTS
  // ============================================================================

  describe('Start Edit', () => {
    it('should start edit mode correctly', async () => {
      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('edit-mode')).toHaveTextContent('true');
        expect(getByTestId('edit-section')).toHaveTextContent('personalInfo');
        expect(getByTestId('current-data')).toHaveTextContent('{"name":"Test User"}');
      });
    });

    it('should load existing data when starting edit', async () => {
      const existingData: PersonalInfo = {
        id: 'test-1',
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
        source: 'local',
        name: 'Existing User',
        age: '30',
        gender: 'male',
        height: '180',
        weight: '75',
        activityLevel: 'active',
      };

      const { dataManager } = require('../../services/dataManager');
      dataManager.loadPersonalInfo.mockResolvedValueOnce(existingData);

      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('current-data')).toHaveTextContent(JSON.stringify(existingData));
      });
    });

    it('should handle loading errors gracefully', async () => {
      const { dataManager } = require('../../services/dataManager');
      dataManager.loadPersonalInfo.mockRejectedValueOnce(new Error('Load failed'));

      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      // Should not crash and should show loading state
      expect(getByTestId('edit-mode')).toHaveTextContent('false');
    });
  });

  // ============================================================================
  // UPDATE DATA TESTS
  // ============================================================================

  describe('Update Data', () => {
    it('should update data and detect changes', async () => {
      const { getByTestId } = renderWithProvider();

      // Start edit first
      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      // Update data
      await act(async () => {
        getByTestId('update-data-btn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('has-changes')).toHaveTextContent('true');
        expect(getByTestId('current-data')).toHaveTextContent('{"name":"Updated User","age":"25"}');
      });
    });

    it('should validate data on update', async () => {
      const { profileValidator } = require('../../services/profileValidator');
      profileValidator.validatePersonalInfo.mockReturnValueOnce({
        isValid: false,
        errors: ['Name is required'],
        warnings: [],
      });

      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('update-data-btn').props.onPress();
      });

      expect(profileValidator.validatePersonalInfo).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SAVE CHANGES TESTS
  // ============================================================================

  describe('Save Changes', () => {
    it('should save changes successfully', async () => {
      const { dataManager } = require('../../services/dataManager');
      dataManager.savePersonalInfo.mockResolvedValueOnce(true);

      const { getByTestId } = renderWithProvider();

      // Start edit and make changes
      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('update-data-btn').props.onPress();
      });

      // Save changes
      await act(async () => {
        getByTestId('save-changes-btn').props.onPress();
      });

      await waitFor(() => {
        expect(dataManager.savePersonalInfo).toHaveBeenCalled();
        expect(mockOnEditComplete).toHaveBeenCalled();
        expect(getByTestId('edit-mode')).toHaveTextContent('false');
      });
    });

    it('should handle validation errors before saving', async () => {
      const { profileValidator } = require('../../services/profileValidator');
      profileValidator.validatePersonalInfo.mockReturnValueOnce({
        isValid: false,
        errors: ['Name is required'],
        warnings: [],
      });

      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('save-changes-btn').props.onPress();
      });

      // Should not save and should show alert
      const { dataManager } = require('../../services/dataManager');
      expect(dataManager.savePersonalInfo).not.toHaveBeenCalled();
      
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        expect.stringContaining('Name is required')
      );
    });

    it('should handle save errors gracefully', async () => {
      const { dataManager } = require('../../services/dataManager');
      dataManager.savePersonalInfo.mockResolvedValueOnce(false);

      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('save-changes-btn').props.onPress();
      });

      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save changes. Please try again.'
      );
    });
  });

  // ============================================================================
  // CANCEL EDIT TESTS
  // ============================================================================

  describe('Cancel Edit', () => {
    it('should cancel edit without changes', async () => {
      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('cancel-edit-btn').props.onPress();
      });

      expect(getByTestId('edit-mode')).toHaveTextContent('false');
      expect(mockOnEditCancel).toHaveBeenCalled();
    });

    it('should prompt before canceling with unsaved changes', async () => {
      const { getByTestId } = renderWithProvider();

      // Start edit and make changes
      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('update-data-btn').props.onPress();
      });

      await act(async () => {
        getByTestId('cancel-edit-btn').props.onPress();
      });

      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // LOADING STATES TESTS
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading state during save', async () => {
      const { dataManager } = require('../../services/dataManager');
      let resolvePromise: (value: boolean) => void;
      const savePromise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      dataManager.savePersonalInfo.mockReturnValueOnce(savePromise);

      const { getByTestId } = renderWithProvider();

      await act(async () => {
        getByTestId('start-edit-btn').props.onPress();
      });

      act(() => {
        getByTestId('save-changes-btn').props.onPress();
      });

      // Should show saving state
      expect(getByTestId('is-saving')).toHaveTextContent('true');

      // Resolve the promise
      await act(async () => {
        resolvePromise!(true);
      });

      await waitFor(() => {
        expect(getByTestId('is-saving')).toHaveTextContent('false');
      });
    });
  });
});
