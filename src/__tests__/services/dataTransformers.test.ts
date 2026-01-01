/**
 * Data Transformers Tests
 *
 * Tests for transforming Workers API responses into app-compatible formats.
 * Covers diet/workout transformations, validation errors, edge cases.
 */

import {
  transformDietResponse,
  transformWorkoutResponse,
  transformValidationErrors,
  transformExerciseWarnings,
  generatePlanId,
  generateMealId,
  generateExerciseId,
  handleEmptyMeals,
  fillMissingNutrition,
  validateTransformedData,
} from '../../services/api/dataTransformers';
import type { WorkersResponse } from '../../services/api/fitaiWorkersClient';

describe('Data Transformers', () => {
  // ============================================================================
  // ID GENERATION TESTS
  // ============================================================================

  describe('ID Generation', () => {
    it('should generate unique diet plan IDs', () => {
      const id1 = generatePlanId('diet');
      const id2 = generatePlanId('diet');

      expect(id1).toMatch(/^diet_\d+_[a-z0-9]{7}$/);
      expect(id2).toMatch(/^diet_\d+_[a-z0-9]{7}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique workout plan IDs', () => {
      const id1 = generatePlanId('workout');
      const id2 = generatePlanId('workout');

      expect(id1).toMatch(/^workout_\d+_[a-z0-9]{7}$/);
      expect(id2).toMatch(/^workout_\d+_[a-z0-9]{7}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique meal IDs with day of week', () => {
      const id1 = generateMealId('breakfast', 'monday');
      const id2 = generateMealId('breakfast', 'monday');

      expect(id1).toMatch(/^meal_monday_breakfast_\d+_[a-z0-9]{7}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate exercise IDs from names', () => {
      const id = generateExerciseId('Bench Press');
      expect(id).toMatch(/^exercise_bench_press_[a-z0-9]{7}$/);
    });
  });

  // ============================================================================
  // DIET RESPONSE TRANSFORMATION TESTS
  // ============================================================================

  describe('Diet Response Transformation', () => {
    it('should transform valid diet response correctly', () => {
      const workersResponse: WorkersResponse<any> = {
        success: true,
        data: {
          planTitle: 'Vegetarian Meal Plan',
          planDescription: 'High protein vegetarian plan',
          totalCalories: 2000,
          totalNutrition: {
            protein: 120,
            carbs: 250,
            fats: 67,
            fiber: 35,
          },
          meals: [
            {
              name: 'Protein-Packed Breakfast',
              mealType: 'breakfast',
              description: 'Start your day right',
              foods: [
                {
                  name: 'Greek Yogurt',
                  quantity: 200,
                  unit: 'g',
                  nutrition: {
                    calories: 150,
                    protein: 15,
                    carbs: 10,
                    fats: 5,
                  },
                },
                {
                  name: 'Banana',
                  quantity: 1,
                  unit: 'medium',
                  nutrition: {
                    calories: 105,
                    protein: 1,
                    carbs: 27,
                    fats: 0,
                  },
                },
              ],
              totalCalories: 255,
              totalNutrition: {
                protein: 16,
                carbs: 37,
                fats: 5,
              },
              prepTime: 10,
              cookingMethod: 'none',
              instructions: ['Mix yogurt', 'Slice banana', 'Combine'],
            },
          ],
          weekNumber: 1,
        },
        metadata: {
          cached: false,
          generationTime: 1234,
          model: 'google/gemini-2.0-flash-exp',
          tokensUsed: 5000,
          costUsd: 0.0005,
        },
      };

      const transformed = transformDietResponse(workersResponse, 'monday');

      expect(transformed.id).toMatch(/^diet_/);
      expect(transformed.planTitle).toBe('Vegetarian Meal Plan');
      expect(transformed.totalCalories).toBe(2000);
      expect(transformed.meals).toHaveLength(1);
      expect(transformed.meals[0].name).toBe('Protein-Packed Breakfast');
      expect(transformed.meals[0].type).toBe('breakfast');
      expect(transformed.meals[0].dayOfWeek).toBe('monday');
      expect(transformed.meals[0].foods).toHaveLength(2);
      expect(transformed.meals[0].foods[0].name).toBe('Greek Yogurt');
      expect(transformed.meals[0].foods[0].calories).toBe(150);
      expect(transformed.createdAt).toBeDefined();
      expect(transformed.cacheMetadata?.cached).toBe(false);
    });

    it('should throw error for invalid response (missing data)', () => {
      const invalidResponse: WorkersResponse<any> = {
        success: true,
      };

      expect(() => transformDietResponse(invalidResponse)).toThrow('Invalid Workers response: missing data');
    });

    it('should throw error for invalid response (missing meals array)', () => {
      const invalidResponse: WorkersResponse<any> = {
        success: true,
        data: {
          planTitle: 'Test Plan',
          totalCalories: 2000,
        },
      };

      expect(() => transformDietResponse(invalidResponse)).toThrow('Invalid diet plan: meals array missing or invalid');
    });

    it('should throw error for invalid meal structure', () => {
      const invalidResponse: WorkersResponse<any> = {
        success: true,
        data: {
          meals: [
            {
              // Missing required fields
              description: 'Invalid meal',
            },
          ],
        },
      };

      expect(() => transformDietResponse(invalidResponse)).toThrow(/Invalid meal at index 0/);
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalResponse: WorkersResponse<any> = {
        success: true,
        data: {
          meals: [
            {
              name: 'Simple Meal',
              mealType: 'lunch',
              foods: [],
            },
          ],
        },
      };

      const transformed = transformDietResponse(minimalResponse);

      expect(transformed.planTitle).toBe('Personalized Meal Plan');
      expect(transformed.planDescription).toBe('AI-generated personalized meal plan');
      expect(transformed.meals[0].description).toBe('');
      expect(transformed.meals[0].prepTime).toBe(15);
    });

    it('should normalize nutrition field names', () => {
      const response: WorkersResponse<any> = {
        success: true,
        data: {
          meals: [
            {
              name: 'Test Meal',
              mealType: 'dinner',
              foods: [
                {
                  name: 'Chicken',
                  nutrition: {
                    calories: 200,
                    protein: 30,
                    carbohydrates: 0, // Different field name
                    fats: 10, // Different field name
                  },
                },
              ],
              totalNutrition: {
                protein: 30,
                carbs: 0, // Different field name
                fats: 10,
              },
            },
          ],
          totalNutrition: {
            protein: 30,
            carbohydrates: 0,
            fats: 10,
          },
        },
      };

      const transformed = transformDietResponse(response);

      expect(transformed.meals[0].foods[0].carbs).toBe(0);
      expect(transformed.meals[0].foods[0].fat).toBe(10);
      expect(transformed.totalNutrition.carbs).toBe(0);
    });
  });

  // ============================================================================
  // WORKOUT RESPONSE TRANSFORMATION TESTS
  // ============================================================================

  describe('Workout Response Transformation', () => {
    it('should transform valid workout response correctly', () => {
      const workersResponse: WorkersResponse<any> = {
        success: true,
        data: {
          workoutTitle: 'Push Day',
          workoutDescription: 'Chest and triceps workout',
          duration: 60,
          difficulty: 'intermediate',
          workoutType: 'strength',
          estimatedCalories: 350,
          exercises: [
            {
              exerciseId: 'bench_press_001',
              sets: 4,
              reps: '8-10',
              restSeconds: 90,
              notes: 'Focus on form',
              exerciseData: {
                name: 'Bench Press',
                equipments: ['barbell', 'bench'],
                targetMuscles: ['chest', 'triceps'],
                bodyParts: ['upper_body'],
                gifUrl: 'https://example.com/bench.gif',
              },
            },
          ],
          warmup: [
            {
              exerciseId: 'arm_circles_001',
              sets: 2,
              reps: '15',
              restSeconds: 30,
              exerciseData: {
                name: 'Arm Circles',
                equipments: ['bodyweight'],
                targetMuscles: ['shoulders'],
                bodyParts: ['upper_body'],
                gifUrl: 'https://example.com/circles.gif',
              },
            },
          ],
          cooldown: [
            {
              exerciseId: 'chest_stretch_001',
              sets: 1,
              reps: '30s',
              restSeconds: 0,
              exerciseData: {
                name: 'Chest Stretch',
                equipments: ['bodyweight'],
                targetMuscles: ['chest'],
                bodyParts: ['upper_body'],
                gifUrl: 'https://example.com/stretch.gif',
              },
            },
          ],
        },
        metadata: {
          cached: false,
          generationTime: 2345,
        },
      };

      const transformed = transformWorkoutResponse(workersResponse, 'tuesday');

      expect(transformed.id).toMatch(/^workout_/);
      expect(transformed.workoutTitle).toBe('Push Day');
      expect(transformed.duration).toBe(60);
      expect(transformed.exercises).toHaveLength(1);
      expect(transformed.warmup).toHaveLength(1);
      expect(transformed.cooldown).toHaveLength(1);
      expect(transformed.exercises[0].name).toBe('Bench Press');
      expect(transformed.exercises[0].sets).toBe(4);
      expect(transformed.exercises[0].gifUrl).toBe('https://example.com/bench.gif');
      expect(transformed.dayOfWeek).toBe('tuesday');
      expect(transformed.createdAt).toBeDefined();
    });

    it('should throw error for invalid workout response (missing exercises)', () => {
      const invalidResponse: WorkersResponse<any> = {
        success: true,
        data: {
          workoutTitle: 'Test Workout',
        },
      };

      expect(() => transformWorkoutResponse(invalidResponse)).toThrow('Invalid workout plan: exercises array missing or invalid');
    });

    it('should throw error for invalid exercise structure', () => {
      const invalidResponse: WorkersResponse<any> = {
        success: true,
        data: {
          exercises: [
            {
              // Missing exerciseId and name
              sets: 3,
            },
          ],
        },
      };

      expect(() => transformWorkoutResponse(invalidResponse)).toThrow(/Invalid exercise in main at index 0/);
    });

    it('should handle missing optional fields in workout', () => {
      const minimalResponse: WorkersResponse<any> = {
        success: true,
        data: {
          exercises: [
            {
              exerciseId: 'test_001',
              name: 'Test Exercise',
            },
          ],
        },
      };

      const transformed = transformWorkoutResponse(minimalResponse);

      expect(transformed.workoutTitle).toBe('Personalized Workout');
      expect(transformed.workoutDescription).toBe('AI-generated workout plan');
      expect(transformed.duration).toBe(45);
      expect(transformed.difficulty).toBe('intermediate');
      expect(transformed.exercises[0].sets).toBe(3);
      expect(transformed.exercises[0].reps).toBe('10-12');
      expect(transformed.exercises[0].restSeconds).toBe(60);
    });

    it('should transform exercises without exerciseData', () => {
      const response: WorkersResponse<any> = {
        success: true,
        data: {
          exercises: [
            {
              exerciseId: 'pushup_001',
              name: 'Push-ups',
              sets: 3,
              reps: '15',
              equipment: ['bodyweight'],
              targetMuscles: ['chest'],
            },
          ],
        },
      };

      const transformed = transformWorkoutResponse(response);

      expect(transformed.exercises[0].name).toBe('Push-ups');
      expect(transformed.exercises[0].equipment).toContain('bodyweight');
      expect(transformed.exercises[0].targetMuscles).toContain('chest');
    });
  });

  // ============================================================================
  // VALIDATION ERROR TRANSFORMATION TESTS
  // ============================================================================

  describe('Validation Error Transformation', () => {
    it('should transform validation errors from metadata', () => {
      const response: WorkersResponse<any> = {
        success: false,
        error: 'Validation failed',
        metadata: {
          cached: false,
          generationTime: 100,
          warnings: [
            {
              severity: 'WARNING',
              code: 'MODERATE_CALORIE_DRIFT',
              message: 'Calories need adjustment',
              action: 'ADJUST_PORTIONS',
            },
          ],
        },
      };

      const errors = transformValidationErrors(response);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('WARNING');
      expect(errors[0].code).toBe('MODERATE_CALORIE_DRIFT');
      expect(errors[0].message).toBe('Calories need adjustment');
    });

    it('should transform critical validation errors from details', () => {
      const response: WorkersResponse<any> = {
        success: false,
        error: 'Allergen detected',
        details: {
          validationErrors: [
            {
              severity: 'CRITICAL',
              code: 'ALLERGEN_DETECTED',
              message: 'Contains peanuts in food',
              meal: 'Breakfast',
              food: 'Peanut Butter Toast',
              allergen: 'peanuts',
            },
          ],
        },
      };

      const errors = transformValidationErrors(response);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('CRITICAL');
      expect(errors[0].code).toBe('ALLERGEN_DETECTED');
      expect(errors[0].allergen).toBe('peanuts');
      expect(errors[0].meal).toBe('Breakfast');
      expect(errors[0].food).toBe('Peanut Butter Toast');
    });

    it('should return empty array when no validation errors', () => {
      const response: WorkersResponse<any> = {
        success: true,
        data: { meals: [] },
      };

      const errors = transformValidationErrors(response);
      expect(errors).toHaveLength(0);
    });

    it('should handle diet type violations', () => {
      const response: WorkersResponse<any> = {
        success: false,
        details: {
          validationErrors: [
            {
              severity: 'CRITICAL',
              code: 'DIET_TYPE_VIOLATION',
              message: 'Vegetarian diet cannot contain meat',
              meal: 'Lunch',
              food: 'Chicken Breast',
              dietType: 'vegetarian',
            },
          ],
        },
      };

      const errors = transformValidationErrors(response);

      expect(errors[0].code).toBe('DIET_TYPE_VIOLATION');
      expect(errors[0].dietType).toBe('vegetarian');
      expect(errors[0].food).toBe('Chicken Breast');
    });
  });

  // ============================================================================
  // EXERCISE WARNING TRANSFORMATION TESTS
  // ============================================================================

  describe('Exercise Warning Transformation', () => {
    it('should parse exercise replacement warnings', () => {
      const response: WorkersResponse<any> = {
        success: true,
        data: { exercises: [] },
        metadata: {
          cached: false,
          generationTime: 1000,
          validation: {
            warnings: [
              'Replaced "Deadlift" (deadlift_001) with "Romanian Deadlift" (romanian_deadlift_001) - lower back injury restriction',
            ],
          },
        },
      };

      const warnings = transformExerciseWarnings(response);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].exerciseId).toBe('deadlift_001');
      expect(warnings[0].replacement).toBe('romanian_deadlift_001');
      expect(warnings[0].reason).toBe('lower back injury restriction');
    });

    it('should handle unstructured warnings', () => {
      const response: WorkersResponse<any> = {
        success: true,
        data: { exercises: [] },
        metadata: {
          cached: false,
          generationTime: 1000,
          validation: {
            warnings: ['Exercise was replaced due to equipment availability'],
          },
        },
      };

      const warnings = transformExerciseWarnings(response);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].exerciseId).toBe('unknown');
      expect(warnings[0].reason).toBe('Exercise was replaced due to equipment availability');
    });

    it('should return empty array when no warnings', () => {
      const response: WorkersResponse<any> = {
        success: true,
        data: { exercises: [] },
      };

      const warnings = transformExerciseWarnings(response);
      expect(warnings).toHaveLength(0);
    });
  });

  // ============================================================================
  // EDGE CASES & UTILITY TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty meals array', () => {
      const data = { meals: [], totalCalories: 1000 };
      const result = handleEmptyMeals(data);

      expect(result.meals).toEqual([]);
      expect(result.totalCalories).toBe(1000);
    });

    it('should fill missing meals array', () => {
      const data = { totalCalories: 1000 };
      const result = handleEmptyMeals(data);

      expect(result.meals).toEqual([]);
      expect(result.totalCalories).toBe(1000);
      expect(result.totalNutrition).toBeDefined();
      expect(result.totalNutrition.protein).toBe(0);
    });

    it('should fill missing nutrition fields', () => {
      const food = {
        name: 'Apple',
        quantity: 1,
      };

      const filled = fillMissingNutrition(food);

      expect(filled.nutrition.calories).toBe(0);
      expect(filled.nutrition.protein).toBe(0);
      expect(filled.nutrition.carbs).toBe(0);
      expect(filled.nutrition.fat).toBe(0);
      expect(filled.nutrition.fiber).toBe(0);
    });

    it('should preserve existing nutrition fields', () => {
      const food = {
        name: 'Chicken',
        nutrition: {
          calories: 200,
          protein: 30,
        },
      };

      const filled = fillMissingNutrition(food);

      expect(filled.nutrition.calories).toBe(200);
      expect(filled.nutrition.protein).toBe(30);
      expect(filled.nutrition.carbs).toBe(0);
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Data Validation', () => {
    it('should validate transformed diet data', () => {
      const validData = {
        id: 'diet_123',
        meals: [],
        createdAt: new Date().toISOString(),
      };

      expect(validateTransformedData(validData, 'diet')).toBe(true);
    });

    it('should validate transformed workout data', () => {
      const validData = {
        id: 'workout_123',
        exercises: [],
        createdAt: new Date().toISOString(),
      };

      expect(validateTransformedData(validData, 'workout')).toBe(true);
    });

    it('should reject invalid diet data', () => {
      const invalidData = {
        // Missing id
        meals: [],
        createdAt: new Date().toISOString(),
      };

      expect(validateTransformedData(invalidData, 'diet')).toBe(false);
    });

    it('should reject invalid workout data', () => {
      const invalidData = {
        id: 'workout_123',
        // Missing exercises
        createdAt: new Date().toISOString(),
      };

      expect(validateTransformedData(invalidData, 'workout')).toBe(false);
    });
  });

  // ============================================================================
  // DATE HANDLING TESTS
  // ============================================================================

  describe('Date Handling', () => {
    it('should set createdAt to current timestamp', () => {
      const before = new Date().getTime();

      const response: WorkersResponse<any> = {
        success: true,
        data: {
          meals: [
            {
              name: 'Test',
              mealType: 'lunch',
              foods: [],
            },
          ],
        },
      };

      const transformed = transformDietResponse(response);
      const after = new Date().getTime();
      const createdAt = new Date(transformed.createdAt).getTime();

      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
    });
  });
});
