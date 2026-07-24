import {
  getIntakeSummary,
  getMealPlanStatus,
  getMealScheduleTime,
  getWeekDates,
  isSameCalendarDay,
} from "@/components/diet/dietViewModel";

describe("dietViewModel", () => {
  it("builds a Monday-to-Sunday week containing the selected date", () => {
    const days = getWeekDates(new Date("2026-07-24T12:00:00"));
    expect(days.map((day) => day.getDate())).toEqual([
      20, 21, 22, 23, 24, 25, 26,
    ]);
  });

  it.each([
    [0, "upcoming"],
    [20, "in_progress"],
    [100, "completed"],
    [120, "completed"],
  ])("maps %s progress to %s", (progress, status) => {
    expect(getMealPlanStatus(progress)).toBe(status);
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
