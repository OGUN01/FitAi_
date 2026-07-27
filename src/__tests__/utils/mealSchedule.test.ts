import {
  calculateMealSchedule,
  getMealTime,
  getMealTypeIcon,
  getMealTypeIonicon,
  MealSchedule,
} from "../../utils/mealSchedule";

describe("mealSchedule", () => {
  describe("calculateMealSchedule", () => {
    describe("default schedule (null/undefined/empty inputs)", () => {
      const expectedDefault: MealSchedule = {
        breakfast: "8:00 AM",
        morningSnack: "10:30 AM",
        lunch: "1:00 PM",
        afternoonSnack: "4:00 PM",
        dinner: "7:00 PM",
      };

      it("returns default when both wakeTime and sleepTime are null", () => {
        expect(calculateMealSchedule(null, null)).toEqual(expectedDefault);
      });

      it("returns default when both wakeTime and sleepTime are undefined", () => {
        expect(calculateMealSchedule(undefined, undefined)).toEqual(
          expectedDefault,
        );
      });

      it("returns default when wakeTime is null and sleepTime is present", () => {
        expect(calculateMealSchedule(null, "23:00")).toEqual(expectedDefault);
      });

      it("returns default when wakeTime is present and sleepTime is null", () => {
        expect(calculateMealSchedule("07:00", null)).toEqual(expectedDefault);
      });

      it("treats empty string as null (wakeTime empty)", () => {
        expect(calculateMealSchedule("", "23:00")).toEqual(expectedDefault);
      });

      it("treats empty string as null (sleepTime empty)", () => {
        expect(calculateMealSchedule("07:00", "")).toEqual(expectedDefault);
      });
    });

    describe("normal daytime schedule (wake 07:00, sleep 23:00)", () => {
      // wakeMinutes = 7*60 = 420; sleepMinutes = 23*60 = 1380; awakeDuration = 960
      // breakfast   = 420 + 45  = 465  -> 7:45 AM
      // morningSnack = 465 + 150 = 615  -> 10:15 AM
      // lunch       = 420 + 300 = 720  -> 12:00 PM (hours24=12, not <12, so PM)
      // afternoonSnack = 720 + 180 = 900 -> 3:00 PM
      // dinner      = 1380 - 180 = 1200 -> 8:00 PM
      const schedule = calculateMealSchedule("07:00", "23:00");

      it("breakfast = 7:45 AM (wake + 45 min)", () => {
        expect(schedule.breakfast).toBe("7:45 AM");
      });

      it("morningSnack = 10:15 AM (breakfast + 150 min)", () => {
        expect(schedule.morningSnack).toBe("10:15 AM");
      });

      it("lunch = 12:00 PM (wake + 300 min, AM/PM boundary)", () => {
        expect(schedule.lunch).toBe("12:00 PM");
      });

      it("afternoonSnack = 3:00 PM (lunch + 180 min)", () => {
        expect(schedule.afternoonSnack).toBe("3:00 PM");
      });

      it("dinner = 8:00 PM (sleep - 180 min)", () => {
        expect(schedule.dinner).toBe("8:00 PM");
      });

      it("returns the full expected schedule object", () => {
        expect(schedule).toEqual({
          breakfast: "7:45 AM",
          morningSnack: "10:15 AM",
          lunch: "12:00 PM",
          afternoonSnack: "3:00 PM",
          dinner: "8:00 PM",
        });
      });
    });

    describe("overnight wrap (wake 06:00, sleep 00:00 = midnight next day)", () => {
      // wakeMinutes = 360; sleepMinutes = 0; awakeDuration = 0 - 360 = -360 -> +1440 = 1080
      // breakfast   = 360 + 45  = 405   -> 6:45 AM
      // morningSnack = 405 + 150 = 555  -> 9:15 AM
      // lunch       = 360 + 300 = 660   -> 11:00 AM
      // afternoonSnack = 660 + 180 = 840 -> 2:00 PM
      // dinner      = 0 - 180 = -180   -> normalize -> 1260 -> 9:00 PM (overnight wrap)
      const schedule = calculateMealSchedule("06:00", "00:00");

      it("breakfast = 6:45 AM (wake + 45 min)", () => {
        expect(schedule.breakfast).toBe("6:45 AM");
      });

      it("morningSnack = 9:15 AM (breakfast + 150 min)", () => {
        expect(schedule.morningSnack).toBe("9:15 AM");
      });

      it("lunch = 11:00 AM (wake + 300 min)", () => {
        expect(schedule.lunch).toBe("11:00 AM");
      });

      it("afternoonSnack = 2:00 PM (lunch + 180 min)", () => {
        expect(schedule.afternoonSnack).toBe("2:00 PM");
      });

      it("dinner = 9:00 PM (sleep - 180 min, normalized through midnight)", () => {
        // -180 -> ((-180 % 1440) + 1440) % 1440 = 1260 -> 21:00 -> 9:00 PM
        expect(schedule.dinner).toBe("9:00 PM");
      });
    });

    describe("invalid time strings", () => {
      it('"abc" (no colon) -> parseTimeToMinutes returns null -> default schedule', () => {
        // "abc".split(":") = ["abc"], length 1 < 2 -> null
        expect(calculateMealSchedule("abc", "23:00")).toEqual({
          breakfast: "8:00 AM",
          morningSnack: "10:30 AM",
          lunch: "1:00 PM",
          afternoonSnack: "4:00 PM",
          dinner: "7:00 PM",
        });
      });

      it('"abc" for both inputs -> default schedule', () => {
        expect(calculateMealSchedule("abc", "abc")).toEqual({
          breakfast: "8:00 AM",
          morningSnack: "10:30 AM",
          lunch: "1:00 PM",
          afternoonSnack: "4:00 PM",
          dinner: "7:00 PM",
        });
      });

      it('"25:99" is rejected (hours > 23, minutes > 59) -> parseTimeToMinutes returns null -> default schedule', () => {
        // hours=25 > 23 and minutes=99 > 59 -> null -> fall through to default
        expect(calculateMealSchedule("25:99", "25:99")).toEqual({
          breakfast: "8:00 AM",
          morningSnack: "10:30 AM",
          lunch: "1:00 PM",
          afternoonSnack: "4:00 PM",
          dinner: "7:00 PM",
        });
      });

      it('"24:00" is rejected (hours=24 is out of range) -> default schedule', () => {
        // hours=24 > 23 -> null -> default schedule
        expect(calculateMealSchedule("24:00", "24:00")).toEqual({
          breakfast: "8:00 AM",
          morningSnack: "10:30 AM",
          lunch: "1:00 PM",
          afternoonSnack: "4:00 PM",
          dinner: "7:00 PM",
        });
      });

      it('"12:60" is rejected (minutes=60 is out of range) -> default schedule', () => {
        // minutes=60 > 59 -> null -> default schedule
        expect(calculateMealSchedule("12:60", "12:60")).toEqual({
          breakfast: "8:00 AM",
          morningSnack: "10:30 AM",
          lunch: "1:00 PM",
          afternoonSnack: "4:00 PM",
          dinner: "7:00 PM",
        });
      });

      it('"23:59" is a valid boundary (hours=23, minutes=59) -> real computed schedule, not default', () => {
        // wakeMinutes = 23*60 + 59 = 1439
        // breakfast = 1439 + 45 = 1484 -> 1484 % 1440 = 44 -> 12:44 AM
        // morningSnack = 1484 + 150 = 1634 -> 1634 % 1440 = 194 -> 3:14 AM
        // lunch = 1439 + 300 = 1739 -> 1739 % 1440 = 299 -> 4:59 AM
        // afternoonSnack = 1739 + 180 = 1919 -> 1919 % 1440 = 479 -> 7:59 AM
        // dinner = 1439 - 180 = 1259 -> 8:59 PM
        const schedule = calculateMealSchedule("23:59", "23:59");
        expect(schedule).not.toEqual({
          breakfast: "8:00 AM",
          morningSnack: "10:30 AM",
          lunch: "1:00 PM",
          afternoonSnack: "4:00 PM",
          dinner: "7:00 PM",
        });
        expect(schedule.breakfast).toBe("12:44 AM");
      });
    });
  });

  describe("getMealTime", () => {
    const schedule: MealSchedule = {
      breakfast: "7:45 AM",
      morningSnack: "10:15 AM",
      lunch: "12:00 PM",
      afternoonSnack: "3:00 PM",
      dinner: "8:00 PM",
    };

    it("returns breakfast for 'breakfast'", () => {
      expect(getMealTime("breakfast", schedule)).toBe("7:45 AM");
    });

    it("returns lunch for 'lunch'", () => {
      expect(getMealTime("lunch", schedule)).toBe("12:00 PM");
    });

    it("returns dinner for 'dinner'", () => {
      expect(getMealTime("dinner", schedule)).toBe("8:00 PM");
    });

    it("returns morningSnack for 'morning_snack'", () => {
      expect(getMealTime("morning_snack", schedule)).toBe("10:15 AM");
    });

    it("returns afternoonSnack for 'afternoon_snack'", () => {
      expect(getMealTime("afternoon_snack", schedule)).toBe("3:00 PM");
    });

    it("returns afternoonSnack for generic 'snack' (default snack)", () => {
      expect(getMealTime("snack", schedule)).toBe("3:00 PM");
    });

    it("returns lunch for unknown meal type (default branch)", () => {
      // bypass TS union to exercise the runtime default branch
      expect(getMealTime("unknown" as never, schedule)).toBe("12:00 PM");
    });
  });

  describe("getMealTypeIcon", () => {
    it("returns sunrise for breakfast", () => {
      expect(getMealTypeIcon("breakfast")).toBe("🌅");
    });

    it("returns sun for lunch", () => {
      expect(getMealTypeIcon("lunch")).toBe("☀️");
    });

    it("returns moon for dinner", () => {
      expect(getMealTypeIcon("dinner")).toBe("🌙");
    });

    it("returns apple for snack", () => {
      expect(getMealTypeIcon("snack")).toBe("🍎");
    });

    it("returns apple for morning_snack", () => {
      expect(getMealTypeIcon("morning_snack")).toBe("🍎");
    });

    it("returns apple for afternoon_snack", () => {
      expect(getMealTypeIcon("afternoon_snack")).toBe("🍎");
    });

    it("returns plate for unknown type", () => {
      expect(getMealTypeIcon("unknown")).toBe("🍽️");
    });
  });

  describe("getMealTypeIonicon", () => {
    it("returns sunny-outline for breakfast", () => {
      expect(getMealTypeIonicon("breakfast")).toBe("sunny-outline");
    });

    it("returns restaurant-outline for lunch", () => {
      expect(getMealTypeIonicon("lunch")).toBe("restaurant-outline");
    });

    it("returns moon-outline for dinner", () => {
      expect(getMealTypeIonicon("dinner")).toBe("moon-outline");
    });

    it("returns nutrition-outline for snack", () => {
      expect(getMealTypeIonicon("snack")).toBe("nutrition-outline");
    });

    it("returns nutrition-outline for morning_snack", () => {
      expect(getMealTypeIonicon("morning_snack")).toBe("nutrition-outline");
    });

    it("returns nutrition-outline for afternoon_snack", () => {
      expect(getMealTypeIonicon("afternoon_snack")).toBe("nutrition-outline");
    });

    it("returns restaurant-outline for unknown type (default)", () => {
      expect(getMealTypeIonicon("unknown")).toBe("restaurant-outline");
    });
  });
});
