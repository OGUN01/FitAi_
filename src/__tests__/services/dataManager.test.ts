/**
 * DataBridge Tests
 * Comprehensive test suite for profile data management
 *
 * Updated: January 2026 - Migrated from dataBridge to dataBridge
 */

import { dataBridge } from '../../services/DataBridge';
import { PersonalInfo, FitnessGoals, DietPreferences } from '../../types/profileData';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

describe('DataManager', () => {
  const mockUserId = 'test-user-123';
  
  const mockPersonalInfo: PersonalInfo = {
    id: 'personal-1',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    syncStatus: 'pending',
    source: 'local',
    name: 'John Doe',
    age: '25',
    gender: 'male',
    height: '175',
    weight: '70',
    activityLevel: 'moderate',
  };

  const mockFitnessGoals: FitnessGoals = {
    id: 'goals-1',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    syncStatus: 'pending',
    source: 'local',
    primaryGoals: ['weight_loss', 'muscle_gain'],
    experience: 'intermediate',
    timeCommitment: '30-45 minutes',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dataBridge.setUserId(mockUserId);
    dataBridge.setOnlineStatus(true);
  });

  // ============================================================================
  // PERSONAL INFO TESTS
  // ============================================================================

  describe('Personal Info Management', () => {
    it('should save personal info successfully', async () => {
      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      expect(result).toBe(true);
    });

    it('should load personal info from local storage when offline', async () => {
      dataBridge.setOnlineStatus(false);
      
      // Mock local storage return
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockPersonalInfo));

      const result = await dataBridge.loadPersonalInfo();
      expect(result).toEqual(mockPersonalInfo);
    });

    it('should prioritize remote data when online', async () => {
      const remoteData = { ...mockPersonalInfo, name: 'Remote John' };
      
      // Mock Supabase return
      const { supabase } = require('../../services/supabase');
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: remoteData,
        error: null,
      });

      const result = await dataBridge.loadPersonalInfo();
      expect(result).toEqual(remoteData);
    });

    it('should fallback to local data when remote fails', async () => {
      // Mock Supabase error
      const { supabase } = require('../../services/supabase');
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });

      // Mock local storage return
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockPersonalInfo));

      const result = await dataBridge.loadPersonalInfo();
      expect(result).toEqual(mockPersonalInfo);
    });
  });

  // ============================================================================
  // FITNESS GOALS TESTS
  // ============================================================================

  describe('Fitness Goals Management', () => {
    it('should save fitness goals successfully', async () => {
      const result = await dataBridge.saveFitnessGoals(mockFitnessGoals);
      expect(result).toBe(true);
    });

    it('should load fitness goals from storage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockFitnessGoals));

      const result = await dataBridge.loadFitnessGoals();
      expect(result).toEqual(mockFitnessGoals);
    });

    it('should handle missing fitness goals gracefully', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await dataBridge.loadFitnessGoals();
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // USER ID MANAGEMENT TESTS
  // ============================================================================

  describe('User ID Management', () => {
    it('should set user ID correctly', () => {
      const newUserId = 'new-user-456';
      dataBridge.setUserId(newUserId);
      
      // Verify by checking the internal state (if accessible)
      // This would depend on the actual implementation
      expect(dataBridge['userId']).toBe(newUserId);
    });

    it('should handle guest mode (no user ID)', async () => {
      dataBridge.setUserId(null);
      
      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      expect(result).toBe(true); // Should still save locally
    });
  });

  // ============================================================================
  // ONLINE/OFFLINE BEHAVIOR TESTS
  // ============================================================================

  describe('Online/Offline Behavior', () => {
    it('should save to local storage when offline', async () => {
      dataBridge.setOnlineStatus(false);
      
      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      expect(result).toBe(true);
      
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should attempt remote save when online', async () => {
      dataBridge.setOnlineStatus(true);
      
      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      expect(result).toBe(true);
      
      const { supabase } = require('../../services/supabase');
      expect(supabase.from).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      // Mock Supabase error
      const { supabase } = require('../../services/supabase');
      supabase.from().upsert.mockResolvedValueOnce({
        error: { message: 'Network error' },
      });

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      // Should still succeed due to local storage fallback
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // DATA CLEARING TESTS
  // ============================================================================

  describe('Data Clearing', () => {
    it('should clear local data successfully', async () => {
      const result = await dataBridge.clearLocalData();
      expect(result).toBe(true);
      
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should check for local data existence', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.multiGet.mockResolvedValueOnce([
        ['personalInfo_test-user-123', JSON.stringify(mockPersonalInfo)],
        ['fitnessGoals_test-user-123', null],
      ]);

      const result = await dataBridge.hasLocalData();
      expect(result).toBe(true);
    });

    it('should return false when no local data exists', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.multiGet.mockResolvedValueOnce([
        ['personalInfo_test-user-123', null],
        ['fitnessGoals_test-user-123', null],
      ]);

      const result = await dataBridge.hasLocalData();
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      // Should handle error gracefully
      expect(result).toBe(false);
    });

    it('should handle Supabase errors', async () => {
      const { supabase } = require('../../services/supabase');
      supabase.from().upsert.mockRejectedValueOnce(new Error('Database error'));

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);
      // Should fallback to local storage
      expect(result).toBe(true);
    });

    it('should handle JSON parsing errors', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce('invalid-json');

      const result = await dataBridge.loadPersonalInfo();
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should complete full save-load cycle', async () => {
      // Save data
      const saveResult = await dataBridge.savePersonalInfo(mockPersonalInfo);
      expect(saveResult).toBe(true);

      // Mock the load
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockPersonalInfo));

      // Load data
      const loadResult = await dataBridge.loadPersonalInfo();
      expect(loadResult).toEqual(mockPersonalInfo);
    });

    it('should handle multiple data types', async () => {
      // Save multiple types
      const personalResult = await dataBridge.savePersonalInfo(mockPersonalInfo);
      const goalsResult = await dataBridge.saveFitnessGoals(mockFitnessGoals);

      expect(personalResult).toBe(true);
      expect(goalsResult).toBe(true);
    });
  });
});
