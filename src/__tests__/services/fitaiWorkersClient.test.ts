/**
 * FitAI Workers Client Tests
 *
 * Tests for HTTP client that communicates with Cloudflare Workers backend.
 * Covers authentication, request formatting, error handling, and retry logic.
 */

import {
  FitAIWorkersClient,
  WorkersAPIError,
  NetworkError,
  AuthenticationError,
  type DietGenerationRequest,
  type WorkoutGenerationRequest,
} from '../../services/fitaiWorkersClient';
import { supabase } from '../../services/supabase';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('FitAIWorkersClient', () => {
  let client: FitAIWorkersClient;
  const mockToken = 'mock-jwt-token-12345';

  beforeEach(() => {
    client = new FitAIWorkersClient({
      baseUrl: 'https://test-workers.example.com',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 100,
    });

    jest.clearAllMocks();

    // Default mock: successful auth
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: mockToken,
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('Authentication', () => {
    it('should include JWT token in Authorization header', async () => {
      const mockResponse = {
        success: true,
        data: { meals: [] },
        metadata: { cached: false, generationTime: 1000 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: DietGenerationRequest = {
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
        calorieTarget: 2000,
        mealsPerDay: 3,
      };

      await client.generateDietPlan(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-workers.example.com/diet/generate',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should throw AuthenticationError when session is missing', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const request: DietGenerationRequest = {
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      };

      await expect(client.generateDietPlan(request)).rejects.toThrow(AuthenticationError);
      await expect(client.generateDietPlan(request)).rejects.toThrow('No active session found');
    });

    it('should throw AuthenticationError when Supabase returns error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });

      const request: DietGenerationRequest = {
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      };

      await expect(client.generateDietPlan(request)).rejects.toThrow(AuthenticationError);
      await expect(client.generateDietPlan(request)).rejects.toThrow('Invalid refresh token');
    });
  });

  // ============================================================================
  // REQUEST FORMATTING TESTS
  // ============================================================================

  describe('Request Formatting', () => {
    it('should format diet generation request correctly', async () => {
      const mockResponse = {
        success: true,
        data: { meals: [] },
        metadata: { cached: false },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: DietGenerationRequest = {
        profile: {
          age: 30,
          gender: 'female',
          weight: 65,
          height: 165,
          activityLevel: 'active',
          fitnessGoal: 'weight_loss',
        },
        dietPreferences: {
          dietType: 'vegetarian',
          allergies: ['peanuts', 'shellfish'],
          cuisinePreferences: ['indian', 'mediterranean'],
        },
        calorieTarget: 1800,
        mealsPerDay: 4,
      };

      await client.generateDietPlan(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toEqual(request);
      expect(requestBody.profile.age).toBe(30);
      expect(requestBody.dietPreferences.dietType).toBe('vegetarian');
      expect(requestBody.dietPreferences.allergies).toContain('peanuts');
    });

    it('should format workout generation request correctly', async () => {
      const mockResponse = {
        success: true,
        data: { exercises: [] },
        metadata: { cached: false },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: WorkoutGenerationRequest = {
        profile: {
          age: 28,
          gender: 'male',
          weight: 80,
          height: 180,
          fitnessGoal: 'muscle_gain',
          experienceLevel: 'intermediate',
          availableEquipment: ['dumbbells', 'barbell', 'bench'],
          injuries: ['lower_back'],
        },
        workoutType: 'strength',
        duration: 60,
        focusMuscles: ['chest', 'triceps'],
      };

      await client.generateWorkoutPlan(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toEqual(request);
      expect(requestBody.profile.experienceLevel).toBe('intermediate');
      expect(requestBody.profile.availableEquipment).toContain('dumbbells');
      expect(requestBody.profile.injuries).toContain('lower_back');
    });

    it('should include Content-Type header', async () => {
      const mockResponse = { success: true, data: {} };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  // ============================================================================
  // RESPONSE PARSING TESTS
  // ============================================================================

  describe('Response Parsing', () => {
    it('should parse successful response correctly', async () => {
      const mockResponse = {
        success: true,
        data: {
          meals: [
            {
              name: 'Breakfast',
              mealType: 'breakfast',
              foods: [],
              totalCalories: 500,
            },
          ],
          totalCalories: 500,
        },
        metadata: {
          cached: false,
          generationTime: 1234,
          model: 'google/gemini-2.0-flash-exp',
          tokensUsed: 5000,
          costUsd: 0.0005,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.meals).toHaveLength(1);
      expect(result.metadata?.cached).toBe(false);
      expect(result.metadata?.model).toBe('google/gemini-2.0-flash-exp');
    });

    it('should parse cache metadata correctly', async () => {
      const mockResponse = {
        success: true,
        data: { meals: [] },
        metadata: {
          cached: true,
          cacheSource: 'kv',
          cacheKey: 'diet_2000cal_3meals_vegetarian',
          generationTime: 50,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      expect(result.metadata?.cached).toBe(true);
      expect(result.metadata?.cacheSource).toBe('kv');
      expect(result.metadata?.cacheKey).toBe('diet_2000cal_3meals_vegetarian');
      expect(result.metadata?.generationTime).toBeLessThan(100);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw WorkersAPIError for 400 Bad Request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'Invalid request: missing profile',
          errorCode: 'VALIDATION_ERROR',
          details: { field: 'profile' },
        }),
      });

      const request: DietGenerationRequest = {
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      };

      await expect(client.generateDietPlan(request)).rejects.toThrow(WorkersAPIError);
      await expect(client.generateDietPlan(request)).rejects.toThrow('Invalid request: missing profile');
    });

    it('should include error details in WorkersAPIError', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'Allergen detected',
          errorCode: 'ALLERGEN_DETECTED',
          details: {
            validationErrors: [
              {
                severity: 'CRITICAL',
                code: 'ALLERGEN_DETECTED',
                message: 'Contains peanuts',
                meal: 'Breakfast',
                food: 'Peanut Butter',
                allergen: 'peanuts',
              },
            ],
          },
        }),
      });

      try {
        await client.generateDietPlan({
          profile: {
            age: 25,
            gender: 'male',
            weight: 70,
            height: 175,
            activityLevel: 'moderate',
            fitnessGoal: 'maintain',
          },
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(WorkersAPIError);
        const apiError = error as WorkersAPIError;
        expect(apiError.statusCode).toBe(400);
        expect(apiError.errorCode).toBe('ALLERGEN_DETECTED');
        expect(apiError.details.validationErrors).toBeDefined();
        expect(apiError.details.validationErrors[0].allergen).toBe('peanuts');
      }
    });

    it('should throw NetworkError for network failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

      const request: DietGenerationRequest = {
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      };

      await expect(client.generateDietPlan(request)).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError for timeout', async () => {
      jest.useFakeTimers();

      const slowClient = new FitAIWorkersClient({
        timeout: 1000,
        maxRetries: 0, // Disable retries for this test
      });

      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000);
          })
      );

      const requestPromise = slowClient.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      jest.advanceTimersByTime(1500);

      await expect(requestPromise).rejects.toThrow(NetworkError);

      jest.useRealTimers();
    });
  });

  // ============================================================================
  // RETRY LOGIC TESTS
  // ============================================================================

  describe('Retry Logic', () => {
    it('should retry on 500 Internal Server Error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { meals: [] } }),
        });

      const result = await client.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should retry on 429 Rate Limit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: 'Rate limit exceeded' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { meals: [] } }),
        });

      const result = await client.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should not retry on 400 Bad Request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid request' }),
      });

      await expect(
        client.generateDietPlan({
          profile: {
            age: 25,
            gender: 'male',
            weight: 70,
            height: 175,
            activityLevel: 'moderate',
            fitnessGoal: 'maintain',
          },
        })
      ).rejects.toThrow(WorkersAPIError);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      await expect(
        client.generateDietPlan({
          profile: {
            age: 25,
            gender: 'male',
            weight: 70,
            height: 175,
            activityLevel: 'moderate',
            fitnessGoal: 'maintain',
          },
        })
      ).rejects.toThrow(WorkersAPIError);

      // maxRetries = 2, so total attempts = 3 (initial + 2 retries)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for retries', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { meals: [] } }),
        });

      const requestPromise = client.generateDietPlan({
        profile: {
          age: 25,
          gender: 'male',
          weight: 70,
          height: 175,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
        },
      });

      // First retry: 100ms
      await jest.advanceTimersByTimeAsync(100);
      // Second retry: 200ms (exponential)
      await jest.advanceTimersByTimeAsync(200);

      await requestPromise;

      expect(global.fetch).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });
  });

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================

  describe('Health Check', () => {
    it('should perform health check without authentication', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-workers.example.com/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});
