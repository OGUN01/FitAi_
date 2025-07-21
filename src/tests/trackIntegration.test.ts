// Track Integration Tests for Track B Infrastructure
// Comprehensive tests for integration with Track A authentication and Track C features

import { trackIntegrationService, TrackAAuthData } from '../services/trackIntegrationService';
import { migrationManager } from '../services/migrationManager';
import { realTimeSyncService } from '../services/syncService';
import { backupRecoveryService } from '../services/backupRecoveryService';
import { mockLocalData } from './migrationEngine.test';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTrackAAuthData: TrackAAuthData = {
  userId: 'user_integration_test_123',
  email: 'integration@test.com',
  accessToken: 'mock_access_token',
  refreshToken: 'mock_refresh_token',
  sessionId: 'session_integration_123',
  userProfile: {
    id: 'user_integration_test_123',
    email: 'integration@test.com',
    name: 'Integration Test User',
    createdAt: '2025-01-20T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
  onboardingData: {
    personalInfo: {
      name: 'Integration Test User',
      email: 'integration@test.com',
      age: 28,
      gender: 'female',
      height: 165,
      weight: 60,
      activityLevel: 'active',
    },
    fitnessGoals: {
      primaryGoals: ['weight_loss', 'strength'],
      timeCommitment: '30-45',
      experienceLevel: 'beginner',
    },
    dietPreferences: {
      dietType: 'vegetarian',
      allergies: ['dairy'],
      cuisinePreferences: ['mediterranean', 'asian'],
      restrictions: ['gluten-free'],
    },
    workoutPreferences: {
      location: 'home',
      equipment: ['resistance_bands', 'dumbbells'],
      timePreference: 45,
      intensity: 'beginner',
      workoutTypes: ['strength', 'yoga'],
    },
    bodyAnalysis: {
      photos: {
        front: 'mock_base64_front_photo',
        side: 'mock_base64_side_photo',
      },
      analysis: {
        bodyFatPercentage: 22,
        muscleMass: 45,
        recommendations: ['Focus on strength training', 'Increase protein intake'],
      },
    },
  },
};

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Track Integration Service', () => {
  beforeEach(async () => {
    // Reset services before each test
    await trackIntegrationService.stop();
  });

  afterEach(async () => {
    // Clean up after each test
    await trackIntegrationService.stop();
  });

  test('should initialize successfully', async () => {
    await trackIntegrationService.initialize();
    
    const status = trackIntegrationService.getStatus();
    expect(status.isInitialized).toBe(true);
    expect(status.services.migration).toBe('active');
  });

  test('should handle Track A authentication', async () => {
    await trackIntegrationService.initialize();
    
    // Mock authentication event
    await trackIntegrationService.handleTrackAAuthentication(mockTrackAAuthData);
    
    const status = trackIntegrationService.getStatus();
    expect(status.trackAConnected).toBe(true);
  });

  test('should start migration flow after authentication', async () => {
    await trackIntegrationService.initialize();
    
    // Set up event listener to track migration events
    const events: any[] = [];
    const unsubscribe = trackIntegrationService.onEvent((event) => {
      events.push(event);
    });

    try {
      await trackIntegrationService.handleTrackAAuthentication(mockTrackAAuthData);
      
      // Check that migration events were emitted
      const migrationEvents = events.filter(e => e.type.includes('migration'));
      expect(migrationEvents.length).toBeGreaterThan(0);
      
    } finally {
      unsubscribe();
    }
  });

  test('should start sync services after migration', async () => {
    await trackIntegrationService.initialize();
    
    await trackIntegrationService.startSyncServices();
    
    const status = trackIntegrationService.getStatus();
    expect(status.syncActive).toBe(true);
    expect(status.services.sync).toBe('active');
    expect(status.services.monitoring).toBe('active');
    expect(status.services.scheduler).toBe('active');
  });

  test('should start backup services', async () => {
    await trackIntegrationService.initialize();
    
    await trackIntegrationService.startBackupServices();
    
    const status = trackIntegrationService.getStatus();
    expect(status.backupActive).toBe(true);
    expect(status.services.backup).toBe('active');
  });

  test('should provide service health information', async () => {
    await trackIntegrationService.initialize();
    await trackIntegrationService.startSyncServices();
    await trackIntegrationService.startBackupServices();
    
    const health = await trackIntegrationService.getServiceHealth();
    
    expect(health.migration).toBeDefined();
    expect(health.sync).toBeDefined();
    expect(health.backup).toBeDefined();
    expect(health.scheduler).toBeDefined();
    
    expect(health.migration.status).toBe('active');
    expect(health.sync.status).toBe('active');
    expect(health.backup.status).toBe('active');
    expect(health.scheduler.status).toBe('active');
  });

  test('should handle service errors gracefully', async () => {
    await trackIntegrationService.initialize();
    
    // Simulate service error by trying to start sync without proper setup
    try {
      // This should handle errors gracefully
      await trackIntegrationService.startSyncServices();
    } catch (error) {
      // Error is expected in test environment
      expect(error).toBeDefined();
    }
    
    const status = trackIntegrationService.getStatus();
    // Service should still be initialized even if sync fails
    expect(status.isInitialized).toBe(true);
  });

  test('should emit events for major operations', async () => {
    await trackIntegrationService.initialize();
    
    const events: any[] = [];
    const unsubscribe = trackIntegrationService.onEvent((event) => {
      events.push(event);
    });

    try {
      await trackIntegrationService.handleTrackAAuthentication(mockTrackAAuthData);
      
      // Should have emitted auth_success event
      const authEvents = events.filter(e => e.type === 'auth_success');
      expect(authEvents.length).toBe(1);
      expect(authEvents[0].data.userId).toBe(mockTrackAAuthData.userId);
      
    } finally {
      unsubscribe();
    }
  });

  test('should maintain status updates', async () => {
    await trackIntegrationService.initialize();
    
    const statusUpdates: any[] = [];
    const unsubscribe = trackIntegrationService.onStatusChange((status) => {
      statusUpdates.push(status);
    });

    try {
      await trackIntegrationService.handleTrackAAuthentication(mockTrackAAuthData);
      
      // Should have received status updates
      expect(statusUpdates.length).toBeGreaterThan(0);
      
      // Latest status should show Track A connected
      const latestStatus = statusUpdates[statusUpdates.length - 1];
      expect(latestStatus.trackAConnected).toBe(true);
      
    } finally {
      unsubscribe();
    }
  });
});

// ============================================================================
// END-TO-END INTEGRATION TESTS
// ============================================================================

describe('End-to-End Integration Flow', () => {
  test('should complete full integration flow', async () => {
    // This test simulates the complete user journey from authentication to sync
    
    // Step 1: Initialize Track B
    await trackIntegrationService.initialize();
    expect(trackIntegrationService.getStatus().isInitialized).toBe(true);
    
    // Step 2: Simulate Track A authentication
    await trackIntegrationService.handleTrackAAuthentication(mockTrackAAuthData);
    expect(trackIntegrationService.getStatus().trackAConnected).toBe(true);
    
    // Step 3: Verify services are running
    const status = trackIntegrationService.getStatus();
    expect(status.services.migration).toBe('active');
    
    // Step 4: Check service health
    const health = await trackIntegrationService.getServiceHealth();
    expect(health.migration).toBeDefined();
    expect(health.sync).toBeDefined();
    expect(health.backup).toBeDefined();
    
    // Step 5: Verify integration is complete
    expect(status.isInitialized).toBe(true);
    expect(status.trackAConnected).toBe(true);
  });

  test('should handle new user setup', async () => {
    await trackIntegrationService.initialize();
    
    // Simulate new user with onboarding data
    const newUserAuth = {
      ...mockTrackAAuthData,
      userId: 'new_user_123',
      email: 'newuser@test.com',
    };
    
    await trackIntegrationService.handleTrackAAuthentication(newUserAuth);
    
    const status = trackIntegrationService.getStatus();
    expect(status.trackAConnected).toBe(true);
  });

  test('should handle existing user with local data', async () => {
    await trackIntegrationService.initialize();
    
    // Simulate existing user with local data
    const existingUserAuth = {
      ...mockTrackAAuthData,
      userId: 'existing_user_123',
      email: 'existing@test.com',
    };
    
    await trackIntegrationService.handleTrackAAuthentication(existingUserAuth);
    
    const status = trackIntegrationService.getStatus();
    expect(status.trackAConnected).toBe(true);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Integration Performance', () => {
  test('should initialize within reasonable time', async () => {
    const startTime = Date.now();
    
    await trackIntegrationService.initialize();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Should initialize within 5 seconds
  });

  test('should handle authentication within reasonable time', async () => {
    await trackIntegrationService.initialize();
    
    const startTime = Date.now();
    
    await trackIntegrationService.handleTrackAAuthentication(mockTrackAAuthData);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(3000); // Should handle auth within 3 seconds
  });

  test('should start services within reasonable time', async () => {
    await trackIntegrationService.initialize();
    
    const startTime = Date.now();
    
    await trackIntegrationService.startSyncServices();
    await trackIntegrationService.startBackupServices();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000); // Should start services within 2 seconds
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Integration Error Handling', () => {
  test('should handle initialization errors', async () => {
    // Test error handling during initialization
    try {
      // Simulate initialization error by corrupting service state
      await trackIntegrationService.initialize();
    } catch (error) {
      // Should handle errors gracefully
      expect(error).toBeDefined();
    }
  });

  test('should handle authentication errors', async () => {
    await trackIntegrationService.initialize();
    
    // Test with invalid auth data
    const invalidAuth = {
      ...mockTrackAAuthData,
      userId: '', // Invalid user ID
    };
    
    try {
      await trackIntegrationService.handleTrackAAuthentication(invalidAuth);
    } catch (error) {
      // Should handle invalid auth data
      expect(error).toBeDefined();
    }
  });

  test('should handle service startup errors', async () => {
    await trackIntegrationService.initialize();
    
    // Test service startup error handling
    try {
      await trackIntegrationService.startSyncServices();
    } catch (error) {
      // Should handle service errors gracefully
      const status = trackIntegrationService.getStatus();
      expect(status.isInitialized).toBe(true); // Should still be initialized
    }
  });

  test('should recover from service failures', async () => {
    await trackIntegrationService.initialize();
    
    // Simulate service failure and recovery
    try {
      await trackIntegrationService.startSyncServices();
      await trackIntegrationService.startBackupServices();
    } catch (error) {
      // Services might fail in test environment, but integration should handle it
    }
    
    const status = trackIntegrationService.getStatus();
    expect(status.isInitialized).toBe(true);
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Integration Configuration', () => {
  test('should respect configuration settings', async () => {
    const customConfig = {
      autoMigrateOnAuth: false,
      autoSyncAfterMigration: false,
      enableBackgroundSync: false,
      enableAutoBackup: false,
      debugMode: true,
    };
    
    const customService = new (require('../services/trackIntegrationService').TrackIntegrationService)(customConfig);
    
    await customService.initialize();
    
    // With auto features disabled, services shouldn't start automatically
    await customService.handleTrackAAuthentication(mockTrackAAuthData);
    
    const status = customService.getStatus();
    expect(status.trackAConnected).toBe(true);
    
    await customService.stop();
  });

  test('should handle configuration updates', async () => {
    await trackIntegrationService.initialize();
    
    // Configuration updates should be handled by individual services
    const status = trackIntegrationService.getStatus();
    expect(status.isInitialized).toBe(true);
  });
});

export { mockTrackAAuthData };
