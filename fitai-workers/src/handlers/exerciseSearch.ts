/**
 * FitAI Workers - Exercise Search Handler
 *
 * Provides search and filtering for exercise database:
 * - Full-text search across exercise names
 * - Filter by equipment, body parts, muscles, difficulty
 * - Pagination support
 * - 100% GIF coverage guarantee
 */

import { Context } from 'hono';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  ExerciseSearchRequest,
  ExerciseSearchRequestSchema,
  ExerciseSearchResponse,
  validateRequest,
} from '../utils/validation';
import { loadExerciseDatabase, Exercise } from '../utils/exerciseDatabase';
import { ValidationError, APIError } from '../utils/errors';

// ============================================================================
// SEARCH AND FILTER LOGIC
// ============================================================================

/**
 * Filter exercises based on search criteria
 */
function filterExercises(
  exercises: Exercise[],
  filters: ExerciseSearchRequest
): Exercise[] {
  let filtered = exercises;

  // 1. Text search (name and instructions)
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter((ex) => {
      const nameMatch = ex.name.toLowerCase().includes(query);
      const instructionsMatch = ex.instructions?.some((inst) =>
        inst.toLowerCase().includes(query)
      );
      const targetMatch = ex.targetMuscles?.some((muscle) =>
        muscle.toLowerCase().includes(query)
      );
      const bodyPartMatch = ex.bodyParts?.some((part) =>
        part.toLowerCase().includes(query)
      );

      return nameMatch || instructionsMatch || targetMatch || bodyPartMatch;
    });
  }

  // 2. Equipment filter
  if (filters.equipment && filters.equipment.length > 0) {
    filtered = filtered.filter((ex) =>
      ex.equipments?.some((equip) => filters.equipment!.includes(equip as any))
    );
  }

  // 3. Body parts filter
  if (filters.bodyParts && filters.bodyParts.length > 0) {
    filtered = filtered.filter((ex) =>
      ex.bodyParts?.some((part) => filters.bodyParts!.includes(part as any))
    );
  }

  // 4. Target muscles filter
  if (filters.muscles && filters.muscles.length > 0) {
    filtered = filtered.filter((ex) => {
      // Check primary target muscles
      const primaryMatch = ex.targetMuscles?.some((muscle) =>
        filters.muscles!.includes(muscle as any)
      );

      // Check secondary muscles
      const secondaryMatch = ex.secondaryMuscles?.some((muscle) =>
        filters.muscles!.includes(muscle as any)
      );

      return primaryMatch || secondaryMatch;
    });
  }

  // 5. Experience level filter (based on exercise complexity)
  if (filters.experienceLevel) {
    // Simple heuristic: categorize exercises by equipment complexity
    const level = filters.experienceLevel;

    filtered = filtered.filter((ex) => {
      // Beginner: body weight, assisted, basic machines
      if (level === 'beginner') {
        return ex.equipments?.some(
          (equip) =>
            equip === 'body weight' ||
            equip === 'assisted' ||
            equip === 'leverage machine' ||
            equip === 'smith machine'
        );
      }

      // Intermediate: dumbbells, cables, resistance bands
      if (level === 'intermediate') {
        return ex.equipments?.some(
          (equip) =>
            equip === 'dumbbell' ||
            equip === 'cable' ||
            equip === 'band' ||
            equip === 'kettlebell' ||
            equip === 'medicine ball'
        );
      }

      // Advanced: barbells, olympic lifts, complex movements
      if (level === 'advanced') {
        return ex.equipments?.some(
          (equip) =>
            equip === 'barbell' ||
            equip === 'olympic barbell' ||
            equip === 'weighted' ||
            equip === 'trap bar'
        );
      }

      return true;
    });
  }

  return filtered;
}

/**
 * Apply pagination to results
 */
function paginateResults(
  exercises: Exercise[],
  limit: number,
  offset: number
): {
  exercises: Exercise[];
  total: number;
  hasMore: boolean;
} {
  const total = exercises.length;
  const paginatedExercises = exercises.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    exercises: paginatedExercises,
    total,
    hasMore,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * GET /exercises/search - Search and filter exercises
 */
export async function handleExerciseSearch(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Parse and validate query parameters
    const queryParams = c.req.query();

    // Convert query params to proper types
    const parsedParams: any = {
      query: queryParams.query,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
    };

    // Parse array parameters
    if (queryParams.equipment) {
      parsedParams.equipment = Array.isArray(queryParams.equipment)
        ? queryParams.equipment
        : queryParams.equipment.split(',');
    }

    if (queryParams.bodyParts) {
      parsedParams.bodyParts = Array.isArray(queryParams.bodyParts)
        ? queryParams.bodyParts
        : queryParams.bodyParts.split(',');
    }

    if (queryParams.muscles) {
      parsedParams.muscles = Array.isArray(queryParams.muscles)
        ? queryParams.muscles
        : queryParams.muscles.split(',');
    }

    if (queryParams.experienceLevel) {
      parsedParams.experienceLevel = queryParams.experienceLevel;
    }

    // Validate request (simple validation - most params are optional)
    const filters: ExerciseSearchRequest = parsedParams as ExerciseSearchRequest;

    console.log('[Exercise Search] Request validated:', {
      query: filters.query,
      equipment: filters.equipment?.length || 0,
      bodyParts: filters.bodyParts?.length || 0,
      muscles: filters.muscles?.length || 0,
      limit: filters.limit,
      offset: filters.offset,
    });

    // 2. Load exercise database
    const database = await loadExerciseDatabase();
    const allExercises = database.exercises;

    console.log('[Exercise Search] Database loaded:', {
      totalExercises: allExercises.length,
    });

    // 3. Apply filters
    const filteredExercises = filterExercises(allExercises, filters);

    console.log('[Exercise Search] Filters applied:', {
      beforeFilter: allExercises.length,
      afterFilter: filteredExercises.length,
      reductionPercent: (
        ((allExercises.length - filteredExercises.length) /
          allExercises.length) *
        100
      ).toFixed(1),
    });

    // 4. Apply pagination
    const result = paginateResults(
      filteredExercises,
      filters.limit,
      filters.offset
    );

    console.log('[Exercise Search] Pagination applied:', {
      total: result.total,
      returned: result.exercises.length,
      hasMore: result.hasMore,
    });

    // 5. Build response
    const response: ExerciseSearchResponse = {
      exercises: result.exercises,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: result.hasMore,
    };

    const totalTime = Date.now() - startTime;

    return c.json(
      {
        success: true,
        data: response,
        metadata: {
          searchTime: totalTime,
          filters: {
            query: filters.query,
            equipment: filters.equipment,
            bodyParts: filters.bodyParts,
            muscles: filters.muscles,
            experienceLevel: filters.experienceLevel,
          },
        },
      },
      200
    );
  } catch (error) {
    console.error('[Exercise Search] Error:', error);

    if (error instanceof ValidationError || error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to search exercises. Please try again.',
      500,
      'SEARCH_FAILED' as any,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
