/**
 * Exercise ID Map — Frontend ↔ Workers (ExerciseDB)
 *
 * The frontend (src/data/exercises.ts) uses human-readable snake_case IDs
 * for a curated set of ~18 exercises (e.g. 'push_up', 'squat').
 *
 * The Cloudflare Workers exercise database (fitai-workers/src/data/exerciseDatabase.json)
 * contains 1500 exercises from the ExerciseDB API using short random-hash IDs
 * (e.g. 'I4hDWkc', 'dK9394r').
 *
 * These are TWO SEPARATE ID SYSTEMS with partial overlap by name.
 * This map provides bidirectional lookup for exercises that exist in both.
 */

export interface ExerciseIdMapping {
  frontendId: string;
  workerId: string;
  canonicalName: string;
}

export const EXERCISE_ID_MAP: ExerciseIdMapping[] = [
  { frontendId: "push_up", workerId: "I4hDWkc", canonicalName: "Push-Up" },
  { frontendId: "burpee", workerId: "dK9394r", canonicalName: "Burpee" },
  {
    frontendId: "dumbbell_bench_press",
    workerId: "SpYC0Kp",
    canonicalName: "Dumbbell Bench Press",
  },
  {
    frontendId: "dumbbell_row",
    workerId: "BJ0Hz5L",
    canonicalName: "Dumbbell Bent Over Row",
  },
  {
    frontendId: "mountain_climbers",
    workerId: "RJgzwny",
    canonicalName: "Mountain Climber",
  },
];

// Frontend exercises WITHOUT a worker equivalent (yoga, HIIT-specific, etc.)
// squat, plank, jumping_jacks, downward_dog, child_pose, sun_salutation,
// warrior_pose, high_knees, battle_ropes — no exact match in ExerciseDB

const frontendToWorker = new Map<string, string>(
  EXERCISE_ID_MAP.map((m) => [m.frontendId, m.workerId]),
);

const workerToFrontend = new Map<string, string>(
  EXERCISE_ID_MAP.map((m) => [m.workerId, m.frontendId]),
);

export function toWorkerId(frontendId: string): string | null {
  return frontendToWorker.get(frontendId) ?? null;
}

export function toFrontendId(workerId: string): string | null {
  return workerToFrontend.get(workerId) ?? null;
}

export function normalizeExerciseId(id: string): string {
  return workerToFrontend.get(id) ?? id;
}
