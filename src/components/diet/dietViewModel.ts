import type { MealSchedule } from "../../utils/mealSchedule";

export type MealPlanStatus = "completed" | "in_progress" | "upcoming";

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

export const getMealPlanStatus = (
  progress: number | null = 0,
): MealPlanStatus => {
  if ((progress ?? 0) >= 100) return "completed";
  if ((progress ?? 0) > 0) return "in_progress";
  return "upcoming";
};

export const getMealScheduleTime = (
  type: string,
  schedule: MealSchedule,
): string => {
  if (type === "breakfast") return schedule.breakfast;
  if (type === "lunch") return schedule.lunch;
  if (type === "dinner") return schedule.dinner;
  if (type === "morning_snack") return schedule.morningSnack;
  return schedule.afternoonSnack;
};

export const getIntakeSummary = (
  consumed: number,
  target: number,
): IntakeSummary => ({
  consumed: Math.max(0, Math.round(consumed || 0)),
  target: Math.max(0, Math.round(target || 0)),
  remaining: Math.round((target || 0) - (consumed || 0)),
  percent:
    target > 0
      ? Math.min(100, Math.max(0, Math.round((consumed / target) * 100)))
      : 0,
});
