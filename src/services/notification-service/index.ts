import NotificationService from "./core";
import {
  scheduleWaterReminders,
  scheduleWorkoutReminders,
  scheduleMealReminders,
  scheduleSleepReminders,
  calculateWaterIntervals,
} from "./scheduling";
import {
  savePreferences,
  loadPreferences,
  savePreferencesToSupabase,
  loadPreferencesFromSupabase,
} from "./storage";

export type {
  NotificationData,
  WaterReminderConfig,
  WorkoutReminderConfig,
  MealReminderConfig,
  SleepReminderConfig,
  NotificationPreferences,
} from "./types";

export {
  scheduleWaterReminders,
  scheduleWorkoutReminders,
  scheduleMealReminders,
  scheduleSleepReminders,
  calculateWaterIntervals,
  savePreferences,
  loadPreferences,
  savePreferencesToSupabase,
  loadPreferencesFromSupabase,
};

export default NotificationService;
