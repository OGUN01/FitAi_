const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function toDate(value?: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return value ? new Date(value) : new Date();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function getLocalDateString(value?: string | Date): string {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getLocalDayBounds(value?: string | Date): {
  date: string;
  startIso: string;
  endIso: string;
} {
  const date = toDate(value);
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

  return {
    date: getLocalDateString(date),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getLocalDayName(value?: string | Date): string {
  return getDayNameForDate(value);
}

export function getWeekStartForDate(value?: string | Date): string {
  const date = toDate(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return getLocalDateString(date);
}

/**
 * ISO date string (YYYY-MM-DD) of the Monday of the current week.
 * Monday is week-start throughout the app.
 */
export function getCurrentWeekStart(): string {
  return getWeekStartForDate(new Date());
}

export function isInCurrentLocalWeek(value?: string | Date): boolean {
  return getWeekStartForDate(value) === getCurrentWeekStart();
}

/**
 * True when two timestamps fall on the same local calendar day.
 */
export function isSameDay(isoA: string, isoB: string): boolean {
  return getLocalDateString(isoA) === getLocalDateString(isoB);
}

export function getDayNameForDate(value?: string | Date): string {
  return DAY_NAMES[toDate(value).getDay()];
}

/**
 * Lowercase day-of-week name for today, matching DayWorkout.dayOfWeek convention.
 */
export function getCurrentDayName(): string {
  return getDayNameForDate(new Date());
}
