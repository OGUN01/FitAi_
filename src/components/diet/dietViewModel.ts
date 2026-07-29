import type { MealSchedule } from '../../utils/mealSchedule';

export type MealPlanStatus = 'completed' | 'in_progress' | 'upcoming';

export interface IntakeSummary {
  consumed: number;
  target: number;
  remaining: number;
  percent: number;
}

export const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getWeekDates = (anchor: Date): Date[] => {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

/**
 * Parse a scheduled meal time to minutes since midnight. Accepts both the
 * 12-hour strings `getMealTime` produces ("7:45 AM" / "12:00 PM") and 24-hour
 * "HH:MM" / "HH:MM:SS" forms. Returns null when unparseable so callers can
 * fall back to the progress-only path.
 */
const parseScheduledTimeToMinutes = (time: string): number | null => {
  const trimmed = time.trim().toUpperCase();
  // 12-hour: "7:45 AM" / "12:00 PM"
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (ampm[3] === 'AM') {
      h = h === 12 ? 0 : h;
    } else {
      h = h === 12 ? 12 : h + 12;
    }
    return h * 60 + m;
  }
  // 24-hour: "07:45" / "19:00:00"
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return h * 60 + m;
    }
  }
  return null;
};

/**
 * Derive a meal's plan status from its logged progress AND its scheduled time.
 *
 *   progress >= 100                 → completed (fully logged)
 *   progress > 0                    → in_progress (partially logged)
 *   progress == 0, time has passed   → in_progress (overdue / active now)
 *   progress == 0, time not reached  → upcoming
 *
 * The time check makes an unlogged breakfast show as "In Progress" once its
 * scheduled slot has elapsed, instead of lingering as "Upcoming" all day —
 * mirroring how Apple Fitness treats a missed workout window.
 *
 * `selectedDateISO` ("YYYY-MM-DD") disambiguates past/future days so the
 * minute comparison only runs for "today"; a past day's unlogged meals are
 * always overdue, a future day's are always upcoming. `now` is overridable
 * for tests.
 */
export const getMealPlanStatus = (
  progress: number | null = 0,
  scheduledTime?: string | null,
  selectedDateISO?: string | null,
  now: Date = new Date(),
): MealPlanStatus => {
  const p = progress ?? 0;
  if (p >= 100) return 'completed';
  if (p > 0) return 'in_progress';

  // progress == 0 — decide upcoming vs overdue (in_progress) by schedule.
  if (selectedDateISO) {
    // Parse selected date at noon to avoid the midnight-UTC day-shift in
    // negative timezones (same pattern DietScreen uses).
    const selected = new Date(`${selectedDateISO}T12:00:00`);
    if (!isNaN(selected.getTime())) {
      const today = new Date(now);
      today.setHours(12, 0, 0, 0);
      if (selected.getTime() < today.getTime()) {
        // Past day — every unlogged meal is overdue.
        return 'in_progress';
      }
      if (selected.getTime() > today.getTime()) {
        // Future day — nothing is active yet.
        return 'upcoming';
      }
      // Same day — fall through to minute comparison.
    }
  }

  if (scheduledTime) {
    const scheduledMin = parseScheduledTimeToMinutes(scheduledTime);
    if (scheduledMin != null) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin >= scheduledMin) return 'in_progress';
    }
  }
  return 'upcoming';
};

export const getMealScheduleTime = (type: string, schedule: MealSchedule): string => {
  if (type === 'breakfast') return schedule.breakfast;
  if (type === 'lunch') return schedule.lunch;
  if (type === 'dinner') return schedule.dinner;
  if (type === 'morning_snack') return schedule.morningSnack;
  return schedule.afternoonSnack;
};

export const getIntakeSummary = (consumed: number, target: number): IntakeSummary => ({
  consumed: Math.max(0, Math.round(consumed || 0)),
  target: Math.max(0, Math.round(target || 0)),
  remaining: Math.round((target || 0) - (consumed || 0)),
  percent: target > 0 ? Math.min(100, Math.max(0, Math.round((consumed / target) * 100))) : 0,
});
