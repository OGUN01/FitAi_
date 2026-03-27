export function brzycki(weightKg: number, reps: number): number {
  if (reps <= 0 || reps >= 37) return weightKg;
  return weightKg / (1.0278 - 0.0278 * reps);
}

export function epley(weightKg: number, reps: number): number {
  if (reps <= 0) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  if (reps <= 10) return (brzycki(weightKg, reps) + epley(weightKg, reps)) / 2;
  return epley(weightKg, reps);
}
