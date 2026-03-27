interface VolumeSet {
  weightKg: number;
  reps: number;
}

export function totalVolume(sets: VolumeSet[]): number {
  return sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
}

export function totalVolumeKg(sets: VolumeSet[]): number {
  return totalVolume(sets);
}
