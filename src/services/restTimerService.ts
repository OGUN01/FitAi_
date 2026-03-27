export function startTimer(durationSeconds: number): number {
  return Date.now() + durationSeconds * 1000;
}

export function getRemainingTime(targetEndTime: number): number {
  return Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
}

export function isExpired(targetEndTime: number): boolean {
  return Date.now() >= targetEndTime;
}
