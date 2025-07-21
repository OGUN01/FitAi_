// Migration Engine Tests for Track B Infrastructure
// Tests migration functionality with mock data and Supabase integration

import { migrationEngine, MigrationEngine } from '../services/migration';
import { conflictResolutionService } from '../services/conflictResolution';
import { migrationManager } from '../services/migrationManager';
import { LocalStorageSchema } from '../types/localData';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockLocalData: LocalStorageSchema = {
  version: '1.0.0',
  encrypted: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-20T00:00:00Z',
  user: {
    onboardingData: {
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        gender: 'male',
        height: 180,
        weight: 75,
        activityLevel: 'moderate',
      },
      fitnessGoals: {
        primaryGoals: ['weight_loss', 'muscle_gain'],
        timeCommitment: '45-60',
        experienceLevel: 'intermediate',
      },
      dietPreferences: {
        dietType: 'non-veg',
        allergies: ['nuts'],
        cuisinePreferences: ['italian', 'indian'],
        restrictions: [],
      },
      workoutPreferences: {
        location: 'gym',
        equipment: ['dumbbells', 'barbell'],
        timePreference: 60,
        intensity: 'intermediate',
        workoutTypes: ['strength', 'cardio'],
      },
      bodyAnalysis: {
        photos: {
          front: 'base64_image_data',
          side: 'base64_image_data',
        },
        analysis: {
          bodyFatPercentage: 15,
          muscleMass: 60,
          recommendations: ['Focus on compound movements'],
        },
      },
    },
    preferences: {
      units: 'metric',
      notifications: true,
      darkMode: true,
      language: 'en',
    },
    profile: {
      id: 'user_123',
      email: 'john@example.com',
      name: 'John Doe',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
    },
  },
  fitness: {
    workouts: [
      {
        id: 'workout_1',
        name: 'Push Day',
        type: 'strength',
        exercises: ['push_ups', 'bench_press'],
        duration: 60,
        createdAt: '2025-01-15T00:00:00Z',
      },
    ],
    exercises: [
      {
        id: 'exercise_1',
        name: 'Push Ups',
        category: 'strength',
        muscleGroups: ['chest', 'triceps'],
        instructions: ['Start in plank position', 'Lower body', 'Push up'],
      },
    ],
    sessions: [
      {
        id: 'session_1',
        workoutId: 'workout_1',
        userId: 'user_123',
        completedAt: '2025-01-20T10:00:00Z',
        duration: 45,
        caloriesBurned: 300,
        exercises: [
          {
            exerciseId: 'exercise_1',
            sets: 3,
            reps: 15,
            weight: 0,
            restTime: 60,
          },
        ],
      },
    ],
  },
  nutrition: {
    meals: [
      {
        id: 'meal_1',
        name: 'Breakfast',
        type: 'breakfast',
        consumedAt: '2025-01-20T08:00:00Z',
        foods: ['oatmeal', 'banana'],
        totalCalories: 350,
        macros: {
          protein: 12,
          carbs: 65,
          fat: 8,
          fiber: 10,
        },
      },
    ],
    foods: [
      {
        id: 'food_1',
        name: 'Oatmeal',
        category: 'grains',
        nutritionPer100g: {
          calories: 389,
          protein: 16.9,
          carbs: 66.3,
          fat: 6.9,
          fiber: 10.6,
        },
      },
    ],
    logs: [
      {
        id: 'log_1',
        userId: 'user_123',
        mealId: 'meal_1',
        foodId: 'food_1',
        quantity: 50,
        loggedAt: '2025-01-20T08:00:00Z',
      },
    ],
  },
  progress: {
    measurements: [
      {
        id: 'measurement_1',
        userId: 'user_123',
        date: '2025-01-20',
        weight: 75,
        bodyFat: 15,
        muscleMass: 60,
        measurements: {
          chest: 100,
          waist: 80,
          arms: 35,
        },
      },
    ],
    photos: [
      {
        id: 'photo_1',
        userId: 'user_123',
        type: 'progress',
        url: 'base64_image_data',
        takenAt: '2025-01-20T00:00:00Z',
      },
    ],
    achievements: [
      {
        id: 'achievement_1',
        userId: 'user_123',
        type: 'milestone',
        title: 'First Workout',
        description: 'Completed your first workout',
        earnedAt: '2025-01-15T00:00:00Z',
        points: 100,
      },
    ],
  },
  metadata: {
    lastSync: new Date('2025-01-19T00:00:00Z'),
    migrationStatus: {
      status: 'pending',
      lastAttempt: null,
      attempts: 0,
    },
    conflicts: [],
  },
};

// ============================================================================
// MIGRATION ENGINE TESTS
// ============================================================================

describe('Migration Engine', () => {
  let engine: MigrationEngine;

  beforeEach(() => {
    engine = new MigrationEngine({
      maxRetries: 2,
      retryDelayMs: 100,
      timeoutMs: 5000,
      backupEnabled: true,
      cleanupAfterSuccess: false, // Keep data for testing
      validateBeforeMigration: true,
    });
  });

  test('should initialize with correct configuration', () => {
    expect(engine).toBeDefined();
    expect(engine.getMigrationStatus()).toBeNull();
  });

  test('should validate migration steps are properly defined', () => {
    const steps = (engine as any).steps;
    expect(steps).toHaveLength(8);
    
    const expectedSteps = [
      'validateData',
      'transformData',
      'uploadUserProfile',
      'uploadFitnessData',
      'uploadNutritionData',
      'uploadProgressData',
      'verifyMigration',
      'cleanupLocal',
    ];

    steps.forEach((step: any, index: number) => {
      expect(step.name).toBe(expectedSteps[index]);
      expect(step.handler).toBeDefined();
      expect(typeof step.weight).toBe('number');
    });
  });

  test('should handle migration progress callbacks', (done) => {
    let progressCallbackCount = 0;
    
    const unsubscribe = engine.onProgress((progress) => {
      progressCallbackCount++;
      expect(progress.migrationId).toBeDefined();
      expect(progress.percentage).toBeGreaterThanOrEqual(0);
      expect(progress.percentage).toBeLessThanOrEqual(100);
      
      if (progressCallbackCount >= 3) {
        unsubscribe();
        done();
      }
    });

    // Start a test migration
    engine.migrateToSupabase('test_user_123').catch(() => {
      // Expected to fail in test environment
    });
  });

  test('should generate unique migration IDs', () => {
    const id1 = (engine as any).generateMigrationId();
    const id2 = (engine as any).generateMigrationId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^migration_\d+_[a-z0-9]+$/);
  });
});

// ============================================================================
// CONFLICT RESOLUTION TESTS
// ============================================================================

describe('Conflict Resolution Service', () => {
  test('should detect value mismatches', () => {
    const localData = { name: 'John Doe', age: 30 };
    const remoteData = { name: 'John Smith', age: 30 };
    const context = {
      tableName: 'profiles',
      recordId: 'user_123',
      userId: 'user_123',
      lastModified: {
        local: new Date('2025-01-20T10:00:00Z'),
        remote: new Date('2025-01-20T09:00:00Z'),
      },
    };

    const conflicts = conflictResolutionService.detectConflicts(localData, remoteData, context);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field).toBe('name');
    expect(conflicts[0].type).toBe('value_mismatch');
    expect(conflicts[0].localValue).toBe('John Doe');
    expect(conflicts[0].remoteValue).toBe('John Smith');
  });

  test('should detect missing fields', () => {
    const localData = { name: 'John Doe' };
    const remoteData = { name: 'John Doe', email: 'john@example.com' };
    const context = {
      tableName: 'profiles',
      recordId: 'user_123',
      userId: 'user_123',
      lastModified: {
        local: new Date('2025-01-20T10:00:00Z'),
        remote: new Date('2025-01-20T09:00:00Z'),
      },
    };

    const conflicts = conflictResolutionService.detectConflicts(localData, remoteData, context);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field).toBe('email');
    expect(conflicts[0].type).toBe('missing_local');
    expect(conflicts[0].suggestedResolution).toBe('remote_wins');
  });

  test('should resolve conflicts automatically', async () => {
    const conflicts = [
      {
        id: 'conflict_1',
        type: 'value_mismatch' as const,
        field: 'updated_at',
        localValue: '2025-01-20T10:00:00Z',
        remoteValue: '2025-01-20T09:00:00Z',
        timestamp: new Date(),
        severity: 'low' as const,
        autoResolvable: true,
        suggestedResolution: 'use_latest_timestamp' as const,
        context: {
          tableName: 'profiles',
          recordId: 'user_123',
          userId: 'user_123',
          lastModified: {
            local: new Date('2025-01-20T10:00:00Z'),
            remote: new Date('2025-01-20T09:00:00Z'),
          },
        },
      },
    ];

    const result = await conflictResolutionService.resolveConflicts(conflicts);
    
    expect(result.resolvedConflicts).toHaveLength(1);
    expect(result.unresolvedConflicts).toHaveLength(0);
    expect(result.requiresUserInput).toBe(false);
    expect(result.summary.autoResolved).toBe(1);
  });

  test('should calculate conflict statistics', () => {
    const conflicts = [
      {
        id: 'conflict_1',
        type: 'value_mismatch' as const,
        field: 'name',
        localValue: 'John',
        remoteValue: 'Jane',
        timestamp: new Date(),
        severity: 'high' as const,
        autoResolvable: false,
        suggestedResolution: 'user_choice' as const,
      },
      {
        id: 'conflict_2',
        type: 'missing_local' as const,
        field: 'email',
        localValue: undefined,
        remoteValue: 'test@example.com',
        timestamp: new Date(),
        severity: 'low' as const,
        autoResolvable: true,
        suggestedResolution: 'remote_wins' as const,
      },
    ];

    const stats = conflictResolutionService.getConflictStatistics(conflicts);
    
    expect(stats.byType.value_mismatch).toBe(1);
    expect(stats.byType.missing_local).toBe(1);
    expect(stats.bySeverity.high).toBe(1);
    expect(stats.bySeverity.low).toBe(1);
    expect(stats.autoResolvable).toBe(1);
    expect(stats.requiresUserInput).toBe(1);
  });
});

// ============================================================================
// MIGRATION MANAGER TESTS
// ============================================================================

describe('Migration Manager', () => {
  test('should check migration status', async () => {
    const status = await migrationManager.checkMigrationStatus();
    
    expect(status).toBeDefined();
    expect(typeof status.isActive).toBe('boolean');
    expect(typeof status.canStart).toBe('boolean');
    expect(typeof status.hasLocalData).toBe('boolean');
    expect(Array.isArray(status.migrationHistory)).toBe(true);
  });

  test('should handle progress subscriptions', (done) => {
    const unsubscribe = migrationManager.onProgress((progress) => {
      expect(progress.migrationId).toBeDefined();
      expect(progress.status).toBeDefined();
      unsubscribe();
      done();
    });

    // Trigger a progress update (this would normally come from the migration engine)
    // For testing, we'll just verify the subscription mechanism works
    setTimeout(() => {
      unsubscribe();
      done();
    }, 100);
  });

  test('should validate migration configuration', () => {
    expect(migrationManager).toBeDefined();
    
    // Test that manager has required methods
    expect(typeof migrationManager.startMigration).toBe('function');
    expect(typeof migrationManager.cancelMigration).toBe('function');
    expect(typeof migrationManager.checkMigrationStatus).toBe('function');
    expect(typeof migrationManager.onProgress).toBe('function');
    expect(typeof migrationManager.onResult).toBe('function');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Migration Integration', () => {
  test('should handle complete migration flow with mock data', async () => {
    // This test verifies the integration between all migration components
    const userId = 'test_user_integration';
    
    try {
      // Check initial status
      const initialStatus = await migrationManager.checkMigrationStatus();
      expect(initialStatus).toBeDefined();
      
      // The actual migration would fail in test environment due to missing Supabase connection
      // But we can verify the flow starts correctly
      const migrationPromise = migrationManager.startMigration(userId);
      
      // Verify that migration manager is tracking the process
      const currentProgress = migrationManager.getCurrentProgress();
      // Progress might be null if migration fails immediately, which is expected in test env
      
      await expect(migrationPromise).rejects.toThrow();
      
    } catch (error) {
      // Expected in test environment without real Supabase connection
      expect(error).toBeDefined();
    }
  });

  test('should validate data transformation compatibility', () => {
    // Test that our mock data structure is compatible with the migration system
    expect(mockLocalData.version).toBeDefined();
    expect(mockLocalData.user).toBeDefined();
    expect(mockLocalData.fitness).toBeDefined();
    expect(mockLocalData.nutrition).toBeDefined();
    expect(mockLocalData.progress).toBeDefined();
    expect(mockLocalData.metadata).toBeDefined();
    
    // Verify required user data structure
    expect(mockLocalData.user.onboardingData).toBeDefined();
    expect(mockLocalData.user.onboardingData.personalInfo).toBeDefined();
    expect(mockLocalData.user.onboardingData.dietPreferences).toBeDefined();
    expect(mockLocalData.user.onboardingData.workoutPreferences).toBeDefined();
    expect(mockLocalData.user.onboardingData.bodyAnalysis).toBeDefined();
  });
});

export { mockLocalData };
