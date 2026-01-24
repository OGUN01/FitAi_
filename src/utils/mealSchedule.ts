/**
 * Meal Schedule Calculator
 * Calculates optimal meal times based on user's wake and sleep times
 */

export interface MealSchedule {
  breakfast: string;
  morningSnack: string;
  lunch: string;
  afternoonSnack: string;
  dinner: string;
}

/**
 * Parse time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
const parseTimeToMinutes = (
  timeStr: string | null | undefined,
): number | null => {
  if (!timeStr) return null;

  const parts = timeStr.split(":");
  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  return hours * 60 + minutes;
};

/**
 * Format minutes since midnight to 12-hour time string
 */
const formatMinutesToTime = (totalMinutes: number): string => {
  // Handle overflow past midnight
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const period = hours24 < 12 ? "AM" : "PM";

  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

/**
 * Calculate meal schedule based on wake and sleep times
 *
 * @param wakeTime - User's wake time (HH:MM format)
 * @param sleepTime - User's sleep time (HH:MM format)
 * @returns MealSchedule with optimal meal times
 */
export const calculateMealSchedule = (
  wakeTime: string | null | undefined,
  sleepTime: string | null | undefined,
): MealSchedule => {
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  const sleepMinutes = parseTimeToMinutes(sleepTime);

  // Default schedule if no user times provided
  // Based on 7:00 AM wake, 11:00 PM sleep (typical adult schedule)
  if (wakeMinutes === null || sleepMinutes === null) {
    return {
      breakfast: "8:00 AM",
      morningSnack: "10:30 AM",
      lunch: "1:00 PM",
      afternoonSnack: "4:00 PM",
      dinner: "7:00 PM",
    };
  }

  // Calculate awake duration (handle overnight sleep)
  let awakeDuration = sleepMinutes - wakeMinutes;
  if (awakeDuration <= 0) {
    awakeDuration += 1440; // Add 24 hours if sleep is past midnight
  }

  // Calculate meal times based on wake time
  // Breakfast: 30-60 min after waking
  const breakfastMinutes = wakeMinutes + 45;

  // Morning snack: ~3 hours after breakfast
  const morningSnackMinutes = breakfastMinutes + 150; // 2.5 hours

  // Lunch: ~5 hours after waking (midday)
  const lunchMinutes = wakeMinutes + 300; // 5 hours

  // Afternoon snack: ~3 hours after lunch
  const afternoonSnackMinutes = lunchMinutes + 180; // 3 hours

  // Dinner: 3 hours before sleep (allows digestion)
  const dinnerMinutes = sleepMinutes - 180;

  return {
    breakfast: formatMinutesToTime(breakfastMinutes),
    morningSnack: formatMinutesToTime(morningSnackMinutes),
    lunch: formatMinutesToTime(lunchMinutes),
    afternoonSnack: formatMinutesToTime(afternoonSnackMinutes),
    dinner: formatMinutesToTime(dinnerMinutes),
  };
};

/**
 * Get meal time for a specific meal type
 */
export const getMealTime = (
  mealType:
    | "breakfast"
    | "lunch"
    | "dinner"
    | "snack"
    | "morning_snack"
    | "afternoon_snack",
  schedule: MealSchedule,
): string => {
  switch (mealType) {
    case "breakfast":
      return schedule.breakfast;
    case "lunch":
      return schedule.lunch;
    case "dinner":
      return schedule.dinner;
    case "morning_snack":
      return schedule.morningSnack;
    case "afternoon_snack":
      return schedule.afternoonSnack;
    case "snack":
      // Default snack to afternoon if not specified
      return schedule.afternoonSnack;
    default:
      return schedule.lunch;
  }
};

/**
 * Get meal type icon
 */
export const getMealTypeIcon = (type: string): string => {
  switch (type) {
    case "breakfast":
      return "🌅";
    case "lunch":
      return "☀️";
    case "dinner":
      return "🌙";
    case "snack":
    case "morning_snack":
    case "afternoon_snack":
      return "🍎";
    default:
      return "🍽️";
  }
};

/**
 * Get Ionicons name for meal type
 */
export const getMealTypeIonicon = (type: string): string => {
  switch (type) {
    case "breakfast":
      return "sunny-outline";
    case "lunch":
      return "restaurant-outline";
    case "dinner":
      return "moon-outline";
    case "snack":
    case "morning_snack":
    case "afternoon_snack":
      return "nutrition-outline";
    default:
      return "restaurant-outline";
  }
};
