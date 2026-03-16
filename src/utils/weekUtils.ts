/**
 * ISO date string (YYYY-MM-DD) of the Monday of the current week.
 * Monday is week-start throughout the app.
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();            // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Sunday → -6; others → distance to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * True when two ISO timestamp strings fall on the same calendar day.
 * String-prefix comparison — no external library needed.
 */
export function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.split('T')[0] === isoB.split('T')[0];
}

/**
 * Lowercase day-of-week name for today, matching DayWorkout.dayOfWeek convention.
 */
export function getCurrentDayName(): string {
  const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return names[new Date().getDay()];
}
