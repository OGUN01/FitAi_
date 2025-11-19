/**
 * FitAI Workers - Exercise Database Loader
 *
 * Loads and caches the exerciseDatabase.json (1500 exercises)
 * Provides helper functions for searching and filtering exercises
 */

import exerciseDatabaseRaw from '../data/exerciseDatabase.json';

// ============================================================================
// TYPES
// ============================================================================

export interface Exercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseDatabase {
  metadata: {
    totalExercises: number;
    exercisesWithGifs: number;
    gifCoveragePercent: number;
    equipments: string[];
    bodyParts: string[];
    muscleGroups: string[];
  };
  exercises: Exercise[];
}

// ============================================================================
// DATABASE LOADING
// ============================================================================

/**
 * Module-level cache for exercise database
 * Cloudflare Workers reuse the same isolate, so this persists across requests
 */
let cachedDatabase: ExerciseDatabase | null = null;

/**
 * Load exercise database
 * Imports from bundled JSON file and caches in memory
 */
export async function loadExerciseDatabase(): Promise<ExerciseDatabase> {
  if (cachedDatabase) {
    return cachedDatabase;
  }

  try {
    // Import from bundled JSON file
    cachedDatabase = exerciseDatabaseRaw as ExerciseDatabase;

    console.log('[Exercise Database] Loaded successfully:', {
      totalExercises: cachedDatabase.metadata.totalExercises,
      gifCoverage: cachedDatabase.metadata.gifCoveragePercent + '%',
      equipmentTypes: cachedDatabase.metadata.equipments.length,
    });

    return cachedDatabase;
  } catch (error) {
    console.error('[Exercise Database] Load failed:', error);
    throw new Error('Failed to load exercise database');
  }
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(exerciseId: string): Promise<Exercise | null> {
  const db = await loadExerciseDatabase();
  return db.exercises.find((ex) => ex.exerciseId === exerciseId) || null;
}

/**
 * Get multiple exercises by IDs
 */
export async function getExercisesByIds(exerciseIds: string[]): Promise<Exercise[]> {
  const db = await loadExerciseDatabase();
  const idSet = new Set(exerciseIds);
  return db.exercises.filter((ex) => idSet.has(ex.exerciseId));
}

/**
 * Search exercises by name
 */
export async function searchExercisesByName(query: string, limit: number = 20): Promise<Exercise[]> {
  const db = await loadExerciseDatabase();
  const lowerQuery = query.toLowerCase();

  return db.exercises
    .filter((ex) => ex.name.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
}

/**
 * Filter exercises by equipment
 */
export async function filterByEquipment(equipment: string[]): Promise<Exercise[]> {
  const db = await loadExerciseDatabase();
  const equipmentSet = new Set(equipment.map((e) => e.toLowerCase()));

  return db.exercises.filter((ex) =>
    ex.equipments.some((eq) => equipmentSet.has(eq.toLowerCase()))
  );
}

/**
 * Filter exercises by body parts
 */
export async function filterByBodyParts(bodyParts: string[]): Promise<Exercise[]> {
  const db = await loadExerciseDatabase();
  const bodyPartSet = new Set(bodyParts.map((bp) => bp.toLowerCase()));

  return db.exercises.filter((ex) =>
    ex.bodyParts.some((bp) => bodyPartSet.has(bp.toLowerCase()))
  );
}

/**
 * Filter exercises by target muscles
 */
export async function filterByMuscles(muscles: string[]): Promise<Exercise[]> {
  const db = await loadExerciseDatabase();
  const muscleSet = new Set(muscles.map((m) => m.toLowerCase()));

  return db.exercises.filter((ex) =>
    ex.targetMuscles.some((m) => muscleSet.has(m.toLowerCase())) ||
    ex.secondaryMuscles.some((m) => muscleSet.has(m.toLowerCase()))
  );
}

/**
 * Get all available equipment types
 */
export async function getAvailableEquipment(): Promise<string[]> {
  const db = await loadExerciseDatabase();
  return db.metadata.equipments;
}

/**
 * Get all available body parts
 */
export async function getAvailableBodyParts(): Promise<string[]> {
  const db = await loadExerciseDatabase();
  return db.metadata.bodyParts;
}

/**
 * Get all available muscle groups
 */
export async function getAvailableMuscles(): Promise<string[]> {
  const db = await loadExerciseDatabase();
  return db.metadata.muscleGroups;
}

/**
 * Fix broken CDN URL
 * v1.cdn.exercisedb.dev → static.exercisedb.dev
 */
export function fixGifUrl(gifUrl: string): string {
  return gifUrl.replace('v1.cdn.exercisedb.dev', 'static.exercisedb.dev');
}

/**
 * Enrich exercise with fixed GIF URL
 */
export function enrichExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    gifUrl: fixGifUrl(exercise.gifUrl),
  };
}

/**
 * Enrich multiple exercises with fixed GIF URLs
 */
export function enrichExercises(exercises: Exercise[]): Exercise[] {
  return exercises.map(enrichExercise);
}

// ============================================================================
// STATS AND METADATA
// ============================================================================

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const db = await loadExerciseDatabase();
  return {
    totalExercises: db.metadata.totalExercises,
    exercisesWithGifs: db.metadata.exercisesWithGifs,
    gifCoveragePercent: db.metadata.gifCoveragePercent,
    equipmentTypes: db.metadata.equipments.length,
    bodyParts: db.metadata.bodyParts.length,
    muscleGroups: db.metadata.muscleGroups.length,
  };
}
