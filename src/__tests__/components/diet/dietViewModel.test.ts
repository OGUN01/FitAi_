import {
  getIntakeSummary,
  getMealPlanStatus,
  getMealScheduleTime,
  isSameCalendarDay,
} from "@/components/diet/dietViewModel";

describe("dietViewModel", () => {
  it.each([
    [0, "upcoming"],
    [20, "in_progress"],
    [100, "completed"],
    [120, "completed"],
  ])("maps %s progress to %s", (progress, status) => {
    // No scheduled time / no selected date → pure progress mapping (progress 0
    // stays "upcoming" so the legacy signature stays backward-compatible).
    expect(getMealPlanStatus(progress)).toBe(status);
  });

  it("marks an unlogged meal in_progress once its scheduled time has passed", () => {
    // 10:00 AM scheduled; "now" is 9:59 AM → upcoming, 10:00 AM → in_progress.
    const before = new Date("2026-07-28T09:59:00");
    const after = new Date("2026-07-28T10:01:00");
    expect(getMealPlanStatus(0, "10:00 AM", "2026-07-28", before)).toBe(
      "upcoming"
    );
    expect(getMealPlanStatus(0, "10:00 AM", "2026-07-28", after)).toBe(
      "in_progress"
    );
  });

  it("treats all unlogged meals on a past day as in_progress (overdue)", () => {
    const anyTime = new Date("2026-07-29T08:00:00"); // "now" = next day
    expect(getMealPlanStatus(0, "8:00 PM", "2026-07-28", anyTime)).toBe(
      "in_progress"
    );
  });

  it("treats all meals on a future day as upcoming even after their time", () => {
    // Tomorrow's 8 AM breakfast, "now" today at 10 AM (past the slot) — still
    // upcoming because the day hasn't arrived.
    const now = new Date("2026-07-28T10:00:00");
    expect(getMealPlanStatus(0, "8:00 AM", "2026-07-29", now)).toBe("upcoming");
  });

  it("falls back to upcoming when the scheduled time is unparseable", () => {
    // Pass `now` on the same day so the day-comparison reads "today" and the
    // unparseable time falls through to the upcoming default (not auto-overdue).
    const now = new Date("2026-07-28T08:00:00");
    expect(getMealPlanStatus(0, "whenever", "2026-07-28", now)).toBe("upcoming");
  });

  it("parses 24-hour scheduled times too", () => {
    const after = new Date("2026-07-28T15:00:00");
    expect(getMealPlanStatus(0, "14:30", "2026-07-28", after)).toBe(
      "in_progress"
    );
  });

  it("uses the matching meal time and the afternoon snack fallback", () => {
    const schedule = {
      breakfast: "7:45 AM",
      morningSnack: "10:30 AM",
      lunch: "12:00 PM",
      afternoonSnack: "3:00 PM",
      dinner: "8:00 PM",
    };
    expect(getMealScheduleTime("breakfast", schedule)).toBe("7:45 AM");
    expect(getMealScheduleTime("snack", schedule)).toBe("3:00 PM");
  });

  it("clamps intake percent but preserves over-target remaining", () => {
    expect(getIntakeSummary(1125, 1856)).toEqual({
      consumed: 1125,
      target: 1856,
      remaining: 731,
      percent: 61,
    });
    expect(getIntakeSummary(2100, 1856)).toMatchObject({
      remaining: -244,
      percent: 100,
    });
  });

  it("compares local calendar dates", () => {
    expect(
      isSameCalendarDay(
        new Date(2026, 6, 24, 1),
        new Date(2026, 6, 24, 23),
      ),
    ).toBe(true);
  });
});
